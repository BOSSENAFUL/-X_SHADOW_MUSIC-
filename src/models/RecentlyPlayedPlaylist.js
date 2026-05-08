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
        playlistId: { type: String, required: true },
        playlistName: { type: String, required: true },
        image: [{ quality: String, url: String }],
        songCount: { type: Number, default: 0 },
        source: { type: String, enum: ['jiosaavn', 'user'], default: 'jiosaavn' },
        owner: { type: String, default: '' },
        playedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const recentlyPlayedPlaylistSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
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
 * Uses two targeted operations instead of a full document save:
 *   1. $pull  — remove any existing entry for the same playlistId (de-duplicate)
 *   2. $push  — prepend the new entry and cap the array at 50
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

    // Step 1: Ensure the document exists and remove any duplicate entry
    await this.updateOne(
        { userId },
        { $pull: { playlists: { playlistId: newEntry.playlistId } } },
        { upsert: true }
    );

    // Step 2: Prepend the new entry and cap at 50
    const updated = await this.findOneAndUpdate(
        { userId },
        {
            $push: {
                playlists: {
                    $each: [newEntry],
                    $position: 0,
                    $slice: 50,
                },
            },
        },
        { new: true, upsert: true }
    );

    return updated;
};

/**
 * Get the recently played playlists for a user (newest first).
 */
recentlyPlayedPlaylistSchema.statics.getForUser = async function (userId) {
    const doc = await this.findOne({ userId }).lean();
    return doc?.playlists || [];
};

/**
 * Clear recently played history for a user.
 */
recentlyPlayedPlaylistSchema.statics.clearForUser = async function (userId) {
    await this.findOneAndUpdate(
        { userId },
        { $set: { playlists: [] } },
        { upsert: true }
    );
};

/**
 * Remove a specific playlist from the recently played list for a user.
 */
recentlyPlayedPlaylistSchema.statics.removePlaylistForUser = async function (userId, playlistId) {
    await this.findOneAndUpdate(
        { userId },
        { $pull: { playlists: { playlistId } } },
        { new: true }
    );
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

// Guard against model re-registration during hot-reload
let RecentlyPlayedPlaylist;
if (mongoose.models.RecentlyPlayedPlaylist) {
    RecentlyPlayedPlaylist = mongoose.models.RecentlyPlayedPlaylist;
    if (!RecentlyPlayedPlaylist.removePlaylistForUser) {
        RecentlyPlayedPlaylist.removePlaylistForUser =
            recentlyPlayedPlaylistSchema.statics.removePlaylistForUser;
    }
} else {
    RecentlyPlayedPlaylist = mongoose.model(
        'RecentlyPlayedPlaylist',
        recentlyPlayedPlaylistSchema
    );
}

export default RecentlyPlayedPlaylist;
