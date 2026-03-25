"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function RouteChangeHandler() {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    // We only want to KEEP the scroll and playlists if we are on any of the discovery/library pages
    const isAllowedPath = pathname.startsWith("/music");
    const isPlaylistPath = pathname === "/music/playlists" || pathname.startsWith("/music/playlists/");
    
    // Reset all caches when clicking "Home" (Discovery) or "Search"
    const isHomeOrSearch = pathname === "/music" || pathname === "/music/search";

    if (!isAllowedPath || isHomeOrSearch) {
      // 1. Clear Community cache
      sessionStorage.removeItem("communityPlaylistsState");
      sessionStorage.removeItem("communityPlaylistsScrollPosition");

      // 2. Clear Other Discover section caches
      sessionStorage.removeItem("recentlyPlayedScrollPosition");
      sessionStorage.removeItem("newReleasesScrollPosition");
      sessionStorage.removeItem("newReleasesAllData");
      sessionStorage.removeItem("topHitsScrollPosition");
      sessionStorage.removeItem("topHitsAllData");
      sessionStorage.removeItem("playlistsDiscoverScrollPosition");
      sessionStorage.removeItem("playlistsDiscoverAllData");
      sessionStorage.removeItem("englishTopScrollPosition");
      sessionStorage.removeItem("englishTopAllData");

      // 3. Clear Personal Playlists & Library cache
      if (session?.user?.id) {
        const userId = session.user.id;
        sessionStorage.removeItem(`user_playlists_page_${userId}`);
        sessionStorage.removeItem(`user_playlists_scroll_${userId}`);

        // 4. Clear Library cache
        sessionStorage.removeItem(`created_playlists_${userId}`);
        sessionStorage.removeItem(`library_scroll_${userId}`);
      }
    } else {
      // Normal within-app navigation: keep general music cache, but might clear specific scrolls
      
      // User specifically wants to reset playlist scroll if NOT on /music/playlists or /music/playlists/[id]
      if (session?.user?.id && !isPlaylistPath) {
        sessionStorage.removeItem(`user_playlists_scroll_${session.user.id}`);
      }
    }
  }, [pathname, session?.user?.id]);

  return null;
}
