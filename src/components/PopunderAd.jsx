"use client";

import { useEffect } from "react";

/**
 * Adsterra Popunder — 1 ad per 2 hours, hard-limited.
 *
 * The problem with naive implementations:
 *   Once the Adsterra script loads it attaches its OWN global click listener
 *   that calls window.open() on every click — completely outside our control.
 *
 * The fix — window.open() interception:
 *   We override window.open() BEFORE the script runs. When the script calls
 *   window.open() for the first time (the popunder), we:
 *     1. Allow that one call through ✅
 *     2. Save the cooldown timestamp
 *     3. Immediately restore the original window.open
 *   Any further popunder attempts hit the original window.open context and
 *   Adsterra cannot open another tab until we re-inject on the next visit
 *   after the cooldown expires.
 */

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const STORAGE_KEY = "jammify_popunder_ts";
const SCRIPT_SRC =
  "https://assistedtogether.com/78/16/14/78161449f40ff73137a708d04b3b806b.js";

export default function PopunderAd() {
  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      // Skip entirely if still within the 2-hour cooldown
      if (last && now - parseInt(last, 10) < COOLDOWN_MS) {
        return;
      }

      // ── Intercept window.open BEFORE the script loads ──────────────────────
      // Adsterra calls window.open() to open the popunder tab.
      // We allow exactly ONE call, then restore the original immediately.
      const originalOpen = window.open.bind(window);
      let intercepted = false;

      window.open = function (...args) {
        if (!intercepted) {
          intercepted = true;
          // Save cooldown timestamp — the popunder is firing right now
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
          // Restore original so nothing else in the app is affected
          window.open = originalOpen;
          // Let this one popunder through
          return originalOpen(...args);
        }
        // Block any further popunder attempts from the same script instance
        return null;
      };

      // Inject the Adsterra popunder script
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.type = "text/javascript";

      script.onerror = () => {
        // Script blocked by ad blocker — restore window.open, skip cooldown
        window.open = originalOpen;
        console.warn("[PopunderAd] Script blocked by ad blocker.");
      };

      document.head.appendChild(script);

      return () => {
        // Always restore window.open on unmount to be safe
        if (!intercepted) {
          window.open = originalOpen;
        }
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } catch (e) {
      console.warn("[PopunderAd] Could not initialize:", e);
    }
  }, []);

  return null;
}
