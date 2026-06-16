async function testCobalt() {
  const videoId = 'V9PVRfjEBTI';
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    console.log('Sending request to Cobalt API...');
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioBitrate: '320'
      })
    });
    
    const data = await response.json();
    console.log('Cobalt API Response:', data);
  } catch (error) {
    console.error('Cobalt API Error:', error);
  }
}

testCobalt();
