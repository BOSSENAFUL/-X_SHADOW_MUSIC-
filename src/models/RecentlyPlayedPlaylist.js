import mongoose from 'mongoose';

/**
 * RecentlyPlayedPlaylist Model
 *
 * Tracks the last 50 playlists a user has played, covering both:
 *   - External / JioSaavn playlists  (source: 'jiosaavn')
 *   - User-created app playlists     (source: 'user')
 *
 * One document per user stores an ordered array of up to 50 playlist entries.
 * The most recently played playlist is always at index 0.
 */

const recentPlaylistEntrySchema = new mongoose.Schema(
    {
        // The playlist identifier (JioSaavn ID string or MongoDB ObjectId string)
        playlistId: {
            type: String,
            required: true,
        },

        // Human-readable playlist name
        playlistName: {
            type: String,
            required: true,
        },

        // Cover image array – same format used across the app
        // e.g. [{ quality: '500x500', url: '...' }, ...]
        image: [
            {
                quality: String,
                url: String,
            },
        ],

        // Number of songs in the playlist at the time it was played
        songCount: {
            type: Number,
            default: 0,
        },

        // 'jiosaavn' | 'user'
        source: {
            type: String,
            enum: ['jiosaavn', 'user'],
            default: 'jiosaavn',
        },

        // Optional: owner / subtitle (e.g. "JioSaavn" or the creator's name)
        owner: {
            type: String,
            default: '',
        },

        // When this playlist was last opened
        playedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false } // sub-documents don't need their own _id
);

const recentlyPlayedPlaylistSchema = new mongoose.Schema(
    {
        // One document per user
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },

        // Ordered list of recently played playlists (newest first, max 50)
        playlists: {
            type: [recentPlaylistEntrySchema],
            default: [],
        },
    },
    { timestamps: true }
);

/* ------------------------------------------------------------------ */
/*  Static methods                                                      */
/* ------------------------------------------------------------------ */

/**
 * Track a playlist visit for a user.
 *
 * Algorithm:
 *   1. Remove any existing entry for the same playlistId (de-duplicate).
 *   2. Prepend the new entry at the front of the array.
 *   3. Slice to keep only the 5 most recent entries.
 *   4. Upsert the document for the user.
 *
 * @param {string|ObjectId} userId
 * @param {Object} playlistData
 * @param {string}  playlistData.id          – playlist ID (JioSaavn or MongoDB)
 * @param {string}  playlistData.name        – playlist name
 * @param {Array}   [playlistData.image]     – image array
 * @param {number}  [playlistData.songCount] – song count
 * @param {string}  [playlistData.source]    – 'jiosaavn' | 'user'
 * @param {string}  [playlistData.owner]     – owner / subtitle
 * @returns {Promise<Object>} The updated RecentlyPlayedPlaylist document
 */
recentlyPlayedPlaylistSchema.statics.track = async function (userId, playlistData) {
    const newEntry = {
        playlistId: playlistData.id,
        playlistName: playlistData.name || 'Unknown Playlist',
        image: playlistData.image || [],
        songCount: playlistData.songCount || 0,
        source: playlistData.source || 'jiosaavn',
        owner: playlistData.owner || '',
        playedAt: new Date(),
    };

    // Use findOneAndUpdate with arrayFilters for an atomic upsert
    // Step 1 – pull any duplicate entry for the same playlistId
    // Step 2 – push the new entry to the front
    // Step 3 – slice to cap at 5

    const doc = await this.findOneAndUpdate(
        { userId },
        {
            // Pull any existing entry with the same playlistId first
            $pull: { playlists: { playlistId: newEntry.playlistId } },
        },
        { new: true, upsert: true }
    );

    // After removing the duplicate, push to front and cap
    const updated = await this.findOneAndUpdate(
        { userId },
        {
            $push: {
                playlists: {
                    $each: [newEntry],
                    $position: 0,  // insert at the front
                    $slice: 50,     // keep only the 50 most recent
                },
            },
        },
        { new: true, upsert: true }
    );

    return updated;
};

/**
 * Get the recently played playlists for a user (newest first).
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<Array>} Array of playlist entry objects (max 5)
 */
recentlyPlayedPlaylistSchema.statics.getForUser = async function (userId) {
    const doc = await this.findOne({ userId }).lean();
    return doc?.playlists || [];
};

/**
 * Clear recently played history for a user.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<void>}
 */
recentlyPlayedPlaylistSchema.statics.clearForUser = async function (userId) {
    await this.findOneAndUpdate({ userId }, { $set: { playlists: [] } }, { upsert: true });
};

/* ------------------------------------------------------------------ */
/*  Instance method – toJSON                                            */
/* ------------------------------------------------------------------ */
recentlyPlayedPlaylistSchema.methods.toJSON = function () {
    const obj = this.toObject();
    return {
        id: obj._id,
        userId: obj.userId,
        playlists: obj.playlists,
        updatedAt: obj.updatedAt,
    };
};

// Force refresh the model to pick up schema changes (like the new 50-item limit)
if (mongoose.models.RecentlyPlayedPlaylist) {
    delete mongoose.models.RecentlyPlayedPlaylist;
}

const RecentlyPlayedPlaylist = mongoose.model('RecentlyPlayedPlaylist', recentlyPlayedPlaylistSchema);

export default RecentlyPlayedPlaylist;
