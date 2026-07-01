import connectPlaylistsDB from '@/lib/mongodbPlaylists';
import mongoose from 'mongoose';

const sectionPlaylistSchema = new mongoose.Schema(
    {
        sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: true,
            index: true,
        },
        playlistId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SpotifyPlaylist',
            required: true,
            index: true,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true, collection: 'sectionplaylists' }
);

// Compound index for fast lookup of a playlist within a section, and sorting
sectionPlaylistSchema.index({ sectionId: 1, order: 1 });

/**
 * Returns the SectionPlaylist model bound to the `playlists` database connection.
 * Call this inside every route handler (after awaiting connectPlaylistsDB).
 */
export async function getSectionPlaylistModel() {
    const conn = await connectPlaylistsDB();
    return conn.models.SectionPlaylist ?? conn.model('SectionPlaylist', sectionPlaylistSchema);
}
