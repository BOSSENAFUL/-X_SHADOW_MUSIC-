"use client"

import { usePathname } from "next/navigation"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function MusicLayoutClient({ children }) {
  const pathname = usePathname()
  const hideBottomNav = pathname === "/music/podcasts/choose"

  return (
    <>
      {children}
      {!hideBottomNav && <MobileBottomNav />}
    </>
  )
}

