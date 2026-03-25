"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { PlaylistCard } from "@/components/music/playlist-card";
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
import { ArrowLeft } from "lucide-react";

export default function PlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);

  // Save results to sessionStorage
  useEffect(() => {
    if (playlists.length > 0) {
      sessionStorage.setItem('trendingPlaylistsAllData', JSON.stringify(playlists));
    }
  }, [playlists]);

  // Restore scroll position
  useEffect(() => {
    if (!loading && playlists.length > 0 && scrollContainerRef.current) {
      const savedPosition = sessionStorage.getItem('trendingPlaylistsScrollPosition');
      if (savedPosition) {
        scrollContainerRef.current.scrollTop = parseInt(savedPosition);
        sessionStorage.removeItem('trendingPlaylistsScrollPosition');
      }
    }
  }, [loading, playlists.length]);

  useEffect(() => {
    const fetchAllPlaylists = async () => {
      try {
        setLoading(true);

        // Check for saved all data first
        const savedAllData = sessionStorage.getItem('trendingPlaylistsAllData');
        if (savedAllData) {
          try {
            const parsedAllData = JSON.parse(savedAllData);
            setPlaylists(parsedAllData);
            setLoading(false);
            return;
          } catch (error) {
            console.error('Error restoring saved state:', error);
          }
        }

        // Fetch first page to get total count
        const initialResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=trending&page=0&limit=1`);
        const initialData = await initialResponse.json();

        if (initialData.success && initialData.data.total) {
          const total = initialData.data.total;
          const limit = 40; // API limit per request
          const totalPages = Math.ceil(total / limit);

          let allPlaylists = [];
          const promises = [];

          for (let page = 0; page < totalPages; page++) {
            promises.push(
              fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=trending&page=${page}&limit=${limit}`)
                .then(res => res.json())
            );
          }

          const responses = await Promise.all(promises);

          responses.forEach(data => {
            if (data.success && data.data.results) {
              allPlaylists = [...allPlaylists, ...data.data.results];
            }
          });

          // Unique results by ID
          const uniquePlaylists = allPlaylists.filter((playlist, index, self) =>
            index === self.findIndex(p => p.id === playlist.id)
          );

          setPlaylists(uniquePlaylists);
        }
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPlaylists();
  }, []);

  const handleCardClick = (playlist) => {
    // Save scroll position from the actual scrollable div
    if (scrollContainerRef.current) {
      sessionStorage.setItem('trendingPlaylistsScrollPosition', scrollContainerRef.current.scrollTop.toString());
    }
    // Navigate to playlist detail page with songCount as query parameter
    router.push(`/music/playlist/${playlist.id}?songCount=${playlist.songCount || 50}`);
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ml-0 overflow-x-hidden h-svh relative flex flex-col">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">
                    Music
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music/discover">
                    Discover
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Playlists</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-x-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">Trending Playlists</h1>
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base line-clamp-2">
                  Discover the most popular and trending playlists right now
                </p>
              </div>
              {!loading && playlists.length > 0 && (
                <div className="text-right shrink-0 mt-2 sm:mt-0 pt-1">
                  <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
                    <span className="text-foreground font-bold block sm:inline sm:mr-1 text-xs sm:text-sm">{playlists.length}</span>
                    playlists
                  </p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 min-[1800px]:grid-cols-11 min-[2100px]:grid-cols-12 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                {Array.from({ length: 24 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                    <div className="bg-muted animate-pulse h-4 rounded" />
                    <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 min-[1800px]:grid-cols-11 min-[2100px]:grid-cols-12 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                {playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={{ ...playlist, source: 'jiosaavn' }}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            )}

            {!loading && playlists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No playlists found</p>
              </div>
            )}

            {/* Bottom padding to prevent content being hidden behind music player */}
            <div className="pb-24" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
