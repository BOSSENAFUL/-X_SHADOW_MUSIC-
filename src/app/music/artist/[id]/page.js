"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
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
import { Play, ArrowLeft, Heart, MoreVertical, Shuffle, Users, Calendar, Plus, Disc, Share, Download, Music2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { IoMdPlay } from "react-icons/io";
import { HiPause } from "react-icons/hi2";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { memo } from "react";
import { downloadWithMetadata } from "@/lib/clientDownload";
import { applyThemeColor, getThemeColorForScroll } from "@/lib/utils";
import { triggerSmartlink } from "@/lib/smartlink";

// --- Helper Components ---
const SongActionMenu = memo(({
  song,
  onAddToPlaylist,
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
          const shareUrl = `${window.location.origin}/music/song/${song.id}`;
          if (navigator.share) {
            navigator.share({
              title: song.name,
              text: `Check out "${song.name}" by ${artistNames}`,
              url: shareUrl
            });
          } else {
            navigator.clipboard.writeText(shareUrl);
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
          onGoToAlbum(e, song);
        }}
      >
        <Disc className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Go to album</span>
      </div>
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
          onClick={(e) => {
            e.stopPropagation();
            const shareUrl = `${window.location.origin}/music/song/${song.id}`;
            if (navigator.share) {
              navigator.share({
                title: song.name,
                text: `Check out "${song.name}" by ${artistNames}`,
                url: shareUrl
              });
            } else {
              navigator.clipboard.writeText(shareUrl);
              toast.success('Link copied to clipboard');
            }
          }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Share className="w-4 h-4 mr-2" />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => onGoToAlbum(e, song)}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Disc className="w-4 h-4 mr-2" />
          Go to album
        </DropdownMenuItem>
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

const ArtistActionMenu = memo(({
  artist,
  isArtistLiked,
  toggleArtistLike,
  onDownloadSongs,
  artistLikeLoading,
  decodeHtmlEntities
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const artistImageUrl = artist?.image?.[2]?.url || artist?.image?.[1]?.url || artist?.image?.[0]?.url || '';

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: artist.name,
        text: `Check out ${artist.name} on Jammify`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
    setOpen(false);
  };

  const ActionItems = ({ onItemClick }) => (
    <>
      <div
        className={`flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors ${isArtistLiked ? 'text-red-500' : ''}`}
        onClick={(e) => {
          if (!artistLikeLoading) {
            onItemClick();
            toggleArtistLike();
          }
        }}
      >
        <Heart className={`w-5 h-5 ${isArtistLiked ? 'fill-current' : ''}`} />
        <span className="font-medium">{isArtistLiked ? 'Unlike Artist' : 'Like Artist'}</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onDownloadSongs();
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download Songs</span>
      </div>
      <div className="h-px bg-border my-1" />
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer transition-colors"
        onClick={handleShare}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share Artist</span>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground">
            <MoreVertical style={{ width: '24px', height: '24px' }} />
          </button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-popover border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                <div className="w-14 h-14 rounded-full shadow-lg overflow-hidden shrink-0 bg-muted">
                  {artistImageUrl ? (
                    <img src={artistImageUrl} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-6 h-6 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-foreground text-left">
                    {artist?.name}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    Artist
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer text-muted-foreground hover:text-foreground">
          <MoreVertical style={{ width: '24px', height: '24px' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
        <DropdownMenuItem
          onClick={(e) => { setOpen(false); toggleArtistLike(); }}
          className={`hover:bg-accent focus:bg-accent cursor-pointer ${isArtistLiked ? 'text-red-500' : ''}`}
          disabled={artistLikeLoading}
        >
          <Heart className={`w-4 h-4 mr-2 ${isArtistLiked ? 'fill-current' : ''}`} />
          {isArtistLiked ? 'Unlike Artist' : 'Like Artist'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => { setOpen(false); onDownloadSongs(); }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Songs
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={handleShare}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Share className="w-4 h-4 mr-2" />
          Share Artist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
ArtistActionMenu.displayName = "ArtistActionMenu";

export default function ArtistPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = params.id;
  const { data: session } = useSession();

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('rgb(40, 40, 40)'); // Default dark gray
  const [isArtistLiked, setIsArtistLiked] = useState(false);
  const [artistLikeLoading, setArtistLikeLoading] = useState(false);
  const [addToPlaylistDialogOpen, setAddToPlaylistDialogOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [biography, setBiography] = useState([]);
  const [fetchingBio, setFetchingBio] = useState(false);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);

  // Dynamic PWA status bar theme-color update
  useEffect(() => {
    if (typeof window === "undefined") return;

    const defaultThemeColor = "#121212";

    // Helper to compute color
    const getThemeColor = (colorStr, showHeader) => {
      if (!colorStr) return defaultThemeColor;
      const match = colorStr.match(/\d+/g);
      if (!match || match.length < 3) return defaultThemeColor;
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);

      // If header is shown: color is dominantColor * 0.4 (black mix 60%)
      // If header is hidden: color is dominantColor * 0.8 + 18 * 0.2
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

    window._getActivePageThemeColor = (progress) => {
      return getThemeColor(dominantColor, progress > 0.8);
    };

    const targetColor = getThemeColor(dominantColor, showHeaderTitle);
    applyThemeColor(targetColor);

    return () => {
      applyThemeColor(defaultThemeColor);
      delete window._getActivePageThemeColor;
    };
  }, [dominantColor, showHeaderTitle]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [songsPage, setSongsPage] = useState(0);
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [fetchingMoreSongs, setFetchingMoreSongs] = useState(false);
  const [albumPage, setAlbumPage] = useState(0);
  const [hasMoreAlbums, setHasMoreAlbums] = useState(true);
  const [fetchingMoreAlbums, setFetchingMoreAlbums] = useState(false);
  const [latestTab, setLatestTab] = useState('songs');
  const [latestSongs, setLatestSongs] = useState([]);
  const [latestAlbums, setLatestAlbums] = useState([]);
  const [latestLoading, setLatestLoading] = useState(false);
  const [showAllTopSongs, setShowAllTopSongs] = useState(false);
  const mobileTitleRef = useRef(null);
  const desktopTitleRef = useRef(null);
  const albumsObserverTarget = useRef(null);

  // Initialize liked songs hook with actual user ID
  const { toggleLike, isLiked } = useLikedSongs(session?.user?.id);

  // Initialize music player
  const { playSong, currentSong, isPlaying, togglePlayPause, currentPlaylistId, isShuffle, setIsShuffle, setPlaylist, showTrackNumbersMobile } = useMusicPlayer();

  // Sync new paginated songs into the player if we are currently listening to this artist
  useEffect(() => {
    if (currentPlaylistId === artistId && songs.length > 0) {
      setPlaylist(songs);
    }
  }, [songs, currentPlaylistId, artistId, setPlaylist]);

  useEffect(() => {
    let isMounted = true;

    const fetchArtistDetails = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          // Reset discography so the "skip if populated" guard doesn't show stale data
          setLatestSongs([]);
          setLatestAlbums([]);
        }
        console.log(`Fetching artist ${artistId}`);

        const artistResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/artists?id=${artistId}`);
        const artistData = await artistResponse.json();

        if (artistData.success && artistData.data) {
          if (!isMounted) return;
          console.log(`Fetched artist "${artistData.data.name}"`);

          // Extract dominant color from artist image
          let extractedColor = 'rgb(40, 40, 40)'; // Default dark gray
          const imageUrl = artistData.data.image?.[2]?.url || artistData.data.image?.[1]?.url || artistData.data.image?.[0]?.url;

          if (imageUrl) {
            try {
              extractedColor = await extractDominantColor(imageUrl);
            } catch (error) {
              console.error('Color extraction failed:', error);
            }
          }

          setDominantColor(extractedColor);
          setArtist(artistData.data);

          if (artistData.data.bio) {
            setBiography(artistData.data.bio);
          }

          if (artistData.data.topSongs) {
            let initialSongs = artistData.data.topSongs;
            try {
              const songIds = initialSongs.map(s => s.id).filter(Boolean).join(',');
              if (songIds) {
                const songsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${songIds}`);
                const songsData = await songsResponse.json();
                if (songsData.success && songsData.data) {
                  const playCountMap = {};
                  songsData.data.forEach(s => {
                    if (s.playCount != null) playCountMap[s.id] = s.playCount;
                  });
                  initialSongs = initialSongs.map(s => ({ ...s, playCount: playCountMap[s.id] ?? s.playCount }));
                }
              }
            } catch (err) {
              console.error('Error fetching initial playcounts:', err);
            }
            setSongs(initialSongs);
            // JioSaavn usually returns 10 top songs in the artist detail
            setSongsPage(1);
            setHasMoreSongs(initialSongs.length >= 10);
          }

          if (artistData.data.topAlbums) {
            setAlbums(artistData.data.topAlbums);
            setAlbumPage(0);
            setHasMoreAlbums(artistData.data.topAlbums.length >= 10);
          } else {
            setHasMoreAlbums(false);
          }
        }
      } catch (error) {
        console.error('Error fetching artist details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (artistId) {
      fetchArtistDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [artistId]);

  // Build latest releases from already-fetched songs + albums, sorted by year desc.
  // Only run once per artist (when data first arrives) — skip if already populated
  // to prevent re-sorting when pagination loads more songs and changes the `songs` array.
  useEffect(() => {
    if (songs.length === 0 && albums.length === 0) return;

    const sortByYear = (arr) =>
      [...arr].sort((a, b) => {
        const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : (Number(a.year) || 0);
        const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : (Number(b.year) || 0);
        return yearB - yearA;
      });

    setLatestSongs(prev => prev.length > 0 ? prev : sortByYear(songs).slice(0, 20));
    setLatestAlbums(prev => prev.length > 0 ? prev : sortByYear(albums).slice(0, 20));
    setLatestLoading(false);
  }, [songs, albums]);

  // Effect to handle scroll and show/hide title in header
  useEffect(() => {
    const scrollContainer = document.getElementById('artist-scroll-container');
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Detect visibility to only react to the title that is actually in the current layout
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

    if (mobileTitleRef.current) observer.observe(mobileTitleRef.current);
    if (desktopTitleRef.current) observer.observe(desktopTitleRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loading, artist?.name]);

  // Function to fetch more songs (Pagination)
  const fetchMoreSongs = async () => {
    if (fetchingMoreSongs || !hasMoreSongs || !artistId) return;

    setFetchingMoreSongs(true);
    try {
      const nextPage = songsPage;
      console.log(`Fetching more songs for artist ${artistId}, page ${nextPage}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/artists/${artistId}/songs?page=${nextPage}`);
      const data = await response.json();

      if (data.success && data.data) {
        let newSongs = data.data.songs || data.data;

        if (Array.isArray(newSongs) && newSongs.length > 0) {
          try {
            const songIds = newSongs.map(s => s.id).filter(Boolean).join(',');
            if (songIds) {
              const songsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/songs?ids=${songIds}`);
              const songsData = await songsResponse.json();
              if (songsData.success && songsData.data) {
                const playCountMap = {};
                songsData.data.forEach(s => {
                  if (s.playCount != null) playCountMap[s.id] = s.playCount;
                });
                newSongs = newSongs.map(s => ({ ...s, playCount: playCountMap[s.id] ?? s.playCount }));
              }
            }
          } catch (err) {
            console.error('Error fetching more playcounts:', err);
          }

          let uniqueNew = [];
          setSongs(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            uniqueNew = newSongs.filter(s => s.id && !existingIds.has(s.id));
            return [...prev, ...uniqueNew];
          });
          setSongsPage(nextPage + 1);
          // Stop if no new unique songs were added OR batch was smaller than a full page
          setHasMoreSongs(uniqueNew.length > 0 && newSongs.length >= 10);
          setShowAllTopSongs(true); // Ensure new songs are visible
        } else {
          setHasMoreSongs(false);
        }
      } else {
        setHasMoreSongs(false);
      }
    } catch (error) {
      console.error('Error fetching more songs:', error);
      setHasMoreSongs(false);
    } finally {
      setFetchingMoreSongs(false);
    }
  };

  // Function to fetch more albums (Lazy Loading)
  const fetchMoreAlbums = useCallback(async () => {
    if (fetchingMoreAlbums || !hasMoreAlbums || !artistId) return;

    setFetchingMoreAlbums(true);
    try {
      const nextPage = albumPage;
      console.log(`Fetching more albums for artist ${artistId}, page ${nextPage}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/artists/${artistId}/albums?page=${nextPage}`);
      const data = await response.json();

      if (data.success && data.data) {
        const newAlbums = data.data.albums || data.data;

        if (Array.isArray(newAlbums) && newAlbums.length > 0) {
          // Calculate new unique albums outside the state updater (keep updater pure)
          setAlbums(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const uniqueNew = newAlbums.filter(a => a.id && !existingIds.has(a.id));
            return [...prev, ...uniqueNew];
          });
          setAlbumPage(nextPage + 1);
          // Stop when the API returns a partial page (fewer than 10 means it's the last page).
          // Don't rely on `data.data.total` — it can be inflated due to duplicates in the API.
          setHasMoreAlbums(newAlbums.length >= 10);
        } else {
          // Empty array means no more pages
          setHasMoreAlbums(false);
        }
      } else {
        setHasMoreAlbums(false);
      }
    } catch (error) {
      console.error('Error fetching more albums:', error);
      setHasMoreAlbums(false);
    } finally {
      setFetchingMoreAlbums(false);
    }
  }, [artistId, albumPage, fetchingMoreAlbums, hasMoreAlbums]);

  // Observer for infinite scrolling albums
  useEffect(() => {
    const scrollContainer = document.getElementById('artist-scroll-container');
    if (!scrollContainer || !hasMoreAlbums || fetchingMoreAlbums || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreAlbums();
        }
      },
      {
        root: scrollContainer,
        threshold: 0.1,
      }
    );

    if (albumsObserverTarget.current) {
      observer.observe(albumsObserverTarget.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMoreAlbums, fetchingMoreAlbums, fetchMoreAlbums, loading]);

  // Check if artist is liked when component mounts and session is available
  useEffect(() => {
    const checkArtistLiked = async () => {
      if (session?.user?.id && artistId) {
        try {
          const response = await fetch(`/api/liked-artists/check?userId=${session.user.id}&artistId=${artistId}`);
          const data = await response.json();
          if (data.success) {
            setIsArtistLiked(data.isLiked);
          }
        } catch (error) {
          console.error('Error checking if artist is liked:', error);
        }
      }
    };

    checkArtistLiked();
  }, [session?.user?.id, artistId]);

  // Handle missing or short bio with external enrichment
  useEffect(() => {
    const fetchExternalBio = async () => {
      // If we already have a good bio, don't fetch more
      // Good bio = at least one section with more than 100 characters
      const isBioGood = biography.some(b => b.text && b.text.length > 100);

      if (!isBioGood && artist?.name && !fetchingBio) {
        setFetchingBio(true);
        try {
          const response = await fetch(`/api/artist/bio?name=${encodeURIComponent(artist.name)}`);
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            setBiography(prev => {
              // If prev is totally empty, just take the new one
              if (prev.length === 0) return data.data;
              // If prev is small, append new ones but avoid duplicate titles
              const existingTitles = new Set(prev.map(b => b.title?.toLowerCase()));
              const uniqueNew = data.data.filter(b => b.title && !existingTitles.has(b.title.toLowerCase()));
              return [...prev, ...uniqueNew];
            });
          }
        } catch (error) {
          console.error('Failed to fetch external bio:', error);
        } finally {
          setFetchingBio(false);
        }
      }
    };

    if (artist?.name && !loading) {
      fetchExternalBio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist?.name, loading]); // Removed 'biography' and 'fetchingBio' from dependencies to prevent loop

  const handlePlayClick = (song, index) => {
    playSong(song, songs, artistId, index);
  };

  const handlePlayAll = () => {
    if (songs && songs.length > 0) {
      const isPlaylistPlaying = currentPlaylistId === artistId;

      if (isPlaylistPlaying) {
        togglePlayPause();
      } else {
        let startSong = songs[0];
        let startIndex = 0;

        if (isShuffle) {
          startIndex = Math.floor(Math.random() * songs.length);
          startSong = songs[startIndex];
        }

        playSong(startSong, songs, artistId, startIndex);
      }
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const extractDominantColor = (imageUrl) => {
    // Use proxy for external images to bypass CORS issues during color extraction
    const finalUrl = imageUrl.startsWith('http')
      ? `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;

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
          let dominantColor = '40,40,40'; // Default
          let maxWeight = 0;

          for (const [color, weight] of Object.entries(colorCounts)) {
            if (weight > maxWeight) {
              maxWeight = weight;
              dominantColor = color;
            }
          }

          resolve(`rgb(${dominantColor})`);
        } catch (error) {
          console.error('Error extracting color:', error);
          resolve('rgb(40, 40, 40)'); // Default dark gray
        }
      };

      img.onerror = () => {
        resolve('rgb(40, 40, 40)'); // Default dark gray
      };

      img.src = finalUrl;
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFollowers = (count) => {
    if (!count) return "0";
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const decodeHtmlEntities = useCallback((text) => {
    if (!text) return text;

    // Handle Mojibake (UTF-8 interpreted as Latin-1/Windows-1252)
    let cleanedText = text
      .replace(/â€œ/g, '“')
      .replace(/â€/g, '”')
      .replace(/â€˜/g, '‘')
      .replace(/â€™/g, '’')
      .replace(/â€”/g, '—')
      .replace(/â€“/g, '–')
      .replace(/â€¦/g, '…')
      .replace(/Â/g, ''); // Non-breaking space artifact

    if (!cleanedText.includes('&')) return cleanedText;

    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'"
    };
    return cleanedText.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, m => entities[m]);
  }, []);

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
      const songArtist = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
      const album = song.album?.name ? decodeHtmlEntities(song.album.name) : 'Unknown Album';
      const year = song.year || (song.releaseDate ? new Date(song.releaseDate).getFullYear() : '');

      if (!silent) toast.loading(`Downloading "${title}"...`, { id: toastId });

      // 3. Use 100% client-side download with metadata embedding!
      const result = await downloadWithMetadata({
        songUrl: downloadUrl,
        title,
        artist: songArtist,
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
      if (!silent) {
        toast.error(`Failed to download: ${error.message}`, { id: toastId });
      }
      throw error;
    }
  };

  const handleDownloadSongs = async () => {
    const songsToDownload = songs || [];
    if (songsToDownload.length === 0) {
      toast.info('No songs to download!');
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
          <span class="font-bold text-sm">Downloading Songs...</span>
          <span class="text-xs opacity-90" id="download-progress-text">Preparing 0 / ${songsToDownload.length}</span>
        </div>
      </div>
    `;
    document.body.appendChild(progressToast);

    let downloadedCount = 0;
    let failedCount = 0;
    const CONCURRENCY_LIMIT = 4;
    const queue = [...songsToDownload];

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
          progressText.textContent = `Progress: ${downloadedCount + failedCount} / ${songsToDownload.length} (${failedCount} failed)`;
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

  const toggleArtistLike = async () => {
    if (!session?.user?.id) {
      console.log('User not logged in');
      return;
    }

    try {
      setArtistLikeLoading(true);
      const response = await fetch('/api/liked-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          artistId: artistId
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsArtistLiked(data.liked);
        console.log(data.message);
      }
    } catch (error) {
      console.error('Error toggling artist like:', error);
    } finally {
      setArtistLikeLoading(false);
    }
  };

  const handleAddToPlaylist = (e, song) => {
    e.stopPropagation();
    setSelectedSong(song);
    setAddToPlaylistDialogOpen(true);
  };

  const handleGoToAlbum = (e, song) => {
    e.stopPropagation();
    if (song.album?.id) {
      router.push(`/music/album/${song.album.id}`);
    }
  };


  const handleDownload = async (e, song) => {
    e.stopPropagation();
    triggerSmartlink(true); // Download — fire every time, no cooldown
    await downloadSingleSong(song);
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset id="artist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
          {/* Main Ambient Gradient Layer - Matches the artist UI layout */}
          <div
            className="absolute inset-0 h-[390px] pointer-events-none transition-all duration-1000"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')} 0%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
                    transparent 100%)`
                : 'transparent'
            }}
          />
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md md:bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 pt-12 md:p-8 md:pt-20 relative z-10">
            <div className="animate-pulse space-y-6">
              {/* Header Skeleton Only - Circular for Artist */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
                <div className="w-48 h-48 md:w-60 md:h-60 bg-muted rounded-full shadow-2xl shrink-0" />
                <div className="flex-1 space-y-4 text-center md:text-left w-full">
                  {/* Verified Badge Skeleton */}
                  <div className="h-6 bg-muted rounded w-32 mx-auto md:mx-0 opacity-80" />

                  {/* Name Skeleton */}
                  <div className="h-10 md:h-16 bg-muted rounded w-3/4 md:w-[500px] mx-auto md:mx-0" />

                  {/* Followers Metadata Skeleton */}
                  <div className="h-4 bg-muted rounded w-1/2 md:w-64 mx-auto md:mx-0 opacity-70" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!artist) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Artist not found</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="artist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header
          style={{
            backgroundColor: showHeaderTitle
              ? dominantColor
                ? `color-mix(in srgb, ${dominantColor}, black 60%)`
                : '#1D1046'
              : undefined
          }}
          className={`fixed md:sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b transition-all duration-300 w-full ${showHeaderTitle
            ? "border-border text-white"
            : "bg-transparent md:bg-background border-transparent"
            }`}
        >
          <div className="flex items-center justify-between w-full gap-2 px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center gap-2 transition-all duration-300">
                {showHeaderTitle ? (
                  <h2 className="text-base font-bold animate-in fade-in slide-in-from-bottom-2 duration-300 line-clamp-1">
                    {artist.name}
                  </h2>
                ) : (
                  <Breadcrumb className="hidden md:block">
                    <BreadcrumbList>
                      <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="hidden md:block" />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Artist</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                )}
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
            className="absolute inset-0 h-[390px] pointer-events-none transition-all duration-1000"
            style={{
              background: dominantColor
                ? `linear-gradient(to bottom, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.8)')} 0%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
                    transparent 100%`
                : 'transparent'
            }}
          />

          <div className="relative z-10">
            {/* Artist Header */}
            <div className="p-4 pt-12 pb-2 md:p-8 md:pt-20 md:pb-4 text-foreground">
              {/* Mobile Layout */}
              <div className="block md:hidden">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-48 h-48 rounded-full overflow-hidden bg-muted">
                    {artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url ? (
                      <img
                        src={artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="w-16 h-16 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 w-full text-left flex flex-col items-start">
                    {artist.isVerified && (
                      <Badge variant="secondary" className="mb-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                        Verified Artist
                      </Badge>
                    )}
                    <h1 ref={mobileTitleRef} className="text-2xl font-bold wrap-break-word">
                      {artist.name}
                    </h1>
                    <div className="flex items-center justify-start gap-4 text-sm flex-wrap">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{formatFollowers(artist.followerCount)} followers</span>
                      </div>
                      {artist.dob && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Born {artist.dob}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex gap-6 items-end">
                <div className="w-60 h-60 rounded-full overflow-hidden bg-muted shrink-0">
                  {artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url ? (
                    <img
                      src={artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image?.[0]?.url}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-20 h-20 opacity-50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {artist.isVerified && (
                    <Badge variant="secondary" className="mb-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                      Verified Artist
                    </Badge>
                  )}
                  <h1 ref={desktopTitleRef} className="text-4xl md:text-6xl font-bold mb-4 wrap-break-word">
                    {artist.name}
                  </h1>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{formatFollowers(artist.followerCount)} followers</span>
                    </div>
                    {artist.dob && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Born {artist.dob}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 pt-2 md:p-8 md:pt-4">
              <div className="flex items-center gap-0.5 md:gap-1">
                <Button
                  size="lg"
                  className="rounded-full w-12 h-12 md:w-14 md:h-14 text-black hover:scale-105 transition-all duration-500 cursor-pointer"
                  style={{
                    backgroundColor: dominantColor,
                    boxShadow: `0 8px 32px ${dominantColor.replace('rgb', 'rgba').replace(')', ', 0.3)')}`
                  }}
                  onClick={handlePlayAll}
                >
                  {currentPlaylistId === artistId && isPlaying ? (
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

                <ArtistActionMenu
                  artist={artist}
                  isArtistLiked={isArtistLiked}
                  toggleArtistLike={toggleArtistLike}
                  onDownloadSongs={handleDownloadSongs}
                  artistLikeLoading={artistLikeLoading}
                  decodeHtmlEntities={decodeHtmlEntities}
                />
              </div>
            </div>

            <div className="pl-2 pr-1 md:px-6 pb-32 md:pb-24 space-y-6 md:space-y-8">
              {/* Popular Songs */}
              {songs && songs.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Popular</h2>
                  <div className="space-y-0">
                    {songs.slice(0, showAllTopSongs ? undefined : 10).map((song, index) => {
                      const isCurrentSong = currentSong?.id === song.id;
                      return (
                        <div key={song.id || index}>
                          {/* Mobile Layout */}
                          <div
                            className="flex md:hidden items-center gap-2 pl-1 pr-0 py-2 rounded hover:bg-muted/50 group cursor-pointer"
                            onClick={() => handlePlayClick(song, index)}
                          >
                            {/* Play indicator column */}
                            <div className={`w-6 text-center shrink-0 ${!showTrackNumbersMobile ? 'hidden' : ''}`}>
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
                                <IoMdPlay className="w-4 h-4 mx-auto text-green-500" />
                              ) : (
                                <>
                                  <span className="text-muted-foreground group-hover:hidden text-sm">
                                    {index + 1}
                                  </span>
                                  <IoMdPlay className="w-4 h-4 mx-auto hidden group-hover:block" />
                                </>
                              )}
                            </div>

                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden relative">
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

                            {/* Song name + album subtitle */}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate text-sm ${isCurrentSong ? 'text-green-500' : ''}`}>
                                {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                              </p>
                              <p className="text-xs truncate text-muted-foreground">
                                {song.album?.name || 'Unknown Album'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <SongActionMenu
                                song={song}
                                onAddToPlaylist={handleAddToPlaylist}
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
                            className="hidden md:flex items-center gap-4 pl-1 pr-0 py-2 rounded hover:bg-muted/50 group cursor-pointer"
                            onClick={() => handlePlayClick(song, index)}
                          >
                            {/* Play indicator column */}
                            <div className="w-8 text-center shrink-0">
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
                                <IoMdPlay className="w-4 h-4 mx-auto text-green-500" />
                              ) : (
                                <>
                                  <span className="text-muted-foreground group-hover:hidden text-sm">
                                    {index + 1}
                                  </span>
                                  <IoMdPlay className="w-4 h-4 mx-auto hidden group-hover:block" />
                                </>
                              )}
                            </div>

                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded bg-muted shrink-0 overflow-hidden">
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

                            {/* Song name + album subtitle */}
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate text-base ${isCurrentSong ? 'text-green-500' : ''}`}>
                                <Link
                                  href={`/music/song/${song.id}`}
                                  className="hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
                                </Link>
                              </p>
                              <p
                                className={`text-sm truncate cursor-pointer ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'}`}
                                onClick={() => handlePlayClick(song, index)}
                              >
                                {song.album?.name || 'Unknown Album'}
                              </p>
                            </div>

                            <div
                              className="w-24 lg:w-32 text-right text-sm text-muted-foreground pr-4 cursor-pointer"
                              onClick={() => handlePlayClick(song, index)}
                            >
                              {song.playCount ? Number(song.playCount).toLocaleString() : ''}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${isLiked(song.id) ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                              onClick={async (e) => {
                                e.stopPropagation();
                                await toggleLike(song);
                              }}
                            >
                              <Heart className={`w-4 h-4 ${isLiked(song.id) ? 'fill-current' : ''}`} />
                            </Button>

                            <div className="w-12 text-center text-sm text-muted-foreground">
                              {formatDuration(song.duration)}
                            </div>

                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <SongActionMenu
                                song={song}
                                onAddToPlaylist={handleAddToPlaylist}
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
                  <div className="mt-4 flex flex-wrap gap-2">
                    {songs.length > 10 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground font-bold"
                        onClick={() => setShowAllTopSongs(!showAllTopSongs)}
                      >
                        {showAllTopSongs ? "Show less" : "See more"}
                      </Button>
                    )}
                    {hasMoreSongs && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground font-bold flex items-center gap-2"
                        onClick={fetchMoreSongs}
                        disabled={fetchingMoreSongs}
                      >
                        {fetchingMoreSongs ? (
                          <>
                            <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                            Loading...
                          </>
                        ) : (
                          "Load more content"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}



              {/* Latest Releases — tabbed: Songs | Albums */}
              {(latestLoading || latestSongs.length > 0 || latestAlbums.length > 0) && (
                <div>
                  {/* Header + tabs */}
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <h2 className="text-xl md:text-2xl font-bold">Discography</h2>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
                      <button
                        onClick={() => setLatestTab('songs')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${latestTab === 'songs' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Singles &amp; Songs
                      </button>
                      <button
                        onClick={() => setLatestTab('albums')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${latestTab === 'albums' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Albums
                      </button>
                    </div>
                  </div>

                  {/* Loading skeleton */}
                  {latestLoading && (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="shrink-0 w-[140px] md:w-[160px] lg:w-[180px] space-y-2">
                          <div className="aspect-square rounded-lg bg-muted animate-pulse" />
                          <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                          <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Songs tab */}
                  {!latestLoading && latestTab === 'songs' && (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                      {latestSongs.length > 0 ? latestSongs.map((song, index) => {
                        const isCurrentSong = currentSong?.id === song.id;
                        const imgUrl =
                          song.image?.find(i => i.quality === '500x500')?.url ||
                          song.image?.find(i => i.quality === '150x150')?.url ||
                          song.image?.[song.image.length - 1]?.url ||
                          '/default-playlist-image.png';
                        const releaseYear = song.releaseDate
                          ? new Date(song.releaseDate).getFullYear()
                          : song.year || '';
                        // First item gets "Latest Release" badge
                        const isLatest = index === 0;
                        return (
                          <Link
                            key={song.id || index}
                            href={`/music/song/${song.id}`}
                            className="group cursor-pointer shrink-0 snap-start w-[140px] md:w-[160px] lg:w-[180px]"
                          >
                            <div className="relative rounded-lg aspect-square overflow-hidden mb-2 bg-muted">
                              <img
                                src={imgUrl}
                                alt={song.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                                onError={(e) => { e.target.src = '/default-playlist-image.png'; }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div
                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 hidden md:flex"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePlayClick(song, songs.findIndex(s => s.id === song.id));
                                }}
                              >
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 flex items-center justify-center shadow-lg transition-transform">
                                  {isCurrentSong && isPlaying
                                    ? <HiPause className="w-4 h-4 text-black" />
                                    : <IoMdPlay className="w-4 h-4 text-black ml-0.5" />
                                  }
                                </div>
                              </div>
                            </div>
                            <div className="space-y-0.5 px-1">
                              <p className={`text-xs md:text-sm font-bold leading-tight line-clamp-1 ${isCurrentSong ? 'text-green-500' : 'text-foreground'}`}>
                                {decodeHtmlEntities(song.name)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isLatest && <span className="text-foreground font-medium">Latest Release · </span>}
                                {releaseYear} · Single
                              </p>
                            </div>
                          </Link>
                        );
                      }) : (
                        <p className="text-sm text-muted-foreground py-4">No songs found</p>
                      )}
                    </div>
                  )}

                  {/* Albums tab */}
                  {!latestLoading && latestTab === 'albums' && (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                      {latestAlbums.length > 0 ? latestAlbums.map((album, index) => {
                        const releaseYear = album.releaseDate
                          ? new Date(album.releaseDate).getFullYear()
                          : album.year || '';
                        const isLatest = index === 0;
                        const typeLabel = album.type === 'single' ? 'Single' : album.type === 'ep' ? 'EP' : 'Album';
                        return (
                          <Link
                            key={album.id}
                            href={`/music/album/${album.id}`}
                            className="group cursor-pointer shrink-0 snap-start w-[140px] md:w-[160px] lg:w-[180px]"
                          >
                            <div className="relative rounded-lg aspect-square overflow-hidden mb-2 bg-muted">
                              <img
                                src={album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url || '/def playlist image.jpg'}
                                alt={album.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => { e.target.src = '/def playlist image.jpg'; }}
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 flex items-center justify-center shadow-lg transition-transform">
                                  <IoMdPlay className="w-4 h-4 text-black ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-0.5 px-1">
                              <p className="text-xs md:text-sm font-bold leading-tight line-clamp-1 text-foreground">
                                {album.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isLatest && <span className="text-foreground font-medium">Latest Release · </span>}
                                {releaseYear} · {typeLabel}
                              </p>
                            </div>
                          </Link>
                        );
                      }) : (
                        <p className="text-sm text-muted-foreground py-4">No albums found</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Albums */}
              {albums.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Albums</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-6">
                    {albums.map((album) => (
                      <Link
                        key={album.id}
                        href={`/music/album/${album.id}`}
                        className="group cursor-pointer hover:scale-105 transition-transform"
                      >
                        <div className="relative rounded-lg aspect-square overflow-hidden mb-2 md:mb-3 bg-muted">
                          {album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url ? (
                            <img
                              src={album.image?.[2]?.url || album.image?.[1]?.url || album.image?.[0]?.url}
                              alt={album.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = '/def playlist image.jpg';
                              }}
                            />
                          ) : (
                            <img
                              src="/def playlist image.jpg"
                              alt={album.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Button
                            size="icon"
                            className="absolute bottom-1 right-1 md:bottom-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 hover:bg-green-600 rounded-full shadow-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"
                          >
                            <IoMdPlay className="w-3 h-3 md:w-4 md:h-4 text-black ml-0.5" />
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs md:text-sm font-medium leading-tight line-clamp-2 text-foreground">
                            {album.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {album.year} • Album
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {hasMoreAlbums && (
                    <div ref={albumsObserverTarget} className="w-full flex justify-center py-8">
                      {fetchingMoreAlbums && (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* About */}
              {biography && biography.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <h2 className="text-xl md:text-2xl font-bold">About</h2>
                    {fetchingBio && (
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    {biography.slice(0, 5).map((bioSection, index) => (
                      <div key={index}>
                        {bioSection.title && (
                          <h3 className="text-base md:text-lg font-semibold mb-2">{decodeHtmlEntities(bioSection.title)}</h3>
                        )}
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {decodeHtmlEntities(bioSection.text)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    </SidebarProvider>
  );
}