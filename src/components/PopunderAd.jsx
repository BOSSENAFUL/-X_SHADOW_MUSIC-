"use client";

import { useEffect } from "react";

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY = "jammify_popunder_ts";
const SCRIPT_SRC = "https://assistedtogether.com/78/16/14/78161449f40ff73137a708d04b3b806b.js";

export default function PopunderAd() {
  useEffect(() => {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      const now = Date.now();

      // If we are still in the cooldown period, do absolutely nothing.
      if (last && now - parseInt(last, 10) < COOLDOWN_MS) {
        return;
      }

      // Otherwise, log the time and inject the script normally.
      // Rely on Adsterra's server-side frequency cap to prevent double-pops during this session.
      localStorage.setItem(STORAGE_KEY, String(Date.now()));

      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.type = "text/javascript";

      document.head.appendChild(script);

      return () => {
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
