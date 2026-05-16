import mongoose from 'mongoose';

const RecommendedMixSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // 0 = liked songs mix, 1–5 = recently played mixes
        mixIndex: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },
        title: {
            type: String,
            required: true,
        },
        // "liked_songs" | "recently_played"
        sourceType: {
            type: String,
            enum: ['liked_songs', 'recently_played'],
            required: true,
        },
        // playlistId for recently_played, null for liked_songs
        sourceId: {
            type: String,
            default: null,
        },
        // The generated song IDs (up to 50)
        songIds: {
            type: [String],
            default: [],
        },
        // Stored cover image URL — picked once at generation, never changes on reload
        coverImage: {
            type: String,
            default: null,
        },
        generatedAt: {
            type: Date,
            default: Date.now,
        },
        // generatedAt + 3 days + jitter (0–24h)
        expiresAt: {
            type: Date,
            required: true,
        },
        // How many seed songs were used
        seedCount: {
            type: Number,
            default: 0,
        },
        // Set to true when user data changed — triggers background refresh
        isStale: {
            type: Boolean,
            default: false,
        },
        // Prevent hammering: track last generation attempt
        lastGenerationAttempt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// One mix per slot per user
RecommendedMixSchema.index({ userId: 1, mixIndex: 1 }, { unique: true });
// For expiry queries
RecommendedMixSchema.index({ expiresAt: 1 });
// For stale queries
RecommendedMixSchema.index({ userId: 1, isStale: 1 });

export default mongoose.models.RecommendedMix ||
    mongoose.model('RecommendedMix', RecommendedMixSchema);
