import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { cookies } from 'next/headers';
import { getPlaylistData } from '@/lib/spotify';
import { compareTwoStrings } from 'string-similarity';

// --- CONFIGURATION ---
const ACCEPT_THRESHOLD = 0.72; // Raised back — 0.62 was causing false matches (e.g. "Doce" matching "DOCE MALDIÇÃO")
const WIN_FAST_THRESHOLD = 0.90; // Stop searching if we hit this score
const SEARCH_LIMIT = 15;         // Results per search query

// Known Artist Aliases
const RAW_ARTIST_ALIASES = {
    'c418': ['daniel rosenfeld'],
    'daniel rosenfeld': ['c418'],
    'lena raine': ['lena raine kuhlmann'],
};

const normalize = (text) => {
    if (!text) return '';
    let normalized = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/ø/g, 'o')
        .replace(/([^a-z0-9\s])/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    normalized = normalized
        .replace(/\blo\s+fi\b/g, 'lofi')
        .replace(/\blo\s*-\s*fi\b/g, 'lofi')
        .replace(/\bslowed\s+reverb\b/g, 'slowed')
        .replace(/\bo\s+s\s+t\b/g, 'ost');

    return normalized;
};

const NORMALIZED_ALIASES = {};
for (const [key, values] of Object.entries(RAW_ARTIST_ALIASES)) {
    const normKey = normalize(key);
    NORMALIZED_ALIASES[normKey] = values.map(v => normalize(v));
}

const calculateSimilarity = (str1, str2) => {
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);
    if (norm1 === norm2) return 1.0;
    const sim = compareTwoStrings(norm1, norm2);
    if (norm1.length > 3 && norm2.length > 3) {
        if (norm1.includes(norm2) || norm2.includes(norm1)) {
            return Math.max(sim, 0.85);
        }
    }
    return sim;
};

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { url } = body;

        if (!url || !url.includes('spotify.com/playlist/')) {
            return NextResponse.json({ success: false, error: 'Invalid Spotify playlist URL' }, { status: 400 });
        }

        const playlistId = url.split('/playlist/')[1]?.split('?')[0];
        if (!playlistId) {
            return NextResponse.json({ success: false, error: 'Could not extract playlist ID' }, { status: 400 });
        }

        // OPTIMIZATION: Single API call to get both details AND tracks
        const playlistData = await getPlaylistData(playlistId);
        if (!playlistData) {
            return NextResponse.json({ success: false, error: 'Failed to fetch playlist from Spotify' }, { status: 404 });
        }

        const { details, tracks: spotifyTracks } = playlistData;

        if (!spotifyTracks || spotifyTracks.length === 0) {
            return NextResponse.json({ success: false, error: 'No tracks in playlist' }, { status: 404 });
        }

        console.log(`[Import] Processing playlist: ${details.name} (${spotifyTracks.length} tracks)`);

        const importStart = Date.now();

        await connectDB();
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.toString();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        const matchCache = new Map();

        // --- SCORING ENGINE ---
        const buildScorer = (track) => {
            const rawTitle = track.name;
            const primaryArtist = track.artists[0]?.name || '';
            const allArtists = track.artists.map(a => a.name);
            const durationMs = track.duration_ms || 0;
            const durationSec = Math.round(durationMs / 1000);
            const normTitle = normalize(rawTitle);
            const normArtist = normalize(primaryArtist);

            const VERSION_TAGS = ['slowed', 'reverb', 'sped up', 'spedup', 'remix', 'live', 'acoustic', 'lofi', 'nightcore', 'instrumental'];
            const targetVersionTags = VERSION_TAGS.filter(tag => normTitle.includes(tag));
            const STRICT_VERSION_TAGS = VERSION_TAGS.filter(tag => tag !== 'lofi' && tag !== 'instrumental');
            const targetStrictTags = targetVersionTags.filter(tag => STRICT_VERSION_TAGS.includes(tag));

            return (candidate) => {
                // Duration Parsing
                let cDuration = 0;
                if (candidate.duration_ms) {
                    cDuration = Math.round(parseInt(candidate.duration_ms) / 1000);
                } else if (candidate.duration) {
                    const d = parseInt(candidate.duration, 10);
                    cDuration = (d > 10000) ? Math.round(d / 1000) : d;
                }

                // ISRC Golden Key
                if (track.external_ids?.isrc && candidate.more_info?.isrc) {
                    if (track.external_ids.isrc === candidate.more_info.isrc) {
                        return { id: candidate.id, title: candidate.title, artist: candidate.primaryArtists, score: 1.0, durationSim: 1.0 };
                    }
                }

                const cTitle = candidate.title || candidate.name || '';
                let cArtistRaw = candidate.primaryArtists || candidate.artist || candidate.singers ||
                    candidate.subtitle || candidate.artists?.primary?.[0]?.name || candidate.artists?.all?.[0]?.name || '';
                if (!cArtistRaw && candidate.more_info) {
                    cArtistRaw = candidate.more_info.primary_artists ||
                        candidate.more_info.artistMap?.primary_artists?.[0]?.name ||
                        candidate.more_info.singers || candidate.more_info.music || '';
                }

                const cArtist = normalize(cArtistRaw);
                const normCTitle = normalize(cTitle);

                // Hard filter: version tags
                if (targetStrictTags.length > 0) {
                    if (!targetStrictTags.every(tag => normCTitle.includes(tag))) return null;
                }

                // Hard filter: title similarity floor
                const titleSim = calculateSimilarity(rawTitle, cTitle);
                if (titleSim < 0.35) return null;

                // Hard filter: artist must exist
                const normCArtist = normalize(cArtist);
                if (!cArtist || normCArtist.length < 2) return null;

                // Artist similarity
                const splitArtists = (str) => str.split(/,|&|feat\.|ft\./).map(s => normalize(s)).filter(s => s.length > 0);
                const targetArtists = [normalize(primaryArtist), ...allArtists.map(normalize)];
                const candidateArtists = splitArtists(cArtistRaw);
                let bestArtistMatch = 0;

                if (NORMALIZED_ALIASES[normArtist]?.includes(normCArtist)) {
                    bestArtistMatch = 1.0;
                } else {
                    for (const tArt of targetArtists) {
                        for (const cArt of candidateArtists) {
                            const sim = calculateSimilarity(tArt, cArt);
                            if (sim > bestArtistMatch) bestArtistMatch = sim;
                            if (NORMALIZED_ALIASES[tArt]?.includes(cArt)) bestArtistMatch = 1.0;
                        }
                    }
                }

                if (bestArtistMatch < 0.35) return null;
                if (bestArtistMatch < 0.45 && titleSim < 0.85) return null;

                // Duration similarity
                let durationSim = 1.0;
                if (durationSec > 0 && cDuration > 0) {
                    const diff = Math.abs(durationSec - cDuration);
                    const tolerance = durationSec < 60 ? 5 : Math.max(7, durationSec * 0.10);
                    if (diff > 45 && diff > durationSec * 0.25) return null;
                    durationSim = Math.max(0, 1 - (diff / (tolerance * 3)));
                }

                const finalScore = (0.50 * titleSim) + (0.30 * bestArtistMatch) + (0.20 * durationSim);
                return { id: candidate.id, title: cTitle, artist: cArtist, score: finalScore, titleSim, artistSim: bestArtistMatch, durationSim };
            };
        };

        // --- SEARCH EXECUTOR ---
        const searchQuery = async (query, cookieHeader, apiUrl) => {
            try {
                const res = await fetch(
                    `${apiUrl}/api/search/songs?query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`,
                    { headers: { 'Cookie': cookieHeader } }
                );
                const data = await res.json();
                return (data.success && data.data?.results) ? data.data.results : [];
            } catch {
                return [];
            }
        };

        // --- TWO-PHASE PARALLEL STRATEGY ---
        // Phase 1: Fire the BEST query for ALL songs simultaneously
        // Phase 2: Only run fallback queries for songs that didn't win fast in Phase 1

        const primaryQueries = spotifyTracks.map(track => {
            const cacheKey = `${track.name.toLowerCase()}|${(track.artists[0]?.name || '').toLowerCase()}|${Math.round((track.duration_ms || 0) / 1000)}`;
            return { track, cacheKey, query: `${track.name} ${track.artists[0]?.name || ''}` };
        });

        // Phase 1: ALL songs searched in parallel simultaneously
        console.log(`[Import] Phase 1: Parallel primary search for all ${spotifyTracks.length} tracks...`);
        const phase1Results = await Promise.all(
            primaryQueries.map(async ({ track, cacheKey, query }) => {
                if (matchCache.has(cacheKey)) return { track, cacheKey, result: matchCache.get(cacheKey), done: true };
                const scorer = buildScorer(track);
                const candidates = await searchQuery(query, cookieHeader, apiUrl);
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

        // Phase 2: Run fallback queries for songs that are NOT yet matched
        const needsFallback = phase1Results.filter(r => !r.done);
        console.log(`[Import] Phase 2: Fallback search for ${needsFallback.length} unmatched tracks...`);

        const phase2Results = await Promise.all(
            needsFallback.map(async ({ track, cacheKey, bestScore: p1Score, best: p1Best }) => {
                const scorer = buildScorer(track);
                const normTitle = normalize(track.name);
                const normArtist = normalize(track.artists[0]?.name || '');

                const fallbackQueries = [
                    `${track.artists[0]?.name || ''} ${track.name}`,  // Artist first
                    `${normTitle} ${normArtist}`,                       // Clean normalized
                    track.name,                                          // Title only
                ].filter(q => q.trim().length > 2);

                // OPTIMIZATION: Run all fallback queries in parallel, then pick the best
                const fallbackCandidates = await Promise.all(
                    [...new Set(fallbackQueries)].map(q => searchQuery(q, cookieHeader, apiUrl))
                );

                let bestMatch = p1Best;
                let bestScore = p1Score || 0;

                for (const candidates of fallbackCandidates) {
                    for (const c of candidates) {
                        const s = scorer(c);
                        if (s && s.score > bestScore) { bestScore = s.score; bestMatch = s; }
                    }
                }

                if (bestMatch && bestScore >= ACCEPT_THRESHOLD) {
                    console.log(`  ✓ [P2] "${track.name}" → "${bestMatch.title}" (${bestScore.toFixed(2)})`);
                    matchCache.set(cacheKey, bestMatch.id);
                    return bestMatch.id;
                } else {
                    console.log(`  ✗ SKIP: "${track.name}" (Best: ${bestScore.toFixed(2)})`);
                    matchCache.set(cacheKey, null);
                    return null;
                }
            })
        );

        // Merge results in original order
        let fallbackIdx = 0;
        const jammifySongIds = [];
        for (const r of phase1Results) {
            if (r.done) {
                if (r.result) jammifySongIds.push(r.result);
            } else {
                const id = phase2Results[fallbackIdx++];
                if (id) jammifySongIds.push(id);
            }
        }

        const newPlaylist = new Playlist({
            name: details.name || 'Imported Playlist',
            userId: session.user.id,
            songIds: jammifySongIds,
            isPublic: true,
            description: details.description || '',
            image: details.images?.[0]?.url || ''
        });

        await newPlaylist.save();

        const elapsed = ((Date.now() - importStart) / 1000).toFixed(1);
        console.log(`[Import] ✅ Done: ${jammifySongIds.length}/${spotifyTracks.length} songs matched in ${elapsed}s`);

        return NextResponse.json({
            success: true,
            data: newPlaylist,
            message: `Successfully imported ${jammifySongIds.length} of ${spotifyTracks.length} songs`
        });

    } catch (error) {
        console.error('Import Playlist Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
