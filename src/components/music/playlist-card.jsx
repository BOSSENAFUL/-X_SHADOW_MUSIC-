
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { IoMdPlay } from "react-icons/io";
import { useSession } from "next-auth/react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { trackRecentlyPlayed } from "@/lib/track-playlist";

export function PlaylistCard({ playlist, onClick, externalPlayingId, onPlay }) {
    const [localPlayingId, setLocalPlayingId] = useState(null);
    const { data: session } = useSession();
    const { playSong } = useMusicPlayer();

    const currentPlayingId = externalPlayingId || localPlayingId;
    const id = playlist.id || playlist.playlistId;

    const handlePlaylistPlay = async (e) => {
        e.stopPropagation();
        const pid = playlist.id || playlist.playlistId;
        if (currentPlayingId === pid) return;

        if (onPlay) {
            onPlay(playlist, e);
            return;
        }

        setLocalPlayingId(pid);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            let songs = [];
            const source = playlist.source || 'jiosaavn';

            if (source === 'user') {
                const res = await fetch(`/api/playlists/${pid}`);
                const result = await res.json();
                if (result.success && result.data?.songIds?.length) {
                    const songsRes = await fetch(`${apiUrl}/api/songs?ids=${result.data.songIds.join(',')}`);
                    const songsData = await songsRes.json();
                    if (songsData.success && songsData.data) {
                        const map = {};
                        songsData.data.forEach(s => { map[s.id] = s; });
                        songs = result.data.songIds.map(id => map[id]).filter(Boolean);
                    }
                }
            } else {
                const res = await fetch(`${apiUrl}/api/playlists?id=${pid}&page=0&limit=${playlist.songCount || 50}`);
                const data = await res.json();
                if (data.success && data.data?.songs) {
                    songs = data.data.songs;
                }
            }

            if (songs.length > 0) {
                playSong(songs[0], songs, pid);
                if (session?.user?.id) {
                    await trackRecentlyPlayed(playlist, source, songs);
                }
            }
        } catch (err) {
            console.error('Error playing playlist from card:', err);
        } finally {
            setLocalPlayingId(null);
        }
    };

    // Detect collage images from image array if collageImages is missing
    let collageDisplayImages = playlist.collageImages || [];
    if (collageDisplayImages.length < 4 && Array.isArray(playlist.image) && playlist.image.length >= 4) {
        // If it's a user playlist or they all have 'default' quality, it's likely a collage
        const isLikelyCollage = playlist.source === 'user' || playlist.image.every(img => img.quality === 'default');
        if (isLikelyCollage) {
            collageDisplayImages = playlist.image.map(img => img.url).filter(url =>
                typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))
            );
        }
    }

    // Helper: return the URL only if it looks like a real URL, otherwise fallback
    const safeImageUrl = (url) => {
        if (!url || typeof url !== 'string') return '/default-playlist-image.png';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url;
        return '/default-playlist-image.png';
    };

    return (
        <div
            className="group cursor-pointer hover:scale-105 transition-transform"
            onClick={() => onClick(playlist)}
        >
            <div className="relative rounded-lg aspect-square overflow-hidden mb-3 bg-muted border border-border shadow-lg">
                {collageDisplayImages.length >= 4 ? (
                    <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                        {collageDisplayImages.slice(0, 4).map((src, idx) => (
                            <img
                                key={idx}
                                src={safeImageUrl(src)}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => { e.target.src = "/default-playlist-image.png"; }}
                            />
                        ))}
                    </div>
                ) : (
                    <img
                        src={safeImageUrl(
                            playlist.image?.[2]?.url ||
                            playlist.image?.[1]?.url ||
                            playlist.image?.[0]?.url ||
                            (typeof playlist.image === 'string' ? playlist.image : null)
                        )}
                        alt={playlist.name || playlist.playlistName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { e.target.src = "/default-playlist-image.png"; }}
                    />
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`absolute bottom-2 right-2 transition-all duration-300 z-20 hidden md:block ${currentPlayingId === id ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                    <button
                        type="button"
                        className="rounded-full w-10 h-10 md:w-12 md:h-12 bg-green-500 hover:bg-green-400 flex items-center justify-center text-black shadow-lg hover:scale-105 transition-transform"
                        onClick={handlePlaylistPlay}
                    >
                        {currentPlayingId === id ? (
                            <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-black" />
                        ) : (
                            <IoMdPlay className="w-5 h-5 md:w-6 md:h-6 fill-black translate-x-0.5" />
                        )}
                    </button>
                </div>
            </div>
            <div className="space-y-1 px-1">
                <p className="text-sm font-bold leading-tight line-clamp-1 text-foreground">
                    {playlist.name || playlist.playlistName}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                    {playlist.songCount || 0} songs
                </p>
            </div>
        </div>
    );
}
