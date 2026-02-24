/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Heart, Search } from "lucide-react";

import { PlaylistSection } from "@/components/music/playlist-section";
import { IoMdPlay } from "react-icons/io";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { Loader2 } from "lucide-react";

export default function MusicPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [, setCurrentlyPlaying] = useState(null);
  const [newReleases, setNewReleases] = useState([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState([]);
  const [topHitsPlaylists, setTopHitsPlaylists] = useState([]);
  const [englishTopPlaylists, setEnglishTopPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [topHitsLoading, setTopHitsLoading] = useState(true);
  const [englishTopLoading, setEnglishTopLoading] = useState(true);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [recentlyPlayedLoading, setRecentlyPlayedLoading] = useState(true);
  const [playlistColors, setPlaylistColors] = useState({});
  const [hoveredColor, setHoveredColor] = useState(null);
  // Track which recently-played card is loading (play button spinner)
  const [playingId, setPlayingId] = useState(null);

  const { playSong } = useMusicPlayer();

  useEffect(() => {
    // Set default color only on desktop
    if (window.innerWidth >= 768) {
      setHoveredColor("rgb(69, 10, 245)");
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        if (!hoveredColor) setHoveredColor("rgb(69, 10, 245)");
      } else {
        setHoveredColor(null);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch recently played playlists whenever session is ready
  useEffect(() => {
    if (!session?.user?.id) {
      setRecentlyPlayedLoading(false);
      return;
    }
    const fetchRecentlyPlayed = async () => {
      try {
        setRecentlyPlayedLoading(true);
        const res = await fetch('/api/recently-played-playlists');
        const data = await res.json();
        if (data.success) setRecentlyPlayed(data.data || []);
      } catch (err) {
        console.error('Error fetching recently played playlists:', err);
      } finally {
        setRecentlyPlayedLoading(false);
      }
    };
    fetchRecentlyPlayed();
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchHomeSections = async () => {
      // Check session cache first
      const cached = sessionStorage.getItem('home_sections');
      if (cached) {
        const data = JSON.parse(cached);
        setNewReleases(data.newReleases || []);
        setTrendingPlaylists(data.trending || []);
        setTopHitsPlaylists(data.topHits || []);
        setEnglishTopPlaylists(data.englishTop || []);
        setLoading(false);
        setTrendingLoading(false);
        setTopHitsLoading(false);
        setEnglishTopLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      try {
        setLoading(true);
        setTrendingLoading(true);
        setTopHitsLoading(true);
        setEnglishTopLoading(true);

        const results = await Promise.all([
          fetch(`${apiUrl}/api/search/playlists?query=new%20releases&page=0&limit=6`).then(r => r.json()),
          fetch(`${apiUrl}/api/search/playlists?query=trending&page=0&limit=6`).then(r => r.json()),
          fetch(`${apiUrl}/api/search/playlists?query=top%20hits&page=0&limit=6`).then(r => r.json()),
          fetch(`${apiUrl}/api/search/playlists?query=english%20top&page=0&limit=6`).then(r => r.json())
        ]);

        const [newRes, trending, topHits, englishTop] = results;

        const homeData = {
          newReleases: newRes.success ? newRes.data.results : [],
          trending: trending.success ? trending.data.results : [],
          topHits: topHits.success ? topHits.data.results : [],
          englishTop: englishTop.success ? englishTop.data.results : []
        };

        setNewReleases(homeData.newReleases);
        setTrendingPlaylists(homeData.trending);
        setTopHitsPlaylists(homeData.topHits);
        setEnglishTopPlaylists(homeData.englishTop);

        sessionStorage.setItem('home_sections', JSON.stringify(homeData));
      } catch (error) {
        console.error("Error fetching home sections:", error);
      } finally {
        setLoading(false);
        setTrendingLoading(false);
        setTopHitsLoading(false);
        setEnglishTopLoading(false);
      }
    };

    fetchHomeSections();
  }, []);

  const handlePlayClick = (item, type) => {
    setCurrentlyPlaying({ item, type });
    console.log(`Playing ${type}:`, item);
  };

  // Play a playlist directly from any card (Recently played info or Home sections)
  const handlePlaylistPlay = async (playlist, e = null) => {
    if (e) e.stopPropagation();
    const pid = playlist.playlistId || playlist.id;
    if (playingId === pid) return; // already loading
    setPlayingId(pid);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      let songs = [];

      // Determine info for tracking
      const name = playlist.playlistName || playlist.name;
      const source = playlist.source || 'jiosaavn';
      const image = playlist.image || [];
      const songCount = playlist.songCount || 0;

      if (source === 'user') {
        // 1. Fetch user playlist to get songIds
        const res = await fetch(`/api/playlists/${pid}`);
        const result = await res.json();
        if (result.success && result.data?.songIds?.length) {
          // 2. Batch-fetch the actual songs
          const songsRes = await fetch(`${apiUrl}/api/songs?ids=${result.data.songIds.join(',')}`);
          const songsData = await songsRes.json();
          if (songsData.success && songsData.data) {
            // Preserve playlist order
            const map = {};
            songsData.data.forEach(s => { map[s.id] = s; });
            songs = result.data.songIds.map(id => map[id]).filter(Boolean);
          }
        }
      } else {
        // JioSaavn playlist (External)
        const res = await fetch(`${apiUrl}/api/playlists?id=${pid}&page=0&limit=${songCount || 50}`);
        const data = await res.json();
        if (data.success && data.data?.songs) {
          songs = data.data.songs;
        }
      }

      if (songs.length > 0) {
        // Start playback
        playSong(songs[0], songs, pid);

        // Track as recently played
        if (session?.user?.id) {
          const trackRes = await fetch('/api/recently-played-playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playlistData: {
                id: pid,
                name: name,
                image: image,
                songCount: songs.length,
                source: source,
                owner: playlist.owner || playlist.subtitle || (source === 'user' ? 'You' : 'JioSaavn')
              }
            }),
          });

          if (trackRes.ok) {
            // Refresh the recently played list on UI
            const updatedData = await trackRes.json();
            if (updatedData.success && updatedData.data) {
              setRecentlyPlayed(updatedData.data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error playing playlist:', err);
    } finally {
      setPlayingId(null);
    }
  };

  const handleCardClick = (item, type) => {
    if (type === "playlist" && typeof item === "object" && item.id) {
      // Navigate to playlist detail page with songCount
      router.push(
        `/music/playlist/${item.id}?songCount=${item.songCount || 50}`
      );
    } else {
      console.log(`Clicked ${type}:`, item);
    }
  };

  const handleShowAll = () => {
    // Navigate to existing new releases page
    router.push("/music/discover/new-releases");
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 768) {
      setHoveredColor("rgb(69, 10, 245)");
    } else {
      setHoveredColor(null);
    }
  };

  // Extract dominant color from image
  const extractDominantColor = (imageUrl, playlistId) => {
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

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const colorCounts = {};

          // Sample every 10th pixel for performance
          for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Skip very light or very dark colors
            const brightness = (r + g + b) / 3;
            if (brightness < 30 || brightness > 220) continue;

            const color = `${Math.floor(r / 15) * 15},${Math.floor(g / 15) * 15
              },${Math.floor(b / 15) * 15}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }

          // Find the most common color
          let dominantColor = "59,130,246"; // Default blue
          let maxCount = 0;

          for (const [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
              maxCount = count;
              dominantColor = color;
            }
          }

          const rgbColor = `rgb(${dominantColor})`;
          setPlaylistColors((prev) => ({
            ...prev,
            [playlistId]: rgbColor,
          }));
          resolve(rgbColor);
        } catch (error) {
          console.error("Error extracting color:", error);
          const fallbackColor = "rgb(59,130,246)";
          setPlaylistColors((prev) => ({
            ...prev,
            [playlistId]: fallbackColor,
          }));
          resolve(fallbackColor);
        }
      };

      img.onerror = () => {
        const fallbackColor = "rgb(59,130,246)";
        setPlaylistColors((prev) => ({
          ...prev,
          [playlistId]: fallbackColor,
        }));
        resolve(fallbackColor);
      };

      img.src = imageUrl;
    });
  };

  // On-demand color extraction when hovering
  const handlePlaylistHover = (playlist) => {
    const playlistId = playlist.playlistId || playlist.id;
    if (playlistColors[playlistId]) {
      setHoveredColor(playlistColors[playlistId]);
      return;
    }

    const imageUrl =
      playlist.collageImages?.[0] ||
      playlist.image?.[2]?.url ||
      playlist.image?.[1]?.url ||
      playlist.image?.[0]?.url;

    if (imageUrl) {
      extractDominantColor(imageUrl, playlistId).then(color => {
        setHoveredColor(color);
      });
    } else {
      setHoveredColor("rgb(69, 10, 245)");
    }
  };

  const PlaylistCollage = ({ images }) => {
    if (!images || images.length === 0) return null;
    const displayImages = images.slice(0, 4);

    return (
      <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
        {displayImages.map((src, idx) => (
          <div key={idx} className="relative w-full h-full overflow-hidden">
            <img
              src={src}
              alt={`Collage ${idx}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    );
  };



  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4 hidden md:block"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Discover</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Search Button */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => router.push("/music/search")}
                className="flex items-center justify-start gap-3 bg-muted/30 hover:bg-muted/50 border border-muted-foreground/20 hover:border-muted-foreground/30 transition-all duration-200 rounded-full h-9 w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64 px-4"
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="hidden sm:block text-sm text-muted-foreground text-left truncate">
                  Search music...
                </span>
                <span className="sm:hidden text-xs text-muted-foreground">
                  Search
                </span>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-3 md:p-6 space-y-6 md:space-y-8 pb-20 md:pb-6 relative">
          {/* Ambient Background Gradient */}
          <div
            className="absolute h-[15%] w-full top-0 left-0 pointer-events-none transition-colors duration-1000 ease-in-out z-0"
            style={{
              backgroundColor: hoveredColor
                ? hoveredColor.replace("rgb", "rgba").replace(")", ", 0.35)")
                : "transparent",
              maskImage: "linear-gradient(to bottom, black, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />


          {/* Quick Access Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {/* Liked Songs */}
            <div
              className="group relative flex items-center bg-white/5 hover:bg-white/10 transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10 "
              onClick={() => router.push("/music/favorites")}
              onMouseEnter={() => setHoveredColor("rgb(69, 10, 245)")}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="h-full aspect-square flex items-center justify-center shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(69, 10, 245), rgb(166, 174, 219))",
                }}
              >
                <Heart className="w-5 h-5 md:w-8 md:h-8 fill-white text-white " />
              </div>
              <div className="min-w-0 flex-1 px-2 md:px-3 py-2 flex items-center">
                <h3 className="font-bold text-[13px] md:text-[14px] lg:text-[16px] text-white line-clamp-2 leading-tight">
                  Liked Songs
                </h3>
              </div>

              {/* Play button overlay */}
              <div className="absolute right-2 md:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                <div
                  className="rounded-full w-8 h-8 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayClick({ type: "liked-songs" }, "liked-songs");
                  }}
                >
                  <IoMdPlay className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                </div>
              </div>
            </div>

            {/* Recently Played Playlists */}
            {recentlyPlayedLoading
              ? // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex items-center bg-white/5 rounded-[4px] h-14 md:h-16 lg:h-20 overflow-hidden animate-pulse"
                >
                  <div className="h-full aspect-square bg-muted shrink-0" />
                  <div className="min-w-0 flex-1 px-2 md:px-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))
              : recentlyPlayed.slice(0, 5).map((playlist) => (
                <div
                  key={playlist.playlistId}
                  className="group relative flex items-center bg-white/5 hover:bg-white/10 transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10"
                  onMouseEnter={() => handlePlaylistHover(playlist)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => {
                    if (playlist.source === 'user') {
                      router.push(`/music/playlists/${playlist.playlistId}`);
                    } else {
                      router.push(`/music/playlist/${playlist.playlistId}?songCount=${playlist.songCount || 50}`);
                    }
                  }}
                >
                  <div className="h-full aspect-square shrink-0 relative bg-neutral-800">
                    <img
                      src={
                        playlist.image?.[2]?.url ||
                        playlist.image?.[1]?.url ||
                        playlist.image?.[0]?.url ||
                        "/def playlist image.jpg"
                      }
                      alt={playlist.playlistName || "Playlist"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { e.target.src = "/def playlist image.jpg"; }}
                    />
                  </div>
                  <div className="min-w-0 flex-1 px-2 md:px-3 py-2 flex flex-col justify-center gap-0.5">
                    <h3 className="font-bold text-[13px] md:text-[14px] lg:text-[16px] text-white line-clamp-1 leading-tight">
                      {playlist.playlistName}
                    </h3>
                    {playlist.source === 'user' && (
                      <span className="text-[10px] text-white/40 font-medium uppercase tracking-wide">Your playlist</span>
                    )}
                  </div>

                  {/* Play button overlay */}
                  <div className={`absolute right-2 md:right-3 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20 ${playingId === (playlist.playlistId || playlist.id) ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div
                      className="rounded-full w-8 h-8 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                      onClick={(e) => handlePlaylistPlay(playlist, e)}
                    >
                      {playingId === (playlist.playlistId || playlist.id)
                        ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-black" />
                        : <IoMdPlay className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                      }
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* "New release" */}
          <PlaylistSection
            title="New Release"
            playlists={newReleases}
            loading={loading}
            onShowAll={handleShowAll}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={handlePlaylistPlay}
            playingId={playingId}
          />

          {/* Trending Playlists Section */}
          <PlaylistSection
            title="Trending Playlists"
            playlists={trendingPlaylists}
            loading={trendingLoading}
            onShowAll={() => router.push("/music/discover/playlists")}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={handlePlaylistPlay}
            playingId={playingId}
          />

          {/* Top Hits Playlists Section */}
          <PlaylistSection
            title="Top Hits Playlists"
            playlists={topHitsPlaylists}
            onShowAll={() => router.push("/music/discover/top-hits")}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={handlePlaylistPlay}
            playingId={playingId}
          />

          {/* English Top Playlists Section */}
          <PlaylistSection
            title="English Top Playlists"
            playlists={englishTopPlaylists}
            loading={englishTopLoading}
            onShowAll={() => router.push("/music/discover/english-top")}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={handlePlaylistPlay}
            playingId={playingId}
          />

          {/* Bottom padding to prevent content being hidden behind music player */}
          <div className="pb-24" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
