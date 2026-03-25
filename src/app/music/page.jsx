/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { PWAInstallBanner } from "@/components/music/pwa-install-banner";
import { IoMdPlay } from "react-icons/io";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Optimized Gradient Component to prevent full-page re-renders
const AmbientGradient = memo(({ color }) => {
  return (
    <div
      className="absolute top-0 left-0 w-full h-[260px] pointer-events-none transition-colors duration-1000 ease-out z-0"
      style={{
        backgroundColor: color
          ? color.replace("rgb", "rgba").replace(")", ", 0.35)")
          : "transparent",
        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 20%, rgba(0,0,0,0) 100%)",
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 20%, rgba(0,0,0,0) 100%)",
      }}
    />
  );
});

AmbientGradient.displayName = "AmbientGradient";

export default function MusicPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [newReleases, setNewReleases] = useState([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState([]);
  const [topHitsPlaylists, setTopHitsPlaylists] = useState([]);
  const [englishTopPlaylists, setEnglishTopPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [topHitsLoading, setTopHitsLoading] = useState(true);
  const [englishTopLoading, setEnglishTopLoading] = useState(true);
  const [communityPlaylists, setCommunityPlaylists] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [recentlyPlayedLoading, setRecentlyPlayedLoading] = useState(true);
  const [playlistColors, setPlaylistColors] = useState({});
  const [hoveredColor, setHoveredColor] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  const { playSong } = useMusicPlayer();

  useEffect(() => {
    let isMounted = true;
    // Set default color only on desktop - only once on mount
    if (window.innerWidth >= 768 && isMounted) {
      setHoveredColor("rgb(69, 10, 245)");
    }

    let timeoutId;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        if (window.innerWidth >= 768) {
          // Only set if not already hovering something specific
          setHoveredColor(prev => prev || "rgb(69, 10, 245)");
        } else {
          setHoveredColor(null);
        }
      }, 250);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Fetch recently played playlists whenever session is ready
  useEffect(() => {
    if (!session?.user?.id) {
      setRecentlyPlayedLoading(false);
      return;
    }

    let isMounted = true;
    const fetchRecentlyPlayed = async () => {
      try {
        if (isMounted) setRecentlyPlayedLoading(true);
        const res = await fetch('/api/recently-played-playlists');
        const data = await res.json();

        if (!isMounted) return;
        if (!data.success || !data.data) {
          setRecentlyPlayedLoading(false);
          return;
        }

        const rawPlaylists = data.data || [];
        const needsCollage = rawPlaylists.filter(p =>
          p.source === 'user' && (!p.image || p.image.length === 0)
        );

        if (needsCollage.length === 0) {
          if (isMounted) {
            setRecentlyPlayed(rawPlaylists);
            setRecentlyPlayedLoading(false);
          }
          return;
        }

        // 1. Fetch playlist details to get songIds (in parallel)
        const playlistDetails = await Promise.all(
          needsCollage.map(p => fetch(`/api/playlists/${p.playlistId}`).then(r => r.json()))
        );

        if (!isMounted) return;

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

          if (!isMounted) return;

          if (songsData.success && songsData.data) {
            const songCache = {};
            songsData.data.forEach(s => { if (s) songCache[s.id] = s; });

            const processed = rawPlaylists.map(p => {
              const details = playlistDetails.find(d => d.success && d.data?._id?.toString() === p.playlistId);
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
            if (isMounted) setRecentlyPlayed(processed);
          } else {
            if (isMounted) setRecentlyPlayed(rawPlaylists);
          }
        } else {
          if (isMounted) setRecentlyPlayed(rawPlaylists);
        }
      } catch (err) {
        console.error('Error fetching recently played playlists:', err);
      } finally {
        if (isMounted) setRecentlyPlayedLoading(false);
      }
    };
    fetchRecentlyPlayed();
    return () => { isMounted = false; };
  }, [session?.user?.id]);

  useEffect(() => {
    let isMounted = true;
    const fetchHomeSections = async () => {
      // Check session cache first
      const cached = sessionStorage.getItem('home_sections');
      if (cached && isMounted) {
        try {
          const homeData = JSON.parse(cached);
          setNewReleases(homeData.newReleases || []);
          setTrendingPlaylists(homeData.trending || []);
          setTopHitsPlaylists(homeData.topHits || []);
          setEnglishTopPlaylists(homeData.englishTop || []);
          setCommunityPlaylists(homeData.community || []);
          setLoading(false);
          setTrendingLoading(false);
          setTopHitsLoading(false);
          setEnglishTopLoading(false);
          setCommunityLoading(false);
          // Still fetch in background to refresh cache
        } catch (e) {
          console.error("Cache parse error:", e);
        }
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      try {
        if (!cached && isMounted) {
          setLoading(true);
          setTrendingLoading(true);
          setTopHitsLoading(true);
          setEnglishTopLoading(true);
        }

        const results = await Promise.all([
          fetch(`${apiUrl}/api/search/playlists?query=new%20releases&page=0&limit=20`).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`${apiUrl}/api/search/playlists?query=trending&page=0&limit=20`).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`${apiUrl}/api/search/playlists?query=top%20hits&page=0&limit=20`).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`${apiUrl}/api/search/playlists?query=english%20top&page=0&limit=20`).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`/api/playlists/community`).then(r => r.json()).catch(() => ({ success: false }))
        ]);
  
        if (!isMounted) return;
  
        const [newRes, trending, topHits, englishTop, communityRes] = results;
  
        const homeData = {
          newReleases: newRes.success ? newRes.data.results : [],
          trending: trending.success ? trending.data.results : [],
          topHits: topHits.success ? topHits.data.results : [],
          englishTop: englishTop.success ? englishTop.data.results : [],
          community: communityRes.success ? communityRes.data : []
        };
  
        setNewReleases(homeData.newReleases);
        setTrendingPlaylists(homeData.trending);
        setTopHitsPlaylists(homeData.topHits);
        setEnglishTopPlaylists(homeData.englishTop);
        setCommunityPlaylists(homeData.community);
  
        sessionStorage.setItem('home_sections', JSON.stringify(homeData));
      } catch (error) {
        console.error("Error fetching home sections:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setTrendingLoading(false);
          setTopHitsLoading(false);
          setEnglishTopLoading(false);
          setCommunityLoading(false);
        }
      }
    };
  
    fetchHomeSections();
    return () => { isMounted = false; };
  }, []);

  const handlePlayClick = useCallback((item, type) => {
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

          // Step 1: Downscale to 64x64 for speed and noise reduction
          const size = 64;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          // Step 2: Get center crop (avoid borders/logos)
          const cropSize = Math.floor(size * 0.8); // 80% center crop
          const cropOffset = Math.floor((size - cropSize) / 2);
          const imageData = ctx.getImageData(
            cropOffset,
            cropOffset,
            cropSize,
            cropSize
          );
          const data = imageData.data;

          // Step 3: Collect colors and quantize
          const colorCounts = {};

          // Sample every 16th pixel for performance (plenty for ambient blur)
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3] / 255;

            // Step 4: Filter out junk colors
            // Convert to linear luminance
            const rLinear = Math.pow(r / 255, 2.2);
            const gLinear = Math.pow(g / 255, 2.2);
            const bLinear = Math.pow(b / 255, 2.2);
            const luminance =
              0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;

            // Skip near-black, near-white, or transparent pixels
            if (luminance < 0.03 || luminance > 0.97 || a < 0.2) continue;

            // Quantize colors (group similar colors)
            const quantizedR = Math.floor(r / 16) * 16;
            const quantizedG = Math.floor(g / 16) * 16;
            const quantizedB = Math.floor(b / 16) * 16;
            const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;

            colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
          }

          // Step 5: Create palette of dominant colors
          const palette = Object.entries(colorCounts)
            .map(([color, count]) => {
              const [r, g, b] = color.split(",").map(Number);

              // Calculate saturation
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const saturation = max === 0 ? 0 : (max - min) / max;

              // Step 6: Score the palette (count * saturation^1.2)
              const score = count * Math.pow(saturation, 1.2);

              return { r, g, b, count, saturation, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 6); // Top 6 colors

          if (palette.length === 0) {
            const fallbackColor = "rgb(40,40,40)";
            setPlaylistColors((prev) => ({ ...prev, [playlistId]: fallbackColor }));
            resolve(fallbackColor);
            return;
          }

          // Step 7: Choose best color (highest scoring with good saturation)
          let bestColor = palette[0];

          // Prefer colors with better saturation if score is close
          for (let i = 1; i < Math.min(3, palette.length); i++) {
            const candidate = palette[i];
            if (
              candidate.score > bestColor.score * 0.7 &&
              candidate.saturation > bestColor.saturation * 1.2
            ) {
              bestColor = candidate;
            }
          }

          // Step 8: Tweak for vibrancy (convert to HSL and enhance)
          let { r, g, b } = bestColor;

          // Convert RGB to HSL
          r /= 255;
          g /= 255;
          b /= 255;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const diff = max - min;

          let h = 0,
            s = 0,
            l = (max + min) / 2;

          if (diff !== 0) {
            s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

            switch (max) {
              case r:
                h = (g - b) / diff + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / diff + 2;
                break;
              case b:
                h = (r - g) / diff + 4;
                break;
            }
            h /= 6;
          }

          // Enhance saturation and adjust lightness for optimal contrast
          s = Math.min(1, s * 1.2); // Increase saturation
          l = Math.max(0.1, Math.min(0.25, l * 0.6)); // Target much darker range

          // Convert HSL back to RGB
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          if (s === 0) {
            r = g = b = l; // achromatic
          } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }

          // Convert back to 0-255 range
          r = Math.round(r * 255);
          g = Math.round(g * 255);
          b = Math.round(b * 255);

          // Step 9: Ensure minimum contrast for white text (WCAG compliance)
          const finalLuminance =
            0.2126 * Math.pow(r / 255, 2.2) +
            0.7152 * Math.pow(g / 255, 2.2) +
            0.0722 * Math.pow(b / 255, 2.2);
          const whiteContrast = 1.05 / (finalLuminance + 0.05);

          if (whiteContrast < 4.5) {
            const factor = 0.7;
            r = Math.round(r * factor);
            g = Math.round(g * factor);
            b = Math.round(b * factor);
          }

          const rgbColor = `rgb(${r},${g},${b})`;
          setPlaylistColors((prev) => ({
            ...prev,
            [playlistId]: rgbColor,
          }));
          resolve(rgbColor);
        } catch (error) {
          console.error("Error extracting color:", error);
          const fallbackColor = "rgb(40,40,40)";
          setPlaylistColors((prev) => ({ ...prev, [playlistId]: fallbackColor }));
          resolve(fallbackColor);
        }
      };

      img.onerror = () => {
        const fallbackColor = "rgb(40,40,40)";
        setPlaylistColors((prev) => ({ ...prev, [playlistId]: fallbackColor }));
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
      const proxiedUrl = `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
      extractDominantColor(proxiedUrl, playlistId).then(color => {
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
          {/* Ambient Background Gradient (Isolated Component) */}
          <AmbientGradient color={hoveredColor} />

          {/* PWA Install Banner — mobile only */}
          <PWAInstallBanner />

          {/* Quick Access Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {/* Liked Songs */}
            <Link
              href="/music/favorites"
              className="group relative flex items-center bg-white/5 hover:bg-white/10 transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10"
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
                    e.preventDefault();
                    e.stopPropagation();
                    handlePlayClick({ type: "liked-songs" }, "liked-songs");
                  }}
                >
                  <IoMdPlay className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                </div>
              </div>
            </Link>

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
                <Link
                  key={playlist.playlistId}
                  href={playlist.source === 'user' ? `/music/playlists/${playlist.playlistId}` : `/music/playlist/${playlist.playlistId}?songCount=${playlist.songCount || 50}`}
                  className="group relative flex items-center bg-white/5 hover:bg-white/10 transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10"
                  onMouseEnter={() => handlePlaylistHover(playlist)}
                  onMouseLeave={handleMouseLeave}
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
                            (typeof playlist.image === 'string' ? playlist.image : "/default-playlist-image.png")
                          }
                          alt={playlist.playlistName || "Playlist"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { e.target.src = "/default-playlist-image.png"; }}
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
                      onClick={(e) => {
                        e.preventDefault();
                        handlePlaylistPlay(playlist, e);
                      }}
                    >
                      {playingId === (playlist.playlistId || playlist.id)
                        ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-black" />
                        : <IoMdPlay className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                      }
                    </div>
                  </div>
                </Link>
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

          {/* Community Playlists Section */}
          {(communityLoading || communityPlaylists.length > 0) && (
            <PlaylistSection
              title="Community Playlists"
              playlists={communityPlaylists}
              loading={communityLoading}
              onShowAll={() => router.push("/music/discover/community")}
              onPlaylistClick={(playlist) => {
                const pid = playlist.id || playlist.playlistId;
                router.push(`/music/playlists/${pid}`);
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
