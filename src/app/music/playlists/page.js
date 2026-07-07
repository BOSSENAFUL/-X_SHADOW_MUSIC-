/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Loader2, Music, Lock, Unlock, Search, Download } from "lucide-react"
import { IoMdPlay } from "react-icons/io"
import { HiPause } from "react-icons/hi2"
import { useMusicPlayer } from "@/contexts/music-player-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// --- Memoized Components ---

const PlaylistSkeleton = memo(() => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="group relative rounded-md">
        <Skeleton className="aspect-square w-full mb-2 rounded-md bg-muted" />
        <div className="min-w-0 space-y-1.5 mt-1">
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-3 w-2/3 bg-muted" />
        </div>
      </div>
    ))}
  </div>
));
PlaylistSkeleton.displayName = "PlaylistSkeleton";

const PlaylistCard = memo(({ playlist, currentPlaylistId, isPlaying, togglePlayPause, onClick }) => {
  // Generate playlist cover based on songs
  const cover = useMemo(() => {
    if (playlist.image) {
      // Proxy YouTube Music images through our API
      const imageUrl = playlist.image.includes('yt3.googleusercontent.com')
        ? `/api/proxy/image?url=${encodeURIComponent(playlist.image)}`
        : playlist.image;
      return { type: 'single', src: imageUrl };
    }

    const songs = playlist.songs || [];
    if (!songs || songs.length === 0) {
      return { type: 'default' };
    }

    if (songs.length >= 1 && songs.length <= 3) {
      const firstSong = songs[0];
      const imageUrl = firstSong.image?.find(img => img.quality === '500x500')?.url ||
        firstSong.image?.find(img => img.quality === '150x150')?.url ||
        firstSong.image?.[firstSong.image.length - 1]?.url;

      return {
        type: 'single',
        src: imageUrl || '/default-playlist-image.png'
      };
    }

    if (songs.length >= 4) {
      const images = songs.slice(0, 4).map(song => {
        return song.image?.find(img => img.quality === '150x150')?.url ||
          song.image?.find(img => img.quality === '500x500')?.url ||
          song.image?.[song.image.length - 1]?.url ||
          '/default-playlist-image.png';
      });

      return {
        type: 'collage',
        images: images
      };
    }

    return { type: 'default' };
  }, [playlist.image, playlist.songs]);

  return (
    <>
      <div className="aspect-square w-full mb-3 overflow-hidden shadow-lg relative rounded-md border border-border">
        {cover.type === 'single' ? (
          <img
            src={cover.src}
            alt={playlist.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
            loading="lazy"
          />
        ) : cover.type === 'collage' ? (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {cover.images.map((imageSrc, index) => (
              <div key={index} className="relative w-full h-full overflow-hidden border-[0.5px] border-black/10">
                <img
                  src={imageSrc}
                  alt={`Song ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">
              {playlist.name?.charAt(0) || "?"}
            </span>
          </div>
        )}

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Badge variant="secondary" className="h-6 px-2 text-[10px] bg-black/50 text-white backdrop-blur-md hover:bg-black/70 border-none">
            {playlist.isPublic ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
            {playlist.isPublic ? "Public" : "Private"}
          </Badge>
        </div>

        <div className={`absolute bottom-2 right-2 transition-all duration-300 z-20 hidden md:flex ${currentPlaylistId === playlist._id && isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}`}>
          <div
            className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 hover:scale-105 flex items-center justify-center text-black shadow-lg transition-transform cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (currentPlaylistId === playlist._id) {
                togglePlayPause();
              } else {
                onClick(playlist);
              }
            }}
          >
            {currentPlaylistId === playlist._id && isPlaying ? (
              <HiPause className="w-5 h-5 md:w-6 md:h-6 fill-black" />
            ) : (
              <IoMdPlay className="w-5 h-5 md:w-6 md:h-6 fill-black translate-x-0.5" />
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-0.5 px-1">
        <h3 className={`text-sm font-bold leading-tight line-clamp-1 ${currentPlaylistId === playlist._id ? 'md:text-green-500' : 'text-foreground'}`}>
          {playlist.name}
        </h3>
        <p className="text-xs text-muted-foreground font-medium">
          {playlist.songIds?.length || 0} songs
        </p>
      </div>
    </>
  );
});
PlaylistCard.displayName = "PlaylistCard";

// --- Main Page Component ---

export default function PlaylistsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { currentPlaylistId, isPlaying, togglePlayPause, playSong } = useMusicPlayer();
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false); // New state for options popup
  const [importSource, setImportSource] = useState(""); // "spotify" or "youtube"
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importStage, setImportStage] = useState(0); // 0: input, 1: processing, 2: success
  const [importMessage, setImportMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // bumped to force re-fetch
  const scrollContainerRef = useRef(null);

  // Handle auto-import trigger from query parameters (coming from Library page mobile drawer)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const importParam = params.get("import");
      if (importParam === "spotify") {
        setImportSource("spotify");
        setImportUrl("");
        setImportStage(0);
        setShowImportDialog(true);
        router.replace("/music/playlists");
      } else if (importParam === "youtube") {
        setImportSource("youtube");
        setImportUrl("");
        setImportStage(0);
        setShowImportDialog(true);
        router.replace("/music/playlists");
      }
    }
  }, [router]);

  // Safe storage helper to avoid QuotaExceededError
  const safeSessionStorageSet = useCallback((key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('sessionStorage quota exceeded. Clearing community caches to make room.');
        // Try clearing other community caches first to make room
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith('communityPlaylists') || k.startsWith('user_playlists_page_')) {
            sessionStorage.removeItem(k);
          }
        });
        // Try one more time
        try { sessionStorage.setItem(key, value); } catch (e2) {
          console.error('Still unable to save to sessionStorage after clearing.', e2);
        }
      }
    }
  }, []);

  // Fetch user's playlists - show immediately, load covers in background
  useEffect(() => {
    let isMounted = true;

    const fetchPlaylists = async () => {
      if (status === "loading") return;

      if (status !== "authenticated" || !session?.user?.id) {
        if (isMounted) setLoading(false);
        return;
      }

      const cacheKey = `user_playlists_page_${session.user.id}`;

      // Check session cache for "back" navigation
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        if (isMounted) {
          try {
            setPlaylists(JSON.parse(cached));
            setLoading(false);
          } catch (e) {
            console.error("Cache parse error", e);
            sessionStorage.removeItem(cacheKey);
          }
        }
        return;
      }

      if (isMounted) setLoading(true);

      try {
        const response = await fetch('/api/playlists', { cache: 'no-store' });
        const result = await response.json();

        if (result.success) {
          // ✅ STEP 1: Show playlists IMMEDIATELY without waiting for covers
          setPlaylists(result.data);
          setLoading(false);

          // ✅ STEP 2: Load song covers in the BACKGROUND (non-blocking)
          const allSongIds = new Set();
          result.data.forEach(p => {
            if (p.songIds) p.songIds.slice(0, 4).forEach(id => allSongIds.add(id));
          });

          if (allSongIds.size > 0) {
            const idsArray = Array.from(allSongIds);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const chunkSize = 50; // Increased chunk size for fewer requests
            const songCache = {};

            const chunks = [];
            for (let i = 0; i < idsArray.length; i += chunkSize) {
              chunks.push(idsArray.slice(i, i + chunkSize));
            }

            // Fetch all song chunks in parallel
            const chunkResults = await Promise.allSettled(
              chunks.map(chunk =>
                fetch(`${apiUrl}/api/songs?ids=${chunk.join(',')}`).then(r => r.json())
              )
            );

            chunkResults.forEach(res => {
              if (res.status === 'fulfilled' && res.value?.success && res.value?.data) {
                res.value.data.forEach(song => { if (song) songCache[song.id] = song; });
              }
            });

            // Update playlists with covers
            const playlistsWithCovers = result.data.map((playlist) => {
              if (playlist.songIds && playlist.songIds.length > 0) {
                const validSongs = playlist.songIds.slice(0, 4)
                  .map(id => songCache[id])
                  .filter(Boolean);
                return { ...playlist, songs: validSongs };
              }
              return playlist;
            });

            if (isMounted) {
              setPlaylists(playlistsWithCovers);

              // Only store essential data in cache to save quota space
              const litePlaylists = playlistsWithCovers.map(p => ({
                ...p,
                // We keep the songs but only the absolute minimum fields for the covers
                songs: p.songs?.map(s => ({
                  id: s.id,
                  image: s.image
                }))
              }));

              safeSessionStorageSet(cacheKey, JSON.stringify(litePlaylists));
            }
          } else {
            if (isMounted) safeSessionStorageSet(cacheKey, JSON.stringify(result.data));
          }
        } else {
          console.error('Failed to fetch playlists:', result.error);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPlaylists();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, status, refreshKey, safeSessionStorageSet]);

  // Restore scroll position
  useEffect(() => {
    if (!loading && playlists.length > 0 && scrollContainerRef.current) {
      const scrollKey = "user_playlists_scroll";
      const savedPosition = sessionStorage.getItem(scrollKey);
      if (savedPosition) {
        const pos = parseInt(savedPosition);
        scrollContainerRef.current.scrollTop = pos;
        
        // Multi-frame fallback in case DOM takes a frame to lay out
        const timer = setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = pos;
          }
        }, 50);
        
        return () => clearTimeout(timer);
      }
    }
  }, [loading, playlists.length]);

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return playlists.filter(p =>
      p.name?.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }, [playlists, searchQuery]);

  const handlePlay = useCallback(async (playlist) => {
    if (currentPlaylistId === playlist._id) {
      togglePlayPause();
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    let songs = [];
    if (playlist.songs?.length > 0 && playlist.songs[0]?.name) {
      songs = playlist.songs;
    } else if (playlist.songIds?.length > 0) {
      const idsParam = playlist.songIds.join(',');
      const res = await fetch(`${apiUrl}/api/songs?ids=${idsParam}`);
      const data = await res.json();
      if (data.success) songs = data.data;
    }
    if (songs.length > 0) {
      playSong(songs[0], songs, playlist._id, 0);
    }
  }, [currentPlaylistId, togglePlayPause, playSong]);


  const handleCreatePlaylist = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Clear cache and scroll position so the list refreshes from top
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }
        sessionStorage.removeItem("user_playlists_scroll");
        router.push(`/music/playlists/${result.data._id}`);
      } else {
        console.error('Failed to create playlist:', result.error);
        toast.error('Failed to create playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Something went wrong');
    } finally {
      setIsCreating(false);
    }
  }, [status, session?.user?.id, router]);

  const handleImportPlaylist = useCallback(async () => {
    if (!importUrl) {
      toast.error("Please enter a playlist URL");
      return;
    }

    // Validate URL based on source
    if (importSource === "spotify" && !importUrl.includes('spotify.com/playlist/')) {
      toast.error("Please enter a valid Spotify playlist URL");
      return;
    }

    if (importSource === "youtube" && !importUrl.includes('music.youtube.com/playlist')) {
      toast.error("Please enter a valid YouTube Music playlist URL");
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/playlists/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: importUrl,
          source: importSource // Pass the source to the API
        }),
      });

      const result = await response.json();

      if (result.success) {
        setImportStage(2);
        toast.success(`Playlist imported successfully! Added ${result.data?.songIds?.length ?? 0} songs.`);

        // Clear the cache NOW (before the dialog closes) so the next fetch is fresh
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }

        // Wait a bit to show success state, then close dialog and re-fetch
        setTimeout(() => {
          setShowImportDialog(false);
          // Trigger a fresh fetch by bumping the refresh key (cache was already cleared above)
          setRefreshKey(k => k + 1);
        }, 2000);
      } else {
        setImportStage(0);
        toast.error(result.error || "Failed to import playlist");
      }
    } catch (error) {
      setImportStage(0);
      console.error('Error importing playlist:', error);
      toast.error("Failed to import playlist. Please try again.");
    } finally {
      setIsImporting(false);
    }
  }, [importUrl, importSource, session?.user?.id]);

  // Handle simulated import progress
  useEffect(() => {
    if (!isImporting) {
      setImportMessage("");
      return;
    }

    setImportStage(1);
    const stages = importSource === "spotify"
      ? [
        { time: 0, msg: "Connecting to Spotify API..." },
        { time: 2000, msg: "Fetching playlist metadata..." },
        { time: 5000, msg: "Analyzing tracks and metadata..." },
        { time: 10000, msg: "Finding matches in Jammify database..." },
        { time: 25000, msg: "Optimizing matching accuracy..." },
        { time: 40000, msg: "Finalizing your new playlist..." },
        { time: 55000, msg: "Almost there, wrapping up..." },
      ]
      : [
        { time: 0, msg: "Connecting to YouTube Music..." },
        { time: 2000, msg: "Fetching playlist information..." },
        { time: 5000, msg: "Extracting track details..." },
        { time: 10000, msg: "Matching songs in Jammify..." },
        { time: 25000, msg: "Verifying audio quality..." },
        { time: 40000, msg: "Creating your playlist..." },
        { time: 55000, msg: "Almost done, finalizing..." },
      ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length - 1) {
        currentStage++;
        setImportMessage(stages[currentStage].msg);
      }
    }, 5000);

    setImportMessage(stages[0].msg);

    return () => clearInterval(interval);
  }, [isImporting, importSource]);



  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset
        className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col"
        ref={scrollContainerRef}
        onScroll={(e) => {
          if (!loading) {
            sessionStorage.setItem("user_playlists_scroll", e.currentTarget.scrollTop.toString());
          }
        }}
      >
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>My Playlists</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden xl:block">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter playlists..."
                className="h-9 w-64 pl-9 bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Import Options Dialog */}
              <Dialog open={showImportOptions} onOpenChange={setShowImportOptions}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Download className="h-4 w-4 text-primary" />
                    <span className="">Import</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px] max-w-[95vw] overflow-hidden p-0 border-border bg-popover">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-red-500 to-blue-500 opacity-50" />

                  <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Download className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <DialogTitle className="text-lg sm:text-xl font-bold">Import Playlist</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                          Choose where to import from
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 sm:pt-2 space-y-3">
                    {/* Spotify Option */}
                    <button
                      onClick={() => {
                        setImportSource("spotify");
                        setShowImportOptions(false);
                        setShowImportDialog(true);
                      }}
                      className="w-full group relative overflow-hidden rounded-xl border-2 border-border bg-card hover:bg-accent hover:border-[#1DB954] active:scale-[0.98] transition-all p-4 sm:p-5 text-left"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1DB954] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-[#1DB954]/20">
                          <img
                            src="/spotify-logo.png"
                            alt="Spotify"
                            className="w-10 h-10 sm:w-11 sm:h-11 object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-base sm:text-lg mb-0.5 sm:mb-1">Spotify</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">Import your Spotify playlists</p>
                        </div>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    {/* YouTube Music Option */}
                    <button
                      onClick={() => {
                        setImportSource("youtube");
                        setShowImportOptions(false);
                        setShowImportDialog(true);
                      }}
                      className="w-full group relative overflow-hidden rounded-xl border-2 border-border bg-card hover:bg-accent hover:border-red-500 active:scale-[0.98] transition-all p-4 sm:p-5 text-left"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-lg shadow-red-500/20">
                          <img
                            src="/Youtube_Music_icon.svg"
                            alt="YouTube Music"
                            className="w-10 h-10 sm:w-11 sm:h-11"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-base sm:text-lg mb-0.5 sm:mb-1">YouTube Music</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">Import YouTube Music playlists</p>
                        </div>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  </div>

                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                    <div className="rounded-lg bg-muted border border-border p-3">
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-relaxed">
                        Make sure your playlist is set to <span className="text-foreground font-semibold">Public</span> before importing
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Import URL Dialog */}
              <Dialog open={showImportDialog} onOpenChange={(val) => {
                if (!isImporting) {
                  if (!val) {
                    // Reset all states after the dialog has finished closing/animating out
                    setTimeout(() => {
                      setImportUrl("");
                      setImportStage(0);
                      setImportSource("");
                    }, 300);
                  }
                  setShowImportDialog(val);
                }
              }}>
                <DialogContent className="sm:max-w-[450px] max-w-[95vw] overflow-hidden p-0 border-border bg-popover">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 opacity-50" />

                  {importStage === 0 && importSource && (
                    <>
                      <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                        <div className="flex items-center gap-3 mb-1">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${importSource === "spotify" ? "bg-[#1DB954]" : "bg-red-500"
                            }`}>
                            {importSource === "spotify" ? (
                              <img
                                src="/spotify-logo.png"
                                alt="Spotify"
                                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                              />
                            ) : (
                              <img
                                src="/Youtube_Music_icon.svg"
                                alt="YouTube Music"
                                className="w-7 h-7 sm:w-8 sm:h-8"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <DialogTitle className="text-lg sm:text-xl font-bold leading-tight">
                              Import from {importSource === "spotify" ? "Spotify" : "YouTube Music"}
                            </DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                              {importSource === "spotify"
                                ? "Bring your favorite playlists to Jammify"
                                : "Transfer your YouTube Music playlists"
                              }
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>

                      <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="url" className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Playlist URL or Link
                          </Label>
                          <div className="relative">
                            <Input
                              id="url"
                              placeholder={
                                importSource === "spotify"
                                  ? "https://open.spotify.com/playlist/..."
                                  : "https://music.youtube.com/playlist?list=..."
                              }
                              className={`h-11 sm:h-12 text-sm bg-background border-border pr-10 ${importSource === "spotify"
                                ? "focus:border-[#1DB954]/50 focus:ring-[#1DB954]/20"
                                : "focus:border-red-500/50 focus:ring-red-500/20"
                                }`}
                              value={importUrl}
                              onChange={(e) => setImportUrl(e.target.value)}
                            />
                            {((importSource === "spotify" && importUrl.includes('spotify.com/playlist/')) ||
                              (importSource === "youtube" && importUrl.includes('music.youtube.com/playlist'))) && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground px-1">
                            Make sure the playlist is set to <span className="text-foreground font-medium">Public</span> on {importSource === "spotify" ? "Spotify" : "YouTube Music"}.
                          </p>
                        </div>

                        <div className="rounded-lg bg-muted/50 border border-border p-3 sm:p-4 space-y-2 sm:space-y-3">
                          <h4 className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">How to get the link</h4>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-1">
                              {importSource === "spotify" ? (
                                <>
                                  <p className="text-xs text-foreground">1. Open Spotify playlist</p>
                                  <p className="text-xs text-foreground">2. Click <span className="font-bold">...</span> → <span className="font-bold">Share</span></p>
                                  <p className="text-xs text-foreground">3. Select <span className="font-bold">Copy link to playlist</span></p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-foreground">1. Open YouTube Music playlist</p>
                                  <p className="text-xs text-foreground">2. Click <span className="font-bold">⋮</span> → <span className="font-bold">Share</span></p>
                                  <p className="text-xs text-foreground">3. Select <span className="font-bold">Copy link</span></p>
                                </>
                              )}
                            </div>
                            <div className="hidden sm:block w-px bg-border" />
                            <div className="flex sm:flex-1 items-center justify-center sm:justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 text-[11px] w-full sm:w-auto ${importSource === "spotify"
                                  ? "text-[#1DB954] hover:text-[#1DB954] hover:bg-[#1DB954]/10"
                                  : "text-red-500 hover:text-red-500 hover:bg-red-500/10"
                                  }`}
                                onClick={async () => {
                                  try {
                                    const text = await navigator.clipboard.readText();
                                    if (importSource === "spotify" && text.includes('spotify.com')) {
                                      setImportUrl(text);
                                    } else if (importSource === "youtube" && text.includes('music.youtube.com')) {
                                      setImportUrl(text);
                                    }
                                  } catch (e) {
                                    toast.error("Couldn't access clipboard");
                                  }
                                }}
                              >
                                Paste from clipboard
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="p-4 sm:p-6 pt-0 bg-muted/30 border-t border-border">
                        <Button
                          className={`w-full h-11 font-bold transition-all shadow-lg ${importSource === "spotify"
                            ? "bg-[#1DB954] hover:bg-[#1ed760] text-black shadow-[#1DB954]/10"
                            : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/10"
                            }`}
                          onClick={handleImportPlaylist}
                          disabled={
                            isImporting ||
                            (importSource === "spotify" && !importUrl.includes('spotify.com/playlist/')) ||
                            (importSource === "youtube" && !importUrl.includes('music.youtube.com/playlist'))
                          }
                        >
                          Import Playlist
                        </Button>
                      </DialogFooter>
                    </>
                  )}

                  {importStage === 1 && importSource && (
                    <div className="p-10 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-[#1DB954] animate-spin" />
                        </div>
                        <div className="absolute -bottom-2 -right-2">
                          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                            <Music className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-bold text-foreground">Importing your music</h3>
                        <p className="text-sm text-muted-foreground animate-pulse">{importMessage}</p>
                      </div>

                      <div className="w-full max-w-[240px] h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#1DB954] animate-progress" />
                      </div>

                      <p className="text-[10px] text-muted-foreground text-center max-w-[280px]">
                        This may take a minute or two depending on the playlist size.
                        We are matching songs with the highest quality versions available.
                      </p>
                    </div>
                  )}

                  {importStage === 2 && (
                    <div className="p-10 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
                      <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>

                      <div className="text-center space-y-1">
                        <h3 className="text-xl font-bold text-foreground">Import Successful!</h3>
                        <p className="text-sm text-muted-foreground">Your playlist has been added to your library.</p>
                      </div>

                      <p className="text-xs text-muted-foreground">Refreshing your library...</p>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleCreatePlaylist}
                disabled={isCreating || status !== "authenticated"}
                size="sm"
                className="h-9 gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create Playlist</span>
                    <span className="sm:hidden">New</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>
        <div
          className="flex-1 p-4 md:p-6 pb-40"
        >
          {loading ? (
            <PlaylistSkeleton />
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg border-dashed bg-muted/10">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Music className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No playlists yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Create your first playlist to start building your personal collection.
              </p>
              <Button onClick={handleCreatePlaylist} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Playlist
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
              {filteredPlaylists.map((playlist) => (
                <Link
                  key={playlist._id}
                  href={`/music/playlists/${playlist._id}`}
                  className="group relative rounded-md hover:bg-muted/30 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`View playlist ${playlist.name}`}
                  onClick={() => {
                    if (scrollContainerRef.current) {
                      sessionStorage.setItem("user_playlists_scroll", scrollContainerRef.current.scrollTop.toString());
                    }
                  }}
                >
                  <PlaylistCard
                    playlist={playlist}
                    currentPlaylistId={currentPlaylistId}
                    isPlaying={isPlaying}
                    togglePlayPause={togglePlayPause}
                    onClick={handlePlay}
                  />
                </Link>
              ))}
            </div>
          )}
          <div className="pb-32 md:pb-40" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
