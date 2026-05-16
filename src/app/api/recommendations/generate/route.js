import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { generateMixesForUser, getMixesForUser } from '@/lib/recommendations';

/**
 * POST /api/recommendations/generate
 *
 * Manual trigger — user taps "Refresh" in the UI.
 * Respects the 1-hour rate limit unless ?force=true (admin only).
 */
export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const forceRefresh = searchParams.get('force') === 'true' && session.user.role === 'admin';

        const result = await generateMixesForUser(session.user.id, forceRefresh);

        if (result.reason === 'rate_limited') {
            return NextResponse.json(
                { success: false, error: 'Please wait before refreshing again.', rateLimited: true },
                { status: 429 }
            );
        }

        if (result.reason === 'insufficient_data') {
            return NextResponse.json({
                success: true,
                data: [],
                meta: result,
                message: 'Not enough liked songs to generate mixes. Save some songs first!',
            });
        }

        const mixes = await getMixesForUser(session.user.id);

        return NextResponse.json({
            success: true,
            data: mixes,
            meta: result,
        });
    } catch (error) {
        console.error('[Recommendations] Generate error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate recommendations' }, { status: 500 });
    }
}
