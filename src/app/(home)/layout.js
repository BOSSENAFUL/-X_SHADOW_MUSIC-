import JsonLd from "@/components/json-ld";
import connectDB from "@/lib/mongodb";
import Rating from "@/models/Rating";

// FAQ data — mirrors faq-section.jsx exactly so the schema stays in sync
const faqItems = [
  {
    q: "What is Jammify?",
    a: "Jammify is a free music streaming web app with 80M+ songs, no ads, Spotify & YouTube Music playlist import, live lyrics, and 320kbps high-fidelity audio. It works on all devices as a PWA.",
  },
  {
    q: "Is Jammify free?",
    a: "Yes, Jammify is completely free to use with no subscription or payment required.",
  },
  {
    q: "Does Jammify have ads?",
    a: "No, the app is fully ad-free with zero interruptions.",
  },
  {
    q: "Can I import Spotify playlists?",
    a: "Yes. You can import any public Spotify playlist directly into Jammify using the playlist link.",
  },
  {
    q: "Does YouTube Music playlist import work?",
    a: "Yes, YouTube Music playlist import is also supported.",
  },
  {
    q: "Why are some songs missing after importing playlists?",
    a: "Jammify only imports songs available in its music sources. Some artists or tracks may not be available yet.",
  },
  {
    q: "Can I transfer liked songs?",
    a: "Playlist import works best with public playlists. Full account syncing or liked-song transfer is not yet supported.",
  },
  {
    q: "Does Jammify support offline playback?",
    a: "Offline playback inside the app is not currently supported.",
  },
  {
    q: "Why does the Android APK show a Play Protect warning?",
    a: "The APK is not published on Google Play yet, so Play Protect may flag it as an unknown app. The Android app is a PWA-based wrapper of the website.",
  },
  {
    q: "Is Jammify available on iPhone?",
    a: "Yes. Open Jammify in Safari and tap 'Add to Home Screen' to install it as an app.",
  },
  {
    q: "Does Jammify support lyrics?",
    a: "Yes. Most songs support synchronized scrolling lyrics, while some songs have static lyrics.",
  },
  {
    q: "Does Jammify host music files?",
    a: "Jammify uses multiple public APIs and music-related sources for streaming, metadata, playlists, and search functionality.",
  },
  {
    q: "Is Jammify affiliated with Spotify, YouTube Music, or JioSaavn?",
    a: "No. Jammify is not affiliated with or endorsed by Spotify, YouTube Music, JioSaavn, or any music label or company.",
  },
  {
    q: "Why did you build Jammify?",
    a: "Jammify started as a side project to learn music streaming technologies, PWAs, caching, playlist systems, and scalable app architecture. It later grew to users worldwide.",
  },
  {
    q: "Will Jammify continue getting updates?",
    a: "Yes. The focus is on stability, polishing the experience, and adding useful features over time.",
  },
];

async function getLiveRatingData() {
  try {
    await connectDB();
    const ratings = await Rating.find().select("rating").lean();
    if (!ratings || ratings.length === 0) {
      return { ratingValue: "4.4", reviewCount: "86" };
    }
    const avg =
      ratings.reduce((sum, r) => sum + Number(r.rating || 0), 0) / ratings.length;
    return {
      ratingValue: avg.toFixed(1),
      reviewCount: String(ratings.length),
    };
  } catch {
    // Fallback to static values if DB is unreachable
    return { ratingValue: "4.4", reviewCount: "86" };
  }
}

export default async function HomeLayout({ children }) {
  const { ratingValue, reviewCount } = await getLiveRatingData();

  // Home-page WebApplication schema with LIVE rating data (overrides root layout's static one)
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
      ratingValue,
      bestRating: "5",
      worstRating: "1",
      reviewCount,
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

  // FAQPage schema — enables expandable FAQ dropdowns in Google SERPs
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <>
      {/* Home-page structured data: live-rated WebApplication + FAQPage rich snippets */}
      <JsonLd data={webAppSchema} />
      <JsonLd data={faqSchema} />
      {children}
    </>
  );
}
