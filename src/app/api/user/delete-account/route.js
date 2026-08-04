import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

import User from '@/models/User';
import LikedSong from '@/models/LikedSong';
import LikedAlbum from '@/models/LikedAlbum';
import LikedArtist from '@/models/LikedArtist';
import LikedPlaylist from '@/models/LikedPlaylist';
import Playlist from '@/models/Playlist';
import RecentlyPlayedPlaylist from '@/models/RecentlyPlayedPlaylist';
import RecommendedMix from '@/models/RecommendedMix';
import FollowedChannel from '@/models/FollowedChannel';
import FollowedPodcast from '@/models/FollowedPodcast';
import CommunityPost from '@/models/CommunityPost';
import CommunityComment from '@/models/CommunityComment';
import Rating from '@/models/Rating';
import DailyActiveUser from '@/models/DailyActiveUser';

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    await connectDB();
    const userId = session.user.id;
    const userEmail = session.user.email;

    // Verify user exists
    const userObj = await User.findById(userId).lean();
    if (!userObj) {
      return NextResponse.json(
        { success: false, error: 'User account not found.' },
        { status: 404 }
      );
    }

    // Build flexible query matching both String and ObjectId forms of the user ID
    const validObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    const userMatch = validObjectId
      ? { $in: [userId, validObjectId] }
      : userId;

    const emailMatch = userEmail || userObj.email;

    // Cascade delete across ALL database models referencing this user
    await Promise.all([
      // 1. Saved / Liked items (schema field: userId)
      LikedSong.deleteMany({ userId: userMatch }),
      LikedAlbum.deleteMany({ userId: userMatch }),
      LikedArtist.deleteMany({ userId: userMatch }),
      LikedPlaylist.deleteMany({ userId: userMatch }),

      // 2. Playlists created by user (schema field: userId)
      Playlist.deleteMany({ userId: userMatch }),

      // 3. Listening history & recommendations (schema field: userId)
      RecentlyPlayedPlaylist.deleteMany({ userId: userMatch }),
      RecommendedMix.deleteMany({ userId: userMatch }),

      // 4. Subscriptions & follows (schema field: userId)
      FollowedChannel.deleteMany({ userId: userMatch }),
      FollowedPodcast.deleteMany({ userId: userMatch }),

      // 5. Community posts (schema field: author) & comments (schema field: user)
      CommunityPost.deleteMany({ author: userMatch }),
      CommunityComment.deleteMany({ user: userMatch }),

      // Remove user likes from remaining posts & comments
      CommunityPost.updateMany({ likes: userMatch }, { $pull: { likes: userMatch } }),
      CommunityComment.updateMany({ likes: userMatch }, { $pull: { likes: userMatch } }),

      // 6. User ratings/reviews (schema field: user)
      Rating.deleteMany({ user: userMatch }),

      // 7. Daily active user analytics (by email)
      emailMatch ? DailyActiveUser.updateMany({ 'users.email': emailMatch }, { $pull: { users: { email: emailMatch } } }) : Promise.resolve(),

      // 8. Core User account record
      User.findByIdAndDelete(userId),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Account, listening history, saved music, and personal data permanently deleted.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting account and user data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete account data. Please try again.' },
      { status: 500 }
    );
  }
}
