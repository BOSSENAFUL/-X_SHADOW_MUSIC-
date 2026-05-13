import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/spotify-playlists
 *
 * Returns playlists from the `playlists` DB with optional filtering.
 * Provide at least `genreId` or `sectionId` for a focused query.
 *
 * Query params:
 *   genreId    (optional) — filter by genre
 *   sectionId  (optional) — filter by section (takes precedence over genreId)
 *   limit      (optional, default 50, max 100)
 *   page       (optional, default 0)
 *
 * Note: `trackMap` and `songIds` are excluded from list responses.
 * Fetch a single playlist by ID to get those fields.
 *
 * Response:
 *   { success: true, data: SpotifyPlaylist[], count, total, page, hasMore }
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const genreId = searchParams.get('genreId');
        const sectionId = searchParams.get('sectionId');
        const page = Math.max(0, parseInt(searchParams.get('page')) || 0);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 50));
        const skip = page * limit;

        if (genreId && !mongoose.Types.ObjectId.isValid(genreId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid genreId' },
                { status: 400 }
            );
        }
        if (sectionId && !mongoose.Types.ObjectId.isValid(sectionId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid sectionId' },
                { status: 400 }
            );
        }

        // sectionId is more specific — it takes precedence
        const filter = {};
        if (sectionId) filter.sectionId = sectionId;
        else if (genreId) filter.genreId = genreId;

        const cacheKey = `spotify-playlists:${sectionId ?? ''}:${genreId ?? ''}:${page}:${limit}`;

        const result = await cache.cachedQuery(
            cacheKey,
            async () => {
                const SpotifyPlaylist = await getSpotifyPlaylistModel();

                const [total, playlists] = await Promise.all([
                    SpotifyPlaylist.countDocuments(filter),
                    SpotifyPlaylist.find(filter)
                        .select('-trackMap -songIds')
                        .sort({ order: 1 })
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                ]);

                return { total, playlists };
            },
            CACHE_TTL
        );

        const data = result.playlists.map((p) => ({
            ...p,
            _id: p._id.toString(),
            sectionId: p.sectionId.toString(),
            genreId: p.genreId.toString(),
        }));

        return NextResponse.json(
            {
                success: true,
                data,
                count: data.length,
                total: result.total,
                page,
                hasMore: skip + data.length < result.total,
            },
            { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120' } }
        );
    } catch (error) {
        console.error('Error fetching spotify playlists:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch playlists' },
            { status: 500 }
        );
    }
}
