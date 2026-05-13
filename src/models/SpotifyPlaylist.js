import connectPlaylistsDB from '@/lib/mongodbPlaylists';
import mongoose from 'mongoose';

const spotifyPlaylistSchema = new mongoose.Schema(
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
        image: {
            type: String,
            default: '',
            trim: true,
        },
        sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section',
            required: true,
            index: true,
        },
        genreId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Genre',
            required: true,
            index: true,
        },
        sourceUrl: {
            type: String,
            default: '',
            trim: true,
        },
        sourceType: {
            type: String,
            enum: ['spotify', 'jiosaavn', 'manual'],
            default: 'spotify',
        },
        // Internal song IDs (mapped from Spotify track IDs)
        songIds: [{ type: String }],
        songCount: {
            type: Number,
            default: 0,
        },
        // Spotify track ID → internal song ID mapping
        trackMap: {
            type: Map,
            of: String,
            default: {},
        },
        lastSyncedAt: {
            type: Date,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true, collection: 'playlists' }
);

// Efficient lookups by section and genre
spotifyPlaylistSchema.index({ sectionId: 1, order: 1 });
spotifyPlaylistSchema.index({ genreId: 1, order: 1 });

/**
 * Returns the SpotifyPlaylist model bound to the `playlists` database connection.
 * Call this inside every route handler (after awaiting connectPlaylistsDB).
 */
export async function getSpotifyPlaylistModel() {
    const conn = await connectPlaylistsDB();
    return conn.models.SpotifyPlaylist ?? conn.model('SpotifyPlaylist', spotifyPlaylistSchema);
}
