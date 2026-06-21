import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getGenreModel } from '@/models/Genre';
import { getSectionModel } from '@/models/Section';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import { getSectionPlaylistModel } from '@/models/SectionPlaylist';
import { getOrExtractColor } from '@/lib/colorExtractor';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

/**
 * GET /api/genres/[id]
 *
 * Returns a single genre together with its sections (sorted by `order`) and dynamic color.
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
            `genre:${id}:with_cover_color`,
            async () => {
                const [Genre, Section, SpotifyPlaylist, SectionPlaylist] = await Promise.all([
                    getGenreModel(),
                    getSectionModel(),
                    getSpotifyPlaylistModel(),
                    getSectionPlaylistModel(),
                ]);

                const [genre, sections] = await Promise.all([
                    Genre.findById(id).lean(),
                    Section.find({ genreId: id }).sort({ order: 1 }).lean(),
                ]);

                if (!genre) return null;

                let coverImage = '';
                const firstSection = sections[0];
                if (firstSection) {
                    const firstJunction = await SectionPlaylist.findOne({ sectionId: firstSection._id })
                        .sort({ order: 1 })
                        .lean();
                    if (firstJunction) {
                        const firstPlaylist = await SpotifyPlaylist.findById(firstJunction.playlistId)
                            .select('image')
                            .lean();
                        if (firstPlaylist && firstPlaylist.image) {
                            coverImage = firstPlaylist.image;
                        }
                    }
                }

                if (!coverImage && sections.length > 0) {
                    const sectionIds = sections.map(s => s._id);
                    const fallbackJunction = await SectionPlaylist.findOne({ sectionId: { $in: sectionIds } })
                        .sort({ order: 1 })
                        .lean();
                    if (fallbackJunction) {
                        const fallbackPlaylist = await SpotifyPlaylist.findById(fallbackJunction.playlistId)
                            .select('image')
                            .lean();
                        if (fallbackPlaylist && fallbackPlaylist.image) {
                            coverImage = fallbackPlaylist.image;
                        }
                    }
                }

                const dynamicColor = await getOrExtractColor(coverImage, genre.color || '#1DB954');

                return {
                    genre: {
                        ...genre,
                        color: dynamicColor,
                    },
                    sections,
                };
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
