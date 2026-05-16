import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import RecommendedMix from '@/models/RecommendedMix';
import mongoose from 'mongoose';
import {
    getMixesForUser,
    generateMixesForUser,
    needsRegeneration,
    fixMissingCoverImages,
} from '@/lib/recommendations';

/**
 * GET /api/recommendations
 * Returns cached mixes immediately. coverImage is stored in the DB — never changes on reload.
 * Triggers background refresh if stale/missing.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const userObjId = new mongoose.Types.ObjectId(userId);
        const mixes = await getMixesForUser(userId);

        // Background tasks — never block the response
        (async () => {
            try {
                // 1. First try to fix missing cover images (lightweight — no API rate limit)
                await fixMissingCoverImages(userObjId);

                // 2. Only do a full regeneration if really needed
                const shouldRefresh = mixes.length === 0 || (await needsRegeneration(userId));
                if (shouldRefresh) {
                    await generateMixesForUser(userId);
                }
            } catch (err) {
                console.error('[Recommendations] Background refresh error:', err);
            }
        })();

        return NextResponse.json({ success: true, data: mixes });
    } catch (error) {
        console.error('[Recommendations] GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch recommendations' }, { status: 500 });
    }
}

/**
 * DELETE /api/recommendations
 * Wipes all mixes for the user and regenerates fresh ones.
 * Respects the rate limit — no force refresh for manual button clicks.
 */
export async function DELETE() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const userObjId = new mongoose.Types.ObjectId(userId);

        await connectDB();

        // Check rate limit BEFORE deleting
        const recentAttempt = await RecommendedMix.findOne({
            userId: userObjId,
            lastGenerationAttempt: { $gt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        }).lean();

        if (recentAttempt) {
            const retryAfter = Math.ceil(
                (recentAttempt.lastGenerationAttempt.getTime() + 6 * 60 * 60 * 1000 - Date.now()) / 1000
            );
            return NextResponse.json(
                {
                    success: false,
                    error: `Please wait ${Math.ceil(retryAfter / 3600)}h before refreshing again.`,
                    rateLimited: true,
                    retryAfter,
                },
                { status: 429 }
            );
        }

        await RecommendedMix.deleteMany({ userId: userObjId });
        const result = await generateMixesForUser(userId, true);
        await fixMissingCoverImages(userObjId);

        if (result.reason === 'insufficient_data') {
            return NextResponse.json({
                success: true,
                data: [],
                message: 'Not enough liked songs to generate mixes. Save some songs first!',
            });
        }

        const mixes = await getMixesForUser(userId);
        return NextResponse.json({ success: true, data: mixes, meta: result });
    } catch (error) {
        console.error('[Recommendations] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Failed to refresh recommendations' }, { status: 500 });
    }
}
