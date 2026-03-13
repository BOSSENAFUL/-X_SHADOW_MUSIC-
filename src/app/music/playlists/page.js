"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Loader2, Music, Lock, Unlock, Search, LayoutGrid, List, Grid, Download } from "lucide-react"
import { cn } from "@/lib/utils"
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
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="aspect-square w-full rounded-md bg-zinc-800/50" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-3/4 bg-zinc-800/50" />
          <Skeleton className="h-3 w-1/2 bg-zinc-800/50" />
        </div>
      </div>
    ))}
  </div>
));
PlaylistSkeleton.displayName = "PlaylistSkeleton";

const PlaylistCard = memo(({ playlist, onClick }) => {
  // Generate playlist cover based on songs
  const cover = useMemo(() => {
    if (playlist.image) {
      return { type: 'single', src: playlist.image };
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
    <div
      onClick={onClick}
      className="group cursor-pointer space-y-3 transition-all"
    >
      <div className="aspect-square w-full relative overflow-hidden rounded-md shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.02]">
        {cover.type === 'single' ? (
          <img
            src={cover.src}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
          />
        ) : cover.type === 'collage' ? (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
            {cover.images.map((imageSrc, index) => (
              <div key={index} className="w-full h-full overflow-hidden border-[0.5px] border-black/10">
                <img
                  src={imageSrc}
                  alt={`Song ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
            <Music className="w-12 h-12 text-zinc-700" />
          </div>
        )}

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Badge variant="secondary" className="h-6 px-2 text-[10px] bg-black/50 text-white backdrop-blur-md hover:bg-black/70 border-none">
            {playlist.isPublic ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
            {playlist.isPublic ? "Public" : "Private"}
          </Badge>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold text-sm truncate pr-2 group-hover:text-primary transition-colors">
          {playlist.name}
        </h3>
        <div className="flex flex-col text-xs text-muted-foreground space-y-0.5">
          <span>{playlist.songIds?.length || 0} songs</span>
        </div>
      </div>
    </div>
  );
});
PlaylistCard.displayName = "PlaylistCard";

// --- Main Page Component ---

export default function PlaylistsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importStage, setImportStage] = useState(0); // 0: input, 1: processing, 2: success
  const [importMessage, setImportMessage] = useState("");

  // Fetch user's playlists with song data for covers
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (status === "loading") return;

      if (status !== "authenticated" || !session?.user?.id) {
        setLoading(false);
        return;
      }

      // Check session cache for "back" navigation
      const cacheKey = `user_playlists_page_${session.user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setPlaylists(JSON.parse(cached));
        setLoading(false);
        setHasLoaded(true);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch('/api/playlists', { cache: 'no-store' });
        const result = await response.json();

        if (result.success) {
          // BATCH OPTIMIZATION: Collect all song IDs across all playlists
          const allSongIds = new Set();
          result.data.forEach(p => {
            if (p.songIds) p.songIds.slice(0, 4).forEach(id => allSongIds.add(id));
          });

          const songCache = {};
          if (allSongIds.size > 0) {
            const idsArray = Array.from(allSongIds);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const chunkSize = 20;

            for (let i = 0; i < idsArray.length; i += chunkSize) {
              const chunk = idsArray.slice(i, i + chunkSize);
              try {
                const songRes = await fetch(`${apiUrl}/api/songs?ids=${chunk.join(',')}`);
                const songData = await songRes.json();
                if (songData.success && songData.data) {
                  songData.data.forEach(song => {
                    if (song) songCache[song.id] = song;
                  });
                }
              } catch (e) {
                console.error("Batch song fetch error:", e);
              }
            }
          }

          // Map the cached song data back to the playlists
          const playlistsWithCovers = result.data.map((playlist) => {
            if (playlist.songIds && playlist.songIds.length > 0) {
              const songsToFetch = playlist.songIds.slice(0, 4);
              const validSongs = songsToFetch
                .map(id => songCache[id])
                .filter(Boolean);

              return {
                ...playlist,
                songs: validSongs
              };
            }
            return playlist;
          });

          setPlaylists(playlistsWithCovers);
          // Save to session storage
          sessionStorage.setItem(cacheKey, JSON.stringify(playlistsWithCovers));
        } else {
          console.error('Failed to fetch playlists:', result.error);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
        setHasLoaded(true);
      }
    };

    fetchPlaylists();
  }, [session, status]);

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return playlists.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  }, [playlists, searchQuery]);

  console.log("Playlists received from API:", playlists.length, playlists);

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
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }
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
      toast.error("Please enter a Spotify playlist URL");
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch('/api/playlists/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: importUrl }),
      });

      const result = await response.json();

      if (result.success) {
        setImportStage(2);
        toast.success(`Playlist imported successfully! Added ${result.data.songIds.length} songs.`);
        
        // Wait a bit to show success state before closing or reloading
        setTimeout(() => {
          setShowImportDialog(false);
          setImportUrl("");
          setImportStage(0);
          if (session?.user?.id) {
            sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
            sessionStorage.removeItem(`created_playlists_${session.user.id}`);
          }
          window.location.reload();
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
  }, [importUrl, session?.user?.id]);

  // Handle simulated import progress
  useEffect(() => {
    if (!isImporting) {
      setImportStage(0);
      setImportMessage("");
      return;
    }

    setImportStage(1);
    const stages = [
      { time: 0, msg: "Connecting to Spotify API..." },
      { time: 2000, msg: "Fetching playlist metadata..." },
      { time: 5000, msg: "Analyzing tracks and metadata..." },
      { time: 10000, msg: "Finding matches in Jammify database..." },
      { time: 25000, msg: "Optimizing matching accuracy..." },
      { time: 40000, msg: "Finalizing your new playlist..." },
      { time: 55000, msg: "Almost there, wrapping up..." },
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
  }, [isImporting]);



  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
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
              <Dialog open={showImportDialog} onOpenChange={(val) => {
                if (!isImporting) {
                  setShowImportDialog(val);
                  if (!val) {
                    setImportUrl("");
                    setImportStage(0);
                  }
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Download className="h-4 w-4 text-primary" />
                    <span className="">Import Spotify</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] overflow-hidden p-0 border-zinc-800 bg-zinc-950">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 opacity-50" />
                  
                  {importStage === 0 && (
                    <>
                      <DialogHeader className="p-6 pb-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 flex items-center justify-center">
                            <svg viewBox="0 0 496 512" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                              <path fill="#1ed760" d="M248 8C111.1 8 0 119.1 0 256s111.1 248 248 248 248-111.1 248-248S384.9 8 248 8Z"/>
                              <path d="M406.6 231.1c-5.2 0-8.4-1.3-12.9-3.9-71.2-42.5-198.5-52.7-280.9-29.7-3.6 1-8.1 2.6-12.9 2.6-13.2 0-23.3-10.3-23.3-23.6 0-13.6 8.4-21.3 17.4-23.9 35.2-10.3 74.6-15.2 117.5-15.2 73 0 149.5 15.2 205.4 47.8 7.8 4.5 12.9 10.7 12.9 22.6 0 13.6-11 23.3-23.2 23.3zm-31 76.2c-5.2 0-8.7-2.3-12.3-4.2-62.5-37-155.7-51.9-238.6-29.4-4.8 1.3-7.4 2.6-11.9 2.6-10.7 0-19.4-8.7-19.4-19.4s5.2-17.8 15.5-20.7c27.8-7.8 56.2-13.6 97.8-13.6 64.9 0 127.6 16.1 177 45.5 8.1 4.8 11.3 11 11.3 19.7-.1 10.8-8.5 19.5-19.4 19.5zm-26.9 65.6c-4.2 0-6.8-1.3-10.7-3.6-62.4-37.6-135-39.2-206.7-24.5-3.9 1-9 2.6-11.9 2.6-9.7 0-15.8-7.7-15.8-15.8 0-10.3 6.1-15.2 13.6-16.8 81.9-18.1 165.6-16.5 237 26.2 6.1 3.9 9.7 7.4 9.7 16.5s-7.1 15.4-15.2 15.4z" fill="#000000"/>
                            </svg>



                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold">Import from Spotify</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                              Bring your favorite playlists to Jammify
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      
                      <div className="p-6 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="url" className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Playlist URL or Link
                          </Label>
                          <div className="relative">
                            <Input
                              id="url"
                              placeholder="https://open.spotify.com/playlist/..."
                              className="h-12 bg-zinc-900 border-zinc-800 focus:border-[#1DB954]/50 focus:ring-[#1DB954]/20 pr-10"
                              value={importUrl}
                              onChange={(e) => setImportUrl(e.target.value)}
                            />
                            {importUrl.includes('spotify.com/playlist/') && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 px-1">
                            Make sure the playlist is set to <span className="text-zinc-300">Public</span> on Spotify.
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 p-4 space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">How to get the link</h4>
                          <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                              <p className="text-xs text-zinc-300">1. Open Spotify playlist</p>
                              <p className="text-xs text-zinc-300">2. Click <span className="font-bold">...</span> → <span className="font-bold">Share</span></p>
                              <p className="text-xs text-zinc-300">3. Select <span className="font-bold">Copy link to playlist</span></p>
                            </div>
                            <div className="w-px bg-zinc-800" />
                            <div className="flex-1 flex items-center justify-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[11px] text-[#1DB954] hover:text-[#1DB954] hover:bg-[#1DB954]/10"
                                onClick={async () => {
                                  try {
                                    const text = await navigator.clipboard.readText();
                                    if (text.includes('spotify.com')) setImportUrl(text);
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
                      
                      <DialogFooter className="p-6 bg-zinc-900/30 border-t border-zinc-800/50">
                        <Button 
                          className="w-full h-11 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold transition-all shadow-lg shadow-[#1DB954]/10"
                          onClick={handleImportPlaylist} 
                          disabled={isImporting || !importUrl.includes('spotify.com/playlist/')}
                        >
                          Import Playlist
                        </Button>
                      </DialogFooter>
                    </>
                  )}

                  {importStage === 1 && (
                    <div className="p-10 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full border-2 border-zinc-800 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-[#1DB954] animate-spin" />
                        </div>
                        <div className="absolute -bottom-2 -right-2">
                           <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                              <Music className="w-4 h-4 text-zinc-400" />
                           </div>
                        </div>
                      </div>
                      
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-bold text-white">Importing your music</h3>
                        <p className="text-sm text-zinc-400 animate-pulse">{importMessage}</p>
                      </div>
                      
                      <div className="w-full max-w-[240px] h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1DB954] animate-progress" />
                      </div>
                      
                      <p className="text-[10px] text-zinc-500 text-center max-w-[280px]">
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
                        <h3 className="text-xl font-bold text-white">Import Successful!</h3>
                        <p className="text-sm text-zinc-400">Your playlist has been added to your library.</p>
                      </div>
                      
                      <p className="text-xs text-zinc-500">Refreshing your library...</p>
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
        <div className="flex flex-1 flex-col gap-8 p-6 pb-32 md:pb-24">

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist._id}
                  playlist={playlist}
                  onClick={() => router.push(`/music/playlists/${playlist._id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
