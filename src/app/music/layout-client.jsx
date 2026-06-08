"use client"

import { useEffect } from "react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import AdsterraBanner from "@/components/AdsterraBanner"
import AdBlockDetector from "@/components/AdBlockDetector"
import SocialBarAd from "@/components/SocialBarAd"
import { useAdFree } from "@/contexts/ad-free-context"

export default function MusicLayoutClient({ children }) {
  const { isAdFree, setIsAdFreeModalOpen, isLoaded } = useAdFree();

  useEffect(() => {
    if (!isLoaded) return;
    // Check if user is not ad-free and has not skipped the modal in this session
    const hasSkipped = sessionStorage.getItem("jammify_ad_free_skipped") === "true";
    if (!isAdFree && !hasSkipped) {
      setIsAdFreeModalOpen(true);
    }
  }, [isAdFree, setIsAdFreeModalOpen, isLoaded]);

  return (
    <>
      {children}
      <MobileBottomNav />
      {isLoaded && !isAdFree && (
        <>
          <AdsterraBanner width={320} height={50} adKey="ac540274472f406492e1b1e20c29c410" />
          <SocialBarAd />
        </>
      )}
      <AdBlockDetector />
    </>
  )
}

