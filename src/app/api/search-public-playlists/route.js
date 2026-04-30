import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

// Simple in-memory cache with TTL
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

function getCacheKey(query) {
  return `search:${query.toLowerCase().trim()}`;
}

function getFromCache(key) {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    searchCache.delete(key);
  }
  return null;
}

function setCache(key, data) {
  // Implement simple LRU by removing oldest entries
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Trim and validate query
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(trimmedQuery);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    await connectDB();

    // Try text search first (faster if text index exists)
    let playlists;
    try {
      // OPTIMIZATION 1: Use MongoDB text search for better performance
      playlists = await Playlist.find({
        isPublic: true,
        $text: { $search: trimmedQuery }
      })
        .select('name description songIds image coverImage userId createdAt updatedAt')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .limit(20)
        .lean();
    } catch (textSearchError) {
      // Fallback to regex if text index doesn't exist yet
      playlists = await Playlist.find({
        isPublic: true,
        $or: [
          { name: { $regex: trimmedQuery, $options: 'i' } },
          { description: { $regex: trimmedQuery, $options: 'i' } }
        ]
      })
        .select('name description songIds image coverImage userId createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    }

    // OPTIMIZATION 5: Batch fetch user data instead of populate
    // Extract unique user IDs
    const userIds = [...new Set(playlists.map(p => p.userId?.toString()).filter(Boolean))];
    
    // Fetch all users in one query
    const users = await User.find({ _id: { $in: userIds } })
      .select('name image')
      .lean();
    
    // Create a user lookup map for O(1) access
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // OPTIMIZATION 6: Transform data efficiently
    const transformedPlaylists = playlists.map(playlist => {
      const user = userMap.get(playlist.userId?.toString());
      return {
        id: playlist._id.toString(),
        title: playlist.name,
        description: playlist.description || '',
        songCount: playlist.songIds?.length || 0,
        userName: user?.name || 'Unknown User',
        userImage: user?.image || null,
        image: playlist.image || null,
        coverImage: playlist.coverImage || null,
        songIds: playlist.songIds || [],
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt
      };
    });

    // Cache the result
    setCache(cacheKey, transformedPlaylists);

    return NextResponse.json({
      success: true,
      data: transformedPlaylists,
      cached: false
    });

  } catch (error) {
    console.error('Public playlists search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search public playlists' },
      { status: 500 }
    );
  }
}
