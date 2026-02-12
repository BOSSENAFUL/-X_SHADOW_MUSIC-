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
        // Flatten the structure: extract properties from artistData
        const formattedArtists = data.data.map(item => {
          // Handle potential missing artistData
          const artistData = item.artistData || {};

          return {
            ...artistData, // Spread properties for UI (name, image, etc.)
            id: item._id,
            artistId: item.artistId,
            likedAt: item.likedAt,
            // Ensure robust naming fallback
            name: artistData.name || artistData.artistName || artistData.title || item.artistName || 'Unknown Artist',
            artistName: artistData.name || artistData.artistName || 'Unknown Artist',
          };
        });

        setLikedArtists(formattedArtists);
        setLikedArtistIds(new Set(data.data.map(artist => artist.artistId)));

        // Identify artists with missing details (Unknown Name or missing image)
        const missingDetails = formattedArtists.filter(a => a.name === 'Unknown Artist' || !a.image);

        if (missingDetails.length > 0) {
          // Fetch authentic details for missing artists in background
          const enrichPromises = missingDetails.map(async (artist) => {
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
              const res = await fetch(`${apiUrl}/api/artists?id=${artist.artistId}`);
              const detailData = await res.json();

              if (detailData.success && detailData.data) {
                return {
                  ...artist,
                  name: detailData.data.name,
                  artistName: detailData.data.name,
                  image: detailData.data.image,
                  followerCount: detailData.data.followerCount,
                  isVerified: detailData.data.isVerified,
                  dominantLanguage: detailData.data.dominantLanguage,
                  dominantType: detailData.data.dominantType,
                  // Add flag to indicate this is enriched data
                  _enriched: true
                };
              }
              return artist;
            } catch (e) {
              console.error(`Failed to fetch details for ${artist.artistId}`, e);
              return artist;
            }
          });

          // Wait for enrichment
          const enrichedDetails = await Promise.all(enrichPromises);

          // Update state with enriched data
          setLikedArtists(prev => prev.map(a => {
            const enriched = enrichedDetails.find(e => e.artistId === a.artistId);
            return enriched || a;
          }));

          // Background update to DB for persistence
          enrichedDetails.forEach(enriched => {
            if (enriched._enriched && enriched.name !== 'Unknown Artist') {
              // Silent update to persist the data
              fetch('/api/liked-artists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, artistData: enriched })
              }).catch(e => console.error("Failed to update DB with enriched artist data", e));
            }
          });
        }

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
        // Ensure consistent naming
        artistName: artistData.name || artistData.title,
        name: artistData.name || artistData.title,
        image: artistData.image,
        followerCount: artistData.followerCount,
        isVerified: artistData.isVerified,
        dominantLanguage: artistData.dominantLanguage,
        dominantType: artistData.dominantType,
        likedAt: new Date().toISOString(),
        ...artistData // Spread rest
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
            name: artistData.name || artistData.title,
            image: artistData.image,
            followerCount: artistData.followerCount,
            isVerified: artistData.isVerified,
            dominantLanguage: artistData.dominantLanguage,
            dominantType: artistData.dominantType,
            likedAt: new Date().toISOString(),
            ...artistData
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
          name: artistData.name || artistData.title,
          image: artistData.image,
          followerCount: artistData.followerCount,
          isVerified: artistData.isVerified,
          dominantLanguage: artistData.dominantLanguage,
          dominantType: artistData.dominantType,
          likedAt: new Date().toISOString(),
          ...artistData
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