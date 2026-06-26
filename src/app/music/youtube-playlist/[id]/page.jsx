"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Play, Share2, ListMusic, Clock, Eye
} from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { toast } from "sonner";

function YtThumb({ videoId, coverImage, className = "" }) {
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
      className={`${className} object-cover w-full h-full`}
      loading="lazy"
      onError={() => {
        if (fbIdx < fallbacks.length) {
          setSrc(fallbacks[fbIdx]);
          setFbIdx((i) => i + 1);
        }
      }}
    />
  );
}

async function extractDominantColor(imageUrl) {
  const finalUrl = imageUrl?.startsWith("http")
    ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
    : imageUrl;

  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve("rgb(30,30,30)");
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const counts = {};
        for (let i = 0; i < data.length; i += 40) {
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          const bright = (r + g + b) / 3;
          if (bright < 40 || bright > 220) continue;
          if (Math.max(r, g, b) - Math.min(r, g, b) < 30) continue;
          const key = `${Math.round(r / 10) * 10},${Math.round(g / 10) * 10},${Math.round(b / 10) * 10}`;
          counts[key] = (counts[key] || 0) + 1;
        }
        let best = "40,40,40";
        let max = 0;
        for (const [k, v] of Object.entries(counts)) {
          if (v > max) { max = v; best = k; }
        }
        resolve(`rgb(${best})`);
      } catch { resolve("rgb(40,40,40)"); }
    };
    img.onerror = () => resolve("rgb(40,40,40)");
    img.src = finalUrl;
  });
}

function formatCount(n) {
  if (!n) return "";
  const num = parseInt(n.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return n;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return n;
}

export default function YoutubePlaylistPage({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const params = use(paramsPromise);
  const searchParamsObj = use(searchParamsPromise);
  const playlistId = params.id;
  const showId = searchParamsObj?.showId || "";

  const router = useRouter();

  const [playlist, setPlaylist] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [color, setColor] = useState("rgb(30,30,30)");

  useEffect(() => {
    if (!playlistId) return;
    fetch(`/api/youtube/episodes?playlistId=${playlistId}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data.success) {
          setPlaylist(data.playlist);
          setEpisodes(data.episodes || []);
          if (data.playlist?.coverImage) {
            const c = await extractDominantColor(data.playlist.coverImage).catch(() => "rgb(30,30,30)");
            setColor(c);
          }
        } else {
          toast.error(data.error || "Failed to load playlist");
        }
      })
      .catch(() => toast.error("Network error loading playlist"))
      .finally(() => setLoading(false));
  }, [playlistId]);

  const handleBack = () => showId ? router.push(`/music/youtube/${showId}`) : router.back();
  const handlePlay = (id) => router.push(`/music/youtube/watch/${id}?list=${playlistId}&showId=${showId}`);
  const handlePlayAll = () => episodes.length && handlePlay(episodes[0].id);
  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: playlist?.title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  if (loading) return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#0f0f0f] text-white flex flex-col items-center justify-center h-svh gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <ListMusic className="absolute inset-0 m-auto w-5 h-5 text-white/25" />
        </div>
        <p className="text-sm text-white/40 font-medium">Loading playlist...</p>
      </SidebarInset>
    </SidebarProvider>
  );

  if (!playlist) return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[#0f0f0f] text-white flex flex-col items-center justify-center h-svh gap-5">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
          <ListMusic className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-base font-semibold text-white/50">Playlist not found</p>
        <button onClick={handleBack} className="px-7 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-200 transition">
          Go back
        </button>
      </SidebarInset>
    </SidebarProvider>
  );

  const total = episodes.length;
  const firstVideoId = episodes[0]?.id || "";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative h-svh overflow-hidden bg-[#0f0f0f] text-white">

        <div className="h-full overflow-y-auto overflow-x-hidden" id="yt-playlist-scroll">

          <header className="sticky top-0 z-50 flex items-center gap-2 px-3 h-14
            bg-[#0f0f0f] border-b border-white/[0.04]">
            <SidebarTrigger className="text-white/40 hover:text-white hidden md:flex -ml-1 size-8" />
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex-1 min-w-0 ml-1">
              <p className="text-sm font-semibold text-white/90 truncate tracking-tight">{playlist.title}</p>
            </div>
          </header>

          <div
            className="absolute top-14 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl h-[600px] pointer-events-none z-0"
            style={{
              background: `radial-gradient(ellipse at center top, ${color.replace("rgb", "rgba").replace(")", ", 0.2)")} 0%, transparent 70%)`,
            }}
          />

          <div className="hidden lg:flex relative z-10 min-h-[calc(100vh-3.5rem)] max-w-[1600px] mx-auto w-full">

            <aside className="sticky top-14 self-start w-[340px] xl:w-[400px] 2xl:w-[440px] shrink-0 h-[calc(100vh-3.5rem)] overflow-y-auto">
              <div className="flex flex-col gap-5 p-6 xl:p-8">
                <div
                  onClick={handlePlayAll}
                  className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl cursor-pointer"
                >
                  <YtThumb videoId={firstVideoId} coverImage={playlist.coverImage} className="" />
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-xl xl:text-2xl font-bold leading-tight tracking-tight text-white line-clamp-2">
                    {playlist.title}
                  </h1>
                  <button
                    onClick={handleBack}
                    className="text-sm xl:text-base font-medium text-white/50 hover:text-white hover:underline underline-offset-2 transition-colors"
                  >
                    {playlist.publisher || "Unknown Channel"}
                  </button>
                  <div className="flex items-center gap-1.5 text-xs xl:text-sm text-white/35 font-medium pt-0.5">
                    <ListMusic className="size-3.5 xl:size-4" />
                    <span>{total} video{total !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handlePlayAll}
                    className="flex-1 flex items-center justify-center gap-2
                      bg-white hover:bg-neutral-100 active:scale-[0.97]
                      text-black font-semibold text-sm rounded-full h-10 xl:h-11 px-5
                      transition-all duration-150 shadow-lg"
                  >
                    <Play className="size-4 fill-current" />
                    Play all
                  </button>
                  <button
                    onClick={handleShare}
                    className="size-10 xl:size-11 rounded-full border border-white/10 bg-white/5
                      hover:bg-white/12 flex items-center justify-center
                      text-white/50 hover:text-white transition-all shrink-0"
                  >
                    <Share2 className="size-4" />
                  </button>
                </div>
              </div>
            </aside>

            <main className="flex-1 min-w-0 py-5 xl:py-7 pr-5 xl:pr-8 pl-1 xl:pl-3">
              <div className="flex items-center justify-between px-4 xl:px-6 py-2 xl:py-3 text-xs xl:text-sm text-white/30 font-medium uppercase tracking-wider">
                <span className="flex items-center gap-6">
                  <span className="w-6 text-center">#</span>
                  <span>Title</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3 xl:size-3.5" />
                  <span>Duration</span>
                </span>
              </div>
              <div className="space-y-0.5">
                {episodes.map((ep, idx) => (
                  <DesktopEpisodeRow
                    key={ep.id}
                    ep={ep}
                    idx={idx}
                    publisher={playlist.publisher}
                    onPlay={() => handlePlay(ep.id)}
                  />
                ))}
              </div>
            </main>
          </div>

          <div className="lg:hidden relative z-10">
            <div className="w-full aspect-video relative">
              <YtThumb videoId={firstVideoId} coverImage={playlist.coverImage} className="" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/5 to-transparent" />
            </div>

            <div className="px-4 pt-4 pb-3 space-y-2.5">
              <h1 className="text-lg font-bold leading-snug tracking-tight text-white line-clamp-2">
                {playlist.title}
              </h1>
              <button onClick={handleBack}
                className="text-sm font-medium text-white/50 hover:text-white hover:underline underline-offset-2 transition-colors">
                {playlist.publisher}
              </button>
              <div className="flex items-center gap-1.5 text-xs text-white/35 font-medium">
                <ListMusic className="size-3.5" />
                <span>{total} videos</span>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={handlePlayAll}
                  className="flex-1 flex items-center justify-center gap-2
                    bg-white text-black font-semibold text-sm rounded-full h-11
                    active:scale-[0.97] transition-transform shadow-lg"
                >
                  <Play className="size-4 fill-current" />
                  Play all
                </button>
                <button
                  onClick={handleShare}
                  className="size-11 rounded-full border border-white/10 bg-white/5
                    flex items-center justify-center text-white/50"
                >
                  <Share2 className="size-4" />
                </button>
              </div>
            </div>

            <div className="mx-4 h-px bg-white/[0.06]" />

            <div className="px-0 pt-2 pb-28 space-y-0.5">
              {episodes.map((ep, idx) => (
                <MobileEpisodeRow
                  key={ep.id}
                  ep={ep}
                  idx={idx}
                  publisher={playlist.publisher}
                  onPlay={() => handlePlay(ep.id)}
                />
              ))}
            </div>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DesktopEpisodeRow({ ep, idx, publisher, onPlay }) {
  return (
    <div
      onClick={onPlay}
      className="group flex items-center gap-3 xl:gap-4 px-4 xl:px-6 py-2 xl:py-3 rounded-xl
        hover:bg-white/[0.04] transition-colors cursor-pointer select-none"
    >
      <span className="w-6 xl:w-8 shrink-0 text-xs xl:text-sm font-medium text-white/20 tabular-nums text-center">
        {idx + 1}
      </span>

      <div className="relative w-36 xl:w-44 aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-900 ring-1 ring-white/[0.04]">
        <YtThumb videoId={ep.id} coverImage={ep.coverImage} className="" />
        {ep.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] xl:text-xs
            font-medium px-1.5 py-0.5 rounded text-white/90 leading-none backdrop-blur-sm">
            {ep.duration}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 grid grid-cols-[1fr_auto] items-center gap-x-4 xl:gap-x-6">
        <div className="min-w-0">
          <h3 className="text-sm xl:text-base font-medium text-white/90 line-clamp-1 leading-snug group-hover:text-white transition-colors">
            {ep.title}
          </h3>
          <p className="text-xs xl:text-sm text-white/40 font-medium truncate mt-0.5">
            {ep.author || publisher}
          </p>
        </div>
        <div className="flex items-center gap-3 xl:gap-4 text-xs xl:text-sm text-white/30 font-medium">
          {ep.views && (
            <span className="hidden xl:flex items-center gap-1">
              <Eye className="size-3 xl:size-3.5" />{formatCount(ep.views)}
            </span>
          )}
          <span className="tabular-nums">{ep.duration || "--:--"}</span>
        </div>
      </div>
    </div>
  );
}

function MobileEpisodeRow({ ep, idx, publisher, onPlay }) {
  return (
    <div
      onClick={onPlay}
      className="flex items-center gap-2.5 px-1.5 py-2.5 rounded-xl
        active:bg-white/[0.04] transition-colors cursor-pointer select-none"
    >
      <span className="w-5 text-center text-xs font-medium text-white/20 shrink-0 tabular-nums">
        {idx + 1}
      </span>

      <div className="relative w-[108px] aspect-video rounded-lg overflow-hidden shrink-0 bg-neutral-900 ring-1 ring-white/[0.04]">
        <YtThumb videoId={ep.id} coverImage={ep.coverImage} className="" />
        {ep.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-[9px]
            font-medium px-1 py-0.5 rounded text-white/90 leading-none">
            {ep.duration}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-medium text-white/90 line-clamp-2 leading-snug">
          {ep.title}
        </h3>
        <p className="text-[11px] text-white/40 font-medium truncate mt-0.5">
          {ep.author || publisher}
        </p>
        {ep.views && (
          <p className="text-[10px] text-white/30 font-medium mt-0.5">
            {formatCount(ep.views)}{ep.published ? ` \u00B7 ${ep.published}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
