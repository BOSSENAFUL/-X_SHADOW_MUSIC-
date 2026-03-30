"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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

// Map slug → { query, title, description }
const GENRE_CONFIG = {
  party: {
    query: "english%20party",
    title: "English Party",
    description: "The best English party anthems and high-energy playlists",
  },
  "hip-hop": {
    query: "english%20hip-hop",
    title: "English Hip-Hop",
    description: "Top English Hip-Hop tracks, rap anthems and street vibes",
  },
  dance: {
    query: "english%20dance",
    title: "English Dance",
    description: "Floor-filling English dance tracks and EDM playlists",
  },
  rock: {
    query: "english%20rock",
    title: "English Rock",
    description: "Classic and modern English rock playlists for every mood",
  },
  metal: {
    query: "english%20metal",
    title: "English Metal",
    description: "Heavy English metal tracks and headbanging playlists",
  },
};

const ITEMS_PER_BATCH = 24;

export default function GenrePage() {
  const router = useRouter();
  const { slug } = useParams();

  const config = GENRE_CONFIG[slug] || {
    query: `english%20${slug}`,
    title: `English ${slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Genre"}`,
    description: "Discover English music playlists",
  };

  const [allPlaylists, setAllPlaylists] = useState([]);
  const [displayedPlaylists, setDisplayedPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  const cacheKey = `genre_${slug}_AllData`;
  const cacheDisplayKey = `genre_${slug}_DisplayedHits`;
  const cacheIndexKey = `genre_${slug}_CurrentIndex`;
  const cacheHasMoreKey = `genre_${slug}_HasMore`;
  const cacheScrollKey = `genre_${slug}_ScrollPosition`;

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    if (displayedPlaylists.length > 0) {
      sessionStorage.setItem(cacheDisplayKey, JSON.stringify(displayedPlaylists));
      sessionStorage.setItem(cacheIndexKey, currentIndex.toString());
      sessionStorage.setItem(cacheHasMoreKey, hasMore.toString());
    }
  }, [displayedPlaylists, currentIndex, hasMore, cacheDisplayKey, cacheIndexKey, cacheHasMoreKey]);

  // Restore scroll position after content loads
  useEffect(() => {
    if (!loading && displayedPlaylists.length > 0 && scrollContainerRef.current) {
      const savedScrollPosition = sessionStorage.getItem(cacheScrollKey);
      if (savedScrollPosition) {
        scrollContainerRef.current.scrollTop = parseInt(savedScrollPosition);
        sessionStorage.removeItem(cacheScrollKey);
      }
    }
  }, [loading, displayedPlaylists.length, cacheScrollKey]);

  // Load more items
  const loadMoreItems = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextIndex = currentIndex + ITEMS_PER_BATCH;
    const nextBatch = allPlaylists.slice(currentIndex, nextIndex);
    setTimeout(() => {
      setDisplayedPlaylists((prev) => [...prev, ...nextBatch]);
      setCurrentIndex(nextIndex);
      setHasMore(nextIndex < allPlaylists.length);
      setLoadingMore(false);
    }, 300);
  };

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMoreItems();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentIndex, allPlaylists.length, loadingMore, hasMore]);

  // Fetch playlists
  useEffect(() => {
    if (!slug) return;
    const fetchPlaylists = async () => {
      try {
        setLoading(true);

        // Check saved state
        const savedDisplayed = sessionStorage.getItem(cacheDisplayKey);
        const savedIndex = sessionStorage.getItem(cacheIndexKey);
        const savedAll = sessionStorage.getItem(cacheKey);

        if (savedDisplayed && savedIndex && savedAll) {
          try {
            setAllPlaylists(JSON.parse(savedAll));
            setDisplayedPlaylists(JSON.parse(savedDisplayed));
            setCurrentIndex(parseInt(savedIndex));
            setHasMore(sessionStorage.getItem(cacheHasMoreKey) === "true");
            setLoading(false);
            return;
          } catch {
            // fall through to fresh fetch
          }
        }

        // Fresh fetch — get total first then all pages
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const initialRes = await fetch(
          `${apiUrl}/api/search/playlists?query=${config.query}&page=0&limit=1`
        );
        const initialData = await initialRes.json();

        if (initialData.success && initialData.data.total) {
          const total = initialData.data.total;
          const limit = 40;
          const totalPages = Math.ceil(total / limit);
          const promises = [];

          for (let page = 0; page < totalPages; page++) {
            promises.push(
              fetch(
                `${apiUrl}/api/search/playlists?query=${config.query}&page=${page}&limit=${limit}`
              ).then((r) => r.json())
            );
          }

          const responses = await Promise.all(promises);
          let all = [];
          responses.forEach((data) => {
            if (data.success && data.data.results) {
              all = [...all, ...data.data.results];
            }
          });

          // Deduplicate
          const unique = all.filter(
            (p, i, self) => i === self.findIndex((x) => x.id === p.id)
          );

          setAllPlaylists(unique);
          sessionStorage.setItem(cacheKey, JSON.stringify(unique));

          const initialBatch = unique.slice(0, ITEMS_PER_BATCH);
          setDisplayedPlaylists(initialBatch);
          setCurrentIndex(ITEMS_PER_BATCH);
          setHasMore(ITEMS_PER_BATCH < unique.length);
        }
      } catch (error) {
        console.error("Error fetching genre playlists:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [slug]);

  const handleCardClick = (playlist) => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem(
        cacheScrollKey,
        scrollContainerRef.current.scrollTop.toString()
      );
    }
    router.push(`/music/playlist/${playlist.id}?songCount=${playlist.songCount || 50}`);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ml-0 overflow-x-hidden h-svh relative flex flex-col">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music/discover">Discover</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{config.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-x-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">
                  {config.title}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base line-clamp-2">
                  {config.description}
                </p>
              </div>
              {!loading && allPlaylists.length > 0 && (
                <div className="text-right shrink-0 mt-2 sm:mt-0 pt-1">
                  <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
                    <span className="text-foreground font-bold block sm:inline sm:mr-1 text-xs sm:text-sm">
                      {allPlaylists.length}
                    </span>
                    playlists
                  </p>
                </div>
              )}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 min-[1800px]:grid-cols-11 min-[2100px]:grid-cols-12 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                    <div className="bg-muted animate-pulse h-4 rounded" />
                    <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 min-[1800px]:grid-cols-11 min-[2100px]:grid-cols-12 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                  {displayedPlaylists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={{ ...playlist, source: "jiosaavn" }}
                      onClick={handleCardClick}
                    />
                  ))}
                </div>

                {loadingMore && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 min-[1800px]:grid-cols-11 min-[2100px]:grid-cols-12 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8 mt-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={`loading-${i}`} className="space-y-3">
                        <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                        <div className="bg-muted animate-pulse h-4 rounded" />
                        <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                )}

                {!loadingMore && hasMore && (
                  <div className="text-center mt-8">
                    <Button onClick={loadMoreItems} variant="outline" size="lg">
                      Load More Playlists
                    </Button>
                  </div>
                )}

                {!hasMore && displayedPlaylists.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      You've reached the end! Showing all {displayedPlaylists.length} playlists.
                    </p>
                  </div>
                )}
              </>
            )}

            {!loading && allPlaylists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No playlists found for this genre.</p>
              </div>
            )}

            <div className="pb-24" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
