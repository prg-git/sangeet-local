/**
 * Sangeet UI Controller
 * Manages views, DOM rendering, user interactions, modals,
 * drag-and-drop music uploading, deletion, playlists, and visualizer rendering.
 */

class UIController {
    constructor() {
        this.currentView = "home";
        this.selectedFilter = "all";
        this.viewHistory = ["home"];
        this.historyIndex = 0;
        this.currentPlaylistId = null;
        this.bannersData = null;

        // Visualizer animation frame
        this.animFrameId = null;

        // Cache DOM elements
        this.dom = {
            viewContainer: document.getElementById("viewContainer"),
            contentBody: document.getElementById("contentBody"),
            librarySongCount: document.getElementById("librarySongCount"),
            likedSongCount: document.getElementById("likedSongCount"),
            playlistsList: document.getElementById("playlistsList"),
            storageUsedText: document.getElementById("storageUsedText"),
            storageProgressBar: document.getElementById("storageProgressBar"),
            globalSearchInput: document.getElementById("globalSearchInput"),
            btnSearchClear: document.getElementById("btnSearchClear"),
            themeSelect: document.getElementById("themeSelect"),

            // Player Bar
            playerCoverWrap: document.getElementById("playerCoverWrap"),
            playerCoverImg: document.getElementById("playerCoverImg"),
            playerSongTitle: document.getElementById("playerSongTitle"),
            playerSongArtist: document.getElementById("playerSongArtist"),
            playerLikeBtn: document.getElementById("playerLikeBtn"),
            playerLyricsBtn: document.getElementById("playerLyricsBtn"),
            btnPlayPause: document.getElementById("btnPlayPause"),
            btnPrevious: document.getElementById("btnPrevious"),
            btnNext: document.getElementById("btnNext"),
            btnShuffle: document.getElementById("btnShuffle"),
            btnRepeat: document.getElementById("btnRepeat"),
            currentTimeText: document.getElementById("currentTimeText"),
            totalDurationText: document.getElementById("totalDurationText"),
            progressBarWrap: document.getElementById("progressBarWrap"),
            progressFill: document.getElementById("progressFill"),
            miniVisualizerCanvas: document.getElementById("miniVisualizerCanvas"),
            btnPlaybackSpeed: document.getElementById("btnPlaybackSpeed"),
            btnQueueToggle: document.getElementById("btnQueueToggle"),
            queueBadge: document.getElementById("queueBadge"),
            btnMute: document.getElementById("btnMute"),
            volumeSlider: document.getElementById("volumeSlider"),
            btnFullscreenPlayer: document.getElementById("btnFullscreenPlayer"),

            // Modals
            addMusicModal: document.getElementById("addMusicModal"),
            editSongModal: document.getElementById("editSongModal"),
            equalizerModal: document.getElementById("equalizerModal"),
            queueDrawerModal: document.getElementById("queueDrawerModal"),
            fullscreenPlayer: document.getElementById("fullscreenPlayer"),
            fileDropzone: document.getElementById("fileDropzone"),
            fileInput: document.getElementById("fileInput"),
            folderInput: document.getElementById("folderInput"),
            btnBrowseFiles: document.getElementById("btnBrowseFiles"),
            btnBrowseFolder: document.getElementById("btnBrowseFolder"),
            streamUrlInput: document.getElementById("streamUrlInput"),
            btnAddStreamUrl: document.getElementById("btnAddStreamUrl"),
            uploadQueueContainer: document.getElementById("uploadQueueContainer"),
            uploadQueueList: document.getElementById("uploadQueueList"),
            uploadProgressCount: document.getElementById("uploadProgressCount"),

            // Edit Modal Inputs
            editSongId: document.getElementById("editSongId"),
            editTitle: document.getElementById("editTitle"),
            editArtist: document.getElementById("editArtist"),
            editAlbum: document.getElementById("editAlbum"),
            editGenre: document.getElementById("editGenre"),
            editYear: document.getElementById("editYear"),
            editLyrics: document.getElementById("editLyrics"),
            editCoverPreview: document.getElementById("editCoverPreview"),
            btnChooseEditCover: document.getElementById("btnChooseEditCover"),
            btnRemoveEditCover: document.getElementById("btnRemoveEditCover"),
            editCoverFileInput: document.getElementById("editCoverFileInput"),
            editCoverUrlInput: document.getElementById("editCoverUrlInput"),
            btnSaveMetadata: document.getElementById("btnSaveMetadata"),
            btnDeleteCurrentSongModal: document.getElementById("btnDeleteCurrentSongModal"),

            // Add Music Modal Tabs & Custom Upload
            tabBtnQuickImport: document.getElementById("tabBtnQuickImport"),
            tabBtnCustomUpload: document.getElementById("tabBtnCustomUpload"),
            tabQuickImportContent: document.getElementById("tabQuickImportContent"),
            tabCustomUploadContent: document.getElementById("tabCustomUploadContent"),
            customAudioInput: document.getElementById("customAudioInput"),
            btnBrowseCustomAudio: document.getElementById("btnBrowseCustomAudio"),
            customAudioBadge: document.getElementById("customAudioBadge"),
            customCoverInput: document.getElementById("customCoverInput"),
            btnBrowseCustomCover: document.getElementById("btnBrowseCustomCover"),
            btnRemoveCustomCover: document.getElementById("btnRemoveCustomCover"),
            customCoverPreview: document.getElementById("customCoverPreview"),
            customTitle: document.getElementById("customTitle"),
            customArtist: document.getElementById("customArtist"),
            customAlbum: document.getElementById("customAlbum"),
            customGenre: document.getElementById("customGenre"),
            btnSubmitCustomUpload: document.getElementById("btnSubmitCustomUpload"),

            // Equalizer
            eqPresetSelect: document.getElementById("eqPresetSelect"),

            // Fullscreen Now Playing (v2.0.0 Mobile Studio)
            fsCoverArt: document.getElementById("fsCoverArt"),
            fsSongTitle: document.getElementById("fsSongTitle"),
            fsSongArtist: document.getElementById("fsSongArtist"),
            fsLyricsText: document.getElementById("fsLyricsText"),
            fsBgBlur: document.getElementById("fsBgBlur"),
            fsVisualizerCanvas: document.getElementById("fsVisualizerCanvas"),
            btnCloseFullscreen: document.getElementById("btnCloseFullscreen"),
            fsBtnPlayPause: document.getElementById("fsBtnPlayPause"),
            fsBtnPrevious: document.getElementById("fsBtnPrevious"),
            fsBtnNext: document.getElementById("fsBtnNext"),
            fsBtnShuffle: document.getElementById("fsBtnShuffle"),
            fsBtnRepeat: document.getElementById("fsBtnRepeat"),
            fsLikeBtn: document.getElementById("fsLikeBtn"),
            fsProgressBarWrap: document.getElementById("fsProgressBarWrap"),
            fsProgressFill: document.getElementById("fsProgressFill"),
            fsProgressThumb: document.getElementById("fsProgressThumb"),
            fsCurrentTimeText: document.getElementById("fsCurrentTimeText"),
            fsDurationText: document.getElementById("fsDurationText"),
            fsBtnSpeed: document.getElementById("fsBtnSpeed"),
            fsSpeedText: document.getElementById("fsSpeedText"),
            fsBtnOpenEq: document.getElementById("fsBtnOpenEq"),
            fsBtnQueueToggle: document.getElementById("fsBtnQueueToggle"),
            fsBtnLyricsToggle: document.getElementById("fsBtnLyricsToggle"),
            fsLyricsSheet: document.getElementById("fsLyricsSheet"),
            btnCloseLyricsSheet: document.getElementById("btnCloseLyricsSheet"),
            fsGenreBadge: document.getElementById("fsGenreBadge"),
            fsArtworkCard: document.getElementById("fsArtworkCard"),

            // Toast
            toastContainer: document.getElementById("toastContainer")
        };

        this.initEventListeners();
        this.initAudioEngineSync();
        this.startVisualizerLoop();
        this.startLiveSync();
    }

    initEventListeners() {
        // Navigation clicks
        document.querySelectorAll(".nav-item[data-view]").forEach(item => {
            item.addEventListener("click", () => {
                const view = item.getAttribute("data-view");
                this.switchView(view);
            });
        });

        // Mobile bottom nav clicks
        document.querySelectorAll(".mobile-nav-item[data-view]").forEach(item => {
            item.addEventListener("click", () => {
                const view = item.getAttribute("data-view");
                this.switchView(view);
            });
        });

        // Desktop Blocker Handlers
        const btnLaunchMobileFrame = document.getElementById("btnLaunchMobileFrame");
        if (btnLaunchMobileFrame) {
            btnLaunchMobileFrame.addEventListener("click", () => {
                document.body.classList.add("in-mobile-frame");
                this.showToast("📲 Mobile Phone Simulator Frame Activated");
            });
        }

        const btnExitMobileFrame = document.getElementById("btnExitMobileFrame");
        if (btnExitMobileFrame) {
            btnExitMobileFrame.addEventListener("click", () => {
                document.body.classList.remove("in-mobile-frame");
                this.showToast("Exited Phone Simulator");
            });
        }

        const btnCopyBlockerUrl = document.getElementById("btnCopyBlockerUrl");
        if (btnCopyBlockerUrl) {
            btnCopyBlockerUrl.addEventListener("click", () => {
                const urlInput = document.getElementById("blockerMobileUrlInput");
                const url = urlInput ? urlInput.value : window.location.href;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => {
                        this.showToast("Mobile link copied! Open on your phone.");
                    }).catch(() => {
                        this.showToast("Link: " + url);
                    });
                } else {
                    this.showToast("Link: " + url);
                }
            });
        }

        // Dynamically initialize blocker QR Code & Link with current page location
        const blockerQrImg = document.getElementById("blockerQrCodeImg");
        const blockerUrlInput = document.getElementById("blockerMobileUrlInput");
        const appUrl = (window.location.protocol.startsWith("http")) ? window.location.href : "https://prg-git.github.io/sangeet-local/";
        if (blockerUrlInput) blockerUrlInput.value = appUrl;
        if (blockerQrImg) {
            blockerQrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(appUrl);
        }

        // Check URL param ?mobile=1 or ?phone=1 or #mobile to auto-launch simulator frame on PC
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("mobile") === "1" || urlParams.get("phone") === "1" || window.location.hash === "#mobile") {
            document.body.classList.add("in-mobile-frame");
        }

        // Back / Forward (Safely null-checked)
        const btnNavBack = document.getElementById("btnNavBack");
        if (btnNavBack) btnNavBack.addEventListener("click", () => this.navigateHistory(-1));
        const btnNavForward = document.getElementById("btnNavForward");
        if (btnNavForward) btnNavForward.addEventListener("click", () => this.navigateHistory(1));

        // Global Search
        this.dom.globalSearchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            if (query) {
                this.dom.btnSearchClear.classList.add("visible");
                this.switchView("search", { query });
            } else {
                this.dom.btnSearchClear.classList.remove("visible");
                if (this.currentView === "search") {
                    this.switchView("home");
                }
            }
        });

        this.dom.btnSearchClear.addEventListener("click", () => {
            this.dom.globalSearchInput.value = "";
            this.dom.btnSearchClear.classList.remove("visible");
            this.switchView("home");
        });

        // Theme Switcher (if present)
        if (this.dom.themeSelect) {
            this.dom.themeSelect.addEventListener("change", (e) => {
                this.setTheme(e.target.value);
            });
        }

        // Modal triggers
        const btnAddMusic = document.getElementById("btnOpenAddMusic");
        if (btnAddMusic) {
            btnAddMusic.addEventListener("click", () => this.openModal(this.dom.addMusicModal));
        }
        const btnOpenEqualizer = document.getElementById("btnOpenEqualizer");
        if (btnOpenEqualizer) {
            btnOpenEqualizer.addEventListener("click", () => this.openModal(this.dom.equalizerModal));
        }

        // Mobile Connect modal trigger
        const btnMobileConnect = document.getElementById("btnMobileConnect");
        if (btnMobileConnect) {
            btnMobileConnect.addEventListener("click", () => this.openMobileConnectModal());
        }

        const btnCopyMobile = document.getElementById("btnCopyMobileUrl");
        if (btnCopyMobile) {
            btnCopyMobile.addEventListener("click", () => {
                const urlInput = document.getElementById("mobileUrlInput");
                if (urlInput) {
                    navigator.clipboard.writeText(urlInput.value).then(() => {
                        this.showToast("Mobile link copied to clipboard!");
                    }).catch(() => {
                        urlInput.select();
                        document.execCommand("copy");
                        this.showToast("Mobile link copied!");
                    });
                }
            });
        }
        if (this.dom.btnQueueToggle) this.dom.btnQueueToggle.addEventListener("click", () => this.toggleQueueDrawer());
        if (this.dom.btnFullscreenPlayer) this.dom.btnFullscreenPlayer.addEventListener("click", () => this.openFullscreenPlayer());
        if (this.dom.btnCloseFullscreen) this.dom.btnCloseFullscreen.addEventListener("click", () => this.closeFullscreenPlayer());

        // Close modal buttons
        document.querySelectorAll("[data-close-modal]").forEach(btn => {
            btn.addEventListener("click", () => {
                const modalId = btn.getAttribute("data-close-modal");
                const modal = document.getElementById(modalId);
                if (modal) this.closeModal(modal);
            });
        });

        // Close modal when clicking on backdrop
        document.querySelectorAll(".modal-overlay").forEach(modal => {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });

        // Player Controls (with event stopPropagation to prevent accidentally triggering player bar expansion)
        this.dom.btnPlayPause.addEventListener("click", (e) => {
            e.stopPropagation();
            window.audioEngine.togglePlay();
        });
        this.dom.btnPrevious.addEventListener("click", (e) => {
            e.stopPropagation();
            window.audioEngine.playPrevious();
        });
        this.dom.btnNext.addEventListener("click", (e) => {
            e.stopPropagation();
            window.audioEngine.playNext();
        });
        this.dom.btnShuffle.addEventListener("click", (e) => {
            e.stopPropagation();
            const isShuffled = window.audioEngine.toggleShuffle();
            this.dom.btnShuffle.classList.toggle("active", isShuffled);
            this.showToast(isShuffled ? "Shuffle Enabled" : "Shuffle Disabled");
        });
        this.dom.btnRepeat.addEventListener("click", (e) => {
            e.stopPropagation();
            const mode = window.audioEngine.cycleRepeat();
            this.dom.btnRepeat.classList.toggle("active", mode !== "off");
            this.dom.btnRepeat.innerHTML = mode === "one" ? "🔂" : "🔁";
            this.showToast("Repeat: " + mode.toUpperCase());
        });

        // Progress bar scrubbing & seeking (robust for Android WebView touch + mouse)
        this.isScrubbing = false;
        let scrubPercent = 0;

        const getPercentFromClientX = (clientX) => {
            const rect = this.dom.progressBarWrap.getBoundingClientRect();
            if (!rect.width || rect.width <= 0) return 0;
            return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        };

        const updateScrubVisual = (percent) => {
            scrubPercent = percent;
            this.dom.progressFill.style.width = percent + "%";
            const duration = window.audioEngine.getDuration ? window.audioEngine.getDuration() : (window.audioEngine.audio ? window.audioEngine.audio.duration : 0);
            if (Number.isFinite(duration) && duration > 0) {
                const previewSecs = (percent / 100) * duration;
                this.dom.currentTimeText.textContent = this.formatTime(previewSecs);
            }
        };

        // Direct tap / click on progress bar
        this.dom.progressBarWrap.addEventListener("click", (e) => {
            e.stopPropagation();
            const percent = getPercentFromClientX(e.clientX);
            updateScrubVisual(percent);
            window.audioEngine.seekPercent(percent);
        });

        // Touch scrubbing on mobile (touchmove updates visual only, commit on touchend)
        this.dom.progressBarWrap.addEventListener("touchstart", (e) => {
            e.stopPropagation();
            if (e.touches && e.touches[0]) {
                this.isScrubbing = true;
                const percent = getPercentFromClientX(e.touches[0].clientX);
                updateScrubVisual(percent);
            }
        }, { passive: false });

        this.dom.progressBarWrap.addEventListener("touchmove", (e) => {
            e.stopPropagation();
            if (this.isScrubbing && e.touches && e.touches[0]) {
                if (e.cancelable) e.preventDefault(); // Prevent page scroll during horizontal drag
                const percent = getPercentFromClientX(e.touches[0].clientX);
                updateScrubVisual(percent);
            }
        }, { passive: false });

        const commitTouchSeek = (e) => {
            if (this.isScrubbing) {
                if (e) e.stopPropagation();
                this.isScrubbing = false;
                window.audioEngine.seekPercent(scrubPercent);
            }
        };

        this.dom.progressBarWrap.addEventListener("touchend", commitTouchSeek, { passive: false });
        this.dom.progressBarWrap.addEventListener("touchcancel", commitTouchSeek, { passive: false });

        // Tapping mini-player wave bar, cover art, or track info smoothly expands into Fullscreen Now Playing screen
        const playerBar = document.querySelector(".music-player-bar");
        if (playerBar) {
            playerBar.addEventListener("click", (e) => {
                // Do not expand if clicking control buttons, inputs, sliders, or the progress bar
                if (e.target.closest("button, input, .progress-bar-wrap, .volume-wrap, .player-actions")) {
                    return;
                }
                this.openFullscreenPlayer();
            });
        }

        const mobileWaveWrap = document.getElementById("mobilePlayerWaveWrap");
        if (mobileWaveWrap) {
            mobileWaveWrap.addEventListener("click", (e) => {
                e.stopPropagation();
                this.openFullscreenPlayer();
            });
        }

        const mobileWaveCanvas = document.getElementById("mobileWaveCanvas");
        if (mobileWaveCanvas) {
            mobileWaveCanvas.addEventListener("click", (e) => {
                e.stopPropagation();
                this.openFullscreenPlayer();
            });
        }

        this.dom.playerCoverWrap.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openFullscreenPlayer();
        });
        this.dom.playerSongTitle.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openFullscreenPlayer();
        });
        this.dom.playerSongArtist.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openFullscreenPlayer();
        });

        // Volume slider & mute
        this.dom.volumeSlider.addEventListener("click", (e) => e.stopPropagation());
        this.dom.volumeSlider.addEventListener("input", (e) => {
            e.stopPropagation();
            const val = parseFloat(e.target.value);
            window.audioEngine.setVolume(val);
            this.updateVolumeIcon(val, false);
        });

        this.dom.btnMute.addEventListener("click", (e) => {
            e.stopPropagation();
            const isMuted = window.audioEngine.toggleMute();
            this.updateVolumeIcon(window.audioEngine.volume, isMuted);
        });

        // Playback speed
        const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
        let speedIdx = 1;
        this.dom.btnPlaybackSpeed.addEventListener("click", (e) => {
            e.stopPropagation();
            speedIdx = (speedIdx + 1) % speeds.length;
            const s = speeds[speedIdx];
            window.audioEngine.setPlaybackRate(s);
            this.dom.btnPlaybackSpeed.textContent = s + "x";
            this.showToast("Playback Speed: " + s + "x");
        });

        // Like button in player (with reactive sync to Liked page)
        this.dom.playerLikeBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const current = window.audioEngine.currentSong;
            if (current && current.id) {
                const isLiked = await window.musicDB.toggleLike(current.id);
                current.isLiked = isLiked;
                this.dom.playerLikeBtn.classList.toggle("liked", isLiked);

                // Update all matching like buttons in current view
                document.querySelectorAll(`[data-like-id="${current.id}"]`).forEach(btn => {
                    btn.classList.toggle("liked", isLiked);
                });

                await this.updateCounters();
                this.showToast(isLiked ? "Added to Liked Songs ♥" : "Removed from Liked Songs");

                // If currently viewing Liked Songs, reactively re-render
                if (this.currentView === "liked") {
                    const allSongs = await window.musicDB.getAllSongs();
                    this.renderLikedView(allSongs);
                }
            }
        });

        // Lyrics button in player
        if (this.dom.playerLyricsBtn) {
            this.dom.playerLyricsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.openFullscreenPlayer();
            });
        }

        // Fullscreen Now Playing Studio Controls (v2.0.0)
        if (this.dom.fsBtnPlayPause) {
            this.dom.fsBtnPlayPause.addEventListener("click", (e) => {
                e.stopPropagation();
                window.audioEngine.togglePlay();
            });
        }
        if (this.dom.fsBtnPrevious) {
            this.dom.fsBtnPrevious.addEventListener("click", (e) => {
                e.stopPropagation();
                window.audioEngine.playPrevious();
            });
        }
        if (this.dom.fsBtnNext) {
            this.dom.fsBtnNext.addEventListener("click", (e) => {
                e.stopPropagation();
                window.audioEngine.playNext();
            });
        }
        if (this.dom.fsBtnShuffle) {
            this.dom.fsBtnShuffle.addEventListener("click", (e) => {
                e.stopPropagation();
                const isShuffled = window.audioEngine.toggleShuffle();
                this.dom.btnShuffle.classList.toggle("active", isShuffled);
                this.dom.fsBtnShuffle.classList.toggle("active", isShuffled);
                this.showToast(isShuffled ? "Shuffle Enabled" : "Shuffle Disabled");
            });
        }
        if (this.dom.fsBtnRepeat) {
            this.dom.fsBtnRepeat.addEventListener("click", (e) => {
                e.stopPropagation();
                const mode = window.audioEngine.cycleRepeat();
                this.dom.btnRepeat.classList.toggle("active", mode !== "off");
                this.dom.fsBtnRepeat.classList.toggle("active", mode !== "off");
                this.dom.btnRepeat.innerHTML = mode === "one" ? "🔂" : "🔁";
                this.showToast("Repeat: " + mode.toUpperCase());
            });
        }
        if (this.dom.fsLikeBtn) {
            this.dom.fsLikeBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const current = window.audioEngine.currentSong;
                if (current && current.id) {
                    const isLiked = await window.musicDB.toggleLike(current.id);
                    current.isLiked = isLiked;
                    this.dom.fsLikeBtn.classList.toggle("liked", isLiked);
                    this.dom.playerLikeBtn.classList.toggle("liked", isLiked);
                    document.querySelectorAll(`[data-like-id="${current.id}"]`).forEach(btn => {
                        btn.classList.toggle("liked", isLiked);
                    });
                    await this.updateCounters();
                    this.showToast(isLiked ? "Added to Liked Songs ♥" : "Removed from Liked Songs");
                    if (this.currentView === "liked") {
                        const allSongs = await window.musicDB.getAllSongs();
                        this.renderLikedView(allSongs);
                    }
                }
            });
        }
        if (this.dom.fsBtnOpenEq) {
            this.dom.fsBtnOpenEq.addEventListener("click", (e) => {
                e.stopPropagation();
                this.openModal(this.dom.equalizerModal);
            });
        }
        if (this.dom.fsBtnQueueToggle) {
            this.dom.fsBtnQueueToggle.addEventListener("click", (e) => {
                e.stopPropagation();
                this.toggleQueueDrawer();
            });
        }
        if (this.dom.fsBtnLyricsToggle) {
            this.dom.fsBtnLyricsToggle.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.dom.fsLyricsSheet) this.dom.fsLyricsSheet.classList.toggle("active");
            });
        }
        if (this.dom.btnCloseLyricsSheet) {
            this.dom.btnCloseLyricsSheet.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.dom.fsLyricsSheet) this.dom.fsLyricsSheet.classList.remove("active");
            });
        }
        if (this.dom.fsBtnSpeed) {
            const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
            let fsSpeedIdx = 1;
            this.dom.fsBtnSpeed.addEventListener("click", (e) => {
                e.stopPropagation();
                fsSpeedIdx = (fsSpeedIdx + 1) % speeds.length;
                const s = speeds[fsSpeedIdx];
                window.audioEngine.setPlaybackRate(s);
                if (this.dom.fsSpeedText) this.dom.fsSpeedText.textContent = s + "x";
                if (this.dom.btnPlaybackSpeed) this.dom.btnPlaybackSpeed.textContent = s + "x";
                this.showToast("Playback Speed: " + s + "x");
            });
        }

        // Touch & Click scrubbing for Fullscreen Player
        if (this.dom.fsProgressBarWrap) {
            const getFsPercent = (clientX) => {
                const rect = this.dom.fsProgressBarWrap.getBoundingClientRect();
                if (!rect.width || rect.width <= 0) return 0;
                return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
            };

            const updateFsScrubVisual = (percent) => {
                if (this.dom.fsProgressFill) this.dom.fsProgressFill.style.width = percent + "%";
                if (this.dom.progressFill) this.dom.progressFill.style.width = percent + "%";
                const duration = window.audioEngine.getDuration ? window.audioEngine.getDuration() : (window.audioEngine.audio ? window.audioEngine.audio.duration : 0);
                if (Number.isFinite(duration) && duration > 0) {
                    const previewSecs = (percent / 100) * duration;
                    const formatted = this.formatTime(previewSecs);
                    if (this.dom.fsCurrentTimeText) this.dom.fsCurrentTimeText.textContent = formatted;
                    if (this.dom.currentTimeText) this.dom.currentTimeText.textContent = formatted;
                }
            };

            this.dom.fsProgressBarWrap.addEventListener("click", (e) => {
                e.stopPropagation();
                const percent = getFsPercent(e.clientX);
                updateFsScrubVisual(percent);
                window.audioEngine.seekPercent(percent);
            });

            this.dom.fsProgressBarWrap.addEventListener("touchstart", (e) => {
                e.stopPropagation();
                if (e.touches && e.touches[0]) {
                    this.isScrubbing = true;
                    const percent = getFsPercent(e.touches[0].clientX);
                    updateFsScrubVisual(percent);
                }
            }, { passive: false });

            this.dom.fsProgressBarWrap.addEventListener("touchmove", (e) => {
                e.stopPropagation();
                if (this.isScrubbing && e.touches && e.touches[0]) {
                    if (e.cancelable) e.preventDefault();
                    const percent = getFsPercent(e.touches[0].clientX);
                    updateFsScrubVisual(percent);
                }
            }, { passive: false });

            const commitFsTouchSeek = (e) => {
                if (this.isScrubbing) {
                    if (e) e.stopPropagation();
                    this.isScrubbing = false;
                    let percent = 0;
                    if (e && e.changedTouches && e.changedTouches[0]) {
                        percent = getFsPercent(e.changedTouches[0].clientX);
                    }
                    updateFsScrubVisual(percent);
                    window.audioEngine.seekPercent(percent);
                }
            };

            this.dom.fsProgressBarWrap.addEventListener("touchend", commitFsTouchSeek, { passive: false });
            this.dom.fsProgressBarWrap.addEventListener("touchcancel", commitFsTouchSeek, { passive: false });
        }

        // File upload actions (if present)
        if (this.dom.btnBrowseFiles && this.dom.fileInput) {
            this.dom.btnBrowseFiles.addEventListener("click", () => this.dom.fileInput.click());
            this.dom.fileInput.addEventListener("change", (e) => this.handleFilesSelected(e.target.files));
        }
        if (this.dom.btnBrowseFolder && this.dom.folderInput) {
            this.dom.btnBrowseFolder.addEventListener("click", () => this.dom.folderInput.click());
            this.dom.folderInput.addEventListener("change", (e) => this.handleFilesSelected(e.target.files));
        }

        // Drag and drop events
        if (this.dom.fileDropzone) {
            ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
                this.dom.fileDropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                document.body.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ["dragenter", "dragover"].forEach(eventName => {
                this.dom.fileDropzone.addEventListener(eventName, () => {
                    this.dom.fileDropzone.classList.add("dragover");
                });
            });

            ["dragleave", "drop"].forEach(eventName => {
                this.dom.fileDropzone.addEventListener(eventName, () => {
                    this.dom.fileDropzone.classList.remove("dragover");
                });
            });

            this.dom.fileDropzone.addEventListener("drop", (e) => {
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    this.handleFilesSelected(files);
                }
            });
        }

        // Drop anywhere on the window automatically opens modal and imports
        document.body.addEventListener("drop", (e) => {
            if (this.dom.fileDropzone && e.target !== this.dom.fileDropzone && !this.dom.fileDropzone.contains(e.target)) {
                const files = e.dataTransfer.files;
                if (files && files.length > 0 && files[0].type.startsWith("audio/")) {
                    if (this.dom.addMusicModal) {
                        this.openModal(this.dom.addMusicModal);
                        this.handleFilesSelected(files);
                    }
                }
            }
        });

        // Add Stream URL
        if (this.dom.btnAddStreamUrl && this.dom.streamUrlInput) {
            this.dom.btnAddStreamUrl.addEventListener("click", async () => {
                const url = this.dom.streamUrlInput.value.trim();
                if (!url) return;

                const urlParts = url.split("/").pop().split("?")[0];
                const title = decodeURIComponent(urlParts.replace(/\.[^/.]+$/, "")) || "Web Stream Audio";

                const songData = {
                    title,
                    artist: "Online Stream",
                    album: "Web Music",
                    genre: "Online",
                    audioUrl: url,
                    duration: 0,
                    isLiked: false,
                    dateAdded: Date.now()
                };

                await window.musicDB.addSong(songData, null, null);
                this.dom.streamUrlInput.value = "";
                this.showToast(`Added: ${title}`);
                if (this.dom.addMusicModal) this.closeModal(this.dom.addMusicModal);
                this.refreshCurrentView();
                this.updateCounters();
            });
        }

        // Create Playlist button
        const btnCreatePl = document.getElementById("btnCreatePlaylist");
        if (btnCreatePl) {
            btnCreatePl.addEventListener("click", async () => {
                const name = prompt("Enter playlist name:", "My Favorite Tracks");
                if (name && name.trim()) {
                    const pl = await window.musicDB.createPlaylist(name.trim());
                    this.showToast(`Playlist "${pl.name}" created!`);
                    await this.loadPlaylists();
                    this.switchView("playlist", { playlistId: pl.id });
                }
            });
        }

        // Save Metadata & Album Cover Art
        if (this.dom.btnSaveMetadata && this.dom.editSongId) {
            this.dom.btnSaveMetadata.addEventListener("click", async () => {
                const id = this.dom.editSongId.value;
                const song = await window.musicDB.getSong(id);
                if (song) {
                    song.title = this.dom.editTitle.value.trim() || song.title;
                    song.artist = this.dom.editArtist.value.trim() || song.artist;
                    song.album = this.dom.editAlbum.value.trim() || song.album;
                    song.genre = this.dom.editGenre.value.trim() || song.genre;
                    song.year = this.dom.editYear.value.trim() || song.year;
                    song.lyrics = this.dom.editLyrics.value.trim();

                    const coverUrlVal = this.dom.editCoverUrlInput ? this.dom.editCoverUrlInput.value.trim() : "";
                    if (this.editCoverRemoved) {
                        song.coverUrl = null;
                        song.coverBlob = null;
                        await window.musicDB.updateSong(song, null, true);
                    } else if (this.editCoverBase64) {
                        await window.musicDB.updateSong(song, this.editCoverBase64, false);
                    } else if (coverUrlVal) {
                        song.coverUrl = coverUrlVal;
                        song.coverBlob = null;
                        await window.musicDB.updateSong(song, null, false);
                    } else {
                        await window.musicDB.updateSong(song, null, false);
                    }

                    if (this.dom.editSongModal) this.closeModal(this.dom.editSongModal);
                    this.showToast("Song details & album cover updated!");
                    await this.refreshCurrentView();

                    // If currently playing, update player
                    if (window.audioEngine.currentSong && window.audioEngine.currentSong.id === id) {
                        const updated = await window.musicDB.getSong(id);
                        if (updated) {
                            window.audioEngine.currentSong = updated;
                            this.dom.playerSongTitle.textContent = updated.title;
                            this.dom.playerSongArtist.textContent = updated.artist;
                            this.dom.playerCoverImg.src = this.getSongCoverUrl(updated);
                        }
                    }
                }
            });
        }

        // Edit Cover Image Chooser
        if (this.dom.btnChooseEditCover && this.dom.editCoverFileInput) {
            this.dom.btnChooseEditCover.addEventListener("click", () => {
                this.dom.editCoverFileInput.click();
            });

            this.dom.editCoverFileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        this.editCoverBase64 = ev.target.result;
                        this.editCoverRemoved = false;
                        if (this.dom.editCoverPreview) this.dom.editCoverPreview.src = this.editCoverBase64;
                        if (this.dom.editCoverUrlInput) this.dom.editCoverUrlInput.value = "";
                        this.showToast("Cover image selected");
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Remove Edit Cover Image
        if (this.dom.btnRemoveEditCover) {
            this.dom.btnRemoveEditCover.addEventListener("click", () => {
                this.editCoverRemoved = true;
                this.editCoverBase64 = null;
                if (this.dom.editCoverFileInput) this.dom.editCoverFileInput.value = "";
                if (this.dom.editCoverUrlInput) this.dom.editCoverUrlInput.value = "";
                if (this.dom.editCoverPreview) {
                    this.dom.editCoverPreview.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='55%' font-size='42' fill='%2310b981' text-anchor='middle' dominant-baseline='middle'>♫</text></svg>`;
                }
                this.showToast("Cover art removed. Click Save Changes to apply.");
            });
        }

        // Edit Cover URL input
        if (this.dom.editCoverUrlInput) {
            this.dom.editCoverUrlInput.addEventListener("input", (e) => {
                const url = e.target.value.trim();
                if (url) {
                    this.editCoverRemoved = false;
                    this.editCoverBase64 = null;
                    if (this.dom.editCoverPreview) this.dom.editCoverPreview.src = url;
                }
            });
        }

        // Add Music Modal Tabs
        if (this.dom.tabBtnQuickImport && this.dom.tabBtnCustomUpload) {
            this.dom.tabBtnQuickImport.addEventListener("click", () => {
                this.dom.tabBtnQuickImport.classList.add("active");
                this.dom.tabBtnCustomUpload.classList.remove("active");
                if (this.dom.tabQuickImportContent) this.dom.tabQuickImportContent.style.display = "block";
                if (this.dom.tabCustomUploadContent) this.dom.tabCustomUploadContent.style.display = "none";
            });
            this.dom.tabBtnCustomUpload.addEventListener("click", () => {
                this.dom.tabBtnCustomUpload.classList.add("active");
                this.dom.tabBtnQuickImport.classList.remove("active");
                if (this.dom.tabQuickImportContent) this.dom.tabQuickImportContent.style.display = "none";
                if (this.dom.tabCustomUploadContent) this.dom.tabCustomUploadContent.style.display = "block";
            });
        }

        // Custom Add: Audio File Selection
        let customAudioSelectedFile = null;
        let customCoverSelectedFile = null;

        if (this.dom.btnBrowseCustomAudio && this.dom.customAudioInput) {
            this.dom.btnBrowseCustomAudio.addEventListener("click", () => this.dom.customAudioInput.click());
            this.dom.customAudioInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    customAudioSelectedFile = file;
                    if (this.dom.customAudioBadge) {
                        this.dom.customAudioBadge.textContent = "🎵 " + file.name;
                        this.dom.customAudioBadge.style.display = "inline-block";
                    }
                    if (this.dom.customTitle && !this.dom.customTitle.value.trim()) {
                        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
                        this.dom.customTitle.value = cleanName;
                    }
                }
            });
        }

        // Custom Add: Cover Image Selection
        if (this.dom.btnBrowseCustomCover && this.dom.customCoverInput) {
            this.dom.btnBrowseCustomCover.addEventListener("click", () => this.dom.customCoverInput.click());
            this.dom.customCoverInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    customCoverSelectedFile = file;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (this.dom.customCoverPreview) this.dom.customCoverPreview.src = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (this.dom.btnRemoveCustomCover) {
            this.dom.btnRemoveCustomCover.addEventListener("click", () => {
                customCoverSelectedFile = null;
                if (this.dom.customCoverInput) this.dom.customCoverInput.value = "";
                if (this.dom.customCoverPreview) {
                    this.dom.customCoverPreview.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='55%' font-size='42' fill='%2310b981' text-anchor='middle' dominant-baseline='middle'>♫</text></svg>`;
                }
            });
        }

        // Custom Add: Submit
        if (this.dom.btnSubmitCustomUpload) {
            this.dom.btnSubmitCustomUpload.addEventListener("click", async () => {
                if (!customAudioSelectedFile) {
                    this.showToast("Please choose an audio file first!", "danger");
                    return;
                }

                const title = (this.dom.customTitle ? this.dom.customTitle.value.trim() : "") || customAudioSelectedFile.name.replace(/\.[^/.]+$/, "");
                const artist = (this.dom.customArtist ? this.dom.customArtist.value.trim() : "") || "Local Artist";
                const album = (this.dom.customAlbum ? this.dom.customAlbum.value.trim() : "") || "PC Album";
                const genre = (this.dom.customGenre ? this.dom.customGenre.value.trim() : "") || "Assamese";

                this.showToast(`Uploading "${title}" to library...`);
                this.dom.btnSubmitCustomUpload.disabled = true;
                this.dom.btnSubmitCustomUpload.textContent = "Uploading...";

                try {
                    const songData = {
                        title,
                        artist,
                        album,
                        genre,
                        year: new Date().getFullYear().toString(),
                        duration: 0,
                        dateAdded: Date.now()
                    };

                    await window.musicDB.addSong(songData, customAudioSelectedFile, customCoverSelectedFile);
                    this.showToast(`Successfully added "${title}" with custom album cover!`);

                    // Reset form
                    customAudioSelectedFile = null;
                    customCoverSelectedFile = null;
                    if (this.dom.customAudioInput) this.dom.customAudioInput.value = "";
                    if (this.dom.customCoverInput) this.dom.customCoverInput.value = "";
                    if (this.dom.customTitle) this.dom.customTitle.value = "";
                    if (this.dom.customArtist) this.dom.customArtist.value = "";
                    if (this.dom.customAlbum) this.dom.customAlbum.value = "";
                    if (this.dom.customAudioBadge) this.dom.customAudioBadge.style.display = "none";
                    if (this.dom.customCoverPreview) {
                        this.dom.customCoverPreview.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='55%' font-size='42' fill='%2310b981' text-anchor='middle' dominant-baseline='middle'>♫</text></svg>`;
                    }

                    this.closeModal(this.dom.addMusicModal);
                    await this.updateCounters();
                    await this.refreshCurrentView();
                } catch (err) {
                    console.error("Custom upload error:", err);
                    this.showToast("Failed to upload song: " + err.message, "danger");
                } finally {
                    this.dom.btnSubmitCustomUpload.disabled = false;
                    this.dom.btnSubmitCustomUpload.textContent = "🚀 Upload & Add Song to Library";
                }
            });
        }

        // Delete from edit modal
        if (this.dom.btnDeleteCurrentSongModal && this.dom.editSongId) {
            this.dom.btnDeleteCurrentSongModal.addEventListener("click", async () => {
                const id = this.dom.editSongId.value;
                if (confirm("Are you sure you want to permanently delete this song from your library?")) {
                    await this.deleteSong(id);
                    if (this.dom.editSongModal) this.closeModal(this.dom.editSongModal);
                }
            });
        }

        // Equalizer Preset selection
        this.dom.eqPresetSelect.addEventListener("change", (e) => {
            const preset = e.target.value;
            window.audioEngine.setEqualizerPreset(preset);
            this.updateEqSlidersFromPreset(preset);
            this.showToast("EQ Preset: " + preset);
        });

        // Equalizer Band Sliders
        for (let i = 0; i < 5; i++) {
            const slider = document.getElementById("eqBand" + i);
            if (slider) {
                slider.addEventListener("input", (e) => {
                    const gain = parseFloat(e.target.value);
                    window.audioEngine.setBandGain(i, gain);
                });
            }
        }

        // Clear Queue
        document.getElementById("btnClearQueue").addEventListener("click", () => {
            window.audioEngine.clearQueue();
            this.renderQueueItems();
            this.showToast("Queue cleared");
        });
    }

    // Clean and normalize song metadata (stripping paths, .mp3/.flac extensions, underscores, track prefixes)
    cleanMetadata(rawTitle, rawArtist, rawUrl = "") {
        let title = (rawTitle || "").trim();
        let artist = (rawArtist || "").trim();
        let filename = (rawUrl || "").trim();

        if (filename.includes("/")) {
            filename = filename.substring(filename.lastIndexOf("/") + 1);
        }
        if (filename.includes("\\")) {
            filename = filename.substring(filename.lastIndexOf("\\") + 1);
        }
        if (filename.includes("?")) {
            filename = filename.substring(0, filename.indexOf("?"));
        }

        if (!title && filename) {
            title = filename;
        }

        // Remove path if title itself contains one
        if (title.includes("/") || title.includes("\\")) {
            title = title.split(/[/\\]/).pop();
        }

        // Strip file extensions (.mp3, .flac, .wav, .m4a, .ogg, etc.)
        title = title.replace(/\.(mp3|wav|flac|m4a|ogg|aac|webm|opus)$/i, "").trim();

        // Strip track number prefixes like "01 - ", "01. ", "01 "
        title = title.replace(/^\d+[\s\.\-_]+/, "").trim();

        // If title looks like "Artist - Title", split and use artist
        if (title.includes(" - ") || title.includes(" – ")) {
            const parts = title.split(/\s*[-–]\s*/);
            if (parts.length >= 2) {
                const candidateArtist = parts[0].trim();
                const candidateTitle = parts.slice(1).join(" - ").trim();
                if (candidateArtist && candidateTitle) {
                    if (!artist || /^(unknown|local artist|sangeet|sangeet local|artist)$/i.test(artist)) {
                        artist = candidateArtist;
                        title = candidateTitle;
                    }
                }
            }
        }

        // Clean underscores and normalize spaces
        title = title.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        if (!title) title = "Unknown Title";

        if (!artist || /^(unknown|unknown artist)$/i.test(artist)) {
            artist = "Local Artist";
        }
        artist = artist.replace(/_/g, " ").replace(/\s+/g, " ").trim();

        return { title, artist };
    }

    initAudioEngineSync() {
        const engine = window.audioEngine;

        engine.on("play", (song) => {
            this.dom.btnPlayPause.innerHTML = "❚❚";
            if (this.dom.fsBtnPlayPause) this.dom.fsBtnPlayPause.innerHTML = "<span class='fs-play-icon'>❚❚</span>";
            this.dom.playerCoverWrap.classList.add("spinning");
            const playerBar = document.querySelector(".music-player-bar");
            if (playerBar) playerBar.classList.add("is-playing");
            if (this.dom.fullscreenPlayer) this.dom.fullscreenPlayer.classList.add("is-playing");
            document.body.classList.add("audio-playing");
            this.highlightPlayingRow(song ? song.id : null);
        });

        engine.on("pause", () => {
            this.dom.btnPlayPause.innerHTML = "▶";
            if (this.dom.fsBtnPlayPause) this.dom.fsBtnPlayPause.innerHTML = "<span class='fs-play-icon'>▶</span>";
            this.dom.playerCoverWrap.classList.remove("spinning");
            const playerBar = document.querySelector(".music-player-bar");
            if (playerBar) playerBar.classList.remove("is-playing");
            if (this.dom.fullscreenPlayer) this.dom.fullscreenPlayer.classList.remove("is-playing");
            document.body.classList.remove("audio-playing");
        });

        engine.on("trackChange", (song) => {
            if (!song) {
                this.dom.playerSongTitle.textContent = "No song playing";
                this.dom.playerSongTitle.title = "No song playing";
                this.dom.playerSongArtist.textContent = "Select a song from library";
                this.dom.playerSongArtist.title = "Select a song from library";
                this.dom.playerLikeBtn.classList.remove("liked");
                if (this.dom.fsLikeBtn) this.dom.fsLikeBtn.classList.remove("liked");
                return;
            }

            const meta = this.cleanMetadata(song.title, song.artist, song.audioUrl);

            this.dom.playerSongTitle.textContent = meta.title;
            this.dom.playerSongTitle.title = meta.title;
            this.dom.playerSongArtist.textContent = meta.artist;
            this.dom.playerSongArtist.title = meta.artist;
            this.dom.playerLikeBtn.classList.toggle("liked", !!song.isLiked);
            if (this.dom.fsLikeBtn) this.dom.fsLikeBtn.classList.toggle("liked", !!song.isLiked);

            const coverUrl = this.getSongCoverUrl(song);
            this.dom.playerCoverImg.src = coverUrl;

            // Fullscreen player updates (v2.0.0)
            if (this.dom.fsSongTitle) {
                this.dom.fsSongTitle.textContent = meta.title;
                this.dom.fsSongTitle.title = meta.title;
            }
            if (this.dom.fsSongArtist) {
                this.dom.fsSongArtist.textContent = meta.artist;
                this.dom.fsSongArtist.title = meta.artist;
            }
            if (this.dom.fsCoverArt) this.dom.fsCoverArt.src = coverUrl;
            if (this.dom.fsBgBlur) this.dom.fsBgBlur.style.backgroundImage = `url(${coverUrl})`;
            if (this.dom.fsLyricsText) {
                this.dom.fsLyricsText.textContent = song.lyrics || "No lyrics available for this song.\nYou can add lyrics by editing the song details in PC Studio.";
            }
            if (this.dom.fsGenreBadge) {
                this.dom.fsGenreBadge.textContent = song && song.genre ? "🎵 " + song.genre + " • v2.0.0" : "🎵 SANGEET v2.0.0";
            }

            this.highlightPlayingRow(song.id);
        });

        engine.on("timeUpdate", ({ currentTime, duration }) => {
            if (this.isScrubbing) {
                // Keep scrub preview while user drags seek bar on touch screen
                return;
            }
            const curTimeFormatted = this.formatTime(currentTime);
            const durFormatted = this.formatTime(duration);

            this.dom.currentTimeText.textContent = curTimeFormatted;
            this.dom.totalDurationText.textContent = durFormatted;

            if (this.dom.fsCurrentTimeText) this.dom.fsCurrentTimeText.textContent = curTimeFormatted;
            if (this.dom.fsDurationText) this.dom.fsDurationText.textContent = durFormatted;

            if (duration > 0) {
                const percent = (currentTime / duration) * 100;
                this.dom.progressFill.style.width = percent + "%";
                if (this.dom.fsProgressFill) this.dom.fsProgressFill.style.width = percent + "%";
            }
        });

        engine.on("queueUpdate", (queue) => {
            this.dom.queueBadge.textContent = queue.length > 0 ? queue.length : "";
            this.renderQueueItems();
        });
    }

    // --- FILE UPLOADING & ID3 TAG EXTRACTION ---

    async handleFilesSelected(fileList) {
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList).filter(f => {
            return f.type.startsWith("audio/") ||
                /\.(mp3|wav|flac|m4a|ogg|aac|webm)$/i.test(f.name);
        });

        if (files.length === 0) {
            this.showToast("No supported audio files found.", "danger");
            return;
        }

        this.dom.uploadQueueContainer.style.display = "block";
        this.dom.uploadQueueList.innerHTML = "";
        this.dom.uploadProgressCount.textContent = `0/${files.length}`;

        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Add row in upload list
            const itemEl = document.createElement("div");
            itemEl.className = "upload-queue-item";
            itemEl.innerHTML = `
                <span class="upload-item-name">${this.escapeHtml(file.name)}</span>
                <span class="upload-item-status" id="uploadStatus_${i}">Parsing tags...</span>
            `;
            this.dom.uploadQueueList.appendChild(itemEl);

            try {
                // Parse ID3 tags
                const metadata = await window.ID3Parser.parse(file);

                const statusEl = document.getElementById(`uploadStatus_${i}`);
                if (statusEl) statusEl.textContent = "Storing offline...";

                let coverBlob = null;
                if (!metadata.coverUrl) {
                    // Generate gradient cover image
                    const colors = [
                        ["#10b981", "#064e3b"],
                        ["#e11d48", "#4c0519"],
                        ["#8b5cf6", "#2e1065"],
                        ["#f59e0b", "#78350f"],
                        ["#06b6d4", "#164e63"]
                    ][i % 5];
                    coverBlob = await window.DemoTrackGenerator.generateCoverImage(metadata.title, metadata.artist, colors);
                }

                // Save to IndexedDB
                await window.musicDB.addSong(metadata, file, coverBlob);
                successCount++;

                if (statusEl) {
                    statusEl.textContent = "✓ Added";
                    statusEl.style.color = "#10b981";
                }
            } catch (err) {
                console.error("Failed to add file:", file.name, err);
                const statusEl = document.getElementById(`uploadStatus_${i}`);
                if (statusEl) {
                    statusEl.textContent = "✗ Failed";
                    statusEl.style.color = "#ef4444";
                }
            }

            this.dom.uploadProgressCount.textContent = `${i + 1}/${files.length}`;
        }

        this.showToast(`Successfully added ${successCount} song(s) to library!`);
        await this.updateCounters();
        await this.refreshCurrentView();
    }

    // --- SONG DELETION (THE "REMOVE" FEATURE) ---

    async deleteSong(songId) {
        const song = await window.musicDB.getSong(songId);
        if (!song) return;

        // If this song is currently playing, move to next or stop
        if (window.audioEngine.currentSong && window.audioEngine.currentSong.id === songId) {
            window.audioEngine.playNext();
            if (window.audioEngine.currentSong && window.audioEngine.currentSong.id === songId) {
                window.audioEngine.clearQueue();
            }
        }

        // Remove from DB
        await window.musicDB.deleteSong(songId);

        this.showToast(`Removed "${song.title}" from library`);
        await this.updateCounters();
        await this.refreshCurrentView();
    }

    async batchDeleteAll() {
        const songs = await window.musicDB.getAllSongs();
        if (songs.length === 0) return;

        if (confirm(`Are you sure you want to delete ALL ${songs.length} songs from your personal library? This cannot be undone.`)) {
            for (const s of songs) {
                await window.musicDB.deleteSong(s.id);
            }
            window.audioEngine.clearQueue();
            this.showToast("All songs removed from library", "danger");
            await this.updateCounters();
            await this.refreshCurrentView();
        }
    }

    // --- VIEW SWITCHING & RENDERING ---

    async switchView(viewName, params = {}) {
        this.currentView = viewName;

        // Ensure 3-language banners are loaded
        if (!this.bannersData) {
            try {
                const bRes = await fetch("data/banners.json?_t=" + Date.now(), { cache: "no-store" });
                if (bRes.ok) this.bannersData = await bRes.json();
            } catch (e) { }
        }

        // Highlight sidebar & mobile bottom nav
        document.querySelectorAll(".nav-item[data-view], .mobile-nav-item[data-view]").forEach(item => {
            item.classList.toggle("active", item.getAttribute("data-view") === viewName);
        });

        // View rendering
        const allSongs = await window.musicDB.getAllSongs();
        const playlists = await window.musicDB.getAllPlaylists();

        switch (viewName) {
            case "home":
                this.renderHomeView(allSongs, playlists);
                break;
            case "library":
                this.renderLibraryView(allSongs);
                break;
            case "liked":
                this.renderLikedView(allSongs);
                break;
            case "search":
                this.renderSearchView(params.query || "", allSongs);
                break;
            case "playlist":
                this.renderPlaylistDetailView(params.playlistId, allSongs);
                break;
            case "about":
            case "menu":
                this.renderMenuView();
                break;
            default:
                this.renderHomeView(allSongs, playlists);
        }

        // Scroll back to top
        this.dom.contentBody.scrollTop = 0;
    }

    async refreshCurrentView() {
        await this.switchView(this.currentView, { playlistId: this.currentPlaylistId });
    }

    // --- 1. HOME VIEW ---

    renderHomeView(songs, playlists) {
        const container = this.dom.viewContainer;

        // Filter songs based on category chip (All Music, Koch Rajbongshi, Assamese, Bodo)
        let filteredSongs = songs;
        if (this.selectedFilter !== "all") {
            const filter = (this.selectedFilter || "").toLowerCase().trim();
            filteredSongs = songs.filter(s => {
                const genre = (s.genre || "").toLowerCase();
                const title = (s.title || "").toLowerCase();
                const artist = (s.artist || "").toLowerCase();
                const album = (s.album || "").toLowerCase();
                const allMeta = `${genre} ${title} ${artist} ${album}`;

                if (filter === "koch rajbongshi") {
                    return allMeta.includes("koch") || allMeta.includes("rajbongshi") ||
                        allMeta.includes("rajbanshi") || allMeta.includes("kamtapur") ||
                        allMeta.includes("kamatapur") || allMeta.includes("bhawaiya") ||
                        allMeta.includes("goalpariya");
                }
                if (filter === "assamese") {
                    if (allMeta.includes("koch") || allMeta.includes("rajbongshi") ||
                        allMeta.includes("rajbanshi") || allMeta.includes("kamtapur") ||
                        allMeta.includes("kamatapur") || allMeta.includes("bhawaiya") ||
                        allMeta.includes("bodo") || allMeta.includes("borok")) {
                        return false;
                    }
                    return allMeta.includes("assamese") || allMeta.includes("asomiya") ||
                        allMeta.includes("axomiya") || /[\u0980-\u09FF]/.test(s.title || "") ||
                        /[\u0980-\u09FF]/.test(s.artist || "");
                }
                if (filter === "bodo") {
                    return allMeta.includes("bodo") || allMeta.includes("borok") ||
                        allMeta.includes("mech") || allMeta.includes("bathou");
                }
                return allMeta.includes(filter);
            });
        }

        // Map selected language filter to corresponding custom hero banner
        const langMap = {
            "all": "all",
            "koch rajbongshi": "koch_rajbongshi",
            "assamese": "assamese",
            "bodo": "bodo"
        };
        const currentLangKey = langMap[this.selectedFilter] || "all";
        const currentBanner = (this.bannersData && this.bannersData[currentLangKey]) ? this.bannersData[currentLangKey] : null;

        let spotlight = null;
        if (currentBanner && currentBanner.songId) {
            spotlight = songs.find(s => s.id === currentBanner.songId);
        }
        if (!spotlight && filteredSongs.length > 0) {
            spotlight = filteredSongs[0];
        }
        if (!spotlight) {
            spotlight = songs[0] || null;
        }

        const cleanSpotlight = spotlight ? this.cleanMetadata(spotlight.title, spotlight.artist, spotlight.audioUrl) : null;
        const bannerTitle = (currentBanner && currentBanner.title) ? currentBanner.title : (cleanSpotlight ? cleanSpotlight.title : "Sangeet Local");
        const bannerTag = (currentBanner && currentBanner.tag) ? currentBanner.tag : (spotlight && spotlight.genre ? `🎵 ${spotlight.genre}` : "🎵 Sangeet Local");
        const bannerDesc = (currentBanner && currentBanner.subtitle)
            ? currentBanner.subtitle
            : (cleanSpotlight
                ? `By ${cleanSpotlight.artist} • ${spotlight.album || 'Single'} • Regional Music`
                : "Your personal regional music streaming player.");
        let bannerCover = (currentBanner && currentBanner.coverUrl)
            ? (currentBanner.coverUrl.startsWith("/") ? currentBanner.coverUrl.substring(1) : currentBanner.coverUrl)
            : (spotlight ? this.getSongCoverUrl(spotlight) : "icons/icon-192.png");
        if (bannerCover && !bannerCover.startsWith("data:") && !bannerCover.startsWith("http") && !bannerCover.startsWith("icons/")) {
            const sep = bannerCover.includes("?") ? "&" : "?";
            bannerCover = `${bannerCover}${sep}_t=${(currentBanner && currentBanner.updatedAt) || Date.now()}`;
        }
        let bannerBg = (currentBanner && currentBanner.bgUrl)
            ? (currentBanner.bgUrl.startsWith("/") ? currentBanner.bgUrl.substring(1) : currentBanner.bgUrl)
            : "";
        if (bannerBg && !bannerBg.startsWith("data:") && !bannerBg.startsWith("http")) {
            const sep = bannerBg.includes("?") ? "&" : "?";
            bannerBg = `${bannerBg}${sep}_t=${(currentBanner && currentBanner.updatedAt) || Date.now()}`;
        }
        const bannerBgStyle = bannerBg
            ? `style="background: linear-gradient(135deg, rgba(11, 15, 23, 0.82) 0%, rgba(15, 23, 42, 0.88) 100%), url('${this.escapeHtml(bannerBg)}') center/cover no-repeat;"`
            : "";
        const playSongId = spotlight ? spotlight.id : (filteredSongs[0] ? filteredSongs[0].id : (songs[0] ? songs[0].id : ""));

        let html = `
            <!-- Filter Pills (All Music, Koch Rajbongshi, Assamese, Bodo) -->
            <div class="filter-pills">
                <button class="pill ${this.selectedFilter === 'all' ? 'active' : ''}" data-filter="all">All Music</button>
                <button class="pill ${this.selectedFilter === 'koch rajbongshi' ? 'active' : ''}" data-filter="koch rajbongshi">Koch Rajbongshi</button>
                <button class="pill ${this.selectedFilter === 'assamese' ? 'active' : ''}" data-filter="assamese">Assamese</button>
                <button class="pill ${this.selectedFilter === 'bodo' ? 'active' : ''}" data-filter="bodo">Bodo</button>
            </div>

            <!-- Hero Spotlight Banner (Dynamically updates with each of the 3 languages!) -->
            <div class="hero-banner" ${bannerBgStyle}>
                <div class="hero-content">
                    <div class="hero-tag">${this.escapeHtml(bannerTag)}</div>
                    <h2 class="hero-title">${this.escapeHtml(bannerTitle)}</h2>
                    <p class="hero-desc">${this.escapeHtml(bannerDesc)}</p>
                    <div class="hero-actions">
                        ${playSongId ? `
                        <button class="btn-primary" id="btnPlaySpotlight" data-song-id="${playSongId}">
                            <span>▶ Play Now</span>
                        </button>` : ''}
                    </div>
                </div>
                <div class="hero-art-stack">
                    <img src="${bannerCover}" alt="${this.escapeHtml(bannerTitle)}" class="hero-art-img" onerror="this.onerror=null; this.src='icons/icon-192.png';">
                </div>
            </div>
        `;

        // Trending Cards Row
        if (filteredSongs.length > 0) {
            html += `
                <div class="section-header">
                    <h3 class="section-title">Trending in Your Collection</h3>
                    <span class="section-more-link" data-view="library">View All (${songs.length})</span>
                </div>
                <div class="cards-grid">
            `;

            filteredSongs.slice(0, 8).forEach(song => {
                const cover = this.getSongCoverUrl(song);
                const meta = this.cleanMetadata(song.title, song.artist, song.audioUrl);
                html += `
                    <div class="song-card" data-song-id="${song.id}">
                        <div class="card-art-wrap">
                            <img src="${cover}" alt="${this.escapeHtml(meta.title)}" class="card-art" onerror="this.onerror=null; this.src='icons/icon-192.png';">
                            <div class="card-play-overlay" data-play-id="${song.id}">▶</div>
                        </div>
                        <div class="card-title" title="${this.escapeHtml(meta.title)}">${this.escapeHtml(meta.title)}</div>
                        <div class="card-artist" title="${this.escapeHtml(meta.artist)}">${this.escapeHtml(meta.artist)}</div>
                        <div class="card-meta">
                            <span>${this.escapeHtml(song.genre || 'Music')}</span>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        // Recent Tracks Table
        if (filteredSongs.length > 0) {
            html += `
                <div class="section-header">
                    <h3 class="section-title">Recently Added Songs</h3>
                </div>
                <div class="songs-table-wrap">
                    ${this.buildSongsTableHtml(filteredSongs.slice(0, 15))}
                </div>
            `;
        } else {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">🎵</div>
                    <h3>No Songs Found</h3>
                    <p>There are no songs in this category yet.</p>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindViewEvents(filteredSongs);
    }

    // --- 2. LIBRARY VIEW ---

    renderLibraryView(songs) {
        const container = this.dom.viewContainer;

        const totalSecs = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const totalDurationFormatted = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
                <div>
                    <h2 style="font-size: 28px; font-weight: 800; margin-bottom: 6px;">Your Music Library</h2>
                    <p style="color: var(--text-muted); font-size: 14px;">
                        ${songs.length} song${songs.length === 1 ? '' : 's'} • ${totalDurationFormatted} total playtime
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" id="btnPlayAllLibrary">
                        <span>▶ Play All</span>
                    </button>
                    <button class="btn-secondary" id="btnShuffleAllLibrary">
                        <span>🔀 Shuffle</span>
                    </button>
                </div>
            </div>
        `;

        if (songs.length > 0) {
            html += `
                <div class="songs-table-wrap">
                    ${this.buildSongsTableHtml(songs)}
                </div>
            `;
        } else {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">📂</div>
                    <h3>Your Library is Empty</h3>
                    <p>Songs will appear here when added to your music collection.</p>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindViewEvents(songs);

        // Library action handlers
        const btnPlayAll = document.getElementById("btnPlayAllLibrary");
        if (btnPlayAll) {
            btnPlayAll.addEventListener("click", () => {
                if (songs.length > 0) {
                    window.audioEngine.playSong(songs[0], songs, 0);
                }
            });
        }

        const btnShuffleAll = document.getElementById("btnShuffleAllLibrary");
        if (btnShuffleAll) {
            btnShuffleAll.addEventListener("click", () => {
                if (songs.length > 0) {
                    window.audioEngine.isShuffled = true;
                    this.dom.btnShuffle.classList.add("active");
                    const randIdx = Math.floor(Math.random() * songs.length);
                    window.audioEngine.playSong(songs[randIdx], songs, randIdx);
                }
            });
        }

        const btnAddLib = document.getElementById("btnOpenAddMusicLib");
        if (btnAddLib) {
            btnAddLib.addEventListener("click", () => this.openModal(this.dom.addMusicModal));
        }

        const btnBatchDel = document.getElementById("btnBatchDelete");
        if (btnBatchDel) {
            btnBatchDel.addEventListener("click", () => this.batchDeleteAll());
        }
    }

    // --- 3. LIKED SONGS VIEW ---

    renderLikedView(allSongs) {
        const likedSongs = allSongs.filter(s => !!s.isLiked);
        const container = this.dom.viewContainer;

        let html = `
            <div style="background: linear-gradient(135deg, #7c3aed, #4c1d95); border-radius: var(--radius-lg); padding: 32px; display: flex; align-items: center; gap: 24px; margin-bottom: 28px;">
                <div style="width: 100px; height: 100px; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; font-size: 48px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);">
                    ♥
                </div>
                <div>
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255, 255, 255, 0.8);">Playlist</div>
                    <h2 style="font-size: 36px; font-weight: 800; color: #ffffff;">Liked Songs</h2>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 14px;">${likedSongs.length} favorite track${likedSongs.length === 1 ? '' : 's'}</p>
                </div>
            </div>
        `;

        if (likedSongs.length > 0) {
            html += `
                <div style="margin-bottom: 16px;">
                    <button class="btn-primary" id="btnPlayLiked">
                        <span>▶ Play Liked Songs</span>
                    </button>
                </div>
                <div class="songs-table-wrap">
                    ${this.buildSongsTableHtml(likedSongs)}
                </div>
            `;
        } else {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">🤍</div>
                    <h3>No Liked Songs Yet</h3>
                    <p>Click the heart icon on any song while listening to save it to your favorites.</p>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindViewEvents(likedSongs);

        const btnPlayLiked = document.getElementById("btnPlayLiked");
        if (btnPlayLiked) {
            btnPlayLiked.addEventListener("click", () => {
                if (likedSongs.length > 0) {
                    window.audioEngine.playSong(likedSongs[0], likedSongs, 0);
                }
            });
        }
    }

    // --- 4. SEARCH VIEW ---

    renderSearchView(query, allSongs) {
        const container = this.dom.viewContainer;

        if (!query) {
            let html = `
                <div class="search-hub-header">
                    <h2 style="font-size: 26px; font-weight: 800; margin-bottom: 6px;">Search & Explore</h2>
                    <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 18px;">Tap a regional genre or search songs, artists & albums</p>
                </div>

                <div class="search-category-chips">
                    <button class="search-chip" data-search-tag="Bodo">🌿 Bodo</button>
                    <button class="search-chip" data-search-tag="Assamese">🌸 Assamese</button>
                    <button class="search-chip" data-search-tag="Koch Rajbongshi">🌾 Koch Rajbongshi</button>
                    <button class="search-chip" data-search-tag="Melodies">🎵 Melodies</button>
                    <button class="search-chip" data-search-tag="Uploads">📂 All Songs</button>
                </div>

                <div class="section-header" style="margin-top: 24px;">
                    <h3 class="section-title">All Songs in Collection (${allSongs.length})</h3>
                </div>
                <div class="songs-table-wrap">
                    ${this.buildSongsTableHtml(allSongs)}
                </div>
            `;
            container.innerHTML = html;
            this.bindViewEvents(allSongs);

            // Hook category chips for instant search
            container.querySelectorAll("[data-search-tag]").forEach(btn => {
                btn.addEventListener("click", () => {
                    const tag = btn.getAttribute("data-search-tag");
                    if (this.dom.globalSearchInput) {
                        this.dom.globalSearchInput.value = tag === "Uploads" ? "" : tag;
                        if (tag !== "Uploads") this.dom.btnSearchClear.classList.add("visible");
                    }
                    this.renderSearchView(tag === "Uploads" ? "" : tag, allSongs);
                });
            });
            return;
        }

        const q = query.toLowerCase();

        const results = allSongs.filter(s => {
            return (s.title && s.title.toLowerCase().includes(q)) ||
                (s.artist && s.artist.toLowerCase().includes(q)) ||
                (s.album && s.album.toLowerCase().includes(q)) ||
                (s.genre && s.genre.toLowerCase().includes(q));
        });

        let html = `
            <div style="margin-bottom: 20px;">
                <h2 style="font-size: 24px; font-weight: 700;">Search Results for "${this.escapeHtml(query)}"</h2>
                <p style="color: var(--text-muted); font-size: 14px;">Found ${results.length} matching track${results.length === 1 ? '' : 's'}</p>
            </div>
        `;

        if (results.length > 0) {
            html += `
                <div class="songs-table-wrap">
                    ${this.buildSongsTableHtml(results)}
                </div>
            `;
        } else {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No Matches Found</h3>
                    <p>We couldn't find any songs matching "${this.escapeHtml(query)}". Try another keyword or explore the categories above.</p>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindViewEvents(results);
    }

    // --- 5. PLAYLIST DETAIL VIEW ---

    async renderPlaylistDetailView(playlistId, allSongs) {
        this.currentPlaylistId = playlistId;
        const container = this.dom.viewContainer;

        const playlists = await window.musicDB.getAllPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);

        if (!playlist) {
            this.switchView("home");
            return;
        }

        const playlistSongs = (playlist.songIds || []).map(id => allSongs.find(s => s.id === id)).filter(Boolean);

        let html = `
            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.4), #111827); border-radius: var(--radius-lg); padding: 32px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px;">
                <div style="display: flex; align-items: center; gap: 24px;">
                    <div style="width: 100px; height: 100px; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 44px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);">
                        🎶
                    </div>
                    <div>
                        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent);">Playlist</div>
                        <h2 style="font-size: 32px; font-weight: 800; color: #ffffff;">${this.escapeHtml(playlist.name)}</h2>
                        <p style="color: var(--text-muted); font-size: 14px;">${playlistSongs.length} track${playlistSongs.length === 1 ? '' : 's'}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-primary" id="btnPlayPlaylist">
                        <span>▶ Play</span>
                    </button>
                    <button class="btn-secondary" id="btnDeletePlaylist" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Delete Playlist">
                        <span>🗑 Delete Playlist</span>
                    </button>
                </div>
            </div>
        `;

        if (playlistSongs.length > 0) {
            html += `
                <div class="songs-table-wrap">
                    ${this.buildSongsTableHtml(playlistSongs, playlistId)}
                </div>
            `;
        } else {
            html += `
                <div class="empty-state">
                    <div class="empty-icon">➕</div>
                    <h3>This Playlist is Empty</h3>
                    <p>Add songs to this playlist from your library or player.</p>
                </div>
            `;
        }

        container.innerHTML = html;
        this.bindViewEvents(playlistSongs, playlistId);

        const btnPlay = document.getElementById("btnPlayPlaylist");
        if (btnPlay) {
            btnPlay.addEventListener("click", () => {
                if (playlistSongs.length > 0) {
                    window.audioEngine.playSong(playlistSongs[0], playlistSongs, 0);
                }
            });
        }

        const btnDel = document.getElementById("btnDeletePlaylist");
        if (btnDel) {
            btnDel.addEventListener("click", async () => {
                if (confirm(`Delete playlist "${playlist.name}"? (Songs will remain in your library)`)) {
                    await window.musicDB.deletePlaylist(playlistId);
                    this.showToast(`Playlist "${playlist.name}" deleted`);
                    await this.loadPlaylists();
                    this.switchView("home");
                }
            });
        }
    }

    // --- HTML TABLE GENERATOR ---

    buildSongsTableHtml(songs, fromPlaylistId = null) {
        let html = `
            <table class="songs-table">
                <thead>
                    <tr>
                        <th style="width: 44px; text-align: center;">#</th>
                        <th style="width: 50px;"></th>
                        <th>Title</th>
                        <th>Album</th>
                        <th>Genre</th>
                        <th style="width: 70px;">Time</th>
                        <th style="width: 110px; text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const currentSong = window.audioEngine.currentSong;

        songs.forEach((song, idx) => {
            const isPlaying = currentSong && currentSong.id === song.id;
            const coverUrl = this.getSongCoverUrl(song);
            const meta = this.cleanMetadata(song.title, song.artist, song.audioUrl);

            html += `
                <tr data-song-id="${song.id}" class="${isPlaying ? 'playing' : ''}">
                    <td class="col-num">
                        ${isPlaying ? `
                            <div class="playing-equalizer-bars">
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                                <span class="eq-bar"></span>
                            </div>
                        ` : (idx + 1)}
                    </td>
                    <td class="col-art">
                        <img src="${coverUrl}" alt="Art" class="row-art" onerror="this.onerror=null; this.src='icons/icon-192.png';">
                    </td>
                    <td class="col-title">
                        <div class="song-title-text" title="${this.escapeHtml(meta.title)}">${this.escapeHtml(meta.title)}</div>
                        <div class="song-meta-line">
                            <span class="song-artist-sub" title="${this.escapeHtml(meta.artist)}">${this.escapeHtml(meta.artist)}</span>
                            <span class="song-meta-dot">•</span>
                            <span class="song-genre-sub">${this.escapeHtml(song.genre || 'Music')}</span>
                            <span class="song-meta-dot">•</span>
                            <span class="song-duration-sub">${this.formatTime(song.duration)}</span>
                        </div>
                    </td>
                    <td class="col-album">${this.escapeHtml(song.album || '-')}</td>
                    <td style="color: var(--text-dim); font-size: 13px;">${this.escapeHtml(song.genre || 'Music')}</td>
                    <td class="col-duration">${this.formatTime(song.duration)}</td>
                    <td class="col-actions">
                        <button class="row-btn ${song.isLiked ? 'liked' : ''}" data-like-id="${song.id}" title="Like">♥</button>
                        <button class="row-btn btn-info-dot" data-info-id="${song.id}" title="See Details">ℹ</button>
                        ${fromPlaylistId ? `
                            <button class="row-btn" data-remove-pl-id="${song.id}" title="Remove from Playlist" style="color: #ef4444;">✕</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        return html;
    }

    bindViewEvents(songsList, currentPlaylistId = null) {
        // Row click to play
        document.querySelectorAll(".songs-table tr[data-song-id]").forEach(tr => {
            tr.addEventListener("click", (e) => {
                if (e.target.closest("button")) return; // Don't trigger if clicked action button
                const id = tr.getAttribute("data-song-id");
                const song = songsList.find(s => s.id === id);
                if (song) {
                    window.audioEngine.playSong(song, songsList);
                }
            });
        });

        // Card play overlay & card click to play (essential for mobile touch)
        document.querySelectorAll(".song-card[data-song-id]").forEach(card => {
            card.addEventListener("click", (e) => {
                if (e.target.closest("button")) return;
                const id = card.getAttribute("data-song-id");
                const song = songsList.find(s => s.id === id);
                if (song) {
                    window.audioEngine.playSong(song, songsList);
                }
            });
        });

        document.querySelectorAll(".card-play-overlay[data-play-id]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-play-id");
                const song = songsList.find(s => s.id === id);
                if (song) {
                    window.audioEngine.playSong(song, songsList);
                }
            });
        });

        // Like button click (with reactive update for Liked page and persistent state)
        document.querySelectorAll("[data-like-id]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-like-id");
                const isLiked = await window.musicDB.toggleLike(id);

                // Update all buttons matching this ID across the DOM
                document.querySelectorAll(`[data-like-id="${id}"]`).forEach(b => {
                    b.classList.toggle("liked", isLiked);
                });

                // Update song in current playback if it's the one playing
                if (window.audioEngine.currentSong && (window.audioEngine.currentSong.id === id || (window.musicDB.getSongIdentifier && window.musicDB.getSongIdentifier(window.audioEngine.currentSong) === id))) {
                    window.audioEngine.currentSong.isLiked = isLiked;
                    this.dom.playerLikeBtn.classList.toggle("liked", isLiked);
                }

                await this.updateCounters();
                this.showToast(isLiked ? "Saved to Liked Songs ♥" : "Removed from Liked Songs");

                // If currently viewing the Liked page, reactively re-render so it immediately updates
                if (this.currentView === "liked") {
                    const allSongs = await window.musicDB.getAllSongs();
                    this.renderLikedView(allSongs);
                }
            });
        });

        // Delete song button click (THE REMOVE FEATURE)
        document.querySelectorAll("[data-delete-id]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-delete-id");
                const song = songsList.find(s => s.id === id);
                const title = song ? song.title : "this song";

                if (confirm(`Delete "${title}" from your personal library?`)) {
                    await this.deleteSong(id);
                }
            });
        });

        // Remove from playlist button click
        document.querySelectorAll("[data-remove-pl-id]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const songId = btn.getAttribute("data-remove-pl-id");
                if (currentPlaylistId) {
                    await window.musicDB.removeSongFromPlaylist(currentPlaylistId, songId);
                    this.showToast("Removed from playlist");
                    this.refreshCurrentView();
                }
            });
        });

        // Edit button click
        document.querySelectorAll("[data-edit-id]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-edit-id");
                this.openEditMetadataModal(id);
            });
        });

        // See song details bottom sheet click (v2.0.0 Mobile Feature)
        document.querySelectorAll("[data-info-id]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute("data-info-id");
                await this.openSongDetailsSheet(id, songsList);
            });
        });

        // Filter pills click
        document.querySelectorAll(".filter-pills .pill").forEach(pill => {
            pill.addEventListener("click", () => {
                this.selectedFilter = pill.getAttribute("data-filter");
                this.switchView("home");
            });
        });

        // Spotlight Play button
        const btnSpotlight = document.getElementById("btnPlaySpotlight");
        if (btnSpotlight) {
            btnSpotlight.addEventListener("click", () => {
                const id = btnSpotlight.getAttribute("data-song-id");
                const song = songsList.find(s => s.id === id);
                if (song) {
                    window.audioEngine.playSong(song, songsList);
                }
            });
        }

        // Add buttons
        const btnAddHero = document.getElementById("btnAddSongsHero");
        if (btnAddHero) btnAddHero.addEventListener("click", () => this.openModal(this.dom.addMusicModal));

        const btnEmptyAdd = document.getElementById("btnEmptyAdd");
        if (btnEmptyAdd) btnEmptyAdd.addEventListener("click", () => this.openModal(this.dom.addMusicModal));

        // Links with data-view
        document.querySelectorAll(".section-more-link[data-view]").forEach(link => {
            link.addEventListener("click", () => {
                const v = link.getAttribute("data-view");
                this.switchView(v);
            });
        });
    }

    // --- PLAYLISTS IN SIDEBAR ---

    async loadPlaylists() {
        const playlists = await window.musicDB.getAllPlaylists();
        const list = this.dom.playlistsList;
        if (!list) return;
        list.innerHTML = "";

        playlists.forEach(pl => {
            const li = document.createElement("li");
            li.className = "nav-item";
            li.innerHTML = `
                <span style="font-size: 16px;">📁</span>
                <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(pl.name)}</span>
                <span class="badge-count">${(pl.songIds || []).length}</span>
            `;
            li.addEventListener("click", () => {
                this.switchView("playlist", { playlistId: pl.id });
            });
            list.appendChild(li);
        });
    }

    // --- SONG DETAILS BOTTOM SHEET (v2.0.0 MOBILE FEATURE) ---

    async openSongDetailsSheet(songId, songsList = null) {
        let song = songsList ? songsList.find(s => s.id === songId) : null;
        if (!song && window.musicDB) {
            song = await window.musicDB.getSong(songId);
        }
        if (!song) return;

        const modal = document.getElementById("songDetailsModal");
        if (!modal) return;

        const meta = this.cleanMetadata(song.title, song.artist, song.audioUrl);
        const cover = this.getSongCoverUrl(song);

        const img = document.getElementById("detailsCoverImg");
        if (img) img.src = cover;

        const titleEl = document.getElementById("detailsSongTitle");
        if (titleEl) titleEl.textContent = meta.title;

        const artistEl = document.getElementById("detailsSongArtist");
        if (artistEl) artistEl.textContent = meta.artist;

        const genreEl = document.getElementById("detailsGenreBadge");
        if (genreEl) genreEl.textContent = "🎵 " + (song.genre || "Regional Music");

        const durEl = document.getElementById("detailsDurationBadge");
        if (durEl) durEl.textContent = "⏱ " + this.formatTime(song.duration);

        const albumEl = document.getElementById("detailsAlbumText");
        if (albumEl) albumEl.textContent = song.album || "Single";

        const yearEl = document.getElementById("detailsYearText");
        if (yearEl) yearEl.textContent = song.year || "2024";

        const formatEl = document.getElementById("detailsFormatText");
        if (formatEl) formatEl.textContent = song.format || "Audio (MP3)";

        const sizeEl = document.getElementById("detailsSizeText");
        if (sizeEl) {
            const bytes = song.fileSize || 0;
            sizeEl.textContent = bytes > 0 ? (bytes / (1024 * 1024)).toFixed(2) + " MB" : "Standard Audio Quality";
        }

        // Like button in sheet
        const likeBtn = document.getElementById("btnDetailsLike");
        const likeHeart = document.getElementById("detailsLikeHeart");
        const likeLabel = document.getElementById("detailsLikeLabel");
        if (likeBtn) {
            likeBtn.onclick = async () => {
                const isLiked = await window.musicDB.toggleLike(song.id);
                song.isLiked = isLiked;
                if (likeHeart) likeHeart.style.color = isLiked ? "#ef4444" : "";
                if (likeLabel) likeLabel.textContent = isLiked ? "Liked" : "Like";
                document.querySelectorAll(`[data-like-id="${song.id}"]`).forEach(b => b.classList.toggle("liked", isLiked));
                this.showToast(isLiked ? "Saved to Liked Songs ♥" : "Removed from Liked Songs");
            };
            if (likeHeart) likeHeart.style.color = song.isLiked ? "#ef4444" : "";
            if (likeLabel) likeLabel.textContent = song.isLiked ? "Liked" : "Like";
        }

        // Play Now button in sheet
        const playBtn = document.getElementById("btnDetailsPlayNow");
        const playFab = document.getElementById("btnDetailsPlayFab");
        const doPlay = () => {
            this.closeModal(modal);
            window.audioEngine.playSong(song, songsList || [song]);
        };
        if (playBtn) playBtn.onclick = doPlay;
        if (playFab) playFab.onclick = doPlay;

        // Add to Queue button in sheet
        const queueBtn = document.getElementById("btnDetailsAddToQueue");
        if (queueBtn) {
            queueBtn.onclick = () => {
                window.audioEngine.addToQueue(song);
                this.showToast(`Added "${meta.title}" to Queue`);
                this.closeModal(modal);
            };
        }

        this.openModal(modal);
    }

    // --- EDIT METADATA MODAL ---

    async openEditMetadataModal(songId) {
        const song = await window.musicDB.getSong(songId);
        if (!song) return;

        this.editCoverBase64 = null;
        this.editCoverRemoved = false;

        this.dom.editSongId.value = song.id;
        this.dom.editTitle.value = song.title || "";
        this.dom.editArtist.value = song.artist || "";
        this.dom.editAlbum.value = song.album || "";
        this.dom.editGenre.value = song.genre || "";
        this.dom.editYear.value = song.year || "";
        this.dom.editLyrics.value = song.lyrics || "";

        const currentCover = this.getSongCoverUrl(song);
        if (this.dom.editCoverPreview) {
            this.dom.editCoverPreview.src = currentCover;
        }
        if (this.dom.editCoverUrlInput) {
            this.dom.editCoverUrlInput.value = (song.coverUrl && song.coverUrl.startsWith("http")) ? song.coverUrl : "";
        }
        if (this.dom.editCoverFileInput) {
            this.dom.editCoverFileInput.value = "";
        }

        this.openModal(this.dom.editSongModal);
    }

    // --- QUEUE DRAWER ---

    toggleQueueDrawer() {
        const modal = this.dom.queueDrawerModal;
        if (modal.classList.contains("active")) {
            this.closeModal(modal);
        } else {
            this.renderQueueItems();
            this.openModal(modal);
        }
    }

    renderQueueItems() {
        const container = document.getElementById("queueListContainer");
        if (!container) return;

        const queue = window.audioEngine.queue;
        const currentSong = window.audioEngine.currentSong;

        if (queue.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">Queue is empty</div>`;
            return;
        }

        let html = "";
        queue.forEach((song, idx) => {
            const isPlaying = currentSong && currentSong.id === song.id;
            html += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 6px; background: ${isPlaying ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)'}; cursor: pointer;" data-queue-idx="${idx}">
                    <span style="font-size: 11px; color: var(--text-dim); width: 16px;">${isPlaying ? '▶' : (idx + 1)}</span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isPlaying ? 'var(--primary)' : 'var(--text-main)'};">${this.escapeHtml(song.title)}</div>
                        <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(song.artist)}</div>
                    </div>
                    <button class="btn-icon-tiny" data-remove-queue="${idx}" title="Remove from queue" style="font-size: 12px; color: var(--text-dim);">✕</button>
                </div>
            `;
        });

        container.innerHTML = html;

        // Queue item click to jump
        container.querySelectorAll("[data-queue-idx]").forEach(item => {
            item.addEventListener("click", (e) => {
                if (e.target.closest("button")) return;
                const idx = parseInt(item.getAttribute("data-queue-idx"), 10);
                window.audioEngine.playSong(queue[idx], null, idx);
            });
        });

        // Remove from queue
        container.querySelectorAll("[data-remove-queue]").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute("data-remove-queue"), 10);
                window.audioEngine.removeFromQueue(idx);
            });
        });
    }

    // --- MOBILE CONNECT MODAL ---

    openMobileConnectModal() {
        const modal = document.getElementById("mobileConnectModal");
        if (!modal) return;

        let host = window.location.hostname;
        const port = window.location.port || "8080";

        // If currently on localhost or 127.0.0.1, use the detected Wi-Fi IP
        if (host === "localhost" || host === "127.0.0.1" || !host) {
            host = "192.168.31.41";
        }

        const mobileUrl = `http://${host}:${port}`;
        const urlInput = document.getElementById("mobileUrlInput");
        if (urlInput) {
            urlInput.value = mobileUrl;
        }

        const qrImg = document.getElementById("mobileQrCodeImg");
        if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}`;
        }

        this.openModal(modal);
    }

    // --- FULLSCREEN NOW PLAYING ---

    openFullscreenPlayer() {
        this.dom.fullscreenPlayer.classList.add("active");
    }

    closeFullscreenPlayer() {
        this.dom.fullscreenPlayer.classList.remove("active");
    }

    // --- VISUALIZER ANIMATION LOOP ---

    startVisualizerLoop() {
        const miniCanvas = this.dom.miniVisualizerCanvas;
        const miniCtx = miniCanvas ? miniCanvas.getContext("2d") : null;

        const fsCanvas = this.dom.fsVisualizerCanvas;
        const fsCtx = fsCanvas ? fsCanvas.getContext("2d") : null;

        const render = () => {
            this.animFrameId = requestAnimationFrame(render);

            const isPlaying = !window.audioEngine.audio.paused;
            const freqData = window.audioEngine.getFrequencyData();

            // Render mini visualizer in player bar
            if (miniCtx && miniCanvas) {
                miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
                const bars = 8;
                const barWidth = 4;
                const spacing = 3;

                for (let i = 0; i < bars; i++) {
                    const val = isPlaying ? freqData[i * 4] || 0 : 0;
                    const barHeight = Math.max(3, (val / 255) * miniCanvas.height);
                    const x = i * (barWidth + spacing);
                    const y = miniCanvas.height - barHeight;

                    miniCtx.fillStyle = isPlaying ? "#10b981" : "rgba(255, 255, 255, 0.2)";
                    miniCtx.fillRect(x, y, barWidth, barHeight);
                }
            }

            // Render mobile active flowing soundwave
            const mCanvas = document.getElementById("mobileWaveCanvas");
            if (mCanvas && (window.innerWidth <= 768 || document.body.classList.contains("in-mobile-frame"))) {
                const mCtx = mCanvas.getContext("2d");
                if (mCtx) {
                    if (mCanvas.width !== mCanvas.offsetWidth && mCanvas.offsetWidth > 0) {
                        mCanvas.width = mCanvas.offsetWidth;
                    }
                    mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height);

                    const width = mCanvas.width;
                    const height = mCanvas.height;
                    const midY = height / 2;

                    if (isPlaying) {
                        // Calculate audio energy for amplitude
                        let energy = 0;
                        for (let k = 0; k < 16; k++) {
                            energy += (freqData[k] || 0);
                        }
                        const avgEnergy = energy / 16;
                        const amp = Math.max(3.5, (avgEnergy / 255) * (height / 2.3));
                        const stepTime = performance.now() * 0.0035;

                        // Primary glowing sound wave (Cyan to Purple to Pink)
                        mCtx.beginPath();
                        mCtx.lineWidth = 2.4;
                        const grad1 = mCtx.createLinearGradient(0, 0, width, 0);
                        grad1.addColorStop(0, "rgba(139, 92, 246, 0.2)");
                        grad1.addColorStop(0.25, "rgba(6, 182, 212, 0.95)");
                        grad1.addColorStop(0.7, "rgba(168, 85, 247, 0.95)");
                        grad1.addColorStop(1, "rgba(236, 72, 153, 0.2)");
                        mCtx.strokeStyle = grad1;

                        for (let x = 0; x <= width; x += 4) {
                            const wave1 = Math.sin(x * 0.024 + stepTime) * amp;
                            const wave2 = Math.cos(x * 0.016 - stepTime * 0.7) * (amp * 0.5);
                            const y = midY + wave1 + wave2;
                            if (x === 0) mCtx.moveTo(x, y);
                            else mCtx.lineTo(x, y);
                        }
                        mCtx.stroke();

                        // Secondary depth wave
                        mCtx.beginPath();
                        mCtx.lineWidth = 1.4;
                        const grad2 = mCtx.createLinearGradient(0, 0, width, 0);
                        grad2.addColorStop(0, "transparent");
                        grad2.addColorStop(0.35, "rgba(236, 72, 153, 0.7)");
                        grad2.addColorStop(0.65, "rgba(59, 130, 246, 0.8)");
                        grad2.addColorStop(1, "transparent");
                        mCtx.strokeStyle = grad2;

                        for (let x = 0; x <= width; x += 6) {
                            const y = midY + Math.sin(x * 0.038 - stepTime * 1.3) * (amp * 0.65);
                            if (x === 0) mCtx.moveTo(x, y);
                            else mCtx.lineTo(x, y);
                        }
                        mCtx.stroke();
                    } else {
                        // Resting flat line
                        mCtx.beginPath();
                        mCtx.lineWidth = 1;
                        mCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
                        mCtx.moveTo(0, midY);
                        mCtx.lineTo(width, midY);
                        mCtx.stroke();
                    }
                }
            }

            // Render fullscreen visualizer if open
            if (fsCtx && fsCanvas && this.dom.fullscreenPlayer.classList.contains("active")) {
                if (fsCanvas.width !== 700) {
                    fsCanvas.width = 700;
                    fsCanvas.height = 100;
                }
                fsCtx.clearRect(0, 0, fsCanvas.width, fsCanvas.height);

                const bars = 48;
                const barWidth = 8;
                const gap = 6;

                for (let i = 0; i < bars; i++) {
                    const val = isPlaying ? freqData[i * 2] || 0 : 4;
                    const barHeight = Math.max(4, (val / 255) * fsCanvas.height * 0.9);
                    const x = i * (barWidth + gap);
                    const y = fsCanvas.height - barHeight;

                    // Neon gradient bar
                    const grad = fsCtx.createLinearGradient(0, y, 0, fsCanvas.height);
                    grad.addColorStop(0, "#2dd4bf");
                    grad.addColorStop(1, "#10b981");

                    fsCtx.fillStyle = grad;
                    fsCtx.fillRect(x, y, barWidth, barHeight);
                }
            }
        };

        render();
    }

    // --- EQUALIZER PRESETS SYNC ---

    updateEqSlidersFromPreset(presetName) {
        const presets = {
            "Flat": [0, 0, 0, 0, 0],
            "Bass Boost": [7, 4, 1, 0, -1],
            "Treble Boost": [-2, 0, 1, 4, 7],
            "Indian Classical": [2, 1, 5, 4, 2],
            "Electronic": [6, 4, -1, 3, 5],
            "Rock": [5, 3, -1, 3, 4],
            "Vocal": [-2, 1, 6, 3, 1]
        };

        const gains = presets[presetName] || [0, 0, 0, 0, 0];
        gains.forEach((gain, i) => {
            const slider = document.getElementById("eqBand" + i);
            if (slider) slider.value = gain;
        });
    }

    // --- 5. MENU & ABOUT VIEW (v2.0.0 MOBILE MENU) ---

    renderMenuView() {
        const container = this.dom.viewContainer;
        const currentTheme = this.currentTheme || (document.body.classList.contains("theme-white") ? "white" : (document.body.classList.contains("theme-violet") ? "violet" : "dark"));

        let html = `
            <div class="menu-page-wrap">
                <!-- Page Header -->
                <div class="menu-page-header">
                    <h2 class="menu-page-title">App Menu & Settings</h2>
                    <p class="menu-page-subtitle">Personalize theme colors, sound effects & creator info</p>
                </div>

                <!-- 1. Theme Color Selection Deck -->
                <div class="menu-section-card">
                    <div class="menu-section-head">
                        <span class="menu-section-icon">🎨</span>
                        <div>
                            <h3 class="menu-section-title">App Theme & Colors</h3>
                            <p class="menu-section-desc">Select your preferred color scheme</p>
                        </div>
                    </div>

                    <div class="theme-cards-grid">
                        <!-- Theme 1: Cyber Dark -->
                        <div class="theme-card ${currentTheme === 'dark' ? 'active' : ''}" data-theme-choice="dark">
                            <div class="theme-preview-box preview-dark">
                                <span class="theme-active-check">✓</span>
                                <div class="theme-preview-bars">
                                    <span style="background: #06b6d4;"></span>
                                    <span style="background: #8b5cf6;"></span>
                                    <span style="background: #10b981;"></span>
                                </div>
                            </div>
                            <div class="theme-card-info">
                                <span class="theme-card-name">Cyber Dark</span>
                                <span class="theme-card-badge">Default</span>
                            </div>
                            <span class="theme-card-detail">OLED obsidian with cyan & purple aura</span>
                        </div>

                        <!-- Theme 2: Midnight Violet -->
                        <div class="theme-card ${currentTheme === 'violet' ? 'active' : ''}" data-theme-choice="violet">
                            <div class="theme-preview-box preview-violet">
                                <span class="theme-active-check">✓</span>
                                <div class="theme-preview-bars">
                                    <span style="background: #a855f7;"></span>
                                    <span style="background: #ec4899;"></span>
                                    <span style="background: #3b82f6;"></span>
                                </div>
                            </div>
                            <div class="theme-card-info">
                                <span class="theme-card-name">Midnight Violet</span>
                            </div>
                            <span class="theme-card-detail">Neon synthwave purple & hot pink</span>
                        </div>

                        <!-- Theme 3: Frost White -->
                        <div class="theme-card ${currentTheme === 'white' ? 'active' : ''}" data-theme-choice="white">
                            <div class="theme-preview-box preview-white">
                                <span class="theme-active-check">✓</span>
                                <div class="theme-preview-bars">
                                    <span style="background: #0284c7;"></span>
                                    <span style="background: #059669;"></span>
                                    <span style="background: #64748b;"></span>
                                </div>
                            </div>
                            <div class="theme-card-info">
                                <span class="theme-card-name">Frost White</span>
                            </div>
                            <span class="theme-card-detail">Clean, minimalist light aesthetic</span>
                        </div>
                    </div>
                </div>

                <!-- 2. Audio & Studio Tools -->
                <div class="menu-section-card">
                    <div class="menu-section-head">
                        <span class="menu-section-icon">🎛️</span>
                        <div>
                            <h3 class="menu-section-title">Studio Tools</h3>
                            <p class="menu-section-desc">Audio equalizer and connectivity</p>
                        </div>
                    </div>

                    <div class="menu-tools-list">
                        <button class="menu-tool-item" id="btnMenuOpenEq">
                            <div class="tool-item-icon">🎚️</div>
                            <div class="tool-item-text">
                                <span class="tool-item-title">5-Band Equalizer & Bass FX</span>
                                <span class="tool-item-sub">Customize frequency bands, bass boost & vocal presets</span>
                            </div>
                            <span class="tool-item-arrow">›</span>
                        </button>

                        <button class="menu-tool-item" id="btnMenuOpenQueue">
                            <div class="tool-item-icon">📑</div>
                            <div class="tool-item-text">
                                <span class="tool-item-title">Current Play Queue</span>
                                <span class="tool-item-sub">View upcoming tracks and reorder playlist</span>
                            </div>
                            <span class="tool-item-arrow">›</span>
                        </button>

                        <button class="menu-tool-item" id="btnMenuOpenConnect">
                            <div class="tool-item-icon">📱</div>
                            <div class="tool-item-text">
                                <span class="tool-item-title">PC & Mobile Wi-Fi Sync</span>
                                <span class="tool-item-sub">Connect phone to home PC studio over local Wi-Fi</span>
                            </div>
                            <span class="tool-item-arrow">›</span>
                        </button>
                    </div>
                </div>

                <!-- 3. Creator & About Section -->
                <div class="menu-section-card">
                    <div class="menu-section-head">
                        <span class="menu-section-icon">ℹ️</span>
                        <div>
                            <h3 class="menu-section-title">About Sangeet Local</h3>
                            <p class="menu-section-desc">Creator and app information</p>
                        </div>
                    </div>

                    <div class="about-hero-card">
                        <div class="about-creator-badge">⭐ CREATOR & FOUNDER</div>
                        <div class="about-avatar-circle">
                            <span>🎵</span>
                        </div>
                        <h2 class="about-title">Sangeet Local</h2>
                        <div class="about-lead">Create or Idea By: <span class="about-highlight">Parag (Pinku)</span></div>
                        <div class="about-version-badge" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(6, 182, 212, 0.2); border: 1px solid rgba(6, 182, 212, 0.5); border-radius: 20px; font-size: 12px; font-weight: 700; color: #67e8f9; margin-top: 6px;">
                            <span>✨ Version 2.0.0</span>
                        </div>
                        <div class="about-location-pill" style="margin-top: 6px;">📍 Made in Basugaon</div>
                    </div>

                    <div class="about-grid" style="margin-top: 16px;">
                        <div class="about-card">
                            <div class="about-card-icon">💡</div>
                            <h3>Create or Idea By</h3>
                            <p>Conceptualized and designed by <strong>Parag (Pinku)</strong> for personal, fast, ad-free music listening anytime on PC and mobile phones.</p>
                        </div>

                        <div class="about-card">
                            <div class="about-card-icon">🏡</div>
                            <h3>Made in Basugaon</h3>
                            <p>Proudly created and hosted locally in <strong>Basugaon, Assam</strong>. Built to celebrate regional music: Koch Rajbongshi, Assamese, and Bodo songs.</p>
                        </div>

                        <div class="about-card">
                            <div class="about-card-icon">🚀</div>
                            <h3>Version 2.0.0 Architecture</h3>
                            <p>Engineered with Cyber OLED Obsidian themes, real-time audio visualizers, touch scrubbing, song details sheet, and offline APK playback.</p>
                        </div>

                        <div class="about-card">
                            <div class="about-card-icon">⚡</div>
                            <h3>Audio Engineering</h3>
                            <p>High-resolution HTML5 audio engine, live 5-band equalizer, byte-range streaming, touch scrubber, repeat modes, and offline sync.</p>
                        </div>
                    </div>

                    <div class="about-footer-note" style="margin-top: 20px;">
                        <p>Sangeet Local v2.0.0 • Create or Idea By: Parag (Pinku) • Made in Basugaon</p>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Theme card selection click handlers
        container.querySelectorAll("[data-theme-choice]").forEach(card => {
            card.addEventListener("click", () => {
                const choice = card.getAttribute("data-theme-choice");
                this.setTheme(choice);
                const themeNames = { dark: "Cyber Dark", violet: "Midnight Violet", white: "Frost White" };
                this.showToast(`Switched to ${themeNames[choice] || choice} theme`);
            });
        });

        // Studio tools triggers
        const btnOpenEq = document.getElementById("btnMenuOpenEq");
        if (btnOpenEq) btnOpenEq.addEventListener("click", () => this.openModal(this.dom.equalizerModal));

        const btnOpenQueue = document.getElementById("btnMenuOpenQueue");
        if (btnOpenQueue) btnOpenQueue.addEventListener("click", () => this.toggleQueueDrawer());

        const btnOpenConnect = document.getElementById("btnMenuOpenConnect");
        if (btnOpenConnect) btnOpenConnect.addEventListener("click", () => this.openMobileConnectModal());

        this.bindViewEvents([]);
    }

    renderAboutView() {
        return this.renderMenuView();
    }

    // --- UTILITIES & HELPERS ---

    // Real-Time Live Sync: Automatically detects when songs or covers are added/edited in PC Studio
    startLiveSync() {
        let lastSyncSignature = null;
        let isSyncing = false;

        const checkSync = async () => {
            if (isSyncing) return;
            isSyncing = true;
            try {
                const songs = await window.musicDB.getAllSongs();
                let banners = null;
                try {
                    const bRes = await fetch("data/banners.json?_t=" + Date.now(), { cache: "no-store" });
                    if (bRes.ok) banners = await bRes.json();
                } catch (e) { }

                const songsSig = (songs || []).map(s => `${s.id}:${s.title}:${s.coverUrl || ''}:${s.updatedAt || ''}`).join("|");
                const bannersSig = banners ? JSON.stringify(banners) : "";
                const currentSignature = `${(songs || []).length}_${songsSig}_${bannersSig}`;

                if (lastSyncSignature !== null && lastSyncSignature !== currentSignature) {
                    console.log("[LiveSync] Change detected from PC Admin Studio! Updating mobile view smoothly...");
                    if (banners) {
                        this.bannersData = banners;
                    }
                    await this.updateCounters();
                    await this.refreshCurrentView();
                    this.showToast("⚡ Mobile library updated with latest songs from PC Studio!");
                }
                lastSyncSignature = currentSignature;
            } catch (err) {
                // Silently swallow background sync errors
            } finally {
                isSyncing = false;
            }
        };

        // Initial check after start
        setTimeout(checkSync, 1500);

        // Continuous polling every 6 seconds
        this.liveSyncTimer = setInterval(checkSync, 6000);

        // Instant refresh on mobile screen wakeup or window focus
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                checkSync();
            }
        });
        window.addEventListener("focus", () => checkSync());
    }

    getSongCoverUrl(song) {
        if (!song) return "";
        if (song.coverBlob) {
            return URL.createObjectURL(song.coverBlob);
        }
        if (song.coverUrl) {
            let url = song.coverUrl;
            if (url.startsWith("/") && !url.startsWith("//")) {
                url = url.substring(1);
            }
            if (!url.startsWith("data:") && !url.startsWith("http")) {
                const sep = url.includes("?") ? "&" : "?";
                return `${url}${sep}_t=${song.updatedAt || song.dateAdded || Date.now()}`;
            }
            return url;
        }
        // Default clean gradient placeholder
        return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='55%' font-size='42' fill='%2310b981' text-anchor='middle' dominant-baseline='middle'>♫</text></svg>`;
    }

    async updateCounters() {
        const songs = await window.musicDB.getAllSongs();
        if (this.dom.librarySongCount) this.dom.librarySongCount.textContent = songs.length;

        const liked = songs.filter(s => !!s.isLiked);
        if (this.dom.likedSongCount) this.dom.likedSongCount.textContent = liked.length;

        // Estimate IndexedDB storage
        let totalBytes = 0;
        songs.forEach(s => {
            totalBytes += (s.fileSize || 0);
        });
        const mb = (totalBytes / (1024 * 1024)).toFixed(1);
        if (this.dom.storageUsedText) this.dom.storageUsedText.textContent = mb + " MB";

        // Up to 500MB visual meter
        const meterPercent = Math.min(100, Math.round((totalBytes / (500 * 1024 * 1024)) * 100));
        if (this.dom.storageProgressBar) this.dom.storageProgressBar.style.width = Math.max(5, meterPercent) + "%";
    }

    highlightPlayingRow(playingSongId) {
        document.querySelectorAll(".songs-table tr[data-song-id]").forEach(tr => {
            const id = tr.getAttribute("data-song-id");
            tr.classList.toggle("playing", id === playingSongId);
        });
    }

    setTheme(themeName) {
        document.body.classList.remove("theme-dark", "theme-white", "theme-violet", "theme-jiosaavn", "theme-gaana");
        if (themeName === "white") {
            document.body.classList.add("theme-white");
        } else if (themeName === "violet") {
            document.body.classList.add("theme-violet");
        } else {
            document.body.classList.add("theme-dark");
        }
        this.currentTheme = themeName;
        if (this.dom.themeSelect) {
            this.dom.themeSelect.value = themeName;
        }
        document.querySelectorAll("[data-theme-choice]").forEach(card => {
            const t = card.getAttribute("data-theme-choice");
            card.classList.toggle("active", t === themeName);
        });
        if (window.musicDB) {
            window.musicDB.setSetting("theme", themeName);
        }
    }

    openModal(modal) {
        if (!modal) return;
        modal.classList.add("active");
    }

    closeModal(modal) {
        if (!modal) return;
        modal.classList.remove("active");
    }

    showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast ${type === 'danger' ? 'toast-danger' : ''}`;
        toast.innerHTML = `
            <span>${type === 'danger' ? '⚠️' : '✓'}</span>
            <span>${this.escapeHtml(message)}</span>
        `;
        this.dom.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100%)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    updateVolumeIcon(volume, isMuted) {
        if (isMuted || volume === 0) {
            this.dom.btnMute.textContent = "🔇";
        } else if (volume < 0.5) {
            this.dom.btnMute.textContent = "🔉";
        } else {
            this.dom.btnMute.textContent = "🔊";
        }
    }

    navigateHistory(direction) {
        // Simple back/forward support
        if (direction === -1 && this.currentView !== "home") {
            this.switchView("home");
        }
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    escapeHtml(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

window.ui = new UIController();
