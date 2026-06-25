"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, Check, Music2, Loader2, ArrowLeft } from "lucide-react";

const CATEGORIES = [
  { name: "Self-help", gradient: "from-pink-500 to-rose-600" },
  { name: "Comedy", gradient: "from-slate-600 to-zinc-700" },
  { name: "Culture", gradient: "from-amber-700 to-yellow-800" },
  { name: "Educational", gradient: "from-teal-700 to-emerald-800" },
  { name: "Health", gradient: "from-green-700 to-emerald-900" },
  { name: "True crime", gradient: "from-red-800 to-rose-950" }
];

export default function ChoosePodcastsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [podcasts, setPodcasts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/music/podcasts/choose");
    }
  }, [sessionStatus, router]);

  // Load featured podcasts and followed podcasts from APIs
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    async function loadData() {
      try {
        setLoading(true);
        // Fetch featured onboarding podcasts
        const featuredRes = await fetch("/api/podcasts/featured");
        const featuredData = await featuredRes.json();
        
        if (featuredData.success) {
          setPodcasts(featuredData.results);
        }

        // Fetch user's currently followed podcasts
        const followRes = await fetch("/api/podcasts/follow");
        const followData = await followRes.json();
        if (followData.success) {
          const followedIds = followData.results.map(item => item.podcastId);
          setSelectedIds(followedIds);
        }
      } catch (e) {
        console.error("Failed to load podcasts data:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sessionStatus]);

  const toggleSelect = async (show) => {
    const showId = show.playlistId;
    
    // Optimistic UI update
    setSelectedIds((prev) =>
      prev.includes(showId) ? prev.filter((id) => id !== showId) : [...prev, showId]
    );

    try {
      const res = await fetch("/api/podcasts/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          podcastId: showId,
          podcastTitle: show.title,
          publisher: show.publisher,
          coverImage: show.coverImage,
        }),
      });
      
      const data = await res.json();
      if (!data.success) {
        // Rollback on failure
        setSelectedIds((prev) =>
          prev.includes(showId) ? prev.filter((id) => id !== showId) : [...prev, showId]
        );
      }
    } catch (e) {
      console.error("Error toggling follow state:", e);
      // Rollback on network failure
      setSelectedIds((prev) =>
        prev.includes(showId) ? prev.filter((id) => id !== showId) : [...prev, showId]
      );
    }
  };

  const handleDone = () => {
    router.push("/music/podcasts");
  };

  const handleGoBack = () => {
    router.push("/music/podcasts");
  };

  // Filter shows by query
  const filteredShows = podcasts.filter((show) =>
    show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    show.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category and render in responsive grid
  const renderGrid = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-neutral-200" />
          <span className="text-sm font-semibold">Loading podcasts...</span>
        </div>
      );
    }

    if (filteredShows.length === 0) {
      return (
        <div className="text-center py-24 text-neutral-500 text-sm">
          No podcasts found matching &quot;{searchQuery}&quot;
        </div>
      );
    }

    return CATEGORIES.map((cat) => {
      // Find podcasts belonging to this category
      const showsInCat = filteredShows.filter((show) => show.category === cat.name);
      
      // If we filtered and there are no shows in this category, we can skip it
      if (showsInCat.length === 0) return null;

      return (
        <div key={cat.name} className="mb-10 sm:mb-14">
          <h2 className="text-base sm:text-lg font-bold text-neutral-300 mb-4 select-none flex items-center gap-2">
            <span className={`w-1 h-5 rounded bg-gradient-to-b ${cat.gradient}`} />
            {cat.name}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6">
            {/* Category block as the first item */}
            <div
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center p-3 sm:p-4 text-center bg-gradient-to-br ${cat.gradient} border border-white/10 shadow-lg select-none relative overflow-hidden group`}
            >
              <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-white/40 mb-2 stroke-[1.5]" />
              <span className="font-extrabold text-white text-[10px] sm:text-xs tracking-tight leading-tight select-none">
                {cat.name}
              </span>
            </div>

            {/* Podcast Shows */}
            {showsInCat.map((show) => {
              const isSelected = selectedIds.includes(show.playlistId);
              return (
                <div
                  key={show.playlistId}
                  onClick={() => toggleSelect(show)}
                  className="flex flex-col items-center cursor-pointer select-none group relative"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-white/5 shadow-md transition-all duration-300 group-hover:scale-[1.04] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-95">
                    <img
                      src={show.coverImage}
                      alt={show.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = '/default-playlist-image.png';
                      }}
                    />
                    
                    {/* Dark selection overlay and checkmark badge */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all duration-300 animate-fade-in">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-green-500 rounded-full flex items-center justify-center shadow-lg border border-green-400/20 scale-100 animate-in zoom-in-50 duration-200">
                          <Check className="w-5 h-5 sm:w-6 sm:h-6 text-black stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <span className="text-neutral-200 text-[11px] sm:text-xs font-bold text-center mt-2.5 line-clamp-2 leading-snug px-1 max-w-full group-hover:text-white transition-colors duration-200">
                    {show.title}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-neutral-500 font-medium text-center line-clamp-1 mt-0.5 max-w-full">
                    {show.publisher || 'Creator'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Header bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 sm:mb-12">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoBack}
              className="w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white select-none">
                Choose podcasts
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 select-none mt-0.5">
                Select your favorite channels to customize your feed
              </p>
            </div>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search shows or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-neutral-900 text-white text-sm font-medium rounded-full border border-neutral-800 focus:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-700 placeholder:text-neutral-500 shadow-inner transition-colors"
            />
          </div>
        </div>

        {/* Podcast rows */}
        <div className="space-y-4">
          {renderGrid()}
        </div>
      </div>

      {/* Done Button floating at the bottom */}
      <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <button
          onClick={handleDone}
          className="pointer-events-auto bg-green-500 hover:bg-green-400 text-black font-extrabold text-base px-16 py-4 rounded-full shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:scale-[1.04] active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-green-400/20"
        >
          Done
        </button>
      </div>
    </div>
  );
}
