"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";

const MusicPlayerContext = createContext();

export function MusicPlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlist, setPlaylist] = useState([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isFullscreenPlaylistOpen, setIsFullscreenPlaylistOpen] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // 'off', 'all', 'one'
  const [showTrackNumbersMobile, setShowTrackNumbersMobile] = useState(false);
  const [disableSpotifyCanvas, setDisableSpotifyCanvas] = useState(false);
  const [disableLyricsBg, setDisableLyricsBg] = useState(true);
  const [restoredTime, setRestoredTime] = useState(null);
  const [isRestored, setIsRestored] = useState(false);

  // Add audio timing states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioRef, setAudioRef] = useState(null);

  // Load player state from localStorage on mount (defer to prevent hydration issues)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedSong = localStorage.getItem("jammify_player_song");
        const storedIndex = localStorage.getItem("jammify_player_index");
        const storedPlaylist = localStorage.getItem("jammify_player_playlist");
        const storedPlaylistId = localStorage.getItem("jammify_player_playlist_id");
        const storedVisible = localStorage.getItem("jammify_player_visible");
        const storedVolume = localStorage.getItem("jammify_player_volume");
        const storedTime = localStorage.getItem("jammify_player_current_time");

        if (storedSong && storedSong !== "null") {
          const parsedSong = JSON.parse(storedSong);
          const parsedPlaylist = storedPlaylist ? JSON.parse(storedPlaylist) : [];
          const parsedIndex = storedIndex ? parseInt(storedIndex, 10) : 0;
          const parsedPlaylistId = storedPlaylistId && storedPlaylistId !== "null" ? storedPlaylistId : null;
          const parsedTime = storedTime ? parseFloat(storedTime) : 0;

          setTimeout(() => {
            setCurrentSong(parsedSong);
            setPlaylist(parsedPlaylist);
            setCurrentIndex(parsedIndex);
            setCurrentPlaylistId(parsedPlaylistId);
            setIsPlayerVisible(storedVisible === "true");
            setIsPlaying(false); // ALWAYS start paused on reopen!
            if (parsedTime > 0) {
              setRestoredTime(parsedTime);
              setCurrentTime(parsedTime);
            }
            if (storedVolume) {
              setVolume(parseFloat(storedVolume));
            }
            setIsRestored(true);
          }, 0);
        } else {
          setTimeout(() => {
            setIsRestored(true);
          }, 0);
        }
      } catch (e) {
        console.error("Failed to restore player state", e);
        setIsRestored(true);
      }
    }
  }, []);

  // Save core state to localStorage on state changes
  useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("jammify_player_song", JSON.stringify(currentSong));
        localStorage.setItem("jammify_player_index", String(currentIndex));
        localStorage.setItem("jammify_player_playlist", JSON.stringify(playlist));
        localStorage.setItem("jammify_player_playlist_id", String(currentPlaylistId));
        localStorage.setItem("jammify_player_visible", String(isPlayerVisible));
      } catch (e) {
        console.error("Failed to save player state", e);
      }
    }
  }, [currentSong, currentIndex, playlist, currentPlaylistId, isPlayerVisible, isRestored]);

  // Save volume to localStorage on change
  useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("jammify_player_volume", String(volume));
    }
  }, [volume, isRestored]);

  // Save progress time to localStorage (throttled to at least 1.5s interval of change)
  const lastSavedTimeRef = useRef(0);
  useEffect(() => {
    if (!isRestored) return;
    if (typeof window !== "undefined" && currentSong) {
      if (Math.abs(currentTime - lastSavedTimeRef.current) >= 1.5) {
        localStorage.setItem("jammify_player_current_time", String(currentTime));
        lastSavedTimeRef.current = currentTime;
      }
    }
  }, [currentTime, currentSong, isRestored]);

  // Load mobile track numbers setting on mount (defer to prevent synchronous setState warning)
  useEffect(() => {
    const stored = localStorage.getItem("show_track_numbers_mobile");
    if (stored === "true") {
      const timeout = setTimeout(() => {
        setShowTrackNumbersMobile(true);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Load Spotify Canvas setting on mount (defer to prevent synchronous setState warning)
  useEffect(() => {
    const stored = localStorage.getItem("disable_spotify_canvas");
    if (stored === "true") {
      const timeout = setTimeout(() => {
        setDisableSpotifyCanvas(true);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Load lyrics background setting on mount (defer to prevent synchronous setState warning)
  useEffect(() => {
    const stored = localStorage.getItem("disable_lyrics_bg");
    if (stored === "false") {
      const timeout = setTimeout(() => {
        setDisableLyricsBg(false);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, []);



  // Helper function to check if current song is a radio station
  const isRadioPlaying = currentSong?.isRadio === true;

  const playSong = (song, songList = [], playlistId = null, index = 0) => {
    setCurrentSong(song);
    setCurrentIndex(index);
    setPlaylist(songList);
    setCurrentPlaylistId(playlistId);
    setIsPlayerVisible(true);
    setIsPlaying(true);
  };

  const handleSongChange = (song, index) => {
    setCurrentSong(song);
    setCurrentIndex(index);
  };

  const clearPlayer = () => {
    setCurrentSong(null);
    setCurrentIndex(0);
    setPlaylist([]);
    setCurrentPlaylistId(null);
    setIsPlayerVisible(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const updateCurrentTime = (time) => {
    setCurrentTime(time);
  };

  const updateDuration = (dur) => {
    setDuration(dur);
  };

  const updateVolume = (vol) => {
    setVolume(vol);
  };

  const seekTo = (time) => {
    if (audioRef && audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentSong,
        currentIndex,
        playlist,
        currentPlaylistId,
        isPlayerVisible,
        isPlaying,
        isRadioPlaying,
        isShuffle,
        repeatMode,
        showTrackNumbersMobile,
        setShowTrackNumbersMobile,
        disableSpotifyCanvas,
        setDisableSpotifyCanvas,
        disableLyricsBg,
        setDisableLyricsBg,
        restoredTime,
        setRestoredTime,
        isFullscreenOpen,
        isFullscreenPlaylistOpen,
        currentTime,
        duration,
        volume,
        audioRef,
        setIsFullscreenOpen,
        setIsFullscreenPlaylistOpen,
        playSong,
        handleSongChange,
        clearPlayer,
        togglePlayPause,
        setIsPlaying,
        updateCurrentTime,
        setIsShuffle,
        setRepeatMode,
        updateDuration,
        updateVolume,
        seekTo,
        setAudioRef,
        setPlaylist,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
}
