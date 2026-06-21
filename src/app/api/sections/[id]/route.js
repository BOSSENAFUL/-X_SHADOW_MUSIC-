import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSectionModel } from '@/models/Section';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import { getSectionPlaylistModel } from '@/models/SectionPlaylist';
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
                const [Section, SpotifyPlaylist, SectionPlaylist] = await Promise.all([
                    getSectionModel(),
                    getSpotifyPlaylistModel(),
                    getSectionPlaylistModel(),
                ]);

                const section = await Section.findById(id).lean();
                if (!section) return null;

                const junctions = await SectionPlaylist.find({ sectionId: id })
                    .sort({ order: 1 })
                    .lean();

                const playlistIds = junctions.map((j) => j.playlistId);
                const playlists = await SpotifyPlaylist.find({ _id: { $in: playlistIds } })
                    .select('-trackMap -songIds')
                    .lean();

                const playlistMap = new Map(playlists.map((p) => [p._id.toString(), p]));
                const seenPlaylistIds = new Set();
                const orderedPlaylists = junctions
                    .map((j) => {
                        const pidStr = j.playlistId.toString();
                        if (seenPlaylistIds.has(pidStr)) return null;

                        const playlist = playlistMap.get(pidStr);
                        if (!playlist) return null;

                        seenPlaylistIds.add(pidStr);
                        return {
                            ...playlist,
                            sectionId: id,
                        };
                    })
                    .filter(Boolean);

                return { section, playlists: orderedPlaylists };
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
                sectionId: id,
                genreId: result.section.genreId.toString(),
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
