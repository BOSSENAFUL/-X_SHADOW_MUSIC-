import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Playlist from '@/models/Playlist';
import connectDB from '@/lib/mongodb';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
        }

        // Extract Playlist ID
        const playlistIdMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
        if (!playlistIdMatch) {
            return NextResponse.json({ success: false, error: 'Invalid Spotify URL' }, { status: 400 });
        }
        const playlistId = playlistIdMatch[1];

        // Connect DB
        await connectDB();

        // Fetch from the new Spotify Express API
        const externalApiUrl = process.env.SPOTIFY_EX_API_URL || 'https://spotify-ex-api.vercel.app';
        let spotifyData;
        try {
            const apiRes = await fetch(`${externalApiUrl}/api/playlist/${playlistId}`);
            if (!apiRes.ok) throw new Error(`External API failed with status ${apiRes.status}`);
            spotifyData = await apiRes.json();
        } catch (error) {
            console.error('Failed to fetch from external Spotify API:', error);
            return NextResponse.json({ success: false, error: 'Failed to fetch playlist data from Spotify.' }, { status: 502 });
        }

        if (!spotifyData || !spotifyData.tracks) {
            return NextResponse.json({ success: false, error: 'Spotify playlist not found or empty' }, { status: 404 });
        }

        const { name: playlistName, description, imageUrl, tracks: spotifyTracks } = spotifyData;
        const playlistDescription = description || `Imported from Spotify`;

        const jammifySongIds = [];

        // Helper to search via internal API with multi-stage matching logic
        const processTrack = async (track) => {
            if (!track || !track.name) return null;

            const spotifyTitle = track.name;
            const spotifyArtists = Array.isArray(track.artists) ? track.artists : [track.artists || ''];
            const spotifyArtistsString = spotifyArtists.join(' ');
            const spotifyMainArtist = spotifyArtists[0];

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const cookieHeader = req.headers.get('cookie') || '';

            // Search strategies in order of preference
            const searchStrategies = [
                `${spotifyTitle} ${spotifyArtistsString}`, // Full title + All artists
                `${spotifyTitle} ${spotifyMainArtist}`,   // Title + Main artist
                spotifyTitle, // Just the title
                spotifyTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim() // Title without (labels)
            ].filter((q, i, self) => q && self.indexOf(q) === i); // Unique queries

            for (const query of searchStrategies) {
                try {
                    const res = await fetch(`${apiUrl}/api/search?query=${encodeURIComponent(query)}&limit=10`, {
                        headers: { 'Cookie': cookieHeader }
                    });

                    if (!res.ok) continue;
                    const data = await res.json();

                    if (data.success && data.data?.songs?.results?.length > 0) {
                        const results = data.data.songs.results;
                        const scoredResults = results.map(result => {
                            let score = 0;
                            const resultTitle = (result.title || result.name || '').toLowerCase();
                            const resultArtistStr = (result.primaryArtists || result.artist || '').toLowerCase();
                            const targetTitle = spotifyTitle.toLowerCase();
                            const targetArtists = spotifyArtists.map(a => a.toLowerCase());

                            // 1. Artist Match (Check all artists) - CRITICAL
                            const cleanArtist = (s) => s.replace(/[^\w]/g, '').toLowerCase();
                            const targetArtistsClean = targetArtists.map(cleanArtist).filter(Boolean);
                            const resultArtistStrClean = cleanArtist(resultArtistStr);
                            const resultTitleCleanForArtist = cleanArtist(resultTitle);

                            let artistMatchScore = 0;
                            if (targetArtistsClean.length > 0) {
                                for (const artist of targetArtistsClean) {
                                    if (resultArtistStrClean.includes(artist) || artist.includes(resultArtistStrClean)) {
                                        artistMatchScore = 80;
                                        break;
                                    }
                                }

                                // If no direct artist match in artist field, check if artist name is in the result title
                                if (artistMatchScore === 0) {
                                    for (const artist of targetArtistsClean) {
                                        if (resultTitleCleanForArtist.includes(artist)) {
                                            artistMatchScore = 35;
                                            break;
                                        }
                                    }
                                }
                            }

                            score += artistMatchScore;

                            // Penalty for completely wrong artist if we have clear artist data
                            if (artistMatchScore === 0 && targetArtistsClean.length > 0) {
                                score -= 30;
                            }

                            // 2. Title Match
                            const cleanStr = (s) => s.replace(/[^\w\s]/g, '').toLowerCase().trim();
                            const targetTitleClean = cleanStr(targetTitle);
                            const resultTitleClean = cleanStr(resultTitle);

                            if (targetTitleClean === resultTitleClean) {
                                score += 50;
                            } else if (resultTitle.includes(targetTitle) || targetTitle.includes(resultTitle)) {
                                score += 20;
                            }

                            // 3. Duration Match (High confidence booster)
                            if (track.duration && result.duration) {
                                const diff = Math.abs(parseInt(track.duration) / 1000 - parseInt(result.duration));
                                if (diff < 3) score += 40; // Very close
                                else if (diff < 10) score += 20; // Acceptable
                                else if (diff > 45) score -= 50; // Completely different length
                            }

                            // 4. Version keyword matching
                            const versionKeywords = ['slowed', 'reverb', 'remix', 'edit', 'acoustic', 'live', 'sped up', 'lofi'];
                            versionKeywords.forEach(word => {
                                const inTarget = targetTitle.includes(word);
                                const inResult = resultTitle.includes(word);
                                if (inTarget && inResult) score += 45;
                                else if (!inTarget && inResult) score -= 40;
                                else if (inTarget && !inResult) score -= 30;
                            });

                            return { id: result.id, score, title: result.title, artist: result.primaryArtists };
                        });

                        scoredResults.sort((a, b) => b.score - a.score);

                        // Threshold raised to 100 to ensure high-confidence matches (Artist + Title consensus)
                        if (scoredResults[0].score >= 100) {
                            console.log(`[Import] High-confidence match for "${spotifyTitle}": "${scoredResults[0].title}" by ${scoredResults[0].artist} (Score: ${scoredResults[0].score})`);
                            return scoredResults[0].id;
                        } else {
                            console.log(`[Import] Ignoring low-confidence match for "${spotifyTitle}": "${scoredResults[0].title}" (Score: ${scoredResults[0].score})`);
                        }
                    }
                } catch (e) {
                    console.error(`[Import] Search failed for query "${query}":`, e.message);
                }
            }

            console.warn(`[Import] NO MATCH FOUND for: ${spotifyTitle} by ${spotifyArtistsString}`);
            return null;
        };

        // Process in batches of 10
        const chunkSize = 10;
        for (let i = 0; i < spotifyTracks.length; i += chunkSize) {
            const chunk = spotifyTracks.slice(i, i + chunkSize);
            const results = await Promise.all(chunk.map(processTrack));
            results.forEach(id => {
                if (id) jammifySongIds.push(id);
            });
        }

        // Create Jammify Playlist
        const newPlaylist = new Playlist({
            name: playlistName,
            userId: session.user.id,
            songIds: jammifySongIds,
            isPublic: true,
            description: playlistDescription,
            image: imageUrl // Save the Spotify playlist cover
        });

        await newPlaylist.save();

        return NextResponse.json({
            success: true,
            data: newPlaylist,
            message: `Imported ${jammifySongIds.length} of ${spotifyTracks.length} songs.`
        });

    } catch (error) {
        console.error('Import Playlist Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
