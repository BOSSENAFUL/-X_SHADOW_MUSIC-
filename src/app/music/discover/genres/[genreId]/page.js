"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Badge } from "@/components/ui/badge";
import { Play, ArrowLeft, Heart, Music, ListMusic, MoreVertical, Plus, User, Disc, Share, Download, Clock } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { genres } from "@/data/genres";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { PlaylistCover } from "@/components/ui/playlist-cover";
import { PlaylistSection } from "@/components/music/playlist-section";
import { toast } from "sonner";
import Link from "next/link";
import { downloadWithMetadata } from "@/lib/clientDownload";
import { applyThemeColor, getThemeColorForScroll, decodeHtmlEntities } from "@/lib/utils";

const TAILWIND_COLORS = {
    slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
    gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
    zinc: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b' },
    neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717' },
    stone: { 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917' },
    red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' },
    orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' },
    amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' },
    yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' },
    lime: { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314' },
    green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' },
    emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
    teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' },
    cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' },
    sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
    blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
    indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' },
    violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
    purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' },
    fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' },
    pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f472b6', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' },
    rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' },
    black: '#000000',
    white: '#ffffff',
};

const hexToRgb = (hex) => {
    if (!hex) return null;
    const cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
        const r = parseInt(cleanHex[0] + cleanHex[0], 16);
        const g = parseInt(cleanHex[1] + cleanHex[1], 16);
        const b = parseInt(cleanHex[2] + cleanHex[2], 16);
        return `rgb(${r}, ${g}, ${b})`;
    } else if (cleanHex.length === 6) {
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return `rgb(${r}, ${g}, ${b})`;
    }
    return null;
};

const getRgbFromTailwind = (colorStr) => {
    if (!colorStr) return "rgb(30, 30, 30)";
    
    const arbitraryMatch = colorStr.match(/from-\[#([0-9a-fA-F]{3,6})\]/);
    if (arbitraryMatch) {
        const rgb = hexToRgb("#" + arbitraryMatch[1]);
        if (rgb) return rgb;
    }
    
    const stdMatch = colorStr.match(/from-([a-z]+)-(\d+)/);
    if (stdMatch) {
        const colorFamily = TAILWIND_COLORS[stdMatch[1]];
        if (colorFamily) {
            const hex = typeof colorFamily === 'string' ? colorFamily : colorFamily[stdMatch[2]];
            if (hex) {
                const rgb = hexToRgb(hex);
                if (rgb) return rgb;
            }
        }
    }

    if (colorStr.includes("from-black") || colorStr === "black") {
        return "rgb(0, 0, 0)";
    }
    if (colorStr.includes("from-white") || colorStr === "white") {
        return "rgb(255, 255, 255)";
    }

    const plainMatch = colorStr.match(/^([a-z]+)-(\d+)$/);
    if (plainMatch) {
        const colorFamily = TAILWIND_COLORS[plainMatch[1]];
        if (colorFamily) {
            const hex = typeof colorFamily === 'string' ? colorFamily : colorFamily[plainMatch[2]];
            if (hex) {
                const rgb = hexToRgb(hex);
                if (rgb) return rgb;
            }
        }
    }

    if (colorStr.startsWith("#")) {
        const rgb = hexToRgb(colorStr);
        if (rgb) return rgb;
    }
    if (colorStr.startsWith("rgb")) {
        return colorStr;
    }

    return "rgb(30, 30, 30)";
};

const getThemeColorForGenreScroll = (colorStr, progress, defaultThemeColor = "#121212") => {
    if (!colorStr) return defaultThemeColor;
    const match = colorStr.match(/\d+/g);
    if (!match || match.length < 3) return defaultThemeColor;
    const r = parseInt(match[0], 10);
    const g = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);

    // Smooth linear interpolation from solid color (progress = 0) to defaultThemeColor (progress = 1)
    // Jammify default background (#121212) corresponds to rgb(18, 18, 18)
    const targetR = 18;
    const targetG = 18;
    const targetB = 18;

    const mixedR = Math.max(0, Math.min(255, Math.round(r * (1 - progress) + targetR * progress)));
    const mixedG = Math.max(0, Math.min(255, Math.round(g * (1 - progress) + targetG * progress)));
    const mixedB = Math.max(0, Math.min(255, Math.round(b * (1 - progress) + targetB * progress)));

    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(mixedR)}${toHex(mixedG)}${toHex(mixedB)}`;
};

export default function GenreDetailPage() {
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const { data: session } = useSession();
    const genreId = params.genreId || (pathname ? pathname.split("/").pop() : "");
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(genreId);

    const [songs, setSongs] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('songs');
    const [songsPage, setSongsPage] = useState(1); // Track current page for songs
    const [playlistsPage, setPlaylistsPage] = useState(1); // Track current page for playlists
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreSongs, setHasMoreSongs] = useState(true);
    const [hasMorePlaylists, setHasMorePlaylists] = useState(true);
    const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
    const [selectedSong, setSelectedSong] = useState(null);

    const [currentGenre, setCurrentGenre] = useState(null);
    const [genreName, setGenreName] = useState(genreId);
    const [sectionsData, setSectionsData] = useState([]);
    const [playingPlaylistId, setPlayingPlaylistId] = useState(null);

    const isGradient = (colorStr) => {
        return colorStr && (colorStr.includes('from-') || colorStr.includes('to-') || colorStr.includes('via-'));
    };

    // Initialize hooks
    const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);
    const { playSong, currentSong, isPlaying, showTrackNumbersMobile } = useMusicPlayer();

    useEffect(() => {
        const fetchGenreContent = async () => {
            if (!genreId) return;

            try {
                setLoading(true);

                let resolvedGenreName = genreName;

                if (isObjectId) {
                    try {
                        const res = await fetch(`/api/genres/${genreId}`);
                        if (!res.ok) throw new Error("Failed to fetch db genre");
                        const json = await res.json();
                        if (json.success && json.data?.genre) {
                            const dbGenre = json.data.genre;
                            resolvedGenreName = dbGenre.name;
                            setCurrentGenre({
                                id: dbGenre._id,
                                name: dbGenre.name,
                                color: dbGenre.color,
                                isDbGenre: true,
                                sections: json.data.sections || []
                            });
                            setGenreName(dbGenre.name);

                            // Load sections data
                            const sections = json.data.sections || [];
                            setSectionsData(sections.map(s => ({ section: s, playlists: [], loading: true })));

                            // Fetch section playlists concurrently
                            const resolvedSections = await Promise.all(
                                sections.map(async (section) => {
                                    try {
                                        const sRes = await fetch(`/api/sections/${section._id}`);
                                        const sJson = await sRes.json();
                                        if (sJson.success && sJson.data?.playlists) {
                                            return {
                                                section,
                                                playlists: sJson.data.playlists.map(p => ({
                                                    id: p._id,
                                                    playlistId: p._id,
                                                    name: p.name,
                                                    description: p.description,
                                                    image: p.image ? [{ url: p.image, quality: '500x500' }] : [],
                                                    songCount: p.songCount,
                                                    sourceType: p.sourceType || 'spotify'
                                                })),
                                                loading: false
                                            };
                                        }
                                    } catch (err) {
                                        console.error(`Error loading section ${section._id}:`, err);
                                    }
                                    return { section, playlists: [], loading: false };
                                })
                            );
                            setSectionsData(resolvedSections);
                        }
                    } catch (err) {
                        console.error("Error fetching db genre details:", err);
                    }
                } else {
                    const staticGenre = genres.find(g => g.id === genreId);
                    if (staticGenre) {
                        setCurrentGenre(staticGenre);
                        setGenreName(staticGenre.name);
                        resolvedGenreName = staticGenre.name;
                    }
                }

                // Fetch multiple pages of songs using seed queries for better relevance
                const fetchSongs = async (gName) => {
                    const allSongs = [];
                    const seenIds = new Set(); // Track seen song IDs to prevent duplicates
                    const seenSongs = new Set(); // Track seen song name + artist combinations
                    const staticGenre = genres.find(g => g.id === genreId);
                    const seedQueries = staticGenre?.seedQueries || [gName];

                    // Helper function to create a unique key for song + artist combination
                    const createSongKey = (song) => {
                        const songName = song.name?.toLowerCase().trim() || '';
                        const artistName = song.artists?.primary?.[0]?.name?.toLowerCase().trim() ||
                            song.primaryArtists?.toLowerCase().trim() || '';
                        return `${songName}|${artistName}`;
                    };

                    // Use multiple seed queries concurrently to get diverse, relevant results
                    try {
                        const queries = seedQueries.slice(0, 3);
                        const songResults = await Promise.all(
                            queries.map(query =>
                                fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/songs?query=${encodeURIComponent(query)}&limit=40&page=1`)
                                    .then(res => res.json())
                                    .catch(err => {
                                        console.error(`Error fetching songs for query "${query}":`, err);
                                        return { success: false };
                                    })
                            )
                        );

                        songResults.forEach(data => {
                            if (data.success && data.data?.results) {
                                data.data.results.forEach(song => {
                                    if (!seenIds.has(song.id)) {
                                        const songKey = createSongKey(song);
                                        if (!seenSongs.has(songKey)) {
                                            seenIds.add(song.id);
                                            seenSongs.add(songKey);
                                            allSongs.push(song);
                                        }
                                    }
                                });
                            }
                        });
                    } catch (error) {
                        console.error("Batch song fetch error:", error);
                    }

                    return allSongs;
                };

                // Fetch multiple pages of playlists using seed queries for better relevance
                const fetchPlaylists = async (gName) => {
                    if (isObjectId) {
                        return []; // Handled separately in sectionsData
                    } else {
                        const allPlaylists = [];
                        const seenIds = new Set(); // Track seen playlist IDs to prevent duplicates
                        const staticGenre = genres.find(g => g.id === genreId);
                        const seedQueries = staticGenre?.seedQueries || [gName];

                        // Use multiple seed queries concurrently to get diverse, relevant results
                        try {
                            const queries = seedQueries.slice(0, 2);
                            const playlistResults = await Promise.all(
                                queries.map(query =>
                                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=${encodeURIComponent(query)}&limit=40&page=1`)
                                        .then(res => res.json())
                                        .catch(err => {
                                            console.error(`Error fetching playlists for query "${query}":`, err);
                                            return { success: false };
                                        })
                                    )
                                );

                            playlistResults.forEach(data => {
                                if (data.success && data.data?.results) {
                                    data.data.results.forEach(playlist => {
                                        if (!seenIds.has(playlist.id)) {
                                            seenIds.add(playlist.id);
                                            allPlaylists.push(playlist);
                                        }
                                    });
                                }
                            });
                        } catch (error) {
                            console.error("Batch playlist fetch error:", error);
                        }

                        return allPlaylists;
                    }
                };

                // Fetch both songs and playlists concurrently
                const [songsResults, playlistsResults] = await Promise.all([
                    fetchSongs(resolvedGenreName),
                    fetchPlaylists(resolvedGenreName)
                ]);

                // No need for additional deduplication since it's already handled in fetch functions
                setSongs(songsResults);
                setPlaylists(playlistsResults);

            } catch (error) {
                console.error('Error fetching genre content:', error);
            } finally {
                setLoading(false);
                setHasLoaded(true);
            }
        };

        fetchGenreContent();
    }, [genreId]);

    // Dynamic PWA status bar theme-color update
    useEffect(() => {
        if (typeof window === "undefined") return;

        const defaultThemeColor = "#121212";
        const rgbColor = getRgbFromTailwind(currentGenre?.color);

        window._getActivePageThemeColor = (progress) => getThemeColorForGenreScroll(rgbColor, progress, defaultThemeColor);

        if (!currentGenre) {
            applyThemeColor(defaultThemeColor);
            return;
        }

        // Set initial theme color for progress = 0 (exact match to header color)
        const initialColor = getThemeColorForGenreScroll(rgbColor, 0, defaultThemeColor);
        applyThemeColor(initialColor);

        return () => {
            applyThemeColor(defaultThemeColor);
            delete window._getActivePageThemeColor;
        };
    }, [currentGenre]);

    // Effect to handle scroll and PWA theme-color updates
    useEffect(() => {
        const scrollContainer = document.getElementById('genre-details-scroll-container');
        if (!scrollContainer) return;

        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const isMobile = window.innerWidth < 768;

                    if (isMobile) {
                        const scrollTop = scrollContainer.scrollTop;
                        const imageThreshold = 350;

                        // Clamp value strictly between 0 and 1
                        const progress = Math.max(0, Math.min(1, scrollTop / imageThreshold));

                        // Set scroll progress variable for potential CSS use
                        scrollContainer.style.setProperty('--scroll-progress', progress.toString());

                        // Update theme-color meta tag for seamless status bar
                        if (window._getActivePageThemeColor) {
                            const currentThemeColor = window._getActivePageThemeColor(progress);
                            const metaThemeColor = document.querySelector("meta[name=theme-color]");
                            if (metaThemeColor) {
                                metaThemeColor.setAttribute("content", currentThemeColor);
                            }
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
        };
    }, [loading]);

    const handleGoBack = () => {
        router.back();
    };

    const handleSongClick = (song, index) => {
        playSong(song, songs, null, index);
    };

    const handlePlaylistClick = (playlistId) => {
        if (/^[0-9a-fA-F]{24}$/.test(playlistId)) {
            router.push(`/music/playlists/${playlistId}`);
        } else {
            router.push(`/music/playlist/${playlistId}`);
        }
    };

    const handlePlaylistPlay = async (playlist, e = null) => {
        if (e) e.stopPropagation();
        const pid = playlist.id || playlist.playlistId;
        if (playingPlaylistId === pid) return;
        setPlayingPlaylistId(pid);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            let playlistSongs = [];

            const fullRes = await fetch(`/api/playlists/${pid}`).then(r => r.json()).catch(() => ({}));
            const ids = fullRes.success ? (fullRes.data?.songIds ?? []) : [];
            if (ids.length > 0) {
                const songsRes = await fetch(`${apiUrl}/api/songs?ids=${ids.join(',')}`);
                const songsData = await songsRes.json();
                if (songsData.success && songsData.data) {
                    const map = {};
                    songsData.data.forEach(s => { if (s) map[s.id] = s; });
                    playlistSongs = ids.map(id => map[id]).filter(Boolean);
                }
            }

            if (playlistSongs.length > 0) {
                playSong(playlistSongs[0], playlistSongs, pid);
                if (session?.user?.id) {
                    await fetch('/api/recently-played-playlists', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playlistId: pid })
                    }).catch(err => console.error('Failed to log recently played:', err));
                }
            }
        } catch (error) {
            console.error('Error playing playlist:', error);
        } finally {
            setPlayingPlaylistId(null);
        }
    };

    const formatDuration = (duration) => {
        if (!duration) return "0:00";
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };



    // Load more songs function using seed queries
    const loadMoreSongs = async () => {
        if (loadingMore || !hasMoreSongs) return;

        try {
            setLoadingMore(true);
            const seedQueries = currentGenre?.seedQueries || [genreName];
            const allNewSongs = [];
            const seenIds = new Set(); // Track seen song IDs to prevent duplicates within load more
            const seenSongs = new Set(); // Track seen song name + artist combinations

            // Also track existing song IDs and song combinations to prevent duplicates with current songs
            const existingIds = new Set(songs.map(song => song.id));
            const existingSongs = new Set(songs.map(song => {
                const songName = song.name?.toLowerCase().trim() || '';
                const artistName = song.artists?.primary?.[0]?.name?.toLowerCase().trim() ||
                    song.primaryArtists?.toLowerCase().trim() || '';
                return `${songName}|${artistName}`;
            }));

            // Helper function to create a unique key for song + artist combination
            const createSongKey = (song) => {
                const songName = song.name?.toLowerCase().trim() || '';
                const artistName = song.artists?.primary?.[0]?.name?.toLowerCase().trim() ||
                    song.primaryArtists?.toLowerCase().trim() || '';
                return `${songName}|${artistName}`;
            };

            // Aggressive strategy to find new content - try multiple approaches
            let attempts = 0;
            const maxAttempts = 5;

            while (allNewSongs.length < 5 && attempts < maxAttempts) {
                attempts++;
                const currentPage = songsPage + attempts;

                // Strategy 1: Try different seed queries with higher pages
                for (const query of seedQueries.slice(0, Math.min(3, seedQueries.length))) {
                    if (allNewSongs.length >= 20) break; // Stop if we have enough songs

                    try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/songs?query=${encodeURIComponent(query)}&limit=30&page=${currentPage}`);
                        const data = await response.json();

                        if (data.success && data.data?.results && data.data.results.length > 0) {
                            // Filter out duplicates as we add them
                            const newSongs = data.data.results.filter(song => {
                                // Skip if already exists in current songs by ID
                                if (existingIds.has(song.id) || seenIds.has(song.id)) {
                                    return false;
                                }

                                // Skip if same song name + artist combination already exists
                                const songKey = createSongKey(song);
                                if (existingSongs.has(songKey) || seenSongs.has(songKey)) {
                                    return false;
                                }

                                seenIds.add(song.id);
                                seenSongs.add(songKey);
                                return true;
                            });
                            allNewSongs.push(...newSongs);
                        }
                    } catch (error) {
                        console.error(`Error loading more songs for query "${query}" page ${currentPage}:`, error);
                    }
                }

                // If we still don't have enough songs, try with less strict deduplication
                if (allNewSongs.length < 3 && attempts >= 3) {
                    console.log(`Trying less strict deduplication for genre ${genreName}`);
                    // Try with only ID-based deduplication (allow different versions of same song)
                    for (const query of seedQueries.slice(0, 2)) {
                        try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/songs?query=${encodeURIComponent(query)}&limit=25&page=${currentPage + 2}`);
                            const data = await response.json();

                            if (data.success && data.data?.results && data.data.results.length > 0) {
                                // Only filter by ID, not by song name + artist
                                const newSongs = data.data.results.filter(song => {
                                    if (existingIds.has(song.id) || seenIds.has(song.id)) {
                                        return false;
                                    }
                                    seenIds.add(song.id);
                                    return true;
                                });
                                allNewSongs.push(...newSongs);
                            }
                        } catch (error) {
                            console.error(`Error with less strict deduplication for query "${query}":`, error);
                        }
                    }
                }
            }

            if (allNewSongs.length > 0) {
                setSongs(prevSongs => [...prevSongs, ...allNewSongs]);
                setSongsPage(prev => prev + 1);
            } else {
                setHasMoreSongs(false);
            }
        } catch (error) {
            console.error('Error loading more songs:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Load more playlists function using seed queries
    const loadMorePlaylists = async () => {
        if (loadingMore || !hasMorePlaylists || currentGenre?.isDbGenre) return;

        try {
            setLoadingMore(true);
            const seedQueries = currentGenre?.seedQueries || [genreName];
            const allNewPlaylists = [];
            const seenIds = new Set(); // Track seen playlist IDs to prevent duplicates within load more

            // Also track existing playlist IDs to prevent duplicates with current playlists
            const existingIds = new Set(playlists.map(playlist => playlist.id));

            // Aggressive strategy to find new playlists - try multiple approaches
            let attempts = 0;
            const maxAttempts = 4;

            while (allNewPlaylists.length < 3 && attempts < maxAttempts) {
                attempts++;
                const currentPage = playlistsPage + attempts;

                // Try different seed queries with higher pages
                for (const query of seedQueries.slice(0, Math.min(3, seedQueries.length))) {
                    if (allNewPlaylists.length >= 15) break; // Stop if we have enough playlists

                    try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=${encodeURIComponent(query)}&limit=25&page=${currentPage}`);
                        const data = await response.json();

                        if (data.success && data.data?.results && data.data.results.length > 0) {
                            // Filter out duplicates as we add them
                            const newPlaylists = data.data.results.filter(playlist => {
                                // Skip if already exists in current playlists or already seen in this load more
                                if (existingIds.has(playlist.id) || seenIds.has(playlist.id)) {
                                    return false;
                                }
                                seenIds.add(playlist.id);
                                return true;
                            });
                            allNewPlaylists.push(...newPlaylists);
                        }
                    } catch (error) {
                        console.error(`Error loading more playlists for query "${query}" page ${currentPage}:`, error);
                    }
                }
            }

            if (allNewPlaylists.length > 0) {
                setPlaylists(prevPlaylists => [...prevPlaylists, ...allNewPlaylists]);
                setPlaylistsPage(prev => prev + 1);
            } else {
                setHasMorePlaylists(false);
            }
        } catch (error) {
            console.error('Error loading more playlists:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleAddToPlaylist = (e, song) => {
        e.stopPropagation();
        setSelectedSong(song);
        setAddToPlaylistDialogOpen(true);
    };

    const handleGoToArtist = (e, song) => {
        e.stopPropagation();
        if (song.artists?.primary?.length > 0) {
            router.push(`/music/artist/${song.artists.primary[0].id}`);
        }
    };

    const handleGoToAlbum = (e, song) => {
        e.stopPropagation();
        if (song.album?.id) {
            router.push(`/music/album/${song.album.id}`);
        }
    };

    const handleShare = (e, song) => {
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({
                title: song.name,
                text: `Check out "${song.name}" by ${song.artists?.primary?.[0]?.name || 'Unknown Artist'}`,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            console.log('Link copied to clipboard');
        }
    };

    const downloadSingleSong = async (song, silent = false) => {
        let toastId = null;
        if (!silent) {
            toastId = toast.loading(`Preparing "${decodeHtmlEntities(song.name)}"...`);
        }

        try {
            // 1. Resolve Best Quality URL
            let downloadUrl = null;
            if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
                // Step 1: Find all MP3s
                const mp3s = song.downloadUrl.filter(u => u.url.toLowerCase().includes('.mp3'));

                // Step 2: Pick the best MP3 (prefer high quality)
                const bestMp3 = mp3s.find(u => u.quality === '320kbps') ||
                    mp3s.find(u => u.quality === '160kbps') ||
                    mp3s[0];

                // Step 3: Fallback to best overall if no MP3 found
                const bestOverall = song.downloadUrl.find(u => u.quality === '320kbps') ||
                    song.downloadUrl[song.downloadUrl.length - 1];

                downloadUrl = bestMp3?.url || bestOverall?.url;
            }

            if (!downloadUrl) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.id}`);
                const data = await response.json();
                if (data.success && data.data?.[0]?.downloadUrl) {
                    const freshUrls = data.data[0].downloadUrl;
                    const mp3s = freshUrls.filter(u => u.url.toLowerCase().includes('.mp3'));
                    const bestMp3 = mp3s.find(u => u.quality === '320kbps') || mp3s.find(u => u.quality === '160kbps') || mp3s[0];
                    const bestOverall = freshUrls.find(u => u.quality === '320kbps') || freshUrls[freshUrls.length - 1];
                    downloadUrl = bestMp3?.url || bestOverall?.url;
                }
            }

            if (!downloadUrl) throw new Error('No download URL available');

            // 2. Resolve Best Image
            const imageUrl = song.image?.find(img => img.quality === '500x500')?.url ||
                song.image?.find(img => img.quality === '150x150')?.url ||
                song.image?.[song.image.length - 1]?.url;

            const title = decodeHtmlEntities(song.name);
            const artist = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
            const album = song.album?.name ? decodeHtmlEntities(song.album.name) : 'Unknown Album';
            const year = song.year || (song.releaseDate ? new Date(song.releaseDate).getFullYear() : '');

            if (!silent) toast.loading(`Downloading "${title}"...`, { id: toastId });

            // 3. Use 100% client-side download with metadata embedding!
            const result = await downloadWithMetadata({
                songUrl: downloadUrl,
                title,
                artist,
                album,
                year,
                imageUrl
            });

            if (result.success) {
                if (!silent) toast.success(`Downloaded "${title}"!`, { id: toastId });
            } else {
                throw new Error(result.error || 'Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            if (!silent) toast.error(`Failed to download: ${error.message}`, { id: toastId });
            throw error;
        }
    };

    const handleDownload = async (e, song) => {
        e.stopPropagation();
        await downloadSingleSong(song);
    };

    if (loading) {
        return (
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
                    {/* Top Header - hidden on mobile, shown on desktop to prevent layout shifts */}
                    <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background">
                        <div className="flex items-center gap-2 px-3 md:px-4">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                            <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2" disabled>
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Back</span>
                            </Button>
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink asChild>
                                            <Link href="/music">Music</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink asChild>
                                            <Link href="/music/discover">Discover</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink asChild>
                                            <Link href="/music/discover/genres">Genres</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <div className="h-4 bg-muted/30 rounded w-16 animate-pulse" />
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </header>

                    <div id="genre-details-scroll-container" className="flex-1 overflow-y-auto">
                        {/* Giant Header skeleton */}
                        <div className="bg-accent/30 pt-16 pb-8 md:pt-24 md:pb-12 px-6 md:px-8 flex flex-col justify-end min-h-[200px] md:min-h-[260px]">
                            <div className="flex items-end gap-6">
                                <div className="flex-1">
                                    <div className="h-12 sm:h-[72px] md:h-[96px] lg:h-[128px] rounded-lg bg-accent w-1/2 md:w-1/3 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Body skeleton */}
                        <div className="space-y-8 px-4 md:px-6 py-6 pb-36">
                            {isObjectId ? (
                                // DB Genre Sections Skeletons
                                Array.from({ length: 3 }).map((_, i) => (
                                    <PlaylistSection
                                        key={i}
                                        title={
                                            <div className="h-5 md:h-6 rounded bg-accent w-36 sm:w-48 animate-pulse" />
                                        }
                                        playlists={[]}
                                        loading={true}
                                        extraActions={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs md:text-sm font-medium bg-accent/50 animate-pulse text-transparent select-none pointer-events-none"
                                                disabled
                                            >
                                                Show all
                                            </Button>
                                        }
                                    />
                                ))
                            ) : (
                                // Static Genre Tab content skeleton
                                <div className="py-6 space-y-4">
                                    <div className="h-8 bg-muted/40 rounded w-48 mb-6 animate-pulse" />
                                    <div className="space-y-3">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="w-8 h-8 bg-muted/30 rounded animate-pulse" />
                                                <div className="w-12 h-12 bg-muted/40 rounded animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-muted/40 rounded w-1/3 animate-pulse" />
                                                    <div className="h-3 bg-muted/30 rounded w-1/4 animate-pulse" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        );
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
                <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background">
                    <div className="flex items-center gap-2 px-3 md:px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Button variant="ghost" size="sm" onClick={handleGoBack} className="mr-2">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Back</span>
                        </Button>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink asChild>
                                        <Link href="/music">Music</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink asChild>
                                        <Link href="/music/discover">Discover</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink asChild>
                                        <Link href="/music/discover/genres">Genres</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{genreName}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div id="genre-details-scroll-container" className="flex-1 overflow-y-auto">
                    {/* Genre Header */}
                    <div 
                        className={`text-white ${
                            currentGenre?.isDbGenre 
                                ? "pt-16 pb-8 md:pt-24 md:pb-12 px-6 md:px-8 flex flex-col justify-end min-h-[200px] md:min-h-[260px]" 
                                : "p-4 md:p-6"
                        } ${
                            isGradient(currentGenre?.color) ? `bg-linear-to-br ${currentGenre?.color}` : ''
                        }`}
                        style={!isGradient(currentGenre?.color) ? { backgroundColor: currentGenre?.color || '#1e1e1e' } : {}}
                    >
                        <div className="flex items-end gap-6">
                            <div className="flex-1">
                                {!currentGenre?.isDbGenre && (
                                    <Badge variant="secondary" className="mb-2">
                                        Genre
                                    </Badge>
                                )}
                                <h1 className={
                                    currentGenre?.isDbGenre 
                                        ? "text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" 
                                        : "text-2xl md:text-4xl lg:text-6xl font-bold mb-2 md:mb-4"
                                }>
                                    {genreName}
                                </h1>
                                {!currentGenre?.isDbGenre && (
                                    <p className="text-sm md:text-lg opacity-90">
                                        Discover the best {genreName.toLowerCase()} music
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {currentGenre?.isDbGenre ? (
                        <div className="space-y-8 px-4 md:px-6 py-6 pb-36">
                            {sectionsData.map(({ section, playlists, loading }) => (
                                <PlaylistSection
                                    key={section._id}
                                    title={section.name}
                                    playlists={playlists}
                                    loading={loading}
                                    onShowAll={() => router.push(`/music/section/${section._id}`)}
                                    onPlaylistClick={(playlist) => {
                                        const pid = playlist.id || playlist.playlistId;
                                        router.push(`/music/playlists/${pid}`);
                                    }}
                                    onPlayClick={handlePlaylistPlay}
                                    playingId={playingPlaylistId}
                                />
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div className="border-b">
                                <div className="flex px-3 md:px-6">
                                    <button
                                        className={`px-3 md:px-4 py-3 font-medium border-b-2 transition-colors text-sm md:text-base ${activeTab === 'songs'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveTab('songs')}
                                    >
                                        Songs ({songs.length})
                                    </button>
                                    <button
                                        className={`px-3 md:px-4 py-3 font-medium border-b-2 transition-colors text-sm md:text-base ${activeTab === 'playlists'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                            }`}
                                        onClick={() => setActiveTab('playlists')}
                                    >
                                        Playlists ({playlists.length})
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-2 md:px-6 pb-36">
                                {activeTab === 'songs' && (
                                    <div className="py-4 md:py-6">
                                        {hasLoaded && songs.length === 0 ? (
                                            <div className="text-center py-12">
                                                <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-medium mb-2">No songs found</h3>
                                                <p className="text-muted-foreground">
                                                    Try exploring other genres
                                                </p>
                                            </div>
                                        ) : songs.length > 0 ? (
                                            <>
                                                <div className="space-y-0">
                                                    {/* Desktop Table Header */}
                                                    <div className="hidden md:grid grid-cols-[32px_1fr_1fr_120px] gap-4 items-center text-xs uppercase tracking-wider text-muted-foreground border-b border-white/5 pb-2 mb-2 px-2">
                                                        <div className="text-center">#</div>
                                                        <div>Title</div>
                                                        <div>Album</div>
                                                        <div className="flex items-center justify-end pr-8">
                                                            <Clock className="w-4 h-4" />
                                                        </div>
                                                    </div>

                                                    {songs.map((song, index) => {
                                                        const isCurrentSong = currentSong?.id === song.id;
                                                        return (
                                                            <div key={song.id || index}>
                                                                {/* Mobile Layout */}
                                                                <div
                                                                    className="md:hidden flex items-center gap-2 p-1 py-2 rounded hover:bg-muted/50 group cursor-pointer"
                                                                    onClick={() => handleSongClick(song, index)}
                                                                >
                                                                    <div className={`w-6 text-center shrink-0 ${!showTrackNumbersMobile ? 'hidden' : ''}`}>
                                                                        {isCurrentSong && isPlaying ? (
                                                                            <div className="flex items-center justify-center">
                                                                                <div className="flex items-end justify-center gap-0.5 h-3">
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0s' }} />
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.2s' }} />
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.4s' }} />
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.1s' }} />
                                                                                </div>
                                                                            </div>
                                                                        ) : isCurrentSong ? (
                                                                            <Play className="w-4 h-4 mx-auto text-green-500" />
                                                                        ) : (
                                                                            <>
                                                                                <span className="text-muted-foreground group-hover:hidden text-sm">
                                                                                    {index + 1}
                                                                                </span>
                                                                                <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                                                                            </>
                                                                        )}
                                                                    </div>

                                                                    <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden relative">
                                                                        {song.image?.length > 0 ? (
                                                                            <img
                                                                                src={song.image.find(img => img.quality === '500x500')?.url ||
                                                                                    song.image.find(img => img.quality === '150x150')?.url ||
                                                                                    song.image[song.image.length - 1]?.url}
                                                                                alt={song.name}
                                                                                className="w-full h-full object-cover rounded"
                                                                                loading="lazy"
                                                                                onError={(e) => {
                                                                                    e.target.src = '/default-playlist-image.png';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <img
                                                                                src="/default-playlist-image.png"
                                                                                alt={song.name}
                                                                                className="w-full h-full object-cover rounded"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    <div className="min-w-0 flex-1">
                                                                        <p className={`font-medium truncate text-sm ${isCurrentSong ? 'text-green-500 font-semibold' : ''}`}>
                                                                            {decodeHtmlEntities(song.name)}
                                                                        </p>
                                                                        <p className="text-xs truncate text-muted-foreground">
                                                                            {song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
                                                                        </p>
                                                                    </div>

                                                                    <div className="flex items-center shrink-0">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="p-1 h-8 w-8 text-muted-foreground"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <MoreVertical className="w-4 h-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-48 z-9999">
                                                                                <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, song)}>
                                                                                    <Plus className="w-4 h-4 mr-2" />
                                                                                    Add to playlist
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={(e) => handleGoToArtist(e, song)}>
                                                                                    <User className="w-4 h-4 mr-2" />
                                                                                    Go to artist
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e) => handleGoToAlbum(e, song)}>
                                                                                    <Disc className="w-4 h-4 mr-2" />
                                                                                    Go to album
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={(e) => handleShare(e, song)}>
                                                                                    <Share className="w-4 h-4 mr-2" />
                                                                                    Share
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e) => handleDownload(e, song)}>
                                                                                    <Download className="w-4 h-4 mr-2" />
                                                                                    Download
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleLike(song).catch(error => {
                                                                                            console.error('Error toggling song like:', error);
                                                                                        });
                                                                                    }}
                                                                                    className={isLiked(song.id) ? 'text-red-500 font-medium' : ''}
                                                                                >
                                                                                    <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                                                                                    {isLiked(song.id) ? 'Unlike' : 'Like'}
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </div>

                                                                <div
                                                                    className="hidden md:grid grid-cols-[32px_1fr_1fr_120px] gap-4 items-center p-1.5 py-2 rounded hover:bg-white/5 group transition-colors cursor-pointer"
                                                                    onClick={() => handleSongClick(song, index)}
                                                                >
                                                                    <div className="w-8 text-center">
                                                                        {isCurrentSong && isPlaying ? (
                                                                            <div className="flex items-center justify-center">
                                                                                <div className="flex items-end justify-center gap-0.5 h-3">
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0s' }} />
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.2s' }} />
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.4s' }} />
                                                                                    <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.1s' }} />
                                                                                </div>
                                                                            </div>
                                                                        ) : isCurrentSong ? (
                                                                            <Play className="w-4 h-4 mx-auto text-green-500" />
                                                                        ) : (
                                                                            <>
                                                                                <span className="text-muted-foreground group-hover:hidden text-sm">
                                                                                    {index + 1}
                                                                                </span>
                                                                                <Play className="w-4 h-4 mx-auto hidden group-hover:block" />
                                                                            </>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
                                                                            {song.image?.length > 0 ? (
                                                                                <img
                                                                                    src={song.image.find(img => img.quality === '500x500')?.url ||
                                                                                        song.image.find(img => img.quality === '150x150')?.url ||
                                                                                        song.image[song.image.length - 1]?.url}
                                                                                    alt={song.name}
                                                                                    className="w-full h-full object-cover rounded"
                                                                                    loading="lazy"
                                                                                    onError={(e) => {
                                                                                        e.target.src = '/default-playlist-image.png';
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <img
                                                                                    src="/default-playlist-image.png"
                                                                                    alt={song.name}
                                                                                    className="w-full h-full object-cover rounded"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500 font-semibold' : ''}`}>
                                                                                {decodeHtmlEntities(song.name)}
                                                                            </p>
                                                                            <p className="text-sm truncate text-muted-foreground">
                                                                                {song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="min-w-0">
                                                                        <p className="text-sm truncate text-muted-foreground">
                                                                            {song.album?.name ? decodeHtmlEntities(song.album.name) : 'Unknown Album'}
                                                                        </p>
                                                                    </div>

                                                                    <div className="flex items-center justify-between min-w-0">
                                                                        <span className="text-sm text-muted-foreground mr-4">
                                                                            {formatDuration(song.duration)}
                                                                        </span>
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="p-1 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <MoreVertical className="w-4 h-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end" className="w-48 z-9999">
                                                                                <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, song)}>
                                                                                    <Plus className="w-4 h-4 mr-2" />
                                                                                    Add to playlist
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={(e) => handleGoToArtist(e, song)}>
                                                                                    <User className="w-4 h-4 mr-2" />
                                                                                    Go to artist
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e) => handleGoToAlbum(e, song)}>
                                                                                    <Disc className="w-4 h-4 mr-2" />
                                                                                    Go to album
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={(e) => handleShare(e, song)}>
                                                                                    <Share className="w-4 h-4 mr-2" />
                                                                                    Share
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e) => handleDownload(e, song)}>
                                                                                    <Download className="w-4 h-4 mr-2" />
                                                                                    Download
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleLike(song).catch(error => {
                                                                                            console.error('Error toggling song like:', error);
                                                                                        });
                                                                                    }}
                                                                                    className={isLiked(song.id) ? 'text-red-500 font-medium' : ''}
                                                                                >
                                                                                    <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                                                                                    {isLiked(song.id) ? 'Unlike' : 'Like'}
                                                                                </DropdownMenuItem>
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Load More Songs Button */}
                                                {hasMoreSongs && (
                                                    <div className="flex justify-center mt-6 md:mt-8 mb-6 md:mb-0">
                                                        <Button
                                                            variant="outline"
                                                            onClick={loadMoreSongs}
                                                            disabled={loadingMore}
                                                            className="px-6 md:px-8"
                                                        >
                                                            {loadingMore ? 'Loading...' : 'Load More Songs'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        ) : null}
                                    </div>
                                )}

                                {activeTab === 'playlists' && (
                                    <div className="py-4 md:py-6">
                                        {hasLoaded && playlists.length === 0 ? (
                                            <div className="text-center py-12">
                                                <ListMusic className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                                <h3 className="text-lg font-medium mb-2">No playlists found</h3>
                                                <p className="text-muted-foreground">
                                                    Try exploring other genres
                                                </p>
                                            </div>
                                        ) : playlists.length > 0 ? (
                                            <>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-24">
                                                    {playlists.map((playlist, index) => (
                                                        <div
                                                            key={playlist.id || index}
                                                            className="p-3 md:p-4 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer group"
                                                            onClick={() => handlePlaylistClick(playlist.id)}
                                                        >
                                                            <div className="aspect-square w-full rounded bg-muted mb-4 overflow-hidden relative">
                                                                {playlist.image?.length > 0 ? (
                                                                    <img
                                                                        src={playlist.image.find(img => img.quality === '500x500')?.url ||
                                                                            playlist.image.find(img => img.quality === '150x150')?.url ||
                                                                            playlist.image[playlist.image.length - 1]?.url}
                                                                        alt={playlist.name}
                                                                        className="w-full h-full object-cover rounded shadow"
                                                                        loading="lazy"
                                                                        onError={(e) => {
                                                                            e.target.src = '/default-playlist-image.png';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <img
                                                                        src="/default-playlist-image.png"
                                                                        alt={playlist.name}
                                                                        className="w-full h-full object-cover rounded shadow"
                                                                    />
                                                                )}
                                                            </div>

                                                            <div className="space-y-1">
                                                                <h3 className="font-medium truncate text-sm md:text-base">
                                                                    {decodeHtmlEntities(playlist.name)}
                                                                </h3>
                                                                <p className="text-xs md:text-sm text-muted-foreground truncate">
                                                                    {playlist.subtitle || 'Playlist'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Load More Playlists Button */}
                                                {hasMorePlaylists && (
                                                    <div className="flex justify-center mt-6 md:mt-8 mb-6 md:mb-0">
                                                        <Button
                                                            variant="outline"
                                                            onClick={loadMorePlaylists}
                                                            disabled={loadingMore}
                                                            className="px-6 md:px-8"
                                                        >
                                                            {loadingMore ? 'Loading...' : 'Load More Playlists'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </SidebarInset>

            {/* Add to Playlist Dialog */}
            <AddToPlaylistDialog
                open={addToPlaylistDialogOpen}
                onOpenChange={setAddToPlaylistDialogOpen}
                song={selectedSong}
            />
        </SidebarProvider >
    );
}