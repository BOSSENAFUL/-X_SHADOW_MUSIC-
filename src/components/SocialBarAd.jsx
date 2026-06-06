"use client";

import { useEffect } from "react";

const SCRIPT_SRC = "https://assistedtogether.com/a3/98/b1/a398b1557905822848a5803f48a01967.js";

export default function SocialBarAd() {
  useEffect(() => {
    try {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.type = "text/javascript";

      script.onerror = () => {
        console.warn("[SocialBarAd] Script blocked by ad blocker.");
      };

      document.head.appendChild(script);

      return () => {
        // 1. Remove the script tag
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }

        // 2. ZOMBIE CLEANUP: Destroy any floating ad wrappers left behind in the DOM on unmount
        const adsterraDivs = document.querySelectorAll('div[id^="at_-"]');
        adsterraDivs.forEach((div) => {
          div.remove();
        });
      };
    } catch (e) {
      console.warn("[SocialBarAd] Could not initialize:", e);
    }
  }, []);

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      /* Target the parent wrappers often used by push notifications */
      div[id^="at_-"] {
        bottom: 90px !important; /* Forces it to hover ABOVE your bottom music player bar */
        z-index: 99999 !important;
      }
    `}} />
  );
}
