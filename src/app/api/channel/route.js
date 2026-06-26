import { getYtInstance } from '@/lib/youtube';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('id');

  if (!channelId) {
    return NextResponse.json({ success: false, error: 'Channel ID is required' }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const youtube = await getYtInstance();
    
    let targetChannelId = channelId;
    if (channelId.startsWith('UU')) {
      targetChannelId = 'UC' + channelId.substring(2);
    }
    
    // 1. Fetch the core channel metadata
    const channel = await youtube.getChannel(targetChannelId);
    
    // 2. Explicitly request the "Videos" tab of the channel
    const videosTab = await channel.getVideos();

    const formattedVideos = (videosTab.videos || []).map(video => {
      const thumb = video.thumbnails?.[0]?.url || '';
      return {
        id: video.id || video.video_id,
        title: video.title?.text || video.title?.toString() || '',
        views: video.view_count?.text || video.view_count?.toString() || '0 views',
        published: video.published?.text || video.published?.toString() || 'Recently',
        thumbnail: thumb.startsWith('//') ? 'https:' + thumb : thumb
      };
    });

    const channelName = channel.metadata?.title || channel.title || 'Unknown Channel';
    const subscribers = channel.metadata?.subscriber_count?.toString() || '';
    const avatar = channel.metadata?.avatar?.[0]?.url || '';

    return NextResponse.json({ 
      success: true,
      channelName,
      subscribers,
      avatar: avatar.startsWith('//') ? 'https:' + avatar : avatar,
      videos: formattedVideos 
    });

  } catch (error) {
    console.error("Channel Fetch Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch channel data' }, { status: 500 });
  }
}
