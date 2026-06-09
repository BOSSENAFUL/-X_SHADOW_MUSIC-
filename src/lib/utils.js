import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getOptimizedAvatar(url, size = 48) {
  if (!url) return url;
  if (url.includes("googleusercontent.com")) {
    if (url.match(/=s\d+-c/)) {
      return url.replace(/=s\d+-c/, `=s${size}-c`);
    }
    return `${url}=s${size}-c`;
  }
  return url;
}

export function applyThemeColor(color) {
  if (typeof window === "undefined") return;
  let metaThemeColor = document.querySelector("meta[name=theme-color]");
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", color);
  } else {
    metaThemeColor = document.createElement("meta");
    metaThemeColor.name = "theme-color";
    metaThemeColor.content = color;
    document.head.appendChild(metaThemeColor);
  }
}

export function getThemeColorForScroll(colorStr, progress, defaultThemeColor = "#121212") {
  if (!colorStr) return defaultThemeColor;
  const match = colorStr.match(/\d+/g);
  if (!match || match.length < 3) return defaultThemeColor;
  const r = parseInt(match[0], 10);
  const g = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);

  // At progress = 0: color is dominantColor * 0.7 + 18 * 0.3
  // At progress = 1: color is dominantColor * 0.4 (black mix 60%)
  const opacity = 0.7 - (progress * 0.3);
  const bgContrib = 5.4 * (1 - progress);

  const mixedR = Math.max(0, Math.min(255, Math.round(r * opacity + bgContrib)));
  const mixedG = Math.max(0, Math.min(255, Math.round(g * opacity + bgContrib)));
  const mixedB = Math.max(0, Math.min(255, Math.round(b * opacity + bgContrib)));

  const toHex = (c) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(mixedR)}${toHex(mixedG)}${toHex(mixedB)}`;
}

