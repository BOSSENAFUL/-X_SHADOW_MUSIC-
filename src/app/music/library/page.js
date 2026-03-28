"use client"

import { useState, useMemo, useEffect, useCallback, memo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart } from "lucide-react"
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists"
import { useLikedAlbums } from "@/hooks/useLikedAlbums"
import { useLikedArtists } from "@/hooks/useLikedArtists"
import { useLikedSongs } from "@/hooks/useLikedSongs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from "@/components/ui/breadcrumb"
const TABS = ["Playlists", "Albums", "Artists"]

const PlaylistCollage = memo(({ images }) => {
  if (!images || images.length === 0) return null;
  const displayImages = images.slice(0, 4);

  if (displayImages.length < 4) {
    return (
      <img
        src={displayImages[0]}
        alt="Playlist Cover"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 w-full h-full group-hover:scale-105 transition-transform duration-300">
      {displayImages.map((src, idx) => (
        <div key={idx} className="relative w-full h-full overflow-hidden border-[0.5px] border-black/10">
          <img
            src={src}
            alt={`Collage ${idx}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
});
PlaylistCollage.displayName = "PlaylistCollage";

const LibrarySkeleton = memo(() => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 min-[2400px]:grid-cols-11 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="group relative rounded-md">
        <Skeleton className="aspect-square w-full mb-2 rounded-md bg-zinc-800/50" />
        <div className="min-w-0 space-y-1.5 mt-1">
          <Skeleton className="h-4 w-full bg-zinc-800/50" />
          <Skeleton className="h-3 w-2/3 bg-zinc-800/50" />
        </div>
      </div>
    ))}
  </div>
));
LibrarySkeleton.displayName = "LibrarySkeleton";

export default function LibraryPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [activeTab, setActiveTab] = useState("All") // All, Playlists, Albums, Artists
  const [scrollRestored, setScrollRestored] = useState(false)
  const scrollContainerRef = useRef(null)

  const { likedPlaylists, loading: loadingPlaylists } = useLikedPlaylists(userId)
  const { likedAlbums, loading: loadingAlbums } = useLikedAlbums(userId)
  const { likedArtists, loading: loadingArtists } = useLikedArtists(userId)
  const { getLikedCount, loading: loadingSongs } = useLikedSongs(userId)

  const [createdPlaylists, setCreatedPlaylists] = useState([])
  const [loadingCreated, setLoadingCreated] = useState(true)

  // Memoized cache for session to avoid refetching on "back" navigation
  useEffect(() => {
    let isMounted = true

    if (!userId) {
      if (isMounted) setLoadingCreated(false)
      return
    }

    const fetchCreatedPlaylists = async () => {
      // Check if we have data in session storage to avoid refetching on back navigation
      const cacheKey = `created_playlists_${userId}`
      const scrollKey = `library_scroll_${userId}`
      const cached = sessionStorage.getItem(cacheKey)

      if (cached) {
        setCreatedPlaylists(JSON.parse(cached))
        setLoadingCreated(false)
        return
      }

      try {
        const res = await fetch('/api/playlists')
        const data = await res.json()
        if (data.success) {
          // OPTIMIZATION: Batch song data fetching
          const allSongIds = new Set()
          data.data.forEach(p => {
            if (p.songIds) p.songIds.slice(0, 4).forEach(id => allSongIds.add(id))
          })

          const songCache = {}
          if (allSongIds.size > 0) {
            const idsArray = Array.from(allSongIds)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

            // Fetch in chunks to avoid URL length limits
            const chunkSize = 50 // Increased for efficiency
            for (let i = 0; i < idsArray.length; i += chunkSize) {
              const chunk = idsArray.slice(i, i + chunkSize)
              try {
                const response = await fetch(`${apiUrl}/api/songs?ids=${chunk.join(',')}`)
                const songData = await response.json()
                if (songData.success && songData.data) {
                  songData.data.forEach(song => {
                    if (song) songCache[song.id] = song
                  })
                }
              } catch (e) { console.error("Batch song fetch error", e) }
            }
          }

          const playlistsWithCovers = data.data.map((playlist) => {
            // Priority 1: Explicitly stored image (e.g. from Spotify import)
            if (playlist.image) {
              return {
                ...playlist,
                isCollage: false
              }
            }

            // Priority 2: Generate collage/thumbnail from songs
            if (playlist.songIds && playlist.songIds.length > 0) {
              const songsToFetch = playlist.songIds.slice(0, 4)
              const validImages = songsToFetch
                .map(id => {
                  const song = songCache[id]
                  if (song && song.image) {
                    return song.image.find(i => i.quality === '150x150')?.url || song.image[0]?.url
                  }
                  return null
                })
                .filter(Boolean)

              if (validImages.length > 0) {
                return {
                  ...playlist,
                  collageImages: validImages,
                  isCollage: validImages.length >= 4,
                  image: validImages.length < 4 ? validImages[0] : null
                }
              }
            }
          })

          if (isMounted) {
            setCreatedPlaylists(playlistsWithCovers)

            // OPTIMIZATION: Store slim version of data to save session quota
            const litePlaylists = playlistsWithCovers.map(p => ({
              ...p,
              songs: p.songs?.map(s => ({ id: s.id, image: s.image }))
            }))

            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(litePlaylists))
            } catch (e) {
              console.warn("Library storage quota error", e);
              // Clean up on quota error
              Object.keys(sessionStorage).forEach(k => {
                if (k.startsWith('created_playlists_') || k.startsWith('library_scroll_')) {
                  sessionStorage.removeItem(k);
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch created playlists", error)
      } finally {
        if (isMounted) setLoadingCreated(false)
      }
    }
    fetchCreatedPlaylists()

    return () => {
      isMounted = false
    }
  }, [userId])

  const isAnyLoading = loadingPlaylists || loadingAlbums || loadingArtists || loadingSongs || loadingCreated
  const likedSongsCount = getLikedCount()

  const filteredItems = useMemo(() => {
    const items = []

    // 1. Liked Songs (Special Playlist)
    if (activeTab === "All" || activeTab === "Playlists") {
      items.push({
        id: "liked-songs",
        title: "Liked Songs",
        subtitle: `Playlist • ${likedSongsCount} songs`,
        type: "playlist",
        isLikedSongs: true,
        onClick: "/music/favorites",
      })
    }

    // 2. Playlists (Created & Liked)
    if (activeTab === "All" || activeTab === "Playlists") {
      createdPlaylists.forEach((playlist) => {
        items.push({
          id: playlist._id || playlist.playlistId,
          title: playlist.name || playlist.playlistName || "Unknown Playlist",
          subtitle: `${playlist.songIds?.length || 0} songs`,
          image: playlist.image,
          collageImages: playlist.collageImages,
          isCollage: playlist.isCollage,
          type: "playlist",
          onClick: `/music/playlists/${playlist._id || playlist.playlistId}`,
        })
      })

      likedPlaylists?.forEach((playlist) => {
        if (createdPlaylists.some(cp => cp._id === playlist.playlistId)) return
        const playlistUrl = playlist.isUserPlaylist ? `/music/playlists/${playlist.playlistId}` : `/music/playlist/${playlist.playlistId}`
        items.push({
          id: playlist.playlistId,
          title: playlist.playlistName || playlist.name || playlist.title || "Unknown Playlist",
          subtitle: `${playlist.songIds?.length || 0} songs`,
          image: playlist.image,
          collageImages: playlist.collageImages,
          isCollage: playlist.isCollage,
          type: "playlist",
          onClick: playlistUrl,
        })
      })
    }

    // 3. Albums
    if (activeTab === "All" || activeTab === "Albums") {
      likedAlbums?.forEach((album) => {
        const artistName = album.artists?.[0]?.name || "Unknown Artist"
        items.push({
          id: album.albumId,
          title: album.name || album.title || "Unknown Album",
          subtitle: `Album • ${artistName}`,
          image: album.image,
          type: "album",
          onClick: `/music/album/${album.albumId}`,
        })
      })
    }

    // 4. Artists
    if (activeTab === "All" || activeTab === "Artists") {
      likedArtists?.forEach((artist) => {
        items.push({
          id: artist.artistId,
          title: artist.artistName || artist.name || "Unknown Artist",
          subtitle: "Artist",
          image: artist.image,
          type: "artist",
          onClick: `/music/artist/${artist.artistId}`,
        })
      })
    }
    return items
  }, [activeTab, likedPlaylists, likedAlbums, likedArtists, likedSongsCount, createdPlaylists])

  // Robust scroll restoration
  useEffect(() => {
    if (!isAnyLoading && filteredItems.length > 0 && scrollContainerRef.current && !scrollRestored && userId) {
      const scrollKey = `library_scroll_${userId}`
      const savedPosition = sessionStorage.getItem(scrollKey)

      if (savedPosition) {
        const pos = parseInt(savedPosition)
        let frames = 0
        const attemptScroll = () => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = pos
            if (scrollContainerRef.current.scrollTop >= pos || frames > 5) {
              setScrollRestored(true)
            } else {
              frames++
              requestAnimationFrame(attemptScroll)
            }
          }
        }
        requestAnimationFrame(attemptScroll)
      } else {
        setScrollRestored(true)
      }
    } else if (!isAnyLoading && filteredItems.length === 0) {
      setScrollRestored(true)
    }
  }, [isAnyLoading, filteredItems.length, scrollRestored, userId])

  const toggleTab = useCallback((tab) => {
    setActiveTab(prev => prev === tab ? "All" : tab)
  }, [])

  const handleBack = useCallback(() => router.back(), [router])

  const getImageSrc = useCallback((image) => {
    if (!image) return null
    if (Array.isArray(image)) {
      return image.find((img) => img.quality === "500x500")?.url || image[0]?.url
    }
    return image
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset
        className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col"
        onScroll={(e) => {
          if (userId && !isAnyLoading && scrollRestored) {
            const scrollKey = `library_scroll_${userId}`
            sessionStorage.setItem(scrollKey, e.currentTarget.scrollTop.toString())
          }
        }}
        ref={scrollContainerRef}
      >
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1 hidden md:inline" />
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2 hidden md:flex">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="">Back</span>
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Your Library</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div
          className="flex-1 p-4 md:p-6 pb-24"
        >
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {/* Clear filter button (optional, but "X" pattern is common) - implicit by toggling off or clicking 'All' if we had one, but effectively unselecting current tab works */}
            {activeTab !== "All" && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 px-3"
                onClick={() => setActiveTab("All")}
              >
                X
              </Button>
            )}

            {TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "secondary"}
                size="sm"
                className={cn(
                  "rounded-full h-8 px-4 transition-all",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
                onClick={() => toggleTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>

          {/* Grid Layout or Skeleton */}
          {isAnyLoading ? (
            <LibrarySkeleton />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 min-[2400px]:grid-cols-11 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                {filteredItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.onClick}
                    className="group relative rounded-md hover:bg-zinc-800/30 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`View ${item.type} ${item.title}`}
                  >
                    {/* Image Container */}
                    <div className={cn(
                      "aspect-square w-full mb-2 overflow-hidden shadow-lg relative",
                      item.type === "artist" ? "rounded-full" : "rounded-md"
                    )}>
                      {item.isLikedSongs ? (
                        <div className="w-full h-full bg-linear-to-br from-indigo-700 to-indigo-300 flex items-center justify-center">
                          <Heart className="w-1/3 h-1/3 text-white fill-current" />
                        </div>
                      ) : item.isCollage ? (
                        <PlaylistCollage images={item.collageImages} />
                      ) : getImageSrc(item.image) ? (
                        <img
                          src={getImageSrc(item.image)}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <span className="text-2xl font-bold text-zinc-600">
                            {item.title?.charAt(0) || "?"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Text Content */}
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-bold text-white truncate text-[15px]">
                        {item.title}
                      </h3>
                      <p className="text-sm text-zinc-400 truncate font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Empty State */}
              {filteredItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <h3 className="text-xl font-bold mb-2">No results found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or liking some content.</p>
                </div>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
