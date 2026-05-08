import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate that the URL is actually a URL, not an HTML error page or other garbage
    let parsedUrl;
    try {
        parsedUrl = new URL(imageUrl);
    } catch {
        console.error('Image proxy: invalid URL received:', imageUrl.slice(0, 100));
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Only allow http/https URLs
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
    }

    try {
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';

        // Reject if the upstream returned non-image content (HTML error pages, JSON, etc.)
        if (!contentType.startsWith('image/') && !contentType.startsWith('video/') && contentType !== 'application/octet-stream') {
            console.error('Image proxy: upstream returned non-image content-type:', contentType, 'for URL:', imageUrl);
            return NextResponse.json({ error: 'Upstream returned non-image content' }, { status: 502 });
        }

        const buffer = await response.arrayBuffer();

        return new Response(buffer, {
            headers: {
                'Content-Type': contentType || 'image/jpeg',
                // Cache for 7 days on CDN, 30 days in browser
                'Cache-Control': 'public, max-age=2592000, s-maxage=604800, stale-while-revalidate=86400',
                'Access-Control-Allow-Origin': '*',
                'CDN-Cache-Control': 'max-age=604800',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
