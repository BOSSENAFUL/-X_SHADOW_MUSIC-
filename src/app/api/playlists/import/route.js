import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import { getPlaylistData } from '@/lib/spotify';
import {
    matchAllTracks,
    ACCEPT_THRESHOLD,
    ACCEPT_THRESHOLD_YT,
} from '@/lib/matcher';

// ---------------------------------------------------------------------------
// YOUTUBE MUSIC FETCHER
// ---------------------------------------------------------------------------
const fetchYouTubeMusicPlaylist = async (playlistId) => {
    try {
        console.log(`[YT Music] Fetching playlist: ${playlistId}`);
        const res = await fetch(
            `https://express-ytmusic-api.vercel.app/api/playlist?id=${playlistId}`
        );

        if (!res.ok) {
            console.error(`[YT Music] API returned ${res.status}`);
            return null;
        }

        const data = await res.json();
        if (!data.success || !data.playlist) {
            console.error('[YT Music] Invalid response structure');
            return null;
        }

        const songs = data.playlist.songs || [];
        console.log(`[YT Music] Found ${songs.length} songs`);

        const tracks = songs.map((song, index) => {
            let artistName = '';
            if (song.artist) artistName = song.artist;
            else if (song.subtitle) artistName = song.subtitle;
            else if (song.artists?.length > 0) artistName = song.artists[0].name || song.artists[0];

            if (index < 3) {
                console.log(
                    `[YT Music] Song ${index + 1}: "${song.title}" by "${artistName}"`
                );
            }

            return {
                name: song.title || '',
                artists: [{ name: artistName }],
                duration_ms: 0,
                external_ids: {},
                ytMusicId: song.id,
            };
        });

        return {
            details: {
                name: data.playlist.title || 'Imported Playlist',
                description: 'Imported from YouTube Music',
                images: data.playlist.thumbnail ? [{ url: data.playlist.thumbnail }] : [],
            },
            tracks,
        };
    } catch (err) {
        console.error('[YT Music] Fetch error:', err.message);
        return null;
    }
};

// ---------------------------------------------------------------------------
// APPLE MUSIC FETCHER
// ---------------------------------------------------------------------------
const fetchAppleMusicPlaylist = async (url) => {
    try {
        console.log(`[Apple Music] Fetching playlist: ${url}`);
        const res = await fetch(
            `https://apple-music-api-server.vercel.app/api/playlist?url=${encodeURIComponent(url)}`
        );

        if (!res.ok) {
            console.error(`[Apple Music] API returned ${res.status}`);
            return null;
        }

        const data = await res.json();
        if (!data.success || !data.data) {
            console.error('[Apple Music] Invalid response structure');
            return null;
        }

        const playlistInfo = data.data;
        const songsList = playlistInfo.tracks || [];
        console.log(`[Apple Music] Found ${songsList.length} songs`);

        const tracks = songsList.map((song, index) => {
            const rawArtist = (song.artistName || '').trim();
            const artistNames = rawArtist
                .split(/,|\s+&\s+|\s+feat\.\s+|\s+ft\.\s+/i)
                .map((a) => a.trim())
                .filter((a) => a.length > 0 && a !== rawArtist);

            // First entry is full raw artist string, followed by individual parsed artists
            const allArtistNames = rawArtist ? [rawArtist, ...artistNames] : artistNames;
            const artists = allArtistNames.length > 0
                ? allArtistNames.map((name) => ({ name }))
                : [{ name: 'Unknown Artist' }];

            if (index < 3) {
                console.log(
                    `[Apple Music] Song ${index + 1}: "${song.name}" by "${artists.map((a) => a.name).join(', ')}"`
                );
            }

            return {
                name: song.name || '',
                artists,
                duration_ms: song.durationInMillis || 0,
                external_ids: {},
                appleMusicId: song.id,
            };
        });

        const animatedArtworkUrl =
            playlistInfo.animatedArtworkUrl ||
            playlistInfo.animatedArtwork ||
            playlistInfo.videoUrl ||
            data.animatedArtworkUrl ||
            data.animatedArtwork ||
            '';

        console.log(`[Apple Music] Animated Artwork URL: ${animatedArtworkUrl || 'None'}`);

        return {
            details: {
                name: playlistInfo.playlistName || 'Imported Playlist',
                description: playlistInfo.description || 'Imported from Apple Music',
                images: playlistInfo.artworkUrl ? [{ url: playlistInfo.artworkUrl }] : [],
                animatedArtworkUrl,
            },
            tracks,
        };
    } catch (err) {
        console.error('[Apple Music] Fetch error:', err.message);
        return null;
    }
};

// ---------------------------------------------------------------------------
// ROUTE HANDLER
// ---------------------------------------------------------------------------
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const rawUrl = body?.url;
        if (!rawUrl || typeof rawUrl !== 'string') {
            return NextResponse.json(
                { success: false, error: 'URL is required' },
                { status: 400 }
            );
        }

        const url = rawUrl.trim();

        // ── Detect source & extract playlist ID ──────────────────────────────
        let sourceName = null;
        let playlistId = null;

        if (url.includes('spotify.com/playlist/')) {
            sourceName = 'spotify';
            playlistId = url.split('/playlist/')[1]?.split('?')[0];
        } else if (url.includes('music.youtube.com/playlist')) {
            sourceName = 'youtube';
            playlistId = new URLSearchParams(url.split('?')[1]).get('list');
        } else if (url.includes('music.apple.com/') && url.includes('/playlist/')) {
            sourceName = 'apple';
            playlistId = url; // Pass full URL for Apple Music
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error:
                        'Invalid playlist URL. Please provide a Spotify, YouTube Music, or Apple Music playlist URL.',
                },
                { status: 400 }
            );
        }

        if (!playlistId) {
            return NextResponse.json(
                { success: false, error: 'Could not extract playlist ID from URL' },
                { status: 400 }
            );
        }

        console.log(`[Import] Source: ${sourceName}, ID: ${playlistId}`);

        // ── Fetch source playlist ─────────────────────────────────────────────
        let playlistData = null;
        if (sourceName === 'spotify') {
            playlistData = await getPlaylistData(playlistId);
        } else if (sourceName === 'youtube') {
            playlistData = await fetchYouTubeMusicPlaylist(playlistId);
        } else if (sourceName === 'apple') {
            playlistData = await fetchAppleMusicPlaylist(url);
        }

        if (!playlistData) {
            const msg =
                sourceName === 'spotify'
                    ? 'Failed to fetch playlist from Spotify. Make sure the playlist is public.'
                    : sourceName === 'youtube'
                    ? 'Failed to fetch playlist from YouTube Music. Make sure the playlist is public.'
                    : 'Failed to fetch playlist from Apple Music. Make sure the playlist is public.';
            return NextResponse.json({ success: false, error: msg }, { status: 404 });
        }

        const { details, tracks: sourceTracks } = playlistData;

        if (!sourceTracks?.length) {
            const msg =
                sourceName === 'spotify'
                    ? 'No tracks found in the Spotify playlist.'
                    : sourceName === 'youtube'
                    ? 'No tracks found in the YouTube Music playlist. Note: Radio/Mix playlists (starting with "RD") may not be supported.'
                    : 'No tracks found in the Apple Music playlist.';
            return NextResponse.json({ success: false, error: msg }, { status: 404 });
        }

        console.log(
            `[Import] Processing "${details.name}" — ${sourceTracks.length} tracks`
        );

        const importStart = Date.now();
        await connectDB();

        const isYouTubeSource = sourceName === 'youtube';
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        // ── Match all tracks via the shared matcher ───────────────────────────
        const matchResults = await matchAllTracks(sourceTracks, apiBase, isYouTubeSource);

        // matchAllTracks returns [{ spotifyId, jioId }] — collect non-null jioIds
        // For import we don't have spotifyIds on every track, so just collect jioIds
        const jammifySongIds = matchResults
            .map((r) => r.jioId)
            .filter(Boolean);

        // ── Save playlist ─────────────────────────────────────────────────────
        const newPlaylist = new Playlist({
            name: details.name || 'Imported Playlist',
            userId: session.user.id,
            songIds: jammifySongIds,
            isPublic: true,
            description: details.description || '',
            image: details.images?.[0]?.url || '',
            animatedArtworkUrl: details.animatedArtworkUrl || '',
        });

        await newPlaylist.save();

        const elapsed = ((Date.now() - importStart) / 1000).toFixed(1);
        const sourceLabel =
            sourceName === 'spotify'
                ? 'Spotify'
                : sourceName === 'youtube'
                ? 'YouTube Music'
                : 'Apple Music';
        console.log(
            `[Import] ✅ Done: ${jammifySongIds.length}/${sourceTracks.length} songs matched in ${elapsed}s (${sourceLabel})`
        );

        return NextResponse.json({
            success: true,
            data: newPlaylist,
            message: `Successfully imported ${jammifySongIds.length} of ${sourceTracks.length} songs from ${sourceLabel}`,
        });
    } catch (error) {
        console.error('[Import] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
