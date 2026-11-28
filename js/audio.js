/**
 * Sangeet Audio Engine
 * Handles playback, Web Audio API processing, 5-band Equalizer,
 * real-time frequency analysis for visualizer, Queue, Shuffle, Repeat,
 * and Windows MediaSession multimedia keys integration.
 */

class AudioEngine {
    constructor() {
        this.audio = new Audio();
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "auto";
        this.audio.setAttribute("playsinline", "true");
        this.audio.setAttribute("webkit-playsinline", "true");

        // Mobile touch audio unlock
        const unlockAudio = () => {
            if (this.audioCtx && this.audioCtx.state === "suspended") {
                this.audioCtx.resume().catch(() => { });
            }
            document.removeEventListener("touchstart", unlockAudio);
            document.removeEventListener("click", unlockAudio);
        };
        document.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
        document.addEventListener("click", unlockAudio, { once: true });

        this.audioCtx = null;
        this.sourceNode = null;
        this.analyser = null;
        this.gainNode = null;
        this.eqFilters = [];

        this.currentSong = null;
        this.currentBlobUrl = null;
        this.queue = [];
        this.originalQueue = [];
        this.currentIndex = -1;

        this.isShuffled = false;
        // Persistent repeat mode: "off", "all", "one" (default "all")
        try {
            this.repeatMode = localStorage.getItem("sangeet_repeat_mode") || "all";
        } catch (e) {
            this.repeatMode = "all";
        }
        this.volume = 0.8;
        this.isMuted = false;
        this.playbackRate = 1.0;

        // Equalizer bands (Hz)
        this.eqBands = [60, 250, 1000, 4000, 12000];
        this.currentEqPreset = "Flat";

        this.listeners = {
            trackChange: [],
            play: [],
            pause: [],
            timeUpdate: [],
            ended: [],
            queueUpdate: [],
            modeChange: [],
            error: []
        };

        this.setupAudioListeners();
    }

    initAudioContext() {
        if (this.audioCtx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContextClass();

            // Create media source
            this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

            // Create 5-band EQ
            this.eqFilters = this.eqBands.map((freq, index) => {
                const filter = this.audioCtx.createBiquadFilter();
                if (index === 0) {
                    filter.type = "lowshelf";
                } else if (index === this.eqBands.length - 1) {
                    filter.type = "highshelf";
                } else {
                    filter.type = "peaking";
                    filter.Q.value = 1.4;
                }
                filter.frequency.value = freq;
                filter.gain.value = 0;
                return filter;
            });

            // Analyser for visualizer
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 128;
            this.analyser.smoothingTimeConstant = 0.8;

            // Master Gain
            this.gainNode = this.audioCtx.createGain();
            this.gainNode.gain.value = this.volume;

            // Connect graph: Source -> EQ0 -> EQ1 -> ... -> EQ4 -> Analyser -> Master Gain -> Destination
            let prevNode = this.sourceNode;
            this.eqFilters.forEach(filter => {
                prevNode.connect(filter);
                prevNode = filter;
            });

            prevNode.connect(this.analyser);
            this.analyser.connect(this.gainNode);
            this.gainNode.connect(this.audioCtx.destination);
        } catch (e) {
            console.warn("Web Audio API initialization deferred/unavailable:", e);
        }
    }

    setupAudioListeners() {
        this.audio.addEventListener("play", () => {
            if (this.audioCtx && this.audioCtx.state === "suspended") {
                this.audioCtx.resume();
            }
            this.emit("play", this.currentSong);
            this.updateMediaSessionState("playing");
            this.updateAndroidNotification(true);
        });

        this.audio.addEventListener("playing", () => {
            this.updateAndroidNotification(true);
        });

        this.audio.addEventListener("pause", () => {
            this.emit("pause", this.currentSong);
            this.updateMediaSessionState("paused");
            this.updateAndroidNotification(false);
        });

        this.audio.addEventListener("timeupdate", () => {
            this.emit("timeUpdate", {
                currentTime: this.audio.currentTime,
                duration: this.audio.duration || (this.currentSong ? this.currentSong.duration : 0)
            });
        });

        this.audio.addEventListener("ended", () => {
            this.emit("ended", this.currentSong);
            this.updateAndroidNotification(false);
            this.handleTrackEnded();
        });

        this.audio.addEventListener("error", (e) => {
            console.error("Audio playback error:", e);
            this.emit("error", e);
        });
    }

    async playSong(song, newQueue = null, index = null) {
        this.initAudioContext();
        if (this.audioCtx && this.audioCtx.state === "suspended") {
            await this.audioCtx.resume();
        }

        if (newQueue) {
            const foundIdx = newQueue.findIndex(s => String(s.id) === String(song.id));
            this.setQueue(newQueue, index !== null ? index : (foundIdx !== -1 ? foundIdx : 0));
        } else if (index !== null) {
            this.currentIndex = index;
        } else if (this.queue.length > 0) {
            const foundIdx = this.queue.findIndex(s => String(s.id) === String(song.id));
            if (foundIdx !== -1) this.currentIndex = foundIdx;
        }

        this.currentSong = song;

        // Cleanup previous object URL
        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }

        let audioSrc = "";
        if (song.audioBlob) {
            // Android WebView requires an explicit audio/mpeg MIME type to enable seeking on Blobs
            let blob = song.audioBlob;
            if (!blob.type || blob.type === "" || blob.type === "audio/mp3") {
                blob = new Blob([blob], { type: "audio/mpeg" });
            }
            this.currentBlobUrl = URL.createObjectURL(blob);
            audioSrc = this.currentBlobUrl;
        } else if (song.audioUrl) {
            audioSrc = (song.audioUrl.startsWith("/") && !song.audioUrl.startsWith("//")) ? song.audioUrl.substring(1) : song.audioUrl;
        }

        if (!audioSrc) {
            console.error("No valid audio source found for song:", song.title);
            return;
        }

        this.audio.src = audioSrc;
        this.audio.playbackRate = this.playbackRate;
        this.emit("trackChange", song);
        this.setupMediaSession(song);

        // Save last played song ID for default restore on next launch
        try {
            if (song && song.id) {
                localStorage.setItem("sangeet_last_played_song_id", String(song.id));
            }
        } catch (e) { }

        try {
            await this.audio.play();

            // Record play in DB
            if (window.musicDB && song.id) {
                window.musicDB.incrementPlayCount(song.id);
            }
        } catch (err) {
            console.warn("Playback autoplay prevented or error:", err);
        }
    }

    /**
     * Preloads the default / last played track into the player bar on app startup
     * without autoplaying, so the UI is NEVER blank!
     */
    loadDefaultTrack(song, newQueue = null) {
        if (!song) return;
        this.currentSong = song;

        if (newQueue && newQueue.length > 0) {
            const idx = newQueue.findIndex(s => String(s.id) === String(song.id));
            this.setQueue(newQueue, idx !== -1 ? idx : 0);
        } else {
            this.setQueue([song], 0);
        }

        let audioSrc = "";
        if (song.audioBlob) {
            try {
                let blob = song.audioBlob;
                if (!blob.type || blob.type === "" || blob.type === "audio/mp3") {
                    blob = new Blob([blob], { type: "audio/mpeg" });
                }
                this.currentBlobUrl = URL.createObjectURL(blob);
                audioSrc = this.currentBlobUrl;
            } catch (e) { }
        } else if (song.audioUrl) {
            audioSrc = (song.audioUrl.startsWith("/") && !song.audioUrl.startsWith("//")) ? song.audioUrl.substring(1) : song.audioUrl;
        }

        if (audioSrc) {
            this.audio.src = audioSrc;
            this.audio.playbackRate = this.playbackRate;
        }

        this.emit("trackChange", song);
        this.setupMediaSession(song);
        this.updateAndroidNotification(true);
    }

    async play() {
        if (this.audio.paused) {
            this.initAudioContext();
            if (this.audioCtx && this.audioCtx.state === "suspended") {
                await this.audioCtx.resume();
            }
            await this.audio.play();
            this.updateAndroidNotification(true);
        }
    }

    pause() {
        if (!this.audio.paused) {
            this.audio.pause();
            this.updateAndroidNotification(false);
        }
    }

    updateAndroidNotification(isPlaying) {
        if (window.AndroidBridge && typeof window.AndroidBridge.updateNotification === "function") {
            const title = this.currentSong ? (this.currentSong.title || "Sangeet Local") : "Sangeet Local";
            const artist = this.currentSong ? (this.currentSong.artist || "Regional Artist") : "Basugaon Studio";
            try {
                window.AndroidBridge.updateNotification(title, artist, !!isPlaying);
            } catch (e) {
                console.warn("AndroidBridge notification sync error:", e);
            }
        }
    }

    async togglePlay() {
        if (!this.currentSong && this.queue.length > 0) {
            await this.playSong(this.queue[0], null, 0);
            return;
        }

        if (this.audio.paused) {
            this.initAudioContext();
            if (this.audioCtx && this.audioCtx.state === "suspended") {
                await this.audioCtx.resume();
            }
            await this.audio.play();
        } else {
            this.audio.pause();
        }
    }

    getDuration() {
        if (Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
            return this.audio.duration;
        }
        if (this.currentSong && Number.isFinite(this.currentSong.duration) && this.currentSong.duration > 0) {
            return this.currentSong.duration;
        }
        return 0;
    }

    seek(seconds) {
        const dur = this.getDuration();
        if (dur > 0 && Number.isFinite(dur)) {
            const target = Math.max(0, Math.min(seconds, dur));
            try {
                if (typeof this.audio.fastSeek === "function") {
                    this.audio.fastSeek(target);
                } else {
                    this.audio.currentTime = target;
                }
            } catch (e) {
                console.warn("Seek error:", e);
                try {
                    this.audio.currentTime = target;
                } catch (e2) { }
            }
        }
    }

    seekPercent(percent) {
        const dur = this.getDuration();
        if (dur > 0 && Number.isFinite(dur)) {
            const target = Math.max(0, Math.min((percent / 100) * dur, dur));
            try {
                if (typeof this.audio.fastSeek === "function") {
                    this.audio.fastSeek(target);
                } else {
                    this.audio.currentTime = target;
                }
            } catch (e) {
                console.warn("Seek percent error:", e);
                try {
                    this.audio.currentTime = target;
                } catch (e2) { }
            }
        }
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.isMuted) this.isMuted = false;
        this.audio.volume = this.volume;
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.audio.muted = this.isMuted;
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
        }
        return this.isMuted;
    }

    setPlaybackRate(rate) {
        this.playbackRate = rate;
        this.audio.playbackRate = rate;
    }

    // --- QUEUE & NAVIGATION ---

    setQueue(songs, startIndex = 0) {
        this.originalQueue = [...songs];
        if (this.isShuffled) {
            this.queue = this.shuffleArray([...songs]);
            const playing = songs[startIndex];
            if (playing) {
                // Ensure current song is at front or current index
                this.queue = [playing, ...this.queue.filter(s => s.id !== playing.id)];
                this.currentIndex = 0;
            }
        } else {
            this.queue = [...songs];
            this.currentIndex = startIndex;
        }
        this.emit("queueUpdate", this.queue);
    }

    addToQueue(song) {
        this.queue.push(song);
        this.originalQueue.push(song);
        if (this.queue.length === 1 && !this.currentSong) {
            this.playSong(song, null, 0);
        }
        this.emit("queueUpdate", this.queue);
    }

    removeFromQueue(index) {
        if (index >= 0 && index < this.queue.length) {
            const removed = this.queue.splice(index, 1)[0];
            this.originalQueue = this.originalQueue.filter(s => s.id !== removed.id);
            if (index < this.currentIndex) {
                this.currentIndex--;
            } else if (index === this.currentIndex) {
                if (this.queue.length > 0) {
                    this.playSong(this.queue[Math.min(this.currentIndex, this.queue.length - 1)], null, Math.min(this.currentIndex, this.queue.length - 1));
                } else {
                    this.audio.pause();
                    this.currentSong = null;
                }
            }
            this.emit("queueUpdate", this.queue);
        }
    }

    clearQueue() {
        this.queue = [];
        this.originalQueue = [];
        this.currentIndex = -1;
        this.audio.pause();
        this.currentSong = null;
        this.emit("queueUpdate", this.queue);
        this.emit("trackChange", null);
    }

    playNext() {
        if (this.queue.length === 0) return;

        if (this.currentIndex < this.queue.length - 1) {
            this.currentIndex++;
            this.playSong(this.queue[this.currentIndex], null, this.currentIndex);
        } else if (this.repeatMode === "all" || this.repeatMode === "one") {
            // In Repeat All, or when user clicks next on Repeat One, wrap back to the first song
            this.currentIndex = 0;
            this.playSong(this.queue[0], null, 0);
        } else {
            // Repeat Off: at end of queue, stop
            this.audio.pause();
            this.audio.currentTime = 0;
            this.emit("pause", this.currentSong);
        }
    }

    playPrevious() {
        if (this.queue.length === 0) return;

        // If track played > 3 seconds, restart current track
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
            return;
        }

        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.playSong(this.queue[this.currentIndex], null, this.currentIndex);
        } else if (this.repeatMode === "all" || this.repeatMode === "one") {
            this.currentIndex = this.queue.length - 1;
            this.playSong(this.queue[this.currentIndex], null, this.currentIndex);
        } else {
            this.audio.currentTime = 0;
        }
    }

    handleTrackEnded() {
        if (this.repeatMode === "one") {
            // Repeat One: restart the exact same track cleanly (works on both Android APK and browser)
            if (this.currentSong) {
                this.playSong(this.currentSong, null, this.currentIndex);
            } else {
                this.audio.currentTime = 0;
                this.audio.play().catch(() => {});
            }
        } else if (this.repeatMode === "all") {
            // Repeat All: advance to next track, or wrap to first track if at end of queue
            if (this.currentIndex < this.queue.length - 1) {
                this.playNext();
            } else if (this.queue.length > 0) {
                this.currentIndex = 0;
                this.playSong(this.queue[0], null, 0);
            }
        } else {
            // Repeat Off: advance if next exists, otherwise stop at end
            if (this.currentIndex < this.queue.length - 1) {
                this.playNext();
            } else {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.emit("pause", this.currentSong);
            }
        }
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        if (this.isShuffled) {
            const current = this.currentSong;
            this.queue = this.shuffleArray([...this.originalQueue]);
            if (current) {
                this.queue = [current, ...this.queue.filter(s => String(s.id) !== String(current.id))];
                this.currentIndex = 0;
            }
        } else {
            const current = this.currentSong;
            this.queue = [...this.originalQueue];
            if (current) {
                this.currentIndex = this.queue.findIndex(s => String(s.id) === String(current.id));
                if (this.currentIndex === -1) this.currentIndex = 0;
            }
        }
        this.emit("modeChange", { shuffle: this.isShuffled, repeat: this.repeatMode });
        this.emit("queueUpdate", this.queue);
        return this.isShuffled;
    }

    cycleRepeat() {
        const modes = ["off", "all", "one"];
        const nextIndex = (modes.indexOf(this.repeatMode) + 1) % modes.length;
        this.repeatMode = modes[nextIndex];
        try {
            localStorage.setItem("sangeet_repeat_mode", this.repeatMode);
        } catch (e) {}
        this.emit("modeChange", { shuffle: this.isShuffled, repeat: this.repeatMode });
        return this.repeatMode;
    }

    shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // --- EQUALIZER ---

    setEqualizerPreset(presetName) {
        this.initAudioContext();
        this.currentEqPreset = presetName;

        const presets = {
            "Flat": [0, 0, 0, 0, 0],
            "Bass Boost": [7, 4, 1, 0, -1],
            "Treble Boost": [-2, 0, 1, 4, 7],
            "Indian Classical": [2, 1, 5, 4, 2],
            "Electronic": [6, 4, -1, 3, 5],
            "Rock": [5, 3, -1, 3, 4],
            "Vocal": [-2, 1, 6, 3, 1]
        };

        const gains = presets[presetName] || presets["Flat"];
        this.eqFilters.forEach((filter, index) => {
            if (filter) {
                filter.gain.setValueAtTime(gains[index] || 0, this.audioCtx.currentTime);
            }
        });
    }

    setBandGain(bandIndex, gainValue) {
        this.initAudioContext();
        if (this.eqFilters[bandIndex]) {
            this.eqFilters[bandIndex].gain.setValueAtTime(gainValue, this.audioCtx.currentTime);
        }
    }

    // --- VISUALIZER DATA ---

    getFrequencyData() {
        if (!this.analyser) return new Uint8Array(32);
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(data);
        return data;
    }

    // --- MEDIASESSION API (Windows lockscreen & hardware multimedia keys) ---

    setupMediaSession(song) {
        if (!("mediaSession" in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title || "Unknown Title",
            artist: song.artist || "Unknown Artist",
            album: song.album || "Sangeet Music",
            artwork: song.coverUrl ? [{ src: song.coverUrl, sizes: "512x512", type: "image/png" }] : []
        });

        navigator.mediaSession.setActionHandler("play", () => this.togglePlay());
        navigator.mediaSession.setActionHandler("pause", () => this.togglePlay());
        navigator.mediaSession.setActionHandler("previoustrack", () => this.playPrevious());
        navigator.mediaSession.setActionHandler("nexttrack", () => this.playNext());
        navigator.mediaSession.setActionHandler("seekto", (details) => {
            if (details.seekTime !== undefined) this.seek(details.seekTime);
        });
    }

    updateMediaSessionState(state) {
        if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = state;
        }
    }

    // --- EVENT SYSTEM ---

    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try { cb(data); } catch (e) { console.error("Listener error:", e); }
            });
        }
    }
}

window.audioEngine = new AudioEngine();
