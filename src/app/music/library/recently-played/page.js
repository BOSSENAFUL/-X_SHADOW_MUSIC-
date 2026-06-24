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
import { ArrowLeft, Clock } from "lucide-react";
import { useSession } from "next-auth/react";

export default function RecentlyPlayedPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef(null);

    // Restore scroll position
    useEffect(() => {
        if (!loading && playlists.length > 0 && scrollContainerRef.current) {
            const savedPosition = sessionStorage.getItem('recentlyPlayedLibraryScrollPosition');
            if (savedPosition) {
                scrollContainerRef.current.scrollTop = parseInt(savedPosition);
                sessionStorage.removeItem('recentlyPlayedLibraryScrollPosition');
            }
        }
    }, [loading, playlists.length]);

    useEffect(() => {
        let isMounted = true;
        const fetchRecentlyPlayed = async () => {
            if (!session?.user?.id) return;
            try {
                if (isMounted) setLoading(true);
                const res = await fetch('/api/recently-played-playlists');
                const data = await res.json();
                if (!isMounted) return;
                if (data.success && data.data) {
                    const rawPlaylists = data.data || [];

                    // Filter user playlists that need a collage
                    const needsCollage = rawPlaylists.filter(p =>
                        p.source === 'user' && (!p.image || p.image.length === 0)
                    );

                    let processed = rawPlaylists.map(p => ({
                        ...p,
                        id: p.playlistId,
                        name: p.playlistName,
                    }));

                    if (needsCollage.length > 0) {
                        try {
                            const playlistDetails = await Promise.all(
                                needsCollage.map(p => fetch(`/api/playlists/${p.playlistId}`).then(r => r.json()))
                            );

                            const songIdsToFetch = new Set();
                            playlistDetails.forEach(res => {
                                if (res.success && res.data?.songIds) {
                                    res.data.songIds.slice(0, 4).forEach(id => songIdsToFetch.add(id));
                                }
                            });

                            if (songIdsToFetch.size > 0) {
                                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                                const songsRes = await fetch(`${apiUrl}/api/songs?ids=${Array.from(songIdsToFetch).join(',')}`);
                                const songsData = await songsRes.json();

                                if (songsData.success && songsData.data) {
                                    const songCache = {};
                                    songsData.data.forEach(s => { if (s) songCache[s.id] = s; });

                                    processed = processed.map(p => {
                                        const details = playlistDetails.find(d => d.success && d.data?._id?.toString() === p.id);
                                        if (details && details.data?.songIds) {
                                            const collageImages = details.data.songIds.slice(0, 4).map(id => {
                                                const song = songCache[id];
                                                if (!song) return '/default-playlist-image.png';
                                                return song.image?.find(img => img.quality === '150x150')?.url ||
                                                    song.image?.find(img => img.quality === '500x500')?.url ||
                                                    song.image?.[song.image.length - 1]?.url ||
                                                    '/default-playlist-image.png';
                                            });
                                            if (collageImages.length >= 4) {
                                                return { ...p, collageImages };
                                            }
                                        }
                                        return p;
                                    });
                                }
                            }
                        } catch (err) {
                            console.error('Error batch fetching collages in history page:', err);
                        }
                    }
                    if (isMounted) setPlaylists(processed);
                }
            } catch (error) {
                console.error('Error fetching recently played:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchRecentlyPlayed();
        return () => { isMounted = false; };
    }, [session?.user?.id]);

    const handleCardClick = (playlist) => {
        if (scrollContainerRef.current) {
            sessionStorage.setItem('recentlyPlayedLibraryScrollPosition', scrollContainerRef.current.scrollTop.toString());
        }

        if (playlist.source === 'user') {
            router.push(`/music/playlists/${playlist.id}`);
        } else {
            router.push(`/music/playlist/${playlist.id}?songCount=${playlist.songCount || 50}`);
        }
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
                                    <BreadcrumbLink href="/music/library">
                                        Your Library
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Recently Played</BreadcrumbPage>
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
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">Recently Played</h1>
                                <p className="text-muted-foreground text-xs sm:text-sm md:text-base line-clamp-2">
                                    Your listening history across all playlists
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
                                {Array.from({ length: 12 }).map((_, index) => (
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
                                        playlist={playlist}
                                        onClick={handleCardClick}
                                    />
                                ))}
                            </div>
                        )}

                        {!loading && playlists.length === 0 && (
                            <div className="text-center py-20 flex flex-col items-center gap-4">
                                <Clock className="w-16 h-16 text-muted-foreground/20" />
                                <p className="text-muted-foreground text-lg">No recently played playlists yet</p>
                                <Button onClick={() => router.push('/music/discover/new-releases')}>
                                    Explore New Releases
                                </Button>
                            </div>
                        )}

                        <div className="pb-36" />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
