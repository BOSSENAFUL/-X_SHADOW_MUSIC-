import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getYtInstance } from '@/lib/youtube';

const EPISODES_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

function extractVideoDetails(v) {
  const id = v.content_id;
  const title = v.metadata?.title?.text || '';
  
  // Extract cover image
  let coverImage = '';
  const imgArray = v.content_image?.image || v.content_image?.thumbnails || [];
  if (Array.isArray(imgArray) && imgArray.length > 0) {
    coverImage = [...imgArray].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || '';
  }
  
  // Extract duration
  let duration = '';
  const durationOverlay = v.content_image?.overlays?.find(o => o.type === 'ThumbnailBottomOverlayView');
  if (durationOverlay && durationOverlay.badges && durationOverlay.badges.length > 0) {
    duration = durationOverlay.badges[0].text || '';
  }
  
  // Extract views & date
  let views = '';
  let published = '';
  const metadataRows = v.metadata?.metadata?.metadata_rows || [];
  if (metadataRows.length > 1) {
    const parts = metadataRows[1].metadata_parts || [];
    if (parts.length > 0) {
      views = parts[0].text?.text || '';
    }
    if (parts.length > 1) {
      published = parts[1].text?.text || '';
    }
  } else if (metadataRows.length > 0) {
    const parts = metadataRows[0].metadata_parts || [];
    if (parts.length > 1) {
      views = parts[0].text?.text || '';
      published = parts[1].text?.text || '';
    }
  }

  let author = '';
  if (metadataRows.length > 0 && metadataRows[0].metadata_parts && metadataRows[0].metadata_parts.length > 0) {
    author = metadataRows[0].metadata_parts[0].text?.text || '';
  }

  return { id, title, coverImage, duration, views, published, author };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlistId');

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'playlistId query parameter is required' }, { status: 400 });
    }

    const cached = EPISODES_CACHE.get(playlistId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`[episodes] Serving from memory cache for ID: ${playlistId}`);
      return NextResponse.json(cached.data);
    }

    const yt = await getYtInstance();
    console.log(`[episodes] Fetching playlist metadata & items for ID: ${playlistId}`);
    
    const playlist = await yt.getPlaylist(playlistId);
    
    // Parse playlist level info
    const playlistTitle = playlist.info?.title || playlist.title?.toString() || '';
    const publisher = playlist.info?.author?.name || playlist.author?.name || 'Unknown Creator';
    const authorImage = playlist.info?.author?.thumbnails?.[0]?.url || playlist.author?.thumbnails?.[0]?.url || null;
    
    const playlistThumbnails = playlist.info?.thumbnails || playlist.thumbnails || [];
    const coverImage = playlistThumbnails.length > 0
      ? [...playlistThumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url
      : '/default-playlist-image.png';

    // Parse episode items
    let episodes = [];
    const videos = playlist.videos || [];
    if (videos.length > 0) {
      episodes = videos.map(item => {
        const itemThumbnails = item.thumbnails || [];
        const bestThumbnail = itemThumbnails.length > 0
          ? [...itemThumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url
          : (item.thumbnail?.url || '');
        return {
          id: item.id || item.video_id || item.content_id,
          title: item.title?.toString() || item.title?.text || item.title || '',
          coverImage: bestThumbnail,
          duration: item.duration?.toString() || '',
          views: item.views?.toString() || '',
          published: item.published?.toString() || '',
          author: item.author?.name || item.author?.toString() || publisher
        };
      });
    } else if (playlist.memo) {
      const lockups = playlist.memo.get('LockupView') || [];
      episodes = lockups.map(extractVideoDetails);
    }

    // Filter out YouTube Shorts (videos under 75 seconds or containing #shorts / #short in title/duration)
    episodes = episodes.filter(episode => {
      const title = (episode.title || '').toLowerCase();
      if (title.includes('#shorts') || title.includes('#short')) {
        return false;
      }
      
      const durationStr = (episode.duration || '').toString().trim().toLowerCase();
      if (!durationStr) return true;
      if (durationStr.includes('short')) return false;
      
      // Parse duration
      if (/^\d+$/.test(durationStr)) {
        const secs = parseInt(durationStr, 10);
        return secs >= 75;
      }
      
      const parts = durationStr.split(':').map(Number);
      if (parts.some(isNaN)) return true;
      
      let totalSeconds = 0;
      if (parts.length === 1) {
        totalSeconds = parts[0];
      } else if (parts.length === 2) {
        totalSeconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      
      if (totalSeconds > 0 && totalSeconds < 75) {
        return false;
      }
      
      return true;
    });

    // Sort episodes newest first by parsing relative YouTube date strings
    const getRelativeWeight = (publishedStr) => {
      if (!publishedStr) return Infinity;
      const str = publishedStr.toLowerCase();
      let value = parseFloat(str) || 1;
      if (str.includes('second')) return value;
      if (str.includes('minute')) return value * 60;
      if (str.includes('hour')) return value * 3600;
      if (str.includes('day')) return value * 86400;
      if (str.includes('week')) return value * 86400 * 7;
      if (str.includes('month')) return value * 86400 * 30;
      if (str.includes('year')) return value * 86400 * 365;
      if (str.includes('today') || str.includes('now')) return 0;
      if (str.includes('yesterday')) return 86400;
      return Infinity;
    };

    episodes.sort((a, b) => getRelativeWeight(a.published) - getRelativeWeight(b.published));

    const responseData = {
      success: true,
      playlist: {
        playlistId,
        title: playlistTitle,
        publisher,
        coverImage,
        description: playlist.info?.description || null,
        authorImage
      },
      episodes
    };

    EPISODES_CACHE.set(playlistId, {
      timestamp: Date.now(),
      data: responseData
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in /api/podcasts/episodes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
