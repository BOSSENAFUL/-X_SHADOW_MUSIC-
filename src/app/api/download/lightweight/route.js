import { NextResponse } from "next/server";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Set FFmpeg path
if (ffmpegPath) {
    let finalPath = ffmpegPath;
    if (finalPath.includes('\\ROOT\\') || finalPath.includes('/ROOT/')) {
        const relativePath = finalPath.replace(/.*[\/\\]ROOT[\/\\]/, '');
        finalPath = path.join(process.cwd(), relativePath);
    }
    if (typeof finalPath === 'string') {
        ffmpeg.setFfmpegPath(finalPath);
    }
}

// Lightweight metadata embedding - optimized for speed
async function embedMetadata({ audioBuffer, imageBuffer, title, artist, album, year, isMp3Input }) {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempAudioPath = path.join(os.tmpdir(), `audio_${tempId}`);
    const tempImagePath = path.join(os.tmpdir(), `art_${tempId}.jpg`);
    const tempOutputPath = path.join(os.tmpdir(), `output_${tempId}.mp3`);

    try {
        // Write files in parallel
        await Promise.all([
            fs.writeFile(tempAudioPath, audioBuffer),
            imageBuffer ? fs.writeFile(tempImagePath, imageBuffer) : Promise.resolve()
        ]);

        return new Promise((resolve, reject) => {
            const command = ffmpeg(tempAudioPath);
            if (imageBuffer) command.input(tempImagePath);

            const clean = (val) => String(val || "").replace(/"/g, '');

            // Fast processing
            command.outputOptions('-threads', '0');
            command.outputOptions('-map', '0:a:0');
            command.outputOptions('-id3v2_version', '3');
            command.outputOptions('-metadata', `title=${clean(title)}`);
            command.outputOptions('-metadata', `artist=${clean(artist)}`);
            command.outputOptions('-metadata', `album=${clean(album || title)}`);
            command.outputOptions('-metadata', `date=${clean(year) || '2024'}`);

            if (imageBuffer) {
                command.outputOptions('-map', '1:v:0');
                command.outputOptions('-c:v', 'copy');
                command.outputOptions('-disposition:v:0', 'attached_pic');
            }

            // Copy audio codec if already MP3 (instant)
            if (isMp3Input) {
                command.audioCodec('copy');
            } else {
                command.audioCodec('libmp3lame').audioBitrate(256);
            }

            command
                .on('error', async (err) => {
                    await cleanup();
                    reject(err);
                })
                .on('end', async () => {
                    try {
                        const finalBuffer = await fs.readFile(tempOutputPath);
                        await cleanup();
                        resolve(finalBuffer);
                    } catch (e) {
                        await cleanup();
                        reject(e);
                    }
                })
                .save(tempOutputPath);

            async function cleanup() {
                try {
                    await Promise.all([
                        fs.unlink(tempAudioPath).catch(() => { }),
                        imageBuffer ? fs.unlink(tempImagePath).catch(() => { }) : Promise.resolve(),
                        fs.unlink(tempOutputPath).catch(() => { })
                    ]);
                } catch (e) { }
            }
        });
    } catch (err) {
        throw err;
    }
}

export async function POST(req) {
    try {
        const { songUrl, imageUrl, title, artist, album, year } = await req.json();
        if (!songUrl) return NextResponse.json({ error: "Missing songUrl" }, { status: 400 });

        // Fetch audio and image in parallel
        const [songRes, imageRes] = await Promise.all([
            fetch(songUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://www.jiosaavn.com/'
                }
            }),
            imageUrl ? fetch(imageUrl.replace(/^http:\/\//i, 'https://'), {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            }) : Promise.resolve(null)
        ]);

        if (!songRes.ok) throw new Error("Audio source unavailable");

        const audioBuffer = Buffer.from(await songRes.arrayBuffer());
        const isMp3Input = songUrl.toLowerCase().includes('.mp3') ||
            songRes.headers.get('content-type')?.includes('mpeg');

        // Optimize image (smaller size = faster processing)
        let optimizedImage = null;
        if (imageRes?.ok) {
            try {
                const rawImg = Buffer.from(await imageRes.arrayBuffer());
                optimizedImage = await sharp(rawImg)
                    .resize(500, 500, {
                        fit: 'cover',
                        withoutEnlargement: true
                    })
                    .jpeg({
                        quality: 85, // Slightly lower quality for speed
                        progressive: true
                    })
                    .toBuffer();
            } catch (e) {
                console.error('Image optimization failed:', e);
            }
        }

        const finalBuffer = await embedMetadata({
            audioBuffer,
            imageBuffer: optimizedImage,
            title,
            artist,
            album,
            year,
            isMp3Input
        });

        // Properly encode filename for international characters
        const sanitizedTitle = title
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
            .trim() || 'download';

        // Use RFC 5987 encoding for international characters
        const encodedFilename = encodeURIComponent(sanitizedTitle)
            .replace(/['()]/g, escape)
            .replace(/\*/g, '%2A');

        return new Response(finalBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": `attachment; filename="${sanitizedTitle.replace(/[^\x00-\x7F]/g, '_')}.mp3"; filename*=UTF-8''${encodedFilename}.mp3`,
                "X-Tagged": "true",
            },
        });

    } catch (error) {
        console.error('Download error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
