import { NextResponse } from 'next/server';

/**
 * GET /api/yt-suggestions?q=<query>
 * Proxies YouTube's autocomplete suggestion API.
 * Returns: { success: true, suggestions: string[] }
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (!q.trim()) {
    return NextResponse.json({ success: true, suggestions: [] });
  }

  try {
    // YouTube's public suggestion endpoint (returns JSONP / JSON)
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    // Response format: ["query", ["s1", "s2", ...], [], [], {}]
    const json = await res.json();
    const suggestions = Array.isArray(json[1]) ? json[1].slice(0, 10) : [];

    return NextResponse.json({ success: true, suggestions });
  } catch (err) {
    console.error('[yt-suggestions]', err.message);
    return NextResponse.json({ success: true, suggestions: [] });
  }
}
