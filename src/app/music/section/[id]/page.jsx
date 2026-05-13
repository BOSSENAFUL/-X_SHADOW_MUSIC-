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
import { ArrowLeft } from "lucide-react";
import { PlaylistCard } from "@/components/music/playlist-card";

export default function SectionPage() {
    const { id } = useParams();
    const router = useRouter();

    const [section, setSection] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);

    const scrollRef = useRef(null);

    useEffect(() => {
        if (!id) return;
        let isMounted = true;

        const load = async () => {
            try {
                setLoading(true);

                // Fetch section metadata + its playlists in parallel
                const [sectionRes, playlistsRes] = await Promise.all([
                    fetch(`/api/sections/${id}`),
                    fetch(`/api/spotify-playlists?sectionId=${id}&limit=100`),
                ]);

                const [sectionData, playlistsData] = await Promise.all([
                    sectionRes.json(),
                    playlistsRes.json(),
                ]);

                if (!isMounted) return;

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
                }
            } catch (err) {
                console.error('Error loading section:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [id]);

    const handleCardClick = (playlist) => {
        router.push(`/music/playlists/${playlist.id}`);
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="md:ml-0 overflow-x-hidden h-svh relative flex flex-col">

                {/* ── Header ── */}
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
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6">
                    <div className="space-y-6">

                        {/* Page title + count */}
                        <div className="flex items-start justify-between gap-x-4">
                            <div className="min-w-0 flex-1">
                                {loading
                                    ? <div className="h-9 sm:h-10 md:h-12 w-56 rounded-lg bg-muted animate-pulse" />
                                    : <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight truncate">
                                        {section?.name ?? ''}
                                    </h1>
                                }
                            </div>
                            {!loading && playlists.length > 0 && (
                                <div className="text-right shrink-0 mt-2 sm:mt-0 pt-1">
                                    <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm font-medium leading-tight">
                                        <span className="text-foreground font-bold block sm:inline sm:mr-1 text-xs sm:text-sm">
                                            {playlists.length}
                                        </span>
                                        playlists
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Grid */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                                        <div className="bg-muted animate-pulse h-4 rounded" />
                                        <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
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

                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
