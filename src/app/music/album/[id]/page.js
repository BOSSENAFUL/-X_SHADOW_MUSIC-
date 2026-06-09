"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { triggerSmartlink } from "@/lib/smartlink";
import NativeAdRow from "@/components/NativeAdRow";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, ArrowLeft, Heart, MoreVertical, Clock, Shuffle, Calendar, Disc, Plus, User, Share, Download, Music2 } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useLikedAlbums } from "@/hooks/useLikedAlbums";
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
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { memo } from "react";
import { downloadWithMetadata } from "@/lib/clientDownload";
import { applyThemeColor, getThemeColorForScroll } from "@/lib/utils";


// --- Helper Components ---
const SongActionMenu = memo(({
  song,
  onAddToPlaylist,
  onGoToArtist,
  onDownload,
  toggleLike,
  isLiked,
  decodeHtmlEntities
}) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const artistNames = song.artists?.primary?.map(a => a.name).join(', ') ||
    (Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : null) ||
    'Unknown Artist';
  const songImageUrl = song.image?.find(img => img.quality === '150x150')?.url ||
    song.image?.[song.image.length - 1]?.url ||
    '/def playlist image.jpg';

  const ActionItems = ({ onItemClick }) => (
    <>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onAddToPlaylist(e, song);
        }}
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Add to playlist</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          router.push(`/music/song/${song.id}`);
        }}
      >
        <Music2 className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Song detail</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
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
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onGoToArtist(e, song);
        }}
      >
        <User className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Go to artist</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onDownload(e, song);
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download</span>
      </div>
      <div className="h-px bg-border my-1" />
      <div
        className={`flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors ${isLiked(song.id) ? 'text-red-500' : ''}`}
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
            className="p-2 h-10 w-10 text-muted-foreground hover:bg-accent"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-popover border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0">
                  <img
                    src={songImageUrl}
                    alt={song.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-foreground text-left">
                    {decodeHtmlEntities(song.name)}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    {artistNames}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-2 py-4 pb-8 space-y-1">
              {ActionItems({ onItemClick: () => setOpen(false) })}
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
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
        <DropdownMenuItem
          onClick={(e) => onAddToPlaylist(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); router.push(`/music/song/${song.id}`); }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Music2 className="w-4 h-4 mr-2" />
          Song detail
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => onGoToArtist(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          Go to artist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => onDownload(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song).catch(error => console.error('Error toggling song like:', error));
          }}
          className={`${isLiked(song.id) ? 'text-red-500' : ''} hover:bg-accent focus:bg-accent cursor-pointer`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
          {isLiked(song.id) ? 'Unlike' : 'Like'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SongActionMenu.displayName = "SongActionMenu";

const AlbumActionMenu = memo(({
  album,
  isAlbumLiked,
  toggleAlbumLike,
  onDownloadAlbum
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const albumImageUrl = album?.image?.[2]?.url || album?.image?.[1]?.url || album?.image?.[0]?.url || '';

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: album.name,
        text: `Check out ${album.name} on Jammify`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
    setOpen(false);
  };

  const ActionItems = ({ onItemClick }) => (
    <>
      <div
        className={`flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors ${isAlbumLiked ? 'text-red-500' : ''}`}
        onClick={() => {
          onItemClick();
          toggleAlbumLike();
        }}
      >
        <Heart className={`w-5 h-5 ${isAlbumLiked ? 'fill-current' : ''}`} />
        <span className="font-medium">{isAlbumLiked ? 'Unlike Album' : 'Like Album'}</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          onDownloadAlbum();
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download Album</span>
      </div>
      <div className="h-px bg-border my-1" />
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={handleShare}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share Album</span>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground">
            <MoreVertical style={{ width: '24px', height: '24px' }} />
          </button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-popover border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                <div className="w-14 h-14 rounded-lg shadow-lg overflow-hidden shrink-0 bg-muted">
                  {albumImageUrl ? (
                    <img src={albumImageUrl} alt={album.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc className="w-6 h-6 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-foreground text-left">
                    {album?.name}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    Album
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-2 py-4 pb-8 space-y-1">
              {ActionItems({ onItemClick: () => setOpen(false) })}
            </div>
          </DrawerContent>
        </div>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground">
          <MoreVertical style={{ width: '24px', height: '24px' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
        <DropdownMenuItem
          onClick={() => { setOpen(false); toggleAlbumLike(); }}
          className={`hover:bg-accent focus:bg-accent cursor-pointer ${isAlbumLiked ? 'text-red-500' : ''}`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isAlbumLiked ? 'fill-current' : ''}`} />
          {isAlbumLiked ? 'Unlike Album' : 'Like Album'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => { setOpen(false); onDownloadAlbum(); }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Album
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={handleShare}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Share className="w-4 h-4 mr-2" />
          Share Album
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
AlbumActionMenu.displayName = "AlbumActionMenu";

export default function AlbumPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const albumId = params.id;

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('rgb(40, 40, 40)'); // Default dark gray
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);

  // Dynamic PWA status bar theme-color update
  useEffect(() => {
    if (typeof window === "undefined") return;

    const defaultThemeColor = "#121212";

    // Helper to compute color
    const getThemeColor = (colorStr, showHeader) => {
      if (!colorStr) return defaultThemeColor;
      const match = colorStr.match(/\d+/g);
      if (!match || match.length < 3) return defaultThemeColor;
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);

      // If header is shown: color is dominantColor * 0.4 (black mix 60%)
      // If header is hidden: color is dominantColor * 0.8 + 18 * 0.2
      const opacity = showHeader ? 0.4 : 0.8;
      const bgContrib = showHeader ? 0 : 3.6;

      const mixedR = Math.max(0, Math.min(255, Math.round(r * opacity + bgContrib)));
      const mixedG = Math.max(0, Math.min(255, Math.round(g * opacity + bgContrib)));
      const mixedB = Math.max(0, Math.min(255, Math.round(b * opacity + bgContrib)));

      const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(mixedR)}${toHex(mixedG)}${toHex(mixedB)}`;
    };

    window._getActivePageThemeColor = (progress) => {
      return getThemeColor(dominantColor, progress > 0.8);
    };

    const targetColor = getThemeColor(dominantColor, showHeaderTitle);
    applyThemeColor(targetColor);

    return () => {
      applyThemeColor(defaultThemeColor);
      delete window._getActivePageThemeColor;
    };
  }, [dominantColor, showHeaderTitle]);
  const mobileTitleRef = useRef(null);
  const desktopTitleRef = useRef(null);

  // Initialize liked songs hook with actual user ID
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);

  // Initialize liked albums hook
  const { toggleLike: toggleAlbumLike, isLiked: isAlbumLiked } = useLikedAlbums(session?.user?.id);

  // Initialize music player
  const { playSong, currentSong, currentIndex, isPlaying, togglePlayPause, currentPlaylistId, isShuffle, setIsShuffle } = useMusicPlayer();

  useEffect(() => {
    let isMounted = true;

    const fetchAlbumDetails = async () => {
      try {
        if (isMounted) setLoading(true);
        console.log(`Fetching album ${albumId}`);

        const albumResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/albums?id=${albumId}`);
        const albumData = await albumResponse.json();

        if (albumData.success && albumData.data) {
          console.log(`Fetched album "${albumData.data.name}" with ${albumData.data.songs?.length || 0} songs`);

          // Extract dominant color from album image
          let extractedColor = 'rgb(40, 40, 40)'; // Default dark gray
          const imageUrl = albumData.data.image?.[2]?.url || albumData.data.image?.[1]?.url || albumData.data.image?.[0]?.url;

          if (imageUrl) {
            try {
              extractedColor = await extractDominantColor(imageUrl);
            } catch (error) {
              console.error('Color extraction failed:', error);
            }
          }

          if (isMounted) {
            setDominantColor(extractedColor);
            setAlbum(albumData.data);
          }
        }
      } catch (error) {
        console.error('Error fetching album details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (albumId) {
      fetchAlbumDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [albumId]);

  // Effect to handle scroll and show/hide title in header
  useEffect(() => {
    const scrollContainer = document.getElementById('album-scroll-container');
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
  }, [loading, album?.name]);

  const handlePlayClick = useCallback((song, index) => {
    playSong(song, album.songs, albumId, index);
  }, [playSong, album?.songs, albumId]);

  const handlePlayAll = useCallback(() => {
    if (album?.songs && album.songs.length > 0) {
      const isPlaylistPlaying = currentPlaylistId === albumId;

      if (isPlaylistPlaying) {
        togglePlayPause();
      } else {
        let startSong = album.songs[0];
        let startIndex = 0;

        if (isShuffle) {
          startIndex = Math.floor(Math.random() * album.songs.length);
          startSong = album.songs[startIndex];
        }

        playSong(startSong, album.songs, albumId, startIndex);
      }
    }
  }, [album?.songs, currentPlaylistId, albumId, togglePlayPause, playSong, isShuffle]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleArtistClick = useCallback((artistId) => {
    router.push(`/music/artist/${artistId}`);
  }, [router]);

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

  const formatDuration = useCallback((duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const getTotalDuration = useCallback(() => {
    if (!album?.songs) return "0 min";
    const totalSeconds = album.songs.reduce((total, song) => total + (song.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }, [album?.songs]);

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

  const truncateTitle = useCallback((title, maxLength = 50) => {
    if (!title || title.length <= maxLength) return title;

    // Common patterns to remove for better truncation
    const patterns = [
      /\s*\(Original.*?\)/gi,
      /\s*\(From.*?\)/gi,
      /\s*\(Soundtrack.*?\)/gi,
      /\s*\(Music.*?\)/gi,
      /\s*\(Score.*?\)/gi,
      /\s*- Original.*$/gi,
      /\s*- Soundtrack.*$/gi,
    ];

    let shortened = title;
    for (const pattern of patterns) {
      const withoutPattern = shortened.replace(pattern, '');
      if (withoutPattern.length >= 10) { // Keep some minimum length
        shortened = withoutPattern;
        break;
      }
    }

    // If still too long, truncate with ellipsis
    if (shortened.length > maxLength) {
      shortened = shortened.substring(0, maxLength - 3).trim() + '...';
    }

    return shortened;
  }, []);

  const handleAddToPlaylist = (e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  };

  const handleGoToArtist = (e, song) => {
    e.stopPropagation();
    if (song.artists?.primary?.length > 0) {
      router.push(`/music/artist/${song.artists.primary[0].id}`);
    }
  };


  const downloadSingleSong = async (song, silent = false) => {
    let toastId = null;
    if (!silent) {
      toastId = toast.loading(`Preparing "${decodeHtmlEntities(song.name)}"...`);
    }

    try {
      // 1. Resolve Best Quality URL
      let downloadUrl = null;
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        const mp3s = song.downloadUrl.filter(u => u.url.toLowerCase().includes('.mp3'));
        const bestMp3 = mp3s.find(u => u.quality === '320kbps') || mp3s.find(u => u.quality === '160kbps') || mp3s[0];
        const bestOverall = song.downloadUrl.find(u => u.quality === '320kbps') || song.downloadUrl[song.downloadUrl.length - 1];
        downloadUrl = bestMp3?.url || bestOverall?.url;
      }

      if (!downloadUrl) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.id}`);
        const data = await response.json();
        if (data.success && data.data?.[0]?.downloadUrl) {
          const freshUrls = data.data[0].downloadUrl;
          const mp3s = freshUrls.filter(u => u.url.toLowerCase().includes('.mp3'));
          const bestMp3 = mp3s.find(u => u.quality === '320kbps') || mp3s.find(u => u.quality === '160kbps') || mp3s[0];
          const bestOverall = freshUrls.find(u => u.quality === '320kbps') || freshUrls[freshUrls.length - 1];
          downloadUrl = bestMp3?.url || bestOverall?.url;
        }
      }

      if (!downloadUrl) throw new Error('No download URL available');

      // 2. Resolve Best Image
      const imageUrl = song.image?.find(img => img.quality === '500x500')?.url ||
        song.image?.find(img => img.quality === '150x150')?.url ||
        song.image?.[song.image.length - 1]?.url;

      const title = decodeHtmlEntities(song.name);
      const songArtist = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
      const albumName = song.album?.name ? decodeHtmlEntities(song.album.name) : 'Unknown Album';
      const year = song.year || (song.releaseDate ? new Date(song.releaseDate).getFullYear() : '');

      if (!silent) toast.loading(`Downloading "${title}"...`, { id: toastId });

      // 3. Use 100% client-side download with metadata embedding!
      const result = await downloadWithMetadata({
        songUrl: downloadUrl,
        title,
        artist: songArtist,
        album: albumName,
        year,
        imageUrl
      });

      if (result.success) {
        if (!silent) toast.success(`Downloaded "${title}"!`, { id: toastId });
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      if (!silent) {
        toast.error(`Failed to download: ${error.message}`, { id: toastId });
      }
      throw error;
    }
  };

  const handleDownloadSongs = async () => {
    triggerSmartlink(true); // Download — fire every time, no cooldown
    const songsToDownload = album?.songs || [];
    if (songsToDownload.length === 0) {
      toast.info('No songs to download!');
      return;
    }

    const progressToast = document.createElement('div');
    progressToast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    progressToast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <div class="flex flex-col">
          <span class="font-bold text-sm">Downloading Album...</span>
          <span class="text-xs opacity-90" id="download-progress-text">Preparing 0 / ${songsToDownload.length}</span>
        </div>
      </div>
    `;
    document.body.appendChild(progressToast);

    let downloadedCount = 0;
    let failedCount = 0;
    const CONCURRENCY_LIMIT = 4;
    const queue = [...songsToDownload];

    const downloadWorker = async () => {
      while (queue.length > 0) {
        const song = queue.shift();
        if (!song) break;

        try {
          await downloadSingleSong(song, true);
          downloadedCount++;
        } catch (error) {
          failedCount++;
        }

        const progressText = document.getElementById('download-progress-text');
        if (progressText) {
          progressText.textContent = `Progress: ${downloadedCount + failedCount} / ${songsToDownload.length} (${failedCount} failed)`;
        }
      }
    };

    await Promise.all(Array(Math.min(CONCURRENCY_LIMIT, queue.length)).fill(null).map(downloadWorker));

    if (document.body.contains(progressToast)) {
      document.body.removeChild(progressToast);
    }

    const completionToast = document.createElement('div');
    completionToast.className = `fixed bottom-4 right-4 ${failedCount > 0 ? 'bg-orange-600' : 'bg-green-600'} text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    completionToast.innerHTML = `
      <div class="flex flex-col">
        <span class="font-bold text-sm">Download Finished</span>
        <span class="text-xs opacity-90">${downloadedCount} songs saved. ${failedCount > 0 ? `${failedCount} failed.` : ''}</span>
      </div>
    `;
    document.body.appendChild(completionToast);

    setTimeout(() => {
      completionToast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(completionToast)) {
          document.body.removeChild(completionToast);
        }
      }, 300);
    }, 5000);
  };

  const handleDownload = async (e, song) => {
    e.stopPropagation();
    triggerSmartlink(true); // Download — fire every time, no cooldown
    await downloadSingleSong(song);
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset id="album-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
          {/* Main Ambient Gradient Layer - Matches the album UI layout */}
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
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 pt-12 md:p-8 md:pt-20 relative z-10">
            <div className="animate-pulse space-y-6">
              {/* Header Skeleton Only - Matches UI position */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                <div className="w-48 h-48 md:w-60 md:h-60 bg-muted rounded-lg shadow-2xl shrink-0" />
                <div className="flex-1 space-y-4 text-center md:text-left w-full">
                  {/* Badge Skeleton */}
                  <div className="h-6 bg-muted rounded w-20 mx-auto md:mx-0" />

                  {/* Title Skeleton */}
                  <div className="h-8 md:h-12 bg-muted rounded w-3/4 md:w-96 mx-auto md:mx-0" />

                  {/* Artist Skeleton */}
                  <div className="h-4 bg-muted rounded w-1/2 md:w-48 mx-auto md:mx-0 opacity-70" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!album) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Album not found</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="album-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header
          style={{
            backgroundColor: showHeaderTitle
              ? dominantColor
                ? `color-mix(in srgb, ${dominantColor}, black 60%)`
                : '#1D1046'
              : undefined
          }}
          className={`fixed md:sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b transition-all duration-300 w-full ${showHeaderTitle
            ? "border-border text-white"
            : "bg-transparent md:bg-background border-transparent"
            }`}
        >
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center gap-2 transition-all duration-300">
                {showHeaderTitle ? (
                  <h2 className="text-base font-bold animate-in fade-in slide-in-from-bottom-2 duration-300 line-clamp-1">
                    {album.name}
                  </h2>
                ) : (
                  <Breadcrumb className="hidden md:block">
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Album</BreadcrumbPage>
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
            backgroundColor: 'hsl(var(--background))'
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
                    transparent 100%)`
                : 'transparent'
            }}
          />

          <div className="relative z-10">
            {/* Album Header */}
            <div className="p-4 pt-12 pb-2 md:p-8 md:pt-20 md:pb-4 text-foreground">
              {/* Mobile Layout */}
              <div className="block md:hidden">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted shadow-2xl">
                    {album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url ? (
                      <img
                        src={album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url}
                        alt={album.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/def playlist image.jpg';
                        }}
                      />
                    ) : (
                      <img
                        src="/def playlist image.jpg"
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <Badge variant="secondary" className="mb-2">
                      Album
                    </Badge>
                    <h1 ref={mobileTitleRef} className="text-2xl font-bold wrap-break-word leading-tight max-w-full" title={decodeHtmlEntities(album.name)}>
                      {truncateTitle(decodeHtmlEntities(album.name), 35)}
                    </h1>
                    <div className="text-sm mb-2">
                      {album.artists?.primary?.length > 0 && (
                        <>
                          {album.artists.primary.map((artist, index) => (
                            <span key={artist.id || index}>
                              <Link
                                href={`/music/artist/${artist.id}`}
                                className="font-semibold hover:underline transition-colors"
                              >
                                {decodeHtmlEntities(artist.name)}
                              </Link>
                              {index < album.artists.primary.length - 1 && ', '}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm opacity-80 flex-wrap">
                      {album.year && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{album.year}</span>
                        </div>
                      )}
                      <span>•</span>
                      <span>{album.songCount || album.songs?.length || 0} songs</span>
                      <span>•</span>
                      <span>{getTotalDuration()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex gap-6 items-end">
                <div className="w-60 h-60 rounded-lg overflow-hidden bg-muted shrink-0 shadow-2xl">
                  {album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url ? (
                    <img
                      src={album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url}
                      alt={album.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/def playlist image.jpg';
                      }}
                    />
                  ) : (
                    <img
                      src="/def playlist image.jpg"
                      alt={album.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-2">
                    Album
                  </Badge>
                  <h1 ref={desktopTitleRef} className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 wrap-break-word leading-tight" title={decodeHtmlEntities(album.name)}>
                    {truncateTitle(decodeHtmlEntities(album.name), 60)}
                  </h1>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    {album.artists?.primary?.length > 0 && (
                      <>
                        {album.artists.primary.map((artist, index) => (
                          <span key={artist.id || index}>
                            <Link
                              href={`/music/artist/${artist.id}`}
                              className="font-semibold hover:underline transition-colors"
                            >
                              {decodeHtmlEntities(artist.name)}
                            </Link>
                            {index < album.artists.primary.length - 1 && ', '}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-80">
                    {album.year && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{album.year}</span>
                      </div>
                    )}
                    <span>•</span>
                    <span>{album.songCount || album.songs?.length || 0} songs</span>
                    <span>•</span>
                    <span>{getTotalDuration()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 pt-2 md:p-8 md:pt-4">
              <div className="flex items-center gap-0.5 md:gap-1">
                <Button
                  size="lg"
                  className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-all duration-500 cursor-pointer"
                  style={{
                    backgroundColor: dominantColor,
                    boxShadow: `0 8px 32px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}`
                  }}
                  onClick={handlePlayAll}
                >
                  {currentPlaylistId === albumId && isPlaying ? (
                    <HiPause style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <IoMdPlay style={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                  )}
                </Button>

                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer ${isShuffle ? 'text-green-500 hover:text-green-400' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Shuffle style={{ width: '24px', height: '24px' }} />
                </button>

                <AlbumActionMenu
                  album={album}
                  isAlbumLiked={isAlbumLiked(albumId)}
                  toggleAlbumLike={() => toggleAlbumLike(album).catch(console.error)}
                  onDownloadAlbum={handleDownloadSongs}
                />
              </div>
            </div>

            {/* Songs List */}
            <div className="pl-2 pr-1 md:px-6 pb-32 md:pb-24">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
                <div className="w-8 text-center">#</div>
                <div>Title</div>
                <div className="flex items-center gap-2">
                  <div className="w-12 text-center">
                    <Clock className="w-4 h-4 mx-auto" />
                  </div>
                  <div className="w-8"></div>
                </div>
              </div>

              <div className="space-y-0">
                {album.songs?.map((song, index) => {
                  const isCurrentSong = currentSong?.id === song.id &&
                    currentPlaylistId === albumId;
                  return (
                    <div key={song.id || index}>
                      {/* Mobile Layout */}
                      <div
                        className="md:hidden flex items-center gap-2 pl-1 pr-0 py-2 rounded hover:bg-muted/50 group cursor-pointer"
                        onClick={() => handlePlayClick(song, index)}
                      >
                        <div className="w-6 text-center shrink-0">
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

                        <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                          {song.image?.length > 0 ? (
                            <img
                              src={song.image.find(img => img.quality === '500x500')?.url ||
                                song.image.find(img => img.quality === '150x150')?.url ||
                                song.image[song.image.length - 1]?.url}
                              alt={song.name}
                              className="w-full h-full object-cover rounded"
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = '/def playlist image.jpg';
                              }}
                            />
                          ) : (
                            <img
                              src="/def playlist image.jpg"
                              alt={song.name}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                            }`}>
                            {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                          </p>
                          <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                            }`}>
                            {song.artists?.primary?.length > 0 ? (
                              song.artists.primary.map((artist, artistIndex) => (
                                <span key={artist.id || artistIndex}>
                                  <span className="md:hidden">
                                    {decodeHtmlEntities(artist.name)}
                                  </span>
                                  <Link
                                    href={`/music/artist/${artist.id}`}
                                    className={`hidden md:inline hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                      }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    {decodeHtmlEntities(artist.name)}
                                  </Link>
                                  {artistIndex < song.artists.primary.length - 1 && ', '}
                                </span>
                              ))
                            ) : (
                              album.artists?.primary?.map(artist => decodeHtmlEntities(artist.name)).join(', ') || 'Unknown Artist'
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <SongActionMenu
                            song={song}
                            onAddToPlaylist={handleAddToPlaylist}
                            onGoToArtist={handleGoToArtist}
                            onDownload={handleDownload}
                            toggleLike={toggleLike}
                            isLiked={isLiked}
                            decodeHtmlEntities={decodeHtmlEntities}
                          />
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div
                        className="hidden md:grid grid-cols-[auto_1fr_auto] gap-4 items-center p-2 py-2 rounded hover:bg-muted/50 group cursor-pointer"
                        onClick={() => handlePlayClick(song, index)}
                      >
                        <div className="w-8 text-center">
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
                              <span className="text-muted-foreground group-hover:hidden">
                                {index + 1}
                              </span>
                              <IoMdPlay className="w-4 h-4 mx-auto hidden group-hover:block" />
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                            {song.image?.length > 0 ? (
                              <img
                                src={song.image.find(img => img.quality === '500x500')?.url ||
                                  song.image.find(img => img.quality === '150x150')?.url ||
                                  song.image[song.image.length - 1]?.url}
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = '/def playlist image.jpg';
                                }}
                              />
                            ) : (
                              <img
                                src="/def playlist image.jpg"
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                              }`}>
                              <Link
                                href={`/music/song/${song.id}`}
                                className="hover:underline"
                                onClick={e => e.stopPropagation()}
                              >
                                {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                              </Link>
                            </p>
                            <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                              }`}>
                              {song.artists?.primary?.length > 0 ? (
                                song.artists.primary.map((artist, artistIndex) => (
                                  <span key={artist.id || artistIndex}>
                                    <button
                                      className={`hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArtistClick(artist.id);
                                      }}
                                    >
                                      {decodeHtmlEntities(artist.name)}
                                    </button>
                                    {artistIndex < song.artists.primary.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                album.artists?.primary?.map(artist => decodeHtmlEntities(artist.name)).join(', ') || 'Unknown Artist'
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                          <SongActionMenu
                            song={song}
                            onAddToPlaylist={handleAddToPlaylist}
                            onGoToArtist={handleGoToArtist}
                            onDownload={handleDownload}
                            toggleLike={toggleLike}
                            isLiked={isLiked}
                            decodeHtmlEntities={decodeHtmlEntities}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(!album.songs || album.songs.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No songs available in this album</p>
                </div>
              )}
            </div>

            {/* Native Banner Ad */}
            <div className="px-4 md:px-8 pb-16">
              <NativeAdRow />
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