# Track Matcher Algorithm

Converts a Spotify/YouTube track list into JioSaavn song IDs by fuzzy-matching
title + artist + duration across the JioSaavn search API.

---

## Overview

```
Source tracks (Spotify / YouTube)
        │
        ▼
  ┌─────────────┐
  │  Phase 1    │  One primary query per track — all in parallel
  │  (fast)     │  Win threshold: 0.90 → accept immediately
  └──────┬──────┘
         │ unmatched tracks
         ▼
  ┌─────────────┐
  │  Phase 2    │  Full query expansion — all in parallel
  │  (thorough) │  Accept threshold: 0.72 (Spotify) / 0.65 (YouTube)
  └──────┬──────┘
         │
         ▼
  Map: spotifyTrackId → jioSaavnSongId (null if no match)
```

---

## Thresholds

| Constant              | Value | Purpose                                    |
| --------------------- | ----- | ------------------------------------------ |
| `ACCEPT_THRESHOLD`    | 0.72  | Minimum score to accept a Spotify match    |
| `ACCEPT_THRESHOLD_YT` | 0.65  | Lower bar for YouTube (noisier metadata)   |
| `WIN_FAST_THRESHOLD`  | 0.90  | Phase 1 early-exit — skip Phase 2 entirely |
| `SEARCH_LIMIT`        | 15    | Candidates fetched per JioSaavn query      |

---

## Step 1 — Normalisation

Every string (title, artist) is normalised before any comparison:

1. Unicode decompose + strip diacritics (`café` → `cafe`)
2. Lowercase
3. Replace `ø` → `o`
4. Strip all non-alphanumeric characters (keep spaces)
5. Collapse whitespace
6. Fix common variants:
   - `lo fi` / `lo-fi` → `lofi`
   - `slowed reverb` → `slowed`
   - `o s t` → `ost`

**Artist aliases** are also resolved at this stage. Example:

- `c418` ↔ `daniel rosenfeld` are treated as equivalent artists.

---

## Step 2 — Title Cleaning

Before building search queries, noisy suffixes are stripped from the title:

| Pattern removed                | Example                                     |
| ------------------------------ | ------------------------------------------- |
| `(From "Movie Name")`          | `Kesariya (From "Brahmastra")` → `Kesariya` |
| `- From "Movie Name"`          | same                                        |
| Any trailing `(parenthetical)` | `Tum Hi Ho (Aashiqui 2)` → `Tum Hi Ho`      |
| `\| anything`                  | pipe-separated suffixes                     |
| `- Lofi ...` / `- Remix ...`   | version tags                                |
| `(feat. Artist)`               | featured artist in title                    |

---

## Step 3 — Query Building

For each track, multiple search query strings are generated to maximise recall:

**Artists are expanded individually** — never joined as one string.

```
Track: "Bin Tere"  artists: ["Vishal-Shekhar", "Shafqat Amanat Ali"]

Queries generated:
  "Bin Tere"                          ← title only (fallback)
  "Bin Tere Vishal-Shekhar"           ← title + artist
  "Vishal-Shekhar Bin Tere"           ← artist + title
  "Bin Tere Vishal"                   ← hyphen split: "Vishal-Shekhar" → "Vishal"
  "Vishal Bin Tere"
  "Bin Tere Shafqat Amanat Ali"
  "Shafqat Amanat Ali Bin Tere"
```

If a cleaned title differs from the original, both are used as title variants,
with the cleaned version tried first (less noise → better search results).

---

## Step 4 — Scoring

Each JioSaavn candidate is scored against the source track:

### 4a. Hard filters (return `null` immediately)

- Title similarity < 0.35 → skip
- No artist info on candidate AND title similarity < 0.85 → skip
- **Version tag mismatch**: if the source title contains a strict version tag
  (`slowed`, `reverb`, `sped up`, `remix`, `live`, `acoustic`, `nightcore`)
  the candidate must also contain it. Prevents matching the wrong version.
- Duration diff > 45 s AND > 25% of track length → skip

### 4b. Artist matching

```
bestArtistMatch = max similarity across all (targetArtist × candidateArtist) pairs
```

- Alias table is checked first (e.g. `c418` matches `daniel rosenfeld` → 1.0)
- Substring containment boost: if target artist string is contained in
  candidate artist string → floor at 0.9

**YouTube source is stricter** on artist matching because YouTube titles
often contain the artist name in the title itself, causing false positives:

| Title similarity | Min artist similarity (YouTube) |
| ---------------- | ------------------------------- |
| ≥ 0.98           | 0.20                            |
| ≥ 0.95           | 0.25                            |
| ≥ 0.90           | 0.30                            |
| < 0.90           | 0.40 (or 0.50 if title < 0.85)  |

**Spotify source**: artist similarity must be ≥ 0.35 (≥ 0.45 if title < 0.85).

### 4c. Duration similarity

```
tolerance = max(7s, trackDuration × 10%)
durationSim = max(0, 1 − diff / (tolerance × 3))
```

Short tracks (< 60 s) use a fixed 5 s tolerance.

### 4d. Final score

```
score = 0.50 × titleSim + 0.30 × artistSim + 0.20 × durationSim
```

Title is weighted highest because JioSaavn search is title-indexed.
Artist is second — critical for disambiguation.
Duration is a tiebreaker.

---

## Step 5 — Two-Phase Matching

### Phase 1 (fast path)

- One query per track: `cleanedTitle + firstArtist`
- All tracks searched **in parallel** (single `Promise.all`)
- If `score ≥ 0.90` → accepted immediately, track skipped in Phase 2
- Result cached in `matchCache` (keyed by `title|artist`)

### Phase 2 (thorough fallback)

- Only runs for tracks that didn't win in Phase 1
- All query variants from Step 3 are searched **in parallel**
- Best score across all queries and all candidates is kept
- If `score ≥ ACCEPT_THRESHOLD` → accepted
- Otherwise → `null` (track not found)

### Result merging

Phase 1 winners and Phase 2 results are merged back in the **original track
order** to preserve playlist sequence.

---

## Output

```js
[
  { spotifyId: "4uLU6hMCjMI75M1A2tKUQC", jioId: "dq6oL2dA" },
  { spotifyId: "1BxfuPKGuaTgP7aM0Bbdwr", jioId: null },  // not found
  ...
]
```

`null` entries are silently skipped when building the final `songIds` array
stored in the database.

---

## Why Two Phases?

| Approach      | Latency       | Accuracy              |
| ------------- | ------------- | --------------------- |
| Single query  | Fast          | Misses ~20% of tracks |
| All queries   | Slow (N × Q)  | High recall           |
| **Two-phase** | **Near-fast** | **High recall**       |

Phase 1 wins ~75–80% of tracks with a single query. Phase 2 only pays the
cost of full expansion for the remaining ~20–25%, keeping total latency close
to a single-query approach while matching nearly as many tracks as the
exhaustive method.
