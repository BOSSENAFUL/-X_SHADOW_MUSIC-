import { NextResponse } from 'next/server';
import { getGenreModel } from '@/models/Genre';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes — genres rarely change

/**
 * GET /api/genres
 *
 * Returns all genres from the `playlists` DB, sorted by `order` then `name`.
 *
 * Response:
 *   { success: true, data: Genre[], count: number }
 */
export async function GET() {
    try {
        const genres = await cache.cachedQuery(
            'genres:all',
            async () => {
                const Genre = await getGenreModel();
                return Genre.find().sort({ order: 1, name: 1 }).lean();
            },
            CACHE_TTL
        );

        const data = genres.map((g) => ({ ...g, _id: g._id.toString() }));

        return NextResponse.json(
            { success: true, data, count: data.length },
            { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120' } }
        );
    } catch (error) {
        console.error('Error fetching genres:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch genres' },
            { status: 500 }
        );
    }
}
