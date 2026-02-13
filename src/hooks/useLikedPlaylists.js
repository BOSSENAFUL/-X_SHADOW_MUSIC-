import { useState, useEffect, useCallback } from 'react';

// Simple module-level cache for liked playlists to survive navigation
const playlistsCache = new Map();

export function useLikedPlaylists(userId) {
  const [likedPlaylists, setLikedPlaylists] = useState([]);
  const [likedPlaylistIds, setLikedPlaylistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all liked playlists for the user
  const fetchLikedPlaylists = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check cache first if not forcing refresh
    if (!forceRefresh && playlistsCache.has(userId)) {
      const cachedData = playlistsCache.get(userId);
      setLikedPlaylists(cachedData);
      setLikedPlaylistIds(new Set(cachedData.map(p => p.playlistId)));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/liked-playlists?userId=${userId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        const userPlaylistIds = [];
        const apiPlaylists = [];

        data.data.forEach(playlist => {
          const isUserPlaylist = playlist.playlistId &&
            playlist.playlistId.length === 24 &&
            /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

          if (isUserPlaylist) {
            userPlaylistIds.push(playlist.playlistId);
          } else {
            apiPlaylists.push({ ...playlist, isUserPlaylist: false });
          }
        });

        let enrichedUserPlaylists = [];
        if (userPlaylistIds.length > 0) {
          // Batch check accessibility and get basic info (including songIds)
          const batchResponse = await fetch('/api/playlists/batch-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playlistIds: userPlaylistIds, userId }),
          });
          const batchResult = await batchResponse.json();

          if (batchResult.success) {
            const allNeededSongIds = new Set();
            const playlistEnrichments = {};

            batchResult.data.forEach(item => {
              if (item.isAccessible && item.playlist) {
                const songIds = item.playlist.songIds || [];
                playlistEnrichments[item.playlistId] = {
                  ...item.playlist,
                  songIds: songIds.slice(0, 4)
                };
                songIds.slice(0, 4).forEach(id => allNeededSongIds.add(id));
              }
            });

            // Batch fetch ALL song images needed for ALL collages
            const songImageCache = {};
            if (allNeededSongIds.size > 0) {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
              const idsArray = Array.from(allNeededSongIds);

              // Use large chunks for API efficiency
              const chunkSize = 20;
              for (let i = 0; i < idsArray.length; i += chunkSize) {
                const chunk = idsArray.slice(i, i + chunkSize);
                try {
                  const songRes = await fetch(`${apiUrl}/api/songs?ids=${chunk.join(',')}`);
                  const songData = await songRes.json();
                  if (songData.success && songData.data) {
                    songData.data.forEach(song => {
                      if (song?.image) {
                        songImageCache[song.id] = song.image.find(img => img.quality === '150x150')?.url || song.image[0]?.url;
                      }
                    });
                  }
                } catch (e) { console.error("Batch song fetch error", e); }
              }
            }

            // Map everything back to the liked playlists list
            enrichedUserPlaylists = data.data
              .filter(p => playlistEnrichments[p.playlistId])
              .map(p => {
                const enrichment = playlistEnrichments[p.playlistId];
                const collageImages = enrichment.songIds
                  .map(id => songImageCache[id])
                  .filter(Boolean);

                return {
                  ...p,
                  owner: enrichment.ownerName || p.owner,
                  songCount: enrichment.songCount,
                  isUserPlaylist: true,
                  collageImages: collageImages.length >= 4 ? collageImages : null,
                  isCollage: collageImages.length >= 4,
                  image: collageImages.length > 0 && collageImages.length < 4 ? collageImages[0] : p.image
                };
              });
          }
        }

        const finalPlaylists = [...apiPlaylists, ...enrichedUserPlaylists];
        setLikedPlaylists(finalPlaylists);
        setLikedPlaylistIds(new Set(finalPlaylists.map(p => p.playlistId)));

        // Update cache
        playlistsCache.set(userId, finalPlaylists);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch liked playlists');
      console.error('Error fetching liked playlists:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Toggle like/unlike a playlist
  const toggleLike = useCallback(async (playlistData) => {
    if (!userId) {
      setError('User ID is required');
      return { success: false, error: 'User ID is required' };
    }

    try {
      const response = await fetch('/api/liked-playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, playlistData }),
      });

      const result = await response.json();
      if (result.success) {
        // Clear cache so it refetches next time
        playlistsCache.delete(userId);

        // Update local state optimistically or refetch
        fetchLikedPlaylists(true);
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      const errorMsg = 'Failed to toggle playlist like';
      setError(errorMsg);
      console.error('Error toggling playlist like:', err);
      return { success: false, error: errorMsg };
    }
  }, [userId, fetchLikedPlaylists]);

  // Check if a playlist is liked
  const isLiked = useCallback((playlistId) => {
    return likedPlaylistIds.has(playlistId);
  }, [likedPlaylistIds]);

  // Get liked playlist count
  const getLikedCount = useCallback(() => {
    return likedPlaylists.length;
  }, [likedPlaylists]);

  // Initialize - fetch liked playlists when userId changes
  useEffect(() => {
    fetchLikedPlaylists();
  }, [fetchLikedPlaylists]);

  return {
    likedPlaylists,
    loading,
    error,
    toggleLike,
    isLiked,
    getLikedCount,
    refetch: () => fetchLikedPlaylists(true)
  };
}