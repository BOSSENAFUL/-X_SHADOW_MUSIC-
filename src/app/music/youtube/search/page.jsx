"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, Loader2, ArrowLeft, ArrowUpLeft,
  MoreVertical, Clock, TrendingUp
} from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

/* ── Thumbnail with quality fallback ── */
function Thumb({ src, fallback, className, rounded = "rounded-xl" }) {
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => setImgSrc(src), [src]);
  return (
    <img
      src={imgSrc || fallback || "/default-playlist-image.png"}
      className={`${className} ${rounded} object-cover w-full h-full`}
      loading="lazy"
      onError={() => setImgSrc(fallback || "/default-playlist-image.png")}
      alt=""
    />
  );
}

/* ── Verified badge ── */
function Verified({ className = "w-3.5 h-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-white/50 inline shrink-0`}>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

/* ── Filter chip ── */
function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all
        ${active
          ? "bg-white text-black"
          : "bg-white/10 text-white/80 hover:bg-white/15"}
      `}
    >
      {label}
    </button>
  );
}

const FILTER_TABS = [
  { id: "all",      label: "All" },
  { id: "video",    label: "Videos" },
  { id: "channel",  label: "Channels" },

];

/* ─────────────────────────────────────────────
   Suggestion highlight: typed part = normal,
   extra part = bold  (YouTube's style)
───────────────────────────────────────────── */
function SuggestionHighlight({ full, typed }) {
  const lFull  = full.toLowerCase();
  const lTyped = typed.toLowerCase().trim();
  const idx    = lFull.indexOf(lTyped);
  if (idx === -1 || !lTyped) {
    return <span className="font-bold">{full}</span>;
  }
  const before = full.slice(0, idx);
  const match  = full.slice(idx, idx + lTyped.length);
  const after  = full.slice(idx + lTyped.length);
  return (
    <>
      {before && <span className="font-bold">{before}</span>}
      <span className="font-normal text-white/60">{match}</span>
      {after  && <span className="font-bold">{after}</span>}
    </>
  );
}

/* ═══════════════════════════════════════
   Main Component
═══════════════════════════════════════ */
function SearchContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [query,       setQuery]       = useState(sp?.get("q") || "");
  const [filter,      setFilter]      = useState(sp?.get("type") || "all");
  const [results,     setResults]     = useState({ videos: [], channels: [] });
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const continuationRef = useRef(null);
  const hasMoreRef      = useRef(false);
  const loadingMoreRef  = useRef(false);
  const observerRef     = useRef(null);

  /* ── Suggestion state ── */
  const [suggestions,    setSuggestions]    = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx,      setActiveIdx]      = useState(-1);
  const [sugLoading,     setSugLoading]     = useState(false);

  const inputRef         = useRef(null);
  const wrapperRef       = useRef(null);
  const sugDebounce      = useRef(null);
  const suppressSug      = useRef(false);
  const userInteractedRef = useRef(false);

  /* Auto-focus input only when there's no query (fresh page, not returning) */
  useEffect(() => { if (!sp?.get("q")) inputRef.current?.focus(); }, [sp]);

  /* Close suggestions on outside click */
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* Fetch suggestions as user types (debounced 220ms) */
  useEffect(() => {
    clearTimeout(sugDebounce.current);

    // If a suggestion was just picked, skip this one fetch cycle
    if (suppressSug.current) {
      suppressSug.current = false;
      return;
    }

    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIdx(-1);
      return;
    }
    setSugLoading(true);
    sugDebounce.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/yt-suggestions?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
          if (userInteractedRef.current) {
            setShowSuggestions((data.suggestions || []).length > 0);
          }
        }
      } catch (e) { console.error('Suggestion fetch failed:', e); }
      finally { setSugLoading(false); }
    }, 220);
    return () => clearTimeout(sugDebounce.current);
  }, [query]);

  /* Clear results when query wiped */
  useEffect(() => {
    if (!query.trim()) {
      setResults({ videos: [], channels: [] });
      setSearched(false);
      setLoading(false);
    }
  }, [query]);

  /* Re-run on filter change only if already searched */
  useEffect(() => {
    if (searched && query.trim()) runSearch(query, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  /* Auto-run search when URL has ?q= on first load */
  useEffect(() => {
    const q = sp?.get("q");
    if (q?.trim()) {
      setQuery(q);
      runSearch(q, filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Run full search ── */
  const runSearch = async (q, type) => {
    setShowSuggestions(false);
    setActiveIdx(-1);
    setLoading(true);
    setSearched(false);
    hasMoreRef.current = false;
    continuationRef.current = null;
    router.replace(`/music/youtube/search?q=${encodeURIComponent(q)}&type=${type}`, { scroll: false });
    try {
      const res  = await fetch(`/api/yt-search?q=${encodeURIComponent(q)}&type=${type}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results || { videos: [], channels: [] });
        continuationRef.current = data.continuationToken || null;
        hasMoreRef.current = !!data.continuationToken;
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  /* ── Load more (pagination) ── */
  const loadMore = useCallback(async () => {
    const token = continuationRef.current;
    if (!token || loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}&type=${filter}&continuation=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success) {
        setResults(prev => ({
          ...prev,
          videos: [...(prev.videos || []), ...(data.results?.videos || [])],
        }));
        continuationRef.current = data.continuationToken || null;
        hasMoreRef.current = !!data.continuationToken;
      }
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [query, filter]);

  /* ── IntersectionObserver for infinite scroll ── */
  const sentinelCallbackRef = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          loadMore();
        }
      }, { rootMargin: '400px' });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, [loadMore]);

  /* ── Pick a suggestion ── */
  const pickSuggestion = (sug) => {
    // Suppress the next suggestion fetch that would be triggered by setQuery
    suppressSug.current = true;
    clearTimeout(sugDebounce.current);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIdx(-1);
    setSugLoading(false);
    setQuery(sug);
    runSearch(sug, filter);
  };

  const clearQuery = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setResults({ videos: [], channels: [] });
    setSearched(false);
    router.replace("/music/youtube/search", { scroll: false });
    inputRef.current?.focus();
  };

  /* ── Keyboard navigation inside input ── */
  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveIdx(-1);
        return;
      }
      if (e.key === "Enter") {
        if (activeIdx >= 0 && suggestions[activeIdx]) {
          pickSuggestion(suggestions[activeIdx]);
          return;
        }
      }
    }
    if (e.key === "Enter" && query.trim()) {
      runSearch(query, filter);
    }
  };

  const goBack = () => router.push("/music/youtube");

  const watchVideo   = (id) => router.push(`/music/youtube/watch/${id}`);
  const openChannel  = (id) => router.push(`/music/youtube/${id}`);
  const totalResults = results.videos.length + results.channels.length;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#0f0f0f] text-white flex flex-col h-svh overflow-hidden">

        {/* ═══════════════════════════════
            STICKY HEADER + SEARCH BAR
        ═══════════════════════════════ */}
        <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-white/5">
          {/* Top row */}
          <div className="flex items-center gap-3 px-4 h-14">
            <SidebarTrigger className="hidden md:flex text-white/50 hover:text-white -ml-1" />
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-full flex items-center justify-center
                text-white/50 hover:text-white hover:bg-white/8 transition-all shrink-0"
            >
              <ArrowLeft className="w-[18px] h-[18px]" />
            </button>

            {/* ── Search bar + suggestions wrapper ── */}
            <div ref={wrapperRef} className="flex-1 relative">
              {/* Input row */}
              <div className={`flex items-center gap-2 bg-white/8 border px-4 h-10 transition-all
                ${ showSuggestions
                    ? "border-white/25 bg-white/10 md:rounded-t-2xl rounded-full md:rounded-b-none"
                    : "border-white/10 hover:border-white/20 hover:bg-white/10 rounded-full"
                }`}>
                <Search className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { userInteractedRef.current = true; setQuery(e.target.value); setActiveIdx(-1); }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { userInteractedRef.current = true; if (!suppressSug.current && suggestions.length > 0) setShowSuggestions(true); }}
                  inputMode="search"
                  enterKeyHint="search"
                  placeholder="Search YouTube…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35
                    focus:outline-none font-medium min-w-0"
                />
                {sugLoading && (
                  <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin shrink-0" />
                )}
                {query && !sugLoading && (
                  <button onClick={clearQuery} className="text-white/40 hover:text-white transition-colors shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* ── Suggestions dropdown ── */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="fixed md:absolute inset-x-0 md:left-0 md:right-0 top-14 md:top-full z-50
                  bg-[#0f0f0f] md:bg-[#212121] border-b md:border border-white/10 md:border-t-0 md:border-white/15
                  rounded-none md:rounded-b-2xl overflow-y-auto md:overflow-hidden
                  max-h-[calc(100vh-56px)] md:max-h-none
                  shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                  {suggestions.map((sug, idx) => (
                    // Use div instead of button to avoid nested button HTML error
                    <div
                      key={`${sug}-${idx}`}
                      onMouseDown={(e) => { e.preventDefault(); pickSuggestion(sug); }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      role="option"
                      aria-selected={idx === activeIdx}
                      className={`w-full flex items-center gap-3 px-4 py-3 md:py-2.5 cursor-pointer
                        transition-colors group select-none
                        ${ idx === activeIdx ? "bg-white/10" : "hover:bg-white/5" }`}
                    >
                      {/* Icon */}
                      <Search className="w-4 h-4 text-white/30 shrink-0" />

                      {/* Text: highlight the typed portion */}
                      <span className="flex-1 text-sm md:text-[13.5px] font-medium text-white/85 truncate">
                        <SuggestionHighlight full={sug} typed={query} />
                      </span>

                      {/* Arrow-fill icon — fills search bar without searching */}
                      <span
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setQuery(sug);
                          setActiveIdx(-1);
                          setShowSuggestions(false);
                          inputRef.current?.focus();
                        }}
                        className="opacity-60 md:opacity-0 md:group-hover:opacity-100 w-8 h-8 flex items-center
                          justify-center text-white/40 hover:text-white/80 hover:bg-white/5 md:hover:bg-transparent rounded-full transition-all shrink-0"
                        title="Fill into search bar"
                      >
                        <ArrowUpLeft className="w-4 h-4" />
                      </span>
                    </div>
                  ))}

                  {/* Footer divider */}
                  <div className="h-px bg-white/8 mx-4" />
                  <div className="px-4 py-2 flex justify-end">
                    <span className="text-[10px] text-white/20 font-semibold select-none">
                      Powered by YouTube
                    </span>
                  </div>
                </div>
              )}
            </div>{/* end wrapper */}

            {/* Search button */}
            <button
              onClick={() => query.trim() && runSearch(query, filter)}
              className="hidden sm:flex w-10 h-10 rounded-full bg-white/8 border border-white/10
                hover:bg-white/15 items-center justify-center
                text-white/60 hover:text-white transition-all shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto
            [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {FILTER_TABS.map((tab) => (
              <Chip
                key={tab.id}
                label={tab.label}
                active={filter === tab.id}
                onClick={() => setFilter(tab.id)}
              />
            ))}
          </div>
        </header>

        {/* ═══════════════════════════════
            CONTENT
        ═══════════════════════════════ */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Centered container — matches YouTube's search layout */}
          <div className="max-w-[1200px] mx-auto w-full">

          {/* Empty / pre-search state */}
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-white/30 px-6">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-white/50 mb-1">Search YouTube</p>
                <p className="text-sm">Find videos and channels</p>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && query.trim() && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              <p className="text-sm text-white/35 font-semibold">Searching…</p>
            </div>
          )}

          {/* No results */}
          {!loading && searched && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-white/30 px-6 text-center">
              <Search className="w-10 h-10" />
              <p className="text-base font-semibold text-white/40">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-sm">Try different keywords or check the spelling</p>
            </div>
          )}

          {/* ─── ALL TAB ─── */}
          {!loading && searched && filter === "all" && totalResults > 0 && (
            <div className="space-y-0">

              {/* Videos section */}
              {results.videos.length > 0 && (
                <section>
                  <VideoList
                    videos={results.videos}
                    onWatch={watchVideo}
                    onChannel={openChannel}
                  />
                </section>
              )}


            </div>
          )}

          {/* ─── VIDEOS TAB ─── */}
          {!loading && searched && filter === "video" && (
            <VideoList
              videos={results.videos}
              onWatch={watchVideo}
              onChannel={openChannel}
            />
          )}

          {/* ─── CHANNELS TAB ─── */}
          {!loading && searched && filter === "channel" && (
            <ChannelList
              channels={results.channels}
              onOpen={openChannel}
              layout="list"
            />
          )}

          {/* Infinite scroll sentinel */}
          {searched && !loading && (
            <div ref={sentinelCallbackRef} className="h-16 flex items-center justify-center">
              {loadingMore && (
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              )}
            </div>
          )}

          </div>{/* end centered container */}
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}

export default function YoutubeSearchPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#0f0f0f] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

/* ══════════════════════════════════════════════
   VIDEO LIST  – YouTube-style tall card list
══════════════════════════════════════════════ */
function VideoList({ videos, onWatch, onChannel, limit }) {
  const list = limit ? videos.slice(0, limit) : videos;
  if (!list.length) return null;

  return (
    <div className="divide-y divide-white/[0.04]">
      {list.map((v) => (
        <VideoCard key={v.id} video={v} onWatch={onWatch} onChannel={onChannel} />
      ))}
    </div>
  );
}

/* ── View count formatter ── */
const formatViews = (viewsStr) => {
  if (!viewsStr) return "";
  if (/[KMkm]/.test(viewsStr) && !/,/.test(viewsStr)) {
    return viewsStr;
  }
  const cleanStr = viewsStr.replace(/,/g, "");
  const numMatch = cleanStr.match(/\d+/);
  if (!numMatch) return viewsStr;
  const num = parseInt(numMatch[0], 10);
  if (isNaN(num)) return viewsStr;

  let formatted = "";
  if (num >= 1000000000) {
    formatted = (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  } else if (num >= 1000000) {
    const val = num / 1000000;
    formatted = (val >= 10 ? Math.round(val) : val.toFixed(1)) + "M";
  } else if (num >= 1000) {
    const val = num / 1000;
    formatted = (val >= 10 ? Math.round(val) : val.toFixed(1)) + "K";
  } else {
    formatted = num.toString();
  }
  return `${formatted} views`;
};

function VideoCard({ video, onWatch, onChannel }) {
  return (
    <div
      className="group flex flex-col sm:flex-row gap-0 sm:gap-3 cursor-pointer
        hover:bg-white/[0.03] transition-colors"
      onClick={() => onWatch(video.id)}
    >
      {/* Thumbnail — 360px wide on desktop, full-width on mobile */}
      <div className="relative w-full sm:w-[360px] sm:min-w-[360px] lg:w-[480px] lg:min-w-[480px] 2xl:w-[560px] 2xl:min-w-[560px] aspect-video
        overflow-hidden bg-neutral-900 sm:rounded-xl sm:my-3 sm:ml-4">
        <Thumb
          src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          fallback={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          className=""
          rounded="rounded-none sm:rounded-xl"
        />
        {video.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-xs
            font-medium px-1 py-0.5 rounded text-white leading-none tracking-wide">
            {video.duration}
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex gap-3 px-3.5 py-3.5 sm:py-2.5 sm:px-0 sm:pr-3 flex-1 min-w-0">
        {/* Avatar (Left side on both mobile & desktop) */}
        <div
          className="w-9 h-9 sm:w-8 sm:h-8 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full overflow-hidden shrink-0
            bg-neutral-800 mt-0.5 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); video.authorId && onChannel(video.authorId); }}
        >
          {video.authorAvatar ? (
            <Thumb src={video.authorAvatar} className="" rounded="rounded-full" />
          ) : (
            <div className="w-full h-full bg-neutral-700 flex items-center justify-center
              text-[11px] lg:text-xs 2xl:text-sm font-bold text-white">
              {video.author?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm lg:text-base 2xl:text-lg font-semibold text-white line-clamp-2 leading-snug">
              {video.title}
            </h3>
            {/* More / Option */}
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 lg:w-8 lg:h-8 rounded-full hover:bg-white/8 flex items-center justify-center
                text-white/40 hover:text-white/70 transition-all shrink-0 -mt-0.5"
            >
              <MoreVertical className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </button>
          </div>

          <div className="text-[12px] sm:text-[11.5px] lg:text-[13px] 2xl:text-[14px] text-white/50 font-normal sm:font-medium mt-1 flex items-center gap-1.5 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                video.authorId && onChannel(video.authorId);
              }}
              className="hover:text-white transition-colors truncate max-w-[180px] lg:max-w-[240px]"
            >
              {video.author}
            </button>
            {video.authorVerified && <Verified className="w-3 h-3 lg:w-3.5 lg:h-3.5" />}
            
            <span>·</span>
            
            {video.viewCount && <span>{formatViews(video.viewCount)}</span>}
            {video.viewCount && video.published && <span>·</span>}
            {video.published && <span>{video.published}</span>}
          </div>

          {video.description && (
            <p className="text-[11.5px] lg:text-[13px] 2xl:text-[14px] text-white/28 mt-2 line-clamp-2 leading-relaxed hidden sm:block">
              {video.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════
   CHANNEL LIST
══════════════════════════════════════════════ */
function ChannelList({ channels, onOpen, layout }) {
  if (!channels.length) return (
    <p className="py-12 text-center text-sm text-white/30">No channels found</p>
  );

  if (layout === "row") {
    return (
      <div className="flex gap-5 overflow-x-auto px-4 md:px-0
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2">
        {channels.slice(0, 8).map((ch) => (
          <ChannelPillCard key={ch.id} channel={ch} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.04]">
      {channels.map((ch) => (
        <ChannelRowCard key={ch.id} channel={ch} onOpen={onOpen} />
      ))}
    </div>
  );
}

function ChannelPillCard({ channel, onOpen }) {
  return (
    <div
      onClick={() => onOpen(channel.id)}
      className="flex flex-col items-center gap-2 w-24 shrink-0 cursor-pointer group"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-800
        group-hover:ring-2 group-hover:ring-white/20 transition-all">
        <Thumb src={channel.thumbnail} className="" rounded="rounded-full" />
      </div>
      <span className="text-xs font-semibold text-white/70 text-center line-clamp-2 leading-snug group-hover:text-white transition-colors">
        {channel.title}
      </span>
      {channel.subscriberCount && (
        <span className="text-[10px] text-white/35 -mt-1">{channel.subscriberCount}</span>
      )}
    </div>
  );
}

function ChannelRowCard({ channel, onOpen }) {
  return (
    <div
      onClick={() => onOpen(channel.id)}
      className="flex items-center gap-4 px-4 py-4 hover:bg-white/[0.03]
        transition-colors cursor-pointer group"
    >
      {/* Avatar */}
      <div className="w-[88px] h-[88px] rounded-full overflow-hidden bg-neutral-800 shrink-0
        group-hover:ring-2 group-hover:ring-white/15 transition-all">
        <Thumb src={channel.thumbnail} className="" rounded="rounded-full" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[15px] font-bold text-white line-clamp-1 group-hover:underline">
            {channel.title}
          </h3>
          {channel.verified && <Verified className="w-4 h-4" />}
        </div>
        {channel.handle && (
          <p className="text-sm text-white/40 font-medium mt-0.5">{channel.handle}</p>
        )}
        <div className="flex items-center gap-2 text-[12.5px] text-white/35 font-medium mt-1 flex-wrap">
          {channel.subscriberCount && <span>{channel.subscriberCount} subscribers</span>}
          {channel.subscriberCount && channel.videoCount && <span>·</span>}
          {channel.videoCount && <span>{channel.videoCount} videos</span>}
        </div>
        {channel.description && (
          <p className="text-[12px] text-white/28 mt-1.5 line-clamp-2 leading-relaxed">
            {channel.description}
          </p>
        )}
      </div>

      {/* Subscribe button */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpen(channel.id); }}
        className="shrink-0 bg-white hover:bg-neutral-200 text-black font-bold
          text-xs px-4 py-2 rounded-full transition-all active:scale-95 hidden sm:block"
      >
        View
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PLAYLIST LIST
══════════════════════════════════════════════ */

