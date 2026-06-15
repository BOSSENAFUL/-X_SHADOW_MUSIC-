const { Innertube, Platform } = require('youtubei.js');

Platform.shim.eval = async (data) => {
  return new Function(data.output)();
};

async function test() {
  const yt = await Innertube.create();
  const id = 'u1iBReO1T9k';

  try {
    console.log(`\n--- Fetching video info with client: ANDROID ---`);
    const info = await yt.getInfo(id, { client: 'ANDROID' });
    
    if (info.streaming_data) {
      const formats = info.streaming_data.formats || [];
      const adaptive = info.streaming_data.adaptive_formats || [];
      console.log(`Formats count: ${formats.length}, Adaptive count: ${adaptive.length}`);
      
      console.log("\n--- Non-Adaptive Formats: ---");
      formats.forEach((f, idx) => {
        console.log(`[${idx}] itag: ${f.itag}, mime: ${f.mime_type}, has_url: ${!!f.url}, has_sig: ${!!f.signature_cipher}`);
      });
      
      console.log("\n--- Adaptive Audio Formats: ---");
      adaptive.filter(f => f.has_audio && !f.has_video).forEach((f, idx) => {
        console.log(`[${idx}] itag: ${f.itag}, mime: ${f.mime_type}, has_url: ${!!f.url}, has_sig: ${!!f.signature_cipher}`);
      });
    } else {
      console.log("No streaming data found.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test().catch(console.error);
