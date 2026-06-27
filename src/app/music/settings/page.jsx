"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { useMusicPlayer } from "@/contexts/music-player-context";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    User,
    Bell,
    LogOut,
    ChevronRight,
    Music,
    Music2,
    Globe,
    Layers,
    Smartphone,
    Info,
    LayoutGrid,
    Check,
    Video,
    Mic,
} from "lucide-react";

// ── Section wrapper ──────────────────────────────────────────────────────────
function SettingsSection({ title, children }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-2">
                {title}
            </p>
            <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                {children}
            </div>
        </div>
    );
}

// ── Row ──────────────────────────────────────────────────────────────────────
function SettingsRow({ icon: Icon, label, description, onClick, children, danger }) {
    return (
        <div
            className={cn(
                "flex items-center gap-4 px-4 py-3.5 transition-colors",
                onClick && "cursor-pointer hover:bg-accent/50",
                danger && "text-red-500"
            )}
            onClick={onClick}
        >
            {Icon && (
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    danger ? "bg-red-500/10" : "bg-muted"
                )}>
                    <Icon className="w-4 h-4" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{label}</p>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
                )}
            </div>
            {children ?? (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />)}
        </div>
    );
}

// ── Feed preference options ───────────────────────────────────────────────────
const FEED_OPTIONS = [
    {
        value: 'all',
        label: 'All',
        description: 'Show both music and podcast categories',
        icon: Layers,
    },
    {
        value: 'music',
        label: 'Music',
        description: 'Show only music playlists and suggestions',
        icon: Music2,
    },
    {
        value: 'youtube',
        label: 'YouTube',
        description: 'Show only podcast episodes and shows',
        icon: Mic,
    },
];

function FeedPreferencePicker({ value, onChange }) {
    return (
        <div className="px-4 py-3 space-y-2">
            {FEED_OPTIONS.map((opt) => {
                const isSelected = value === opt.value;
                const Icon = opt.icon;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                            isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border bg-background hover:border-primary/40 hover:bg-accent/40"
                        )}
                    >
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary/20" : "bg-muted"
                        )}>
                            <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                        {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { 
        showTrackNumbersMobile, 
        setShowTrackNumbersMobile,
        disableSpotifyCanvas,
        setDisableSpotifyCanvas,
        disableLyricsBg,
        setDisableLyricsBg,
        disableHaptic,
        setDisableHaptic
    } = useMusicPlayer();

    const [notifNewFeatures, setNotifNewFeatures] = useState(() => {
        if (typeof window === "undefined") return true;
        return localStorage.getItem("notif_new_features") !== "false";
    });

    const [feedPreference, setFeedPreference] = useState('all');

    // Read from localStorage after mount to avoid SSR/client mismatch (defer to prevent synchronous setState warning)
    useEffect(() => {
        const stored = localStorage.getItem('feed_preference');
        if (stored) {
            const timeout = setTimeout(() => {
                setFeedPreference(stored);
            }, 0);
            return () => clearTimeout(timeout);
        }
    }, []);

    const toggle = (key, setter) => (val) => {
        setter(val);
        localStorage.setItem(key, String(val));
    };

    const handleFeedChange = (val) => {
        setFeedPreference(val);
        localStorage.setItem("feed_preference", val);
        // Clear the sections cache so the home page re-fetches with new preference
        sessionStorage.removeItem("db_sections_data");
        sessionStorage.removeItem("popular_hindi_playlists");
    };

    return (
        <SidebarProvider>
            <AppSidebar className="hidden md:flex" />
            <SidebarInset className="md:ml-0 overflow-x-hidden h-svh flex flex-col">

                {/* ── Header ── */}
                <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1 hidden md:flex" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4 hidden md:block" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/music">Music</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/music/profile">Profile</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Settings</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                {/* ── Content ── */}
                <ScrollArea className="flex-1">
                    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-32">

                        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

                        {/* Account */}
                        <SettingsSection title="Account">
                            <SettingsRow
                                icon={User}
                                label={session?.user?.name ?? "Your Account"}
                                description={session?.user?.email ?? ""}
                                onClick={() => router.push("/music/profile")}
                            />
                        </SettingsSection>

                        {/* Home Feed */}
                        <SettingsSection title="Home Feed">
                            <div>
                                <div className="flex items-center gap-4 px-4 py-3.5">
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <LayoutGrid className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">Feed Preference</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Personalise what sections appear on your home screen
                                        </p>
                                    </div>
                                </div>
                                <FeedPreferencePicker
                                    value={feedPreference}
                                    onChange={handleFeedChange}
                                />
                            </div>
                        </SettingsSection>

                        {/* Display Settings */}
                        <SettingsSection title="Display Settings">
                            <SettingsRow
                                icon={Smartphone}
                                label="Show track numbers on mobile"
                                description="Display index numbers next to songs in lists on mobile devices"
                            >
                                <Switch
                                    checked={showTrackNumbersMobile}
                                    onCheckedChange={(val) => {
                                        setShowTrackNumbersMobile(val);
                                        localStorage.setItem("show_track_numbers_mobile", String(val));
                                    }}
                                />
                            </SettingsRow>
                            <SettingsRow
                                icon={Video}
                                label="Disable Spotify Canvas background"
                                description="Turn off background video loops during music playback"
                            >
                                <Switch
                                    checked={disableSpotifyCanvas}
                                    onCheckedChange={(val) => {
                                        setDisableSpotifyCanvas(val);
                                        localStorage.setItem("disable_spotify_canvas", String(val));
                                    }}
                                />
                            </SettingsRow>
                            <SettingsRow
                                icon={Layers}
                                label="Disable dynamic lyrics background"
                                description="Turn off color-morphing WebGL backdrop during lyrics view"
                            >
                                <Switch
                                    checked={disableLyricsBg}
                                    onCheckedChange={(val) => {
                                        setDisableLyricsBg(val);
                                        localStorage.setItem("disable_lyrics_bg", String(val));
                                    }}
                                />
                            </SettingsRow>
                            <SettingsRow
                                icon={Smartphone}
                                label="Haptic feedback"
                                description="Vibrate on tap and drag interactions"
                            >
                                <Switch
                                    checked={!disableHaptic}
                                    onCheckedChange={(val) => {
                                        setDisableHaptic(!val);
                                        localStorage.setItem("disable_haptic", String(!val));
                                    }}
                                />
                            </SettingsRow>
                        </SettingsSection>

                        {/* Notifications */}
                        <SettingsSection title="Notifications">
                            <SettingsRow
                                icon={Bell}
                                label="New features & updates"
                                description="Get notified when Jammify adds something new"
                            >
                                <Switch
                                    checked={notifNewFeatures}
                                    onCheckedChange={toggle("notif_new_features", setNotifNewFeatures)}
                                />
                            </SettingsRow>
                        </SettingsSection>

                        {/* About */}
                        <SettingsSection title="About">
                            <SettingsRow
                                icon={Music}
                                label="Jammify"
                                description="Your personal music streaming app"
                            />
                            <SettingsRow
                                icon={Smartphone}
                                label="Install App"
                                description="Add Jammify to your home screen"
                                onClick={() => router.push("/music")}
                            />
                            <SettingsRow
                                icon={Info}
                                label="Version"
                                description="1.0.0"
                            />
                        </SettingsSection>

                        {/* Account Actions */}
                        <SettingsSection title="Account Actions">
                            <SettingsRow
                                icon={LogOut}
                                label="Sign out"
                                description="Sign out of your Jammify account"
                                danger
                                onClick={() => signOut({ callbackUrl: "/login" })}
                            />
                        </SettingsSection>

                    </div>
                </ScrollArea>
            </SidebarInset>
        </SidebarProvider>
    );
}
