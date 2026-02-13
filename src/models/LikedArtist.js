import mongoose from 'mongoose';

const likedArtistSchema = new mongoose.Schema({
    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // Artist ID from JioSaavn API - we'll fetch other details using this ID
    artistId: {
        type: String,
        required: true,
        index: true
    },

    // Artist metadata for quick access
    artistData: {
        name: String,
        image: [{
            quality: String,
            url: String
        }],
        followerCount: String,
        isVerified: Boolean,
        dominantLanguage: String,
        dominantType: String
    },

    // Metadata
    likedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate likes
likedArtistSchema.index({ userId: 1, artistId: 1 }, { unique: true });

// Instance methods
likedArtistSchema.methods.toJSON = function () {
    const likedArtist = this.toObject();
    return {
        id: likedArtist._id,
        artistId: likedArtist.artistId,
        artistData: likedArtist.artistData,
        likedAt: likedArtist.likedAt
    };
};

// Static methods
likedArtistSchema.statics.findByUser = function (userId) {
    return this.find({ userId }).sort({ likedAt: -1 });
};

likedArtistSchema.statics.isLiked = function (userId, artistId) {
    return this.findOne({ userId, artistId });
};

likedArtistSchema.statics.toggleLike = async function (userId, artistData, updateOnly = false) {
    // Check if artistData is just an ID string or an object
    // Handle both 'id' and 'artistId' properties for external data compatibility
    const artistId = typeof artistData === 'string'
        ? artistData
        : (artistData.artistId || artistData.id);

    if (!artistId) {
        throw new Error('Artist ID is required for toggleLike');
    }

    // Helper to normalize images to the schema format [{ quality, url }]
    const normalizeImage = (img) => {
        if (!img) return [];
        // If it's already an array of objects with url property
        if (Array.isArray(img)) {
            return img.map(item => {
                if (typeof item === 'string') return { quality: 'default', url: item };
                if (item && item.url) return { quality: item.quality || 'default', url: item.url };
                return null;
            }).filter(Boolean);
        }
        // If it's a single URL string
        if (typeof img === 'string') {
            return [{ quality: 'default', url: img }];
        }
        return [];
    };

    const existingLike = await this.findOne({ userId, artistId });

    if (existingLike) {
        if (updateOnly) {
            // Just update the metadata if it's already liked
            if (typeof artistData === 'object' && artistData !== null) {
                const normalizedImage = normalizeImage(artistData.image);

                existingLike.artistData = {
                    name: artistData.name || artistData.artistName || artistData.title || existingLike.artistData?.name,
                    image: normalizedImage.length > 0 ? normalizedImage : existingLike.artistData?.image,
                    followerCount: artistData.followerCount || existingLike.artistData?.followerCount,
                    isVerified: artistData.isVerified !== undefined ? artistData.isVerified : existingLike.artistData?.isVerified,
                    dominantLanguage: artistData.dominantLanguage || existingLike.artistData?.dominantLanguage,
                    dominantType: artistData.dominantType || existingLike.artistData?.dominantType
                };
                await existingLike.save();
                return { liked: true, message: 'Artist metadata updated', updated: true };
            }
            return { liked: true, message: 'Artist already liked' };
        }
        // Unlike the artist
        await this.deleteOne({ userId, artistId });
        return { liked: false, message: 'Artist removed from favorites' };
    } else {
        // Like the artist
        const likedArtist = new this({
            userId,
            artistId,
            artistData: (typeof artistData === 'object' && artistData !== null) ? {
                name: artistData.name || artistData.artistName || artistData.title,
                image: normalizeImage(artistData.image),
                followerCount: artistData.followerCount,
                isVerified: artistData.isVerified,
                dominantLanguage: artistData.dominantLanguage,
                dominantType: artistData.dominantType
            } : {}
        });

        await likedArtist.save();
        return { liked: true, message: 'Artist added to favorites' };
    }
};

const LikedArtist = mongoose.models.LikedArtist || mongoose.model('LikedArtist', likedArtistSchema);

export default LikedArtist;