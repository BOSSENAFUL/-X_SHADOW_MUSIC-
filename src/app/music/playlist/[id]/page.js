"use client";

import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, ArrowLeft, Heart, MoreVertical, Clock, Shuffle, Plus, User, Disc, Download, Loader2, Music2 } from "lucide-react";
import { ShareStoryPreview } from "@/components/share-story-preview";
import { toast } from "sonner";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useLikedPlaylists } from "@/hooks/useLikedPlaylists";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { HiPause } from "react-icons/hi2";
import { IoMdPlay } from "react-icons/io";
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
import { Share, Search, Check, List, LayoutList } from "lucide-react";
import { downloadWithMetadata } from "@/lib/clientDownload";
import { triggerSmartlink } from "@/lib/smartlink";
import NativeAdRow from "@/components/NativeAdRow";

// --- Helper Components ---
const SongActionMenu = memo(({
  song,
  onAddToPlaylist,
  onGoToArtist,
  onGoToAlbum,
  onDownload,
  toggleLike,
  isLiked,
  decodeHtmlEntities
}) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const artistNames = song.artists?.primary?.map(a => a.name).join(', ') ||
    (Array.isArray(song.artists) ? song.artists.map(a => a.name).join(', ') : null) ||
    'Unknown Artist';
  const songImageUrl = song.image?.find(img => img.quality === '150x150')?.url ||
    song.image?.[song.image.length - 1]?.url ||
    '/default-playlist-image.png';

  const ActionItems = ({ onItemClick }) => (
    <>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onAddToPlaylist(e, song);
        }}
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Add to playlist</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          router.push(`/music/song/${song.id}`);
        }}
      >
        <Music2 className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Song detail</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          if (navigator.share) {
            navigator.share({
              title: song.name,
              text: `Check out "${song.name}" by ${artistNames}`,
              url: window.location.href
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard');
          }
        }}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onGoToArtist(e, song);
        }}
      >
        <User className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Go to artist</span>
      </div>
      {onGoToAlbum && (
        <div
          className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
          onClick={(e) => {
            onItemClick();
            onGoToAlbum(e, song);
          }}
        >
          <Disc className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium">Go to album</span>
        </div>
      )}
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onDownload(e, song);
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download</span>
      </div>
      <div className="h-px bg-border my-1" />
      <div
        className={`flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors ${isLiked(song.id) ? 'text-red-500' : ''}`}
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
            className="p-2 h-10 w-10 text-muted-foreground hover:bg-accent"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-popover border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0">
                  <img
                    src={songImageUrl}
                    alt={song.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-foreground text-left">
                    {decodeHtmlEntities(song.name)}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    {artistNames}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-2 py-4 pb-8 space-y-1">
              {ActionItems({ onItemClick: () => setOpen(false) })}
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
          className="p-1 h-8 w-8 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
        <DropdownMenuItem
          onClick={(e) => onAddToPlaylist(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); router.push(`/music/song/${song.id}`); }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Music2 className="w-4 h-4 mr-2" />
          Song detail
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => onGoToArtist(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          Go to artist
        </DropdownMenuItem>
        {onGoToAlbum && (
          <DropdownMenuItem
            onClick={(e) => onGoToAlbum(e, song)}
            className="hover:bg-accent focus:bg-accent cursor-pointer"
          >
            <Disc className="w-4 h-4 mr-2" />
            Go to album
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => onDownload(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song).catch(error => console.error('Error toggling song like:', error));
          }}
          className={`${isLiked(song.id) ? 'text-red-500' : ''} hover:bg-accent focus:bg-accent cursor-pointer`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
          {isLiked(song.id) ? 'Unlike' : 'Like'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SongActionMenu.displayName = "SongActionMenu";

// --- Sort and View Menu ---
const SortAndViewMenu = memo(({ sortBy, setSortBy, viewAs, setViewAs, isMobile }) => {
  const sortOptions = [
    { id: 'custom', label: 'Custom order' },
    { id: 'title', label: 'Title' },
    { id: 'artist', label: 'Artist' },
    { id: 'album', label: 'Album' },
    { id: 'added', label: 'Recently added' },
    { id: 'duration', label: 'Duration' },
  ];

  const viewOptions = [
    { id: 'compact', label: 'Compact', icon: LayoutList },
    { id: 'list', label: 'List', icon: List },
  ];

  const currentSortLabel = sortOptions.find(o => o.id === sortBy)?.label || 'Sort by';

  const Content = ({ closeOnSelect = () => { } }) => (
    <div className="flex flex-col gap-1 p-2">
      <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sort by</div>
      {sortOptions.map(option => (
        <button
          key={option.id}
          className={`flex items-center justify-between px-3 py-2.5 rounded-sm hover:bg-accent transition-colors text-sm ${sortBy === option.id ? 'text-[#1ed760] font-medium' : 'text-foreground'}`}
          onClick={() => {
            setSortBy(option.id);
            closeOnSelect();
          }}
        >
          {option.label}
          {sortBy === option.id && <Check className="w-4 h-4" />}
        </button>
      ))}
      <div className="h-px bg-border my-2" />
      <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">View as</div>
      {viewOptions.map(option => (
        <button
          key={option.id}
          className={`flex items-center justify-between px-3 py-2.5 rounded-sm hover:bg-accent transition-colors text-sm ${viewAs === option.id ? 'text-[#1ed760] font-medium' : 'text-foreground'}`}
          onClick={() => {
            setViewAs(option.id);
            closeOnSelect();
          }}
        >
          <div className="flex items-center gap-3">
            <option.icon className="w-4 h-4" />
            {option.label}
          </div>
          {viewAs === option.id && <Check className="w-4 h-4" />}
        </button>
      ))}
    </div>
  );

  // useState must be at top level - never inside if-blocks (Rules of Hooks)
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground transition-colors py-2 px-1">
            <span className={sortBy !== 'custom' ? 'text-[#1ed760]' : ''}>{currentSortLabel}</span>
            <List className="w-4 h-4" />
          </button>
        </DrawerTrigger>
        <DrawerPortal>
          <DrawerContent className="bg-popover border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Sort and View Options</DrawerTitle>
              <DrawerDescription>Select sorting order and view mode for the current playlist</DrawerDescription>
            </DrawerHeader>
            {Content({ closeOnSelect: () => setOpen(false) })}
            <div className="h-6" />
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center gap-2 text-sm font-medium text-foreground hover:text-foreground transition-colors h-9 px-3 hover:bg-accent rounded-md">
          <span className={sortBy !== 'custom' ? 'text-[#1ed760]' : ''}>{currentSortLabel}</span>
          <List className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover border-none text-foreground p-0 shadow-xl ring-1 ring-border">
        {Content({})}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SortAndViewMenu.displayName = "SortAndViewMenu";

SongActionMenu.displayName = "SongActionMenu";

// --- Playlist Action Menu ---
const PlaylistActionMenu = memo(({
  playlist,
  songs,
  isLiked,
  toggleLike,
  onDownload,
  onShare,
  isMobile,
  decodeHtmlEntities
}) => {
  const [open, setOpen] = useState(false);

  const playlistImageUrl = playlist.image?.[2]?.url ||
    playlist.image?.[1]?.url ||
    playlist.image?.[0]?.url ||
    '/default-playlist-image.png';

  const ActionItems = ({ onItemClick }) => (
    <>
      <div
        className={`flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors ${isLiked ? 'text-red-500' : ''}`}
        onClick={() => {
          onItemClick();
          toggleLike();
        }}
      >
        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
        <span className="font-medium">{isLiked ? 'Remove from library' : 'Save to library'}</span>
      </div>

      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          onDownload();
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download playlist</span>
      </div>

      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          onShare();
        }}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share playlist</span>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent border-none outline-none transition-colors cursor-pointer">
            <MoreVertical style={{ width: '24px', height: '24px' }} />
          </button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-popover border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0 text-left">
              <DrawerTitle className="sr-only">Playlist Options</DrawerTitle>
              <DrawerDescription className="sr-only">Actions for {playlist.name}</DrawerDescription>
              <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0 bg-muted">
                  <img src={playlistImageUrl} alt={playlist.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <div className="text-base font-bold truncate text-foreground text-left">
                    {decodeHtmlEntities(playlist.name)}
                  </div>
                  <div className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    Playlist • {playlist.subtitle || 'JioSaavn'}
                  </div>
                </div>
              </div>
            </DrawerHeader>
            <div className="px-2 py-4 pb-8 space-y-1">
              {ActionItems({ onItemClick: () => setOpen(false) })}
            </div>
          </DrawerContent>
        </div>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent border-none outline-none transition-colors cursor-pointer">
          <MoreVertical style={{ width: '24px', height: '24px' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
        <DropdownMenuItem
          onClick={toggleLike}
          className={`hover:bg-accent focus:bg-accent cursor-pointer ${isLiked ? 'text-red-500' : ''}`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
          {isLiked ? 'Remove from library' : 'Save to library'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDownload} className="hover:bg-accent focus:bg-accent cursor-pointer">
          <Download className="w-4 h-4 mr-2" />
          Download playlist
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onClick={onShare} className="hover:bg-accent focus:bg-accent cursor-pointer">
          <Share className="w-4 h-4 mr-2" />
          Share playlist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

PlaylistActionMenu.displayName = "PlaylistActionMenu";

function PlaylistPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const playlistId = params.id;
  const songCount = searchParams.get('songCount') || 50;

  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState(null);
  const isMobile = useIsMobile();
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const mobileTitleRef = useRef(null);
  const desktopTitleRef = useRef(null);
  const lastTrackedRef = useRef(0);

  // Search and Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [sortBy, setSortBy] = useState('custom');
  const [viewAs, setViewAs] = useState('list');
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Build cover object for ShareStoryPreview (mirrors playlists/[id] pattern)
  const getPlaylistCover = useCallback(() => {
    if (!playlist) return { type: 'default', src: '/default-playlist-image.png' };
    if (Array.isArray(playlist.image) && playlist.image.length > 0) {
      const url =
        playlist.image[playlist.image.length - 1]?.url ||
        playlist.image[playlist.image.length - 1]?.link ||
        playlist.image[0]?.url;
      if (url) return { type: 'single', src: url };
    } else if (typeof playlist.image === 'string' && playlist.image) {
      return { type: 'single', src: playlist.image };
    }
    return { type: 'default', src: '/default-playlist-image.png' };
  }, [playlist]);

  // Auto-focus search input when it becomes visible
  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchVisible]);

  // Click outside to hide search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        if (!searchQuery) setIsSearchVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  // Initialize liked songs hook with actual user ID from session
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);

  // Initialize liked playlists hook
  const {
    toggleLike: togglePlaylistLike,
    isLiked: isPlaylistLiked
  } = useLikedPlaylists(session?.user?.id);

  // Initialize music player
  const { playSong, currentSong, isPlaying, togglePlayPause, currentPlaylistId, isShuffle, setIsShuffle } = useMusicPlayer();

  useEffect(() => {
    const fetchPlaylistDetails = async () => {
      try {
        setLoading(true);

        // Get playlist data with all songs using the exact songCount from search results
        console.log(`Fetching playlist ${playlistId} with limit=${songCount}`);
        const playlistResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/playlists?id=${playlistId}&page=0&limit=${songCount}`);
        const playlistData = await playlistResponse.json();

        if (playlistData.success && playlistData.data) {
          console.log(`Fetched playlist "${playlistData.data.name}" with ${playlistData.data.songs?.length || 0} songs`);

          let finalPlaylistData = playlistData.data;

          // Check if playlist has valid image URLs (not just query parameters)
          let imageUrl = finalPlaylistData.image?.[2]?.url || finalPlaylistData.image?.[1]?.url || finalPlaylistData.image?.[0]?.url;

          // Check if the image URL is invalid (just query parameters or empty)
          if (!imageUrl || imageUrl.startsWith('?') || imageUrl.length < 10) {
            console.log('Invalid or missing image in playlist API, trying search API...');
            try {
              const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search/playlists?query=new%20releases&page=0&limit=100`);
              const searchData = await searchResponse.json();

              if (searchData.success && searchData.data.results) {
                const foundPlaylist = searchData.data.results.find(p => p.id === playlistId);
                if (foundPlaylist && foundPlaylist.image) {
                  console.log('Found image in search API:', foundPlaylist.image);
                  finalPlaylistData.image = foundPlaylist.image;
                  imageUrl = foundPlaylist.image[2]?.url || foundPlaylist.image[1]?.url || foundPlaylist.image[0]?.url;
                }
              }
            } catch (error) {
              console.error('Error fetching from search API:', error);
            }
          }

          // Extract dominant color from playlist image BEFORE setting playlist data
          let extractedColor = 'rgb(40, 40, 40)'; // Default dark gray to match default playlist image
          if (imageUrl) {
            try {
              extractedColor = await extractDominantColor(imageUrl);
            } catch (error) {
              console.error('Color extraction failed:', error);
            }
          }

          // Set all data together after color extraction is complete
          setDominantColor(extractedColor);
          setPlaylist(finalPlaylistData);
          setSongs(finalPlaylistData.songs || []);
        }
      } catch (error) {
        console.error('Error fetching playlist details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (playlistId) {
      fetchPlaylistDetails();
    }
  }, [playlistId, songCount]);

  // Effect to handle scroll and smooth animations (highly optimized)
  useEffect(() => {
    const scrollContainer = document.getElementById('playlist-scroll-container');
    if (!scrollContainer) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isMobile = window.innerWidth < 768;

          if (isMobile) {
            const scrollTop = scrollContainer.scrollTop;
            const imageThreshold = 350;
            const headerToggleThreshold = 280;

            const progress = Math.max(0, Math.min(1, scrollTop / imageThreshold));
            scrollContainer.style.setProperty('--scroll-progress', progress.toString());

            const shouldShow = scrollTop > headerToggleThreshold;
            setShowHeaderTitle(prev => {
              if (prev !== shouldShow) return shouldShow;
              return prev;
            });
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    // IntersectionObserver for PC ONLY
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisibleInLayout = entry.boundingClientRect.width > 0;
          if (isVisibleInLayout) {
            setShowHeaderTitle(!entry.isIntersecting);
          }
        });
      },
      {
        root: scrollContainer,
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px",
      }
    );

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    // Only observe desktop title (Mobile handled manually above)
    if (desktopTitleRef.current) observer.observe(desktopTitleRef.current);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [loading, songs.length]);

  // Filter and Sort Logic
  const filteredBaseSongs = useMemo(() => {
    // Pre-map songs for easier sorting
    const base = songs.map(s => ({
      ...s,
      artistName: s.artists?.primary?.[0]?.name || s.artists?.[0]?.name || '',
      albumName: s.album?.name || '',
      addedAt: s.releaseDate || s.year || s.id
    }));

    if (!searchQuery.trim()) return base;
    const query = searchQuery.toLowerCase().trim();
    return base.filter(song =>
      song.name?.toLowerCase().includes(query) ||
      song.artistName.toLowerCase().includes(query) ||
      song.albumName.toLowerCase().includes(query)
    );
  }, [songs, searchQuery]);

  const sortedSongs = useMemo(() => {
    let result = [...filteredBaseSongs];
    if (sortBy === 'custom') return result;

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "title":
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case "artist":
          comparison = a.artistName.localeCompare(b.artistName);
          break;
        case "album":
          comparison = a.albumName.localeCompare(b.albumName);
          break;
        case "added":
          comparison = b.addedAt > a.addedAt ? 1 : -1;
          break;
        case "duration":
          comparison = (b.duration || 0) - (a.duration || 0);
          break;
        default:
          break;
      }
      return comparison;
    });
    return result;
  }, [filteredBaseSongs, sortBy]);

  const trackRecentlyPlayed = () => {
    if (!session?.user?.id || !playlist) return;

    // Throttle: don't track the same playlist more than once every 5 minutes
    const now = Date.now();
    if (now - lastTrackedRef.current < 300000) {
      return;
    }

    const imageUrl =
      playlist.image?.[2]?.url ||
      playlist.image?.[1]?.url ||
      playlist.image?.[0]?.url;
    const playlistData = {
      id: playlistId,
      name: playlist.name,
      image: playlist.image || (imageUrl ? [{ quality: 'default', url: imageUrl }] : []),
      songCount: playlist.songCount || songs.length,
      source: 'jiosaavn',
      owner: playlist.subtitle || playlist.owner || 'JioSaavn',
    };

    // Update ref before fetch
    lastTrackedRef.current = now;

    // Fire-and-forget – don't block UI
    fetch('/api/recently-played-playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistData }),
    }).catch(() => { });
  };

  const handlePlayClick = (song, index) => {
    playSong(song, songs, playlistId);
    trackRecentlyPlayed();
  };

  const handlePlayAll = () => {
    if (songs.length > 0) {
      const isPlaylistPlaying = currentPlaylistId === playlistId;

      if (isPlaylistPlaying) {
        togglePlayPause();
      } else {
        let startSong = songs[0];
        let startIndex = 0;

        if (isShuffle) {
          startIndex = Math.floor(Math.random() * songs.length);
          startSong = songs[startIndex];
        }

        playSong(startSong, songs, playlistId, startIndex);
        trackRecentlyPlayed();
      }
      console.log('Playlist action:', isPlaylistPlaying ? 'toggling play/pause' : 'starting from beginning');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const extractDominantColor = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const colorCounts = {};

          // Sample pixels
          for (let i = 0; i < data.length; i += 40) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Skip very light or very dark colors
            const brightness = (r + g + b) / 3;
            if (brightness < 40 || brightness > 220) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max - min;

            if (saturation < 30) continue;

            const color = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
            colorCounts[color] = (colorCounts[color] || 0) + (1 + saturation / 50);
          }

          // Find the most vibrant color
          let dominantColor = '80,80,80'; // Default
          let maxWeight = 0;

          for (const [color, weight] of Object.entries(colorCounts)) {
            if (weight > maxWeight) {
              maxWeight = weight;
              dominantColor = color;
            }
          }

          resolve(`rgb(${dominantColor})`);
        } catch (error) {
          resolve('rgb(40, 40, 40)'); // Default dark gray to match default playlist image
        }
      };

      img.onerror = () => {
        resolve('rgb(40, 40, 40)'); // Default dark gray to match default playlist image
      };

      img.src = imageUrl;
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'"
    };
    if (!text.includes('&')) return text;
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, m => entities[m]);
  };

  const handleAddToPlaylist = (e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  };

  const handleGoToArtist = (e, song) => {
    e.stopPropagation();
    if (song.artists?.primary?.length > 0) {
      router.push(`/music/artist/${song.artists.primary[0].id}`);
    }
  };

  const handleGoToAlbum = (e, song) => {
    e.stopPropagation();
    if (song.album?.id) {
      router.push(`/music/album/${song.album.id}`);
    }
  };


  const downloadSingleSong = async (song, silent = false) => {
    let toastId = null;
    if (!silent) {
      toastId = toast.loading(`Preparing "${decodeHtmlEntities(song.name)}"...`);
    }

    try {
      // 1. Resolve Best Quality URL
      let downloadUrl = null;
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        // Step 1: Find all MP3s
        const mp3s = song.downloadUrl.filter(u => u.url.toLowerCase().includes('.mp3'));

        // Step 2: Pick the best MP3 (prefer high quality)
        const bestMp3 = mp3s.find(u => u.quality === '320kbps') ||
          mp3s.find(u => u.quality === '160kbps') ||
          mp3s[0];

        // Step 3: Fallback to best overall if no MP3 found
        const bestOverall = song.downloadUrl.find(u => u.quality === '320kbps') ||
          song.downloadUrl[song.downloadUrl.length - 1];

        downloadUrl = bestMp3?.url || bestOverall?.url;
      }

      if (!downloadUrl) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${song.id}`);
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

      const title = decodeHtmlEntities(song.name);
      const artist = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
      const album = song.album?.name ? decodeHtmlEntities(song.album.name) : 'Unknown Album';
      const year = song.year || (song.releaseDate ? new Date(song.releaseDate).getFullYear() : '');

      if (!silent) toast.loading(`Downloading "${title}"...`, { id: toastId });

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
        if (!silent) toast.success(`Downloaded "${title}"!`, { id: toastId });
      } else {
        throw new Error(result.error || 'Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      if (!silent) toast.error(`Failed to download: ${error.message}`, { id: toastId });
      throw error;
    }
  };

  const handleDownloadAll = async () => {
    if (songs.length === 0) {
      toast.info('No songs in playlist to download!');
      return;
    }

    triggerSmartlink(true); // Download — fire every time, no cooldown

    // Show initial toast
    const progressToast = document.createElement('div');
    progressToast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    progressToast.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <div class="flex flex-col">
          <span class="font-bold text-sm">Downloading Playlist...</span>
          <span class="text-xs opacity-90" id="download-progress-text">Preparing 0 / ${songs.length}</span>
        </div>
      </div>
    `;
    document.body.appendChild(progressToast);

    let downloadedCount = 0;
    let failedCount = 0;
    const CONCURRENCY_LIMIT = 4;
    const queue = [...songs];

    const downloadWorker = async () => {
      while (queue.length > 0) {
        const song = queue.shift();
        if (!song) break;

        try {
          await downloadSingleSong(song, true);
          downloadedCount++;
        } catch (error) {
          console.error(`Failed to download ${song.name}:`, error);
          failedCount++;
        }

        const progressText = document.getElementById('download-progress-text');
        if (progressText) {
          progressText.textContent = `Progress: ${downloadedCount + failedCount} / ${songs.length} (${failedCount} failed)`;
        }
      }
    };

    // Spin up workers
    await Promise.all(Array(Math.min(CONCURRENCY_LIMIT, queue.length)).fill(null).map(downloadWorker));

    // Finish
    if (document.body.contains(progressToast)) {
      document.body.removeChild(progressToast);
    }

    const completionToast = document.createElement('div');
    completionToast.className = `fixed bottom-4 right-4 ${failedCount > 0 ? 'bg-orange-600' : 'bg-green-600'} text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    completionToast.innerHTML = `
      <div class="flex flex-col">
        <span class="font-bold text-sm">Download Finished</span>
        <span class="text-xs opacity-90">${downloadedCount} songs saved. ${failedCount > 0 ? `${failedCount} failed.` : ''}</span>
      </div>
    `;
    document.body.appendChild(completionToast);

    setTimeout(() => {
      completionToast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(completionToast)) {
          document.body.removeChild(completionToast);
        }
      }, 300);
    }, 5000);
  };

  const handleDownload = async (e, song) => {
    e.stopPropagation();
    triggerSmartlink(true); // Download — fire every time, no cooldown
    await downloadSingleSong(song);
  };

  if (loading) {
    return (
      <SidebarProvider >
        <AppSidebar />
        <SidebarInset id="playlist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
          {/* Main Ambient Gradient Layer - Added to skeleton to show color as soon as it's available */}
          <div
            className="absolute inset-0 h-[450px] pointer-events-none transition-all duration-1000"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.7)')} 0%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
                    transparent 100%)`
                : 'transparent'
            }}
          />
          <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 md:border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 pt-12 md:pt-20 md:pl-7.5">
            <div className="animate-pulse space-y-8">
              {/* Header Skeleton Only */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                <div className="w-64 h-64 md:w-64 md:h-64 bg-muted rounded-lg shadow-xl shrink-0" />
                <div className="flex-1 space-y-4 w-full text-left md:text-left">
                  {/* Title */}
                  <div className="h-8 md:h-12 bg-muted rounded w-3/4 md:w-96" />

                  {/* Description */}
                  <div className="h-4 bg-muted rounded w-1/2 opacity-70" />

                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!playlist) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Playlist not found</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="playlist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header
          style={{
            backgroundColor: showHeaderTitle
              ? dominantColor
                ? `color-mix(in srgb, ${dominantColor}, black 60%)`
                : '#1D1046'
              : undefined
          }}
          className={`fixed md:sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b transition-all duration-300 w-full ${showHeaderTitle
            ? "border-border"
            : "bg-transparent md:bg-background border-transparent"
            }`}
        >
          {/* Optimized Mobile Background Layer */}
          <div
            className="absolute inset-0 -z-10 transition-opacity duration-150 ease-in-out pointer-events-none md:hidden"
            style={{
              backgroundColor: dominantColor ? `color-mix(in srgb, ${dominantColor}, black 60%)` : '#1D1046',
              opacity: 'var(--scroll-progress, 0)'
            }}
          />
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4 h-full relative z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              {/* Title Content Area (Properly separated for PC/Mobile) */}
              <div className="flex-1 flex items-center h-full min-w-0 relative">
                {/* PC Version: Minimal switch */}
                <div className="hidden md:flex items-center h-full flex-1">
                  {!showHeaderTitle ? (
                    <div className="animate-in fade-in duration-200">
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem className="hidden lg:block">
                            <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator className="hidden lg:block" />
                          <BreadcrumbItem>
                            <BreadcrumbPage>Playlist</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                    </div>
                  ) : (
                    <h2 className="text-base font-bold line-clamp-1 animate-in fade-in slide-in-from-bottom-2 duration-300 text-white">
                      {playlist.name}
                    </h2>
                  )}
                </div>

                {/* Mobile Version: Smooth fade + slide up */}
                <div
                  className="md:hidden flex items-center h-full flex-1 transition-all duration-300 pointer-events-none"
                  style={{
                    opacity: showHeaderTitle ? 1 : 0,
                    transform: showHeaderTitle ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
                    visibility: showHeaderTitle ? 'visible' : 'hidden'
                  }}
                >
                  <h2 className="text-base font-bold line-clamp-1 text-white pr-4">
                    {playlist.name}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div
          className="flex-1 relative transition-colors duration-1000"
          style={{
            backgroundColor: 'hsl(var(--background))'
          }}
        >
          {/* Main Ambient Gradient Layer */}
          <div
            className="absolute inset-0 h-[450px] pointer-events-none transition-all duration-1000"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.7)')} 0%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
                    transparent 100%)`
                : 'transparent'
            }}
          />

          <div className="relative z-10">
            {/* Playlist Header */}
            <div className="p-4 pt-12 pb-2 md:p-8 md:pt-20 md:pb-4 text-foreground">
              {/* Mobile Layout */}
              <div className="block md:hidden">
                <div
                  className="flex flex-col items-center text-center space-y-4"
                  style={{
                    transform: 'translate3d(0, calc(var(--scroll-progress, 0) * -40px), 0)',
                    opacity: 'calc(1 - var(--scroll-progress, 0))',
                    willChange: 'transform, opacity'
                  }}
                >
                  <div
                    className="w-64 h-64 rounded-lg overflow-hidden shadow-2xl transition-transform duration-75 ease-out"
                    style={{
                      transform: 'scale(calc(1 - (var(--scroll-progress, 0) * 0.35)))',
                      willChange: 'transform'
                    }}
                  >
                    {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                      <img
                        src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/default-playlist-image.png';
                        }}
                      />
                    ) : (
                      <img
                        src="/default-playlist-image.png"
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="space-y-2 w-full">
                    <h1 ref={mobileTitleRef} className="text-2xl font-bold wrap-break-word text-start mt-2 line-clamp-1 w-full">
                      {playlist.name}
                    </h1>
                    {(playlist.subtitle || playlist.header_desc) && (
                      <p className="text-xs text-muted-foreground line-clamp-2 text-start">
                        {playlist.subtitle || playlist.header_desc}
                      </p>
                    )}
                    <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
                      <span className="font-semibold">JioSaavn</span>
                      <span>•</span>
                      <span>{playlist.songCount || songs.length} songs</span>
                      {playlist.follower_count && (
                        <>
                          <span>•</span>
                          <span>{playlist.follower_count} saves</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex gap-6 items-end">
                <div className="w-64 h-64 rounded-lg overflow-hidden bg-muted shrink-0 shadow-2xl">
                  {playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url ? (
                    <img
                      src={playlist.image?.[2]?.url || playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/default-playlist-image.png';
                      }}
                    />
                  ) : (
                    <img
                      src="/default-playlist-image.png"
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 ref={desktopTitleRef} className="text-4xl md:text-6xl font-bold mb-2 wrap-break-word">
                    {playlist.name}
                  </h1>
                  {(playlist.subtitle || playlist.header_desc) && (
                    <p className="text-base text-muted-foreground mb-4 line-clamp-2 max-w-2xl">
                      {playlist.subtitle || playlist.header_desc}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold">JioSaavn</span>
                    <span>•</span>
                    <span>{playlist.songCount || songs.length} songs</span>
                    {playlist.follower_count && (
                      <>
                        <span>•</span>
                        <span>{playlist.follower_count} saves</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 pt-2 md:p-8 md:pt-4">
              <div className="flex items-center gap-0.5 md:gap-1">
                <Button
                  size="lg"
                  className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-all duration-500 cursor-pointer"
                  style={{
                    backgroundColor: dominantColor || '#ffffff',
                    boxShadow: dominantColor
                      ? `0 8px 32px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}`
                      : 'none'
                  }}
                  onClick={handlePlayAll}
                >
                  {currentPlaylistId === playlistId && isPlaying ? (
                    <HiPause style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <IoMdPlay style={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                  )}
                </Button>
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer ${isShuffle ? 'text-green-500 hover:text-green-400' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Shuffle style={{ width: '24px', height: '24px' }} />
                </button>

                <PlaylistActionMenu
                  playlist={playlist}
                  songs={songs}
                  isLiked={isPlaylistLiked(playlistId)}
                  toggleLike={async () => {
                    await togglePlaylistLike({
                      id: playlistId,
                      name: playlist.name,
                      description: playlist.subtitle || playlist.header_desc || '',
                      image: playlist.image,
                      songCount: playlist.songCount || songs.length
                    });
                  }}
                  onDownload={handleDownloadAll}
                  onShare={() => setSharePreviewOpen(true)}
                  isMobile={isMobile}
                  decodeHtmlEntities={decodeHtmlEntities}
                />

                {/* Search and Sort Options Container */}
                <div className="flex items-center ml-auto gap-1 md:gap-3">
                  {/* Search Bar */}
                  <div ref={searchContainerRef}>
                    <div
                      className={`flex items-center transition-all duration-300 ease-in-out ${isSearchVisible ? 'w-40 md:w-56 h-9 px-2.5 rounded-md border border-border bg-muted/50 justify-start' : 'w-9 h-9 justify-center rounded-full bg-muted/50 hover:bg-muted cursor-pointer border-none'}`}
                      onClick={() => !isSearchVisible && setIsSearchVisible(true)}
                    >
                      <Search className={`w-4 h-4 text-muted-foreground shrink-0 transition-colors ${isSearchVisible ? 'text-foreground' : ''}`} />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search in playlist"
                        className={`bg-transparent border-none outline-none text-foreground text-xs md:text-sm placeholder:text-muted-foreground transition-all duration-300 ${isSearchVisible ? 'w-full ml-2 opacity-100 visible' : 'w-0 ml-0 opacity-0 invisible'}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setSearchQuery("");
                            setIsSearchVisible(false);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Sort and View Options - always visible on PC, hidden on mobile when search is open */}
                  {(!isSearchVisible || !isMobile) && (
                    <SortAndViewMenu
                      sortBy={sortBy}
                      setSortBy={setSortBy}
                      viewAs={viewAs}
                      setViewAs={setViewAs}
                      isMobile={isMobile}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Songs List */}
            <div className="pl-2 pr-1 md:px-6 pb-8">

              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
                <div className="text-right pr-2">#</div>
                <div>Title</div>
                <div>Album</div>
                <div>Release Date</div>
                <div className="flex items-center justify-end gap-1">
                  <div className="min-w-[40px] text-right">
                    <Clock className="w-4 h-4 ml-auto" />
                  </div>
                  <div className="w-8"></div>
                </div>
              </div>

              <div className="space-y-0">
                {sortedSongs.map((song, index) => {
                  const isCurrentSong = currentSong?.id === song.id;
                  return (
                    <div key={song.id || index} >
                      {/* Mobile Layout */}
                      <div
                        className={`md:hidden flex items-center rounded hover:bg-muted/50 group cursor-pointer ${viewAs === 'compact' ? 'gap-2 pl-0 pr-0 py-1 h-[48px]' : 'gap-2 pl-0 pr-0 py-2 h-[64px]'}`}
                        onClick={() => handlePlayClick(song, index)}
                      >
                        <div className="grid place-items-center shrink-0 w-8 h-full">
                          {isCurrentSong && isPlaying ? (
                            <div className="col-start-1 row-start-1 flex items-end justify-center gap-0.5 h-3 w-4">
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0s' }} />
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.2s' }} />
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.4s' }} />
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.1s' }} />
                            </div>
                          ) : isCurrentSong ? (
                            <div className="col-start-1 row-start-1 flex items-center justify-center">
                              <IoMdPlay className="w-4 h-4 text-green-500" />
                            </div>
                          ) : (
                            <div className="col-start-1 row-start-1 flex items-center justify-center">
                              <span className="text-muted-foreground text-sm">
                                {index + 1}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex items-center gap-2.5">
                          <div className={`${viewAs === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded bg-muted shrink-0 overflow-hidden`}>
                            {song.image?.length > 0 ? (
                              <img
                                src={song.image.find(img => img.quality === '500x500')?.url ||
                                  song.image.find(img => img.quality === '150x150')?.url ||
                                  song.image[song.image.length - 1]?.url}
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = '/default-playlist-image.png';
                                }}
                              />
                            ) : (
                              <img
                                src="/default-playlist-image.png"
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''
                              }`}>
                              {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                            </p>
                            <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                              }`}>
                              {song.artists?.primary?.length > 0 ? (
                                song.artists.primary.map((artist, artistIndex) => (
                                  <span key={artist.id || artistIndex}>
                                    <span className="md:hidden">
                                      {artist.name}
                                    </span>
                                    <button
                                      className={`hidden md:inline hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/music/artist/${artist.id}`);
                                      }}
                                    >
                                      {artist.name}
                                    </button>
                                    {artistIndex < song.artists.primary.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                'Unknown Artist'
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <SongActionMenu
                            song={song}
                            onAddToPlaylist={handleAddToPlaylist}
                            onGoToArtist={handleGoToArtist}
                            onGoToAlbum={handleGoToAlbum}
                            onDownload={handleDownload}
                            toggleLike={toggleLike}
                            isLiked={isLiked}
                            decodeHtmlEntities={decodeHtmlEntities}
                          />
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div
                        className={`hidden md:grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 items-center p-1.5 rounded hover:bg-muted/50 group cursor-pointer ${viewAs === 'compact' ? 'py-1' : 'py-2'}`}
                        onClick={() => handlePlayClick(song, index)}
                        style={{ height: viewAs === 'compact' ? 48 : 64 }}
                      >
                        <div className="flex items-center justify-center shrink-0 w-10">
                          {isCurrentSong && isPlaying ? (
                            <div className="flex items-end justify-center gap-0.5 h-3 w-4">
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0s' }} />
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.2s' }} />
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.4s' }} />
                              <div className="w-0.5 h-full bg-green-500 animate-music-bar text-[0px]" style={{ animationDelay: '0.1s' }} />
                            </div>
                          ) : isCurrentSong ? (
                            <IoMdPlay className="w-4 h-4 text-green-500" />
                          ) : (
                            <>
                              <span className="text-muted-foreground group-hover:hidden text-sm">
                                {index + 1}
                              </span>
                              <IoMdPlay className="w-4 h-4 hidden group-hover:block" />
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`${viewAs === 'compact' ? 'w-8 h-8' : 'w-12 h-12'} rounded bg-muted shrink-0 overflow-hidden`}>
                            {song.image?.length > 0 ? (
                              <img
                                src={song.image.find(img => img.quality === '500x500')?.url ||
                                  song.image.find(img => img.quality === '150x150')?.url ||
                                  song.image[song.image.length - 1]?.url}
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = '/default-playlist-image.png';
                                }}
                              />
                            ) : (
                              <img
                                src="/default-playlist-image.png"
                                alt={song.name}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''} ${viewAs === 'compact' ? 'text-sm' : ''}`}>
                              {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                            </p>
                            <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'
                              }`}>
                              {song.artists?.primary?.length > 0 ? (
                                song.artists.primary.map((artist, artistIndex) => (
                                  <span key={artist.id || artistIndex}>
                                    <button
                                      className={`hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/music/artist/${artist.id}`);
                                      }}
                                    >
                                      {artist.name}
                                    </button>
                                    {artistIndex < song.artists.primary.length - 1 && ', '}
                                  </span>
                                ))
                              ) : (
                                'Unknown Artist'
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground truncate">
                          {song.album?.name ? (
                            <button
                              className="hover:underline hover:text-foreground transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (song.album.id) {
                                  router.push(`/music/album/${song.album.id}`);
                                }
                              }}
                            >
                              {decodeHtmlEntities(song.album.name)}
                            </button>
                          ) : (
                            'Unknown Album'
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {song.releaseDate ? new Date(song.releaseDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'Unknown date'}
                        </div>

                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 w-8 hidden md:inline-flex shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${isLiked(song.id) ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await toggleLike(song);
                            }}
                          >
                            <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                          </Button>
                          <div className="min-w-[40px] text-right text-sm text-muted-foreground font-mono hidden md:block">
                            {formatDuration(song.duration)}
                          </div>
                          <SongActionMenu
                            song={song}
                            onAddToPlaylist={handleAddToPlaylist}
                            onGoToArtist={handleGoToArtist}
                            onGoToAlbum={handleGoToAlbum}
                            onDownload={handleDownload}
                            toggleLike={toggleLike}
                            isLiked={isLiked}
                            decodeHtmlEntities={decodeHtmlEntities}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {songs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No songs available in this playlist</p>
                </div>
              )}
            </div>

            {/* Native Banner Ad */}
            <div className="px-4 md:px-8 pb-32 md:pb-24">
              <NativeAdRow />
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={addToPlaylistDialogOpen}
        onOpenChange={setAddToPlaylistDialogOpen}
        song={selectedSong}
      />

      {/* Share Story Preview Modal */}
      <ShareStoryPreview
        key={playlist?.id || playlistId}
        isOpen={sharePreviewOpen}
        onClose={setSharePreviewOpen}
        playlist={{
          name: playlist?.name,
          ownerName: 'JioSaavn',
          image: playlist?.image,
        }}
        getPlaylistCover={getPlaylistCover}
        dominantColors={dominantColor}
        shareUrl={typeof window !== 'undefined'
          ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/music/playlist/${playlistId}`
          : ''}
      />
    </SidebarProvider>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <PlaylistPageContent />
    </Suspense>
  );
}