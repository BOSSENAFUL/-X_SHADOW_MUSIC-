"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdFree } from "@/contexts/ad-free-context";
import { toast } from "sonner";
import { Heart, Sparkles, AlertCircle, X, ShieldAlert } from "lucide-react";

export default function AdFreeModal() {
  const { isAdFreeModalOpen, setIsAdFreeModalOpen, unlockAdFree } = useAdFree();
  const [clickTime, setClickTime] = useState(null);
  const [isWaitingForReturn, setIsWaitingForReturn] = useState(false);

  const handleClose = useCallback(() => {
    setIsAdFreeModalOpen(false);
    sessionStorage.setItem("jammify_ad_free_skipped", "true");
  }, [setIsAdFreeModalOpen]);

  const handleSupportClick = useCallback(() => {
    setClickTime(Date.now());
    setIsWaitingForReturn(true);
  }, []);

  useEffect(() => {
    if (!isWaitingForReturn || !clickTime) return;

    const checkReturnTime = () => {
      const elapsed = Date.now() - clickTime;
      if (elapsed >= 20000) {
        unlockAdFree();
        toast.success("12 Hours of Ad-Free listening unlocked! 🎉", {
          duration: 5000,
        });
        setIsAdFreeModalOpen(false);
        // Defer reload slightly so toast is visible, completely cleaning popunder window click handlers
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error("You came back too soon! Please view the page for at least 20 seconds.", {
          duration: 5000,
        });
      }
      // Reset state
      setClickTime(null);
      setIsWaitingForReturn(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkReturnTime();
      }
    };

    const handleFocus = () => {
      checkReturnTime();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isWaitingForReturn, clickTime, unlockAdFree, setIsAdFreeModalOpen]);

  useEffect(() => {
    if (!isAdFreeModalOpen) return;

    const handleWindowClick = (e) => {
      const backdrop = document.getElementById("ad-free-modal-backdrop");
      if (!backdrop || !backdrop.contains(e.target)) return;

      // Stop event in capture phase to prevent popunder script from catching the click
      e.stopImmediatePropagation();

      const closeBtn = e.target.closest("#ad-free-close-btn");
      const supportBtn = e.target.closest("#ad-free-support-btn");
      const skipBtn = e.target.closest("#ad-free-skip-btn");

      if (closeBtn) {
        e.preventDefault();
        handleClose();
      } else if (supportBtn) {
        e.preventDefault();
        window.open(
          "https://assistedtogether.com/xpe5paf4?key=b322408d16aa2ebcf591c134695bac6d",
          "_blank",
          "noopener,noreferrer"
        );
        handleSupportClick();
      } else if (skipBtn) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("click", handleWindowClick, true);
    return () => {
      window.removeEventListener("click", handleWindowClick, true);
    };
  }, [isAdFreeModalOpen, handleClose, handleSupportClick]);

  if (!isAdFreeModalOpen) return null;

  return (
    <div 
      id="ad-free-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="relative bg-[#181818] rounded-2xl max-w-md w-full border border-white/5 shadow-2xl p-6 md:p-8 flex flex-col space-y-6 text-center animate-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (X) */}
        <button
          id="ad-free-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <Heart className="w-7 h-7 text-red-500 fill-red-500 animate-pulse" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
            Keep Jammify Alive & Free
          </h2>
          <p className="text-xs text-amber-500 font-semibold flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 fill-amber-500/20" />
            INDIE DEVELOPER NOTE
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 leading-relaxed text-justify sm:text-center">
          A quick note from the developer: I know ads can be a headache. But as our community grows, so do the database and server costs. Without these sponsor links, I won&apos;t have enough funds to keep the app running, and I’ll have to shut it down.
        </p>

        {/* Instructions Container */}
        <div className="bg-[#222]/80 border border-white/5 rounded-xl p-4 text-left space-y-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider block mb-1">
            Instructions to Unlock:
          </span>
          <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Click <span className="text-white font-semibold">Support Jammify</span> below.</li>
            <li>The sponsor page will safely open.</li>
            <li>Keep it open for <span className="text-white font-semibold">at least 20 seconds</span>.</li>
            <li>Come back to unlock <span className="text-emerald-400 font-semibold">12 Hours of Ad-Free</span> listening!</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3 pt-2">
          <a
            id="ad-free-support-btn"
            href="https://assistedtogether.com/xpe5paf4?key=b322408d16aa2ebcf591c134695bac6d"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              handleSupportClick();
            }}
            className="w-full bg-white hover:bg-gray-100 text-black font-extrabold rounded-full py-3.5 text-sm md:text-base tracking-wide transition-all duration-300 shadow-lg cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] text-center block"
          >
            Support Jammify
          </a>
          
          <button
            id="ad-free-skip-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors py-1 cursor-pointer"
          >
            Skip and keep ads
          </button>
        </div>

        {/* Safe status indicator */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-600">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Opens a secure page in a new tab. Next.js router remains active.</span>
        </div>
      </div>
    </div>
  );
}
