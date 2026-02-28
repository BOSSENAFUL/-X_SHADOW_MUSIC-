"use client";

import { createContext, useContext, useState } from "react";

const MusicPlayerContext = createContext();

export function MusicPlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Add audio timing states
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioRef, setAudioRef] = useState(null);

  // Helper function to check if current song is a radio station
  const isRadioPlaying = currentSong?.isRadio === true;

  const playSong = (song, songList = [], playlistId = null) => {
    setCurrentSong(song);
    setPlaylist(songList);
    setCurrentPlaylistId(playlistId);
    setIsPlayerVisible(true);
    setIsPlaying(true);
  };

  const handleSongChange = (song, index) => {
    setCurrentSong(song);
  };

  const clearPlayer = () => {
    setCurrentSong(null);
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
        playlist,
        currentPlaylistId,
        isPlayerVisible,
        isPlaying,
        isRadioPlaying,
        isFullscreenOpen,
        currentTime,
        duration,
        volume,
        audioRef,
        setIsFullscreenOpen,
        playSong,
        handleSongChange,
        clearPlayer,
        togglePlayPause,
        setIsPlaying,
        updateCurrentTime,
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
