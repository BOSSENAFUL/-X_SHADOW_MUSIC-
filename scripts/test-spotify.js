
const CLIENT_ID = '2c3b99f6fcca4964b65e4e9f10bfd283';
const CLIENT_SECRET = '78da110a4ae543298995901cdf659a78';

async function testConnection() {
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    console.log('Testing connectivity to accounts.spotify.com...');

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        console.log('Response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
        } else {
            const data = await response.json();
            console.log('Success! Got token starting with:', data.access_token.substring(0, 10));
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

testConnection();
