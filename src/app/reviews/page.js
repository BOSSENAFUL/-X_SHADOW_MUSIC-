"use client";

import { useEffect, useState } from 'react';
import { Star, User, ArrowLeft, MessageSquareQuote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ReviewsPage() {
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

    // Split reviews by length threshold (e.g., 200 characters)
    const SHORTER_REVIEWS_THRESHOLD = 200;
    const shortReviews = ratings.filter(r => (r.comment?.length || 0) <= SHORTER_REVIEWS_THRESHOLD);
    const longReviews = ratings.filter(r => (r.comment?.length || 0) > SHORTER_REVIEWS_THRESHOLD);

    const averageRating = ratings.length > 0
        ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
        : 0;

    // Formatter to make long text much easier to read by detecting numbers or respecting newlines
    const formatReviewText = (text) => {
        if (!text) return "An incredible experience.";
        
        if (text.match(/\b\d+\.\s/)) {
            const parts = text.split(/(?=\b\d+\.\s)/).filter(Boolean);
            return parts.map((part, i) => (
                <span key={i} className="block mb-4 last:mb-0 text-foreground/80 leading-relaxed md:leading-loose">
                    {part.trim()}
                </span>
            ));
        }
        
        return <span className="block whitespace-pre-line text-foreground/80 leading-relaxed md:leading-loose">{text}</span>;
    };

    return (
        <div className="min-h-svh bg-background text-foreground selection:bg-primary/20 pt-20 pb-16 px-4 sm:px-6 md:px-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10 sm:mb-16">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6 group">
                        <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tighter text-foreground">
                        All Reviews
                    </h1>
                    <p className="text-muted-foreground text-lg sm:text-xl mt-4 max-w-2xl font-light leading-relaxed">
                        Read what our community of listeners has to say about their experience with Jammify.
                    </p>
                </div>

                {!loading && ratings.length > 0 && (
                    <div className="mb-12 p-6 sm:p-8 bg-neutral-950/40 backdrop-blur-md border border-white/5 rounded-[28px] flex flex-col sm:flex-row items-center gap-6 sm:gap-8 shadow-xl max-w-md">
                        <div className="flex flex-col items-center sm:border-r border-white/10 sm:pr-8">
                            <div className="text-5xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                                {averageRating.toFixed(1)}
                            </div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">out of 5</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-start gap-1.5">
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-5 h-5 ${star <= Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "text-muted/20"}`}
                                    />
                                ))}
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">Based on {ratings.length} global reviews</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="flex w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-sm shadow-primary/50"></div>
                    </div>
                ) : ratings.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-20 border border-border/10 rounded-3xl py-24 bg-foreground/2">
                        <p className="text-lg font-light">No reviews found.</p>
                    </div>
                ) : (
                    <>
                        {/* Short Reviews Grid - Now horizontal and perfectly aligned since huge items are removed */}
                        {shortReviews.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                                {shortReviews.map((rating, index) => (
                                    <motion.div
                                        key={`short-${rating._id || index}`}
                                        initial={{ opacity: 0, scale: 0.98, y: 15 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                        className="bg-foreground/2 border border-foreground/10 rounded-[28px] p-6 flex flex-col hover:bg-foreground/5 transition-colors duration-300 shadow-sm h-full"
                                    >
                                        <div className="flex-1 space-y-5">
                                            <div className="flex gap-1 mb-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-4 h-4 sm:w-5 sm:h-5 ${rating.rating >= star ? "fill-amber-400 text-amber-400" : "text-muted/30"}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-sm sm:text-base text-foreground/80 leading-relaxed font-light italic wrap-break-word">
                                                "{rating.comment || "An incredible experience."}"
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-6">
                                            <Avatar className="w-10 h-10 border border-border/10 bg-background/50">
                                                <AvatarImage
                                                    src={rating.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${rating.user?.name || "User"}`}
                                                    alt={rating.user?.name || "User"}
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="bg-muted"><User className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground tracking-tight line-clamp-1">{rating.user?.name || "Anonymous Listener"}</span>
                                                <span className="text-xs text-muted-foreground font-light">Verified User</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Long Form Reviews Section */}
                        {longReviews.length > 0 && (
                            <div className="mt-16 sm:mt-24">
                                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tighter text-foreground mb-8">
                                    In-Depth Feedback
                                </h2>
                                <div className="flex flex-col gap-6 sm:gap-8">
                                    {longReviews.map((rating, index) => (
                                        <motion.div
                                            key={`long-${rating._id || index}`}
                                            initial={{ opacity: 0, scale: 0.98, y: 15 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                            className="relative bg-foreground/2 border border-foreground/10 rounded-[28px] p-6 sm:p-10 flex flex-col md:flex-row gap-8 hover:bg-foreground/5 transition-colors duration-300 overflow-hidden w-full shadow-md"
                                        >
                                            <MessageSquareQuote className="absolute -top-4 -right-4 w-24 h-24 text-primary/5 -rotate-12 pointer-events-none" />
                                            
                                            {/* User Info Side (Left on Desktop, Top on Mobile) */}
                                            <div className="flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-3 md:min-w-[140px] md:pr-6 md:border-r border-border/10">
                                                <Avatar className="w-12 h-12 md:w-16 md:h-16 border border-border/20 bg-background shadow-sm">
                                                    <AvatarImage
                                                        src={rating.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${rating.user?.name || "User"}`}
                                                        alt={rating.user?.name || "User"}
                                                        className="object-cover"
                                                    />
                                                    <AvatarFallback className="bg-muted"><User className="w-6 h-6 text-muted-foreground" /></AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col md:mt-2">
                                                    <span className="text-sm md:text-base font-medium text-foreground tracking-tight">{rating.user?.name || "Anonymous"}</span>
                                                    <span className="text-xs text-muted-foreground font-light">Verified User</span>
                                                </div>
                                            </div>

                                            {/* Review Content Side */}
                                            <div className="flex-1 space-y-4 md:space-y-6">
                                                <div className="flex gap-1 justify-start">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={`w-5 h-5 md:w-6 md:h-6 ${rating.rating >= star ? "fill-amber-400 text-amber-400" : "text-muted/30"}`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="text-base sm:text-lg font-light italic wrap-break-word">
                                                    {formatReviewText(rating.comment)}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
