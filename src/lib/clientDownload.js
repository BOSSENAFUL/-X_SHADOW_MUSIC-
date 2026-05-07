/**
 * 100% Client-side download - ZERO server cost!
 * Downloads directly from JioSaavn to user's browser
 * 
 * Pros:
 * - Zero bandwidth cost
 * - Zero CPU time
 * - Instant downloads (no server processing)
 * - Handles unlimited concurrent downloads
 * 
 * Cons:
 * - No metadata embedding (title, artist, album art)
 * - Files show as "Unknown Artist" in music players
 */

export async function downloadSongClient({ songUrl, title, artist }) {
    try {
        // Fetch directly from JioSaavn (client-side)
        const response = await fetch(songUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch song');
        }

        const blob = await response.blob();

        // Sanitize filename for all operating systems
        const sanitizedTitle = `${title} - ${artist}`
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
            .replace(/[^\x00-\x7F]/g, '_') // Replace non-ASCII (Hindi, etc.) with underscore
            .trim() || 'download';

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizedTitle}.mp3`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
    } catch (error) {
        console.error('Download failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Alias for backward compatibility
 * Now uses pure client-side download (no server)
 */
export async function downloadWithMetadata({ songUrl, title, artist }) {
    // Just use client-side download - no server needed!
    return downloadSongClient({ songUrl, title, artist });
}
