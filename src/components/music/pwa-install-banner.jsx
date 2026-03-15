"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 1. Basic Mobile Detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    // 2. Check if already dismissed
    const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
    
    // 3. Check if already installed/standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    // Show banner if it's mobile, not dismissed, and not already installed
    if (isMobile && !dismissed && !isStandalone) {
      setShow(true);
    }

    // Listen for the prompt event to capture it for the actual install
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // We already called setShow(true) above, but this ensures we have the prompt
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
        setDeferredPrompt(null);
      }
    } else {
      // Logic for when prompt isn't available (iOS or Insecure HTTP)
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        alert('To install Jammify on iOS, tap the Share button and select "Add to Home Screen".');
      } else {
        alert('To install Jammify, you need to use HTTPS or localhost. If you are on a phone, try once the app is deployed!');
      }
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (!show) return null;

  return (
    <div
      className="relative block w-full p-4 bg-[#fbbcc4] box-border animate-in fade-in slide-in-from-top-2 duration-300"
      role="banner"
    >
      <button
        className="absolute top-4 right-4 p-1 text-black z-10 flex items-center justify-center hover:opacity-70 transition-opacity"
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
      >
        <X size={24} strokeWidth={2.5} />
      </button>

      <div className="flex flex-col gap-2 max-w-[90%]">
        <h2 className="text-2xl font-extrabold text-black m-0 leading-tight">
          Install app
        </h2>
        <p className="text-base font-medium text-black mb-3 leading-normal">
          Install Jammify for faster and easier access to your favorite music.
        </p>
        
        <button 
          className="inline-flex items-center justify-center w-fit min-w-[100px] h-11 px-6 rounded-full bg-black text-white text-base font-bold cursor-pointer active:scale-95 transition-transform" 
          onClick={handleInstall}
        >
          Install
        </button>
      </div>
    </div>
  );
}
