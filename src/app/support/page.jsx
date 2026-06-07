import Link from "next/link";
import { ArrowLeft, Sparkles, Heart, Lightbulb } from "lucide-react";

export const metadata = {
  alternates: {
    canonical: "/support",
  },
  title: "Support Jammify",
  description: "Support Jammify by visiting a sponsor link. Help cover database and hosting costs to keep the app 100% free.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Ambient background decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full max-w-lg mx-auto pt-4 z-10">
        <Link
          href="/music"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex flex-col items-center justify-center py-12 z-10">
        <div className="w-full max-w-md bg-[#181818]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl text-center space-y-6">
          
          {/* Header Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Keep Jammify Running
          </h1>

          {/* Description */}
          <p className="text-gray-300 text-sm md:text-base leading-relaxed text-center text-balance">
            Jammify is a completely free music platform built by a solo developer. 
            As our community grows, so do the backend costs for our Vercel servers and MongoDB databases. 
            To keep this app <span className="text-white font-bold">100% free</span> and avoid <span className="text-white font-bold">paid subscriptions</span>, please support us by clicking the button below.
          </p>

          {/* Sub-text */}
          <div className="bg-[#222] border border-white/5 rounded-xl p-4 text-xs text-gray-400 leading-relaxed flex items-start gap-2.5 text-left">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Clicking the sponsor link <span className="text-white font-semibold">just once a day</span> safely generates a few cents to help cover the server bills. It only takes 2 seconds!
            </p>
          </div>

          {/* Smartlink CTA Button */}
          <div className="pt-2">
            <a
              href="https://assistedtogether.com/xpe5paf4?key=b322408d16aa2ebcf591c134695bac6d"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-white hover:bg-gray-100 text-black font-extrabold rounded-full py-4 text-base tracking-wide transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg text-center cursor-pointer"
            >
              Click here to Support (Free)
            </a>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> by Shree.
          </p>
        </div>
      </main>

      {/* Empty footer for vertical balance */}
      <footer className="w-full h-8" />
    </div>
  );
}
