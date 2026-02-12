"use client";

import { useSession, signOut } from "next-auth/react";
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

  const likedSongsCount = getLikedCount();

  // Filter for playlists that are likely created by the user (assuming isUserPlaylist flag or ownership logic)
  const userPlaylists = likedPlaylists?.filter(p => p.owner === session?.user?.name || p.isUserPlaylist) || [];

  const loading = status === "loading" || loadingPlaylists || loadingSongs;

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
                    {userPlaylists.length > 0 && (
                      <>
                        <span>{userPlaylists.length} Public Playlists</span>
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

              {/* Public Playlists */}
              <section>
                <h2 className="text-2xl font-bold mb-2">Public Playlists</h2>
                {userPlaylists.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {userPlaylists.map((playlist) => (
                      <div
                        key={playlist.playlistId}
                        onClick={() => router.push(`/music/playlists/${playlist.playlistId}`)}
                        className="group md:p-3 rounded-md bg-card/40 md:hover:bg-zinc-800/60 transition-all duration-300 cursor-pointer"
                      >
                        <div className="aspect-square w-full relative mb-4 shadow-lg rounded-md overflow-hidden bg-zinc-900">
                          {playlist.collageImages && playlist.isCollage ? (
                            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                              {playlist.collageImages.slice(0, 4).map((img, i) => (
                                <img key={i} src={img} className="w-full h-full object-cover" alt="" />
                              ))}
                            </div>
                          ) : (
                            playlist.image ? (
                              <img
                                src={Array.isArray(playlist.image) ? (playlist.image.find(i => i.quality === '500x500')?.url || playlist.image[0]?.url) : playlist.image}
                                alt={playlist.playlistName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                <Music className="w-12 h-12 text-zinc-600" />
                              </div>
                            )
                          )}
                        </div>
                        <h3 className="md:font-bold truncate text-white mb-1 group-hover:underline decoration-1 underline-offset-2 text-sm md:text-base">{playlist.playlistName}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">By {playlist.owner || session?.user?.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-zinc-800 rounded-lg">
                    <Disc className="w-12 h-12 mb-4 opacity-50" />
                    <p>No public playlists yet.</p>
                    <Button variant="link" onClick={() => router.push('/music/playlists')} className="text-white">Create one</Button>
                  </div>
                )}
              </section>
            </div>
          </div>

        )}
      </SidebarInset>
    </SidebarProvider >
  );
}