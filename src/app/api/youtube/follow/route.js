import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import FollowedChannel from '@/models/FollowedChannel';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;
    const followed = await FollowedChannel.find({ userId }).sort({ followedAt: -1 }).lean();

    const mapped = followed.map(item => ({
      ...item,
      podcastId: item.channelId,
      podcastTitle: item.channelName,
      publisher: item.channelName,
      coverImage: item.avatar
    }));

    return NextResponse.json({ success: true, results: mapped });
  } catch (error) {
    console.error('Error in /api/youtube/follow GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const channelId = body.channelId || body.podcastId;
    const channelName = body.channelName || body.podcastTitle;
    const avatar = body.avatar || body.coverImage;

    if (!channelId) {
      return NextResponse.json({ success: false, error: 'channelId is required' }, { status: 400 });
    }

    await connectDB();
    const userId = session.user.id;

    // Check if already followed
    const existing = await FollowedChannel.findOne({ userId, channelId });

    if (existing) {
      // Unfollow
      await FollowedChannel.deleteOne({ _id: existing._id });
      return NextResponse.json({ success: true, followed: false, message: 'Unfollowed successfully' });
    } else {
      // Follow
      if (!channelName) {
        return NextResponse.json({ success: false, error: 'channelName is required to follow' }, { status: 400 });
      }
      const newFollow = await FollowedChannel.create({
        userId,
        channelId,
        channelName,
        avatar: avatar || '/default-playlist-image.png'
      });
      
      const mappedResult = {
        ...newFollow.toObject(),
        podcastId: newFollow.channelId,
        podcastTitle: newFollow.channelName,
        coverImage: newFollow.avatar
      };

      return NextResponse.json({ success: true, followed: true, data: mappedResult, message: 'Followed successfully' });
    }
  } catch (error) {
    console.error('Error in /api/youtube/follow POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
