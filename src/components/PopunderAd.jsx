"use client";

import { useEffect } from "react";

/**
 * Adsterra Popunder — High-Revenue Ad Unit
 *
 * Correct cooldown flow:
 *  1. Page loads → check cooldown
 *  2. Inject the Adsterra script
 *  3. script.onload fires → script actually loaded (not blocked) → add click listener
 *  4. User clicks → popunder fires + timestamp saved NOW
 *  5. Next 12 hours → script skipped entirely
 *
 * If the script is blocked by an ad blocker → onload never fires →
 * click listener never added → timestamp never saved → user gets another
 * chance next visit. No wasted slots.
 */

const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const STORAGE_KEY = "jammify_popunder_ts";
const SCRIPT_SRC =
  "https://assistedtogether.com/78/16/14/78161449f40ff73137a708d04b3b806b.js";

export default function PopunderAd() {
  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      // Skip if user already triggered a popunder within the cooldown window
      if (last && now - parseInt(last, 10) < COOLDOWN_MS) {
        return;
      }

      let clickHandler = null;

      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.type = "text/javascript";

      script.onload = () => {
        // ✅ Script loaded successfully (not blocked by ad blocker)
        // Only NOW add the click listener — the popunder will fire on this click
        clickHandler = () => {
          // Save timestamp at the moment of click = popunder just fired
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
          // Remove immediately — one popunder per 12 hours
          window.removeEventListener("click", clickHandler, true);
          clickHandler = null;
        };
        window.addEventListener("click", clickHandler, true);
      };

      script.onerror = () => {
        // Script blocked by ad blocker — don't save timestamp, don't add listener
        // User gets a fresh attempt next page visit
        console.warn("[PopunderAd] Script blocked, skipping cooldown.");
      };

      document.head.appendChild(script);

      return () => {
        // Clean up on unmount
        if (clickHandler) {
          window.removeEventListener("click", clickHandler, true);
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
