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

    const decodeHtmlEntities = (text) => {
        if (!text) return text;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
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

                    <div className="flex-1 overflow-y-auto">
                        {/* Giant Header skeleton */}
                        <div className="bg-accent/30 pt-16 pb-8 md:pt-24 md:pb-12 px-6 md:px-8 flex flex-col justify-end min-h-[200px] md:min-h-[260px]">
                            <div className="flex items-end gap-6">
                                <div className="flex-1">
                                    <div className="h-12 sm:h-[72px] md:h-[96px] lg:h-[128px] rounded-lg bg-accent w-1/2 md:w-1/3 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Body skeleton */}
                        <div className="space-y-8 px-4 md:px-6 py-6 pb-24">
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

                <div className="flex-1 overflow-y-auto">
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
                        <div className="space-y-8 px-4 md:px-6 py-6 pb-24">
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
                            <div className="px-2 md:px-6 pb-24">
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