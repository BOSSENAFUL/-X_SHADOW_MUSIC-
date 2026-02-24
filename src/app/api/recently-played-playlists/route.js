import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import RecentlyPlayedPlaylist from '@/models/RecentlyPlayedPlaylist';

/**
 * GET /api/recently-played-playlists
 * Returns recently played playlists for the logged-in user (up to 50).
 */
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        const playlists = await RecentlyPlayedPlaylist.getForUser(session.user.id);

        return NextResponse.json({ success: true, data: playlists });
    } catch (error) {
        console.error('Error fetching recently played playlists:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch recently played playlists' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/recently-played-playlists
 * Records a playlist as recently played (keeps the 50 most recent).
 *
 * Body:
 * {
 *   playlistData: {
 *     id:        string,   // JioSaavn ID or MongoDB ObjectId string
 *     name:      string,
 *     image?:    Array,
 *     songCount?: number,
 *     source?:  'jiosaavn' | 'user',
 *     owner?:    string
 *   }
 * }
 */
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
        const { playlistData } = body;

        if (!playlistData?.id || !playlistData?.name) {
            return NextResponse.json(
                { success: false, error: 'playlistData.id and playlistData.name are required' },
                { status: 400 }
            );
        }

        await connectDB();

        const updated = await RecentlyPlayedPlaylist.track(session.user.id, playlistData);

        return NextResponse.json({
            success: true,
            data: updated.playlists,
            message: 'Recently played playlist tracked',
        });
    } catch (error) {
        console.error('Error tracking recently played playlist:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to track recently played playlist' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/recently-played-playlists
 * Clears the recently played history for the logged-in user.
 */
export async function DELETE(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        await connectDB();

        await RecentlyPlayedPlaylist.clearForUser(session.user.id);

        return NextResponse.json({
            success: true,
            message: 'Recently played history cleared',
        });
    } catch (error) {
        console.error('Error clearing recently played playlists:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear recently played playlists' },
            { status: 500 }
        );
    }
}
