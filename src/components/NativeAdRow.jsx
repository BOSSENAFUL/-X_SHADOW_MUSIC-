"use client";
import { useEffect, useRef } from "react";

export default function NativeAdRow() {
  const adRef = useRef(null);

  useEffect(() => {
    // Only load the script if it hasn't been appended yet
    if (adRef.current && !adRef.current.querySelector("script")) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://assistedtogether.com/2945dc10f581b1a50558a376d37f808a/invoke.js";
      script.dataset.cfasync = "false";
      adRef.current.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full mb-6">
      {/* Title block matching playlist-section structure */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Featured Sponsored Hits</h2>
      </div>

      {/* Styled outer container */}
      <div className="p-1">
        <div id="container-2945dc10f581b1a50558a376d37f808a" ref={adRef}></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Mobile Layout: 2x2 Grid (not scrollable) */
        #container-2945dc10f581b1a50558a376d37f808a > div {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 1rem !important; /* 16px */
          width: 100% !important;
          padding: 0.5rem 0.25rem !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        /* Mobile Column Settings: Flexible width to fill 2x2 grid */
        #container-2945dc10f581b1a50558a376d37f808a > div > * {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex-shrink: 1 !important;
          flex-grow: 1 !important;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
          text-align: left !important;
          cursor: pointer !important;
          overflow: hidden !important;
        }

        /* Mobile Image Settings: Square aspect ratio */
        #container-2945dc10f581b1a50558a376d37f808a img {
          width: 100% !important;
          height: auto !important;
          aspect-ratio: 1 / 1 !important;
          object-fit: cover !important;
          border-radius: 0.5rem !important;
          display: block !important;
          border: 1px solid var(--border) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        }

        /* Desktop Layout: Horizontal scrollable row */
        @media (min-width: 768px) {
          #container-2945dc10f581b1a50558a376d37f808a > div {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            justify-content: flex-start !important;
            gap: 1rem !important; /* 16px */
            overflow-x: auto !important;
            scrollbar-width: none !important;
          }

          #container-2945dc10f581b1a50558a376d37f808a > div::-webkit-scrollbar {
            display: none !important;
          }

          #container-2945dc10f581b1a50558a376d37f808a > div > * {
            width: 160px !important;
            max-width: 160px !important;
            min-width: 160px !important;
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
          }
        }

        @media (min-width: 1024px) {
          #container-2945dc10f581b1a50558a376d37f808a > div > * {
            width: 180px !important;
            max-width: 180px !important;
            min-width: 180px !important;
          }
        }

        /* Force inherited fonts and colors */
        #container-2945dc10f581b1a50558a376d37f808a * {
          font-family: var(--font-sans), Outfit, sans-serif !important;
          color: var(--foreground) !important;
          text-decoration: none !important;
        }

        /* Style the link/text elements to match the theme (left-aligned, 1 line limit with ellipsis) */
        #container-2945dc10f581b1a50558a376d37f808a a,
        #container-2945dc10f581b1a50558a376d37f808a [class*="title"],
        #container-2945dc10f581b1a50558a376d37f808a [class*="text"],
        #container-2945dc10f581b1a50558a376d37f808a [class*="label"],
        #container-2945dc10f581b1a50558a376d37f808a [class*="name"] {
          font-size: 0.75rem !important; /* text-xs */
          font-weight: 700 !important; /* font-bold */
          line-height: 1.15rem !important;
          text-align: left !important;
          display: -webkit-box !important;
          -webkit-box-orient: vertical !important;
          -webkit-line-clamp: 1 !important;
          white-space: normal !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #container-2945dc10f581b1a50558a376d37f808a a:not(:first-child),
        #container-2945dc10f581b1a50558a376d37f808a [class*="title"] {
          margin-top: 0.5rem !important;
        }

        /* Hide descriptions to keep layout clean and identical */
        #container-2945dc10f581b1a50558a376d37f808a [class*="desc"],
        #container-2945dc10f581b1a50558a376d37f808a [class*="description"] {
          display: none !important;
        }
      ` }} />
    </div>
  );
}
