"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { FullscreenMusicPlayer } from "@/components/fullscreen-music-player";
import { IoMdPlay } from "react-icons/io";
import { HiPause } from "react-icons/hi2";
import { BiSkipNext, BiSkipPrevious } from "react-icons/bi";


export function MusicPlayer({ currentSong, playlist = [], onSongChange }) {
  const {
    isPlaying,
    setIsPlaying,
    isRadioPlaying,
    isFullscreenOpen,
    setIsFullscreenOpen,
  } = useMusicPlayer();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [dominantColor, setDominantColor] = useState("rgb(40, 40, 40)"); // Default dark color
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [wasPlayingBeforeScrub, setWasPlayingBeforeScrub] = useState(false);
  const audioRef = useRef(null);
  const isScrubbingRef = useRef(false);

  // Find current song index in playlist
  const currentIndex =
    playlist.findIndex((song) => song.id === currentSong?.id) || 0;

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
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    onSongChange?.(playlist[prevIndex], prevIndex);
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    onSongChange?.(playlist[nextIndex], nextIndex);
  };

  const handleSeek = (value) => {
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
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
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
      if (wasPlayingBeforeScrub) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
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

  // Extract color when current song changes
  useEffect(() => {
    if (currentSong?.image?.length > 0) {
      const imageUrl =
        currentSong.image.find((img) => img.quality === "500x500")?.url ||
        currentSong.image.find((img) => img.quality === "150x150")?.url ||
        currentSong.image[currentSong.image.length - 1]?.url;

      if (imageUrl) {
        extractLeastDominantColor(imageUrl).then((color) => {
          setDominantColor(color);
        });
      }
    } else {
      setDominantColor("rgb(40,40,40)"); // Default dark color
    }
  }, [currentSong]);

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
      setIsPlaying(false);
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

  // Media Session API - Rich media notifications
  useEffect(() => {
    if (
      !currentSong ||
      typeof window === "undefined" ||
      !("mediaSession" in navigator)
    )
      return;

    // Get artist name
    const artistName =
      currentSong.artists?.primary?.[0]?.name ||
      currentSong.primaryArtists ||
      "Unknown Artist";

    // Get album name
    const albumName = currentSong.album?.name || "Unknown Album";

    // Get song title
    const songTitle = decodeHtmlEntities(
      currentSong.name || currentSong.title || "Unknown Song"
    );

    // Prepare artwork - use multiple sizes for better compatibility
    const artwork = [];
    if (currentSong.image && Array.isArray(currentSong.image)) {
      // Use all available image sizes
      currentSong.image.forEach((img, index) => {
        if (img?.url) {
          // Estimate sizes based on JioSaavn API pattern
          const sizes = ["50x50", "150x150", "500x500"];
          const size = sizes[index] || "500x500";
          artwork.push({
            src: img.url,
            sizes: size,
            type: "image/jpeg",
          });
        }
      });
    }

    // If no artwork, use app icon as fallback
    if (artwork.length === 0) {
      artwork.push({
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      });
    }

    // Set media metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: songTitle,
      artist: artistName,
      album: albumName,
      artwork: artwork,
    });

    // Set action handlers
    navigator.mediaSession.setActionHandler("play", () => {
      if (audioRef.current && !isPlaying) {
        togglePlayPause();
      }
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current && isPlaying) {
        togglePlayPause();
      }
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      handlePrevious();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      handleNext();
    });

    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const skipTime = details.seekOffset || 10;
      if (audioRef.current) {
        const newTime = Math.max(audioRef.current.currentTime - skipTime, 0);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime); // Update React state immediately
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
        setCurrentTime(newTime); // Update React state immediately
      }
    });

    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        const newTime = Math.max(
          0,
          Math.min(details.seekTime, audioRef.current.duration || 0)
        );
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime); // Update React state immediately

        // Force position state update
        try {
          navigator.mediaSession.setPositionState({
            duration: audioRef.current.duration || 0,
            playbackRate: audioRef.current.playbackRate || 1,
            position: newTime,
          });
        } catch (error) {
          // Ignore position state errors
        }
      }
    });

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    console.log("Media Session updated:", {
      title: songTitle,
      artist: artistName,
      album: albumName,
      artworkCount: artwork.length,
      playbackState: isPlaying ? "playing" : "paused",
    });
  }, [currentSong, isPlaying]);

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
        <div className="fixed bottom-16 left-0 right-0 md:left-64 md:bottom-0 border-t border-border z-[60] md:bg-background">
          {/* Mobile background - uses least dominant color from album cover */}
          <div
            className="block md:hidden absolute inset-0"
            style={{
              backgroundColor: dominantColor,
            }}
          />

          {/* Desktop background */}
          <div className="hidden md:block absolute inset-0 bg-background"></div>

          {/* Content with relative positioning */}
          <div className="relative">
            {/* Mobile Layout */}
            <div className="block md:hidden">
              {/* Top row: Song info and main controls */}
              <div className="flex items-center justify-between pl-4 pr-3 py-2 pb-2.5">
                <div
                  className={`flex items-center gap-3 min-w-0 flex-1 ${!isRadioPlaying ? "cursor-pointer" : "cursor-default"
                    }`}
                  onClick={() => !isRadioPlaying && setIsFullscreenOpen(true)}
                >
                  <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
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
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IoMdPlay className="w-3 h-3 opacity-50 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center py-1">
                    <p className="font-medium truncate text-sm text-white drop-shadow-lg leading-none mb-0.5">
                      {decodeHtmlEntities(currentSong.name)}
                    </p>
                    <p className="text-xs text-white/80 truncate drop-shadow-md leading-none">
                      {currentSong.artists?.primary?.[0]?.name ||
                        "Unknown Artist"}
                    </p>
                  </div>
                </div>

                {/* Mobile Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={playlist.length === 0}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
                  >
                    <BiSkipPrevious style={{ width: '24px', height: '24px' }} />
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={togglePlayPause}
                    className="rounded-full w-10 h-10 p-0 bg-white/90 hover:bg-white text-black hover:text-black"
                  >
                    {isPlaying ? (
                      <HiPause className="text-black" style={{ width: '20px', height: '20px' }} />
                    ) : (
                      <IoMdPlay style={{ width: '18px', height: '18px', marginLeft: '4px', }} className="text-black" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    disabled={playlist.length === 0}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
                  >
                    <BiSkipNext style={{ width: '24px', height: '24px' }} />
                  </Button>
                </div>
              </div>

              {/* Bottom row: Slim interactive progress bar for mobile */}
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 z-10 px-4 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left - 16; // Account for padding
                  const width = rect.width - 32; // Account for padding on both sides
                  const percentage = Math.max(0, Math.min(1, clickX / width));
                  const newTime = percentage * (duration || 0);
                  handleSeek([newTime]);
                }}
              >
                <div className="w-full h-full bg-white/10">
                  <div
                    className="h-full bg-white transition-all duration-300 ease-out"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`
                    }}
                  />
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
                  <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
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
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IoMdPlay className="w-4 h-4 opacity-50 text-white" />
                      </div>
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
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={handlePrevious}
                      disabled={playlist.length === 0}
                      className="hover:bg-transparent bg-transparent hover:scale-105 group hover:cursor-pointer"
                    >
                      <BiSkipPrevious style={{ width: '34px', height: '34px' }} className="text-white/65 group-hover:text-white" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={togglePlayPause}
                      className="rounded-full w-8 h-8 bg-white hover:bg-white hover:scale-105 transition-transform hover:cursor-pointer"
                    >
                      {isPlaying ? (
                        <HiPause className="text-black" style={{ width: '20px', height: '20px' }} />
                      ) : (
                        <IoMdPlay style={{ width: '18px', height: '18px', marginLeft: '4px', }} className="text-black" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleNext}
                      disabled={playlist.length === 0}
                      className="hover:bg-transparent bg-transparent hover:scale-105 group hover:cursor-pointer"
                    >
                      <BiSkipNext style={{ width: '34px', height: '34px' }} className="text-white/65 group-hover:text-white" />
                    </Button>
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
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <Volume2 className="w-4 h-4" />
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
        onTogglePlayPause={togglePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isPlaying={isPlaying}
        playingFrom={getPlayingFromContext()}
      />
    </>
  );
}
