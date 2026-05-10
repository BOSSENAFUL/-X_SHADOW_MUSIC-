/**
 * 100% Client-side M4A download with iTunes cover art embedding.
 * Zero server cost - all processing happens in the browser.
 *
 * JioSaavn serves AAC audio in MP4 containers (M4A) even with .mp3 URLs.
 * We embed cover art using iTunes-style MP4 metadata atoms:
 *   moov > udta > meta > hdlr + ilst > (©nam, ©ART, ©alb, ©day, covr)
 *
 * CRITICAL: When moov size changes, stco/co64 chunk offsets must be updated
 * or the file becomes unplayable. This implementation handles that correctly.
 */

async function fetchBuffer(url) {
    try {
        // Try direct fetch first (saavncdn.com supports CORS)
        let res = await fetch(url);
        if (res.ok) return await res.arrayBuffer();
        // Fall back to proxy only if direct fails
        res = await fetch(`/api/proxy/image?url=${encodeURIComponent(url)}`);
        if (!res.ok) return null;
        return await res.arrayBuffer();
    } catch (e) {
        // CORS blocked - fall back to proxy
        try {
            const res = await fetch(`/api/proxy/image?url=${encodeURIComponent(url)}`);
            if (!res.ok) return null;
            return await res.arrayBuffer();
        } catch (e2) {
            console.warn('Cover fetch failed:', e2);
            return null;
        }
    }
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

function readU32(data, off) {
    return ((data[off] << 24) | (data[off + 1] << 16) | (data[off + 2] << 8) | data[off + 3]) >>> 0;
}

function writeU32(data, off, val) {
    data[off] = (val >>> 24) & 0xff;
    data[off + 1] = (val >>> 16) & 0xff;
    data[off + 2] = (val >>> 8) & 0xff;
    data[off + 3] = val & 0xff;
}

function readU64(data, off) {
    const hi = readU32(data, off);
    const lo = readU32(data, off + 4);
    return hi * 0x100000000 + lo;
}

function writeU64(data, off, val) {
    const hi = Math.floor(val / 0x100000000);
    const lo = val >>> 0;
    writeU32(data, off, hi);
    writeU32(data, off + 4, lo);
}

function fourcc(data, off) {
    return String.fromCharCode(data[off], data[off + 1], data[off + 2], data[off + 3]);
}

function concat(...arrays) {
    const total = arrays.reduce((s, a) => s + a.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const a of arrays) { out.set(a, off); off += a.length; }
    return out;
}

function makeAtom(name, data) {
    const out = new Uint8Array(8 + data.length);
    writeU32(out, 0, 8 + data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = name.charCodeAt(i);
    out.set(data, 8);
    return out;
}

// ── iTunes metadata builders ──────────────────────────────────────────────────

function makeTextData(text) {
    const tb = new TextEncoder().encode(text);
    const p = new Uint8Array(8 + tb.length);
    p[0] = 0x00; p[1] = 0x00; p[2] = 0x00; p[3] = 0x01; // well-known type = UTF-8
    p[4] = 0x00; p[5] = 0x00; p[6] = 0x00; p[7] = 0x00; // locale = 0
    p.set(tb, 8);
    return makeAtom('data', p);
}

function makeImageData(buf) {
    const img = new Uint8Array(buf);
    // Auto-detect: JPEG = ff d8 ff, PNG = 89 50 4e 47
    const isPng = img[0] === 0x89 && img[1] === 0x50 && img[2] === 0x4e && img[3] === 0x47;
    const typeVal = isPng ? 0x0e : 0x0d; // 13 = JPEG, 14 = PNG
    const p = new Uint8Array(8 + img.length);
    p[0] = 0x00; p[1] = 0x00; p[2] = 0x00; p[3] = typeVal;
    p[4] = 0x00; p[5] = 0x00; p[6] = 0x00; p[7] = 0x00; // locale = 0
    p.set(img, 8);
    return makeAtom('data', p);
}

function buildIlst(title, artist, album, year, imageBuffer) {
    const items = [];
    if (title) items.push(makeAtom('\u00a9nam', makeTextData(title)));
    if (artist) items.push(makeAtom('\u00a9ART', makeTextData(artist)));
    if (album) items.push(makeAtom('\u00a9alb', makeTextData(album)));
    if (year) items.push(makeAtom('\u00a9day', makeTextData(String(year))));
    if (imageBuffer) items.push(makeAtom('covr', makeImageData(imageBuffer)));
    return makeAtom('ilst', concat(...items));
}

// ── MP4 structure manipulation ────────────────────────────────────────────────

function findTopAtom(data, name) {
    let off = 0;
    while (off + 8 <= data.length) {
        const size = readU32(data, off);
        if (size < 8) break;
        if (fourcc(data, off + 4) === name) return { offset: off, size };
        off += size;
    }
    return null;
}

function findChildAtom(data, name) {
    let off = 0;
    while (off + 8 <= data.length) {
        const size = readU32(data, off);
        if (size < 8) break;
        if (fourcc(data, off + 4) === name) return { offset: off, size };
        off += size;
    }
    return null;
}

/**
 * Recursively adjust stco/co64 chunk offsets by delta.
 * Required when moov size changes and mdat comes after moov.
 */
function adjustOffsets(data, delta) {
    let off = 0;
    while (off + 8 <= data.length) {
        const size = readU32(data, off);
        if (size < 8) break;
        const name = fourcc(data, off + 4);

        if (name === 'stco') {
            const entryCount = readU32(data, off + 12);
            for (let i = 0; i < entryCount; i++) {
                const eOff = off + 16 + i * 4;
                writeU32(data, eOff, (readU32(data, eOff) + delta) >>> 0);
            }
        } else if (name === 'co64') {
            const entryCount = readU32(data, off + 12);
            for (let i = 0; i < entryCount; i++) {
                const eOff = off + 16 + i * 8;
                writeU64(data, eOff, readU64(data, eOff) + delta);
            }
        } else if (['moov', 'trak', 'mdia', 'minf', 'stbl', 'udta'].includes(name)) {
            adjustOffsets(data.subarray(off + 8, off + size), delta);
        }

        off += size;
    }
}

/**
 * Embed iTunes metadata into an MP4 file.
 * Injects: moov > udta > meta > hdlr + ilst
 * Fixes stco/co64 offsets if mdat comes after moov.
 */
function embedMP4Metadata(audioBuffer, ilstAtom) {
    const original = new Uint8Array(audioBuffer);

    const moovInfo = findTopAtom(original, 'moov');
    if (!moovInfo) {
        console.warn('No moov atom - cannot embed metadata');
        return audioBuffer;
    }

    const mdatInfo = findTopAtom(original, 'mdat');
    const mdatAfterMoov = mdatInfo && mdatInfo.offset > moovInfo.offset;

    const moovData = original.slice(moovInfo.offset + 8, moovInfo.offset + moovInfo.size);

    // Remove existing udta
    const existingUdta = findChildAtom(moovData, 'udta');
    const cleanMoovData = existingUdta
        ? concat(moovData.slice(0, existingUdta.offset), moovData.slice(existingUdta.offset + existingUdta.size))
        : moovData;

    // Build: udta > meta > hdlr + ilst
    // hdlr is required by iTunes spec - tells players this is iTunes-style metadata
    const versionFlags = new Uint8Array(4);
    const hdlrPayload = new Uint8Array(25);
    hdlrPayload[4] = 0x61; hdlrPayload[5] = 0x70; // 'ap'
    hdlrPayload[6] = 0x70; hdlrPayload[7] = 0x6c; // 'pl' → 'appl'
    hdlrPayload[8] = 0x6d; hdlrPayload[9] = 0x64; // 'md'
    hdlrPayload[10] = 0x69; hdlrPayload[11] = 0x72; // 'ir' → handler_type = 'mdir'
    const hdlrAtom = makeAtom('hdlr', hdlrPayload);
    const metaAtom = makeAtom('meta', concat(versionFlags, hdlrAtom, ilstAtom));
    const udtaAtom = makeAtom('udta', metaAtom);

    // New moov = original content (minus old udta) + new udta
    const newMoov = makeAtom('moov', concat(cleanMoovData, udtaAtom));

    // Fix chunk offsets if mdat is after moov
    const delta = newMoov.length - moovInfo.size;
    if (mdatAfterMoov && delta !== 0) {
        adjustOffsets(newMoov, delta);
    }

    const before = original.slice(0, moovInfo.offset);
    const after = original.slice(moovInfo.offset + moovInfo.size);
    return concat(before, newMoov, after).buffer;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function downloadWithMetadata({ songUrl, title, artist, album, year, imageUrl }) {
    console.log('Downloading:', title, 'by', artist);

    try {
        const [audioBuffer, coverBuffer] = await Promise.all([
            fetch(songUrl).then(r => {
                if (!r.ok) throw new Error('Audio fetch failed');
                return r.arrayBuffer();
            }),
            imageUrl ? fetchBuffer(imageUrl) : Promise.resolve(null),
        ]);

        const ilstAtom = buildIlst(title, artist, album, year, coverBuffer);
        const finalBuffer = embedMP4Metadata(audioBuffer, ilstAtom);

        const name = `${title} - ${artist}`
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/[^\x00-\x7F]/g, '_')
            .trim() || 'download';

        const blob = new Blob([finalBuffer], { type: 'audio/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.m4a`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
    } catch (err) {
        console.error('Download failed:', err);
        return { success: false, error: err.message };
    }
}

export async function downloadSongClient({ songUrl, title, artist }) {
    try {
        const response = await fetch(songUrl);
        if (!response.ok) throw new Error('Failed to fetch song');
        const blob = await response.blob();

        const name = `${title} - ${artist}`
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/[^\x00-\x7F]/g, '_')
            .trim() || 'download';

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.m4a`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
    } catch (err) {
        console.error('Download failed:', err);
        return { success: false, error: err.message };
    }
}
