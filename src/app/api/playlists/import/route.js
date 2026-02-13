
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

        // Helper to search via internal API
        const processTrack = async (track) => {
            if (!track || !track.name) return null;

            const artist = track.artists && track.artists[0] ? track.artists[0].name : '';
            const query = `${track.name} ${artist}`;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

            try {
                // Use Jammify's internal search API
                const res = await fetch(`${apiUrl}/api/search?query=${encodeURIComponent(query)}&limit=1`, {
                    headers: {
                        'Cookie': req.headers.get('cookie') || '', // Pass cookies if needed (e.g. for rate limiting)
                    }
                });

                if (!res.ok) return null;

                const data = await res.json();

                if (data.success && data.data && data.data.songs && data.data.songs.results && data.data.songs.results.length > 0) {
                    return data.data.songs.results[0].id;
                }
                return null;

            } catch (e) {
                console.error(`Failed to search for ${query}:`, e.message);
                return null;
            }
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
