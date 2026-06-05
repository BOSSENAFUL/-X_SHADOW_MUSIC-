"use client";

import { useEffect } from "react";

export default function SocialBarAd() {
  useEffect(() => {
    try {
      // Create and inject the Adsterra Social Bar script
      const script = document.createElement("script");
      script.src = "https://assistedtogether.com/a3/98/b1/a398b1557905822848a5803f48a01967.js";
      script.async = true;
      script.type = "text/javascript";

      script.onerror = () => {
        console.warn("[SocialBarAd] Script blocked by ad blocker.");
      };

      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    } catch (e) {
      console.warn("[SocialBarAd] Could not initialize:", e);
    }
  }, []);

  return null;
}
