import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import { getSectionPlaylistModel } from '@/models/SectionPlaylist';
import { getSectionModel } from '@/models/Section';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/spotify-playlists/[id]
 *
 * Returns a single playlist with all fields, including `songIds` and
 * `trackMap` (needed by the player to resolve Spotify track IDs to
 * internal song IDs).
 *
 * Response:
 *   { success: true, data: SpotifyPlaylist }
 */
export async function GET(_request, { params }) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: 'Invalid playlist ID' },
                { status: 400 }
            );
        }

        const playlist = await cache.cachedQuery(
            `spotify-playlist:${id}`,
            async () => {
                const [SpotifyPlaylist, SectionPlaylist, Section] = await Promise.all([
                    getSpotifyPlaylistModel(),
                    getSectionPlaylistModel(),
                    getSectionModel(),
                ]);
                const p = await SpotifyPlaylist.findById(id).lean();
                if (!p) return null;

                if (!p.sectionId || !p.genreId) {
                    const spRelation = await SectionPlaylist.findOne({ playlistId: id }).lean();
                    if (spRelation) {
                        p.sectionId = spRelation.sectionId;
                        const sec = await Section.findById(spRelation.sectionId).lean();
                        if (sec) {
                            p.genreId = sec.genreId;
                        }
                    }
                }
                return p;
            },
            CACHE_TTL
        );

        if (!playlist) {
            return NextResponse.json(
                { success: false, error: 'Playlist not found' },
                { status: 404 }
            );
        }

        // Convert Map (trackMap) to a plain object for JSON serialisation
        const data = {
            ...playlist,
            _id: playlist._id.toString(),
            sectionId: playlist.sectionId ? playlist.sectionId.toString() : '',
            genreId: playlist.genreId ? playlist.genreId.toString() : '',
            trackMap:
                playlist.trackMap instanceof Map
                    ? Object.fromEntries(playlist.trackMap)
                    : playlist.trackMap ?? {},
        };

        return NextResponse.json(
            { success: true, data },
            { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120' } }
        );
    } catch (error) {
        console.error('Error fetching spotify playlist:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch playlist' },
            { status: 500 }
        );
    }
}
