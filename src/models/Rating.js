import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: false
    },
}, { timestamps: true })

export default mongoose.models.Rating || mongoose.model('Rating', RatingSchema);
