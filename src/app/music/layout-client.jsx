"use client"

import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function MusicLayoutClient({ children }) {
  return (
    <>
      {children}
      <MobileBottomNav />
    </>
  )
}
