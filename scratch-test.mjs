import { Innertube } from 'youtubei.js';

async function main() {
  const yt = await Innertube.create();
  const channel = await yt.getChannel('UCSJ4gkVC6NrvII8umztf0Ow');
  const videosTab = await channel.getVideos();
  
  const rawVideos = (videosTab.videos && videosTab.videos.length > 0)
    ? videosTab.videos
    : (videosTab.memo?.get('LockupView') || []);

  const parsed = rawVideos.slice(0, 3).map(video => {
    let id = video.id || video.video_id || video.content_id;
    
    let title = '';
    if (video.title) {
      title = video.title.text || video.title.toString();
    } else if (video.metadata?.title) {
      title = video.metadata.title.text || video.metadata.title.toString();
    }
    
    let thumb = '';
    const thumbnails = video.thumbnails || video.content_image?.image || [];
    if (thumbnails.length > 0) {
      thumb = thumbnails[0].url || '';
    }
    if (thumb.startsWith('//')) {
      thumb = 'https:' + thumb;
    }
    
    let views = '0 views';
    let published = 'Recently';
    
    const metadataRows = video.metadata?.metadata?.metadata_rows || [];
    if (metadataRows.length > 1) {
      const parts = metadataRows[1].metadata_parts || [];
      if (parts.length > 0) views = parts[0].text?.text || '';
      if (parts.length > 1) published = parts[1].text?.text || '';
    } else if (metadataRows.length > 0) {
      const parts = metadataRows[0].metadata_parts || [];
      if (parts.length > 1) {
        views = parts[0].text?.text || '';
        published = parts[1].text?.text || '';
      }
    } else {
      views = video.view_count?.text || video.view_count?.toString() || '0 views';
      published = video.published?.text || video.published?.toString() || 'Recently';
    }
    
    let duration = '';
    if (video.duration) {
      duration = video.duration.toString();
    } else {
      const durationOverlay = video.content_image?.overlays?.find(o => o.type === 'ThumbnailBottomOverlayView');
      if (durationOverlay && durationOverlay.badges?.length > 0) {
        duration = durationOverlay.badges[0].text || '';
      }
    }

    return {
      id,
      title,
      views,
      published,
      thumbnail: thumb,
      duration
    };
  });

  console.log('Parsed videos:', parsed);
}

main().catch(console.error);
