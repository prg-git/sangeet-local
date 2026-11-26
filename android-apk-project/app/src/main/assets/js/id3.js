/**
 * ID3 Tag Parser for MP3 and Audio Files
 * Extracts metadata (Title, Artist, Album, Year, Genre, Track Number)
 * and embedded Album Art (APIC frame) directly from File / ArrayBuffer.
 */

class ID3Parser {
    static async parse(file) {
        const metadata = {
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Unknown Artist",
            album: "Unknown Album",
            year: "",
            genre: "Music",
            track: "",
            coverUrl: null,
            duration: 0,
            fileSize: file.size,
            format: file.type || "audio/mpeg",
            dateAdded: Date.now()
        };

        try {
            // Read first 1MB for ID3v2 tags (usually at beginning)
            const headerSlice = file.slice(0, Math.min(file.size, 1024 * 1024));
            const buffer = await headerSlice.arrayBuffer();
            const view = new DataView(buffer);

            // Check for ID3v2
            if (buffer.byteLength >= 10 && 
                view.getUint8(0) === 0x49 && // 'I'
                view.getUint8(1) === 0x44 && // 'D'
                view.getUint8(2) === 0x33) { // '3'
                
                const version = view.getUint8(3); // 3 for ID3v2.3, 4 for ID3v2.4
                const flags = view.getUint8(5);
                const tagSize = this.decodeSyncSafe(view.getUint32(6));
                
                let offset = 10;
                // Skip extended header if present
                if (flags & 0x40) {
                    const extHeaderSize = version === 4 ? this.decodeSyncSafe(view.getUint32(offset)) : view.getUint32(offset);
                    offset += extHeaderSize;
                }

                const endOffset = Math.min(10 + tagSize, buffer.byteLength);

                while (offset + 10 < endOffset) {
                    let frameId = "";
                    for (let i = 0; i < 4; i++) {
                        const charCode = view.getUint8(offset + i);
                        if (charCode === 0) break;
                        frameId += String.fromCharCode(charCode);
                    }

                    if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

                    let frameSize;
                    if (version === 4) {
                        frameSize = this.decodeSyncSafe(view.getUint32(offset + 4));
                    } else {
                        frameSize = view.getUint32(offset + 4);
                    }

                    offset += 10; // Move past frame header
                    if (frameSize <= 0 || offset + frameSize > buffer.byteLength) break;

                    const frameData = new DataView(buffer, offset, frameSize);

                    try {
                        switch (frameId) {
                            case "TIT2": // Title
                                metadata.title = this.decodeText(frameData) || metadata.title;
                                break;
                            case "TPE1": // Artist
                                metadata.artist = this.decodeText(frameData) || metadata.artist;
                                break;
                            case "TALB": // Album
                                metadata.album = this.decodeText(frameData) || metadata.album;
                                break;
                            case "TYER": // Year
                            case "TDRC": // Date
                                metadata.year = (this.decodeText(frameData) || "").substring(0, 4);
                                break;
                            case "TCON": // Genre
                                metadata.genre = this.cleanGenre(this.decodeText(frameData)) || metadata.genre;
                                break;
                            case "TRCK": // Track number
                                metadata.track = this.decodeText(frameData) || "";
                                break;
                            case "APIC": // Album Cover Art
                                if (!metadata.coverUrl) {
                                    const coverData = this.decodeAPIC(frameData);
                                    if (coverData) {
                                        metadata.coverUrl = coverData;
                                    }
                                }
                                break;
                        }
                    } catch (e) {
                        console.warn("Failed to parse frame " + frameId, e);
                    }

                    offset += frameSize;
                }
            } else if (file.size > 128) {
                // Fallback: Check ID3v1 at end of file (128 bytes)
                const tailSlice = file.slice(file.size - 128);
                const tailBuffer = await tailSlice.arrayBuffer();
                const tailView = new DataView(tailBuffer);

                if (tailView.getUint8(0) === 0x54 && // 'T'
                    tailView.getUint8(1) === 0x41 && // 'A'
                    tailView.getUint8(2) === 0x47) { // 'G'
                    
                    const title = this.decodeLatin1(new Uint8Array(tailBuffer, 3, 30)).trim();
                    const artist = this.decodeLatin1(new Uint8Array(tailBuffer, 33, 30)).trim();
                    const album = this.decodeLatin1(new Uint8Array(tailBuffer, 63, 30)).trim();
                    const year = this.decodeLatin1(new Uint8Array(tailBuffer, 93, 4)).trim();

                    if (title) metadata.title = title;
                    if (artist) metadata.artist = artist;
                    if (album) metadata.album = album;
                    if (year) metadata.year = year;
                }
            }
        } catch (err) {
            console.warn("Error parsing ID3 tags:", err);
        }

        // Get audio duration
        try {
            metadata.duration = await this.getAudioDuration(file);
        } catch (e) {
            metadata.duration = 0;
        }

        return metadata;
    }

    static decodeSyncSafe(num) {
        return ((num & 0x7f000000) >> 3) |
               ((num & 0x007f0000) >> 2) |
               ((num & 0x00007f00) >> 1) |
               (num & 0x0000007f);
    }

    static decodeText(view) {
        if (view.byteLength < 2) return "";
        const encoding = view.getUint8(0);
        const bytes = new Uint8Array(view.buffer, view.byteOffset + 1, view.byteLength - 1);

        try {
            if (encoding === 0) { // ISO-8859-1
                return this.decodeLatin1(bytes).replace(/\0+$/, "").trim();
            } else if (encoding === 1) { // UTF-16 with BOM
                const decoder = new TextDecoder("utf-16");
                return decoder.decode(bytes).replace(/\0+$/, "").trim();
            } else if (encoding === 2) { // UTF-16BE without BOM
                const decoder = new TextDecoder("utf-16be");
                return decoder.decode(bytes).replace(/\0+$/, "").trim();
            } else if (encoding === 3) { // UTF-8
                const decoder = new TextDecoder("utf-8");
                return decoder.decode(bytes).replace(/\0+$/, "").trim();
            }
        } catch (e) {
            return this.decodeLatin1(bytes).replace(/\0+$/, "").trim();
        }
        return "";
    }

    static decodeLatin1(bytes) {
        let str = "";
        for (let i = 0; i < bytes.length; i++) {
            if (bytes[i] === 0) break;
            str += String.fromCharCode(bytes[i]);
        }
        return str;
    }

    static decodeAPIC(view) {
        try {
            const encoding = view.getUint8(0);
            let offset = 1;

            // Find mime type (null terminated ISO-8859-1)
            let mimeType = "";
            while (offset < view.byteLength && view.getUint8(offset) !== 0) {
                mimeType += String.fromCharCode(view.getUint8(offset));
                offset++;
            }
            offset++; // Skip null byte
            if (!mimeType || mimeType === "image/") mimeType = "image/jpeg";

            // Picture type (1 byte)
            const picType = view.getUint8(offset);
            offset++;

            // Description
            if (encoding === 0 || encoding === 3) {
                while (offset < view.byteLength && view.getUint8(offset) !== 0) offset++;
                offset++;
            } else {
                while (offset + 1 < view.byteLength && !(view.getUint8(offset) === 0 && view.getUint8(offset + 1) === 0)) {
                    offset += 2;
                }
                offset += 2;
            }

            if (offset < view.byteLength) {
                const imgBytes = new Uint8Array(view.buffer, view.byteOffset + offset, view.byteLength - offset);
                const blob = new Blob([imgBytes], { type: mimeType });
                return URL.createObjectURL(blob);
            }
        } catch (e) {
            console.warn("APIC decode error", e);
        }
        return null;
    }

    static cleanGenre(genre) {
        if (!genre) return "Music";
        // Convert (13) style genres
        const match = genre.match(/^\((\d+)\)$/);
        if (match) {
            const genres = ["Blues", "Classic Rock", "Country", "Dance", "Disco", "Funk", "Grunge", "Hip-Hop", "Jazz", "Metal", "New Age", "Oldies", "Other", "Pop", "R&B", "Rap", "Reggae", "Rock", "Techno", "Industrial", "Alternative", "Ska", "Death Metal", "Pranks", "Soundtrack", "Euro-Techno", "Ambient", "Trip-Hop", "Vocal", "Jazz+Funk", "Fusion", "Trance", "Classical", "Instrumental", "Acid", "House", "Game", "Sound Clip", "Gospel", "Noise", "AlternRock", "Bass", "Soul", "Punk", "Space", "Meditative", "Instrumental Pop", "Instrumental Rock", "Ethnic", "Gothic", "Darkwave", "Techno-Industrial", "Electronic", "Pop-Folk", "Eurodance", "Dream", "Southern Rock", "Comedy", "Cult", "Gangsta", "Top 40", "Christian Rap", "Pop/Funk", "Jungle", "Native American", "Cabaret", "New Wave", "Psychadelic", "Rave", "Showtunes", "Trailer", "Lo-Fi", "Tribal", "Acid Punk", "Acid Jazz", "Polka", "Retro", "Musical", "Rock & Roll", "Hard Rock", "Folk", "Folk-Rock", "National Folk", "Swing", "Fast Fusion", "Bebob", "Latin", "Revival", "Celtic", "Bluegrass", "Avantgarde", "Gothic Rock", "Progressive Rock", "Psychedelic Rock", "Symphonic Rock", "Slow Rock", "Big Band", "Chorus", "Easy Listening", "Acoustic", "Humour", "Speech", "Chanson", "Opera", "Chamber Music", "Sonata", "Symphony", "Booty Bass", "Primus", "Porn Groove", "Satire", "Slow Jam", "Club", "Tango", "Samba", "Folklore", "Ballad", "Power Ballad", "Rhythmic Soul", "Freestyle", "Duet", "Punk Rock", "Drum Solo", "A capella", "Euro-House", "Dance Hall"];
            const idx = parseInt(match[1], 10);
            return genres[idx] || genre;
        }
        return genre;
    }

    static getAudioDuration(file) {
        return new Promise((resolve) => {
            const audio = document.createElement("audio");
            audio.preload = "metadata";
            const url = URL.createObjectURL(file);
            audio.src = url;

            const cleanup = () => {
                URL.revokeObjectURL(url);
                audio.remove();
            };

            audio.onloadedmetadata = () => {
                const duration = Math.round(audio.duration);
                cleanup();
                resolve(duration || 0);
            };

            audio.onerror = () => {
                cleanup();
                resolve(0);
            };

            // Safety timeout after 2 seconds
            setTimeout(() => {
                cleanup();
                resolve(0);
            }, 2000);
        });
    }
}

window.ID3Parser = ID3Parser;
