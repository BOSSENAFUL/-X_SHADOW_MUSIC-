"use client";

import { useEffect, useState } from "react";
import { useMusicPlayer } from "@/contexts/music-player-context";

export function DevToolsBlocker({ allowLocal = true }) {
  const [isBlocked, setIsBlocked] = useState(false);

  const musicPlayer = useMusicPlayer();

  useEffect(() => {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname.endsWith('.local') ||
                    window.location.hostname.startsWith('192.168.');
                    
    if (isLocal && allowLocal) {
      console.log("DevToolsBlocker: Local environment detected, skipping protection.");
      return;
    }

    // Helper to detect mobile/tablet devices where docked DevTools do not exist
    const isMobileOrTablet = () => {
      if (typeof window === "undefined" || typeof navigator === "undefined") return false;
      const ua = navigator.userAgent || navigator.vendor || window.opera || "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(ua);
      const hasTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const isSmallScreen = window.innerWidth <= 1024 || window.outerWidth <= 1024;

      return isMobileUA || (hasTouch && isSmallScreen) || (isCoarsePointer && isSmallScreen);
    };

    const preventDefault = (e) => e.preventDefault();

    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J / Cmd+Opt+J (Console)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 74 || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C / Cmd+Opt+C (Element Selector)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 67 || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U / Cmd+Opt+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.keyCode === 85 || e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }
    };

    const isMobile = isMobileOrTablet();
    if (!isMobile) {
      document.addEventListener("contextmenu", preventDefault);
    }
    document.addEventListener("keydown", handleKeyDown);

    // DevTools Detection logic (docked panel sizing thresholds)
    const checkDevTools = () => {
      // Mobile and tablet browsers do not dock DevTools, and browser address/status bars cause dimension diffs
      if (isMobileOrTablet()) {
        return false;
      }

      // Threshold for docked DevTools panel on desktop (220px accounts for toolbars and screen scale)
      const threshold = 220;
      const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);

      return widthDiff > threshold || heightDiff > threshold;
    };

    let wasOpen = false;

    const handleDetection = () => {
      const isOpen = checkDevTools();

      if (isOpen) {
        if (!wasOpen) {
          console.warn("DevTools detected! Blocking UI.");
          setIsBlocked(true);
          
          // Pause playback if context is available
          if (musicPlayer && musicPlayer.setIsPlaying) {
            musicPlayer.setIsPlaying(false);
          }
          wasOpen = true;
        }
      } else {
        if (wasOpen) {
          console.log("DevTools closed. Unblocking UI.");
          setIsBlocked(false);
          wasOpen = false;
        }
      }
    };

    // Check on resize events and periodically on an interval
    window.addEventListener("resize", handleDetection);
    const intervalId = setInterval(handleDetection, 1000);

    // Initial check
    handleDetection();

    return () => {
      if (!isMobile) {
        document.removeEventListener("contextmenu", preventDefault);
      }
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleDetection);
      clearInterval(intervalId);
    };
  }, [allowLocal, musicPlayer]);

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#0c0c0c] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
        <div className="max-w-md bg-[#161616]/80 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Developer Tools Detected
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            To protect copyright assets, Jammify is disabled while Developer Tools are active. Please close Developer Tools to resume.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

