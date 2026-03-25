"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { PlaylistCard } from "@/components/music/playlist-card";
import { cn } from "@/lib/utils";

export default function CommunityPlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [scrollRestored, setScrollRestored] = useState(false);
  const scrollContainerRef = useRef(null);
  const loadingRef = useRef(null);
  const isInitialLoad = useRef(true);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('communityPlaylistsState');
    if (savedData) {
      try {
        const { playlists: savedPlaylists, page: savedPage, hasMore: savedHasMore, total: savedTotal } = JSON.parse(savedData);
        setPlaylists(savedPlaylists);
        setPage(savedPage);
        setHasMore(savedHasMore);
        setTotal(savedTotal);
        setLoading(false);
        isInitialLoad.current = false;
      } catch (e) {
        console.error("Failed to restore community playlists state:", e);
      }
    } else {
      // If no saved state, we don't need to wait for scroll restoration
      setScrollRestored(true);
    }
  }, []);

  // Restore scroll position
  useEffect(() => {
    if (!loading && playlists.length > 0 && scrollContainerRef.current && !scrollRestored) {
      const savedPosition = sessionStorage.getItem('communityPlaylistsScrollPosition');
      if (savedPosition) {
        // Use requestAnimationFrame for smoother and faster execution than setTimeout
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = parseInt(savedPosition);
            // Mark as restored so we can show the content
            setScrollRestored(true);
          }
        });
      } else {
        setScrollRestored(true);
      }
    }
  }, [loading, playlists.length, scrollRestored]);

  const fetchPlaylists = useCallback(async (pageNum, isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const res = await fetch(`/api/playlists/community?page=${pageNum}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch community playlists');
      const result = await res.json();

      if (result.success && result.data) {
        setPlaylists(prev => {
          const combined = isLoadMore ? [...prev, ...result.data] : result.data;
          // De-duplicate if necessary
          const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());

          // Save state to sessionStorage for back-navigation
          sessionStorage.setItem('communityPlaylistsState', JSON.stringify({
            playlists: unique,
            page: result.page,
            hasMore: result.hasMore,
            total: result.total
          }));

          return unique;
        });
        setPage(result.page);
        setHasMore(result.hasMore);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Error fetching community playlists:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isInitialLoad.current = false;
    }
  }, []);

  // Initial fetch only if no saved state
  useEffect(() => {
    if (isInitialLoad.current && !sessionStorage.getItem('communityPlaylistsState')) {
      fetchPlaylists(0);
    }
  }, [fetchPlaylists]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !isInitialLoad.current) {
          fetchPlaylists(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchPlaylists]);

  const handleCardClick = (playlist) => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem('communityPlaylistsScrollPosition', scrollContainerRef.current.scrollTop.toString());
    }
    router.push(`/music/playlists/${playlist.id}`);
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
                  <BreadcrumbPage>Community Playlists</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 transition-opacity duration-200",
            !scrollRestored ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
          onScroll={(e) => {
            if (!loading && scrollRestored) {
              sessionStorage.setItem('communityPlaylistsScrollPosition', e.currentTarget.scrollTop.toString());
            }
          }}
        >
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-x-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">Community Playlists</h1>
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base line-clamp-2">
                  Explore and enjoy playlists shared by the community
                </p>
              </div>
              {!loading && total > 0 && (
                <div className="text-right shrink-0 mt-2 sm:mt-0 pt-1">
                  <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
                    <span className="text-foreground font-bold block sm:inline sm:mr-1 text-xs sm:text-sm">{total}</span>
                    playlists
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 min-[1800px]:grid-cols-11 min-[2100px]:grid-cols-12 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onClick={handleCardClick}
                />
              ))}

              {loading && Array.from({ length: 24 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="space-y-3">
                  <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                  <div className="bg-muted animate-pulse h-4 rounded" />
                  <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                </div>
              ))}
            </div>

            {/* Infinite scroll loading indicator or end message */}
            <div ref={loadingRef} className="py-16 flex justify-center w-full">
              {loadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  
                </div>
              )}
              {!hasMore && playlists.length > 0 && (
                <p className="text-muted-foreground text-sm font-medium italic">
                  That's all the community playlists for now!
                </p>
              )}
            </div>

            {!loading && playlists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No community playlists found yet. Be the first to share one!</p>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
