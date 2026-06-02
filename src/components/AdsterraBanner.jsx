"use client";

import { useEffect, useState } from "react";

export default function AdsterraBanner({ width, height, adKey }) {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Auto-refresh the ad every 60 seconds to increase impressions/earnings
    const timer = setInterval(() => {
      setRefreshKey((prevKey) => prevKey + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const isSticky = width === 320 && height === 50;

  // Sandbox the scripts inside an isolated iframe to prevent window.atOptions collisions
  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: #121212; /* Matches Jammify dark theme to prevent white leaks */
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <script type="text/javascript">
          // Set ad options
          var atOptions = {
            'key' : '${adKey}',
            'format' : 'iframe',
            'height' : ${height},
            'width' : ${width},
            'params' : {}
          };

          // Dynamically inject the ad script so we can detect if it is blocked
          (function() {
            var s = document.createElement('script');
            s.type = 'text/javascript';
            s.src = 'https://www.assistedtogether.com/${adKey}/invoke.js';
            s.onload = function() {
              try { window.parent.postMessage({ type: 'jammify_ad_loaded', adKey: '${adKey}' }, '*'); } catch(e) {}
            };
            s.onerror = function() {
              // Script was blocked by an ad blocker — notify the parent page
              try { window.parent.postMessage({ type: 'jammify_ad_blocked', adKey: '${adKey}' }, '*'); } catch(e) {}
            };
            document.body.appendChild(s);
          })();
        </script>
      </body>
    </html>
  `;

  if (isSticky) {
    return (
      <div
        className="fixed bottom-[74px] md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 z-40 bg-background/95 backdrop-blur-md border border-white/10 rounded-xl p-1.5 flex justify-center items-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 pointer-events-auto overflow-hidden style-isolate"
        style={{ width: `${width + 12}px`, height: `${height + 12}px`, isolation: "isolate" }}
      >
        <iframe
          key={refreshKey}
          srcDoc={iframeSrcDoc}
          width={width}
          height={height}
          style={{ border: "none", overflow: "hidden", borderRadius: "8px" }}
          scrolling="no"
          className="rounded-lg bg-[#121212]"
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center my-8 px-4 select-none">
      <span className="text-[9px] text-muted-foreground/70 uppercase tracking-[0.2em] mb-2 font-semibold">
        Advertisement
      </span>
      <div
        className="overflow-hidden bg-[#121212] border border-white/5 rounded-2xl flex items-center justify-center p-3 shadow-xl max-w-full"
        style={{ width: `${width + 24}px`, height: `${height + 24}px`, isolation: "isolate" }}
      >
        <iframe
          key={refreshKey}
          srcDoc={iframeSrcDoc}
          width={width}
          height={height}
          style={{ border: "none", overflow: "hidden", borderRadius: "12px" }}
          scrolling="no"
          className="rounded-xl"
        />
      </div>
    </div>
  );
}
