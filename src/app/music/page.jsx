/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Play, Heart, List, Search } from "lucide-react";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";
import { PlaylistSection } from "@/components/music/playlist-section";

export default function MusicPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [, setCurrentlyPlaying] = useState(null);
  const [newReleases, setNewReleases] = useState([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState([]);
  const [topHitsPlaylists, setTopHitsPlaylists] = useState([]);
  const [englishTopPlaylists, setEnglishTopPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [topHitsLoading, setTopHitsLoading] = useState(true);
  const [englishTopLoading, setEnglishTopLoading] = useState(true);
  const [playlistColors, setPlaylistColors] = useState({});
  const [hoveredColor, setHoveredColor] = useState(null);

  useEffect(() => {
    // Set default color only on desktop
    if (window.innerWidth >= 768) {
      setHoveredColor("rgb(69, 10, 245)");
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        if (!hoveredColor) setHoveredColor("rgb(69, 10, 245)");
      } else {
        setHoveredColor(null);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize liked playlists hook
  const { likedPlaylists, loading: playlistsLoading } = useLikedPlaylists(
    session?.user?.id
  );
  const [playlistsWithCovers, setPlaylistsWithCovers] = useState([]);

  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=new%20releases&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setNewReleases(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching new releases:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchTrendingPlaylists = async () => {
      try {
        setTrendingLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=trending&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setTrendingPlaylists(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching trending playlists:", error);
      } finally {
        setTrendingLoading(false);
      }
    };

    const fetchTopHitsPlaylists = async () => {
      try {
        setTopHitsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=top%20hits&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setTopHitsPlaylists(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching top hits playlists:", error);
      } finally {
        setTopHitsLoading(false);
      }
    };

    const fetchEnglishTopPlaylists = async () => {
      try {
        setEnglishTopLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=english%20top&page=0&limit=6`
        );
        const data = await response.json();

        if (data.success && data.data.results) {
          setEnglishTopPlaylists(data.data.results);
        }
      } catch (error) {
        console.error("Error fetching english top playlists:", error);
      } finally {
        setEnglishTopLoading(false);
      }
    };

    fetchNewReleases();
    fetchTrendingPlaylists();
    fetchTopHitsPlaylists();
    fetchEnglishTopPlaylists();
  }, []);

  const handlePlayClick = (item, type) => {
    setCurrentlyPlaying({ item, type });
    console.log(`Playing ${type}:`, item);
  };

  const handleCardClick = (item, type) => {
    if (type === "playlist" && typeof item === "object" && item.id) {
      // Navigate to playlist detail page with songCount
      router.push(
        `/music/playlist/${item.id}?songCount=${item.songCount || 50}`
      );
    } else {
      console.log(`Clicked ${type}:`, item);
    }
  };

  const handleShowAll = () => {
    // Navigate to existing new releases page
    router.push("/music/discover/new-releases");
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 768) {
      setHoveredColor("rgb(69, 10, 245)");
    } else {
      setHoveredColor(null);
    }
  };

  // Extract dominant color from image
  const extractDominantColor = (imageUrl, playlistId) => {
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

          // Sample every 10th pixel for performance
          for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Skip very light or very dark colors
            const brightness = (r + g + b) / 3;
            if (brightness < 30 || brightness > 220) continue;

            const color = `${Math.floor(r / 15) * 15},${Math.floor(g / 15) * 15
              },${Math.floor(b / 15) * 15}`;
            colorCounts[color] = (colorCounts[color] || 0) + 1;
          }

          // Find the most common color
          let dominantColor = "59,130,246"; // Default blue
          let maxCount = 0;

          for (const [color, count] of Object.entries(colorCounts)) {
            if (count > maxCount) {
              maxCount = count;
              dominantColor = color;
            }
          }

          const rgbColor = `rgb(${dominantColor})`;
          setPlaylistColors((prev) => ({
            ...prev,
            [playlistId]: rgbColor,
          }));
          resolve(rgbColor);
        } catch (error) {
          console.error("Error extracting color:", error);
          const fallbackColor = "rgb(59,130,246)";
          setPlaylistColors((prev) => ({
            ...prev,
            [playlistId]: fallbackColor,
          }));
          resolve(fallbackColor);
        }
      };

      img.onerror = () => {
        const fallbackColor = "rgb(59,130,246)";
        setPlaylistColors((prev) => ({
          ...prev,
          [playlistId]: fallbackColor,
        }));
        resolve(fallbackColor);
      };

      img.src = imageUrl;
    });
  };

  // Fetch song data for user-created playlists and generate covers
  useEffect(() => {
    const fetchPlaylistCovers = async () => {
      if (!playlistsLoading && likedPlaylists.length > 0) {
        const playlistsWithCoversData = await Promise.all(
          likedPlaylists.slice(0, 5).map(async (playlist) => {
            // Check if it's a user-created playlist (MongoDB ObjectId format)
            const isUserPlaylist =
              playlist.playlistId &&
              playlist.playlistId.length === 24 &&
              /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

            if (isUserPlaylist) {
              try {
                // Fetch the actual playlist data to get song IDs
                const playlistResponse = await fetch(
                  `/api/playlists/${playlist.playlistId}`
                );
                const playlistResult = await playlistResponse.json();

                if (playlistResult.success && playlistResult.data) {
                  // Check if playlist is private and user is not the owner
                  if (
                    !playlistResult.data.isPublic &&
                    !playlistResult.data.isOwner
                  ) {
                    return null; // Filter out private playlists
                  }

                  if (
                    playlistResult.data.songIds &&
                    playlistResult.data.songIds.length > 0
                  ) {
                    // Fetch first few songs for cover generation
                    const songsToFetch = playlistResult.data.songIds.slice(
                      0,
                      4
                    );
                    const songPromises = songsToFetch.map(async (songId) => {
                      try {
                        const response = await fetch(
                          `${process.env.NEXT_PUBLIC_API_URL}/api/songs/${songId}`
                        );
                        const data = await response.json();
                        if (data.success && data.data && data.data.length > 0) {
                          return data.data[0];
                        }
                        return null;
                      } catch (error) {
                        console.error(`Error fetching song ${songId}:`, error);
                        return null;
                      }
                    });

                    const fetchedSongs = await Promise.all(songPromises);
                    const validSongs = fetchedSongs.filter(
                      (song) => song !== null
                    );

                    // Extract color for user playlist from the first song's image
                    if (validSongs.length > 0) {
                      const firstSong = validSongs[0];
                      const coverImageForColor =
                        firstSong.image?.find((img) => img.quality === "500x500")
                          ?.url ||
                        firstSong.image?.find((img) => img.quality === "150x150")
                          ?.url ||
                        firstSong.image?.[firstSong.image.length - 1]?.url;

                      if (
                        coverImageForColor &&
                        !playlistColors[playlist.playlistId]
                      ) {
                        extractDominantColor(
                          coverImageForColor,
                          playlist.playlistId
                        );
                      }
                    }

                    return {
                      ...playlist,
                      songs: validSongs,
                      actualPlaylistData: playlistResult.data,
                      songCount: playlistResult.data.songIds?.length || 0,
                    };
                  }
                }
              } catch (error) {
                console.error("Error fetching playlist data:", error);
              }
            } else {
              // For API playlists, extract color from existing image
              const imageUrl =
                playlist.image?.[2]?.url ||
                playlist.image?.[1]?.url ||
                playlist.image?.[0]?.url;
              if (imageUrl && !playlistColors[playlist.playlistId]) {
                extractDominantColor(imageUrl, playlist.playlistId);
              }
            }

            return playlist;
          })
        );

        // Filter out null values (private playlists)
        const filteredPlaylists = playlistsWithCoversData.filter(
          (playlist) => playlist !== null
        );
        setPlaylistsWithCovers(filteredPlaylists);
      }
    };

    fetchPlaylistCovers();
  }, [likedPlaylists, playlistsLoading, playlistColors]);

  // Generate playlist cover based on songs (same logic as library page)
  const getPlaylistCover = (playlist) => {
    const songs = playlist.songs || [];

    if (!songs || songs.length === 0) {
      return { type: "default", src: "/def playlist image.jpg" };
    }

    if (songs.length >= 1 && songs.length <= 3) {
      // Use first song's cover image
      const firstSong = songs[0];
      const imageUrl =
        firstSong.image?.find((img) => img.quality === "500x500")?.url ||
        firstSong.image?.find((img) => img.quality === "150x150")?.url ||
        firstSong.image?.[firstSong.image.length - 1]?.url;

      return {
        type: "single",
        src: imageUrl || "/def playlist image.jpg",
        song: firstSong,
      };
    }

    if (songs.length >= 4) {
      // Create 4-image collage from first 4 songs
      const firstFourSongs = songs.slice(0, 4);
      const images = firstFourSongs.map((song) => {
        return (
          song.image?.find((img) => img.quality === "150x150")?.url ||
          song.image?.find((img) => img.quality === "500x500")?.url ||
          song.image?.[song.image.length - 1]?.url ||
          "/def playlist image.jpg"
        );
      });

      return {
        type: "collage",
        images: images,
        songs: firstFourSongs,
      };
    }

    return { type: "default", src: "/def playlist image.jpg" };
  };

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-x-hidden">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4 hidden md:block"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Discover</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Search Button */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => router.push("/music/search")}
                className="flex items-center justify-start gap-3 bg-muted/30 hover:bg-muted/50 border border-muted-foreground/20 hover:border-muted-foreground/30 transition-all duration-200 rounded-full h-9 w-32 sm:w-40 md:w-48 lg:w-56 xl:w-64 px-4"
              >
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="hidden sm:block text-sm text-muted-foreground text-left truncate">
                  Search music...
                </span>
                <span className="sm:hidden text-xs text-muted-foreground">
                  Search
                </span>
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 space-y-6 md:space-y-8 pb-20 md:pb-6 relative">
          {/* Ambient Background Gradient */}
          <div
            className="absolute h-[15%] w-full top-0 left-0 pointer-events-none transition-colors duration-1000 ease-in-out z-0"
            style={{
              backgroundColor: hoveredColor
                ? hoveredColor.replace("rgb", "rgba").replace(")", ", 0.35)")
                : "transparent",
              maskImage: "linear-gradient(to bottom, black, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />


          {/* Quick Access Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
            {/* Liked Songs */}
            <div
              className="group relative flex items-center bg-white/5 hover:bg-white/10 transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10 "
              onClick={() => router.push("/music/favorites")}
              onMouseEnter={() => setHoveredColor("rgb(69, 10, 245)")}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="h-full aspect-square flex items-center justify-center shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(69, 10, 245), rgb(166, 174, 219))",
                }}
              >
                <Heart className="w-5 h-5 md:w-8 md:h-8 fill-white text-white " />
              </div>
              <div className="min-w-0 flex-1 px-2 md:px-3 py-2 flex items-center">
                <h3 className="font-bold text-[13px] md:text-[14px] lg:text-[16px] text-white line-clamp-2 leading-tight">
                  Liked Songs
                </h3>
              </div>

              {/* Play button overlay */}
              <div className="absolute right-2 md:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                <div
                  className="rounded-full w-8 h-8 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayClick({ type: "liked-songs" }, "liked-songs");
                  }}
                >
                  <Play className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                </div>
              </div>
            </div>

            {/* Dynamic Liked Playlists */}
            {playlistsLoading
              ? // Loading skeleton for playlists
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="flex items-center bg-white/5 rounded-[4px] h-14 md:h-16 lg:h-20 overflow-hidden animate-pulse"
                >
                  <div className="h-full aspect-square bg-muted shrink-0" />
                  <div className="min-w-0 flex-1 px-2 md:px-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))
              : (playlistsWithCovers.length > 0
                ? playlistsWithCovers
                : likedPlaylists
              )
                .slice(0, 5)
                .map((playlist) => {
                  const dominantColor =
                    playlistColors[playlist.playlistId] || "rgb(59,130,246)";

                  return (
                    <div
                      key={playlist.playlistId}
                      className="group relative flex items-center bg-white/5 hover:bg-white/10 transition-colors rounded-[4px] overflow-hidden cursor-pointer h-14 md:h-16 lg:h-20 z-10"
                      onMouseEnter={() =>
                        setHoveredColor(
                          playlistColors[playlist.playlistId] ||
                          "rgb(59,130,246)"
                        )
                      }
                      onMouseLeave={handleMouseLeave}
                      onClick={() => {
                        // Check if it's a user-created playlist (MongoDB ObjectId format) or API playlist
                        const isUserPlaylist =
                          playlist.playlistId &&
                          playlist.playlistId.length === 24 &&
                          /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

                        if (isUserPlaylist) {
                          // User-created playlist - use /music/playlists/{id}
                          router.push(
                            `/music/playlists/${playlist.playlistId}`
                          );
                        } else {
                          // API playlist - use /music/playlist/{id}
                          router.push(
                            `/music/playlist/${playlist.playlistId
                            }?songCount=${playlist.songCount || 50}`
                          );
                        }
                      }}
                    >
                      <div className="h-full aspect-square shrink-0 relative bg-neutral-800">
                        {(() => {
                          // Check if it's a user-created playlist with songs data
                          const isUserPlaylist =
                            playlist.playlistId &&
                            playlist.playlistId.length === 24 &&
                            /^[0-9a-fA-F]{24}$/.test(playlist.playlistId);

                          if (isUserPlaylist && playlist.songs) {
                            // Use dynamic cover generation for user playlists
                            const cover = getPlaylistCover(playlist);

                            if (cover.type === "single") {
                              return (
                                <img
                                  src={cover.src}
                                  alt={playlist.playlistName || "Playlist"}
                                  className="w-full h-full object-cover shadow-r-lg"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.src = "/def playlist image.jpg";
                                  }}
                                />
                              );
                            } else if (cover.type === "collage") {
                              return (
                                <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-black">
                                  {cover.images.map((imageSrc, index) => (
                                    <div
                                      key={index}
                                      className="w-full h-full overflow-hidden"
                                    >
                                      <img
                                        src={imageSrc}
                                        alt={`Song ${index + 1}`}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                          e.target.src =
                                            "/def playlist image.jpg";
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            } else {
                              return (
                                <img
                                  src="/def playlist image.jpg"
                                  alt={playlist.playlistName || "Playlist"}
                                  className="w-full h-full object-cover"
                                />
                              );
                            }
                          } else if (
                            playlist.image?.[2]?.url ||
                            playlist.image?.[1]?.url ||
                            playlist.image?.[0]?.url
                          ) {
                            // Use API playlist image for JioSaavn playlists
                            return (
                              <img
                                src={
                                  playlist.image[2]?.url ||
                                  playlist.image[1]?.url ||
                                  playlist.image[0]?.url
                                }
                                alt={playlist.playlistName || "Playlist"}
                                className="w-full h-full object-cover shadow-r-lg"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  const fallback =
                                    e.target.nextElementSibling;
                                  if (fallback) {
                                    fallback.style.display = "flex";
                                  }
                                }}
                              />
                            );
                          } else {
                            // Fallback to default icon
                            return (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{
                                  background: `linear-gradient(135deg, ${dominantColor}, ${dominantColor
                                    .replace("rgb", "rgba")
                                    .replace(")", ", 0.8)")})`,
                                }}
                              >
                                <List className="w-6 h-6 md:w-8 md:h-8 text-white/90" />
                              </div>
                            );
                          }
                        })()}
                      </div>
                      <div className="min-w-0 flex-1 px-2 md:px-3 py-2 flex items-center">
                        <h3 className="font-bold text-[13px] md:text-[14px] lg:text-[16px] text-white line-clamp-2 leading-tight">
                          {playlist.playlistName}
                        </h3>
                      </div>

                      {/* Play button overlay */}
                      <div className="absolute right-2 md:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0  z-20">
                        <div
                          className="rounded-full w-8 h-8 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayClick(playlist, "playlist");
                          }}
                        >
                          <Play className="w-4 h-4 md:w-6 md:h-6 fill-black translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>

          {/* "New release" */}
          <PlaylistSection
            title="New Release"
            playlists={newReleases}
            loading={loading}
            onShowAll={handleShowAll}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={(playlist) => {
              handlePlayClick(playlist, "playlist");
            }}
          />

          {/* Trending Playlists Section */}
          <PlaylistSection
            title="Trending Playlists"
            playlists={trendingPlaylists}
            loading={trendingLoading}
            onShowAll={() => router.push("/music/discover/playlists")}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={(playlist) => {
              handlePlayClick(playlist, "playlist");
            }}
          />

          {/* Top Hits Playlists Section */}
          <PlaylistSection
            title="Top Hits Playlists"
            playlists={topHitsPlaylists}
            onShowAll={() => router.push("/music/discover/top-hits")}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={(playlist) => {
              handlePlayClick(playlist, "playlist");
            }}
          />

          {/* English Top Playlists Section */}
          <PlaylistSection
            title="English Top Playlists"
            playlists={englishTopPlaylists}
            loading={englishTopLoading}
            onShowAll={() => router.push("/music/discover/english-top")}
            onPlaylistClick={(playlist) => handleCardClick(playlist, "playlist")}
            onPlayClick={(playlist) => {
              handlePlayClick(playlist, "playlist");
            }}
          />

          {/* Bottom padding to prevent content being hidden behind music player */}
          <div className="pb-24" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
