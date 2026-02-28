"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft } from "lucide-react";
import { PlaylistCard } from "@/components/music/playlist-card";

export default function NewReleasesPage() {
  const router = useRouter();
  const [newReleases, setNewReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const scrollContainerRef = useRef(null);

  // Save results to sessionStorage
  useEffect(() => {
    if (newReleases.length > 0) {
      sessionStorage.setItem('newReleasesAllData', JSON.stringify(newReleases));
    }
  }, [newReleases]);

  // Restore scroll position
  useEffect(() => {
    if (!loading && newReleases.length > 0 && scrollContainerRef.current) {
      const savedPosition = sessionStorage.getItem('newReleasesScrollPosition');
      if (savedPosition) {
        scrollContainerRef.current.scrollTop = parseInt(savedPosition);
        // Clear it after one successful restoration to avoid it triggering on subsequent renders
        sessionStorage.removeItem('newReleasesScrollPosition');
      }
    }
  }, [loading, newReleases.length]);

  useEffect(() => {
    const fetchAllNewReleases = async () => {
      try {
        setLoading(true);

        // Fetch from multiple queries to ensure maximum coverage
        const queries = ["New Release", "New Releases"];
        let allPlaylists = [];

        const fetchForQuery = async (query) => {
          const initialResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=${encodeURIComponent(query)}&page=0&limit=1`);
          const initialData = await initialResponse.json();

          if (initialData.success && initialData.data.total) {
            const total = initialData.data.total;
            const limit = 50;
            const totalPages = Math.ceil(total / limit);
            const queryPromises = [];

            for (let page = 0; page < totalPages; page++) {
              queryPromises.push(
                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
                  .then(res => res.json())
              );
            }

            const responses = await Promise.all(queryPromises);
            responses.forEach(data => {
              if (data.success && data.data.results) {
                allPlaylists = [...allPlaylists, ...data.data.results];
              }
            });
          }
        };

        await Promise.all(queries.map(q => fetchForQuery(q)));

        // Unique results by ID
        const uniquePlaylists = allPlaylists.filter((playlist, index, self) =>
          index === self.findIndex(p => p.id === playlist.id)
        );

        setNewReleases(uniquePlaylists);
        sessionStorage.setItem('newReleasesAllData', JSON.stringify(uniquePlaylists));
      } catch (error) {
        console.error('Error fetching new releases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllNewReleases();
  }, []);

  const handlePlayClick = (item, type) => {
    setCurrentlyPlaying({ item, type });
    console.log(`Playing ${type}:`, item);
  };

  const handleCardClick = (playlist) => {
    // Save scroll position from the actual scrollable div
    if (scrollContainerRef.current) {
      sessionStorage.setItem('newReleasesScrollPosition', scrollContainerRef.current.scrollTop.toString());
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
                  <BreadcrumbPage>New Releases</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6"
        >
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">New Releases</h1>
                <p className="text-muted-foreground">
                  Discover the latest music releases and trending playlists
                </p>
              </div>
              {!loading && newReleases.length > 0 && (
                <p className="text-muted-foreground text-sm font-medium pb-1">
                  {newReleases.length} playlists
                </p>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {Array.from({ length: 24 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                    <div className="bg-muted animate-pulse h-4 rounded" />
                    <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {newReleases.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={{ ...playlist, source: 'jiosaavn' }}
                    onClick={handleCardClick}
                  />
                ))}
              </div>
            )}

            {!loading && newReleases.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No new releases found</p>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
