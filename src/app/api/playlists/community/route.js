import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';

// In-memory cache: keyed by "page:limit"
// Community playlists don't change frequently — 2 min TTL is safe.
const communityCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCached(key) {
  const entry = communityCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  communityCache.delete(key);
  return null;
}

function setCached(key, data) {
  // Keep cache size bounded
  if (communityCache.size >= 50) {
    communityCache.delete(communityCache.keys().next().value);
  }
  communityCache.set(key, { data, ts: Date.now() });
}

/**
 * Fetch song images from JioSaavn for playlists that have no custom cover.
 * Uses a single batched request with a 3s timeout so it never blocks the response.
 */
async function fetchSongImages(songIds) {
  if (!songIds || songIds.length === 0) return {};

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s max

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(
      `${apiUrl}/api/songs?ids=${songIds.join(',')}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return {};

    const data = await res.json();
    if (!data.success || !data.data) return {};

    const imageMap = {};
    data.data.forEach(song => {
      if (song?.id) {
        imageMap[song.id] =
          song.image?.find(img => img.quality === '150x150')?.url ||
          song.image?.[0]?.url ||
          null;
      }
    });
    return imageMap;
  } catch {
    return {};
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 0;
    const limitNum = parseInt(searchParams.get('limit')) || 20;
    const q = searchParams.get('q') || '';
    const skip = page * limitNum;

    // Check cache first
    const cacheKey = `${page}:${limitNum}:${q}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=60' }
      });
    }

    await connectDB();

    const query = {
      isPublic: true,
      'songIds.0': { $exists: true } // Only non-empty playlists
    };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Fetch total count and paginated playlists in parallel
    const [total, playlists] = await Promise.all([
      Playlist.countDocuments(query),
      Playlist.find(query)
        .populate('userId', 'name image')
        .select('name description songIds image userId createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Collect song IDs needed for image resolution (only for playlists without a custom image)
    const allSongIdsToFetch = new Set();
    playlists.forEach(playlist => {
      const hasCustomImage = playlist.image && playlist.image !== '/default-playlist-image.png';
      if (!hasCustomImage) {
        playlist.songIds?.slice(0, 4).forEach(id => allSongIdsToFetch.add(id));
      }
    });

    // Fetch song images in one batched request (with timeout fallback)
    const songImageMap = await fetchSongImages(Array.from(allSongIdsToFetch));

    // Transform playlists and assign images
    const processedPlaylists = playlists.map((playlist) => {
      const baseData = {
        id: playlist._id.toString(),
        name: playlist.name,
        description: playlist.description,
        songCount: playlist.songIds?.length || 0,
        userName: playlist.userId?.name || 'Unknown User',
        userImage: playlist.userId?.image || null,
        songIds: playlist.songIds || [],
        source: 'user',
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
      };

      // Playlist has a custom cover image — use it directly as a string
      const hasCustomImage = playlist.image && playlist.image !== '/default-playlist-image.png';
      if (hasCustomImage) {
        return { ...baseData, image: playlist.image };
      }

      // Build collage from song images
      const songImages = (playlist.songIds?.slice(0, 4) || [])
        .map(id => songImageMap[id])
        .filter(Boolean);

      if (songImages.length >= 4) {
        // 4-image collage — PlaylistCard reads collageImages as string[]
        return { ...baseData, collageImages: songImages, image: songImages[0] };
      } else if (songImages.length > 0) {
        return { ...baseData, image: songImages[0] };
      }

      return { ...baseData, image: null };
    });

    const responseBody = {
      success: true,
      data: processedPlaylists,
      total,
      page,
      hasMore: (page + 1) * limitNum < total,
    };

    // Cache the result
    setCached(cacheKey, responseBody);

    return NextResponse.json(responseBody, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=60',
      }
    });

  } catch (error) {
    console.error('Community playlists fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch community playlists' },
      { status: 500 }
    );
  }
}
