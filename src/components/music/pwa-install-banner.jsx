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
      requestAnimationFrame(() => setShow(true));
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
      className="fixed bottom-32 left-4 right-4 md:left-auto md:right-6 md:bottom-24 md:w-[360px] p-5 bg-card border border-border shadow-2xl rounded-2xl z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="banner"
    >
      <button
        className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors z-10 flex items-center justify-center"
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
      >
        <X size={18} />
      </button>

      <div className="flex flex-col gap-1 pr-6">
        <h2 className="text-lg font-bold text-foreground leading-tight">
          Install Jammify
        </h2>
        <p className="text-xs text-muted-foreground leading-normal">
          Install Jammify on your home screen for fast, seamless access to your music.
        </p>
      </div>
      
      <button 
        className="inline-flex items-center justify-center w-full h-9 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold cursor-pointer active:scale-95 transition-transform" 
        onClick={handleInstall}
      >
        Install
      </button>
    </div>
  );
}
