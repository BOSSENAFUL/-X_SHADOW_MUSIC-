import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

export function PlaylistSection({
    title,
    playlists,
    loading,
    onShowAll,
    onPlaylistClick,
    onPlayClick,
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
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
                <div className="flex items-center gap-2">
                    {/* Navigation Buttons - Tablet and Desktop Only */}
                    <div className="hidden md:flex items-center gap-1 mr-2 border-r pr-3 border-muted-foreground/20">
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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onShowAll}
                        className="text-xs md:text-sm font-medium hover:bg-muted/50"
                    >
                        Show all
                    </Button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto p-2 md:p-3 gap-4 snap-x snap-mandatory scrollbar-hide"
            >
                {loading
                    ? // Loading skeleton
                    Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="space-y-2 min-w-[140px] md:min-w-[180px] snap-start"
                        >
                            <div className="bg-muted animate-pulse rounded-lg aspect-square" />
                            <div className="bg-muted animate-pulse h-4 rounded" />
                            <div className="bg-muted animate-pulse h-3 rounded w-2/3" />
                        </div>
                    ))
                    : playlists.map((playlist) => (
                        <div
                            key={playlist.id}
                            className="group cursor-pointer hover:scale-105 transition-transform min-w-[140px] md:min-w-[180px] snap-start"
                            onClick={() => onPlaylistClick(playlist)}
                        >
                            <div className="relative rounded-lg aspect-square overflow-hidden mb-3">
                                <img
                                    src={
                                        playlist.image?.[2]?.url ||
                                        playlist.image?.[1]?.url ||
                                        playlist.image?.[0]?.url
                                    }
                                    alt={playlist.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.src = "/placeholder-music.jpg";
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-xl z-20">
                                    <div
                                        className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPlayClick(playlist);
                                        }}
                                    >
                                        <Play className="w-5 h-5 md:w-6 md:h-6 fill-black translate-x-0.5" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium leading-tight truncate text-foreground">
                                    {playlist.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {playlist.songCount} songs
                                </p>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
