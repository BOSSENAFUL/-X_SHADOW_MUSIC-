import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Playlist from '@/models/Playlist';
import User from '@/models/User';
import RecommendedMix from '@/models/RecommendedMix';
import RecentlyPlayedPlaylist from '@/models/RecentlyPlayedPlaylist';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import mongoose from 'mongoose';

// GET - Get specific playlist (with privacy controls)
// Falls back to the spotify-playlists DB when the ID is not found in the
// main user-playlist collection, so the same UI works for both types.
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // ── Run both DB lookups in parallel ────────────────────────────────
    // Most IDs belong to user playlists, but spotify playlist IDs are valid
    // ObjectIds too. Running both concurrently avoids a serial round-trip
    // penalty when the ID turns out to be a spotify playlist.
    const SpotifyPlaylist = await getSpotifyPlaylistModel();

    const [playlist, spotifyPlaylist] = await Promise.all([
      Playlist.findById(id).lean(),
      SpotifyPlaylist.findById(id).lean(),
    ]);

    // ── 1. User playlist ────────────────────────────────────────────────
    if (playlist) {
      const owner = await User.findById(playlist.userId).select('name image').lean();
      const ownerName = owner ? owner.name : 'Unknown User';
      const ownerImage = owner ? owner.image : null;
      const isOwner = !!(session?.user?.id && playlist.userId.toString() === session.user.id);

      if (!playlist.isPublic && !isOwner) {
        return NextResponse.json(
          { success: false, error: 'This playlist is private' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { ...playlist, ownerName, ownerImage, isOwner },
      });
    }

    // ── 2. Spotify playlist ─────────────────────────────────────────────
    if (!spotifyPlaylist) {
      // ── 3. Recommended Mix ──────────────────────────────────────────
      if (session?.user?.id) {
        const mix = await RecommendedMix.findOne({
          _id: id,
          userId: new mongoose.Types.ObjectId(session.user.id),
        }).lean();

        if (mix) {
          return NextResponse.json({
            success: true,
            data: {
              _id: mix._id.toString(),
              name: mix.title,
              description: `${mix.songIds?.length || 0} songs • Generated mix`,
              image: mix.coverImage || null,
              songIds: mix.songIds ?? [],
              isPublic: true,
              isOwner: true,
              ownerName: 'Jammify',
              ownerImage: 'https://i.postimg.cc/1X6Ljztt/extension-icon-192px.png',
              createdAt: mix.generatedAt,
              updatedAt: mix.createdAt,
              sourceType: 'mix',
            },
          });
        }
      }

      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    const isAdmin = session?.user?.role === 'admin';

    return NextResponse.json({
      success: true,
      data: {
        _id: spotifyPlaylist._id.toString(),
        name: spotifyPlaylist.name,
        description: spotifyPlaylist.description ?? '',
        image: spotifyPlaylist.image ?? '',
        songIds: spotifyPlaylist.songIds ?? [],
        isPublic: true,
        isOwner: isAdmin,
        ownerName: 'Spotify',
        ownerImage: null,
        createdAt: spotifyPlaylist.createdAt,
        updatedAt: spotifyPlaylist.updatedAt,
        sourceType: spotifyPlaylist.sourceType ?? 'spotify',
        sourceUrl: spotifyPlaylist.sourceUrl ?? '',
      },
    });

  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

// PUT - Update playlist
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isPublic, image } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const playlist = await Playlist.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Update fields if provided
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Playlist name is required' },
          { status: 400 }
        );
      }
      playlist.name = name.trim();
    }

    if (description !== undefined) {
      playlist.description = description.trim();
    }

    if (isPublic !== undefined) {
      playlist.isPublic = isPublic;
    }

    if (image !== undefined) {
      playlist.image = image.trim();
    }

    await playlist.save();

    return NextResponse.json({
      success: true,
      data: playlist,
      message: 'Playlist updated successfully'
    });

  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// PATCH - Partial update playlist (for privacy toggle, etc.)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const playlist = await Playlist.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Update only the provided fields
    Object.keys(body).forEach(key => {
      if (key === 'isPublic' && typeof body[key] === 'boolean') {
        playlist.isPublic = body[key];
      } else if (key === 'name' && body[key] && body[key].trim().length > 0) {
        playlist.name = body[key].trim();
      } else if (key === 'description') {
        playlist.description = body[key] ? body[key].trim() : '';
      } else if (key === 'songIds' && Array.isArray(body[key])) {
        playlist.songIds = body[key];
      } else if (key === 'image') {
        playlist.image = body[key] ? body[key].trim() : '';
      }
    });

    await playlist.save();

    return NextResponse.json({
      success: true,
      data: playlist,
      message: 'Playlist updated successfully'
    });

  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Delete playlist
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    await connectDB();

    const playlist = await Playlist.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id)
    });

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Also remove from recently played
    try {
      await RecentlyPlayedPlaylist.removePlaylistForUser(session.user.id, id);
    } catch (err) {
      console.error('Failed to remove from recently played:', err);
    }

    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}