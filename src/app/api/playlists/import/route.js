
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getPlaylistTracks, getPlaylistDetails } from '@/lib/spotify';
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

        // Fetch Spotify details
        const [spotifyPlaylist, spotifyTracks] = await Promise.all([
            getPlaylistDetails(playlistId),
            getPlaylistTracks(playlistId)
        ]);

        if (!spotifyPlaylist) {
            return NextResponse.json({ success: false, error: 'Spotify playlist not found' }, { status: 404 });
        }

        const playlistName = spotifyPlaylist.name;
        const playlistDescription = spotifyPlaylist.description || `Imported from Spotify`;

        // Process tracks to find Jammify matches
        // We limit to 50 tracks for now to avoid timeouts, or user concurrency
        // But user asked for "all tracks". We will try to do best effort with concurrency.
        // If it's too long, it might timeout.

        const jammifySongIds = [];

        // Helper to search via internal API with multi-stage matching logic
        const processTrack = async (track) => {
            if (!track || !track.name) return null;

            const spotifyTitle = track.name;
            const spotifyArtist = track.artists && track.artists[0] ? track.artists[0].name : '';
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const cookieHeader = req.headers.get('cookie') || '';

            // Search strategies in order of preference
            const searchStrategies = [
                `${spotifyTitle} ${spotifyArtist}`,
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
                            const resultArtist = (result.primaryArtists || result.artist || '').toLowerCase();
                            const targetTitle = spotifyTitle.toLowerCase();
                            const targetArtist = spotifyArtist.toLowerCase();

                            // 1. Artist Match
                            if (resultArtist.includes(targetArtist) || targetArtist.includes(resultArtist)) {
                                score += 60;
                            } else if (resultTitle.includes(targetArtist)) {
                                score += 20;
                            }

                            // 2. Title Match
                            const cleanStr = (s) => s.replace(/[^\w\s]/g, '').toLowerCase().trim();
                            if (cleanStr(resultTitle) === cleanStr(targetTitle)) {
                                score += 50;
                            } else if (resultTitle.includes(targetTitle) || targetTitle.includes(resultTitle)) {
                                score += 20;
                            }

                            // 3. Version keyword matching
                            const versionKeywords = ['slowed', 'reverb', 'remix', 'edit', 'acoustic', 'live', 'sped up', 'lofi'];
                            versionKeywords.forEach(word => {
                                const inTarget = targetTitle.includes(word);
                                const inResult = resultTitle.includes(word);
                                if (inTarget && inResult) score += 45;
                                else if (!inTarget && inResult) score -= 30;
                                else if (inTarget && !inResult) score -= 20;
                            });

                            return { id: result.id, score, title: result.title, artist: result.primaryArtists };
                        });

                        scoredResults.sort((a, b) => b.score - a.score);

                        if (scoredResults[0].score >= 40) {
                            console.log(`[Import] Found match for "${spotifyTitle}": "${scoredResults[0].title}" by ${scoredResults[0].artist} (Score: ${scoredResults[0].score})`);
                            return scoredResults[0].id;
                        }
                    }
                } catch (e) {
                    console.error(`[Import] Search failed for query "${query}":`, e.message);
                }
            }

            console.warn(`[Import] Could not find a high-quality match for: ${spotifyTitle} by ${spotifyArtist}`);
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
        // We can't use createPlaylist static method directly as we want specific name/songs

        const newPlaylist = new Playlist({
            name: playlistName,
            userId: session.user.id,
            songIds: jammifySongIds,
            isPublic: true,
            description: playlistDescription
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
