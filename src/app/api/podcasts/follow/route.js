import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import FollowedPodcast from '@/models/FollowedPodcast';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;
    const followed = await FollowedPodcast.find({ userId }).sort({ followedAt: -1 });

    return NextResponse.json({ success: true, results: followed });
  } catch (error) {
    console.error('Error in /api/podcasts/follow GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { podcastId, podcastTitle, publisher, coverImage } = await request.json();
    if (!podcastId) {
      return NextResponse.json({ success: false, error: 'podcastId is required' }, { status: 400 });
    }

    await connectDB();
    const userId = session.user.id;

    // Check if already followed
    const existing = await FollowedPodcast.findOne({ userId, podcastId });

    if (existing) {
      // Unfollow
      await FollowedPodcast.deleteOne({ _id: existing._id });
      return NextResponse.json({ success: true, followed: false, message: 'Unfollowed successfully' });
    } else {
      // Follow
      if (!podcastTitle) {
        return NextResponse.json({ success: false, error: 'podcastTitle is required to follow' }, { status: 400 });
      }
      const newFollow = await FollowedPodcast.create({
        userId,
        podcastId,
        podcastTitle,
        publisher: publisher || 'Unknown Creator',
        coverImage: coverImage || '/default-playlist-image.png'
      });
      return NextResponse.json({ success: true, followed: true, data: newFollow, message: 'Followed successfully' });
    }
  } catch (error) {
    console.error('Error in /api/podcasts/follow POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
