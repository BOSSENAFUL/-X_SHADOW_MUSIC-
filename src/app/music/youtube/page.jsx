"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, User, Youtube, Play, MoreVertical, Search } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export default function PodcastsDashboardPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [followedPodcasts, setFollowedPodcasts] = useState([]);
  const [podcastEpisodes, setPodcastEpisodes] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  // Redirect if unauthenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/music/youtube");
    }
  }, [sessionStatus, router]);

  // Load followed podcasts and compile chronological latest episodes feed
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch followed shows
        const followRes = await fetch("/api/youtube/follow");
        const followData = await followRes.json();
        
        if (followData.success && followData.results.length > 0) {
          // 2. Fetch unified subscriptions feed
          const feedRes = await fetch("/api/youtube/subscriptions");
          const feedData = await feedRes.json();

          // 3. Map episodes to frontend structure
          let episodes = [];
          if (feedData.success && feedData.results) {
            episodes = feedData.results.map(ep => ({
              id: ep.id,
              title: ep.title,
              coverImage: ep.thumbnail,
              duration: ep.duration,
              views: ep.views,
              published: ep.published,
              category: ep.category,
              score: ep.score,
              show: {
                id: ep.channelId,
                title: ep.channelName,
                cover: ep.channelAvatar,
                publisher: ep.channelName
              }
            }));
          }

          // 4. Determine hasNewEpisodes status for followed channels
          const isRecent = (published) => {
            const p = (published || "").toLowerCase();
            if (p.includes("second") || p.includes("minute") || p.includes("hour")) return true;
            if (p.includes("today") || p.includes("yesterday")) return true;
            const dayMatch = p.match(/(\d+)\s*day/);
            if (dayMatch && parseInt(dayMatch[1], 10) <= 7) return true;
            const weekMatch = p.match(/(\d+)\s*week/);
            if (weekMatch && parseInt(weekMatch[1], 10) === 1) return true;
            return false;
          };

          const updatedShows = followData.results.map((show) => {
            const hasNew = episodes.some(ep => 
              ep.show.id === show.podcastId && isRecent(ep.published)
            );

            return {
              ...show,
              hasNewEpisodes: hasNew
            };
          });

          setFollowedPodcasts(updatedShows);
          setPodcastEpisodes(episodes);
        } else {
          setFollowedPodcasts([]);
          setPodcastEpisodes([]);
        }
      } catch (e) {
        console.error("Failed to load podcasts dashboard:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sessionStatus]);

  const categories = useMemo(() => {
    const cats = [...new Set(podcastEpisodes.map(ep => ep.category).filter(Boolean))];
    return ['All', ...cats];
  }, [podcastEpisodes]);

  const filteredEpisodes = useMemo(() => {
    if (activeCategory === 'All') return podcastEpisodes;
    return podcastEpisodes.filter(ep => ep.category === activeCategory);
  }, [podcastEpisodes, activeCategory]);

  const handleGoBack = () => {
    router.push("/music");
  };

  const getProxiedImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(url)}`
      : url;
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-[#121212] font-youtube">
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 bg-transparent text-white border-none">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-white/10 hover:bg-white/20 text-white border-none rounded-full">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 pt-12 md:p-8 md:pt-20 relative z-10 flex flex-col items-center justify-center py-20 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-white" />
            <span className="text-sm font-semibold">Loading subscriptions...</span>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-[#121212] text-white font-youtube">
        
        {/* Header */}
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 bg-[#121212] text-white border-b border-white/5 w-full">
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-white/10 hover:bg-white/20 text-white rounded-full border-none">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <h2 className="text-base font-bold text-white select-none">
                YouTube
              </h2>
            </div>
            {/* Search button */}
            <button
              onClick={() => router.push("/music/youtube/search")}
              className="flex items-center gap-2 px-4 h-9 rounded-full bg-white/8 border border-white/10 hover:bg-white/14 transition-all text-white/60 hover:text-white text-sm font-semibold"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search YouTube</span>
            </button>
          </div>
        </header>

        <div className="flex-1 relative pb-36 px-0 md:px-8 pt-6">
          {followedPodcasts.length === 0 ? (
            /* Empty state / Onboarding */
            <div className="flex flex-col items-center justify-center py-24 text-center px-4 md:px-0">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-6 shadow-inner">
                <Search className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight max-w-sm">
                Search YouTube
              </h3>
              <p className="text-neutral-400 text-sm mt-2 max-w-xs font-semibold">
                Find videos, channels, and playlists to watch.
              </p>
              <Button
                onClick={() => router.push("/music/youtube/search")}
                className="mt-8 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm px-8 py-3 rounded-full shadow-lg transition-all active:scale-95"
              >
                Search YouTube
              </Button>
            </div>
          ) : (
            <div className="space-y-8 z-10 relative">
              
              {/* Followed Shows Grid with + Button */}
              <div className="px-4 md:px-0">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none">
                    Subscribed Channels
                  </h2>
                </div>
                <div className="flex items-center gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-3 max-w-full">
                  {followedPodcasts.map((show) => {
                    if (!show) return null;
                    return (
                      <div 
                        key={show.podcastId} 
                        className="relative w-20 sm:w-24 md:w-28 flex-shrink-0 aspect-square cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform group" 
                        onClick={() => router.push(`/music/youtube/${show.podcastId}`)}
                        title={show.podcastTitle}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden border border-white/10 shadow-md">
                          <img 
                            src={getProxiedImageUrl(show.coverImage)} 
                            alt={show.podcastTitle} 
                            className="w-full h-full object-cover animate-in fade-in duration-300" 
                            onError={(e) => {
                              e.target.src = '/default-playlist-image.png';
                            }}
                          />
                        </div>
                        {/* Blue Dot Badge on top-right to signify updates */}
                        {show.hasNewEpisodes && (
                          <span className="absolute top-[8%] right-[8%] w-3 h-3 bg-blue-500 rounded-full border-2 border-[#121212] z-10" />
                        )}
                      </div>
                    );
                  })}
                  <div 
                    onClick={() => router.push("/music/youtube/search")} 
                    className="w-20 sm:w-24 md:w-28 flex-shrink-0 aspect-square rounded-full border border-dashed border-white/20 bg-neutral-900/40 hover:bg-neutral-800/40 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <span className="text-xl sm:text-2xl text-neutral-400 font-light">+</span>
                  </div>
                </div>
              </div>

              {/* Latest Episodes Feed */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between px-4 md:px-0">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none">
                    Latest Videos
                  </h2>
                </div>

                {/* Category Filter Chips */}
                {categories.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1 px-4 md:px-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer select-none ${
                          activeCategory === cat
                            ? 'bg-green-500 text-black shadow-lg shadow-green-500/20 scale-105'
                            : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white border border-white/5'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                
                {filteredEpisodes.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500 text-sm px-4 md:px-0">
                    {activeCategory === 'All' ? 'No videos found.' : `No videos in "${activeCategory}".`}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
                    {filteredEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        onClick={() => router.push(`/music/youtube/watch/${episode.id}?showId=${episode.show?.id || ''}&showTitle=${encodeURIComponent(episode.show?.title || '')}`)}
                        className="group cursor-pointer select-none flex flex-col justify-between"
                      >
                        <div>
                          {/* Video aspect ratio image (Edge to edge on mobile, rounded on desktop) */}
                          <div className="relative w-full aspect-video rounded-none md:rounded-2xl overflow-hidden border-y md:border border-white/5 bg-[#181818]/60 shadow-[0_6px_20px_rgba(0,0,0,0.4)] active:scale-95 transition-transform duration-200">
                            <img 
                              src={`https://i.ytimg.com/vi/${episode.id}/maxresdefault.jpg`} 
                              alt={episode.title} 
                              className="w-full h-full object-cover animate-in fade-in duration-300"
                              loading="lazy"
                              onError={(e) => {
                                if (e.target.src.includes('maxresdefault.jpg')) {
                                  e.target.src = `https://i.ytimg.com/vi/${episode.id}/hqdefault.jpg`;
                                } else if (e.target.src.includes('hqdefault.jpg')) {
                                  e.target.src = episode.coverImage || episode.show.cover;
                                }
                              }}
                            />
                            {episode.duration && (
                              <span className="absolute bottom-3 right-3 bg-black/85 text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded border border-white/5 text-white">
                                {episode.duration}
                              </span>
                            )}
                          </div>

                          {/* Details Row (Indented px-2 on mobile, px-1.5 on desktop) */}
                          <div className="flex gap-3 mt-3.5 px-2 md:px-1.5">
                            {/* Creator avatar - clickable to channel */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/music/youtube/${episode.show?.id || ''}`);
                              }}
                              className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 shadow-sm bg-neutral-900 cursor-pointer hover:ring-2 hover:ring-green-500/50 transition-all"
                            >
                              <img 
                                src={getProxiedImageUrl(episode.show.cover)} 
                                alt={episode.show.title} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  e.target.src = '/default-playlist-image.png';
                                }}
                              />
                            </div>

                            {/* Details text */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-extrabold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-green-500 transition-colors">
                                {episode.title}
                              </h4>
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/music/youtube/${episode.show?.id || ''}`);
                                  }}
                                  className="text-neutral-400 hover:text-green-400 text-xs sm:text-sm font-semibold truncate max-w-[140px] cursor-pointer transition-colors"
                                >
                                  {episode.show.publisher || episode.show.title}
                                </span>
                                <span className="text-neutral-500 text-xs">•</span>
                                <span className="text-neutral-400 text-xs sm:text-sm font-medium truncate">
                                  {episode.views || "78K views"}
                                </span>
                                <span className="text-neutral-500 text-xs">•</span>
                                <span className="text-neutral-400 text-xs sm:text-sm font-medium truncate">
                                  {episode.published || "7 days ago"}
                                </span>
                              </div>
                            </div>

                            {/* More button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/music/youtube/watch/${episode.id}?showId=${episode.show?.id || ''}&showTitle=${encodeURIComponent(episode.show?.title || '')}`);
                              }}
                              className="text-neutral-400 hover:text-white p-1 hover:bg-white/5 rounded-full transition-colors shrink-0 self-start cursor-pointer"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}
