"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const { data: session } = useSession();
  const { setIsPlaying, setIsFullscreenOpen } = useMusicPlayer();
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);
  const router = useRouter();
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // 'off', 'all', 'one'
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [shuffledPlaylist, setShuffledPlaylist] = useState([]);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [dominantColors, setDominantColors] = useState({
    primary: "#6366f1", // Default indigo
    secondary: "#8b5cf6", // Default purple
    accent: "#a855f7", // Default purple
  });

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [localPlaylist, setLocalPlaylist] = useState([]);

  // Touch drag state
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchCurrentY, setTouchCurrentY] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElement, setDraggedElement] = useState(null);

  // Initialize local playlist when playlist changes
  useEffect(() => {
    setLocalPlaylist([...playlist]);
  }, [playlist]);

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

    const newPlaylist = [...localPlaylist];
    const draggedItem = newPlaylist[draggedIndex];

    // Remove dragged item
    newPlaylist.splice(draggedIndex, 1);

    // Insert at new position
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newPlaylist.splice(insertIndex, 0, draggedItem);

    setLocalPlaylist(newPlaylist);

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
          const newPlaylist = [...localPlaylist];
          const draggedItem = newPlaylist[draggedIndex];

          // Remove dragged item
          newPlaylist.splice(draggedIndex, 1);

          // Insert at new position
          const insertIndex =
            draggedIndex < dragOverIndex ? dragOverIndex - 1 : dragOverIndex;
          newPlaylist.splice(insertIndex, 0, draggedItem);

          setLocalPlaylist(newPlaylist);

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

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
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

  const getArtistNames = (song) => {
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
      return song.artists.primary.map((artist) => artist.name).join(", ");
    }
    if (song.primaryArtists) return song.primaryArtists;
    return "Unknown Artist";
  };

  // Fetch lyrics from LRCLib API
  const fetchLyrics = async (song) => {
    if (!song) return null;

    try {
      setLyricsLoading(true);

      // Get song details
      const artistName = getArtistNames(song);
      const trackName = decodeHtmlEntities(song.name || song.title);
      const albumName = song.album?.name
        ? decodeHtmlEntities(song.album.name)
        : "";
      const duration = song.duration || 0;

      // Method 1: Try exact match using get endpoint
      const params = new URLSearchParams();
      params.append("artist_name", artistName);
      params.append("track_name", trackName);
      if (albumName) params.append("album_name", albumName);
      if (duration) params.append("duration", duration.toString());

      const getApiUrl = `https://lrclib.net/api/get?${params.toString()}`;
      console.log("Fetching lyrics (exact match) from:", getApiUrl);

      let response = await fetch(getApiUrl);

      // If exact match fails (404), try searching
      if (response.status === 404) {
        console.log("Exact match not found, trying search API...");
        const query = `${artistName} ${trackName}`;
        const searchApiUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        console.log("Searching lyrics from:", searchApiUrl);

        let searchResults = [];
        response = await fetch(searchApiUrl);
        if (response.ok) {
          searchResults = await response.json();
        }

        // If no results with artist, try searching with JUST track name
        // (Great for slowed/reverb or common tracks where artist name varies)
        if (!searchResults || searchResults.length === 0) {
          console.log("No results with artist, trying track name only...");
          const trackOnlyUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(trackName)}`;
          const trackResponse = await fetch(trackOnlyUrl);
          if (trackResponse.ok) {
            searchResults = await trackResponse.json();
          }
        }

        if (searchResults && searchResults.length > 0) {
          // Find the best match among search results
          // We look for:
          // 1. Closest duration (within 10 seconds)
          // 2. Results that actually have lyrics
          const matches = searchResults
            .filter(r => r.syncedLyrics || r.plainLyrics)
            .map(r => {
              let score = 0;

              // Helper for normalization
              const normalize = (str) =>
                (str || "")
                  .toLowerCase()
                  .replace(/[^\w\s]/gi, " ")
                  .replace(/\s+/g, " ")
                  .trim();

              const rNameNorm = normalize(r.name || r.trackName);
              const sNameNorm = normalize(trackName);

              // Name match (case insensitive)
              const rName = (r.name || r.trackName || "").toLowerCase();
              const sName = trackName.toLowerCase();

              if (rName === sName || rNameNorm === sNameNorm) score += 15;
              else if (rName.includes(sName) || sName.includes(rName)) score += 8;
              else if (rNameNorm.includes(sNameNorm) || sNameNorm.includes(rNameNorm)) score += 5;

              // Artist match
              const rArtist = (r.artistName || "").toLowerCase();
              const sArtist = artistName.toLowerCase();
              if (rArtist === sArtist) score += 10;
              else if (rArtist.includes(sArtist) || sArtist.includes(rArtist)) score += 5;

              // Duration match (very important to avoid wrong versions/covers)
              const durationDiff = Math.abs((r.duration || 0) - duration);
              if (durationDiff <= 2) score += 20; // Perfect duration match is key
              else if (durationDiff <= 5) score += 12;
              else if (durationDiff <= 10) score += 7;

              return { ...r, matchScore: score };
            })
            .sort((a, b) => b.matchScore - a.matchScore);

          const bestMatch = matches[0];
          // If we have a very strong name + duration match, accept it even if artist is different
          if (bestMatch && bestMatch.matchScore >= 25) {
            console.log("Found strong lyric match through search:", bestMatch);
            return bestMatch;
          } else if (bestMatch && bestMatch.matchScore > 10) {
            console.log("Found likely lyric match through search:", bestMatch);
            return bestMatch;
          }
        }

        return null;
      }

      // Handle other HTTP errors for the GET request
      if (!response.ok) {
        console.warn(`Lyrics API returned status: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log("Lyrics data received:", data);

      return data;
    } catch (error) {
      // Handle network errors, CORS issues, etc.
      console.warn("Could not fetch lyrics:", error.message);
      return null;
    } finally {
      setLyricsLoading(false);
    }
  };

  // Parse synced lyrics (LRC format)
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
          // Only add non-empty lyrics
          parsedLines.push({
            time: timeInSeconds,
            text: text,
          });
        }
      }
    }

    return parsedLines.sort((a, b) => a.time - b.time);
  };

  // Get current lyric line based on current time
  const getCurrentLyricIndex = (parsedLyrics, currentTime) => {
    if (!parsedLyrics || parsedLyrics.length === 0) return -1;

    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= parsedLyrics[i].time) {
        return i;
      }
    }
    return -1;
  };

  // Scroll to center the current lyric line (Spotify-like behavior) - Optimized
  const scrollToCurrentLyric = (currentIndex) => {
    if (currentIndex === -1) return;

    // Check which container is currently active (mobile or desktop)
    const mobileContainer = mobileLyricsContainerRef.current;
    const desktopContainer = desktopLyricsContainerRef.current;

    let container = null;
    let lineRefs = null;

    // Try mobile first - check if it exists and is visible
    if (mobileContainer) {
      try {
        // Check if the mobile container is actually visible in the DOM
        const rect = mobileContainer.getBoundingClientRect();
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          mobileContainer.offsetParent !== null;

        if (isVisible) {
          container = mobileContainer;
          lineRefs = mobileLyricLineRefs.current;
        }
      } catch (e) {
        // Fallback if getBoundingClientRect fails
      }
    }

    // Try desktop if mobile not found or not visible
    if (!container && desktopContainer) {
      try {
        const rect = desktopContainer.getBoundingClientRect();
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          desktopContainer.offsetParent !== null;

        if (isVisible) {
          container = desktopContainer;
          lineRefs = desktopLyricLineRefs.current;
        }
      } catch (e) {
        // Fallback if getBoundingClientRect fails
      }
    }

    if (!container || !lineRefs) return;

    const currentLineElement = lineRefs[currentIndex];
    if (!currentLineElement) return;

    // Get container and line dimensions
    const containerHeight = container.clientHeight;
    const lineTop = currentLineElement.offsetTop;
    const lineHeight = currentLineElement.clientHeight;

    // Calculate scroll position to center the line
    const scrollPosition = lineTop - containerHeight / 2 + lineHeight / 2;

    // Use smooth scrolling with optimized performance
    if (container.scrollTo) {
      container.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: "smooth",
      });
    } else {
      // Fallback for older browsers
      container.scrollTop = Math.max(0, scrollPosition);
    }
  };

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


  // Extract dominant colors from album art
  const extractColorsFromImage = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Set canvas size
          canvas.width = 100;
          canvas.height = 100;

          // Draw image
          ctx.drawImage(img, 0, 0, 100, 100);

          // Get image data
          const imageData = ctx.getImageData(0, 0, 100, 100);
          const data = imageData.data;

          // Extract colors
          const colorCounts = {};
          const step = 4; // Skip some pixels for performance

          for (let i = 0; i < data.length; i += step * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            // Skip transparent pixels
            if (alpha < 128) continue;

            // Group similar colors
            const key = `${Math.floor(r / 32) * 32},${Math.floor(g / 32) * 32
              },${Math.floor(b / 32) * 32}`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
          }

          // Sort colors by frequency
          const sortedColors = Object.entries(colorCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([color]) => {
              const [r, g, b] = color.split(",").map(Number);
              return { r, g, b };
            });

          if (sortedColors.length > 0) {
            // Create color variations
            const primary = sortedColors[0];
            const secondary = sortedColors[1] || primary;
            const accent = sortedColors[2] || secondary;

            // Convert to hex and create variations
            const toHex = (color) => {
              const hex = (n) => n.toString(16).padStart(2, "0");
              return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
            };

            // Create darker variations for better contrast
            const darken = (color, amount = 0.3) => ({
              r: Math.max(0, Math.floor(color.r * (1 - amount))),
              g: Math.max(0, Math.floor(color.g * (1 - amount))),
              b: Math.max(0, Math.floor(color.b * (1 - amount))),
            });

            resolve({
              primary: toHex(darken(primary, 0.2)),
              secondary: toHex(darken(secondary, 0.4)),
              accent: toHex(darken(accent, 0.6)),
            });
          } else {
            // Fallback colors
            resolve({
              primary: "#1e293b",
              secondary: "#334155",
              accent: "#475569",
            });
          }
        } catch (error) {
          console.error("Error extracting colors:", error);
          resolve({
            primary: "#1e293b",
            secondary: "#334155",
            accent: "#475569",
          });
        }
      };

      img.onerror = () => {
        resolve({
          primary: "#1e293b",
          secondary: "#334155",
          accent: "#475569",
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
    if (isShuffled && playlist.length > 0) {
      // Create shuffled playlist but keep current song at the beginning
      const otherSongs = playlist.filter((song) => song.id !== currentSong?.id);
      const shuffledOthers = shuffleArray(otherSongs);

      // If current song exists, put it first, otherwise just shuffle all
      const shuffled = currentSong
        ? [currentSong, ...shuffledOthers]
        : shuffleArray(playlist);

      setShuffledPlaylist(shuffled);
    } else {
      setShuffledPlaylist([]);
    }
  }, [isShuffled, playlist, currentSong?.id]);

  // Get current playlist (shuffled or normal)
  const getCurrentPlaylist = () => {
    return isShuffled ? shuffledPlaylist : playlist;
  };

  // Enhanced next/previous functions with shuffle and repeat support
  const handleNext = () => {
    // Use localPlaylist (reordered) if shuffle is off, otherwise use shuffled playlist
    const currentPlaylist = isShuffled ? shuffledPlaylist : localPlaylist;
    if (currentPlaylist.length === 0) return;

    const currentIndex = currentPlaylist.findIndex(
      (song) => song.id === currentSong?.id
    );
    let nextIndex;

    if (repeatMode === "one") {
      // Repeat current song
      nextIndex = currentIndex;
    } else if (currentIndex < currentPlaylist.length - 1) {
      // Next song in playlist
      nextIndex = currentIndex + 1;
    } else if (repeatMode === "all") {
      // Loop back to first song
      nextIndex = 0;
    } else {
      // End of playlist, stop playing
      setIsPlaying(false);
      return;
    }

    const nextSong = currentPlaylist[nextIndex];
    if (nextSong) {
      onSongChange?.(nextSong, nextIndex, currentPlaylist);
      setIsPlaying(true); // Ensure auto-play
    }
  };

  const handlePrevious = () => {
    // Use localPlaylist (reordered) if shuffle is off, otherwise use shuffled playlist
    const currentPlaylist = isShuffled ? shuffledPlaylist : localPlaylist;
    if (currentPlaylist.length === 0) return;

    const currentIndex = currentPlaylist.findIndex(
      (song) => song.id === currentSong?.id
    );
    let prevIndex;

    if (repeatMode === "one") {
      // Repeat current song
      prevIndex = currentIndex;
    } else if (currentIndex > 0) {
      // Previous song in playlist
      prevIndex = currentIndex - 1;
    } else if (repeatMode === "all") {
      // Loop to last song
      prevIndex = currentPlaylist.length - 1;
    } else {
      // Beginning of playlist, go to first song
      prevIndex = 0;
    }

    const prevSong = currentPlaylist[prevIndex];
    if (prevSong) {
      onSongChange?.(prevSong, prevIndex, currentPlaylist);
      setIsPlaying(true); // Ensure auto-play
    }
  };

  // Handle song end - auto play next song
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handleSongEnd = () => {
      console.log("Song ended, playing next...");
      // Use localPlaylist (reordered) if shuffle is off, otherwise use shuffled playlist
      const currentPlaylist = isShuffled ? shuffledPlaylist : localPlaylist;
      if (currentPlaylist.length === 0) return;

      const currentIndex = currentPlaylist.findIndex(
        (song) => song.id === currentSong?.id
      );
      let nextIndex;

      if (repeatMode === "one") {
        // Repeat current song
        nextIndex = currentIndex;
      } else if (currentIndex < currentPlaylist.length - 1) {
        // Next song in playlist
        nextIndex = currentIndex + 1;
      } else if (repeatMode === "all") {
        // Loop back to first song
        nextIndex = 0;
      } else {
        // End of playlist, stop playing
        setIsPlaying(false);
        return;
      }

      const nextSong = currentPlaylist[nextIndex];
      if (nextSong) {
        onSongChange?.(nextSong, nextIndex, currentPlaylist);
        setIsPlaying(true); // Ensure auto-play
      }
    };

    audio.addEventListener("ended", handleSongEnd);
    return () => {
      audio.removeEventListener("ended", handleSongEnd);
    };
  }, [
    currentSong?.id,
    repeatMode,
    isShuffled,
    shuffledPlaylist,
    localPlaylist, // Add localPlaylist to dependencies
    onSongChange,
    setIsPlaying,
  ]);

  // Extract colors when song changes
  useEffect(() => {
    if (currentSong?.image?.[2]?.url) {
      extractColorsFromImage(currentSong.image[2].url).then((colors) => {
        setDominantColors(colors);
      });
    }
  }, [currentSong?.id]);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (currentSong && showLyrics) {
      fetchLyrics(currentSong).then((lyricsData) => {
        setLyrics(lyricsData);
      });
    }
  }, [currentSong?.id, showLyrics]);

  // Handle lyrics button click
  const handleLyricsToggle = async () => {
    if (!showLyrics && currentSong && !lyrics) {
      // Fetch lyrics when opening for the first time
      const lyricsData = await fetchLyrics(currentSong);
      setLyrics(lyricsData);
    }
    setShowLyrics(!showLyrics);
  };

  // Sync fullscreen state with context
  useEffect(() => {
    setIsFullscreenOpen(isOpen);
  }, [isOpen, setIsFullscreenOpen]);

  // Auto-scroll to current lyric line (Spotify-like behavior) - Optimized
  useEffect(() => {
    if (!showLyrics || !lyrics?.syncedLyrics) return;

    const parsedLyrics = parseSyncedLyrics(lyrics.syncedLyrics);
    const currentLyricIndex = getCurrentLyricIndex(parsedLyrics, currentTime);

    if (currentLyricIndex !== -1) {
      // Use requestAnimationFrame for smoother performance
      requestAnimationFrame(() => {
        scrollToCurrentLyric(currentLyricIndex);
      });
    }
  }, [currentTime, showLyrics, lyrics?.syncedLyrics]);

  if (!isOpen || !currentSong) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-100 overflow-hidden transition-all duration-1000 ease-out"
        style={{
          background: `linear-gradient(135deg, ${dominantColors.primary} 0%, ${dominantColors.secondary} 50%, ${dominantColors.accent} 100%)`,
        }}
      >
        {/* Enhanced Ambient Background */}
        <div className="absolute inset-0">
          {/* Multiple layered background images for better ambient effect */}
          {currentSong.image?.[2]?.url && (
            <>
              {/* Base blurred image */}
              <img
                src={currentSong.image[2].url}
                alt={currentSong.name}
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 transition-all duration-1000"
              />
              {/* Secondary ambient layer */}
              <img
                src={currentSong.image[2].url}
                alt={currentSong.name}
                className="absolute inset-0 w-full h-full object-cover opacity-10 blur-[100px] scale-150 transition-all duration-1000"
              />
              {/* Tertiary glow layer */}
              <img
                src={currentSong.image[2].url}
                alt={currentSong.name}
                className="absolute inset-0 w-full h-full object-cover opacity-5 blur-[150px] scale-[2] transition-all duration-1000"
              />
            </>
          )}

          {/* Dynamic gradient overlay based on extracted colors */}
          <div
            className="absolute inset-0 transition-all duration-1000"
            style={{
              background: `
              radial-gradient(ellipse at top, ${dominantColors.primary}15 0%, transparent 50%),
              radial-gradient(ellipse at bottom left, ${dominantColors.secondary}20 0%, transparent 50%),
              radial-gradient(ellipse at bottom right, ${dominantColors.accent}15 0%, transparent 50%),
              linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)
            `,
            }}
          />

          {/* Color wash overlay */}
          <div
            className="absolute inset-0 mix-blend-soft-light opacity-40 transition-all duration-1000"
            style={{
              background: `
              radial-gradient(circle at 30% 20%, ${dominantColors.primary}30 0%, transparent 40%),
              radial-gradient(circle at 70% 80%, ${dominantColors.secondary}25 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, ${dominantColors.accent}20 0%, transparent 60%)
            `,
            }}
          />

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
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
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 transform-gpu will-change-transform backdrop-blur-sm"
                style={{
                  zIndex: 10001,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                sideOffset={8}
              >
                <DropdownMenuItem
                  onClick={async () => {
                    if (!currentSong) return;
                    handleLikeToggle();
                  }}
                  className={`transform-gpu will-change-transform ${getCurrentLikeState() ? "text-red-500" : ""}`}
                  disabled={isLikeLoading}
                >
                  <Heart
                    className={`w-4 h-4 mr-2 transition-colors duration-150 ${getCurrentLikeState()
                      ? "fill-red-500 text-red-500"
                      : ""
                      }`}
                  />
                  {isLikeLoading ? "..." : getCurrentLikeState() ? "Unlike" : "Like"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleAddToPlaylist(null, currentSong)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to playlist
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowPlaylist(!showPlaylist)}
                >
                  <ListMusic className="w-4 h-4 mr-2" />
                  {showPlaylist ? "Hide Queue" : "Show Queue"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    if (!currentSong) return;
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

                      toast.loading(`Injecting metadata for "${title}"...`, { id: toastId });

                      // 3. Call Backend API
                      const response = await fetch('/api/download', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          songUrl: downloadUrl,
                          imageUrl,
                          title,
                          artist,
                          album,
                          year
                        }),
                      });

                      if (!response.ok) throw new Error('Backend failed to process song');

                      const isTagged = response.headers.get('X-Tagged') === 'true';
                      const isConverted = response.headers.get('X-Converted') === 'true';

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${title} - ${artist}.mp3`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      if (isTagged) {
                        toast.success(`Downloaded "${title}" with album art! ${isConverted ? '(High-Quality MP3)' : ''}`, { id: toastId });
                      } else {
                        toast.error(`Download successful, but metadata injection failed for "${title}".`, { id: toastId });
                      }
                    } catch (error) {
                      console.error('Download error:', error);
                      toast.error(`Failed to download: ${error.message}`, { id: toastId });
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Main Content - Mobile First Design */}
          <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-12 pb-4 sm:pb-6 min-h-0 overflow-hidden">
            {/* Mobile Layout */}
            <div className="md:hidden flex-1 flex flex-col min-h-0">
              {/* Album Art Container - Responsive sizing */}
              <div className="flex-1 flex items-center justify-center py-4 sm:py-8 min-h-0">
                <div className="w-full max-w-[380px] min-[400px]:max-w-[340px] min-[430px]:max-w-[380px] sm:max-w-[85%] md:max-w-[90%] lg:max-w-[500px] px-2 sm:px-4">
                  <div className="aspect-square overflow-hidden shadow-2xl bg-linear-to-br from-gray-800 to-gray-900">
                    {currentSong.image?.[2]?.url ? (
                      <img
                        src={currentSong.image[2].url}
                        alt={currentSong.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IoMdPlay className="w-12 h-12 sm:w-16 sm:h-16 text-white/50" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Song Info - Compact for small screens */}
              <div className="px-2 pb-4 shrink-0">
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
                    className={`shrink-0 ml-4 p-2 transform-gpu will-change-transform ${getCurrentLikeState()
                      ? "text-green-500"
                      : "text-white/60"
                      }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <Heart
                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-150 ${getCurrentLikeState() ? "fill-green-500" : ""
                        }`}
                    />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 sm:mb-6">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={onSeek}
                    onValueCommit={onSeekCommit}
                    className="w-full **:data-[slot=slider-thumb]:opacity-100 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:w-2.5 **:data-[slot=slider-thumb]:h-2.5 **:data-[slot=slider-range]:bg-white **:data-[slot=slider-track]:bg-white/20"
                  />
                  <div className="flex justify-between text-xs sm:text-sm text-white/60 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls - Compact spacing for small screens */}
                <div className="flex items-center justify-between gap-4 sm:gap-8 mb-4 sm:mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsShuffled(!isShuffled)}
                    className={`p-2 ${isShuffled ? "text-green-400" : "text-white/60"
                      }`}
                  >
                    <RxShuffle style={{ width: '24px', height: '24px' }} />
                  </Button>

                  <div className="flex items-center gap-5">

                    <Button
                      size="xs"
                      onClick={handlePrevious}
                      disabled={playlist.length === 0}
                      className="text-white  hover:bg-transparent bg-transparent"
                    >
                      <BiSkipPrevious style={{ width: '44px', height: '44px' }} />
                    </Button>

                    <Button
                      variant="default"
                      size="lg"
                      onClick={onTogglePlayPause}
                      className="rounded-full w-14 h-14 sm:w-16 sm:h-16 bg-white text-black hover:bg-white/90"
                    >
                      {isPlaying ? (
                        <HiPause style={{ width: '24px', height: '24px' }} />
                      ) : (
                        <IoMdPlay style={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                      )}
                    </Button>

                    <Button
                      size="xs"
                      onClick={handleNext}
                      disabled={playlist.length === 0}
                      className="text-white  hover:bg-transparent bg-transparent"
                    >
                      <BiSkipNext style={{ width: '44px', height: '44px' }} />
                    </Button>
                  </div>


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

                {/* Bottom Actions - Always visible with proper spacing */}
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
                    className="text-white/60 hover:text-white p-3 rounded-full hover:bg-white/10"
                    onClick={handleLyricsToggle}
                  >
                    <Mic style={{ width: '18px', height: '18px' }} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop/Tablet Layout - Professional Design */}
            <div className="hidden md:flex items-center justify-center h-full">
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-6xl w-full px-8">
                {/* Left Side - Album Art */}
                <div className="shrink-0">
                  <div className="w-[350px] h-[350px] lg:w-[400px] lg:h-[400px] xl:w-[450px] xl:h-[450px] rounded-2xl overflow-hidden shadow-2xl bg-linear-to-br from-gray-800 to-gray-900">
                    {currentSong.image?.[2]?.url ? (
                      <img
                        src={currentSong.image[2].url}
                        alt={currentSong.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <IoMdPlay className="w-24 h-24 text-white/50" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side - Controls and Info */}
                <div className="flex-1 flex flex-col justify-center max-w-lg">
                  {/* Song Info with Like Button */}
                  <div className="mb-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1 min-w-0 pr-4">
                        <h1 className="text-3xl xl:text-4xl font-bold mb-3 leading-tight">
                          <span
                            className="block truncate"
                            title={decodeHtmlEntities(currentSong.name)}
                          >
                            {decodeHtmlEntities(currentSong.name)}
                          </span>
                        </h1>
                        <p className="text-xl text-white/70">
                          <span
                            className="block truncate"
                            title={getArtistNames(currentSong)}
                          >
                            {getArtistNames(currentSong)}
                          </span>
                        </p>
                      </div>

                      {/* Like Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLikeToggle}
                        disabled={isLikeLoading}
                        className={`shrink-0 text-white hover:bg-white/10 rounded-full p-3 transform-gpu will-change-transform ${getCurrentLikeState()
                          ? "text-green-500"
                          : "text-white/60"
                          }`}
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        <Heart
                          className={`w-7 h-7 transition-colors duration-150 ${getCurrentLikeState() ? "fill-green-500" : ""
                            }`}
                        />
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8 ">
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={1}
                        onValueChange={onSeek}
                        onValueCommit={onSeekCommit}
                        className="w-full **:data-[slot=slider-thumb]:opacity-100 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:w-3 **:data-[slot=slider-thumb]:h-3 **:data-[slot=slider-range]:bg-white **:data-[slot=slider-track]:bg-white/20 hover:cursor-pointer"
                      />
                      <div className="flex justify-between text-base text-white/60 mt-3">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex items-center justify-center gap-6 mb-8">
                    <Button

                      size="sm"
                      onClick={() => setIsShuffled(!isShuffled)}
                      className={`bg-transparent hover:bg-transparent hover:cursor-pointer ${isShuffled ? "text-green-400" : "text-white/65"
                        }`}
                    >
                      <RxShuffle style={{ width: '24px', height: '24px' }} />
                    </Button>

                    <Button

                      size="xs"
                      onClick={handlePrevious}
                      disabled={playlist.length === 0}
                      className="text-white/65 hover:text-white  hover:bg-transparent bg-transparent hover:cursor-pointer"
                    >
                      <BiSkipPrevious style={{ width: '44px', height: '44px' }} />
                    </Button>

                    <Button
                      variant="default"
                      size="lg"
                      onClick={onTogglePlayPause}
                      className="rounded-full w-16 h-16 bg-white text-black hover:bg-white/90 hover:scale-105 transition-all duration-200 hover:cursor-pointer"
                    >
                      {isPlaying ? (
                        <HiPause style={{ width: '24px', height: '24px' }} />
                      ) : (
                        <IoMdPlay style={{ width: '24px', height: '24px' }} className="ml-1" />
                      )}
                    </Button>

                    <Button

                      size="xs"
                      onClick={handleNext}
                      disabled={playlist.length === 0}
                      className="text-white/65 hover:text-white  hover:bg-transparent bg-transparent hover:cursor-pointer"
                    >
                      <BiSkipNext style={{ width: '44px', height: '44px' }} />
                    </Button>

                    <Button

                      size="sm"
                      onClick={toggleRepeat}
                      className={`relative hover:bg-transparent bg-transparent hover:cursor-pointer ${repeatMode !== "off"
                        ? "text-green-400"
                        : "text-white/65"
                        }`}
                    >
                      <BsRepeat style={{ width: '24px', height: '24px' }} />
                      {repeatMode === "one" && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center text-xs text-black font-bold">
                          1
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPlaylist(!showPlaylist)}
                      className="text-white/60 hover:bg-white/10 rounded-full p-3 hover:cursor-pointer"
                    >
                      <ListMusic style={{ width: '18px', height: '18px' }} />
                    </Button>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVolumeChange([volume === 0 ? 0.7 : 0])}
                        className="text-white/60 hover:bg-white/10 rounded-full p-3 hover:cursor-pointer"
                      >
                        {volume === 0 ? (
                          <VolumeX style={{ width: '20px', height: '20px' }} />
                        ) : (
                          <Volume2 style={{ width: '20px', height: '20px' }} />
                        )}
                      </Button>
                      <Slider
                        value={[volume]}
                        max={1}
                        step={0.1}
                        onValueChange={onVolumeChange}
                        className="w-24 hover:cursor-pointer **:[[role=slider]]:bg-white **:[[role=slider]]:border-white [&_.bg-primary]:bg-white/60"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:bg-white/10 rounded-full p-3 hover:cursor-pointer"
                      onClick={handleLyricsToggle}
                    >
                      <Mic style={{ width: '18px', height: '18px' }} />
                    </Button>
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
                  {localPlaylist.map((song, index) => (
                    <div
                      key={song.id}
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
                          onSongChange?.(song, index, localPlaylist);
                          setShowPlaylist(false); // Close queue on mobile after selection
                        }
                      }}
                      className={`flex items-center gap-3 p-4 active:bg-white/5 cursor-move transition-[opacity,transform] duration-200 select-none ${song.id === currentSong.id ? "bg-white/10" : ""
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
                          className={`font-medium truncate text-base ${song.id === currentSong.id
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
                {localPlaylist.map((song, index) => (
                  <div
                    key={song.id}
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
                        onSongChange?.(song, index, localPlaylist);
                      }
                    }}
                    className={`flex items-center gap-3 p-3 hover:bg-white/5 cursor-move transition-all duration-200 select-none ${song.id === currentSong.id ? "bg-white/10" : ""
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
                        className={`font-medium truncate text-sm ${song.id === currentSong.id
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
          <div className="fixed inset-0 z-110 overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0">
              {/* Multiple layered background images for ambient effect */}
              {currentSong.image?.[2]?.url && (
                <>
                  {/* Base blurred image */}
                  <img
                    src={currentSong.image[2].url}
                    alt={currentSong.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-125 transition-all duration-1000"
                  />
                  {/* Secondary ambient layer */}
                  <img
                    src={currentSong.image[2].url}
                    alt={currentSong.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[100px] scale-150 transition-all duration-1000"
                  />
                  {/* Tertiary glow layer */}
                  <img
                    src={currentSong.image[2].url}
                    alt={currentSong.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-8 blur-[150px] scale-[2] transition-all duration-1000"
                  />
                </>
              )}

              {/* Dynamic gradient overlay based on extracted colors */}
              <div
                className="absolute inset-0 transition-all duration-1000"
                style={{
                  background: `
                  radial-gradient(ellipse at top, ${dominantColors.primary}20 0%, transparent 50%),
                  radial-gradient(ellipse at bottom left, ${dominantColors.secondary}25 0%, transparent 50%),
                  radial-gradient(ellipse at bottom right, ${dominantColors.accent}20 0%, transparent 50%),
                  linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.95) 100%)
                `,
                }}
              />

              {/* Color wash overlay */}
              <div
                className="absolute inset-0 mix-blend-soft-light opacity-30 transition-all duration-1000"
                style={{
                  background: `
                  radial-gradient(circle at 30% 20%, ${dominantColors.primary}40 0%, transparent 40%),
                  radial-gradient(circle at 70% 80%, ${dominantColors.secondary}30 0%, transparent 40%),
                  radial-gradient(circle at 50% 50%, ${dominantColors.accent}25 0%, transparent 60%)
                `,
                }}
              />

              {/* Subtle noise texture for depth */}
              <div
                className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundSize: "256px 256px",
                }}
              />
            </div>

            <div className="relative z-10 flex flex-col h-full">
              {/* Lyrics Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLyrics(false)}
                  className="text-white/60 hover:bg-white/10 rounded-full p-2"
                >
                  <ChevronDown className="w-5 h-5" />
                </Button>
                <h3 className="text-lg font-semibold text-white">Lyrics</h3>
                <div className="w-9"></div> {/* Spacer for centering */}
              </div>

              {/* Lyrics Content */}
              <div className="flex-1 overflow-hidden">
                {/* Mobile Layout */}
                <div className="md:hidden h-full flex flex-col">
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
                      onClick={onTogglePlayPause}
                      className="shrink-0 rounded-full w-12 h-12 bg-green-500 hover:bg-green-600 text-black hover:scale-105 transition-all duration-200"
                    >
                      {isPlaying ? (
                        <HiPause style={{ width: '20px', height: '20px' }} />
                      ) : (
                        <IoMdPlay style={{ width: '20px', height: '20px' }} className="ml-0.5" />
                      )}
                    </Button>
                  </div>

                  {/* Lyrics Text */}
                  <div
                    ref={mobileLyricsContainerRef}
                    className="flex-1 overflow-y-auto scrollbar-hide"
                    style={{
                      scrollBehavior: "smooth",
                      WebkitOverflowScrolling: "touch",
                      transform: "translateZ(0)", // Force hardware acceleration
                      willChange: "scroll-position",
                    }}
                  >
                    <div className="space-y-6 text-center max-w-md mx-auto py-12 px-8">
                      {lyricsLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
                          <span className="ml-3 text-white/60">
                            Loading lyrics...
                          </span>
                        </div>
                      ) : lyrics ? (
                        <>
                          {/* Synced Lyrics - Optimized with Motion Blur */}
                          {lyrics.syncedLyrics ? (
                            <div className="space-y-4 text-white/90 leading-relaxed">
                              {parseSyncedLyrics(lyrics.syncedLyrics).map(
                                (line, index) => {
                                  const currentLyricIndex =
                                    getCurrentLyricIndex(
                                      parseSyncedLyrics(lyrics.syncedLyrics),
                                      currentTime
                                    );
                                  const isCurrentLine =
                                    index === currentLyricIndex;
                                  const isUpcomingLine =
                                    index === currentLyricIndex + 1;
                                  const isPreviousLine =
                                    index === currentLyricIndex - 1;

                                  return (
                                    <p
                                      key={index}
                                      ref={(el) =>
                                      (mobileLyricLineRefs.current[index] =
                                        el)
                                      }
                                      className={`text-lg transition-all duration-700 ease-out transform will-change-transform ${isCurrentLine
                                        ? "text-white font-bold text-xl scale-105 blur-0 opacity-100"
                                        : isUpcomingLine
                                          ? "text-white/80 font-medium blur-0 opacity-90 scale-100"
                                          : isPreviousLine
                                            ? "text-white/60 blur-[0.5px] opacity-70 scale-95"
                                            : "text-white/40 blur-[1px] opacity-50 scale-90"
                                        }`}
                                      style={{
                                        filter: isCurrentLine
                                          ? "blur(0px) brightness(1.1)"
                                          : isUpcomingLine
                                            ? "blur(0px) brightness(1)"
                                            : isPreviousLine
                                              ? "blur(0.5px) brightness(0.9)"
                                              : "blur(1px) brightness(0.7)",
                                        textShadow: isCurrentLine
                                          ? "0 0 20px rgba(255,255,255,0.3)"
                                          : "none",
                                      }}
                                    >
                                      {line.text}
                                    </p>
                                  );
                                }
                              )}
                            </div>
                          ) : lyrics.plainLyrics ? (
                            /* Plain Lyrics */
                            <div className="space-y-4 text-white/90 leading-relaxed">
                              {lyrics.plainLyrics
                                .split("\n")
                                .map((line, index) => (
                                  <p key={index} className="text-lg">
                                    {line.trim()}
                                  </p>
                                ))}
                            </div>
                          ) : (
                            <div className="text-center py-12">
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
                          <p className="text-white/60 text-lg">
                            No lyrics found
                          </p>
                          <p className="text-white/40 text-sm mt-2">
                            Try searching for another song
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout - Centered and Balanced */}
                <div className="hidden md:flex h-full">
                  <div className="flex items-center justify-center w-full px-8 py-8">
                    <div className="flex items-center gap-12 lg:gap-16 max-w-6xl w-full">
                      {/* Left Side - Album Art with Integrated Controls */}
                      <div className="shrink-0">
                        <div className="w-[350px] lg:w-[400px]">
                          {/* Album Art Container with Overlay Controls */}
                          <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl bg-linear-to-br from-gray-800 to-gray-900 mb-6 group">
                            {currentSong.image?.[2]?.url ? (
                              <img
                                src={currentSong.image[2].url}
                                alt={currentSong.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <IoMdPlay className="w-16 h-16 text-white/50" />
                              </div>
                            )}

                            {/* Overlay Controls - Spotify Style */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              {/* Center Play Controls */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex items-center gap-4">
                                  <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={handlePrevious}
                                    className="text-white hover:bg-white/10 rounded-full p-3"
                                  >
                                    <SkipBack className="w-6 h-6" />
                                  </Button>

                                  <Button
                                    variant="default"
                                    size="lg"
                                    onClick={onTogglePlayPause}
                                    className="rounded-full w-14 h-14 bg-white text-black hover:bg-white/90 hover:scale-105 transition-all duration-200"
                                  >
                                    {isPlaying ? (
                                      <HiPause style={{ width: '24px', height: '24px' }} />
                                    ) : (
                                      <IoMdPlay style={{ width: '24px', height: '24px' }} className="ml-0.5" />
                                    )}
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={handleNext}
                                    className="text-white hover:bg-white/10 rounded-full p-3"
                                  >
                                    <SkipForward className="w-6 h-6" />
                                  </Button>
                                </div>
                              </div>

                              {/* Bottom Progress Bar */}
                              <div className="absolute bottom-4 left-4 right-4">
                                <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
                                  <span>{formatTime(currentTime)}</span>
                                  <div className="flex-1">
                                    <Slider
                                      value={[currentTime]}
                                      max={duration || 100}
                                      step={1}
                                      onValueChange={onSeek}
                                      onValueCommit={onSeekCommit}
                                      className="w-full **:[[role=slider]]:bg-white **:[[role=slider]]:border-white **:[[role=slider]]:w-3 **:[[role=slider]]:h-3 [&_.bg-primary]:bg-white"
                                    />
                                  </div>
                                  <span>{formatTime(duration)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Song Info Below Album Art */}
                          <div className="text-center px-4">
                            <h4 className="text-white font-bold text-2xl mb-2 truncate">
                              {decodeHtmlEntities(currentSong.name)}
                            </h4>
                            <p className="text-white/70 text-lg truncate">
                              {getArtistNames(currentSong)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right Side - Lyrics */}
                      <div className="flex-1 min-w-0">
                        <div
                          ref={desktopLyricsContainerRef}
                          className="h-[500px] lg:h-[600px] overflow-y-auto scrollbar-hide"
                          style={{
                            scrollBehavior: "smooth",
                            WebkitOverflowScrolling: "touch",
                            transform: "translateZ(0)", // Force hardware acceleration
                            willChange: "scroll-position",
                          }}
                        >
                          <div className="space-y-6 py-16 px-8 lg:px-12">
                            {lyricsLoading ? (
                              <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/60"></div>
                                <span className="ml-4 text-white/60 text-xl">
                                  Loading lyrics...
                                </span>
                              </div>
                            ) : lyrics ? (
                              <>
                                {/* Synced Lyrics - Optimized with Motion Blur */}
                                {lyrics.syncedLyrics ? (
                                  <div className="space-y-8 text-white/90 leading-relaxed">
                                    {parseSyncedLyrics(lyrics.syncedLyrics).map(
                                      (line, index) => {
                                        const currentLyricIndex =
                                          getCurrentLyricIndex(
                                            parseSyncedLyrics(
                                              lyrics.syncedLyrics
                                            ),
                                            currentTime
                                          );
                                        const isCurrentLine =
                                          index === currentLyricIndex;
                                        const isUpcomingLine =
                                          index === currentLyricIndex + 1;
                                        const isPreviousLine =
                                          index === currentLyricIndex - 1;

                                        return (
                                          <p
                                            key={index}
                                            ref={(el) =>
                                            (desktopLyricLineRefs.current[
                                              index
                                            ] = el)
                                            }
                                            className={`text-xl lg:text-2xl transition-all duration-700 ease-out cursor-pointer hover:text-white/90 wrap-break-word transform will-change-transform ${isCurrentLine
                                              ? "text-white font-bold text-2xl lg:text-3xl scale-105 blur-0 opacity-100"
                                              : isUpcomingLine
                                                ? "text-white/85 font-medium text-xl lg:text-2xl blur-0 opacity-95 scale-100"
                                                : isPreviousLine
                                                  ? "text-white/65 blur-[0.5px] opacity-75 scale-98"
                                                  : "text-white/45 blur-[1px] opacity-60 scale-95"
                                              }`}
                                            style={{
                                              filter: isCurrentLine
                                                ? "blur(0px) brightness(1.2) saturate(1.1)"
                                                : isUpcomingLine
                                                  ? "blur(0px) brightness(1.05) saturate(1.05)"
                                                  : isPreviousLine
                                                    ? "blur(0.5px) brightness(0.95) saturate(0.95)"
                                                    : "blur(1px) brightness(0.8) saturate(0.8)",
                                              textShadow: isCurrentLine
                                                ? "0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.2)"
                                                : isUpcomingLine
                                                  ? "0 0 15px rgba(255,255,255,0.2)"
                                                  : "none",
                                              backfaceVisibility: "hidden",
                                              WebkitFontSmoothing:
                                                "antialiased",
                                            }}
                                            onClick={() =>
                                              onDirectSeek([
                                                parseSyncedLyrics(
                                                  lyrics.syncedLyrics
                                                )[index]?.time || 0,
                                              ])
                                            }
                                          >
                                            {line.text}
                                          </p>
                                        );
                                      }
                                    )}
                                  </div>
                                ) : lyrics.plainLyrics ? (
                                  /* Plain Lyrics */
                                  <div className="space-y-6 text-white/90 leading-relaxed">
                                    {lyrics.plainLyrics
                                      .split("\n")
                                      .map((line, index) => (
                                        <p
                                          key={index}
                                          className="text-xl lg:text-2xl text-white/70 hover:text-white/90 transition-colors cursor-pointer wrap-break-word"
                                        >
                                          {line.trim()}
                                        </p>
                                      ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-12">
                                    <p className="text-white/60 text-xl">
                                      No lyrics available
                                    </p>
                                    <p className="text-white/40 text-lg mt-2">
                                      Enjoy the music!
                                    </p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-12">
                                <p className="text-white/60 text-xl">
                                  No lyrics found
                                </p>
                                <p className="text-white/40 text-lg mt-2">
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
