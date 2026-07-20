/* eslint-disable @next/next/no-img-element */
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
import { Music, Disc, LogOut, Edit2, MessageCircle, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/theme-selector";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  const { likedPlaylists, loading: loadingPlaylists } = useLikedPlaylists(userId);
  const { getLikedCount, loading: loadingSongs } = useLikedSongs(userId);

  const [createdPlaylists, setCreatedPlaylists] = useState([]);
  const [loadingCreated, setLoadingCreated] = useState(true);
  const [dominantColor, setDominantColor] = useState("rgb(40, 40, 40)");

  const extractDominantColor = (imageUrl) => {
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

          for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const brightness = (r + g + b) / 3;
            if (brightness < 40 || brightness > 220) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;

            if (saturation < 30) continue;

            const color = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
            colorCounts[color] = (colorCounts[color] || 0) + (1 + saturation / 50);
          }

          let domColor = '40,40,40';
          let maxWeight = 0;

          for (const [color, weight] of Object.entries(colorCounts)) {
            if (weight > maxWeight) {
              maxWeight = weight;
              domColor = color;
            }
          }

          resolve(`rgb(${domColor})`);
        } catch (error) {
          console.error('Error extracting color:', error);
          resolve('rgb(40, 40, 40)');
        }
      };

      img.onerror = () => {
        resolve('rgb(40, 40, 40)');
      };

      img.src = finalUrl;
    });
  };

  useEffect(() => {
    if (session?.user?.image) {
      extractDominantColor(session.user.image).then((color) => {
        setDominantColor(color);
      });
    }
  }, [session?.user?.image]);

  useEffect(() => {
    if (!userId) {
      if (status === 'unauthenticated') setLoadingCreated(false);
      return;
    }

    const fetchCreatedPlaylists = async () => {
      // Check session cache first
      const cacheKey = `profile_created_playlists_${userId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setCreatedPlaylists(JSON.parse(cached));
        setLoadingCreated(false);
        return;
      }

      try {
        const res = await fetch('/api/playlists');
        const data = await res.json();
        if (data.success) {
          let playlists = data.data.map((p) => ({
            ...p,
            isUserPlaylist: true,
          }));

          // Build collages for playlists that already have an image stored in DB
          // (the create/edit playlist flow saves image in MongoDB)
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
          const needsCovers = playlists.filter(
            (p) => !p.image && p.songIds?.length > 0
          );

          if (needsCovers.length > 0) {
            const allSongIds = new Set();
            needsCovers.forEach((p) =>
              p.songIds.slice(0, 4).forEach((id) => allSongIds.add(id))
            );

            try {
              const idsArray = Array.from(allSongIds);
              const songRes = await fetch(
                `${apiUrl}/api/songs?ids=${idsArray.join(',')}`,
                { signal: AbortSignal.timeout(10000) }
              );
              const songData = await songRes.json();
              const imageCache = {};

              if (songData.success && songData.data) {
                songData.data.forEach((song) => {
                  if (song?.image) {
                    imageCache[song.id] =
                      song.image.find((i) => i.quality === '150x150')?.url ||
                      song.image[0]?.url;
                  }
                });
              }

              playlists = playlists.map((p) => {
                if (p.image || !p.songIds?.length) return p;
                const images = p.songIds
                  .slice(0, 4)
                  .map((id) => imageCache[id])
                  .filter(Boolean);
                if (images.length > 0) {
                  return {
                    ...p,
                    collageImages: images.length >= 4 ? images : null,
                    isCollage: images.length >= 4,
                    image: images.length < 4 ? images[0] : null,
                  };
                }
                return p;
              });
            } catch (e) {
              // Timeout or fetch error — proceed without collages
            }
          }

          setCreatedPlaylists(playlists);
          sessionStorage.setItem(cacheKey, JSON.stringify(playlists));
        }
      } catch (error) {
        console.error("Failed to fetch created playlists", error);
      } finally {
        setLoadingCreated(false);
      }
    };

    fetchCreatedPlaylists();
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

  const showSkeleton = status === "loading";

  const ProfileSkeleton = () => (
    <div className="flex flex-col h-full">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 pb-8 bg-gradient-to-b from-muted/30 to-background pt-20">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
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
    if (playlist.isCollage && playlist.collageImages?.length >= 4) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
          {playlist.collageImages.slice(0, 4).map((src, idx) => (
            <img
              key={idx}
              src={src}
              className="w-full h-full object-cover"
              alt=""
              onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
            />
          ))}
        </div>
      );
    }

    const src = getImageSrc(playlist.image) || (playlist.collageImages?.[0]);
    if (src) {
      return (
        <img
          src={src}
          className="w-full h-full object-cover"
          alt={playlist.name || playlist.playlistName}
          onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
        />
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Music className="w-8 h-8 text-muted-foreground/50" />
      </div>
    );
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/music/settings")}
            className="h-9 w-9 rounded-full"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </header>

        {status === "loading" ? (
          <ProfileSkeleton />
        ) : (
          <div className="flex-1 overflow-y-auto pb-24">
            <div
              className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 pb-8 pt-20 transition-all duration-1000"
              style={{
                background: `linear-gradient(to bottom, 
                  ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.45)')} 0%, 
                  ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.15)')} 60%, 
                  var(--background) 100%)`
              }}
            >
              <Avatar className="w-32 h-32 md:w-52 md:h-52 shadow-2xl">
                <AvatarImage src={session?.user?.image} alt={session?.user?.name} className="object-cover" />
                <AvatarFallback className="text-6xl md:text-8xl font-black bg-muted text-muted-foreground">
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

                <div className="mt-2 flex flex-wrap gap-3">
                  {session?.user?.role === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full font-semibold tracking-wide px-5 cursor-pointer gap-2 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                      onClick={() => router.push("/music/admin")}
                    >
                      <Shield className="w-4 h-4 text-amber-500" />
                      Admin Panel
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full font-semibold tracking-wide px-5 cursor-pointer gap-2"
                    onClick={() => router.push("/music/settings")}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full font-semibold tracking-wide px-5 cursor-pointer gap-2"
                    onClick={() => router.push("/music/chat")}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat
                  </Button>
                  <ThemeSelector variant="outline" size="sm" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full font-semibold tracking-wide px-5 cursor-pointer"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                  >
                    Sign out
                  </Button>
                </div>
              </div>
            </div>

            <div className="px-6 py-6 space-y-8">

              {/* Created Playlists */}
              <section>
                <h2 className="text-2xl font-bold mb-4">Created Playlists</h2>
                {loadingCreated ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-3">
                        <Skeleton className="aspect-square w-full rounded-md" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : enrichedCreatedPlaylists.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                    {enrichedCreatedPlaylists.map((playlist) => (
                      <div
                        key={playlist._id || playlist.playlistId}
                        onClick={() => router.push(`/music/playlists/${playlist._id || playlist.playlistId}`)}
                        className="group md:p-3 rounded-md bg-card/40 md:hover:bg-accent transition-all duration-300 cursor-pointer"
                      >
                        <div className="aspect-square w-full relative mb-4 shadow-lg rounded-md overflow-hidden bg-muted">
                          <PlaylistImage playlist={playlist} />
                        </div>
                        <h3 className="md:font-bold truncate text-foreground mb-1 decoration-1 text-sm md:text-base">{playlist.name || playlist.playlistName}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">By {playlist.owner || session?.user?.name || 'You'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                    <Disc className="w-12 h-12 mb-4 opacity-50" />
                    <p>No created playlists yet.</p>
                    <Button variant="link" onClick={() => router.push('/music/playlists')} className="text-primary">Create one</Button>
                  </div>
                )}
              </section>

              {/* Liked Playlists */}
              {(loadingPlaylists || uniqueLikedPlaylists.length > 0) && (
                <section>
                  <h2 className="text-2xl font-bold mb-4">Liked Playlists</h2>
                  {loadingPlaylists ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                          <Skeleton className="aspect-square w-full rounded-md" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                      {uniqueLikedPlaylists.map((playlist) => (
                        <div
                          key={playlist.playlistId}
                          onClick={() => router.push(playlist.isUserPlaylist ? `/music/playlists/${playlist.playlistId}` : `/music/playlist/${playlist.playlistId}`)}
                          className="group md:p-3 rounded-md bg-card/40 md:hover:bg-accent transition-all duration-300 cursor-pointer"
                        >
                          <div className="aspect-square w-full relative mb-4 shadow-lg rounded-md overflow-hidden bg-muted">
                            <PlaylistImage playlist={playlist} />
                          </div>
                          <h3 className="md:font-bold truncate text-foreground mb-1 decoration-1 text-sm md:text-base">{playlist.playlistName}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">By {playlist.owner || playlist.subtitle || 'Jammify'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

        )}
      </SidebarInset>
    </SidebarProvider >
  );
}
