/* eslint-disable @next/next/no-img-element */

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { IoMdPlay } from "react-icons/io";
import { useSession } from "next-auth/react";
import { useMusicPlayer } from "@/contexts/music-player-context";
import { trackRecentlyPlayed } from "@/lib/track-playlist";

// Extract dominant color from an image URL using canvas sampling
function useImageColor(imageUrl) {
    const [color, setColor] = useState(null);

    useEffect(() => {
        if (!imageUrl) return;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 50;
                canvas.height = 50;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 50, 50);
                const imageData = ctx.getImageData(0, 0, 50, 50).data;

                let r = 0, g = 0, b = 0;
                const count = imageData.length / 4;
                for (let i = 0; i < imageData.length; i += 4) {
                    r += imageData[i];
                    g += imageData[i + 1];
                    b += imageData[i + 2];
                }
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);

                // Boost saturation for vibrancy
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                if (max - min < 40) {
                    // Desaturated — shift toward a vibrant hue
                    const hue = (r + g * 2 + b * 3) % 360;
                    const s = 0.7, l = 0.55;
                    const c = (1 - Math.abs(2 * l - 1)) * s;
                    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
                    const m = l - c / 2;
                    let rr, gg, bb;
                    if (hue < 60) { rr = c; gg = x; bb = 0; }
                    else if (hue < 120) { rr = x; gg = c; bb = 0; }
                    else if (hue < 180) { rr = 0; gg = c; bb = x; }
                    else if (hue < 240) { rr = 0; gg = x; bb = c; }
                    else if (hue < 300) { rr = x; gg = 0; bb = c; }
                    else { rr = c; gg = 0; bb = x; }
                    setColor(`rgb(${Math.round((rr + m) * 255)}, ${Math.round((gg + m) * 255)}, ${Math.round((bb + m) * 255)})`);
                } else {
                    setColor(`rgb(${r}, ${g}, ${b})`);
                }
            } catch {
                // CORS or other error — use deterministic fallback
                const hash = imageUrl.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                const fallbacks = ['#2dd4bf', '#f472b6', '#818cf8', '#fbbf24', '#34d399', '#fb923c'];
                setColor(fallbacks[hash % fallbacks.length]);
            }
        };
        img.onerror = () => {
            const hash = imageUrl.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const fallbacks = ['#2dd4bf', '#f472b6', '#818cf8', '#fbbf24', '#34d399', '#fb923c'];
            setColor(fallbacks[hash % fallbacks.length]);
        };
        img.src = imageUrl;
    }, [imageUrl]);

    return color;
}

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

    // Get cover image URL for color extraction
    const coverImageUrl = safeImageUrl(
        playlist.image?.[2]?.url ||
        playlist.image?.[1]?.url ||
        playlist.image?.[0]?.url ||
        (typeof playlist.image === 'string' ? playlist.image : null)
    );
    const mixColor = useImageColor(playlist.source === 'mix' ? coverImageUrl : null);

    return (
        <div
            className="group cursor-pointer"
            onClick={() => onClick(playlist)}
        >
            <div className="relative rounded-md aspect-square overflow-hidden mb-3 bg-muted border border-border shadow-lg">
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

                <div className="absolute inset-0 bg-black/40 opacity-0 pointer-events-none" />

                {/* Dark gradient overlay for mixes — bottom to center */}
                {playlist.source === 'mix' && (
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 via-black/50 to-transparent pointer-events-none" />
                )}

                {/* Spotify-style Daily Mix overlay with extracted color */}
                {playlist.source === 'mix' && (() => {
                    const num = (playlist.name || '').match(/\d+/)?.[0] || '1';
                    const paddedNum = num.padStart(2, '0');
                    const bgColor = mixColor || '#2dd4bf';
                    const match = bgColor.match(/\d+/g);
                    const brightness = match ? (parseInt(match[0]) * 0.299 + parseInt(match[1]) * 0.587 + parseInt(match[2]) * 0.114) : 128;
                    const textColor = brightness > 140 ? 'text-black' : 'text-white';

                    return (
                        <div className="absolute bottom-1 w-full flex items-center justify-around pointer-events-none">
                            <span className={`${textColor} font-bold text-[14px] sm:text-xs md:text-[16px] px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 md:py-2  leading-none tracking-wide`} style={{ backgroundColor: bgColor }}>
                                Daily Mix
                            </span>
                            <span className={`${textColor} font-bold text-2xl sm:text-2xl md:text-3xl px-1 py-1 sm:px-1 sm:py-1 md:px-1 md:py-1  leading-none`} style={{ backgroundColor: bgColor }}>
                                {paddedNum}
                            </span>
                        </div>
                    );
                })()}

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
            <div className="space-y-0.5 px-1">
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
