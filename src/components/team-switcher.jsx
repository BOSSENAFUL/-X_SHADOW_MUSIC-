"use client"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

export function TeamSwitcher({ teams }) {
  const team = teams?.[0]
  if (!team) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="cursor-default hover:bg-transparent active:bg-transparent pointer-events-none"
        >
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg overflow-hidden shrink-0 border border-accent/90">
            <img
              src="https://i.postimg.cc/1X6Ljztt/extension-icon-192px.png"
              alt="Jammify"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{team.name}</span>
            <span className="truncate text-xs text-muted-foreground">{team.plan}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
