/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Heart, Pause, MoreVertical, Plus, User, Disc, Share, Download, Clock, ChevronLeft, ChevronRight, Music2 } from "lucide-react";
import { IoMdPlay } from "react-icons/io";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { toast } from "sonner";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerPortal,
} from "@/components/ui/drawer";
import { memo } from "react";
import { genres } from "@/data/genres";
import { PlaylistCover } from "@/components/ui/playlist-cover";
import { downloadWithMetadata } from "@/lib/clientDownload";

// --- Helper Components ---
const SongActionMenu = memo(({
  song,
  onAddToPlaylist,
  onGoToArtist,
  onGoToAlbum,
  onDownload,
  onShare,
  toggleLike,
  isLiked,
  decodeHtmlEntities
}) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const artistNames = song.artists?.primary?.map(a => a.name).join(', ') ||
    (Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : null) ||
    (song.primaryArtists || 'Unknown Artist');

  const songImageUrl = song.image?.find(img => img.quality === '150x150')?.url ||
    song.image?.[song.image.length - 1]?.url ||
    '/default-playlist-image.png';

  const ActionItems = ({ onItemClick }) => (
    <>
      <div
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onAddToPlaylist(e, song);
        }}
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Add to playlist</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          router.push(`/music/song/${song.id}`);
        }}
      >
        <Music2 className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Song detail</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onShare(e, song);
        }}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onGoToArtist(e, song);
        }}
      >
        <User className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Go to artist</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onGoToAlbum(e, song);
        }}
      >
        <Disc className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Go to album</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onDownload(e, song);
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download</span>
      </div>
      <div className="h-px bg-white/5 my-1" />
      <div
        className={`flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-colors ${isLiked(song.id) ? 'text-red-500' : ''}`}
        onClick={(e) => {
          onItemClick();
          e.stopPropagation();
          toggleLike(song).catch(error => console.error('Error toggling song like:', error));
        }}
      >
        <Heart className={`w-5 h-5 ${isLiked(song.id) ? 'fill-current' : ''}`} />
        <span className="font-medium">{isLiked(song.id) ? 'Unlike' : 'Like'}</span>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8 text-muted-foreground hover:bg-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-[#121212] border-none text-white outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-white/10">
                <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0">
                  <img
                    src={songImageUrl}
                    alt={song.name || song.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-white text-left">
                    {decodeHtmlEntities(song.name || song.title)}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    {artistNames}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-2 py-4 pb-8 space-y-1">
              <ActionItems onItemClick={() => setOpen(false)} />
            </div>
          </DrawerContent>
        </div>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 h-6 w-6 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-neutral-900 border-white/10 text-white p-1 z-9999">
        <DropdownMenuItem
          onClick={(e) => onAddToPlaylist(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to playlist
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); router.push(`/music/song/${song.id}`); }}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Music2 className="w-4 h-4 mr-2" />
          Song detail
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => onShare(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Share className="w-4 h-4 mr-2" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => onGoToArtist(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          Go to artist
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => onGoToAlbum(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Disc className="w-4 h-4 mr-2" />
          Go to album
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
          onClick={(e) => onDownload(e, song)}
          className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuItem
          onClick={async (e) => {
            e.stopPropagation();
            await toggleLike(song);
          }}
          className={`hover:bg-white/10 focus:bg-white/10 cursor-pointer ${isLiked(song.id) ? 'text-red-500' : ''}`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
          {isLiked(song.id) ? 'Unlike' : 'Like'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SongActionMenu.displayName = "SongActionMenu";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState(null);
  const [lyricsResults, setLyricsResults] = useState(null);
  const [publicPlaylists, setPublicPlaylists] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [publicPlaylistsLoading, setPublicPlaylistsLoading] = useState(false);
  const [loadedSearchQuery, setLoadedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // State for category-specific results with pagination
  const [categoryData, setCategoryData] = useState({
    songs: { results: [], page: 0, hasMore: true, loading: false },
    albums: { results: [], page: 0, hasMore: true, loading: false },
    artists: { results: [], page: 0, hasMore: true, loading: false },
    playlists: { results: [], page: 0, hasMore: true, loading: false }
  });

  // Observer for infinite scroll
  const observerTarget = useRef(null);
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);

  // Ref for the search input to enable auto-focus
  const searchInputRef = useRef(null);

  // Ref to track current search ID to prevent stale results
  const currentSearchId = useRef(0);

  const { playSong, currentSong, isPlaying, togglePlayPause } = useMusicPlayer();
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);

  // Ref to track if we're restoring from sessionStorage (to prevent re-searching)
  const isRestoringFromStorage = useRef(false);

  // Ref to track if we're currently switching tabs (to prevent overwriting scroll position)
  const isSwitchingTab = useRef(false);


  // State to control visibility during initial scroll restoration from storage
  // Default to true (hidden) to prevent flash of wrong scroll position
  const [isInitialRestore, setIsInitialRestore] = useState(true);
  // Ref for the scrollable container
  const scrollContainerRef = useRef(null);

  // Refs to store scroll positions for each tab
  const tabScrollPositions = useRef({
    all: 0,
    songs: 0,
    albums: 0,
    artists: 0,
    playlists: 0
  });

  // --- Utility Functions ---
  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    if (typeof window === 'undefined') return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getArtistNames = (item) => {
    let result = 'Unknown Artist';

    // Handle detailed song API response (artists.primary array) - prioritize this
    if (item.artists?.primary && Array.isArray(item.artists.primary) && item.artists.primary.length > 0) {
      result = item.artists.primary.map(artist => artist.name || artist).join(', ');
    }
    // Handle search API response (primaryArtists string)
    else if (item.primaryArtists && typeof item.primaryArtists === 'string') {
      result = item.primaryArtists;
    }
    else if (item.artist && typeof item.artist === 'string') {
      result = item.artist;
    }
    else if (item.singers && typeof item.singers === 'string') {
      result = item.singers;
    }

    return decodeHtmlEntities(result);
  };

  // Save current tab's scroll position before switching tabs
  const saveCurrentTabScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      tabScrollPositions.current[activeTab] = scrollContainerRef.current.scrollTop;
    }
  }, [activeTab]);

  // Effect to save scroll position when tab changes
  useEffect(() => {
    return () => {
      saveCurrentTabScroll();
    };
  }, [activeTab, saveCurrentTabScroll]);

  // Restore search state from sessionStorage on mount
  useEffect(() => {
    const savedSearchState = sessionStorage.getItem('searchPageState');
    if (savedSearchState) {
      try {
        const {
          query,
          results,
          lyricsRes,
          publicPlaylists: savedPublicPlaylists,
          tab,
          categoryState,
          scrollPosition,
          tabScrollPositions: savedTabScrollPositions
        } = JSON.parse(savedSearchState);
        if (query) {
          isRestoringFromStorage.current = true;
          setSearchQuery(query);
          if (results) setSearchResults(results);
          if (lyricsRes) setLyricsResults(lyricsRes);
          if (savedPublicPlaylists) setPublicPlaylists(savedPublicPlaylists);
          if (tab) setActiveTab(tab);
          if (categoryState) setCategoryData(categoryState);

          // Restore tab-specific scroll positions
          if (savedTabScrollPositions) {
            tabScrollPositions.current = savedTabScrollPositions;
          }

          // Restore scroll position for the active tab after a short delay to ensure content is rendered
          const scrollToRestore = savedTabScrollPositions?.[tab] ?? scrollPosition ?? 0;
          if (scrollToRestore !== undefined) {


            setTimeout(() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollToRestore;
                // Reveal content after scroll is restored
                requestAnimationFrame(() => {
                  setIsInitialRestore(false);
                });
              } else {
                setIsInitialRestore(false);
              }
            }, 50);
          } else {
            setIsInitialRestore(false);
          }

          // Reset the flag after a short delay to allow the state updates to complete
          setTimeout(() => {
            isRestoringFromStorage.current = false;
          }, 200);
        } else {
          setIsInitialRestore(false);
        }
      } catch (error) {
        console.error('Error restoring search state:', error);
        isRestoringFromStorage.current = false;
        setIsInitialRestore(false);
      }
    } else {
      setIsInitialRestore(false);
    }
  }, []);

  // Add scroll event listener to continuously save scroll position
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (!isRestoringFromStorage.current && !isSwitchingTab.current) {
        tabScrollPositions.current[activeTab] = scrollContainer.scrollTop;
      }
    };

    // Add scroll listener with passive option for better performance
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  // Restore scroll position when switching tabs
  useEffect(() => {
    // Disable scroll tracking immediately when tab changes
    isSwitchingTab.current = true;

    if (scrollContainerRef.current && !isRestoringFromStorage.current) {
      const targetScrollPosition = tabScrollPositions.current[activeTab] || 0;

      // Use requestAnimationFrame to ensure the tab content is rendered before scrolling
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = targetScrollPosition;

          // Re-enable scroll tracking after a short delay
          // This ensures we don't capture the scroll event from the restoration itself
          // or any immediate layout shifts
          setTimeout(() => {
            isSwitchingTab.current = false;
          }, 100);
        } else {
          isSwitchingTab.current = false;
        }
      });
    } else {
      isSwitchingTab.current = false;
    }
  }, [activeTab]);

  // Save search state to sessionStorage whenever it changes
  useEffect(() => {
    if (searchQuery || searchResults) {
      try {
        // Strip downloadUrl arrays to keep storage size small
        const slimResults = searchResults ? {
          ...searchResults,
          songs: searchResults.songs?.slice(0, 50).map(s => ({ ...s, downloadUrl: undefined })),
          albums: searchResults.albums?.slice(0, 20),
          artists: searchResults.artists?.slice(0, 20),
          playlists: searchResults.playlists?.slice(0, 20),
        } : null;
        const searchState = {
          query: searchQuery,
          results: slimResults,
          lyricsRes: lyricsResults?.slice(0, 20),
          publicPlaylists: publicPlaylists?.slice(0, 20),
          tab: activeTab,
          categoryState: categoryData,
          scrollPosition: tabScrollPositions.current[activeTab] || 0,
          tabScrollPositions: tabScrollPositions.current
        };
        sessionStorage.setItem('searchPageState', JSON.stringify(searchState));
      } catch (e) {
        // Quota exceeded - clear and skip saving
        sessionStorage.removeItem('searchPageState');
      }
    }
  }, [searchQuery, searchResults, lyricsResults, publicPlaylists, activeTab, categoryData]);

  // Save scroll position before page unload (when navigating away)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (scrollContainerRef.current) {
        tabScrollPositions.current[activeTab] = scrollContainerRef.current.scrollTop;
        try {
          const slimResults = searchResults ? {
            ...searchResults,
            songs: searchResults.songs?.slice(0, 50).map(s => ({ ...s, downloadUrl: undefined })),
            albums: searchResults.albums?.slice(0, 20),
            artists: searchResults.artists?.slice(0, 20),
            playlists: searchResults.playlists?.slice(0, 20),
          } : null;
          const searchState = {
            query: searchQuery,
            results: slimResults,
            lyricsRes: lyricsResults?.slice(0, 20),
            publicPlaylists: publicPlaylists?.slice(0, 20),
            tab: activeTab,
            categoryState: categoryData,
            scrollPosition: tabScrollPositions.current[activeTab] || 0,
            tabScrollPositions: tabScrollPositions.current
          };
          sessionStorage.setItem('searchPageState', JSON.stringify(searchState));
        } catch (e) {
          sessionStorage.removeItem('searchPageState');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [searchQuery, searchResults, lyricsResults, publicPlaylists, activeTab, categoryData]);

  // Debounced search function
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  const performSearch = async (query, searchId) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?query=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();

      console.log('Search API Response:', data);

      // Check if this is still the current search
      if (searchId !== currentSearchId.current) {
        console.log('Ignoring stale search result');
        return;
      }

      if (data.success) {
        // Deduplicate songs from the API to prevent key collisions
        if (data.data.songs?.results) {
          const uniqueSongs = [];
          const seenSongIds = new Set();

          data.data.songs.results.forEach(song => {
            if (song.id && !seenSongIds.has(song.id)) {
              seenSongIds.add(song.id);
              uniqueSongs.push(song);
            }
          });

          data.data.songs.results = uniqueSongs;
        }

        // Transform the API response to match our expected structure
        const transformedData = {
          topQuery: data.data.topQuery?.results?.[0] || null,
          songs: data.data.songs || { results: [] },
          albums: data.data.albums || { results: [] },
          artists: data.data.artists || { results: [] },
          playlists: data.data.playlists || { results: [] }
        };

        // Enhance artists section by adding song artists if they're not already included
        if (transformedData.songs?.results?.length > 0) {
          // Get unique artists from top 10 songs with proper IDs by fetching detailed song info
          const artistPromises = transformedData.songs.results.slice(0, 10).map(async (song) => {
            try {
              // Fetch detailed song info to get proper artist data with IDs
              const songResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${song.id}`);
              const songData = await songResponse.json();

              if (songData.success && songData.data?.[0]?.artists?.primary) {
                return songData.data[0].artists.primary.map(artist => ({
                  id: artist.id,
                  title: artist.name,
                  name: artist.name,
                  type: 'artist',
                  image: artist.image || song.image || [],
                  isSongArtist: true,
                  needsSearch: false
                }));
              }
              return [];
            } catch (error) {
              console.error('Error fetching song details for artist extraction:', error);
              return [];
            }
          });

          const artistResults = await Promise.all(artistPromises);
          const songArtists = artistResults.flat().filter(artist => artist && artist.title);

          // Add song artists to the beginning of artists array
          if (songArtists.length > 0) {
            transformedData.artists.results = [...songArtists, ...transformedData.artists.results];
          }
        }

        setSearchResults(prev => {
          if (!prev) return transformedData;
          return {
            ...transformedData,
            songs: prev.songs?.results?.length > transformedData.songs.results.length ? prev.songs : transformedData.songs,
            albums: prev.albums?.results?.length > transformedData.albums.results.length ? prev.albums : transformedData.albums,
            artists: prev.artists?.results?.length > transformedData.artists.results.length ? prev.artists : transformedData.artists,
            playlists: prev.playlists?.results?.length > transformedData.playlists.results.length ? prev.playlists : transformedData.playlists,
          };
        });
        setLoading(false);
        setLoadedSearchQuery(query);
      } else {
        console.error('Search failed:', data.message);
        // Don't clear results on error, keep previous results to prevent layout shift
      }
    } catch (error) {
      console.error('Search error:', error);
      // Don't clear results on error, keep previous results to prevent layout shift
    }
  };

  // Lyrics search function
  const performLyricsSearch = async (query, searchId) => {
    if (!query.trim()) {
      setLyricsResults(null);
      return;
    }

    try {
      const response = await fetch(`/api/search-lyrics?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      // Check if this is still the current search
      if (searchId !== currentSearchId.current) {
        console.log('Ignoring stale lyrics search result');
        return;
      }

      if (data.success) {
        setLyricsResults(data.data);
      } else {
        console.error('Lyrics search failed:', data.error || data.message || 'Unknown error');
        setLyricsResults([]);
      }
    } catch (error) {
      console.error('Lyrics search error:', error);
      setLyricsResults([]);
    }
  };

  // Create a stable debounced search function
  const debouncedSearchRef = useRef();

  if (!debouncedSearchRef.current) {
    debouncedSearchRef.current = debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults(null);
        setLyricsResults(null);
        setPublicPlaylists(null);
        setLoading(false);
        setLyricsLoading(false);
        setPublicPlaylistsLoading(false);
        return;
      }

      // Increment search ID to track this search
      const searchId = ++currentSearchId.current;

      // Set loading states and clear previous results immediately
      setLoading(true);
      setLyricsLoading(true);
      setPublicPlaylistsLoading(true);
      setSearchResults(null);
      setLyricsResults(null);
      setPublicPlaylists(null);

      // Reset category data on new search
      setCategoryData({
        songs: { results: [], page: 0, hasMore: true, loading: false },
        albums: { results: [], page: 0, hasMore: true, loading: false },
        artists: { results: [], page: 0, hasMore: true, loading: false },
        playlists: { results: [], page: 0, hasMore: true, loading: false }
      });

      try {
        // Perform all searches in parallel and wait for all to complete
        await Promise.allSettled([
          performSearch(query, searchId),
          performLyricsSearch(query, searchId),
          performPublicPlaylistsSearch(query, searchId),
          // Also fetch full playlists data for the "All" tab
          (async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=${encodeURIComponent(query)}&page=1&limit=20`);
              const data = await response.json();

              if (searchId === currentSearchId.current && data.success && data.data) {
                // Calculate hasMore using the same logic as fetchCategoryResults
                let hasMore = false;
                if (typeof data.data.total === 'number' && typeof data.data.start === 'number') {
                  hasMore = (data.data.start + data.data.results.length) < data.data.total;
                } else {
                  hasMore = data.data.results.length === 20;
                }

                // Update both searchResults.playlists and categoryData.playlists
                setSearchResults(prev => prev ? {
                  ...prev,
                  playlists: data.data
                } : prev);

                setCategoryData(prev => ({
                  ...prev,
                  playlists: {
                    results: data.data.results || [],
                    page: 1,
                    hasMore: hasMore,
                    loading: false
                  }
                }));
              }
            } catch (error) {
              console.error('Error fetching playlists:', error);
            }
          })(),
          // Also fetch full albums data for the "All" tab
          (async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/albums?query=${encodeURIComponent(query)}&page=1&limit=40`);
              const data = await response.json();

              if (searchId === currentSearchId.current && data.success && data.data) {
                // Calculate hasMore using the same logic as fetchCategoryResults
                let hasMore = false;
                if (typeof data.data.total === 'number' && typeof data.data.start === 'number') {
                  hasMore = (data.data.start + data.data.results.length) < data.data.total;
                } else {
                  hasMore = data.data.results.length === 40;
                }

                // Update both searchResults.albums and categoryData.albums
                setSearchResults(prev => prev ? {
                  ...prev,
                  albums: data.data
                } : prev);

                setCategoryData(prev => ({
                  ...prev,
                  albums: {
                    results: data.data.results || [],
                    page: 1,
                    hasMore: hasMore,
                    loading: false
                  }
                }));
              }
            } catch (error) {
              console.error('Error fetching albums:', error);
            }
          })(),
          // Also fetch full songs data for the "Songs" tab
          (async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=40`);
              const data = await response.json();

              if (searchId === currentSearchId.current && data.success && data.data) {
                // Calculate hasMore using the same logic as fetchCategoryResults
                let hasMore = false;
                if (typeof data.data.total === 'number' && typeof data.data.start === 'number') {
                  hasMore = (data.data.start + data.data.results.length) < data.data.total;
                } else {
                  hasMore = data.data.results.length === 40;
                }

                setCategoryData(prev => ({
                  ...prev,
                  songs: {
                    results: data.data.results || [],
                    page: 1,
                    hasMore: hasMore,
                    loading: false
                  }
                }));
              }
            } catch (error) {
              console.error('Error fetching songs:', error);
            }
          })(),
          // Also fetch full artists data for the "Artists" tab
          (async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/artists?query=${encodeURIComponent(query)}&page=1&limit=40`);
              const data = await response.json();

              if (searchId === currentSearchId.current && data.success && data.data) {
                // Calculate hasMore using the same logic as fetchCategoryResults
                let hasMore = false;
                if (typeof data.data.total === 'number' && typeof data.data.start === 'number') {
                  hasMore = (data.data.start + data.data.results.length) < data.data.total;
                } else {
                  hasMore = data.data.results.length === 40;
                }

                setCategoryData(prev => ({
                  ...prev,
                  artists: {
                    results: data.data.results || [],
                    page: 1,
                    hasMore: hasMore,
                    loading: false
                  }
                }));
              }
            } catch (error) {
              console.error('Error fetching artists:', error);
            }
          })()
        ]);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        // Only set loading to false after ALL searches are complete
        // Check if this is still the current search before updating loading state
        if (searchId === currentSearchId.current) {
          setLoading(false);
          setLyricsLoading(false);
          setPublicPlaylistsLoading(false);
        }
      }
    }, 600);
  }

  // Fetch category results
  const fetchCategoryResults = useCallback(async (category, page = 1) => {
    if (!searchQuery.trim()) return;

    setCategoryData(prev => ({
      ...prev,
      [category]: { ...prev[category], loading: true }
    }));

    try {
      // Use the plural endpoint
      // Add p and n parameters for compatibility with different API versions
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/${category}?query=${encodeURIComponent(searchQuery)}&page=${page}&p=${page}&limit=40&n=40`);
      const data = await response.json();

      if (data.success && data.data) {
        console.log(`[Search] Fetched ${category} page ${page}. Results: ${data.data.results?.length}, Total: ${data.data.total}`);

        setCategoryData(prev => {
          // Deduplicate results for subsequent pages
          let newResults = data.data.results;
          if (page > 1 && prev[category].results.length > 0) {
            const existingIds = new Set(prev[category].results.map(item => item.id));
            newResults = data.data.results.filter(item => !existingIds.has(item.id));
            if (newResults.length === 0 && data.data.results.length > 0) {
              console.warn(`[Search] Page ${page} returned only duplicates. This suggests the API might be ignoring the page parameter.`);
            }
            console.log(`[Search] Deduplicated ${data.data.results.length - newResults.length} items. New unique items: ${newResults.length}`);
          }

          // More robust hasMore calculation using total and start if available
          let hasMore = false;
          // Check if start + results length < total
          if (typeof data.data.total === 'number' && typeof data.data.start === 'number') {
            hasMore = (data.data.start + data.data.results.length) < data.data.total;
            console.log(`[Search] hasMore calculated using total/start: ${data.data.start} + ${data.data.results.length} < ${data.data.total} = ${hasMore}`);
          } else {
            // Fallback to limit check
            hasMore = data.data.results.length === 40;
            console.log(`[Search] hasMore calculated using limit check: ${hasMore} (based on ${data.data.results.length} results)`);
          }

          return {
            ...prev,
            [category]: {
              results: page === 1 ? data.data.results : [...prev[category].results, ...newResults],
              page: page,
              hasMore: hasMore,
              loading: false
            }
          };
        });
      } else {
        console.warn(`[Search] Failed or no data for ${category} page ${page}`, data);
        setCategoryData(prev => ({
          ...prev,
          [category]: { ...prev[category], loading: false, hasMore: false }
        }));
      }
    } catch (error) {
      console.error(`Error fetching ${category}:`, error);
      setCategoryData(prev => ({
        ...prev,
        [category]: { ...prev[category], loading: false }
      }));
    }
  }, [searchQuery]);

  // Effect to fetch initial category data when switching tabs
  useEffect(() => {
    if (activeTab === 'all') return;

    // If we have results from the main "all" search but haven't fetched specific category pages yet (page 0),
    // and aren't currently loading, we should effectively "promote" the existing results to be page 1
    // OR fetch page 1 if we really have nothing.

    // HOWEVER, the issue described is a "switch" or "flash". 
    // This happens because `performSearch` populates `searchResults` (songs, albums etc), but `categoryData` starts empty.
    // When we switch tabs, `fetchCategoryResults(activeTab, 1)` runs.

    // Better strategy: Initialize `categoryData` with `searchResults` data when `searchResults` changes,
    // so the "Songs" tab already has the first batch of songs.

    const currentCategoryState = categoryData[activeTab];

    // Only fetch if we strictly have NO data and aren't loading.
    // But `categoryData` is initialized to empty arrays.
    // We should check if we need to fetch. 

    // If we rely on `searchResults` to populate the initial view, we should sync `searchResults` to `categoryData`
    // OR just use `searchResults` for the first page in the render logic (which we do).

    // The problem is likely that `fetchCategoryResults(activeTab, 1)` is called, which fetches page 1 AGAIN,
    // and the new results might be slightly different or just cause a re-render/flash.

    // If we already have results in `searchResults.songs` (from the main search), 
    // we should treat that as "Page 1" for the songs tab to avoid re-fetching the same thing.

    const hasExistingResultsFromMainSearch =
      searchResults &&
      searchResults[activeTab] &&
      searchResults[activeTab].results &&
      searchResults[activeTab].results.length > 0;

    if (currentCategoryState?.page === 0 && !currentCategoryState?.loading) {
      // Only promote if we have a substantial number of results. 
      // The general search returns a tiny preview (3-5 items) which is NOT page 1.
      if (hasExistingResultsFromMainSearch && searchResults[activeTab].results.length >= 15) {
        console.log(`[Search] Hydrating ${activeTab} with existing results from main search`);

        // For artists, make sure we preserve any injected song artists
        let initialResults = searchResults[activeTab].results;
        if (activeTab === 'artists' && searchResults.artists?.results) {
          // If we have search results, they should already have been enhanced in performSearch
          initialResults = searchResults.artists.results;
        }

        setCategoryData(prev => ({
          ...prev,
          [activeTab]: {
            results: initialResults,
            page: 1, // Mark as page 1 so we don't re-fetch it
            hasMore: true, // Assume there's more
            loading: false
          }
        }));
      } else {
        // Genuine empty state, or we only have a 3-item preview which is useless for a full grid.
        console.log(`[Search] No full existing results for ${activeTab}, fetching page 1`);
        // If we have a tiny preview, we can temporarily show it while loading page 1
        if (hasExistingResultsFromMainSearch) {
          setCategoryData(prev => ({
            ...prev,
            [activeTab]: {
              ...prev[activeTab],
              results: searchResults[activeTab].results,
              page: 0,
              hasMore: true,
              loading: true // Show loading
            }
          }));
        }
        fetchCategoryResults(activeTab, 1);
      }
    }
  }, [activeTab, searchResults]); // Add searchResults to dependency to sync when search finishes

  // Infinite scroll observer
  useEffect(() => {
    // Skip if we're on the 'all' tab
    if (activeTab === 'all') return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          console.log(`[Search] Sentinel intersected. ActiveTab: ${activeTab}, Loading: ${categoryData[activeTab]?.loading}, HasMore: ${categoryData[activeTab]?.hasMore}, Page: ${categoryData[activeTab]?.page}`);
          const currentCategory = categoryData[activeTab];
          if (currentCategory && !currentCategory.loading && currentCategory.hasMore && currentCategory.page > 0) {
            console.log(`[Search] Triggering fetch for page ${currentCategory.page + 1}`);
            fetchCategoryResults(activeTab, currentCategory.page + 1);
          }
        }
      },
      { threshold: 0.1 }
    );

    // Use a small delay to ensure the sentinel is rendered in the DOM
    const timeoutId = setTimeout(() => {
      if (observerTarget.current) {
        console.log(`[Search] Observer attached for ${activeTab} tab`);
        observer.observe(observerTarget.current);
      } else {
        console.log(`[Search] Sentinel not found for ${activeTab} tab. Page: ${categoryData[activeTab]?.page}, HasMore: ${categoryData[activeTab]?.hasMore}`);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
      observer.disconnect();
    };
  }, [activeTab, categoryData, fetchCategoryResults]);

  // Public playlists search function
  const performPublicPlaylistsSearch = async (query, searchId) => {
    if (!query.trim()) {
      setPublicPlaylists(null);
      return;
    }

    try {
      const response = await fetch(`/api/search-public-playlists?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (searchId !== currentSearchId.current) return;

      if (data.success && data.data.length > 0) {
        // Collect first 4 songs for collage from all found playlists
        const allSongIds = new Set();
        data.data.forEach(p => {
          if (p.songIds) p.songIds.slice(0, 4).forEach(sid => allSongIds.add(sid));
        });



        // Batch retrieve all song information in ONE request
        const songCache = {};
        if (allSongIds.size > 0) {
          const idsArray = Array.from(allSongIds);
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

          try {
            // Fetch in chunks of 20 to avoid URL length limits
            const chunkSize = 20;
            for (let i = 0; i < idsArray.length; i += chunkSize) {
              const chunk = idsArray.slice(i, i + chunkSize);
              const songRes = await fetch(`${apiUrl}/api/songs?ids=${chunk.join(',')}`);
              const songsResponseData = await songRes.json();
              if (songsResponseData.success && songsResponseData.data) {
                songsResponseData.data.forEach(s => {
                  if (s) songCache[s.id] = s;
                });
              }
            }
          } catch (e) { console.error("Batch song fetch failed", e); }
        }

        if (searchId !== currentSearchId.current) return;

        // Assemble results locally with enriched song objects for PlaylistCover
        const playlistsWithSongs = data.data.map(playlist => {
          const playlistSongs = (playlist.songIds || [])
            .slice(0, 4)
            .map(sid => songCache[sid])
            .filter(Boolean);

          return {
            ...playlist,
            songs: playlistSongs
          };
        });

        setPublicPlaylists(playlistsWithSongs);
      } else {
        setPublicPlaylists(data.success ? [] : null);
      }
    } catch (error) {
      console.error('Public playlists search error:', error);
      setPublicPlaylists([]);
    }
  };

  // Auto-focus the search input when the page loads
  useEffect(() => {
    // Check if we're restoring from sessionStorage (prevent focus on back navigation)
    const savedSearchState = sessionStorage.getItem('searchPageState');
    if (savedSearchState) {
      try {
        const { query } = JSON.parse(savedSearchState);
        if (query && query.trim()) {
          return;
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    // Small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handle initial query from URL parameters
  useEffect(() => {
    if (initialQuery && initialQuery !== searchQuery) {
      // Only set the search query, let the other useEffect handle the actual search
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  // Handle search query changes (both from user input and initial URL query)
  useEffect(() => {
    // Skip search if we're restoring from sessionStorage
    if (isRestoringFromStorage.current) {
      console.log('Skipping search - restoring from sessionStorage');
      return;
    }

    if (searchQuery.trim()) {
      // Clear results immediately when starting a new search
      setSearchResults(null);
      setLyricsResults(null);
      setPublicPlaylists(null);
      debouncedSearchRef.current(searchQuery);
    } else {
      // Clear results when search query is empty
      setSearchResults(null);
      setLyricsResults(null);
      setPublicPlaylists(null);
      setLoading(false);
      setLyricsLoading(false);
      setPublicPlaylistsLoading(false);
    }
  }, [searchQuery]);

  // Combine and rank search results from all sources (Direct, Lyrics, Category-specific)
  const combinedSearchResults = React.useMemo(() => {
    // Return null while fundamental loading is happening or if we have no base results
    // Keep showing loading until we have actual data to display
    if (loading || lyricsLoading || publicPlaylistsLoading || !searchResults || (!searchResults.topQuery && !searchResults.songs?.results?.length)) {
      return null;
    }

    const searchTerm = (searchQuery || "").toLowerCase().trim();
    if (!searchTerm) return searchResults;

    // 1. Initial State: Start with a clone of regular search results
    const combined = {
      ...searchResults,
      songs: { ...(searchResults.songs || { results: [] }) },
      albums: { ...(searchResults.albums || { results: [] }) },
      artists: { ...(searchResults.artists || { results: [] }) },
      playlists: { ...(searchResults.playlists || { results: [] }) }
    };

    // 2. Hydrate with high-quality specific category fetches
    if (categoryData.songs?.results?.length > 0) {
      if (categoryData.songs.results.length > combined.songs.results.length || combined.songs.results.length === 0) {
        combined.songs.results = categoryData.songs.results;
      }
    }
    if (categoryData.albums?.results?.length > combined.albums.results.length) {
      combined.albums.results = categoryData.albums.results;
    }
    if (categoryData.playlists?.results?.length > combined.playlists.results.length) {
      combined.playlists.results = categoryData.playlists.results;
    }

    // Comprehensive Artist Pooling and Ranking
    const allArtists = [
      ...(searchResults.artists?.results || []),
      ...(categoryData.artists?.results || []),
      ...(combined.artists.results.filter(a => a.isSongArtist) || [])
    ];

    // 3. Merge Lyrics Matches
    let topLyricsMatch = null;
    if (lyricsResults && Array.isArray(lyricsResults) && lyricsResults.length > 0) {
      const lyricsBasedSongs = lyricsResults
        .filter(result => result?.jiosaavn?.id)
        .map((result, index) => ({
          ...result.jiosaavn,
          isLyricsMatch: true,
          geniusData: result.genius,
          lyricsScore: result.finalScore || 0,
          _index: index
        }));

      if (lyricsBasedSongs.length > 0) {
        topLyricsMatch = lyricsBasedSongs[0];
        const existingIds = new Set(combined.songs.results.map(s => s.id));
        const uniqueLyricsSongs = lyricsBasedSongs.filter(s => !existingIds.has(s.id));
        combined.songs.results = [...combined.songs.results, ...uniqueLyricsSongs];
      }
    }

    // 4. Robust Ranking & Sorting
    const getRelevanceScore = (item) => {
      if (!item) return -1000;

      // Decode entities for comparison - helps with exact matches
      const rawTitle = (item.title || item.name || "");
      const title = decodeHtmlEntities(rawTitle).toLowerCase().trim();
      const lyricsScore = item.lyricsScore || 0;

      // Tier 1: Exact matches (always absolute top)
      if (title === searchTerm) return 3000;

      // Tier 2: Starts with the term
      if (title.startsWith(searchTerm)) return 2000;

      // Tier 3: Very high quality lyrics matches (> 500 score)
      if (item.isLyricsMatch && lyricsScore > 500) return 1000 + lyricsScore;

      // Tier 4: Contains the term as a word
      if (title.includes(" " + searchTerm) || title.includes(searchTerm + " ")) return 800;

      // Tier 5: Direct matches from song search generally have a base relevance
      if (!item.isLyricsMatch) {
        // Small boost for artists extracted from top songs as they are highly relevant
        if (item.type === 'artist' && item.isSongArtist) return 600;
        return 400;
      }

      // Tier 6: Regular lyrics matches
      return lyricsScore;
    };

    // Deduplicate and sort artists pool
    const artistSeen = new Set();
    const uniqueArtists = allArtists.filter(a => {
      if (!a) return false;
      const name = decodeHtmlEntities(a.title || a.name || "").toLowerCase().trim();
      const id = a.id;
      const key = id ? `id-${id}` : `name-${name}`;

      if (!name || artistSeen.has(key)) return false;
      artistSeen.add(key);
      return true;
    });

    // Sort all artists by relevance
    uniqueArtists.sort((a, b) => b._index === undefined ? getRelevanceScore(b) - getRelevanceScore(a) : 0);
    combined.artists.results = uniqueArtists;

    // Deduplicate and sort songs
    const seen = new Set();
    const uniqueSongs = combined.songs.results.filter(s => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // Stability Fix for Infinite Scroll: 
    // We only perform the "Smart Ranking" on the "Hero" section (the initial results and lyrics matches).
    // Results from deeper pages (Page 2+) are kept in their stable API order to prevent the UI from jumping
    // when more songs load.

    // Identify which songs belong to the initial "Top Results" set vs "Infinite Scroll" set
    // A song is a "Hero" if it was in the first 60 results OR it's a special high-priority lyrics match
    const threshold = 60;
    const heroSongs = uniqueSongs.slice(0, threshold);
    const deepSongs = uniqueSongs.slice(threshold);

    // Only sort the hero section to establish the "Top Results"
    // We use a stable sort that falls back to original order for equal scores
    heroSongs.sort((a, b) => {
      const scoreDiff = getRelevanceScore(b) - getRelevanceScore(a);
      return scoreDiff;
    });

    // Recombine: Smart Top results first, followed by stable infinite scroll results
    combined.songs.results = [...heroSongs, ...deepSongs];

    // 5. Smart Top Result Picker
    const firstSong = combined.songs.results[0];
    const topQuery = combined.topQuery;
    const songScore = getRelevanceScore(firstSong);
    const currentTopScore = getRelevanceScore(topQuery);

    if (songScore > currentTopScore + 50 || !topQuery) {
      combined.topQuery = { ...firstSong, type: 'song' };
    }
    else if (topLyricsMatch && topLyricsMatch.lyricsScore > 400 && getRelevanceScore(topLyricsMatch) > currentTopScore) {
      combined.topQuery = { ...topLyricsMatch, type: 'song' };
    }

    return combined;
  }, [searchResults, lyricsResults, categoryData, searchQuery, loading, lyricsLoading]);

  const handlePlayClick = async (song, playlist = []) => {
    try {
      // 1. Check if the song is already current - and toggle playback
      if (currentSong?.id === song.id) {
        togglePlayPause();
        return;
      }

      // 2. Always fetch DETAILED song data for playback to ensure highest quality (320kbps)
      // Search results often only have low quality (96k or 160k) or incomplete downloadUrl arrays.
      let detailedCurrentSong = song;

      // Only skip fetch if we are 100% sure we already have the detailed object (e.g. from a previous detail fetch)
      // Checking for downloadUrl length >= 5 is a good heuristic for full Saavn details.
      if (!song.downloadUrl || !Array.isArray(song.downloadUrl) || song.downloadUrl.length < 5) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${song.id}`);
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            detailedCurrentSong = data.data[0];
          }
        } catch (error) {
          console.error("Error fetching high-quality song details:", error);
        }
      }

      // 3. Start playback with high quality data
      // For the rest of the playlist, we can defer detailed fetching if needed,
      // but for the current song we MUST have the quality link now.
      playSong(detailedCurrentSong, playlist);

    } catch (error) {
      console.error('Error in handlePlayClick:', error);
      // Absolute fallback
      playSong(song, playlist);
    }
  };

  const handleArtistClick = async (artistId, artistName = null) => {
    // If it's a generated ID (starts with 'search-'), we need to find the real artist ID
    if (artistId.startsWith('search-') && artistName) {
      try {
        // Search for the artist to get their real ID
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?query=${encodeURIComponent(artistName)}`);
        const data = await response.json();

        if (data.success && data.data.artists?.results?.length > 0) {
          // Find the exact artist match
          const exactMatch = data.data.artists.results.find(artist =>
            artist.title?.toLowerCase() === artistName.toLowerCase() ||
            artist.name?.toLowerCase() === artistName.toLowerCase()
          );

          if (exactMatch && exactMatch.id) {
            router.push(`/music/artist/${exactMatch.id}`);
            return;
          }

          // If no exact match, use the first result
          if (data.data.artists.results[0]?.id) {
            router.push(`/music/artist/${data.data.artists.results[0].id}`);
            return;
          }
        }
      } catch (error) {
        console.error('Error searching for artist:', error);
      }

      // Fallback: show a message or redirect to search
      console.log(`Could not find artist page for: ${artistName}`);
      return;
    }

    // Use the provided ID directly
    router.push(`/music/artist/${artistId}`);
  };

  const saveSearchState = () => {
    if (!scrollContainerRef.current) return;
    tabScrollPositions.current[activeTab] = scrollContainerRef.current.scrollTop;
    try {
      const slimResults = searchResults ? {
        ...searchResults,
        songs: searchResults.songs?.slice(0, 50).map(s => ({ ...s, downloadUrl: undefined })),
        albums: searchResults.albums?.slice(0, 20),
        artists: searchResults.artists?.slice(0, 20),
        playlists: searchResults.playlists?.slice(0, 20),
      } : null;
      sessionStorage.setItem('searchPageState', JSON.stringify({
        query: searchQuery,
        results: slimResults,
        lyricsRes: lyricsResults?.slice(0, 20),
        publicPlaylists: publicPlaylists?.slice(0, 20),
        tab: activeTab,
        categoryState: categoryData,
        scrollPosition: tabScrollPositions.current[activeTab] || 0,
        tabScrollPositions: tabScrollPositions.current
      }));
    } catch (e) {
      sessionStorage.removeItem('searchPageState');
    }
  };

  const handleAlbumClick = (albumId) => {
    saveSearchState();
    router.push(`/music/album/${albumId}`);
  };

  const handlePlaylistClick = (playlistId) => {
    saveSearchState();
    router.push(`/music/playlist/${playlistId}`);
  };

  const handleAddToPlaylist = (e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  };

  const handleGoToArtist = async (e, song) => {
    e.stopPropagation();

    try {
      // First, try to get detailed song info which has proper artist data with IDs
      let detailedSong = song;
      if (!song.artists?.primary && song.id) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${song.id}`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          detailedSong = data.data[0];
        }
      }

      // Check if we have artist data with IDs
      if (detailedSong.artists?.primary && detailedSong.artists.primary.length > 0) {
        const firstArtist = detailedSong.artists.primary[0];
        if (firstArtist.id) {
          router.push(`/music/artist/${firstArtist.id}`);
          return;
        }
      }

      // Fallback: search for the artist by name
      const artistName = getArtistNames(song);
      if (artistName && artistName !== 'Unknown Artist') {
        // Try to find the artist ID by searching
        const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?query=${encodeURIComponent(artistName)}`);
        const searchData = await searchResponse.json();

        if (searchData.success && searchData.data.artists?.results?.length > 0) {
          // Find the exact artist match
          const exactMatch = searchData.data.artists.results.find(artist =>
            artist.title?.toLowerCase() === artistName.toLowerCase() ||
            artist.name?.toLowerCase() === artistName.toLowerCase()
          );

          if (exactMatch && exactMatch.id) {
            router.push(`/music/artist/${exactMatch.id}`);
            return;
          }

          // If no exact match, use the first result
          if (searchData.data.artists.results[0]?.id) {
            router.push(`/music/artist/${searchData.data.artists.results[0].id}`);
            return;
          }
        }

        // Final fallback: redirect to search
        router.push(`/music/search?q=${encodeURIComponent(artistName)}`);
      }
    } catch (error) {
      console.error('Error navigating to artist:', error);
      // Fallback to search
      const artistName = getArtistNames(song);
      if (artistName && artistName !== 'Unknown Artist') {
        router.push(`/music/search?q=${encodeURIComponent(artistName)}`);
      }
    }
  };

  const handleGoToAlbum = async (e, song) => {
    e.stopPropagation();

    try {
      // First, try to get detailed song info which has proper album data with IDs
      let detailedSong = song;
      if (!song.album?.id && song.id) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${song.id}`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          detailedSong = data.data[0];
        }
      }

      // Check if we have album data with ID
      if (detailedSong.album?.id) {
        router.push(`/music/album/${detailedSong.album.id}`);
        return;
      }

      // Fallback: search for the album by name if available
      const albumName = detailedSong.album?.name || song.album;
      if (albumName && typeof albumName === 'string') {
        // Try to find the album ID by searching
        const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?query=${encodeURIComponent(albumName)}`);
        const searchData = await searchResponse.json();

        if (searchData.success && searchData.data.albums?.results?.length > 0) {
          // Find the exact album match
          const exactMatch = searchData.data.albums.results.find(album =>
            album.title?.toLowerCase() === albumName.toLowerCase() ||
            album.name?.toLowerCase() === albumName.toLowerCase()
          );

          if (exactMatch && exactMatch.id) {
            router.push(`/music/album/${exactMatch.id}`);
            return;
          }

          // If no exact match, use the first result
          if (searchData.data.albums.results[0]?.id) {
            router.push(`/music/album/${searchData.data.albums.results[0].id}`);
            return;
          }
        }

        // Final fallback: redirect to search
        router.push(`/music/search?q=${encodeURIComponent(albumName)}`);
      } else {
        console.log('No album information available for this song');
      }
    } catch (error) {
      console.error('Error navigating to album:', error);
      // Fallback to search if album name is available
      const albumName = song.album?.name || song.album;
      if (albumName && typeof albumName === 'string') {
        router.push(`/music/search?q=${encodeURIComponent(albumName)}`);
      }
    }
  };

  const handleShare = (e, song) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: song.title || song.name,
        text: `Check out "${song.title || song.name}" by ${getArtistNames(song)}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      console.log('Link copied to clipboard');
    }
  };

  const handleDownload = async (e, song) => {
    e.stopPropagation();
    const toastId = toast.loading(`Preparing "${decodeHtmlEntities(song.title || song.name)}"...`);

    try {
      // 1. Resolve Best Quality URL
      let downloadUrl = null;
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        const mp3s = song.downloadUrl.filter(u => u.url.toLowerCase().includes('.mp3'));
        const bestMp3 = mp3s.find(u => u.quality === '320kbps') ||
          mp3s.find(u => u.quality === '160kbps') ||
          mp3s[0];
        const bestOverall = song.downloadUrl.find(u => u.quality === '320kbps') ||
          song.downloadUrl[song.downloadUrl.length - 1];
        downloadUrl = bestMp3?.url || bestOverall?.url;
      }

      if (!downloadUrl && song.id) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs/${song.id}`);
        const data = await response.json();
        if (data.success && data.data?.[0]?.downloadUrl) {
          const freshUrls = data.data[0].downloadUrl;
          const mp3s = freshUrls.filter(u => u.url.toLowerCase().includes('.mp3'));
          const bestMp3 = mp3s.find(u => u.quality === '320kbps') || mp3s.find(u => u.quality === '160kbps') || mp3s[0];
          const bestOverall = freshUrls.find(u => u.quality === '320kbps') || freshUrls[freshUrls.length - 1];
          downloadUrl = bestMp3?.url || bestOverall?.url;
        }
      }

      if (!downloadUrl) throw new Error('No download URL available');

      // 2. Resolve Best Image
      const imageUrl = song.image?.find(img => img.quality === '500x500')?.url ||
        song.image?.find(img => img.quality === '150x150')?.url ||
        song.image?.[song.image.length - 1]?.url;

      const title = decodeHtmlEntities(song.title || song.name);
      const artist = getArtistNames(song);
      const album = song.album?.name ? decodeHtmlEntities(song.album.name) : (typeof song.album === 'string' ? decodeHtmlEntities(song.album) : 'Unknown Album');
      const year = song.year || (song.releaseDate ? new Date(song.releaseDate).getFullYear() : '');

      toast.loading(`Downloading "${title}"...`, { id: toastId });

      // 3. Use 100% client-side download with metadata embedding!
      const result = await downloadWithMetadata({
        songUrl: downloadUrl,
        title,
        artist,
        album,
        year,
        imageUrl
      });

      if (result.success) {
        toast.success(`Downloaded "${title}"!`, { id: toastId });
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download: ${error.message}`, { id: toastId });
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar className="hidden md:flex" />
      <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 hidden md:flex" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/music">
                    Music
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Search</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex flex-1 flex-col pb-32 md:pb-6 overflow-y-auto transition-opacity duration-150 mb-24"
          style={{ opacity: isInitialRestore ? 0 : 1 }}
        >
          {/* Search Input */}
          <div className="p-4 sm:p-6 pb-4">
            <div className="relative w-full max-w-2xl mx-auto">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${(loading || lyricsLoading || publicPlaylistsLoading || (searchQuery.trim() && !combinedSearchResults))
                ? 'text-primary animate-pulse'
                : 'text-muted-foreground'
                }`} />
              <Input
                ref={searchInputRef}
                placeholder="What do you want to listen to?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 bg-muted/50 border-0 h-12 sm:h-14 text-base sm:text-lg rounded-full focus:bg-muted/70 transition-colors"
              />
              {(loading || lyricsLoading || publicPlaylistsLoading || (searchQuery.trim() && !combinedSearchResults)) && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                </div>
              )}
            </div>


          </div>



          {combinedSearchResults && (
            <div
              className="pl-2 pr-1 sm:px-6 relative"
            >
              {/* Overlay loading state for when results are updating */}
              {loading && combinedSearchResults && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg">
                  <div className="bg-card border rounded-lg p-4 shadow-lg flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                    <span className="text-sm font-medium">Updating results...</span>
                  </div>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="relative group/tabs flex items-center mb-6">


                  <div
                    id="search-tabs-container"
                    className="overflow-x-auto scrollbar-hide w-full"
                  >
                    <TabsList className="grid w-full min-w-[400px] sm:max-w-2xl grid-cols-5 h-10 sm:h-12">
                      <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                      <TabsTrigger value="songs" className="text-xs sm:text-sm">Songs</TabsTrigger>
                      <TabsTrigger value="albums" className="text-xs sm:text-sm">Albums</TabsTrigger>
                      <TabsTrigger value="artists" className="text-xs sm:text-sm">Artists</TabsTrigger>
                      <TabsTrigger value="playlists" className="text-xs sm:text-sm">Playlists</TabsTrigger>
                    </TabsList>
                  </div>


                </div>

                <TabsContent value="all" className="space-y-6 sm:space-y-8">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                    {/* Top Result */}
                    {(combinedSearchResults.topQuery || (combinedSearchResults.songs?.results?.length > 0)) && (
                      <div className="xl:col-span-1">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Top result</h2>
                        {(() => {
                          const topResult = combinedSearchResults.topQuery || combinedSearchResults.songs.results[0];
                          const resultType = topResult.type || 'song';

                          return (
                            <div
                              className="bg-linear-to-br from-muted/40 to-muted/20 rounded-xl p-4 sm:p-6 relative overflow-hidden cursor-pointer group hover:from-muted/50 hover:to-muted/30 transition-all duration-300"
                              onClick={() => {
                                if (resultType === 'song') {
                                  handlePlayClick(topResult, searchResults.songs?.results || [topResult]);
                                } else if (resultType === 'artist') {
                                  handleArtistClick(topResult.id);
                                } else if (resultType === 'album') {
                                  handleAlbumClick(topResult.id);
                                }
                              }}
                            >
                              <div className="relative z-10">
                                <div className="mb-4">
                                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted overflow-hidden shadow-lg">
                                    {topResult.image?.[2]?.url ? (
                                      <img
                                        src={topResult.image[2].url}
                                        alt={topResult.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.src = '/default-playlist-image.png';
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src="/default-playlist-image.png"
                                        alt={topResult.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2 pr-14 sm:pr-16">
                                  <h3 className="text-2xl sm:text-3xl xl:text-4xl font-bold leading-tight line-clamp-2">
                                    {decodeHtmlEntities(topResult.title || topResult.name)}
                                  </h3>

                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="capitalize text-xs sm:text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                                      {resultType}
                                    </span>
                                    {(topResult.primaryArtists || topResult.artist) && (
                                      <>
                                        <span className="text-sm">•</span>
                                        <span className="text-xs sm:text-sm truncate">
                                          {getArtistNames(topResult)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 bg-green-500 hover:bg-green-400 hover:scale-110 rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-lg flex items-center justify-center cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (resultType === 'song') {
                                    handlePlayClick(topResult, combinedSearchResults.songs?.results || [topResult]);
                                  }
                                }}
                              >
                                {currentSong?.id === topResult.id && isPlaying ? (
                                  <Pause className="w-6 h-6 sm:w-6 sm:h-6 fill-black text-black" />
                                ) : (
                                  <IoMdPlay className="w-6 h-6 sm:w-6 sm:h-6 fill-black translate-x-0.5" />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Songs Section */}
                    {combinedSearchResults.songs?.results?.length > 0 && (
                      <div className="xl:col-span-1">
                        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Songs</h2>
                        <div className="space-y-1">
                          {combinedSearchResults.songs.results.slice(0, 4).map((song, index) => {
                            const isCurrentSong = currentSong?.id === song.id;
                            return (
                              <div
                                key={`all-tab-song-${index}-${song.id || 'no-id'}-${song.isLyricsMatch ? 'lyrics' : 'regular'}`}
                                className={`flex items-center gap-2 pl-1 pr-0 py-1.5 rounded-md hover:bg-muted/30 group cursor-pointer transition-colors duration-150`}
                                onClick={() => handlePlayClick(song, combinedSearchResults.songs.results)}
                              >
                                <div className="text-sm text-muted-foreground w-6 text-center shrink-0">
                                  {isCurrentSong && isPlaying ? (
                                    <div className="flex items-center justify-center">
                                      <div className="flex items-end justify-center gap-0.5 h-3">
                                        <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0s' }} />
                                        <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.2s' }} />
                                        <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.4s' }} />
                                        <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.1s' }} />
                                      </div>
                                    </div>
                                  ) : isCurrentSong ? (
                                    <IoMdPlay className="w-4 h-4 mx-auto text-green-500 fill-green-500" />
                                  ) : (
                                    index + 1
                                  )}
                                </div>
                                <div className="relative shrink-0">
                                  <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                                    {song.image?.length > 0 ? (
                                      <img
                                        src={song.image.find(img => img.quality === '500x500')?.url ||
                                          song.image.find(img => img.quality === '150x150')?.url ||
                                          song.image[song.image.length - 1]?.url}
                                        alt={song.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                          e.target.src = '/default-playlist-image.png';
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src="/default-playlist-image.png"
                                        alt={song.title}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>

                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden pr-2">
                                  <p className={`font-medium text-base leading-tight truncate block ${isCurrentSong ? 'text-green-500' : 'text-foreground'
                                    }`} style={{
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: '100%'
                                    }}>
                                    {decodeHtmlEntities(song.title || song.name)}
                                  </p>
                                  <p className={`text-sm leading-tight truncate block ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                    }`} style={{
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: '100%'
                                    }}>
                                    {getArtistNames(song)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {song.duration ? (
                                    <span className="text-xs text-muted-foreground min-w-[30px] text-right font-mono">
                                      {formatDuration(song.duration)}
                                    </span>
                                  ) : null}
                                  <SongActionMenu
                                    song={song}
                                    onAddToPlaylist={handleAddToPlaylist}
                                    onGoToArtist={handleGoToArtist}
                                    onGoToAlbum={handleGoToAlbum}
                                    onDownload={handleDownload}
                                    onShare={handleShare}
                                    toggleLike={toggleLike}
                                    isLiked={isLiked}
                                    decodeHtmlEntities={decodeHtmlEntities}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Artists Section */}
                  {combinedSearchResults.artists?.results?.length > 0 && (
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Artists</h2>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-3 sm:gap-4">
                        {combinedSearchResults.artists.results.slice(0, 8).map((artist, index) => (
                          <div
                            key={`all-tab-artist-${index}-${artist.id || 'no-id'}`}
                            className="text-center group cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => handleArtistClick(artist.id, artist.title || artist.name)}
                          >
                            <div className="w-full aspect-square rounded-full bg-muted mb-2 sm:mb-3 overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                              {(() => {
                                // Try different image sizes: high quality first, then medium, then low
                                const imageUrl = artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url;

                                if (imageUrl) {
                                  return (
                                    <img
                                      src={imageUrl}
                                      alt={artist.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      onError={(e) => {
                                        // If image fails to load, show gradient fallback
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  );
                                }

                                return (
                                  <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
                                    <div className="text-white text-lg sm:text-2xl font-bold">
                                      {artist.title?.charAt(0)?.toUpperCase() || 'A'}
                                    </div>
                                  </div>
                                );
                              })()}
                              <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600" style={{ display: 'none' }}>
                                <div className="text-white text-lg sm:text-2xl font-bold">
                                  {artist.title?.charAt(0)?.toUpperCase() || 'A'}
                                </div>
                              </div>
                            </div>
                            <p className="font-medium truncate text-xs sm:text-sm">
                              {decodeHtmlEntities(artist.title || artist.name)}
                            </p>
                            <p className="text-xs text-muted-foreground">Artist</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Albums Section */}
                  {combinedSearchResults.albums?.results?.length > 0 && (
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Albums</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-3 sm:gap-4">
                        {combinedSearchResults.albums.results.slice(0, 8).map((album, index) => (
                          <div
                            key={`all-tab-album-${index}-${album.id || 'no-id'}`}
                            className="group cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={() => handleAlbumClick(album.id)}
                          >
                            <div className="w-full aspect-square rounded-xl bg-muted mb-3 overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                              {album.image?.[2]?.url ? (
                                <img
                                  src={album.image[2].url}
                                  alt={album.title || album.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.src = '/default-playlist-image.png';
                                  }}
                                />
                              ) : (
                                <img
                                  src="/default-playlist-image.png"
                                  alt={album.title || album.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              )}
                            </div>
                            <p className="font-medium truncate text-xs sm:text-sm mb-1">
                              {decodeHtmlEntities(album.title || album.name)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {album.year} • {decodeHtmlEntities(getArtistNames(album))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Playlists Section */}
                  {(combinedSearchResults.playlists?.results?.length > 0 || publicPlaylists?.length > 0) && (
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Playlists</h2>

                      {/* User-created Public Playlists */}
                      {publicPlaylists?.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Community Playlists</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-3 sm:gap-4">
                            {publicPlaylists.map((playlist, index) => (
                              <div
                                key={`all-tab-public-playlist-${index}-${playlist.id || 'no-id'}`}
                                className="group cursor-pointer hover:scale-105 transition-transform duration-200"
                                onClick={() => router.push(`/music/playlists/${playlist.id}`)}
                              >
                                <div className="relative">
                                  <PlaylistCover
                                    playlist={playlist}
                                    className="w-full aspect-square mb-3 shadow-md group-hover:shadow-lg"
                                  />
                                </div>
                                <p className="font-medium truncate text-xs sm:text-sm mb-1">
                                  {decodeHtmlEntities(playlist.title || playlist.name)}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  By {playlist.userName || 'Unknown User'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* JioSaavn Playlists */}
                      {searchResults.playlists?.results?.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Featured Playlists</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-3 sm:gap-4">
                            {combinedSearchResults.playlists.results.map((playlist, index) => (
                              <div
                                key={`all-tab-jiosaavn-playlist-${index}-${playlist.id || 'no-id'}`}
                                className="group cursor-pointer hover:scale-105 transition-transform duration-200"
                                onClick={() => handlePlaylistClick(playlist.id)}
                              >
                                <div className="w-full aspect-square rounded-xl bg-muted mb-3 overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                                  {playlist.image?.[2]?.url ? (
                                    <img
                                      src={playlist.image[2].url}
                                      alt={playlist.title || playlist.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      onError={(e) => {
                                        e.target.src = '/default-playlist-image.png';
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src="/default-playlist-image.png"
                                      alt={playlist.title || playlist.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                  )}
                                </div>
                                <p className="font-medium truncate text-xs sm:text-sm mb-1">
                                  {decodeHtmlEntities(playlist.title || playlist.name)}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  By {playlist.subtitle || 'Various Artists'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Songs Tab */}
                <TabsContent value="songs">
                  {categoryData.songs.results.length > 0 || (combinedSearchResults.songs?.results?.length > 0) ? (
                    <div className="space-y-1">
                      {/* Desktop Table Header */}
                      <div className="hidden md:grid grid-cols-[auto_1fr_1fr_80px] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4 px-3">
                        <div className="w-8 text-center">#</div>
                        <div>Title</div>
                        <div>Album</div>
                        <div className="flex items-center justify-end gap-1">
                          <div className="min-w-[40px] text-right">
                            <Clock className="w-4 h-4 ml-auto" />
                          </div>
                          <div className="w-8"></div>
                        </div>
                      </div>

                      {combinedSearchResults.songs.results.map((song, index) => {

                        const isCurrentSong = currentSong?.id === song.id;
                        return (
                          <div key={`songs-tab-song-${index}-${song.id || 'no-id'}-${song.isLyricsMatch ? 'lyrics' : 'regular'}`}>
                            {/* Mobile Layout */}
                            <div
                              className={`md:hidden flex items-center gap-2 pl-1 pr-0 py-1.5 rounded-md hover:bg-muted/30 group cursor-pointer transition-colors duration-150`}
                              onClick={() => handlePlayClick(song, categoryData.songs.page > 0 ? categoryData.songs.results : combinedSearchResults.songs.results)}
                            >
                              <div className="text-sm text-muted-foreground w-6 text-center shrink-0">
                                {isCurrentSong && isPlaying ? (
                                  <div className="flex items-center justify-center">
                                    <div className="flex items-end justify-center gap-0.5 h-3">
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0s' }} />
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.2s' }} />
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.4s' }} />
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.1s' }} />
                                    </div>
                                  </div>
                                ) : isCurrentSong ? (
                                  <IoMdPlay className="w-4 h-4 mx-auto text-green-500 fill-green-500" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <div className="relative shrink-0">
                                <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                                  {song.image?.length > 0 ? (
                                    <img
                                      src={song.image.find(img => img.quality === '500x500')?.url ||
                                        song.image.find(img => img.quality === '150x150')?.url ||
                                        song.image[song.image.length - 1]?.url}
                                      alt={song.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.target.src = '/default-playlist-image.png';
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src="/default-playlist-image.png"
                                      alt={song.title}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>

                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden pr-2">
                                <p className={`font-medium text-base leading-tight truncate block ${isCurrentSong ? 'text-green-500' : 'text-foreground'
                                  }`} style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%'
                                  }}>
                                  {decodeHtmlEntities(song.title || song.name)}
                                </p>
                                <p className={`text-sm leading-tight truncate block ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                                  }`} style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%'
                                  }}>
                                  {getArtistNames(song)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <SongActionMenu
                                  song={song}
                                  onAddToPlaylist={handleAddToPlaylist}
                                  onGoToArtist={handleGoToArtist}
                                  onGoToAlbum={handleGoToAlbum}
                                  onDownload={handleDownload}
                                  onShare={handleShare}
                                  toggleLike={toggleLike}
                                  isLiked={isLiked}
                                  decodeHtmlEntities={decodeHtmlEntities}
                                />
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div
                              className={`hidden md:grid grid-cols-[auto_1fr_1fr_80px] gap-4 items-center p-1 py-1.5 rounded hover:bg-muted/50 group cursor-pointer`}
                              onClick={() => handlePlayClick(song, categoryData.songs.page > 0 ? categoryData.songs.results : combinedSearchResults.songs.results)}
                            >
                              <div className="w-8 text-center">
                                {isCurrentSong && isPlaying ? (
                                  <div className="flex items-center justify-center">
                                    <div className="flex items-end justify-center gap-0.5 h-3">
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0s' }} />
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.2s' }} />
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.4s' }} />
                                      <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.1s' }} />
                                    </div>
                                  </div>
                                ) : isCurrentSong ? (
                                  <IoMdPlay className="w-4 h-4 mx-auto text-green-500 fill-green-500" />
                                ) : (
                                  <>
                                    <span className="text-muted-foreground group-hover:hidden text-sm">
                                      {index + 1}
                                    </span>
                                    <IoMdPlay className="w-4 h-4 mx-auto hidden group-hover:block fill-white" />
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                                  {song.image?.length > 0 ? (
                                    <img
                                      src={song.image.find(img => img.quality === '500x500')?.url ||
                                        song.image.find(img => img.quality === '150x150')?.url ||
                                        song.image[song.image.length - 1]?.url}
                                      alt={song.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.target.src = '/default-playlist-image.png';
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src="/default-playlist-image.png"
                                      alt={song.title}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : 'text-foreground'}`}>
                                    {decodeHtmlEntities(song.title || song.name)}
                                  </p>
                                  <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'}`}>
                                    {getArtistNames(song)}
                                  </p>
                                </div>
                              </div>

                              <div className="text-sm text-muted-foreground truncate">
                                {song.album ? (
                                  typeof song.album === 'object' ? (
                                    <button
                                      className="hover:underline hover:text-foreground transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (song.album.id) {
                                          handleAlbumClick(song.album.id);
                                        }
                                      }}
                                    >
                                      {decodeHtmlEntities(song.album.name || song.album.title)}
                                    </button>
                                  ) : (
                                    decodeHtmlEntities(song.album)
                                  )
                                ) : (
                                  'Unknown Album'
                                )}
                              </div>

                              <div className="flex items-center justify-end gap-1">
                                {song.duration ? (
                                  <span className="text-sm text-muted-foreground min-w-[40px] text-right font-mono">
                                    {formatDuration(song.duration)}
                                  </span>
                                ) : (
                                  <span className="w-[40px]"></span>
                                )}
                                <SongActionMenu
                                  song={song}
                                  onAddToPlaylist={handleAddToPlaylist}
                                  onGoToArtist={handleGoToArtist}
                                  onGoToAlbum={handleGoToAlbum}
                                  onDownload={handleDownload}
                                  onShare={handleShare}
                                  toggleLike={toggleLike}
                                  isLiked={isLiked}
                                  decodeHtmlEntities={decodeHtmlEntities}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Songs loading sentinel */}
                      {(categoryData.songs.hasMore && categoryData.songs.page > 0) && (
                        <div ref={observerTarget} className="flex justify-center py-4 w-full h-10">
                          {categoryData.songs.loading && (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">No songs found</p>
                      <p className="text-sm text-muted-foreground mt-1">Try searching with different keywords</p>
                    </div>
                  )}
                </TabsContent>

                {/* Albums Tab */}
                <TabsContent value="albums">
                  {categoryData.albums.results.length > 0 || (combinedSearchResults.albums?.results?.length > 0) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-4 sm:gap-6">
                      {combinedSearchResults.albums.results.map((album, index) => (
                        <div
                          key={`albums-tab-album-${index}-${album.id || 'no-id'}`}
                          className="group cursor-pointer hover:scale-105 transition-transform duration-200"
                          onClick={() => handleAlbumClick(album.id)}
                        >
                          <div className="w-full aspect-square rounded-xl bg-muted mb-3 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                            {album.image?.[2]?.url ? (
                              <img
                                src={album.image[2].url}
                                alt={album.title || album.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.src = '/default-playlist-image.png';
                                }}
                              />
                            ) : (
                              <img
                                src="/default-playlist-image.png"
                                alt={album.title || album.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            )}
                          </div>
                          <p className="font-semibold truncate text-sm sm:text-base mb-1">
                            {decodeHtmlEntities(album.title || album.name)}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {album.year} • {getArtistNames(album)}
                          </p>
                        </div>
                      ))}


                      {/* Albums loading sentinel */}
                      {(categoryData.albums.hasMore && categoryData.albums.page > 0) && (
                        <div ref={observerTarget} className="col-span-full flex justify-center py-4 w-full h-10">
                          {categoryData.albums.loading && (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">No albums found</p>
                      <p className="text-sm text-muted-foreground mt-1">Try searching with different keywords</p>
                    </div>
                  )}
                </TabsContent>

                {/* Artists Tab */}
                <TabsContent value="artists">
                  {categoryData.artists.results.length > 0 || (combinedSearchResults.artists?.results?.length > 0) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-4 sm:gap-6">
                      {combinedSearchResults.artists.results.map((artist, index) => (
                        <div
                          key={`artists-tab-artist-${index}-${artist.id || 'no-id'}`}
                          className="text-center group cursor-pointer hover:scale-105 transition-transform duration-200"
                          onClick={() => handleArtistClick(artist.id, artist.title || artist.name)}
                        >
                          <div className="w-full aspect-square rounded-full bg-muted mb-3 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                            {(() => {
                              const imageUrl = artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url;

                              if (imageUrl) {
                                return (
                                  <img
                                    src={imageUrl}
                                    alt={artist.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                );
                              }

                              return (
                                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
                                  <div className="text-white text-2xl font-bold">
                                    {artist.title?.charAt(0)?.toUpperCase() || 'A'}
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-purple-600" style={{ display: 'none' }}>
                              <div className="text-white text-2xl font-bold">
                                {artist.title?.charAt(0)?.toUpperCase() || 'A'}
                              </div>
                            </div>
                          </div>
                          <p className="font-semibold truncate text-sm sm:text-base mb-1">
                            {decodeHtmlEntities(artist.title || artist.name)}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Artist</p>
                        </div>
                      ))}

                      {/* Artists loading sentinel */}
                      {(categoryData.artists.hasMore && categoryData.artists.page > 0) && (
                        <div ref={observerTarget} className="col-span-full flex justify-center py-4 w-full h-10">
                          {categoryData.artists.loading && (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">No artists found</p>
                      <p className="text-sm text-muted-foreground mt-1">Try searching with different keywords</p>
                    </div>
                  )}
                </TabsContent>

                {/* Playlists Tab */}
                <TabsContent value="playlists">
                  {/* Show spinner for initial load if public playlists loading OR (playlists tab active and loading first page) */}
                  {(publicPlaylistsLoading || (activeTab === 'playlists' && categoryData.playlists.loading && categoryData.playlists.page === 0)) && (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-muted-foreground">Searching playlists...</span>
                    </div>
                  )}

                  {(categoryData.playlists.results.length > 0 || combinedSearchResults.playlists?.results?.length > 0 || publicPlaylists?.length > 0) ? (
                    <div className="space-y-8">
                      {/* User-created Public Playlists */}
                      {publicPlaylists?.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Community Playlists</h3>
                            <span className="text-sm text-muted-foreground">
                              {publicPlaylists.length} playlist{publicPlaylists.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-4 sm:gap-6">
                            {publicPlaylists.map((playlist, index) => (
                              <div
                                key={`playlists-tab-public-playlist-${index}-${playlist.id || 'no-id'}`}
                                className="group cursor-pointer hover:scale-105 transition-transform duration-200"
                                onClick={() => router.push(`/music/playlists/${playlist.id}`)}
                              >
                                <div className="relative">
                                  <PlaylistCover
                                    playlist={playlist}
                                    className="w-full aspect-square mb-3 shadow-lg group-hover:shadow-xl"
                                  />
                                  {/* User avatar */}
                                  {playlist.userImage && (
                                    <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full overflow-hidden border-2 border-white">
                                      <img
                                        src={playlist.userImage}
                                        alt={playlist.userName}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                                <p className="font-semibold truncate text-sm sm:text-base mb-1">
                                  {decodeHtmlEntities(playlist.title || playlist.name)}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  By {playlist.userName || 'Unknown User'}
                                </p>
                                {playlist.description && (
                                  <p className="text-xs text-muted-foreground truncate mt-1">
                                    {playlist.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* JioSaavn Playlists */}
                      {combinedSearchResults.playlists.results.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Featured Playlists</h3>
                            <span className="text-sm text-muted-foreground">
                              {combinedSearchResults.playlists.results.length} playlist{combinedSearchResults.playlists.results.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 min-[1800px]:grid-cols-9 min-[2100px]:grid-cols-10 gap-4 sm:gap-6">
                            {combinedSearchResults.playlists.results.map((playlist, index) => (
                              <div
                                key={`jiosaavn-${playlist.id || index}`}
                                className="group cursor-pointer hover:scale-105 transition-transform duration-200"
                                onClick={() => handlePlaylistClick(playlist.id)}
                              >
                                <div className="w-full aspect-square rounded-xl bg-muted mb-3 overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
                                  {playlist.image?.[2]?.url ? (
                                    <img
                                      src={playlist.image[2].url}
                                      alt={playlist.title || playlist.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      onError={(e) => {
                                        e.target.src = '/default-playlist-image.png';
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src="/default-playlist-image.png"
                                      alt={playlist.title || playlist.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                  )}
                                </div>
                                <p className="font-semibold truncate text-sm sm:text-base mb-1">
                                  {decodeHtmlEntities(playlist.title || playlist.name)}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  By {playlist.subtitle || 'Various Artists'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Playlists loading sentinel */}
                      {(categoryData.playlists.hasMore && categoryData.playlists.page > 0) && (
                        <div ref={observerTarget} className="col-span-full flex justify-center py-4 w-full h-10">
                          {categoryData.playlists.loading && (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : !publicPlaylistsLoading && !categoryData.playlists.loading && (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">No playlists found</p>
                      <p className="text-sm text-muted-foreground mt-1">Try searching with different keywords</p>
                    </div>
                  )}
                </TabsContent>


              </Tabs>
            </div>
          )}

          {!searchQuery && !loading && (
            <div className="flex flex-col items-center justify-center py-10 md:py-16">
              <div className="flex flex-col items-center mb-12">
                <Search className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Search for music</h3>
                <p className="text-muted-foreground text-center px-4">
                  Find your favorite songs, albums, artists, and playlists
                </p>
              </div>

              {/* Popular Genres Section */}
              <div className="w-full max-w-6xl px-4 md:px-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight">Browse all</h2>
                  <Button
                    variant="link"
                    className="text-primary font-semibold"
                    onClick={() => router.push('/music/discover/genres')}
                  >
                    See all
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(genres || []).slice(0, 8).map((genre) => (
                    <div
                      key={genre.id}
                      className={`relative h-28 sm:h-32 md:h-40 rounded-xl overflow-hidden cursor-pointer group transition-all hover:brightness-110 active:scale-95 bg-linear-to-br ${genre.color} shadow-lg`}
                      onClick={() => router.push(`/music/discover/genres/${genre.id}`)}
                    >
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                      <div className="relative h-full flex items-start p-4">
                        <h3 className="text-white font-bold text-lg sm:text-xl drop-shadow-lg leading-tight">
                          {genre.name}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {searchQuery && combinedSearchResults && !loading && (
            !combinedSearchResults.songs?.results?.length &&
            !combinedSearchResults.albums?.results?.length &&
            !combinedSearchResults.artists?.results?.length &&
            !combinedSearchResults.playlists?.results?.length && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              </div>
            )
          )}
        </div>
      </SidebarInset>

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={addToPlaylistDialogOpen}
        onOpenChange={setAddToPlaylistDialogOpen}
        song={selectedSong}

      />
    </SidebarProvider >
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
