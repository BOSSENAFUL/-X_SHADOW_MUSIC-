/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, memo, useMemo } from "react";
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

const PlaylistCollage = memo(({ images }) => {
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
});

PlaylistCollage.displayName = "PlaylistCollage";

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
  const [playingId, setPlayingId] = useState(null);

  const { playSong } = useMusicPlayer();

  useEffect(() => {
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) {
      setHoveredColor("rgb(69, 10, 245)");
    }

    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.innerWidth >= 768) {
          if (!hoveredColor) setHoveredColor("rgb(69, 10, 245)");
        } else {
          setHoveredColor(null);
        }
      }, 200);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [hoveredColor]);

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

        if (!data.success || !data.data) {
          setRecentlyPlayedLoading(false);
          return;
        }

        const rawPlaylists = data.data || [];
        const needsCollage = rawPlaylists.filter(p =>
          p.source === 'user' && (!p.image || p.image.length === 0)
        );

        if (needsCollage.length === 0) {
          setRecentlyPlayed(rawPlaylists);
          setRecentlyPlayedLoading(false);
          return;
        }

        // 1. Fetch playlist details to get songIds (in parallel)
        const playlistDetails = await Promise.all(
          needsCollage.map(p => fetch(`/api/playlists/${p.playlistId}`).then(r => r.json()))
        );

        // 2. Collect unique song IDs from first 4 songs of each playlist
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

            const processed = rawPlaylists.map(p => {
              const details = playlistDetails.find(d => d.success && d.data?._id?.toString() === p.playlistId);
              if (details && details.data?.songIds) {
                const collageImages = details.data.songIds.slice(0, 4).map(id => {
                  const song = songCache[id];
                  if (!song) return '/def playlist image.jpg';
                  return song.image?.find(img => img.quality === '150x150')?.url ||
                    song.image?.find(img => img.quality === '500x500')?.url ||
                    song.image?.[song.image.length - 1]?.url ||
                    '/def playlist image.jpg';
                });
                if (collageImages.length >= 4) {
                  return { ...p, collageImages };
                }
              }
              return p;
            });
            setRecentlyPlayed(processed);
          } else {
            setRecentlyPlayed(rawPlaylists);
          }
        } else {
          setRecentlyPlayed(rawPlaylists);
        }
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
        try {
          const homeData = JSON.parse(cached);
          setNewReleases(homeData.newReleases || []);
          setTrendingPlaylists(homeData.trending || []);
          setTopHitsPlaylists(homeData.topHits || []);
          setEnglishTopPlaylists(homeData.englishTop || []);
          setLoading(false);
          setTrendingLoading(false);
          setTopHitsLoading(false);
          setEnglishTopLoading(false);
          // Still fetch in background to refresh cache
        } catch (e) {
          console.error("Cache parse error:", e);
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      try {
        if (!cached) {
          setLoading(true);
          setTrendingLoading(true);
          setTopHitsLoading(true);
          setEnglishTopLoading(true);
        }

        const results = await Promise.all([
          fetch(`${apiUrl}/api/search/playlists?query=new%20releases&page=0&limit=20`).then(r => r.json()),
          fetch(`${apiUrl}/api/search/playlists?query=trending&page=0&limit=20`).then(r => r.json()),
          fetch(`${apiUrl}/api/search/playlists?query=top%20hits&page=0&limit=20`).then(r => r.json()),
          fetch(`${apiUrl}/api/search/playlists?query=english%20top&page=0&limit=20`).then(r => r.json())
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

  const handlePlayClick = useCallback((item, type) => {
    setCurrentlyPlaying({ item, type });
    console.log(`Playing ${type}:`, item);
  }, []);

  // Play a playlist directly from any card (Recently played info or Home sections)
  const handlePlaylistPlay = useCallback(async (playlist, e = null) => {
    if (e) e.stopPropagation();
    const pid = playlist.playlistId || playlist.id;
    if (playingId === pid) return; // already loading
    setPlayingId(pid);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      let songs = [];

      const name = playlist.playlistName || playlist.name;
      const source = playlist.source || 'jiosaavn';
      const image = playlist.image || [];
      const songCount = playlist.songCount || 0;

      if (source === 'user') {
        const res = await fetch(`/api/playlists/${pid}`);
        const result = await res.json();
        if (result.success && result.data?.songIds?.length) {
          const songsRes = await fetch(`${apiUrl}/api/songs?ids=${result.data.songIds.join(',')}`);
          const songsData = await songsRes.json();
          if (songsData.success && songsData.data) {
            const map = {};
            songsData.data.forEach(s => { if (s) map[s.id] = s; });
            songs = result.data.songIds.map(id => map[id]).filter(Boolean);
          }
        }
      } else {
        const res = await fetch(`${apiUrl}/api/playlists?id=${pid}&page=0&limit=${songCount || 50}`);
        const data = await res.json();
        if (data.success && data.data?.songs) {
          songs = data.data.songs;
        }
      }

      if (songs.length > 0) {
        playSong(songs[0], songs, pid);

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
  }, [playingId, playSong, session?.user?.id]);

  const handleCardClick = useCallback((item, type) => {
    if (type === "playlist" && typeof item === "object" && item.id) {
      router.push(
        `/music/playlist/${item.id}?songCount=${item.songCount || 50}`
      );
    } else {
      console.log(`Clicked ${type}:`, item);
    }
  }, [router]);

  const handleShowAll = useCallback(() => {
    // Navigate to existing new releases page
    router.push("/music/discover/new-releases");
  }, [router]);

  const handleMouseLeave = useCallback(() => {
    if (window.innerWidth >= 768) {
      setHoveredColor("rgb(69, 10, 245)");
    } else {
      setHoveredColor(null);
    }
  }, []);

  // Extract dominant color from image
  const extractDominantColor = useCallback((imageUrl, playlistId) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Reduced dimensions for faster color extraction
          const size = 50;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imageData = ctx.getImageData(0, 0, size, size);
          const data = imageData.data;

          const colorCounts = {};

          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const brightness = (r + g + b) / 3;
            if (brightness < 40 || brightness > 220) continue;

            const color = `${Math.floor(r / 20) * 20},${Math.floor(g / 20) * 20},${Math.floor(b / 20) * 20}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }

          let dominantColor = "59,130,246";
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
  }, []);

  // On-demand color extraction when hovering
  const handlePlaylistHover = useCallback((playlist) => {
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
  }, [playlistColors, extractDominantColor]);



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
              <div className="absolute right-2 md:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20 hidden md:block">
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
                  <div className="h-full aspect-square shrink-0 relative bg-neutral-900 border-r border-white/5">
                    {(() => {
                      const collageImages = playlist.collageImages || (
                        playlist.source === 'user' && playlist.image?.length >= 4
                          ? playlist.image.map(img => img.url).filter(Boolean)
                          : null
                      );

                      if (collageImages && collageImages.length >= 4) {
                        return <PlaylistCollage images={collageImages} />;
                      }

                      return (
                        <img
                          src={
                            playlist.image?.[2]?.url ||
                            playlist.image?.[1]?.url ||
                            playlist.image?.[0]?.url ||
                            (typeof playlist.image === 'string' ? playlist.image : "/def playlist image.jpg")
                          }
                          alt={playlist.playlistName || "Playlist"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { e.target.src = "/def playlist image.jpg"; }}
                        />
                      );
                    })()}
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
                  <div className={`absolute right-2 md:right-3 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20 hidden md:block ${playingId === (playlist.playlistId || playlist.id) ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100'}`}>
                    <div
                      className="rounded-full w-8 h-8 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform "
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

          {/* Recently Played Section */}
          {!recentlyPlayedLoading && recentlyPlayed.length > 0 && (
            <PlaylistSection
              title="Recently Played"
              playlists={recentlyPlayed.slice(0, 20).map(p => ({
                ...p,
                id: p.playlistId,
                name: p.playlistName
              }))}
              loading={recentlyPlayedLoading}
              onShowAll={() => router.push("/music/discover/recently-played")}
              onPlaylistClick={(playlist) => {
                const pid = playlist.id || playlist.playlistId;
                if (playlist.source === "user") {
                  router.push(`/music/playlists/${pid}`);
                } else {
                  router.push(`/music/playlist/${pid}?songCount=${playlist.songCount || 50}`);
                }
              }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

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
