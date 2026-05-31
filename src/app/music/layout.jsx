import MusicLayoutClient from "./layout-client";
import JsonLd from "@/components/json-ld";

export const metadata = {
  alternates: {
    canonical: "/music",
  },
  title: "Web Player \u2014 Stream Music Free Online",
  description:
    "Play any song instantly on Jammify\u2019s web player. Access 80M+ tracks, Bollywood hits, English top charts, live lyrics, Spotify playlist import, and lossless 320kbps audio \u2014 no sign-up required.",
  keywords: [
    "web music player",
    "stream music online free",
    "listen to songs online",
    "Bollywood music online",
    "English music streaming",
    "online music player no ads",
    "Spotify alternative free",
    "music player web app",
  ],
  openGraph: {
    title: "Jammify Web Player \u2014 Stream Music Free Online",
    description:
      "80M+ tracks, Bollywood & English charts, Spotify import, live lyrics \u2014 stream free with no ads on Jammify.",
    type: "website",
    url: "https://jammify-music.vercel.app/music",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jammify Web Player \u2014 Stream Music Free Online",
    description:
      "80M+ tracks, no ads, Spotify import, live lyrics. Stream free on Jammify.",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://jammify-music.vercel.app",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Web Player",
      item: "https://jammify-music.vercel.app/music",
    },
  ],
};

const musicAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Jammify Web Player \u2014 Stream Music Free Online",
  url: "https://jammify-music.vercel.app/music",
  description:
    "Play any song instantly. Access 80M+ tracks, Bollywood & English charts, live lyrics, Spotify playlist import, and 320kbps audio \u2014 free, no sign-up required.",
  isPartOf: {
    "@type": "WebSite",
    name: "Jammify",
    url: "https://jammify-music.vercel.app",
  },
  about: {
    "@type": "WebApplication",
    name: "Jammify",
    applicationCategory: "MusicApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
};

export default function MusicLayout({ children }) {
  return (
    <MusicLayoutClient>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={musicAppSchema} />
      {children}
    </MusicLayoutClient>
  );
}
