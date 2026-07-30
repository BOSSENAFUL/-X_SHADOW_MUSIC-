/* eslint-disable @next/next/no-img-element */
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
import { ArrowLeft, Heart, Loader2, Search, Plus, Grid, List, ArrowDownUp, Music } from "lucide-react"
import { FaSpotify, FaYoutube } from "react-icons/fa"
import { SiApplemusic } from "react-icons/si"
import { IoMdPlay } from "react-icons/io"
import { HiPause } from "react-icons/hi2"
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists"
import { useLikedAlbums } from "@/hooks/useLikedAlbums"
import { useLikedArtists } from "@/hooks/useLikedArtists"
import { useLikedSongs } from "@/hooks/useLikedSongs"
import { useMusicPlayer } from "@/contexts/music-player-context"
import { trackRecentlyPlayed } from "@/lib/track-playlist"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from "@/components/ui/breadcrumb"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
const TABS = ["Playlists", "Albums", "Artists"]
const SORT_LABELS = {
  "recents": "Recents",
  "recently-added": "Recently added",
  "alphabetical": "Alphabetical",
  "creator": "Creator",
}

const PlaylistCollage = memo(({ images }) => {
  if (!images || images.length === 0) return null;
  const displayImages = images.slice(0, 4);

  if (displayImages.length < 4) {
    return (
      <img
        src={displayImages[0]}
        alt="Playlist Cover"
        className="w-full h-full object-cover"
        onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
      {displayImages.map((src, idx) => (
        <div key={idx} className="relative w-full h-full overflow-hidden border-[0.5px] border-black/10">
          <img
            src={src}
            alt={`Collage ${idx}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
          />
        </div>
      ))}
    </div>
  );
});
PlaylistCollage.displayName = "PlaylistCollage";

const LibrarySkeleton = memo(({ isGridView = true }) => {
  if (isGridView) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="group relative rounded-md">
            <Skeleton className="aspect-square w-full mb-2 bg-muted rounded-none" />
            <div className="min-w-0 space-y-1.5 mt-1">
              <Skeleton className="h-4 w-full bg-muted" />
              <Skeleton className="h-3 w-2/3 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-1">
          <Skeleton className="w-16 h-16 shrink-0 bg-muted rounded-none" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 bg-muted" />
            <Skeleton className="h-3.5 w-1/4 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
});
LibrarySkeleton.displayName = "LibrarySkeleton";

export default function LibraryContent() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id
  const [activeTab, setActiveTab] = useState("All") // All, Playlists, Albums, Artists
  const [scrollRestored, setScrollRestored] = useState(false)
  // Read synchronously before first paint so content never flashes at wrong scroll
  const [hasSavedScroll, setHasSavedScroll] = useState(() => {
    if (typeof window !== "undefined") {
      // We don't have userId yet on first render — check any key matching pattern
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith("library_scroll_") && sessionStorage.getItem(key)) {
          return true
        }
      }
    }
    return false
  })
  const [playingId, setPlayingId] = useState(null)
  const scrollContainerRef = useRef(null)
  const { playSong, currentPlaylistId, isPlaying, togglePlayPause } = useMusicPlayer()

  const handlePlay = useCallback(async (item, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentPlaylistId === item.id) {
      togglePlayPause()
      return
    }
    if (playingId === item.id) return
    setPlayingId(item.id)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      let songs = []
      let source = item.type === 'album' ? 'jiosaavn' : 'user'

      if (item.isLikedSongs) {
        const res = await fetch('/api/favorites')
        const data = await res.json()
        if (data.success && data.data?.length) {
          const ids = data.data.map(f => f.songId || f.id)
          const songsRes = await fetch(`${apiUrl}/api/songs?ids=${ids.join(',')}`)
          const songsData = await songsRes.json()
          if (songsData.success && songsData.data) songs = songsData.data
        }
      } else if (item.type === 'playlist') {
        const pid = item.id
        if (item.source === 'user') {
          const res = await fetch(`/api/playlists/${pid}`)
          const result = await res.json()
          if (result.success && result.data?.songIds?.length) {
            const songsRes = await fetch(`${apiUrl}/api/songs?ids=${result.data.songIds.join(',')}`)
            const songsData = await songsRes.json()
            if (songsData.success && songsData.data) {
              const map = {}
              songsData.data.forEach(s => { map[s.id] = s })
              songs = result.data.songIds.map(id => map[id]).filter(Boolean)
            }
          }
          source = 'user'
        } else {
          const res = await fetch(`${apiUrl}/api/playlists?id=${pid}&page=0&limit=${item.songCount || 50}`)
          const data = await res.json()
          if (data.success && data.data?.songs) songs = data.data.songs
          source = 'jiosaavn'
        }
      } else if (item.type === 'album') {
        const res = await fetch(`${apiUrl}/api/albums?id=${item.id}`)
        const data = await res.json()
        if (data.success && data.data?.songs) songs = data.data.songs
      }

      if (songs.length > 0) {
        playSong(songs[0], songs, item.id)
        if (session?.user?.id) {
          await trackRecentlyPlayed(item, source, songs)
          // Invalidate cached sort order so next page load re-fetches fresh order
          try { sessionStorage.removeItem("library_recently_played_ids") } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error playing from library:', err)
    } finally {
      setPlayingId(null)
    }
  }, [playingId, playSong, session, currentPlaylistId, isPlaying, togglePlayPause])

  const { likedPlaylists, loading: loadingPlaylists } = useLikedPlaylists(userId)
  const { likedAlbums, loading: loadingAlbums } = useLikedAlbums(userId)
  const { likedArtists, loading: loadingArtists } = useLikedArtists(userId)
  const { getLikedCount, loading: loadingSongs } = useLikedSongs(userId)

  const [createdPlaylists, setCreatedPlaylists] = useState([])
  const [loadingCreated, setLoadingCreated] = useState(true)
  const [isGridView, setIsGridView] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("library_view_preference")
      if (saved !== null) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          return true
        }
      }
    }
    return true
  })

  // Save layout preference when toggled
  const toggleGridView = useCallback(() => {
    setIsGridView(prev => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("library_view_preference", JSON.stringify(next))
      }
      return next
    })
  }, [])
  const [sortBy, setSortBy] = useState("recents") // recents, recently-added, alphabetical, creator
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState(() => {
    // Immediately restore cached recently-played order so the list renders
    // in the correct sort order on the very first frame (no flash on back-nav)
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("library_recently_played_ids")
        if (cached) return JSON.parse(cached)
      } catch (e) {}
    }
    return []
  })
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const scrollTimeoutRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    fetch('/api/recently-played-playlists')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const ids = data.data.map(item => ({
            id: item.playlistId,
            playedAt: new Date(item.playedAt || 0).getTime()
          }))
          setRecentlyPlayedIds(ids)
          // Cache for instant restore on next navigation
          try {
            sessionStorage.setItem("library_recently_played_ids", JSON.stringify(ids))
          } catch (e) {}
        }
      })
      .catch(err => console.error("Error fetching recently played for sorting:", err))
  }, [userId])

  // Reset scroll state when user changes (handles multi-user same session)
  useEffect(() => {
    setScrollRestored(false)
    // Recheck the saved scroll flag with the now-known userId
    if (userId) {
      const scrollKey = `library_scroll_${userId}`
      setHasSavedScroll(!!sessionStorage.getItem(scrollKey))
    }
  }, [userId])

  // Restore tab and sort preferences when userId becomes available
  useEffect(() => {
    if (!userId) return
    const savedTab = sessionStorage.getItem(`library_active_tab_${userId}`)
    if (savedTab) {
      setActiveTab(savedTab)
    }
    const savedSort = sessionStorage.getItem(`library_sort_by_${userId}`)
    if (savedSort) {
      setSortBy(savedSort)
    }
  }, [userId])

  // Save tab preference to sessionStorage when it changes
  useEffect(() => {
    if (userId) {
      sessionStorage.setItem(`library_active_tab_${userId}`, activeTab)
    }
  }, [activeTab, userId])

  // Save sort preference to sessionStorage when it changes
  useEffect(() => {
    if (userId) {
      sessionStorage.setItem(`library_sort_by_${userId}`, sortBy)
    }
  }, [sortBy, userId])

  // Memoized cache for session to avoid refetching on "back" navigation
  useEffect(() => {
    let isMounted = true

    if (!userId) {
      if (isMounted) setLoadingCreated(false)
      return
    }

    const fetchCreatedPlaylists = async () => {
      // Check if we have data in session storage to avoid refetching on back navigation
      const CACHE_VERSION = 'v3' // bump this to invalidate stale cache
      const cacheKey = `created_playlists_${userId}_${CACHE_VERSION}`
      const cached = sessionStorage.getItem(cacheKey)

      // Also clear any old versioned cache keys
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith(`created_playlists_${userId}`) && k !== cacheKey) {
          sessionStorage.removeItem(k)
        }
      })

      if (cached) {
        const parsed = JSON.parse(cached)
        // Validate cache integrity — filter out any null/undefined entries from old bug
        const valid = parsed.filter(Boolean)
        setCreatedPlaylists(valid)
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
            const sc = playlist.songIds?.length || 0

            // Priority 1: Explicitly stored image
            if (playlist.image) {
              return {
                ...playlist,
                songCount: sc,
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
                  songCount: sc,
                  collageImages: validImages,
                  isCollage: validImages.length >= 4,
                  image: validImages[0] // Set primary image fallback to first song
                }
              }
            }

            // Priority 3: No image available
            return {
              ...playlist,
              songCount: sc,
              isCollage: false
            }
          })

          if (isMounted) {
            setCreatedPlaylists(playlistsWithCovers)

            // OPTIMIZATION: Store slim version of data to save session quota
            const litePlaylists = playlistsWithCovers.map(p => {
              const { songIds, ...rest } = p;
              return {
                ...rest,
                // Keep only necessary data for grid view
                songCount: p.songCount,
                isCollage: p.isCollage,
                collageImages: p.collageImages,
                image: p.image
              };
            })

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
        source: 'user',
        onClick: "/music/favorites",
        timestamp: Infinity,
        creator: "You",
      })
    }

    // 2. Playlists (Created & Liked)
    if (activeTab === "All" || activeTab === "Playlists") {
      likedPlaylists?.forEach((playlist) => {
        if (createdPlaylists.some(cp => cp?._id === playlist.playlistId)) return
        const playlistUrl = playlist.isUserPlaylist ? `/music/playlists/${playlist.playlistId}` : `/music/playlist/${playlist.playlistId}`
        // User playlists use enriched songCount; JioSaavn playlists use stored songCount
        const count = playlist.songCount ?? playlist.songIds?.length ?? 0
        const timestamp = new Date(playlist.likedAt || playlist.createdAt || 0).getTime()
        items.push({
          id: playlist.playlistId,
          title: playlist.playlistName || playlist.name || playlist.title || "Unknown Playlist",
          subtitle: `${count} ${count === 1 ? 'song' : 'songs'}`,
          image: playlist.image,
          collageImages: playlist.collageImages,
          isCollage: playlist.isCollage,
          type: "playlist",
          onClick: playlistUrl,
          source: playlist.isUserPlaylist ? 'user' : 'jiosaavn',
          songCount: count,
          timestamp,
          creator: playlist.owner || "Unknown",
        })
      })

      createdPlaylists.forEach((playlist) => {
        if (!playlist) return // skip undefined entries
        const count = playlist.songCount ?? playlist.songIds?.length ?? 0
        const timestamp = new Date(playlist.createdAt || 0).getTime()
        items.push({
          id: playlist._id || playlist.playlistId,
          title: playlist.name || playlist.playlistName || "Unknown Playlist",
          subtitle: `${count} ${count === 1 ? 'song' : 'songs'}`,
          image: playlist.image,
          collageImages: playlist.collageImages,
          isCollage: playlist.isCollage,
          type: "playlist",
          onClick: `/music/playlists/${playlist._id || playlist.playlistId}`,
          source: 'user',
          songCount: count,
          timestamp,
          creator: 'You',
        })
      })
    }

    // 3. Albums
    if (activeTab === "All" || activeTab === "Albums") {
      likedAlbums?.forEach((album) => {
        const artistName = album.artists?.[0]?.name || "Unknown Artist"
        const timestamp = new Date(album.likedAt || 0).getTime()
        items.push({
          id: album.albumId,
          title: album.name || album.title || "Unknown Album",
          subtitle: `Album • ${artistName}`,
          image: album.image,
          type: "album",
          onClick: `/music/album/${album.albumId}`,
          timestamp,
          creator: artistName,
        })
      })
    }

    // 4. Artists
    if (activeTab === "All" || activeTab === "Artists") {
      likedArtists?.forEach((artist) => {
        const timestamp = new Date(artist.likedAt || 0).getTime()
        const artistName = artist.artistName || artist.name || "Unknown Artist"
        items.push({
          id: artist.artistId,
          title: artistName,
          subtitle: "Artist",
          image: artist.image,
          type: "artist",
          onClick: `/music/artist/${artist.artistId}`,
          timestamp,
          creator: artistName,
        })
      })
    }

    // Separate Liked Songs from other items for sorting
    const likedSongsItem = items.find(item => item.isLikedSongs)
    const otherItems = items.filter(item => !item.isLikedSongs)

    // Sort otherItems according to selected sortBy option
    if (sortBy === 'recents') {
      otherItems.sort((a, b) => {
        const aPlayed = recentlyPlayedIds.find(rp => rp.id === a.id)?.playedAt || 0
        const bPlayed = recentlyPlayedIds.find(rp => rp.id === b.id)?.playedAt || 0
        const aTime = Math.max(aPlayed, a.timestamp || 0)
        const bTime = Math.max(bPlayed, b.timestamp || 0)
        return bTime - aTime
      })
    } else if (sortBy === 'recently-added') {
      otherItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    } else if (sortBy === 'alphabetical') {
      otherItems.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'creator') {
      otherItems.sort((a, b) => {
        const aCreator = a.creator || ""
        const bCreator = b.creator || ""
        const creatorCompare = aCreator.localeCompare(bCreator)
        if (creatorCompare !== 0) return creatorCompare
        return a.title.localeCompare(b.title)
      })
    }

    let finalItems = likedSongsItem ? [likedSongsItem, ...otherItems] : otherItems

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      finalItems = finalItems.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(q)
        const subtitleMatch = item.subtitle?.toLowerCase().includes(q)
        const creatorMatch = item.creator?.toLowerCase().includes(q)
        return titleMatch || subtitleMatch || creatorMatch
      })
    }

    return finalItems
  }, [activeTab, likedPlaylists, likedAlbums, likedArtists, likedSongsCount, createdPlaylists, sortBy, recentlyPlayedIds, searchQuery])

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
            const currentScroll = scrollContainerRef.current.scrollTop
            const maxScroll = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight
            
            if (currentScroll >= pos || currentScroll >= maxScroll - 5 || frames > 15) {
              setScrollRestored(true)
              setHasSavedScroll(false)
            } else {
              frames++
              requestAnimationFrame(attemptScroll)
            }
          } else {
            setScrollRestored(true)
            setHasSavedScroll(false)
          }
        }
        requestAnimationFrame(attemptScroll)
      } else {
        setScrollRestored(true)
        setHasSavedScroll(false)
      }
    } else if (!isAnyLoading && filteredItems.length === 0) {
      setScrollRestored(true)
      setHasSavedScroll(false)
    }

    // Cleanup timeout on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [isAnyLoading, filteredItems.length, scrollRestored, userId])

  const toggleTab = useCallback((tab) => {
    setActiveTab(prev => {
      const next = prev === tab ? "All" : tab
      if (userId) {
        sessionStorage.removeItem(`library_scroll_${userId}`)
      }
      return next
    })
  }, [userId])

  const clearTabFilter = useCallback(() => {
    setActiveTab("All")
    if (userId) {
      sessionStorage.removeItem(`library_scroll_${userId}`)
    }
  }, [userId])

  const handleSortChange = useCallback((key) => {
    setSortBy(key)
    if (userId) {
      sessionStorage.removeItem(`library_scroll_${userId}`)
    }
  }, [userId])

  const handleBack = useCallback(() => router.back(), [router])

  const handleCreatePlaylist = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Clear caches so the new playlist is loaded
        sessionStorage.removeItem(`created_playlists_${userId}_v3`);
        // Navigate to the newly created playlist page
        router.push(`/music/playlists/${result.data._id}`);
      } else {
        console.error('Failed to create playlist:', result.error);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  }, [userId, router]);

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
          if (userId && !isAnyLoading && scrollRestored && e.currentTarget) {
            const scrollPosition = e.currentTarget.scrollTop
            // Throttle scroll position saving to improve performance
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current)
            }
            scrollTimeoutRef.current = setTimeout(() => {
              const scrollKey = `library_scroll_${userId}`
              sessionStorage.setItem(scrollKey, scrollPosition.toString())
            }, 150)
          }
        }}
        ref={scrollContainerRef}
      >
        <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
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

        {/* Mobile Spotify-style Header & Controls */}
        <div className="sticky top-0 z-40 bg-background px-4 py-4 md:hidden border-b border-white/5">
          {isSearchActive ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsSearchActive(false)
                  setSearchQuery("")
                }}
                className="text-white hover:text-white/80 p-1 outline-none"
                aria-label="Exit search"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Your Library"
                  className="w-full bg-muted/50 text-white placeholder:text-muted-foreground text-sm font-medium rounded-lg pl-9 pr-10 py-2.5 outline-none border-0 focus:bg-muted/70 transition-colors"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Bar: Profile, Title, Action Icons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href="/music/profile" className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full">
                    {session?.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                        {session?.user?.name?.charAt(0).toUpperCase() || "J"}
                      </div>
                    )}
                  </Link>
                  <h1 className="text-2xl font-bold tracking-tight text-white select-none">Your Library</h1>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsSearchActive(true)}
                    className="text-white/80 hover:text-white p-1 outline-none"
                    aria-label="Search library"
                  >
                    <Search className="w-6 h-6" />
                  </button>
                  <Drawer>
                    <DrawerTrigger asChild>
                      <button
                        className="text-white/80 hover:text-white p-1 outline-none"
                        aria-label="Add or import"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="pb-8 px-4 bg-[#1F1F1F] border-zinc-800 text-white rounded-t-2xl border-t">
                      <div className="sr-only">
                        <DrawerTitle>Add to Library</DrawerTitle>
                      </div>
                      
                      <div className="flex flex-col mt-5 gap-y-5 px-2">
                        {/* Option 1: Create Playlist */}
                        <DrawerClose asChild>
                          <button
                            onClick={handleCreatePlaylist}
                            className="flex items-center gap-4 text-left w-full hover:bg-white/5 p-2 rounded-xl transition-colors outline-none"
                          >
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                              <Music className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-[15px] leading-snug">Create a new playlist</div>
                              <div className="text-zinc-400 text-xs font-medium mt-0.5">Build a custom tracklist from scratch</div>
                            </div>
                          </button>
                        </DrawerClose>

                        {/* Option 2: Import from Spotify */}
                        <DrawerClose asChild>
                          <button
                            onClick={() => router.push('/music/playlists?import=spotify')}
                            className="flex items-center gap-4 text-left w-full hover:bg-white/5 p-2 rounded-xl transition-colors outline-none"
                          >
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-[#1DB954] shrink-0">
                              <FaSpotify className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-[15px] leading-snug">Import from Spotify</div>
                              <div className="text-zinc-400 text-xs font-medium mt-0.5">Migrate your public Spotify playlists</div>
                            </div>
                          </button>
                        </DrawerClose>

                        {/* Option 3: Import from YouTube Music */}
                        <DrawerClose asChild>
                          <button
                            onClick={() => router.push('/music/playlists?import=youtube')}
                            className="flex items-center gap-4 text-left w-full hover:bg-white/5 p-2 rounded-xl transition-colors outline-none"
                          >
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-[#FF0000] shrink-0">
                              <FaYoutube className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-[15px] leading-snug">Import from YouTube Music</div>
                              <div className="text-zinc-400 text-xs font-medium mt-0.5">Sync your public YouTube Music playlists</div>
                            </div>
                          </button>
                        </DrawerClose>

                        {/* Option 4: Import from Apple Music */}
                        <DrawerClose asChild>
                          <button
                            onClick={() => router.push('/music/playlists?import=apple')}
                            className="flex items-center gap-4 text-left w-full hover:bg-white/5 p-2 rounded-xl transition-colors outline-none"
                          >
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-[#FC3C44] shrink-0">
                              <SiApplemusic className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-bold text-[15px] leading-snug">Import from Apple Music</div>
                              <div className="text-zinc-400 text-xs font-medium mt-0.5">Transfer your public Apple Music playlists</div>
                            </div>
                          </button>
                        </DrawerClose>
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {activeTab !== "All" && (
                  <button
                    className="rounded-full bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 text-xs font-bold shrink-0"
                    onClick={clearTabFilter}
                  >
                    Clear
                  </button>
                )}
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0",
                      activeTab === tab
                        ? "bg-green-500 text-black font-extrabold"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    onClick={() => toggleTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className={`flex-1 pt-2 px-4 pb-36 md:pt-6 md:px-6 md:pb-36 transition-opacity duration-75 ${hasSavedScroll ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          {/* Mobile Sorting and Layout Toggle Row */}
          <div className="flex items-center justify-between text-xs text-white/80 pb-2 md:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <button className="flex items-center gap-1.5 hover:text-white font-semibold outline-none">
                  <ArrowDownUp className="w-4 h-4 text-white" />
                  <span>{SORT_LABELS[sortBy]}</span>
                </button>
              </DrawerTrigger>
              <DrawerContent className="pb-8 px-4 bg-[#1F1F1F] border-zinc-800 text-white rounded-t-2xl border-t">
                <DrawerHeader className="pb-4 border-b border-zinc-800 text-center">
                  <DrawerTitle className="text-center text-lg font-bold text-white tracking-tight">Sort by</DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col mt-4 gap-y-1">
                  {Object.entries(SORT_LABELS).map(([key, label]) => (
                    <DrawerClose asChild key={key}>
                      <button
                        onClick={() => handleSortChange(key)}
                        className={cn(
                          "w-full text-left py-3.5 px-4 rounded-xl text-[15px] font-semibold transition-colors flex items-center justify-between",
                          sortBy === key
                            ? "bg-zinc-800 text-green-500 font-bold"
                            : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                        )}
                      >
                        <span>{label}</span>
                        {sortBy === key && (
                          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        )}
                      </button>
                    </DrawerClose>
                  ))}
                </div>
              </DrawerContent>
            </Drawer>
            <button
              onClick={toggleGridView}
              className="hover:text-white p-1"
            >
              {isGridView ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </button>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {activeTab !== "All" && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 px-3"
                onClick={clearTabFilter}
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
            <LibrarySkeleton isGridView={isGridView} />
          ) : (
            <>
              {isGridView ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6 md:gap-x-4 md:gap-y-8">
                  {filteredItems.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.onClick}
                      className="group relative rounded-md cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`View ${item.type} ${item.title}`}
                    >
                      <div className={cn(
                        "aspect-square w-full mb-3 overflow-hidden shadow-lg relative border border-border",
                        item.type === "artist" ? "rounded-full" : "rounded-none"
                      )}>
                        {item.isLikedSongs ? (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-indigo-300 flex items-center justify-center">
                            <Heart className="w-1/3 h-1/3 text-white fill-current" />
                          </div>
                        ) : (item.isCollage && item.collageImages?.length >= 4) ? (
                          <PlaylistCollage images={item.collageImages} />
                        ) : (getImageSrc(item.image) || (item.collageImages && item.collageImages[0])) ? (
                          <img
                            src={getImageSrc(item.image) || item.collageImages[0]}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-2xl font-bold text-muted-foreground">
                              {item.title?.charAt(0) || "?"}
                            </span>
                          </div>
                        )}

                        {item.type !== "artist" && (
                          <div className={`absolute bottom-2 right-2 transition-all duration-300 z-20 hidden md:flex ${
                            currentPlaylistId === item.id && isPlaying
                              ? 'opacity-100 translate-y-0'
                              : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
                          }`}>
                            <div
                              className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 hover:scale-105 flex items-center justify-center text-black shadow-lg transition-transform cursor-pointer"
                              onClick={(e) => handlePlay(item, e)}
                            >
                              {playingId === item.id ? (
                                <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-black" />
                              ) : currentPlaylistId === item.id && isPlaying ? (
                                <HiPause className="w-5 h-5 md:w-6 md:h-6 fill-black" />
                              ) : (
                                <IoMdPlay className="w-5 h-5 md:w-6 md:h-6 fill-black translate-x-0.5" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Text Content */}
                      <div className="min-w-0 space-y-0.5">
                        <h3 className={`font-bold truncate text-[15px] text-foreground ${
                          currentPlaylistId === item.id ? 'md:text-green-500' : ''
                        }`}>
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate font-medium">
                          {item.subtitle}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-y-1">
                  {filteredItems.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.onClick}
                      className="flex items-center gap-3 p-1 rounded-md hover:bg-white/5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`View ${item.type} ${item.title}`}
                    >
                      <div className={cn(
                        "w-16 h-16 shrink-0 overflow-hidden relative shadow-md border border-border",
                        item.type === "artist" ? "rounded-full" : "rounded-none"
                      )}>
                        {item.isLikedSongs ? (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-indigo-300 flex items-center justify-center">
                            <Heart className="w-1/3 h-1/3 text-white fill-current" />
                          </div>
                        ) : (item.isCollage && item.collageImages?.length >= 4) ? (
                          <PlaylistCollage images={item.collageImages} />
                        ) : (getImageSrc(item.image) || (item.collageImages && item.collageImages[0])) ? (
                          <img
                            src={getImageSrc(item.image) || item.collageImages[0]}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-xl font-bold text-muted-foreground">
                              {item.title?.charAt(0) || "?"}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Text Content */}
                      <div className="min-w-0 flex-1">
                        <h3 className={`font-bold truncate text-[15px] text-foreground ${
                          currentPlaylistId === item.id ? 'text-green-500' : ''
                        }`}>
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate font-medium capitalize">
                          {item.type === 'playlist' ? 'Playlist' : item.type === 'album' ? 'Album' : 'Artist'} • {item.subtitle}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

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
