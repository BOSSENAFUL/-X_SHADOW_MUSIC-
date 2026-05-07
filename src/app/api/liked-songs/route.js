import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LikedSong from '@/models/LikedSong';
import mongoose from 'mongoose';
import cache from '@/lib/cache';

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
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60', // Browser cache for 1 minute
      }
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
