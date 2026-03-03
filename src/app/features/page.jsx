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
  Cpu
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  },
};

const FeaturesPage = () => {
  const features = [
    {
      title: "Premium Audio",
      description: "Stream over 80 million songs in crystal-clear 320kbps high-quality audio fetching.",
      icon: <Music className="w-6 h-6 text-primary" />,
      badge: "High Fidelity"
    },
    {
      title: "Smart Discovery",
      description: "Fuzzy search with intelligent ranking for exact names, lyrics matches, and artist patterns.",
      icon: <Search className="w-6 h-6 text-primary" />,
      badge: "Intuitive"
    },
    {
      title: "Spotify Import",
      description: "Seamlessly migrate your favorite Spotify playlists into Jammify with a single click or link.",
      icon: <Radio className="w-6 h-6 text-primary" />,
      badge: "Migration"
    },
    {
      title: "Ambient Visuals",
      description: "A gorgeous UI with ambient gradient backgrounds that adapt dynamically to your music.",
      icon: <Layers className="w-6 h-6 text-primary" />,
      badge: "Adaptive"
    },
    {
      title: "Universal Access",
      description: "Full PWA support. Install Jammify on your desktop or mobile for a seamless app-like experience.",
      icon: <Smartphone className="w-6 h-6 text-primary" />,
      badge: "PWA"
    },
    {
      title: "Personal Library",
      description: "Save your favorite tracks, create custom playlists, and track your listening history effortlessly.",
      icon: <Heart className="w-6 h-6 text-primary" />,
      badge: "Personalized"
    },
    {
      title: "Live Lyrics",
      description: "Get synchronized, real-time lyrics for millions of tracks to sing along with your favorite artists.",
      icon: <History className="w-6 h-6 text-primary" />,
      badge: "Synchronized"
    },
    {
      title: "Social Sharing",
      description: "Share your favorite tracks or entire playlists with friends instantly via uniquely generated links.",
      icon: <Globe className="w-6 h-6 text-primary" />,
      badge: "Community"
    },
    {
      title: "Global Radio",
      description: "Tune into live radio stations from across the globe, bringing world music to your fingertips.",
      icon: <Radio className="w-6 h-6 text-primary" />,
      badge: "Worldwide"
    }
  ];

  const values = [
    {
      title: "Privacy & Security",
      description: "Your music tastes are yours alone. Enterprise-grade authentication with NextAuth ensures your data stays secure.",
      icon: <ShieldCheck className="w-5 h-5" />
    },
    {
      title: "Speed Over Everything",
      description: "Zero bloat, lightning-fast search, and optimized playback engine for the smoothest experience.",
      icon: <Zap className="w-5 h-5" />
    },
    {
      title: "Educational Craftsmanship",
      description: "Built with modern full-stack practices, prioritizing clean architecture and UI/UX excellence.",
      icon: <Cpu className="w-5 h-5" />
    },
    {
      title: "Global Reach",
      description: "Access a worldwide library of music through public third-party APIs with zero restrictions.",
      icon: <Globe className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Background Ambient Effect */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none -z-10" />

      <main className="container mx-auto px-6 pt-24">
        {/* Hero Section */}
        <section className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4 py-1 px-4 border-primary/50 text-primary">
              What's New in Jammify
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Music Experience, <br /> Redefined.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Discover the blend of aesthetic design and powerful performance.
              Jammify isn't just a music player; it's a statement.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/music">
                <Button size="lg" className="rounded-full px-8 h-12 text-base">
                  Start Listening
                </Button>
              </Link>
              <Link href="https://github.com/shreejaybhay/jammify">
                <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base">
                  View Repository
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="mb-32">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Platform Features</h2>
              <p className="text-muted-foreground">Everything you need for a premium streaming experience.</p>
            </div>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full bg-card/50 border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 group">
                  <CardHeader>
                    <div className="mb-4 p-3 rounded-2xl bg-primary/10 w-fit group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] font-medium opacity-70">
                        {feature.badge}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-muted-foreground leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Values Section */}
        <section className="bg-primary/5 rounded-[2.5rem] p-12 md:p-20 border border-primary/10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Core Values</h2>
              <p className="text-lg text-muted-foreground">
                We believe that great software is built at the intersection of performance,
                aesthetics, and user respect.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {values.map((value, index) => (
                <div key={index} className="flex gap-4">
                  <div className="mt-1 flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="text-center mt-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">Ready to tune in?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands of users enjoying a cleaner, faster, and more beautiful way to stream music.
            </p>
            <Link href="/music">
              <Button size="lg" className="rounded-full px-12 h-14 text-lg">
                Explore Music Now
              </Button>
            </Link>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default FeaturesPage;
