import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getYtInstance } from '@/lib/youtube';

function extractVideoDetails(v) {
  const id = v.content_id;
  const title = v.metadata?.title?.text || '';
  
  let coverImage = '';
  const imgArray = v.content_image?.image;
  if (Array.isArray(imgArray) && imgArray.length > 0) {
    coverImage = imgArray[0].url;
  }
  
  let duration = '';
  const durationOverlay = v.content_image?.overlays?.find(o => o.type === 'ThumbnailBottomOverlayView');
  if (durationOverlay && durationOverlay.badges && durationOverlay.badges.length > 0) {
    duration = durationOverlay.badges[0].text || '';
  }
  
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
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId query parameter is required' }, { status: 400 });
    }

    const yt = await getYtInstance();
    
    const info = await yt.getInfo(videoId);

    if (!info || !info.basic_info) {
      return NextResponse.json({ success: false, error: 'Video details not found' }, { status: 404 });
    }

    // Parse basic details
    const title = info.basic_info.title || '';
    const description = info.secondary_info?.description?.toString() || info.basic_info.short_description || '';
    const viewCount = info.basic_info.view_count || 0;
    const likeCount = info.basic_info.like_count || 0;
    const durationSeconds = info.basic_info.duration || 0;
    
    // Parse channel details
    const owner = info.secondary_info?.owner;
    
    let channelId = owner?.author?.id || info.basic_info.channel_id || '';
    if (channelId === 'N/A') {
      channelId = info.basic_info.channel_id || '';
    }

    let channelName = owner?.author?.name || info.basic_info.author || 'Unknown Creator';
    if (channelName === 'N/A') {
      channelName = info.basic_info.author || 'Unknown Creator';
    }
    
    let channelAvatar = '';
    const avatars = owner?.author?.thumbnails || [];
    if (avatars.length > 0) {
      // Pick highest resolution
      channelAvatar = avatars[0].url;
    }
    
    let subscriberCountText = owner?.subscriber_count?.toString() || '';
    if (subscriberCountText === 'N/A') {
      subscriberCountText = '';
    }

    // If the parsed channel avatar or name is missing/generic, and we have a valid channelId,
    // fetch the channel metadata dynamically as a fallback to avoid "N/A" / blank avatar
    if ((!channelAvatar || channelName === 'Unknown Creator' || !subscriberCountText) && channelId) {
      try {
        const channel = await yt.getChannel(channelId);
        if (channel && channel.metadata) {
          if (!channelAvatar && channel.metadata.avatar?.[0]?.url) {
            const av = channel.metadata.avatar[0].url;
            channelAvatar = av.startsWith('//') ? 'https:' + av : av;
          }
          if (channelName === 'Unknown Creator' && channel.metadata.title) {
            channelName = channel.metadata.title;
          }
          if (!subscriberCountText && channel.metadata.subscriber_count) {
            subscriberCountText = channel.metadata.subscriber_count.toString();
          }
        }
      } catch (e) {
        console.error(`[details] Failed to fetch fallback channel info:`, e.message);
      }
    }

    // Parse related recommendations
    let recommendations = [];
    const relatedFeed = info.watch_next_feed || [];
    // Convert array-like or array
    const relatedItems = Array.isArray(relatedFeed) ? relatedFeed : Object.values(relatedFeed);
    
    for (const item of relatedItems) {
      if (item && (item.type === 'LockupView' || item.content_type === 'VIDEO')) {
        recommendations.push(extractVideoDetails(item));
      }
    }

    return NextResponse.json({
      success: true,
      video: {
        videoId,
        title,
        description,
        viewCount,
        likeCount,
        durationSeconds,
        channel: {
          channelId,
          name: channelName,
          avatar: channelAvatar,
          subscriberCountText
        }
      },
      recommendations
    });
  } catch (error) {
    console.error('Error in /api/youtube/details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
