import { useState, useEffect, useCallback } from 'react';

export function useLikedArtists(userId) {
  const [likedArtists, setLikedArtists] = useState([]);
  const [likedArtistIds, setLikedArtistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all liked artists for the user
  const fetchLikedArtists = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/liked-artists?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setLikedArtists(data.data);
        setLikedArtistIds(new Set(data.data.map(artist => artist.artistId)));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch liked artists');
      console.error('Error fetching liked artists:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Toggle like/unlike an artist
  const toggleLike = useCallback(async (artistData) => {
    if (!userId) {
      setError('User ID is required');
      return { success: false, error: 'User ID is required' };
    }

    // Optimistic update - update UI immediately
    const wasLiked = likedArtistIds.has(artistData.id);
    const willBeLiked = !wasLiked;

    if (willBeLiked) {
      // Optimistically add to liked artists
      setLikedArtistIds(prev => new Set([...prev, artistData.id]));
      setLikedArtists(prev => [{
        artistId: artistData.id,
        artistName: artistData.name || artistData.title,
        image: artistData.image,
        followerCount: artistData.followerCount,
        isVerified: artistData.isVerified,
        dominantLanguage: artistData.dominantLanguage,
        dominantType: artistData.dominantType,
        likedAt: new Date().toISOString()
      }, ...prev]);
    } else {
      // Optimistically remove from liked artists
      setLikedArtistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(artistData.id);
        return newSet;
      });
      setLikedArtists(prev => prev.filter(artist => artist.artistId !== artistData.id));
    }

    try {
      const response = await fetch('/api/liked-artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          artistData
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Server confirmed the operation, no need to update state again
        // as we already did optimistic update
        return result;
      } else {
        // Server operation failed, revert optimistic update
        if (willBeLiked) {
          // Revert the like
          setLikedArtistIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(artistData.id);
            return newSet;
          });
          setLikedArtists(prev => prev.filter(artist => artist.artistId !== artistData.id));
        } else {
          // Revert the unlike
          setLikedArtistIds(prev => new Set([...prev, artistData.id]));
          setLikedArtists(prev => [{
            artistId: artistData.id,
            artistName: artistData.name || artistData.title,
            image: artistData.image,
            followerCount: artistData.followerCount,
            isVerified: artistData.isVerified,
            dominantLanguage: artistData.dominantLanguage,
            dominantType: artistData.dominantType,
            likedAt: new Date().toISOString()
          }, ...prev]);
        }

        setError(result.error);
        return result;
      }
    } catch (err) {
      // Network error, revert optimistic update
      if (willBeLiked) {
        // Revert the like
        setLikedArtistIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(artistData.id);
          return newSet;
        });
        setLikedArtists(prev => prev.filter(artist => artist.artistId !== artistData.id));
      } else {
        // Revert the unlike
        setLikedArtistIds(prev => new Set([...prev, artistData.id]));
        setLikedArtists(prev => [{
          artistId: artistData.id,
          artistName: artistData.name || artistData.title,
          image: artistData.image,
          followerCount: artistData.followerCount,
          isVerified: artistData.isVerified,
          dominantLanguage: artistData.dominantLanguage,
          dominantType: artistData.dominantType,
          likedAt: new Date().toISOString()
        }, ...prev]);
      }

      const errorMsg = 'Failed to toggle like';
      setError(errorMsg);
      console.error('Error toggling like:', err);
      return { success: false, error: errorMsg };
    }
  }, [userId, likedArtistIds]);

  // Check if an artist is liked
  const isLiked = useCallback((artistId) => {
    return likedArtistIds.has(artistId);
  }, [likedArtistIds]);

  // Get liked artist count
  const getLikedCount = useCallback(() => {
    return likedArtists.length;
  }, [likedArtists]);

  // Initialize - fetch liked artists when userId changes
  useEffect(() => {
    fetchLikedArtists();
  }, [fetchLikedArtists]);

  return {
    likedArtists,
    loading,
    error,
    toggleLike,
    isLiked,
    getLikedCount,
    refetch: fetchLikedArtists
  };
}