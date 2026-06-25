"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, User, Mic, Play, MoreVertical } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export default function PodcastsDashboardPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [followedPodcasts, setFollowedPodcasts] = useState([]);
  const [podcastEpisodes, setPodcastEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect if unauthenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/music/podcasts");
    }
  }, [sessionStatus, router]);

  // Load followed podcasts and compile chronological latest episodes feed
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/podcasts/follow");
        const data = await res.json();
        if (data.success && data.results.length > 0) {
          const promises = data.results.map(podcast =>
            fetch(`/api/podcasts/episodes?playlistId=${podcast.podcastId}`)
              .then(r => r.json())
              .catch(e => ({ success: false, error: e.message }))
          );

          const epResults = await Promise.all(promises);

          // Map shows with hasNewEpisodes status (under 7 days/1 week)
          const updatedShows = data.results.map((show, idx) => {
            const epData = epResults[idx];
            let hasNewEpisodes = false;
            if (epData && epData.success && epData.episodes && epData.episodes.length > 0) {
              const latestEp = epData.episodes[0]; // Newest first
              const published = (latestEp.published || "").toLowerCase();
              if (
                published.includes("hour") ||
                published.includes("minute") ||
                published.includes("second") ||
                published.includes("day") ||
                published.includes("today") ||
                published.includes("yesterday") ||
                published.includes("1 week") ||
                published.includes("7 days") ||
                published.includes("6 days") ||
                published.includes("5 days") ||
                published.includes("4 days") ||
                published.includes("3 days") ||
                published.includes("2 days")
              ) {
                hasNewEpisodes = true;
              }
            }
            // Use resolved authorImage from backend if available
            const authorImage = epData?.success && epData?.playlist?.authorImage 
              ? epData.playlist.authorImage 
              : show.coverImage;

            return {
              ...show,
              coverImage: authorImage,
              hasNewEpisodes
            };
          });

          setFollowedPodcasts(updatedShows);

          // Compile chronological feed of latest episodes (3 from each show)
          let allEpisodes = [];
          epResults.forEach((epData, idx) => {
            if (epData.success) {
              const show = updatedShows[idx];
              const eps = (epData.episodes || []).slice(0, 3).map(ep => ({
                ...ep,
                show: {
                  id: show.podcastId,
                  title: show.podcastTitle,
                  cover: show.coverImage,
                  publisher: show.publisher
                }
              }));
              allEpisodes = [...allEpisodes, ...eps];
            }
          });

          // Sort chronologically (newest first) using relative date weight
          const getRelativeWeight = (publishedStr) => {
            if (!publishedStr) return Infinity;
            const str = publishedStr.toLowerCase();
            let value = parseFloat(str) || 1;
            if (str.includes('second')) return value;
            if (str.includes('minute')) return value * 60;
            if (str.includes('hour')) return value * 3600;
            if (str.includes('day')) return value * 86400;
            if (str.includes('week')) return value * 86400 * 7;
            if (str.includes('month')) return value * 86400 * 30;
            if (str.includes('year')) return value * 86400 * 365;
            if (str.includes('today') || str.includes('now')) return 0;
            if (str.includes('yesterday')) return 86400;
            return Infinity;
          };

          allEpisodes.sort((a, b) => getRelativeWeight(a.published) - getRelativeWeight(b.published));

          setPodcastEpisodes(allEpisodes);
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
            <span className="text-sm font-semibold">Loading podcasts dashboard...</span>
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
                Podcasts
              </h2>
            </div>
          </div>
        </header>

        <div className="flex-1 relative pb-36 px-0 md:px-8 pt-6">
          {followedPodcasts.length === 0 ? (
            /* Empty state / Onboarding */
            <div className="flex flex-col items-center justify-center py-24 text-center px-4 md:px-0">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-6 shadow-inner">
                <Mic className="w-10 h-10 text-neutral-400" />
              </div>
              <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight max-w-sm">
                You haven&apos;t followed any podcasts
              </h3>
              <p className="text-neutral-400 text-sm mt-2 max-w-xs font-semibold">
                Follow your favorites to stay up to date.
              </p>
              <Button
                onClick={() => router.push("/music/podcasts/choose")}
                className="mt-8 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm px-8 py-3 rounded-full shadow-lg transition-all active:scale-95"
              >
                Browse podcasts
              </Button>
            </div>
          ) : (
            <div className="space-y-8 z-10 relative">
              
              {/* Followed Shows Grid with + Button */}
              <div className="px-4 md:px-0">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none">
                    Your Shows
                  </h2>
                  <button 
                    onClick={() => router.push("/music/podcasts/choose")}
                    className="text-xs sm:text-sm font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Edit shows
                  </button>
                </div>
                <div className="flex items-center gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-3 max-w-full">
                  {followedPodcasts.map((show) => {
                    if (!show) return null;
                    return (
                      <div 
                        key={show.podcastId} 
                        className="relative w-20 sm:w-24 md:w-28 flex-shrink-0 aspect-square cursor-pointer hover:scale-[1.03] active:scale-95 transition-transform group" 
                        onClick={() => router.push(`/music/podcasts/${show.podcastId}`)}
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
                    onClick={() => router.push("/music/podcasts/choose")} 
                    className="w-20 sm:w-24 md:w-28 flex-shrink-0 aspect-square rounded-full border border-dashed border-white/20 bg-neutral-900/40 hover:bg-neutral-800/40 flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  >
                    <span className="text-xl sm:text-2xl text-neutral-400 font-light">+</span>
                  </div>
                </div>
              </div>

              {/* Latest Episodes Feed */}
              <div className="space-y-6 pt-2">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none px-4 md:px-0">
                  Latest episodes
                </h2>
                
                {podcastEpisodes.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500 text-sm px-4 md:px-0">
                    No episodes found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
                    {podcastEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        onClick={() => router.push(`/music/podcasts/watch/${episode.id}?showId=${episode.show?.id || ''}&showTitle=${encodeURIComponent(episode.show?.title || '')}`)}
                        className="group cursor-pointer select-none flex flex-col justify-between"
                      >
                        <div>
                          {/* Video aspect ratio image (Edge to edge on mobile, rounded on desktop) */}
                          <div className="relative w-full aspect-video rounded-none md:rounded-2xl overflow-hidden border-y md:border border-white/5 bg-[#181818]/60 shadow-[0_6px_20px_rgba(0,0,0,0.4)] group-hover:scale-[1.01] active:scale-95 transition-transform duration-200">
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
                            {/* Creator avatar avatar */}
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 shadow-sm bg-neutral-900">
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
                              <p className="text-neutral-400 text-xs sm:text-sm font-medium truncate mt-1">
                                {episode.show.publisher || episode.show.title} • {episode.views || "78K views"} • {episode.published || "7 days ago"}
                              </p>
                            </div>

                            {/* More button */}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/music/podcasts/watch/${episode.id}?showId=${episode.show?.id || ''}&showTitle=${encodeURIComponent(episode.show?.title || '')}`);
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
