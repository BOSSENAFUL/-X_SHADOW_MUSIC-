import { NextResponse } from "next/server";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

// Critical for production/serverless: tell fluent-ffmpeg where to find the binary
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

// 🛡️ Ultra-Optimized Pipeline
async function processReliable({ audioBuffer, imageBuffer, title, artist, album, year, isMp3Input }) {
    const tempId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempAudioPath = path.join(os.tmpdir(), `audio_${tempId}`);
    const tempImagePath = path.join(os.tmpdir(), `art_${tempId}.jpg`);
    const tempOutputPath = path.join(os.tmpdir(), `output_${tempId}.mp3`);

    try {
        // 🚀 Parallel Writes
        await Promise.all([
            fs.writeFile(tempAudioPath, audioBuffer),
            imageBuffer ? fs.writeFile(tempImagePath, imageBuffer) : Promise.resolve()
        ]);

        return new Promise((resolve, reject) => {
            const command = ffmpeg(tempAudioPath);
            if (imageBuffer) command.input(tempImagePath);

            const clean = (val) => String(val || "").replace(/"/g, '');

            // Re-tuned FFmpeg arguments for raw speed
            command.outputOptions('-threads', '0');
            command.outputOptions('-map', '0:a:0');
            command.outputOptions('-id3v2_version', '3');
            command.outputOptions('-metadata', `title=${clean(title)}`);
            command.outputOptions('-metadata', `artist=${clean(artist)}`);
            command.outputOptions('-metadata', `album=${clean(album || title)}`);
            command.outputOptions('-metadata', `date=${clean(year) || '2024'}`);
            command.outputOptions('-metadata', 'comment=Downloaded via Jammify');

            if (imageBuffer) {
                command.outputOptions('-map', '1:v:0');
                command.outputOptions('-c:v', 'copy');
                command.outputOptions('-disposition:v:0', 'attached_pic');
            }

            if (isMp3Input) {
                // Instant binary copy - zero transcoding delay
                command.audioCodec('copy');
            } else {
                // Fast re-encode if input is AAC/M4A
                command.audioCodec('libmp3lame').audioBitrate(256); // 256k is faster than 320k with near-identical quality
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

        // 🚀 Parallel Meta Fetching
        const [songRes, imageRes] = await Promise.all([
            fetch(songUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.jiosaavn.com/' } }),
            imageUrl ? fetch(imageUrl.replace(/^http:\/\//i, 'https://'), { headers: { 'User-Agent': 'Mozilla/5.0' } }) : Promise.resolve(null)
        ]);

        if (!songRes.ok) throw new Error("Audio source down");

        const audioBuffer = Buffer.from(await songRes.arrayBuffer());
        const isMp3Input = songUrl.toLowerCase().includes('.mp3') || songRes.headers.get('content-type')?.includes('mpeg');

        let optimizedImage = null;
        if (imageRes?.ok) {
            try {
                // 🚀 HIGH-QUALITY IMAGE MODE: 500px is the sweet spot for sharpness and file size
                const rawImg = Buffer.from(await imageRes.arrayBuffer());
                optimizedImage = await sharp(rawImg)
                    .resize(500, 500, {
                        fit: 'cover',
                        withoutEnlargement: true
                    })
                    .jpeg({
                        quality: 90,
                        progressive: true,
                        chromaSubsampling: '4:4:4'
                    })
                    .toBuffer();
            } catch (e) { }
        }

        const finalBuffer = await processReliable({
            audioBuffer,
            imageBuffer: optimizedImage,
            title, artist, album, year, isMp3Input
        });

        return new Response(finalBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": `attachment; filename="${title}.mp3"`,
                "X-Tagged": "true",
            },
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
