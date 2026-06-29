"use client"

import { usePathname } from "next/navigation"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SidebarStateContext } from "@/components/ui/sidebar"

export default function MusicLayoutClient({ children, defaultOpen }) {
  const pathname = usePathname()
  const hideBottomNav = pathname === "/music/youtube/search"

  return (
    <SidebarStateContext.Provider value={defaultOpen}>
      {children}
      {!hideBottomNav && <MobileBottomNav />}
    </SidebarStateContext.Provider>
  )
}

