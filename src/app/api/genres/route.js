import { NextResponse } from 'next/server';
import { getGenreModel } from '@/models/Genre';
import { getSectionModel } from '@/models/Section';
import { getSpotifyPlaylistModel } from '@/models/SpotifyPlaylist';
import { getSectionPlaylistModel } from '@/models/SectionPlaylist';
import { getOrExtractColor } from '@/lib/colorExtractor';
import cache from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes — genres rarely change

/**
 * GET /api/genres
 *
 * Returns all genres from the `playlists` DB, sorted by `order` then `name`,
 * populated with their first playlist's cover art as `coverImage` and dynamic `color`.
 *
 * Response:
 *   { success: true, data: Genre[], count: number }
 */
export async function GET() {
    try {
        const genres = await cache.cachedQuery(
            'genres:all:with_covers',
            async () => {
                const Genre = await getGenreModel();
                const Section = await getSectionModel();
                const SpotifyPlaylist = await getSpotifyPlaylistModel();
                const SectionPlaylist = await getSectionPlaylistModel();

                const rawGenres = await Genre.find().sort({ order: 1, name: 1 }).lean();

                const genresWithCovers = await Promise.all(
                    rawGenres.map(async (genre) => {
                        let coverImage = '';

                        const sections = await Section.find({ genreId: genre._id })
                            .sort({ order: 1 })
                            .lean();

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
                            ...genre,
                            coverImage,
                            color: dynamicColor,
                        };
                    })
                );

                return genresWithCovers;
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
