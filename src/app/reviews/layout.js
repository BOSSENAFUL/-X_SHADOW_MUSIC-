import JsonLd from "@/components/json-ld";
import connectDB from "@/lib/mongodb";
import Rating from "@/models/Rating";

async function getLiveRatingData() {
  try {
    await connectDB();
    const ratings = await Rating.find().select("rating").lean();
    if (!ratings || ratings.length === 0) {
      return { ratingValue: "4.4", reviewCount: "86" };
    }
    const avg =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    return {
      ratingValue: avg.toFixed(1),
      reviewCount: String(ratings.length),
    };
  } catch {
    return { ratingValue: "4.4", reviewCount: "86" };
  }
}

export const metadata = {
  alternates: {
    canonical: "/reviews",
  },
  title: "User Reviews \u2014 What Listeners Say About Jammify",
  description:
    "Read real reviews from Jammify users around the world. See why music lovers choose Jammify for free, ad-free music streaming with 80M+ tracks, live lyrics, and Spotify import.",
  openGraph: {
    title: "Jammify Reviews \u2014 What Listeners Say",
    description:
      "Real user reviews for Jammify \u2014 the free, no-ads music streaming app with 80M+ tracks and Spotify import.",
    type: "website",
    url: "https://jammify-music.vercel.app/reviews",
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
      name: "Reviews",
      item: "https://jammify-music.vercel.app/reviews",
    },
  ],
};

export default async function ReviewsLayout({ children }) {
  const { ratingValue, reviewCount } = await getLiveRatingData();

  const reviewsSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Jammify User Reviews",
    url: "https://jammify-music.vercel.app/reviews",
    description:
      "Read real user reviews and ratings for Jammify, the free music streaming app.",
    about: {
      "@type": "WebApplication",
      name: "Jammify",
      url: "https://jammify-music.vercel.app",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue,
        bestRating: "5",
        worstRating: "1",
        reviewCount,
      },
    },
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={reviewsSchema} />
      {children}
    </>
  );
}
