const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;

async function main() {
  const { Innertube } = await import('youtubei.js');
  await mongoose.connect(MONGODB_URI);
  const youtube = await Innertube.create();
  
  const followed = await mongoose.connection.db.collection('followedchannels').find({}).toArray();
  const channel = followed[0];
  console.log('Channel:', channel.channelName);
  
  let targetChannelId = channel.channelId;
  if (targetChannelId.startsWith('UU')) {
    targetChannelId = 'UC' + targetChannelId.substring(2);
  }
  const channelData = await youtube.getChannel(targetChannelId);
  const videosTab = await channelData.getVideos();
  const lockups = videosTab.memo?.get('LockupView') || [];
  
  if (lockups.length > 0) {
    const item = lockups[0];
    console.log('--- LockupView Structure Keys ---');
    console.log('Top level keys:', Object.keys(item));
    console.log('metadata structure keys:', Object.keys(item.metadata || {}));
    if (item.metadata && item.metadata.metadata) {
      console.log('metadata.metadata keys:', Object.keys(item.metadata.metadata));
      console.log('metadata.metadata (JSON):', JSON.stringify(item.metadata.metadata, null, 2));
    }
    console.log('--- Overlays ---');
    console.log('content_image keys:', Object.keys(item.content_image || {}));
    if (item.content_image && item.content_image.overlays) {
      console.log('overlays (JSON):', JSON.stringify(item.content_image.overlays, null, 2));
    }
  }
  await mongoose.connection.close();
}

main().catch(console.error);
