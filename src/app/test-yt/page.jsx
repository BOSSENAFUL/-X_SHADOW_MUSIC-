/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, Loader2, Maximize2 } from "lucide-react";
import YouTube from "react-youtube";

export default function TestYtPage() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [searchError, setSearchError] = useState("");
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const ytPlayerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Search for YouTube videos using the existing search API
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearchError("");
    try {
      const response = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Search failed: HTTP status ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setVideos(Array.isArray(data.results) ? data.results : (data.results?.videos || []));
      } else {
        throw new Error(data.error || "Failed to search videos");
      }
    } catch (err) {
      console.error(err);
      setSearchError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Play a selected video
  const playVideo = (video) => {
    setCurrentVideo(video);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(video.lengthSeconds || 0);
  };

  // Skip to the next video in search results
  const playNext = () => {
    if (videos.length === 0 || !currentVideo) return;
    const currentIndex = videos.findIndex(v => (v.videoId || v.id) === (currentVideo.videoId || currentVideo.id));
    if (currentIndex !== -1 && currentIndex < videos.length - 1) {
      playVideo(videos[currentIndex + 1]);
    } else {
      // Loop back to start
      playVideo(videos[0]);
    }
  };

  // Skip to the previous video in search results
  const playPrevious = () => {
    if (videos.length === 0 || !currentVideo) return;
    const currentIndex = videos.findIndex(v => (v.videoId || v.id) === (currentVideo.videoId || currentVideo.id));
    if (currentIndex !== -1 && currentIndex > 0) {
      playVideo(videos[currentIndex - 1]);
    } else {
      // Loop to end
      playVideo(videos[videos.length - 1]);
    }
  };

  // Toggle play/pause state
  const togglePlayPause = () => {
    if (!ytPlayerRef.current) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // Seek handler
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time, true);
    }
  };

  // Volume slider handler
  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(vol * 100);
    }
  };

  // Mute toggle handler
  const toggleMute = () => {
    if (isMuted) {
      const restored = prevVolume > 0 ? prevVolume : 0.7;
      setVolume(restored);
      setIsMuted(false);
      if (ytPlayerRef.current) {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(restored * 100);
      }
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
      if (ytPlayerRef.current) {
        ytPlayerRef.current.mute();
      }
    }
  };

  // Poll current time when playing
  useEffect(() => {
    if (isPlaying && isPlayerReady && ytPlayerRef.current) {
      progressIntervalRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
          const time = ytPlayerRef.current.getCurrentTime();
          if (typeof time === "number" && !isNaN(time)) {
            setCurrentTime(time);
          }
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, isPlayerReady, currentVideo]);

  // Format seconds to MM:SS string
  const formatTime = (secs) => {
    if (isNaN(secs) || secs === undefined) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Construct cover image from video ID
  const getThumbnailUrl = (video) => {
    if (!video) return "/default-playlist-image.png";
    const videoId = video.videoId || video.id;
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  };

  return (
    <div className="min-h-screen bg-[#030303] text-[#F9F9F9] flex flex-col items-center p-4 md:p-8 relative overflow-hidden select-none font-sans">
      
      {/* Dynamic Ambient Glow Backdrop */}
      {currentVideo && (
        <div 
          className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-cover bg-center blur-[110px] opacity-[0.25] transition-all duration-1000 scale-[1.3] pointer-events-none"
          style={{ backgroundImage: `url(${getThumbnailUrl(currentVideo)})` }}
        />
      )}

      {/* Header / Search bar */}
      <header className="w-full max-w-5xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6 mb-8 mt-2 z-10">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            Invisible YouTube Player
          </h1>
          <span className="text-zinc-500 text-xs mt-0.5">YouTube Music Client-Side IFrame Test Dashboard</span>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Search YouTube Music..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#121212]/90 border border-zinc-800/80 rounded-full focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-sm text-[#F9F9F9] placeholder:text-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-white hover:bg-zinc-200 text-zinc-950 font-medium text-sm rounded-full active:scale-[0.98] disabled:opacity-50 transition-all shadow-md shadow-white/5 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </form>
      </header>

      {/* Main Grid */}
      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 flex-1 pb-36 z-10">
        
        {/* Left Side: Results List */}
        <section className="col-span-1 md:col-span-7 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest px-1">Search Results</h2>
          
          {searchError && (
            <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl text-xs">
              {searchError}
            </div>
          )}

          <div className="flex-1 flex flex-col max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {loading && videos.length === 0 && (
              <div className="flex flex-col items-center justify-center p-20 text-zinc-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                <span className="text-sm">Retrieving search results...</span>
              </div>
            )}
            
            {!loading && videos.length === 0 && (
              <div className="flex flex-col items-center justify-center p-16 bg-[#0E0E0E]/40 border border-dashed border-zinc-800/60 rounded-3xl text-zinc-500 gap-2">
                <Music className="w-10 h-10 text-zinc-700 mb-2" />
                <span className="font-semibold text-zinc-400 text-sm">Find your favorite music</span>
                <span className="text-xs text-zinc-600">Enter a song or artist in the search bar above</span>
              </div>
            )}

            {videos.map((video, index) => {
              const videoId = video.videoId || video.id;
              const isCurrent = currentVideo && (currentVideo.videoId || currentVideo.id) === videoId;
              
              return (
                <div
                  key={videoId || index}
                  onClick={() => playVideo(video)}
                  className={`flex items-center gap-4 p-2.5 rounded-xl cursor-pointer border transition-all group ${
                    isCurrent
                      ? "bg-white/5 border-white/10 shadow-lg"
                      : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  {/* Thumbnail / Cover art inside row */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative bg-zinc-900 border border-white/5 shadow-md">
                    <img
                      src={getThumbnailUrl(video)}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                    />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all ${isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      {isCurrent && isPlaying ? (
                        <span className="flex items-end gap-[3px] h-3">
                          <span className="w-0.5 bg-red-600 rounded-full animate-[bounce_0.8s_infinite] h-full" />
                          <span className="w-0.5 bg-red-600 rounded-full animate-[bounce_0.8s_infinite_0.15s] h-[70%]" />
                          <span className="w-0.5 bg-red-600 rounded-full animate-[bounce_0.8s_infinite_0.3s] h-full" />
                        </span>
                      ) : (
                        <Play className="w-4 h-4 fill-white text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate text-sm md:text-base ${isCurrent ? "text-red-500 font-bold" : "text-white"}`}>
                      {video.title}
                    </h3>
                    <p className="text-zinc-400 text-xs truncate mt-0.5">
                      {video.author || video.channelName}
                    </p>
                  </div>
                  <span className="text-zinc-500 text-xs tabular-nums pr-2">
                    {formatTime(video.lengthSeconds)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Side: YouTube Music Player Card */}
        <section className="col-span-1 md:col-span-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest px-1">Now Playing</h2>
          
          <div className="bg-[#0E0E0E]/80 border border-white/5 rounded-3xl p-6 backdrop-blur-md flex flex-col items-center text-center shadow-2xl relative overflow-hidden flex-1 min-h-[420px] justify-center gap-6">
            
            {/* dynamic background layer inside player card */}
            {currentVideo && (
              <div 
                className="absolute inset-0 -z-10 bg-cover bg-center blur-[80px] opacity-[0.12] scale-125"
                style={{ backgroundImage: `url(${getThumbnailUrl(currentVideo)})` }}
              />
            )}

            {/* Song Cover Art (Large YouTube Music style) */}
            <div className="relative group select-none mt-2 w-full max-w-[240px] aspect-square rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 shrink-0">
              {currentVideo ? (
                <img
                  src={getThumbnailUrl(currentVideo)}
                  alt={currentVideo.title}
                  className="w-full h-full object-cover select-none pointer-events-none group-hover:scale-105 transition-all duration-700"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900/40 flex items-center justify-center text-zinc-700">
                  <Music className="w-16 h-16 text-zinc-800" />
                </div>
              )}
            </div>

            {/* Metadata Info */}
            <div className="w-full min-w-0 px-2 mt-2">
              <h2 className="text-base md:text-lg font-bold text-white truncate select-none leading-snug">
                {currentVideo ? currentVideo.title : "No song playing"}
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm truncate mt-1.5 select-none">
                {currentVideo ? (currentVideo.author || currentVideo.channelName) : "Select a track from the results"}
              </p>
            </div>
            
            {/* Seeker / Scrubber */}
            <div className="w-full flex flex-col gap-2 mt-2 select-none px-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime ?? 0}
                onChange={handleSeek}
                className="w-full h-[3px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] md:text-xs text-zinc-500 font-medium tabular-nums mt-0.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Persistent Bottom Control Bar */}
      {currentVideo && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#070707]/90 border-t border-white/5 p-4 md:px-12 flex items-center justify-between z-50 backdrop-blur-xl select-none">
          <div className="flex items-center gap-4 flex-1 min-w-0 max-w-[280px]">
            {/* Cover art inside bottom bar */}
            <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/5 shadow-md">
              <img
                src={getThumbnailUrl(currentVideo)}
                alt={currentVideo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold truncate text-white leading-normal">
                {currentVideo.title}
              </h4>
              <p className="text-zinc-400 text-xs truncate mt-0.5">
                {currentVideo.author || currentVideo.channelName}
              </p>
            </div>
          </div>

          {/* Centered Controls */}
          <div className="flex items-center gap-6 justify-center flex-1">
            <button onClick={playPrevious} className="text-zinc-400 hover:text-white transition-colors">
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={togglePlayPause}
              className="p-3 bg-white hover:bg-zinc-200 text-zinc-950 rounded-full shadow-lg transition-transform active:scale-[0.94]"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={playNext} className="text-zinc-400 hover:text-white transition-colors">
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-3 justify-end flex-1 max-w-[200px]">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
              {isMuted ? <VolumeX className="w-4.5 h-4.5 text-red-500" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-[3px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* THE INVISIBLE YOUTUBE ENGINE */}
      <div style={{ display: "none" }} className="w-0 h-0 overflow-hidden pointer-events-none absolute -left-[9999px] -top-[9999px]">
        {currentVideo && (
          <YouTube
            videoId={currentVideo.videoId || currentVideo.id}
            opts={{
              width: "0",
              height: "0",
              playerVars: {
                autoplay: 1,
                controls: 0,
                modestbranding: 1,
                disablekb: 1,
                rel: 0,
                fs: 0,
                playsinline: 1,
                iv_load_policy: 3,
              },
            }}
            onReady={(e) => {
              console.log("[test-yt] YouTube Player Engine Ready.");
              ytPlayerRef.current = e.target;
              e.target.setVolume(isMuted ? 0 : volume * 100);
              setDuration(e.target.getDuration());
              setIsPlayerReady(true);
              if (isPlaying) {
                e.target.playVideo();
              }
            }}
            onStateChange={(e) => {
              const state = e.data;
              console.log(`[test-yt] YouTube Player State changed: ${state}`);
              if (state === 1) {
                // Playing
                setIsPlaying(true);
                setDuration(e.target.getDuration());
              } else if (state === 2) {
                // Paused
                setIsPlaying(false);
              } else if (state === 0) {
                // Ended
                console.log("[test-yt] Track ended. Autoplay next song...");
                setIsPlaying(false);
                playNext();
              }
            }}
            onError={(e) => {
              console.error("[test-yt] YouTube Player Error:", e.data);
              setIsPlaying(false);
            }}
          />
        )}
      </div>

    </div>
  );
}
