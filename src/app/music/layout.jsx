"use client"

import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function MusicLayout({ children }) {
  return (
    <>
      {children}
      <MobileBottomNav />
    </>
  )
}