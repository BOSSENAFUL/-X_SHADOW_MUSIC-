"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export default function PodcastWatchPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = use(paramsPromise);
  const searchParams = use(searchParamsPromise);
  const videoId = params.id;
  const showId = searchParams?.showId;
  const showTitle = searchParams?.showTitle;
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  
  const [videoData, setVideoData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const getProxiedImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(url)}`
      : url;
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/music/podcasts/watch/${videoId}`);
    }
  }, [sessionStatus, router, videoId]);

  // Fetch video details and recommendations
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !videoId) return;

    async function fetchDetails() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/podcasts/details?videoId=${videoId}`);
        const data = await res.json();
        
        if (data.success) {
          setVideoData(data.video);
          setRecommendations(data.recommendations);
        } else {
          setError(data.error || "Failed to fetch video details");
        }
      } catch (err) {
        console.error("Error fetching details:", err);
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [sessionStatus, videoId]);

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
          <h2 className="text-xl font-bold text-red-500 mb-2">Error Loading Podcast</h2>
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
                  if (showId) {
                    router.push(`/music/podcasts/${showId}`);
                  } else {
                    router.push("/music/podcasts");
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
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
                title={videoData.title}
                className="absolute top-0 left-0 w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Episode Title & Parent Show Navigation */}
            <div className="px-1 select-text">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
                {videoData.title}
              </h1>
              {showTitle && showId && (
                <button
                  onClick={() => router.push(`/music/podcasts/${showId}`)}
                  className="text-xs sm:text-sm font-extrabold text-green-500 hover:text-green-400 transition-colors mt-2 block select-none text-left"
                >
                  From the show: {decodeURIComponent(showTitle)}
                </button>
              )}
            </div>

            {/* Creator details row */}
            <div className="flex items-center gap-3 py-3 border-y border-white/5 px-1">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-neutral-900 shadow-inner">
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
                <h3 className="font-extrabold text-sm leading-tight truncate text-neutral-200">
                  {videoData.channel.name}
                </h3>
                <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
                  Creator / Publisher
                </p>
              </div>
            </div>

            {/* Description Section (Expandable box style) */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-xs sm:text-sm text-neutral-300 space-y-2 select-text shadow-sm">
              <div className="flex items-center gap-3 font-extrabold text-white text-[11px] sm:text-xs">
                <span>{formattedViews} views</span>
                <span className="w-1 h-1 bg-neutral-600 rounded-full" />
                <span>Podcast Episode</span>
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

          {/* Right Column (Related recommendations) */}
          <div className="lg:col-span-1 mt-8 lg:mt-0 space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold px-1 mb-4 select-none">
              Up Next
            </h2>
            
            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <div className="text-neutral-500 text-xs sm:text-sm py-8 text-center border border-white/5 rounded-xl">
                  No recommended episodes found.
                </div>
              ) : (
                recommendations.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => router.push(`/music/podcasts/watch/${item.id}?showId=${showId || ''}&showTitle=${encodeURIComponent(showTitle || '')}`)}
                    className="bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] p-2.5 rounded-xl flex gap-3 cursor-pointer transition-colors group"
                  >
                    <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 border border-white/5 shadow-sm">
                      <img 
                        src={`https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.target.src = item.coverImage || "/default-playlist-image.png";
                        }}
                      />
                      {item.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/85 text-[10px] font-extrabold px-1 py-0.5 rounded border border-white/5">
                          {item.duration}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <h4 className="text-white font-bold text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-green-500 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 font-medium truncate mt-1">
                        {item.author || videoData.channel.name}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-medium truncate mt-0.5">
                        {item.views ? `${item.views} • ` : ''}{item.published}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}
