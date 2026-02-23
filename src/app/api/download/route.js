import { NextResponse } from "next/server";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

// Tank-level reliable pipeline using temporary files for both audio and image
async function processWithFfmpeg({ audioBuffer, imageBuffer, title, artist, album, year }) {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempAudioPath = path.join(os.tmpdir(), `audio_${tempId}`);
    const tempImagePath = path.join(os.tmpdir(), `art_${tempId}.jpg`);
    const tempOutputPath = path.join(os.tmpdir(), `output_${tempId}.mp3`);

    return new Promise((resolve, reject) => {
        try {
            // Write input buffers to temp files
            fs.writeFileSync(tempAudioPath, audioBuffer);
            if (imageBuffer) {
                fs.writeFileSync(tempImagePath, imageBuffer);
            }

            const command = ffmpeg(tempAudioPath);

            if (imageBuffer) {
                command.input(tempImagePath);
            }

            // Using outputOptions individually to ensure proper shell escaping of arguments with spaces
            command.outputOptions('-map', '0:a:0');
            command.outputOptions('-id3v2_version', '3'); // Universal v2.3

            // Metadata need to be passed as separate arguments: key=value
            // We strip any double quotes from metadata to prevent breaking shell commands
            const clean = (val) => String(val || "").replace(/"/g, '');

            command.outputOptions('-metadata', `title=${clean(title)}`);
            command.outputOptions('-metadata', `artist=${clean(artist)}`);
            command.outputOptions('-metadata', `album=${clean(album || title)}`);
            command.outputOptions('-metadata', `date=${clean(year) || '2024'}`);
            command.outputOptions('-metadata', 'comment=Downloaded via Jammify');

            if (imageBuffer) {
                // Map the image as a video stream and mark it as album art
                command.outputOptions('-map', '1:v:0');
                command.outputOptions('-c:v', 'copy'); // Copy image codec (JPEG)
                command.outputOptions('-disposition:v:0', 'attached_pic');
            }

            // Force MP3 encoding with high quality
            command
                .toFormat('mp3')
                .audioCodec('libmp3lame')
                .audioBitrate(320)
                .on('start', (cmd) => console.log(`[FFmpeg] Executing: ${cmd}`))
                .on('error', (err) => {
                    console.error('[FFmpeg] Error:', err);
                    cleanup();
                    reject(err);
                })
                .on('end', () => {
                    try {
                        const finalBuffer = fs.readFileSync(tempOutputPath);
                        cleanup();
                        resolve(finalBuffer);
                    } catch (readErr) {
                        cleanup();
                        reject(readErr);
                    }
                })
                .save(tempOutputPath);

            function cleanup() {
                [tempAudioPath, tempImagePath, tempOutputPath].forEach(p => {
                    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) { }
                });
            }
        } catch (err) {
            reject(err);
        }
    });
}

export async function POST(req) {
    try {
        const { songUrl, imageUrl, title, artist, album, year } = await req.json();
        if (!songUrl) return NextResponse.json({ error: "Missing songUrl" }, { status: 400 });

        console.log(`[Download API] Request for: ${title} - ${artist}`);

        // 1. Fetch Audio
        const songRes = await fetch(songUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.jiosaavn.com/',
            }
        });
        if (!songRes.ok) throw new Error("Audio source unreachable");
        const audioBuffer = Buffer.from(await songRes.arrayBuffer());

        // 2. Fetch & Optimize Image
        let optimizedImage = null;
        if (imageUrl) {
            try {
                const imgRes = await fetch(imageUrl.replace(/^http:\/\//i, 'https://'), {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (imgRes.ok) {
                    const rawImg = Buffer.from(await imgRes.arrayBuffer());
                    optimizedImage = await sharp(rawImg)
                        .resize(500, 500)
                        .jpeg({ quality: 80, progressive: false })
                        .toBuffer();
                }
            } catch (e) {
                console.error("[Download API] Image failed:", e);
            }
        }

        // 3. Process
        const finalMp3Buffer = await processWithFfmpeg({
            audioBuffer,
            imageBuffer: optimizedImage,
            title: title || "Track",
            artist: artist || "Artist",
            album: album || title,
            year: year
        });

        const safeFilename = `${title || "track"} - ${artist || "artist"}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();

        return new Response(finalMp3Buffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": `attachment; filename="${safeFilename}.mp3"`,
                "X-Tagged": "true",
                "Cache-Control": "no-cache",
            },
        });

    } catch (error) {
        console.error("[Download API] Global Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
