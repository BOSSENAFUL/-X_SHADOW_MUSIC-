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
const ACCEPT_THRESHOLD_YT = 0.65; // Lower threshold for YouTube Music due to metadata differences
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

// --- YOUTUBE MUSIC HELPERS ---
const fetchYouTubeMusicPlaylist = async (playlistId) => {
    try {
        console.log(`[YT Music] Fetching playlist: ${playlistId}`);
        const apiUrl = `https://express-ytmusic-api.vercel.app/api/playlist?id=${playlistId}`;
        const response = await fetch(apiUrl);
        
        console.log(`[YT Music] Response status: ${response.status}`);
        
        if (!response.ok) {
            console.error(`[YT Music] API returned ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log(`[YT Music] Response data:`, JSON.stringify(data).substring(0, 200));
        
        if (!data.success || !data.playlist) {
            console.error('[YT Music] Invalid response structure:', data);
            return null;
        }

        const songs = data.playlist.songs || [];
        console.log(`[YT Music] Found ${songs.length} songs`);
        console.log(`[YT Music] Thumbnail URL:`, data.playlist.thumbnail);

        // Transform YouTube Music data to match Spotify format
        const tracks = songs.map((song, index) => {
            // Extract artist name from various possible fields
            let artistName = '';
            if (song.artist) {
                artistName = song.artist;
            } else if (song.subtitle) {
                artistName = song.subtitle;
            } else if (song.artists && song.artists.length > 0) {
                artistName = song.artists[0].name || song.artists[0];
            }

            // Log first few songs to debug artist extraction
            if (index < 3) {
                console.log(`[YT Music] Song ${index + 1}: "${song.title}" by "${artistName}" (raw artist: ${JSON.stringify(song.artist || song.subtitle || song.artists)})`);
            }

            return {
                name: song.title || '',
                artists: [{ name: artistName }],
                duration_ms: 0, // YouTube Music API doesn't provide duration
                external_ids: {},
                // Store original YT Music ID for reference
                ytMusicId: song.id
            };
        });

        return {
            details: {
                name: data.playlist.title || 'Imported Playlist',
                description: `Imported from YouTube Music`,
                images: data.playlist.thumbnail ? [{ url: data.playlist.thumbnail }] : []
            },
            tracks: tracks
        };
    } catch (error) {
        console.error('[YT Music] Fetch error:', error.message);
        return null;
    }
};

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { url, source } = body;

        if (!url) {
            return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
        }

        let playlistData = null;
        let playlistId = null;
        let sourceName = source || 'spotify'; // Default to spotify for backward compatibility

        // Detect source from URL if not provided
        if (url.includes('spotify.com/playlist/')) {
            sourceName = 'spotify';
            playlistId = url.split('/playlist/')[1]?.split('?')[0];
        } else if (url.includes('music.youtube.com/playlist')) {
            sourceName = 'youtube';
            const urlParams = new URLSearchParams(url.split('?')[1]);
            playlistId = urlParams.get('list');
        } else {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid playlist URL. Please provide a Spotify or YouTube Music playlist URL.' 
            }, { status: 400 });
        }

        // Use appropriate threshold based on source
        const acceptThreshold = sourceName === 'youtube' ? ACCEPT_THRESHOLD_YT : ACCEPT_THRESHOLD;

        if (!playlistId) {
            return NextResponse.json({ success: false, error: 'Could not extract playlist ID from URL' }, { status: 400 });
        }

        console.log(`[Import] Source: ${sourceName}, Playlist ID: ${playlistId}`);

        // Fetch playlist data based on source
        if (sourceName === 'spotify') {
            playlistData = await getPlaylistData(playlistId);
        } else if (sourceName === 'youtube') {
            playlistData = await fetchYouTubeMusicPlaylist(playlistId);
        }

        if (!playlistData) {
            const errorMsg = sourceName === 'spotify' 
                ? 'Failed to fetch playlist from Spotify. Make sure the playlist is public and the URL is correct.'
                : 'Failed to fetch playlist from YouTube Music. Make sure the playlist is public and the URL is correct.';
            
            console.error(`[Import] ${errorMsg}`);
            return NextResponse.json({ 
                success: false, 
                error: errorMsg
            }, { status: 404 });
        }

        const { details, tracks: sourceTracks } = playlistData;

        if (!sourceTracks || sourceTracks.length === 0) {
            const errorMsg = sourceName === 'spotify'
                ? 'No tracks found in the Spotify playlist. Make sure the playlist is public and contains songs.'
                : 'No tracks found in the YouTube Music playlist. Make sure the playlist is public and contains songs. Note: Radio/Mix playlists (starting with "RD") may not be supported.';
            
            console.error(`[Import] ${errorMsg}`);
            return NextResponse.json({ success: false, error: errorMsg }, { status: 404 });
        }

        console.log(`[Import] Processing ${sourceName} playlist: ${details.name} (${sourceTracks.length} tracks)`);

        const importStart = Date.now();

        await connectDB();
        const cookieStore = await cookies();
        const cookieHeader = cookieStore.toString();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        const matchCache = new Map();

        // --- SCORING ENGINE ---
        // Separate scorers for Spotify and YouTube Music due to different data quality
        const buildSpotifyScorer = (track) => {
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

        const buildYouTubeMusicScorer = (track) => {
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
                // Extract title - JioSaavn uses 'name' field, not 'title'
                const cTitle = candidate.name || candidate.title || '';
                if (!cTitle) return null;
                
                // Extract artist - try multiple field names and nested paths
                // For JioSaavn, we need to get ALL artists, not just the first one
                let cArtistRaw = '';
                let allArtistsString = ''; // Full string with all artists for substring matching
                
                // JioSaavn search API returns artists in the 'artists' object with 'primary' array
                // Priority 1: artists.primary array (most common in search results)
                if (candidate.artists?.primary && Array.isArray(candidate.artists.primary)) {
                    const primaryArtists = candidate.artists.primary;
                    allArtistsString = primaryArtists.map(a => a.name || a).filter(Boolean).join(', ');
                    cArtistRaw = allArtistsString;
                }
                // Priority 2: primaryArtists field (string)
                else if (candidate.primaryArtists && typeof candidate.primaryArtists === 'string') {
                    allArtistsString = candidate.primaryArtists;
                    cArtistRaw = candidate.primaryArtists;
                }
                // Priority 3: more_info.primary_artists (string)
                else if (candidate.more_info?.primary_artists && typeof candidate.more_info.primary_artists === 'string') {
                    allArtistsString = candidate.more_info.primary_artists;
                    cArtistRaw = candidate.more_info.primary_artists;
                }
                // Priority 4: more_info.artistMap.primary_artists (array)
                else if (candidate.more_info?.artistMap?.primary_artists && Array.isArray(candidate.more_info.artistMap.primary_artists)) {
                    const primaryArtists = candidate.more_info.artistMap.primary_artists;
                    allArtistsString = primaryArtists.map(a => a.name || a).filter(Boolean).join(', ');
                    cArtistRaw = allArtistsString;
                }
                // Priority 5: Fallback to other fields
                else {
                    cArtistRaw = candidate.artist || candidate.singers || candidate.subtitle || 
                        candidate.artists?.primary?.[0]?.name || candidate.artists?.all?.[0]?.name || '';
                    if (!cArtistRaw && candidate.more_info) {
                        cArtistRaw = candidate.more_info.singers || candidate.more_info.music || '';
                    }
                    // Try artists array if it exists
                    if (!cArtistRaw && candidate.artists && Array.isArray(candidate.artists)) {
                        cArtistRaw = candidate.artists.map(a => a.name || a).filter(Boolean).join(', ');
                    }
                    allArtistsString = cArtistRaw;
                }

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
                        return { id: candidate.id, title: cTitle, artist: cArtistRaw, score: 1.0, durationSim: 1.0 };
                    }
                }

                const cArtist = normalize(cArtistRaw);
                const normCTitle = normalize(cTitle);
                
                // Hard filter: title similarity floor
                const titleSim = calculateSimilarity(rawTitle, cTitle);
                if (titleSim < 0.35) return null;

                // Hard filter: version tags
                if (targetStrictTags.length > 0) {
                    if (!targetStrictTags.every(tag => normCTitle.includes(tag))) return null;
                }

                // Artist similarity - handle missing artist data gracefully
                const normCArtist = normalize(cArtist);
                const hasCandidateArtist = cArtistRaw && cArtistRaw.trim().length > 0 && normCArtist.length >= 2;
                
                // If candidate has no artist data, rely heavily on title match
                if (!hasCandidateArtist) {
                    if (titleSim >= 0.85) {
                        const finalScore = titleSim * 0.9; // Slight penalty for missing artist
                        return { id: candidate.id, title: cTitle, artist: '', score: finalScore, titleSim, artistSim: 0, durationSim: 1.0 };
                    }
                    return null; // Reject if title match isn't strong enough
                }

                const splitArtists = (str) => str.split(/,|&|feat\.|ft\.|;/).map(s => normalize(s).trim()).filter(s => s.length > 0);
                const targetArtists = [normalize(primaryArtist), ...allArtists.map(normalize)].filter(a => a.length > 0);
                const candidateArtists = splitArtists(cArtistRaw);
                const fullCandidateArtist = normalize(allArtistsString); // Use the full artist string for substring matching
                let bestArtistMatch = 0;

                if (NORMALIZED_ALIASES[normArtist]?.includes(normCArtist)) {
                    bestArtistMatch = 1.0;
                } else {
                    // First pass: Check individual artist comparisons
                    for (const tArt of targetArtists) {
                        for (const cArt of candidateArtists) {
                            const sim = calculateSimilarity(tArt, cArt);
                            if (sim > bestArtistMatch) bestArtistMatch = sim;
                            if (NORMALIZED_ALIASES[tArt]?.includes(cArt)) bestArtistMatch = 1.0;
                        }
                    }
                    
                    // Second pass: Check if target artist appears as substring in full candidate string
                    // This handles cases like "Shilpa Rao" appearing in "Shashwat Sachdev, Shilpa Rao, Ujwal Gupta"
                    if (fullCandidateArtist.length > 0) {
                        for (const tArt of targetArtists) {
                            if (tArt.length > 3) {
                                // Check if target artist is a substring of the full candidate artist string
                                if (fullCandidateArtist.includes(tArt)) {
                                    bestArtistMatch = Math.max(bestArtistMatch, 0.90);
                                    break;
                                }
                                // Also check reverse: if candidate artist is substring of target
                                if (tArt.includes(normCArtist) && normCArtist.length > 3) {
                                    bestArtistMatch = Math.max(bestArtistMatch, 0.85);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Lenient artist matching for YouTube Music (due to metadata differences)
                // For very strong title matches, be lenient but still require SOME artist match
                if (titleSim >= 0.98) {
                    const minArtistScore = 0.20;
                    if (bestArtistMatch < minArtistScore) return null;
                } else if (titleSim >= 0.95) {
                    const minArtistScore = 0.25;
                    if (bestArtistMatch < minArtistScore) return null;
                } else if (titleSim >= 0.90) {
                    const minArtistScore = 0.30;
                    if (bestArtistMatch < minArtistScore) return null;
                } else {
                    // Normal title match - use standard artist requirements
                    const minArtistScore = 0.40;
                    const minArtistForLowTitle = 0.50;
                    
                    if (bestArtistMatch < minArtistScore) return null;
                    if (bestArtistMatch < minArtistForLowTitle && titleSim < 0.85) return null;
                }

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

        // Choose the appropriate scorer based on source
        const buildScorer = sourceName === 'spotify' ? buildSpotifyScorer : buildYouTubeMusicScorer;

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

        const primaryQueries = sourceTracks.map(track => {
            const cacheKey = `${track.name.toLowerCase()}|${(track.artists[0]?.name || '').toLowerCase()}|${Math.round((track.duration_ms || 0) / 1000)}`;
            
            // Clean the title by removing common YouTube Music metadata
            const cleanTitle = track.name
                .replace(/\s*\(From\s+["'].*?["']\s*(?:\/\s*.*?)?\)\s*$/gi, '')  // Remove (From "Movie" / Version)
                .replace(/\s*\|.*$/g, '')         // Remove | Artist Name | Movie
                .replace(/\s*-\s*Lofi.*$/gi, '')  // Remove - Lofi Mix
                .replace(/\s*-\s*Remix.*$/gi, '') // Remove - Remix
                .replace(/\s*\(feat\..*?\)$/gi, '') // Remove (feat. Artist)
                .trim();
            
            // Use cleaned title if it's different and valid
            const searchTitle = (cleanTitle.length > 2 && cleanTitle !== track.name) ? cleanTitle : track.name;
            const query = `${searchTitle} ${track.artists[0]?.name || ''}`.trim();
            
            return { track, cacheKey, query };
        });

        // Phase 1: ALL songs searched in parallel simultaneously
        console.log(`[Import] Phase 1: Parallel primary search for all ${sourceTracks.length} tracks...`);
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
                const hasArtist = normArtist.length > 0;

                // Build fallback queries - prioritize title-only for YouTube Music
                const fallbackQueries = [];
                
                // For YouTube Music, also try removing common suffixes FIRST
                const titleWithoutSuffix = track.name
                    .replace(/\s*\(From\s+["'].*?["']\s*(?:\/\s*.*?)?\)\s*$/gi, '')  // Remove (From "Movie" / Version)
                    .replace(/\s*\(.*?\)\s*$/g, '')  // Remove any remaining (...)
                    .replace(/\s*\|.*$/g, '')         // Remove | Artist Name | Movie
                    .replace(/\s*-\s*Lofi.*$/gi, '')  // Remove - Lofi Mix
                    .replace(/\s*-\s*Remix.*$/gi, '') // Remove - Remix
                    .replace(/\s*\(feat\..*?\)$/gi, '') // Remove (feat. Artist)
                    .trim();
                
                // Priority order: clean title first, then with artist
                if (titleWithoutSuffix !== track.name && titleWithoutSuffix.length > 2) {
                    fallbackQueries.push(titleWithoutSuffix);  // Clean title FIRST
                    if (hasArtist) {
                        fallbackQueries.push(`${titleWithoutSuffix} ${track.artists[0].name}`);
                        fallbackQueries.push(`${track.artists[0].name} ${titleWithoutSuffix}`);
                    }
                }
                
                fallbackQueries.push(track.name);  // Original title
                
                if (hasArtist) {
                    fallbackQueries.push(`${track.name} ${track.artists[0].name}`);
                    fallbackQueries.push(`${track.artists[0].name} ${track.name}`);
                    fallbackQueries.push(`${normTitle} ${normArtist}`);  // Clean normalized
                }

                // OPTIMIZATION: Run all fallback queries in parallel, then pick the best
                const uniqueQueries = [...new Set(fallbackQueries)].filter(q => q.trim().length > 2);
                
                const fallbackCandidates = await Promise.all(
                    uniqueQueries.map(q => searchQuery(q, cookieHeader, apiUrl))
                );

                let bestMatch = p1Best;
                let bestScore = p1Score || 0;
                let totalResults = 0;

                for (let i = 0; i < fallbackCandidates.length; i++) {
                    const candidates = fallbackCandidates[i];
                    totalResults += candidates.length;
                }
                
                // Debug: Log queries for songs that had results but no match
                const shouldDebug = totalResults > 10 && (!p1Best || (p1Score || 0) < acceptThreshold);
                if (shouldDebug) {
                    console.log(`  [DEBUG] "${track.name}" queries:`, uniqueQueries.slice(0, 3));
                }

                for (let i = 0; i < fallbackCandidates.length; i++) {
                    const candidates = fallbackCandidates[i];
                    
                    for (let j = 0; j < candidates.length; j++) {
                        const c = candidates[j];
                        // Debug first candidate from first query for problematic songs
                        if (shouldDebug && i === 0 && j === 0) {
                            console.log(`    First result raw: "${c.name}"`);
                            const s_test = scorer(c);
                            if (!s_test) {
                                // Manually test the scoring logic
                                const testTitle = c.title || c.name || '';
                                const testTitleSim = testTitle ? calculateSimilarity(track.name, testTitle) : 0;
                                console.log(`    Manual test - track: "${track.name}", candidate: "${testTitle}", similarity: ${testTitleSim.toFixed(2)}`);
                            } else {
                                console.log(`    Score: ${s_test.score.toFixed(2)} (title: ${s_test.titleSim?.toFixed(2)}, artist: ${s_test.artistSim?.toFixed(2)})`);
                            }
                        }
                        
                        const s = scorer(c);
                        
                        if (s && s.score > bestScore) { 
                            bestScore = s.score; 
                            bestMatch = s;
                        }
                    }
                }

                if (bestMatch && bestScore >= acceptThreshold) {
                    console.log(`  ✓ [P2] "${track.name}" → "${bestMatch.title}" (${bestScore.toFixed(2)})`);
                    matchCache.set(cacheKey, bestMatch.id);
                    return bestMatch.id;
                } else {
                    console.log(`  ✗ SKIP: "${track.name}" (Best: ${bestScore.toFixed(2)}, Results: ${totalResults}) [Artist: "${track.artists[0]?.name || 'N/A'}"]`);
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

        console.log(`[Import] Saving playlist with image:`, details.images?.[0]?.url || 'NO IMAGE');

        await newPlaylist.save();

        const elapsed = ((Date.now() - importStart) / 1000).toFixed(1);
        console.log(`[Import] ✅ Done: ${jammifySongIds.length}/${sourceTracks.length} songs matched in ${elapsed}s (${sourceName})`);

        return NextResponse.json({
            success: true,
            data: newPlaylist,
            message: `Successfully imported ${jammifySongIds.length} of ${sourceTracks.length} songs from ${sourceName === 'spotify' ? 'Spotify' : 'YouTube Music'}`
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
