/* eslint-disable @next/next/no-img-element */
"use client";

// Module-level lyrics cache — persists for the entire browser session.
// Key: songId, Value: lyrics data (or null if not found).
const lyricsCache = new Map();

const parseRgbRaw = (rgbStr) => {
  if (!rgbStr) return [0, 0, 0];
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return [0, 0, 0];
  return [parseInt(match[0], 10), parseInt(match[1], 10), parseInt(match[2], 10)];
};

const interpolateRgbRaw = (color1Str, color2Str, t) => {
  const [r1, g1, b1] = parseRgbRaw(color1Str);
  const [r2, g2, b2] = parseRgbRaw(color2Str);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `${r}, ${g}, ${b}`;
};

const mapLyricsPlusToLyrics = (lyricsPlusLines) => {
  if (!Array.isArray(lyricsPlusLines)) return [];
  
  return lyricsPlusLines.map((line) => {
    const startTime = line.time || 0;
    const duration = line.duration || 0;
    const endTime = startTime + duration;
    
    let words = [];
    if (Array.isArray(line.syllabus) && line.syllabus.length > 0) {
      words = line.syllabus.map((w) => {
        const wStartTime = w.time || startTime;
        const wDuration = w.duration || 0;
        const wEndTime = wStartTime + wDuration;
        return {
          startTime: wStartTime,
          endTime: wEndTime,
          word: w.text || ""
        };
      });
    } else {
      words = [
        {
          startTime,
          endTime,
          word: line.text || ""
        }
      ];
    }
    
    const singer = line.element?.singer || 'v1';
    const isDuet = singer !== 'v1';
    const isBG = line.element?.key?.includes('bg') || false;
    
    return {
      words,
      translatedLyric: "",
      romanLyric: "",
      isBG,
      isDuet,
      startTime,
      endTime
    };
  });
};

const cleanSongMetadata = (title, artist) => {
  let cleanTitle = (title || "")
    .replace(/\s*[\(\[][^)]*(official|video|audio|lyric|remix|edit|feat|ft|with|clip|slowed|reverb|speed|sped|version|remaster|mono|stereo)[^)]*[\)\]]/gi, "")
    .replace(/\s*-\s*(official|video|audio|lyric|remix|edit|feat|ft|with|clip|slowed|reverb|speed|sped|version|remaster).*/gi, "")
    .replace(/\s*[\(\[][^)]*film[^)]*[\)\]]/gi, "")
    .trim();

  if (!cleanTitle) cleanTitle = title || "";

  let cleanArtist = (artist || "")
    .split(/[&,]/)[0]
    .replace(/\s*-\s*(topic|official|vevo|music).*/gi, "")
    .trim();
    
  if (!cleanArtist) cleanArtist = artist || "";

  return { cleanTitle, cleanArtist };
};

const parseViews = (viewsStr) => {
  if (!viewsStr) return 0;
  const clean = viewsStr.toLowerCase().replace(/,/g, '').trim();
  const match = clean.match(/([\d.]+)\s*([bmk]?)/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2];
  if (isNaN(value)) return 0;
  switch (unit) {
    case 'b': return value * 1000000000;
    case 'm': return value * 1000000;
    case 'k': return value * 1000;
    default: return value;
  }
};

import { useState, useRef, useEffect, useCallback, useMemo, Component } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { parseLrc } from "@applemusic-like-lyrics/lyric";
import { parseTTML } from "@applemusic-like-lyrics/ttml";
import "@applemusic-like-lyrics/core/style.css";
import YouTube from "react-youtube";

const LyricPlayer = dynamic(
  () => import("@applemusic-like-lyrics/react").then((mod) => mod.LyricPlayer),
  { ssr: false }
);

const BackgroundRender = dynamic(
  () => import("@applemusic-like-lyrics/react").then((mod) => mod.BackgroundRender),
  { ssr: false }
);

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Component crash caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronDown,
  Heart,
  MoreHorizontal,
  Shuffle,
  Repeat,
  Mic,
  ListMusic,
  Plus,
  User,
  Disc,
  Share,
  Download,
  ArrowUpDown,
  Music2,
  Video,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useSession } from "next-auth/react";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { toast } from "sonner";
import { IoMdPlay } from "react-icons/io";
import { HiPause } from "react-icons/hi2";
import { BiSkipNext, BiSkipPrevious } from "react-icons/bi";
import { RxShuffle } from "react-icons/rx";
import { BsRepeat } from "react-icons/bs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartFullscreen } from "@/hooks/use-smart-fullscreen";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerPortal,
} from "@/components/ui/drawer";
import { memo } from "react";
import { triggerSmartlink } from "@/lib/smartlink";
import { downloadWithMetadata } from "@/lib/clientDownload";

// Module-level color cache for fullscreen gradient colors — persists
// across re-renders. Keyed by song ID.
const _fsColorCache = new Map();

// Helper to get the smallest image URL from a song's image array
function _getFsSmallImageUrl(song) {
  if (!song?.image?.length) return '/default-playlist-image.png';
  return (
    song.image.find((img) => img.quality === "50x50")?.url ||
    song.image.find((img) => img.quality === "150x150")?.url ||
    song.image[song.image.length - 1]?.url ||
    '/default-playlist-image.png'
  );
}

const parseSyncedLyrics = (syncedLyrics) => {
  if (!syncedLyrics) return [];

  const lines = syncedLyrics.split("\n");
  const parsedLines = [];

  for (const line of lines) {
    // Match LRC format: [mm:ss.xx] or [mm:ss] followed by lyrics
    const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]\s*(.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = parseInt(match[3] || "0", 10);
      const text = match[4].trim();

      const timeInSeconds = minutes * 60 + seconds + centiseconds / 100;

      if (text) {
        parsedLines.push({
          time: timeInSeconds,
          text: text,
        });
      }
    }
  }

  return parsedLines.sort((a, b) => a.time - b.time);
};

const getCurrentLyricIndex = (parsedLyrics, currentTime) => {
  if (!parsedLyrics || parsedLyrics.length === 0) return -1;

  for (let i = parsedLyrics.length - 1; i >= 0; i--) {
    if (currentTime >= parsedLyrics[i].time) {
      return i;
    }
  }
  return -1;
};

const formatTime = (time) => {
  if (!time || isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const decodeHtmlEntities = (text) => {
  if (!text) return text;
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#32;': ' ',
    '&#160;': ' '
  };
  return text.replace(/&[#\w\d]+;/g, (entity) => entities[entity] || entity);
};

const getArtistNames = (song) => {
  if (!song) return "Unknown Artist";
  if (song.artists?.primary && Array.isArray(song.artists.primary)) {
    return song.artists.primary.map((artist) => artist.name).join(", ");
  }
  if (song.primaryArtists) return song.primaryArtists;
  return "Unknown Artist";
};

// Marquee component — scrolls title left↔right when it overflows, stays still when it fits
function MarqueeSongTitle({ title }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const overflow = text.scrollWidth - container.offsetWidth;
    if (overflow > 4) {
      text.style.setProperty('--marquee-dist', `-${overflow}px`);
      text.setAttribute('data-overflow', 'true');
      container.setAttribute('data-scrolling', 'true');
    } else {
      text.style.removeProperty('--marquee-dist');
      text.removeAttribute('data-overflow');
      container.removeAttribute('data-scrolling');
    }
  }, [title]);

  return (
    <>
      <style>{`
        @keyframes marquee-lr {
          0%        { transform: translateX(0px); }
          10%       { transform: translateX(0px); }
          45%       { transform: translateX(var(--marquee-dist, 0px)); }
          55%       { transform: translateX(var(--marquee-dist, 0px)); }
          90%       { transform: translateX(0px); }
          100%      { transform: translateX(0px); }
        }
        .marquee-title[data-overflow="true"] {
          animation: marquee-lr 10s ease-in-out infinite;
        }
        .marquee-container {
          -webkit-mask-image: none;
          mask-image: none;
        }
        .marquee-container[data-scrolling="true"] {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        }
      `}</style>
      <div
        ref={containerRef}
        className="marquee-container overflow-hidden w-full relative"
      >
        <h1
          ref={textRef}
          className="marquee-title text-3xl lg:text-5xl font-bold text-white leading-snug inline-block whitespace-nowrap"
        >
          {title}
        </h1>
      </div>
    </>
  );
}

export function FullscreenMusicPlayer({
  currentSong,
  playlist = [],
  onSongChange,
  onPlaylistReorder, // Add new prop for playlist reordering
  isOpen,
  onClose,
  audioRef,
  currentTime,
  duration,
  volume,
  onVolumeChange,
  onSeek,
  onSeekCommit,
  onDirectSeek, // New prop for immediate seeks
  onTogglePlayPause,
  onPrevious,
  onNext,
  isPlaying,
  playingFrom = "Search Results", // Add playingFrom prop with default
}) {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const {
    setIsPlaying,
    setIsFullscreenOpen,
    currentIndex: playerCurrentIndex,
    isShuffle,
    setIsShuffle,
    repeatMode,
    setRepeatMode,
    isFullscreenPlaylistOpen: showPlaylist,
    setIsFullscreenPlaylistOpen: setShowPlaylist,
  } = useMusicPlayer();
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);
  const router = useRouter();
  const [showLyrics,    setShowLyrics   ] = useState(false);
  const [showVideoMode, setShowVideoMode] = useState(false);
  const [ytVideoId,     setYtVideoId    ] = useState(null);
  const [ytLoading,     setYtLoading    ] = useState(false);
  const [ytError,       setYtError      ] = useState(null);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytDuration,    setYtDuration   ] = useState(0);
  const [ytIsPlaying,   setYtIsPlaying  ] = useState(false);
  const [ytWaiting,     setYtWaiting    ] = useState(true);
  const ytVideoRef   = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubePollIntervalRef = useRef(null);
  const ytCanvasRef  = useRef(null);
  const wasPlayingRef = useRef(false);
  const isYtScrubbingRef = useRef(false);
  const wasYtPlayingBeforeScrubRef = useRef(false);
  const videoCacheRef = useRef({});
  const lastSeekTimeRef = useRef(null);
  const lastSeekTimestampRef = useRef(0);
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);
  const [localPlaylist, setLocalPlaylist] = useState([]);
  const shuffledIndexRef = useRef(0);
  const internalNavRef = useRef(false);
  const {
    fullscreenType,
    isCssFallback,
    toggleFullscreen,
    setFullscreenType,
    setIsCssFallback
  } = useSmartFullscreen();
  const [showHud, setShowHud] = useState(false);
  const mobileVideoContainerRef = useRef(null);
  const desktopVideoContainerRef = useRef(null);
  const splitVideoContainerRef = useRef(null);
  const hudTimeoutRef = useRef(null);

  // Initialize local playlist when playlist changes
  useEffect(() => {
    setLocalPlaylist([...playlist]);
  }, [playlist]);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [lyrics, setLyrics] = useState(null);

  const startTimePolling = () => {
    stopTimePolling();
    youtubePollIntervalRef.current = setInterval(() => {
      if (isYtScrubbingRef.current) return;
      if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getCurrentTime === "function") {
        const playerTime = youtubePlayerRef.current.getCurrentTime();
        if (lastSeekTimeRef.current !== null) {
          const timeSinceSeek = Date.now() - lastSeekTimestampRef.current;
          const diff = Math.abs(playerTime - lastSeekTimeRef.current);
          if (timeSinceSeek < 1500 && diff > 1) {
            return; // Skip update to prevent progress bar jumping
          }
          lastSeekTimeRef.current = null;
        }
        setYtCurrentTime(playerTime);
      }
    }, 250);
  };

  const stopTimePolling = () => {
    if (youtubePollIntervalRef.current) {
      clearInterval(youtubePollIntervalRef.current);
      youtubePollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopTimePolling();
    };
  }, []);

  // Toggle HUD visibility on fullscreen container click (excluding interactive controls)
  const handleFullscreenClick = useCallback((e) => {
    if (fullscreenType === null) return;
    const isInteractive = e.target.closest('button, [role="slider"], input, a');
    if (!isInteractive) {
      setShowHud(prev => !prev);
    }
  }, [fullscreenType]);

  // Sync HUD state when fullscreen changes
  useEffect(() => {
    if (fullscreenType === null) {
      setShowHud(false);
    } else {
      setShowHud(true);
    }
  }, [fullscreenType]);

  const getContainerStyle = (type) => {
    if (fullscreenType !== type) return {};
    const isNativeFs = typeof document !== 'undefined' && !isCssFallback;
    if (isNativeFs) {
      return {
        width: '100%',
        height: '100%',
        maxWidth: 'none',
        maxHeight: 'none',
        borderRadius: 0,
      };
    } else {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        maxWidth: 'none',
        maxHeight: 'none',
        borderRadius: 0,
        backgroundColor: '#000',
      };
    }
  };

  const renderFullscreenButton = (type, containerRef) => {
    if (fullscreenType !== null) return null;

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFullscreen(containerRef.current, type);
        }}
        className="absolute right-3 bottom-3 z-30 p-2 rounded-lg bg-black/60 hover:bg-black/80 active:scale-95 text-white border border-white/10 hover:scale-105 transition-all cursor-pointer shadow-md flex items-center justify-center"
        title="Horizontal Fullscreen"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    );
  };

  const renderFullscreenHud = (type, containerRef) => {
    if (fullscreenType !== type) return null;

    return (
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/75 z-30 transition-opacity duration-300 flex flex-col justify-between p-6 sm:p-10 pointer-events-auto select-none ${
          showHud ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Bar: Song Info & Exit Button */}
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-white text-base sm:text-xl font-bold tracking-tight">
              {currentSong?.name || currentSong?.title || "Unknown Song"}
            </span>
            <span className="text-white/60 text-xs sm:text-sm">
              {getArtistNames(currentSong)}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen(containerRef.current, type);
            }}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer flex items-center justify-center"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>

        {/* Center Play/Pause button */}
        <div className="flex items-center justify-center flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white hover:bg-neutral-100 active:scale-95 text-black flex items-center justify-center transition-all shadow-2xl cursor-pointer"
          >
            {ytIsPlaying ? (
              <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-black text-black" />
            ) : (
              <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-black text-black ml-1" />
            )}
          </button>
        </div>

        {/* Bottom Bar: Slider & Timestamps */}
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-2 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/70 font-medium tabular-nums min-w-[40px] text-left">
              {formatTime(ytCurrentTime)}
            </span>
            <div className="flex-1">
              <Slider
                value={[ytCurrentTime]}
                max={ytDuration || 100}
                step={0.1}
                onValueChange={handleSeek}
                onValueCommit={handleSeekCommit}
                className="w-full cursor-pointer **:data-[slot=slider-thumb]:opacity-100 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:w-3 **:data-[slot=slider-thumb]:h-3 **:data-[slot=slider-range]:bg-green-500 **:data-[slot=slider-track]:bg-white/20 **:data-[slot=slider-track]:h-1"
              />
            </div>
            <span className="text-xs text-white/70 font-medium tabular-nums min-w-[40px] text-right">
              {formatTime(ytDuration)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Reset YouTube player ref when lyrics view is toggled to prevent stale/unmounted player references
  useEffect(() => {
    youtubePlayerRef.current = null;
  }, [showLyrics]);

  /* ── Video mode: fetch YT video when toggled on ─────────────────── */
  useEffect(() => {
    // Reset video controller states immediately on song/mode change
    setYtCurrentTime(0);
    setYtDuration(0);
    setYtIsPlaying(false);
    setYtWaiting(true);
    youtubePlayerRef.current = null;

    if (!showVideoMode) {
      // Switching back to audio — restore playback if it was playing
      if (wasPlayingRef.current && !isPlaying) {
        onTogglePlayPause();
      }
      setYtVideoId(null);
      setYtError(null);
      return;
    }

    // Remember if audio was playing before we mute it
    wasPlayingRef.current = isPlaying;
    if (isPlaying) onTogglePlayPause(); // pause the main player
    setShowLyrics(false); // Close lyrics view when switching to video mode

    const songId = currentSong?.id;
    if (songId && videoCacheRef.current[songId]) {
      setYtVideoId(videoCacheRef.current[songId]);
      setYtLoading(false);
      return;
    }

    const songName   = decodeHtmlEntities(currentSong?.name || currentSong?.title || '');
    const artistName = getArtistNames(currentSong);
    if (!songName) return;

    const query = encodeURIComponent(`${songName} ${artistName}`);
    setYtLoading(true);
    setYtError(null);
    setYtVideoId(null);

    fetch(`https://inv.thepixora.com/api/v1/search?q=${query}&type=video`)
      .then(r => r.json())
      .then(data => {
        const results = Array.isArray(data) ? data : (data?.results || []);
        if (results.length > 0) {
          // Sort results by view count descending to ensure we get the official video/song
          const sorted = [...results].sort((a, b) => {
            const viewsA = typeof a.viewCount === 'number' ? a.viewCount : parseViews(a.views || a.viewCountText);
            const viewsB = typeof b.viewCount === 'number' ? b.viewCount : parseViews(b.views || b.viewCountText);
            return viewsB - viewsA;
          });
          const first = sorted[0];
          const resolvedId = first?.videoId || first?.id;
          if (resolvedId) {
            if (songId) videoCacheRef.current[songId] = resolvedId;
            setYtVideoId(resolvedId);
          } else {
            setYtError('No video found');
          }
        } else {
          setYtError('No video found');
        }
      })
      .catch(() => setYtError('Failed to load video'))
      .finally(() => setYtLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideoMode, currentSong?.id]);

  // Sync volume to video and YouTube player elements
  useEffect(() => {
    if (ytVideoRef.current) {
      ytVideoRef.current.volume = volume;
    }
    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.setVolume === "function") {
      youtubePlayerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  // Pause and disable video mode when fullscreen player is closed
  useEffect(() => {
    if (!isOpen) {
      setShowVideoMode(false);
    }
  }, [isOpen]);

  // Prevent standard audio player from playing when video mode is active
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handlePlayAttempt = () => {
      if (showVideoMode) {
        audio.pause();
      }
    };

    if (showVideoMode && !audio.paused) {
      audio.pause();
    }

    audio.addEventListener("play", handlePlayAttempt);
    return () => {
      audio.removeEventListener("play", handlePlayAttempt);
    };
  }, [showVideoMode, audioRef, currentSong?.id]);

  // Background prefetch for next song's video ID to enable instant transition/streaming
  useEffect(() => {
    if (!showVideoMode || !currentSong) return;

    const currentPlaylist = getCurrentPlaylist();
    if (!currentPlaylist || currentPlaylist.length === 0) return;
    
    const currentIndex = currentPlaylist.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (repeatMode === "one") {
      nextIndex = currentIndex;
    } else if (currentIndex < currentPlaylist.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (repeatMode === "all") {
      nextIndex = 0;
    }

    if (nextIndex === -1) return;
    const nextSong = currentPlaylist[nextIndex];
    if (!nextSong || !nextSong.id) return;

    // Check if already cached
    if (videoCacheRef.current[nextSong.id]) return;

    const nextSongName = decodeHtmlEntities(nextSong.name || nextSong.title || '');
    const nextArtistName = getArtistNames(nextSong);
    if (!nextSongName) return;

    const query = encodeURIComponent(`${nextSongName} ${nextArtistName}`);
    const nextSongId = nextSong.id;

    // Fetch in the background with a delay to not compete with active video loading bandwidth
    const timeoutId = setTimeout(() => {
      fetch(`https://inv.thepixora.com/api/v1/search?q=${query}&type=video`)
        .then(r => r.json())
        .then(data => {
          const results = Array.isArray(data) ? data : (data?.results || []);
          if (results.length > 0) {
            const sorted = [...results].sort((a, b) => {
              const viewsA = typeof a.viewCount === 'number' ? a.viewCount : parseViews(a.views || a.viewCountText);
              const viewsB = typeof b.viewCount === 'number' ? b.viewCount : parseViews(b.views || b.viewCountText);
              return viewsB - viewsA;
            });
            const first = sorted[0];
            const resolvedId = first?.videoId || first?.id;
            if (resolvedId) {
              videoCacheRef.current[nextSongId] = resolvedId;
            }
          }
        })
        .catch(err => {
          console.warn("Background prefetch failed:", err);
        });
    }, 2500); // 2.5s delay to let current video buffer first

    return () => clearTimeout(timeoutId);
  }, [currentSong?.id, showVideoMode, repeatMode, localPlaylist, shuffledPlaylist, isShuffle]);
  /* ─────────────────────────────────────────────────────────────────── */

  // Helper to draw a video frame onto the ambient background canvas
  const drawVideoFrame = (videoEl) => {
    if (!videoEl) return;
    const canvas = ytCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        } catch (e) {
          // ignore temporary drawing errors
        }
      }
    }
  };

  // Smooth 60fps ambient video glow animation loop using requestAnimationFrame
  useEffect(() => {
    if (!showVideoMode || !ytIsPlaying || !ytVideoRef.current) return;

    let animationFrameId;
    const updateGlow = () => {
      if (ytVideoRef.current) {
        drawVideoFrame(ytVideoRef.current);
        animationFrameId = requestAnimationFrame(updateGlow);
      }
    };

    animationFrameId = requestAnimationFrame(updateGlow);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showVideoMode, ytIsPlaying]);

  // Play/pause: in video mode controls the video element or YouTube player, otherwise the audio
  const handlePlayPause = () => {
    if (showVideoMode) {
      if (youtubePlayerRef.current) {
        if (ytIsPlaying) {
          youtubePlayerRef.current.pauseVideo();
        } else {
          youtubePlayerRef.current.playVideo();
        }
      } else if (ytVideoRef.current) {
        if (ytVideoRef.current.paused) {
          ytVideoRef.current.play().catch(() => {});
        } else {
          ytVideoRef.current.pause();
        }
      }
    } else {
      onTogglePlayPause();
    }
  };

  // Seek bar: in video mode scrubs the video element or YouTube player
  const handleSeek = (val) => {
    if (showVideoMode) {
      if (!isYtScrubbingRef.current) {
        isYtScrubbingRef.current = true;
        wasYtPlayingBeforeScrubRef.current = ytIsPlaying;
        if (ytIsPlaying && youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo();
        } else if (ytVideoRef.current && !ytVideoRef.current.paused) {
          ytVideoRef.current.pause();
        }
      }
      setYtCurrentTime(val[0]);
    } else {
      onSeek(val);
    }
  };
  const handleSeekCommit = (val) => {
    if (showVideoMode) {
      isYtScrubbingRef.current = false;
      const targetTime = val[0];
      lastSeekTimeRef.current = targetTime;
      lastSeekTimestampRef.current = Date.now();
      if (youtubePlayerRef.current && typeof youtubePlayerRef.current.seekTo === "function") {
        youtubePlayerRef.current.seekTo(targetTime, true);
        if (wasYtPlayingBeforeScrubRef.current) {
          youtubePlayerRef.current.playVideo();
        }
      } else if (ytVideoRef.current) {
        ytVideoRef.current.currentTime = targetTime;
        if (wasYtPlayingBeforeScrubRef.current) {
          ytVideoRef.current.play().catch(() => {});
        }
      }
      setYtCurrentTime(targetTime);
    } else {
      onSeekCommit(val);
    }
  };
  /* ─────────────────────────────────────────────────────────────────── */
  const [lyricsLoading, setLyricsLoading] = useState(false);
  // True from the moment we decide to fetch until the result lands —
  // prevents the "No lyrics found" flash while the request is in-flight
  const [lyricsFetching, setLyricsFetching] = useState(false);

  // Parse synced lyrics once — only re-runs when lyrics data changes, not every render tick
  // Fix for TTML from boidu.dev API: it omits itunes:key on each <p>.
  // parseTTML skips lines without that attribute (returns null id → early return).
  // This preprocessor injects sequential key="L1", key="L2"… so all lines parse.
  const ensureTTMLKeys = (xmlStr) => {
    if (!xmlStr) return xmlStr;
    let keyIndex = 1;
    return xmlStr.replace(/<p\b([^>]*)/gi, (match, attributes) => {
      const hasKey = /\bkey\s*=/i.test(attributes) || /\b(itunes:key)\s*=/i.test(attributes);
      if (!hasKey) {
        return `<p key="L${keyIndex++}"${attributes}`;
      }
      keyIndex++;
      return match;
    });
  };

  const parsedLyrics = useMemo(
    () => {
      if (!lyrics?.syncedLyrics) return [];
      try {
        if (lyrics.isTTML) {
          if (Array.isArray(lyrics.syncedLyrics)) {
            return mapLyricsPlusToLyrics(lyrics.syncedLyrics);
          }
          if (typeof lyrics.syncedLyrics === "string" && lyrics.syncedLyrics.trim().startsWith("<")) {
            const preprocessed = ensureTTMLKeys(lyrics.syncedLyrics);
            const result = parseTTML(preprocessed);
            console.log("Jammify Fullscreen: parsed TTML lyrics count:", result?.lines?.length, result);
            return result.lines;
          }
        }
        if (typeof lyrics.syncedLyrics === "string") {
          const result = parseLrc(lyrics.syncedLyrics);
          console.log("Jammify Fullscreen: parsed lyrics count:", result?.length, result);
          return result;
        }
        return [];
      } catch (err) {
        console.error("AMLL lyric parse error:", err);
        return [];
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lyrics?.syncedLyrics]
  );

  useEffect(() => {
    console.log("Jammify Fullscreen: lyrics state changed:", lyrics);
  }, [lyrics]);

  // Helper to extract current song artwork URL
  const currentSongImageUrl = useMemo(() => {
    if (!currentSong?.image?.length) return '/default-playlist-image.png';
    return (
      currentSong.image.find((img) => img.quality === "500x500")?.url ||
      currentSong.image.find((img) => img.quality === "150x150")?.url ||
      currentSong.image[currentSong.image.length - 1]?.url ||
      '/default-playlist-image.png'
    );
  }, [currentSong]);

  const currentSongImageUrlProxied = useMemo(() => {
    if (!currentSongImageUrl) return '/default-playlist-image.png';
    if (currentSongImageUrl.startsWith('http://') || currentSongImageUrl.startsWith('https://')) {
      return `/api/proxy/image?url=${encodeURIComponent(currentSongImageUrl)}`;
    }
    return currentSongImageUrl;
  }, [currentSongImageUrl]);

  const handleLyricLineClick = useCallback((event) => {
    console.log("Jammify Fullscreen: lyric line click event received:", event);
    if (!event) return;
    
    let startTimeMs = null;
    if (event.line?.getLine) {
      try {
        startTimeMs = event.line.getLine()?.startTime;
        console.log("Jammify Fullscreen: got startTimeMs from event.line.getLine():", startTimeMs);
      } catch (e) {
        console.error("Jammify Fullscreen: error calling event.line.getLine():", e);
      }
    }
    
    if (startTimeMs === null || startTimeMs === undefined) {
      if (event.line?.lyricLine?.startTime !== undefined) {
        startTimeMs = event.line.lyricLine.startTime;
        console.log("Jammify Fullscreen: got startTimeMs from event.line.lyricLine.startTime:", startTimeMs);
      } else if (event.line?.startTime !== undefined) {
        startTimeMs = event.line.startTime;
        console.log("Jammify Fullscreen: got startTimeMs from event.line.startTime:", startTimeMs);
      } else if (typeof event.lineIndex === 'number' && parsedLyrics[event.lineIndex]) {
        startTimeMs = parsedLyrics[event.lineIndex].startTime;
        console.log("Jammify Fullscreen: got startTimeMs from event.lineIndex & parsedLyrics:", startTimeMs);
      } else if (event.detail?.line?.startTime !== undefined) {
        startTimeMs = event.detail.line.startTime;
        console.log("Jammify Fullscreen: got startTimeMs from event.detail.line.startTime:", startTimeMs);
      } else if (typeof event.detail?.lineIndex === 'number' && parsedLyrics[event.detail.lineIndex]) {
        startTimeMs = parsedLyrics[event.detail.lineIndex].startTime;
        console.log("Jammify Fullscreen: got startTimeMs from event.detail.lineIndex & parsedLyrics:", startTimeMs);
      }
    }

    if (typeof startTimeMs === 'number') {
      const seekTime = startTimeMs / 1000;
      console.log("Jammify Fullscreen: seeking to:", seekTime, "seconds");
      if (showVideoMode) {
        lastSeekTimeRef.current = seekTime;
        lastSeekTimestampRef.current = Date.now();
        if (youtubePlayerRef.current && typeof youtubePlayerRef.current.seekTo === "function") {
          youtubePlayerRef.current.seekTo(seekTime, true);
        } else if (ytVideoRef.current) {
          ytVideoRef.current.currentTime = seekTime;
        }
        setYtCurrentTime(seekTime);
      } else {
        if (typeof onDirectSeek === 'function') {
          onDirectSeek([seekTime]);
        } else {
          console.warn("Jammify Fullscreen: onDirectSeek is not a function:", onDirectSeek);
        }
      }
    } else {
      console.warn("Jammify Fullscreen: could not extract a valid startTimeMs from click event:", event);
    }
  }, [parsedLyrics, onDirectSeek, showVideoMode]);
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(false);
  const [openLyricsActionMenu, setOpenLyricsActionMenu] = useState(false);
  const [dominantColors, setDominantColors] = useState({
    primary: "rgb(99, 102, 241)",
    secondary: "rgb(139, 92, 246)",
    accent: "rgb(168, 85, 247)",
  });

  const fadeColors = useMemo(() => {
    const primary = dominantColors?.primary || "rgb(99, 102, 241)";
    const accent = dominantColors?.accent || "rgb(168, 85, 247)";
    const secondary = dominantColors?.secondary || "rgb(139, 92, 246)";

    // Top is at ~15%
    const topRgb = interpolateRgbRaw(primary, accent, 0.15 / 0.5);
    // Bottom is at ~85%
    const bottomRgb = interpolateRgbRaw(accent, secondary, (0.85 - 0.5) / 0.5);

    return { topRgb, bottomRgb };
  }, [dominantColors]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Touch drag state
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchCurrentY, setTouchCurrentY] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElement, setDraggedElement] = useState(null);

  // Helper to convert rgb(r, g, b) to hex color code for Android/Chrome status bar compatibility
  const convertRgbToHex = (rgbStr) => {
    if (!rgbStr) return "#121212";
    if (rgbStr.startsWith("#")) return rgbStr;
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return "#121212";
    const r = parseInt(match[0], 10);
    const g = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // Dynamic PWA status bar theme-color update
  // The theme-color MUST be the EXACT same color as the CSS gradient's 0% stop
  // (dominantColors.primary). Any modification (darkening, brightening) creates
  // a visible seam between the solid Android status bar and the gradient below.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const defaultThemeColor = "#121212";

    const applyThemeColor = (color) => {
      let metaThemeColor = document.querySelector("meta[name=theme-color]");
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", color);
      } else {
        metaThemeColor = document.createElement("meta");
        metaThemeColor.name = "theme-color";
        metaThemeColor.content = color;
        document.head.appendChild(metaThemeColor);
      }
    };

    const getActivePageColor = () => {
      if (window._getActivePageThemeColor) {
        const scrollContainer = document.getElementById('user-playlist-scroll-container') ||
                                document.getElementById('playlist-scroll-container') ||
                                document.getElementById('album-scroll-container') ||
                                document.getElementById('artist-scroll-container') ||
                                document.getElementById('song-scroll-container');
        const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
        const progress = Math.max(0, Math.min(1, scrollTop / 350));
        return window._getActivePageThemeColor(progress);
      }
      return defaultThemeColor;
    };

    if (!isOpen) {
      applyThemeColor(getActivePageColor());
      return;
    }

    // Use the EXACT same color that the CSS gradient starts with at 0%
    const targetColor = dominantColors?.primary
      ? convertRgbToHex(dominantColors.primary)
      : defaultThemeColor;

    applyThemeColor(targetColor);

    return () => {
      applyThemeColor(getActivePageColor());
    };
  }, [isOpen, dominantColors?.primary]);

  // Handle mobile back button to close lyrics
  useEffect(() => {
    if (typeof window === "undefined" || !showLyrics) return;

    const stateKey = "isFullscreenLyricsOpen";
    const currentState = window.history.state || {};
    window.history.pushState({ ...currentState, [stateKey]: true }, "");

    const handlePopState = () => {
      if (!window.history.state?.[stateKey]) {
        setShowLyrics(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.[stateKey]) {
        window.history.back();
      }
    };
  }, [showLyrics]);

  // Handle mobile back button to close playlist
  useEffect(() => {
    if (typeof window === "undefined" || !showPlaylist) return;

    const stateKey = "isFullscreenPlaylistOpen";
    const currentState = window.history.state || {};
    window.history.pushState({ ...currentState, [stateKey]: true }, "");

    const handlePopState = () => {
      if (!window.history.state?.[stateKey]) {
        setShowPlaylist(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.[stateKey]) {
        window.history.back();
      }
    };
  }, [showPlaylist]);

  // Handle mobile back button to close Add to Playlist dialog
  useEffect(() => {
    if (typeof window === "undefined" || !addToPlaylistDialogOpen) return;

    const stateKey = "isAddToPlaylistDialogOpen";
    const currentState = window.history.state || {};
    window.history.pushState({ ...currentState, [stateKey]: true }, "");

    const handlePopState = () => {
      if (!window.history.state?.[stateKey]) {
        setAddToPlaylistDialogOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.[stateKey]) {
        window.history.back();
      }
    };
  }, [addToPlaylistDialogOpen]);


  // Mouse drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
    e.target.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const currentPlaylist = getCurrentPlaylist();
    const newPlaylist = [...currentPlaylist];
    const draggedItem = newPlaylist[draggedIndex];

    // Remove dragged item
    newPlaylist.splice(draggedIndex, 1);

    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newPlaylist.splice(insertIndex, 0, draggedItem);

    if (isShuffle && shuffledPlaylist.length > 0) {
      setShuffledPlaylist(newPlaylist);
    } else {
      setLocalPlaylist(newPlaylist);
    }

    // Update the parent component's playlist using the new prop
    if (onPlaylistReorder) {
      const currentSongNewIndex = newPlaylist.findIndex(
        (song) => song.id === currentSong?.id
      );
      onPlaylistReorder(newPlaylist, currentSong, currentSongNewIndex);
    } else if (onSongChange) {
      // Fallback to old method if onPlaylistReorder is not provided
      const currentSongNewIndex = newPlaylist.findIndex(
        (song) => song.id === currentSong?.id
      );
      if (currentSongNewIndex !== -1) {
        onSongChange(currentSong, currentSongNewIndex, newPlaylist);
      }
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e, index) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);
    setDraggedIndex(index);
    setIsDragging(false);
    setDraggedElement(e.currentTarget);

    // Store initial touch position for better detection
    e.currentTarget.touchStartX = touch.clientX;
    e.currentTarget.touchStartTime = Date.now();

    // Don't prevent default here to allow normal scrolling initially
  };

  const handleTouchMove = (e) => {
    if (draggedIndex === null || !draggedElement) return;

    const touch = e.touches[0];
    const currentTime = Date.now();
    const timeDiff = currentTime - (draggedElement.touchStartTime || 0);

    setTouchCurrentY(touch.clientY);

    const deltaY = Math.abs(touch.clientY - touchStartY);
    const deltaX = Math.abs(
      touch.clientX - (draggedElement.touchStartX || touch.clientX)
    );

    // Much stricter conditions for drag detection:
    // 1. Must hold for at least 500ms (long press)
    // 2. Must move more than 40px vertically
    // 3. Horizontal movement must be less than 20px (to avoid interfering with horizontal swipes)
    // 4. Must not be already dragging
    if (timeDiff > 500 && deltaY > 40 && deltaX < 20 && !isDragging) {
      setIsDragging(true);
      if (draggedElement) {
        draggedElement.style.opacity = "0.7";
        draggedElement.style.transform = "scale(0.98)";
        draggedElement.style.zIndex = "1000";
        draggedElement.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";

        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
      // Now prevent scrolling since we're dragging
      e.preventDefault();
    }

    // Only proceed with drag logic if we're actually dragging
    if (isDragging) {
      // Prevent scrolling while dragging
      e.preventDefault();

      // Get all song elements
      const songElements = document.querySelectorAll("[data-song-index]");
      let closestIndex = draggedIndex;
      let closestDistance = Infinity;

      // Find the closest song element to the touch point
      songElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(touch.clientY - elementCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = parseInt(element.getAttribute("data-song-index"));
        }
      });

      if (closestIndex !== draggedIndex && closestIndex !== dragOverIndex) {
        setDragOverIndex(closestIndex);
      }

      // Move the dragged element smoothly
      if (draggedElement) {
        const offset = touch.clientY - touchStartY;
        draggedElement.style.transform = `translateY(${offset}px) scale(0.98)`;
      }
    } else {
      // If not dragging yet, allow normal scrolling by not preventing default
      // This ensures smooth scrolling experience
    }
  };

  const handleTouchEnd = (e) => {
    if (draggedIndex === null) return;

    // Add a small delay to prevent accidental clicks
    setTimeout(
      () => {
        if (
          isDragging &&
          dragOverIndex !== null &&
          dragOverIndex !== draggedIndex
        ) {
          // Perform the reorder
          const currentPlaylist = getCurrentPlaylist();
          const newPlaylist = [...currentPlaylist];
          const draggedItem = newPlaylist[draggedIndex];

          // Remove dragged item
          newPlaylist.splice(draggedIndex, 1);

          // Insert at new position
          const insertIndex =
            draggedIndex < dragOverIndex ? dragOverIndex - 1 : dragOverIndex;
          newPlaylist.splice(insertIndex, 0, draggedItem);

          if (isShuffle && shuffledPlaylist.length > 0) {
            setShuffledPlaylist(newPlaylist);
          } else {
            setLocalPlaylist(newPlaylist);
          }

          // Update the parent component's playlist using the new prop
          if (onPlaylistReorder) {
            const currentSongNewIndex = newPlaylist.findIndex(
              (song) => song.id === currentSong?.id
            );
            onPlaylistReorder(newPlaylist, currentSong, currentSongNewIndex);
          } else if (onSongChange) {
            // Fallback to old method if onPlaylistReorder is not provided
            const currentSongNewIndex = newPlaylist.findIndex(
              (song) => song.id === currentSong?.id
            );
            if (currentSongNewIndex !== -1) {
              onSongChange(currentSong, currentSongNewIndex, newPlaylist);
            }
          }
        }

        // Reset drag state with smooth transition
        if (draggedElement) {
          draggedElement.style.transition = "all 0.2s ease";
          draggedElement.style.opacity = "1";
          draggedElement.style.transform = "";
          draggedElement.style.zIndex = "";
          draggedElement.style.boxShadow = "";

          // Remove transition after animation
          setTimeout(() => {
            if (draggedElement) {
              draggedElement.style.transition = "";
            }
          }, 200);
        }

        setDraggedIndex(null);
        setDragOverIndex(null);
        setIsDragging(false);
        setTouchStartY(null);
        setTouchCurrentY(null);
        setDraggedElement(null);
      },
      isDragging ? 100 : 0
    ); // Small delay only if we were dragging
  };

  // Refs for lyric scrolling - separate for mobile and desktop
  const mobileLyricsContainerRef = useRef(null);
  const desktopLyricsContainerRef = useRef(null);
  const mobileLyricLineRefs = useRef([]);
  const desktopLyricLineRefs = useRef([]);
  const scrollAnimationRef = useRef(null);
  const lastScrolledIndexRef = useRef(-1);

  // Fetch lyrics from LRCLib API
  const fetchLyrics = async (song, signal) => {
    if (!song) return null;

    // Check cache first
    const cacheKey = song.id || song.songId;
    if (cacheKey && lyricsCache.has(cacheKey)) {
      return lyricsCache.get(cacheKey);
    }

    try {
      setLyricsLoading(true);

      const artistName = getArtistNames(song);
      const trackName = decodeHtmlEntities(song.name || song.title);
      const albumName = song.album?.name ? decodeHtmlEntities(song.album.name) : "";
      const duration = song.duration || 0;

      const { cleanTitle, cleanArtist } = cleanSongMetadata(trackName, artistName);

      // Try TTML word-by-word synced lyrics API first
      try {
        const durationParam = duration ? `&d=${duration}` : '';
        const ttmlUrl = `/api/proxy/ttml-lyrics?s=${encodeURIComponent(cleanTitle)}&a=${encodeURIComponent(cleanArtist)}${durationParam}`;
        const ttmlResponse = await fetch(ttmlUrl, { signal });
        if (ttmlResponse.ok) {
          const ttmlData = await ttmlResponse.json();
          if (ttmlData?.lyrics) {
            const result = {
              syncedLyrics: ttmlData.lyrics,
              plainLyrics: "",
              isTTML: true
            };
            if (cacheKey) lyricsCache.set(cacheKey, result);
            return result;
          }
        }
      } catch (err) {
        // Re-throw AbortError so the outer handler catches it cleanly
        // and doesn't fall through to the parallel fetches (which would
        // wrongly cache null for a song whose request was just aborted).
        if (err.name === 'AbortError') throw err;
        console.warn("Could not fetch TTML lyrics, falling back to LRCLib:", err.message);
      }

      // Prepare the three URLs for parallel fetching
      const params = new URLSearchParams();
      params.append("artist_name", cleanArtist);
      params.append("track_name", cleanTitle);
      if (albumName) params.append("album_name", albumName);
      if (duration) params.append("duration", duration.toString());

      const getApiUrl = `/api/proxy/lyrics?endpoint=get&${params.toString()}`;
      
      const query1 = `${cleanArtist} ${cleanTitle}`;
      const searchApiUrl1 = `/api/proxy/lyrics?endpoint=search&q=${encodeURIComponent(query1)}`;
      
      const searchApiUrl2 = `/api/proxy/lyrics?endpoint=search&q=${encodeURIComponent(cleanTitle)}`;

      // Fetch all three concurrently!
      try {
        const [getRes, searchRes1, searchRes2] = await Promise.all([
          fetch(getApiUrl, { signal }).catch(() => ({ ok: false, status: 500 })),
          fetch(searchApiUrl1, { signal }).catch(() => ({ ok: false, status: 500 })),
          fetch(searchApiUrl2, { signal }).catch(() => ({ ok: false, status: 500 }))
        ]);

        // 1. Check if exact match succeeded
        if (getRes.ok) {
          const exactData = await getRes.json();
          if (exactData && (exactData.syncedLyrics || exactData.plainLyrics)) {
            if (cacheKey) lyricsCache.set(cacheKey, exactData);
            return exactData;
          }
        }

        // 2. Check search result 1 (artist + title query)
        let searchResults = [];
        if (searchRes1.ok) {
          searchResults = await searchRes1.json();
        }

        // 3. Check search result 2 (title only query) if search 1 had no results
        if ((!searchResults || searchResults.length === 0) && searchRes2.ok) {
          searchResults = await searchRes2.json();
        }

        if (searchResults && searchResults.length > 0) {
          // Score and find the best match
          const matches = searchResults
            .filter(r => r.syncedLyrics || r.plainLyrics)
            .map(r => {
              let score = 0;
              const normalize = (str) =>
                (str || "").toLowerCase().replace(/[^\w\s]/gi, " ").replace(/\s+/g, " ").trim();
              const rNameNorm = normalize(r.name || r.trackName);
              const sNameNorm = normalize(cleanTitle);
              const rName = (r.name || r.trackName || "").toLowerCase();
              const sName = cleanTitle.toLowerCase();
              if (rName === sName || rNameNorm === sNameNorm) score += 15;
              else if (rName.includes(sName) || sName.includes(rName)) score += 8;
              else if (rNameNorm.includes(sNameNorm) || sNameNorm.includes(rNameNorm)) score += 5;
              const rArtist = (r.artistName || "").toLowerCase();
              const sArtist = cleanArtist.toLowerCase();
              if (rArtist === sArtist) score += 10;
              else if (rArtist.includes(sArtist) || sArtist.includes(rArtist)) score += 5;
              const durationDiff = Math.abs((r.duration || 0) - duration);
              if (durationDiff <= 2) score += 20;
              else if (durationDiff <= 5) score += 12;
              else if (durationDiff <= 10) score += 7;
              return { ...r, matchScore: score };
            })
            .sort((a, b) => b.matchScore - a.matchScore);

          const bestMatch = matches[0];
          if (bestMatch && bestMatch.matchScore > 10) {
            if (cacheKey) lyricsCache.set(cacheKey, bestMatch);
            return bestMatch;
          }
        }
      } catch (parallelErr) {
        console.warn("Parallel lyrics fetch error:", parallelErr);
      }

      // Only cache a negative result when the request completed normally.
      // If it was aborted mid-flight we leave the cache empty so the next
      // visit to this song triggers a fresh fetch instead of immediately
      // showing "No lyrics found".
      if (cacheKey && !signal?.aborted) lyricsCache.set(cacheKey, null);
      return null;
    } catch (error) {
      // AbortError is expected when the user closes lyrics — not a real error
      if (error.name === 'AbortError') return null;
      console.warn("Could not fetch lyrics:", error.message);
      return null;
    } finally {
      setLyricsLoading(false);
    }
  };

  // Scroll to keep active lyric near top (2nd line position)
  const scrollToCurrentLyric = useCallback((currentIndex) => {
    if (currentIndex === -1) return;
    if (currentIndex === lastScrolledIndexRef.current) return;
    lastScrolledIndexRef.current = currentIndex;

    // Pick the right line ref
    const mobileEl = mobileLyricLineRefs.current[currentIndex];
    const desktopEl = desktopLyricLineRefs.current[currentIndex];

    // Use whichever is visible
    const el = (mobileEl && mobileEl.offsetParent) ? mobileEl
      : (desktopEl && desktopEl.offsetParent) ? desktopEl
        : null;

    if (!el) return;

    // Get the scroll container
    const container = el.closest('.overflow-y-auto');
    if (!container) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Position active line at ~15% from top = 2nd line feel
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    const offset = elTop - containerTop - (container.clientHeight * 0.12);

    container.scrollBy({ top: offset, behavior: "smooth" });
  }, []);

  // Optimized like toggle with debouncing and optimistic updates
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [optimisticLikeState, setOptimisticLikeState] = useState(null);
  const likeTimeoutRef = useRef(null);

  const handleLikeToggle = useCallback(async () => {
    if (!currentSong || isLikeLoading) return;

    // Clear any pending timeout
    if (likeTimeoutRef.current) {
      clearTimeout(likeTimeoutRef.current);
    }

    // Optimistic update - immediately update UI
    const currentLikeState = isLiked(currentSong.id);
    setOptimisticLikeState(!currentLikeState);
    setIsLikeLoading(true);

    // Debounce the actual API call
    likeTimeoutRef.current = setTimeout(async () => {
      try {
        const songData = {
          id: currentSong.id,
          name: currentSong.name || currentSong.title,
          title: currentSong.name || currentSong.title,
          artists: currentSong.artists || { primary: [] },
          primaryArtists:
            currentSong.primaryArtists || getArtistNames(currentSong),
          album: currentSong.album || { id: "", name: "" },
          duration: currentSong.duration || 0,
          image: currentSong.image || [],
          releaseDate: currentSong.releaseDate || "",
          language: currentSong.language || "",
          playCount: currentSong.playCount || 0,
          downloadUrl: currentSong.downloadUrl || [],
          url: currentSong.url || "",
          type: "song",
        };
        await toggleLike(songData);
        setOptimisticLikeState(null); // Reset optimistic state
      } catch (error) {
        console.error("Error toggling like:", error);
        // Revert optimistic update on error
        setOptimisticLikeState(null);
      } finally {
        setIsLikeLoading(false);
      }
    }, 300); // 300ms debounce
  }, [currentSong, isLiked, toggleLike, isLikeLoading]);

  // Get current like state (optimistic or actual)
  const getCurrentLikeState = useCallback(() => {
    if (optimisticLikeState !== null) return optimisticLikeState;
    return isLiked(currentSong?.id);
  }, [optimisticLikeState, isLiked, currentSong?.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (likeTimeoutRef.current) {
        clearTimeout(likeTimeoutRef.current);
      }
    };
  }, []);

  const toggleRepeat = () => {
    const modes = ["off", "all", "one"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const handleDownloadClick = async (e) => {
    if (e) e.stopPropagation();
    if (!currentSong) return;
    triggerSmartlink(true); // Download — fire every time, no cooldown

    const toastId = toast.loading(`Preparing "${decodeHtmlEntities(currentSong.name || currentSong.title)}"...`);

    try {
      // 1. Resolve Best Quality URL
      let downloadUrl = null;
      if (currentSong.downloadUrl && Array.isArray(currentSong.downloadUrl)) {
        const mp3s = currentSong.downloadUrl.filter(u => u.url.toLowerCase().includes('.mp3'));
        const bestMp3 = mp3s.find(u => u.quality === '320kbps') ||
          mp3s.find(u => u.quality === '160kbps') ||
          mp3s[0];
        const bestOverall = currentSong.downloadUrl.find(u => u.quality === '320kbps') ||
          currentSong.downloadUrl[currentSong.downloadUrl.length - 1];
        downloadUrl = bestMp3?.url || bestOverall?.url;
      }

      if (!downloadUrl && currentSong.id) {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${currentSong.id}`);
        const d = await resp.json();
        if (d.success && d.data?.[0]?.downloadUrl) {
          const freshUrls = d.data[0].downloadUrl;
          const mp3s = freshUrls.filter(u => u.url.toLowerCase().includes('.mp3'));
          const bestMp3 = mp3s.find(u => u.quality === '320kbps') || mp3s.find(u => u.quality === '160kbps') || mp3s[0];
          const bestOverall = freshUrls.find(u => u.quality === '320kbps') || freshUrls[freshUrls.length - 1];
          downloadUrl = bestMp3?.url || bestOverall?.url;
        }
      }

      if (!downloadUrl) throw new Error('No download URL available');

      // 2. Resolve Best Image
      const imageUrl = currentSong.image?.find(img => img.quality === '500x500')?.url ||
        currentSong.image?.find(img => img.quality === '150x150')?.url ||
        currentSong.image?.[currentSong.image.length - 1]?.url;

      const title = decodeHtmlEntities(currentSong.name || currentSong.title);
      const artist = getArtistNames(currentSong);
      const album = currentSong.album?.name ? decodeHtmlEntities(currentSong.album.name) : (typeof currentSong.album === 'string' ? decodeHtmlEntities(currentSong.album) : 'Unknown Album');
      const year = currentSong.year || (currentSong.releaseDate ? new Date(currentSong.releaseDate).getFullYear() : '');

      toast.loading(`Downloading "${title}"...`, { id: toastId });

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
        toast.success(`Downloaded "${title}"!`, { id: toastId });
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download: ${error.message}`, { id: toastId });
    }
  };

  // Add to playlist handler
  const handleAddToPlaylist = (e, song) => {
    if (e) e.stopPropagation();

    // Ensure we have a valid song object
    if (!song) {
      console.error("No song provided to add to playlist");
      return;
    }

    // Create a properly formatted song object for the dialog
    const formattedSong = {
      id: song.id,
      name: song.name || song.title,
      title: song.name || song.title,
      artists: song.artists || { primary: [] },
      primaryArtists: song.primaryArtists || getArtistNames(song),
      album: song.album || { id: "", name: "" },
      duration: song.duration || 0,
      image: song.image || [],
      releaseDate: song.releaseDate || "",
      language: song.language || "",
      playCount: song.playCount || 0,
      downloadUrl: song.downloadUrl || [],
      url: song.url || "",
      type: "song",
    };

    console.log("Adding song to playlist:", formattedSong);
    setSelectedSong(formattedSong);
    setAddToPlaylistDialogOpen(true);
  };


  // Extract dominant colors from album art - Updated with high-quality logic from music-player.jsx
  const extractColorsFromImage = (imageUrl) => {
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

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3] / 255;

            // Step 4: Filter out junk colors
            const rLinear = Math.pow(r / 255, 2.2);
            const gLinear = Math.pow(g / 255, 2.2);
            const bLinear = Math.pow(b / 255, 2.2);
            const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;

            // Skip near-black, near-white, or transparent pixels
            if (luminance < 0.03 || luminance > 0.97 || a < 0.2) continue;

            const quantizedR = Math.floor(r / 16) * 16;
            const quantizedG = Math.floor(g / 16) * 16;
            const quantizedB = Math.floor(b / 16) * 16;
            const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;

            colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
          }

          const palette = Object.entries(colorCounts)
            .map(([color, count]) => {
              const [r, g, b] = color.split(",").map(Number);
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const saturation = max === 0 ? 0 : (max - min) / max;
              const score = count * Math.pow(saturation, 1.2);
              return { r, g, b, count, saturation, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);

          if (palette.length === 0) {
            resolve({
              primary: "rgb(40,40,40)",
              secondary: "rgb(20,20,20)",
              accent: "rgb(30,30,30)",
            });
            return;
          }

          let bestColor = palette[0];
          for (let i = 1; i < Math.min(3, palette.length); i++) {
            const candidate = palette[i];
            if (candidate.score > bestColor.score * 0.7 && candidate.saturation > bestColor.saturation * 1.2) {
              bestColor = candidate;
            }
          }

          // Function to tweak a color using HSL (from music-player.jsx)
          const tweakColor = (r, g, b, sMult = 1.2, lMult = 0.6, minL = 0.1, maxL = 0.25) => {
            let rNorm = r / 255,
              gNorm = g / 255,
              bNorm = b / 255;
            const max = Math.max(rNorm, gNorm, bNorm),
              min = Math.min(rNorm, gNorm, bNorm);
            const diff = max - min;
            let h = 0,
              s = 0,
              l = (max + min) / 2;

            if (diff !== 0) {
              s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
              switch (max) {
                case rNorm:
                  h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0);
                  break;
                case gNorm:
                  h = (bNorm - rNorm) / diff + 2;
                  break;
                case bNorm:
                  h = (rNorm - gNorm) / diff + 4;
                  break;
              }
              h /= 6;
            }

            // Enhance saturation and adjust lightness for optimal contrast
            s = Math.min(1, s * sMult);
            l = Math.max(minL, Math.min(maxL, l * lMult)); // Configurable range

            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1 / 6) return p + (q - p) * 6 * t;
              if (t < 1 / 2) return q;
              if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
              return p;
            };

            let resR, resG, resB;
            if (s === 0) resR = resG = resB = l;
            else {
              const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
              const p = 2 * l - q;
              resR = hue2rgb(p, q, h + 1 / 3);
              resG = hue2rgb(p, q, h);
              resB = hue2rgb(p, q, h - 1 / 3);
            }

            resR = Math.round(resR * 255);
            resG = Math.round(resG * 255);
            resB = Math.round(resB * 255);

            // Contrast check (WCAG compliance from music-player.jsx)
            const finalLuminance =
              0.2126 * Math.pow(resR / 255, 2.2) +
              0.7152 * Math.pow(resG / 255, 2.2) +
              0.0722 * Math.pow(resB / 255, 2.2);
            const whiteContrast = 1.05 / (finalLuminance + 0.05);
            if (whiteContrast < 4.5) {
              const factor = 0.7;
              resR = Math.round(resR * factor);
              resG = Math.round(resG * factor);
              resB = Math.round(resB * factor);
            }

            return `rgb(${resR}, ${resG}, ${resB})`;
          };

          // Generate the 3 colors for the gradient
          resolve({
            primary: tweakColor(bestColor.r, bestColor.g, bestColor.b, 1.2, 0.7, 0.2, 0.4), // Bright top
            secondary: tweakColor(bestColor.r, bestColor.g, bestColor.b, 1.1, 0.4, 0.1, 0.2), // Medium bottom
            accent: tweakColor(bestColor.r, bestColor.g, bestColor.b, 1.2, 0.5, 0.12, 0.28), // Medium bottom
            raw: `rgb(${bestColor.r},${bestColor.g},${bestColor.b})`,
          });
        } catch (error) {
          console.error("Error extracting colours:", error);
          resolve({
            primary: "rgb(40,40,40)",
            secondary: "rgb(20,20,20)",
            accent: "rgb(30,30,30)",
          });
        }
      };

      img.onerror = () => {
        resolve({
          primary: "rgb(40,40,40)",
          secondary: "rgb(20,20,20)",
          accent: "rgb(30,30,30)",
        });
      };

      img.src = imageUrl;
    });
  };

  // Shuffle array function
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Create shuffled playlist when shuffle is enabled
  useEffect(() => {
    if (isShuffle && playlist.length > 0) {
      const otherSongs = playlist.filter((song) => song.id !== currentSong?.id);
      const shuffledOthers = shuffleArray(otherSongs);

      const shuffled = currentSong
        ? [currentSong, ...shuffledOthers]
        : shuffleArray(playlist);

      setShuffledPlaylist(shuffled);
      shuffledIndexRef.current = 0;
      if (currentSong) {
        onSongChange?.(currentSong, 0, shuffled);
      }
    } else {
      setShuffledPlaylist([]);
      shuffledIndexRef.current = 0;
      if (currentSong && localPlaylist.length > 0) {
        const originalIndex = localPlaylist.findIndex(s => s.id === currentSong.id);
        if (originalIndex !== -1) {
          onSongChange?.(currentSong, originalIndex, localPlaylist);
        }
      }
    }
  }, [isShuffle, playlist]);

  // Realign shuffle position when currentSong changes externally (e.g. user clicks a song)
  useEffect(() => {
    if (!isShuffle || playlist.length === 0 || !currentSong) return;
    if (internalNavRef.current) {
      internalNavRef.current = false;
      return;
    }
    // External song change — rebuild shuffled playlist around the new current song
    const otherSongs = playlist.filter((song) => song.id !== currentSong.id);
    const shuffledOthers = shuffleArray(otherSongs);
    setShuffledPlaylist([currentSong, ...shuffledOthers]);
    shuffledIndexRef.current = 0;
  }, [currentSong?.id]);

  const getCurrentPlaylist = () => {
    return isShuffle && shuffledPlaylist.length > 0 ? shuffledPlaylist : localPlaylist;
  };

  // Enhanced next/previous functions with shuffle and repeat support
  const handleNext = () => {
    if (isShuffle && shuffledPlaylist.length > 0) {
      const nextPos = shuffledIndexRef.current + 1;
      if (nextPos >= shuffledPlaylist.length) {
        const otherSongs = playlist.filter((song) => song.id !== currentSong?.id);
        const shuffledOthers = shuffleArray(otherSongs);
        const shuffled = currentSong
          ? [currentSong, ...shuffledOthers]
          : shuffleArray(playlist);
        setShuffledPlaylist(shuffled);
        shuffledIndexRef.current = 0;
        const nextSong = shuffled[0];
        if (nextSong) {
          internalNavRef.current = true;
          onSongChange?.(nextSong, 0, shuffled);
          setIsPlaying(true);
        }
        return;
      } else {
        shuffledIndexRef.current = nextPos;
      }
      const nextSong = shuffledPlaylist[shuffledIndexRef.current];
      if (nextSong) {
        internalNavRef.current = true;
        onSongChange?.(nextSong, shuffledIndexRef.current, shuffledPlaylist);
        setIsPlaying(true);
      }
      return;
    }

    const currentPlaylist = localPlaylist;
    if (currentPlaylist.length === 0) return;

    const currentIndex = currentPlaylist.findIndex(
      (song) => song.id === currentSong?.id
    );
    let nextIndex;

    if (repeatMode === "one") {
      nextIndex = currentIndex;
    } else if (currentIndex < currentPlaylist.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (repeatMode === "all") {
      nextIndex = 0;
    } else {
      setIsPlaying(false);
      return;
    }

    const nextSong = currentPlaylist[nextIndex];
    if (nextSong) {
      onSongChange?.(nextSong, nextIndex, currentPlaylist);
      setIsPlaying(true);
    }
  };

  const handlePrevious = () => {
    if (isShuffle && shuffledPlaylist.length > 0) {
      const prevPos = shuffledIndexRef.current > 0
        ? shuffledIndexRef.current - 1
        : shuffledPlaylist.length - 1;
      shuffledIndexRef.current = prevPos;
      const prevSong = shuffledPlaylist[prevPos];
      if (prevSong) {
        internalNavRef.current = true;
        onSongChange?.(prevSong, prevPos, shuffledPlaylist);
        setIsPlaying(true);
      }
      return;
    }

    const currentPlaylist = localPlaylist;
    if (currentPlaylist.length === 0) return;

    const currentIndex = currentPlaylist.findIndex(
      (song) => song.id === currentSong?.id
    );
    let prevIndex;

    if (repeatMode === "one") {
      prevIndex = currentIndex;
    } else if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    } else if (repeatMode === "all") {
      prevIndex = currentPlaylist.length - 1;
    } else {
      prevIndex = 0;
    }

    const prevSong = currentPlaylist[prevIndex];
    if (prevSong) {
      onSongChange?.(prevSong, prevIndex, currentPlaylist);
      setIsPlaying(true);
    }
  };

  // Handle song end - auto play next song
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleSongEnd = () => {
      if (isShuffle && shuffledPlaylist.length > 0) {
        const nextPos = shuffledIndexRef.current + 1;
        if (nextPos >= shuffledPlaylist.length) {
          const otherSongs = playlist.filter((song) => song.id !== currentSong?.id);
          const shuffledOthers = shuffleArray(otherSongs);
          const shuffled = currentSong
            ? [currentSong, ...shuffledOthers]
            : shuffleArray(playlist);
          setShuffledPlaylist(shuffled);
          shuffledIndexRef.current = 0;
          const nextSong = shuffled[0];
          if (nextSong) {
            internalNavRef.current = true;
            onSongChange?.(nextSong, 0, shuffled);
            setIsPlaying(true);
          }
          return;
        } else {
          shuffledIndexRef.current = nextPos;
        }
        const nextSong = shuffledPlaylist[shuffledIndexRef.current];
        if (nextSong) {
          internalNavRef.current = true;
          onSongChange?.(nextSong, shuffledIndexRef.current, shuffledPlaylist);
          setIsPlaying(true);
        }
        return;
      }

      const currentPlaylist = localPlaylist;
      if (currentPlaylist.length === 0) return;

      const currentIndex = currentPlaylist.findIndex(
        (song) => song.id === currentSong?.id
      );
      let nextIndex;

      if (repeatMode === "one") {
        nextIndex = currentIndex;
      } else if (currentIndex < currentPlaylist.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (repeatMode === "all") {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }

      const nextSong = currentPlaylist[nextIndex];
      if (nextSong) {
        onSongChange?.(nextSong, nextIndex, currentPlaylist);
        setIsPlaying(true);
      }
    };

    audio.addEventListener("ended", handleSongEnd);
    return () => {
      audio.removeEventListener("ended", handleSongEnd);
    };
  }, [
    currentSong?.id,
    repeatMode,
    isShuffle,
    shuffledPlaylist,
    localPlaylist, // Add localPlaylist to dependencies
    onSongChange,
    setIsPlaying,
  ]);

  // Extract colors when song changes — with caching & pre-extraction
  useEffect(() => {
    const defaultColors = {
      primary: "rgb(40,40,40)",
      secondary: "rgb(20,20,20)",
      accent: "rgb(30,30,30)",
    };

    if (!currentSong?.id) {
      setDominantColors(defaultColors);
      return;
    }

    const songId = currentSong.id;

    // 1. Instant: check cache first (0ms — no network, no async)
    if (_fsColorCache.has(songId)) {
      setDominantColors(_fsColorCache.get(songId));
    } else if (currentSong.image?.length > 0) {
      // 2. Fallback: extract and cache
      const imageUrl = _getFsSmallImageUrl(currentSong);
      if (imageUrl) {
        extractColorsFromImage(imageUrl).then((colors) => {
          _fsColorCache.set(songId, colors);
          setDominantColors(colors);
        });
      }
    } else {
      setDominantColors(defaultColors);
    }

    // 3. Pre-extract colors for adjacent songs
    const idx = playlist.findIndex((s) => s.id === songId);
    const adjacentIndices = [idx - 1, idx + 1, idx + 2].filter(
      (i) => i >= 0 && i < playlist.length
    );
    const schedule = typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback
      : (cb) => setTimeout(cb, 50);
    schedule(() => {
      for (const adjIdx of adjacentIndices) {
        const adjSong = playlist[adjIdx];
        if (!adjSong?.id || _fsColorCache.has(adjSong.id)) continue;
        const adjUrl = _getFsSmallImageUrl(adjSong);
        if (adjUrl) {
          extractColorsFromImage(adjUrl).then((colors) => {
            _fsColorCache.set(adjSong.id, colors);
          });
        }
      }
    });
  }, [currentSong?.id, playlist]);

  // Fetch lyrics when song changes
  // Reset lyricsFetching when the lyrics panel is closed
  useEffect(() => {
    if (!showLyrics) {
      setLyricsFetching(false);
      setLyrics(null);
    }
  }, [showLyrics]);

  // Single source of truth for lyrics fetching.
  // An in-flight Map prevents duplicate requests for the same song.
  const lyricsInFlight = useRef(new Map());

  useEffect(() => {
    if (!currentSong || !showLyrics) return;

    const cacheKey = currentSong.id || currentSong.songId;

    // Cache hit — instant, no network
    if (cacheKey && lyricsCache.has(cacheKey)) {
      setLyrics(lyricsCache.get(cacheKey));
      return;
    }

    // Already fetching this song — don't fire a second request
    if (cacheKey && lyricsInFlight.current.has(cacheKey)) return;

    const controller = new AbortController();
    if (cacheKey) lyricsInFlight.current.set(cacheKey, controller);

    setLyrics(null);
    setLyricsFetching(true); // show skeleton immediately — no gap before lyricsLoading turns true
    fetchLyrics(currentSong, controller.signal).then((lyricsData) => {
      if (!controller.signal.aborted) {
        setLyrics(lyricsData);
        setLyricsFetching(false);
      }
    }).finally(() => {
      if (cacheKey) lyricsInFlight.current.delete(cacheKey);
    });

    return () => {
      controller.abort();
      if (cacheKey) lyricsInFlight.current.delete(cacheKey);
      // Do NOT reset lyricsFetching here — if the song changed while lyrics
      // panel is still open, the next effect run will immediately set it true
      // again for the new song. Resetting here causes the "No lyrics found"
      // flash between the two effect runs.
    };
  }, [currentSong?.id, showLyrics]);

  // Handle lyrics button click — just toggle visibility.
  // The useEffect above handles all fetching.
  const handleLyricsToggle = () => {
    if (showVideoMode) return;
    if (!showLyrics) triggerSmartlink(); // Lyrics open — 30-min cooldown applies
    setShowLyrics(!showLyrics);
  };

  // Sync fullscreen state with context
  useEffect(() => {
    setIsFullscreenOpen(isOpen);
  }, [isOpen, setIsFullscreenOpen]);

  // Auto-scroll to current lyric line
  useEffect(() => {
    if (!showLyrics || !lyrics?.syncedLyrics) return;

    const currentLyricIndex = getCurrentLyricIndex(parsedLyrics, currentTime);

    if (currentLyricIndex !== -1 && currentLyricIndex !== lastScrolledIndexRef.current) {
      scrollToCurrentLyric(currentLyricIndex);
    }
  }, [currentTime, showLyrics, lyrics?.syncedLyrics, parsedLyrics, scrollToCurrentLyric]);

  if (!isOpen || !currentSong) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .amll-lyric-player {
          position: relative !important;
          mix-blend-mode: normal !important;
          contain: none !important;
          overflow: visible !important;
        }
      ` }} />
      <div
        className="fixed inset-0 z-100 overflow-hidden transition-all duration-1000 ease-out"
        style={{
          background: dominantColors.primary
            ? `linear-gradient(to bottom, 
                ${dominantColors.primary} 0%, 
                ${dominantColors.accent} 50%, 
                ${dominantColors.secondary} 100%)`
            : '#121212',
        }}
      >
        {/* Enhanced Ambient Background */}
        <div className="absolute inset-0">
          {/* Ambient Video Glow */}
          {showVideoMode && ytVideoId && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <canvas
                ref={ytCanvasRef}
                width={64}
                height={36}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'blur(80px) saturate(1.8) contrast(1.15)',
                  opacity: 0.6,
                  transform: 'scale(1.3)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
          {/* Multiple layered background images for better ambient effect - desktop only */}
          {/* Hidden on phones to avoid heavy GPU usage and animated background movement */}
          {currentSong.image?.[2]?.url && !showVideoMode && (
            <div className="hidden md:block">
              {/* Base blurred image */}
              <img
                src={currentSong.image[2].url}
                alt={currentSong.name}
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 transition-all duration-1000"
                onError={(e) => {
                  e.target.src = '/default-playlist-image.png';
                }}
              />
              {/* Secondary ambient layer */}
              <img
                src={currentSong.image[2].url}
                alt={currentSong.name}
                className="absolute inset-0 w-full h-full object-cover opacity-10 blur-[100px] scale-150 transition-all duration-1000"
                onError={(e) => {
                  e.target.src = '/default-playlist-image.png';
                }}
              />
              {/* Tertiary glow layer */}
              <img
                src={currentSong.image[2].url}
                alt={currentSong.name}
                className="absolute inset-0 w-full h-full object-cover opacity-5 blur-[150px] scale-[2] transition-all duration-1000"
                onError={(e) => {
                  e.target.src = '/default-playlist-image.png';
                }}
              />
            </div>
          )}

          {/* Dynamic gradient overlay based on extracted colors */}
          {!showVideoMode && (
            <div
              className="absolute inset-0 transition-all duration-1000"
              style={{
                background: `
                radial-gradient(ellipse at top, ${dominantColors.primary.replace('rgb', 'rgba').replace(')', ', 0.4)')} 0%, transparent 70%),
                radial-gradient(ellipse at bottom left, ${dominantColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.3)')} 0%, transparent 60%),
                radial-gradient(ellipse at bottom right, ${dominantColors.accent.replace('rgb', 'rgba').replace(')', ', 0.25)')} 0%, transparent 60%),
                linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.75) 100%)
              `,
              }}
            />
          )}

          {/* Color wash overlay */}
          {!showVideoMode && (
            <div
              className="absolute inset-0 mix-blend-soft-light opacity-40 transition-all duration-1000"
              style={{
                background: `
                radial-gradient(circle at 30% 20%, ${dominantColors.primary.replace('rgb', 'rgba').replace(')', ', 0.3)')} 0%, transparent 40%),
                radial-gradient(circle at 70% 80%, ${dominantColors.secondary.replace('rgb', 'rgba').replace(')', ', 0.25)')} 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, ${dominantColors.accent.replace('rgb', 'rgba').replace(')', ', 0.2)')} 0%, transparent 60%)
              `,
              }}
            />
          )}

          {/* Dynamic gradient overlay for video mode - keeps control areas dark for readability */}
          {showVideoMode && (
            <div
              className="absolute inset-0 transition-all duration-1000"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.85) 100%)',
              }}
            />
          )}

          {/* Subtle noise texture for depth */}
          <div
            className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundSize: "256px 256px",
            }}
          />
        </div>

        {/* Content */}
        <div
          className={`relative z-10 flex flex-col h-full text-white safe-area-inset transition-all duration-300 ${showPlaylist ? "md:mr-80" : ""
            } ${showLyrics ? "hidden" : ""}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10 rounded-full p-2"
            >
              <ChevronDown style={{ width: '20px', height: '20px' }} />
            </Button>

            <div className="text-center">
              <p className="text-sm font-medium opacity-80">Playing from</p>
              <p className="text-xs opacity-60">{playingFrom}</p>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              {isMobile ? (
                <Drawer open={openActionMenu} onOpenChange={setOpenActionMenu}>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10 rounded-full p-2 transform-gpu will-change-transform"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      <MoreHorizontal style={{ width: '20px', height: '20px' }} />
                    </Button>
                  </DrawerTrigger>

                  <DrawerContent className="bg-[#121212] border-none text-white outline-none focus:outline-none ring-0 focus-visible:ring-0">
                    <DrawerHeader className="p-0">
                      <div className="flex items-center gap-4 px-4 py-4 border-b border-white/10">
                        <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0">
                          <img
                            src={_getFsSmallImageUrl(currentSong)}
                            alt={currentSong.name || currentSong.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                          <DrawerTitle className="text-base font-bold truncate text-white text-left">
                            {decodeHtmlEntities(currentSong.name || currentSong.title)}
                          </DrawerTitle>
                          <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                            {getArtistNames(currentSong)}
                          </DrawerDescription>
                        </div>
                      </div>
                    </DrawerHeader>
                    <div className="px-2 py-4 pb-8 space-y-1">
                      <div
                        className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors ${getCurrentLikeState() ? 'text-red-500' : ''}`}
                        onClick={() => {
                          setOpenActionMenu(false);
                          handleLikeToggle();
                        }}
                      >
                        <Heart className={`w-5 h-5 ${getCurrentLikeState() ? 'fill-current' : ''}`} />
                        <span className="font-medium">{getCurrentLikeState() ? 'Unlike' : 'Like'}</span>
                      </div>
                      <div
                        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={(e) => {
                          setOpenActionMenu(false);
                          handleAddToPlaylist(e, currentSong);
                        }}
                      >
                        <Plus className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Add to playlist</span>
                      </div>
                      <div
                        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => {
                          setOpenActionMenu(false);
                          router.push(`/music/song/${currentSong.id}`);
                        }}
                      >
                        <Music2 className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Song detail</span>
                      </div>
                      <div
                        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => {
                          setOpenActionMenu(false);
                          if (navigator.share) {
                            navigator.share({
                              title: currentSong.name || currentSong.title,
                              text: `Check out "${currentSong.name || currentSong.title}" by ${getArtistNames(currentSong)}`,
                              url: window.location.href
                            });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success('Link copied to clipboard');
                          }
                        }}
                      >
                        <Share className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Share</span>
                      </div>
                      <div
                        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => {
                          setOpenActionMenu(false);
                          setShowPlaylist(!showPlaylist);
                        }}
                      >
                        <ListMusic className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{showPlaylist ? "Hide Queue" : "Show Queue"}</span>
                      </div>
                      <div className="h-px bg-white/5 my-1" />
                      <div
                        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={(e) => {
                          setOpenActionMenu(false);
                          handleDownloadClick(e);
                        }}
                      >
                        <Download className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">Download</span>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              ) : (
                /* Desktop/Tablet: Switch to video / audio toggle in header */
                <button
                  onClick={() => setShowVideoMode(v => !v)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full active:scale-95 transition-all duration-200 select-none cursor-pointer hover:bg-white/10"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.13)',
                  }}
                >
                  {showVideoMode ? (
                    <Music2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                  ) : (
                    <Video style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.01em' }}>
                    {showVideoMode ? 'Switch to audio' : 'Switch to video'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Main Content - Mobile First Design */}
          <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-12 pb-4 sm:pb-6 min-h-0 overflow-hidden">
            {/* Mobile Layout */}
            <div className="md:hidden flex-1 flex flex-col min-h-0">
              {/* Album Art OR YouTube Video */}
              <div className="flex-1 flex items-center justify-center py-4 sm:py-8 min-h-0">
                {showVideoMode ? (
                  /* ── Video player ── */
                  <div className="w-[calc(100%+2rem)] -mx-4 sm:w-[calc(100%+3rem)] sm:-mx-6" style={fullscreenType === 'mobile' ? { width: '100vw', margin: 0 } : {}}>
                    <div
                      ref={mobileVideoContainerRef}
                      className="w-full aspect-video overflow-hidden shadow-2xl bg-black relative"
                      style={getContainerStyle('mobile')}
                      onClick={handleFullscreenClick}
                    >
                      {(ytLoading || (ytVideoId && ytWaiting)) && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black/80 absolute inset-0 z-20">
                          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          <span className="text-white/50 text-xs">
                            {ytLoading ? 'Finding video…' : 'Loading stream…'}
                          </span>
                        </div>
                      )}
                      {ytError && !ytLoading && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black/80 absolute inset-0 z-20">
                          <Video style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.3)' }} />
                          <span className="text-white/40 text-xs">{ytError}</span>
                          <button
                            onClick={() => { setShowVideoMode(false); setShowVideoMode(true); }}
                            className="text-white/60 text-xs underline mt-1"
                          >Retry</button>
                        </div>
                      )}
                      {ytVideoId && !ytLoading && isMounted && isMobile && (
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            top: fullscreenType === 'mobile' ? '-8%' : '-30%',
                            left: '0',
                            width: '100%',
                            height: fullscreenType === 'mobile' ? '116%' : '160%',
                            pointerEvents: 'none'
                          }}>
                            <YouTube
                              videoId={ytVideoId}
                              opts={{
                                width: '100%',
                                height: '100%',
                                playerVars: {
                                  autoplay: 1,
                                  controls: 0,
                                  modestbranding: 1,
                                  disablekb: 1,
                                  rel: 0,
                                  fs: 0,
                                  playsinline: 1,
                                  iv_load_policy: 3,
                                }
                              }}
                              onReady={(e) => {
                                youtubePlayerRef.current = e.target;
                                setYtDuration(e.target.getDuration());
                                e.target.setVolume(volume * 100);
                                setYtWaiting(false);
                              }}
                              onStateChange={(e) => {
                                const state = e.data;
                                if (state === 1) { // Playing
                                  setYtIsPlaying(true);
                                  setYtWaiting(false);
                                  startTimePolling();
                                } else if (state === 2) { // Paused
                                  setYtIsPlaying(false);
                                  stopTimePolling();
                                } else if (state === 0) { // Ended
                                  stopTimePolling();
                                  handleNext();
                                }
                              }}
                              onError={() => setYtError('Failed to play YouTube video')}
                              className="w-full h-full"
                              iframeClassName="w-full h-full object-cover pointer-events-none"
                            />
                          </div>
                        </div>
                      )}
                      {renderFullscreenButton('mobile', mobileVideoContainerRef)}
                      {renderFullscreenHud('mobile', mobileVideoContainerRef)}
                    </div>
                  </div>
                ) : (
                  /* ── Album Art ── */
                  <div className="w-full max-w-[380px] min-[400px]:max-w-[340px] min-[430px]:max-w-[380px] sm:max-w-[85%] md:max-w-[90%] lg:max-w-[500px] px-2 sm:px-4">
                    <div className="w-full aspect-square overflow-hidden shadow-2xl bg-linear-to-br from-gray-800 to-gray-900">
                      {currentSong.image?.[2]?.url ? (
                        <img
                          src={currentSong.image[2].url}
                          alt={currentSong.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
                        />
                      ) : (
                        <img
                          src="/default-playlist-image.png"
                          alt={currentSong.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>


              {/* Switch to video / audio — above the song title, Spotify-style */}
              <div className="flex justify-start px-1 sm:px-2 mb-2">
                <button
                  onClick={() => setShowVideoMode(v => !v)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full active:scale-95 transition-all duration-200 select-none"
                  style={{
                    background: 'rgba(0,0,0,0.30)',
                    border: '1px solid rgba(255,255,255,0.13)',
                  }}
                >
                  {showVideoMode ? (
                    <Music2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                  ) : (
                    <Video style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.01em' }}>
                    {showVideoMode ? 'Switch to audio' : 'Switch to video'}
                  </span>
                </button>
              </div>

              {/* Song Info - Compact for small screens */}
              <div className="px-1 sm:px-2 pb-4 shrink-0">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0 mb-1">
                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                      {decodeHtmlEntities(currentSong.name)}
                    </h1>
                    <p className="text-sm sm:text-base text-white/70 truncate">
                      {getArtistNames(currentSong)}
                    </p>
                  </div>

                  {/* Like Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLikeToggle}
                    disabled={isLikeLoading}
                    className={`shrink-0 ml-4 p-0 h-auto w-auto transform-gpu will-change-transform ${getCurrentLikeState()
                      ? "text-green-500"
                      : "text-white/60"
                      }`}
                    style={{
                      padding: '8px', // Controlled padding
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <Heart
                      style={{ width: '24px', height: '24px' }}
                      className={`transition-colors duration-150 ${getCurrentLikeState() ? "fill-green-500" : ""
                        }`}
                    />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 sm:mb-6">
                  <Slider
                    value={[showVideoMode ? ytCurrentTime : currentTime]}
                    max={(showVideoMode ? ytDuration : duration) || 100}
                    step={1}
                    onValueChange={handleSeek}
                    onValueCommit={handleSeekCommit}
                    className="w-full **:data-[slot=slider-thumb]:opacity-100 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:w-2.5 **:data-[slot=slider-thumb]:h-2.5 **:data-[slot=slider-range]:bg-white **:data-[slot=slider-track]:bg-white/20"
                  />
                  <div className="flex justify-between text-xs sm:text-sm text-white/60 mt-2">
                    <span>{formatTime(showVideoMode ? ytCurrentTime : currentTime)}</span>
                    <span>{formatTime(showVideoMode ? ytDuration : duration)}</span>
                  </div>
                </div>

                {/* Controls - Compact spacing for small screens */}
                <div className="flex items-center justify-between max-[360px]:justify-center gap-3 max-[360px]:gap-2 sm:gap-8 mb-4 sm:mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-2 ${isShuffle ? "text-green-400" : "text-white/60"
                      }`}
                  >
                    <RxShuffle style={{ width: '24px', height: '24px' }} />
                  </Button>

                  <Button
                    size="xs"
                    onClick={handlePrevious}
                    disabled={playlist.length === 0}
                    className="text-white  hover:bg-transparent bg-transparent"
                  >
                    <BiSkipPrevious style={{ width: '52px', height: '52px' }} />
                  </Button>

                  <Button
                    variant="default"
                    size="lg"
                    onClick={handlePlayPause}
                    className="rounded-full w-16 h-16 sm:w-20 sm:h-20 bg-white text-black hover:bg-white/90"
                  >
                    {(showVideoMode ? ytIsPlaying : isPlaying) ? (
                      <HiPause style={{ width: '30px', height: '30px' }} />
                    ) : (
                      <IoMdPlay style={{ width: '30px', height: '30px', marginLeft: '4px' }} />
                    )}
                  </Button>

                  <Button
                    size="xs"
                    onClick={handleNext}
                    disabled={playlist.length === 0}
                    className="text-white  hover:bg-transparent bg-transparent"
                  >
                    <BiSkipNext style={{ width: '52px', height: '52px' }} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleRepeat}
                    className={`relative p-2 ${repeatMode !== "off" ? "text-green-400" : "text-white/60"
                      }`}
                  >
                    <BsRepeat style={{ width: '24px', height: '24px' }} />
                    {repeatMode === "one" && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full flex items-center justify-center text-xs text-black font-bold">
                        1
                      </span>
                    )}
                  </Button>
                </div>


                <div className="flex items-center justify-between ">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className="text-white/60 hover:text-white p-3 rounded-full hover:bg-white/10"
                  >
                    <ListMusic style={{ width: '18px', height: '18px' }} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-white/60 hover:text-white p-3 rounded-full hover:bg-white/10 ${
                      showVideoMode ? "opacity-20 pointer-events-none cursor-not-allowed" : ""
                    }`}
                    onClick={handleLyricsToggle}
                    disabled={showVideoMode}
                  >
                    <Mic style={{ width: '18px', height: '18px' }} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop/Tablet Layout - Professional Design */}
            <div className="hidden md:flex items-center justify-center h-full">
              <div className={`flex items-center w-full px-8 transition-all duration-300 ${
                showVideoMode 
                  ? "flex-col gap-6 max-w-5xl" 
                  : "flex-col lg:flex-row gap-12 lg:gap-16 max-w-6xl"
              }`}>
                {/* Left Side - Album Art / Video */}
                <div className={`shrink-0 flex items-center justify-center ${showVideoMode ? "w-full" : ""}`}>
                  {showVideoMode ? (
                    <div
                      ref={desktopVideoContainerRef}
                      className="w-full max-w-[720px] lg:max-w-[860px] xl:max-w-[960px] aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black relative shrink-0"
                      style={getContainerStyle('desktop')}
                      onClick={handleFullscreenClick}
                    >
                      {(ytLoading || (ytVideoId && ytWaiting)) && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black/80 absolute inset-0 z-20">
                          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                          <span className="text-white/50 text-xs">
                            {ytLoading ? 'Finding video…' : 'Loading stream…'}
                          </span>
                        </div>
                      )}
                      {ytError && !ytLoading && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black/80 absolute inset-0 z-20">
                          <Video style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.3)' }} />
                          <span className="text-white/40 text-xs">{ytError}</span>
                          <button
                            onClick={() => { setShowVideoMode(false); setShowVideoMode(true); }}
                            className="text-white/60 text-xs underline mt-1"
                          >Retry</button>
                        </div>
                      )}
                      {ytVideoId && !ytLoading && isMounted && !isMobile && !showLyrics && (
                        <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            top: fullscreenType === 'desktop' ? '-8%' : '-30%',
                            left: '0',
                            width: '100%',
                            height: fullscreenType === 'desktop' ? '116%' : '160%',
                            pointerEvents: 'none'
                          }}>
                            <YouTube
                              videoId={ytVideoId}
                              opts={{
                                width: '100%',
                                height: '100%',
                                playerVars: {
                                  autoplay: 1,
                                  controls: 0,
                                  modestbranding: 1,
                                  rel: 0,
                                  playsinline: 1,
                                }
                              }}
                              onReady={(e) => {
                                youtubePlayerRef.current = e.target;
                                setYtDuration(e.target.getDuration());
                                e.target.setVolume(volume * 100);
                                setYtWaiting(false);
                              }}
                              onStateChange={(e) => {
                                const state = e.data;
                                if (state === 1) { // Playing
                                  setYtIsPlaying(true);
                                  setYtWaiting(false);
                                  startTimePolling();
                                } else if (state === 2) { // Paused
                                  setYtIsPlaying(false);
                                  stopTimePolling();
                                } else if (state === 0) { // Ended
                                  stopTimePolling();
                                  handleNext();
                                }
                              }}
                              onError={() => setYtError('Failed to play YouTube video')}
                              className="w-full h-full"
                              iframeClassName="w-full h-full object-cover pointer-events-none"
                            />
                          </div>
                        </div>
                      )}
                      {renderFullscreenButton('desktop', desktopVideoContainerRef)}
                      {renderFullscreenHud('desktop', desktopVideoContainerRef)}
                    </div>
                  ) : (
                    <div className="w-[350px] h-[350px] lg:w-[400px] lg:h-[400px] xl:w-[450px] xl:h-[450px] rounded-2xl overflow-hidden shadow-2xl bg-linear-to-br from-gray-800 to-gray-900">
                      {currentSong.image?.[2]?.url ? (
                        <img
                          src={currentSong.image[2].url}
                          alt={currentSong.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/default-playlist-image.png';
                          }}
                        />
                      ) : (
                        <img
                          src="/default-playlist-image.png"
                          alt={currentSong.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side - Apple Music style controls panel */}
                <div className={`flex-1 flex flex-col justify-center w-full ${showVideoMode ? "mx-auto" : ""}`} style={{ maxWidth: '520px', gap: '0px' }}>
                  {/* Switch to video / audio */}
                  <div className="flex mb-3 justify-start">
                    <button
                      onClick={() => setShowVideoMode(v => !v)}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full active:scale-95 transition-all duration-200 select-none cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.13)',
                      }}
                    >
                      {showVideoMode ? (
                        <Music2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                      ) : (
                        <Video style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.01em' }}>
                        {showVideoMode ? 'Switch to audio' : 'Switch to video'}
                      </span>
                    </button>
                  </div>

                  {/* Row 1: Song title/artist + like + menu */}
                  <div className="flex gap-3 mb-4 items-start justify-between">
                    <div className="flex-1 min-w-0 text-left">
                      <h1
                        className="font-bold text-white leading-tight truncate"
                        style={{ fontSize: '1.5rem', letterSpacing: '-0.02em' }}
                        title={decodeHtmlEntities(currentSong.name)}
                      >
                        {decodeHtmlEntities(currentSong.name)}
                      </h1>
                      <p className="text-white/50 truncate mt-0.5" style={{ fontSize: '0.95rem' }}>
                        {getArtistNames(currentSong)}
                      </p>
                    </div>
                    {/* Like + More buttons */}
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      <button
                        onClick={handleLikeToggle}
                        disabled={isLikeLoading}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shrink-0"
                      >
                        {getCurrentLikeState() ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                            className="w-5 h-5 fill-white/85 transition-colors duration-200"
                          >
                            <path d="M341.5 45.1C337.4 37.1 329.1 32 320.1 32C311.1 32 302.8 37.1 298.7 45.1L225.1 189.3L65.2 214.7C56.3 216.1 48.9 222.4 46.1 231C43.3 239.6 45.6 249 51.9 255.4L166.3 369.9L141.1 529.8C139.7 538.7 143.4 547.7 150.7 553C158 558.3 167.6 559.1 175.7 555L320.1 481.6L464.4 555C472.4 559.1 482.1 558.3 489.4 553C496.7 547.7 500.4 538.8 499 529.8L473.7 369.9L588.1 255.4C594.5 249 596.7 239.6 593.9 231C591.1 222.4 583.8 216.1 574.8 214.7L415 189.3L341.5 45.1z"/>
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 640 640"
                            className="w-5 h-5 fill-white/60 hover:fill-white/80 transition-colors duration-200"
                          >
                            <path d="M320.1 32C329.1 32 337.4 37.1 341.5 45.1L415 189.3L574.9 214.7C583.8 216.1 591.2 222.4 594 231C596.8 239.6 594.5 249 588.2 255.4L473.7 369.9L499 529.8C500.4 538.7 496.7 547.7 489.4 553C482.1 558.3 472.4 559.1 464.4 555L320.1 481.6L175.8 555C167.8 559.1 158.1 558.3 150.8 553C143.5 547.7 139.8 538.8 141.2 529.8L166.4 369.9L52 255.4C45.6 249 43.4 239.6 46.2 231C49 222.4 56.3 216.1 65.3 214.7L225.2 189.3L298.8 45.1C302.9 37.1 311.2 32 320.2 32zM320.1 108.8L262.3 222C258.8 228.8 252.3 233.6 244.7 234.8L119.2 254.8L209 344.7C214.4 350.1 216.9 357.8 215.7 365.4L195.9 490.9L309.2 433.3C316 429.8 324.1 429.8 331 433.3L444.3 490.9L424.5 365.4C423.3 357.8 425.8 350.1 431.2 344.7L521 254.8L395.5 234.8C387.9 233.6 381.4 228.8 377.9 222L320.1 108.8z"/>
                          </svg>
                        )}
                      </button>
                      <div onClick={(e) => e.stopPropagation()}>
                        {isMobile ? null : (
                          <DropdownMenu open={openActionMenu} onOpenChange={setOpenActionMenu}>
                            <DropdownMenuTrigger asChild>
                              <button className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
                                <MoreHorizontal className="w-5 h-5 text-white/70 hover:text-white/90 transition-colors duration-200" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 bg-neutral-900 border-white/10 text-white p-1"
                              style={{ zIndex: 10001 }}
                              sideOffset={8}
                            >
                              <DropdownMenuItem
                                onClick={async () => { if (!currentSong) return; handleLikeToggle(); }}
                                className={`hover:bg-white/10 focus:bg-white/10 cursor-pointer ${getCurrentLikeState() ? "text-red-500" : ""}`}
                                disabled={isLikeLoading}
                              >
                                <Heart className={`w-4 h-4 mr-2 ${getCurrentLikeState() ? "fill-red-500 text-red-500" : ""}`} />
                                {isLikeLoading ? "..." : getCurrentLikeState() ? "Unlike" : "Like"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, currentSong)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" /> Add to playlist
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={() => { setOpenActionMenu(false); router.push(`/music/song/${currentSong.id}`); }} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                <Music2 className="w-4 h-4 mr-2" /> Song detail
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={() => setShowPlaylist(!showPlaylist)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                <ListMusic className="w-4 h-4 mr-2" /> {showPlaylist ? "Hide Queue" : "Show Queue"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={(e) => handleDownloadClick(e)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                <Download className="w-4 h-4 mr-2" /> Download
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Progress bar */}
                  <div className="mb-1">
                    <Slider
                      value={[showVideoMode ? ytCurrentTime : currentTime]}
                      max={(showVideoMode ? ytDuration : duration) || 100}
                      step={1}
                      onValueChange={handleSeek}
                      onValueCommit={handleSeekCommit}
                      className="w-full hover:cursor-pointer **:data-[slot=slider-thumb]:opacity-0 hover:**:data-[slot=slider-thumb]:opacity-100 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:w-3 **:data-[slot=slider-thumb]:h-3 **:data-[slot=slider-range]:bg-white **:data-[slot=slider-track]:bg-white/25 **:data-[slot=slider-track]:h-[3px]"
                    />
                  </div>

                  {/* Row 3: Timestamps */}
                  <div className="flex justify-between mb-5">
                    <span className="text-xs text-white/45 tabular-nums font-medium">{formatTime(showVideoMode ? ytCurrentTime : currentTime)}</span>
                    <span className="text-xs text-white/45 tabular-nums font-medium">-{formatTime(Math.max(0, (showVideoMode ? ytDuration : duration) - (showVideoMode ? ytCurrentTime : currentTime)))}</span>
                  </div>

                  {/* Row 4: Playback controls */}
                  <div className="flex items-center justify-between mb-5">
                    {/* Shuffle */}
                    <button
                      onClick={() => setIsShuffle(!isShuffle)}
                      className="transition-all duration-200 hover:scale-110 active:scale-95 hover:cursor-pointer flex items-center justify-center w-6 h-6"
                    >
                      <img
                        src="/shuffle.png"
                        alt="Shuffle"
                        className="w-6 h-6 object-contain"
                        style={{
                          filter: isShuffle
                            ? "brightness(0) saturate(100%) invert(72%) sepia(60%) saturate(400%) hue-rotate(95deg) brightness(95%)"
                            : "brightness(0) invert(1) opacity(0.45)",
                        }}
                      />
                    </button>

                    {/* Previous */}
                    <button
                      onClick={handlePrevious}
                      disabled={playlist.length === 0}
                      className="transition-all duration-200 hover:scale-110 active:scale-95 opacity-80 hover:opacity-100 disabled:opacity-20 hover:cursor-pointer"
                    >
                      <img src="/previous.png" alt="Previous" className="w-11 h-11 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                    </button>

                    {/* Play / Pause */}
                    <button
                      onClick={handlePlayPause}
                      className="transition-all duration-200 hover:scale-105 active:scale-95 hover:cursor-pointer"
                    >
                      {(showVideoMode ? ytIsPlaying : isPlaying) ? (
                        <img src="/pause.png" alt="Pause" className="w-16 h-16 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                      ) : (
                        <img src="/play.png" alt="Play" className="w-16 h-16 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                      )}
                    </button>

                    {/* Next */}
                    <button
                      onClick={handleNext}
                      disabled={playlist.length === 0}
                      className="transition-all duration-200 hover:scale-110 active:scale-95 opacity-80 hover:opacity-100 disabled:opacity-20 hover:cursor-pointer"
                    >
                      <img src="/next.png" alt="Next" className="w-11 h-11 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                    </button>

                    {/* Repeat */}
                    <button
                      onClick={toggleRepeat}
                      className="relative transition-all duration-200 hover:scale-110 active:scale-95 hover:cursor-pointer flex items-center justify-center w-6 h-6"
                    >
                      <img
                        src="/repeat.png"
                        alt="Repeat"
                        className="w-6 h-6 object-contain"
                        style={{
                          filter: repeatMode !== "off"
                            ? "brightness(0) saturate(100%) invert(72%) sepia(60%) saturate(400%) hue-rotate(95deg) brightness(95%)"
                            : "brightness(0) invert(1) opacity(0.45)",
                        }}
                      />
                      {repeatMode === "one" && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full flex items-center justify-center text-[9px] text-black font-bold">1</span>
                      )}
                    </button>
                  </div>

                  {/* Row 5: Volume */}
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => onVolumeChange([volume === 0 ? 0.7 : 0])}
                      className="text-white/35 hover:text-white transition-colors hover:cursor-pointer shrink-0 w-6 h-6 flex items-center justify-center"
                    >
                      <Volume2 style={{ width: '16px', height: '16px' }} />
                    </button>
                    <div className="flex-1">
                      <Slider
                        value={[volume]}
                        max={1}
                        step={0.01}
                        onValueChange={onVolumeChange}
                        className="w-full hover:cursor-pointer **:data-[slot=slider-thumb]:opacity-0 hover:**:data-[slot=slider-thumb]:opacity-100 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:w-3 **:data-[slot=slider-thumb]:h-3 **:data-[slot=slider-range]:bg-white **:data-[slot=slider-track]:bg-white/20 **:data-[slot=slider-track]:h-[3px]"
                      />
                    </div>
                    <button
                      onClick={() => onVolumeChange([Math.min(1, volume + 0.1)])}
                      className="text-white/35 hover:text-white transition-colors hover:cursor-pointer shrink-0 w-6 h-6 flex items-center justify-center"
                    >
                      <Volume2 style={{ width: '18px', height: '18px' }} />
                    </button>
                  </div>

                  {/* Row 6: Lyrics & Queue toggles — full width, space between, below volume */}
                  <div className="flex items-center gap-2.5 mt-8">
                    <button
                      onClick={handleLyricsToggle}
                      disabled={showVideoMode}
                      className={`flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shrink-0 w-6 h-6 ${
                        showVideoMode ? "opacity-20 pointer-events-none cursor-not-allowed" : "hover:cursor-pointer"
                      }`}
                      title={showVideoMode ? "Lyrics (Unavailable in video mode)" : "Lyrics"}
                    >
                      <img
                        src="/lyrics.png"
                        alt="Lyrics"
                        className="w-6 h-6 object-contain"
                        style={{
                          filter: showLyrics
                            ? "brightness(0) saturate(100%) invert(72%) sepia(60%) saturate(400%) hue-rotate(95deg) brightness(95%)"
                            : "brightness(0) invert(1) opacity(0.45)",
                        }}
                      />
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => setShowPlaylist(!showPlaylist)}
                      className="flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shrink-0 w-6 h-6"
                      title="Queue"
                    >
                      <img
                        src="/queue.png"
                        alt="Queue"
                        className="w-6 h-6 object-contain cursor-pointer"
                        style={{
                          filter: showPlaylist
                            ? "brightness(0) saturate(100%) invert(72%) sepia(60%) saturate(400%) hue-rotate(95deg) brightness(95%)"
                            : "brightness(0) invert(1) opacity(0.45)",
                        }}
                      />
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Playlist Sidebar - Mobile Full Screen, Desktop Sidebar */}
        {showPlaylist && (
          <>
            {/* Mobile: Full screen overlay */}
            <div className="md:hidden fixed inset-0 bg-black/95 backdrop-blur-xl z-20">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Queue</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlaylist(false)}
                    className="text-white/60 hover:bg-white/10 rounded-full p-2"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </Button>
                </div>
                <div
                  className="flex-1 overflow-y-auto scrollbar-hide"
                  style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
                >
                  {getCurrentPlaylist().map((song, index) => (
                    <div
                      key={`${song.id}-${index}`}
                      data-song-index={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={(e) => {
                        // Only trigger song change if not dragging
                        if (!isDragging) {
                          onSongChange?.(song, index, getCurrentPlaylist());
                          setShowPlaylist(false); // Close queue on mobile after selection
                        }
                      }}
                      className={`flex items-center gap-3 p-4 active:bg-white/5 cursor-move transition-[opacity,transform] duration-200 select-none ${index === playerCurrentIndex ? "bg-white/10" : ""
                        } ${dragOverIndex === index && draggedIndex !== index
                          ? "border-t-2 border-green-400"
                          : ""
                        } ${draggedIndex === index ? "opacity-50 scale-95" : ""}`}
                    >
                      <div className="w-12 h-12 rounded bg-white/10 overflow-hidden shrink-0">
                        {song.image?.length > 0 ? (
                          <img
                            src={
                              song.image.find(
                                (img) => img.quality === "500x500"
                              )?.url ||
                              song.image.find(
                                (img) => img.quality === "150x150"
                              )?.url ||
                              song.image[song.image.length - 1]?.url
                            }
                            alt={song.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IoMdPlay className="w-4 h-4 text-white/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium truncate text-base ${index === playerCurrentIndex
                            ? "text-green-400"
                            : "text-white"
                            }`}
                        >
                          {decodeHtmlEntities(song.name)}
                        </p>
                        <p className="text-sm text-white/60 truncate">
                          {decodeHtmlEntities(getArtistNames(song))}
                        </p>
                      </div>
                      <div className="shrink-0 text-white/40">
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </div>
                  ))}

                  {/* Reorder Queue Button */}
                  {playlist.length > 1 && (
                    <div className="p-4 border-t border-white/10">
                      <Button
                        variant="ghost"
                        className="w-full text-white/60 hover:bg-white/5 hover:text-white/80 rounded-lg p-3 flex items-center justify-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Add your reorder functionality here
                          console.log("Reorder queue clicked");
                        }}
                      >
                        <ArrowUpDown className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          Reorder Queue
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop: Right sidebar */}
            <div className="hidden md:block absolute right-0 top-0 bottom-0 w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 transform transition-transform duration-300">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Queue</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPlaylist(false)}
                    className="text-white/60 hover:bg-white/10"
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="overflow-y-auto h-full pb-20 scrollbar-hide">
                {getCurrentPlaylist().map((song, index) => (
                  <div
                    key={`${song.id}-${index}`}
                    data-song-index={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => {
                      // Only trigger song change if not dragging
                      if (!isDragging) {
                        onSongChange?.(song, index, getCurrentPlaylist());
                      }
                    }}
                    className={`flex items-center gap-3 p-3 hover:bg-white/5 cursor-move transition-all duration-200 select-none ${index === playerCurrentIndex ? "bg-white/10" : ""
                      } ${dragOverIndex === index && draggedIndex !== index
                        ? "border-t-2 border-green-400"
                        : ""
                      } ${draggedIndex === index ? "opacity-50 scale-95" : ""}`}
                  >
                    <div className="w-12 h-12 rounded bg-white/10 overflow-hidden shrink-0">
                      {song.image?.length > 0 ? (
                        <img
                          src={
                            song.image.find((img) => img.quality === "500x500")
                              ?.url ||
                            song.image.find((img) => img.quality === "150x150")
                              ?.url ||
                            song.image[song.image.length - 1]?.url
                          }
                          alt={song.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IoMdPlay className="w-4 h-4 text-white/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate text-sm ${index === playerCurrentIndex
                          ? "text-green-400"
                          : "text-white"
                          }`}
                      >
                        {decodeHtmlEntities(song.name)}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        {decodeHtmlEntities(getArtistNames(song))}
                      </p>
                    </div>
                    <div className="shrink-0 text-white/40">
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </div>
                ))}

                {/* Reorder Queue Button */}
                {playlist.length > 1 && (
                  <div className="p-3 border-t border-white/10">
                    <Button
                      variant="ghost"
                      className="w-full text-white/60 hover:bg-white/5 hover:text-white/80 rounded-lg p-2 flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add your reorder functionality here
                        console.log("Reorder queue clicked");
                      }}
                    >
                      <ArrowUpDown className="w-4 h-4" />
                      <span className="text-xs font-medium">Reorder Queue</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Lyrics View - Full Screen Overlay */}
        {showLyrics && (
          <div
            className="fixed inset-0 z-110 overflow-hidden transition-all duration-1000 ease-out"
            style={{
              background: dominantColors.primary
                ? `linear-gradient(to bottom, 
                    ${dominantColors.primary} 0%, 
                    ${dominantColors.accent} 50%, 
                    ${dominantColors.secondary} 100%)`
                : '#121212',
            }}
          >
            {/* AMLL WebGL Dynamic Background - desktop/tablet only */}
            {/* Hidden on phones to keep a clean static gradient background */}
            <div className="absolute inset-0 pointer-events-none z-0 hidden md:block">
              <ErrorBoundary fallback={<div className="absolute inset-0 bg-linear-to-b from-black/40 to-black/60" />}>
                <BackgroundRender album={currentSongImageUrlProxied} />
              </ErrorBoundary>
            </div>

            <div className="relative z-10 flex flex-col h-full safe-area-inset">
              {/* Lyrics Header - Minimal with just back button (desktop only) */}
              <div className="hidden md:flex items-center justify-start p-4 border-b border-white/10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLyrics(false)}
                  className="text-white/60 hover:bg-white/10 rounded-full"
                >
                  <ChevronDown className="w-5 h-5" />
                </Button>
              </div>

              {/* Lyrics Content */}
              <div className="flex-1 overflow-hidden">
                {/* Mobile Layout */}
                <div className="md:hidden h-full flex flex-col">
                  {/* Apple Music Style top grabber handle */}
                  <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <button
                      onClick={() => setShowLyrics(false)}
                      className="w-10 h-1.5 rounded-full bg-white/25 hover:bg-white/35 transition-colors duration-200 cursor-pointer"
                      aria-label="Dismiss lyrics"
                    />
                  </div>
                  {/* Album Art and Song Info */}
                  <div className="flex items-center gap-4 p-4 border-b border-white/5">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-linear-to-br from-gray-800 to-gray-900 shrink-0">
                      {currentSong.image?.length > 0 ? (
                        <img
                          src={
                            currentSong.image.find(
                              (img) => img.quality === "500x500"
                            )?.url ||
                            currentSong.image.find(
                              (img) => img.quality === "150x150"
                            )?.url ||
                            currentSong.image[currentSong.image.length - 1]?.url
                          }
                          alt={currentSong.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IoMdPlay className="w-6 h-6 text-white/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold truncate text-lg">
                        {decodeHtmlEntities(currentSong.name)}
                      </h4>
                      <p className="text-white/70 truncate">
                        {getArtistNames(currentSong)}
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handlePlayPause}
                      className="shrink-0 rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 text-white hover:scale-105 transition-all duration-200"
                    >
                      {(showVideoMode ? ytIsPlaying : isPlaying) ? (
                        <HiPause style={{ width: '20px', height: '20px' }} />
                      ) : (
                        <IoMdPlay style={{ width: '20px', height: '20px' }} className="ml-0.5" />
                      )}
                    </Button>
                  </div>

                  {/* Lyrics Text */}
                  <div
                    ref={mobileLyricsContainerRef}
                    className="flex-1 overflow-hidden lyrics-fade-mask relative"
                    style={{
                      '--lyrics-fade-top-rgb': fadeColors.topRgb,
                      '--lyrics-fade-bottom-rgb': fadeColors.bottomRgb,
                      '--current-theme-color': dominantColors.primary || '#121212',
                    }}
                  >
                    {/* Top Overlay Fade (Mobile only) */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-34 pointer-events-none z-20 md:hidden"
                      style={{
                        background: `linear-gradient(to bottom, 
                          rgb(var(--lyrics-fade-top-rgb)) 0%, 
                          rgba(var(--lyrics-fade-top-rgb), 0.9) 20%, 
                          rgba(var(--lyrics-fade-top-rgb), 0.6) 45%, 
                          rgba(var(--lyrics-fade-top-rgb), 0.25) 75%, 
                          transparent 100%)`
                      }}
                    />
                    <div className="space-y-3 text-left max-w-2xl h-full px-2">
                      {lyricsLoading || lyricsFetching ? (
                        <div className="space-y-4 py-8 px-2">
                          {[80, 60, 90, 50, 75, 65, 85, 55].map((w, i) => (
                            <div
                              key={i}
                              className="h-5 rounded-full bg-white/10 animate-pulse"
                              style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                            />
                          ))}
                        </div>
                      ) : lyrics ? (
                        <>
                          {/* Synced Lyrics - Apple Music Style */}
                          {lyrics.syncedLyrics ? (
                            <div className="h-full w-full">
                              <ErrorBoundary fallback={
                                <div className="space-y-6 leading-relaxed overflow-y-auto h-full max-h-[70vh] pr-2">
                                  {lyrics.plainLyrics ? (
                                    lyrics.plainLyrics.split("\n").map((line, idx) => (
                                      <p key={idx} className="text-2xl text-white/60 font-semibold">{line.trim()}</p>
                                    ))
                                  ) : (
                                    parsedLyrics.map((line, idx) => (
                                      <p key={idx} className="text-2xl text-white/60 font-semibold">
                                        {line.text || (line.words ? line.words.map(w => w.word).join(' ') : '')}
                                      </p>
                                    ))
                                  )}
                                </div>
                              }>
                                <LyricPlayer lyricLines={parsedLyrics} currentTime={currentTime * 1000} onLyricLineClick={handleLyricLineClick} style={{ mixBlendMode: 'normal', contain: 'none', height: '100%', width: '100%', overflow: 'visible' }} />
                              </ErrorBoundary>
                            </div>
                          ) : lyrics.plainLyrics ? (
                            /* Plain Lyrics */
                            <div className="space-y-6 leading-relaxed py-6">
                              {lyrics.plainLyrics
                                .split("\n")
                                .map((line, index) => (
                                  <p
                                    key={index}
                                    className="text-2xl text-white/60 font-semibold"
                                    style={{
                                      fontFamily: '"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                      letterSpacing: '-0.02em',
                                      lineHeight: '1.3',
                                    }}
                                  >
                                    {line.trim()}
                                  </p>
                                ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <div className="flex justify-center mb-4">
                                <Mic className="w-12 h-12 text-white/30" />
                              </div>
                              <p className="text-white/60 text-lg">
                                No lyrics available
                              </p>
                              <p className="text-white/40 text-sm mt-2">
                                Enjoy the music!
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="flex justify-center mb-4">
                            <Mic className="w-12 h-12 text-white/30" />
                          </div>
                          <p className="text-white/60 text-lg">
                            No lyrics found
                          </p>
                          <p className="text-white/40 text-sm mt-2">
                            Try searching for another song
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Bottom Overlay Fade (Mobile only) */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-38 pointer-events-none z-20 md:hidden"
                      style={{
                        background: `linear-gradient(to top, 
                          rgb(var(--lyrics-fade-bottom-rgb)) 0%, 
                          rgba(var(--lyrics-fade-bottom-rgb), 0.9) 20%, 
                          rgba(var(--lyrics-fade-bottom-rgb), 0.6) 45%, 
                          rgba(var(--lyrics-fade-bottom-rgb), 0.25) 75%, 
                          transparent 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Desktop Layout - Split Screen with Album Art + Lyrics */}
                <div className="hidden md:flex h-full">
                  {/* Left Side - Apple Music style: album art + controls below */}
                  <div className="hidden lg:flex w-1/2 flex-col items-center justify-center shrink-0 px-6 lg:px-10 py-6 gap-5">
                    {/* Album Art / Video */}
                    {showVideoMode ? (
                      <div
                        ref={splitVideoContainerRef}
                        className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black relative shrink-0"
                        style={{
                          maxWidth: fullscreenType === 'split' ? "none" : "min(560px, 90vw)",
                          ...getContainerStyle('split')
                        }}
                        onClick={handleFullscreenClick}
                      >
                        {(ytLoading || (ytVideoId && ytWaiting)) && (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black/80 absolute inset-0 z-20">
                            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                            <span className="text-white/50 text-xs">
                              {ytLoading ? 'Finding video…' : 'Loading stream…'}
                            </span>
                          </div>
                        )}
                        {ytError && !ytLoading && (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black/80 absolute inset-0 z-20">
                            <Video style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.3)' }} />
                            <span className="text-white/40 text-xs">{ytError}</span>
                            <button
                              onClick={() => { setShowVideoMode(false); setShowVideoMode(true); }}
                              className="text-white/60 text-xs underline mt-1"
                            >Retry</button>
                          </div>
                        )}
                        {ytVideoId && !ytLoading && isMounted && !isMobile && showLyrics && (
                          <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                              position: 'absolute',
                              top: fullscreenType === 'split' ? '-8%' : '-30%',
                              left: '0',
                              width: '100%',
                              height: fullscreenType === 'split' ? '116%' : '160%',
                              pointerEvents: 'none'
                            }}>
                              <YouTube
                                videoId={ytVideoId}
                                opts={{
                                  width: '100%',
                                  height: '100%',
                                  playerVars: {
                                    autoplay: 1,
                                    controls: 0,
                                    modestbranding: 1,
                                    rel: 0,
                                    playsinline: 1,
                                  }
                                }}
                                onReady={(e) => {
                                  youtubePlayerRef.current = e.target;
                                  setYtDuration(e.target.getDuration());
                                  e.target.setVolume(volume * 100);
                                  setYtWaiting(false);
                                }}
                                onStateChange={(e) => {
                                  const state = e.data;
                                  if (state === 1) { // Playing
                                    setYtIsPlaying(true);
                                    setYtWaiting(false);
                                    startTimePolling();
                                  } else if (state === 2) { // Paused
                                    setYtIsPlaying(false);
                                    stopTimePolling();
                                  } else if (state === 0) { // Ended
                                    stopTimePolling();
                                    handleNext();
                                  }
                                }}
                                onError={() => setYtError('Failed to play YouTube video')}
                                className="w-full h-full"
                                iframeClassName="w-full h-full object-cover pointer-events-none"
                              />
                            </div>
                          </div>
                        )}
                        {renderFullscreenButton('split', splitVideoContainerRef)}
                        {renderFullscreenHud('split', splitVideoContainerRef)}
                      </div>
                    ) : (
                      <div
                        className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-linear-to-br from-gray-800 to-gray-900 shrink-0"
                        style={{ maxWidth: "min(560px, 90vw)" }}
                      >
                        {currentSong.image?.length > 0 ? (
                          <img
                            src={
                              currentSong.image.find((img) => img.quality === "500x500")?.url ||
                              currentSong.image.find((img) => img.quality === "150x150")?.url ||
                              currentSong.image[currentSong.image.length - 1]?.url
                            }
                            alt={currentSong.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Disc className="w-24 h-24 text-white/20" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Switch to video / audio */}
                    <div className="w-full flex justify-start mb-1" style={{ maxWidth: "min(560px, 90vw)" }}>
                      <button
                        onClick={() => setShowVideoMode(v => !v)}
                        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full active:scale-95 transition-all duration-200 select-none cursor-pointer"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.13)',
                        }}
                      >
                        {showVideoMode ? (
                          <Music2 style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                        ) : (
                          <Video style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.90)' }} />
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', letterSpacing: '0.01em' }}>
                          {showVideoMode ? 'Switch to audio' : 'Switch to video'}
                        </span>
                      </button>
                    </div>

                    {/* Song info + like button */}
                    <div className="w-full flex items-center justify-between gap-3" style={{ maxWidth: "min(560px, 90vw)" }}>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-2xl truncate leading-tight" style={{ letterSpacing: '-0.02em' }}>
                          {decodeHtmlEntities(currentSong.name)}
                        </h3>
                        <p className="text-white/60 text-lg truncate mt-1">
                          {getArtistNames(currentSong)}
                        </p>
                      </div>
                      {/* Like + More buttons */}
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        <button
                          onClick={handleLikeToggle}
                          disabled={isLikeLoading}
                          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shrink-0"
                        >
                          {getCurrentLikeState() ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 640 640"
                              className="w-5 h-5 fill-white/85 transition-colors duration-200"
                            >
                              <path d="M341.5 45.1C337.4 37.1 329.1 32 320.1 32C311.1 32 302.8 37.1 298.7 45.1L225.1 189.3L65.2 214.7C56.3 216.1 48.9 222.4 46.1 231C43.3 239.6 45.6 249 51.9 255.4L166.3 369.9L141.1 529.8C139.7 538.7 143.4 547.7 150.7 553C158 558.3 167.6 559.1 175.7 555L320.1 481.6L464.4 555C472.4 559.1 482.1 558.3 489.4 553C496.7 547.7 500.4 538.8 499 529.8L473.7 369.9L588.1 255.4C594.5 249 596.7 239.6 593.9 231C591.1 222.4 583.8 216.1 574.8 214.7L415 189.3L341.5 45.1z"/>
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 640 640"
                              className="w-5 h-5 fill-white/60 hover:fill-white/80 transition-colors duration-200"
                            >
                              <path d="M320.1 32C329.1 32 337.4 37.1 341.5 45.1L415 189.3L574.9 214.7C583.8 216.1 591.2 222.4 594 231C596.8 239.6 594.5 249 588.2 255.4L473.7 369.9L499 529.8C500.4 538.7 496.7 547.7 489.4 553C482.1 558.3 472.4 559.1 464.4 555L320.1 481.6L175.8 555C167.8 559.1 158.1 558.3 150.8 553C143.5 547.7 139.8 538.8 141.2 529.8L166.4 369.9L52 255.4C45.6 249 43.4 239.6 46.2 231C49 222.4 56.3 216.1 65.3 214.7L225.2 189.3L298.8 45.1C302.9 37.1 311.2 32 320.2 32zM320.1 108.8L262.3 222C258.8 228.8 252.3 233.6 244.7 234.8L119.2 254.8L209 344.7C214.4 350.1 216.9 357.8 215.7 365.4L195.9 490.9L309.2 433.3C316 429.8 324.1 429.8 331 433.3L444.3 490.9L424.5 365.4C423.3 357.8 425.8 350.1 431.2 344.7L521 254.8L395.5 234.8C387.9 233.6 381.4 228.8 377.9 222L320.1 108.8z"/>
                            </svg>
                          )}
                        </button>
                        <div onClick={(e) => e.stopPropagation()}>
                          {isMobile ? null : (
                            <DropdownMenu open={openLyricsActionMenu} onOpenChange={setOpenLyricsActionMenu}>
                              <DropdownMenuTrigger asChild>
                                <button className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
                                  <MoreHorizontal className="w-5 h-5 text-white/70 hover:text-white/90 transition-colors duration-200" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-56 bg-neutral-900 border-white/10 text-white p-1"
                                style={{ zIndex: 10001 }}
                                sideOffset={8}
                              >
                                <DropdownMenuItem
                                  onClick={async () => { if (!currentSong) return; handleLikeToggle(); }}
                                  className={`hover:bg-white/10 focus:bg-white/10 cursor-pointer ${getCurrentLikeState() ? "text-red-500" : ""}`}
                                  disabled={isLikeLoading}
                                >
                                  <Heart className={`w-4 h-4 mr-2 ${getCurrentLikeState() ? "fill-red-500 text-red-500" : ""}`} />
                                  {isLikeLoading ? "..." : getCurrentLikeState() ? "Unlike" : "Like"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => handleAddToPlaylist(e, currentSong)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                  <Plus className="w-4 h-4 mr-2" /> Add to playlist
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={() => { setOpenLyricsActionMenu(false); router.push(`/music/song/${currentSong.id}`); }} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                  <Music2 className="w-4 h-4 mr-2" /> Song detail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={() => setShowPlaylist(!showPlaylist)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                  <ListMusic className="w-4 h-4 mr-2" /> {showPlaylist ? "Hide Queue" : "Show Queue"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem onClick={(e) => handleDownloadClick(e)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                  <Download className="w-4 h-4 mr-2" /> Download
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full" style={{ maxWidth: "min(560px, 90vw)" }}>
                      <Slider
                        value={[showVideoMode ? ytCurrentTime : currentTime]}
                        max={(showVideoMode ? ytDuration : duration) || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        onValueCommit={handleSeekCommit}
                        className="w-full cursor-pointer **:data-[slot=slider-thumb]:opacity-0 hover:**:data-[slot=slider-thumb]:opacity-100 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:w-3 **:data-[slot=slider-thumb]:h-3 **:data-[slot=slider-range]:bg-white **:data-[slot=slider-track]:bg-white/25 **:data-[slot=slider-track]:h-1"
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-white/50 font-medium tabular-nums">
                          {formatTime(showVideoMode ? ytCurrentTime : currentTime)}
                        </span>
                        <span className="text-xs text-white/50 font-medium tabular-nums">
                          -{formatTime(Math.max(0, (showVideoMode ? ytDuration : duration) - (showVideoMode ? ytCurrentTime : currentTime)))}
                        </span>
                      </div>
                    </div>

                    {/* Playback controls — desktop only, using custom icons */}
                    <div className="w-full flex items-center justify-between" style={{ maxWidth: "min(560px, 90vw)" }}>
                      {/* Shuffle */}
                      <button
                        onClick={() => setIsShuffle(!isShuffle)}
                        className="transition-all duration-200 hover:scale-110 active:scale-95 hover:cursor-pointer flex items-center justify-center w-6 h-6"
                      >
                        <img
                          src="/shuffle.png"
                          alt="Shuffle"
                          className="w-6 h-6 object-contain"
                          style={{
                            filter: isShuffle
                              ? "brightness(0) saturate(100%) invert(72%) sepia(60%) saturate(400%) hue-rotate(95deg) brightness(95%)"
                              : "brightness(0) invert(1) opacity(0.45)",
                          }}
                        />
                      </button>

                      {/* Previous — custom icon */}
                      <button
                        onClick={onPrevious}
                        className="transition-all duration-200 hover:scale-110 active:scale-95 opacity-90 hover:opacity-100"
                      >
                        <img src="/previous.png" alt="Previous" className="w-10 h-10 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                      </button>

                      {/* Play / Pause — custom icons, no circle */}
                      <button
                        onClick={handlePlayPause}
                        className="transition-all duration-200 hover:scale-110 active:scale-95 opacity-90 hover:opacity-100"
                      >
                        {(showVideoMode ? ytIsPlaying : isPlaying) ? (
                          <img src="/pause.png" alt="Pause" className="w-20 h-20 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                        ) : (
                          <img src="/play.png" alt="Play" className="w-20 h-20 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                        )}
                      </button>

                      {/* Next — custom icon */}
                      <button
                        onClick={onNext}
                        className="transition-all duration-200 hover:scale-110 active:scale-95 opacity-90 hover:opacity-100"
                      >
                        <img src="/next.png" alt="Next" className="w-10 h-10 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                      </button>

                      {/* Repeat */}
                      <button
                        onClick={toggleRepeat}
                        className="relative transition-all duration-200 hover:scale-110 active:scale-95 hover:cursor-pointer flex items-center justify-center w-6 h-6"
                      >
                        <img
                          src="/repeat.png"
                          alt="Repeat"
                          className="w-6 h-6 object-contain"
                          style={{
                            filter: repeatMode !== "off"
                              ? "brightness(0) saturate(100%) invert(72%) sepia(60%) saturate(400%) hue-rotate(95deg) brightness(95%)"
                              : "brightness(0) invert(1) opacity(0.45)",
                          }}
                        />
                        {repeatMode === "one" && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full flex items-center justify-center text-[8px] text-black font-bold">
                            1
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Side - Lyrics: full width on md, half on lg+ */}
                  <div className="w-full lg:w-1/2 flex items-center justify-start px-10 lg:px-16 py-8 border-l-0 lg:border-l border-white/10">
                    <div className="w-full max-w-4xl">
                      <div
                        ref={desktopLyricsContainerRef}
                        className="h-[calc(100vh-10rem)] overflow-hidden lyrics-fade-mask"
                      >
                        <div className="space-y-6 h-full text-left">
                          {lyricsLoading || lyricsFetching ? (
                            <div className="space-y-5 px-2 py-20">
                              {[70, 55, 85, 45, 80, 60, 90, 50, 75].map((w, i) => (
                                <div
                                  key={i}
                                  className="h-6 rounded-full bg-white/10 animate-pulse"
                                  style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                                />
                              ))}
                            </div>
                          ) : lyrics ? (
                            <>
                              {/* Synced Lyrics - Clean Custom Implementation */}
                              {lyrics.syncedLyrics ? (
                                <div className="h-full w-full">
                                  <ErrorBoundary fallback={
                                    <div className="space-y-6 leading-tight text-left overflow-y-auto h-full max-h-[70vh] pr-4 py-20">
                                      {lyrics.plainLyrics ? (
                                        lyrics.plainLyrics.split("\n").map((line, idx) => (
                                          <p
                                            key={idx}
                                            className="text-5xl xl:text-6xl text-white/35 font-bold cursor-pointer hover:text-white/70 transition-all duration-200"
                                            style={{
                                              fontFamily: '"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                              letterSpacing: '-0.02em',
                                              lineHeight: '1.15',
                                            }}
                                          >
                                            {line.trim()}
                                          </p>
                                        ))
                                      ) : (
                                        parsedLyrics.map((line, idx) => (
                                          <p
                                            key={idx}
                                            className="text-5xl xl:text-6xl text-white/35 font-bold cursor-pointer hover:text-white/70 transition-all duration-200"
                                            style={{
                                              fontFamily: '"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                              letterSpacing: '-0.02em',
                                              lineHeight: '1.15',
                                            }}
                                          >
                                            {line.text || (line.words ? line.words.map(w => w.word).join(' ') : '')}
                                          </p>
                                        ))
                                      )}
                                    </div>
                                  }>
                                    <LyricPlayer lyricLines={parsedLyrics} currentTime={currentTime * 1000} onLyricLineClick={handleLyricLineClick} style={{ mixBlendMode: 'normal', contain: 'none', height: '100%', width: '100%', overflow: 'visible' }} />
                                  </ErrorBoundary>
                                </div>
                              ) : lyrics.plainLyrics ? (
                                /* Plain Lyrics */
                                <div className="space-y-6 leading-tight text-left py-20">
                                  {lyrics.plainLyrics
                                    .split("\n")
                                    .map((line, index) => (
                                      <p
                                        key={index}
                                        className="text-5xl xl:text-6xl text-white/35 font-bold cursor-pointer hover:text-white/70 transition-all duration-200"
                                        style={{
                                          fontFamily: '"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                          letterSpacing: '-0.02em',
                                          lineHeight: '1.15',
                                        }}
                                      >
                                        {line.trim()}
                                      </p>
                                    ))}
                                </div>
                              ) : (
                                <div className="text-center py-20">
                                  <div className="flex justify-center mb-6">
                                    <Mic className="w-20 h-20 text-white/20" />
                                  </div>
                                  <p className="text-white/60 text-2xl font-semibold">
                                    No lyrics available
                                  </p>
                                  <p className="text-white/40 text-lg mt-3">
                                    Enjoy the music!
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-20">
                              <div className="flex justify-center mb-6">
                                <Mic className="w-20 h-20 text-white/20" />
                              </div>
                              <p className="text-white/60 text-2xl font-semibold">
                                No lyrics found
                              </p>
                              <p className="text-white/40 text-lg mt-3">
                                Try searching for another song
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add to Playlist Dialog */}
      <div style={{ zIndex: 10001 }}>
        <AddToPlaylistDialog
          open={addToPlaylistDialogOpen}
          onOpenChange={setAddToPlaylistDialogOpen}
          song={selectedSong}
        />
      </div>
    </>
  );
}
