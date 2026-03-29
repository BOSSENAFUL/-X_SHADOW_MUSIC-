import mongoose from 'mongoose';

const CommunityCommentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityPost',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityComment',
    default: null,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

// Index for performance when fetching comments for a post
CommunityCommentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.models.CommunityComment || mongoose.model('CommunityComment', CommunityCommentSchema);
