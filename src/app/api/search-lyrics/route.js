import { NextResponse } from 'next/server';
import { compareTwoStrings } from 'string-similarity';
import { distance as levenshteinDistance } from 'fastest-levenshtein';

// Simple in-memory cache with TTL
const lyricsCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 200;

function getCacheKey(query) {
  return `lyrics:${query.toLowerCase().trim()}`;
}

function getFromCache(key) {
  const cached = lyricsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    lyricsCache.delete(key);
  }
  return null;
}

function setCache(key, data) {
  if (lyricsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = lyricsCache.keys().next().value;
    lyricsCache.delete(firstKey);
  }
  lyricsCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter is required'
      }, { status: 400 });
    }

    // Trim and validate
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Check cache first
    const cacheKey = getCacheKey(trimmedQuery);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      return NextResponse.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    // OPTIMIZATION 1: Reduce spell-corrected queries from 8 to 3
    const searchQueries = generateSpellCorrectedQueries(trimmedQuery).slice(0, 3);

    // OPTIMIZATION 2: Search Genius with timeout and limit results
    const geniusPromises = searchQueries.map(async (searchQuery) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000); // Reduced to 1s timeout

        const response = await fetch(
          `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}&per_page=3`, // Reduced to 3 results
          {
            headers: {
              'Authorization': `Bearer ${process.env.GENIUS_CLIENT_ACCESS_TOKEN}`,
            },
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          return { query: searchQuery, data, isOriginal: searchQuery === query };
        }
      } catch (error) {
        // Silent error handling
      }
      return null;
    });

    const geniusResults = await Promise.allSettled(geniusPromises);

    // Combine and prioritize results
    const allHits = [];
    const seenIds = new Set();

    // First, add results from original query
    for (const result of geniusResults) {
      if (result.status === 'fulfilled' && result.value?.data?.response?.hits && result.value.isOriginal) {
        for (const hit of result.value.data.response.hits) {
          if (!seenIds.has(hit.result.id)) {
            seenIds.add(hit.result.id);
            allHits.push({ ...hit, searchQuery: result.value.query, priority: 1 });
          }
        }
      }
    }

    // Then add results from spell-corrected queries
    for (const result of geniusResults) {
      if (result.status === 'fulfilled' && result.value?.data?.response?.hits && !result.value.isOriginal) {
        for (const hit of result.value.data.response.hits) {
          if (!seenIds.has(hit.result.id)) {
            seenIds.add(hit.result.id);
            allHits.push({ ...hit, searchQuery: result.value.query, priority: 2 });
          }
        }
      }
    }

    if (!allHits.length) {
      setCache(cacheKey, []);
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // OPTIMIZATION 3: Limit to top 3 hits instead of 5 (further reduction)
    allHits.sort((a, b) => a.priority - b.priority);
    const topHits = allHits.slice(0, 3);

    // OPTIMIZATION 4: Process in parallel with aggressive timeout
    const jiosaavnPromises = topHits.map(async (hit, i) => {
      const song = hit.result;
      let title = song.title;
      let artist = song.primary_artist?.name || song.artist_names;

      // Special handling for romanized songs
      if (artist === 'Genius Romanizations' && title.includes(' - ')) {
        const titleParts = title.split(' - ');
        if (titleParts.length >= 2) {
          artist = titleParts[0].trim();
          title = titleParts.slice(1).join(' - ').replace(/\(romanized\)/gi, '').trim();
        }
      }

      // OPTIMIZATION 5: Reduce search variations from 5 to 2
      const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      const searchVariations = [
        `${cleanTitle} ${artist}`,
        cleanTitle
      ];

      let bestJiosaavnMatch = null;
      let bestMatchScore = 0;
      let bestSearchQuery = '';

      // OPTIMIZATION 6: Ultra-aggressive timeout (800ms instead of 1s)
      const searchPromises = searchVariations.map(async (searchQuery) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 800); // 800ms timeout

          const jiosaavnResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/search?query=${encodeURIComponent(searchQuery)}`,
            {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
              }
            }
          );
          clearTimeout(timeoutId);

          if (jiosaavnResponse.ok) {
            const jiosaavnData = await jiosaavnResponse.json();
            return { searchQuery, data: jiosaavnData };
          }
        } catch (error) {
          // Silent error handling
        }
        return null;
      });

      const results = await Promise.allSettled(searchPromises);

      // OPTIMIZATION 7: Check only top 1 result for speed
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { searchQuery, data } = result.value;
          if (data?.success && data.data.songs?.results?.length > 0) {
            const jiosaavnSong = data.data.songs.results[0]; // Only check first result
            const matchScore = calculateMatchScore(title, artist, jiosaavnSong);
            if (matchScore > bestMatchScore) {
              bestJiosaavnMatch = jiosaavnSong;
              bestMatchScore = matchScore;
              bestSearchQuery = searchQuery;

              // Early exit for very high scores
              if (matchScore > 100) break;
            }
          }
        }
      }

      // Calculate Genius ranking bonus
      const geniusRankBonus = Math.max(0, 100 - (i * 20));
      const finalScore = bestMatchScore + geniusRankBonus;

      return {
        genius: {
          id: song.id,
          title: song.title,
          artist: artist,
          url: song.url,
          image: song.song_art_image_url,
          pageviews: song.stats?.pageviews || 0,
          rank: i + 1
        },
        jiosaavn: bestJiosaavnMatch,
        searchQuery: bestSearchQuery,
        matchScore: bestMatchScore,
        finalScore: finalScore,
        geniusRank: i + 1
      };
    });

    // Wait for all parallel processing
    const allResults = await Promise.allSettled(jiosaavnPromises);

    // Filter successful results
    const lyricsResults = [];
    for (const result of allResults) {
      if (result.status === 'fulfilled' && result.value) {
        lyricsResults.push(result.value);
      }
    }

    // Sort by final score
    lyricsResults.sort((a, b) => {
      if (a.jiosaavn && !b.jiosaavn) return -1;
      if (!a.jiosaavn && b.jiosaavn) return 1;
      if (a.jiosaavn && b.jiosaavn) return b.finalScore - a.finalScore;
      return a.geniusRank - b.geniusRank;
    });

    // Cache the result
    setCache(cacheKey, lyricsResults);

    return NextResponse.json({
      success: true,
      data: lyricsResults,
      cached: false
    });

  } catch (error) {
    console.error('Lyrics search error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search lyrics'
    }, { status: 500 });
  }
}

// OPTIMIZATION 8: Simplified spell correction (removed heavy natural.js processing)
function generateSpellCorrectedQueries(query) {
  const queries = [query]; // Always include original query first

  // Common misspelling patterns (reduced set)
  const spellCorrections = {
    'dont': "don't",
    'doesnt': "doesn't",
    'cant': "can't",
    'wont': "won't",
    'isnt': "isn't",
    'wasnt': "wasn't",
    'youre': "you're",
    'theyre': "they're",
    'its': "it's",
    'kinda': 'kind of',
    'gonna': 'going to',
    'wanna': 'want to',
    'gotta': 'got to',
    'alot': 'a lot',
  };

  // Apply direct spell corrections
  let correctedQuery = query.toLowerCase();
  for (const [wrong, correct] of Object.entries(spellCorrections)) {
    if (correctedQuery.includes(wrong)) {
      const newQuery = correctedQuery.replace(new RegExp(wrong, 'g'), correct);
      if (newQuery !== correctedQuery && !queries.includes(newQuery)) {
        queries.push(newQuery);
      }
    }
  }

  // Add partial queries for long lyrics searches
  if (query.length > 15) {
    const words = query.split(' ').filter(w => w.length > 2);
    if (words.length > 3) {
      // Key words (longer words that are likely important)
      const keyWords = words.filter(w => w.length > 4).slice(0, 3);
      if (keyWords.length > 0) {
        queries.push(keyWords.join(' '));
      }
    }
  }

  // Remove duplicates and filter out very short queries
  return [...new Set(queries)]
    .filter(q => q && q.trim().length > 2)
    .slice(0, 3); // Limit to 3 queries for performance
}

// OPTIMIZATION 9: Simplified matching algorithm
function normalizeString(str) {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(str) {
  return str.replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\bfeat\.?\b|\bft\.?\b|\bfeaturing\b/gi, '')
    .trim();
}

function calculateMatchScore(geniusTitle, geniusArtist, jiosaavnSong) {
  if (!jiosaavnSong) return 0;

  const jiosaavnTitle = jiosaavnSong.title || jiosaavnSong.name || '';
  const jiosaavnArtist = jiosaavnSong.primaryArtists || '';

  let score = 0;

  const normalizedGeniusTitle = normalizeString(cleanTitle(geniusTitle));
  const normalizedJiosaavnTitle = normalizeString(cleanTitle(jiosaavnTitle));
  const normalizedGeniusArtist = normalizeString(geniusArtist);
  const normalizedJiosaavnArtist = normalizeString(jiosaavnArtist);

  // 1. EXACT TITLE MATCHING
  if (normalizedGeniusTitle === normalizedJiosaavnTitle) {
    score += 80;
  } else {
    // 2. FUZZY TITLE MATCHING
    const titleSimilarity = compareTwoStrings(normalizedGeniusTitle, normalizedJiosaavnTitle);
    if (titleSimilarity > 0.4) {
      score += Math.floor(titleSimilarity * 70);
    }

    // 3. SUBSTRING MATCHING
    if (normalizedJiosaavnTitle.includes(normalizedGeniusTitle) ||
      normalizedGeniusTitle.includes(normalizedJiosaavnTitle)) {
      score += 30;
    }
  }

  // 4. EXACT ARTIST MATCHING
  if (normalizedGeniusArtist === normalizedJiosaavnArtist) {
    score += 50;
  } else {
    // 5. FUZZY ARTIST MATCHING
    const artistSimilarity = compareTwoStrings(normalizedGeniusArtist, normalizedJiosaavnArtist);
    if (artistSimilarity > 0.5) {
      score += Math.floor(artistSimilarity * 40);
    }

    // 6. ARTIST SUBSTRING MATCHING
    if (normalizedJiosaavnArtist.includes(normalizedGeniusArtist) ||
      normalizedGeniusArtist.includes(normalizedJiosaavnArtist)) {
      score += 20;
    }
  }

  return Math.min(score, 200); // Cap the score
}
