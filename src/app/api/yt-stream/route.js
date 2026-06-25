import { getYtInstance } from '@/lib/youtube';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return Response.json({ error: 'Parameter "id" is required' }, { status: 400 });
    }

    const yt = await getYtInstance();
    
    let info = null;
    const errors = {};
    
    // Fallback chain of clients to get video info (ANDROID and YTMUSIC bypass most locks and yield working streams)
    const clients = ['ANDROID', 'YTMUSIC', 'TV', 'WEB'];
    for (const client of clients) {
      try {
        console.log(`[yt-stream] Attempting to fetch video info with client: ${client}`);
        const tempInfo = await yt.getInfo(videoId, { client });
        
        // Check if we successfully got streaming data
        if (tempInfo && (tempInfo.streaming_data || tempInfo.playability_status?.status === 'OK')) {
          info = tempInfo;
          console.log(`[yt-stream] Successfully fetched video info with client: ${client}`);
          break;
        } else {
          const status = tempInfo?.playability_status?.status || 'UNKNOWN_STATUS';
          const reason = tempInfo?.playability_status?.reason || 'No streaming data or status not OK';
          console.warn(`[yt-stream] Client ${client} returned playability status: ${status}. Reason: ${reason}`);
          errors[client] = `Status: ${status}, Reason: ${reason}`;
        }
      } catch (err) {
        console.warn(`[yt-stream] Client ${client} failed:`, err.message);
        errors[client] = err.message;
      }
    }

    if (!info) {
      console.error('[yt-stream] All clients failed to fetch video info. Errors:', errors);
      
      const isLoginRequired = Object.values(errors).some(msg => 
        msg && (msg.includes('LOGIN_REQUIRED') || msg.includes("confirm you're not a bot") || msg.includes("confirm you’re not a bot"))
      );
      
      if (isLoginRequired) {
        if (!process.env.YOUTUBE_COOKIES) {
          return Response.json({
            error: 'YouTube requires authentication to confirm you are not a bot (LOGIN_REQUIRED).',
            message: 'To resolve this, you must configure the YOUTUBE_COOKIES environment variable in your Vercel Dashboard.',
            instructions: [
              '1. Open a new Incognito window in your browser.',
              '2. Log in to a secondary or "burner" Google/YouTube account.',
              '3. Press F12 to open Developer Tools, and select the Network tab.',
              '4. Refresh the page or click a video to trigger a network request.',
              '5. Click on any request to youtube.com (e.g. youtube.com/v1/player).',
              '6. Scroll down to Request Headers, find the "cookie" header, and copy its entire string value.',
              '7. Paste this string value as the YOUTUBE_COOKIES environment variable in Vercel.'
            ],
            details: errors
          }, { status: 403 });
        } else {
          return Response.json({
            error: 'YouTube authentication failed or session expired (LOGIN_REQUIRED).',
            message: 'The YOUTUBE_COOKIES environment variable is set, but YouTube is still requesting sign-in. Your session cookies may have expired or been invalidated.',
            instructions: [
              'Please update the YOUTUBE_COOKIES environment variable in Vercel with fresh cookies from your browser using the standard incognito setup steps.'
            ],
            details: errors
          }, { status: 401 });
        }
      }

      return Response.json({ 
        error: 'Streaming data not available',
        details: errors
      }, { status: 500 });
    }

    // Prioritize itag 18 (Video+Audio) because it bypasses signature-cipher range/seek locking
    // which prevents 403 Forbidden errors when seeking or streaming chunks > 1MB.
    // If itag 18 is not found, fall back to best audio format.
    let format = info.chooseFormat({ itag: 18 });
    if (!format) {
      console.warn('itag 18 not found, falling back to best audio format');
      format = info.chooseFormat({ type: 'audio', quality: 'best' });
    }

    if (!format) {
      return Response.json({ error: 'No suitable audio or fallback format found' }, { status: 404 });
    }

    // Get playable stream URL (deciphering if necessary)
    let streamUrl = format.url;
    if (!streamUrl) {
      try {
        streamUrl = await format.decipher(yt.session.player);
      } catch (decipherError) {
        console.warn('Decipher failed, falling back to format.url:', decipherError);
        streamUrl = format.url || null;
      }
    }

    if (!streamUrl) {
      return Response.json({ error: 'Stream URL not available' }, { status: 500 });
    }

    // Forward the Range header from the browser request if present
    const rangeHeader = request.headers.get('range');
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    // Fetch the audio stream from Google Video
    const proxyResponse = await fetch(streamUrl, {
      headers: fetchHeaders
    });

    if (!proxyResponse.ok) {
      console.error(`Google Video proxy error: ${proxyResponse.status} ${proxyResponse.statusText}`);
      return Response.json({ error: `Failed to fetch stream from YouTube: ${proxyResponse.statusText}` }, { status: proxyResponse.status });
    }

    // Construct headers for the client response
    const responseHeaders = {
      'Content-Type': proxyResponse.headers.get('Content-Type') || format.mime_type || 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable'
    };

    // Forward Content-Length and Content-Range if present
    const contentLength = proxyResponse.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }
    const contentRange = proxyResponse.headers.get('Content-Range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Pipe the response body from the fetch directly back to the browser
    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Error in /api/yt-stream:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
