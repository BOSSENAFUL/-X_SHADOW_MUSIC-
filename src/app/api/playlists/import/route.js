import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { cookies } from 'next/headers';
import { getPlaylistDetails, getPlaylistTracks } from '@/lib/spotify';
import { compareTwoStrings } from 'string-similarity';

// --- CONFIGURATION ---
const CONCURRENCY_LIMIT = 10;
const ACCEPT_THRESHOLD = 0.72; // Adjusted for community slowed tracks

// Known Artist Aliases (Raw)
const RAW_ARTIST_ALIASES = {
    'c418': ['daniel rosenfeld'],
    'daniel rosenfeld': ['c418'],
    'lena raine': ['lena raine kuhlmann'],
};

// Normalize text - remove special chars, lowercase, trim, remove accents
const normalize = (text) => {
    if (!text) return '';
    let normalized = text
        .normalize("NFD") // Decompose chars (e.g. "ō" -> "o" + "¯")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Genre & Common Variations normalization
    normalized = normalized
        .replace(/\blo\s+fi\b/g, 'lofi') // "lo fi" -> "lofi"
        .replace(/\blo\s*-\s*fi\b/g, 'lofi') // "lo-fi" -> "lofi"
        .replace(/\bslowed\s+reverb\b/g, 'slowed')
        .replace(/\bo\s+s\s+t\b/g, 'ost');

    return normalized;
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

// Calculate similarity between two strings (Sørensen–Dice + Containment fallback)
const calculateSimilarity = (str1, str2) => {
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);

    // Exact match
    if (norm1 === norm2) return 1.0;

    // Use string-similarity for better fuzzy matching
    const sim = compareTwoStrings(norm1, norm2);

    // Containment bonus - if one title is completely inside another, it's likely a version match
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
                // 1. Clean Search: Title + First Artist (Best for Lofi)
                `${rawTitle} ${primaryArtist.replace(/\./g, '')}`,

                // 2. Just the Title (High risk, but good for rare small artists)
                `${rawTitle}`,

                // 3. Artist + Title
                `${primaryArtist.replace(/\./g, '')} ${rawTitle}`,

                // 4. Tokenized Fallback
                `${titleTokens.join(' ')} ${artistTokens.join(' ')}`,

                // 5. Normalized Joined Query (Specifically for Lofi variations)
                `${normalize(rawTitle)} ${normalize(primaryArtist)}`
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
                // RELAXATION: Don't be strict about 'lofi' and 'instrumental' as they are often mismatched
                const STRICT_VERSION_TAGS = VERSION_TAGS.filter(tag => tag !== 'lofi' && tag !== 'instrumental');
                const targetStrictTags = targetVersionTags.filter(tag => STRICT_VERSION_TAGS.includes(tag));
                
                if (targetStrictTags.length > 0) {
                    const hasAllStrictTags = targetStrictTags.every(tag => normCTitle.includes(tag));
                    if (!hasAllStrictTags) return null;
                }

                // Also, if target DOES NOT have tags, reject candidate if it has them (e.g. dont match "Remix" to original)
                // This is tricky, let's just enforce: neither should have unshared tags
                for (const tag of VERSION_TAGS) {
                    if (!normTitle.includes(tag) && normCTitle.includes(tag)) {
                        // Candidate has a tag that target doesn't. Reject unless target has forbidden keywords handled elsewhere.
                        // Actually, let's trust the Forbidden Keywords filter below for that.
                    }
                }

                // HARD FILTER 1: Title Similarity (Very relaxed for unofficial API + Lofi)
                const titleSim = calculateSimilarity(rawTitle, cTitle);
                if (titleSim < 0.35) return null;

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
                            const sim = calculateSimilarity(tArt, cArt);
                            if (sim > bestArtistMatch) bestArtistMatch = sim;
                            
                            // Handle aliases within loop
                            if (NORMALIZED_ALIASES[tArt] && NORMALIZED_ALIASES[tArt].includes(cArt)) {
                                bestArtistMatch = 1.0;
                            }
                        }
                    }
                }
                artistSim = bestArtistMatch;

                // RELAXED REJECTION: Artist must match
                // Floor is lowered to 0.35 if title match is exceptionally strong.
                // Lofi artists often have many variations (Lo-Fi, Lo Fi, Lofi, etc.)
                if (artistSim < 0.35) return null; // Hard floor
                if (artistSim < 0.45 && titleSim < 0.85) return null; // Relaxed floor requires stronger title match

                // REMOVED: Forbidden Keywords hard filter. 
                // Unofficial API metadata often mismatches tags (slowed/reverb).
                // We let the similarity score handle this instead of a hard reject.


                // HARD FILTER 4: Duration Check (Relaxed)
                // Unofficial API durations are often rounded or incorrect.
                // We calculate similarity but NEVER hard-reject (null).
                let durationSim = 1.0;
                if (durationSec > 0 && cDuration > 0) {
                    const diff = Math.abs(durationSec - cDuration);
                    const tolerance = durationSec < 60 ? 5 : Math.max(7, durationSec * 0.08);
                    durationSim = Math.max(0, 1 - (diff / (tolerance * 3))); // Very loose weighting
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

            // STEP 3 — SEARCH EACH QUERY (Center optimization here)
            // Function to execute a single query
            const executeQuery = async (query) => {
                try {
                    const res = await fetch(
                        `${apiUrl}/api/search/songs?query=${encodeURIComponent(query)}&limit=20`,
                        { headers: { 'Cookie': cookieHeader } }
                    );
                    const data = await res.json();

                    let bestInQuery = null;
                    let bestScoreInQuery = 0;

                    if (data.success && data.data?.results) {
                        for (const candidate of data.data.results) {
                            const scored = scoreCandidate(candidate);

                            if (scored && scored.score > bestScoreInQuery) {
                                bestScoreInQuery = scored.score;
                                bestInQuery = scored;
                            }
                        }
                    }
                    return { match: bestInQuery, score: bestScoreInQuery };
                } catch (e) {
                    console.error(`  Error searching "${query}":`, e.message);
                    return { match: null, score: 0 };
                }
            };

            // Process queries in parallel batches to optimize speed
            const QUERY_BATCH_SIZE = 3;

            for (let i = 0; i < uniqueQueries.length; i += QUERY_BATCH_SIZE) {
                // If we already found an excellent match in previous batch, stop
                if (bestScore >= 0.95) {
                    console.log(`  Early exit - excellent match found`);
                    break;
                }

                const batch = uniqueQueries.slice(i, i + QUERY_BATCH_SIZE);

                // Fetch current batch in parallel
                const results = await Promise.all(batch.map(q => executeQuery(q)));

                // Evaluate results IN ORDER to respect query priority
                for (const result of results) {
                    if (result && result.match && result.score > bestScore) {
                        bestScore = result.score;
                        bestMatch = result.match;
                    }
                    // Check threshold inside the loop to break inner processing if needed (optimization)
                    if (bestScore >= 0.95) break;
                }
            }

            // AUTO DECISION
            console.log('Best Score:', bestScore);
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
