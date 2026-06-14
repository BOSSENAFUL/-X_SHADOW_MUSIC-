import { NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

let ytInstance = null;

async function getYtInstance() {
  if (!ytInstance) {
    try {
      ytInstance = await Innertube.create();
    } catch (error) {
      console.error('Failed to initialize Innertube instance:', error);
      throw error;
    }
  }
  return ytInstance;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const yt = await getYtInstance();
    const searchResults = await yt.search(query, { type: 'video' });
    const videos = searchResults.videos || [];

    const formatted = videos.map((v) => {
      let viewCount = 0;
      if (v.view_count?.text) {
        viewCount = parseInt(v.view_count.text.replace(/[^0-9]/g, '')) || 0;
      } else if (typeof v.view_count === 'number') {
        viewCount = v.view_count;
      }

      return {
        id: v.id || v.video_id,
        videoId: v.id || v.video_id,
        title: v.title?.text || v.title || '',
        author: v.author?.name || v.author || '',
        channelName: v.author?.name || v.author || '',
        viewCount: viewCount,
        viewCountText: v.view_count?.text || '',
        authorVerified: !!(v.author?.is_verified || v.author?.is_verified_artist),
        lengthSeconds: v.duration?.seconds || 0,
        publishedText: v.published?.text || '',
      };
    });

    return NextResponse.json({ success: true, results: formatted });
  } catch (error) {
    console.error('Error in /api/yt-search:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
