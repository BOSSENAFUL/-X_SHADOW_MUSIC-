// src/app/blog/page.js
import { getAllPosts } from "@/lib/blog";
import BlogHeader from "@/components/blog-header";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, Sparkles } from "lucide-react";

export const metadata = {
  alternates: {
    canonical: "/blog",
  },
  title: "Blog — Free Music Streaming Tips & Guides",
  description: "Read step-by-step guides on how to import Spotify playlists to Jammify, reviews of free music apps with no ads, comparisons like JioSaavn vs Jammify, and educational content on 320kbps audio quality.",
  openGraph: {
    title: "Blog — Free Music Streaming Tips & Guides | Jammify",
    description: "Read guides on importing playlists, ad-free streaming app reviews, and audio bitrates on Jammify.",
    type: "website",
    url: "https://jammify-music.vercel.app/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Free Music Streaming Tips & Guides | Jammify",
    description: "Free music streaming guides and tips. Learn how to import playlists, read app reviews, and more on Jammify.",
  }
};

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-32 relative overflow-hidden font-editorial">
      {/* Background Mesh Gradients */}
      <div className="absolute top-0 inset-x-0 h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,98,57,0.18),transparent)] pointer-events-none z-0" />
      <div className="absolute top-0 inset-x-0 h-[800px] bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Shared Blog Navigation */}
      <BlogHeader />

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-28 sm:pt-36">
        {/* Hero Section */}
        <div className="text-center mb-16 sm:mb-24 flex flex-col items-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 py-1.5 text-xs sm:text-sm font-semibold tracking-wide text-emerald-400 select-none">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>SEO Content & Streaming Guides</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-6 leading-tight max-w-4xl text-balance">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-400">
              The Jammify
            </span>{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400">
              Editorial Blog
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-zinc-400/90 font-light max-w-2xl mx-auto leading-relaxed tracking-wide">
            Tips, guides, app comparisons, and technical insights to help you get the most out of your ad-free, high-fidelity music streaming.
          </p>
        </div>

        {/* Blog Post Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {posts.map((post) => (
            <Link 
              key={post.slug} 
              href={`/blog/${post.slug}`}
              className="group block h-full"
            >
              <article className="h-full bg-white/[0.01] border border-white/5 rounded-[32px] p-6 sm:p-8 flex flex-col justify-between hover:bg-white/[0.03] hover:border-emerald-500/20 backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden">
                {/* Visual Ambient Element */}
                <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                
                <div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                      {post.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-3 group-hover:text-emerald-400 transition-colors duration-200">
                    {post.title}
                  </h2>

                  <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-light mb-6">
                    {post.description}
                  </p>
                </div>

                <div className="inline-flex items-center text-sm font-semibold text-emerald-400 gap-1.5 group-hover:text-emerald-300 transition-colors">
                  Read Article 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
