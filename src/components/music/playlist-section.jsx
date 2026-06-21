import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PlaylistCard } from "./playlist-card";

export function PlaylistSection({
    title,
    playlists,
    loading,
    onShowAll,
    onPlaylistClick,
    onPlayClick,
    playingId,
    extraActions,
}) {
    const scrollContainerRef = useRef(null);

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = direction === "left" ? -container.offsetWidth : container.offsetWidth;
            container.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
                <div className="flex items-center gap-2">
                    {/* Navigation Buttons - Tablet and Desktop Only */}
                    <div className="hidden lg:flex items-center gap-1 mr-2 border-r pr-3 border-muted-foreground/20">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50"
                            onClick={() => scroll("left")}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50"
                            onClick={() => scroll("right")}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    {extraActions}
                    {onShowAll && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowAll}
                            className="text-xs md:text-sm font-medium hover:bg-muted/50"
                        >
                            Show all
                        </Button>
                    )}
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto p-2 gap-4 snap-x snap-mandatory scrollbar-hide"
            >
                {loading
                    ? // Loading skeleton
                    Array.from({ length: 10 }).map((_, index) => (
                        <div
                            key={index}
                            className="w-[140px] md:w-[160px] lg:w-[180px] shrink-0 snap-start"
                        >
                            <div className="bg-accent/60 animate-pulse rounded-md aspect-square mb-3 border border-border shadow-lg" />
                            <div className="space-y-0.5 px-1">
                                <div className="bg-accent/50 animate-pulse h-[18px] rounded w-11/12" />
                                <div className="bg-accent/30 animate-pulse h-4 rounded w-2/3" />
                            </div>
                        </div>
                    ))
                    : playlists.map((playlist) => (
                        <div
                            key={playlist.id || playlist.playlistId}
                            className="w-[140px] md:w-[160px] lg:w-[180px] shrink-0 snap-start"
                        >
                            <PlaylistCard
                                playlist={playlist}
                                onClick={onPlaylistClick}
                                onPlay={onPlayClick}
                                externalPlayingId={playingId}
                            />
                        </div>
                    ))}
            </div>
        </div>
    );
}
