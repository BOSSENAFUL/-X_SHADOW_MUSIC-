"use client";

import { useEffect, useState } from "react";

export default function AdBlockDetector() {
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // We use a decoy element technique: create a hidden element with ad-like class names.
    // Ad blockers typically hide/remove such elements via CSS rules.
    const decoy = document.createElement("div");
    decoy.className =
      "ads ad adsbox doubleclick ad-placement carbon-ads pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links";
    decoy.style.cssText =
      "position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(decoy);

    // Give the ad blocker a moment to act on the decoy element
    const timer = setTimeout(() => {
      const isBlocked =
        decoy.offsetParent === null ||
        decoy.offsetHeight === 0 ||
        decoy.offsetWidth === 0 ||
        decoy.getClientRects().length === 0 ||
        window.getComputedStyle(decoy).display === "none" ||
        window.getComputedStyle(decoy).visibility === "hidden";

      if (isBlocked) {
        setAdBlockDetected(true);
      }

      document.body.removeChild(decoy);
    }, 300);

    return () => {
      clearTimeout(timer);
      if (document.body.contains(decoy)) {
        document.body.removeChild(decoy);
      }
    };
  }, []);

  if (!adBlockDetected || dismissed) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
        style={{ animation: "fadeIn 0.3s ease" }}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ animation: "slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: "24px",
            padding: "2.5rem",
            maxWidth: "440px",
            width: "100%",
            boxShadow:
              "0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow orb */}
          <div
            style={{
              position: "absolute",
              top: "-60px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "200px",
              height: "200px",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))",
              border: "1px solid rgba(99,102,241,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "2rem",
            }}
          >
            🛡️
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: "0.75rem",
              letterSpacing: "-0.02em",
            }}
          >
            Ad Blocker Detected
          </h2>

          {/* Description */}
          <p
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.95rem",
              lineHeight: 1.7,
              marginBottom: "2rem",
            }}
          >
            Jammify is <strong style={{ color: "rgba(255,255,255,0.9)" }}>100% free</strong> and kept alive by ads.
            Our ads are{" "}
            <strong style={{ color: "rgba(255,255,255,0.9)" }}>small, non-intrusive</strong>{" "}
            and help us pay for servers and licensing.
            <br />
            <br />
            Please whitelist <strong style={{ color: "#818cf8" }}>jammify.app</strong> in your ad blocker to
            continue enjoying free music. 🎵
          </p>

          {/* How-to steps */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              textAlign: "left",
              marginBottom: "1.75rem",
            }}
          >
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "0.6rem",
              }}
            >
              Quick steps to whitelist:
            </p>
            {[
              "Click your ad blocker icon in the browser toolbar",
              'Find "Disable" or "Pause" option for this site',
              "Refresh the page and enjoy Jammify! 🎶",
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  marginBottom: i < 2 ? "0.5rem" : 0,
                }}
              >
                <span
                  style={{
                    minWidth: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "white",
                    marginTop: "1px",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                  }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                color: "white",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(99,102,241,0.4)";
              }}
            >
              ✅ I&apos;ve whitelisted Jammify — Reload
            </button>

            <button
              onClick={() => setDismissed(true)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              }}
            >
              Maybe later (dismiss for now)
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
