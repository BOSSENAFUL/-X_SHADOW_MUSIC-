import mongoose from 'mongoose';

const CommunityPostSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['post', 'issue'],
    default: 'post',
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  commentCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for better performance when listing posts by newest
CommunityPostSchema.index({ createdAt: -1 });
CommunityPostSchema.index({ author: 1 });

export default mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema);
