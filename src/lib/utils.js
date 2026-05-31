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
