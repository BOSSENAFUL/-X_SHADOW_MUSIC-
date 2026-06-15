import { NextResponse } from 'next/server';
import cache from '@/lib/cache';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const trackName = searchParams.get('trackName');
        const artistName = searchParams.get('artistName');

        if (!trackName || !artistName) {
            return NextResponse.json({ success: false, error: 'Missing trackName or artistName' }, { status: 400 });
        }

        const cacheKey = `spotify-canvas:${trackName.toLowerCase().trim()}:${artistName.toLowerCase().trim()}`;
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            return NextResponse.json(cachedResult);
        }

        // Search for track on Spotify using Paxsenix0's open search API
        const searchQuery = `${trackName} ${artistName}`;
        const searchUrl = `https://lyrics.paxsenix.org/spotify/search?q=${encodeURIComponent(searchQuery)}`;
        
        const searchResponse = await fetch(searchUrl);

        if (!searchResponse.ok) {
            return NextResponse.json({ success: false, error: 'Spotify search request failed' }, { status: searchResponse.status });
        }

        const tracks = await searchResponse.json();

        if (!Array.isArray(tracks) || tracks.length === 0) {
            const emptyResult = { success: true, canvasUrl: null };
            cache.set(cacheKey, emptyResult, 86400); // cache negative results for 1 day
            return NextResponse.json(emptyResult);
        }

        // Try to find an exact/good match first or fallback to the first result
        const cleanTrackName = trackName.toLowerCase().trim();
        const cleanArtistName = artistName.toLowerCase().trim();
        
        let matchedTrack = tracks[0];
        const exactMatch = tracks.find(t => 
            t.name.toLowerCase().trim() === cleanTrackName && 
            t.artistName.toLowerCase().trim().includes(cleanArtistName)
        );
        if (exactMatch) {
            matchedTrack = exactMatch;
        }

        const spotifyTrackId = matchedTrack.trackId || matchedTrack.id;

        if (!spotifyTrackId) {
            const emptyResult = { success: true, canvasUrl: null };
            cache.set(cacheKey, emptyResult, 86400);
            return NextResponse.json(emptyResult);
        }

        // Fetch Canvas URL using Paxsenix0's canvas API
        const canvasApiUrl = `https://spotify-canvas-api-rouge.vercel.app/api/canvas?trackId=${spotifyTrackId}`;
        const canvasResponse = await fetch(canvasApiUrl);

        if (!canvasResponse.ok) {
            const emptyResult = { success: true, canvasUrl: null };
            cache.set(cacheKey, emptyResult, 3600); // cache errors shorter
            return NextResponse.json(emptyResult);
        }

        const canvasData = await canvasResponse.json();
        const canvasList = canvasData.canvasesList;

        if (!canvasList || canvasList.length === 0 || !canvasList[0].canvasUrl) {
            const emptyResult = { success: true, canvasUrl: null };
            cache.set(cacheKey, emptyResult, 86400); // cache negative results for 1 day
            return NextResponse.json(emptyResult);
        }

        const canvasUrl = canvasList[0].canvasUrl;
        const result = { success: true, canvasUrl };
        cache.set(cacheKey, result, 86400); // cache success results for 1 day
        return NextResponse.json(result);
    } catch (error) {
        console.error('Spotify Canvas Proxy Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
