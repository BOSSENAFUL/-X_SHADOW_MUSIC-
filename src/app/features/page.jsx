"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Music,
  Search,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
  Layers,
  History,
  Heart,
  Globe,
  Radio,
  Cpu,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { ease: [0.16, 1, 0.3, 1], duration: 0.6 }
  },
};

const FeaturesPage = () => {
  const features = [
    {
      title: "Premium Audio",
      description: "Stream over 80 million songs in crystal-clear 320kbps high-quality audio fetching.",
      icon: <Music className="w-6 h-6 transition-transform" />,
      badge: "High Fidelity"
    },
    {
      title: "Smart Discovery",
      description: "Fuzzy search with intelligent ranking for exact names, lyrics matches, and artist patterns.",
      icon: <Search className="w-6 h-6 transition-transform" />,
      badge: "Intuitive"
    },
    {
      title: "Spotify Import",
      description: "Seamlessly migrate your favorite Spotify playlists into Jammify with a single click or link.",
      icon: <Radio className="w-6 h-6 transition-transform" />,
      badge: "Migration"
    },
    {
      title: "Ambient Visuals",
      description: "A gorgeous UI with ambient gradient backgrounds that adapt dynamically to your music.",
      icon: <Layers className="w-6 h-6 transition-transform" />,
      badge: "Adaptive"
    },
    {
      title: "Universal Access",
      description: "Full PWA support. Install Jammify on your desktop or mobile for a seamless app-like experience.",
      icon: <Smartphone className="w-6 h-6 transition-transform" />,
      badge: "PWA"
    },
    {
      title: "Personal Library",
      description: "Save your favorite tracks, create custom playlists, and track your listening history effortlessly.",
      icon: <Heart className="w-6 h-6 transition-transform" />,
      badge: "Personalized"
    },
    {
      title: "Live Lyrics",
      description: "Get synchronized, real-time lyrics for millions of tracks to sing along with your favorite artists.",
      icon: <History className="w-6 h-6 transition-transform" />,
      badge: "Synchronized"
    },
    {
      title: "Social Sharing",
      description: "Share your favorite tracks or entire playlists with friends instantly via uniquely generated links.",
      icon: <Sparkles className="w-6 h-6 transition-transform" />,
      badge: "Community"
    },
    {
      title: "Global Radio",
      description: "Tune into live radio stations from across the globe, bringing world music to your fingertips.",
      icon: <Globe className="w-6 h-6 transition-transform" />,
      badge: "Worldwide"
    }
  ];

  const values = [
    {
      title: "Privacy & Security",
      description: "Your music tastes are yours alone. Enterprise-grade authentication ensures your data stays completely secure.",
      icon: <ShieldCheck className="w-5 h-5 transition-transform" />
    },
    {
      title: "Speed Over Everything",
      description: "Zero bloat, lightning-fast search, and a heavily optimized playback engine for the smoothest experience.",
      icon: <Zap className="w-5 h-5 transition-transform" />
    },
    {
      title: "Educational Craftsmanship",
      description: "Built with modern full-stack practices, prioritizing clean architecture and absolute UI/UX excellence.",
      icon: <Cpu className="w-5 h-5 transition-transform" />
    },
    {
      title: "Global Reach",
      description: "Access a worldwide library of music through public third-party APIs with zero geographic blocks.",
      icon: <Globe className="w-5 h-5 transition-transform" />
    }
  ];

  return (
    <div className="min-h-svh bg-background text-foreground pb-20 md:pb-32 selection:bg-primary/20 relative overflow-hidden">
      {/* Background Ambient Effect */}
      <div className="absolute top-0 inset-x-0 h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,98,57,0.18),transparent)] pointer-events-none z-0" />
      <div className="absolute top-0 inset-x-0 h-[800px] bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-24 sm:pt-32">
        
        {/* Hero Section */}
        <section className="text-center mb-24 sm:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 py-1.5 text-xs sm:text-sm font-semibold tracking-wide text-emerald-400 select-none">
              <Sparkles className="w-4 h-4" />
              <span>What's New in Jammify</span>
            </div>
            
            <h1 className="text-4xl sm:text-7xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.05] pb-2 text-balance text-center">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-400">
                Music Experience,
              </span>{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400">
                Redefined.
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-zinc-400/90 font-light max-w-3xl mx-auto mb-12 leading-relaxed tracking-wide text-balance text-center">
              Discover the perfect blend of aesthetic design and powerful performance.
              Jammify isn't just a music player; it's a statement.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link href="/music" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto group inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-primary px-8 text-base font-semibold text-white shadow-xl hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all duration-300">
                  Start Listening
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="https://github.com/shreejaybhay/jammify" className="w-full sm:w-auto" target="_blank" rel="noopener noreferrer">
                <button className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md px-8 text-base font-semibold text-white shadow-lg hover:bg-white/[0.06] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                  View Repository
                </button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="mb-32">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-foreground">Platform Features</h2>
            <p className="text-zinc-400/95 text-lg font-light">Everything you need for a premium streaming experience.</p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants} className="h-full">
                <div className="h-full bg-white/[0.01] border border-white/5 rounded-[32px] p-6 sm:p-8 flex flex-col hover:bg-white/[0.03] hover:border-primary/20 backdrop-blur-md shadow-xl transition-all duration-500 hover:-translate-y-1.5 group relative overflow-hidden">
                    {/* Ambient glow inside card */}
                    <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                    
                    <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 w-fit text-primary group-hover:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-inner z-10">
                      {feature.icon}
                    </div>
                    
                    <div className="flex items-center justify-between mb-4 z-10">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{feature.title}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 px-3 py-1 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                        {feature.badge}
                      </span>
                    </div>
                    
                    <p className="text-base text-zinc-400/90 leading-relaxed font-light z-10">
                      {feature.description}
                    </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Core Values Section */}
        <section className="relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-[32px] sm:rounded-[48px] p-8 sm:p-16 md:p-24 backdrop-blur-md shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 pb-2">Our Core Values</h2>
              <p className="text-lg sm:text-xl text-zinc-400/90 font-light leading-relaxed max-w-2xl mx-auto">
                We believe that great software is built at the intersection of extreme performance,
                beautiful aesthetics, and deep user respect.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-16">
              {values.map((value, index) => (
                <div key={index} className="flex gap-4 sm:gap-6 group">
                  <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-primary group-hover:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-inner">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground">{value.title}</h3>
                    <p className="text-zinc-400/90 leading-relaxed font-light">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="text-center mt-24 sm:mt-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, margin: "-50px" }}
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 pb-2">Ready to tune in?</h2>
            <p className="text-lg text-zinc-400/90 font-light mb-10 max-w-lg mx-auto leading-relaxed">
              Join thousands of users enjoying a cleaner, faster, and more beautiful way to stream music.
            </p>
            <Link href="/music">
              <button className="group inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-primary px-10 text-lg font-semibold text-white shadow-xl hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all duration-300">
                Explore Music Now
              </button>
            </Link>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default FeaturesPage;
