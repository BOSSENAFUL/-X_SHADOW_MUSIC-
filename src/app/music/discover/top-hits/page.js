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

export default function TopHitsPage() {
    const router = useRouter();
    const [topHits, setTopHits] = useState([]);
    const [displayedHits, setDisplayedHits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollContainerRef = useRef(null);

    const ITEMS_PER_BATCH = 24; // Load 24 items at a time

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        if (displayedHits.length > 0) {
            sessionStorage.setItem('topHitsDisplayedHits', JSON.stringify(displayedHits));
            sessionStorage.setItem('topHitsCurrentIndex', currentIndex.toString());
            sessionStorage.setItem('topHitsHasMore', hasMore.toString());
        }
    }, [displayedHits, currentIndex, hasMore]);

    // Restore scroll position after content loads
    useEffect(() => {
        if (!loading && displayedHits.length > 0 && scrollContainerRef.current) {
            const savedScrollPosition = sessionStorage.getItem('topHitsScrollPosition');
            if (savedScrollPosition) {
                scrollContainerRef.current.scrollTop = parseInt(savedScrollPosition);
                sessionStorage.removeItem('topHitsScrollPosition');
            }
        }
    }, [loading, displayedHits.length]);

    // Load more items function
    const loadMoreItems = () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        const nextIndex = currentIndex + ITEMS_PER_BATCH;
        const nextBatch = topHits.slice(currentIndex, nextIndex);

        setTimeout(() => {
            setDisplayedHits(prev => [...prev, ...nextBatch]);
            setCurrentIndex(nextIndex);
            setHasMore(nextIndex < topHits.length);
            setLoadingMore(false);
        }, 300); // Small delay for smooth loading
    };

    // Scroll event handler
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
                loadMoreItems();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentIndex, topHits.length, loadingMore, hasMore]);

    useEffect(() => {
        const fetchAllTopHits = async () => {
            try {
                setLoading(true);

                // Check for saved state first
                const savedDisplayedHits = sessionStorage.getItem('topHitsDisplayedHits');
                const savedCurrentIndex = sessionStorage.getItem('topHitsCurrentIndex');
                const savedHasMore = sessionStorage.getItem('topHitsHasMore');
                const savedAllData = sessionStorage.getItem('topHitsAllData');

                // If we have saved data, restore it
                if (savedDisplayedHits && savedCurrentIndex && savedAllData) {
                    try {
                        const parsedDisplayedHits = JSON.parse(savedDisplayedHits);
                        const parsedAllData = JSON.parse(savedAllData);

                        setTopHits(parsedAllData);
                        setDisplayedHits(parsedDisplayedHits);
                        setCurrentIndex(parseInt(savedCurrentIndex));
                        setHasMore(savedHasMore === 'true');
                        setLoading(false);
                        return;
                    } catch (error) {
                        console.error('Error restoring saved state:', error);
                        // Continue with fresh fetch if restoration fails
                    }
                }

                // Fresh fetch if no saved data
                const initialResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=top%20hits&page=0&limit=1`);
                const initialData = await initialResponse.json();

                if (initialData.success && initialData.data.total) {
                    const total = initialData.data.total;
                    const limit = 40; // API limit per request
                    const totalPages = Math.ceil(total / limit);

                    let allPlaylists = [];

                    // Fetch all pages concurrently
                    const promises = [];
                    for (let page = 0; page < totalPages; page++) {
                        promises.push(
                            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=top%20hits&page=${page}&limit=${limit}`)
                                .then(response => response.json())
                        );
                    }

                    const responses = await Promise.all(promises);

                    // Combine all results
                    responses.forEach(data => {
                        if (data.success && data.data.results) {
                            allPlaylists = [...allPlaylists, ...data.data.results];
                        }
                    });

                    // Remove duplicates based on playlist id
                    const uniquePlaylists = allPlaylists.filter((playlist, index, self) =>
                        index === self.findIndex(p => p.id === playlist.id)
                    );

                    setTopHits(uniquePlaylists);

                    // Save all data for future use
                    sessionStorage.setItem('topHitsAllData', JSON.stringify(uniquePlaylists));

                    // Set initial batch for fresh visits
                    const initialBatch = uniquePlaylists.slice(0, ITEMS_PER_BATCH);
                    setDisplayedHits(initialBatch);
                    setCurrentIndex(ITEMS_PER_BATCH);
                    setHasMore(ITEMS_PER_BATCH < uniquePlaylists.length);
                }
            } catch (error) {
                console.error('Error fetching top hits:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllTopHits();
    }, []);

    const handleCardClick = (playlist) => {
        // Save scroll position from the actual scrollable div
        if (scrollContainerRef.current) {
            sessionStorage.setItem('topHitsScrollPosition', scrollContainerRef.current.scrollTop.toString());
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
                                    <BreadcrumbPage>Top Hits</BreadcrumbPage>
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
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Top Hits Playlists</h1>
                            <p className="text-muted-foreground">
                                Discover the most popular hits and classic playlists of all time
                            </p>
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
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                    {displayedHits.map((playlist) => (
                                        <PlaylistCard
                                            key={playlist.id}
                                            playlist={{ ...playlist, source: 'jiosaavn' }}
                                            onClick={handleCardClick}
                                        />
                                    ))}
                                </div>

                                {/* Loading more indicator */}
                                {loadingMore && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 mt-6">
                                        {Array.from({ length: 12 }).map((_, index) => (
                                            <div key={`loading-${index}`} className="space-y-3">
                                                <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                                                <div className="bg-muted animate-pulse h-4 rounded" />
                                                <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Load more button (optional manual trigger) */}
                                {!loadingMore && hasMore && (
                                    <div className="text-center mt-8">
                                        <Button
                                            onClick={loadMoreItems}
                                            variant="outline"
                                            size="lg"
                                        >
                                            Load More Playlists
                                        </Button>
                                    </div>
                                )}

                                {/* End of results indicator */}
                                {!hasMore && displayedHits.length > 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground">
                                            You've reached the end! Showing all {displayedHits.length} playlists.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {!loading && topHits.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No top hits found</p>
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