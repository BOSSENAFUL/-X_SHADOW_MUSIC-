"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { triggerSmartlink } from "@/lib/smartlink";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import {
    ArrowLeft, Heart, MoreVertical, Shuffle, Calendar,
    Disc, Plus, User, Share, Download, Clock, Music, Mic2
} from "lucide-react";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { IoMdPlay } from "react-icons/io";
import { HiPause } from "react-icons/hi2";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { memo } from "react";
import { downloadWithMetadata } from "@/lib/clientDownload";
import { applyThemeColor, getThemeColorForScroll } from "@/lib/utils";

// --- Action Menu ---
const SongDetailActionMenu = memo(({
    song,
    onAddToPlaylist,
    onDownload,
    toggleLike,
    isLiked,
    decodeHtmlEntities,
}) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);

    const artistNames = song?.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist";
    const songImageUrl =
        song?.image?.find(img => img.quality === "150x150")?.url ||
        song?.image?.[song.image.length - 1]?.url ||
        "/default-playlist-image.png";

    const handleShare = (onItemClick) => {
        if (onItemClick) onItemClick();
        if (navigator.share) {
            navigator.share({
                title: song.name,
                text: `Check out "${song.name}" by ${artistNames}`,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard");
        }
    };

    const ActionItems = ({ onItemClick }) => (
        <>
            <div
                className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => { onItemClick?.(); onAddToPlaylist(); }}
            >
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Add to playlist</span>
            </div>
            <div
                className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleShare(onItemClick)}
            >
                <Share className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Share</span>
            </div>
            <div
                className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => { onItemClick?.(); onDownload(); }}
            >
                <Download className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Download</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div
                className={`flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors ${isLiked(song.id) ? "text-red-500" : ""}`}
                onClick={() => {
                    onItemClick?.();
                    toggleLike(song).catch(err => console.error(err));
                }}
            >
                <Heart className={`w-5 h-5 ${isLiked(song.id) ? "fill-current" : ""}`} />
                <span className="font-medium">{isLiked(song.id) ? "Unlike" : "Like"}</span>
            </div>
        </>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground">
                        <MoreVertical style={{ width: "24px", height: "24px" }} />
                    </button>
                </DrawerTrigger>
                <DrawerContent className="bg-[#1F1F1F] border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
                    <DrawerHeader className="p-0">
                        <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                            <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0">
                                <img src={songImageUrl} alt={song?.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                                <DrawerTitle className="text-base font-bold truncate text-foreground text-left">
                                    {decodeHtmlEntities(song?.name)}
                                </DrawerTitle>
                                <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                                    {artistNames}
                                </DrawerDescription>
                            </div>
                        </div>
                    </DrawerHeader>
                    <div className="px-2 py-4 pb-8 space-y-1">
                        {ActionItems({ onItemClick: () => setOpen(false) })}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground">
                    <MoreVertical style={{ width: "24px", height: "24px" }} />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
                <DropdownMenuItem
                    onClick={() => { setOpen(false); onAddToPlaylist(); }}
                    className="hover:bg-accent focus:bg-accent cursor-pointer"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add to playlist
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                    onClick={() => handleShare(() => setOpen(false))}
                    className="hover:bg-accent focus:bg-accent cursor-pointer"
                >
                    <Share className="w-4 h-4 mr-2" /> Share
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                    onClick={() => { setOpen(false); onDownload(); }}
                    className="hover:bg-accent focus:bg-accent cursor-pointer"
                >
                    <Download className="w-4 h-4 mr-2" /> Download
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                    onClick={() => {
                        setOpen(false);
                        toggleLike(song).catch(err => console.error(err));
                    }}
                    className={`${isLiked(song.id) ? "text-red-500" : ""} hover:bg-accent focus:bg-accent cursor-pointer`}
                >
                    <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? "fill-current" : ""}`} />
                    {isLiked(song.id) ? "Unlike" : "Like"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
SongDetailActionMenu.displayName = "SongDetailActionMenu";

// --- Utility ---
function extractDominantColor(imageUrl) {
    const finalUrl = imageUrl.startsWith("http")
        ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl;

    return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                const colorCounts = {};
                for (let i = 0; i < data.length; i += 40) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const brightness = (r + g + b) / 3;
                    if (brightness < 40 || brightness > 220) continue;
                    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                    if (saturation < 30) continue;
                    const key = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
                    colorCounts[key] = (colorCounts[key] || 0) + (1 + saturation / 50);
                }
                let best = "40,40,40", maxW = 0;
                for (const [c, w] of Object.entries(colorCounts)) {
                    if (w > maxW) { maxW = w; best = c; }
                }
                resolve(`rgb(${best})`);
            } catch {
                resolve("rgb(40,40,40)");
            }
        };
        img.onerror = () => resolve("rgb(40,40,40)");
        img.src = finalUrl;
    });
}

// --- Main Page ---
export default function SongPage() {
    const router = useRouter();
    const params = useParams();
    const songId = params.id;
    const { data: session } = useSession();

    const [song, setSong] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dominantColor, setDominantColor] = useState("rgb(40,40,40)");
    const [showHeaderTitle, setShowHeaderTitle] = useState(false);

    // Dynamic PWA status bar theme-color update
    useEffect(() => {
        if (typeof window === "undefined") return;

        const defaultThemeColor = "#121212";

        const getThemeColor = (colorStr, showHeader) => {
            if (!colorStr) return defaultThemeColor;
            const match = colorStr.match(/\d+/g);
            if (!match || match.length < 3) return defaultThemeColor;
            const r = parseInt(match[0], 10);
            const g = parseInt(match[1], 10);
            const b = parseInt(match[2], 10);

            // If header is shown: color is dominantColor * 0.4 (black mix 60%)
            // If header is hidden: color is dominantColor * 0.85 + 18 * 0.15 (matching song page gradient opacity)
            const opacity = showHeader ? 0.4 : 0.85;
            const bgContrib = showHeader ? 0 : 2.7;

            const mixedR = Math.max(0, Math.min(255, Math.round(r * opacity + bgContrib)));
            const mixedG = Math.max(0, Math.min(255, Math.round(g * opacity + bgContrib)));
            const mixedB = Math.max(0, Math.min(255, Math.round(b * opacity + bgContrib)));

            const toHex = (c) => {
                const hex = c.toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            };
            return `#${toHex(mixedR)}${toHex(mixedG)}${toHex(mixedB)}`;
        };

        window._getActivePageThemeColor = (progress) => {
            return getThemeColor(dominantColor, progress > 0.8);
        };

        const targetColor = getThemeColor(dominantColor, showHeaderTitle);
        applyThemeColor(targetColor);

        return () => {
            applyThemeColor(defaultThemeColor);
            delete window._getActivePageThemeColor;
        };
    }, [dominantColor, showHeaderTitle]);
    const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);

    const mobileTitleRef = useRef(null);
    const desktopTitleRef = useRef(null);

    const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);
    const { playSong, currentSong, isPlaying, togglePlayPause, currentPlaylistId, isShuffle, setIsShuffle, showTrackNumbersMobile } = useMusicPlayer();

    const decodeHtmlEntities = useCallback((text) => {
        if (!text) return text;
        let t = text
            .replace(/â€œ/g, "\u201c").replace(/â€/g, "\u201d")
            .replace(/â€˜/g, "\u2018").replace(/â€™/g, "\u2019")
            .replace(/â€"/g, "\u2014").replace(/â€"/g, "\u2013")
            .replace(/â€¦/g, "\u2026").replace(/Â/g, "");
        if (!t.includes("&")) return t;
        return t.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, m => ({
            "&amp;": "&", "&lt;": "<", "&gt;": ">",
            "&quot;": '"', "&#39;": "'", "&apos;": "'"
        }[m]));
    }, []);

    const formatDuration = useCallback((secs) => {
        if (!secs) return "0:00";
        return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    }, []);

    // Fetch song
    useEffect(() => {
        if (!songId) return;
        let mounted = true;
        setLoading(true);

        // Check sessionStorage cache first for instant color
        const cachedColor = sessionStorage.getItem(`song-color-${songId}`);
        if (cachedColor) setDominantColor(cachedColor);

        (async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${songId}`);
                const data = await res.json();
                if (!mounted) return;
                if (data.success && data.data?.[0]) {
                    const s = data.data[0];
                    setSong(s);
                    // Only extract color if not already loaded from cache
                    if (!cachedColor) {
                        // Use 150x150 thumbnail for faster canvas processing
                        const imgUrl = s.image?.find(i => i.quality === "150x150")?.url ||
                            s.image?.find(i => i.quality === "500x500")?.url ||
                            s.image?.[s.image.length - 1]?.url;
                        if (imgUrl) {
                            extractDominantColor(imgUrl).then(c => {
                                if (mounted) {
                                    setDominantColor(c);
                                    sessionStorage.setItem(`song-color-${songId}`, c);
                                }
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching song:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [songId]);

    // Sticky header title observer
    useEffect(() => {
        const container = document.getElementById("song-scroll-container");
        if (!container) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.boundingClientRect.width > 0) {
                        setShowHeaderTitle(!entry.isIntersecting);
                    }
                });
            },
            { root: container, threshold: 0, rootMargin: "-64px 0px 0px 0px" }
        );
        if (mobileTitleRef.current) observer.observe(mobileTitleRef.current);
        if (desktopTitleRef.current) observer.observe(desktopTitleRef.current);
        return () => observer.disconnect();
    }, [loading, song?.name]);

    const isCurrentSong = currentSong?.id === song?.id;
    const isThisPlaying = isCurrentSong && isPlaying;

    const handlePlay = useCallback(() => {
        if (!song) return;
        if (isCurrentSong) {
            togglePlayPause();
        } else {
            playSong(song, [song], songId, 0);
        }
    }, [song, isCurrentSong, togglePlayPause, playSong, songId]);

    const handleDownload = useCallback(async () => {
        if (!song) return;
        triggerSmartlink(true); // Download — fire every time, no cooldown
        const toastId = toast.loading(`Preparing "${decodeHtmlEntities(song.name)}"...`);
        try {
            let downloadUrl = null;
            if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
                const mp3s = song.downloadUrl.filter(u => u.url.toLowerCase().includes(".mp3"));
                const best = mp3s.find(u => u.quality === "320kbps") || mp3s.find(u => u.quality === "160kbps") || mp3s[0];
                const fallback = song.downloadUrl.find(u => u.quality === "320kbps") || song.downloadUrl[song.downloadUrl.length - 1];
                downloadUrl = best?.url || fallback?.url;
            }
            if (!downloadUrl) throw new Error("No download URL available");

            const imageUrl = song.image?.find(i => i.quality === "500x500")?.url ||
                song.image?.[song.image.length - 1]?.url;

            const result = await downloadWithMetadata({
                songUrl: downloadUrl,
                title: decodeHtmlEntities(song.name),
                artist: song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist",
                album: song.album?.name ? decodeHtmlEntities(song.album.name) : "Unknown Album",
                year: song.year || (song.releaseDate ? new Date(song.releaseDate).getFullYear() : ""),
                imageUrl,
            });

            if (result.success) {
                toast.success(`Downloaded "${decodeHtmlEntities(song.name)}"!`, { id: toastId });
            } else {
                throw new Error(result.error || "Download failed");
            }
        } catch (err) {
            toast.error(`Failed: ${err.message}`, { id: toastId });
        }
    }, [song, decodeHtmlEntities]);

    const gradientStyle = dominantColor ? {
        background: `linear-gradient(to bottom,
      ${dominantColor.replace("rgb", "rgba").replace(")", ", 0.85)")} 0%,
      ${dominantColor.replace("rgb", "rgba").replace(")", ", 0.4)")} 40%,
      ${dominantColor.replace("rgb", "rgba").replace(")", ", 0.1)")} 75%,
      transparent 100%)`
    } : {};

    // --- Loading skeleton ---
    if (loading) {
        return (
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset id="song-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
                    <div className="absolute inset-0 h-[390px] pointer-events-none" style={gradientStyle} />
                    <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md">
                        <div className="flex items-center gap-2 px-3 md:px-4">
                            <SidebarTrigger className="-ml-1 hidden md:flex" />
                            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
                            <Button size="sm" onClick={() => router.back()} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                                <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
                            </Button>
                        </div>
                    </header>
                    <div className="flex-1 p-4 pt-12 md:p-8 md:pt-20 relative z-10">
                        <div className="space-y-6">
                            {/* Mobile Skeleton */}
                            <div className="flex flex-col items-center space-y-3 md:hidden">
                                <Skeleton className="w-56 h-56 rounded-xl shadow-2xl" />
                                <div className="space-y-1.5 pt-1 w-full">
                                    <Skeleton className="h-8 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                            {/* Desktop Skeleton */}
                            <div className="hidden md:flex gap-8 items-end">
                                <Skeleton className="w-60 h-60 rounded-lg shadow-2xl shrink-0" />
                                <div className="flex-1 space-y-4 min-w-0">
                                    <Skeleton className="h-14 w-[500px]" />
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-64" />
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    if (!song) {
        return (
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-muted-foreground">Song not found</p>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    const primaryArtists = song.artists?.primary || [];
    const allCredits = song.artists?.all || [];
    const lyricists = allCredits.filter(a => a.role === "lyricist");
    const composers = allCredits.filter(a => a.role === "composer" || a.role === "music");
    const imgUrl = song.image?.find(i => i.quality === "500x500")?.url ||
        song.image?.find(i => i.quality === "150x150")?.url ||
        song.image?.[song.image.length - 1]?.url ||
        "/default-playlist-image.png";

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset id="song-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">

                {/* Sticky Header */}
                <header
                    style={{
                        backgroundColor: showHeaderTitle
                            ? dominantColor ? `color-mix(in srgb, ${dominantColor}, black 60%)` : "#1D1046"
                            : undefined
                    }}
                    className={`fixed md:sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 md:border-b transition-all duration-300 w-full ${showHeaderTitle ? "border-border text-white" : "bg-transparent md:bg-background border-transparent"}`}
                >
                    <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1 hidden md:flex" />
                            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
                            <Button size="sm" onClick={() => router.back()} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                                <ArrowLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
                            </Button>
                            <div className="flex items-center gap-2 transition-all duration-300">
                                {showHeaderTitle ? (
                                    <h2 className="text-base font-bold animate-in fade-in slide-in-from-bottom-2 duration-300 line-clamp-1">
                                        {song.name}
                                    </h2>
                                ) : (
                                    <Breadcrumb className="hidden md:block">
                                        <BreadcrumbList>
                                            <BreadcrumbItem className="hidden md:block">
                                                <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator className="hidden md:block" />
                                            <BreadcrumbItem>
                                                <BreadcrumbPage>Song</BreadcrumbPage>
                                            </BreadcrumbItem>
                                        </BreadcrumbList>
                                    </Breadcrumb>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 relative transition-colors duration-1000" style={{ backgroundColor: "hsl(var(--background))" }}>
                    {/* Ambient gradient */}
                    <div className="absolute inset-0 h-[420px] pointer-events-none transition-all duration-1000" style={gradientStyle} />

                    <div className="relative z-10">
                        {/* Song Header */}
                        <div className="p-4 pt-12 pb-2 md:p-8 md:pt-20 md:pb-4 text-foreground">

                            {/* Mobile */}
                            <div className="block md:hidden">
                                <div className="flex flex-col items-center space-y-3">
                                    <div className="w-56 h-56 rounded-xl overflow-hidden bg-muted shadow-2xl">
                                        <img src={imgUrl} alt={song.name} className="w-full h-full object-cover"
                                            onError={e => { e.target.src = "/default-playlist-image.png"; }} />
                                    </div>
                                    <div className="space-y-1.5 pt-1 w-full">
                                        <h1 ref={mobileTitleRef} className="text-2xl font-bold break-words leading-tight">
                                            {decodeHtmlEntities(song.name)}
                                        </h1>
                                        <div className="text-sm font-semibold text-muted-foreground">
                                            {primaryArtists.map((a, i) => (
                                                <span key={a.id || i}>
                                                    <Link href={`/music/artist/${a.id}`} className="hover:underline text-foreground">
                                                        {decodeHtmlEntities(a.name)}
                                                    </Link>
                                                    {i < primaryArtists.length - 1 && ", "}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                            {song.year && <span>{song.year}</span>}
                                            {song.duration && <><span>•</span><span>{formatDuration(song.duration)}</span></>}
                                            {song.language && <><span>•</span><span className="capitalize">{song.language}</span></>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop */}
                            <div className="hidden md:flex gap-8 items-end">
                                <div className="w-60 h-60 rounded-lg overflow-hidden bg-muted shrink-0 shadow-2xl">
                                    <img src={imgUrl} alt={song.name} className="w-full h-full object-cover"
                                        onError={e => { e.target.src = "/default-playlist-image.png"; }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h1 ref={desktopTitleRef} className="text-4xl md:text-6xl font-bold mb-3 break-words leading-tight">
                                        {decodeHtmlEntities(song.name)}
                                    </h1>
                                    <div className="flex items-center gap-2 text-sm mb-2 font-semibold flex-wrap">
                                        {primaryArtists.map((a, i) => (
                                            <span key={a.id || i} className="flex items-center gap-1">
                                                {a.image?.[1]?.url && (
                                                    <img src={a.image[1].url} alt={a.name}
                                                        className="w-6 h-6 rounded-full object-cover" />
                                                )}
                                                <Link href={`/music/artist/${a.id}`} className="hover:underline">
                                                    {decodeHtmlEntities(a.name)}
                                                </Link>
                                                {i < primaryArtists.length - 1 && ","}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm opacity-80 flex-wrap">
                                        {song.year && <span>{song.year}</span>}
                                        {song.year && <span>•</span>}
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(song.duration)}</span>
                                        {song.language && <><span>•</span><span className="capitalize">{song.language}</span></>}
                                        {song.label && <><span>•</span><span>{song.label}</span></>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="p-4 pt-2 md:p-8 md:pt-4">
                            <div className="flex items-center gap-3 md:gap-4">
                                <Button
                                    size="lg"
                                    className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-all duration-300 cursor-pointer"
                                    style={{
                                        backgroundColor: dominantColor,
                                        boxShadow: `0 8px 32px ${dominantColor.replace("rgb", "rgba").replace(")", ", 0.35)")}`
                                    }}
                                    onClick={handlePlay}
                                >
                                    {isThisPlaying
                                        ? <HiPause style={{ width: "24px", height: "24px" }} />
                                        : <IoMdPlay style={{ width: "24px", height: "24px", marginLeft: "4px" }} />
                                    }
                                </Button>

                                <button
                                    className={`rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center hover:scale-105 transition-all duration-300 cursor-pointer ${isLiked(song.id) ? "text-green-500 hover:text-green-400" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => toggleLike(song).catch(console.error)}
                                >
                                    <Heart className={`w-6 h-6 md:w-7 md:h-7 ${isLiked(song.id) ? "fill-current" : ""}`} />
                                </button>

                                <SongDetailActionMenu
                                    song={song}
                                    onAddToPlaylist={() => setAddToPlaylistDialogOpen(true)}
                                    onDownload={handleDownload}
                                    toggleLike={toggleLike}
                                    isLiked={isLiked}
                                    decodeHtmlEntities={decodeHtmlEntities}
                                />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="px-4 md:px-8 pb-8 space-y-6">

                            {/* Track row — Spotify style */}
                            <div>
                                {/* Table header — desktop only */}
                                <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-4 items-center text-sm text-muted-foreground border-b border-border pb-2 mb-2">
                                    <div className="w-8 text-center">#</div>
                                    <div>Title</div>
                                    <div className="flex items-center gap-2 pr-2">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Single track row */}
                                <div
                                    className="flex md:grid md:grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-4 p-1 md:p-2 rounded-md hover:bg-muted/50 group cursor-pointer"
                                    onClick={handlePlay}
                                >
                                    <div className={`w-4 md:w-8 text-center shrink-0 ${!showTrackNumbersMobile ? 'hidden md:block' : ''}`}>
                                        {isThisPlaying ? (
                                            <div className="flex items-end justify-center gap-0.5 h-3">
                                                <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: "0s" }} />
                                                <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: "0.2s" }} />
                                                <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: "0.4s" }} />
                                                <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: "0.1s" }} />
                                            </div>
                                        ) : isCurrentSong ? (
                                            <IoMdPlay className="w-4 h-4 mx-auto text-green-500" />
                                        ) : (
                                            <>
                                                <span className="text-muted-foreground group-hover:hidden text-sm">1</span>
                                                <IoMdPlay className="w-4 h-4 mx-auto hidden group-hover:block" />
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                                            <img src={imgUrl} alt={song.name} className="w-full h-full object-cover"
                                                onError={e => { e.target.src = "/default-playlist-image.png"; }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-semibold truncate text-sm md:text-base flex items-center gap-1.5 ${isCurrentSong ? "text-green-500" : ""}`}>
                                                {isCurrentSong && isPlaying && (
                                                    <span className="md:hidden flex items-end justify-center gap-0.5 h-3 w-3 shrink-0">
                                                        <span className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0s' }} />
                                                        <span className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.2s' }} />
                                                        <span className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.4s' }} />
                                                    </span>
                                                )}
                                                {decodeHtmlEntities(song.name)}
                                            </p>
                                            <p className={`text-xs md:text-sm truncate flex items-center gap-1 ${isCurrentSong ? "text-muted-foreground md:text-green-400" : "text-muted-foreground"}`}>
                                                {song.explicitContent && (
                                                    <span className="inline-flex items-center justify-center w-4 h-4 bg-muted-foreground/40 text-background rounded-sm text-[9px] font-bold shrink-0">E</span>
                                                )}
                                                {primaryArtists.map((a, i) => (
                                                    <span key={a.id || i}>
                                                        <Link href={`/music/artist/${a.id}`} className="hover:underline"
                                                            onClick={e => e.stopPropagation()}>
                                                            {decodeHtmlEntities(a.name)}
                                                        </Link>
                                                        {i < primaryArtists.length - 1 && ", "}
                                                    </span>
                                                ))}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                        <Button
                                            variant="ghost" size="sm"
                                            className={`h-8 w-8 hidden md:inline-flex p-0 opacity-0 group-hover:opacity-100 transition-opacity ${isLiked(song.id) ? "text-green-500 hover:text-green-600" : "text-muted-foreground hover:text-foreground"}`}
                                            onClick={() => toggleLike(song).catch(console.error)}
                                        >
                                            <Heart className={`w-4 h-4 ${isLiked(song.id) ? "fill-current" : ""}`} />
                                        </Button>
                                        <span className="text-sm text-muted-foreground w-10 text-right hidden md:block">
                                            {formatDuration(song.duration)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Release date + copyright */}
                            <div className="space-y-1">
                                {song.releaseDate && (
                                    <p className="text-sm text-muted-foreground font-medium">
                                        {new Date(song.releaseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                    </p>
                                )}
                                {song.copyright && (
                                    <p className="text-xs text-muted-foreground/60 leading-relaxed">
                                        {decodeHtmlEntities(song.copyright)}
                                    </p>
                                )}
                                {song.playCount && (
                                    <p className="text-xs text-muted-foreground/60">
                                        {Number(song.playCount).toLocaleString()} plays
                                    </p>
                                )}
                            </div>

                            {/* From the album */}
                            {song.album?.id && (
                                <div>
                                    <h2 className="text-base md:text-lg font-bold mb-3 text-muted-foreground uppercase tracking-wider text-xs">From the album</h2>
                                    <Link
                                        href={`/music/album/${song.album.id}`}
                                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group w-full"
                                    >
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 shadow-md">
                                            <img src={imgUrl} alt={song.album.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={e => { e.target.src = "/default-playlist-image.png"; }} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm md:text-base group-hover:underline truncate">
                                                {decodeHtmlEntities(song.album.name)}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Album · {song.year || ""}</p>
                                        </div>
                                    </Link>
                                </div>
                            )}

                            {/* Artists */}
                            {primaryArtists.length > 0 && (
                                <div>
                                    <h2 className="text-xs font-bold mb-3 text-muted-foreground uppercase tracking-wider">
                                        {primaryArtists.length === 1 ? "Artist" : "Artists"}
                                    </h2>
                                    <div className="space-y-2">
                                        {primaryArtists.map((a, i) => (
                                            <Link
                                                key={a.id || i}
                                                href={`/music/artist/${a.id}`}
                                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group w-full"
                                            >
                                                <div className="w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0 shadow-md">
                                                    {a.image?.[1]?.url ? (
                                                        <img src={a.image[1].url} alt={a.name}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User className="w-6 h-6 opacity-50" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm md:text-base group-hover:underline truncate">
                                                        {decodeHtmlEntities(a.name)}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Artist</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Credits */}
                            {(lyricists.length > 0 || composers.length > 0) && (
                                <div>
                                    <h2 className="text-xs font-bold mb-3 text-muted-foreground uppercase tracking-wider">Credits</h2>
                                    <div className="space-y-2">
                                        {lyricists.length > 0 && (
                                            <div className="p-3 rounded-xl bg-muted/30">
                                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                                    <Mic2 className="w-3.5 h-3.5" /> Lyrics
                                                </p>
                                                <p className="font-medium text-sm">{lyricists.map(a => a.name).join(", ")}</p>
                                            </div>
                                        )}
                                        {composers.length > 0 && (
                                            <div className="p-3 rounded-xl bg-muted/30">
                                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                                    <Music className="w-3.5 h-3.5" /> Music
                                                </p>
                                                <p className="font-medium text-sm">{composers.map(a => a.name).join(", ")}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="pb-32 md:pb-24" />
                    </div>
                </div>
            </SidebarInset>

            <AddToPlaylistDialog
                open={addToPlaylistDialogOpen}
                onOpenChange={setAddToPlaylistDialogOpen}
                song={song}
            />
        </SidebarProvider>
    );
}
