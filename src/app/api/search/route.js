import { getYtInstance } from '@/lib/youtube';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'video'; // defaults to video search

    if (!query) {
      return NextResponse.json({ success: false, error: 'Search query is required' }, { status: 400 });
    }

    const youtube = await getYtInstance();
    
    // Pass the type ('video' or 'channel') into the InnerTube search
    const searchResults = await youtube.search(query, { type: type });
    
    let formattedData = [];
    
    if (type === 'video') {
      const videos = searchResults.videos || [];
      formattedData = videos.map(video => {
        const thumb = video.thumbnails?.[0]?.url || '';
        return {
          id: video.id || video.video_id,
          title: video.title?.text || video.title?.toString() || video.title || '',
          author: video.author?.name || video.author?.toString() || '',
          channelId: video.author?.id || '',
          views: video.view_count?.text || video.view_count?.toString() || '0 views',
          duration: video.duration?.text || video.duration?.toString() || 'Live',
          thumbnail: thumb.startsWith('//') ? 'https:' + thumb : thumb
        };
      });
    } else if (type === 'channel') {
      const channels = searchResults.channels || [];
      formattedData = channels.map(channel => {
        const thumb = channel.thumbnails?.[0]?.url || channel.author?.thumbnails?.[0]?.url || '';
        return {
          id: channel.id || channel.channel_id || channel.author?.id,
          name: channel.author?.name || channel.title?.text || channel.title?.toString() || channel.name || '',
          subscribers: channel.subscriber_count?.text || channel.subscribers?.text || '0 subscribers',
          thumbnail: thumb.startsWith('//') ? 'https:' + thumb : thumb
        };
      });
    }

    return NextResponse.json({ success: true, results: formattedData });

  } catch (error) {
    console.error("Search Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Search failed' }, { status: 500 });
  }
}
