/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import AdsterraBanner from "@/components/AdsterraBanner";
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
import { Heart, Search, MessageSquare, Radio } from "lucide-react";

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
  const { data: session, status: sessionStatus } = useSession();
  const [popularHindiPlaylists, setPopularHindiPlaylists] = useState([]);
  const [popularHindiLoading, setPopularHindiLoading] = useState(true);
  const [popularHindiSectionId, setPopularHindiSectionId] = useState(null);
  // DB-driven sections from spotify-playlists DB
  const [dbSections, setDbSections] = useState({
    newTrending: { playlists: [], sectionId: null, loading: true },
    bollywoodRomance: { playlists: [], sectionId: null, loading: true },
    chillSad: { playlists: [], sectionId: null, loading: true },
    popularParty: { playlists: [], sectionId: null, loading: true },
    englishTopHits: { playlists: [], sectionId: null, loading: true },
    englishTrending: { playlists: [], sectionId: null, loading: true },
    popEssentials: { playlists: [], sectionId: null, loading: true },
    danceHits: { playlists: [], sectionId: null, loading: true },
  });
  const [communityPlaylists, setCommunityPlaylists] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [recentlyPlayedLoading, setRecentlyPlayedLoading] = useState(true);
  const [recommendedMixes, setRecommendedMixes] = useState([]);
  const [mixesLoading, setMixesLoading] = useState(true);
  const [mixesRefreshing, setMixesRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  const [playlistColors, setPlaylistColors] = useState({});
  const [hoveredColor, setHoveredColor] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  // Read feed preference from localStorage (set in Settings)
  const [feedPreference, setFeedPreference] = useState('all');

  // Read from localStorage after mount + re-read when tab becomes visible
  useEffect(() => {
    const read = () => {
      const pref = localStorage.getItem('feed_preference') || 'all';
      setFeedPreference(pref);
    };
    read(); // initial read after hydration
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') read();
    });
    return () => document.removeEventListener('visibilitychange', read);
  }, []);

  const showIndian = feedPreference === 'indian' || feedPreference === 'all';
  const showGlobal = feedPreference === 'global' || feedPreference === 'all';

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
    if (sessionStatus === "loading") return;

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
                  const url =
                    song.image?.find(img => img.quality === '150x150')?.url ||
                    song.image?.find(img => img.quality === '500x500')?.url ||
                    song.image?.[song.image.length - 1]?.url;
                  // Validate it's a real URL before using it
                  if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
                    return url;
                  }
                  return '/default-playlist-image.png';
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
  }, [session?.user?.id, sessionStatus]);

  // Fetch remaining DB sections in one batch
  useEffect(() => {
    let isMounted = true;

    const SECTION_NAMES = {
      newTrending: 'new & trending',
      bollywoodRomance: 'bollywood romance',
      chillSad: 'chill & sad',
      popularParty: 'popular party playlists',
    };

    // English sections share names with Hindi ones — match by hardcoded ID
    const ENGLISH_SECTION_IDS = {
      englishTopHits: '6a04071717b699631f905913',
      englishTrending: '6a047203f2b5dded647a6dcf',
      popEssentials: '6a0680775b5c126be7357acc',
      danceHits: '6a08919dc1eb7a1d81d81ca0',
    };

    const CACHE_KEY = 'db_sections_data_v3';
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    const fetchDbSections = async () => {
      // Fast path: serve from cache
      try {
        const cachedRaw = sessionStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const { data, ts } = JSON.parse(cachedRaw);
          if (Date.now() - ts < CACHE_TTL && data) {
            if (isMounted) {
              setDbSections({
                newTrending: { playlists: data.newTrending || [], sectionId: data.newTrendingId || null, loading: false },
                bollywoodRomance: { playlists: data.bollywoodRomance || [], sectionId: data.bollywoodRomanceId || null, loading: false },
                chillSad: { playlists: data.chillSad || [], sectionId: data.chillSadId || null, loading: false },
                popularParty: { playlists: data.popularParty || [], sectionId: data.popularPartyId || null, loading: false },
                englishTopHits: { playlists: data.englishTopHits || [], sectionId: data.englishTopHitsId || null, loading: false },
                englishTrending: { playlists: data.englishTrending || [], sectionId: data.englishTrendingId || null, loading: false },
                popEssentials: { playlists: data.popEssentials || [], sectionId: data.popEssentialsId || null, loading: false },
                danceHits: { playlists: data.danceHits || [], sectionId: data.danceHitsId || null, loading: false },
              });
            }
            return;
          }
        }
      } catch { /* ignore */ }

      try {
        // Fetch all sections once
        const sectionsRes = await fetch('/api/sections');
        const sectionsData = await sectionsRes.json();
        if (!isMounted || !sectionsData.success) return;

        // Match Hindi sections by name
        const matched = {};
        for (const [key, name] of Object.entries(SECTION_NAMES)) {
          const found = sectionsData.data.find(s => s.name.toLowerCase() === name);
          matched[key] = found?._id ?? null;
        }
        // English sections matched by hardcoded ID (avoid name collision with Hindi)
        for (const [key, id] of Object.entries(ENGLISH_SECTION_IDS)) {
          matched[key] = sectionsData.data.find(s => s._id === id)?._id ?? id;
        }

        // Fetch playlists for all matched sections in parallel
        const fetchSection = async (sectionId) => {
          if (!sectionId) return [];
          const res = await fetch(`/api/spotify-playlists?sectionId=${sectionId}&limit=20`);
          const data = await res.json();
          if (!data.success) return [];
          return data.data.map(p => ({
            id: p._id,
            name: p.name,
            image: p.image ? [{ quality: 'default', url: p.image }] : [],
            songCount: p.songCount ?? 0,
            description: p.description ?? '',
            source: 'spotify',
            sourceUrl: p.sourceUrl ?? '',
            songIds: p.songIds ?? [],
          }));
        };

        const [
          newTrendingPlaylists,
          bollywoodRomancePlaylists,
          chillSadPlaylists,
          popularPartyPlaylists,
          englishTopHitsPlaylists,
          englishTrendingPlaylists,
          popEssentialsPlaylists,
          danceHitsPlaylists,
        ] = await Promise.all([
          fetchSection(matched.newTrending),
          fetchSection(matched.bollywoodRomance),
          fetchSection(matched.chillSad),
          fetchSection(matched.popularParty),
          fetchSection(matched.englishTopHits),
          fetchSection(matched.englishTrending),
          fetchSection(matched.popEssentials),
          fetchSection(matched.danceHits),
        ]);

        if (!isMounted) return;

        const newState = {
          newTrending: { playlists: newTrendingPlaylists, sectionId: matched.newTrending, loading: false },
          bollywoodRomance: { playlists: bollywoodRomancePlaylists, sectionId: matched.bollywoodRomance, loading: false },
          chillSad: { playlists: chillSadPlaylists, sectionId: matched.chillSad, loading: false },
          popularParty: { playlists: popularPartyPlaylists, sectionId: matched.popularParty, loading: false },
          englishTopHits: { playlists: englishTopHitsPlaylists, sectionId: matched.englishTopHits, loading: false },
          englishTrending: { playlists: englishTrendingPlaylists, sectionId: matched.englishTrending, loading: false },
          popEssentials: { playlists: popEssentialsPlaylists, sectionId: matched.popEssentials, loading: false },
          danceHits: { playlists: danceHitsPlaylists, sectionId: matched.danceHits, loading: false },
        };

        setDbSections(newState);

        // Cache
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            ts: Date.now(),
            data: {
              newTrending: newTrendingPlaylists,
              newTrendingId: matched.newTrending,
              bollywoodRomance: bollywoodRomancePlaylists,
              bollywoodRomanceId: matched.bollywoodRomance,
              chillSad: chillSadPlaylists,
              chillSadId: matched.chillSad,
              popularParty: popularPartyPlaylists,
              popularPartyId: matched.popularParty,
              englishTopHits: englishTopHitsPlaylists,
              englishTopHitsId: matched.englishTopHits,
              englishTrending: englishTrendingPlaylists,
              englishTrendingId: matched.englishTrending,
              popEssentials: popEssentialsPlaylists,
              popEssentialsId: matched.popEssentials,
              danceHits: danceHitsPlaylists,
              danceHitsId: matched.danceHits,
            },
          }));
        } catch { /* storage full */ }

      } catch (err) {
        console.error('Error fetching DB sections:', err);
        if (isMounted) {
          setDbSections(prev => ({
            newTrending: { ...prev.newTrending, loading: false },
            bollywoodRomance: { ...prev.bollywoodRomance, loading: false },
            chillSad: { ...prev.chillSad, loading: false },
            popularParty: { ...prev.popularParty, loading: false },
            englishTopHits: { ...prev.englishTopHits, loading: false },
            englishTrending: { ...prev.englishTrending, loading: false },
            popEssentials: { ...prev.popEssentials, loading: false },
            danceHits: { ...prev.danceHits, loading: false },
          }));
        }
      }
    };

    fetchDbSections();
    return () => { isMounted = false; };
  }, []);

  // Fetch "Popular Hindi Playlists" section from the playlists DB
  useEffect(() => {
    let isMounted = true;

    const fetchPopularHindi = async () => {
      try {
        const SECTION_CACHE_KEY = 'popular_hindi_section_id';
        const PLAYLISTS_CACHE_KEY = 'popular_hindi_playlists';
        const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

        // Fast path: serve cached playlists if still fresh
        try {
          const cachedRaw = sessionStorage.getItem(PLAYLISTS_CACHE_KEY);
          if (cachedRaw) {
            const { data, ts } = JSON.parse(cachedRaw);
            if (Date.now() - ts < CACHE_TTL && data?.length > 0) {
              if (isMounted) {
                setPopularHindiPlaylists(data);
                // Also restore the sectionId so Show All works
                const cachedSectionId = sessionStorage.getItem(SECTION_CACHE_KEY);
                if (cachedSectionId) setPopularHindiSectionId(cachedSectionId);
                setPopularHindiLoading(false);
              }
              return;
            }
          }
        } catch { /* ignore bad cache */ }

        // Resolve sectionId (cached separately — it never changes)
        let sectionId = sessionStorage.getItem(SECTION_CACHE_KEY);

        if (!sectionId) {
          const [genresData, sectionsData] = await Promise.all([
            fetch('/api/genres').then(r => r.json()),
            fetch('/api/sections').then(r => r.json()),
          ]);

          if (!isMounted) return;
          if (!genresData.success || !sectionsData.success) {
            if (isMounted) setPopularHindiLoading(false);
            return;
          }

          const hindiGenre = genresData.data.find(
            (g) => g.name.toLowerCase() === 'hindi'
          );
          if (!hindiGenre) { if (isMounted) setPopularHindiLoading(false); return; }

          const popularSection = sectionsData.data.find(
            (s) => s.genreId === hindiGenre._id &&
              s.name.toLowerCase() === 'popular hindi playlists'
          );
          if (!popularSection) { if (isMounted) setPopularHindiLoading(false); return; }

          sectionId = popularSection._id;
          sessionStorage.setItem(SECTION_CACHE_KEY, sectionId);
        }

        if (isMounted) setPopularHindiSectionId(sectionId);

        // Fetch all playlists for that section
        const playlistsRes = await fetch(
          `/api/spotify-playlists?sectionId=${sectionId}&limit=20`
        );
        const playlistsData = await playlistsRes.json();
        if (!isMounted || !playlistsData.success) return;

        const normalised = playlistsData.data.map((p) => ({
          id: p._id,
          name: p.name,
          image: p.image ? [{ quality: 'default', url: p.image }] : [],
          songCount: p.songCount ?? 0,
          description: p.description ?? '',
          source: 'spotify',
          sourceUrl: p.sourceUrl ?? '',
          songIds: p.songIds ?? [],
        }));

        if (isMounted) setPopularHindiPlaylists(normalised);

        // Cache the normalised result with a timestamp
        try {
          sessionStorage.setItem(PLAYLISTS_CACHE_KEY, JSON.stringify({
            data: normalised,
            ts: Date.now(),
          }));
        } catch { /* storage full — skip */ }

      } catch (err) {
        console.error('Error fetching Popular Hindi Playlists:', err);
      } finally {
        if (isMounted) setPopularHindiLoading(false);
      }
    };

    fetchPopularHindi();
    return () => { isMounted = false; };
  }, []);

  // Fetch community playlists
  useEffect(() => {
    let isMounted = true;
    const fetchCommunity = async () => {
      try {
        const res = await fetch('/api/playlists/community');
        const data = await res.json();
        if (isMounted && data.success) {
          setCommunityPlaylists(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching community playlists:', err);
      } finally {
        if (isMounted) setCommunityLoading(false);
      }
    };
    fetchCommunity();
    return () => { isMounted = false; };
  }, []);

  // Fetch recommended mixes (returns cached instantly, generates in background)
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session?.user?.id) {
      setMixesLoading(false);
      return;
    }
    let isMounted = true;
    const fetchMixes = async () => {
      if (isMounted) setMixesLoading(true);
      try {
        const res = await fetch('/api/recommendations');
        const data = await res.json();
        if (isMounted && data.success && data.data?.length > 0) {
          // Shape each mix into the format PlaylistSection / PlaylistCard expects
          const shaped = data.data.map((mix, i) => ({
            id: mix._id ? `mix-${mix._id}` : `mix-${mix.mixIndex}-${i}`,
            _mixId: mix._id,
            name: mix.title,
            songIds: mix.songIds || [],
            source: 'mix',
            // Use coverImages for collage (4 imgs) or single cover
            image: mix.coverImage
              ? [{ quality: '500x500', url: mix.coverImage }]
              : [],
            collageImages: null,
            songCount: mix.songIds?.length || 0,
            description: `${mix.songIds?.length || 0} songs`,
          }));
          setRecommendedMixes(shaped);
        }
      } catch (err) {
        console.error('Error fetching recommended mixes:', err);
      } finally {
        if (isMounted) setMixesLoading(false);
      }
    };
    fetchMixes();
    return () => { isMounted = false; };
  }, [session?.user?.id, sessionStatus]);

  const shapeMixes = (rawMixes) => rawMixes.map((mix, i) => ({
    id: mix._id ? `mix-${mix._id}` : `mix-${mix.mixIndex}-${i}`,
    _mixId: mix._id,
    name: mix.title,
    songIds: mix.songIds || [],
    source: 'mix',
    // coverImage is stored in DB — same image every reload until regenerated
    image: mix.coverImage
      ? [{ quality: '500x500', url: mix.coverImage }]
      : [],
    collageImages: null,
    songCount: mix.songIds?.length || 0,
    description: `${mix.songIds?.length || 0} songs`,
  }));

  const handleRefreshMixes = async () => {
    if (mixesRefreshing || refreshCooldown > 0) return;
    setMixesRefreshing(true);
    try {
      const res = await fetch('/api/recommendations', { method: 'DELETE' });
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setRecommendedMixes(shapeMixes(data.data));
      } else if (data.rateLimited) {
        setRefreshCooldown(data.retryAfter || 300);
      }
    } catch (err) {
      console.error('Error refreshing mixes:', err);
    } finally {
      setMixesRefreshing(false);
    }
  };

  // Cooldown countdown
  useEffect(() => {
    if (refreshCooldown <= 0) return;
    const timer = setInterval(() => {
      setRefreshCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshCooldown]);

  const handlePlayClick = useCallback(async (item, type) => {
    if (type === 'liked-songs') {
      const pid = 'liked-songs';
      if (playingId === pid) return;
      setPlayingId(pid);
      try {
        const res = await fetch(`/api/liked-songs?userId=${session?.user?.id}`);
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          // Map stored liked song format to the format playSong expects
          const songs = data.data.map(s => ({
            id: s.songId,
            name: s.songName,
            artists: { primary: s.artists || [] },
            album: s.album,
            duration: s.duration,
            image: s.image,
            downloadUrl: s.downloadUrl,
          }));
          playSong(songs[0], songs, pid);
        }
      } catch (err) {
        console.error('Error playing liked songs:', err);
      } finally {
        setPlayingId(null);
      }
    }
  }, [playingId, playSong, session?.user?.id]);

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

      if (source === 'mix') {
        // Recommended mix — songIds are stored directly on the object
        const ids = playlist.songIds || [];
        if (ids.length > 0) {
          const songsRes = await fetch(`${apiUrl}/api/songs?ids=${ids.slice(0, 50).join(',')}`);
          const songsData = await songsRes.json();
          if (songsData.success && songsData.data) {
            const map = {};
            songsData.data.forEach(s => { if (s) map[s.id] = s; });
            songs = ids.map(id => map[id]).filter(Boolean);
          }
        }
      } else if (source === 'user') {
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
      } else if (source === 'spotify') {
        // The list API strips songIds for payload size — fetch the full doc
        // via /api/playlists/[id] which transparently handles the spotify fallback
        const fullRes = await fetch(`/api/playlists/${pid}`).then(r => r.json()).catch(() => ({}));
        const ids = fullRes.success ? (fullRes.data?.songIds ?? []) : [];
        if (ids.length > 0) {
          const songsRes = await fetch(`${apiUrl}/api/songs?ids=${ids.join(',')}`);
          const songsData = await songsRes.json();
          if (songsData.success && songsData.data) {
            const map = {};
            songsData.data.forEach(s => { if (s) map[s.id] = s; });
            songs = ids.map(id => map[id]).filter(Boolean);
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
          // Normalize image to the expected array format if it's a string
          const rawImageUrl = typeof image === 'string' ? image : null;
          const isValidImageUrl = rawImageUrl &&
            (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://'));
          const normalizedImage = isValidImageUrl
            ? [{ quality: 'default', url: rawImageUrl }]
            : Array.isArray(image) ? image : [];

          const trackRes = await fetch('/api/recently-played-playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playlistData: {
                id: source === 'mix' ? playlist._mixId : pid,
                name: name,
                image: normalizedImage,
                songCount: songs.length,
                source: source === 'mix' ? 'user' : source,
                owner: source === 'mix'
                  ? 'Your Mix'
                  : (playlist.userName || playlist.owner || playlist.subtitle || (source === 'user' ? 'You' : source === 'spotify' ? 'Spotify' : 'JioSaavn'))
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

    // Only proxy absolute http/https URLs — skip relative/default paths
    if (imageUrl && typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
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

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Search Bar - Hidden on mobile */}
              <div className="relative hidden sm:block">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/music/search")}
                  className="flex items-center justify-start gap-3 bg-muted/30 hover:bg-muted/50 border border-muted-foreground/20 hover:border-muted-foreground/30 transition-all duration-200 rounded-full h-9 w-40 md:w-48 lg:w-56 xl:w-64 px-4"
                >
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground text-left truncate">
                    Search music...
                  </span>
                </Button>
              </div>

              {/* Mobile Radio Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/music/radio")}
                className="h-9 w-9 rounded-full bg-muted/30 hover:bg-muted/50 border border-muted-foreground/20 hover:border-muted-foreground/30 flex items-center justify-center shrink-0 md:hidden relative"
                title="Radio Stations"
              >
                <Radio className="w-4 h-4 text-muted-foreground" />
              </Button>

              {/* Mobile Community Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/music/chat")}
                className="h-9 w-9 rounded-full bg-muted/30 hover:bg-muted/50 border border-muted-foreground/20 hover:border-muted-foreground/30 flex items-center justify-center shrink-0 md:hidden relative"
                title="Community Hub"
              >
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                {/* Red dot to indicate activity / new feature */}
                <span className="absolute top-[6px] right-[6px] w-[8px] h-[8px] bg-red-500 rounded-full border border-background shadow-sm animate-pulse"></span>
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
              className="group relative flex items-center bg-white/[0.08] hover:bg-white/[0.13] transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10"
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
                <h3 className="font-bold text-[13px] md:text-[14px] lg:text-[16px] text-foreground line-clamp-2 leading-tight">
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
                  {playingId === 'liked-songs'
                    ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-black" />
                    : <IoMdPlay className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                  }
                </div>
              </div>
            </Link>

            {/* Recently Played Playlists */}
            {recentlyPlayedLoading
              ? // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex items-center bg-secondary rounded-[4px] h-14 md:h-16 lg:h-20 overflow-hidden animate-pulse"
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
                  href={playlist.source === 'user' || playlist.source === 'spotify' ? `/music/playlists/${playlist.playlistId}` : `/music/playlist/${playlist.playlistId}?songCount=${playlist.songCount || 50}`}
                  className="group relative flex items-center bg-white/[0.08] hover:bg-white/[0.13] transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10"
                  onMouseEnter={() => handlePlaylistHover(playlist)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="h-full aspect-square shrink-0 relative bg-muted border-r border-border">
                    {(() => {
                      const isValidUrl = (url) =>
                        typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));
                      const collageImages = playlist.collageImages || (
                        playlist.source === 'user' && playlist.image?.length >= 4
                          ? playlist.image.map(img => img.url).filter(isValidUrl)
                          : null
                      );

                      if (collageImages && collageImages.length >= 4) {
                        return <PlaylistCollage images={collageImages} />;
                      }

                      return (
                        <img
                          src={(() => {
                            const url =
                              playlist.image?.[2]?.url ||
                              playlist.image?.[1]?.url ||
                              playlist.image?.[0]?.url ||
                              (typeof playlist.image === 'string' ? playlist.image : null);
                            if (!url || typeof url !== 'string') return '/default-playlist-image.png';
                            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url;
                            return '/default-playlist-image.png';
                          })()}
                          alt={playlist.playlistName || "Playlist"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { e.target.src = "/default-playlist-image.png"; }}
                        />
                      );
                    })()}
                  </div>
                  <div className="min-w-0 flex-1 px-2 md:px-3 py-2 flex flex-col justify-center gap-0.5">
                    <h3 className="font-bold text-[13px] md:text-[14px] lg:text-[16px] text-foreground line-clamp-1 leading-tight">
                      {playlist.playlistName}
                    </h3>
                    {playlist.source === 'user' && (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Your playlist</span>
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

          {/* Recommended Mixes — above Recently Played */}
          {(mixesLoading || recommendedMixes.length > 0) && (
            <PlaylistSection
              title="Your Mixes"
              playlists={recommendedMixes}
              loading={mixesLoading || mixesRefreshing}
              onPlaylistClick={(playlist) => {
                router.push(`/music/playlists/${playlist._mixId}`);
              }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
              extraActions={
                <button
                  onClick={handleRefreshMixes}
                  disabled={mixesRefreshing || refreshCooldown > 0}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50 disabled:opacity-50"
                  title={refreshCooldown > 0 ? `Cooldown: ${Math.ceil(refreshCooldown / 60)}m` : 'Regenerate mixes'}
                >
                  <Loader2 className={`w-3.5 h-3.5 ${mixesRefreshing ? 'animate-spin' : ''}`} />
                  {mixesRefreshing ? 'Refreshing...' : refreshCooldown > 0 ? `${Math.ceil(refreshCooldown / 60)}m` : 'Refresh'}
                </button>
              }
            />
          )}

          {/* Recently Played Section */}
          {(recentlyPlayedLoading || recentlyPlayed.length > 0) && (
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
                if (playlist.source === "user" || playlist.source === "spotify") {
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

          {/* Popular Hindi Playlists — from our playlists DB */}
          {showIndian && (popularHindiLoading || popularHindiPlaylists.length > 0) && (
            <PlaylistSection
              title="Popular Hindi Playlists"
              playlists={popularHindiPlaylists}
              loading={popularHindiLoading}
              onShowAll={() => popularHindiSectionId && router.push(`/music/section/${popularHindiSectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* New & Trending */}
          {showIndian && (dbSections.newTrending.loading || dbSections.newTrending.playlists.length > 0) && (
            <PlaylistSection
              title="New & Trending"
              playlists={dbSections.newTrending.playlists}
              loading={dbSections.newTrending.loading}
              onShowAll={() => dbSections.newTrending.sectionId && router.push(`/music/section/${dbSections.newTrending.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* Bollywood Romance */}
          {showIndian && (dbSections.bollywoodRomance.loading || dbSections.bollywoodRomance.playlists.length > 0) && (
            <PlaylistSection
              title="Bollywood Romance"
              playlists={dbSections.bollywoodRomance.playlists}
              loading={dbSections.bollywoodRomance.loading}
              onShowAll={() => dbSections.bollywoodRomance.sectionId && router.push(`/music/section/${dbSections.bollywoodRomance.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* Chill & Sad */}
          {showIndian && (dbSections.chillSad.loading || dbSections.chillSad.playlists.length > 0) && (
            <PlaylistSection
              title="Chill & Sad"
              playlists={dbSections.chillSad.playlists}
              loading={dbSections.chillSad.loading}
              onShowAll={() => dbSections.chillSad.sectionId && router.push(`/music/section/${dbSections.chillSad.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* Popular Party Playlists */}
          {showIndian && (dbSections.popularParty.loading || dbSections.popularParty.playlists.length > 0) && (
            <PlaylistSection
              title="Popular Party Playlists"
              playlists={dbSections.popularParty.playlists}
              loading={dbSections.popularParty.loading}
              onShowAll={() => dbSections.popularParty.sectionId && router.push(`/music/section/${dbSections.popularParty.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* English Top Hits */}
          {showGlobal && (dbSections.englishTopHits.loading || dbSections.englishTopHits.playlists.length > 0) && (
            <PlaylistSection
              title="English Top Hits"
              playlists={dbSections.englishTopHits.playlists}
              loading={dbSections.englishTopHits.loading}
              onShowAll={() => dbSections.englishTopHits.sectionId && router.push(`/music/section/${dbSections.englishTopHits.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* English New & Trending */}
          {showGlobal && (dbSections.englishTrending.loading || dbSections.englishTrending.playlists.length > 0) && (
            <PlaylistSection
              title="English New & Trending"
              playlists={dbSections.englishTrending.playlists}
              loading={dbSections.englishTrending.loading}
              onShowAll={() => dbSections.englishTrending.sectionId && router.push(`/music/section/${dbSections.englishTrending.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* Pop Essentials */}
          {showGlobal && (dbSections.popEssentials.loading || dbSections.popEssentials.playlists.length > 0) && (
            <PlaylistSection
              title="Pop Essentials"
              playlists={dbSections.popEssentials.playlists}
              loading={dbSections.popEssentials.loading}
              onShowAll={() => dbSections.popEssentials.sectionId && router.push(`/music/section/${dbSections.popEssentials.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* Dance Hits */}
          {showGlobal && (dbSections.danceHits.loading || dbSections.danceHits.playlists.length > 0) && (
            <PlaylistSection
              title="Dance Hits"
              playlists={dbSections.danceHits.playlists}
              loading={dbSections.danceHits.loading}
              onShowAll={() => dbSections.danceHits.sectionId && router.push(`/music/section/${dbSections.danceHits.sectionId}`)}
              onPlaylistClick={(playlist) => { router.push(`/music/playlists/${playlist.id}`); }}
              onPlayClick={handlePlaylistPlay}
              playingId={playingId}
            />
          )}

          {/* Adsterra 300x250 Box Banner */}
          <AdsterraBanner width={300} height={250} adKey="cf722b4afa051a8fa9446f062dccfa49" />

          {/* Bottom padding to prevent content being hidden behind music player */}
          <div className="pb-24" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
