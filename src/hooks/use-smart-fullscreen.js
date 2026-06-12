import { useState, useEffect } from 'react';
import screenfull from 'screenfull';

export function useSmartFullscreen() {
  const [fullscreenType, setFullscreenType] = useState(null); // 'mobile' | 'desktop' | 'split' | null
  const [isCssFallback, setIsCssFallback] = useState(false);

  // 1. Listen for Native Fullscreen Changes (Desktop/Android)
  useEffect(() => {
    if (screenfull.isEnabled) {
      const handleNativeChange = () => {
        if (!screenfull.isFullscreen) {
          setFullscreenType(null);
          setIsCssFallback(false);
        }
      };
      screenfull.on('change', handleNativeChange);
      return () => screenfull.off('change', handleNativeChange);
    }
  }, []);

  // 2. Listen for Device Rotation on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const landscapeQuery = window.matchMedia("(orientation: landscape)");
    
    const handleRotation = (e) => {
      // Only trigger auto-css-fallback on mobile devices if they rotate landscape while fullscreen is active
      const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobileDevice && fullscreenType !== null) {
        setIsCssFallback(e.matches);
      }
    };

    landscapeQuery.addEventListener("change", handleRotation);
    return () => landscapeQuery.removeEventListener("change", handleRotation);
  }, [fullscreenType]);

  // 3. The Smart Toggle Function
  const toggleFullscreen = async (element, type) => {
    if (!element) return;

    const isCurrentActive = fullscreenType === type;

    if (isCurrentActive) {
      // --- EXIT FULLSCREEN ---
      if (screenfull.isEnabled && screenfull.isFullscreen) {
        try {
          await screenfull.exit();
        } catch (error) {
          console.warn("Screenfull exit failed:", error);
        }
      }
      setIsCssFallback(false);
      setFullscreenType(null);
      
      try {
        if (window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (err) {
        console.warn("Screen orientation unlock failed:", err);
      }
    } else {
      // --- ENTER FULLSCREEN ---
      setFullscreenType(type);

      if (screenfull.isEnabled) {
        try {
          await screenfull.request(element); // Try Native
          setIsCssFallback(false);
        } catch (error) {
          console.warn("Native fullscreen failed, using CSS fallback:", error);
          setIsCssFallback(true); // Failed? Use CSS fallback
        }
      } else {
        setIsCssFallback(true); // iOS Safari PWA / restricted mobile browser? Use CSS fallback
      }

      // Try to force landscape rotation on mobile/phones
      try {
        if (window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch (err) {
        console.log("Orientation lock not supported or allowed:", err);
      }
    }
  };

  return { fullscreenType, isCssFallback, toggleFullscreen, setFullscreenType, setIsCssFallback };
}
