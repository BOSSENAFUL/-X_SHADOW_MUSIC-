"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Standalone check
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // 2. Dismissed check
    const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (dismissed) return;

    // 3. iOS Detection
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // 4. Capture any existing global deferredPrompt (captured by layout.js script)
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setShow(true);
    }

    // 5. Event listener for new prompt events
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    // Custom event dispatched from layout.js if it captured the prompt early
    const handleCustomPrompt = (e) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-available", handleCustomPrompt);

    // 6. For iOS, we show the banner immediately to explain Safari guidelines
    if (ios) {
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-available", handleCustomPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
        setDeferredPrompt(null);
        window.deferredPrompt = null;
      }
    } else if (isIOS) {
      alert(
        "To install Jammify on iOS:\n\n" +
        "1. Tap the 'Share' button at the bottom of Safari.\n" +
        "2. Scroll down and tap 'Add to Home Screen'."
      );
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
        className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors z-10 flex items-center justify-center cursor-pointer"
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
      >
        <X size={18} />
      </button>

      <div className="flex flex-col gap-1 pr-6 text-left">
        <h2 className="text-lg font-bold text-foreground leading-tight">
          Install Jammify
        </h2>
        <p className="text-xs text-muted-foreground leading-normal">
          {isIOS
            ? "Add Jammify to your Home Screen for full-screen playback and instant access."
            : "Install Jammify as a web app on your device for high-fidelity playback and seamless access."}
        </p>
      </div>

      <button
        className="inline-flex items-center justify-center w-full h-9 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold cursor-pointer active:scale-95 transition-transform"
        onClick={handleInstall}
      >
        {isIOS ? "How to Install" : "Install App"}
      </button>
    </div>
  );
}
