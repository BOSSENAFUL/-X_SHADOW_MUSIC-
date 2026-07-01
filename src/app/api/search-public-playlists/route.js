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
    const page = Math.max(0, parseInt(searchParams.get('page')) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 20));
    const skip = page * limit;

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
    const cacheKey = `${getCacheKey(trimmedQuery)}:${page}:${limit}`;
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        ...cachedResult,
        cached: true
      });
    }

    await connectDB();

    // Try text search first (faster if text index exists)
    let playlists;
    let total = 0;

    const countQuery = {
      isPublic: true,
      $text: { $search: trimmedQuery }
    };

    // Escape regex special characters to prevent malformed query syntax crashes
    const escapedQuery = trimmedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const countQueryFallback = {
      isPublic: true,
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { description: { $regex: escapedQuery, $options: 'i' } }
      ]
    };

    try {
      // OPTIMIZATION 1: Use MongoDB text search for better performance
      const [totalCount, foundPlaylists] = await Promise.all([
        Playlist.countDocuments(countQuery),
        Playlist.find(countQuery)
          .select('name description songIds image coverImage userId createdAt updatedAt')
          .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
      total = totalCount;
      playlists = foundPlaylists;
    } catch (textSearchError) {
      // Fallback to regex if text index doesn't exist yet
      const [totalCount, foundPlaylists] = await Promise.all([
        Playlist.countDocuments(countQueryFallback),
        Playlist.find(countQueryFallback)
          .select('name description songIds image coverImage userId createdAt updatedAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);
      total = totalCount;
      playlists = foundPlaylists;
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

    const responseBody = {
      success: true,
      data: transformedPlaylists,
      total,
      page,
      hasMore: (page + 1) * limit < total,
      cached: false
    };

    // Cache the result
    setCache(cacheKey, responseBody);

    return NextResponse.json(responseBody);

  } catch (error) {
    console.error('Public playlists search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search public playlists' },
      { status: 500 }
    );
  }
}
