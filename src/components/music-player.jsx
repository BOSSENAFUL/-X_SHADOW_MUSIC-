"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { FullscreenMusicPlayer } from "@/components/fullscreen-music-player";

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
  const [dominantColor, setDominantColor] = useState("rgb(59, 130, 246)"); // Default blue
  const audioRef = useRef(null);

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

  const handleVolumeChange = (value) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Extract dominant color from current song's cover image
  const extractDominantColor = (imageUrl) => {
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

            const color = `${Math.floor(r / 15) * 15},${
              Math.floor(g / 15) * 15
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
          resolve(rgbColor);
        } catch (error) {
          console.error("Error extracting color:", error);
          resolve("rgb(59,130,246)"); // Fallback color
        }
      };

      img.onerror = () => {
        resolve("rgb(59,130,246)"); // Fallback color
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
        extractDominantColor(imageUrl).then((color) => {
          setDominantColor(color);
        });
      }
    } else {
      setDominantColor("rgb(59,130,246)"); // Default color
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
        <div
          className="fixed bottom-16 left-0 right-0 md:left-64 md:bottom-0 border-t border-border z-[60] md:bg-background"
          style={{
            background: `linear-gradient(135deg, ${dominantColor
              .replace("rgb", "rgba")
              .replace(")", ", 0.15)")}, ${dominantColor
              .replace("rgb", "rgba")
              .replace(
                ")",
                ", 0.25)"
              )}), linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.8))`,
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Override background for desktop */}
          <div className="hidden md:block absolute inset-0 bg-background"></div>

          {/* Content with relative positioning */}
          <div className="relative">
            {/* Mobile Layout */}
            <div className="block md:hidden">
              {/* Top row: Song info and main controls */}
              <div className="flex items-center justify-between p-3">
                <div
                  className={`flex items-center gap-3 min-w-0 flex-1 ${
                    !isRadioPlaying ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={() => !isRadioPlaying && setIsFullscreenOpen(true)}
                >
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 overflow-hidden">
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
                        <Play className="w-3 h-3 opacity-50 text-white" />
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
                    <SkipBack className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={togglePlayPause}
                    className="rounded-full w-10 h-10 p-0 bg-white/90 hover:bg-white text-black hover:text-black"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    disabled={playlist.length === 0}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Bottom row: Progress bar - Hidden on mobile */}
              <div className="px-3 pb-3 hidden">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-white/90 min-w-[30px] text-center drop-shadow-md">
                    {formatTime(currentTime)}
                  </span>
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={handleSeek}
                    className="flex-1 [&_[role=slider]]:bg-white [&_[role=slider]]:border-white/50 [&_.bg-primary]:bg-white/90"
                  />
                  <span className="text-xs text-white/90 min-w-[30px] text-center drop-shadow-md">
                    {currentSong?.isRadio || !isFinite(duration)
                      ? "LIVE"
                      : formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block p-3">
              <div className="flex items-center gap-4 w-full">
                {/* Song Info */}
                <div
                  className={`flex items-center gap-3 min-w-0 flex-1 rounded-lg p-2 -m-2 transition-colors ${
                    !isRadioPlaying
                      ? "cursor-pointer hover:bg-muted/50"
                      : "cursor-default"
                  }`}
                  onClick={() => !isRadioPlaying && setIsFullscreenOpen(true)}
                >
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 overflow-hidden">
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
                        <Play className="w-4 h-4 opacity-50 text-white" />
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={playlist.length === 0}
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={togglePlayPause}
                      className="rounded-full w-8 h-8"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNext}
                      disabled={playlist.length === 0}
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xs text-muted-foreground min-w-[35px]">
                      {formatTime(currentTime)}
                    </span>
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={1}
                      onValueChange={handleSeek}
                      className="flex-1"
                    />
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
                    className="w-24"
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
        onSeek={handleSeek}
        onTogglePlayPause={togglePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isPlaying={isPlaying}
        playingFrom={getPlayingFromContext()}
      />
    </>
  );
}
