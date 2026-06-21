import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import { getSectionPlaylistModel } from '@/models/SectionPlaylist';
import { getSectionModel } from '@/models/Section';
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

        const cacheKey = `spotify-playlists:${sectionId ?? ''}:${genreId ?? ''}:${page}:${limit}`;

        const result = await cache.cachedQuery(
            cacheKey,
            async () => {
                const [SpotifyPlaylist, SectionPlaylist, Section] = await Promise.all([
                    getSpotifyPlaylistModel(),
                    getSectionPlaylistModel(),
                    getSectionModel(),
                ]);

                if (sectionId) {
                    const junctions = await SectionPlaylist.find({ sectionId })
                        .sort({ order: 1 })
                        .lean();

                    const uniqueJunctions = [];
                    const seenPids = new Set();
                    for (const j of junctions) {
                        const pidStr = j.playlistId.toString();
                        if (!seenPids.has(pidStr)) {
                            seenPids.add(pidStr);
                            uniqueJunctions.push(j);
                        }
                    }

                    const total = uniqueJunctions.length;
                    const slicedJunctions = uniqueJunctions.slice(skip, skip + limit);

                    const playlistIds = slicedJunctions.map((j) => j.playlistId);
                    const playlists = await SpotifyPlaylist.find({ _id: { $in: playlistIds } })
                        .select('-trackMap -songIds')
                        .lean();

                    const playlistMap = new Map(playlists.map((p) => [p._id.toString(), p]));
                    const orderedPlaylists = slicedJunctions
                        .map((j) => {
                            const p = playlistMap.get(j.playlistId.toString());
                            if (!p) return null;
                            return { ...p, sectionId };
                        })
                        .filter(Boolean);

                    return { total, playlists: orderedPlaylists };
                } else if (genreId) {
                    const sections = await Section.find({ genreId }).select('_id').lean();
                    const sectionIds = sections.map((s) => s._id);

                    const junctions = await SectionPlaylist.find({ sectionId: { $in: sectionIds } })
                        .sort({ order: 1 })
                        .lean();

                    const uniqueJunctions = [];
                    const seenPids = new Set();
                    for (const j of junctions) {
                        const pidStr = j.playlistId.toString();
                        if (!seenPids.has(pidStr)) {
                            seenPids.add(pidStr);
                            uniqueJunctions.push(j);
                        }
                    }

                    const total = uniqueJunctions.length;
                    const slicedJunctions = uniqueJunctions.slice(skip, skip + limit);

                    const playlistIds = slicedJunctions.map((j) => j.playlistId);
                    const playlists = await SpotifyPlaylist.find({ _id: { $in: playlistIds } })
                        .select('-trackMap -songIds')
                        .lean();

                    const playlistMap = new Map(playlists.map((p) => [p._id.toString(), p]));
                    const orderedPlaylists = slicedJunctions
                        .map((j) => {
                            const p = playlistMap.get(j.playlistId.toString());
                            if (!p) return null;
                            return { ...p, sectionId: j.sectionId.toString() };
                        })
                        .filter(Boolean);

                    return { total, playlists: orderedPlaylists };
                } else {
                    const [total, playlists] = await Promise.all([
                        SpotifyPlaylist.countDocuments({}),
                        SpotifyPlaylist.find({})
                            .select('-trackMap -songIds')
                            .sort({ order: 1 })
                            .skip(skip)
                            .limit(limit)
                            .lean(),
                    ]);
                    return { total, playlists };
                }
            },
            CACHE_TTL
        );

        let genreIdMap = new Map();
        if (result.playlists.length > 0) {
            const Section = await getSectionModel();
            const uniqueSectionIds = [...new Set(result.playlists.map(p => p.sectionId).filter(Boolean))];
            const sections = await Section.find({ _id: { $in: uniqueSectionIds } }).select('_id genreId').lean();
            genreIdMap = new Map(sections.map(s => [s._id.toString(), s.genreId.toString()]));
        }

        const data = result.playlists.map((p) => {
            const secId = p.sectionId ? p.sectionId.toString() : '';
            return {
                ...p,
                _id: p._id.toString(),
                sectionId: secId,
                genreId: genreIdMap.get(secId) || (p.genreId ? p.genreId.toString() : ''),
            };
        });

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
