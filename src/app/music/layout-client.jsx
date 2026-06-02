"use client"

import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import AdsterraBanner from "@/components/AdsterraBanner"
import AdBlockDetector from "@/components/AdBlockDetector"

export default function MusicLayoutClient({ children }) {
  return (
    <>
      {children}
      <MobileBottomNav />
      <AdsterraBanner width={320} height={50} adKey="ac540274472f406492e1b1e20c29c410" />
      <AdBlockDetector />
    </>
  )
}
