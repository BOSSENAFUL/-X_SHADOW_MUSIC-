/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, ArrowLeft, Heart, MoreVertical, Clock, Shuffle, Download, Plus, User, Disc, Share, X, Music2 } from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { toast } from "sonner";
import { HiPause } from "react-icons/hi2";
import { IoMdPlay } from "react-icons/io";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { downloadWithMetadata } from "@/lib/clientDownload";
import { triggerSmartlink } from "@/lib/smartlink";
import { applyThemeColor } from "@/lib/utils";

// --- Helper Components ---
const SongActionMenu = memo(({
  song,
  onAddToPlaylist,
  onGoToArtist,
  onGoToAlbum,
  onDownload,
  onUnlike,
  decodeHtmlEntities
}) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const artistNames = song.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
  const songImageUrl = song.image?.find(img => img.quality === '150x150')?.url ||
    song.image?.[song.image.length - 1]?.url ||
    '/default-playlist-image.png';

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
          router.push(`/music/song/${song.songId}`);
        }}
      >
        <Music2 className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Song detail</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          const shareUrl = `${window.location.origin}/music/song/${song.songId}`;
          if (navigator.share) {
            navigator.share({
              title: song.songName,
              text: `Check out "${song.songName}" by ${song.artists?.[0]?.name || 'Unknown Artist'}`,
              url: shareUrl
            });
          } else {
            navigator.clipboard.writeText(shareUrl);
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
          onGoToAlbum(e, song);
        }}
      >
        <Disc className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Go to album</span>
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
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors text-red-500"
        onClick={(e) => {
          onItemClick();
          onUnlike(e, song);
        }}
      >
        <Heart className="w-5 h-5 fill-current" />
        <span className="font-medium">Unlike</span>
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
          <DrawerContent className="bg-[#1F1F1F] border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0">
                  <img
                    src={songImageUrl}
                    alt={song.songName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-foreground text-left">
                    {decodeHtmlEntities(song.songName)}
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
          className="p-2 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
          onClick={(e) => { e.stopPropagation(); router.push(`/music/song/${song.songId}`); }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Music2 className="w-4 h-4 mr-2" />
          Song detail
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            const shareUrl = `${window.location.origin}/music/song/${song.songId}`;
            if (navigator.share) {
              navigator.share({
                title: song.songName,
                text: `Check out "${song.songName}" by ${song.artists?.[0]?.name || 'Unknown Artist'}`,
                url: shareUrl
              });
            } else {
              navigator.clipboard.writeText(shareUrl);
              toast.success('Link copied to clipboard');
            }
          }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Share className="w-4 h-4 mr-2" />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => onGoToArtist(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          Go to artist
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => onGoToAlbum(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Disc className="w-4 h-4 mr-2" />
          Go to album
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
          onClick={(e) => onUnlike(e, song)}
          className="text-red-500 hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Heart className="w-4 h-4 mr-2 fill-current" />
          Unlike
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SongActionMenu.displayName = "SongActionMenu";

export default function FavoritesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const mobileTitleRef = useRef(null);
  const desktopTitleRef = useRef(null);

  // Initialize liked songs hook
  const { likedSongs, loading, toggleLike, getLikedCount } = useLikedSongs(session?.user?.id);

  // Effect to handle scroll and show/hide title in header
  useEffect(() => {
    const scrollContainer = document.getElementById('favorites-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Pick the visible layout's title ref
      const titleEl = desktopTitleRef.current?.offsetWidth > 0
        ? desktopTitleRef.current
        : mobileTitleRef.current?.offsetWidth > 0
          ? mobileTitleRef.current
          : null;

      if (!titleEl) return;

      const rect = titleEl.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      // Title is "behind the header" when its top enters the header area (64px from container top)
      setShowHeaderTitle(rect.top < containerRect.top + 64);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial state
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [loading, likedSongs.length]);

  // Dynamic PWA status bar theme-color update
  useEffect(() => {
    if (typeof window === "undefined") return;
    const defaultThemeColor = "#121212";

    window._getActivePageThemeColor = (progress) => {
      // Interpolate between #2C0E84 (scroll progress = 0) and #1D1046 (scroll progress = 1)
      const r = Math.round(44 * (1 - progress) + 29 * progress);
      const g = Math.round(14 * (1 - progress) + 16 * progress);
      const b = Math.round(132 * (1 - progress) + 70 * progress);
      const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const targetColor = showHeaderTitle ? "#1D1046" : "#2C0E84";
    applyThemeColor(targetColor);

    return () => {
      applyThemeColor(defaultThemeColor);
      delete window._getActivePageThemeColor;
    };
  }, [showHeaderTitle]);

  // Initialize music player
  const { playSong, currentSong, currentIndex, isPlaying, togglePlayPause, currentPlaylistId, isShuffle, setIsShuffle, showTrackNumbersMobile } = useMusicPlayer();

  // Pre-calculate playlist data for the player to avoid mapping on every click
  const playlistData = useMemo(() => {
    return likedSongs.map(likedSong => ({
      id: likedSong.songId,
      name: likedSong.songName,
      artists: { primary: likedSong.artists },
      album: likedSong.album,
      duration: likedSong.duration,
      image: likedSong.image,
      releaseDate: likedSong.releaseDate,
      language: likedSong.language,
      playCount: likedSong.playCount,
      downloadUrl: likedSong.downloadUrl
    }));
  }, [likedSongs]);

  const handlePlayClick = useCallback((song, index) => {
    const isCurrentSong = currentSong?.id === song.songId;

    if (isCurrentSong) return;

    const songData = {
      id: song.songId,
      name: song.songName,
      artists: { primary: song.artists },
      album: song.album,
      duration: song.duration,
      image: song.image,
      releaseDate: song.releaseDate,
      language: song.language,
      playCount: song.playCount,
      downloadUrl: song.downloadUrl
    };

    playSong(songData, playlistData, 'favorites', index);
  }, [currentSong?.id, playlistData, playSong]);

  const handlePlayAll = useCallback(() => {
    if (playlistData.length > 0) {
      const isPlaylistPlaying = currentPlaylistId === 'favorites';

      if (isPlaylistPlaying) {
        togglePlayPause();
      } else {
        let startSong = playlistData[0];
        let startIndex = 0;

        if (isShuffle) {
          startIndex = Math.floor(Math.random() * playlistData.length);
          startSong = playlistData[startIndex];
        }

        playSong(startSong, playlistData, 'favorites', startIndex);
      }
    }
  }, [playlistData, currentPlaylistId, togglePlayPause, playSong, isShuffle]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const formatDuration = useCallback((duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Use a faster decoding method that doesn't create DOM elements on every call
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

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const handleAddToPlaylist = useCallback((e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  }, []);

  const handleGoToArtist = useCallback((e, song) => {
    e.stopPropagation();
    if (song.artists?.length > 0) {
      router.push(`/music/artist/${song.artists[0].id}`);
    }
  }, [router]);

  const handleGoToAlbum = useCallback((e, song) => {
    e.stopPropagation();
    if (song.album?.id) {
      router.push(`/music/album/${song.album.id}`);
    }
  }, [router]);


  const handleDownloadAllLikedSongs = async () => {
    if (likedSongs.length === 0) {
      // Show toast if no songs to download
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      toast.textContent = 'No liked songs to download!';
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
      return;
    }
    triggerSmartlink(true); // Download — fire every time, no cooldown
    // Show initial toast
    const progressToast = document.createElement('div');
    progressToast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    progressToast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Downloading liked songs... (0/${likedSongs.length})</span>
      </div>
    `;
    document.body.appendChild(progressToast);

    let downloadedCount = 0;
    let failedCount = 0;
    let completedCount = 0;

    // Helper to update the UI progress
    const updateProgress = (currentSongName) => {
      progressToast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>[${completedCount}/${likedSongs.length}] Downloading "${decodeHtmlEntities(currentSongName)}"...</span>
        </div>
      `;
    };

    // 🚀 PARALLEL BATCH DOWNLOADER (10 at a time - client-side is instant!)
    const CONCURRENCY_LIMIT = 10;
    const queue = [...likedSongs];

    const downloadWorker = async () => {
      while (queue.length > 0) {
        const song = queue.shift();
        if (!song) break;

        try {
          // Update toast with latest active song
          updateProgress(song.songName);

          // Download the song
          await downloadSingleLikedSong(song, true);
          downloadedCount++;
        } catch (error) {
          console.error(`Failed to download ${song.songName}:`, error);
          failedCount++;
        } finally {
          completedCount++;
          // Update progress again for the next waiting song
          if (queue.length > 0) updateProgress(queue[0].songName);
        }
      }
    };

    // Start 4 workers simultaneously
    const workers = Array(CONCURRENCY_LIMIT).fill(null).map(() => downloadWorker());
    await Promise.all(workers);

    // Remove progress toast
    progressToast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(progressToast);
    }, 300);

    // Show completion toast
    const completionToast = document.createElement('div');
    if (failedCount === 0) {
      completionToast.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Successfully downloaded all ${downloadedCount} liked songs!`;
    } else if (downloadedCount > 0) {
      completionToast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Downloaded ${downloadedCount} songs, ${failedCount} failed from liked songs`;
    } else {
      completionToast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
      completionToast.textContent = `Failed to download liked songs. Please try again.`;
    }

    document.body.appendChild(completionToast);
    setTimeout(() => {
      completionToast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(completionToast);
      }, 300);
    }, 5000);
  };

  const downloadSingleLikedSong = async (song, silent = false) => {
    let toastId = null;
    if (!silent) {
      toastId = toast.loading(`Preparing "${decodeHtmlEntities(song.songName)}"...`);
    }

    try {
      // 1. Resolve Best Quality URL
      let downloadUrl = null;
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        // Step 1: Find all MP3s
        const mp3s = song.downloadUrl.filter(u => u.url.toLowerCase().includes('.mp3'));

        // Step 2: Pick the best MP3 (prefer high quality)
        const bestMp3 = mp3s.find(u => u.quality === '320kbps') ||
          mp3s.find(u => u.quality === '160kbps') ||
          mp3s[0];

        // Step 3: Fallback to best overall if no MP3 found
        const bestOverall = song.downloadUrl.find(u => u.quality === '320kbps') ||
          song.downloadUrl[song.downloadUrl.length - 1];

        downloadUrl = bestMp3?.url || bestOverall?.url;
      }

      if (!downloadUrl) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.songId}`);
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

      const title = decodeHtmlEntities(song.songName);
      const artist = song.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
      const album = song.album?.name ? decodeHtmlEntities(song.album.name) : 'Unknown Album';
      const year = song.releaseDate ? new Date(song.releaseDate).getFullYear() : '';

      if (!silent) toast.loading(`Downloading "${title}"...`, { id: toastId });

      // 3. Use 100% client-side download with metadata embedding!
      const result = await downloadWithMetadata({
        songUrl: downloadUrl,
        title,
        artist,
        album,
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
      if (!silent) toast.error(`Failed to download: ${error.message}`, { id: toastId });
      throw error; // Re-throw so bulk download knows it failed
    }
  };

  const handleDownload = useCallback(async (e, song) => {
    e.stopPropagation();
    triggerSmartlink(true); // Download — fire every time, no cooldown
    await downloadSingleLikedSong(song);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlike = useCallback(async (e, likedSong) => {
    e.stopPropagation();
    const songData = {
      id: likedSong.songId,
      name: likedSong.songName,
      artists: { primary: likedSong.artists },
      album: likedSong.album,
      duration: likedSong.duration,
      image: likedSong.image,
      releaseDate: likedSong.releaseDate,
      language: likedSong.language,
      playCount: likedSong.playCount,
      downloadUrl: likedSong.downloadUrl
    };
    const result = await toggleLike(songData);
    console.log(result.message);
  }, [toggleLike]);

  if (loading || status === "loading") {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
          <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="animate-pulse space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                <div className="w-48 h-48 md:w-60 md:h-60 bg-muted rounded-lg" />
                <div className="flex-1 space-y-3 text-center md:text-left">
                  <div className="h-6 bg-muted rounded w-24 mx-auto md:mx-0" />
                  <div className="h-8 md:h-12 bg-muted rounded w-48 mx-auto md:mx-0" />
                  <div className="h-4 bg-muted rounded w-32 mx-auto md:mx-0" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }
  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset id="favorites-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header
          className={`fixed md:sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 transition-all duration-300 w-full md:border-b border-border ${showHeaderTitle
            ? "bg-[#1D1046] text-white"
            : "bg-transparent md:bg-background"
            }`}
        >
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4 h-full relative z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex-1 flex items-center h-full min-w-0 relative">
                {/* Desktop */}
                <div className="hidden md:flex items-center h-full flex-1">
                  <div className="flex items-center gap-2 transition-all duration-300">
                    {showHeaderTitle ? (
                      <h2 className="text-base font-bold animate-in fade-in slide-in-from-bottom-2 duration-300">
                        Liked Songs
                      </h2>
                    ) : (
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator className="hidden md:block" />
                          <BreadcrumbItem>
                            <BreadcrumbPage>Favorites</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                    )}
                  </div>
                </div>

                {/* Mobile */}
                <div
                  className="md:hidden flex items-center h-full flex-1 transition-all duration-300 pointer-events-none"
                  style={{
                    opacity: showHeaderTitle ? 1 : 0,
                    transform: showHeaderTitle ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
                    visibility: showHeaderTitle ? 'visible' : 'hidden'
                  }}
                >
                  <h2 className="text-base font-bold line-clamp-1 pr-4">
                    Liked Songs
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1">
          {/* Favorites Header */}
          <div className="p-4 md:p-6 text-foreground" style={{ background: "linear-gradient(to bottom, rgba(69, 10, 245, 0.5) 0%, rgba(69, 10, 245, 0.2) 100%)" }}>
            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-48 h-48 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgb(69, 10, 245), rgb(166, 174, 219))" }}>
                  <Heart className="w-16 h-16 fill-current text-white" />
                </div>
                <div className="space-y-2">

                  <h1 ref={mobileTitleRef} className="text-2xl font-bold wrap-break-word">
                    Liked Songs
                  </h1>
                  <div className="flex items-center justify-center gap-2 text-sm opacity-80">
                    <span className="font-semibold">{session?.user?.name || 'You'}</span>
                    <span>•</span>
                    <span>{getLikedCount()} songs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex gap-6 items-end">
              <div className="w-60 h-60 rounded-lg overflow-hidden shrink-0 shadow-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgb(69, 10, 245), rgb(166, 174, 219))" }}>
                <Heart className="w-20 h-20 fill-current text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 ref={desktopTitleRef} className="text-4xl md:text-6xl font-bold mb-4 wrap-break-word">
                  Liked Songs
                </h1>
                <div className="flex items-center gap-2 text-sm opacity-80">
                  <span className="font-semibold">{session?.user?.name || 'You'}</span>
                  <span>•</span>
                  <span>{getLikedCount()} songs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 pt-2 md:p-8 md:pt-4" style={{ background: "linear-gradient(to bottom, rgba(69, 10, 245, 0.2) 0%, transparent 100%)" }}>
            <div className="flex items-center gap-0.5 md:gap-1">
              <Button
                size="lg"
                className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-all duration-500 cursor-pointer bg-green-500 hover:bg-green-400"
                style={{
                  boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)'
                }}
                onClick={handlePlayAll}
                disabled={likedSongs.length === 0}
              >
                {currentPlaylistId === 'favorites' && isPlaying ? (
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
              <button
                onClick={handleDownloadAllLikedSongs}
                disabled={likedSongs.length === 0}
                className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download style={{ width: '24px', height: '24px' }} />
              </button>
            </div>
          </div>

          {/* Songs List */}
          <div className="pl-2 pr-1 md:px-6 pb-28 md:pb-36">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[auto_1fr_1fr_120px_80px] gap-4 items-center p-2">
                    <div className="w-8 h-4 bg-muted animate-pulse rounded" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted animate-pulse rounded" />
                      <div className="space-y-1 flex-1">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                        <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                    <div className="h-4 bg-muted animate-pulse rounded w-20" />
                    <div className="h-4 bg-muted animate-pulse rounded w-10" />
                  </div>
                ))}
              </div>
            ) : likedSongs.length > 0 ? (
              <>
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[auto_1fr_1fr_120px_100px] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
                  <div className="w-8 text-center">#</div>
                  <div>Title</div>
                  <div>Album</div>
                  <div>Date added</div>
                  <div className="flex items-center justify-end gap-1">
                    <div className="min-w-[40px] text-right">
                      <Clock className="w-4 h-4 ml-auto" />
                    </div>
                    <div className="w-8"></div>
                  </div>
                </div>

                <div className="space-y-0">
                  {likedSongs.map((likedSong, index) => {
                    const isCurrentSong = currentSong?.id === likedSong.songId &&
                      currentPlaylistId === 'favorites';
                    return (
                      <div key={likedSong.songId || index} >
                        {/* Mobile Layout */}
                        <div
                          className={`md:hidden flex items-center gap-2 pl-1 pr-0 py-2 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? '' : ''
                            }`}
                          onClick={() => handlePlayClick(likedSong, index)}
                        >
                          <div className={`w-6 text-center shrink-0 ${!showTrackNumbersMobile ? 'hidden' : ''}`}>
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

                          <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden relative">
                            {likedSong.image?.length > 0 ? (
                              <img
                                src={likedSong.image.find(img => img.quality === '500x500')?.url ||
                                  likedSong.image.find(img => img.quality === '150x150')?.url ||
                                  likedSong.image[likedSong.image.length - 1]?.url}
                                alt={likedSong.songName}
                                className="w-full h-full object-cover rounded"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = '/default-playlist-image.png';
                                }}
                              />
                            ) : (
                              <img
                                src="/default-playlist-image.png"
                                alt={likedSong.songName}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`font-medium truncate flex items-center gap-1.5 ${isCurrentSong ? 'text-green-500' : ''
                              }`}>
                              {isCurrentSong && isPlaying && (
                                <span className="flex items-end justify-center gap-0.5 h-3 w-3 shrink-0">
                                  <span className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0s' }} />
                                  <span className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.2s' }} />
                                  <span className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.4s' }} />
                                </span>
                              )}
                              {decodeHtmlEntities(likedSong.songName) || `Track ${index + 1}`}
                            </p>
                            <p className="text-sm truncate text-muted-foreground">
                              {likedSong.artists?.length > 0 ? (
                                likedSong.artists.map((artist, artistIndex) => (
                                  <span key={artist.id || artistIndex}>
                                    <span className="md:hidden">
                                      {artist.name}
                                    </span>
                                    <Link
                                      href={`/music/artist/${artist.id}`}
                                      className={`hidden md:inline hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      {artist.name}
                                    </Link>
                                    {artistIndex < likedSong.artists.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                'Unknown Artist'
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <SongActionMenu
                              song={likedSong}
                              onAddToPlaylist={handleAddToPlaylist}
                              onGoToArtist={handleGoToArtist}
                              onGoToAlbum={handleGoToAlbum}
                              onDownload={handleDownload}
                              onUnlike={handleUnlike}
                              decodeHtmlEntities={decodeHtmlEntities}
                            />
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div
                          className={`hidden md:grid grid-cols-[auto_1fr_1fr_120px_100px] gap-4 items-center p-1.5 py-2 rounded hover:bg-muted/50 group cursor-pointer ${isCurrentSong ? 'bg-muted/30' : ''
                            }`}
                          onClick={() => handlePlayClick(likedSong, index)}
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
                            <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden relative">
                              {likedSong.image?.length > 0 ? (
                                <img
                                  src={likedSong.image.find(img => img.quality === '500x500')?.url ||
                                    likedSong.image.find(img => img.quality === '150x150')?.url ||
                                    likedSong.image[likedSong.image.length - 1]?.url}
                                  alt={likedSong.songName}
                                  className="w-full h-full object-cover rounded"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.src = '/default-playlist-image.png';
                                  }}
                                />
                              ) : (
                                <img
                                  src="/default-playlist-image.png"
                                  alt={likedSong.songName}
                                  className="w-full h-full object-cover rounded"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                                }`}>
                                {decodeHtmlEntities(likedSong.songName) || `Track ${index + 1}`}
                              </p>
                              <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                }`}>
                                {likedSong.artists?.length > 0 ? (
                                  likedSong.artists.map((artist, artistIndex) => (
                                    <span key={artist.id || artistIndex}>
                                      <Link
                                        href={`/music/artist/${artist.id}`}
                                        className={`hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                          }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        {artist.name}
                                      </Link>
                                      {artistIndex < likedSong.artists.length - 1 && ', '}
                                    </span>
                                  ))
                                ) : (
                                  'Unknown Artist'
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground truncate">
                            {likedSong.album?.name ? (
                              <Link
                                href={`/music/album/${likedSong.album.id}`}
                                className="hover:underline hover:text-foreground transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                {decodeHtmlEntities(likedSong.album.name)}
                              </Link>
                            ) : (
                              'Unknown Album'
                            )}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {formatDate(likedSong.likedAt)}
                          </div>

                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 text-green-500 hover:text-green-600 hidden md:inline-flex shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleUnlike(e, likedSong)}
                            >
                              <Heart className="w-4 h-4 fill-current" />
                            </Button>
                            <div className="min-w-[40px] text-right text-sm text-muted-foreground font-mono hidden md:block">
                              {formatDuration(likedSong.duration)}
                            </div>
                            <SongActionMenu
                              song={likedSong}
                              onAddToPlaylist={handleAddToPlaylist}
                              onGoToArtist={handleGoToArtist}
                              onGoToAlbum={handleGoToAlbum}
                              onDownload={handleDownload}
                              onUnlike={handleUnlike}
                              decodeHtmlEntities={decodeHtmlEntities}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
                <p className="text-muted-foreground mb-4">Songs you like will appear here</p>
                <Button onClick={() => router.push('/music')}>
                  Find music you love
                </Button>
              </div>
            )}
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
