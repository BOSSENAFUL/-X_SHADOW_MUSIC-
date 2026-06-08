import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint'); // 'get' or 'search'
    
    if (!endpoint || (endpoint !== 'get' && endpoint !== 'search')) {
        return NextResponse.json({ error: 'Invalid or missing endpoint parameter' }, { status: 400 });
    }

    // Forward all parameters except 'endpoint' to lrclib.net
    const lrclibParams = new URLSearchParams(searchParams);
    lrclibParams.delete('endpoint');

    const lrclibUrl = `https://lrclib.net/api/${endpoint}?${lrclibParams.toString()}`;

    try {
        const response = await fetch(lrclibUrl, {
            headers: {
                'User-Agent': 'Jammify Music App (https://github.com/shreejaybhay/jammify)',
            },
        });

        if (response.status === 404) {
            return new Response(JSON.stringify({ error: 'Lyrics not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!response.ok) {
            console.error(`Lyrics proxy: lrclib returned status ${response.status}`);
            return new Response(JSON.stringify({ error: `Lyrics fetch failed: ${response.statusText}` }), {
                status: response.status >= 400 && response.status < 600 ? response.status : 502,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Lyrics proxy fetch failed:', error.message);
        return NextResponse.json({ error: 'Failed to proxy lyrics' }, { status: 502 });
    }
}
