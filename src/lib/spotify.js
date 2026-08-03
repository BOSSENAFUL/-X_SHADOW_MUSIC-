import https from 'https';

/**
 * Spotify API Integration Helper
 * Uses the spotify-scraper API. Single call returns both playlist details and all tracks.
 */

function spotifyRequest(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    reject({ status: 429, retryAfter: res.headers['retry-after'] });
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
        req.end();
    });
}

const HTML_ENTITY_MAP = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
    nbsp: ' ', mdash: '—', ndash: '–', copy: '©', reg: '®', trade: '™',
    hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”'
};

function decodeEntities(text) {
    if (!text || typeof text !== 'string') return text || '';
    let str = text;
    let prev = '';
    let count = 0;
    while (str !== prev && str.includes('&') && count < 3) {
        prev = str;
        str = str.replace(/&(#(?:x[0-9a-fA-F]+|[0-9]+)|[a-zA-Z]+);/g, (match, entity) => {
            if (entity.startsWith('#x') || entity.startsWith('#X')) {
                const code = parseInt(entity.slice(2), 16);
                return !isNaN(code) ? String.fromCharCode(code) : match;
            }
            if (entity.startsWith('#')) {
                const code = parseInt(entity.slice(1), 10);
                return !isNaN(code) ? String.fromCharCode(code) : match;
            }
            return HTML_ENTITY_MAP[entity.toLowerCase()] || match;
        });
        count++;
    }
    return str.trim();
}


function splitArtists(artistData) {
    if (!artistData) return [{ name: 'Unknown Artist' }];
    const artists = [];
    const rawList = Array.isArray(artistData) ? artistData : [artistData];
    rawList.forEach(item => {
        const decoded = decodeEntities(item);
        const parts = decoded.split(/\s*&\s*|\s*,\s*|\s+feat\.\s+|\s+ft\.\s+/i);
        parts.forEach(p => { const clean = p.trim(); if (clean.length > 0) artists.push({ name: clean }); });
    });
    return artists.length > 0 ? artists : [{ name: 'Unknown Artist' }];
}

/**
 * OPTIMIZED: Single API call that returns BOTH playlist details and tracks.
 * This eliminates the double network round-trip the old code had.
 */
export async function getPlaylistData(playlistId) {
    try {
        const baseUrl = process.env.SPOTIFY_SCRAPER_API_URL;
        const externalApiUrl = `${baseUrl}${playlistId}`;
        console.log(`[Spotify] Fetching playlist data: ${playlistId}`);

        const data = await spotifyRequest(externalApiUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'Jammify/1.0' },
        });

        if (!data || !data.success || !data.playlist || !data.tracks) return null;

        const details = {
            name: decodeEntities(data.playlist.name || 'Imported Playlist'),
            description: decodeEntities(data.playlist.description || (data.playlist.owner ? `By ${data.playlist.owner}` : '')),
            images: data.playlist.images || []
        };

        const tracks = data.tracks.map(track => ({
            name: decodeEntities(track.name),
            artists: splitArtists(track.artists),
            id: track.id,
            duration_ms: track.duration?.ms || 0
        })).filter(t => t.id);

        return { details, tracks };
    } catch (e) {
        console.error('Error fetching playlist data:', e);
        return null;
    }
}

// Legacy exports kept for backwards compatibility (uses getPlaylistData internally)
export async function getPlaylistTracks(playlistId) {
    const data = await getPlaylistData(playlistId);
    return data?.tracks || [];
}

export async function getPlaylistDetails(playlistId) {
    const data = await getPlaylistData(playlistId);
    return data?.details || null;
}
