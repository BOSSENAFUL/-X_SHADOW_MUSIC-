import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const trackName = searchParams.get('s');
    const artistName = searchParams.get('a');

    if (!trackName || !artistName) {
        return NextResponse.json({ error: 'Missing track name (s) or artist name (a)' }, { status: 400 });
    }

    const ttmlUrl = `https://lyrics-api.boidu.dev/ttml/getLyrics?s=${encodeURIComponent(trackName)}&a=${encodeURIComponent(artistName)}`;

    try {
        const response = await fetch(ttmlUrl, {
            headers: {
                'User-Agent': 'Jammify Music App (https://github.com/shreejaybhay/jammify)',
            },
        });

        if (response.status === 404 || response.status === 401) {
            return NextResponse.json({ error: 'Lyrics not found in TTML database' }, { status: 404 });
        }

        if (!response.ok) {
            console.warn(`TTML Lyrics proxy: API returned status ${response.status}`);
            return NextResponse.json({ error: `Lyrics fetch failed: ${response.statusText}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('TTML Lyrics proxy fetch failed:', error.message);
        return NextResponse.json({ error: 'Failed to proxy TTML lyrics' }, { status: 502 });
    }
}
