"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppPreview } from "@/components/app-preview";
import UserReviews from "@/components/user-reviews";
import FaqSection from "@/components/faq-section";
import { Download, Play, Music, Radio, ChevronRight, Star, User } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getOptimizedAvatar } from "@/lib/utils";

export default function Home() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const res = await fetch('/api/rating');
        const data = await res.json();
        setRatings(data.ratings || []);
      } catch (error) {
        console.error('Failed to fetch ratings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, []);

  const averageRating = ratings.length > 0
    ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
    : 0;

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 font-editorial">
      {/* Premium Minimal Background Effects */}
      <div className="absolute top-0 inset-x-0 h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,98,57,0.18),transparent)] pointer-events-none -z-10" />
      <div className="absolute top-0 inset-x-0 h-[800px] bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[3.5rem_3.5rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/10 bg-background/60 backdrop-blur-xl supports-backdrop-filter:bg-background/40"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-6 h-16 sm:h-20">
          <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[0.98]">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Image src="/icon-192.png" alt="Logo" width={32} height={32} className="rounded-full" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Jammify</span>
          </Link>

          <nav className="flex items-center gap-1.5 sm:gap-6">
            <Link
              href="/features"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2 py-2"
            >
              Features
            </Link>
            <Link
              href="/blog"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2 py-2"
            >
              Blog
            </Link>
            <Link
              href="/music"
              className="inline-flex h-8 sm:h-10 items-center justify-center rounded-full bg-primary/10 px-3 sm:px-6 text-xs sm:text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              Web Player
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-svh px-4 pt-24 pb-16 sm:px-6 md:px-12 w-full max-w-7xl mx-auto text-center">

        {/* Version Badge */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/3 backdrop-blur-md px-4 py-1.5 text-xs sm:text-sm font-medium text-zinc-300 shadow-xl hover:border-emerald-500/30 hover:bg-white/5 transition-all duration-300 cursor-default select-none group/badge">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="tracking-wide font-semibold text-zinc-300 group-hover/badge:text-white transition-colors">Free Music Streaming &mdash; No Ads, Ever</span>
          </div>
        </motion.div>

        {/* Hero Text — keyword-targeted H1 */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mb-6 sm:mb-8 text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] max-w-5xl pb-2 text-balance text-center"
        >
          <span className="bg-clip-text text-transparent bg-linear-to-b from-white via-white to-zinc-400">
            Stream Music Free
          </span>{" "}
          <span className="bg-clip-text text-transparent bg-linear-to-r from-emerald-400 via-emerald-500 to-teal-400">
            80M+ Songs, No Ads.
          </span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mb-10 sm:mb-12 text-base sm:text-lg md:text-xl text-zinc-400/90 max-w-3xl mx-auto font-light leading-relaxed tracking-wide text-balance text-center"
        >
          The cleanest free music streaming app online. Import Spotify playlists, enjoy lossless 320kbps audio, and get live synchronized lyrics &mdash; completely ad-free.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full max-w-md mx-auto sm:max-w-none"
        >
          <Link
            href="/music"
            className="group w-full sm:w-auto inline-flex h-12 sm:h-14 items-center justify-center rounded-full bg-linear-to-r from-emerald-500 via-emerald-600 to-primary px-8 text-sm sm:text-base font-semibold text-white shadow-xl hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all duration-300"
            aria-label="Listen to music online free — open Jammify web player"
          >
            Listen Free Now
            <ChevronRight className="ml-1.5 w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="/Jammify.apk"
            download="Jammify.apk"
            className="group w-full sm:w-auto inline-flex h-12 sm:h-14 items-center justify-center rounded-full border border-white/10 bg-white/2 backdrop-blur-md px-8 text-sm sm:text-base font-medium text-white shadow-lg hover:bg-white/6 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            aria-label="Download Jammify Android app free"
          >
            <Download className="mr-2 w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 transition-colors group-hover:text-white" />
            Download Free App
          </a>
        </motion.div>

        {/* Ratings Summary */}
        <Link href="/reviews" className="mt-8 select-none block">
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="inline-flex items-center gap-4 rounded-full border border-white/5 bg-neutral-950/40 hover:bg-neutral-900/60 backdrop-blur-xl px-5 py-2.5 shadow-2xl hover:border-primary/30 transition-all duration-300 group cursor-pointer"
          >
            {/* Avatar Stack */}
            <div className="flex -space-x-2.5">
              {loading ? (
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-background bg-zinc-800 animate-pulse" />
                ))
              ) : ratings.length > 0 ? (
                ratings.slice(0, 4).map((rating, idx) => (
                  <Avatar key={idx} className="w-7 h-7 border-2 border-background bg-zinc-800 shadow-sm transition-transform group-hover:translate-x-0.5">
                    <AvatarImage
                      src={getOptimizedAvatar(rating.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${rating.user?.name || "User"}`, 48)}
                      alt={rating.user?.name || "User"}
                    />
                    <AvatarFallback className="bg-zinc-700 text-white text-[9px] font-bold">
                      {(rating.user?.name || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))
              ) : (
                // Fallback static premium gradients if no ratings found yet
                [
                  { init: "J", grad: "from-emerald-500 to-teal-400" },
                  { init: "M", grad: "from-purple-500 to-indigo-400" },
                  { init: "S", grad: "from-amber-500 to-orange-400" },
                  { init: "Y", grad: "from-blue-500 to-cyan-400" }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`w-7 h-7 rounded-full border-2 border-background bg-linear-to-tr ${item.grad} flex items-center justify-center text-[9px] font-bold text-white shadow-sm`}
                  >
                    {item.init}
                  </div>
                ))
              )}
              {!loading && ratings.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[9px] font-semibold text-zinc-300 shadow-sm">
                  +{ratings.length - 4}
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-6 bg-white/10" />

            {/* Stars & Text Details */}
            <div className="flex flex-col items-start gap-0.5">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 transition-all duration-300 group-hover:scale-110 ${
                        loading
                          ? "text-muted/20"
                          : star <= Math.round(averageRating || 4.4)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted/30"
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary-foreground`}>
                  {loading ? "4.4" : averageRating > 0 ? averageRating.toFixed(1) : "4.4"}
                </span>
              </div>
              <span className={`text-[10px] font-medium tracking-tight text-muted-foreground/75 group-hover:text-muted-foreground transition-colors`}>
                {loading ? "from 86+ reviews" : ratings.length > 0 ? `from ${ratings.length}+ reviews` : "from 86+ reviews"}
              </span>
            </div>
          </motion.div>
        </Link>

        {/* Stats Section */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mt-24 sm:mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto pt-12 border-t border-white/5"
        >
          {/* Songs Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/1 hover:bg-white/3 backdrop-blur-md px-6 py-8 flex flex-col items-center text-center shadow-2xl transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/20 group">
            <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-primary/10 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center text-primary group-hover:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-4 shadow-inner">
              <Music className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-1 bg-clip-text bg-linear-to-b from-white to-zinc-400 group-hover:from-white group-hover:to-emerald-300 transition-all duration-300">
              80M+
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground/85 tracking-wide uppercase">
              Songs to stream free
            </p>
          </div>

          {/* Lossless Audio Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/1 hover:bg-white/3 backdrop-blur-md px-6 py-8 flex flex-col items-center text-center shadow-2xl transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/20 group">
            <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-primary/10 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center text-primary group-hover:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-4 shadow-inner">
              <Radio className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1 bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-400 group-hover:from-white group-hover:to-emerald-300 transition-all duration-300">
              320kbps
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground/85 tracking-wide uppercase">
              Lossless audio, free
            </p>
          </div>

          {/* Ad-Free Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/1 hover:bg-white/3 backdrop-blur-md px-6 py-8 flex flex-col items-center text-center shadow-2xl transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/20 group">
            <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-primary/10 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center text-primary group-hover:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 mb-4 shadow-inner">
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-1 bg-clip-text bg-linear-to-b from-white to-zinc-400 group-hover:from-white group-hover:to-emerald-300 transition-all duration-300">
              Zero Ads
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground/85 tracking-wide uppercase">
              No ads, ever. 100% free.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Additional Features / Lower Fold */}
      <div className="relative z-10 bg-background pt-10 pb-20">
        <UserReviews />
        <AppPreview />
        <FaqSection />
      </div>
    </div>
  );
}
