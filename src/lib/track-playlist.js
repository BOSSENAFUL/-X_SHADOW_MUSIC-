
/**
 * Tracks a playlist as recently played by calling the API.
 * @param {Object} playlist - The playlist object (needs id, name, image, etc)
 * @param {string} source - 'jiosaavn' or 'user'
 * @param {Array} songList - Optional list of songs to get accurate count
 */
export const trackRecentlyPlayed = async (playlist, source = 'jiosaavn', songList = []) => {
    try {
        const id = playlist.playlistId || playlist.id;
        const name = playlist.playlistName || playlist.name;
        let image = playlist.image || [];

        // If it's a user playlist with no image, but we have songs, generate a collage
        if (source === 'user' && (!image || image.length === 0) && songList.length >= 4) {
            image = songList.slice(0, 4).map(song => {
                const url = song.image?.find(img => img.quality === '100x100')?.url ||
                    song.image?.find(img => img.quality === '150x150')?.url ||
                    song.image?.find(img => img.quality === '500x500')?.url ||
                    song.image?.[song.image.length - 1]?.url ||
                    '/default-playlist-image.png';
                return { quality: 'default', url };
            });
        }

        await fetch('/api/recently-played-playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playlistData: {
                    id: id,
                    name: name,
                    image: image,
                    songCount: songList.length || playlist.songCount || 0,
                    source: source,
                    owner: playlist.owner || playlist.subtitle || playlist.description || (source === 'user' ? 'You' : 'JioSaavn')
                }
            }),
        });
    } catch (err) {
        console.error('Error tracking recently played from utility:', err);
    }
};
