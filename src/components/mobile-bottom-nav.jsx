"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Search, ListMusic, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    name: "Home",
    href: "/music",
    icon: Home,
  },
  {
    name: "Search",
    href: "/music/search",
    icon: Search,
  },
  {
    name: "Your Library",
    href: "/music/library",
    icon: ListMusic,
  },
  {
    name: "Create",
    href: "/music/playlists",
    icon: Plus,
  },
  {
    name: "Profile",
    href: "/music/profile",
    icon: User,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
      <nav className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/music/library" && pathname.startsWith("/music/library")) ||
            (item.href === "/music/playlists" && pathname.startsWith("/music/playlists")) ||
            (item.href === "/music/search" && pathname.startsWith("/music/search")) ||
            (item.href === "/music/profile" && pathname.startsWith("/music/profile"))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 text-xs transition-all duration-200 rounded-lg mx-0.5",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 mb-1 transition-all duration-200",
                  isActive ? "text-primary scale-110" : "text-muted-foreground"
                )} 
              />
              <span className={cn(
                "truncate text-[10px] font-medium transition-all duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}