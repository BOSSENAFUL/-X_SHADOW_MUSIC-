import mongoose from 'mongoose';

const likedSongSchema = new mongoose.Schema({
    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Song details from JioSaavn API
    songId: {
        type: String,
        required: true
    },

    songName: {
        type: String,
        required: true
    },

    artists: [{
        id: String,
        name: String,
        role: String
    }],

    album: {
        id: String,
        name: String
    },

    duration: {
        type: Number, // in seconds
        default: 0
    },

    image: [{
        quality: String,
        url: String
    }],

    releaseDate: {
        type: String
    },

    language: {
        type: String
    },

    // JioSaavn specific data
    playCount: {
        type: Number,
        default: 0
    },

    downloadUrl: [{
        quality: String,
        url: String
    }],

    // Metadata
    likedAt: {
        type: Date,
        default: Date.now
    },

    // Source information
    source: {
        type: String,
        default: 'jiosaavn'
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate likes
likedSongSchema.index({ userId: 1, songId: 1 }, { unique: true });

// Instance methods
likedSongSchema.methods.toJSON = function () {
    const likedSong = this.toObject();
    return {
        id: likedSong._id,
        songId: likedSong.songId,
        songName: likedSong.songName,
        artists: likedSong.artists,
        album: likedSong.album,
        duration: likedSong.duration,
        image: likedSong.image,
        releaseDate: likedSong.releaseDate,
        language: likedSong.language,
        playCount: likedSong.playCount,
        downloadUrl: likedSong.downloadUrl,
        likedAt: likedSong.likedAt,
        source: likedSong.source
    };
};

// Static methods
likedSongSchema.statics.findByUser = function (userId) {
    // Use lean() for faster read-only queries — returns plain JS objects
    // instead of full Mongoose documents. Keep all fields including downloadUrl
    // since the music player needs it to stream audio.
    return this.find({ userId })
        .sort({ likedAt: -1 })
        .lean();
};

likedSongSchema.statics.isLiked = function (userId, songId) {
    return this.findOne({ userId, songId });
};

likedSongSchema.statics.toggleLike = async function (userId, songData) {
    // Step 1: Try to delete — if deletedCount is 1, it was liked → now unliked
    const deleteResult = await this.deleteOne({ userId, songId: songData.id });

    if (deleteResult.deletedCount === 1) {
        return { liked: false, message: 'Song removed from favorites' };
    }

    // Step 2: Wasn't liked — insert it. Catch duplicate key in case of race condition.
    try {
        await this.create({
            userId,
            songId: songData.id,
            songName: songData.name,
            artists: songData.artists?.primary || [],
            album: songData.album,
            duration: songData.duration,
            image: songData.image,
            releaseDate: songData.releaseDate,
            language: songData.language,
            playCount: songData.playCount,
            downloadUrl: songData.downloadUrl
        });
        return { liked: true, message: 'Song added to favorites' };
    } catch (err) {
        if (err.code === 11000) {
            // Race condition — another request already liked it
            return { liked: true, message: 'Song added to favorites' };
        }
        throw err;
    }
};

const LikedSong = mongoose.models.LikedSong || mongoose.model('LikedSong', likedSongSchema);

export default LikedSong;
