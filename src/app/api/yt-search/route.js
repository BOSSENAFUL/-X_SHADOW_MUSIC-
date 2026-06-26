import { NextResponse } from 'next/server';
import { getYtInstance } from '@/lib/youtube';
import { YTNodes, YT } from 'youtubei.js';

function getContinuationToken(sr) {
  try {
    const contItems = sr.memo?.getType(YTNodes.ContinuationItem);
    const command = contItems?.[0]?.endpoint?.command;
    if (command) {
      return command.buildRequest()?.continuation || null;
    }
    return null;
  } catch {
    return null;
  }
}

const bestThumb = (arr) => {
  if (!arr || !arr.length) return null;
  const sorted = [...arr].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || arr[arr.length - 1]?.url || null;
};

const mapVideo = (v) => ({
  kind: 'video',
  id: v.id || v.video_id,
  title: v.title?.text || v.title || '',
  description: v.description_snippet?.text || v.description?.text || '',
  thumbnail: bestThumb(v.thumbnails) ||
    `https://i.ytimg.com/vi/${v.id || v.video_id}/hqdefault.jpg`,
  author: v.author?.name || v.author || '',
  authorId: v.author?.id || '',
  authorAvatar: bestThumb(v.author?.thumbnails),
  authorVerified: !!(v.author?.is_verified || v.author?.is_verified_artist),
  viewCount: v.view_count?.text || '',
  published: v.published?.text || '',
  duration: v.duration?.text || '',
  durationSeconds: v.duration?.seconds || 0,
  badges: v.badges?.map(b => b.text || b.label || '') || [],
});

/**
 * GET /api/yt-search?q=<query>&type=all|video|channel|playlist&continuation=<token>
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const type  = searchParams.get('type') || 'all';
    const continuation = searchParams.get('continuation') || '';

    if (!query.trim() && !continuation) {
      return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const yt = await getYtInstance();

    /* ── Continuation (pagination) ── */
    if (continuation) {
      const response = await yt.actions.execute('/search', {
        continuation,
        parse: true,
      });
      const sr = new YT.Search(yt.actions, response, true);
      const items = sr.videos || sr.results || [];
      const videos = items.map(mapVideo);
      const nextToken = getContinuationToken(sr);

      return NextResponse.json({
        success: true, query, type,
        results: { videos, channels: [], playlists: [] },
        continuationToken: nextToken,
      });
    }

    /* ── Normal search ── */
    const results = { videos: [], channels: [], playlists: [] };
    const searchTasks = [];
    const searchAll = type === 'all';
    let videoContinuationToken = null;

    if (type === 'all' || type === 'video') {
      searchTasks.push(
        yt.search(query, { type: 'video' }).then((sr) => {
          const videos = sr.videos || sr.results || [];
          results.videos = videos.slice(0, searchAll ? 10 : 30).map(mapVideo);
          videoContinuationToken = getContinuationToken(sr);
        }).catch((e) => {
          console.error('[yt-search] video search error:', e);
        })
      );
    }

    if (type === 'all' || type === 'channel') {
      searchTasks.push(
        (async () => {
          try {
            const sr = await yt.search(query, { type: 'channel' });
            const rawItems = sr.results || sr.channels || [];

            const channelItems = [];
            for (const c of rawItems) {
              let item = null;

              if (c.author) {
                item = {
                  kind: 'channel',
                  id: c.id || c.channel_id,
                  title: c.author?.name || c.name?.text || c.title?.text || c.title || '',
                  handle: c.handle?.text || c.channel_handle?.text || '',
                  thumbnail: bestThumb(c.author?.thumbnails),
                  subscriberCount: c.subscribers?.text || c.subscriber_count?.text || '',
                  videoCount: c.video_count?.text || '',
                  description: c.description_snippet?.text || c.description?.text || '',
                  verified: !!(c.is_verified || c.author?.is_verified),
                };
              } else if (c.content_type === 'CHANNEL') {
                let metaImage = null;
                if (c.metadata?.image?.avatar) {
                  metaImage = c.metadata.image.avatar.image;
                } else if (c.metadata?.image?.avatars?.length) {
                  metaImage = c.metadata.image.avatars[0].image;
                }
                const thumbs = c.content_image?.image ||
                               c.content_image?.primary_thumbnail?.image ||
                               metaImage ||
                               [];
                const lockupId = c.content_id || c.id || '';
                item = {
                  kind: 'channel',
                  id: lockupId,
                  title: c.metadata?.title?.toString() || '',
                  handle: '',
                  thumbnail: bestThumb(thumbs),
                  subscriberCount: '',
                  videoCount: '',
                  description: '',
                  verified: false,
                };
              }

              if (item) channelItems.push(item);
            }

            results.channels = channelItems.slice(0, searchAll ? 6 : 20);
          } catch (e) {
            console.error('[yt-search] channel search error:', e);
          }
        })()
      );
    }

    if (type === 'all' || type === 'playlist') {
      searchTasks.push(
        yt.search(query, { type: 'playlist' }).then((sr) => {
          const playlists = sr.playlists || sr.results || [];
          results.playlists = playlists.slice(0, searchAll ? 6 : 20).map((p) => {
            const playlistThumbnails = p.thumbnails ||
                                       p.content_image?.primary_thumbnail?.image ||
                                       p.content_image?.thumbnails ||
                                       [];
            return {
              kind: 'playlist',
              id: p.id || p.playlist_id,
              title: p.title?.text || p.title || '',
              thumbnail: bestThumb(playlistThumbnails),
              author: p.author?.name || p.channel_name?.text || '',
              videoCount: p.video_count?.text || p.videos?.text || '',
            };
          });
        }).catch((e) => {
          console.error('[yt-search] playlist search error:', e);
        })
      );
    }

    await Promise.all(searchTasks);

    return NextResponse.json({
      success: true, query, type, results,
      continuationToken: videoContinuationToken,
    });
  } catch (error) {
    console.error('Error in /api/yt-search:', error);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
