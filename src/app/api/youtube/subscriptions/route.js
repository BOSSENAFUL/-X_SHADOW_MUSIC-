import { getYtInstance } from '@/lib/youtube';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FollowedChannel from '@/models/FollowedChannel';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Category system inferred from channel keywords/tags (set by channel owners in YouTube Studio).
// Maps real YouTube channel categories: Gaming, Music, Entertainment, Education, etc.
const CATEGORY_KEYWORDS = {
  'Gaming': ['gaming', 'gamer', 'gameplay', 'walkthrough', 'lets play', 'esports', 'twitch', 'minecraft', 'fortnite', 'gta', 'pubg', 'roblox', 'playstation', 'xbox', 'nintendo', 'steam', 'game review', 'live stream game', 'pro player'],
  'Music': ['music', 'song', 'singer', 'musician', 'artist', 'album', 'concert', 'band', 'rapper', 'hip hop', 'remix', 'cover', 'lyrics', 'beats', 'producer', 'vocal', 'instrumental', 'playlist', 'audio'],
  'Entertainment': ['entertainment', 'comedy', 'funny', 'prank', 'react', 'challenge', 'skit', 'parody', 'comedian', 'standup', 'viral', 'memes', 'fail'],
  'Education': ['education', 'learning', 'tutorial', 'course', 'lecture', 'academic', 'knowledge', 'learn', 'history', 'mathematics', 'physics', 'chemistry', 'biology', 'educational', 'university', 'school'],
  'Science & Technology': ['tech', 'technology', 'programming', 'coding', 'software', 'hardware', 'gadget', 'review', 'unboxing', 'ai', 'artificial intelligence', 'computer', 'smartphone', 'robot', 'engineering', 'developer', 'digital', 'cyber', 'scientific'],
  'Sports': ['sports', 'football', 'cricket', 'basketball', 'soccer', 'fitness', 'workout', 'athlete', 'tennis', 'baseball', 'hockey', 'wwe', 'ufc', 'boxing', 'motorsport', 'nfl', 'nba', 'fifa'],
  'Film & Animation': ['film', 'movie', 'animation', 'cinema', 'short film', 'trailer', 'filmmaking', 'director', 'movie review', 'animated', 'cartoon'],
  'News & Politics': ['news', 'politics', 'current affairs', 'debate', 'journalism', 'headlines', 'world news', 'breaking news', 'report', 'election'],
  'Howto & Style': ['how to', 'diy', 'fashion', 'beauty', 'makeup', 'style', 'cooking', 'recipe', 'cosmetics', 'skincare', 'tutorial diy', 'home decor'],
  'People & Blogs': ['vlog', 'daily life', 'personal', 'lifestyle', 'family', 'travel vlog', 'daily vlog', 'routine', 'day in the life']
};

const CATEGORY_SEARCHES = {
  'Gaming': ['gaming highlights', 'gameplay', 'popular games 2026'],
  'Music': ['new music', 'popular songs', 'music video'],
  'Entertainment': ['viral videos', 'trending', 'entertainment news'],
  'Education': ['educational content', 'learning', 'interesting facts'],
  'Science & Technology': ['tech news', 'latest gadgets', 'technology'],
  'Sports': ['sports highlights', 'sports news', 'athlete'],
  'Film & Animation': ['movie trailers', 'animation', 'short films'],
  'News & Politics': ['news today', 'current events', 'breaking news'],
  'Howto & Style': ['diy projects', 'fashion trends', 'cooking recipes'],
  'People & Blogs': ['vlogs', 'lifestyle', 'daily routine']
};

function inferChannelCategory(channelData, channelName) {
  const sources = [];
  if (channelData.metadata?.keywords && Array.isArray(channelData.metadata.keywords)) {
    sources.push(...channelData.metadata.keywords);
  }
  if (channelData.metadata?.tags && Array.isArray(channelData.metadata.tags)) {
    sources.push(...channelData.metadata.tags);
  }
  sources.push(cleanChannelName(channelName));
  if (channelData.metadata?.title) sources.push(cleanChannelName(channelData.metadata.title));
  if (channelData.metadata?.description) sources.push(channelData.metadata.description.substring(0, 300));

  const combined = sources.filter(Boolean).map(s => s.toLowerCase()).join(' ');
  if (!combined.trim()) return 'Entertainment';

  let bestCategory = 'Entertainment';
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

function cleanChannelName(name) {
  if (!name) return name;
  return name
    .replace(/^uploads?\s+from\s+/i, '')
    .replace(/\s*-\s*topic\s*$/i, '')
    .replace(/\s+topic\s*$/i, '')
    .trim();
}

function parseViewCount(viewsStr) {
  if (!viewsStr) return 0;
  const str = viewsStr.toLowerCase().replace(/,/g, '').replace(/^[^\d.]+/, '');
  const num = parseFloat(str) || 0;
  if (str.includes('b')) return num * 1_000_000_000;
  if (str.includes('m')) return num * 1_000_000;
  if (str.includes('k')) return num * 1_000;
  return num;
}

function getAgeHours(publishedStr) {
  if (!publishedStr) return 0;
  let s = publishedStr.toLowerCase().trim();
  s = s.replace(/^(streamed|premiered|released|published|uploaded)\s+/, '');
  const num = parseFloat(s) || 1;
  if (s.includes('second')) return num / 3600;
  if (s.includes('minute')) return num / 60;
  if (s.includes('hour')) return num;
  if (s.includes('day')) return num * 24;
  if (s.includes('week')) return num * 168;
  if (s.includes('month')) return num * 720;
  if (s.includes('year')) return num * 8760;
  if (s === 'today' || s === 'now' || s.startsWith('today') || s.startsWith('now')) return 0;
  if (s.includes('yesterday')) return 24;
  return 720;
}

function computeScore(ageHours, categoryWeight, viewCount) {
  const timeDecay = Math.exp(-0.01 * ageHours);
  const popularityBoost = Math.min(viewCount / 2_000_000, 0.2);
  return timeDecay * (1 + categoryWeight * 0.5) * (1 + popularityBoost);
}

function getVideoViews(video) {
  const raw = video.view_count ?? video.views ?? video.short_view_count;
  if (raw == null) return '0 views';
  const str = raw.toString();
  return str && str !== 'N/A' ? str : '0 views';
}

function getVideoDuration(video) {
  if (video.length_text) return video.length_text.toString();
  if (video.duration) {
    const d = video.duration;
    if (d && typeof d === 'object') {
      const durStr = d.toString();
      if (durStr && durStr !== '[object Object]') return durStr;
      if (d.text) return d.text;
    }
  }
  return '';
}

function parseVideoObject(video, channelName, channelAvatar, channelId) {
  const thumb = video.thumbnails?.[0]?.url || '';
  const pubText = video.published?.text;
  const pubStr = video.published?.toString();
  return {
    id: video.id || video.video_id || '',
    title: video.title?.text || video.title?.toString() || '',
    views: getVideoViews(video),
    published: (pubText && pubText !== 'N/A') ? pubText : (pubStr && pubStr !== 'N/A' ? pubStr : 'Recently'),
    thumbnail: thumb.startsWith('//') ? 'https:' + thumb : thumb,
    channelName: cleanChannelName(channelName),
    channelAvatar,
    channelId,
    duration: getVideoDuration(video)
  };
}

function extractLockupVideo(item, channelName, channelAvatar, channelId) {
  const id = item.content_id || '';
  const title = item.metadata?.title?.text || item.metadata?.title?.toString() || '';

  let thumbnail = '';
  const thumbView = item.content_image?.primary_thumbnail || item.content_image;
  if (thumbView?.image) {
    const thumbs = Array.isArray(thumbView.image) ? thumbView.image : [thumbView.image];
    const best = thumbs.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a), thumbs[0]);
    thumbnail = best.url || '';
  }

  let views = '0 views';
  let published = 'Recently';
  let duration = '';

  if (item.metadata?.metadata?.metadata_rows) {
    for (const row of item.metadata.metadata.metadata_rows) {
      if (row.metadata_parts) {
        for (const part of row.metadata_parts) {
          if (part.text) {
            const text = part.text.toString().trim();
            if (!text) continue;
            const hasViewWord = text.includes('view');
            const hasNumberSuffix = /\d[\d,.]*\s*[kmb]/i.test(text);
            const isNumeric = /^\d[\d,]*(\.\d+)?$/.test(text.replace(/\s*view(s)?$/, '').trim());
            if (hasViewWord || hasNumberSuffix || isNumeric) {
              views = text;
            }
            if ((text.includes('ago') || text === 'today' || text === 'yesterday' || text === 'now') && text !== 'N/A') {
              published = text;
            }
            if (/^(\d+:)?\d+:\d+$/.test(text)) {
              duration = text;
            }
          }
        }
      }
    }
  }

  const findDurationInOverlays = (overlays) => {
    if (!overlays) return null;
    for (const overlay of overlays) {
      if (typeof overlay.text === 'string' && /^(\d+:)?\d+:\d+$/.test(overlay.text)) {
        return overlay.text;
      }
      if (overlay.text?.toString && /^(\d+:)?\d+:\d+$/.test(overlay.text.toString())) {
        return overlay.text.toString();
      }
      if (overlay.badges && Array.isArray(overlay.badges)) {
        for (const badge of overlay.badges) {
          if (typeof badge?.text === 'string' && /^(\d+:)?\d+:\d+$/.test(badge.text)) {
            return badge.text;
          }
        }
      }
    }
    return null;
  };

  if (!duration) {
    duration = findDurationInOverlays(item.content_image?.overlays) ||
               findDurationInOverlays(item.content_image?.primary_thumbnail?.overlays) || '';
  }

  if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;

  return {
    id,
    title,
    views,
    published,
    thumbnail,
    channelName: cleanChannelName(channelName),
    channelAvatar,
    channelId,
    duration
  };
}

function classifyAndScore(video, category, categoryWeight) {
  const ageHours = getAgeHours(video.published);
  const viewCount = parseViewCount(video.views);
  const score = computeScore(ageHours, categoryWeight, viewCount);
  return { ...video, category, score };
}

function isShort(video) {
  const title = (video.title || '').toLowerCase();
  if (title.includes('#shorts') || title.includes('#short')) return true;

  const durationStr = (video.duration || '').toString().trim().toLowerCase();
  if (!durationStr) return false;
  if (durationStr.includes('short')) return true;

  if (/^\d+$/.test(durationStr)) return parseInt(durationStr, 10) < 75;

  const parts = durationStr.split(':').map(Number);
  if (parts.some(isNaN)) return false;

  let totalSeconds = 0;
  if (parts.length === 1) totalSeconds = parts[0];
  else if (parts.length === 2) totalSeconds = parts[0] * 60 + parts[1];
  else if (parts.length === 3) totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];

  return totalSeconds > 0 && totalSeconds < 75;
}

async function fetchChannelVideos(youtube, channel) {
  try {
    let targetChannelId = channel.channelId;
    if (targetChannelId.startsWith('UU')) {
      targetChannelId = 'UC' + targetChannelId.substring(2);
    }
    const channelData = await youtube.getChannel(targetChannelId);
    const category = inferChannelCategory(channelData, channel.channelName);
    const videosTab = await channelData.getVideos();

    const seen = new Set();
    const results = [];

    const standardVideos = (videosTab.videos || []).filter(v => v.type !== 'ReelItem');
    for (const v of standardVideos) {
      const parsed = parseVideoObject(v, channel.channelName, channel.avatar, channel.channelId);
      if (parsed.id && !seen.has(parsed.id)) {
        seen.add(parsed.id);
        results.push(parsed);
      }
    }

    const lockupItems = videosTab.memo?.get('LockupView') || [];
    for (const lv of lockupItems) {
      if (lv.content_type !== 'VIDEO') continue;
      if (seen.has(lv.content_id)) continue;
      const parsed = extractLockupVideo(lv, channel.channelName, channel.avatar, channel.channelId);
      if (parsed.id) {
        seen.add(parsed.id);
        results.push(parsed);
      }
    }

    return { category, videos: results, channelId: channel.channelId };
  } catch (err) {
    console.error(`Failed to fetch feed for channel ${channel.channelId}:`, err.message);
    return { category: 'Entertainment', videos: [], channelId: channel.channelId };
  };
}

function extractSearchVideo(item, category) {
  const unwrapped = item.content?.video_id ? item.content : item;
  const parsed = parseVideoObject(
    unwrapped,
    unwrapped.author?.name || 'Unknown',
    unwrapped.author?.thumbnails?.[0]?.url || '',
    unwrapped.author?.id || ''
  );
  return { ...parsed, category };
}

async function fetchDiscoveryForCategory(youtube, category, weight, excludeIds, subscribedChannelIds) {
  const seen = new Set();
  const results = [];
  const searchTerms = CATEGORY_SEARCHES[category] || [category];

  for (const term of searchTerms) {
    if (results.length >= 8) break;
    try {
      const searchData = await youtube.search(term);
      const items = searchData.videos || [];
      if (items.length === 0 && searchData.results) {
        for (const raw of searchData.results) {
          const item = raw.content?.video_id ? raw.content : raw;
          if (item.video_id || item.id || item.title?.text) {
            items.push(item);
          }
        }
      }
      for (const item of items) {
        if (results.length >= 8) break;
        const channelId = item.author?.id || item.content?.author?.id || '';
        if (subscribedChannelIds.has(channelId)) continue;
        const parsed = extractSearchVideo(item, category);
        if (parsed.id && !excludeIds.has(parsed.id) && !seen.has(parsed.id)) {
          seen.add(parsed.id);
          results.push(parsed);
        }
      }
    } catch (err) {
      console.error(`Discovery search failed for category "${category}" term "${term}":`, err.message);
    }
  }

  return results.map(v => ({ ...v, score: computeScore(getAgeHours(v.published), weight, parseViewCount(v.views)) }));
}

export async function GET(request) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const followedChannels = await FollowedChannel.find({ userId }).lean();

    if (followedChannels.length === 0) {
      return NextResponse.json({ success: true, results: [], feed: [] });
    }

    const youtube = await getYtInstance();

    // Phase 1: Fetch channel data for all channels in parallel to infer categories
    const channelResults = await Promise.all(
      followedChannels.map(ch => fetchChannelVideos(youtube, ch))
    );

    // Phase 2: Build per-category equal weights
    const categorySet = [...new Set(channelResults.map(r => r.category).filter(Boolean))];
    const perCategoryWeight = 1 / categorySet.length;
    const categoryWeights = {};
    for (const cat of categorySet) {
      categoryWeights[cat] = perCategoryWeight;
    }

    // Phase 3: Score subscription feed videos with category weights
    let subFeed = [];
    for (const { videos, category } of channelResults) {
      for (const v of videos) {
        if (!isShort(v)) {
          const weighted = classifyAndScore(v, category, categoryWeights[category] || 0);
          subFeed.push(weighted);
        }
      }
    }

    // Phase 4: Fetch discovery content by category (not by channel names)
    const subIds = new Set(subFeed.map(v => v.id));
    const subscribedChannelIds = new Set(followedChannels.map(ch => ch.channelId));

    const discoveryPromises = categorySet.map(cat =>
      fetchDiscoveryForCategory(youtube, cat, categoryWeights[cat] || 0, subIds, subscribedChannelIds)
    );
    const discoveryResults = (await Promise.all(discoveryPromises)).flat();

    // Phase 5: Merge discovery with 0.75 penalty
    for (const dv of discoveryResults) {
      if (!isShort(dv) && !subIds.has(dv.id)) {
        dv.score *= 0.75;
        subFeed.push(dv);
      }
    }

    // Sort by score descending (tiebreaker: channel diversity)
    subFeed.sort((a, b) => {
      const diff = b.score - a.score;
      if (Math.abs(diff) > 0.0001) return diff;
      return (a.channelId || '').localeCompare(b.channelId || '');
    });

    return NextResponse.json({ success: true, results: subFeed, feed: subFeed });

  } catch (error) {
    console.error("Subscription Box Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to compile subscription box' }, { status: 500 });
  }
}
