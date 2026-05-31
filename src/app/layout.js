import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { JammifyThemeProvider } from "@/components/jammify-theme-provider";
import { SessionProvider } from "next-auth/react";
import AuthProvider from "@/components/auth-provider";
import { MusicPlayerProvider } from "@/contexts/music-player-context";
import { MusicPlayerWrapper } from "@/components/music-player-wrapper";
import { GlobalOnlineTracker } from "@/components/global-online-tracker";
import UserActivityTracker from "@/components/analytics/UserActivityTracker";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import AppRating from "@/components/app-rating";
import { RouteChangeHandler } from "@/components/analytics/RouteChangeHandler";
import { Toaster } from "@/components/ui/sonner";
import JsonLd from "@/components/json-ld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://jammify-music.vercel.app"),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "Jammify — Free Music Streaming, No Ads",
    template: "%s | Jammify",
  },
  description:
    "Stream 80M+ songs free with no ads. Jammify is the cleanest music streaming app — import Spotify playlists, get live lyrics, and enjoy high-fidelity 320kbps audio. No sign-up required.",
  keywords: [
    "free music streaming",
    "listen to music online",
    "Spotify playlist importer",
    "no ads music app",
    "music streaming app",
    "Jammify",
    "songs online",
    "playlists",
    "albums",
    "artists",
    "JioSaavn",
    "web music player",
    "Spotify alternative",
    "listen to songs free",
    "high quality music",
    "lossless music streaming",
  ],
  authors: [{ name: "Jammify Team" }],
  creator: "Jammify",
  verification: {
    google: "yHCHXQ0w3bP3lxDxmZMODiK9_Y0eDk9W2Zi52Xs1Dg0",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Jammify — Free Music Streaming, No Ads",
    description:
      "Stream 80M+ songs free with no ads on Jammify. Import Spotify playlists, get live lyrics, and enjoy 320kbps high-fidelity audio — install as a PWA on any device.",
    type: "website",
    url: "https://jammify-music.vercel.app",
    siteName: "Jammify",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Jammify — Free Music Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jammify — Free Music Streaming, No Ads",
    description:
      "Stream 80M+ songs free with no ads. Import Spotify playlists, live lyrics, 320kbps audio. Install as PWA.",
    images: ["/icon-512.png"],
    creator: "@jammifyapp",
  },
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
};


const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Jammify",
  url: "https://jammify-music.vercel.app",
  applicationCategory: "MusicApplication",
  operatingSystem: "Web, Android, iOS",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Free music streaming app with 80M+ songs, no ads, Spotify & YouTube Music playlist import, live lyrics, 320kbps audio, and PWA support.",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.4",
    bestRating: "5",
    worstRating: "1",
    reviewCount: "86",
  },
  author: {
    "@type": "Person",
    name: "Jammify Team",
  },
  featureList: [
    "80M+ songs",
    "No ads",
    "Spotify playlist import",
    "YouTube Music playlist import",
    "Synchronized live lyrics",
    "320kbps high-fidelity audio",
    "Global radio",
    "PWA — installable on any device",
    "Personalized recommendations",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
        suppressHydrationWarning
      >
        {/* Sitewide structured data — WebApplication schema */}
        <JsonLd data={webAppSchema} />
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
            disableTransitionOnChange
          >
            <JammifyThemeProvider>
              <MusicPlayerProvider>
                <GlobalOnlineTracker />
                <UserActivityTracker />
                <AppRating />
                <RouteChangeHandler />
                {children}
                <Toaster theme="dark" position="bottom-right" />
                <Analytics />
                <SpeedInsights />
                <MusicPlayerWrapper />
              </MusicPlayerProvider>
            </JammifyThemeProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
