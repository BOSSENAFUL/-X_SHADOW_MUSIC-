import JsonLd from "@/components/json-ld";

export const metadata = {
  alternates: {
    canonical: "/features",
  },
  title: "Features \u2014 Lossless Audio, Live Lyrics & Spotify Import",
  description:
    "Explore Jammify's full feature set: 320kbps high-fidelity audio, real-time synchronized lyrics, Spotify & YouTube Music playlist import, offline PWA support, global radio, and ambient visuals. Music the way it should be.",
  keywords: [
    "music app features",
    "lossless audio streaming",
    "live lyrics sync",
    "Spotify playlist import",
    "no ads music player",
    "PWA music app",
    "global radio online",
    "320kbps music",
  ],
  openGraph: {
    title: "Jammify Features \u2014 Lossless Audio, Live Lyrics & Spotify Import",
    description:
      "320kbps audio, synchronized lyrics, Spotify import, offline PWA, global radio \u2014 all free on Jammify.",
    type: "website",
    url: "https://jammify-music.vercel.app/features",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jammify Features \u2014 Lossless Audio, Live Lyrics & Spotify Import",
    description:
      "320kbps audio, synchronized lyrics, Spotify import, offline PWA, global radio \u2014 all free.",
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
      name: "Features",
      item: "https://jammify-music.vercel.app/features",
    },
  ],
};

const featuresListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Jammify Features",
  description: "Key features of the Jammify free music streaming platform.",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "320kbps High-Fidelity Audio" },
    { "@type": "ListItem", position: 2, name: "Synchronized Live Lyrics" },
    { "@type": "ListItem", position: 3, name: "Spotify Playlist Import" },
    { "@type": "ListItem", position: 4, name: "YouTube Music Playlist Import" },
    { "@type": "ListItem", position: 5, name: "PWA — Install on Any Device" },
    { "@type": "ListItem", position: 6, name: "Global Radio Stations" },
    { "@type": "ListItem", position: 7, name: "Personalized Music Library" },
    { "@type": "ListItem", position: 8, name: "Social Playlist Sharing" },
    { "@type": "ListItem", position: 9, name: "Ambient Adaptive Visuals" },
  ],
};

export default function FeaturesLayout({ children }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={featuresListSchema} />
      {children}
    </>
  );
}
