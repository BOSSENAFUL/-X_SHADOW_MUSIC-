"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, ArrowLeft, Heart, MoreVertical, Shuffle, Users, Calendar, Plus, Disc, Share, Download, Pause } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { IoMdPlay } from "react-icons/io";
import { HiPause } from "react-icons/hi2";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerPortal,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { memo } from "react";

// --- Helper Components ---
const SongActionMenu = memo(({ 
  song, 
  onAddToPlaylist, 
  onGoToAlbum, 
  onDownload, 
  toggleLike,
  isLiked,
  decodeHtmlEntities 
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const artistNames = song.artists?.primary?.map(a => a.name).join(', ') || 
                      song.artists?.map(a => a.name).join(', ') || 
                      'Unknown Artist';
  const songImageUrl = song.image?.find(img => img.quality === '150x150')?.url || 
                       song.image?.[song.image.length - 1]?.url || 
                       '/default-playlist-image.png';

  const ActionItems = ({ onItemClick }) => (
    <>
      <div 
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onAddToPlaylist(e, song);
        }}
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Add to playlist</span>
      </div>
      <div 
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          if (navigator.share) {
            navigator.share({
              title: song.name,
              text: `Check out "${song.name}" by ${artistNames}`,
              url: window.location.href
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard');
          }
        }}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share</span>
      </div>
      <div 
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onGoToAlbum(e, song);
        }}
      >
        <Disc className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Go to album</span>
      </div>
      <div 
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onDownload(e, song);
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download</span>
      </div>
      <div className="h-px bg-white/5 my-1" />
      <div 
        className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors ${isLiked(song.id) ? 'text-red-500' : ''}`}
        onClick={(e) => {
          onItemClick();
          e.stopPropagation();
          toggleLike(song).catch(error => console.error('Error toggling song like:', error));
        }}
      >
        <Heart className={`w-5 h-5 ${isLiked(song.id) ? 'fill-current' : ''}`} />
        <span className="font-medium">{isLiked(song.id) ? 'Unlike' : 'Like'}</span>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-10 w-10 text-muted-foreground hover:bg-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-[#121212] border-none text-white outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-white/10">
                <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0">
                  <img 
                    src={songImageUrl} 
                    alt={song.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-white text-left">
                    {decodeHtmlEntities(song.name)}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    {artistNames}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-2 py-4 pb-8 space-y-1">
              <ActionItems onItemClick={() => setOpen(false)} />
            </div>
          </DrawerContent>
        </div>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-8 w-8 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-neutral-900 border-white/10 text-white p-1">
        <DropdownMenuItem 
          onClick={(e) => onAddToPlaylist(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem 
          onClick={(e) => onGoToAlbum(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Disc className="w-4 h-4 mr-2" />
          Go to album
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem 
          onClick={(e) => onDownload(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song).catch(error => console.error('Error toggling song like:', error));
          }}
          className={`${isLiked(song.id) ? 'text-red-500' : ''} hover:bg-white/10 focus:bg-white/10 cursor-pointer`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
          {isLiked(song.id) ? 'Unlike' : 'Like'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SongActionMenu.displayName = "SongActionMenu";

export default function ArtistPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = params.id;
  const { data: session } = useSession();

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('rgb(40, 40, 40)'); // Default dark gray
  const [isArtistLiked, setIsArtistLiked] = useState(false);
  const [artistLikeLoading, setArtistLikeLoading] = useState(false);
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [albumPage, setAlbumPage] = useState(0);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const [fetchingMoreAlbums, setFetchingMoreAlbums] = useState(false);
  const mobileTitleRef = useRef(null);
  const desktopTitleRef = useRef(null);
  const albumsObserverTarget = useRef(null);

  // Initialize liked songs hook with actual user ID
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);

  // Initialize music player
  const { playSong, currentSong, isPlaying, togglePlayPause, currentPlaylistId } = useMusicPlayer();

  useEffect(() => {
    let isMounted = true;

    const fetchArtistDetails = async () => {
      try {
        if (isMounted) setLoading(true);
        console.log(`Fetching artist ${artistId}`);

        const artistResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/artists?id=${artistId}`);
        const artistData = await artistResponse.json();

        if (artistData.success && artistData.data) {
          if (!isMounted) return;
          console.log(`Fetched artist "${artistData.data.name}"`);

          // Extract dominant color from artist image
          let extractedColor = 'rgb(40, 40, 40)'; // Default dark gray
          const imageUrl = artistData.data.image?.[2]?.url || artistData.data.image?.[1]?.url || artistData.data.image?.[0]?.url;

          if (imageUrl) {
            try {
              extractedColor = await extractDominantColor(imageUrl);
            } catch (error) {
              console.error('Color extraction failed:', error);
            }
          }

          setDominantColor(extractedColor);
          setArtist(artistData.data);

          if (artistData.data.topAlbums) {
            setAlbums(artistData.data.topAlbums);
            // Initialize albumPage to 0 so we fetch page 0 of the dedicated API next
            setAlbumPage(0);
            // We can check if we should even try to fetch more. 
            // Usually, if total is not available here, we assume there's more if we got a full page of topAlbums.
            setHasMoreAlbums(artistData.data.topAlbums.length >= 10);
          } else {
            setHasMoreAlbums(false);
          }
        }
      } catch (error) {
        console.error('Error fetching artist details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (artistId) {
      fetchArtistDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [artistId]);

  // Effect to handle scroll and show/hide title in header
  useEffect(() => {
    const scrollContainer = document.getElementById('artist-scroll-container');
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Detect visibility to only react to the title that is actually in the current layout
          const isVisibleInLayout = entry.boundingClientRect.width > 0;
          if (isVisibleInLayout) {
            setShowHeaderTitle(!entry.isIntersecting);
          }
        });
      },
      {
        root: scrollContainer,
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px",
      }
    );

    if (mobileTitleRef.current) observer.observe(mobileTitleRef.current);
    if (desktopTitleRef.current) observer.observe(desktopTitleRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loading, artist?.name]);

  // Function to fetch more albums (Lazy Loading)
  const fetchMoreAlbums = useCallback(async () => {
    if (fetchingMoreAlbums || !hasMoreAlbums || !artistId) return;

    setFetchingMoreAlbums(true);
    try {
      const nextPage = albumPage;
      console.log(`Fetching more albums for artist ${artistId}, page ${nextPage}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/artists/${artistId}/albums?page=${nextPage}`);
      const data = await response.json();

      if (data.success && data.data) {
        const newAlbums = data.data.albums || data.data;

        if (Array.isArray(newAlbums) && newAlbums.length > 0) {
          // Calculate new unique albums outside the state updater (keep updater pure)
          setAlbums(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const uniqueNew = newAlbums.filter(a => a.id && !existingIds.has(a.id));
            return [...prev, ...uniqueNew];
          });
          setAlbumPage(nextPage + 1);
          // Stop when the API returns a partial page (fewer than 10 means it's the last page).
          // Don't rely on `data.data.total` — it can be inflated due to duplicates in the API.
          setHasMoreAlbums(newAlbums.length >= 10);
        } else {
          // Empty array means no more pages
          setHasMoreAlbums(false);
        }
      } else {
        setHasMoreAlbums(false);
      }
    } catch (error) {
      console.error('Error fetching more albums:', error);
      setHasMoreAlbums(false);
    } finally {
      setFetchingMoreAlbums(false);
    }
  }, [artistId, albumPage, fetchingMoreAlbums, hasMoreAlbums]);

  // Observer for infinite scrolling albums
  useEffect(() => {
    const scrollContainer = document.getElementById('artist-scroll-container');
    if (!scrollContainer || !hasMoreAlbums || fetchingMoreAlbums || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreAlbums();
        }
      },
      {
        root: scrollContainer,
        threshold: 0.1,
      }
    );

    if (albumsObserverTarget.current) {
      observer.observe(albumsObserverTarget.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMoreAlbums, fetchingMoreAlbums, fetchMoreAlbums, loading]);

  // Check if artist is liked when component mounts and session is available
  useEffect(() => {
    const checkArtistLiked = async () => {
      if (session?.user?.id && artistId) {
        try {
          const response = await fetch(`/api/liked-artists/check?userId=${session.user.id}&artistId=${artistId}`);
          const data = await response.json();
          if (data.success) {
            setIsArtistLiked(data.isLiked);
          }
        } catch (error) {
          console.error('Error checking if artist is liked:', error);
        }
      }
    };

    checkArtistLiked();
  }, [session, artistId]);

  const handlePlayClick = (song, index) => {
    playSong(song, artist.topSongs, artistId, index);
  };

  const handlePlayAll = () => {
    if (artist?.topSongs && artist.topSongs.length > 0) {
      const isPlaylistPlaying = currentPlaylistId === artistId;

      if (isPlaylistPlaying) {
        togglePlayPause();
      } else {
        playSong(artist.topSongs[0], artist.topSongs, artistId, 0);
      }
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const extractDominantColor = (imageUrl) => {
    // Use proxy for external images to bypass CORS issues during color extraction
    const finalUrl = imageUrl.startsWith('http')
      ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;

    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const colorCounts = {};

          // Sample pixels
          for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Skip very light or very dark colors
            const brightness = (r + g + b) / 3;
            if (brightness < 40 || brightness > 220) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;

            if (saturation < 30) continue;

            const color = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
            colorCounts[color] = (colorCounts[color] || 0) + (1 + saturation / 50);
          }

          // Find the most vibrant color
          let dominantColor = '40,40,40'; // Default
          let maxWeight = 0;

          for (const [color, weight] of Object.entries(colorCounts)) {
            if (weight > maxWeight) {
              maxWeight = weight;
              dominantColor = color;
            }
          }

          resolve(`rgb(${dominantColor})`);
        } catch (error) {
          console.error('Error extracting color:', error);
          resolve('rgb(40, 40, 40)'); // Default dark gray
        }
      };

      img.onerror = () => {
        resolve('rgb(40, 40, 40)'); // Default dark gray
      };

      img.src = finalUrl;
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFollowers = (count) => {
    if (!count) return "0";
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const decodeHtmlEntities = useCallback((text) => {
    if (!text || !text.includes('&')) return text;
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'"
    };
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, m => entities[m]);
  }, []);

  const toggleArtistLike = async () => {
    if (!session?.user?.id) {
      console.log('User not logged in');
      return;
    }

    try {
      setArtistLikeLoading(true);
      const response = await fetch('/api/liked-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          artistId: artistId
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsArtistLiked(data.liked);
        console.log(data.message);
      }
    } catch (error) {
      console.error('Error toggling artist like:', error);
    } finally {
      setArtistLikeLoading(false);
    }
  };

  const handleAddToPlaylist = (e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  };

  const handleGoToAlbum = (e, song) => {
    e.stopPropagation();
    if (song.album?.id) {
      router.push(`/music/album/${song.album.id}`);
    }
  };


  const handleDownload = async (e, song) => {
    e.stopPropagation();

    try {
      console.log('Attempting to download song:', song.name);

      // First, try to get download links from the song object
      let downloadUrl = null;

      // Check if song already has download URLs
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        // Look for 320kbps quality first, then fallback to highest available
        const highQuality = song.downloadUrl.find(url => url.quality === '320kbps') ||
          song.downloadUrl.find(url => url.quality === '160kbps') ||
          song.downloadUrl[song.downloadUrl.length - 1];
        downloadUrl = highQuality?.url;
      }

      // If no download URL found, fetch from API
      if (!downloadUrl) {
        console.log('No download URL found in song object, fetching from API...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.id}`);
        const data = await response.json();

        if (data.success && data.data && data.data[0]?.downloadUrl) {
          const songData = data.data[0];
          // Look for 320kbps quality first, then fallback to highest available
          const highQuality = songData.downloadUrl.find(url => url.quality === '320kbps') ||
            songData.downloadUrl.find(url => url.quality === '160kbps') ||
            songData.downloadUrl[songData.downloadUrl.length - 1];
          downloadUrl = highQuality?.url;
          console.log('Found download URL from API:', downloadUrl);
        }
      }

      if (downloadUrl) {
        // Fetch the file through your website and trigger direct download
        console.log('Fetching file for download...');

        const filename = `${decodeHtmlEntities(song.name)} - ${artist.name}.mp3`;

        try {
          // Fetch the file as a blob
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              'Accept': 'audio/mpeg, audio/mp4, */*'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Get the file as a blob
          const blob = await response.blob();

          // Create a blob URL
          const blobUrl = window.URL.createObjectURL(blob);

          // Create a temporary anchor element for download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          link.style.display = 'none';

          // Add to DOM, click, and remove
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up the blob URL after a short delay
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
          }, 1000);

          console.log('Download completed for:', song.name);
        } catch (fetchError) {
          console.error('Error fetching file for download:', fetchError);

          // Fallback: try direct link method if blob fetch fails
          console.log('Falling back to direct link method...');
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = filename;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        console.error('No download URL available for this song');
        alert('Download not available for this song');
      }
    } catch (error) {
      console.error('Error downloading song:', error);
      alert('Failed to download song. Please try again.');
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset id="artist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-[#121212]">
          {/* Main Ambient Gradient Layer - Matches the artist UI layout */}
          <div
            className="absolute inset-0 h-[390px] pointer-events-none transition-all duration-1000"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')} 0%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
                    transparent 100%)`
                : 'transparent'
            }}
          />
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md md:bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-background/40 hover:bg-background/60">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 pt-12 md:p-8 md:pt-20 relative z-10">
            <div className="animate-pulse space-y-6">
              {/* Header Skeleton Only - Circular for Artist */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                <div className="w-48 h-48 md:w-60 md:h-60 bg-muted rounded-full shadow-2xl shrink-0" />
                <div className="flex-1 space-y-4 text-center md:text-left w-full">
                  {/* Verified Badge Skeleton */}
                  <div className="h-6 bg-muted rounded w-32 mx-auto md:mx-0 opacity-80" />

                  {/* Name Skeleton */}
                  <div className="h-10 md:h-16 bg-muted rounded w-3/4 md:w-[500px] mx-auto md:mx-0" />

                  {/* Followers Metadata Skeleton */}
                  <div className="h-4 bg-muted rounded w-1/2 md:w-64 mx-auto md:mx-0 opacity-70" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!artist) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Artist not found</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="artist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header
          style={{
            backgroundColor: showHeaderTitle
              ? dominantColor
                ? `color-mix(in srgb, ${dominantColor}, black 60%)`
                : '#1D1046'
              : undefined
          }}
          className={`sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b transition-all duration-300 ${showHeaderTitle
            ? "border-white/10"
            : "bg-background border-transparent"
            }`}
        >
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-background/40 hover:bg-background/60">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center gap-2 transition-all duration-300">
                {showHeaderTitle ? (
                  <h2 className="text-base font-bold animate-in fade-in slide-in-from-bottom-2 duration-300 line-clamp-1">
                    {artist.name}
                  </h2>
                ) : (
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Artist</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                )}
              </div>
            </div>
          </div>
        </header>

        <div
          className="flex-1 relative transition-colors duration-1000"
          style={{
            backgroundColor: '#121212'
          }}
        >
          {/* Main Ambient Gradient Layer */}
          <div
            className="absolute inset-0 h-[390px] pointer-events-none transition-all duration-1000"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')} 0%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
                    transparent 100%`
                : 'transparent'
            }}
          />

          <div className="relative z-10">
            {/* Artist Header */}
            <div className="p-4 pt-12 pb-2 md:p-8 md:pt-20 md:pb-4 text-white">
              {/* Mobile Layout */}
              <div className="block md:hidden">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-48 h-48 rounded-full overflow-hidden bg-muted">
                    {artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url ? (
                      <img
                        src={artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-16 h-16 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {artist.isVerified && (
                      <Badge variant="secondary" className="mb-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                        Verified Artist
                      </Badge>
                    )}
                    <h1 ref={mobileTitleRef} className="text-2xl font-bold wrap-break-word">
                      {artist.name}
                    </h1>
                    <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{formatFollowers(artist.followerCount)} followers</span>
                      </div>
                      {artist.dob && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Born {artist.dob}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex gap-6 items-end">
                <div className="w-60 h-60 rounded-full overflow-hidden bg-muted shrink-0">
                  {artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url ? (
                    <img
                      src={artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-20 h-20 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {artist.isVerified && (
                    <Badge variant="secondary" className="mb-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                      Verified Artist
                    </Badge>
                  )}
                  <h1 ref={desktopTitleRef} className="text-4xl md:text-6xl font-bold mb-4 wrap-break-word">
                    {artist.name}
                  </h1>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{formatFollowers(artist.followerCount)} followers</span>
                    </div>
                    {artist.dob && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Born {artist.dob}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 pt-2 md:p-8 md:pt-4">
              <div className="flex items-center gap-3 md:gap-4">
                <Button
                  size="lg"
                  className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: dominantColor,
                    boxShadow: `0 8px 32px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}`
                  }}
                  onClick={handlePlayAll}
                >
                  {currentPlaylistId === artistId && isPlaying ? (
                    <HiPause style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <IoMdPlay style={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                  )}
                </Button>
                <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                  <Shuffle className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className={`rounded-full w-10 h-10 md:w-12 md:h-12 ${isArtistLiked ? 'text-red-500' : ''}`}
                  onClick={toggleArtistLike}
                  disabled={artistLikeLoading || !session?.user?.id}
                >
                  <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isArtistLiked ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="ghost" size="lg" className="rounded-full w-10 h-10 md:w-12 md:h-12">
                  <MoreVertical className="w-5 h-5 md:w-6 md:h-6" />
                </Button>
              </div>
            </div>

            <div className="pl-2 pr-1 md:px-6 pb-32 md:pb-24 space-y-6 md:space-y-8">
              {/* Popular Songs */}
              {artist.topSongs && artist.topSongs.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Popular</h2>
                  <div className="space-y-0">
                    {artist.topSongs.slice(0, 10).map((song, index) => {
                      const isCurrentSong = currentSong?.id === song.id;
                      return (
                        <div
                          key={song.id || index}
                          className={`flex items-center gap-2 md:gap-4 pl-1 pr-0 py-2
                           rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? '' : ''}`}
                          onClick={() => handlePlayClick(song, index)}
                        >
                          <div className="w-6 md:w-8 text-center shrink-0">
                            {isCurrentSong && isPlaying ? (
                              <div className="flex items-center justify-center">
                                <div className="flex items-end justify-center gap-0.5 h-3">
                                  <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0s' }} />
                                  <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.2s' }} />
                                  <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.4s' }} />
                                  <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.1s' }} />
                                </div>
                              </div>
                            ) : isCurrentSong ? (
                              <IoMdPlay className="w-4 h-4 mx-auto text-green-500" />
                            ) : (
                              <>
                                <span className="text-muted-foreground group-hover:hidden text-sm">
                                  {index + 1}
                                </span>
                                <IoMdPlay className="w-4 h-4 mx-auto hidden group-hover:block" />
                              </>
                            )}
                          </div>

                          <div className="w-12 h-12 md:w-12 md:h-12 rounded bg-muted shrink-0 overflow-hidden">
                            {song.image?.length > 0 ? (
                              <img
                                src={song.image.find(img => img.quality === '500x500')?.url ||
                                  song.image.find(img => img.quality === '150x150')?.url ||
                                  song.image[song.image.length - 1]?.url}
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = '/default-playlist-image.png';
                                }}
                              />
                            ) : (
                              <img
                                src="/default-playlist-image.png"
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate text-sm md:text-base ${isCurrentSong ? 'text-green-500' : ''
                              }`}>
                              {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                            </p>
                            <p className={`text-xs md:text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                              }`}>
                              {song.album?.name || 'Unknown Album'}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 hidden md:inline-flex shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${isLiked(song.id) ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await toggleLike(song);
                            }}
                          >
                            <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                          </Button>

                          <div className="w-12 text-center text-sm text-muted-foreground hidden md:block">
                            {formatDuration(song.duration)}
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <SongActionMenu 
                              song={song}
                              onAddToPlaylist={handleAddToPlaylist}
                              onGoToAlbum={handleGoToAlbum}
                              onDownload={handleDownload}
                              toggleLike={toggleLike}
                              isLiked={isLiked}
                              decodeHtmlEntities={decodeHtmlEntities}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Albums */}
              {albums.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Albums</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                    {albums.map((album) => (
                      <Link
                        key={album.id}
                        href={`/music/album/${album.id}`}
                        className="group cursor-pointer hover:scale-105 transition-transform"
                      >
                        <div className="relative rounded-lg aspect-square overflow-hidden mb-2 md:mb-3 bg-muted">
                          {album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url ? (
                            <img
                              src={album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url}
                              alt={album.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-black">
                              <IoMdPlay className="w-8 h-8 md:w-12 md:h-12 opacity-50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Button
                            size="icon"
                            className="absolute bottom-1 right-1 md:bottom-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600 rounded-full shadow-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"
                          >
                            <IoMdPlay className="w-3 h-3 md:w-4 md:h-4 text-black ml-0.5" />
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs md:text-sm font-medium leading-tight line-clamp-2 text-foreground">
                            {album.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {album.year} • Album
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {hasMoreAlbums && (
                    <div ref={albumsObserverTarget} className="w-full flex justify-center py-8">
                      {fetchingMoreAlbums && (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* About */}
              {artist.bio && artist.bio.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">About</h2>
                  <div className="space-y-3 md:space-y-4">
                    {artist.bio.slice(0, 3).map((bioSection, index) => (
                      <div key={index}>
                        {bioSection.title && (
                          <h3 className="text-base md:text-lg font-semibold mb-2">{bioSection.title}</h3>
                        )}
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                          {bioSection.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={addToPlaylistDialogOpen}
        onOpenChange={setAddToPlaylistDialogOpen}
        song={selectedSong}
      />
    </SidebarProvider>
  );
}