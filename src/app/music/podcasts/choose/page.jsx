"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, Music2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ALL_PODCASTS = [
  {
    id: "just-wucka",
    title: "Just Wucka",
    cover: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=300&h=300&fit=crop",
    category: "Self-help"
  },
  {
    id: "anime-grind",
    title: "Anime Grind",
    cover: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&h=300&fit=crop",
    category: "Self-help"
  },
  {
    id: "chainsfr",
    title: "ChainsFR On Spotify",
    cover: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop",
    category: "Comedy"
  },
  {
    id: "distractible",
    title: "Distractible",
    cover: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop",
    category: "Comedy"
  },
  {
    id: "trust-me-bro",
    title: "Trust Me Bro",
    cover: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&h=300&fit=crop",
    category: "Culture"
  },
  {
    id: "trash-taste",
    title: "Trash Taste Podcast",
    cover: "https://images.unsplash.com/photo-1601987177651-8edfe6c20009?w=300&h=300&fit=crop",
    category: "Culture"
  },
  {
    id: "weekly-motivation",
    title: "Weekly Motivation by Ben Lionel Scott",
    cover: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop",
    category: "Educational"
  },
  {
    id: "figuring-out",
    title: "Raj Shamani's Figuring Out",
    cover: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop",
    category: "Educational"
  },
  {
    id: "mindset-meditation",
    title: "The Mindset Meditation Podcast",
    cover: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&h=300&fit=crop",
    category: "Health"
  },
  {
    id: "at-podcast",
    title: "AT Podcast",
    cover: "https://images.unsplash.com/photo-1610116306796-6fea9f4fae38?w=300&h=300&fit=crop",
    category: "Health"
  },
  {
    id: "mrballen",
    title: "MrBallen Podcast: Strange, Dark & Mysterious Stories",
    cover: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=300&h=300&fit=crop",
    category: "True crime"
  },
  {
    id: "true-story-rwj",
    title: "True Story Podcast Ray William Johnson",
    cover: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=300&fit=crop",
    category: "True crime"
  }
];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Load initially followed podcasts from localStorage
  useEffect(() => {
    try {
      const followed = localStorage.getItem("followed_podcasts");
      if (followed) {
        setSelectedIds(JSON.parse(followed));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      
      // Save instantly
      try {
        localStorage.setItem("followed_podcasts", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleDone = () => {
    // Navigate back to Home
    router.push("/music");
  };

  // Filter shows by query
  const filteredShows = ALL_PODCASTS.filter((show) =>
    show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    show.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by category to construct the 3-column rows (2 shows + 1 category)
  const renderGrid = () => {
    return CATEGORIES.map((cat) => {
      // Find podcasts belonging to this category
      const showsInCat = filteredShows.filter((show) => show.category === cat.name);
      
      // If we filtered and there are no shows in this category, we can skip it
      if (showsInCat.length === 0) return null;

      // Slice to first 2 shows
      const displayShows = showsInCat.slice(0, 2);

      return (
        <div key={cat.name} className="grid grid-cols-3 gap-4 mb-8">
          {/* Podcast Show 1 */}
          {displayShows[0] ? (
            <div
              onClick={() => toggleSelect(displayShows[0].id)}
              className="flex flex-col items-center cursor-pointer select-none group"
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-white/5 shadow-md transition-transform duration-200 hover:scale-[1.03] active:scale-95">
                <img
                  src={displayShows[0].cover}
                  alt={displayShows[0].title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selectedIds.includes(displayShows[0].id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border border-black/10 z-10 scale-90 sm:scale-100">
                    <Check className="w-4 h-4 text-black stroke-[3]" />
                  </div>
                )}
              </div>
              <span className="text-white text-xs font-bold text-center mt-2 line-clamp-2 leading-snug px-1 max-w-full">
                {displayShows[0].title}
              </span>
            </div>
          ) : (
            <div className="w-full aspect-square bg-neutral-900/40 rounded-lg border border-white/5 flex items-center justify-center">
              <Music2 className="w-6 h-6 text-neutral-700" />
            </div>
          )}

          {/* Podcast Show 2 */}
          {displayShows[1] ? (
            <div
              onClick={() => toggleSelect(displayShows[1].id)}
              className="flex flex-col items-center cursor-pointer select-none group"
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-white/5 shadow-md transition-transform duration-200 hover:scale-[1.03] active:scale-95">
                <img
                  src={displayShows[1].cover}
                  alt={displayShows[1].title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selectedIds.includes(displayShows[1].id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border border-black/10 z-10 scale-90 sm:scale-100">
                    <Check className="w-4 h-4 text-black stroke-[3]" />
                  </div>
                )}
              </div>
              <span className="text-white text-xs font-bold text-center mt-2 line-clamp-2 leading-snug px-1 max-w-full">
                {displayShows[1].title}
              </span>
            </div>
          ) : (
            <div className="w-full aspect-square bg-neutral-900/40 rounded-lg border border-white/5 flex items-center justify-center">
              <Music2 className="w-6 h-6 text-neutral-700" />
            </div>
          )}

          {/* Category block */}
          <div
            className={`w-full aspect-square rounded-lg flex items-center justify-center p-3 text-center bg-gradient-to-br ${cat.gradient} border border-white/5 shadow-md select-none`}
          >
            <span className="font-extrabold text-white text-[11px] sm:text-xs tracking-tight leading-tight select-none">
              More in {cat.name}
            </span>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white pb-32">
      <div className="max-w-md mx-auto px-4 md:px-6 pt-12">
        <h1 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-white mb-3 select-none">
          Choose podcasts
        </h1>

        {/* Search Input */}
        <div className="relative mb-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white text-black text-sm font-semibold rounded-md border-none focus:outline-none focus:ring-0 placeholder:text-neutral-500 shadow-sm"
          />
        </div>

        {/* Categories / Shows grid */}
        <div className="space-y-2">
          {renderGrid()}
        </div>
      </div>

      {/* Done Button floating at the bottom */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <button
          onClick={handleDone}
          className="pointer-events-auto bg-white hover:bg-neutral-200 text-black font-extrabold text-sm px-12 py-3.5 rounded-full shadow-2xl hover:scale-[1.03] active:scale-95 transition-all select-none"
        >
          Done
        </button>
      </div>
    </div>
  );
}
