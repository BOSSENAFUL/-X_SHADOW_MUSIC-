import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSectionModel } from '@/models/Section';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/sections/[id]
 *
 * Returns a single section together with its playlists (sorted by `order`).
 * `trackMap` and `songIds` are excluded from the playlist list to keep
 * payloads small — fetch a single playlist by ID to get those fields.
 *
 * Response:
 *   { success: true, data: { section: Section, playlists: SpotifyPlaylist[] } }
 */
export async function GET(_request, { params }) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid section ID' },
                { status: 400 }
            );
        }

        const result = await cache.cachedQuery(
            `section:${id}`,
            async () => {
                const [Section, SpotifyPlaylist] = await Promise.all([
                    getSectionModel(),
                    getSpotifyPlaylistModel(),
                ]);

                const [section, playlists] = await Promise.all([
                    Section.findById(id).lean(),
                    SpotifyPlaylist.find({ sectionId: id })
                        .select('-trackMap -songIds')
                        .sort({ order: 1 })
                        .lean(),
                ]);

                return section ? { section, playlists } : null;
            },
            CACHE_TTL
        );

        if (!result) {
            return NextResponse.json(
                { success: false, error: 'Section not found' },
                { status: 404 }
            );
        }

        const data = {
            section: {
                ...result.section,
                _id: result.section._id.toString(),
                genreId: result.section.genreId.toString(),
            },
            playlists: result.playlists.map((p) => ({
                ...p,
                _id: p._id.toString(),
                sectionId: p.sectionId.toString(),
                genreId: p.genreId.toString(),
            })),
        };

        return NextResponse.json(
            { success: true, data },
            { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120' } }
        );
    } catch (error) {
        console.error('Error fetching section:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch section' },
            { status: 500 }
        );
    }
}
