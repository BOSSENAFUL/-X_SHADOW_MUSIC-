"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Play,
  Pause,
  ArrowLeft,
  MoreVertical,
  Clock,
  Shuffle,
  Download,
  Share,
  ListMusic,
  Trash2,
  Lock,
  Unlock,
  Edit,
  Heart,
  Minus,
  User,
  Disc,
  Search,
  Check,
  LayoutList,
  List,
  Music2
} from "lucide-react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useLikedSongs } from "@/hooks/useLikedSongs";
import { toast } from "sonner";
import { HiPause } from "react-icons/hi2";
import { IoMdPlay } from "react-icons/io";
import { ShareStoryPreview } from "@/components/share-story-preview";
import { downloadWithMetadata } from "@/lib/clientDownload";

// --- In-Memory Global Color Cache ---
const globalColorCache = typeof window !== 'undefined' ? new Map() : null;

// --- Helper Components ---
const SongActionMenu = memo(({
  song,
  onGoToArtist,
  onGoToAlbum,
  onDownload,
  onShare,
  onRemove,
  toggleLike,
  isLiked,
  isOwner,
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
        className={`flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors ${isLiked(song.id) ? 'text-red-500' : ''}`}
        onClick={(e) => {
          onItemClick();
          e.stopPropagation();
          toggleLike(song);
        }}
      >
        <Heart className={`w-5 h-5 ${isLiked(song.id) ? 'fill-current' : ''}`} />
        <span className="font-medium">{isLiked(song.id) ? 'Unlike' : 'Like'}</span>
      </div>

      {isOwner && onRemove && (
        <div
          className="flex items-center gap-4 p-3 hover:bg-red-500/10 text-red-500 cursor-pointer transition-colors px-3 font-medium"
          onClick={(e) => {
            onItemClick();
            onRemove(song.id);
          }}
        >
          <Minus className="w-5 h-5" />
          <span>Remove from playlist</span>
        </div>
      )}

      <div
        className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onShare(song);
        }}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share</span>
      </div>

      <div
        className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          router.push(`/music/song/${song.id}`);
        }}
      >
        <Music2 className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Song detail</span>
      </div>
      <div
        className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
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
          className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
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
        className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={(e) => {
          onItemClick();
          onDownload(song);
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download</span>
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
            className="p-2 h-10 w-10 text-muted-foreground hover:bg-accent/50"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DrawerTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <DrawerContent className="bg-background border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0 text-left">
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
          className="p-1 h-8 w-8 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(song);
          }}
          className={`${isLiked(song.id) ? 'text-red-500' : ''} hover:bg-accent focus:bg-accent cursor-pointer`}
        >
          <Heart className={`w-4 h-4 mr-2 ${isLiked(song.id) ? 'fill-current' : ''}`} />
          {isLiked(song.id) ? 'Unlike' : 'Like'}
        </DropdownMenuItem>

        {isOwner && onRemove && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRemove(song.id);
              }}
              className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer font-medium"
            >
              <Minus className="w-4 h-4 mr-2" />
              Remove from playlist
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onShare(song);
          }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Share className="w-4 h-4 mr-2" />
          Share
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); router.push(`/music/song/${song.id}`); }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Music2 className="w-4 h-4 mr-2" />
          Song detail
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onGoToArtist(e, song);
          }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          Go to artist
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onGoToAlbum(e, song);
          }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Disc className="w-4 h-4 mr-2" />
          Go to album
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDownload(song);
          }}
          className="hover:bg-accent focus:bg-accent cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SongActionMenu.displayName = "SongActionMenu";

// --- Playlist Action Menu ---
const PlaylistActionMenu = memo(({
  playlist,
  isOwner,
  onEdit,
  onTogglePrivacy,
  onShare,
  onDelete,
  onDownload,
  canDownload,
  open,
  setOpen,
  isMobile,
  getPlaylistCover,
  decodeHtmlEntities,
  onToggleLike,
  isLiked,
  likingInProgress
}) => {
  const cover = getPlaylistCover();
  const playlistImageUrl = cover.type === 'single' ? cover.src : (cover.type === 'collage' ? cover.images[0] : '/default-playlist-image.png');

  const ActionItems = ({ onItemClick }) => (
    <>
      {!isOwner && playlist.isPublic && (
        <div
          className={`flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors ${isLiked ? 'text-red-500' : ''} ${likingInProgress ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => {
            onItemClick();
            onToggleLike();
          }}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span className="font-medium">{isLiked ? 'Remove from library' : 'Add to library'}</span>
        </div>
      )}
      {isOwner && (
        <>
          <div
            className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => {
              onItemClick();
              onEdit();
            }}
          >
            <Edit className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Edit playlist</span>
          </div>
          <div
            className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => {
              onItemClick();
              onTogglePrivacy();
            }}
          >
            {playlist.isPublic ? (
              <>
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Make private</span>
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Make public</span>
              </>
            )}
          </div>
        </>
      )}

      <div
        className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => {
          onItemClick();
          onShare();
        }}
      >
        <Share className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Share playlist</span>
      </div>

      <div
        className={`flex items-center gap-4 p-3 hover:bg-accent/50 transition-colors ${!canDownload ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => {
          if (canDownload) {
            onItemClick();
            onDownload();
          }
        }}
      >
        <Download className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">Download playlist</span>
      </div>

      {isOwner && (
        <>
          <div className="h-px bg-border my-1" />
          <div
            className="flex items-center gap-4 p-3 hover:bg-accent/50 cursor-pointer transition-colors text-red-500"
            onClick={() => {
              onItemClick();
              onDelete();
            }}
          >
            <Trash2 className="w-5 h-5 text-current" />
            <span className="font-medium">Delete playlist</span>
          </div>
        </>
      )}
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
          <DrawerContent className="bg-background border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="p-0 text-left">
              <div className="flex items-center gap-4 px-4 py-4 border-b border-border">
                <div className="w-14 h-14 rounded shadow-lg overflow-hidden shrink-0 bg-muted">
                  {cover.type === 'collage' ? (
                    <div className="w-full h-full grid grid-cols-2 gap-0">
                      {cover.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                      ))}
                    </div>
                  ) : (
                    <img src={playlistImageUrl} alt={playlist.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                  <DrawerTitle className="text-base font-bold truncate text-foreground text-left">
                    {playlist.name}
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground truncate mt-0.5 text-left">
                    Playlist • {playlist.ownerName || 'Unknown User'}
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent border-none outline-none transition-colors cursor-pointer">
          <MoreVertical style={{ width: '24px', height: '24px' }} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border text-foreground p-1">
        {!isOwner && playlist.isPublic && (
          <>
            <DropdownMenuItem
              onClick={onToggleLike}
              disabled={likingInProgress}
              className={`${isLiked ? 'text-red-500' : ''} hover:bg-accent focus:bg-accent cursor-pointer`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Remove from library' : 'Add to library'}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
          </>
        )}
        {isOwner && (
          <>
            <DropdownMenuItem onClick={onEdit} className="hover:bg-accent focus:bg-accent cursor-pointer">
              <Edit className="w-4 h-4 mr-2" />
              Edit playlist
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onTogglePrivacy} className="hover:bg-accent focus:bg-accent cursor-pointer">
              {playlist.isPublic ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Make private
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Make public
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
          </>
        )}
        <DropdownMenuItem onClick={onShare} className="hover:bg-accent focus:bg-accent cursor-pointer">
          <Share className="w-4 h-4 mr-2" />
          Share playlist
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDownload}
          disabled={!canDownload}
          className="hover:bg-accent focus:bg-accent cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Download playlist
        </DropdownMenuItem>
        {isOwner && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer font-medium"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete playlist
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

PlaylistActionMenu.displayName = "PlaylistActionMenu";

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
          className={`flex items-center justify-between px-3 py-2.5 rounded-sm hover:bg-accent transition-colors text-sm ${sortBy === option.id ? 'text-[#1ed760] font-medium' : 'text-foreground/90'}`}
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
          className={`flex items-center justify-between px-3 py-2.5 rounded-sm hover:bg-accent transition-colors text-sm ${viewAs === option.id ? 'text-[#1ed760] font-medium' : 'text-foreground/90'}`}
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

  // useState must be at top level — never inside if-blocks (Rules of Hooks)
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);

  if (isMobile) {
    return (
      <Drawer open={sortDrawerOpen} onOpenChange={setSortDrawerOpen}>
        <DrawerTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors py-1.5 px-3 bg-muted/50 rounded-full border border-border shrink-0">
            <span className={sortBy !== 'custom' ? 'text-[#1ed760]' : ''}>Sort</span>
            <List className="w-3.5 h-3.5 opacity-80" />
          </button>
        </DrawerTrigger>
        <DrawerPortal>
          <DrawerContent className="bg-popover border-none text-foreground outline-none focus:outline-none ring-0 focus-visible:ring-0">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Sort and View Options</DrawerTitle>
              <DrawerDescription>Select sorting order and view mode for the current playlist</DrawerDescription>
            </DrawerHeader>
            <Content closeOnSelect={() => setSortDrawerOpen(false)} />
            <div className="h-6" />
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors h-9 px-3 hover:bg-accent/50 rounded-md">
          <span className={sortBy !== 'custom' ? 'text-[#1ed760]' : ''}>{currentSortLabel}</span>
          <List className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover border-none text-foreground p-0 shadow-xl ring-1 ring-black/20">
        <Content />
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

SortAndViewMenu.displayName = "SortAndViewMenu";

// ─── Virtual Song List ──────────────────────────────────────────────────────
const ITEM_HEIGHTS = {
  list: 64,
  compact: 48
};
const OVERSCAN = 5;     // extra rows above/below viewport

const SongRow = React.memo(function SongRow({
  song, index, isCurrentSong, isPlaying, isOwner,
  isSongLiked, handlePlayClick, handleToggleSongLike,
  handleRemoveFromPlaylist, handleDownloadSong, handleShareSong,
  decodeHtmlEntities, formatDuration, router, playlistId, viewAs
}) {
  const imageUrl = song.image?.find(img => img.quality === '500x500')?.url ||
    song.image?.find(img => img.quality === '150x150')?.url ||
    song.image?.[song.image.length - 1]?.url;

  return (
    <div>
      {/* Mobile */}
      <div
        className={`md:hidden flex items-center rounded hover:bg-muted/50 group cursor-pointer ${viewAs === 'compact' ? 'gap-2 pl-0 pr-0 py-1 h-[48px]' : 'gap-2 pl-0 pr-0 py-2 h-[64px]'}`}
        onClick={() => handlePlayClick(song, index)}
      >
        <div className="grid place-items-center shrink-0 w-8 h-full">
          {isCurrentSong && isPlaying ? (
            <div className="col-start-1 row-start-1 flex items-end justify-center gap-0.5 h-3 w-4">
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0s' }} />
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.2s' }} />
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.4s' }} />
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.1s' }} />
            </div>
          ) : isCurrentSong ? (
            <div className="col-start-1 row-start-1 flex items-center justify-center">
              <IoMdPlay className="w-4 h-4 text-green-500" />
            </div>
          ) : (
            <div className="col-start-1 row-start-1 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">{index + 1}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <div className={`${viewAs === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded bg-muted shrink-0 overflow-hidden`}>
            <img src={imageUrl || '/default-playlist-image.png'} alt={song.name}
              className="w-full h-full object-cover rounded" loading="lazy"
              onError={(e) => { e.target.src = '/default-playlist-image.png'; }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''} ${viewAs === 'compact' ? 'text-sm' : ''}`}>
              {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
            </p>
            <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'}`}>
              {song.artists?.primary?.length > 0
                ? song.artists.primary.map((a, ai) => <span key={a.id || ai}>{a.name}{ai < song.artists.primary.length - 1 && ', '}</span>)
                : 'Unknown Artist'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <SongActionMenu
            song={song}
            onGoToArtist={(e, s) => {
              if (s.artists?.primary?.length > 0) router.push(`/music/artist/${s.artists.primary[0].id}`);
            }}
            onGoToAlbum={(e, s) => {
              if (s.album?.id) router.push(`/music/album/${s.album.id}`);
            }}
            onDownload={handleDownloadSong}
            onShare={handleShareSong}
            onRemove={handleRemoveFromPlaylist}
            toggleLike={handleToggleSongLike}
            isLiked={isSongLiked}
            isOwner={isOwner}
            decodeHtmlEntities={decodeHtmlEntities}
          />
        </div>
      </div>

      {/* Desktop */}
      <div
        className={`hidden md:grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 items-center p-1.5 rounded hover:bg-muted/50 group cursor-pointer ${viewAs === 'compact' ? 'py-1' : 'py-2'}`}
        onClick={() => handlePlayClick(song, index)}
        style={{ height: viewAs === 'compact' ? ITEM_HEIGHTS.compact : ITEM_HEIGHTS.list }}
      >
        <div className="flex items-center justify-center shrink-0 w-10">
          {isCurrentSong && isPlaying ? (
            <div className="flex items-end justify-center gap-0.5 h-3 w-4">
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0s' }} />
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.2s' }} />
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.4s' }} />
              <div className="w-0.5 h-full bg-green-500 animate-music-bar" style={{ animationDelay: '0.1s' }} />
            </div>
          ) : isCurrentSong ? (
            <IoMdPlay className="w-4 h-4 text-green-500" />
          ) : (
            <>
              <span className="text-muted-foreground group-hover:hidden text-sm">{index + 1}</span>
              <IoMdPlay className="w-4 h-4 hidden group-hover:block" />
            </>
          )}
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`${viewAs === 'compact' ? 'w-8 h-8' : 'w-12 h-12'} rounded bg-muted shrink-0 overflow-hidden`}>
            <img src={imageUrl || '/default-playlist-image.png'} alt={song.name}
              className="w-full h-full object-cover rounded" loading="lazy"
              onError={(e) => { e.target.src = '/default-playlist-image.png'; }} />
          </div>
          <div className="min-w-0">
            <p className={`font-medium truncate ${isCurrentSong ? 'text-green-500' : ''} ${viewAs === 'compact' ? 'text-sm' : ''}`}>
              {decodeHtmlEntities(song.name) || `Track ${index + 1}`}
            </p>
            <p className={`text-sm truncate ${isCurrentSong ? 'text-green-400' : 'text-muted-foreground'}`}>
              {song.artists?.primary?.length > 0
                ? song.artists.primary.map((artist, ai) => (
                  <span key={artist.id || ai}>
                    <button
                      className={`hover:underline transition-colors ${isCurrentSong ? 'hover:text-green-300' : 'hover:text-foreground'}`}
                      onClick={(e) => { e.stopPropagation(); router.push(`/music/artist/${artist.id}`); }}
                    >{decodeHtmlEntities(artist.name)}</button>
                    {ai < song.artists.primary.length - 1 && ', '}
                  </span>
                ))
                : 'Unknown Artist'}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {song.album?.name ? (
            <button className="hover:underline hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); if (song.album.id) router.push(`/music/album/${song.album.id}`); }}>
              {decodeHtmlEntities(song.album.name)}
            </button>
          ) : 'Unknown Album'}
        </div>
        <div className="text-sm text-muted-foreground">
          {song.releaseDate ? new Date(song.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date'}
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost" size="sm"
            className={`h-8 w-8 hidden md:inline-flex shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${isSongLiked(song.id) ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={async (e) => { e.stopPropagation(); await handleToggleSongLike(song); }}
          >
            <Heart className={`w-4 h-4 ${isSongLiked(song.id) ? 'fill-current' : ''}`} />
          </Button>
          <div className="min-w-[40px] text-right text-sm text-muted-foreground font-mono hidden md:block">
            {formatDuration(song.duration)}
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <SongActionMenu
              song={song}
              onGoToArtist={(e, s) => {
                if (s.artists?.primary?.length > 0) router.push(`/music/artist/${s.artists.primary[0].id}`);
              }}
              onGoToAlbum={(e, s) => {
                if (s.album?.id) router.push(`/music/album/${s.album.id}`);
              }}
              onDownload={handleDownloadSong}
              onShare={handleShareSong}
              onRemove={handleRemoveFromPlaylist}
              toggleLike={handleToggleSongLike}
              isLiked={isSongLiked}
              isOwner={isOwner}
              decodeHtmlEntities={decodeHtmlEntities}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

function VirtualSongList({
  songs, currentSong, activePlaylistId, playlistId, currentIndex, isPlaying, isOwner,
  isSongLiked, handlePlayClick, handleToggleSongLike, handleRemoveFromPlaylist,
  handleDownloadSong, handleShareSong, decodeHtmlEntities, formatDuration, router, viewAs
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);
  const [listOffsetTop, setListOffsetTop] = useState(0);
  const itemHeight = viewAs === 'compact' ? ITEM_HEIGHTS.compact : ITEM_HEIGHTS.list;

  useEffect(() => {
    const scrollEl = document.getElementById('user-playlist-scroll-container');
    if (!scrollEl) return;

    const onScroll = () => setScrollTop(scrollEl.scrollTop);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });

    const updateMeasurements = () => {
      setContainerHeight(scrollEl.clientHeight);
      if (containerRef.current) {
        const scrollRect = scrollEl.getBoundingClientRect();
        const listRect = containerRef.current.getBoundingClientRect();
        setListOffsetTop(listRect.top - scrollRect.top + scrollEl.scrollTop);
      }
    };

    const ro = new ResizeObserver(updateMeasurements);
    ro.observe(scrollEl);
    updateMeasurements();

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  // Re-measure when songs change
  useEffect(() => {
    const scrollEl = document.getElementById('user-playlist-scroll-container');
    if (!scrollEl || !containerRef.current) return;
    const scrollRect = scrollEl.getBoundingClientRect();
    const listRect = containerRef.current.getBoundingClientRect();
    setListOffsetTop(listRect.top - scrollRect.top + scrollEl.scrollTop);
  }, [songs.length]);

  const relativeScroll = Math.max(0, scrollTop - listOffsetTop);
  const startIndex = Math.max(0, Math.floor(relativeScroll / itemHeight) - OVERSCAN);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + OVERSCAN * 2;
  const endIndex = Math.min(songs.length - 1, startIndex + visibleCount);

  const totalHeight = songs.length * itemHeight;
  const paddingTop = startIndex * itemHeight;

  return (
    <div ref={containerRef} style={{ height: totalHeight, position: 'relative' }}>
      <div style={{ paddingTop }}>
        {songs.slice(startIndex, endIndex + 1).map((song, i) => {
          const index = startIndex + i;
          const isCurrentSong = currentSong?.id === song.id &&
            activePlaylistId === playlistId;
          return (
            <SongRow
              key={`${song.id}-${index}`}
              song={song}
              index={index}
              isCurrentSong={isCurrentSong}
              isPlaying={isPlaying}
              isOwner={isOwner}
              isSongLiked={isSongLiked}
              handlePlayClick={handlePlayClick}
              handleToggleSongLike={handleToggleSongLike}
              handleRemoveFromPlaylist={handleRemoveFromPlaylist}
              handleDownloadSong={handleDownloadSong}
              handleShareSong={handleShareSong}
              decodeHtmlEntities={decodeHtmlEntities}
              formatDuration={formatDuration}
              router={router}
              playlistId={playlistId}
              viewAs={viewAs}
            />
          );
        })}
      </div>
    </div>
  );
}


export default function PlaylistDetailPage({ params }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistId, setPlaylistId] = useState(null);
  const [dominantColors, setDominantColors] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("custom");
  const [viewAs, setViewAs] = useState("list");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const mobileTitleRef = useRef(null);
  const desktopTitleRef = useRef(null);
  const isMobile = useIsMobile();

  // Drag and drop states for playlist reordering
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastTrackedRef = useRef(0);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);

  // Initialize music player
  const { playSong, currentSong, currentIndex, isPlaying, togglePlayPause, currentPlaylistId: activePlaylistId, isShuffle, setIsShuffle } = useMusicPlayer();

  // Initialize liked songs hook
  const { toggleLike: toggleSongLike, isLiked: isSongLiked } = useLikedSongs(session?.user?.id);

  // Function to decode HTML entities - cached to avoid repeated DOM work
  const htmlEntityCache = useRef(new Map());
  const decodeHtmlEntities = useCallback((text) => {
    if (!text) return text;
    if (htmlEntityCache.current.has(text)) return htmlEntityCache.current.get(text);
    const entities = {
      '&amp;': '&', '&lt;': '<', '&gt;': '>',
      '&quot;': '"', '&#39;': "'", '&apos;': "'"
    };
    const result = text.includes('&')
      ? text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, m => entities[m])
      : text;
    htmlEntityCache.current.set(text, result);
    return result;
  }, []);

  // Extract dominant colors from image and make them darker for ambient effect
  const extractColorsFromImage = (imageSrc) => {
    if (globalColorCache && globalColorCache.has(imageSrc)) {
      return Promise.resolve(globalColorCache.get(imageSrc));
    }

    // Use proxy for external images to bypass CORS issues during color extraction
    const finalSrc = imageSrc.startsWith('http')
      ? `/api/proxy/image?url=${encodeURIComponent(imageSrc)}`
      : imageSrc;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Get image data
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
          if (brightness < 40 || brightness > 220) continue;

          // Calculate saturation (simplified)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max - min;

          // Skip very desaturated (grayish) colors
          if (saturation < 30) continue;

          const color = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
          // Weight by saturation to favor vibrant colors
          colorCounts[color] = (colorCounts[color] || 0) + (1 + saturation / 50);
        }

        // Find the most common color
        let dominantColor = '80,80,80'; // Default dark gray
        let maxWeight = 0;

        for (const [color, weight] of Object.entries(colorCounts)) {
          if (weight > maxWeight) {
            maxWeight = weight;
            dominantColor = color;
          }
        }

        const resultColor = `rgb(${dominantColor})`;
        if (globalColorCache) globalColorCache.set(imageSrc, resultColor);
        resolve(resultColor);
      };

      img.onerror = () => {
        const fallback = 'rgb(80, 80, 80)';
        if (globalColorCache) globalColorCache.set(imageSrc, fallback);
        resolve(fallback);
      };

      img.src = finalSrc;
    });
  };

  // Unwrap params Promise
  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      setPlaylistId(id);

      // --- Simple Caching Check (Survives tab navigations) ---
      try {
        const cached = sessionStorage.getItem(`jammify_playlist_${id}`);
        if (cached) {
          const { playlist, songs, dominantColors, timestamp } = JSON.parse(cached);
          // If less than 10 minutes old, load immediately
          if (Date.now() - timestamp < 600000) {
            setPlaylist(playlist);
            setSongs(songs);
            setDominantColors(dominantColors);
            setIsOwner(playlist.isOwner || false);
            setLoading(false);
          }
        }
      } catch (e) {
        console.warn('Cache load failed:', e);
      }
    };
    unwrapParams();
  }, [params]);

  // Check if playlist is liked by current user
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!playlistId || !session?.user?.id) return;

      try {
        const response = await fetch(`/api/playlists/${playlistId}/like`);
        const result = await response.json();

        if (result.success) {
          setIsLiked(result.isLiked);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkLikeStatus();
  }, [playlistId, session?.user?.id]);

  // Fetch playlist data and songs
  useEffect(() => {
    const fetchSongs = async (songIds) => {
      try {
        if (!songIds || songIds.length === 0) return [];

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const chunkSize = 50;
        const chunks = [];

        for (let i = 0; i < songIds.length; i += chunkSize) {
          chunks.push(songIds.slice(i, i + chunkSize));
        }

        const allSongsData = await Promise.all(
          chunks.map(async (chunk) => {
            try {
              const response = await fetch(`${apiUrl}/api/songs?ids=${chunk.join(',')}`);
              if (!response.ok) {
                console.error(`Failed to fetch chunk: ${response.status}`);
                return [];
              }
              const data = await response.json();
              return data.success && data.data ? data.data : [];
            } catch (err) {
              console.error('Error fetching song chunk:', err);
              return [];
            }
          })
        );

        const flattenedSongs = allSongsData.flat();

        if (flattenedSongs.length > 0) {
          const musicMap = {};
          flattenedSongs.forEach(song => {
            if (song && song.id) {
              musicMap[song.id] = song;
            }
          });
          const sortedSongs = songIds.map(id => musicMap[id]).filter(Boolean);
          setSongs(sortedSongs);
          return sortedSongs;
        } else {
          setSongs([]);
          return [];
        }
      } catch (error) {
        console.error('Error fetching songs:', error);
        setSongs([]);
        return [];
      }
    };

    const fetchPlaylist = async () => {
      if (!playlistId) return;

      try {
        const response = await fetch(`/api/playlists/${playlistId}`);

        let result;
        try {
          result = await response.json();
        } catch {
          console.error('Empty or invalid JSON response from playlist API');
          setLoading(false);
          return;
        }

        if (result.success) {
          const playlistData = result.data;
          setPlaylist(playlistData);
          setIsOwner(playlistData.isOwner || false);

          // 1. Determine if we can start color extraction immediately (if explicit image exists)
          let colorPromise = null;
          const imageSrc = playlistData.image;

          if (imageSrc) {
            colorPromise = extractColorsFromImage(imageSrc);
          }

          // 2. Fetch songs (and potentially start color extraction from first song afterward)
          let currentSongs = [];
          if (playlistData.songIds && playlistData.songIds.length > 0) {
            currentSongs = await fetchSongs(playlistData.songIds);
          } else {
            setSongs([]);
          }

          // 3. If we haven't started extraction yet (no explicit image), start it now from songs
          if (!colorPromise) {
            const cover = getPlaylistCover(playlistData, currentSongs);
            let extractedSrc = '/def playlist image.jpg';
            if (cover.type === 'single' && cover.src) {
              extractedSrc = cover.src;
            } else if (cover.type === 'collage' && cover.images[0]) {
              extractedSrc = cover.images[0];
            }
            colorPromise = extractColorsFromImage(extractedSrc);
          }

          // 4. Wait for color extraction with a timeout
          try {
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('rgb(80, 80, 80)'), 1500));
            const color = await Promise.race([colorPromise, timeoutPromise]);

            // Batch all state updates together for an "all at once" reveal
            setDominantColors(color);
            setSongs(currentSongs);

            // SAVE TO CACHE
            try {
              sessionStorage.setItem(`jammify_playlist_${playlistId}`, JSON.stringify({
                playlist: playlistData,
                songs: currentSongs,
                dominantColors: color,
                timestamp: Date.now()
              }));
            } catch (e) { }
          } catch (e) {
            console.error('Initial color extraction failed:', e);
            setSongs(currentSongs);
          }
        } else {
          if (response.status === 403) {
            setAccessDenied(true);
          } else {
            console.error('Failed to fetch playlist:', result.error);
          }
        }
      } catch (error) {
        console.error('Error fetching playlist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  // Generate playlist cover based on songs
  const getPlaylistCover = (customPlaylist = null, customSongs = null) => {
    const targetPlaylist = customPlaylist || playlist;
    const targetSongs = customSongs || songs;

    if (targetPlaylist?.image) {
      // Proxy YouTube Music images through our API
      const imageUrl = targetPlaylist.image.includes('yt3.googleusercontent.com')
        ? `/api/proxy/image?url=${encodeURIComponent(targetPlaylist.image)}`
        : targetPlaylist.image;
      return { type: 'single', src: imageUrl };
    }

    if (!targetSongs || targetSongs.length === 0) {
      return { type: 'default', src: '/default-playlist-image.png' };
    }

    if (targetSongs.length >= 1 && targetSongs.length <= 3) {
      const firstSong = targetSongs[0];
      const imageUrl = firstSong.image?.find(img => img.quality === '500x500')?.url ||
        firstSong.image?.find(img => img.quality === '150x150')?.url ||
        firstSong.image?.[firstSong.image.length - 1]?.url;

      return {
        type: 'single',
        src: imageUrl || '/default-playlist-image.png',
        song: firstSong
      };
    }

    if (targetSongs.length >= 4) {
      const firstFourSongs = targetSongs.slice(0, 4);
      const images = firstFourSongs.map(song => {
        return song.image?.find(img => img.quality === '150x150')?.url ||
          song.image?.find(img => img.quality === '500x500')?.url ||
          song.image?.[song.image.length - 1]?.url ||
          '/default-playlist-image.png';
      });

      return {
        type: 'collage',
        images: images,
        songs: firstFourSongs
      };
    }

    return { type: 'default', src: '/default-playlist-image.png' };
  };



  // ── Recently Played Tracking ────────────────────────────────────────
  const trackRecentlyPlayed = () => {
    if (!session?.user?.id || !playlist) return;

    // Throttle: don't track the same playlist more than once every 5 minutes
    const now = Date.now();
    if (now - lastTrackedRef.current < 300000) {
      return;
    }

    const cover = getPlaylistCover();
    let imageArr = [];
    if (cover.type === 'single' && cover.src) {
      imageArr = [{ quality: 'default', url: cover.src }];
    } else if (cover.type === 'collage' && cover.images?.length) {
      imageArr = cover.images.map(url => ({ quality: 'default', url }));
    }
    const playlistData = {
      id: playlistId,
      name: playlist.name,
      image: imageArr,
      songCount: songs.length,
      source: 'user',
      owner: session.user.name || session.user.email || 'You',
    };

    // Update ref before fetch to prevent race conditions from rapid clicks
    lastTrackedRef.current = now;

    // Fire-and-forget – don't block UI
    fetch('/api/recently-played-playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistData }),
    }).catch(() => {
      // Reset ref on failure so we can try again sooner? 
      // Actually, let's keep it simple. If it fails, we wait 5 mins.
    });
  };

  // Pre-mapped base songs
  const baseMappedSongs = useMemo(() => songs.map(s => ({
    ...s,
    artistName: s.artists?.primary?.[0]?.name || '',
    albumName: s.album?.name || '',
  })), [songs]);

  // Filter songs based on search query
  const filteredBaseSongs = useMemo(() => {
    if (!searchQuery.trim()) return baseMappedSongs;
    const query = searchQuery.toLowerCase().trim();
    return baseMappedSongs.filter(song =>
      song.name?.toLowerCase().includes(query) ||
      song.artists?.primary?.some(artist => artist.name?.toLowerCase().includes(query)) ||
      song.album?.name?.toLowerCase().includes(query)
    );
  }, [baseMappedSongs, searchQuery]);

  // Apply sorting
  const sortedSongs = useMemo(() => {
    let result = [...filteredBaseSongs];
    if (sortBy === 'custom') return result;

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "title":
          comparison = a.name.localeCompare(b.name);
          break;
        case "artist":
          comparison = (a.artistName || '').localeCompare(b.artistName || '');
          break;
        case "album":
          comparison = (a.albumName || '').localeCompare(b.albumName || '');
          break;
        case "added":
          // Falling back to ID as proximity for added time if missing
          const timeA = a.addedAt || a.id;
          const timeB = b.addedAt || b.id;
          comparison = timeB > timeA ? 1 : -1;
          break;
        case "duration":
          comparison = b.duration - a.duration;
          break;
        default:
          break;
      }
      return comparison;
    });
    return result;
  }, [filteredBaseSongs, sortBy]);

  // Pre-map filtered playlist data
  const mappedFilteredPlaylistData = useMemo(() => sortedSongs.map(s => ({
    id: s.id,
    name: s.name,
    artists: { primary: s.artists?.primary || [] },
    album: s.album,
    duration: s.duration,
    image: s.image,
    releaseDate: s.releaseDate,
    language: s.language,
    playCount: s.playCount,
    downloadUrl: s.downloadUrl
  })), [sortedSongs]);

  const handlePlayClick = useCallback((song, index) => {
    if (currentSong?.id === song.id) return;
    // Map individual song if somehow not mapped, but usually we use mapped data in bulk
    const songData = {
      id: song.id, name: song.name,
      artists: { primary: song.artists?.primary || [] },
      album: song.album, duration: song.duration, image: song.image,
      releaseDate: song.releaseDate, language: song.language,
      playCount: song.playCount, downloadUrl: song.downloadUrl
    };
    playSong(songData, mappedFilteredPlaylistData, playlistId, index);
    trackRecentlyPlayed();
  }, [currentSong?.id, mappedFilteredPlaylistData, playlistId, playSong, trackRecentlyPlayed]);

  const handlePlayAll = useCallback(() => {
    if (sortedSongs.length === 0) return;
    if (activePlaylistId === playlistId) { togglePlayPause(); return; }

    let startSong = mappedFilteredPlaylistData[0];
    let startIndex = 0;

    if (isShuffle) {
      startIndex = Math.floor(Math.random() * mappedFilteredPlaylistData.length);
      startSong = mappedFilteredPlaylistData[startIndex];
    }

    playSong(startSong, mappedFilteredPlaylistData, playlistId, startIndex);
    trackRecentlyPlayed();
  }, [sortedSongs, activePlaylistId, playlistId, togglePlayPause, mappedFilteredPlaylistData, playSong, trackRecentlyPlayed, isShuffle]);

  const handleGoBack = () => {
    router.back();
  };

  // ─── Drag and Drop Handlers ───────────────────────────────────────────────
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    setIsDragging(true);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      // Need this for Firefox
      e.dataTransfer.setData("text/html", e.target);
    }
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }

    // Auto-scroll logic
    const scrollContainer = document.getElementById('user-playlist-scroll-container');
    if (scrollContainer) {
      const scrollThreshold = 100; // pixels from edge to trigger scroll
      const scrollSpeed = 15; // pixels to adjust per calculation

      const rect = scrollContainer.getBoundingClientRect();
      const clientY = e.clientY;

      // Check proximity to top edge
      if (clientY - rect.top < scrollThreshold) {
        scrollContainer.scrollTop -= scrollSpeed;
      }
      // Check proximity to bottom edge
      else if (rect.bottom - clientY < scrollThreshold) {
        scrollContainer.scrollTop += scrollSpeed;
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const newSongs = [...songs];
    const draggedItem = newSongs[draggedIndex];
    newSongs.splice(draggedIndex, 1);

    // Adjust insert index
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newSongs.splice(insertIndex, 0, draggedItem);

    setSongs(newSongs); // Optimistic UI update
    handleDragEnd();

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songIds: newSongs.map((s) => s.id)
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
        }
        sessionStorage.removeItem(`jammify_playlist_${playlistId}`);
      } else {
        toast.error('Failed to update playlist order');
      }
    } catch (error) {
      console.error('Error updating playlist order:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };


  const handleTogglePrivacy = async () => {
    // Optimistically update the UI immediately
    const previousState = playlist.isPublic;
    setPlaylist(prev => ({ ...prev, isPublic: !prev.isPublic }));

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: !previousState
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }
        toast.success(result.data.isPublic ? 'Playlist is now public' : 'Playlist is now private');
        // Clear cache so changes reflect on reload
        sessionStorage.removeItem(`jammify_playlist_${playlistId}`);
      } else {
        // Revert the optimistic update if the API call failed
        setPlaylist(prev => ({ ...prev, isPublic: previousState }));
        console.error('Failed to update playlist privacy:', result.error);
        toast.error('Failed to update playlist privacy');
      }
    } catch (error) {
      // Revert the optimistic update if there was an error
      setPlaylist(prev => ({ ...prev, isPublic: previousState }));
      console.error('Error updating playlist privacy:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleSharePlaylist = async () => {
    if (playlist.isPublic) {
      setSharePreviewOpen(true);
    } else {
      toast.info('Make playlist public first to share it!');
    }
  };

  const handleEditPlaylist = () => {
    setEditName(playlist.name);
    setEditDescription(playlist.description || '');
    setEditImageUrl(playlist.image || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      return; // Don't save if name is empty
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          image: editImageUrl.trim()
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }
        setPlaylist(prev => ({
          ...prev,
          name: editName.trim(),
          description: editDescription.trim(),
          image: editImageUrl.trim()
        }));
        setEditDialogOpen(false);
        toast.success('Playlist info updated');
        // Clear cache so changes reflect on reload
        sessionStorage.removeItem(`jammify_playlist_${playlistId}`);
      } else {
        console.error('Failed to update playlist:', result.error);
        toast.error('Failed to update playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Something went wrong');
    }
  };

  const handleDeletePlaylist = async () => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }
        toast.success('Playlist deleted');

        // Also remove from recently played
        fetch(`/api/recently-played-playlists?playlistId=${playlistId}`, {
          method: 'DELETE',
        }).catch(err => console.error('Failed to remove from recently played:', err));

        sessionStorage.removeItem(`jammify_playlist_${playlistId}`);
        router.push('/music/playlists');
      } else {
        console.error('Failed to delete playlist:', result.error);
        toast.error('Failed to delete playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Something went wrong');
    }
  };

  const handleRemoveFromPlaylist = async (songId) => {
    if (!isOwner) {
      toast.error('Only the playlist owner can remove songs!');
      return;
    }

    try {
      const response = await fetch(`/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        if (session?.user?.id) {
          sessionStorage.removeItem(`user_playlists_page_${session.user.id}`);
          sessionStorage.removeItem(`created_playlists_${session.user.id}`);
        }

        // Remove the song from the local state
        setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));

        // Update playlist songIds count
        setPlaylist(prev => ({
          ...prev,
          songIds: prev.songIds.filter(id => id !== songId)
        }));

        sessionStorage.removeItem(`jammify_playlist_${playlistId}`);

        toast.success('Song removed from playlist');
      } else {
        toast.error(result.error || 'Failed to remove song');
      }
    } catch (error) {
      console.error('Error removing song from playlist:', error);
      toast.error('Something went wrong. Please try again.');
    }
  };

  const handleToggleLike = async () => {
    if (!session?.user?.id) {
      toast.info('Please login to save playlists!');
      return;
    }

    if (isOwner) {
      toast.info("You can't save your own playlist!");
      return;
    }

    if (likingInProgress) return;

    setLikingInProgress(true);

    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/playlists/${playlistId}/like`, {
        method: method,
      });

      const result = await response.json();

      if (result.success) {
        setIsLiked(!isLiked);
        toast.success(isLiked ? 'Removed from library' : 'Saved to library');
      } else {
        toast.error(result.error || 'Failed to update library');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Something went wrong');
    } finally {
      setLikingInProgress(false);
    }
  };

  // Handle individual song like/unlike
  const handleToggleSongLike = async (song) => {
    if (!session?.user?.id) {
      return;
    }

    try {
      await toggleSongLike(song);
    } catch (error) {
      console.error('Error toggling song like:', error);
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Memoized — only recalculates when songs change
  const totalDuration = useMemo(() => {
    if (!songs || songs.length === 0) return null;
    const totalSeconds = songs.reduce((acc, song) => acc + (parseInt(song.duration) || 0), 0);
    if (totalSeconds === 0) return null;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
  }, [songs]);

  // Effect to handle scroll and smooth animations (highly optimized)
  useEffect(() => {
    const scrollContainer = document.getElementById('user-playlist-scroll-container');
    if (!scrollContainer) return;

    let ticking = false;


    const handleScroll = () => {
      // 1. Mobile-only progress for animations (Keep this separate)
      // Check mobile status once per frame is okay, or cache it
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Check width inside rAF to ensure we're correct on resize/orientation change
          // This is generally cheap enough, but can be optimized if needed
          const isMobile = window.innerWidth < 768;

          if (isMobile) {
            const scrollTop = scrollContainer.scrollTop;
            const imageThreshold = 350;
            const headerToggleThreshold = 280; // Fast toggle point for mobile

            // Clamp value strictly between 0 and 1
            const progress = Math.max(0, Math.min(1, scrollTop / imageThreshold));

            // Set the property directly - CSS will handle the interpolation
            scrollContainer.style.setProperty('--scroll-progress', progress.toString());

            // Fast Header Toggle (bypasses Observer delay on mobile)
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

    // IntersectionObserver for PC ONLY (Restored to Artist Logic)
    // Triggers when the title is FULLY behind the header
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisibleInLayout = entry.boundingClientRect.width > 0;
          if (isVisibleInLayout) {
            // PC Logic: Trigger when fully behind header (threshold 0)
            setShowHeaderTitle(!entry.isIntersecting);
          }
        });
      },
      {
        root: scrollContainer,
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px", // Header height offset
      }
    );

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    // Only observe desktop title (Mobile handled manually above)
    if (desktopTitleRef.current) observer.observe(desktopTitleRef.current);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [loading, playlist?.name]);

  // Effect to focus search input when it becomes visible
  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchVisible]);

  // Handle click outside to close search (if empty)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSearchVisible &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target) &&
        !searchQuery.trim()) {
        setIsSearchVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchVisible, searchQuery]);

  const handleShareSong = async (song) => {
    // Share the current playlist URL instead of the individual song
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const shareUrl = `${baseUrl}/music/playlists/${playlistId}`;
    const shareText = `Check out "${song.name}" by ${song.artists?.primary?.map(artist => artist.name).join(', ') || 'Unknown Artist'} in this playlist: ${playlist.name}`;

    try {
      // Try to use the Web Share API first (mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: `${song.name} - ${playlist.name}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing song:', error);
      toast.error('Failed to share playlist');
    }
  };

  const handleDownloadPlaylist = async () => {
    if (songs.length === 0) {
      toast.info('No songs in playlist to download!');
      return;
    }

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
    document.body.removeChild(progressToast);

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

  const handleDownloadSong = async (song) => {
    await downloadSingleSong(song);
  };

  if (loading) {
    return (
      <SidebarProvider >
        <AppSidebar />
        <SidebarInset id="user-playlist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col bg-background">
          {/* Main Ambient Gradient Layer - Added to skeleton to show color as soon as it's available */}
          <div
            className="absolute inset-0 h-[450px] pointer-events-none transition-all duration-1000"
            style={{
              background: dominantColors
                ? `linear-gradient(to bottom, 
                    ${dominantColors.replace('rgb', 'rgba').replace(')', ', 0.7)')} 0%, 
                    ${dominantColors.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColors.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
                    transparent 100%)`
                : 'transparent'
            }}
          />
          <header className="sticky top-0 z-50 hidden md:flex h-16 shrink-0 items-center gap-2 md:border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-background/40 hover:bg-background/60">
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

                  {/* Metadata Row */}
                  <div className="flex items-center gap-3 pt-0">
                    <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Access denied screen for private playlists
  if (accessDenied) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset id="user-playlist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="text-center py-12">
              <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">This playlist is private</h3>
              <p className="text-muted-foreground mb-4">Only the owner can see and play this playlist.</p>
              <Button onClick={() => router.push('/music')}>
                Discover Music
              </Button>
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
        <SidebarInset id="user-playlist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background">
            <div className="flex items-center gap-2 px-3 md:px-4">
              <SidebarTrigger className="-ml-1 hidden md:flex" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:flex" />
              <Button size="sm" onClick={handleGoBack} className="mr-1 bg-muted/50 hover:bg-muted text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Playlist not found</h3>
              <p className="text-muted-foreground mb-4">The playlist you're looking for doesn't exist.</p>
              <Button onClick={() => router.push('/music/playlists')}>
                Back to Playlists
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="user-playlist-scroll-container" className="md:ml-0 overflow-y-auto overflow-x-hidden h-svh relative flex flex-col">
        <header
          style={{
            backgroundColor: showHeaderTitle
              ? dominantColors
                ? `color-mix(in srgb, ${dominantColors}, black 60%)`
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
            className="absolute inset-0 -z-10 transition-opacity duration-150 ease-linear pointer-events-none md:hidden"
            style={{
              backgroundColor: dominantColors ? `color-mix(in srgb, ${dominantColors}, black 60%)` : '#1D1046',
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
                {/* PC Version: Minimal switch, no fancy animations */}
                <div className="hidden md:flex items-center h-full flex-1">
                  {!showHeaderTitle ? (
                    <div className="animate-in fade-in duration-200">
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem className="hidden lg:block">
                            <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator className="hidden lg:block" />
                          <BreadcrumbItem className="hidden lg:block">
                            <BreadcrumbLink href="/music/playlists">Playlists</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator className="hidden lg:block" />
                          <BreadcrumbItem>
                            <BreadcrumbPage className="truncate max-w-[150px] md:max-w-none">{playlist.name}</BreadcrumbPage>
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

                {/* Mobile Version: Smooth fade + slide up, optimized for GPU */}
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
          className="flex-1 relative transition-colors duration-300 bg-background"
        >
          {/* Main Ambient Gradient Layer - Creates the deep Spotify-like fade */}
          <div
            className="absolute inset-0 h-[450px] pointer-events-none transition-all duration-300"
            style={{
              background: dominantColors
                ? `linear-gradient(to bottom, 
                    ${dominantColors.replace('rgb', 'rgba').replace(')', ', 0.7)')} 0%, 
                    ${dominantColors.replace('rgb', 'rgba').replace(')', ', 0.4)')} 40%, 
                    ${dominantColors.replace('rgb', 'rgba').replace(')', ', 0.1)')} 80%, 
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
                    {(() => {
                      const cover = getPlaylistCover();

                      if (cover.type === 'single') {
                        return (
                          <img
                            src={cover.src}
                            alt={playlist.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = '/default-playlist-image.png';
                            }}
                          />
                        );
                      } else if (cover.type === 'collage') {
                        return (
                          <div className="w-full h-full grid grid-cols-2 gap-0">
                            {cover.images.map((imageSrc, index) => (
                              <div key={index} className="w-full h-full overflow-hidden">
                                <img
                                  src={imageSrc}
                                  alt={`Song ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = '/default-playlist-image.png';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <img
                            src="/default-playlist-image.png"
                            alt={playlist.name}
                            className="w-full h-full object-cover"
                          />
                        );
                      }
                    })()}
                  </div>
                  <div className="space-y-2 w-full">

                    <h1 ref={mobileTitleRef} className="text-2xl font-bold wrap-break-word text-start mt-2 line-clamp-1 w-full">
                      {playlist.name}
                    </h1>
                    {playlist.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 text-start">
                        {decodeHtmlEntities(playlist.description)}
                      </p>
                    )}
                    <div className="flex items-center justify-start gap-2 text-sm text-muted-foreground">
                      {playlist.ownerImage ? (
                        <img src={playlist.ownerImage} alt={playlist.ownerName} className="w-6 h-6 rounded-full object-cover" />
                      ) : playlist.ownerName === 'Spotify' ? (
                        <img src="https://i.postimg.cc/g25JqFyg/icon-192.png" alt="Jammify" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <span className="font-semibold">{playlist.ownerName || 'Unknown User'}</span>
                      <span>•</span>
                      <span>{playlist.songIds?.length || 0} songs</span>
                      {totalDuration && (
                        <>
                          <span>•</span>
                          <span>{totalDuration}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex gap-6 items-end">
                <div className="w-64 h-64 rounded-lg overflow-hidden shrink-0 shadow-2xl">
                  {(() => {
                    const cover = getPlaylistCover();

                    if (cover.type === 'single') {
                      return (
                        <img
                          src={cover.src}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/default-playlist-image.png';
                          }}
                        />
                      );
                    } else if (cover.type === 'collage') {
                      return (
                        <div className="w-full h-full grid grid-cols-2 gap-0.5">
                          {cover.images.map((imageSrc, index) => (
                            <div key={index} className="w-full h-full overflow-hidden">
                              <img
                                src={imageSrc}
                                alt={`Song ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = '/default-playlist-image.png';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <img
                          src="/default-playlist-image.png"
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      );
                    }
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  {/* <Badge variant="secondary" className="mb-2">
                  {playlist.isPublic ? 'Public' : 'Private'}
                </Badge> */}
                  <h1 ref={desktopTitleRef} className="text-4xl md:text-6xl font-bold mb-2 wrap-break-word">
                    {playlist.name}
                  </h1>
                  {playlist.description && (
                    <p className="text-base text-muted-foreground mb-4 xl:line-clamp-none line-clamp-2 max-w-6xl">
                      {decodeHtmlEntities(playlist.description)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {playlist.ownerImage ? (
                      <img src={playlist.ownerImage} alt={playlist.ownerName} className="w-6 h-6 rounded-full object-cover" />
                    ) : playlist.ownerName === 'Spotify' ? (
                      <img src="https://i.postimg.cc/g25JqFyg/icon-192.png" alt="Jammify" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-semibold">{playlist.ownerName || 'Unknown User'}</span>
                    <span>•</span>
                    <span>{playlist.songIds?.length || 0} songs</span>
                    {totalDuration && (
                      <>
                        <span>•</span>
                        <span>{totalDuration}</span>
                      </>
                    )}
                    {playlist.createdAt && (
                      <>
                        <span>•</span>
                        <span>Created {formatDate(playlist.createdAt)}</span>
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
                    backgroundColor: dominantColors || '#ffffff',
                    boxShadow: dominantColors
                      ? `0 8px 32px ${dominantColors.replace('rgb', 'rgba').replace(')', ', 0.3)')}`
                      : 'none'
                  }}
                  onClick={handlePlayAll}
                  disabled={songs.length === 0}
                >
                  {activePlaylistId === playlistId && isPlaying ? (
                    <HiPause style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <IoMdPlay style={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                  )}
                </Button>

                {/* Moved Heart button to PlaylistActionMenu */}

                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center transition-colors bg-transparent border-none outline-none cursor-pointer ${isShuffle ? 'text-green-500 hover:text-green-400' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Shuffle style={{ width: '24px', height: '24px' }} />
                </button>

                <PlaylistActionMenu
                  playlist={playlist}
                  isOwner={isOwner}
                  onEdit={handleEditPlaylist}
                  onTogglePrivacy={handleTogglePrivacy}
                  onShare={handleSharePlaylist}
                  onDownload={handleDownloadPlaylist}
                  canDownload={songs.length > 0}
                  onDelete={() => {
                    setDropdownOpen(false);
                    setDeleteDialogOpen(true);
                  }}
                  open={dropdownOpen}
                  setOpen={setDropdownOpen}
                  isMobile={isMobile}
                  getPlaylistCover={getPlaylistCover}
                  decodeHtmlEntities={decodeHtmlEntities}
                  onToggleLike={handleToggleLike}
                  isLiked={isLiked}
                  likingInProgress={likingInProgress}
                />

                {/* Search and Sort Options Container */}
                <div className="flex items-center ml-auto gap-1 md:gap-3">
                  {/* Search Bar - Far Right side */}
                  <div ref={searchContainerRef}>
                    <div
                      className={`flex items-center transition-all duration-300 ease-in-out ${isSearchVisible ? 'w-40 md:w-56 h-9 px-2.5 rounded-md border border-border bg-muted/50 justify-start' : 'w-9 h-9 justify-center rounded-full bg-muted/50 hover:bg-muted cursor-pointer border-none'}`}
                      onClick={() => !isSearchVisible && setIsSearchVisible(true)}
                    >
                      <Search className={`w-4 h-4 text-muted-foreground shrink-0 transition-colors ${isSearchVisible ? 'text-foreground/70' : ''}`} />
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

                  {/* Sort and View Options */}
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
            <div className="pl-2 pr-1 md:px-6 pb-32 md:pb-24">
              {songs.length > 0 ? (
                <>
                  {/* Desktop Table Header */}
                  <div className="hidden md:grid grid-cols-[40px_1fr_1fr_120px_100px] gap-4 items-center text-sm text-muted-foreground border-b pb-2 mb-4">
                    <div className="text-right pr-2">#</div>
                    <div>Title</div>
                    <div>Album</div>
                    <div>Date added</div>
                    <div className="flex items-center justify-end gap-1">
                      <div className="min-w-[40px] text-right">
                        <Clock className="w-4 h-4 ml-auto" />
                      </div>
                      <div className="w-8"></div>
                    </div>
                  </div>

                  {isOwner && sortBy === "custom" && !searchQuery ? (
                    <div className="flex flex-col">
                      {sortedSongs.map((song, index) => {
                        const isCurrentSong =
                          currentSong?.id === song.id &&
                          activePlaylistId === playlistId;
                        return (
                          <div
                            key={`${song.id}-${index}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`cursor-grab transition-all duration-200 select-none ${dragOverIndex === index && draggedIndex !== index
                              ? "border-t-2 border-green-400"
                              : ""
                              } ${draggedIndex === index ? "opacity-50 scale-[0.99]" : ""}`}
                          >
                            <SongRow
                              song={song}
                              index={index}
                              isCurrentSong={isCurrentSong}
                              isPlaying={isPlaying}
                              isOwner={isOwner}
                              isSongLiked={isSongLiked}
                              handlePlayClick={handlePlayClick}
                              handleToggleSongLike={handleToggleSongLike}
                              handleRemoveFromPlaylist={handleRemoveFromPlaylist}
                              handleDownloadSong={handleDownloadSong}
                              handleShareSong={handleShareSong}
                              decodeHtmlEntities={decodeHtmlEntities}
                              formatDuration={formatDuration}
                              router={router}
                              playlistId={playlistId}
                              viewAs={viewAs}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <VirtualSongList
                      songs={sortedSongs}
                      currentSong={currentSong}
                      activePlaylistId={activePlaylistId}
                      playlistId={playlistId}
                      currentIndex={currentIndex}
                      isPlaying={isPlaying}
                      isOwner={isOwner}
                      isSongLiked={isSongLiked}
                      handlePlayClick={handlePlayClick}
                      handleToggleSongLike={handleToggleSongLike}
                      handleRemoveFromPlaylist={handleRemoveFromPlaylist}
                      handleDownloadSong={handleDownloadSong}
                      handleShareSong={handleShareSong}
                      decodeHtmlEntities={decodeHtmlEntities}
                      formatDuration={formatDuration}
                      router={router}
                      viewAs={viewAs}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <ListMusic className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery ? "No results found" : "Your playlist is empty"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? `We couldn't find any songs matching "${searchQuery}"` : "Add songs to start building your playlist"}
                  </p>
                  <Button onClick={() => {
                    if (searchQuery) {
                      setSearchQuery("");
                      setIsSearchVisible(false);
                    } else {
                      router.push('/music');
                    }
                  }}>
                    {searchQuery ? "Clear search" : "Find music to add"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Edit Playlist Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit playlist</DialogTitle>
            <DialogDescription>
              Make changes to your playlist details here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3"
                placeholder="Playlist name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">
                Image URL
              </Label>
              <Input
                id="image"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
                className="col-span-3"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="col-span-3"
                placeholder="Add a description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Playlist Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlist?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlaylist}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Image Preview Modal */}
      <ShareStoryPreview
        key={playlist?.id || playlistId}
        isOpen={sharePreviewOpen}
        onClose={setSharePreviewOpen}
        playlist={playlist}
        getPlaylistCover={getPlaylistCover}
        dominantColors={dominantColors}
        shareUrl={typeof window !== 'undefined' ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/music/playlists/${playlistId}` : ''}
      />
    </SidebarProvider>
  );
}