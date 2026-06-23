"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function SectionPage() {
    const { id } = useParams();
    const router = useRouter();

    const [section, setSection] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalPlaylists, setTotalPlaylists] = useState(0);

    const [playlistsPage, setPlaylistsPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const scrollRef = useRef(null);
    const loadingRef = useRef(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!id) return;

        const loadInitial = async () => {
            try {
                setLoading(true);
                setPlaylistsPage(0);
                setHasMore(true);

                // Fetch section metadata + first page of playlists in parallel
                const [sectionRes, playlistsRes] = await Promise.all([
                    fetch(`/api/sections/${id}`),
                    fetch(`/api/spotify-playlists?sectionId=${id}&limit=100&page=0`),
                ]);

                const [sectionData, playlistsData] = await Promise.all([
                    sectionRes.json(),
                    playlistsRes.json(),
                ]);

                if (!isMounted.current) return;

                if (sectionData.success) setSection(sectionData.data.section);

                if (playlistsData.success) {
                    // Normalise to the shape PlaylistCard expects
                    const normalised = playlistsData.data.map((p) => ({
                        id: p._id,
                        name: p.name,
                        image: p.image ? [{ quality: 'default', url: p.image }] : [],
                        songCount: p.songCount ?? 0,
                        description: p.description ?? '',
                        source: 'spotify',
                        sourceUrl: p.sourceUrl ?? '',
                    }));
                    setPlaylists(normalised);
                    setTotalPlaylists(playlistsData.total || normalised.length);
                    setHasMore(playlistsData.data.length >= 100);
                }
            } catch (err) {
                console.error('Error loading initial section data:', err);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };

        loadInitial();
    }, [id]);

    // Infinite scroll observer for loading more playlists
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    const fetchNextPage = async () => {
                        try {
                            setLoadingMore(true);
                            const nextPage = playlistsPage + 1;
                            const res = await fetch(`/api/spotify-playlists?sectionId=${id}&limit=100&page=${nextPage}`);
                            const data = await res.json();

                            if (!isMounted.current) return;

                            if (data.success) {
                                const normalised = data.data.map((p) => ({
                                    id: p._id,
                                    name: p.name,
                                    image: p.image ? [{ quality: 'default', url: p.image }] : [],
                                    songCount: p.songCount ?? 0,
                                    description: p.description ?? '',
                                    source: 'spotify',
                                    sourceUrl: p.sourceUrl ?? '',
                                }));

                                setPlaylists((prev) => {
                                    const seen = new Set(prev.map((item) => item.id));
                                    const uniqueNew = normalised.filter((item) => !seen.has(item.id));
                                    return [...prev, ...uniqueNew];
                                });

                                setHasMore(data.data.length >= 100);
                                setPlaylistsPage(nextPage);
                            }
                        } catch (err) {
                            console.error('Error fetching more playlists:', err);
                        } finally {
                            if (isMounted.current) setLoadingMore(false);
                        }
                    };
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        if (loadingRef.current) {
            observer.observe(loadingRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, playlistsPage, id]);

    const handleCardClick = (playlist) => {
        router.push(`/music/playlists/${playlist.id}`);
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="md:ml-0 overflow-x-hidden h-svh relative flex flex-col">

                {/* ── Header ── */}
                <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                                    <BreadcrumbLink href="/music">Discover</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>
                                        {loading
                                            ? <span className="inline-block h-4 w-28 rounded bg-muted animate-pulse" />
                                            : section?.name ?? ''}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                {/* ── Content ── */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 pb-36 md:pb-36">
                    <div className="space-y-6">

                        {/* Page title + count */}
                        <div className="min-w-0">
                            {loading ? (
                                <>
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                                        <span className="inline-block h-[24px] sm:h-[30px] md:h-[36px] w-56 rounded-md bg-muted animate-pulse" />
                                    </h1>
                                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
                                        <span className="inline-block h-[12px] sm:h-[14px] w-32 rounded bg-muted animate-pulse" />
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight truncate">
                                        {section?.name ?? ''}
                                    </h1>
                                    {(totalPlaylists > 0 || playlists.length > 0) && (
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
                                            Playlist &bull; {totalPlaylists || playlists.length} playlists
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div key={i}>
                                        <div className="bg-muted animate-pulse rounded-md aspect-square mb-3" />
                                        <div className="space-y-0.5 px-1">
                                            <div className="bg-muted animate-pulse h-[18px] rounded w-11/12" />
                                            <div className="bg-muted animate-pulse h-4 rounded w-2/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : playlists.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                                {playlists.map((playlist) => (
                                    <PlaylistCard
                                        key={playlist.id}
                                        playlist={playlist}
                                        onClick={handleCardClick}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No playlists found in this section.</p>
                            </div>
                        )}

                        {/* Infinite scroll loading indicator */}
                        <div ref={loadingRef} className="pt-8 pb-16 flex justify-center w-full">
                            {loadingMore && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
