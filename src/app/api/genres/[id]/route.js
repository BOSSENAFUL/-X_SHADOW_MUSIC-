import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getGenreModel } from '@/models/Genre';
import { getSectionModel } from '@/models/Section';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/genres/[id]
 *
 * Returns a single genre together with its sections (sorted by `order`).
 *
 * Response:
 *   { success: true, data: { genre: Genre, sections: Section[] } }
 */
export async function GET(_request, { params }) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid genre ID' },
                { status: 400 }
            );
        }

        const result = await cache.cachedQuery(
            `genre:${id}`,
            async () => {
                const [Genre, Section] = await Promise.all([getGenreModel(), getSectionModel()]);

                const [genre, sections] = await Promise.all([
                    Genre.findById(id).lean(),
                    Section.find({ genreId: id }).sort({ order: 1 }).lean(),
                ]);

                return genre ? { genre, sections } : null;
            },
            CACHE_TTL
        );

        if (!result) {
            return NextResponse.json(
                { success: false, error: 'Genre not found' },
                { status: 404 }
            );
        }

        const data = {
            genre: { ...result.genre, _id: result.genre._id.toString() },
            sections: result.sections.map((s) => ({
                ...s,
                _id: s._id.toString(),
                genreId: s.genreId.toString(),
            })),
        };

        return NextResponse.json(
            { success: true, data },
            { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120' } }
        );
    } catch (error) {
        console.error('Error fetching genre:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch genre' },
            { status: 500 }
        );
    }
}
