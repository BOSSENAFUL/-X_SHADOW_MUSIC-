import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const trackName = searchParams.get('s');
    const artistName = searchParams.get('a');
    const duration = searchParams.get('d');

    if (!trackName || !artistName) {
        return NextResponse.json({ error: 'Missing track name (s) or artist name (a)' }, { status: 400 });
    }

    const userAgent = 'Jammify Music App (https://github.com/shreejaybhay/jammify)';

    // Fallback list of endpoints to try in order
    const apis = [
        {
            url: `https://lyricsplus.prjktla.my.id/v2/lyrics/get?title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}${duration ? `&duration=${encodeURIComponent(duration)}` : ''}&source=apple,lyricsplus,musixmatch,spotify,musixmatch-word`,
            type: 'lyricsplus'
        },
        {
            url: `https://lyrics.geeked.wtf/v2/lyrics/get?title=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}${duration ? `&duration=${encodeURIComponent(duration)}` : ''}&source=apple,lyricsplus,musixmatch,spotify,musixmatch-word`,
            type: 'lyricsplus'
        },
        {
            url: `https://lyrics-api.boidu.dev/getLyrics?s=${encodeURIComponent(trackName)}&a=${encodeURIComponent(artistName)}${duration ? `&d=${encodeURIComponent(duration)}` : ''}`,
            type: 'boidu'
        }
    ];

    let lastError = null;

    for (const api of apis) {
        try {
            console.log(`TTML Lyrics proxy: fetching from ${api.url}`);
            const response = await fetch(api.url, {
                headers: {
                    'User-Agent': userAgent,
                },
                signal: AbortSignal.timeout(6000) // 6 second timeout per try
            });

            if (response.status === 404 || response.status === 401) {
                console.log(`TTML Lyrics proxy: 404 from provider, checking next`);
                lastError = { status: 404, message: 'Lyrics not found in source database' };
                continue;
            }

            if (!response.ok) {
                console.warn(`TTML Lyrics proxy: provider returned status ${response.status}`);
                lastError = { status: response.status, message: `Lyrics provider status: ${response.status}` };
                continue;
            }

            const data = await response.json();

            if (api.type === 'boidu') {
                if (data && data.ttml) {
                    return NextResponse.json({
                        lyrics: data.ttml
                    });
                }
            } else {
                if (data && data.lyrics) {
                    return NextResponse.json(data);
                }
            }

            console.warn(`TTML Lyrics proxy: invalid structure from provider`);
            lastError = { status: 502, message: 'Invalid payload structure' };
        } catch (error) {
            console.error(`TTML Lyrics proxy failed for ${api.url}:`, error.message);
            lastError = { status: 502, message: error.message };
        }
    }

    const finalStatus = lastError?.status || 404;
    const finalMessage = lastError?.message || 'Lyrics not found';
    return NextResponse.json({ error: finalMessage }, { status: finalStatus });
}


