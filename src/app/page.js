"use client";

import Link from "next/link";

import { AppPreview } from "@/components/app-preview";
import UserReviews from "@/components/user-reviews";
import { ArrowRight, Download } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
          <div className="text-base sm:text-lg md:text-xl font-medium text-foreground">
            Jammify
          </div>

        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex min-h-screen items-center justify-center px-6 sm:px-8 md:px-12 lg:px-16">
        <div className="text-center w-full max-w-4xl mx-auto">

          {/* Hero Text */}
          <motion.div
            className="mb-8 sm:mb-12 md:mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light text-foreground tracking-tight leading-[1.1] mb-6 sm:mb-8">
              Listen to music
              <br />
              <span className="font-normal">like never before</span>
            </h1>

            <p className="text-sm xs:text-base sm:text-lg md:text-xl text-muted-foreground max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto font-light leading-relaxed">
              Stream millions of songs with exceptional quality.
              Discover new artists, create playlists, and enjoy your music anywhere.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="mb-12 sm:mb-16 md:mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <Link
                href="/music"
                className="group inline-flex items-center justify-center px-8 sm:px-10 md:px-12 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-medium text-white bg-black dark:bg-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300 ease-out min-w-[200px] w-full sm:w-auto"
              >
                Get Started
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>

              <a
                href="/Jammify.apk"
                download="Jammify.apk"
                className="group inline-flex items-center justify-center px-6 sm:px-8 md:px-10 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-medium text-black dark:text-white border border-black dark:border-white rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 ease-out min-w-[200px] w-full sm:w-auto"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Download APK
              </a>
            </div>
          </motion.div>

          {/* Simple Features */}
          <motion.div
            className="grid grid-cols-1 gap-8 sm:gap-6 md:gap-8 lg:gap-12 max-w-sm sm:max-w-none sm:grid-cols-3 mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
          >
            <div className="text-center">
              <div className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-2 sm:mb-3">50M+</div>
              <p className="text-xs xs:text-sm sm:text-base text-muted-foreground font-light">Songs available</p>
            </div>

            <div className="text-center">
              <div className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-2 sm:mb-3">320kbps</div>
              <p className="text-xs xs:text-sm sm:text-base text-muted-foreground font-light">High quality audio</p>
            </div>

            <div className="text-center">
              <div className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-2 sm:mb-3">24/7</div>
              <p className="text-xs xs:text-sm sm:text-base text-muted-foreground font-light">Always available</p>
            </div>
          </motion.div>

          {/* Secondary Action */}
          <motion.div
            className="mt-8 sm:mt-12 md:mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          >
            <Link
              href="/music/search"
              className="inline-flex items-center text-xs xs:text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors duration-300 font-light"
            >
              Browse music library
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
            </Link>
          </motion.div>
        </div>
      </main>


      {/* User Reviews */}
      <UserReviews />

      {/* App Preview Component */}
      <AppPreview />
    </div>
  );
}