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
      icon: <Music className="w-6 h-6 text-foreground" />,
      badge: "High Fidelity"
    },
    {
      title: "Smart Discovery",
      description: "Fuzzy search with intelligent ranking for exact names, lyrics matches, and artist patterns.",
      icon: <Search className="w-6 h-6 text-foreground" />,
      badge: "Intuitive"
    },
    {
      title: "Spotify Import",
      description: "Seamlessly migrate your favorite Spotify playlists into Jammify with a single click or link.",
      icon: <Radio className="w-6 h-6 text-foreground" />,
      badge: "Migration"
    },
    {
      title: "Ambient Visuals",
      description: "A gorgeous UI with ambient gradient backgrounds that adapt dynamically to your music.",
      icon: <Layers className="w-6 h-6 text-foreground" />,
      badge: "Adaptive"
    },
    {
      title: "Universal Access",
      description: "Full PWA support. Install Jammify on your desktop or mobile for a seamless app-like experience.",
      icon: <Smartphone className="w-6 h-6 text-foreground" />,
      badge: "PWA"
    },
    {
      title: "Personal Library",
      description: "Save your favorite tracks, create custom playlists, and track your listening history effortlessly.",
      icon: <Heart className="w-6 h-6 text-foreground" />,
      badge: "Personalized"
    },
    {
      title: "Live Lyrics",
      description: "Get synchronized, real-time lyrics for millions of tracks to sing along with your favorite artists.",
      icon: <History className="w-6 h-6 text-foreground" />,
      badge: "Synchronized"
    },
    {
      title: "Social Sharing",
      description: "Share your favorite tracks or entire playlists with friends instantly via uniquely generated links.",
      icon: <Sparkles className="w-6 h-6 text-foreground" />,
      badge: "Community"
    },
    {
      title: "Global Radio",
      description: "Tune into live radio stations from across the globe, bringing world music to your fingertips.",
      icon: <Globe className="w-6 h-6 text-foreground" />,
      badge: "Worldwide"
    }
  ];

  const values = [
    {
      title: "Privacy & Security",
      description: "Your music tastes are yours alone. Enterprise-grade authentication ensures your data stays completely secure.",
      icon: <ShieldCheck className="w-5 h-5 text-foreground" />
    },
    {
      title: "Speed Over Everything",
      description: "Zero bloat, lightning-fast search, and a heavily optimized playback engine for the smoothest experience.",
      icon: <Zap className="w-5 h-5 text-foreground" />
    },
    {
      title: "Educational Craftsmanship",
      description: "Built with modern full-stack practices, prioritizing clean architecture and absolute UI/UX excellence.",
      icon: <Cpu className="w-5 h-5 text-foreground" />
    },
    {
      title: "Global Reach",
      description: "Access a worldwide library of music through public third-party APIs with zero geographic blocks.",
      icon: <Globe className="w-5 h-5 text-foreground" />
    }
  ];

  return (
    <div className="min-h-svh bg-background text-foreground pb-20 md:pb-32 selection:bg-primary/20">
      {/* Background Ambient Effect */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-linear-to-b from-foreground/3 to-transparent pointer-events-none z-0" />

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-24 sm:pt-32">
        
        {/* Hero Section */}
        <section className="text-center mb-24 sm:mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>What's New in Jammify</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-semibold tracking-tighter mb-8 text-foreground">
              Music Experience, <br className="hidden md:block" /> Redefined.
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground font-light max-w-2xl mx-auto mb-12 leading-relaxed">
              Discover the perfect blend of aesthetic design and powerful performance.
              Jammify isn't just a music player; it's a statement.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link href="/music" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto group inline-flex h-14 items-center justify-center rounded-full bg-foreground px-8 text-base font-semibold text-background shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                  Start Listening
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="https://github.com/shreejaybhay/jammify" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full bg-transparent border border-border/40 px-8 text-base font-semibold text-foreground hover:bg-foreground/5 active:scale-[0.98] transition-all duration-300">
                  View Repository
                </button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="mb-32">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tighter mb-3 text-foreground">Platform Features</h2>
            <p className="text-muted-foreground text-lg font-light">Everything you need for a premium streaming experience.</p>
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
                <div className="h-full bg-foreground/2 border border-foreground/10 rounded-[28px] p-6 sm:p-8 flex flex-col hover:bg-foreground/4 transition-colors duration-300 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
                    
                    <div className="mb-6 p-4 rounded-2xl bg-background border border-border/20 w-fit group-hover:scale-110 shadow-sm transition-transform duration-500 ease-out z-10">
                      {feature.icon}
                    </div>
                    
                    <div className="flex items-center justify-between mb-4 z-10">
                      <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">{feature.title}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-3 py-1 bg-background rounded-full border border-border/20">
                        {feature.badge}
                      </span>
                    </div>
                    
                    <p className="text-base text-foreground/70 leading-relaxed font-light z-10">
                      {feature.description}
                    </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="relative overflow-hidden bg-foreground/2 rounded-[32px] sm:rounded-[48px] p-8 sm:p-16 md:p-24 border border-foreground/10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tighter mb-6 text-foreground">Our Core Values</h2>
              <p className="text-lg sm:text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
                We believe that great software is built at the intersection of extreme performance,
                beautiful aesthetics, and deep user respect.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 sm:gap-16">
              {values.map((value, index) => (
                <div key={index} className="flex gap-4 sm:gap-6 group">
                  <div className="mt-1 shrink-0 w-12 h-12 rounded-2xl bg-background border border-border/20 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform duration-300 shadow-sm">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium tracking-tight mb-2 text-foreground">{value.title}</h3>
                    <p className="text-foreground/70 leading-relaxed font-light">
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
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tighter mb-6 text-foreground">Ready to tune in?</h2>
            <p className="text-lg text-muted-foreground font-light mb-10 max-w-lg mx-auto">
              Join thousands of users enjoying a cleaner, faster, and more beautiful way to stream music.
            </p>
            <Link href="/music">
              <button className="group inline-flex h-14 items-center justify-center rounded-full bg-foreground px-10 text-lg font-semibold text-background shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
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
