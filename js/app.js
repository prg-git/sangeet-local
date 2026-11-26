/**
 * Sangeet App Initializer
 * Orchestrates startup, syncs local and server libraries,
 * seeds demo showcase music if empty, and registers global keyboard shortcuts.
 */

class SangeetApp {
    static async init() {
        const startTime = Date.now();
        console.log("Initializing Sangeet Music Studio with Mobile Sync...");

        try {
            await window.musicDB.init();

            // Load saved theme
            let savedTheme = await window.musicDB.getSetting("theme", "dark");
            if (savedTheme === "jiosaavn" || savedTheme === "gaana") {
                savedTheme = "dark";
            }
            if (savedTheme) {
                window.ui.setTheme(savedTheme);
                window.ui.dom.themeSelect.value = savedTheme;
            }

            // Sync: Check if there are any songs in local IndexedDB not yet on server
            await this.syncLocalSongsToServer();

            // Check if server or library is empty. If so, seed showcase tracks to server
            const existingSongs = await window.musicDB.getAllSongs();
            if (existingSongs.length === 0) {
                console.log("Empty library: Generating starter showcase tracks to shared server...");
                window.ui.showToast("Preparing your shared music library...");

                try {
                    const sampleTracks = await window.DemoTrackGenerator.generateSampleTracks();
                    for (const sample of sampleTracks) {
                        const coverBlob = await sample.coverBlob;
                        await window.musicDB.addSong(sample.songData, sample.audioBlob, coverBlob);
                    }

                    // Create starter playlist
                    const pl = await window.musicDB.createPlaylist("Chill Bollywood & Lo-Fi", "Relaxing instrumental vibes");
                    const allCreated = await window.musicDB.getAllSongs();
                    if (allCreated.length > 0) {
                        await window.musicDB.addSongToPlaylist(pl.id, allCreated[0].id);
                        if (allCreated[1]) await window.musicDB.addSongToPlaylist(pl.id, allCreated[1].id);
                    }
                } catch (synthErr) {
                    console.warn("Showcase tracks generation deferred:", synthErr);
                }
            }

            // Load playlists in sidebar
            await window.ui.loadPlaylists();

            // Initial view
            await window.ui.switchView("home");

            // Update stats
            await window.ui.updateCounters();

            // Register keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Register PWA service worker
            this.registerServiceWorker();

            console.log("Sangeet Music Studio ready with PC & Mobile Live Sync!");
        } catch (err) {
            console.error("Initialization error:", err);
        } finally {
            // Dismiss modern animated splash screen smoothly
            this.dismissSplashScreen(startTime);
        }
    }

    /**
     * Smoothly transitions out the splash screen after the music engine & view have loaded
     */
    static dismissSplashScreen(startTime = 0) {
        const splash = document.getElementById("appSplashScreen");
        if (!splash) return;

        // Ensure minimum 2.2s display time for the visual music beats animation
        const elapsed = Date.now() - startTime;
        const minDuration = 2200;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
            splash.classList.add("splash-fade-out");
            setTimeout(() => {
                splash.style.display = "none";
                if (splash.parentNode) splash.parentNode.removeChild(splash);
            }, 650);
        }, remaining);
    }

    /**
     * Auto-migrates any songs stored in browser-only IndexedDB to the PC server
     * so that mobile phones and any other devices can immediately see and play them!
     */
    static async syncLocalSongsToServer() {
        if (!window.musicDB.isServerConnected || !window.musicDB.db) return;

        try {
            const localSongs = await window.musicDB.getLocalIndexedDBSongs();
            const serverSongs = await (async () => {
                const res = await fetch("/api/songs", { cache: "no-store" });
                return res.ok ? (await res.json()).songs || [] : [];
            })();

            const serverSongIds = new Set(serverSongs.map(s => s.id));
            const serverSongTitles = new Set(serverSongs.map(s => s.title.toLowerCase()));

            for (const localSong of localSongs) {
                // If local song has an audioBlob and isn't on server yet, upload it to the server!
                if (localSong.audioBlob && !serverSongIds.has(localSong.id) && !serverSongTitles.has(localSong.title.toLowerCase())) {
                    console.log(`Syncing local track "${localSong.title}" to shared server...`);
                    await window.musicDB.addSong(localSong, localSong.audioBlob, localSong.coverBlob);
                }
            }
        } catch (e) {
            console.warn("Local to server migration notice:", e);
        }
    }

    static setupKeyboardShortcuts() {
        window.addEventListener("keydown", (e) => {
            // Do not trigger shortcuts if user is typing in an input or textarea
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
            if (tag === "input" || tag === "textarea" || tag === "select") {
                if (e.key === "Escape") {
                    document.activeElement.blur();
                }
                return;
            }

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    window.audioEngine.togglePlay();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    window.audioEngine.seek(window.audioEngine.audio.currentTime - 5);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    window.audioEngine.seek(window.audioEngine.audio.currentTime + 5);
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    window.ui.dom.volumeSlider.value = Math.min(1, window.audioEngine.volume + 0.05);
                    window.audioEngine.setVolume(parseFloat(window.ui.dom.volumeSlider.value));
                    window.ui.updateVolumeIcon(window.audioEngine.volume, false);
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    window.ui.dom.volumeSlider.value = Math.max(0, window.audioEngine.volume - 0.05);
                    window.audioEngine.setVolume(parseFloat(window.ui.dom.volumeSlider.value));
                    window.ui.updateVolumeIcon(window.audioEngine.volume, false);
                    break;
                case "KeyM":
                    const muted = window.audioEngine.toggleMute();
                    window.ui.updateVolumeIcon(window.audioEngine.volume, muted);
                    window.ui.showToast(muted ? "Muted" : "Unmuted");
                    break;
                case "KeyN":
                    window.audioEngine.playNext();
                    break;
                case "KeyP":
                    window.audioEngine.playPrevious();
                    break;
                case "KeyS":
                    const shuffled = window.audioEngine.toggleShuffle();
                    window.ui.dom.btnShuffle.classList.toggle("active", shuffled);
                    window.ui.showToast(shuffled ? "Shuffle Enabled" : "Shuffle Disabled");
                    break;
                case "KeyR":
                    const mode = window.audioEngine.cycleRepeat();
                    window.ui.dom.btnRepeat.classList.toggle("active", mode !== "off");
                    window.ui.dom.btnRepeat.innerHTML = mode === "one" ? "🔂" : "🔁";
                    window.ui.showToast("Repeat: " + mode.toUpperCase());
                    break;
                case "KeyL":
                    window.ui.dom.playerLikeBtn.click();
                    break;
                case "KeyF":
                    if (window.ui.dom.fullscreenPlayer.classList.contains("active")) {
                        window.ui.closeFullscreenPlayer();
                    } else {
                        window.ui.openFullscreenPlayer();
                    }
                    break;
                case "Escape":
                    document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active"));
                    window.ui.closeFullscreenPlayer();
                    break;
            }
        });
    }

    static registerServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("sw.js").then((reg) => {
                reg.update();
            }).catch(e => {
                // Service worker registration optional for local file preview
            });
        }
    }
}

// Start app on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
    SangeetApp.init();
});
