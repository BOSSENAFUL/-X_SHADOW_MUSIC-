import https from 'https';

/**
 * Spotify API Integration Helper
 * 
 * Uses an external unofficial API to bypass official Spotify API restrictions.
 */

function spotifyRequest(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    const retryAfter = res.headers['retry-after'];
                    reject({ status: 429, retryAfter: retryAfter });
                    return;
                }
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
                } else {
                    reject(new Error(`Spotify Request Failed: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', (e) => { console.error('Spotify Request Error:', e); reject(e); });
        if (body) req.write(body);
        req.end();
    });
}

function decodeEntities(text) {
    if (!text) return '';
    return text
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .trim();
}

/**
 * Splits joined artist names.
 * We no longer treat "Lo-Fi" as noise if it's part of a name like "Lo-Fi Luke".
 */
function splitArtists(artistData) {
    if (!artistData) return [{ name: 'Unknown Artist' }];
    const artists = [];
    const rawList = Array.isArray(artistData) ? artistData : [artistData];

    rawList.forEach(item => {
        const decoded = decodeEntities(item);
        const parts = decoded.split(/\s*&\s*|\s*,\s*|\s+feat\.\s+|\s+ft\.\s+/i);
        parts.forEach(p => {
            const clean = p.trim();
            if (clean.length > 0) artists.push({ name: clean });
        });
    });

    return artists.length > 0 ? artists : [{ name: 'Unknown Artist' }];
}

export async function getPlaylistTracks(playlistId) {
    try {
        const externalApiUrl = `https://spotify-ex-api-v1.vercel.app/api/spotisong/playlist?url=https://open.spotify.com/playlist/${playlistId}`;
        console.log(`[Spotify] Fetching tracks via external API: ${playlistId}`);

        const data = await spotifyRequest(externalApiUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Jammify/1.0' },
        });

        if (!data || !data.tracks) return [];

        return data.tracks.map(track => {
            const idMatch = track.spotify_url?.match(/track\/([a-zA-Z0-9]+)/);
            return {
                name: decodeEntities(track.name),
                artists: splitArtists(track.artists),
                album: { name: decodeEntities(track.albumName || '') },
                id: idMatch ? idMatch[1] : null,
                duration_ms: 0 // Keep duration 0 as requested to let title/artist drive matching
            };
        }).filter(t => t.id);
    } catch (e) {
        console.error('Error fetching tracks:', e);
        return [];
    }
}

export async function getPlaylistDetails(playlistId) {
    try {
        const externalApiUrl = `https://spotify-ex-api-v1.vercel.app/api/spotisong/playlist?url=https://open.spotify.com/playlist/${playlistId}`;
        const data = await spotifyRequest(externalApiUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Jammify/1.0' },
        });
        if (!data) return null;
        return {
            name: decodeEntities(data.name || 'Imported Playlist'),
            description: decodeEntities(data.description || ''),
            images: data.imageUrl ? [{ url: data.imageUrl }] : []
        };
    } catch (e) {
        return null;
    }
}
