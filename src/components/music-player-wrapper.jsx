"use client";

import { usePathname } from "next/navigation";
import { MusicPlayer } from "@/components/music-player";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { useSession } from "next-auth/react";

export function MusicPlayerWrapper() {
  const { currentSong, playlist, isPlayerVisible, handleSongChange } = useMusicPlayer();
  const pathname = usePathname();
  const { status } = useSession();

  // Hide player if not logged in
  if (status === "unauthenticated") return null;

  // Only render on music, profile, and settings pages (app routes)
  const isAppRoute =
    pathname.startsWith("/music") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  if (!isAppRoute) return null;

  // Hide the player bar entirely on all podcasts and youtube-playlist pages
  if (pathname.startsWith("/music/youtube") || pathname.startsWith("/music/youtube-playlist")) return null;

  // Always render MusicPlayer when there's a current song and player is visible
  // The MusicPlayer itself will handle hiding the bottom bar when fullscreen is open
  if (!isPlayerVisible || !currentSong) return null;

  return (
    <MusicPlayer
      currentSong={currentSong}
      playlist={playlist}
      onSongChange={handleSongChange}
    />
  );
}
