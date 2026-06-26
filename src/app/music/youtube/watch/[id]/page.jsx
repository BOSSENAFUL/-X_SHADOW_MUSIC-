"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Play, X, ChevronDown, ChevronUp, ListMusic, Eye } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* High-quality thumbnail with progressive fallback */
function SmartThumb({ videoId, coverImage, className, wrapClass }) {
  const [src, setSrc] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  );
  const [fbIdx, setFbIdx] = useState(0);
  const fallbacks = [
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    coverImage || "/default-playlist-image.png",
  ];
  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => {
        if (fbIdx < fallbacks.length) {
          setSrc(fallbacks[fbIdx]);
          setFbIdx((i) => i + 1);
        }
      }}
    />
  );
}

export default function PodcastWatchPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = use(paramsPromise);
  const searchParams = use(searchParamsPromise);
  const videoId = params.id;
  const showId = searchParams?.showId;
  const showTitle = searchParams?.showTitle;
  const listId = searchParams?.list; // Playlist ID if playing playlist

  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  
  const [videoData, setVideoData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Playlist Queue States
  const [playlistData, setPlaylistData] = useState(null);
  const [playlistEpisodes, setPlaylistEpisodes] = useState([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [playlistQueueExpanded, setPlaylistQueueExpanded] = useState(false);

  const getProxiedImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(url)}`
      : url;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/music/youtube/watch/${videoId}`);
    }
  }, [sessionStatus, router, videoId]);

  // Fetch video details and recommendations
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !videoId) return;

    async function fetchDetails() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/youtube/details?videoId=${videoId}`);
        const data = await res.json();
        
        if (data.success) {
          setVideoData(data.video);
          setRecommendations(data.recommendations);
        } else {
          setError(data.error || "Failed to fetch video details");
        }
      } catch (err) {
        console.error("Error fetching details:", err);
        setError((err instanceof Error ? err.message : String(err)) || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [sessionStatus, videoId]);

  // Fetch playlist queue if listId is present
  useEffect(() => {
    if (!listId || sessionStatus !== "authenticated") {
      setPlaylistData(null);
      setPlaylistEpisodes([]);
      return;
    }

    async function fetchPlaylist() {
      try {
        setPlaylistLoading(true);
        const res = await fetch(`/api/youtube/episodes?playlistId=${listId}`);
        const data = await res.json();
        if (data.success) {
          setPlaylistData(data.playlist);
          setPlaylistEpisodes(data.episodes || []);
        }
      } catch (err) {
        console.error("Error fetching playlist episodes for queue:", err);
      } finally {
        setPlaylistLoading(false);
      }
    }

    fetchPlaylist();
  }, [listId, sessionStatus]);

  // Active Index inside active playlist queue
  const activeIndex = playlistEpisodes.findIndex(ep => ep.id === videoId);

  // Playback Auto-Advance Logic (stored in refs to avoid stale closures)
  const handleNextVideoRef = useRef();
  const handlePrevVideoRef = useRef();

  const handleNextVideo = useCallback(() => {
    if (playlistEpisodes.length === 0) return;

    const nextIndex = activeIndex + 1;

    if (nextIndex < playlistEpisodes.length) {
      const nextVid = playlistEpisodes[nextIndex];
      router.push(`/music/youtube/watch/${nextVid.id}?list=${listId}&showId=${showId || ''}&showTitle=${encodeURIComponent(showTitle || '')}`);
    } else {
      toast.info("End of playlist");
    }
  }, [playlistEpisodes, activeIndex, listId, showId, showTitle, router]);

  const handlePrevVideo = useCallback(() => {
    if (playlistEpisodes.length === 0) return;

    const prevIndex = activeIndex - 1;

    if (prevIndex >= 0) {
      const prevVid = playlistEpisodes[prevIndex];
      router.push(`/music/youtube/watch/${prevVid.id}?list=${listId}&showId=${showId || ''}&showTitle=${encodeURIComponent(showTitle || '')}`);
    }
  }, [playlistEpisodes, activeIndex, listId, showId, showTitle, router]);

  handleNextVideoRef.current = handleNextVideo;
  handlePrevVideoRef.current = handlePrevVideo;

  const handleClosePlaylist = () => {
    // Exits playlist mode by removing the list param from the watch URL
    router.push(`/music/youtube/watch/${videoId}?showId=${showId || ''}&showTitle=${encodeURIComponent(showTitle || '')}`);
  };

  // Bind YouTube Iframe Player API to capture video completion event
  useEffect(() => {
    let player;

    function initPlayer() {
      if (typeof window.YT === "undefined" || !window.YT.Player) return;
      
      player = new window.YT.Player("youtube-player", {
        events: {
          onStateChange: (event) => {
            // YT.PlayerState.ENDED is 0
            if (event.data === 0) {
              handleNextVideoRef.current?.();
            }
          }
        }
      });
    }

    if (typeof window.YT === "undefined" || !window.YT.Player) {
      // Inject API script if not already present
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      // Bind callback (stack with any existing callback)
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      if (player && player.destroy) {
        player.destroy();
      }
    };
  }, [videoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
        <span className="text-sm font-semibold text-neutral-400">Loading player...</span>
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6">
        <div className="bg-red-950/40 border border-red-500/20 p-6 rounded-xl max-w-md text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Video</h2>
          <p className="text-neutral-300 text-sm mb-6">{error || "Could not find video details."}</p>
          <button 
            onClick={() => router.push("/music")}
            className="bg-white hover:bg-neutral-200 text-black text-xs font-extrabold px-6 py-2.5 rounded-full transition-transform active:scale-95"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const formattedViews = typeof videoData.viewCount === 'number' 
    ? videoData.viewCount.toLocaleString()
    : videoData.viewCount;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-[#121212] text-white font-youtube">
        
        {/* Top Header */}
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 bg-[#121212] text-white border-b border-white/5 w-full">
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Button 
                size="sm" 
                onClick={() => {
                  if (listId) {
                    router.push(`/music/youtube-playlist/${listId}?showId=${showId || ""}`);
                  } else if (showId) {
                    router.push(`/music/youtube/${showId}`);
                  } else {
                    router.push("/music/youtube");
                  }
                }} 
                className="mr-1 bg-white/10 hover:bg-white/20 text-white rounded-full border-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <span className="font-bold text-sm sm:text-base truncate max-w-[150px] sm:max-w-[300px] md:max-w-[500px] select-none">
                {videoData.title}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 relative pb-36 px-4 md:px-6 pt-4 lg:grid lg:grid-cols-3 lg:gap-6">
          
          {/* Left Column (Player & Details) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Top-anchored Responsive Player Card */}
            <div className="relative w-[calc(100%+2rem)] md:w-full aspect-video rounded-none md:rounded-xl overflow-hidden bg-black shadow-2xl border-y md:border border-white/5 -mx-4 md:mx-0">
              <iframe
                id="youtube-player"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1`}
                title={videoData.title}
                className="absolute top-0 left-0 w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {listId && playlistData && (
              <div className="lg:hidden">
                <div 
                  onClick={() => setPlaylistQueueExpanded(!playlistQueueExpanded)}
                  className="flex items-center justify-between px-1 py-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-neutral-900 ring-1 ring-white/[0.06]">
                      <SmartThumb videoId={playlistEpisodes[0]?.id || ""} coverImage={playlistData.coverImage} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Up next</p>
                      <p className="text-sm font-semibold text-white truncate mt-0.5">{playlistData.title}</p>
                      <p className="text-xs text-white/35 mt-0.5">{activeIndex !== -1 ? activeIndex + 1 : 1} / {playlistEpisodes.length}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setPlaylistQueueExpanded(!playlistQueueExpanded)}
                      className="size-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 transition-colors"
                    >
                      {playlistQueueExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                    <button 
                      onClick={handleClosePlaylist}
                      className="size-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {playlistQueueExpanded && (
                  <div className="max-h-[300px] overflow-y-auto">
                    {playlistLoading ? (
                      <div className="flex items-center justify-center py-10 text-white/40 text-xs">
                        <Loader2 className="size-4 animate-spin mr-2" /> Loading...
                      </div>
                    ) : playlistEpisodes.length === 0 ? (
                      <div className="text-center py-6 text-xs text-white/30">Empty queue</div>
                    ) : (
                      <div className="space-y-0.5">
                        {playlistEpisodes.map((item, idx) => {
                          const isActive = item.id === videoId;
                          return (
                            <div 
                              key={item.id}
                              onClick={() => router.push(`/music/youtube/watch/${item.id}?list=${listId}&showId=${showId || ''}`)}
                              className={`flex items-center gap-2.5 px-1.5 py-2.5 rounded-xl cursor-pointer transition-colors ${isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                            >
                              <span className="w-5 text-center text-xs font-medium text-white/20 shrink-0 tabular-nums">
                                {isActive ? <Play className="size-3 fill-white text-white mx-auto" /> : idx + 1}
                              </span>
                              <div className="w-[108px] aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-900 ring-1 ring-white/[0.04]">
                                <SmartThumb videoId={item.id} coverImage={item.coverImage} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className={`text-[13px] font-medium leading-snug line-clamp-2 ${isActive ? 'text-white' : 'text-white/85'}`}>
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-white/40 truncate mt-0.5">
                                  {item.author || playlistData.publisher}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Episode Title */}
            <div className="px-1 select-text">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                {videoData.title}
              </h1>
            </div>

            {/* Creator details row */}
            <div 
              onClick={() => {
                const channelId = showId || videoData.channel?.channelId;
                if (channelId) router.push(`/music/youtube/${channelId}`);
              }}
              className="flex items-center gap-3 py-1 px-1 cursor-pointer group select-none"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-neutral-900 shadow-md group-hover:scale-105 transition-transform duration-200">
                <img 
                  src={getProxiedImageUrl(videoData.channel.avatar) || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop"} 
                  alt={videoData.channel.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop";
                  }}
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight truncate text-neutral-200 group-hover:text-green-500 transition-colors flex items-center gap-1">
                  {videoData.channel.name}
                  <svg className="w-3.5 h-3.5 text-neutral-400 fill-current shrink-0 inline-block" viewBox="0 0 24 24">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-400 font-medium mt-0.5">
                  {videoData.channel.subscriberCountText || "Subscribers"}
                </p>
              </div>
            </div>

            {/* Description Section */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-xs sm:text-sm text-neutral-300 space-y-2 select-text shadow-sm">
              <div className="flex items-center gap-3 font-extrabold text-white text-[11px] sm:text-xs">
                <span>{formattedViews} views</span>
                <span className="w-1 h-1 bg-neutral-600 rounded-full" />
                <span>YouTube Video</span>
              </div>
              <div>
                {(() => {
                  const desc = videoData.description || "No description provided for this episode.";
                  const isLong = desc.length > 180;
                  const truncated = isLong && !descriptionExpanded ? desc.slice(0, 180).trim() + "..." : desc;
                  return (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {truncated}
                      {isLong && (
                        <button
                          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                          className="ml-1.5 text-white hover:underline font-extrabold focus:outline-none cursor-pointer"
                        >
                          {descriptionExpanded ? "show less" : "show more"}
                        </button>
                      )}
                    </p>
                  );
                })()}
              </div>
            </div>

          </div>

          {/* Right Column (Playlist Sidebar or Related Recommendations) */}
          <div className="lg:col-span-1 mt-8 lg:mt-0">
            
            {listId && playlistData ? (
              <div className="hidden lg:flex flex-col border border-white/[0.06] rounded-2xl overflow-hidden bg-white/[0.02]">
                <div className="p-4 border-b border-white/[0.04]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-12 rounded-xl overflow-hidden shrink-0 bg-neutral-900 ring-1 ring-white/[0.06]">
                        <SmartThumb videoId={playlistEpisodes[0]?.id || ""} coverImage={playlistData.coverImage} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] lg:text-xs font-medium text-white/40 uppercase tracking-wider">Up next</p>
                        <h3 
                          onClick={() => router.push(`/music/youtube-playlist/${listId}?showId=${showId || ""}`)}
                          className="text-sm font-semibold text-white truncate mt-0.5 hover:underline cursor-pointer"
                        >
                          {playlistData.title}
                        </h3>
                        <p className="text-xs text-white/35 mt-0.5">
                          {playlistData.publisher} &middot; {activeIndex !== -1 ? activeIndex + 1 : 1} / {playlistEpisodes.length}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleClosePlaylist}
                      className="size-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors shrink-0"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[500px] lg:max-h-[calc(100vh-290px)]">
                  {playlistLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/40">
                      <Loader2 className="size-6 animate-spin mb-2" />
                      <span className="text-xs">Loading...</span>
                    </div>
                  ) : playlistEpisodes.length === 0 ? (
                    <div className="text-center py-16 text-xs text-white/30">Empty playlist</div>
                  ) : (
                    <div className="py-1">
                      {playlistEpisodes.map((item, idx) => {
                        const isActive = item.id === videoId;
                        return (
                          <div
                            key={item.id}
                            onClick={() => router.push(`/music/youtube/watch/${item.id}?list=${listId}&showId=${showId || ''}`)}
                            className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                          >
                            <span className="w-5 lg:w-7 text-center text-xs lg:text-sm font-medium text-white/20 shrink-0 tabular-nums">
                              {isActive ? <Play className="size-3 lg:size-4 fill-white text-white mx-auto" /> : idx + 1}
                            </span>
                            <div className="w-20 lg:w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-900 ring-1 ring-white/[0.04]">
                              <SmartThumb videoId={item.id} coverImage={item.coverImage} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-xs lg:text-sm font-medium leading-snug line-clamp-2 ${isActive ? 'text-white' : 'text-white/85'}`}>
                                {item.title}
                              </h4>
                              <p className="text-[10px] lg:text-xs text-white/40 truncate mt-0.5">
                                {item.author || playlistData.publisher}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm lg:text-base font-semibold text-white/90 mb-4 px-1">
                  Up Next
                </h2>
                
                {recommendations.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-8 px-1">No recommended videos found.</p>
                ) : (
                  <div className="space-y-0.5">
                    {recommendations.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => router.push(`/music/youtube/watch/${item.id}?showId=${showId || ''}&showTitle=${encodeURIComponent(showTitle || '')}`)}
                        className="flex items-center gap-3 px-1.5 py-2.5 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors"
                      >
                        <div className="relative w-[108px] lg:w-[168px] aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-900 ring-1 ring-white/[0.04]">
                          <SmartThumb videoId={item.id} coverImage={item.coverImage} className="w-full h-full object-cover" />
                          {item.duration && (
                            <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] lg:text-[11px] font-medium px-1 py-0.5 rounded text-white/90 leading-none">
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] lg:text-[15px] font-medium text-white/90 line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-[11px] lg:text-[13px] text-white/40 font-medium truncate mt-0.5">
                            {item.author || videoData.channel.name}
                          </p>
                          <p className="text-[10px] lg:text-[12px] text-white/30 font-medium mt-0.5">
                            {item.views ? `${item.views} • ` : ''}{item.published || ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}
