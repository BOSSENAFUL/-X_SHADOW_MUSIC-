import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import User from '@/models/User';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 0;
    const limitNum = parseInt(searchParams.get('limit')) || 20;
    const skip = page * limitNum;

    await connectDB();

    const query = { 
      isPublic: true,
      'songIds.0': { $exists: true } // Ensure playlist is not empty
    };

    // Fetch total count and paginated playlists in parallel
    const [total, playlists] = await Promise.all([
      Playlist.countDocuments(query),
      Playlist.find(query)
        .populate('userId', 'name image')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // 1. Gather all unique song IDs needed for missing images
    const allSongIdsToFetch = new Set();
    playlists.forEach(playlist => {
      if (!playlist.image || playlist.image === "/default-playlist-image.png") {
        const songsToFetch = playlist.songIds?.slice(0, 4) || [];
        songsToFetch.forEach(id => allSongIdsToFetch.add(id));
      }
    });

    // 2. Fetch all required songs in a SINGLE request
    const songImageCache = {};
    if (allSongIdsToFetch.size > 0) {
      try {
        const songsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${Array.from(allSongIdsToFetch).join(',')}`);
        const songsData = await songsRes.json();

        if (songsData.success && songsData.data) {
          songsData.data.forEach(song => {
            if (song) {
              songImageCache[song.id] = song.image?.find(img => img.quality === '150x150')?.url ||
                song.image?.[0]?.url ||
                "/default-playlist-image.png";
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch song images in bulk:', err);
      }
    }

    // 3. Transform the data and assign images from cache
    const processedPlaylists = playlists.map((playlist) => {
      const baseData = {
        id: playlist._id.toString(),
        name: playlist.name,
        description: playlist.description,
        songCount: playlist.songIds?.length || 0,
        userName: playlist.userId?.name || 'Unknown User',
        userImage: playlist.userId?.image,
        songIds: playlist.songIds || [],
        source: 'user',
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt
      };

      // If playlist has a custom image, use it
      if (playlist.image && playlist.image !== "/default-playlist-image.png") {
        return { ...baseData, image: playlist.image };
      }

      // Use cache to build collages
      const songImages = (playlist.songIds?.slice(0, 4) || [])
        .map(id => songImageCache[id])
        .filter(url => url && url !== "/default-playlist-image.png");

      if (songImages.length >= 4) {
        return { ...baseData, collageImages: songImages, image: songImages[0] };
      } else if (songImages.length > 0) {
        return { ...baseData, image: songImages[0] };
      }

      return { ...baseData, image: "/default-playlist-image.png" };
    });

    return NextResponse.json({
      success: true,
      data: processedPlaylists,
      total,
      page,
      hasMore: (page + 1) * limitNum < total
    });

  } catch (error) {
    console.error('Community playlists fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch community playlists' },
      { status: 500 }
    );
  }
}
