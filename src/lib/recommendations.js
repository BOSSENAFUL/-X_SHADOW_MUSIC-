/**
 * Jammify Recommendation Engine
 *
 * Generates up to 6 personalised mixes per user:
 *   - Mix 0: Liked Songs Mix
 *   - Mix 1–5: Recently Played Mixes (top 5 recently played playlists)
 *
 * Design principles:
 *   - Lazy: only runs when a user actually needs it
 *   - Cached: results stored in MongoDB for 3 days + jitter
 *   - Concurrency-limited: max 5 parallel suggestion API calls
 *   - Rate-limited: max 1 generation per user per hour
 */

import connectDB from '@/lib/mongodb';
import LikedSong from '@/models/LikedSong';
import RecentlyPlayedPlaylist from '@/models/RecentlyPlayedPlaylist';
import Playlist from '@/models/Playlist';
import RecommendedMix from '@/models/RecommendedMix';
import mongoose from 'mongoose';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://nepotuneapi.vercel.app';
const TARGET_SIZE = 50;
const MAX_SEEDS = 20;
const SUGGESTIONS_PER_SEED = 10;
const CONCURRENCY = 5;
const MAX_ARTIST_SONGS = 8;
const MIN_SEEDS = 3;
const MIN_MIX_SIZE = 15;
const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_DAYS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Expiry = now + 3 days + random 0–24h jitter to spread refreshes */
function makeExpiresAt() {
    const jitterMs = Math.random() * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000 + jitterMs);
}

/** Validate a song object has the minimum required fields */
function isValidSong(song) {
    return !!(song && song.id && song.name);
}

/** Fetch suggestions for one seed song. Returns [] on any error. */
async function fetchSuggestions(songId) {
    try {
        const url = `${API_BASE}/api/songs/${songId}/suggestions?limit=${SUGGESTIONS_PER_SEED}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const data = await res.json();
        // API may return { data: [...] } or just [...]
        const songs = Array.isArray(data) ? data : data?.data ?? [];
        return songs.filter(isValidSong);
    } catch {
        return [];
    }
}

/**
 * Run an array of async tasks with a max concurrency limit.
 * Returns results in the same order as tasks.
 */
async function withConcurrency(tasks, limit) {
    const results = new Array(tasks.length);
    let index = 0;

    async function worker() {
        while (index < tasks.length) {
            const i = index++;
            results[i] = await tasks[i]();
        }
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
    await Promise.all(workers);
    return results;
}

// ─── Core Mix Generator ───────────────────────────────────────────────────────

/**
 * Build a candidate pool from seed songs using the suggestion API.
 * Returns a Map<songId, { id, name, artists, score, language }>.
 *
 * @param {Array<{id: string, name: string, language?: string, artists?: any[]}>} seeds
 * @param {Set<string>} excludeIds - song IDs to exclude (already liked / used in other mixes)
 */
async function buildCandidatePool(seeds, excludeIds = new Set()) {
    const pool = new Map();

    const langCounts = {};
    for (const s of seeds) {
        if (s.language) langCounts[s.language] = (langCounts[s.language] || 0) + 1;
    }
    const dominantLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const seedArtistIds = new Set();
    for (const s of seeds) {
        const artists = s.artists?.primary || s.artists || [];
        for (const a of artists) {
            if (a.id) seedArtistIds.add(a.id);
        }
    }

    const tasks = seeds.map((seed) => async () => {
        const suggestions = await fetchSuggestions(seed.id);
        for (const song of suggestions) {
            if (excludeIds.has(song.id)) continue;

            const songArtists = song.artists?.primary || song.artists || [];
            const artistIds = songArtists.map((a) => a.id).filter(Boolean);

            if (pool.has(song.id)) {
                pool.get(song.id).score += 2;
            } else {
                let score = 1;
                if (song.language && song.language === dominantLang) score += 1;
                if (artistIds.some((id) => seedArtistIds.has(id))) score += 0.5;

                pool.set(song.id, {
                    id: song.id,
                    name: song.name,
                    artists: songArtists,
                    language: song.language || null,
                    score,
                });
            }
        }
    });

    await withConcurrency(tasks, CONCURRENCY);
    return pool;
}

/**
 * Filter and rank the candidate pool into a final list of song IDs.
 * Uses weighted random sampling so higher-scored songs are more likely
 * but lower-scored songs still get a chance — this creates natural
 * diversity across mixes.
 *
 * @param {Map} pool
 * @param {Set<string>} usedInThisMix - already added to this mix
 * @param {number} artistCap - max songs per artist
 */
function rankAndFilter(pool, usedInThisMix, artistCap = MAX_ARTIST_SONGS) {
    const candidates = [...pool.values()]
        .filter((s) => !usedInThisMix.has(s.id));

    if (candidates.length === 0) return [];

    const minScore = Math.min(...candidates.map((s) => s.score));
    const shift = minScore < 0 ? -minScore + 1 : 0;

    const result = [];
    const usedIndices = new Set();
    const artistCount = {};

    while (result.length < TARGET_SIZE && usedIndices.size < candidates.length) {
        let totalWeight = 0;
        const eligible = [];

        for (let i = 0; i < candidates.length; i++) {
            if (usedIndices.has(i)) continue;

            const song = candidates[i];
            const primaryArtist = extractPrimaryArtist(song);
            if ((artistCount[primaryArtist] || 0) >= artistCap) {
                usedIndices.add(i);
                continue;
            }

            const weight = Math.max(song.score + shift, 0.01);
            totalWeight += weight;
            eligible.push({ index: i, weight });
        }

        if (eligible.length === 0) break;

        let r = Math.random() * totalWeight;
        let chosen = eligible[0].index;
        for (const { index, weight } of eligible) {
            r -= weight;
            if (r <= 0) { chosen = index; break; }
        }

        const song = candidates[chosen];
        const primaryArtist = extractPrimaryArtist(song);
        artistCount[primaryArtist] = (artistCount[primaryArtist] || 0) + 1;
        result.push(song.id);
        usedIndices.add(chosen);
    }

    return result;
}

function extractPrimaryArtist(song) {
    const songArtists = song.artists || [];
    const artistIds = songArtists.map((a) => a.id || a.name).filter(Boolean);
    return artistIds[0] || 'unknown';
}

/**
 * Generate one mix from a list of seed songs.
 * Returns an array of song IDs (may be shorter than TARGET_SIZE
 * if the suggestion pool is small, never empty if seeds are valid).
 */
async function generateMix(seeds) {
    if (seeds.length < MIN_SEEDS) return [];

    const usedInThisMix = new Set();

    // Process seeds in batches: each batch queries the suggestion API
    // and picks songs. Each subsequent batch gets different seeds for
    // more variety. The third batch has no artist cap as a last resort.
    for (let round = 0; round < 3; round++) {
        if (usedInThisMix.size >= TARGET_SIZE) break;

        const start = round * MAX_SEEDS;
        const roundSeeds = seeds.slice(start, start + MAX_SEEDS);
        if (roundSeeds.length === 0) break;

        const cap = round < 2 ? MAX_ARTIST_SONGS : Infinity;

        const pool = await buildCandidatePool(roundSeeds, usedInThisMix);
        const candidates = rankAndFilter(pool, usedInThisMix, cap);
        for (const id of candidates) {
            if (usedInThisMix.size >= TARGET_SIZE) break;
            usedInThisMix.add(id);
        }
    }

    return [...usedInThisMix];
}

/** Extract the best image URL from a song object. */
function extractImageUrl(song) {
    if (!song) return null;
    const img = song.image;
    if (!img) {
        // Some APIs return image as a direct URL string
        if (typeof song.image === 'string' && song.image) return song.image;
        return null;
    }
    if (Array.isArray(img)) {
        return (
            img.find((i) => i.quality === '500x500')?.url ||
            img.find((i) => i.quality === '150x150')?.url ||
            img.find((i) => i.quality === '50x50')?.url ||
            img?.[img.length - 1]?.url ||
            null
        );
    }
    if (typeof img === 'string') return img;
    return img.url || null;
}

/** Fetch ONE song's cover image. Tries up to 3 random songs from the pool. */
async function fetchCoverImage(songIds) {
    if (!songIds?.length) return null;
    // Try up to 3 random songs from the mix
    const pool = [...songIds];
    const maxAttempts = Math.min(3, pool.length);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const idx = Math.floor(Math.random() * pool.length);
        const sid = pool.splice(idx, 1)[0];
        if (!sid) continue;
        try {
            const res = await fetch(`${API_BASE}/api/songs?ids=${sid}`, {
                signal: AbortSignal.timeout(6000),
            });
            if (!res.ok) continue;
            const data = await res.json();
            const songs = Array.isArray(data) ? data : data?.data ?? (Array.isArray(data?.songs) ? data.songs : []);
            const url = extractImageUrl(songs[0]);
            if (url) return url;
        } catch {
            continue;
        }
    }
    return null;
}

async function getLikedSongSeeds(userId) {
    const liked = await LikedSong.findByUser(new mongoose.Types.ObjectId(userId));
    // Most recently liked first — strongest signal
    return liked.map((s) => ({
        id: s.songId,
        name: s.songName,
        language: s.language || null,
        artists: s.artists || [],
    }));
}

async function getPlaylistSeeds(playlistEntry, likedSeeds = []) {
    try {
        if (playlistEntry.source === 'user') {
            if (!mongoose.Types.ObjectId.isValid(playlistEntry.playlistId)) return [];
            const pl = await Playlist.findById(playlistEntry.playlistId).lean();
            if (!pl || !pl.songIds?.length) return [];
            return pl.songIds.map((id) => ({ id, name: id, language: null, artists: [] }));
        }
        // jiosaavn / spotify playlists: songs not stored locally.
        // Fall back to liked songs as seeds — they still produce a personalised mix
        // that's contextually tied to the user's taste at the time they played that playlist.
        if (likedSeeds.length >= MIN_SEEDS) {
            // Shuffle liked seeds so each recently-played mix gets a different slice
            const shuffled = [...likedSeeds].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, MAX_SEEDS);
        }
        return [];
    } catch {
        return [];
    }
}

// ─── Fix missing cover images ─────────────────────────────────────────────────

/**
 * Find mixes with null coverImage and try to populate them.
 * Does NOT regenerate the full mix — just fetches a cover from existing songIds.
 */
export async function fixMissingCoverImages(userObjId) {
    await connectDB();
    const missing = await RecommendedMix.find({
        userId: userObjId,
        coverImage: null,
        songIds: { $exists: true, $not: { $size: 0 } },
    }).lean();
    for (const mix of missing) {
        const url = await fetchCoverImage(mix.songIds);
        if (url) {
            await RecommendedMix.updateOne(
                { _id: mix._id },
                { $set: { coverImage: url } }
            );
        }
    }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Generate (or refresh) all recommendation mixes for a user.
 * Respects the 1-hour rate limit per user.
 *
 * @param {string} userId
 * @param {boolean} forceRefresh - bypass rate limit (for manual refresh)
 * @returns {{ generated: number, skipped: number }}
 */
export async function generateMixesForUser(userId, forceRefresh = false) {
    await connectDB();

    const userObjId = new mongoose.Types.ObjectId(userId);

    // ── Rate limit check ──────────────────────────────────────────────────────
    if (!forceRefresh) {
        const recentAttempt = await RecommendedMix.findOne({
            userId: userObjId,
            lastGenerationAttempt: { $gt: new Date(Date.now() - RATE_LIMIT_MS) },
        }).lean();
        if (recentAttempt) {
            // Even when rate-limited, still try to fill missing cover images
            await fixMissingCoverImages(userObjId);
            return { generated: 0, skipped: 1, reason: 'rate_limited' };
        }
    }

    // Mark attempt time on all existing mixes for this user
    await RecommendedMix.updateMany(
        { userId: userObjId },
        { $set: { lastGenerationAttempt: new Date() } }
    );

    // ── Collect seeds ─────────────────────────────────────────────────────────
    const [likedSeeds, recentPlaylists] = await Promise.all([
        getLikedSongSeeds(userId),
        RecentlyPlayedPlaylist.getForUser(userId),
    ]);

    // ── Insufficient data guard ───────────────────────────────────────────────
    // Need either liked songs or recently played playlists to generate meaningful mixes
    if (likedSeeds.length < MIN_SEEDS && recentPlaylists.length === 0) {
        return { generated: 0, skipped: 0, reason: 'insufficient_data' };
    }

    // Build mix definitions — always 6 total
    const mixDefs = [];

    // Pre-shuffle liked songs for fallback slicing
    const likedPool = likedSeeds.length > 0
        ? [...likedSeeds].sort(() => Math.random() - 0.5)
        : [];

    // Mix 0: Daily Mix 1 — liked songs as seeds
    mixDefs.push({
        mixIndex: 0,
        title: 'Daily Mix 1',
        sourceType: 'liked_songs',
        sourceId: null,
        seeds: likedSeeds,
    });

    // Mix 1–5: Daily Mix 2–6 — use recently played if available, supplement with liked songs
    // Each mix gets at least MAX_SEEDS seeds so the suggestion API has enough to work with
    const seedPool = likedPool.length > 0 ? likedPool : likedSeeds;
    const step = Math.max(1, Math.min(Math.floor(seedPool.length / 5), MAX_SEEDS));
    for (let i = 0; i < 5; i++) {
        const pl = recentPlaylists[i];
        let seeds = [];
        if (pl) {
            seeds = await getPlaylistSeeds(pl, likedSeeds);
        }

        // Supplement with liked songs to always have MAX_SEEDS diverse seeds
        if (seeds.length < MAX_SEEDS && seedPool.length >= MIN_SEEDS) {
            const seedIds = new Set(seeds.map((s) => s.id));
            const fresh = seedPool.filter((s) => !seedIds.has(s.id));
            const needed = Math.min(MAX_SEEDS - seeds.length, fresh.length);
            const start = (i * step) % Math.max(fresh.length, 1);
            for (let j = 0; j < needed; j++) {
                seeds.push(fresh[(start + j) % fresh.length]);
            }
        }

        mixDefs.push({
            mixIndex: i + 1,
            title: `Daily Mix ${i + 2}`,
            sourceType: 'recently_played',
            sourceId: pl?.playlistId || null,
            seeds,
            playlistEntry: pl || null,
        });
    }

    // ── Generate mixes ────────────────────────────────────────────────────────
    let generated = 0;
    let skipped = 0;

    for (const def of mixDefs) {
        if (def.seeds.length < MIN_SEEDS) {
            skipped++;
            continue;
        }

        let songIds;

        try {
            songIds = await generateMix(def.seeds);

            // Retry with fresh liked seeds if the mix is tiny or empty
            if (songIds.length < MIN_MIX_SIZE && likedPool.length >= MAX_SEEDS) {
                const fallbackSeeds = likedPool.slice(0, MAX_SEEDS);
                likedPool.push(likedPool.shift());
                const retry = await generateMix(fallbackSeeds);
                if (retry.length > songIds.length) songIds = retry;
            }
        } catch (err) {
            console.error(`[Mix ${def.mixIndex}] Generation error:`, err);
            // Try fallback seeds as last resort
            try {
                if (likedPool.length >= MAX_SEEDS) {
                    songIds = await generateMix(likedPool.slice(0, MAX_SEEDS));
                    likedPool.push(likedPool.shift());
                } else {
                    songIds = [];
                }
            } catch {
                songIds = [];
            }
        }

        if (!songIds?.length) {
            skipped++;
            continue;
        }

        // Pick a cover image from any song in the mix (tries up to 3 random songs)
        let coverImage = null;
        try {
            coverImage = await fetchCoverImage(songIds);
        } catch {}

        try {
            await RecommendedMix.findOneAndUpdate(
                { userId: userObjId, mixIndex: def.mixIndex },
                {
                    $set: {
                        title: def.title,
                        sourceType: def.sourceType,
                        sourceId: def.sourceId || null,
                        songIds,
                        coverImage: coverImage || null,
                        generatedAt: new Date(),
                        expiresAt: makeExpiresAt(),
                        seedCount: def.seeds.length,
                        isStale: false,
                        lastGenerationAttempt: new Date(),
                    },
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error(`[Mix ${def.mixIndex}] DB save error:`, err);
            skipped++;
            continue;
        }

        generated++;
    }

    return { generated, skipped };
}

/**
 * Get all cached mixes for a user.
 * Returns an array of mix documents (may be empty on first visit).
 */
export async function getMixesForUser(userId) {
    await connectDB();
    return RecommendedMix.find({
        userId: new mongoose.Types.ObjectId(userId),
    })
        .sort({ mixIndex: 1 })
        .lean();
}

/**
 * Mark a specific mix type as stale (triggers background refresh on next visit).
 *
 * @param {string} userId
 * @param {'liked_songs' | 'recently_played'} sourceType
 * @param {string|null} sourceId - for recently_played, the playlistId
 */
export async function markMixStale(userId, sourceType, sourceId = null) {
    await connectDB();
    const query = {
        userId: new mongoose.Types.ObjectId(userId),
        sourceType,
    };
    if (sourceId) query.sourceId = sourceId;

    await RecommendedMix.updateMany(query, { $set: { isStale: true } });
}

/**
 * Check if any mixes need regeneration (expired, stale, or missing cover image).
 */
export async function needsRegeneration(userId) {
    await connectDB();
    const now = new Date();
    const staleOrExpired = await RecommendedMix.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        $or: [
            { expiresAt: { $lt: now } },
            { isStale: true },
            { coverImage: null },
        ],
    }).lean();
    return !!staleOrExpired;
}
