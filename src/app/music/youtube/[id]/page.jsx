/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Youtube, Loader2, MoreVertical, Check, User, Share, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PodcastShowPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const playlistId = params?.id;

  const [playlist, setPlaylist] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followMutating, setFollowMutating] = useState(false);
  const [dominantColor, setDominantColor] = useState("rgb(40, 40, 40)"); // Default dark gray
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [sortBy, setSortBy] = useState("latest");
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [continuation, setContinuation] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [playlistContinuation, setPlaylistContinuation] = useState(null);
  const [loadingMorePlaylists, setLoadingMorePlaylists] = useState(false);

  const continuationRef = useRef(null);
  continuationRef.current = continuation;

  const loadingMoreRef = useRef(false);
  loadingMoreRef.current = loadingMore;

  const playlistContinuationRef = useRef(null);
  playlistContinuationRef.current = playlistContinuation;

  const loadingMorePlaylistsRef = useRef(false);
  loadingMorePlaylistsRef.current = loadingMorePlaylists;

  const activeTabRef = useRef("home");
  activeTabRef.current = activeTab;

  const desktopTitleRef = useRef(null);
  const mobileTitleRef = useRef(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push(`/login?callbackUrl=/music/youtube/${playlistId}`);
    }
  }, [sessionStatus, router, playlistId]);

  // 1. Fetch channel/playlist details & follow status (once per playlistId)
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !playlistId) return;

    async function loadChannelDetails() {
      try {
        setLoading(true);

        // Fetch episodes & details from playlistId (queries default latest first to extract channel info)
        const epRes = await fetch(`/api/youtube/episodes?playlistId=${playlistId}&sortBy=latest`);
        const epData = await epRes.json();

        if (epData.success) {
          setPlaylist(epData.playlist);
          setPlaylistContinuation(epData.playlist?.playlistContinuation || null);
          // Set initial episodes and continuation for latest
          if (sortBy === "latest") {
            setEpisodes(epData.episodes || []);
            setContinuation(epData.continuation || null);
          }

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
        const followRes = await fetch("/api/youtube/follow");
        const followData = await followRes.json();
        if (followData.success) {
          const isF = followData.results.some(item => item.podcastId === playlistId);
          setIsFollowed(isF);
        }
      } catch (e) {
        console.error("Failed to load show details:", e);
      } finally {
        setLoading(false);
      }
    }

    loadChannelDetails();
  }, [sessionStatus, playlistId]);

  // 2. Fetch sorted episodes when sortBy or playlistId changes
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !playlistId) return;
    
    // Skip on first load if default 'latest' since that is already fetched in loadChannelDetails
    if (sortBy === "latest" && !playlist) return;

    async function fetchSortedEpisodes() {
      try {
        setEpisodesLoading(true);
        const epRes = await fetch(`/api/youtube/episodes?playlistId=${playlistId}&sortBy=${sortBy}`);
        const epData = await epRes.json();
        if (epData.success) {
          setEpisodes(epData.episodes || []);
          setContinuation(epData.continuation || null);
        }
      } catch (e) {
        console.error("Failed to load sorted episodes:", e);
      } finally {
        setEpisodesLoading(false);
      }
    }

    fetchSortedEpisodes();
  }, [sessionStatus, playlistId, sortBy]);

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

  const loadMoreEpisodes = async () => {
    if (loadingMoreRef.current || !continuationRef.current || !playlistId) return;
    try {
      setLoadingMore(true);
      const epRes = await fetch(
        `/api/youtube/episodes?playlistId=${playlistId}&sortBy=${sortBy}&continuation=${encodeURIComponent(
          continuationRef.current
        )}`
      );
      const epData = await epRes.json();
      if (epData.success) {
        setEpisodes(prev => [...prev, ...(epData.episodes || [])]);
        setContinuation(epData.continuation || null);
      }
    } catch (e) {
      console.error("Failed to load more videos:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMorePlaylists = async () => {
    if (loadingMorePlaylistsRef.current || !playlistContinuationRef.current || !playlistId) return;
    try {
      setLoadingMorePlaylists(true);
      const res = await fetch(
        `/api/youtube/episodes?playlistId=${playlistId}&playlistContinuation=${encodeURIComponent(
          playlistContinuationRef.current
        )}`
      );
      const data = await res.json();
      if (data.success) {
        setPlaylist(prev => ({
          ...prev,
          playlists: [...(prev.playlists || []), ...(data.playlists || [])],
          playlistContinuation: data.playlistContinuation || null
        }));
        setPlaylistContinuation(data.playlistContinuation || null);
      }
    } catch (e) {
      console.error("Failed to load more playlists:", e);
    } finally {
      setLoadingMorePlaylists(false);
    }
  };

  // Handle scroll to show/hide title in header & infinite scroll pagination
  useEffect(() => {
    const scrollContainer = document.getElementById("show-scroll-container");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollY = scrollContainer.scrollTop;
      setShowHeaderTitle(scrollY > 200);

      // Infinite scroll check for Videos tab
      if (activeTabRef.current === "videos" && continuationRef.current && !loadingMoreRef.current) {
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        if (scrollHeight - scrollY - clientHeight < 800) {
          loadMoreEpisodes();
        }
      }

      // Infinite scroll check for Playlists tab
      if (activeTabRef.current === "playlists" && playlistContinuationRef.current && !loadingMorePlaylistsRef.current) {
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        if (scrollHeight - scrollY - clientHeight < 600) {
          loadMorePlaylists();
        }
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [playlistId, sortBy]);

  // Toggles follow status in database
  const handleFollowToggle = async () => {
    if (!playlist || followMutating) return;
    try {
      setFollowMutating(true);
      const prevVal = isFollowed;
      setIsFollowed(!prevVal); // Optimistic UI update

      const res = await fetch("/api/youtube/follow", {
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
    router.push("/music/youtube");
  };

  const getCategory = () => {
    if (!playlist) return "YouTube Channel";
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
    if (title.includes("meditation") || title.includes("mindful") || title.includes("yoga") || title.includes("mental health")) return "Health";
    if (title.includes("ballen") || title.includes("crime") || title.includes("true")) return "True crime";
    return "YouTube Channel";
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

    return `Welcome to the official YouTube channel of ${playlist?.publisher || 'the creator'}. Stream full videos, listen to stories, and tune in to the latest releases.`;
  };

  const getShowStats = () => {
    return { followers: null, monthlyViews: null };
  };

  const getTrailerEpisode = () => {
    if (playlist && playlist.trailer) {
      return playlist.trailer;
    }
    return null;
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
            <span className="text-sm font-semibold">Loading channel...</span>
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
            <p className="text-muted-foreground text-sm font-medium">Channel not found</p>
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
                <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden bg-[#181818] shadow-[0_12px_36px_rgba(0,0,0,0.5)] border border-white/10 shrink-0">
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
                    <Youtube className="w-4 h-4" />
                  )}
                  {isFollowed ? "Subscribed" : "Subscribe"}
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
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      toast.success("Link copied to clipboard");
                    }
                  }}
                  className="text-neutral-400 hover:text-white p-2.5 hover:bg-white/10 rounded-full border border-white/10 transition-colors cursor-pointer"
                  title="Share Channel"
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
                  const isDynamic = !!playlist?.subscriberCountText;
                  return (
                    <>
                      {isDynamic && (
                        <div className="inline-flex items-center bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full text-xs font-bold text-neutral-200 border border-white/5 select-none transition-colors">
                          <span>{playlist.subscriberCountText}</span>
                        </div>
                      )}
                      {!!playlist?.videoCountText && (
                        <div className="inline-flex items-center bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full text-xs font-bold text-neutral-200 border border-white/5 select-none transition-colors">
                          <span>{playlist.videoCountText}</span>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Category Badge */}
                <div className="inline-flex items-center bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-neutral-200 border border-white/5 select-none transition-colors">
                  {getCategory()}
                </div>
              </div>

            </div>

            {/* YouTube Tabs Selector */}
            <div className="flex items-center gap-6 px-4 md:px-8 border-b border-white/5 mb-6 text-sm font-semibold select-none">
              <button
                onClick={() => setActiveTab("home")}
                className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
                  activeTab === "home"
                    ? "text-white border-white font-extrabold"
                    : "text-neutral-400 border-transparent hover:text-white"
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab("videos")}
                className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
                  activeTab === "videos"
                    ? "text-white border-white font-extrabold"
                    : "text-neutral-400 border-transparent hover:text-white"
                }`}
              >
                Videos
              </button>
              {(playlist.playlists && playlist.playlists.length > 0) || playlistContinuation ? (
                <button
                  onClick={() => setActiveTab("playlists")}
                  className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
                    activeTab === "playlists"
                      ? "text-white border-white font-extrabold"
                      : "text-neutral-400 border-transparent hover:text-white"
                  }`}
                >
                  Playlists
                </button>
              ) : null}
            </div>

            {/* Content Feed */}
            {activeTab === "home" && playlist.shelves && playlist.shelves.length > 0 ? (
              /* YouTube-style Shelves Home Feed */
              <div className="space-y-10 px-4 md:px-8">
                {playlist.shelves.map((shelf, shelfIdx) => (
                  <div key={shelfIdx} className="space-y-4">
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white select-none">
                      {shelf.title}
                    </h3>
                    
                    {/* Horizontal scroll list */}
                    <ScrollableShelf>
                      {shelf.videos.map((video) => {
                        const isPlaylist = video.contentType === 'PLAYLIST' || shelf.title?.toLowerCase().includes('playlist');
                        const targetUrl = isPlaylist
                          ? `/music/youtube-playlist/${video.id}?showId=${playlistId}`
                          : `/music/youtube/watch/${video.id}?showId=${playlistId}&showTitle=${encodeURIComponent(playlist.title || '')}`;

                        return (
                          <div
                            key={video.id}
                            onClick={() => router.push(targetUrl)}
                            className="w-44 sm:w-52 md:w-60 flex-shrink-0 group cursor-pointer select-none"
                          >
                            {/* Stacked Thumbnail Effect for Playlists */}
                            <div className="relative w-full aspect-video rounded-xl border border-white/5 bg-[#181818]/60 shadow-md">
                              {isPlaylist && (
                                <>
                                  <div className="absolute inset-x-1.5 -top-1 h-1 bg-[#282828] rounded-t-lg border-t border-white/10" />
                                  <div className="absolute inset-x-3 -top-2 h-1 bg-[#383838] rounded-t-lg border-t border-white/10" />
                                </>
                              )}
                              
                              <img 
                                src={isPlaylist ? video.coverImage : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} 
                                alt={video.title} 
                                className="w-full h-full object-cover rounded-xl animate-in fade-in duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = video.coverImage || playlist.coverImage;
                                }}
                              />
                              {video.duration && (
                                <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-white/5 text-white flex items-center gap-1">
                                  {isPlaylist && (
                                    <svg className="w-3 h-3 fill-current text-neutral-300" viewBox="0 0 24 24">
                                      <path d="M22 7H2v2h20V7zm0 4H2v2h20v-2zm0 4H2v2h20v-2z"/>
                                    </svg>
                                  )}
                                  {video.duration}
                                </span>
                              )}
                            </div>
                            <h4 className="text-white font-extrabold text-xs sm:text-sm leading-snug line-clamp-2 mt-2 group-hover:text-green-500 transition-colors">
                              {video.title}
                            </h4>
                            <p className="text-[10px] sm:text-xs text-neutral-400 font-medium truncate mt-0.5">
                              {isPlaylist ? 'Playlist' : (video.views ? `${video.views} • ` : '') + (video.published || 'Video')}
                            </p>
                          </div>
                        );
                      })}
                    </ScrollableShelf>
                  </div>
                ))}
              </div>
            ) : activeTab === "playlists" ? (
              /* Playlists Tab - Beautiful responsive grid of playlist cards */
              <div className="px-4 md:px-8">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white select-none mb-6">
                  Created playlists
                </h3>
                
                {!playlist.playlists || playlist.playlists.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500 text-sm">
                    No playlists found.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
                      {playlist.playlists.map((video) => {
                        const targetUrl = `/music/youtube-playlist/${video.id}?showId=${playlistId}`;
                        return (
                          <div
                            key={video.id}
                            onClick={() => router.push(targetUrl)}
                            className="group cursor-pointer select-none flex flex-col justify-between"
                          >
                            <div>
                              {/* Stacked Thumbnail Effect for Playlists */}
                              <div className="relative w-full aspect-video rounded-xl border border-white/5 bg-[#181818]/60 shadow-md">
                                <div className="absolute inset-x-1.5 -top-1 h-1 bg-[#282828] rounded-t-lg border-t border-white/10" />
                                <div className="absolute inset-x-3 -top-2 h-1 bg-[#383838] rounded-t-lg border-t border-white/10" />
                                
                                <img 
                                  src={video.coverImage} 
                                  alt={video.title} 
                                  className="w-full h-full object-cover rounded-xl animate-in fade-in duration-300"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.src = playlist.coverImage;
                                  }}
                                />
                                
                                {video.duration && (
                                  <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-white/5 text-white flex items-center gap-1">
                                    <svg className="w-3 h-3 fill-current text-neutral-300" viewBox="0 0 24 24">
                                      <path d="M22 7H2v2h20V7zm0 4H2v2h20v-2zm0 4H2v2h20v-2z"/>
                                    </svg>
                                    {video.duration}
                                  </span>
                                )}
                              </div>
                              
                              <h4 className="text-white font-extrabold text-xs sm:text-sm leading-snug line-clamp-2 mt-2 group-hover:text-green-500 transition-colors">
                                {video.title}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-neutral-400 font-medium truncate mt-0.5">
                                Playlist • View full playlist
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {loadingMorePlaylists && (
                      <div className="py-8 flex flex-col items-center justify-center text-neutral-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-white animate-in fade-in duration-300" />
                        <span className="text-xs font-semibold">Loading more playlists...</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Videos Tab (default/fallback) - Grid of all videos with sort sub-filters */
              <div className="px-0 md:px-8">
                {/* Videos Sorting Sub-filters */}
                <div className="flex items-center gap-2 mb-6 select-none px-2">
                  {["latest", "popular", "oldest"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSortBy(filter)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                        sortBy === filter
                          ? "bg-white text-black border-white"
                          : "bg-[#181818] text-neutral-300 border-white/10 hover:bg-white/5"
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
                
                {episodesLoading ? (
                  <div className="py-32 flex flex-col items-center justify-center text-neutral-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-white" />
                    <span className="text-sm font-semibold">Updating videos...</span>
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="py-20 text-center text-neutral-500 text-sm px-4">
                    No videos found.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
                    {episodes.map((episode) => (
                      <div
                        key={episode.id}
                        onClick={() => router.push(`/music/youtube/watch/${episode.id}?showId=${playlistId}&showTitle=${encodeURIComponent(playlist.title || '')}`)}
                        className="group cursor-pointer select-none flex flex-col justify-between"
                      >
                        <div>
                          {/* Large Aspect-Video (16:9) Thumbnail */}
                          <div className="relative w-full aspect-video rounded-none md:rounded-xl overflow-hidden border-y md:border border-white/5 bg-[#181818]/60 shadow-none">
                            <img 
                              src={`https://i.ytimg.com/vi/${episode.id}/maxresdefault.jpg`} 
                              alt={episode.title} 
                              className="w-full h-full object-cover rounded-none md:rounded-xl animate-in fade-in duration-300"
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
                              <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-white/5 text-white">
                                {episode.duration}
                              </span>
                            )}
                          </div>

                          {/* Details Info Row */}
                          <div className="flex gap-3 mt-3 px-2">
                            {/* Circular Show Avatar */}
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shrink-0 shadow-sm bg-neutral-900">
                              <img
                    src={playlist.authorImage ? getProxiedImageUrl(playlist.authorImage) : (playlist.coverImage || '/default-playlist-image.png')}
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
                                router.push(`/music/youtube/watch/${episode.id}?showId=${playlistId}&showTitle=${encodeURIComponent(playlist.title || '')}`);
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
                    {loadingMore && (
                      <div className="py-8 flex flex-col items-center justify-center text-neutral-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-white animate-in fade-in duration-300" />
                        <span className="text-xs font-semibold">Loading more videos...</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </SidebarInset>
    </SidebarProvider>
  );
}

function ScrollableShelf({ children }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const update = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.flex-shrink-0');
    const amount = (card?.offsetWidth || 240) + 16;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/scroll">
      <div
        ref={scrollRef}
        onScroll={update}
        className="flex items-center gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 max-w-full scroll-smooth"
      >
        {children}
      </div>
      {showLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-[#0f0f0f] to-transparent
            flex items-center justify-start pl-1 opacity-0 group-hover/scroll:opacity-100 transition-opacity cursor-pointer z-10"
        >
          <div className="size-8 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white">
            <ChevronLeft className="size-4" />
          </div>
        </button>
      )}
      {showRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-[#0f0f0f] to-transparent
            flex items-center justify-end pr-1 opacity-0 group-hover/scroll:opacity-100 transition-opacity cursor-pointer z-10"
        >
          <div className="size-8 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white">
            <ChevronRight className="size-4" />
          </div>
        </button>
      )}
    </div>
  );
}
