import connectPlaylistsDB from '@/lib/mongodbPlaylists';
import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        genreId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Genre',
            required: true,
            index: true,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Efficient lookup: all sections for a genre, sorted by order
sectionSchema.index({ genreId: 1, order: 1 });

/**
 * Returns the Section model bound to the `playlists` database connection.
 * Call this inside every route handler (after awaiting connectPlaylistsDB).
 */
export async function getSectionModel() {
    const conn = await connectPlaylistsDB();
    return conn.models.Section ?? conn.model('Section', sectionSchema);
}
