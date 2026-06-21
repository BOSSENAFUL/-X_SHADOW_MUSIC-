import sharp from 'sharp';

const colorCache = new Map();

/**
 * Extracts the average dominant color of an image URL.
 * Caches the extracted color in memory indefinitely to avoid repeated fetches.
 */
export async function getOrExtractColor(imageUrl, fallbackColor = '#121212') {
    if (!imageUrl) return fallbackColor;
    
    if (colorCache.has(imageUrl)) {
        return colorCache.get(imageUrl);
    }

    try {
        const res = await fetch(imageUrl, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const { data } = await sharp(buffer)
            .resize(1, 1)
            .raw()
            .toBuffer({ resolveWithObject: true });

        if (data && data.length >= 3) {
            const r = data[0];
            const g = data[1];
            const b = data[2];
            
            const hex = '#' + [r, g, b].map(x => {
                const hexVal = x.toString(16);
                return hexVal.length === 1 ? '0' + hexVal : hexVal;
            }).join('');
            
            colorCache.set(imageUrl, hex);
            return hex;
        }
    } catch (err) {
        console.error(`Error extracting dominant color for ${imageUrl}:`, err.message);
    }

    return fallbackColor;
}
