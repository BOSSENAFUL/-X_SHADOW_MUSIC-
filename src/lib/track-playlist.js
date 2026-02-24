
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
        const image = playlist.image || [];

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
