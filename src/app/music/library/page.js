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
import { Heart, Music, Disc, User, ChevronRight, Play, Plus } from "lucide-react"
import { useLikedSongs } from "@/hooks/useLikedSongs"
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists"
import { useLikedAlbums } from "@/hooks/useLikedAlbums"
import { useLikedArtists } from "@/hooks/useLikedArtists"

export default function LibraryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);

  // Use existing hooks for liked content with fallbacks
  const { likedSongs, loading: likedSongsLoading } = useLikedSongs(session?.user?.id) || { likedSongs: [], loading: false };
  const { likedPlaylists, loading: likedPlaylistsLoading } = useLikedPlaylists(session?.user?.id) || { likedPlaylists: [], loading: false };
  const { likedAlbums, loading: likedAlbumsLoading } = useLikedAlbums(session?.user?.id) || { likedAlbums: [], loading: false };
  const { likedArtists, loading: likedArtistsLoading } = useLikedArtists(session?.user?.id) || { likedArtists: [], loading: false };

  // Fetch user's own playlists
  useEffect(() => {
    const fetchUserPlaylists = async () => {
      if (!session?.user?.id) {
        setLoadingPlaylists(false);
        return;
      }

      try {
        const response = await fetch('/api/playlists');
        const result = await response.json();

        if (result.success) {
          setUserPlaylists(result.data);
        }
      } catch (error) {
        console.error('Error fetching user playlists:', error);
      } finally {
        setLoadingPlaylists(false);
      }
    };

    fetchUserPlaylists();
  }, [session]);

  const libraryItems = [
    {
      id: 'liked-songs',
      title: 'Liked Songs',
      subtitle: `${likedSongs?.length || 0} songs`,
      icon: Heart,
      iconBg: 'linear-gradient(135deg, rgb(147, 51, 234), rgba(147, 51, 234, 0.8))',
      iconColor: 'white',
      href: '/music/favorites',
      loading: likedSongsLoading
    },
    {
      id: 'user-playlists',
      title: 'Made by You',
      subtitle: `${userPlaylists?.length || 0} playlists`,
      icon: Music,
      iconBg: 'linear-gradient(135deg, rgb(34, 197, 94), rgba(34, 197, 94, 0.8))',
      iconColor: 'white',
      href: '/music/playlists',
      loading: loadingPlaylists
    },
    {
      id: 'liked-playlists',
      title: 'Liked Playlists',
      subtitle: `${likedPlaylists?.length || 0} playlists`,
      icon: Music,
      iconBg: 'linear-gradient(135deg, rgb(59, 130, 246), rgba(59, 130, 246, 0.8))',
      iconColor: 'white',
      href: '/music/library/playlists',
      loading: likedPlaylistsLoading
    },
    {
      id: 'liked-albums',
      title: 'Liked Albums',
      subtitle: `${likedAlbums?.length || 0} albums`,
      icon: Disc,
      iconBg: 'linear-gradient(135deg, rgb(239, 68, 68), rgba(239, 68, 68, 0.8))',
      iconColor: 'white',
      href: '/music/library/albums',
      loading: likedAlbumsLoading
    },
    {
      id: 'liked-artists',
      title: 'Following',
      subtitle: `${likedArtists?.length || 0} artists`,
      icon: User,
      iconBg: 'linear-gradient(135deg, rgb(168, 85, 247), rgba(168, 85, 247, 0.8))',
      iconColor: 'white',
      href: '/music/library/artists',
      loading: likedArtistsLoading
    }
  ];

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music">
                      Home
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Your Library</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Quick Create Playlist Button */}
            <Button
              size="sm"
              onClick={() => router.push('/music/playlists')}
              className="text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 h-8 sm:h-9"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Create</span>
              <span className="xs:hidden">+</span>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col pb-20 md:pb-6">
          <div className="p-4 md:p-6">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Your Library</h1>
              <p className="text-muted-foreground">Your music collection in one place</p>
            </div>

            <div className="space-y-2">
              {libraryItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                >
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow"
                    style={{ background: item.iconBg }}
                  >
                    <item.icon
                      className="w-6 h-6"
                      style={{ color: item.iconColor }}
                      fill={item.id === 'liked-songs' ? 'currentColor' : 'none'}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.loading ? 'Loading...' : item.subtitle}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              ))}
            </div>

            {/* Recently Played Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Recently Played</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/music/library/recently-played')}
                >
                  Show all
                </Button>
              </div>

              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Your recently played music will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}