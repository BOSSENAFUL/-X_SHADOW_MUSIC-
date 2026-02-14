import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { cookies } from 'next/headers';
import { getPlaylistDetails, getPlaylistTracks } from '@/lib/spotify';

// --- CONFIGURATION ---
const CONCURRENCY_LIMIT = 5;
const ACCEPT_THRESHOLD = 0.85; // Stricter threshold for high precision

// Known Artist Aliases (Raw)
const RAW_ARTIST_ALIASES = {
    'c418': ['daniel rosenfeld'],
    'daniel rosenfeld': ['c418'],
    'lena raine': ['lena raine kuhlmann'],
};

// Normalize text - remove special chars, lowercase, trim
const normalize = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Pre-compute normalized aliases for O(1) lookup
const NORMALIZED_ALIASES = {};
for (const [key, values] of Object.entries(RAW_ARTIST_ALIASES)) {
    const normKey = normalize(key);
    NORMALIZED_ALIASES[normKey] = values.map(v => normalize(v));
}

// Tokenize text into words
const tokenize = (text) => {
    return normalize(text).split(' ').filter(w => w.length > 0);
};

// Calculate similarity between two strings (Jaccard + Levenshtein hybrid)
const calculateSimilarity = (str1, str2) => {
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);

    // Exact match
    if (norm1 === norm2) return 1.0;

    // Containment
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

    // Token overlap (Jaccard)
    const tokens1 = tokenize(str1);
    const tokens2 = tokenize(str2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const intersection = tokens1.filter(t => tokens2.includes(t));
    const union = [...new Set([...tokens1, ...tokens2])];

    return intersection.length / union.length;
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

        const details = await getPlaylistDetails(playlistId);
        if (!details) {
            return NextResponse.json({ success: false, error: 'Failed to fetch playlist from Spotify' }, { status: 404 });
        }

        const spotifyTracks = await getPlaylistTracks(playlistId);
        if (!spotifyTracks || spotifyTracks.length === 0) {
            return NextResponse.json({ success: false, error: 'No tracks in playlist' }, { status: 404 });
        }

        await connectDB();
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.toString();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        const jammifySongIds = [];

        // --- CORE MATCHING ENGINE ---
        const processTrack = async (track) => {
            const rawTitle = track.name;
            const primaryArtist = track.artists[0]?.name || '';
            const allArtists = track.artists.map(a => a.name);
            const albumName = track.album?.name || '';
            const durationMs = track.duration_ms || 0;
            const durationSec = Math.round(durationMs / 1000);

            console.log(`\n[Import] "${rawTitle}" by ${primaryArtist}`);

            // STEP 1 — NORMALIZE METADATA
            const normTitle = normalize(rawTitle);
            const normArtist = normalize(primaryArtist);
            const normAlbum = normalize(albumName)
                .replace(/original.*soundtrack/g, '')
                .replace(/ost/g, '')
                .trim();

            const titleTokens = tokenize(rawTitle);
            const artistTokens = tokenize(primaryArtist);
            const albumTokens = tokenize(normAlbum);

            // STEP 2 — BUILD MULTI QUERIES (SMART + FALLBACK)
            const queries = [
                // Priority 1: Title + Artist
                `${rawTitle} ${primaryArtist}`,

                // Priority 2: Title + Artist + Album (first 2 words)
                `${rawTitle} ${primaryArtist} ${albumTokens.slice(0, 2).join(' ')}`,

                // Priority 3: Title + Album words
                `${rawTitle} ${albumTokens.slice(0, 3).join(' ')}`,

                // Priority 4: Title + "Minecraft" (Strong fallback for C418 tracks)
                `${rawTitle} Minecraft`,

                // Priority 5: Title only
                `${rawTitle}`,

                // Priority 6: Full context
                `${rawTitle} ${albumName} ${primaryArtist}`
            ].filter(q => q.trim().length > 2);

            // Remove duplicates
            const uniqueQueries = [...new Set(queries)];

            // Forbidden keywords (reject covers/remixes unless target has them)
            const forbiddenKeywords = ['lofi', 'slowed', 'reverb', 'cover', 'remix', 'remake', 'instrumental', 'piano', 'ambient', 'karaoke'];
            const targetHasForbidden = (kw) => normTitle.includes(kw);

            // Version tags to enforce
            const VERSION_TAGS = ['slowed', 'reverb', 'sped up', 'spedup', 'remix', 'live', 'acoustic', 'lofi', 'nightcore', 'instrumental'];
            const targetVersionTags = VERSION_TAGS.filter(tag => normTitle.includes(tag));

            // STEP 4 & 5 — CANDIDATE FILTERING + SCORING
            const scoreCandidate = (candidate) => {
                // 1. ROBUST DURATION PARSING
                let cDuration = 0;
                if (candidate.duration_ms) {
                    cDuration = Math.round(parseInt(candidate.duration_ms) / 1000);
                } else if (candidate.duration) {
                    const d = parseInt(candidate.duration, 10);
                    // If > 10000, likely ms
                    cDuration = (d > 10000) ? Math.round(d / 1000) : d;
                }

                // 2. ISRC EXACT MATCH (Golden Key)
                if (track.external_ids?.isrc && candidate.more_info?.isrc) {
                    if (track.external_ids.isrc === candidate.more_info.isrc) {
                        console.log(`    ✓ ISRC MATCH: ${track.external_ids.isrc}`);
                        return { id: candidate.id, title: candidate.title, artist: candidate.primaryArtists, score: 1.0, isrcMatch: true };
                    }
                }

                // Extract Metadata
                const cTitle = candidate.title || candidate.name || '';
                // Robust artist extraction (Expanded)
                let cArtistRaw = candidate.primaryArtists ||
                    candidate.artist ||
                    candidate.singers ||
                    candidate.subtitle ||
                    candidate.description ||
                    candidate.artists?.primary?.[0]?.name ||
                    candidate.artists?.all?.[0]?.name ||
                    '';

                if (!cArtistRaw && candidate.more_info) {
                    cArtistRaw = candidate.more_info.primary_artists ||
                        candidate.more_info.artistMap?.primary_artists?.[0]?.name ||
                        candidate.more_info.singers ||
                        candidate.more_info.music ||
                        candidate.more_info.performer ||
                        '';
                }

                const cArtist = normalize(cArtistRaw);
                const normCTitle = normalize(cTitle);

                // 3. HARD FILTER: VERSION TAGS (Critical)
                // If target has specific tags, candidate MUST have them too
                if (targetVersionTags.length > 0) {
                    const hasAllTags = targetVersionTags.every(tag => normCTitle.includes(tag));
                    if (!hasAllTags) return null;
                }

                // Also, if target DOES NOT have tags, reject candidate if it has them (e.g. dont match "Remix" to original)
                // This is tricky, let's just enforce: neither should have unshared tags
                for (const tag of VERSION_TAGS) {
                    if (!normTitle.includes(tag) && normCTitle.includes(tag)) {
                        // Candidate has a tag that target doesn't. Reject unless target has forbidden keywords handled elsewhere.
                        // Actually, let's trust the Forbidden Keywords filter below for that.
                    }
                }

                // HARD FILTER 1: Title Similarity
                const titleSim = calculateSimilarity(rawTitle, cTitle);
                if (titleSim < 0.55) return null;

                // 4. ADVANCED ARTIST SIMILARITY
                let artistSim = 0;
                const normCArtist = normalize(cArtist);

                // CRITICAL FIX: Reject if candidate has no artist data
                if (!cArtist || cArtist.trim().length < 2 || normCArtist.length < 2) {
                    return null;
                }

                // Helper to split artists
                const splitArtists = (str) => str.split(/,|&|feat\.|ft\./).map(s => normalize(s)).filter(s => s.length > 0);
                const targetArtists = [normalize(primaryArtist), ...(allArtists || []).map(normalize)];
                const candidateArtists = splitArtists(cArtistRaw);

                // Check direct match or alias
                let bestArtistMatch = 0;

                // Check aliases (O(1))
                if (NORMALIZED_ALIASES[normArtist] && NORMALIZED_ALIASES[normArtist].includes(normCArtist)) {
                    bestArtistMatch = 1.0;
                } else {
                    // Matrix comparison of all artist parts
                    for (const tArt of targetArtists) {
                        for (const cArt of candidateArtists) {
                            if (cArt.includes(tArt) || tArt.includes(cArt)) {
                                const sim = calculateSimilarity(tArt, cArt);
                                if (sim > bestArtistMatch) bestArtistMatch = sim;
                            }
                            // Handle aliases within loop
                            if (NORMALIZED_ALIASES[tArt] && NORMALIZED_ALIASES[tArt].includes(cArt)) {
                                bestArtistMatch = 1.0;
                            }
                        }
                    }
                }
                artistSim = bestArtistMatch;

                // STRICT REJECTION: Artist must match
                // Exception: Allow lower artist match if title is very strong (community uploads often have slight artist variations)
                if (artistSim < 0.45) return null; // Hard floor
                if (artistSim < 0.60 && titleSim <= 0.85) return null; // Standard threshold

                // HARD FILTER 3: Forbidden Keywords
                for (const kw of forbiddenKeywords) {
                    if (normCTitle.includes(kw) && !targetHasForbidden(kw)) return null;
                }

                // HARD FILTER 4: Duration Check (Robust)
                let durationSim = 1.0;
                if (durationSec > 0 && cDuration > 0) {
                    const diff = Math.abs(durationSec - cDuration);
                    const tolerance = durationSec < 60 ? 5 : Math.max(7, durationSec * 0.08);

                    if (diff > tolerance * 2.0) return null; // Too different (strict)

                    durationSim = Math.max(0, 1 - (diff / tolerance));
                }

                // FINAL SCORE
                const finalScore = (0.65 * titleSim) + (0.25 * artistSim) + (0.10 * durationSim);

                return {
                    id: candidate.id,
                    title: cTitle,
                    artist: cArtist,
                    score: finalScore,
                    titleSim,
                    artistSim,
                    durationSim
                };
            };

            let bestMatch = null;
            let bestScore = 0;

            // STEP 3 — SEARCH EACH QUERY
            for (let i = 0; i < uniqueQueries.length; i++) {
                const query = uniqueQueries[i];

                // Early exit if we found excellent match
                if (bestScore >= 0.95) {
                    console.log(`  Early exit - excellent match found`);
                    break;
                }

                try {
                    const res = await fetch(
                        `${apiUrl}/api/search/songs?query=${encodeURIComponent(query)}&limit=20`,
                        { headers: { 'Cookie': cookieHeader } }
                    );
                    const data = await res.json();

                    if (data.success && data.data?.results) {
                        for (const candidate of data.data.results) {
                            const scored = scoreCandidate(candidate);

                            if (scored && scored.score > bestScore) {
                                bestScore = scored.score;
                                bestMatch = scored;
                            }
                        }
                    }
                } catch (e) {
                    console.error(`  Error searching "${query}":`, e.message);
                }
            }

            // AUTO DECISION
            if (bestMatch && bestScore >= ACCEPT_THRESHOLD) {
                const artistDisplay = bestMatch.artist || 'Unknown';
                console.log(`  ✓ MATCH: "${bestMatch.title}" by ${artistDisplay} (Score: ${bestScore.toFixed(2)})`);
                return bestMatch.id;
            } else {
                console.log(`  ✗ SKIP: No valid match (Best: ${bestScore.toFixed(2)})`);
                return null;
            }
        };

        // Process tracks in batches
        const chunkArray = (arr, size) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );

        const chunks = chunkArray(spotifyTracks, CONCURRENCY_LIMIT);

        for (const chunk of chunks) {
            const results = await Promise.all(chunk.map(processTrack));
            results.forEach(id => {
                if (id) jammifySongIds.push(id);
            });
        }

        // Create playlist
        const newPlaylist = new Playlist({
            name: details.name || 'Imported Playlist',
            userId: session.user.id,
            songIds: jammifySongIds,
            isPublic: true,
            description: details.description || '',
            image: details.images?.[0]?.url || ''
        });

        await newPlaylist.save();

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
