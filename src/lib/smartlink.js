// src/lib/smartlink.js
// Fires the Adsterra Smartlink on high-intent user actions (download, lyrics open).
// Uses anchor element click — never blocked by browser popup blockers.

const SMARTLINK_URL = "https://assistedtogether.com/xpe5paf4?key=b322408d16aa2ebcf591c134695bac6d";
const SMARTLINK_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const SMARTLINK_STORAGE_KEY = "jammify_smartlink_ts";

/**
 * Opens the Adsterra Smartlink in a new tab using an anchor click.
 * @param {boolean} noCooldown - If true, fires every time (used for downloads).
 *                               If false (default), respects the 30-min cooldown (used for lyrics).
 */
export function triggerSmartlink(noCooldown = false) {
  try {
    if (typeof window === "undefined") return;

    if (!noCooldown) {
      const last = localStorage.getItem(SMARTLINK_STORAGE_KEY);
      const now = Date.now();
      // Skip if within cooldown window
      if (last && now - parseInt(last, 10) < SMARTLINK_COOLDOWN_MS) return;
      // Save timestamp
      localStorage.setItem(SMARTLINK_STORAGE_KEY, String(now));
    }

    // Use anchor click — bypasses popup blockers reliably in all browsers
    const a = document.createElement("a");
    a.href = SMARTLINK_URL;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    // Silently fail — never disrupt user experience
  }
}
