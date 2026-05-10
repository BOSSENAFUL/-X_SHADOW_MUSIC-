"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ListMusic } from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { FullscreenMusicPlayer } from "@/components/fullscreen-music-player";
import { IoMdPlay } from "react-icons/io";
import { HiPause } from "react-icons/hi2";
import { BiSkipNext, BiSkipPrevious } from "react-icons/bi";

// Module-level color cache — persists across re-renders and survives
// component unmount/remount. Keyed by song ID for instant lookups.
const _colorCache = new Map();

// Helper to get the smallest image URL from a song's image array
function _getSmallImageUrl(song) {
  if (!song?.image?.length) return '/default-playlist-image.png';
  return (
    song.image.find((img) => img.quality === "50x50")?.url ||
    song.image.find((img) => img.quality === "150x150")?.url ||
    song.image[song.image.length - 1]?.url ||
    '/default-playlist-image.png'
  );
}

export function MusicPlayer({ currentSong, playlist = [], onSongChange }) {
  const {
    isPlaying,
    setIsPlaying,
    isRadioPlaying,
    isShuffle,
    repeatMode,
    isFullscreenOpen,
    setIsFullscreenOpen,
    currentIndex: playerCurrentIndex,
    setIsShuffle,
    setRepeatMode,
    setIsFullscreenPlaylistOpen,
    isFullscreenPlaylistOpen,
  } = useMusicPlayer();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [dominantColor, setDominantColor] = useState("rgb(40, 40, 40)"); // Default dark color
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [wasPlayingBeforeScrub, setWasPlayingBeforeScrub] = useState(false);
  const audioRef = useRef(null);
  const isScrubbingRef = useRef(false);

  // Use currentIndex from context if available, fallback to findIndex
  const currentIndex = playerCurrentIndex ?? (playlist.findIndex((song) => song.id === currentSong?.id) || 0);

  // Helper functions
  const formatTime = (time) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    if (playlist.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      onSongChange?.(playlist[randomIndex], randomIndex);
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    onSongChange?.(playlist[prevIndex], prevIndex);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;

    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => { });
      return;
    }

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      onSongChange?.(playlist[randomIndex], randomIndex);
      return;
    }

    const nextIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    onSongChange?.(playlist[nextIndex], nextIndex);
  };

  const toggleRepeat = () => {
    const modes = ["off", "all", "one"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const handleSeek = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleDirectSeek = (value) => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleSeekChange = (value) => {
    if (!isScrubbingRef.current) {
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      setWasPlayingBeforeScrub(isPlaying);
      // Pause the audio directly — do NOT call setIsPlaying(false).
      // Changing isPlaying state triggers the Media Session effect which
      // sets playbackState="paused" and collapses the OS widget.
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
      }
    }
    setCurrentTime(value[0]);
  };

  const handleSeekCommit = (value) => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
      // Resume directly via audioRef — do NOT call setIsPlaying(true).
      if (wasPlayingBeforeScrub) {
        audioRef.current.play().catch(() => { });
      }
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setPrevVolume(newVolume);
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    } else {
      const restoredVolume = prevVolume > 0 ? prevVolume : 0.7;
      setVolume(restoredVolume);
      if (audioRef.current) {
        audioRef.current.volume = restoredVolume;
      }
    }
  };

  // Professional color extraction algorithm following industry best practices
  const extractLeastDominantColor = (imageUrl) => {
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
          const pixels = [];

          for (let i = 0; i < data.length; i += 4) {
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
            pixels.push({ r: quantizedR, g: quantizedG, b: quantizedB });
          }

          // Step 5: Create palette of dominant colors (k-means simplified)
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
            resolve("rgb(40,40,40)");
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
          s = Math.min(1, s * 1.2); // Increase saturation by 20% (reduced from 30%)
          l = Math.max(0.1, Math.min(0.25, l * 0.6)); // Target much darker range for white text

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

          // If contrast is too low, darken the color
          if (whiteContrast < 4.5) {
            const factor = 0.7;
            r = Math.round(r * factor);
            g = Math.round(g * factor);
            b = Math.round(b * factor);
          }

          const rgbColor = `rgb(${r},${g},${b})`;
          resolve(rgbColor);
        } catch (error) {
          console.error("Error extracting color:", error);
          resolve("rgb(40,40,40)");
        }
      };

      img.onerror = () => {
        resolve("rgb(40,40,40)");
      };

      img.src = imageUrl;
    });
  };

  // Extract color when current song changes — with caching & pre-extraction
  useEffect(() => {
    if (!currentSong?.id) {
      setDominantColor("rgb(40, 40, 40)");
      return;
    }

    const songId = currentSong.id;

    // 1. Instant: check cache first (0ms — no network, no async)
    if (_colorCache.has(songId)) {
      setDominantColor(_colorCache.get(songId));
    } else if (currentSong.image?.length > 0) {
      // 2. Fallback: extract and cache
      const imageUrl = _getSmallImageUrl(currentSong);
      if (imageUrl) {
        extractLeastDominantColor(imageUrl).then((color) => {
          _colorCache.set(songId, color);
          setDominantColor(color);
        });
      }
    } else {
      setDominantColor("rgb(40, 40, 40)");
    }

    // 3. Pre-extract colors for adjacent songs so next/prev feels instant
    const idx = playlist.findIndex((s) => s.id === songId);
    const adjacentIndices = [idx - 1, idx + 1, idx + 2].filter(
      (i) => i >= 0 && i < playlist.length
    );
    // Use requestIdleCallback (or setTimeout fallback) so this never blocks the UI
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 50));
    schedule(() => {
      for (const adjIdx of adjacentIndices) {
        const adjSong = playlist[adjIdx];
        if (!adjSong?.id || _colorCache.has(adjSong.id)) continue;
        const adjUrl = _getSmallImageUrl(adjSong);
        if (adjUrl) {
          extractLeastDominantColor(adjUrl).then((color) => {
            _colorCache.set(adjSong.id, color);
          });
        }
      }
    });
  }, [currentSong?.id, playlist]);

  // Handle mobile back button to close fullscreen player
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only apply logic if the player is open
    if (!isFullscreenOpen) return;

    // Add a state to history so back button can close the player
    // This allows the back button to close the player instead of navigating away
    const stateKey = "isFullscreenMusicPlayer";

    // Check if we already have this state to avoid duplicate pushes
    if (!window.history.state?.[stateKey]) {
      window.history.pushState({ [stateKey]: true }, "");
    }

    const handlePopState = (event) => {
      // Only close if the specific state we pushed is no longer present
      // This ensures sub-modals (like lyrics) can have their own history states
      if (!window.history.state?.[stateKey] && isFullscreenOpen) {
        setIsFullscreenOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      // If the player is closed via UI (onClose), we are still sitting on the 
      // pushed history state. We need to go back one step to clean it up,
      // but ONLY if the current state is ours (meaning popstate didn't already happen).
      if (window.history.state?.[stateKey]) {
        window.history.back();
      }
    };
  }, [isFullscreenOpen, setIsFullscreenOpen]);

  useEffect(() => {
    if (currentSong && audioRef.current) {
      // Use only 320kbps quality audio URL
      let audioUrl = null;

      // First try to find 320kbps quality explicitly
      if (currentSong.downloadUrl) {
        audioUrl = currentSong.downloadUrl.find(
          (url) => url.quality === "320kbps" || url.quality === 320
        )?.url;

        // If no explicit 320kbps found, use the highest quality available (index 4)
        if (!audioUrl) {
          audioUrl = currentSong.downloadUrl[4]?.url;
        }
      }

      if (audioUrl) {
        console.log("Playing 320kbps quality:", audioUrl);
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      } else {
        console.warn("320kbps quality not available for this song");
      }
    }
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      // Don't update current time from audio if user is scrubbing
      if (isScrubbingRef.current) return;

      const newTime = audio.currentTime;
      setCurrentTime(newTime);

      // Immediately update media session position state
      if (
        typeof window !== "undefined" &&
        "mediaSession" in navigator &&
        navigator.mediaSession.setPositionState
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration || 0,
            playbackRate: audio.playbackRate || 1,
            position: newTime,
          });
        } catch (error) {
          // Ignore position state errors
        }
      }
    };

    const updateDuration = () => {
      const newDuration = audio.duration;
      setDuration(newDuration);

      // Update media session with new duration
      if (
        typeof window !== "undefined" &&
        "mediaSession" in navigator &&
        navigator.mediaSession.setPositionState
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: newDuration,
            playbackRate: audio.playbackRate || 1,
            position: audio.currentTime || 0,
          });
        } catch (error) {
          // Ignore position state errors
        }
      }
    };

    const handleEnded = () => {
      // Do NOT set isPlaying(false) here — doing so collapses the OS widget
      // then handleNext immediately tries to play the next song, causing
      // the widget to flicker open again. Let handleNext keep isPlaying=true
      // so the OS widget stays visible and the next song auto-plays seamlessly.
      handleNext();
    };

    const handleLoadStart = () => {
      // Reset time when loading new song
      setCurrentTime(0);
      setDuration(0);
    };

    const handleCanPlay = () => {
      // Update duration when audio can play
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentSong]);

  // Auto-play when isPlaying becomes true or song changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    if (isPlaying) {
      // Add a small delay to prevent AbortError
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Handle the AbortError gracefully
          if (error.name !== "AbortError") {
            console.error("Audio play error:", error);
          }
        });
      }
    } else {
      audio.pause();
    }

    // Update media session playback state
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying, currentSong]);

  // Media Session API — register action handlers only once, update metadata
  // only when the song ID changes, update playbackState in its own lightweight
  // effect. This prevents the OS widget from reopening on every isPlaying change.

  // Stable refs so handlers registered once always call the latest functions
  const handlePreviousRef = useRef(handlePrevious);
  const handleNextRef = useRef(handleNext);
  useEffect(() => { handlePreviousRef.current = handlePrevious; });
  useEffect(() => { handleNextRef.current = handleNext; });

  // Register action handlers ONCE on mount — never re-register.
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => {
      if (audioRef.current) {
        audioRef.current.play().catch(() => { });
        setIsPlaying(true);
      }
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    });
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handlePreviousRef.current();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      handleNextRef.current();
    });
    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        const newTime = Math.max(audioRef.current.currentTime - skipTime, 0);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    });
    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        const newTime = Math.min(
          audioRef.current.currentTime + skipTime,
          audioRef.current.duration || 0
        );
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        const newTime = Math.max(
          0,
          Math.min(details.seekTime, audioRef.current.duration || 0)
        );
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1,
            position: newTime,
          });
        } catch (_) { }
      }
    });
    return () => {
      ["play", "pause", "previoustrack", "nexttrack",
        "seekbackward", "seekforward", "seekto"].forEach((a) => {
          try { navigator.mediaSession.setActionHandler(a, null); } catch (_) { }
        });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty — register once, never re-register

  // Update song metadata ONLY when the song ID changes.
  // Never tied to isPlaying so a play/pause toggle never touches MediaMetadata.
  useEffect(() => {
    if (!currentSong || typeof window === "undefined" || !("mediaSession" in navigator))
      return;

    const artistName =
      currentSong.artists?.primary?.[0]?.name ||
      currentSong.primaryArtists ||
      "Unknown Artist";
    const albumName = currentSong.album?.name || "Unknown Album";
    const songTitle = decodeHtmlEntities(
      currentSong.name || currentSong.title || "Unknown Song"
    );
    const artwork = [];
    if (currentSong.image && Array.isArray(currentSong.image)) {
      currentSong.image.forEach((img, index) => {
        if (img?.url) {
          const sizes = ["50x50", "150x150", "500x500"];
          artwork.push({ src: img.url, sizes: sizes[index] || "500x500", type: "image/jpeg" });
        }
      });
    }
    if (artwork.length === 0) {
      artwork.push({ src: "/icon-192.png", sizes: "192x192", type: "image/png" });
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: songTitle,
      artist: artistName,
      album: albumName,
      artwork,
    });
  }, [currentSong?.id]); // Only song ID — not isPlaying

  // Update playbackState when isPlaying toggles — lightweight, never touches
  // MediaMetadata so the widget never flickers or reopens.
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Determine the context of where music is playing from
  const getPlayingFromContext = () => {
    if (typeof window === "undefined") return "Music";

    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    // Check current route and determine context
    if (currentPath.includes("/search")) {
      return "Search Results";
    } else if (currentPath.includes("/album/")) {
      return currentSong?.album?.name || "Album";
    } else if (currentPath.includes("/artist/")) {
      const artistName = currentSong?.artists?.primary?.[0]?.name || "Artist";
      return `${artistName}`;
    } else if (currentPath.includes("/playlist/")) {
      return "Playlist";
    } else if (currentPath.includes("/favorites")) {
      return "Liked Songs";
    } else if (currentPath.includes("/library/albums")) {
      return "Your Albums";
    } else if (currentPath.includes("/library/artists")) {
      return "Your Artists";
    } else if (currentPath.includes("/library/playlists")) {
      return "Your Playlists";
    } else if (currentPath.includes("/discover")) {
      return "Discover";
    } else if (currentPath.includes("/new-releases")) {
      return "New Releases";
    } else {
      return "Music";
    }
  };

  if (!currentSong) return null;

  return (
    <>
      {/* Audio element - always present */}
      <audio ref={audioRef} />

      {/* Only show the bottom bar when fullscreen is NOT open */}
      {!isFullscreenOpen && (
        <div className="fixed bottom-16 left-0 right-0 md:left-64 md:bottom-0 md:border-t md:border-border z-60 md:bg-background">
          {/* Mobile background - transparent, the floating card has its own bg */}
          <div
            className="block md:hidden absolute inset-0"
          />

          {/* Desktop background */}
          <div className="hidden md:block absolute inset-0 bg-background"></div>

          {/* Content with relative positioning */}
          <div className="relative">
            {/* Mobile Layout - Floating rounded card */}
            <div className="block md:hidden px-2 pt-1.5">
              <div
                className="relative rounded-lg overflow-hidden"
                style={{ backgroundColor: dominantColor }}
              >
                {/* Top row: Song info and main controls */}
                <div className="flex items-center justify-between p-2">
                  <div
                    className={`flex items-center gap-3 min-w-0 flex-1 ${!isRadioPlaying ? "cursor-pointer" : "cursor-default"
                      }`}
                    onClick={() => !isRadioPlaying && setIsFullscreenOpen(true)}
                  >
                    <div className="w-10 h-10 rounded-md bg-muted shrink-0 overflow-hidden shadow-lg">
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
                          className="w-full h-full object-cover rounded-md"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = '/default-playlist-image.png';
                          }}
                        />
                      ) : (
                        <img
                          src="/default-playlist-image.png"
                          alt={currentSong.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <p className="font-semibold truncate text-[13px] text-white drop-shadow-lg leading-tight mb-0.5">
                        {decodeHtmlEntities(currentSong.name)}
                      </p>
                      <p className="text-xs text-white/70 truncate drop-shadow-md leading-tight">
                        {currentSong.artists?.primary
                          ?.map((a) => a.name)
                          .join(", ") || "Unknown Artist"}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Controls */}
                  <div className="flex items-center gap-2.5 pr-1">
                    <button
                      onClick={togglePlayPause}
                      className="text-white hover:cursor-pointer"
                    >
                      {isPlaying ? (
                        <HiPause style={{ width: '32px', height: '32px' }} />
                      ) : (
                        <IoMdPlay style={{ width: '30px', height: '30px', marginLeft: '2px' }} />
                      )}
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={playlist.length === 0}
                      className="text-white hover:cursor-pointer disabled:opacity-50"
                    >
                      <BiSkipNext style={{ width: '36px', height: '36px' }} />
                    </button>
                  </div>
                </div>

                {/* Bottom row: Slim interactive progress bar for mobile */}
                <div
                  className="absolute bottom-0 left-2 right-2 h-[2px] z-10 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const width = rect.width;
                    const percentage = Math.max(0, Math.min(1, clickX / width));
                    const newTime = percentage * (duration || 0);
                    handleDirectSeek([newTime]);
                  }}
                >
                  <div className="w-full h-full bg-white/15 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 ease-out"
                      style={{
                        width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block p-3">
              <div className="flex items-center gap-4 w-full">
                {/* Song Info */}
                <div
                  className={`flex items-center gap-3 min-w-0 flex-1 rounded-lg p-2 -m-2 transition-colors ${!isRadioPlaying
                    ? "cursor-pointer hover:bg-muted/50"
                    : "cursor-default"
                    }`}
                  onClick={() => !isRadioPlaying && setIsFullscreenOpen(true)}
                >
                  <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
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
                        className="w-full h-full object-cover rounded"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = '/default-playlist-image.png';
                        }}
                      />
                    ) : (
                      <img
                        src="/default-playlist-image.png"
                        alt={currentSong.name}
                        className="w-full h-full object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm">
                      {decodeHtmlEntities(currentSong.name)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentSong.artists?.primary?.[0]?.name ||
                        "Unknown Artist"}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
                  <div className="flex items-center gap-3 md:gap-4 justify-center">
                    {/* Shuffle Button */}
                    <button
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={`relative flex flex-col items-center justify-center p-0 bg-transparent hover:bg-transparent border-none outline-none shadow-none transition-colors group cursor-pointer ${isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <Shuffle style={{ width: '18px', height: '18px' }} />
                      {isShuffle && (
                        <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full" />
                      )}
                    </button>

                    <Button
                      size="sm"
                      onClick={handlePrevious}
                      disabled={playlist.length === 0}
                      className="hover:bg-transparent bg-transparent hover:scale-110 active:scale-95 group transition-all p-0 h-auto w-auto cursor-pointer"
                    >
                      <BiSkipPrevious style={{ width: '32px', height: '32px' }} className="text-muted-foreground group-hover:text-foreground" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={togglePlayPause}
                      className="rounded-full w-8 h-8 bg-foreground hover:bg-foreground hover:scale-110 transition-transform active:scale-95 hover:cursor-pointer shrink-0"
                    >
                      {isPlaying ? (
                        <HiPause className="text-background" style={{ width: '18px', height: '18px' }} />
                      ) : (
                        <IoMdPlay style={{ width: '16px', height: '16px', marginLeft: '2px', }} className="text-background" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleNext}
                      disabled={playlist.length === 0}
                      className="hover:bg-transparent bg-transparent hover:scale-110 active:scale-95 group transition-all p-0 h-auto w-auto cursor-pointer"
                    >
                      <BiSkipNext style={{ width: '32px', height: '32px' }} className="text-muted-foreground group-hover:text-foreground" />
                    </Button>

                    {/* Repeat Button */}
                    <button
                      onClick={toggleRepeat}
                      className={`relative flex flex-col items-center justify-center p-0 bg-transparent hover:bg-transparent border-none outline-none shadow-none transition-colors group cursor-pointer ${repeatMode !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {repeatMode === "one" ? (
                        <Repeat1 style={{ width: '18px', height: '18px' }} />
                      ) : (
                        <Repeat style={{ width: '18px', height: '18px' }} />
                      )}
                      {repeatMode !== "off" && (
                        <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xs text-muted-foreground min-w-[35px]">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1">
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={1}
                        onValueChange={handleSeekChange}
                        onValueCommit={handleSeekCommit}
                        className="w-full cursor-pointer"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground min-w-[35px]">
                      {currentSong?.isRadio || !isFinite(duration)
                        ? "LIVE"
                        : formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <button
                    className={`transition-colors p-1 cursor-pointer ${isFullscreenOpen && isFullscreenPlaylistOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    title="Queue"
                    onClick={() => {
                      if (isFullscreenOpen && isFullscreenPlaylistOpen) {
                        setIsFullscreenOpen(false);
                        setIsFullscreenPlaylistOpen(false);
                      } else {
                        setIsFullscreenOpen(true);
                        setIsFullscreenPlaylistOpen(true);
                      }
                    }}
                  >
                    <ListMusic style={{ width: '20px', height: '20px' }} />
                  </button>

                  {volume === 0 ? (
                    <VolumeX
                      style={{ width: '20px', height: '20px' }}
                      className="cursor-pointer hover:text-foreground transition-colors ml-1"
                      onClick={toggleMute}
                    />
                  ) : (
                    <Volume2
                      style={{ width: '20px', height: '20px' }}
                      className="cursor-pointer hover:text-foreground transition-colors ml-1"
                      onClick={toggleMute}
                    />
                  )}
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-24 hover:cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Music Player - Always render when there's a current song */}
      <FullscreenMusicPlayer
        currentSong={currentSong}
        playlist={playlist}
        onSongChange={onSongChange}
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        audioRef={audioRef}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onSeek={handleSeekChange}
        onSeekCommit={handleSeekCommit}
        onDirectSeek={handleDirectSeek} // New prop for immediate seeks
        onTogglePlayPause={togglePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isPlaying={isPlaying}
        playingFrom={getPlayingFromContext()}
      />
    </>
  );
}
