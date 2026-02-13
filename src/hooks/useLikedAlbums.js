import { useState, useEffect, useCallback } from 'react';

// Simple module-level cache to survive navigation
const albumsCache = new Map();

export function useLikedAlbums(userId) {
  const [likedAlbums, setLikedAlbums] = useState([]);
  const [likedAlbumIds, setLikedAlbumIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all liked albums for the user
  const fetchLikedAlbums = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (!forceRefresh && albumsCache.has(userId)) {
      const cached = albumsCache.get(userId);
      setLikedAlbums(cached);
      setLikedAlbumIds(new Set(cached.map(a => a.albumId)));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/liked-albums?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();

      if (data.success) {
        // Flatten the structure: extract properties from albumData
        const formattedAlbums = data.data.map(item => {
          // Handle potential missing albumData
          const albumData = item.albumData || {};
          return {
            ...albumData, // Spread first to avoid overwriting normalized fields
            id: item._id, // Internal DB ID
            albumId: item.albumId, // JioSaavn ID
            likedAt: item.likedAt,
            name: albumData.name,
            image: albumData.image,
            year: albumData.year,
            songCount: albumData.songCount,
            // Normalize artists to an array (this will now correctly overwrite the raw artists object)
            artists: albumData.artists?.primary || albumData.artists || [],
          };
        });

        setLikedAlbums(formattedAlbums);
        const albumIds = new Set(data.data.map(album => album.albumId));
        setLikedAlbumIds(albumIds);

        // Update cache
        albumsCache.set(userId, formattedAlbums);
      }
    } catch (error) {
      console.error('Error fetching liked albums:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Check if an album is liked
  const isLiked = useCallback((albumId) => {
    return likedAlbumIds.has(albumId);
  }, [likedAlbumIds]);

  // Toggle like status for an album
  const toggleLike = useCallback(async (albumData) => {
    if (!userId || !albumData) {
      throw new Error('User ID and album data are required');
    }

    // Optimistic update - update UI immediately
    const wasLiked = likedAlbumIds.has(albumData.id);
    const willBeLiked = !wasLiked;

    // Normalize artists for optimistic update
    const normalizedArtists = albumData.artists?.primary || albumData.artists || [];

    // Clear cache to ensure fresh data on next fetch
    albumsCache.delete(userId);

    // Update local state optimistically
    if (willBeLiked) {
      setLikedAlbumIds(prev => new Set([...prev, albumData.id]));
      setLikedAlbums(prev => [{
        albumId: albumData.id,
        name: albumData.name,
        artists: normalizedArtists,
        image: albumData.image,
        year: albumData.year,
        likedAt: new Date().toISOString()
      }, ...prev]);
    } else {
      setLikedAlbumIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(albumData.id);
        return newSet;
      });
      setLikedAlbums(prev => prev.filter(album => album.albumId !== albumData.id));
    }

    try {
      const response = await fetch('/api/liked-albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          albumData
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Server confirmed the operation, no need to update state again
        // as we already did optimistic update
        return result;
      } else {
        // Server operation failed, revert optimistic update
        if (wasLiked) {
          // It was liked, we tried to unlike and failed -> add it back
          setLikedAlbumIds(prev => new Set([...prev, albumData.id]));
          setLikedAlbums(prev => [{
            albumId: albumData.id,
            name: albumData.name,
            artists: normalizedArtists,
            image: albumData.image,
            year: albumData.year,
            likedAt: new Date().toISOString()
          }, ...prev]);
        } else {
          // It was not liked, we tried to like and failed -> remove it
          setLikedAlbumIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(albumData.id);
            return newSet;
          });
          setLikedAlbums(prev => prev.filter(album => album.albumId !== albumData.id));
        }

        throw new Error(result.error || 'Failed to toggle album like');
      }
    } catch (error) {
      // Network error, revert optimistic update
      if (wasLiked) {
        // It was liked, we tried to unlike and failed -> add it back
        setLikedAlbumIds(prev => new Set([...prev, albumData.id]));
        setLikedAlbums(prev => [{
          albumId: albumData.id,
          name: albumData.name,
          artists: normalizedArtists,
          image: albumData.image,
          year: albumData.year,
          likedAt: new Date().toISOString()
        }, ...prev]);
      } else {
        // It was not liked, we tried to like and failed -> remove it
        setLikedAlbumIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(albumData.id);
          return newSet;
        });
        setLikedAlbums(prev => prev.filter(album => album.albumId !== albumData.id));
      }

      console.error('Error toggling album like:', error);
      throw error;
    }
  }, [userId, likedAlbumIds]);

  // Check if a specific album is liked (useful for individual checks)
  const checkIsLiked = useCallback(async (albumId) => {
    if (!userId || !albumId) return false;

    try {
      const response = await fetch(`/api/liked-albums/check?userId=${encodeURIComponent(userId)}&albumId=${encodeURIComponent(albumId)}`);
      const data = await response.json();

      if (data.success) {
        return data.isLiked;
      }
      return false;
    } catch (error) {
      console.error('Error checking if album is liked:', error);
      return false;
    }
  }, [userId]);

  // Fetch liked albums on mount
  useEffect(() => {
    fetchLikedAlbums();
  }, [fetchLikedAlbums]);

  return {
    likedAlbums,
    isLiked,
    toggleLike,
    checkIsLiked,
    loading,
    refetch: () => fetchLikedAlbums(true)
  };
}