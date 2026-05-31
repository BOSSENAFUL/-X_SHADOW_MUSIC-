// src/app/blog/[slug]/page.js
import { getPost, getAllPosts } from "@/lib/blog";
import BlogHeader from "@/components/blog-header";
import JsonLd from "@/components/json-ld";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, ArrowRight } from "lucide-react";
import Image from "next/image";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested blog post was not found on Jammify.",
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | Jammify Blog`,
      description: post.description,
      type: "article",
      url: `https://jammify-music.vercel.app/blog/${post.slug}`,
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Jammify Blog`,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  // Define structured JSON-LD data for the Article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": post.title,
    "description": post.description,
    "datePublished": `${post.date}T00:00:00+05:30`,
    "dateModified": `${post.date}T00:00:00+05:30`,
    "author": {
      "@type": "Person",
      "name": post.author,
      "url": "https://jammify-music.vercel.app"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Jammify",
      "logo": {
        "@type": "ImageObject",
        "url": "https://jammify-music.vercel.app/icon-512.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://jammify-music.vercel.app/blog/${post.slug}`
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-32 relative overflow-hidden font-editorial">
      {/* Background Mesh Gradients */}
      <div className="absolute top-0 inset-x-0 h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,98,57,0.18),transparent)] pointer-events-none z-0" />
      <div className="absolute top-0 inset-x-0 h-[800px] bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* Structured SEO Schema */}
      <JsonLd data={articleSchema} />

      {/* Inject custom styling rules for safety matching typography without adding large dependencies */}
      <style dangerouslySetInnerHTML={{ __html: `
        .blog-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1.35;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 0.5rem;
        }
        .blog-content p {
          margin-bottom: 1.5rem;
          line-height: 1.8;
          color: #e4e4e7; /* zinc-200 for better contrast */
          font-size: 1.125rem; /* comfortable 18px body font */
          font-weight: 400; /* normal weight for readability */
        }
        .blog-content ul {
          list-style-type: disc;
          padding-left: 1.75rem;
          margin-bottom: 1.5rem;
          margin-top: -0.5rem;
        }
        .blog-content ol {
          list-style-type: decimal;
          padding-left: 1.75rem;
          margin-bottom: 1.5rem;
          margin-top: -0.5rem;
        }
        .blog-content li {
          margin-bottom: 0.5rem;
          color: #e4e4e7;
          line-height: 1.8;
          font-size: 1.125rem;
          font-weight: 400;
        }
        .blog-content blockquote {
          border-left: 4px solid #10b981;
          background-color: rgba(16, 185, 129, 0.03);
          padding: 1.25rem 1.5rem;
          border-radius: 0 16px 16px 0;
          margin: 2rem 0;
          font-style: italic;
          color: #f4f4f5; /* zinc-100 */
        }
        .blog-content blockquote p {
          margin-bottom: 0;
        }
        .blog-content strong {
          color: #ffffff;
          font-weight: 600;
        }
        .blog-content a {
          color: #34d399; /* emerald-400 */
          text-decoration: underline;
          text-underline-offset: 4px;
          transition: color 0.2s;
        }
        .blog-content a:hover {
          color: #6ee7b7; /* emerald-300 */
        }
        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
          border: 1px solid rgba(255,255,255,0.08);
          color: #d4d4d8;
        }
        .blog-content th, .blog-content td {
          padding: 0.75rem 1rem;
          border: 1px solid rgba(255,255,255,0.08);
          text-align: left;
        }
        .blog-content th {
          background-color: rgba(255,255,255,0.02);
          color: #ffffff;
          font-weight: 600;
        }
      `}} />

      {/* Reusable Blog Navigation */}
      <BlogHeader />

      <main className="container max-w-4xl mx-auto px-4 sm:px-6 relative z-10 pt-28 sm:pt-36">
        
        {/* Back Link */}
        <Link 
          href="/blog" 
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to all articles
        </Link>

        {/* Article Meta Header */}
        <article className="bg-white/[0.01] border border-white/5 backdrop-blur-md rounded-[32px] p-6 sm:p-10 md:p-12 shadow-2xl">
          <header className="mb-8 border-b border-white/5 pb-8">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                {post.category}
              </span>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                <Clock className="w-4 h-4" />
                <span>{post.readTime}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-6 leading-[1.15] text-balance">
              {post.title}
            </h1>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border border-white/10 bg-emerald-500/5">
                <Image 
                  src="/icon-192.png" 
                  alt="Jammify Editorial" 
                  width={40} 
                  height={40} 
                  className="rounded-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{post.author}</p>
                <p className="text-xs text-zinc-400">Jammify Writer</p>
              </div>
            </div>
          </header>

          {/* Article Body */}
          <div 
            className="blog-content" 
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-zinc-400 mr-2">Tags:</span>
            {post.tags.map((tag) => (
              <span 
                key={tag} 
                className="text-xs text-zinc-300 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Inline CTA Box */}
          <div className="mt-12 p-8 rounded-[24px] bg-gradient-to-r from-emerald-500/5 via-emerald-600/5 to-transparent border border-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Ready to stream music without the ads?</h3>
              <p className="text-sm text-zinc-400 max-w-lg leading-relaxed">
                Unlock 80M+ songs, live lyrics, and lossless 320kbps quality at absolutely zero cost. No credit card, no signups required.
              </p>
            </div>
            <Link href="/music">
              <button className="group inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-primary px-6 text-sm font-semibold text-white shadow-xl hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(16,185,129,0.2)] active:scale-[0.98] transition-all duration-300 whitespace-nowrap">
                Start Listening Free
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}
