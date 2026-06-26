import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getYtInstance } from '@/lib/youtube';

const EPISODES_CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

function extractVideoDetails(v) {
  const id = v.content_id;
  const title = v.metadata?.title?.text || '';
  const contentType = v.content_type || 'VIDEO';
  
  // Extract cover image
  let coverImage = '';
  const imgArray = v.content_image?.image || 
                   v.content_image?.thumbnails || 
                   v.content_image?.primary_thumbnail?.image || 
                   v.content_image?.primary_thumbnail?.thumbnails || [];
  if (Array.isArray(imgArray) && imgArray.length > 0) {
    coverImage = [...imgArray].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || '';
  }
  
  // Extract first video ID of playlist
  const firstVideoId = v.renderer_context?.command_context?.on_tap?.payload?.videoId || '';
  
  // Extract duration / playlist video count
  let duration = '';
  const overlays = v.content_image?.overlays || v.content_image?.primary_thumbnail?.overlays || [];
  const durationOverlay = overlays.find(o => o.type === 'ThumbnailBottomOverlayView');
  if (durationOverlay && durationOverlay.badges && durationOverlay.badges.length > 0) {
    duration = durationOverlay.badges[0].text || '';
  } else {
    const badgeOverlay = overlays.find(o => o.type === 'ThumbnailOverlayBadgeView');
    if (badgeOverlay && badgeOverlay.badges && badgeOverlay.badges.length > 0) {
      duration = badgeOverlay.badges[0].text || ''; // e.g. "5 videos"
    }
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
    } else if (parts.length > 0) {
      views = parts[0].text?.text || '';
    }
  }

  let author = '';
  if (metadataRows.length > 0 && metadataRows[0].metadata_parts && metadataRows[0].metadata_parts.length > 0) {
    author = metadataRows[0].metadata_parts[0].text?.text || '';
  }

  return { id, title, coverImage, duration, views, published, author, contentType, firstVideoId };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('playlistId');
    const sortBy = searchParams.get('sortBy') || 'latest';
    const continuation = searchParams.get('continuation');
    const playlistContinuation = searchParams.get('playlistContinuation');

    const youtube = await getYtInstance();

    // 1. If continuation token is provided, execute it and return the next page of videos immediately
    if (continuation) {
      try {
        const page = await youtube.actions.execute('/browse', { token: continuation, parse: true });
        const lockups = page.on_response_received_actions_memo?.get('LockupView') || [];
        
        let episodes = lockups.map(extractVideoDetails);
        
        // Filter out Shorts
        episodes = episodes.filter(episode => {
          const title = (episode.title || '').toLowerCase();
          if (title.includes('#shorts') || title.includes('#short')) return false;
          const durationStr = (episode.duration || '').toString().trim().toLowerCase();
          if (!durationStr) return true;
          if (durationStr.includes('short')) return false;
          if (/^\d+$/.test(durationStr)) return parseInt(durationStr, 10) >= 75;
          const parts = durationStr.split(':').map(Number);
          if (parts.some(isNaN)) return true;
          let totalSeconds = 0;
          if (parts.length === 1) totalSeconds = parts[0];
          else if (parts.length === 2) totalSeconds = parts[0] * 60 + parts[1];
          else if (parts.length === 3) totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          return totalSeconds === 0 || totalSeconds >= 75;
        });

        const nextContinuationItems = page.on_response_received_actions_memo?.get('ContinuationItem') || [];
        const nextContinuation = nextContinuationItems.length > 0 ? (nextContinuationItems[0].endpoint?.payload?.token || null) : null;

        return NextResponse.json({
          success: true,
          episodes,
          continuation: nextContinuation
        });
      } catch (err) {
        console.error('[episodes] Error loading continuation:', err);
        return NextResponse.json({ success: false, error: 'Failed to load next page: ' + err.message }, { status: 500 });
      }
    }

    // Handle playlist continuation (load more playlists from channel)
    if (playlistContinuation) {
      try {
        const page = await youtube.actions.execute('/browse', { token: playlistContinuation, parse: true });
        const lockups = page.on_response_received_actions_memo?.get('LockupView') || [];
        const playlists = lockups.map(extractVideoDetails);

        const nextContinuationItems = page.on_response_received_actions_memo?.get('ContinuationItem') || [];
        const nextContinuation = nextContinuationItems.length > 0 ? (nextContinuationItems[0].endpoint?.payload?.token || null) : null;

        return NextResponse.json({
          success: true,
          playlists,
          continuation: null,
          playlistContinuation: nextContinuation
        });
      } catch (err) {
        console.error('[episodes] Error loading more playlists:', err);
        return NextResponse.json({ success: false, error: 'Failed to load more playlists: ' + err.message }, { status: 500 });
      }
    }

    if (!playlistId) {
      return NextResponse.json({ success: false, error: 'playlistId query parameter is required' }, { status: 400 });
    }

    const cacheKey = `${playlistId}_${sortBy}`;
    const cached = EPISODES_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cached.data);
    }
    
    let targetPlaylistId = playlistId;
    if (playlistId.startsWith('UC')) {
      targetPlaylistId = 'UU' + playlistId.substring(2);
    }
    
    // Fetch playlist and channel details in parallel for channel info
    const playlistPromise = youtube.getPlaylist(targetPlaylistId);
    const channelPromise = playlistId.startsWith('UC')
      ? youtube.getChannel(playlistId).catch(err => {
          console.error(`[episodes] Error fetching channel details:`, err);
          return null;
        })
      : Promise.resolve(null);

    const [playlist, channel] = await Promise.all([playlistPromise, channelPromise]);
    
    let subscriberCountText = '';
    let videoCountText = '';
    let trailer = null;
    let shelves = [];
    let playlists = [];
    let playlistContinuationToken = null;
    
    if (channel) {
      // Fetch channel playlists from the dedicated playlists tab
      try {
        const playlistsTab = await channel.getPlaylists();
        const lockups = playlistsTab.memo.get('LockupView') || [];
        playlists = lockups.map(extractVideoDetails);
        const nextContinuationItems = playlistsTab.memo.get('ContinuationItem') || [];
        if (nextContinuationItems.length > 0) {
          playlistContinuationToken = nextContinuationItems[0].endpoint?.payload?.token || null;
        }
      } catch (err) {
        console.error(`[episodes] Error fetching channel playlists:`, err);
      }
      if (channel.header?.content?.metadata?.metadata_rows) {
        const allParts = channel.header.content.metadata.metadata_rows.flatMap(r => r.metadata_parts || []);
        const subPart = allParts.find(p => p.text?.text?.toLowerCase().includes('subscriber'));
        if (subPart) {
          subscriberCountText = subPart.text.text;
        }
        const vidPart = allParts.find(p => p.text?.text?.toLowerCase().includes('video'));
        if (vidPart) {
          videoCountText = vidPart.text.text;
        }
      } else if (channel.header?.content?.metadata?.metadata_parts) {
        const parts = channel.header.content.metadata.metadata_parts;
        const subPart = parts.find(p => p.text?.text?.toLowerCase().includes('subscriber'));
        if (subPart) {
          subscriberCountText = subPart.text.text;
        }
        const vidPart = parts.find(p => p.text?.text?.toLowerCase().includes('video'));
        if (vidPart) {
          videoCountText = vidPart.text.text;
        }
      }

      // Extract featured channel trailer
      if (channel.current_tab?.content?.contents) {
        const contents = channel.current_tab.content.contents;
        const playerSection = contents.find(s => s.contents?.[0]?.type === 'ChannelVideoPlayer');
        if (playerSection && playerSection.contents?.[0]) {
          const player = playerSection.contents[0];
          trailer = {
            id: player.id || '',
            title: player.title?.text || player.title?.toString() || '',
            duration: player.duration?.toString() || ''
          };
        }
      }

      // Extract horizontal shelves/sections
      if (channel.current_tab?.content?.contents) {
        const contents = channel.current_tab.content.contents;
        for (const section of contents) {
          if (section.contents) {
            for (const c of section.contents) {
              if (c.type === 'Shelf' && c.content?.contents) {
                const shelfTitle = c.title?.toString() || c.title?.text || '';
                const shelfItems = c.content.contents
                  .filter(item => item.type === 'LockupView' || item.content_type === 'VIDEO' || item.content_type === 'PLAYLIST')
                  .map(extractVideoDetails);
                
                if (shelfItems.length > 0) {
                  shelves.push({
                    title: shelfTitle,
                    videos: shelfItems
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Parse playlist level info
    const playlistTitle = playlist.info?.title || playlist.title?.toString() || '';
    const publisher = playlist.info?.author?.name || playlist.author?.name || 'Unknown Creator';
    const authorImage = playlist.info?.author?.thumbnails?.[0]?.url || playlist.author?.thumbnails?.[0]?.url || null;
    
    const playlistThumbnails = playlist.info?.thumbnails || playlist.thumbnails || [];
    const coverImage = playlistThumbnails.length > 0
      ? [...playlistThumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url
      : '/default-playlist-image.png';

    // Parse sorted channel tab or fallback playlist items
    let episodes = [];
    let isNativelySorted = false;
    let continuationToken = null;

    if (playlistId.startsWith('UC') && channel) {
      try {
        const videosTab = await channel.getVideos();
        const chips = videosTab.memo.get('ChipView') || [];
        
        let targetChip = null;
        if (sortBy === 'popular') {
          targetChip = chips.find(c => c.text?.toString().toLowerCase().includes('popular'));
        } else if (sortBy === 'oldest') {
          targetChip = chips.find(c => c.text?.toString().toLowerCase().includes('oldest'));
        } else {
          targetChip = chips.find(c => c.text?.toString().toLowerCase().includes('latest'));
        }

        if (targetChip) {
          const page = await targetChip.endpoint.call(youtube.actions, { parse: true });
          const lockups = page.on_response_received_actions_memo?.get('LockupView') || [];
          episodes = lockups.map(extractVideoDetails);
          isNativelySorted = true;

          // Extract continuation token
          const nextContinuationItems = page.on_response_received_actions_memo?.get('ContinuationItem') || [];
          if (nextContinuationItems.length > 0) {
            continuationToken = nextContinuationItems[0].endpoint?.payload?.token || null;
          }
        } else {
          // Fallback to default tab lockups
          const lockups = videosTab.memo.get('LockupView') || [];
          episodes = lockups.map(extractVideoDetails);

          const nextContinuationItems = videosTab.memo.get('ContinuationItem') || [];
          if (nextContinuationItems.length > 0) {
            continuationToken = nextContinuationItems[0].endpoint?.payload?.token || null;
          }
        }
      } catch (err) {
        console.error('[episodes] Error fetching natively sorted channel videos tab:', err);
      }
    }

    if (episodes.length === 0) {
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

    if (!isNativelySorted) {
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
    }

    if (playlists.length === 0) {
      const playlistsShelf = shelves.find(s => s.title?.toLowerCase().includes('playlist'));
      playlists = playlistsShelf ? playlistsShelf.videos : [];
    }

    const responseData = {
      success: true,
      playlist: {
        playlistId,
        title: playlistTitle,
        publisher,
        coverImage,
        description: playlist.info?.description || null,
        authorImage,
        subscriberCountText,
        videoCountText,
        trailer,
        shelves,
        playlists,
        playlistContinuation: playlistContinuationToken || null
      },
      episodes,
      continuation: continuationToken || null
    };

    EPISODES_CACHE.set(cacheKey, {
      timestamp: Date.now(),
      data: responseData
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in /api/youtube/episodes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
