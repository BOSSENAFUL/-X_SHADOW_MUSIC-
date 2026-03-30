"use client";

import { createContext, useContext, useState } from "react";

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

  // Add audio timing states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioRef, setAudioRef] = useState(null);

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
