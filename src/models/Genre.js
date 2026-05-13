import connectPlaylistsDB from '@/lib/mongodbPlaylists';
import mongoose from 'mongoose';

const genreSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        color: {
            type: String,
            default: '#1DB954',
            trim: true,
        },
        order: {
            type: Number,
            default: 0,
            index: true,
        },
    },
    { timestamps: true }
);

// Efficient sorted listing
genreSchema.index({ order: 1, name: 1 });

/**
 * Returns the Genre model bound to the `playlists` database connection.
 * Call this inside every route handler (after awaiting connectPlaylistsDB).
 */
export async function getGenreModel() {
    const conn = await connectPlaylistsDB();
    return conn.models.Genre ?? conn.model('Genre', genreSchema);
}
