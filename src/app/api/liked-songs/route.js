import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedSong from '@/models/LikedSong';
import mongoose from 'mongoose';
import cache from '@/lib/cache';
import { markMixStale } from '@/lib/recommendations';

// GET - Fetch all liked songs for a user
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Cache liked songs for 2 minutes
    const cacheKey = `liked-songs:${userId}`;
    const likedSongs = await cache.cachedQuery(
      cacheKey,
      () => LikedSong.findByUser(new mongoose.Types.ObjectId(userId)),
      120 // 2 minutes TTL
    );

    return NextResponse.json({
      success: true,
      data: likedSongs,
      count: likedSongs.length
    });

  } catch (error) {
    console.error('Error fetching liked songs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch liked songs' },
      { status: 500 }
    );
  }
}

// POST - Toggle like/unlike a song
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, songData } = body;

    if (!userId || !songData) {
      return NextResponse.json(
        { success: false, error: 'User ID and song data are required' },
        { status: 400 }
      );
    }

    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const result = await LikedSong.toggleLike(new mongoose.Types.ObjectId(userId), songData);

    // Invalidate cache when data changes
    cache.delete(`liked-songs:${userId}`);

    // Mark liked songs mix as stale — will refresh on next visit
    markMixStale(userId, 'liked_songs').catch(() => { });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error toggling like:', error);

    // Handle duplicate key error (trying to like the same song twice)
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Song already liked' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}

// PUT - Reorder liked songs
export async function PUT(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, songIds } = body;

    if (!userId || !songIds || !Array.isArray(songIds)) {
      return NextResponse.json(
        { success: false, error: 'User ID and songIds array are required' },
        { status: 400 }
      );
    }

    // Validate and convert userId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const now = new Date();
    // Reorder liked songs by adjusting likedAt values
    const bulkOps = songIds.map((songId, index) => ({
      updateOne: {
        filter: { userId: new mongoose.Types.ObjectId(userId), songId },
        update: { $set: { likedAt: new Date(now.getTime() - index * 1000) } }
      }
    }));

    await LikedSong.bulkWrite(bulkOps);

    // Invalidate cache
    cache.delete(`liked-songs:${userId}`);

    // Mark liked songs mix as stale
    markMixStale(userId, 'liked_songs').catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Liked songs order updated successfully'
    });

  } catch (error) {
    console.error('Error reordering liked songs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder liked songs' },
      { status: 500 }
    );
  }
}

