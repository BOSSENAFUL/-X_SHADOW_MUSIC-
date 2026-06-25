"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Mic, Loader2, MoreVertical, Check, User, Share, Play } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PodcastShowPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const playlistId = params.id;

  const [playlist, setPlaylist] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followMutating, setFollowMutating] = useState(false);
  const [dominantColor, setDominantColor] = useState("rgb(40, 40, 40)"); // Default dark gray
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const desktopTitleRef = useRef(null);
  const mobileTitleRef = useRef(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/music/podcasts/${playlistId}`);
    }
  }, [sessionStatus, router, playlistId]);

  // Fetch show episodes, details, and follow status
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !playlistId) return;

    async function loadData() {
      try {
        setLoading(true);

        // Fetch episodes & details from playlistId
        const epRes = await fetch(`/api/podcasts/episodes?playlistId=${playlistId}`);
        const epData = await epRes.json();

        if (epData.success) {
          setPlaylist(epData.playlist);
          setEpisodes(epData.episodes || []);

          // Extract color
          const imageUrl = epData.playlist?.authorImage || epData.playlist?.coverImage;
          if (imageUrl) {
            try {
              const color = await extractDominantColor(imageUrl);
              setDominantColor(color);
            } catch (err) {
              console.error("Color extraction failed:", err);
            }
          }
        }

        // Fetch user followed status
        const followRes = await fetch("/api/podcasts/follow");
        const followData = await followRes.json();
        if (followData.success) {
          const isF = followData.results.some(item => item.podcastId === playlistId);
          setIsFollowed(isF);
        }
      } catch (e) {
        console.error("Failed to load show data:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [sessionStatus, playlistId]);

  // Dynamic PWA status bar theme-color update (copied from album page)
  useEffect(() => {
    if (typeof window === "undefined" || !dominantColor) return;

    const defaultThemeColor = "#121212";

    const getThemeColor = (colorStr, showHeader) => {
      if (!colorStr) return defaultThemeColor;
      const match = colorStr.match(/\d+/g);
      if (!match || match.length < 3) return defaultThemeColor;
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);

      const opacity = showHeader ? 0.4 : 0.8;
      const bgContrib = showHeader ? 0 : 3.6;

      const mixedR = Math.max(0, Math.min(255, Math.round(r * opacity + bgContrib)));
      const mixedG = Math.max(0, Math.min(255, Math.round(g * opacity + bgContrib)));
      const mixedB = Math.max(0, Math.min(255, Math.round(b * opacity + bgContrib)));

      const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      };
      return `#${toHex(mixedR)}${toHex(mixedG)}${toHex(mixedB)}`;
    };

    const targetColor = getThemeColor(dominantColor, showHeaderTitle);
    
    // Apply meta tag colors
    const metaTags = document.querySelectorAll('meta[name="theme-color"], meta[name="apple-mobile-web-app-status-bar-style"]');
    metaTags.forEach(tag => tag.setAttribute("content", targetColor));

    return () => {
      metaTags.forEach(tag => tag.setAttribute("content", defaultThemeColor));
    };
  }, [dominantColor, showHeaderTitle]);

  // Handle scroll to show/hide title in header
  useEffect(() => {
    const scrollContainer = document.getElementById("show-scroll-container");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollY = scrollContainer.scrollTop;
      setShowHeaderTitle(scrollY > 200);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // Toggles follow status in database
  const handleFollowToggle = async () => {
    if (!playlist || followMutating) return;
    try {
      setFollowMutating(true);
      const prevVal = isFollowed;
      setIsFollowed(!prevVal); // Optimistic UI update

      const res = await fetch("/api/podcasts/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          podcastId: playlistId,
          podcastTitle: playlist.title,
          publisher: playlist.publisher,
          coverImage: playlist.authorImage || playlist.coverImage
        })
      });

      const data = await res.json();
      if (!data.success) {
        setIsFollowed(prevVal); // Rollback on failure
      }
    } catch (e) {
      console.error("Error toggling follow:", e);
    } finally {
      setFollowMutating(false);
    }
  };

  // Extract dominant color from image (uses same proxy server as album page)
  const extractDominantColor = (imageUrl) => {
    const finalUrl = imageUrl.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;

    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const colorCounts = {};

          for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const brightness = (r + g + b) / 3;
            if (brightness < 40 || brightness > 220) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;

            if (saturation < 30) continue;

            const color = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
            colorCounts[color] = (colorCounts[color] || 0) + (1 + saturation / 50);
          }

          let dominantColor = "40,40,40";
          let maxWeight = 0;

          for (const [color, weight] of Object.entries(colorCounts)) {
            if (weight > maxWeight) {
              maxWeight = weight;
              dominantColor = color;
            }
          }

          resolve(`rgb(${dominantColor})`);
        } catch (error) {
          console.error("Error extracting color:", error);
          resolve("rgb(40, 40, 40)");
        }
      };

      img.onerror = () => {
        resolve("rgb(40, 40, 40)");
      };

      img.src = finalUrl;
    });
  };

  const handleGoBack = () => {
    router.push("/music/podcasts");
  };

  const getCategory = () => {
    if (!playlist) return "Podcast";
    const title = playlist.title.toLowerCase();
    if (
      title.includes("motivation") || 
      title.includes("wucka") ||
      title.includes("growth") ||
      title.includes("venus") ||
      title.includes("inspire") ||
      title.includes("shetty") ||
      title.includes("mindset") ||
      title.includes("anything goes") ||
      title.includes("mel robbins") ||
      title.includes("glow up") ||
      title.includes("balance theory") ||
      title.includes("joyce pring") ||
      title.includes("rich roll") ||
      title.includes("hormozi") ||
      title.includes("manson") ||
      title.includes("psych2go") ||
      title.includes("davella")
    ) return "Self-help";
    if (
      title.includes("distractible") || 
      title.includes("chains") ||
      title.includes("samay") ||
      title.includes("bad friends") ||
      title.includes("theo") ||
      title.includes("shane") ||
      title.includes("secret podcast") ||
      title.includes("smartless") ||
      title.includes("garbage") ||
      title.includes("ymh") ||
      title.includes("kill tony") ||
      title.includes("always sunny") ||
      title.includes("drunk") ||
      title.includes("rogan") ||
      title.includes("coco") ||
      title.includes("friedland") ||
      title.includes("giggly") ||
      title.includes("basement yard")
    ) return "Comedy";
    if (title.includes("trash") || title.includes("taste") || title.includes("bro")) return "Culture";
    if (title.includes("figuring")) return "Educational";
    if (title.includes("meditation") || title.includes("at ")) return "Health";
    if (title.includes("ballen") || title.includes("crime") || title.includes("true")) return "True crime";
    return "Podcast";
  };

  const getProxiedImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith("http")
      ? `/api/proxy/image?url=${encodeURIComponent(url)}`
      : url;
  };

  const getShowDescription = () => {
    if (playlist?.description) return playlist.description;
    
    // Fallbacks for known podcast shows
    const DESCRIPTIONS = {
      "PL8Al5JQY4zqTL2TTvXDcZtiJXgb8Zd70E": "WuckaSpeaks is an engaging storyteller and creator sharing funny, unfiltered, and relatable animated stories about gaming, life, school, and relationships. Binge watch all WuckaSpeaks episodes here, featuring hilarious animations and commentary.",
      "PL9ow_Afdl8WzFWghDvZZbpfvL8-AVKWqn": "Welcome to Distractible, a weekly podcast hosted by Markiplier, LordMinion777, and Muyskerm. Join them as they discuss hilarious stories, bizarre encounters, and random distracting thoughts. Each week, they compete to see who can tell the most interesting or funny story.",
      "PLrALiQpz2JiqPV3-U76_vFiVvKJJanZEt": "Anime Grind brings you the ultimate high-energy gym workout tracks. Packed with epic anime themes, remix beats, and intense motivational soundtracks, this selection is designed to help you push your limits during training.",
      "PLEKVU3qCoLrLaYsYunJyyeJkamI0NdRnf": "ChainsFR shares animated stories, comedic rants, and hilarious commentaries on life experiences, gaming, and internet culture. Watch the visuals and listen to the funny takes on everyday life situations.",
      "PLntZx10gIeP_APgYReMvJZEXtfMQFUwvj": "Trust Me Bro Podcast is a weekly conversation about everything and nothing. Just two friends sharing hot takes, funny stories, and pop culture commentary, with absolutely no facts to back them up.",
      "PLhSOKdNAueDi5m-0FnJnyNwpwHRDMmZD-": "Trash Taste is a weekly podcast hosted by Joey (The Anime Man), Garnt (Gigguk), and Connor (CDawgVA). They talk about anime, manga, otaku culture, Japanese lifestyle, and their chaotic life adventures.",
      "PLUKRqQ8cSB-DCDuEl5vYogIMH9ph-7OP7": "Ben Lionel Scott presents weekly motivational speeches and music mixes designed to inspire you, boost your focus, and help you crush your goals. Listen daily to build mental toughness and discipline.",
      "PLE0Jo6NF_JYO5-phess8GKafKMtPv3tfZ": "Figuring Out with Raj Shamani is India's top business podcast. Raj interviews successful entrepreneurs, startup founders, celebrities, and leaders, uncovering their journeys, insights, and secrets of success.",
      "PL1A9PtiQ9-0aghMylLfVr7VJb_6oiVyLb": "Find peace, reduce anxiety, and practice mindfulness with the Mindset Meditation Podcast. Features daily guided meditations, breathing exercises, and ambient sounds to cultivate a calm mind.",
      "PLJCN_QpBlsx0C2CH6vSmTlXPc8BV6p7D6": "AT Podcast features deep conversations, tech insights, and pop culture reviews. Explore the creative process, technical developments, and gaming news with the hosts.",
      "PLwkErjXcu8sdxHNHpCz1X4jqzXNIteEsK": "The MrBallen Podcast delivers mysterious, strange, and dark stories in a narrative style. Explore unexplained occurrences, true crime cases, and historical mysteries.",
      "PLGaLdaA1FatjJwJUSABAVMdQ9x8EarxMD": "Ray William Johnson presents True Story, exploring bizarre historical events, unbelievable scandals, and crazy true occurrences from around the world in an engaging, fast-paced format."
    };

    if (playlistId && DESCRIPTIONS[playlistId]) {
      return DESCRIPTIONS[playlistId];
    }
    
    // Check title fallback
    if (playlist?.title?.toLowerCase().includes("wucka")) {
      return "WuckaSpeaks is an engaging storyteller and creator sharing funny, unfiltered, and relatable animated stories about gaming, life, school, and relationships. Binge watch all WuckaSpeaks episodes here, featuring hilarious animations and commentary.";
    }

    return `Welcome to the official ${playlist?.title || 'podcast'} show by ${playlist?.publisher || 'the creator'}. Stream full episodes, listen to stories, and tune in to the latest releases.`;
  };

  const getShowStats = () => {
    if (!playlistId) return { followers: "150K", monthlyViews: "500K" };
    let sum = 0;
    for (let i = 0; i < playlistId.length; i++) {
      sum += playlistId.charCodeAt(i);
    }
    
    // Deterministic followers count: 50K to 4.8M
    const followerSeed = (sum * 23) % 100;
    let followers = "";
    if (followerSeed < 15) {
      followers = `${50 + (sum % 45)}K`; // 50K - 95K
    } else if (followerSeed < 75) {
      followers = `${100 + (sum % 850)}K`; // 100K - 950K
    } else {
      followers = `${(1 + (sum % 4))}.${((sum * 3) % 9)}M`; // 1.0M - 4.8M
    }

    // Deterministic monthly views (usually 1.5x to 4x of followers)
    const viewsSeed = (sum * 7) % 100;
    let monthlyViews = "";
    if (followers.includes("K")) {
      const num = parseInt(followers, 10);
      monthlyViews = `${Math.round(num * (1.5 + (viewsSeed % 10) * 0.25))}K`;
    } else {
      const num = parseFloat(followers);
      monthlyViews = `${(num * (1.5 + (viewsSeed % 10) * 0.25)).toFixed(1)}M`;
    }

    return { followers, monthlyViews };
  };

  const getTrailerEpisode = () => {
    if (!episodes || episodes.length === 0) return null;
    const found = episodes.find(ep => {
      const t = ep.title.toLowerCase();
      return t.includes("trailer") || t.includes("welcome") || t.includes("intro") || t.includes("teaser");
    });
    return found || episodes[episodes.length - 1]; // oldest is last in reversed array
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset id="show-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-[#121212] font-youtube">
          <div
            className="absolute inset-0 h-[390px] pointer-events-none transition-all duration-1000"
            style={{
              background: `linear-gradient(to bottom, 
                rgba(40, 40, 40, 0.8) 0%, 
                rgba(40, 40, 40, 0.4) 40%, 
                rgba(40, 40, 40, 0.1) 80%, 
                transparent 100%)`
            }}
          />
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
            <span className="text-sm font-semibold">Loading show...</span>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!playlist) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-[#121212] text-white font-youtube">
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <p className="text-muted-foreground text-sm font-medium">Show not found</p>
            <Button onClick={handleGoBack} className="mt-4 bg-white text-black font-bold rounded-full px-6">
              Go Back
            </Button>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="show-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-[#121212] text-white font-youtube">
        
        {/* Sticky Header */}
        <header
          style={{
            backgroundColor: showHeaderTitle
              ? dominantColor
                ? `color-mix(in srgb, ${dominantColor}, black 60%)`
                : "rgb(20, 20, 20)"
              : "transparent"
          }}
          className={`fixed md:sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 transition-all duration-300 w-full ${
            showHeaderTitle ? "bg-background/80 backdrop-blur-md border-b border-white/5" : "border-none"
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-white/10 hover:bg-white/20 text-white rounded-full border-none">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center gap-2 transition-all duration-300">
                {showHeaderTitle && (
                  <h2 className="text-base font-bold animate-in fade-in slide-in-from-bottom-2 duration-300 line-clamp-1 text-white">
                    {playlist.publisher}
                  </h2>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 relative pb-36">
          
          {/* Main Ambient Gradient Layer */}
          <div
            className="absolute inset-0 h-[390px] pointer-events-none transition-all duration-1000 z-0"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, 
                    ${dominantColor.replace("rgb", "rgba").replace(")", ", 0.8)")} 0%, 
                    ${dominantColor.replace("rgb", "rgba").replace(")", ", 0.4)")} 40%, 
                    ${dominantColor.replace("rgb", "rgba").replace(")", ", 0.1)")} 80%, 
                    transparent 100%)`
                : "transparent"
            }}
          />

          <div className="relative z-10">

            {/* Spotify-Style Podcast Show Header */}
            <div className="px-4 md:px-8 pt-24 pb-6 text-white flex flex-col gap-6">
              
              {/* Header Info Block (Creator Avatar & Creator Name - Side by Side on Mobile & Desktop) */}
              <div className="flex flex-row gap-4 sm:gap-6 items-center md:items-end">
                {/* Square Channel avatar image as Cover Art */}
                <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden bg-[#181818] shadow-[0_12px_36px_rgba(0,0,0,0.5)] border border-white/10 shrink-0 transform hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src={playlist.authorImage ? getProxiedImageUrl(playlist.authorImage) : playlist.coverImage}
                    alt={playlist.publisher}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = playlist.coverImage;
                    }}
                  />
                </div>

                {/* Title and Publisher */}
                <div className="flex-1 min-w-0 flex flex-col justify-center md:justify-end text-left">
                  <h1 ref={desktopTitleRef} className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white break-words drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                    {playlist.publisher}
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base font-bold text-neutral-300 mt-1 sm:mt-2">
                    {playlist.publisher}
                  </p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-4 pt-2">
                <Button
                  onClick={handleFollowToggle}
                  disabled={followMutating}
                  className={`rounded-full px-8 py-5 text-sm font-extrabold transition-all flex items-center gap-2 border tracking-wide uppercase ${
                    isFollowed
                      ? "bg-transparent text-white border-white/25 hover:bg-white/5"
                      : "bg-white text-black border-white hover:bg-neutral-200"
                  }`}
                >
                  {followMutating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFollowed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {isFollowed ? "Following" : "Follow"}
                </Button>

                {/* Share Button */}
                <button
                  onClick={() => {
                    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
                    if (navigator.share) {
                      navigator.share({
                        title: playlist.title,
                        text: `Check out ${playlist.title} on Jammify`,
                        url: shareUrl
                      }).catch(err => console.warn(err));
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success("Link copied to clipboard");
                    }
                  }}
                  className="text-neutral-400 hover:text-white p-2.5 hover:bg-white/10 rounded-full border border-white/10 transition-colors cursor-pointer"
                  title="Share Show"
                >
                  <Share className="w-5 h-5" />
                </button>

                {/* Options Button */}
                <button
                  className="text-neutral-400 hover:text-white p-2.5 hover:bg-white/10 rounded-full border border-white/10 transition-colors cursor-pointer"
                  title="More Options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              {/* Description Block with toggle */}
              <div className="max-w-3xl">
                {(() => {
                  const desc = getShowDescription();
                  const isLong = desc.length > 180;
                  const truncated = isLong && !descriptionExpanded ? desc.slice(0, 180).trim() + "..." : desc;
                  return (
                    <p className="text-sm sm:text-base text-neutral-300 font-semibold leading-relaxed">
                      {truncated}
                      {isLong && (
                        <button
                          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                          className="ml-1.5 text-white hover:underline font-extrabold focus:outline-none"
                        >
                          {descriptionExpanded ? "see less" : "see more"}
                        </button>
                      )}
                    </p>
                  );
                })()}
              </div>

              {/* Rating & Category Badges Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Stats Badges */}
                {(() => {
                  const stats = getShowStats();
                  return (
                    <>
                      <div className="inline-flex items-center bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full text-xs font-bold text-neutral-200 border border-white/5 select-none transition-colors">
                        <span>{stats.followers} followers</span>
                      </div>
                      <div className="inline-flex items-center bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full text-xs font-bold text-neutral-200 border border-white/5 select-none transition-colors">
                        <span>{stats.monthlyViews} monthly views</span>
                      </div>
                    </>
                  );
                })()}

                {/* Category Badge */}
                <div className="inline-flex items-center bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-neutral-200 border border-white/5 select-none transition-colors">
                  {getCategory()}
                </div>
              </div>

              {/* Featured Trailer Section */}
              {(() => {
                const trailerEpisode = getTrailerEpisode();
                if (!trailerEpisode) return null;
                return (
                  <div className="mt-2">
                    <div 
                      onClick={() => router.push(`/music/podcasts/watch/${trailerEpisode.id}?showId=${playlistId}&showTitle=${encodeURIComponent(playlist.title || '')}`)}
                      className="group max-w-xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Thumbnail with overlay */}
                        <div className="relative w-20 aspect-video rounded-xl overflow-hidden border border-white/10 bg-neutral-900 shrink-0 shadow-md">
                          <img 
                            src={`https://i.ytimg.com/vi/${trailerEpisode.id}/maxresdefault.jpg`} 
                            alt={trailerEpisode.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              if (e.target.src.includes('maxresdefault.jpg')) {
                                e.target.src = `https://i.ytimg.com/vi/${trailerEpisode.id}/hqdefault.jpg`;
                              } else if (e.target.src.includes('hqdefault.jpg')) {
                                e.target.src = trailerEpisode.coverImage || playlist.coverImage;
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 group-hover:bg-black/25 transition-colors">
                            <Play className="w-5 h-5 fill-white text-white" />
                          </div>
                        </div>

                        {/* Title details */}
                        <div className="min-w-0">
                          <h4 className="text-white font-extrabold text-sm sm:text-base truncate group-hover:text-green-500 transition-colors">
                            {trailerEpisode.title}
                          </h4>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="bg-white/15 text-neutral-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-white/5 tracking-wider uppercase">
                              Trailer
                            </span>
                            <span className="text-neutral-400 text-xs font-semibold">
                              {trailerEpisode.duration || "1:30"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/music/podcasts/watch/${trailerEpisode.id}?showId=${playlistId}&showTitle=${encodeURIComponent(playlist.title || '')}`);
                        }}
                        className="text-neutral-400 hover:text-white p-2 hover:bg-white/15 rounded-full transition-colors shrink-0 cursor-pointer"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Separator line */}
            <div className="h-px bg-white/5 mx-4 md:mx-8 mb-6 mt-2" />

            {/* Podcast Channel Episodes Feed (Bottom part) */}
            <div className="px-0 md:px-8">
              <h3 className="text-lg md:text-xl font-bold tracking-tight text-white select-none mb-6 px-4 md:px-0">
                All episodes
              </h3>
              
              {episodes.length === 0 ? (
                <div className="py-20 text-center text-neutral-500 text-sm">
                  No episodes found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
                  {episodes.map((episode) => (
                    <div
                      key={episode.id}
                      onClick={() => router.push(`/music/podcasts/watch/${episode.id}?showId=${playlistId}&showTitle=${encodeURIComponent(playlist.title || '')}`)}
                      className="group cursor-pointer select-none flex flex-col justify-between"
                    >
                      <div>
                        {/* Large Aspect-Video (16:9) Thumbnail */}
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
                                e.target.src = episode.coverImage || playlist.coverImage;
                              }
                            }}
                          />
                          {episode.duration && (
                            <span className="absolute bottom-3 right-3 bg-black/85 text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded border border-white/5 text-white">
                              {episode.duration}
                            </span>
                          )}
                        </div>

                        {/* Details Info Row */}
                        <div className="flex gap-3 mt-3.5 px-2 md:px-1.5">
                          {/* Circular Show Avatar */}
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 shadow-sm bg-neutral-900">
                            <img
                              src={playlist.authorImage ? getProxiedImageUrl(playlist.authorImage) : playlist.coverImage}
                              alt={playlist.publisher}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = playlist.coverImage;
                              }}
                            />
                          </div>

                          {/* Text info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-extrabold text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-green-500 transition-colors">
                              {episode.title}
                            </h4>
                            <p className="text-neutral-400 text-xs sm:text-sm font-medium truncate mt-1">
                              {playlist.publisher} • {episode.views || "78K views"} • {episode.published || "7 days ago"}
                            </p>
                          </div>

                          {/* More Vertical menu icon */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/music/podcasts/watch/${episode.id}?showId=${playlistId}&showTitle=${encodeURIComponent(playlist.title || '')}`);
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
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}
