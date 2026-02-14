import https from 'https';

/**
 * Spotify API Integration Helper
 * 
 * This module provides functions to interact with the Spotify Web API using 
 * the Client Credentials flow. This is used for server-side requests where 
 * user-specific authorization (like accessing private playlists) is not required.
 */

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Global variables to cache the access token to avoid redundant auth requests
let token = null;
let tokenExpiresAt = 0;

/**
 * Wrapper for native https.request to behave like fetch but bypass Next.js fetch patches.
 * We use this because Next.js patches the global fetch which can sometimes cause
 * 503 Upstream Connect Errors in certain environments/proxies when talking to Spotify.
 */
function spotifyRequest(url, options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';

            // Collect chunks of data as they arrive
            res.on('data', (chunk) => data += chunk);

            // Once all data has arrived, process it
            res.on('end', () => {
                // Spotify uses status code 429 for rate limiting
                if (res.statusCode === 429) {
                    const retryAfter = res.headers['retry-after'];
                    reject({ status: 429, retryAfter: retryAfter });
                    return;
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        // Return raw data if it's not JSON
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Spotify Request Failed: ${res.statusCode} ${data}`));
                }
            });
        });

        // Handle connection errors
        req.on('error', (e) => {
            console.error('Spotify Request Error:', e);
            reject(e);
        });

        // Write the request body if it exists (e.g., for POST requests)
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

/**
 * Gets a valid access token using Spotify Client Credentials Flow.
 * Logic: Validates if current token exists and hasn't expired, otherwise requests a new one.
 */
async function getAccessToken() {
    // If we have a cached token that isn't about to expire, return it
    if (token && Date.now() < tokenExpiresAt) {
        return token;
    }

    // Prepare authorization header: Base64(CLIENT_ID:CLIENT_SECRET)
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    try {
        const data = await spotifyRequest('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Jammify/1.0',
            }
        }, postData);

        token = data.access_token;
        // Calculate expiration: current time + expires_in seconds - 1 minute buffer
        tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;
        return token;
    } catch (e) {
        console.error("Spotify Authentication Error:", e);
        throw e;
    }
}

/**
 * Fetches all tracks from a Spotify playlist, handling API pagination.
 * @param {string} playlistId - The Spotify ID of the playlist
 * @returns {Array} - Array of track objects with basic metadata
 */
export async function getPlaylistTracks(playlistId) {
    const accessToken = await getAccessToken();
    let tracks = [];
    // Spotify returns tracks in pages (limit 100). We loop until 'next' is null.
    let nextUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(name,artists(name),album(name),id,duration_ms)),next`;

    // Spotify returns tracks in pages (limit 100). We loop until 'next' is null.
    while (nextUrl) {
        try {
            const data = await spotifyRequest(nextUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'Jammify/1.0',
                },
            });

            // Map and filter out invalid/local tracks
            const validTracks = data.items
                .map(item => item.track)
                .filter(t => t && t.id);

            tracks = [...tracks, ...validTracks];

            // Set the URL for the next page
            nextUrl = data.next;
        } catch (e) {
            // Respect rate limits if they occur during pagination
            if (e.status === 429) {
                const retryAfter = e.retryAfter || 1;
                console.warn(`Spotify Rate Limit hit. Waiting ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue; // Retry the same URL
            }
            console.error("Error fetching Spotify tracks page:", e);
            break; // Stop fetching on other errors
        }
    }

    return tracks;
}

/**
 * Fetches basic metadata (name, description, images) for a Spotify playlist.
 * @param {string} playlistId - The Spotify ID of the playlist
 * @returns {Object|null} - Playlist data or null if fetch fails
 */
export async function getPlaylistDetails(playlistId) {
    try {
        const accessToken = await getAccessToken();
        const data = await spotifyRequest(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,images`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'Jammify/1.0',
            },
        });
        return data;
    } catch (e) {
        console.error("Get Playlist Details Error:", e);
        return null; // Return null if not found or error
    }
}
