"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { SidebarStateContext } from "@/components/ui/sidebar"

export default function MusicLayoutClient({ children, defaultOpen }) {
  const pathname = usePathname()
  const hideBottomNav = pathname === "/music/youtube/search"
  const [open, setOpen] = useState(defaultOpen)

  // Sync state if defaultOpen changes on server reload/rehydration
  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])

  return (
    <SidebarStateContext.Provider value={{ open, setOpen }}>
      {children}
      {!hideBottomNav && <MobileBottomNav />}
    </SidebarStateContext.Provider>
  )
}

