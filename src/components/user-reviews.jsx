'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

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

    // Duplicate ratings for marquee effect if there are enough items, otherwise just show them
    const displayRatings = ratings.length > 3 ? [...ratings, ...ratings] : ratings;

    return (
        <section className="w-full py-20 md:py-28 overflow-hidden bg-background border-t border-border/10">
            <div className="container px-4 md:px-6 mx-auto mb-16 text-center">
                <h2 className="text-3xl font-semibold tracking-tighter sm:text-4xl md:text-5xl text-foreground">
                    Loved by listeners
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground text-base sm:text-lg mt-4 font-light">
                    Join thousands of users who have discovered a better way to experience their music.
                </p>
            </div>

            <div className="relative w-full overflow-hidden">
                {/* Fade Edges for Marquee */}
                <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />

                <div className="flex w-full overflow-hidden">
                    <motion.div
                        className="flex gap-4 sm:gap-6 py-4 items-stretch"
                        animate={{
                            x: ratings.length > 3 ? ["0%", "-50%"] : "0%",
                        }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: ratings.length * 8, // Slower, smoother scroll
                                ease: "linear",
                            },
                        }}
                        style={{ width: ratings.length > 3 ? "200%" : "auto", display: 'flex', justifyContent: ratings.length > 3 ? 'flex-start' : 'center' }}
                    >
                        {displayRatings.map((rating, index) => (
                            <div 
                                key={`${rating._id}-${index}`} 
                                className="shrink-0 w-[280px] sm:w-[340px] h-[260px] sm:h-[300px] bg-foreground/2 border border-border/20 rounded-[24px] p-6 sm:p-8 flex flex-col justify-between hover:bg-foreground/4 transition-colors duration-300"
                            >
                                <div className="space-y-5">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-4 h-4 sm:w-5 sm:h-5 ${rating.rating >= star ? "fill-primary/80 text-primary/80" : "text-muted/30"}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-sm sm:text-base text-foreground/80 leading-relaxed font-light italic line-clamp-4 wrap-break-word" title={rating.comment}>
                                        "{rating.comment || "An incredible experience."}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-6 mt-6 border-t border-border/10">
                                    <Avatar className="w-10 h-10 border border-border/20 bg-background">
                                        <AvatarImage
                                            src={rating.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${rating.user?.name || "User"}`}
                                            alt={rating.user?.name || "User"}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-muted"><User className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground tracking-tight">{rating.user?.name || "Anonymous Listener"}</span>
                                        <span className="text-xs text-muted-foreground font-light">Verified User</span>
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
                    className="group inline-flex h-12 sm:h-14 items-center justify-center rounded-full bg-foreground px-8 text-sm sm:text-base font-semibold text-background shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                    Read all reviews
                </Link>
            </div>
        </section>
    );
};

export default UserReviews;
