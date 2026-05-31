// src/app/robots.js
export default function robots() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || "https://jammify-music.vercel.app";

  return {
    rules: [
      {
        // Allow all well-behaved crawlers on public pages
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",          // No API routes indexed
          "/music/profile", // Private user profile page
          "/music/settings",// Private settings page
          "/music/chat/",   // Private social chat threads
          "/music/library/recently-played", // Personal data
          "/music/favorites",               // Personal data
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/auth/",
        ],
      },
      {
        // Block AI training crawlers explicitly
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "CCBot",
          "anthropic-ai",
          "Claude-Web",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
