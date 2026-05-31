// src/components/blog-header.jsx
import Link from "next/link";
import Image from "next/image";

export default function BlogHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl supports-backdrop-filter:bg-background/40">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20">
        {/* Brand Logo & Name */}
        <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[0.98]">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <Image 
              src="/icon-192.png" 
              alt="Jammify Logo" 
              width={32} 
              height={32} 
              className="rounded-full" 
            />
          </div>
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-white">Jammify</span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1.5 sm:gap-6">
          <Link
            href="/features"
            className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors px-2 py-2"
          >
            Features
          </Link>
          <Link
            href="/blog"
            className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-2"
          >
            Blog
          </Link>
          <Link
            href="/music"
            className="inline-flex h-8 sm:h-10 items-center justify-center rounded-full bg-emerald-500/10 px-3 sm:px-6 text-xs sm:text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            Web Player
          </Link>
        </nav>
      </div>
    </header>
  );
}
