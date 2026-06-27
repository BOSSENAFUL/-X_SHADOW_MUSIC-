"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Search, ListMusic, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWebHaptics } from "web-haptics/react"
import { useMusicPlayer } from "@/contexts/music-player-context"

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
  const { trigger } = useWebHaptics()
  const { disableHaptic } = useMusicPlayer()

  const handleClick = (e, href) => {
    if (!disableHaptic) {
      trigger("success")
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border md:hidden pb-safe">
      <nav className="flex items-center justify-around h-[64px] ">
        {navItems.map((item) => {
          // Logic for active state
          const isActive = pathname === item.href ||
            (item.href === "/music/library" && pathname.startsWith("/music/library")) ||
            (item.href === "/music/playlists" && pathname.startsWith("/music/playlists")) ||
            (item.href === "/music/search" && pathname.startsWith("/music/search")) ||
            (item.href === "/music/profile" && pathname.startsWith("/music/profile"))

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className="flex flex-col items-center justify-center min-w-0 flex-1 h-full group"
            >
              <div className={cn(
                "relative flex items-center justify-center transition-all duration-200",
                isActive ? "" : "group-active:scale-90"
              )}>
                <item.icon
                  className={cn(
                    "h-6 w-6 mb-0.5",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={cn(
                "truncate text-[10px] font-medium transition-colors duration-200",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"
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
