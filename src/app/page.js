"use client";

import Link from "next/link";
import { AppPreview } from "@/components/app-preview";
import UserReviews from "@/components/user-reviews";
import FaqSection from "@/components/faq-section";
import { Download, Play, Music, Radio, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Home() {
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
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">
      {/* Premium Minimal Background Effects */}
      <div className="absolute top-0 inset-x-0 h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,98,57,0.15),transparent)] pointer-events-none -z-10" />
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none -z-10 opacity-50 translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] rounded-full bg-primary/5 blur-[100px] pointer-events-none -z-10 opacity-40 -translate-x-1/3 translate-y-1/3" />

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

          <nav className="flex items-center gap-2 sm:gap-6">
            <Link
              href="/features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              Features
            </Link>
            <Link
              href="/music"
              className="inline-flex h-9 sm:h-10 items-center justify-center rounded-full bg-primary/10 px-4 sm:px-6 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
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
          <div className="inline-flex items-center rounded-full border border-border/40 bg-background/50 backdrop-blur-sm px-3 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground shadow-sm">
            <span className="flex w-2 h-2 rounded-full bg-primary mr-2.5 animate-pulse"></span>
            Experience Jammify 2.0
          </div>
        </motion.div>

        {/* Hero Text */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mb-6 sm:mb-8 text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter leading-[1.05] max-w-4xl"
        >
          Music, exactly <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-foreground via-foreground/90 to-muted-foreground">how it should be.</span>
        </motion.h1>

        <motion.p
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mb-10 sm:mb-12 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-normal leading-relaxed"
        >
          Stream millions of songs in pristine, lossless quality. A beautifully crafted player designed for true music lovers. Uninterrupted, pure sound.
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
            className="group w-full sm:w-auto inline-flex h-12 sm:h-14 items-center justify-center rounded-full bg-foreground px-8 text-sm sm:text-base font-semibold text-background shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Launch Web Player
            <ChevronRight className="ml-1.5 w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="/Jammify.apk"
            download="Jammify.apk"
            className="group w-full sm:w-auto inline-flex h-12 sm:h-14 items-center justify-center rounded-full border border-border bg-background/50 backdrop-blur-sm px-8 text-sm sm:text-base font-medium text-foreground shadow-sm hover:bg-accent/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <Download className="mr-2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground transition-colors group-hover:text-foreground" />
            Download App
          </a>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUpVariants}
          className="mt-20 sm:mt-28 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 w-full max-w-4xl mx-auto pt-10 border-t border-border/40"
        >
          <div className="flex flex-col items-center justify-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
              <Music className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">80M+</div>
            <p className="text-sm font-medium text-muted-foreground">Tracks available</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
              <Radio className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">Premium</div>
            <p className="text-sm font-medium text-muted-foreground">High fidelity audio</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            </div>
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">Ad-Free</div>
            <p className="text-sm font-medium text-muted-foreground">Uninterrupted listening</p>
          </div>
        </motion.div>
      </main>

      {/* Additional Features / Lower Fold */}
      <div className="relative z-10 bg-background pt-10 pb-20 border-t border-border/20">
        <UserReviews />
        <AppPreview />
        <FaqSection />
      </div>
    </div>
  );
}
