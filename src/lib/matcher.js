/**
 * Track Matcher — Spotify/YouTube → JioSaavn
 *
 * Converts a list of source tracks into JioSaavn song IDs by fuzzy-matching
 * title + artist + duration across the JioSaavn search API.
 *
 * See MATCHER_ALGORITHM.md for full documentation.
 */

import { compareTwoStrings } from 'string-similarity';

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
export const ACCEPT_THRESHOLD = 0.72;
export const ACCEPT_THRESHOLD_YT = 0.65;
export const WIN_FAST_THRESHOLD = 0.90;
export const SEARCH_LIMIT = 15;

// ---------------------------------------------------------------------------
// NORMALISATION
// ---------------------------------------------------------------------------
const RAW_ARTIST_ALIASES = {
    'c418': ['daniel rosenfeld'],
    'daniel rosenfeld': ['c418'],
    'lena raine': ['lena raine kuhlmann'],
};

export const normalize = (text) => {
    if (!text) return '';
    let n = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/ø/g, 'o')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    n = n
        .replace(/\blo\s+fi\b/g, 'lofi')
        .replace(/\blo\s*-\s*fi\b/g, 'lofi')
        .replace(/\bslowed\s+reverb\b/g, 'slowed')
        .replace(/\bo\s+s\s+t\b/g, 'ost');

    return n;
};

const NORMALIZED_ALIASES = {};
for (const [key, values] of Object.entries(RAW_ARTIST_ALIASES)) {
    NORMALIZED_ALIASES[normalize(key)] = values.map(normalize);
}

export const similarity = (a, b) => {
    const n1 = normalize(a);
    const n2 = normalize(b);
    if (n1 === n2) return 1.0;
    const s = compareTwoStrings(n1, n2);
    if (n1.length > 3 && n2.length > 3 && (n1.includes(n2) || n2.includes(n1))) {
        return Math.max(s, 0.85);
    }
    return s;
};

// ---------------------------------------------------------------------------
// TITLE CLEANER
// ---------------------------------------------------------------------------
export const cleanTitle = (raw) =>
    raw
        .replace(/\s*\(From\s+["'].*?["']\s*(?:\/\s*.*?)?\)\s*$/gi, '')
        .replace(/\s*-\s*From\s+["'].*?["']\s*$/gi, '')
        .replace(/\s*\(.*?\)\s*$/g, '')
        .replace(/\s*\|.*$/g, '')
        .replace(/\s*-\s*Lofi.*$/gi, '')
        .replace(/\s*-\s*Remix.*$/gi, '')
        .replace(/\s*\(feat\..*?\)$/gi, '')
        .trim();

// ---------------------------------------------------------------------------
// QUERY BUILDER
// ---------------------------------------------------------------------------
export const buildQueries = (track) => {
    const ct = cleanTitle(track.name);
    const cleanedTitle = ct.length > 2 && ct !== track.name ? ct : null;
    const titles = cleanedTitle ? [cleanedTitle, track.name] : [track.name];

    const allArtistNames = track.artists
        .map((a) => a.name)
        .filter(Boolean)
        .flatMap((a) => a.split(/,\s*|;\s*/))
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

    const artistVariants = new Set(allArtistNames);
    for (const a of allArtistNames) {
        if (a.includes('-')) artistVariants.add(a.split('-')[0].trim());
    }

    const queries = new Set();
    for (const title of titles) {
        queries.add(title);
        for (const artist of artistVariants) {
            if (artist.length > 1) {
                queries.add(`${title} ${artist}`);
                queries.add(`${artist} ${title}`);
            }
        }
    }

    return [...queries].filter((q) => q.trim().length > 2);
};

// ---------------------------------------------------------------------------
// JIOSAAVN HELPERS
// ---------------------------------------------------------------------------
export const extractJioArtist = (candidate) => {
    if (Array.isArray(candidate.artists?.primary) && candidate.artists.primary.length > 0) {
        return candidate.artists.primary.map((a) => a.name || '').filter(Boolean).join(', ');
    }
    if (typeof candidate.primaryArtists === 'string' && candidate.primaryArtists) {
        return candidate.primaryArtists;
    }
    if (typeof candidate.more_info?.primary_artists === 'string') {
        return candidate.more_info.primary_artists;
    }
    if (Array.isArray(candidate.more_info?.artistMap?.primary_artists)) {
        return candidate.more_info.artistMap.primary_artists
            .map((a) => a.name || a)
            .filter(Boolean)
            .join(', ');
    }
    return candidate.artist || candidate.singers || candidate.subtitle || '';
};

export const extractJioDuration = (candidate) => {
    if (candidate.duration != null) {
        const d = parseInt(candidate.duration, 10);
        return d > 10000 ? Math.round(d / 1000) : d;
    }
    if (candidate.duration_ms != null) {
        return Math.round(parseInt(candidate.duration_ms, 10) / 1000);
    }
    return 0;
};

// ---------------------------------------------------------------------------
// JIOSAAVN SEARCH
// ---------------------------------------------------------------------------
export const searchJioSaavn = async (query, apiBase) => {
    try {
        const url = `${apiBase}/api/search/songs?query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        return data?.data?.results ?? [];
    } catch {
        return [];
    }
};

// ---------------------------------------------------------------------------
// SCORER
// ---------------------------------------------------------------------------
const VERSION_TAGS = [
    'slowed', 'reverb', 'sped up', 'spedup', 'remix',
    'live', 'acoustic', 'lofi', 'nightcore', 'instrumental',
];
const STRICT_VERSION_TAGS = VERSION_TAGS.filter(
    (t) => t !== 'lofi' && t !== 'instrumental'
);

export const buildScorer = (track, isYouTubeSource = false) => {
    const rawTitle = track.name;
    const primaryArtist = track.artists[0]?.name || '';
    const allArtists = track.artists.map((a) => a.name);
    const durationSec = Math.round((track.duration_ms || 0) / 1000);
    const normArtist = normalize(primaryArtist);
    const normTitle = normalize(rawTitle);

    const targetStrictTags = STRICT_VERSION_TAGS.filter((t) => normTitle.includes(t));

    return (candidate) => {
        const cTitle = candidate.name || candidate.title || '';
        if (!cTitle) return null;

        const cArtistRaw = extractJioArtist(candidate);
        const cDuration = extractJioDuration(candidate);
        const normCTitle = normalize(cTitle);
        const normCArtist = normalize(cArtistRaw);

        // Hard filter: version tag mismatch
        if (
            targetStrictTags.length > 0 &&
            !targetStrictTags.every((t) => normCTitle.includes(t))
        ) return null;

        // Hard filter: title similarity floor
        const titleSim = similarity(rawTitle, cTitle);
        if (titleSim < 0.35) return null;

        // No artist on candidate — accept only on very strong title match
        const hasCandidateArtist =
            cArtistRaw.trim().length > 0 && normCArtist.length >= 2;

        if (!hasCandidateArtist) {
            if (titleSim >= 0.85) {
                return {
                    id: candidate.id, title: cTitle, artist: '',
                    score: titleSim * 0.9, titleSim, artistSim: 0, durationSim: 1.0,
                };
            }
            return null;
        }

        // Artist matching
        const splitStr = (str) =>
            str
                .split(/,|&|feat\.|ft\.|;/)
                .map((s) => normalize(s).trim())
                .filter((s) => s.length > 0);

        const targetArtists = [normArtist, ...allArtists.map(normalize)].filter((a) => a.length > 0);
        const candidateArtists = splitStr(cArtistRaw);

        let bestArtistMatch = 0;

        if (NORMALIZED_ALIASES[normArtist]?.includes(normCArtist)) {
            bestArtistMatch = 1.0;
        } else {
            for (const tArt of targetArtists) {
                for (const cArt of candidateArtists) {
                    const s = similarity(tArt, cArt);
                    if (s > bestArtistMatch) bestArtistMatch = s;
                    if (NORMALIZED_ALIASES[tArt]?.includes(cArt)) bestArtistMatch = 1.0;
                }
            }
            // Substring containment boost
            if (bestArtistMatch < 0.9) {
                for (const tArt of targetArtists) {
                    if (tArt.length > 3 && normCArtist.includes(tArt)) {
                        bestArtistMatch = Math.max(bestArtistMatch, 0.9);
                        break;
                    }
                }
            }
        }

        // Artist threshold — YouTube is stricter to avoid false positives
        if (isYouTubeSource) {
            if (titleSim >= 0.98 && bestArtistMatch < 0.20) return null;
            else if (titleSim >= 0.95 && bestArtistMatch < 0.25) return null;
            else if (titleSim >= 0.90 && bestArtistMatch < 0.30) return null;
            else if (titleSim < 0.90 && (bestArtistMatch < 0.40 || (bestArtistMatch < 0.50 && titleSim < 0.85))) return null;
        } else {
            if (bestArtistMatch < 0.35) return null;
            if (bestArtistMatch < 0.45 && titleSim < 0.85) return null;
        }

        // Duration similarity
        let durationSim = 1.0;
        if (durationSec > 0 && cDuration > 0) {
            const diff = Math.abs(durationSec - cDuration);
            const tolerance = durationSec < 60 ? 5 : Math.max(7, durationSec * 0.10);
            if (diff > 45 && diff > durationSec * 0.25) return null;
            durationSim = Math.max(0, 1 - diff / (tolerance * 3));
        }

        const score = 0.50 * titleSim + 0.30 * bestArtistMatch + 0.20 * durationSim;
        return { id: candidate.id, title: cTitle, artist: cArtistRaw, score, titleSim, artistSim: bestArtistMatch, durationSim };
    };
};

// ---------------------------------------------------------------------------
// MATCH A SINGLE TRACK — used by sync scripts
// ---------------------------------------------------------------------------
export const matchSingleTrack = async (track, jioBase, isYouTubeSource = false) => {
    const acceptThreshold = isYouTubeSource ? ACCEPT_THRESHOLD_YT : ACCEPT_THRESHOLD;
    const scorer = buildScorer(track, isYouTubeSource);
    const queries = buildQueries(track);

    const allCandidates = await Promise.all(
        queries.map((q) => searchJioSaavn(q, jioBase))
    );

    let bestMatch = null, bestScore = 0;
    for (const candidates of allCandidates) {
        for (const c of candidates) {
            const s = scorer(c);
            if (s && s.score > bestScore) { bestScore = s.score; bestMatch = s; }
        }
    }

    if (bestMatch && bestScore >= acceptThreshold) return bestMatch.id;
    return null;
};

// ---------------------------------------------------------------------------
// MATCH ALL TRACKS — two-phase parallel, used by import
// ---------------------------------------------------------------------------
export const matchAllTracks = async (sourceTracks, jioBase, isYouTubeSource = false) => {
    const acceptThreshold = isYouTubeSource ? ACCEPT_THRESHOLD_YT : ACCEPT_THRESHOLD;
    const matchCache = new Map();

    // ── Phase 1: one primary query per track, all in parallel ──────────────
    const phase1Results = await Promise.all(
        sourceTracks.map(async (track) => {
            const cacheKey = `${track.name.toLowerCase()}|${(track.artists[0]?.name || '').toLowerCase()}`;
            if (matchCache.has(cacheKey)) {
                return { track, cacheKey, result: matchCache.get(cacheKey), done: true };
            }

            const ct = cleanTitle(track.name);
            const title = ct.length > 2 && ct !== track.name ? ct : track.name;
            const artist = track.artists[0]?.name || '';
            const query = artist ? `${title} ${artist}` : title;

            const scorer = buildScorer(track, isYouTubeSource);
            const candidates = await searchJioSaavn(query, jioBase);

            let best = null, bestScore = 0;
            for (const c of candidates) {
                const s = scorer(c);
                if (s && s.score > bestScore) { bestScore = s.score; best = s; }
            }

            const won = bestScore >= WIN_FAST_THRESHOLD;
            if (won) {
                console.log(`  ✓ [P1] "${track.name}" → "${best.title}" (${bestScore.toFixed(2)})`);
                matchCache.set(cacheKey, best.id);
            }

            return { track, cacheKey, result: won ? best.id : null, bestScore, best, done: won };
        })
    );

    // ── Phase 2: full query expansion for unmatched tracks ─────────────────
    const needsFallback = phase1Results.filter((r) => !r.done);
    console.log(`[Matcher] Phase 2: fallback for ${needsFallback.length} tracks...`);

    const phase2Results = await Promise.all(
        needsFallback.map(async ({ track, cacheKey, bestScore: p1Score, best: p1Best }) => {
            const scorer = buildScorer(track, isYouTubeSource);
            const queries = buildQueries(track);

            const allCandidates = await Promise.all(
                queries.map((q) => searchJioSaavn(q, jioBase))
            );

            let bestMatch = p1Best, bestScore = p1Score || 0;
            for (const candidates of allCandidates) {
                for (const c of candidates) {
                    const s = scorer(c);
                    if (s && s.score > bestScore) { bestScore = s.score; bestMatch = s; }
                }
            }

            if (bestMatch && bestScore >= acceptThreshold) {
                console.log(`  ✓ [P2] "${track.name}" → "${bestMatch.title}" (${bestScore.toFixed(2)})`);
                matchCache.set(cacheKey, bestMatch.id);
                return { spotifyId: track.spotifyId, jioId: bestMatch.id };
            }

            console.log(
                `  ✗ SKIP "${track.name}" (best: ${bestScore.toFixed(2)}) [artists: ${track.artists.map((a) => a.name).join(', ')}]`
            );
            matchCache.set(cacheKey, null);
            return { spotifyId: track.spotifyId, jioId: null };
        })
    );

    // ── Merge back in original order ────────────────────────────────────────
    let fallbackIdx = 0;
    const results = [];
    for (const r of phase1Results) {
        if (r.done) results.push({ spotifyId: r.track.spotifyId, jioId: r.result || null });
        else results.push(phase2Results[fallbackIdx++]);
    }

    return results;
};
