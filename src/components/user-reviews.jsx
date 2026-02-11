'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

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
        <section className="w-full py-12 md:py-24 lg:py-32 overflow-hidden bg-background">
            <div className="container px-4 md:px-6 mx-auto mb-10 text-center">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">What our users say</h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400 mt-4">
                    See why thousands of users love Jammify.
                </p>
            </div>

            <div className="relative w-full overflow-hidden ">
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-background to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-background to-transparent z-10" />

                <div className="flex w-full overflow-hidden">
                    <motion.div
                        className="flex gap-6 py-4"
                        animate={{
                            x: ratings.length > 3 ? ["0%", "-50%"] : "0%",
                        }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: ratings.length * 5, // Adjust speed based on number of items
                                ease: "linear",
                            },
                        }}
                        style={{ width: ratings.length > 3 ? "200%" : "auto", display: 'flex', justifyContent: ratings.length > 3 ? 'flex-start' : 'center' }}
                    >
                        {displayRatings.map((rating, index) => (
                            <Card key={`${rating._id}-${index}`} className="shrink-0 w-[300px] md:w-[350px] bg-card/50 backdrop-blur-sm border-gray-200 dark:border-gray-800">
                                <CardContent className="p-6 h-full flex flex-col justify-between gap-4">
                                    <div className="space-y-4">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    className={`w-4 h-4 ${rating.rating >= star ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 min-h-[60px] italic">
                                            "{rating.comment || "No comment provided."}"
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <Avatar className="w-8 h-8 border border-gray-200 dark:border-gray-700">
                                            <AvatarImage
                                                src={rating.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${rating.user?.name || "User"}`}
                                                alt={rating.user?.name || "User"}
                                            />
                                            <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">{rating.user?.name || "Anonymous User"}</span>
                                            <span className="text-xs text-gray-500">Verified User</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default UserReviews;
