# Jammify — Music Recommendation System (Final)

> **Status:** Ready to implement  
> **Users:** ~1,350 (growing)  
> **Stack:** Next.js · MongoDB (Mongoose) · JioSaavn suggestion API

---

## The Core Problem With the Previous Design

The original plan said: _generate 6 playlists × 50 songs for every user._

At 1,350 users that means:

```
1,350 users × 6 playlists × 25 API calls (50 songs ÷ 2 per seed) = ~202,500 API calls
```

If you run that all at once — your server dies, the suggestion API rate-limits you, and MongoDB gets hammered. This is not a scaling problem you can fix later. It needs to be designed out from the start.

---

## The Right Mental Model

Think of it like this:

> **Don't generate for everyone. Generate for one user, at the right moment, lazily.**

- Generate only when a user actually opens the app or requests their mixes.
- Cache the result so it doesn't regenerate on every visit.
- Refresh only when the user's data has meaningfully changed.
- Stagger background refreshes so they never all run at the same time.

This turns 202,500 simultaneous API calls into a trickle of on-demand requests.

---

## What Data We Have (Your Actual Models)

### `LikedSong`

```
userId, songId, songName, artists[], album, language, likedAt
```

### `RecentlyPlayedPlaylist`

```
userId → playlists[]: { playlistId, playlistName, songCount, source, playedAt }
```

Note: This stores **playlist metadata only**, not the songs inside. To get songs from a user playlist you need to query `Playlist.songIds`.

### `Playlist`

```
userId, name, songIds[], isPublic
```

---

## The 6 Generated Mixes

| #   | Name                   | Seed Source                   |
| --- | ---------------------- | ----------------------------- |
| 1   | Liked Songs Mix        | All liked songs               |
| 2   | Recently Played Mix 01 | Most recently played playlist |
| 3   | Recently Played Mix 02 | 2nd most recently played      |
| 4   | Recently Played Mix 03 | 3rd most recently played      |
| 5   | Recently Played Mix 04 | 4th most recently played      |
| 6   | Recently Played Mix 05 | 5th most recently played      |

If a user has fewer than 5 recently played playlists, generate fewer mixes. Never generate an empty or near-empty mix.

---

## Suggestion API

```
GET https://nepotuneapi.vercel.app/api/songs/{songId}/suggestions?limit=10
```

Use `limit=10` instead of `limit=2`. Fetching 10 per seed means fewer total API calls to fill 50 songs, and gives you a better candidate pool to score and filter from.

---

## The Algorithm (Simple, Correct, Scalable)

### Step 1 — Collect Seeds

**For Liked Songs Mix:**

- Fetch all liked songs for the user (`LikedSong.findByUser(userId)`)
- Sort by `likedAt` descending (most recently liked first)
- Take up to **20 seeds** — the most recent likes are the strongest signal

**For each Recently Played Mix:**

- Take the playlist entry from `RecentlyPlayedPlaylist`
- If `source === 'user'`: fetch `Playlist.findById(playlistId)` → use `songIds` as seeds
- If `source === 'jiosaavn'`: the playlist songs are not stored locally — skip this playlist or use the playlist ID to fetch songs from the JioSaavn API if available
- Take up to **20 seeds** from the playlist songs

**Minimum viable seed count:** If a source has fewer than 3 seeds, skip generating that mix entirely. A mix built from 1–2 seeds will be low quality.

---

### Step 2 — Fetch Suggestions (Controlled Concurrency)

```
For each seed song:
  → call suggestions API with limit=10
  → add results to a candidate pool (Map keyed by songId)
  → if song already in pool: increment its score by 1
  → if song is new: add it with base score
```

**Critical: Never fire all API calls at once.**  
Use a concurrency limit of **5 parallel requests** at a time.

```ts
// Pseudocode — process seeds in batches of 5
async function fetchAllSuggestions(seeds: Seed[]) {
  const pool = new Map<string, Candidate>();

  for (let i = 0; i < seeds.length; i += 5) {
    const batch = seeds.slice(i, i + 5);
    const results = await Promise.all(
      batch.map((s) => fetchSuggestions(s.id, 10)),
    );

    for (const [batchIdx, songs] of results.entries()) {
      const seed = batch[batchIdx];
      for (const song of songs) {
        if (!isValid(song)) continue;
        if (pool.has(song.id)) {
          pool.get(song.id)!.score += 1; // appeared from multiple seeds = more relevant
        } else {
          pool.set(song.id, { ...song, score: 1, sourceSeedId: seed.id });
        }
      }
    }
  }

  return pool;
}
```

---

### Step 3 — Score and Filter

After building the candidate pool, apply these filters in order:

1. **Remove songs already in the user's liked songs** (optional — you may want to allow them)
2. **Remove songs already in this generated playlist** (always required)
3. **Remove songs already used in another generated mix** (recommended for variety)
4. **Remove songs with missing `id`, `name`, or artist data**
5. **Artist cap:** No more than **3 songs from the same artist** in one mix

Then score each remaining candidate:

```
score = base_score
      + (appeared_from_N_seeds × 2)     // multi-seed boost
      + (same_language_as_seeds × 1)    // language match
      + (same_artist_as_seed × 0.5)     // artist affinity
```

Sort descending by score. Take the top 50.

---

### Step 4 — Fill to 50 (Gap Handling)

If the candidate pool has fewer than 50 songs after filtering:

1. Expand seeds — take 10 more seeds from the same source
2. Fetch another round of suggestions
3. Relax the artist cap from 3 → 5
4. If still under 50, accept the mix at whatever size it reached (minimum 20 songs to be worth showing)

Never pad with random songs. A 35-song mix is better than a 50-song mix with irrelevant filler.

---

## Storage — The `RecommendedMix` Model

Store generated mixes in MongoDB. **Never regenerate on every page load.**

```js
// models/RecommendedMix.js
{
  userId:        ObjectId,        // ref: User
  mixIndex:      Number,          // 0 = liked songs mix, 1–5 = recently played mixes
  title:         String,          // "Liked Songs Mix", "Recently Played Mix 01", etc.
  sourceType:    String,          // "liked_songs" | "recently_played"
  sourceId:      String,          // playlistId for recently_played, null for liked_songs
  songIds:       [String],        // the 50 generated song IDs
  generatedAt:   Date,
  expiresAt:     Date,            // generatedAt + 3 days
  seedCount:     Number,          // how many seeds were used
  isStale:       Boolean,         // true when user data changed significantly
}

// Indexes
{ userId: 1, mixIndex: 1 }  unique  // one mix per slot per user
{ expiresAt: 1 }                    // for TTL cleanup
```

---

## When to Generate / Refresh

### Trigger: User opens the app (lazy generation)

```
1. User opens /music
2. Check: does this user have any RecommendedMix documents?
3. If NO → generate all 6 mixes now (first-time setup)
4. If YES → check if any mix has expiresAt < now OR isStale === true
5. If stale/expired → regenerate only those mixes in the background
6. Return whatever is cached immediately — don't block the UI
```

### Mark as stale when:

- User likes or unlikes a song → mark Liked Songs Mix as stale
- User plays a new playlist → mark the corresponding Recently Played Mix as stale
- More than **3 days** have passed since `generatedAt`

### Never regenerate:

- On every page visit
- On every song play
- All 6 at once unless it's the user's first time

---

## Background Refresh Strategy (Avoiding the Thundering Herd)

The biggest scaling risk is all 1,350 users triggering regeneration at the same time (e.g., after a deploy or at midnight).

**Solution: Jitter the expiry times.**

When you first generate mixes for a user, set `expiresAt` to:

```
generatedAt + 3 days + random(0, 24 hours)
```

This spreads refreshes across a 24-hour window instead of all hitting at once.

**Also: Rate-limit the generation endpoint.**

```
Max 1 generation job per user per hour
```

If a user somehow triggers regeneration twice within an hour, return the cached version.

---

## API Route Design

```
GET  /api/recommendations              → return all 6 mixes for current user (from cache)
POST /api/recommendations/generate     → trigger generation/refresh for current user
GET  /api/recommendations/[mixIndex]   → return one specific mix
```

The `GET /api/recommendations` route should:

1. Return cached mixes immediately
2. In the background, check if any are stale and queue a refresh
3. Never block the response waiting for generation

---

## Concurrency Budget Per User

With `limit=10` per seed and 20 seeds per mix:

```
20 seeds × 1 API call each = 20 API calls per mix
6 mixes × 20 calls = 120 API calls per full generation
With concurrency=5: 120 ÷ 5 = 24 sequential batches
At ~100ms per batch: ~2.4 seconds total per user
```

At 1,350 users, if they all generate at once (worst case):

```
1,350 × 120 = 162,000 API calls
```

This is why lazy + cached generation is non-negotiable. In practice, only a fraction of users will trigger generation on any given day, and the 3-day cache means most users never hit the API at all on a given visit.

---

## What NOT to Do

| ❌ Don't                             | ✅ Do instead                                   |
| ------------------------------------ | ----------------------------------------------- |
| Generate for all users on a cron job | Generate lazily when user opens the app         |
| Regenerate on every page visit       | Cache for 3 days, refresh only when stale       |
| Fire all API calls in parallel       | Batch with concurrency limit of 5               |
| Use `limit=2` per seed               | Use `limit=10` — fewer calls, better pool       |
| Generate empty mixes                 | Skip mixes with fewer than 3 seeds              |
| Block the UI waiting for generation  | Return cache immediately, refresh in background |

---

## Implementation Order

1. **Create `RecommendedMix` model** with the schema above
2. **Build `generateMixForUser(userId, mixIndex)`** — the core function
3. **Build `GET /api/recommendations`** — returns cached mixes, triggers background refresh
4. **Build `POST /api/recommendations/generate`** — manual trigger with rate limiting
5. **Add stale markers** — hook into liked-songs and recently-played-playlist update paths
6. **Add jitter to expiry** — prevent thundering herd on first deploy
7. **Display mixes in the UI** — treat them like any other playlist

---

## Summary

This system is:

- **Simple** — rule-based scoring, no ML, no external services beyond the suggestion API you already use
- **Correct** — deduplication, artist caps, minimum quality thresholds
- **Scalable** — lazy generation, 3-day cache, jittered expiry, concurrency-limited API calls
- **Cheap** — a typical active user triggers ~120 API calls every 3 days, not on every visit
- **Safe to ship** — the worst case (all 1,350 users generating at once) is handled by the cache and rate limiter

The key insight is that **caching is the recommendation system's most important feature**, not the algorithm itself.
