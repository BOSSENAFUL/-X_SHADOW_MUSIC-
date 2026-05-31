'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { getOptimizedAvatar } from '@/lib/utils';

const UserReviews = () => {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRatings = async () => {
            try {
                const res = await fetch('/api/rating');
                const data = await res.json();
                setRatings(data.ratings || []);
            } catch (error) {
                console.error('Failed to fetch ratings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRatings();
    }, []);

    if (loading) return null;
    if (ratings.length === 0) return null;

    // Limit slice of ratings for marquee to a performance-friendly maximum of 15 items
    const marqueeRatings = ratings.slice(0, 15);
    const displayRatings = marqueeRatings.length > 3 ? [...marqueeRatings, ...marqueeRatings] : marqueeRatings;

    return (
        <section className="w-full py-24 md:py-32 overflow-hidden bg-background border-t border-white/5 relative">
            {/* Top Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-40 rounded-full bg-primary/5 blur-[100px] pointer-events-none -z-10" />

            <div className="container px-4 md:px-6 mx-auto mb-16 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-400 mb-4 select-none">
                    Testimonials
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 pb-2">
                    Loved by listeners
                </h2>
                <p className="mx-auto max-w-[600px] text-zinc-400/90 text-base sm:text-lg mt-4 font-light leading-relaxed">
                    Join thousands of users who have discovered a better way to experience their music.
                </p>
            </div>

            <div className="relative w-full overflow-hidden">
                {/* Fade Edges for Marquee */}
                <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-40 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                <div className="flex w-full overflow-hidden">
                    <motion.div
                        className="flex gap-5 sm:gap-6 py-6 items-stretch w-max flex-nowrap"
                        animate={{
                            x: marqueeRatings.length > 3 ? ["0%", "-50%"] : "0%",
                        }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: marqueeRatings.length * 6, // Smooth, slow scroll speed
                                ease: "linear",
                            },
                        }}
                        style={{ display: 'flex', justifyContent: 'flex-start' }}
                    >
                        {displayRatings.map((rating, index) => (
                            <div 
                                key={`${rating._id}-${index}`} 
                                className="relative overflow-hidden shrink-0 w-[290px] sm:w-[360px] h-[260px] sm:h-[280px] bg-white/[0.01] border border-white/5 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between hover:bg-white/[0.03] hover:border-primary/20 backdrop-blur-md shadow-2xl hover:-translate-y-1 transition-all duration-500 group"
                            >
                                {/* Ambient Background Glow */}
                                <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-primary/5 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                                <div className="space-y-4">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-4 h-4 ${rating.rating >= star ? "fill-amber-400 text-amber-400" : "text-muted/20"}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-light italic line-clamp-3 sm:line-clamp-4 wrap-break-word" title={rating.comment}>
                                        "{rating.comment || "An incredible experience."}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                    <Avatar className="w-10 h-10 border border-white/10 bg-background/50">
                                        <AvatarImage
                                            src={getOptimizedAvatar(rating.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${rating.user?.name || "User"}`, 48)}
                                            alt={rating.user?.name || "User"}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-muted"><User className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground tracking-tight">{rating.user?.name || "Anonymous Listener"}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Verified User</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            <div className="flex justify-center mt-12 sm:mt-16 relative z-20">
                <Link
                    href="/reviews"
                    className="group inline-flex h-12 sm:h-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md px-8 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-white/[0.06] hover:border-white/20 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98] transition-all duration-300"
                >
                    Read all reviews
                </Link>
            </div>
        </section>
    );
};

export default UserReviews;
