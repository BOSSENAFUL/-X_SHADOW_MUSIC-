import { NextResponse } from 'next/server';

// In-memory cache for artist bios (5 minute TTL)
const bioCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedBio(artistName) {
  const cached = bioCache.get(artistName.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedBio(artistName, data) {
  bioCache.set(artistName.toLowerCase(), {
    data,
    timestamp: Date.now()
  });

  // Cleanup old entries (keep cache size reasonable)
  if (bioCache.size > 100) {
    const oldestKey = bioCache.keys().next().value;
    bioCache.delete(oldestKey);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistName = searchParams.get('name');

    if (!artistName) {
      return NextResponse.json({
        success: false,
        error: 'Artist name is required'
      }, { status: 400 });
    }

    // Check cache first
    const cachedBio = getCachedBio(artistName);
    if (cachedBio) {
      return NextResponse.json({
        success: true,
        data: cachedBio,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=600', // 5 min browser, 10 min CDN
        }
      });
    }

    let bio = [];

    // 1. Try Wikipedia (Fast Summary)
    try {
      // Normalize name for Wikipedia (replace spaces with underscores)
      const wikiTitle = encodeURIComponent(artistName.trim());
      const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`, {
        headers: { 'User-Agent': 'JammifyMusic/1.0 (https://jammify.com)' }
      });

      if (wikiResponse.ok) {
        const wikiData = await wikiResponse.json();
        if (wikiData.extract) {
          bio.push({
            title: 'Wikipedia Introduction',
            text: wikiData.extract
          });
        }
      }
    } catch (wikiError) {
      console.error('Wikipedia Fetch Error:', wikiError);
    }

    // 2. Try Genius (Already Have Token)
    // Only if Wikipedia gave nothing or we want more
    if (bio.length === 0 && process.env.GENIUS_CLIENT_ACCESS_TOKEN) {
      try {
        const searchResponse = await fetch(
          `https://api.genius.com/search?q=${encodeURIComponent(artistName)}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.GENIUS_CLIENT_ACCESS_TOKEN}`,
            },
          }
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const primaryHit = searchData.response.hits?.[0]?.result?.primary_artist;

          if (primaryHit?.id) {
            const artistRes = await fetch(`https://api.genius.com/artists/${primaryHit.id}?text_format=plain`, {
              headers: { 'Authorization': `Bearer ${process.env.GENIUS_CLIENT_ACCESS_TOKEN}` }
            });

            if (artistRes.ok) {
              const artistData = await artistRes.json();
              const geniusBio = artistData.response.artist.description?.plain;

              // Clean up the text (remove [Credits], etc.)
              if (geniusBio && geniusBio.trim() !== '?' && geniusBio.length > 50) {
                bio.push({
                  title: 'Genius Biography',
                  text: geniusBio.slice(0, 2000) // Truncate long ones
                });
              }
            }
          }
        }
      } catch (geniusError) {
        console.error('Genius Fetch Error:', geniusError);
      }
    }

    if (bio.length === 0) {
      // Cache empty result too (to avoid repeated failed lookups)
      setCachedBio(artistName, []);
      return NextResponse.json({
        success: true,
        data: []
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        }
      });
    }

    // Cache successful result
    setCachedBio(artistName, bio);

    return NextResponse.json({
      success: true,
      data: bio
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      }
    });

  } catch (error) {
    console.error('External Bio API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch external biography'
    }, { status: 500 });
  }
}
