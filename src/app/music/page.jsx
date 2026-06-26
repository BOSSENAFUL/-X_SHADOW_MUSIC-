/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, Fragment, memo } from "react";
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
import { Heart, Search, MessageSquare, Radio, Loader2, Mic, MoreVertical } from "lucide-react";

import { PlaylistSection } from "@/components/music/playlist-section";
import { PWAInstallBanner } from "@/components/music/pwa-install-banner";
import { IoMdPlay } from "react-icons/io";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { HiPause } from "react-icons/hi2";

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

const MOCK_PODCASTS = [
  {
    id: "just-wucka",
    title: "Just Wucka",
    cover: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop",
    episodes: [
      { id: "jw-ep1", title: "EP 1: Why Dogs Wear Hats", desc: "Today we dive deep into the psychology of yellow duck hats and why golden retrievers love them.", duration: "42 min", date: "2 days ago" },
      { id: "jw-ep2", title: "EP 2: Fetching the Truth", desc: "Is fetch a sport or a lifestyle? We debate with professional ball-chasers.", duration: "38 min", date: "1 week ago" }
    ]
  },
  {
    id: "anime-grind",
    title: "Anime Grind",
    cover: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop",
    episodes: [
      { id: "ag-ep1", title: "EP 45: Gym Music Tier List", desc: "Rating the best anime soundtracks to lift heavy weights to. Gurenge vs. Silhouette.", duration: "55 min", date: "Yesterday" }
    ]
  },
  {
    id: "chainsfr",
    title: "ChainsFR On Spotify",
    cover: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop",
    episodes: [
      { id: "cfr-ep1", title: "My Dumbest High School Stories", desc: "Talking about that one time I accidentally locked myself in the school basement during finals.", duration: "18 min", date: "4 days ago" }
    ]
  },
  {
    id: "distractible",
    title: "Distractible",
    cover: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop",
    episodes: [
      { id: "dist-ep1", title: "We Are All Getting Older", desc: "Mark, Bob, and Wade contemplate the passage of time, back pains, and the mysteries of fiber intake.", duration: "62 min", date: "3 days ago" }
    ]
  },
  {
    id: "trust-me-bro",
    title: "Trust Me Bro",
    cover: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&h=300&fit=crop",
    episodes: [
      { id: "tmb-ep1", title: "EP 82: Why the Pyramids are Actually UFOs", desc: "Trust me bro, the angles align perfectly with Orion's belt. We have zero proof, but a lot of confidence.", duration: "50 min", date: "5 days ago" }
    ]
  },
  {
    id: "trash-taste",
    title: "Trash Taste Podcast",
    cover: "https://images.unsplash.com/photo-1601987177651-8edfe6c20009?w=300&h=300&fit=crop",
    episodes: [
      { id: "tt-ep1", title: "EP 198: Our Worst Food Opinions Yet", desc: "Joey, Connor, and Garnt argue for two hours about why boneless chicken is better and bread is overrated.", duration: "128 min", date: "6 days ago" }
    ]
  },
  {
    id: "weekly-motivation",
    title: "Weekly Motivation",
    cover: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop",
    episodes: [
      { id: "wm-ep1", title: "Day 1: Rise & Dominate", desc: "Wake up with purpose. No excuses, no shortcuts. A heavy dose of focus for your morning routine.", duration: "12 min", date: "Monday" }
    ]
  },
  {
    id: "figuring-out",
    title: "Figuring Out",
    cover: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop",
    episodes: [
      { id: "fo-ep1", title: "Building a 100 Crore Brand with Zero Funding", desc: "Raj Shamani talks with top entrepreneurs about unit economics, scale, and the mental grit required.", duration: "48 min", date: "3 days ago" }
    ]
  },
  {
    id: "mindset-meditation",
    title: "The Mindset Meditation",
    cover: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&h=300&fit=crop",
    episodes: [
      { id: "mm-ep1", title: "10-Minute Anxiety Release Session", desc: "Sit back, breathe deeply, and align your focus. Perfect for midday stress relief.", duration: "10 min", date: "2 days ago" }
    ]
  },
  {
    id: "at-podcast",
    title: "AT Podcast",
    cover: "https://images.unsplash.com/photo-1610116306796-6fea9f4fae38?w=300&h=300&fit=crop",
    episodes: [
      { id: "at-ep1", title: "Coding in your Sleep: The Future of AI", desc: "Discussing autonomous coding models, developer workflows, and human-in-the-loop pair programming.", duration: "32 min", date: "Last week" }
    ]
  },
  {
    id: "mrballen",
    title: "MrBallen Podcast",
    cover: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=300&h=300&fit=crop",
    episodes: [
      { id: "mb-ep1", title: "The Man Who Lived In The Walls", desc: "A terrifying story of a family who realized someone was living behind their living room drywall for months.", duration: "44 min", date: "1 week ago" }
    ]
  },
  {
    id: "true-story-rwj",
    title: "True Story Podcast",
    cover: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop",
    episodes: [
      { id: "ts-ep1", title: "The Wildest Heist You Never Heard Of", desc: "Ray William Johnson tells the unbelievable true story of the diamond heist in Antwerp.", duration: "25 min", date: "5 days ago" }
    ]
  }
];

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
  const [followedPodcasts, setFollowedPodcasts] = useState([]);
  const [podcastEpisodes, setPodcastEpisodes] = useState([]);
  const [podcastsLoading, setPodcastsLoading] = useState(false);

  const getProxiedImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(url)}`
      : url;
  };

  const loadPodcastsData = async () => {
    if (sessionStatus !== 'authenticated') return;
    try {
      setPodcastsLoading(true);
      // 1. Fetch followed shows
      const followRes = await fetch('/api/youtube/follow');
      const followData = await followRes.json();
      
      if (followData.success && followData.results.length > 0) {
        // 2. Fetch unified subscriptions feed
        const feedRes = await fetch('/api/youtube/subscriptions');
        const feedData = await feedRes.json();

        // 3. Map episodes to frontend structure
        let episodes = [];
        if (feedData.success && feedData.results) {
          episodes = feedData.results.map(ep => ({
            id: ep.id,
            title: ep.title,
            coverImage: ep.thumbnail,
            duration: ep.duration,
            views: ep.views,
            published: ep.published,
            show: {
              id: ep.channelId,
              title: ep.channelName,
              cover: ep.channelAvatar,
              publisher: ep.channelName
            }
          }));
        }

        // 4. Determine hasNewEpisodes status for followed channels
        const updatedShows = followData.results.map((show) => {
          const hasNew = episodes.some(ep => 
            ep.show.id === show.podcastId && 
            (() => {
              const published = (ep.published || "").toLowerCase();
              return (
                published.includes('hour') || 
                published.includes('minute') || 
                published.includes('second') || 
                published.includes('day') || 
                published.includes('today') || 
                published.includes('yesterday') || 
                published.includes('1 week')
              );
            })()
          );

          return {
            ...show,
            hasNewEpisodes: hasNew
          };
        });

        setFollowedPodcasts(updatedShows);
        setPodcastEpisodes(episodes);
      } else {
        setFollowedPodcasts([]);
        setPodcastEpisodes([]);
      }
    } catch (e) {
      console.error('Error loading podcasts data:', e);
    } finally {
      setPodcastsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated' && feedPreference === 'youtube') {
      loadPodcastsData();
    }
  }, [sessionStatus, feedPreference]);

  const showIndian = feedPreference === 'indian' || feedPreference === 'all' || feedPreference === 'music';
  const showGlobal = feedPreference === 'global' || feedPreference === 'all' || feedPreference === 'music';

  const { playSong, currentPlaylistId, isPlaying, togglePlayPause } = useMusicPlayer();


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
      const CACHE_KEY = `recently_played_playlists_${session.user.id}`;
      
      // Attempt to load from sessionStorage instantly
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (isMounted) {
              setRecentlyPlayed(parsed);
              setRecentlyPlayedLoading(false);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to read recently played cache:", e);
      }

      try {
        // Set loading only if there is no cache
        let hasCache = false;
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) hasCache = true;
          }
        } catch {}
        
        if (isMounted && !hasCache) setRecentlyPlayedLoading(true);

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
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(rawPlaylists));
            } catch {}
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
            if (isMounted) {
              setRecentlyPlayed(processed);
              try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(processed));
              } catch {}
            }
          } else {
            if (isMounted) {
              setRecentlyPlayed(rawPlaylists);
              try {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(rawPlaylists));
              } catch {}
            }
          }
        } else {
          if (isMounted) {
            setRecentlyPlayed(rawPlaylists);
            try {
              sessionStorage.setItem(CACHE_KEY, JSON.stringify(rawPlaylists));
            } catch {}
          }
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
      const CACHE_KEY = 'community_playlists_cache';
      
      // Attempt to load from sessionStorage instantly
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCommunityPlaylists(parsed);
            setCommunityLoading(false);
          }
        }
      } catch (e) {
        console.warn("Failed to read community playlists cache:", e);
      }

      try {
        // Set loading only if there is no cache
        let hasCache = false;
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) hasCache = true;
          }
        } catch {}
        
        if (isMounted && !hasCache) setCommunityLoading(true);

        const res = await fetch('/api/playlists/community');
        const data = await res.json();
        if (isMounted && data.success) {
          const playlists = data.data || [];
          setCommunityPlaylists(playlists);
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(playlists));
          } catch {}
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
      const CACHE_KEY = `recommended_mixes_${session.user.id}`;
      
      // Attempt to load from sessionStorage instantly
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (isMounted) {
              setRecommendedMixes(parsed);
              setMixesLoading(false);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to read recommended mixes cache:", e);
      }

      try {
        // Set loading only if there is no cache
        let hasCache = false;
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) hasCache = true;
          }
        } catch {}
        
        if (isMounted && !hasCache) setMixesLoading(true);

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
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(shaped));
          } catch {}
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
        const shaped = shapeMixes(data.data);
        setRecommendedMixes(shaped);
        try {
          const CACHE_KEY = `recommended_mixes_${session?.user?.id}`;
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(shaped));
        } catch {}
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

  const handlePlayClick = useCallback(async () => {
    const pid = 'liked-songs';
    if (playingId === pid) return;
    setPlayingId(pid);
    try {
      const res = await fetch(`/api/liked-songs?userId=${session?.user?.id}`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
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
              try {
                const CACHE_KEY = `recently_played_playlists_${session.user.id}`;
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(updatedData.data));
              } catch {}
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

  const isValidUrl = (url) =>
    typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        {/* Desktop header */}
        <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full gap-2 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Discover</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="relative hidden sm:flex">
              <Button
                variant="ghost"
                onClick={() => router.push("/music/search")}
                className="flex items-center justify-start gap-3 bg-muted/30 hover:bg-muted/50 border border-muted-foreground/20 hover:border-muted-foreground/30 transition-all duration-200 rounded-full h-9 w-48 lg:w-56 xl:w-64 px-4"
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground text-left truncate">Search music...</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Spotify-style header */}
        <header className="sticky top-0 z-50 md:hidden flex items-center gap-3 px-4 pt-[14px] pb-[10px] bg-background">
          <Link href="/music/profile" className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-white/10"
                onError={(e) => { e.target.src = '/default-avatar.png'; }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                {session?.user?.name?.charAt(0).toUpperCase() || "J"}
              </div>
            )}
          </Link>

          <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
            {[
              { label: "All",      value: "all" },
              { label: "Music",    value: "music" },
              { label: "YouTube",  value: "youtube" },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => {
                  if (value === "youtube") {
                    router.push("/music/youtube");
                  } else {
                    setFeedPreference(value);
                  }
                }}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  feedPreference === value
                    ? "bg-green-500 text-black"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/music/chat")}
              className="relative h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span className="absolute top-[5px] right-[5px] w-[7px] h-[7px] bg-red-500 rounded-full border border-background shadow-sm animate-pulse" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-3 md:p-6 space-y-6 md:space-y-8 pb-20 md:pb-6 relative">
          {/* Ambient Background Gradient (Isolated Component) */}
          <AmbientGradient color={hoveredColor} />

          {/* PWA Install Banner — mobile only */}
          <PWAInstallBanner />

          {feedPreference === 'youtube' ? (
            followedPodcasts.length === 0 ? (
              <div className="space-y-4 z-10 relative">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none">
                  Latest Videos
                </h2>
                
                <div className="bg-[#181818]/80 border border-white/5 rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-lg">
                  {/* Overlapping YouTube Covers Stack */}
                  <div className="h-32 sm:h-36 w-full flex items-center justify-center relative mb-6">
                    {/* Left 2 */}
                    <img
                      src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&h=150&fit=crop"
                      alt="Channel cover left 2"
                      className="absolute w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] z-10 -translate-x-[65px] sm:-translate-x-[85px] opacity-40 rounded-md object-cover shadow-[0_4px_12px_rgba(0,0,0,0.3)] select-none pointer-events-none"
                    />
                    {/* Left 1 */}
                    <img
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=180&h=180&fit=crop"
                      alt="Channel cover left 1"
                      className="absolute w-[75px] h-[75px] sm:w-[95px] sm:h-[95px] z-20 -translate-x-[35px] sm:-translate-x-[45px] opacity-75 rounded-md object-cover shadow-[0_6px_16px_rgba(0,0,0,0.4)] select-none pointer-events-none"
                    />
                    {/* Right 2 */}
                    <img
                      src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&h=150&fit=crop"
                      alt="Channel cover right 2"
                      className="absolute w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] z-10 translate-x-[65px] sm:translate-x-[85px] opacity-40 rounded-md object-cover shadow-[0_4px_12px_rgba(0,0,0,0.3)] select-none pointer-events-none"
                    />
                    {/* Right 1 */}
                    <img
                      src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=180&h=180&fit=crop"
                      alt="Channel cover right 1"
                      className="absolute w-[75px] h-[75px] sm:w-[95px] sm:h-[95px] z-20 translate-x-[35px] sm:-translate-x-[45px] opacity-75 rounded-md object-cover shadow-[0_6px_16px_rgba(0,0,0,0.4)] select-none pointer-events-none"
                    />
                    {/* Center */}
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=220&h=220&fit=crop"
                      alt="Channel cover center"
                      className="w-[90px] h-[90px] sm:w-[115px] sm:h-[115px] z-30 rounded-md object-cover shadow-[0_8px_24px_rgba(0,0,0,0.6)] border border-white/10 select-none pointer-events-none animate-pulse"
                    />
                  </div>

                  <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl tracking-tight leading-tight max-w-sm">
                    You haven&apos;t subscribed to any channels
                  </h3>
                  
                  <p className="text-muted-foreground text-xs sm:text-sm mt-2 max-w-xs">
                    Subscribe to your favorites to stay up to date.
                  </p>

                  <Button
                    onClick={() => router.push("/music/youtube/search")}
                    className="mt-6 bg-white hover:bg-neutral-200 text-black font-bold text-sm px-7 py-2.5 rounded-full shadow-md hover:scale-[1.03] active:scale-95 transition-all select-none"
                  >
                    Browse channels
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 z-10 relative">
                {/* Followed Shows Grid with + Button */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none">
                      Subscribed Channels
                    </h2>
                    <button 
                      onClick={() => router.push("/music/youtube/search")}
                      className="text-xs sm:text-sm font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Manage Subscriptions
                    </button>
                  </div>
                  <div className="flex items-center gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-3 max-w-full">
                    {followedPodcasts.map((show) => {
                      if (!show) return null;
                      return (
                        <div 
                          key={show.podcastId} 
                          className="relative w-20 sm:w-24 md:w-28 flex-shrink-0 aspect-square cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform group" 
                          onClick={() => router.push(`/music/youtube/${show.podcastId}`)}
                          title={show.podcastTitle}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden border border-white/10 shadow-md">
                            <img 
                              src={getProxiedImageUrl(show.coverImage)} 
                              alt={show.podcastTitle} 
                              className="w-full h-full object-cover animate-in fade-in duration-300" 
                              onError={(e) => {
                                e.target.src = '/default-playlist-image.png';
                              }}
                            />
                          </div>
                          {/* Blue Dot Badge on top-right to signify updates */}
                          {show.hasNewEpisodes && (
                            <span className="absolute top-[8%] right-[8%] w-3 h-3 bg-blue-500 rounded-full border-2 border-[#121212] z-10" />
                          )}
                        </div>
                      );
                    })}
                    <div 
                      onClick={() => router.push("/music/youtube/search")} 
                      className="w-20 sm:w-24 md:w-28 flex-shrink-0 aspect-square rounded-full border border-dashed border-white/20 bg-neutral-900/40 hover:bg-neutral-800/40 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                    >
                      <span className="text-xl sm:text-2xl text-neutral-400 font-light">+</span>
                    </div>
                  </div>
                </div>

                {/* Latest Episodes YouTube-style Feed */}
                <div className="space-y-4 pt-2">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none mb-4">
                    Latest Videos
                  </h2>
                  {podcastsLoading && podcastEpisodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                      <Loader2 className="w-8 h-8 animate-spin mb-3 text-white" />
                      <span className="text-sm font-semibold">Fetching videos...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8 -mx-3 md:mx-0">
                      {podcastEpisodes.map((episode) => (
                        <div
                          key={episode.id}
                          onClick={() => router.push(`/music/youtube/watch/${episode.id}?showId=${episode.show?.id || ''}&showTitle=${encodeURIComponent(episode.show?.title || '')}`)}
                          className="group cursor-pointer select-none flex flex-col justify-between"
                        >
                          <div>
                            {/* Large Aspect-Video (16:9) Thumbnail */}
                            <div className="relative w-full aspect-video rounded-none md:rounded-2xl overflow-hidden border-y md:border border-white/5 bg-[#181818]/60 shadow-[0_6px_20px_rgba(0,0,0,0.4)] group-hover:scale-[1.01] active:scale-95 transition-transform duration-200">
                              <img 
                                src={`https://i.ytimg.com/vi/${episode.id}/maxresdefault.jpg`} 
                                alt={episode.title} 
                                className="w-full h-full object-cover animate-in fade-in duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  if (e.target.src.includes('maxresdefault.jpg')) {
                                    e.target.src = `https://i.ytimg.com/vi/${episode.id}/hqdefault.jpg`;
                                  } else if (e.target.src.includes('hqdefault.jpg')) {
                                    e.target.src = episode.coverImage || episode.show.cover;
                                  }
                                }}
                              />
                              {episode.duration && (
                                <span className="absolute bottom-3 right-3 bg-black/85 text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded border border-white/5 text-white">
                                  {episode.duration}
                                </span>
                              )}
                            </div>

                            {/* Details Info Row */}
                            <div className="flex gap-3 mt-3.5 px-2 md:px-1.5">
                              {/* Circular Show Avatar */}
                              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 shadow-sm bg-neutral-900">
                                <img 
                                  src={getProxiedImageUrl(episode.show.cover)} 
                                  alt={episode.show.title} 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    e.target.src = '/default-playlist-image.png';
                                  }}
                                />
                              </div>

                              {/* Text info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-extrabold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-green-500 transition-colors">
                                  {episode.title}
                                </h4>
                                <p className="text-neutral-400 text-xs sm:text-sm font-semibold truncate mt-1">
                                  {episode.show.publisher || episode.show.title} • {episode.views || '78K views'} • {episode.published || '7 days ago'}
                                </p>
                              </div>

                              {/* More Vertical menu icon */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/music/youtube/watch/${episode.id}?showId=${episode.show?.id || ''}&showTitle=${encodeURIComponent(episode.show?.title || '')}`);
                                }}
                                className="text-neutral-400 hover:text-white p-1 hover:bg-white/5 rounded-full transition-colors shrink-0 self-start cursor-pointer"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <>
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
                <Heart className="w-5 h-5 md:w-8 md:h-8 fill-white" />
              </div>
              <div className="min-w-0 flex-1 px-2 md:px-3 py-2 flex items-center">
                <h3 className={`font-bold text-[13px] md:text-[14px] lg:text-[16px] text-foreground line-clamp-2 leading-tight ${
                  currentPlaylistId === 'liked-songs' ? 'md:text-green-500' : ''
                }`}>
                  Liked Songs
                </h3>
              </div>

              {/* Play button overlay */}
              <div className={`absolute right-2 md:right-3 transition-all duration-300 z-20 hidden md:flex ${
                currentPlaylistId === 'liked-songs'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
              }`}>
                <div
                  className="rounded-full w-8 h-8 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (currentPlaylistId === 'liked-songs') {
                      togglePlayPause();
                    } else {
                       handlePlayClick();
                    }
                  }}
                >
                  {playingId === 'liked-songs' ? (
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-black" />
                  ) : currentPlaylistId === 'liked-songs' && isPlaying ? (
                    <HiPause className="w-4 h-4 md:w-5 md:h-5 fill-black" />
                  ) : (
                    <IoMdPlay className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                  )}
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
                      const collageImages = playlist.collageImages || (
                        playlist.source === 'user' && Array.isArray(playlist.image) && playlist.image.length >= 4
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
                    <h3 className={`font-bold text-[13px] md:text-[14px] lg:text-[16px] text-foreground line-clamp-1 leading-tight ${
                      currentPlaylistId === (playlist.playlistId || playlist.id)
                        ? 'md:text-green-500'
                        : ''
                    }`}>
                      {playlist.playlistName}
                    </h3>
                    {playlist.source === 'user' && (
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Your playlist</span>
                    )}
                  </div>

                  {/* Play button overlay */}
                  <div className={`absolute right-2 md:right-3 transition-all duration-300 z-20 hidden md:flex ${
                    currentPlaylistId === (playlist.playlistId || playlist.id)
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
                  }`}>
                    <div
                      className="rounded-full w-8 h-8 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (currentPlaylistId === (playlist.playlistId || playlist.id)) {
                          togglePlayPause();
                        } else {
                          handlePlaylistPlay(playlist, e);
                        }
                      }}
                    >
                      {playingId === (playlist.playlistId || playlist.id) ? (
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-black" />
                      ) : currentPlaylistId === (playlist.playlistId || playlist.id) && isPlaying ? (
                        <HiPause className="w-4 h-4 md:w-5 md:h-5 fill-black" />
                      ) : (
                        <IoMdPlay className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                      )}
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
            </>
          )}

          {/* Bottom padding to prevent content being hidden behind music player */}
          <div className="pb-24" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
