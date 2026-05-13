import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSectionModel } from '@/models/Section';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/sections
 *
 * Returns sections from the `playlists` DB, optionally filtered by genre.
 *
 * Query params:
 *   genreId  (optional) — filter sections belonging to a specific genre
 *
 * Response:
 *   { success: true, data: Section[], count: number }
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const genreId = searchParams.get('genreId');

        if (genreId && !mongoose.Types.ObjectId.isValid(genreId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid genreId' },
                { status: 400 }
            );
        }

        const cacheKey = genreId ? `sections:genre:${genreId}` : 'sections:all';

        const sections = await cache.cachedQuery(
            cacheKey,
            async () => {
                const Section = await getSectionModel();
                const filter = genreId ? { genreId } : {};
                return Section.find(filter).sort({ order: 1 }).lean();
            },
            CACHE_TTL
        );

        const data = sections.map((s) => ({
            ...s,
            _id: s._id.toString(),
            genreId: s.genreId.toString(),
        }));

        return NextResponse.json(
            { success: true, data, count: data.length },
            { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120' } }
        );
    } catch (error) {
        console.error('Error fetching sections:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch sections' },
            { status: 500 }
        );
    }
}
