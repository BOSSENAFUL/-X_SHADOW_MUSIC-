import mongoose from 'mongoose';

const followedChannelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  channelId: {
    type: String,
    required: true,
    index: true
  },
  channelName: {
    type: String,
    required: true
  },
  avatar: {
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

// Ensure a user cannot follow the same channel multiple times
followedChannelSchema.index({ userId: 1, channelId: 1 }, { unique: true });

const FollowedChannel = mongoose.models.FollowedChannel || mongoose.model('FollowedChannel', followedChannelSchema);

export default FollowedChannel;
