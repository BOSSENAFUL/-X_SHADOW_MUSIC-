"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useRouter } from "next/navigation";
import { Music, Disc, LogOut, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const { likedPlaylists, loading: loadingPlaylists } = useLikedPlaylists(userId);
  const { getLikedCount, loading: loadingSongs } = useLikedSongs(userId);

  const [createdPlaylists, setCreatedPlaylists] = useState([]);
  const [loadingCreated, setLoadingCreated] = useState(true);

  useEffect(() => {
    if (userId) {
      const fetchCreatedPlaylists = async () => {
        try {
          const res = await fetch('/api/playlists');
          const data = await res.json();
          if (data.success) {
            // Fetch song data for each playlist to generate covers/collages
            const playlistsWithCovers = await Promise.all(
              data.data.map(async (playlist) => {
                // If we already have image data from somewhere else, skip
                if (playlist.image || playlist.collageImages) return { ...playlist, isUserPlaylist: true };

                if (playlist.songIds && playlist.songIds.length > 0) {
                  try {
                    const songsToFetch = playlist.songIds.slice(0, 4);
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

                    const songImages = await Promise.all(songsToFetch.map(async (songId) => {
                      try {
                        const response = await fetch(`${apiUrl}/api/songs?ids=${songId}`);
                        const songData = await response.json();
                        if (songData.success && songData.data?.[0]?.image) {
                          const img = songData.data[0].image;
                          return img.find(i => i.quality === '150x150')?.url ||
                            img.find(i => i.quality === '500x500')?.url ||
                            img[0]?.url;
                        }
                      } catch (error) {
                        return null;
                      }
                      return null;
                    }));

                    const validImages = songImages.filter(Boolean);
                    if (validImages.length > 0) {
                      return {
                        ...playlist,
                        collageImages: validImages,
                        isCollage: validImages.length >= 4,
                        image: validImages.length < 4 ? validImages[0] : null,
                        isUserPlaylist: true
                      };
                    }
                  } catch (error) {
                    console.error('Error fetching songs for playlist enrichment:', error);
                  }
                }
                return { ...playlist, isUserPlaylist: true };
              })
            );
            setCreatedPlaylists(playlistsWithCovers);
          }
        } catch (error) {
          console.error("Failed to fetch created playlists", error);
        } finally {
          setLoadingCreated(false);
        }
      };

      fetchCreatedPlaylists();
    } else if (status === 'unauthenticated') {
      setLoadingCreated(false);
    }
  }, [userId, status]);

  const likedSongsCount = getLikedCount();

  // Merge created playlists with liked playlists data to get images if available
  const enrichedCreatedPlaylists = createdPlaylists.map(cp => {
    const matched = likedPlaylists?.find(lp => lp.playlistId === cp._id);
    // Prefer data from likedPlaylists as it's more comprehensive (handled by hook)
    return matched ? { ...cp, ...matched, isUserPlaylist: true } : cp;
  });

  // Filter liked playlists to exclude those already shown in Created Playlists
  const uniqueLikedPlaylists = likedPlaylists?.filter(lp => !createdPlaylists.some(cp => cp._id === lp.playlistId)) || [];

  const loading = status === "loading" || loadingPlaylists || loadingSongs || loadingCreated;

  const ProfileSkeleton = () => (
    <div className="flex flex-col h-full">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 pb-8 bg-linear-to-b from-zinc-700/30 to-background pt-20">
        <Skeleton className="w-32 h-32 md:w-52 md:h-52 rounded-full shadow-2xl" />
        <div className="flex flex-col items-center md:items-start gap-4 w-full md:w-auto">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-64 md:h-20 md:w-96" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-md" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const getImageSrc = (image) => {
    if (!image) return null;
    if (Array.isArray(image)) {
      return image.find((img) => img.quality === "500x500")?.url || image[0]?.url;
    }
    return image;
  };

  const PlaylistImage = ({ playlist }) => {
    // Priority 1: Collage
    if (playlist.isCollage && playlist.collageImages && playlist.collageImages.length >= 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
          {playlist.collageImages.slice(0, 4).map((src, idx) => (
            <img key={idx} src={src} className="w-full h-full object-cover" alt="" />
          ))}
        </div>
      );
    }

    // Priority 2: Single image (from array or string)
    const src = getImageSrc(playlist.image) || (playlist.collageImages?.[0]);
    if (src) {
      return <img src={src} className="w-full h-full object-cover" alt={playlist.name || playlist.playlistName} />;
    }

    // Priority 3: Fallback
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
        <Music className="w-12 h-12" />
      </div>
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">
                    Music
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Profile</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {loading ? (
          <ProfileSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto pb-24">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 pb-8 bg-linear-to-b from-zinc-700/50 via-zinc-800/20 to-background pt-20">
              <Avatar className="w-32 h-32 md:w-52 md:h-52 shadow-2xl shadow-black/50">
                <AvatarImage src={session?.user?.image} alt={session?.user?.name} className="object-cover" />
                <AvatarFallback className="text-6xl md:text-8xl font-black bg-zinc-800 text-zinc-400">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-center md:items-start gap-4 w-full">
                <div className="flex flex-col items-center md:items-start gap-2">
                  <span className="uppercase text-xs font-bold tracking-wider hidden md:block">Profile</span>
                  <h1 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-tighter text-center md:text-left">
                    {session?.user?.name || 'User'}
                  </h1>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-sm text-foreground/90 font-medium">
                    {enrichedCreatedPlaylists.length > 0 && (
                      <>
                        <span>{enrichedCreatedPlaylists.length} Created Playlists</span>
                        <span className="text-muted-foreground">•</span>
                      </>
                    )}
                    <span>{likedSongsCount} Liked Songs</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{session?.user?.email}</span>
                  </div>
                </div>

                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-zinc-700 bg-black/20 hover:bg-zinc-800 hover:text-white font-semibold tracking-wide px-6"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    Sign out
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-6 py-6 space-y-8">

              {/* Created Playlists */}
              <section>
                <h2 className="text-2xl font-bold mb-4">Created Playlists</h2>
                {enrichedCreatedPlaylists.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {enrichedCreatedPlaylists.map((playlist) => (
                      <div
                        key={playlist._id || playlist.playlistId}
                        onClick={() => router.push(`/music/playlists/${playlist._id || playlist.playlistId}`)}
                        className="group md:p-3 rounded-md bg-card/40 md:hover:bg-zinc-800/60 transition-all duration-300 cursor-pointer"
                      >
                        <div className="aspect-square w-full relative mb-4 shadow-lg rounded-md overflow-hidden bg-zinc-900">
                          <PlaylistImage playlist={playlist} />
                        </div>
                        <h3 className="md:font-bold truncate text-white mb-1 group-hover:underline decoration-1 underline-offset-2 text-sm md:text-base">{playlist.name || playlist.playlistName}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">By {playlist.owner || session?.user?.name || 'You'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-zinc-800 rounded-lg">
                    <Disc className="w-12 h-12 mb-4 opacity-50" />
                    <p>No created playlists yet.</p>
                    <Button variant="link" onClick={() => router.push('/music/playlists')} className="text-white">Create one</Button>
                  </div>
                )}
              </section>

              {/* Liked Playlists */}
              {uniqueLikedPlaylists.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-4">Liked Playlists</h2>
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {uniqueLikedPlaylists.map((playlist) => (
                      <div
                        key={playlist.playlistId}
                        onClick={() => router.push(playlist.isUserPlaylist ? `/music/playlists/${playlist.playlistId}` : `/music/playlist/${playlist.playlistId}`)}
                        className="group md:p-3 rounded-md bg-card/40 md:hover:bg-zinc-800/60 transition-all duration-300 cursor-pointer"
                      >
                        <div className="aspect-square w-full relative mb-4 shadow-lg rounded-md overflow-hidden bg-zinc-900">
                          <PlaylistImage playlist={playlist} />
                        </div>
                        <h3 className="md:font-bold truncate text-white mb-1 group-hover:underline decoration-1 underline-offset-2 text-sm md:text-base">{playlist.playlistName}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">By {playlist.owner || playlist.subtitle || 'Jammify'}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

        )}
      </SidebarInset>
    </SidebarProvider >
  );
}