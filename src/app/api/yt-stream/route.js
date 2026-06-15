import { Innertube, Platform } from 'youtubei.js';

// Configure the custom JavaScript evaluator for youtubei.js signature deciphering
if (Platform.shim) {
  Platform.shim.eval = async (data, env) => {
    const properties = [];
    if (env.n) {
      properties.push(`n: exportedVars.nFunction("${env.n}")`);
    }
    if (env.sig) {
      properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
    }
    const code = `${data.output}\nreturn { ${properties.join(', ')} }`;
    return new Function(code)();
  };
}

let ytInstance = null;

async function getYtInstance() {
  if (!ytInstance) {
    ytInstance = await Innertube.create();
  }
  return ytInstance;
}

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return Response.json({ error: 'Parameter "id" is required' }, { status: 400 });
    }

    const yt = await getYtInstance();
    
    // Fetch metadata and streaming data using the YTMUSIC client
    const info = await yt.getInfo(videoId, { client: 'YTMUSIC' });

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
