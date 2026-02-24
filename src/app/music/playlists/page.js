"use client";

import { useState, useEffect } from "react";
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
  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  console.log("Playlists received from API:", playlists.length, playlists);

  const handleCreatePlaylist = async () => {
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
        // Redirect to the new playlist page
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
  };

  const handleImportPlaylist = async () => {
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
        toast.success(`Playlist imported successfully! Added ${result.data.songIds.length} songs.`);
        setShowImportDialog(false);
        setImportUrl("");
        // Refresh playlists
        // We can just add the new playlist to the state to avoid full refetch
        // But for consistency we might want to refetch or manually construct it
        // The API returns the new playlist object (result.data)
        // Ideally we should process the playlist to fetch covers if needed, 
        // but likely covers won't be ready immediately without song fetch.
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to import playlist");
      }
    } catch (error) {
      console.error('Error importing playlist:', error);
      toast.error("Failed to import playlist. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  // Generate playlist cover based on songs (same logic as detail page)
  const getPlaylistCover = (playlist) => {
    // If playlist has an explicit image (e.g. from Spotify import), use it
    if (playlist.image) {
      return { type: 'single', src: playlist.image };
    }

    const songs = playlist.songs || [];

    if (!songs || songs.length === 0) {
      return { type: 'default', src: '/def playlist image.jpg' };
    }

    if (songs.length >= 1 && songs.length <= 3) {
      // Use first song's cover image
      const firstSong = songs[0];
      const imageUrl = firstSong.image?.find(img => img.quality === '500x500')?.url ||
        firstSong.image?.find(img => img.quality === '150x150')?.url ||
        firstSong.image?.[firstSong.image.length - 1]?.url;

      return {
        type: 'single',
        src: imageUrl || '/def playlist image.jpg',
        song: firstSong
      };
    }

    if (songs.length >= 4) {
      // Create 4-image collage from first 4 songs
      const firstFourSongs = songs.slice(0, 4);
      const images = firstFourSongs.map(song => {
        return song.image?.find(img => img.quality === '150x150')?.url ||
          song.image?.find(img => img.quality === '500x500')?.url ||
          song.image?.[song.image.length - 1]?.url ||
          '/def playlist image.jpg';
      });

      return {
        type: 'collage',
        images: images,
        songs: firstFourSongs
      };
    }

    return { type: 'default', src: '/def playlist image.jpg' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Download className="h-4 w-4" />
                    <span className="">Import Spotify</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Import from Spotify</DialogTitle>
                    <DialogDescription>
                      Paste the link to a public Spotify playlist to import it into Jammify.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="url">Playlist URL</Label>
                      <Input
                        id="url"
                        placeholder="https://open.spotify.com/playlist/..."
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleImportPlaylist} disabled={isImporting}>
                      {isImporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        "Import Playlist"
                      )}
                    </Button>
                  </DialogFooter>
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
                <div
                  key={playlist._id}
                  onClick={() => router.push(`/music/playlists/${playlist._id}`)}
                  className="group cursor-pointer space-y-3 transition-all"
                >
                  <div className="aspect-square w-full relative overflow-hidden rounded-md shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.02]">
                    {(() => {
                      const cover = getPlaylistCover(playlist);

                      if (cover.type === 'single') {
                        return (
                          <img
                            src={cover.src}
                            alt={playlist.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              e.target.src = '/def playlist image.jpg';
                            }}
                          />
                        );
                      } else if (cover.type === 'collage') {
                        return (
                          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                            {cover.images.map((imageSrc, index) => (
                              <div key={index} className="w-full h-full overflow-hidden border-[0.5px] border-black/10">
                                <img
                                  src={imageSrc}
                                  alt={`Song ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = '/def playlist image.jpg';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                            <Music className="w-12 h-12 text-zinc-700" />
                          </div>
                        );
                      }
                    })()}

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {playlist.isPublic ? (
                        <Badge variant="secondary" className="h-6 px-2 text-[10px] bg-black/50 text-white backdrop-blur-md hover:bg-black/70 border-none">
                          <Unlock className="w-3 h-3 mr-1" /> Public
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="h-6 px-2 text-[10px] bg-black/50 text-white backdrop-blur-md hover:bg-black/70 border-none">
                          <Lock className="w-3 h-3 mr-1" /> Private
                        </Badge>
                      )}
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
              ))}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}