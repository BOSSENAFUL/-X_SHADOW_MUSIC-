"use client";

import { useEffect, useState } from "react";

/**
 * Ad blocker detection using iframe postMessage (most reliable method).
 *
 * How it works:
 *  1. AdsterraBanner's iframe srcdoc dynamically creates a <script> element pointing
 *     to the Adsterra invoke.js, with onload/onerror handlers.
 *  2. When an ad blocker blocks the script → onerror fires → iframe sends
 *     postMessage({ type: 'jammify_ad_blocked' }) to window.
 *  3. This component listens for that message and shows the warning modal.
 *
 * Backup: CSS decoy element check (catches blockers that work via CSS injection).
 */

function detectViaCSS() {
  return new Promise((resolve) => {
    const decoy = document.createElement("div");
    decoy.className =
      "ad ads adsbox doubleclick ad-placement carbon-ads pub_300x250 text-ad textAd";
    decoy.innerHTML = "&nbsp;";
    Object.assign(decoy.style, {
      position: "absolute",
      top: "-9999px",
      left: "-9999px",
      width: "1px",
      height: "1px",
      pointerEvents: "none",
    });
    document.body.appendChild(decoy);

    setTimeout(() => {
      const s = getComputedStyle(decoy);
      const blocked =
        !decoy.offsetParent ||
        decoy.offsetHeight === 0 ||
        decoy.offsetWidth === 0 ||
        decoy.getClientRects().length === 0 ||
        s.display === "none" ||
        s.visibility === "hidden" ||
        s.opacity === "0";
      if (document.body.contains(decoy)) document.body.removeChild(decoy);
      resolve(blocked);
    }, 300);
  });
}

export default function AdBlockDetector() {
  const [adBlockDetected, setAdBlockDetected] = useState(false);

  useEffect(() => {
    let detected = false;

    const trigger = () => {
      if (!detected) {
        detected = true;
        setAdBlockDetected(true);
      }
    };

    // ── Primary: listen for postMessage from the ad iframe ──────────────────
    // AdsterraBanner's srcdoc fires 'jammify_ad_blocked' via onerror
    // when the ad network script is blocked by the ad blocker.
    const handleMessage = (e) => {
      if (e.data?.type === "jammify_ad_blocked") {
        trigger();
      }
    };
    window.addEventListener("message", handleMessage);

    // ── Backup: CSS decoy element check after 1.5 s ─────────────────────────
    // Catches blockers (e.g. Adblock Plus) that hide elements via CSS rules
    // without blocking network requests.
    const cssTimer = setTimeout(async () => {
      const cssBlocked = await detectViaCSS();
      if (cssBlocked) trigger();
    }, 1500);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(cssTimer);
    };
  }, []);

  if (!adBlockDetected) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          animation: "adb-fadeIn 0.3s ease forwards",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(145deg, #1c1c2e 0%, #16213e 55%, #0f3460 100%)",
            border: "1px solid rgba(99,102,241,0.45)",
            borderRadius: "24px",
            padding: "2.5rem",
            maxWidth: "440px",
            width: "100%",
            boxShadow:
              "0 30px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            animation:
              "adb-slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* Purple glow */}
          <div
            style={{
              position: "absolute",
              top: "-80px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "240px",
              height: "240px",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Shield icon */}
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))",
              border: "1.5px solid rgba(99,102,241,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "2.2rem",
            }}
          >
            🛡️
          </div>

          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#fff",
              marginBottom: "0.6rem",
              letterSpacing: "-0.02em",
            }}
          >
            Ad Blocker Detected
          </h2>

          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.93rem",
              lineHeight: 1.75,
              marginBottom: "1.75rem",
            }}
          >
            Jammify is{" "}
            <strong style={{ color: "rgba(255,255,255,0.9)" }}>100% free</strong>{" "}
            and kept alive by small, non-intrusive ads. They help us pay for
            servers &amp; music licensing.
            <br />
            <br />
            Please whitelist{" "}
            <strong style={{ color: "#818cf8" }}>jammify.app</strong> to keep
            the music playing. 🎵
          </p>

          {/* Steps */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "1rem 1.25rem",
              textAlign: "left",
              marginBottom: "1.75rem",
            }}
          >
            <p
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: "0.75rem",
              }}
            >
              How to whitelist
            </p>
            {[
              "Click the ad blocker icon in your browser toolbar",
              'Choose "Disable" or "Pause" for this site',
              "Tap Reload below — ads appear, music stays free 🎶",
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.65rem",
                  alignItems: "flex-start",
                  marginBottom: i < 2 ? "0.55rem" : 0,
                }}
              >
                <span
                  style={{
                    minWidth: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "#fff",
                    marginTop: "1px",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.68)",
                    fontSize: "0.85rem",
                    lineHeight: 1.55,
                  }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "0.9rem",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 18px rgba(99,102,241,0.45)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 24px rgba(99,102,241,0.65)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 18px rgba(99,102,241,0.45)";
              }}
            >
              ✅ I&apos;ve whitelisted — Reload Page
            </button>


          </div>
        </div>
      </div>

      <style>{`
        @keyframes adb-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes adb-slideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </>
  );
}
