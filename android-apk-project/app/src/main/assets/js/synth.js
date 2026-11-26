/**
 * Procedural Audio & Showcase Tracks Generator
 * Generates rich, relaxing instrumental tracks (Lo-fi Indian beat, Acoustic Raga, Chill Electronic)
 * using the Web Audio API OfflineAudioContext, rendered into real playable WAV Blobs.
 */

class DemoTrackGenerator {
    static async generateSampleTracks() {
        const tracks = [
            {
                title: "Midnight Mumbai Lo-Fi",
                artist: "Aarav Sharma",
                album: "City Lights & Chai",
                genre: "Lo-Fi Beats",
                year: "2024",
                duration: 48,
                bpm: 78,
                key: "C minor",
                coverGradient: ["#1db954", "#191414"],
                lyrics: `[00:00] (Soft vinyl crackle and rain falling outside the window)
[00:08] Chai steaming in the midnight breeze
[00:16] Streetlights reflecting on quiet streets
[00:24] Distant echoes of Marine Drive
[00:32] Relaxing thoughts, peaceful dreams
[00:40] (Gentle piano fade)`
            },
            {
                title: "Raga Reflections (Sitar Chill)",
                artist: "Sitar Fusion Ensemble",
                album: "Heritage Vibrations",
                genre: "Classical Fusion",
                year: "2024",
                duration: 45,
                bpm: 86,
                key: "D Indian Pentatonic",
                coverGradient: ["#ff5e3a", "#2b0a3d"],
                lyrics: `[00:00] (Alap - Sacred resonant sitar drone)
[00:10] Harmonics intertwine with modern rhythm
[00:22] A modern tribute to ancient ragas
[00:34] Peaceful twilight serenity`
            },
            {
                title: "Punjabi Cyber Beat",
                artist: "DJ Desi Vibe",
                album: "Bhangra Bass Vol. 1",
                genre: "Electronic / Punjabi",
                year: "2024",
                duration: 42,
                bpm: 110,
                key: "G minor",
                coverGradient: ["#e91e63", "#4a148c"],
                lyrics: `[00:00] (Bass drop countdown)
[00:06] Turn up the bass!
[00:15] Dholak rhythm kicking into high gear
[00:28] High energy electro Punjabi swing!
[00:38] Drop it low!`
            },
            {
                title: "Monsoon Serenade",
                artist: "Priya Nair",
                album: "Acoustic Rain",
                genre: "Acoustic / Ambient",
                year: "2024",
                duration: 46,
                bpm: 72,
                key: "F major",
                coverGradient: ["#00c6ff", "#0072ff"],
                lyrics: `[00:00] (Droplets falling gently on leaves)
[00:10] Smell of petrichor in the air
[00:20] Acoustic guitar strumming softly
[00:32] Watching the clouds drift across the sky`
            }
        ];

        const generatedSongs = [];

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            const audioBlob = await this.renderProceduralAudio(track);
            const coverBlob = this.generateCoverImage(track.title, track.artist, track.coverGradient);

            generatedSongs.push({
                songData: {
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    genre: track.genre,
                    year: track.year,
                    duration: track.duration,
                    lyrics: track.lyrics,
                    isLiked: i === 0, // Like the first track by default
                    dateAdded: Date.now() - (tracks.length - i) * 60000
                },
                audioBlob,
                coverBlob
            });
        }

        return generatedSongs;
    }

    static async renderProceduralAudio(track) {
        const sampleRate = 44100;
        const duration = track.duration;
        const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, sampleRate * duration, sampleRate);

        const now = 0;
        const bpm = track.bpm;
        const beatDur = 60 / bpm;

        // Master gain & compressor for punchy music sound
        const masterGain = offlineCtx.createGain();
        masterGain.gain.setValueAtTime(0.7, now);
        masterGain.gain.setValueAtTime(0.7, duration - 3);
        masterGain.gain.linearRampToValueAtTime(0.001, duration); // Smooth fade out

        const compressor = offlineCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, now);
        compressor.knee.setValueAtTime(30, now);
        compressor.ratio.setValueAtTime(8, now);
        compressor.attack.setValueAtTime(0.003, now);
        compressor.release.setValueAtTime(0.25, now);

        masterGain.connect(compressor);
        compressor.connect(offlineCtx.destination);

        // Sub-bass / Kick rhythm
        const totalBeats = Math.floor(duration / beatDur);
        for (let b = 0; b < totalBeats; b++) {
            const t = b * beatDur;

            // Kick on beats 0, 2 (or 0, 1, 2, 3 for dance)
            if (track.bpm > 95 || (b % 2 === 0)) {
                const osc = offlineCtx.createOscillator();
                const g = offlineCtx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(130, t);
                osc.frequency.exponentialRampToValueAtTime(38, t + 0.12);

                g.gain.setValueAtTime(0.8, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

                osc.connect(g);
                g.connect(masterGain);
                osc.start(t);
                osc.stop(t + 0.25);
            }

            // Snare / Rimshot on alternate beats
            if (b % 2 === 1) {
                // Noise burst
                const bufferSize = sampleRate * 0.1;
                const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                const whiteNoise = offlineCtx.createBufferSource();
                whiteNoise.buffer = noiseBuffer;

                const filter = offlineCtx.createBiquadFilter();
                filter.type = "bandpass";
                filter.frequency.setValueAtTime(1200, t);
                filter.Q.setValueAtTime(2, t);

                const snareGain = offlineCtx.createGain();
                snareGain.gain.setValueAtTime(0.35, t);
                snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

                whiteNoise.connect(filter);
                filter.connect(snareGain);
                snareGain.connect(masterGain);
                whiteNoise.start(t);
                whiteNoise.stop(t + 0.18);
            }

            // Hi-hats on 8th notes
            const hatTimes = [t, t + beatDur / 2];
            hatTimes.forEach(ht => {
                const hatSize = sampleRate * 0.04;
                const hatBuffer = offlineCtx.createBuffer(1, hatSize, sampleRate);
                const hatOut = hatBuffer.getChannelData(0);
                for (let i = 0; i < hatSize; i++) {
                    hatOut[i] = Math.random() * 2 - 1;
                }
                const hatSource = offlineCtx.createBufferSource();
                hatSource.buffer = hatBuffer;

                const hatFilter = offlineCtx.createBiquadFilter();
                hatFilter.type = "highpass";
                hatFilter.frequency.setValueAtTime(6500, ht);

                const hatGain = offlineCtx.createGain();
                hatGain.gain.setValueAtTime(0.18, ht);
                hatGain.gain.exponentialRampToValueAtTime(0.001, ht + 0.04);

                hatSource.connect(hatFilter);
                hatFilter.connect(hatGain);
                hatGain.connect(masterGain);
                hatSource.start(ht);
                hatSource.stop(ht + 0.05);
            });
        }

        // Chords & Harmonic Melodic Layers
        const chordProgressions = [
            [261.63, 311.13, 392.00, 466.16], // Cm7
            [233.08, 293.66, 349.23, 440.00], // Bb
            [207.65, 261.63, 311.13, 392.00], // Ab
            [196.00, 246.94, 293.66, 392.00]  // G
        ];

        const barDur = beatDur * 4;
        const totalBars = Math.floor(duration / barDur);

        for (let bar = 0; bar < totalBars; bar++) {
            const chord = chordProgressions[bar % chordProgressions.length];
            const barStart = bar * barDur;

            chord.forEach((freq, idx) => {
                const osc = offlineCtx.createOscillator();
                const g = offlineCtx.createGain();
                // Lo-fi warm triangle / sine mix
                osc.type = idx % 2 === 0 ? "triangle" : "sine";
                osc.frequency.setValueAtTime(freq, barStart);

                // Slight stereo pan
                const panner = offlineCtx.createStereoPanner ? offlineCtx.createStereoPanner() : null;
                if (panner) {
                    panner.pan.setValueAtTime((idx - 1.5) * 0.4, barStart);
                }

                // Envelope
                g.gain.setValueAtTime(0.001, barStart);
                g.gain.linearRampToValueAtTime(0.12, barStart + 0.4);
                g.gain.setValueAtTime(0.1, barStart + barDur - 0.4);
                g.gain.exponentialRampToValueAtTime(0.001, barStart + barDur);

                if (panner) {
                    osc.connect(panner);
                    panner.connect(g);
                } else {
                    osc.connect(g);
                }
                g.connect(masterGain);

                osc.start(barStart);
                osc.stop(barStart + barDur);
            });

            // Melody riffs
            const pentatonic = [392.00, 466.16, 523.25, 587.33, 622.25, 698.46, 783.99];
            for (let note = 0; note < 4; note++) {
                const noteTime = barStart + note * beatDur;
                const mFreq = pentatonic[(bar * 2 + note) % pentatonic.length];

                const melOsc = offlineCtx.createOscillator();
                const melGain = offlineCtx.createGain();
                melOsc.type = "sine";
                melOsc.frequency.setValueAtTime(mFreq, noteTime);

                melGain.gain.setValueAtTime(0.001, noteTime);
                melGain.gain.linearRampToValueAtTime(0.18, noteTime + 0.05);
                melGain.gain.exponentialRampToValueAtTime(0.001, noteTime + beatDur * 0.85);

                melOsc.connect(melGain);
                melGain.connect(masterGain);
                melOsc.start(noteTime);
                melOsc.stop(noteTime + beatDur);
            }
        }

        const renderedBuffer = await offlineCtx.startRendering();
        return this.audioBufferToWavBlob(renderedBuffer);
    }

    static audioBufferToWavBlob(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        let interleaved;
        if (numChannels === 2) {
            const left = buffer.getChannelData(0);
            const right = buffer.getChannelData(1);
            interleaved = new Float32Array(left.length + right.length);
            for (let i = 0; i < left.length; i++) {
                interleaved[i * 2] = left[i];
                interleaved[i * 2 + 1] = right[i];
            }
        } else {
            interleaved = buffer.getChannelData(0);
        }

        const dataLength = interleaved.length * (bitDepth / 8);
        const headerLength = 44;
        const totalLength = headerLength + dataLength;

        const arrayBuffer = new ArrayBuffer(totalLength);
        const view = new DataView(arrayBuffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        // RIFF chunk descriptor
        writeString(0, "RIFF");
        view.setUint32(4, totalLength - 8, true);
        writeString(8, "WAVE");

        // FMT sub-chunk
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
        view.setUint16(32, numChannels * (bitDepth / 8), true);
        view.setUint16(34, bitDepth, true);

        // DATA sub-chunk
        writeString(36, "data");
        view.setUint32(40, dataLength, true);

        // Write 16-bit PCM audio samples
        let offset = 44;
        for (let i = 0; i < interleaved.length; i++) {
            let sample = Math.max(-1, Math.min(1, interleaved[i]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, sample, true);
            offset += 2;
        }

        return new Blob([view], { type: "audio/wav" });
    }

    static generateCoverImage(title, artist, gradientColors) {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 400, 400);
        grad.addColorStop(0, gradientColors[0] || "#0a84ff");
        grad.addColorStop(1, gradientColors[1] || "#111827");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 400, 400);

        // Subtle geometric pattern
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 2;
        for (let r = 50; r <= 250; r += 35) {
            ctx.beginPath();
            ctx.arc(200, 180, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Music icon glyph
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 72px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♫", 200, 170);

        // Title text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px 'Segoe UI', system-ui, sans-serif";
        const cleanTitle = title.length > 22 ? title.substring(0, 20) + "..." : title;
        ctx.fillText(cleanTitle, 200, 310);

        // Artist text
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "500 18px 'Segoe UI', system-ui, sans-serif";
        const cleanArtist = artist.length > 25 ? artist.substring(0, 23) + "..." : artist;
        ctx.fillText(cleanArtist, 200, 345);

        // Badge
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.roundRect(150, 365, 100, 20, 10);
        ctx.fill();
        ctx.fillStyle = "#00e676";
        ctx.font = "600 10px 'Segoe UI', sans-serif";
        ctx.fillText("SANGEET HD", 200, 378);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, "image/png");
        });
    }
}

window.DemoTrackGenerator = DemoTrackGenerator;
