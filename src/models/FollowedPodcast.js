import mongoose from 'mongoose';

const followedPodcastSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    podcastId: {
        type: String,
        required: true,
        index: true
    },
    podcastTitle: {
        type: String,
        required: true
    },
    publisher: {
        type: String,
        default: 'Unknown Creator'
    },
    coverImage: {
        type: String,
        default: '/default-playlist-image.png'
    },
    followedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Ensure a user cannot follow the same podcast multiple times
followedPodcastSchema.index({ userId: 1, podcastId: 1 }, { unique: true });

// Prevent mongoose model recompilation error
const FollowedPodcast = mongoose.models.FollowedPodcast || mongoose.model('FollowedPodcast', followedPodcastSchema);

export default FollowedPodcast;
