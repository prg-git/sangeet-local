/**
 * SANGEET LOCAL - MOBILE STUDIO ADMIN ENGINE
 * Handles Cloud Firestore integration, real-time CRUD operations,
 * ID3 metadata extraction, image compression, and mobile audio preview.
 */

(function () {
    'use strict';

    // Default Firebase Configuration (pre-configured for project lafa-xaak)
    const DEFAULT_FIREBASE_CONFIG = {
        projectId: "lafa-xaak",
        storageBucket: "lafa-xaak.appspot.com",
        apiKey: "AIzaSyDummyKeyForPublicFirestoreRules"
    };

    class MobileAdminStudio {
        constructor() {
            this.db = null;
            this.storage = null;
            this.isCloudConnected = false;
            this.songs = [];
            this.banners = {};
            this.activeTab = "viewSongs";
            this.selectedCategory = "all";
            this.searchQuery = "";
            this.activeBannerKey = "all";

            // Upload states
            this.selectedAudioFile = null;
            this.selectedCoverDataUrl = null;
            this.editCoverDataUrl = null;

            // Audio Preview
            this.previewAudio = null;
            this.currentlyPlayingId = null;

            this.init();
        }

        async init() {
            this.cacheDom();
            this.initAudioPreview();
            this.bindEvents();
            this.initFirebase();
            this.loadInitialBanners();
        }

        cacheDom() {
            this.dom = {
                // Status & Header
                cloudStatusDot: document.getElementById("cloudStatusDot"),
                cloudStatusText: document.getElementById("cloudStatusText"),
                btnSyncRefresh: document.getElementById("btnSyncRefresh"),
                statTotalSongs: document.getElementById("statTotalSongs"),
                statCloudMode: document.getElementById("statCloudMode"),

                // Views & Tabs
                viewPanels: document.querySelectorAll(".admin-view-panel"),
                bottomNavItems: document.querySelectorAll(".admin-nav-item"),

                // Catalog View
                songSearchInput: document.getElementById("songSearchInput"),
                categoryChips: document.querySelectorAll("#categoryChipsBar .filter-chip"),
                songsListContainer: document.getElementById("songsListContainer"),

                // Add Song Form
                addSongForm: document.getElementById("addSongForm"),
                audioDropzone: document.getElementById("audioDropzone"),
                audioFileInput: document.getElementById("audioFileInput"),
                audioDropzoneText: document.getElementById("audioDropzoneText"),
                audioUrlInput: document.getElementById("audioUrlInput"),

                coverDropzone: document.getElementById("coverDropzone"),
                coverFileInput: document.getElementById("coverFileInput"),
                coverDropzoneText: document.getElementById("coverDropzoneText"),
                coverUrlInput: document.getElementById("coverUrlInput"),
                coverPreviewDeck: document.getElementById("coverPreviewDeck"),
                coverPreviewImg: document.getElementById("coverPreviewImg"),
                coverPreviewFilename: document.getElementById("coverPreviewFilename"),
                btnRemoveCoverPreview: document.getElementById("btnRemoveCoverPreview"),

                inputSongTitle: document.getElementById("inputSongTitle"),
                inputSongArtist: document.getElementById("inputSongArtist"),
                inputSongAlbum: document.getElementById("inputSongAlbum"),
                selectSongCategory: document.getElementById("selectSongCategory"),
                inputSongYear: document.getElementById("inputSongYear"),
                inputSongDuration: document.getElementById("inputSongDuration"),
                inputSongLyrics: document.getElementById("inputSongLyrics"),
                uploadProgressWrap: document.getElementById("uploadProgressWrap"),
                uploadProgressBar: document.getElementById("uploadProgressBar"),
                uploadProgressLabel: document.getElementById("uploadProgressLabel"),
                uploadProgressPercent: document.getElementById("uploadProgressPercent"),
                btnSubmitAddSong: document.getElementById("btnSubmitAddSong"),

                // Banners View
                bannerLangTabs: document.querySelectorAll("#bannerLangTabs .filter-chip"),
                bannerCardPreview: document.getElementById("bannerCardPreview"),
                prevBannerTag: document.getElementById("prevBannerTag"),
                prevBannerTitle: document.getElementById("prevBannerTitle"),
                prevBannerSubtitle: document.getElementById("prevBannerSubtitle"),
                bannerTagInput: document.getElementById("bannerTagInput"),
                bannerTitleInput: document.getElementById("bannerTitleInput"),
                bannerSubtitleInput: document.getElementById("bannerSubtitleInput"),
                bannerSongSelect: document.getElementById("bannerSongSelect"),
                bannerBgUrlInput: document.getElementById("bannerBgUrlInput"),
                btnSaveBanner: document.getElementById("btnSaveBanner"),

                // Cloud Settings
                cfgProjectId: document.getElementById("cfgProjectId"),
                cfgApiKey: document.getElementById("cfgApiKey"),
                cfgStorageBucket: document.getElementById("cfgStorageBucket"),
                btnSaveFirebaseConfig: document.getElementById("btnSaveFirebaseConfig"),
                btnMigrateLocalSongs: document.getElementById("btnMigrateLocalSongs"),

                // Preview Player
                adminMiniPreview: document.getElementById("adminMiniPreview"),
                previewCoverImg: document.getElementById("previewCoverImg"),
                previewTitle: document.getElementById("previewTitle"),
                previewArtist: document.getElementById("previewArtist"),
                btnPreviewToggle: document.getElementById("btnPreviewToggle"),
                btnPreviewClose: document.getElementById("btnPreviewClose"),

                // Edit Modal
                editSongModal: document.getElementById("editSongModal"),
                btnEditModalClose: document.getElementById("btnEditModalClose"),
                btnCancelEdit: document.getElementById("btnCancelEdit"),
                editSongForm: document.getElementById("editSongForm"),
                editSongId: document.getElementById("editSongId"),
                editSongTitle: document.getElementById("editSongTitle"),
                editSongArtist: document.getElementById("editSongArtist"),
                editSongAlbum: document.getElementById("editSongAlbum"),
                editSongCategory: document.getElementById("editSongCategory"),
                editSongCoverUrl: document.getElementById("editSongCoverUrl"),
                editCoverFileInput: document.getElementById("editCoverFileInput"),
                btnEditChooseCover: document.getElementById("btnEditChooseCover"),
                editSongAudioUrl: document.getElementById("editSongAudioUrl"),

                // Toast
                adminToast: document.getElementById("adminToast")
            };
        }

        // =========================================================================
        // FIREBASE INITIALIZATION & REALTIME SYNC
        // =========================================================================
        initFirebase() {
            let config = DEFAULT_FIREBASE_CONFIG;
            try {
                const saved = localStorage.getItem("sangeet_firebase_config");
                if (saved) {
                    config = Object.assign({}, DEFAULT_FIREBASE_CONFIG, JSON.parse(saved));
                }
            } catch (e) {
                console.warn("Using default Firebase config", e);
            }

            if (this.dom.cfgProjectId) this.dom.cfgProjectId.value = config.projectId || "lafa-xaak";
            if (this.dom.cfgApiKey) this.dom.cfgApiKey.value = config.apiKey || "";
            if (this.dom.cfgStorageBucket) this.dom.cfgStorageBucket.value = config.storageBucket || "lafa-xaak.appspot.com";

            if (typeof firebase !== "undefined") {
                try {
                    if (!firebase.apps.length) {
                        firebase.initializeApp(config);
                    }
                    this.db = firebase.firestore();
                    try {
                        this.storage = firebase.storage();
                    } catch (stErr) {
                        console.log("Firebase storage optional:", stErr);
                    }

                    this.setCloudStatus(true, "Firestore Live (lafa-xaak)");
                    this.listenToCloudSongs();
                    this.listenToCloudBanners();
                    return;
                } catch (err) {
                    console.error("Firebase init failed, switching to local mode:", err);
                }
            }

            // Fallback to local server mode if Firebase CDN is unavailable or offline
            this.setCloudStatus(false, "Local Server Mode");
            this.fetchLocalSongs();
        }

        setCloudStatus(connected, message) {
            this.isCloudConnected = connected;
            if (this.dom.cloudStatusDot) {
                this.dom.cloudStatusDot.style.background = connected ? "var(--admin-success)" : "var(--admin-warning)";
                this.dom.cloudStatusDot.style.boxShadow = connected ? "0 0 8px var(--admin-success)" : "0 0 8px var(--admin-warning)";
            }
            if (this.dom.cloudStatusText) {
                this.dom.cloudStatusText.textContent = message;
            }
            if (this.dom.statCloudMode) {
                this.dom.statCloudMode.textContent = connected ? "Live Firestore" : "Local REST";
                this.dom.statCloudMode.style.color = connected ? "var(--admin-lime)" : "var(--admin-accent)";
            }
        }

        listenToCloudSongs() {
            if (!this.db) return;
            try {
                this.db.collection("songs").onSnapshot(
                    (snapshot) => {
                        const cloudSongs = [];
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            data.id = doc.id;
                            cloudSongs.push(data);
                        });

                        // Sort by dateAdded descending
                        cloudSongs.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));

                        this.songs = cloudSongs;
                        this.updateSongStats();
                        this.renderSongCards();
                        this.populateBannerSongSelect();
                    },
                    (error) => {
                        console.warn("Firestore snapshot listener error:", error);
                        this.setCloudStatus(false, "Offline / Local Mode");
                        this.fetchLocalSongs();
                    }
                );
            } catch (err) {
                console.error("Failed to attach Firestore listener:", err);
                this.fetchLocalSongs();
            }
        }

        async fetchLocalSongs() {
            try {
                const res = await fetch("/api/songs", { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.songs)) {
                        this.songs = data.songs;
                        this.updateSongStats();
                        this.renderSongCards();
                        this.populateBannerSongSelect();
                        return;
                    }
                }
            } catch (e) { }

            // Secondary fallback: local static JSON
            try {
                const staticRes = await fetch("data/library.json");
                if (staticRes.ok) {
                    const list = await staticRes.json();
                    if (Array.isArray(list)) {
                        this.songs = list;
                        this.updateSongStats();
                        this.renderSongCards();
                        this.populateBannerSongSelect();
                    }
                }
            } catch (err) {
                this.renderEmptySongs("No songs loaded. Check connection.");
            }
        }

        listenToCloudBanners() {
            if (!this.db) return;
            try {
                this.db.collection("banners").onSnapshot((snapshot) => {
                    snapshot.forEach((doc) => {
                        this.banners[doc.id] = doc.data();
                    });
                    this.populateBannerForm(this.activeBannerKey);
                });
            } catch (e) {
                console.warn("Banner listener error:", e);
            }
        }

        async loadInitialBanners() {
            try {
                const res = await fetch("data/banners.json");
                if (res.ok) {
                    const data = await res.json();
                    this.banners = Object.assign({}, data, this.banners);
                    this.populateBannerForm(this.activeBannerKey);
                }
            } catch (e) { }
        }

        updateSongStats() {
            if (this.dom.statTotalSongs) {
                this.dom.statTotalSongs.textContent = this.songs.length;
            }
        }

        // =========================================================================
        // CATALOG VIEW RENDERING & FILTERS
        // =========================================================================
        renderSongCards() {
            const container = this.dom.songsListContainer;
            if (!container) return;

            let filtered = this.songs;

            // 1. Filter by category
            if (this.selectedCategory !== "all") {
                filtered = filtered.filter(s => {
                    const g = (s.genre || "").toLowerCase();
                    const target = this.selectedCategory.toLowerCase();
                    if (target === "for you") return true;
                    return g.includes(target) || (s.language && s.language.toLowerCase().includes(target));
                });
            }

            // 2. Filter by search query
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                filtered = filtered.filter(s =>
                    (s.title || "").toLowerCase().includes(q) ||
                    (s.artist || "").toLowerCase().includes(q) ||
                    (s.album || "").toLowerCase().includes(q) ||
                    (s.genre || "").toLowerCase().includes(q)
                );
            }

            if (filtered.length === 0) {
                this.renderEmptySongs(this.searchQuery ? "No matching songs found." : "No songs in this category.");
                return;
            }

            container.innerHTML = "";
            filtered.forEach(song => {
                const card = this.createSongCardElement(song);
                container.appendChild(card);
            });
        }

        createSongCardElement(song) {
            const card = document.createElement("div");
            card.className = "admin-song-card";
            card.dataset.songId = song.id;

            const coverSrc = song.coverUrl || "icons/icon-192.png";
            const durationStr = this.formatDuration(song.duration);
            const isPlayingThis = this.currentlyPlayingId === song.id;

            card.innerHTML = `
                <div class="song-card-thumb-wrap">
                    <img class="song-card-thumb" src="${coverSrc}" alt="${this.escapeHtml(song.title)}" onerror="this.src='icons/icon-192.png'">
                    <button class="btn-thumb-play" title="Preview Audio">
                        ${isPlayingThis ? '⏸' : '▶'}
                    </button>
                </div>
                <div class="song-card-meta">
                    <div class="song-card-title">${this.escapeHtml(song.title || "Untitled")}</div>
                    <div class="song-card-artist">${this.escapeHtml(song.artist || "Unknown Artist")}</div>
                    <div class="song-card-badges">
                        <span class="genre-tag">${this.escapeHtml(song.genre || "Music")}</span>
                        <span class="duration-tag">⏱ ${durationStr}</span>
                    </div>
                </div>
                <div class="song-card-actions">
                    <button class="btn-card-action btn-card-edit" title="Edit Song">✏️</button>
                    <button class="btn-card-action btn-card-delete" title="Delete Song">🗑️</button>
                </div>
            `;

            // Bind card events
            const btnPlay = card.querySelector(".btn-thumb-play");
            btnPlay.addEventListener("click", () => this.togglePreviewSong(song));

            const btnEdit = card.querySelector(".btn-card-edit");
            btnEdit.addEventListener("click", () => this.openEditModal(song));

            const btnDelete = card.querySelector(".btn-card-delete");
            btnDelete.addEventListener("click", () => this.promptDeleteSong(song));

            return card;
        }

        renderEmptySongs(message) {
            const container = this.dom.songsListContainer;
            if (!container) return;
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 14px; color: var(--admin-text-muted); background: var(--admin-surface); border-radius: var(--admin-radius-lg); border: 1px dashed rgba(255,255,255,0.08);">
                    <div style="font-size: 32px; margin-bottom: 8px;">🎶</div>
                    <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${message}</div>
                    <p style="font-size: 12px; margin-bottom: 14px;">Tap 'Add Song' below to upload music and artwork to Firebase.</p>
                    <button class="btn-secondary-action" style="max-width: 180px; margin: 0 auto; padding: 8px 14px; font-size: 12px;" id="btnGoToAddSong">➕ Add Song Now</button>
                </div>
            `;
            const btn = container.querySelector("#btnGoToAddSong");
            if (btn) btn.addEventListener("click", () => this.switchTab("viewAddSong"));
        }

        // =========================================================================
        // ADD SONG: ID3 AUTO-PARSING & FILE UPLOADS
        // =========================================================================
        async handleAudioFileSelect(file) {
            if (!file) return;
            this.selectedAudioFile = file;

            if (this.dom.audioDropzoneText) {
                this.dom.audioDropzoneText.textContent = `🎵 ${file.name}`;
            }

            this.showToast("Analyzing ID3 Tags & Audio...");

            // Use ID3Parser if available
            if (typeof ID3Parser !== "undefined") {
                try {
                    const tags = await ID3Parser.parse(file);
                    if (tags) {
                        if (tags.title && (!this.dom.inputSongTitle.value || this.dom.inputSongTitle.value.trim() === "")) {
                            this.dom.inputSongTitle.value = tags.title;
                        }
                        if (tags.artist && (!this.dom.inputSongArtist.value || this.dom.inputSongArtist.value.trim() === "")) {
                            this.dom.inputSongArtist.value = tags.artist;
                        }
                        if (tags.album && (!this.dom.inputSongAlbum.value || this.dom.inputSongAlbum.value.trim() === "")) {
                            this.dom.inputSongAlbum.value = tags.album;
                        }
                        if (tags.year && (!this.dom.inputSongYear.value || this.dom.inputSongYear.value.trim() === "")) {
                            this.dom.inputSongYear.value = tags.year;
                        }
                        if (tags.genre) {
                            const g = tags.genre.toLowerCase();
                            if (g.includes("koch") || g.includes("rajbongshi")) {
                                this.dom.selectSongCategory.value = "Koch Rajbongshi";
                            } else if (g.includes("assam")) {
                                this.dom.selectSongCategory.value = "Assamese";
                            } else if (g.includes("bodo")) {
                                this.dom.selectSongCategory.value = "Bodo";
                            }
                        }

                        // Embedded APIC cover artwork
                        if (tags.coverUrl) {
                            this.setCoverPreview(tags.coverUrl, "Embedded Album Art");
                        }
                    }
                } catch (err) {
                    console.warn("ID3 read error:", err);
                }
            }

            // Estimate audio duration via Audio object
            try {
                const objectUrl = URL.createObjectURL(file);
                const tempAudio = new Audio();
                tempAudio.src = objectUrl;
                tempAudio.addEventListener("loadedmetadata", () => {
                    const dur = Math.round(tempAudio.duration);
                    if (dur && dur > 0) {
                        this.dom.inputSongDuration.value = dur;
                    }
                    URL.revokeObjectURL(objectUrl);
                });
            } catch (e) { }

            this.showToast("✓ Metadata extracted successfully");
        }

        async handleCoverFileSelect(file) {
            if (!file) return;
            try {
                this.showToast("Optimizing Cover Image...");
                // Downscale & compress image to max 500x500 WebP/JPEG to save mobile bandwidth
                const compressedBase64 = await this.compressImage(file, 500, 500, 0.85);
                this.setCoverPreview(compressedBase64, file.name);
                this.showToast("✓ Cover image ready");
            } catch (err) {
                console.error("Cover compression failed:", err);
                const reader = new FileReader();
                reader.onload = (e) => this.setCoverPreview(e.target.result, file.name);
                reader.readAsDataURL(file);
            }
        }

        setCoverPreview(dataUrl, label = "Artwork Ready") {
            this.selectedCoverDataUrl = dataUrl;
            if (this.dom.coverPreviewDeck && this.dom.coverPreviewImg) {
                this.dom.coverPreviewImg.src = dataUrl;
                if (this.dom.coverPreviewFilename) this.dom.coverPreviewFilename.textContent = label;
                this.dom.coverPreviewDeck.style.display = "flex";
            }
        }

        clearCoverPreview() {
            this.selectedCoverDataUrl = null;
            if (this.dom.coverPreviewDeck) this.dom.coverPreviewDeck.style.display = "none";
            if (this.dom.coverFileInput) this.dom.coverFileInput.value = "";
            if (this.dom.coverUrlInput) this.dom.coverUrlInput.value = "";
        }

        compressImage(file, maxWidth, maxHeight, quality = 0.85) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    const image = new Image();
                    image.onload = () => {
                        let width = image.width;
                        let height = image.height;

                        if (width > height) {
                            if (width > maxWidth) {
                                height = Math.round((height * maxWidth) / width);
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = Math.round((width * maxHeight) / height);
                                height = maxHeight;
                            }
                        }

                        const canvas = document.createElement("canvas");
                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(image, 0, 0, width, height);

                        // Try webp, fallback to jpeg
                        let dataUrl = canvas.toDataURL("image/webp", quality);
                        if (!dataUrl.startsWith("data:image/webp")) {
                            dataUrl = canvas.toDataURL("image/jpeg", quality);
                        }
                        resolve(dataUrl);
                    };
                    image.onerror = reject;
                    image.src = readerEvent.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        async submitNewSong() {
            const title = (this.dom.inputSongTitle.value || "").trim();
            if (!title) {
                this.showToast("⚠️ Song title is required!");
                this.dom.inputSongTitle.focus();
                return;
            }

            const artist = (this.dom.inputSongArtist.value || "Unknown Artist").trim();
            const album = (this.dom.inputSongAlbum.value || "Single").trim();
            const genre = this.dom.selectSongCategory.value || "For you";
            const year = (this.dom.inputSongYear.value || "2024").trim();
            const duration = parseInt(this.dom.inputSongDuration.value, 10) || 0;
            const lyrics = (this.dom.inputSongLyrics.value || "").trim();

            let audioUrl = (this.dom.audioUrlInput.value || "").trim();
            let coverUrl = (this.dom.coverUrlInput.value || "").trim();

            // Cover from preview
            if (this.selectedCoverDataUrl) {
                coverUrl = this.selectedCoverDataUrl;
            }

            // Must have audio source
            if (!this.selectedAudioFile && !audioUrl) {
                this.showToast("⚠️ Please select an audio file or enter an audio URL!");
                return;
            }

            this.setUploadProgress(15, "Preparing song data...");

            const songId = "song_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);

            // If audio file selected, try uploading to server or Firebase Storage
            if (this.selectedAudioFile) {
                this.setUploadProgress(35, "Uploading audio...");
                try {
                    // Try upload to local server API first if running with server.ps1
                    const uploadRes = await this.uploadAudioToServer(this.selectedAudioFile, {
                        title, artist, album, genre, year, duration, lyrics, coverUrl
                    });
                    if (uploadRes && uploadRes.audioUrl) {
                        audioUrl = uploadRes.audioUrl;
                    }
                } catch (e) {
                    console.log("Local server audio upload skipped/failed:", e);
                }

                // If audioUrl still not set, store relative path or data URL
                if (!audioUrl) {
                    audioUrl = "/music/" + encodeURIComponent(this.selectedAudioFile.name);
                }
            }

            this.setUploadProgress(70, "Saving document to Firestore...");

            const songDoc = {
                id: songId,
                title: title,
                artist: artist,
                album: album,
                genre: genre,
                language: genre,
                year: year,
                duration: duration,
                audioUrl: audioUrl,
                coverUrl: coverUrl || null,
                fileSize: this.selectedAudioFile ? this.selectedAudioFile.size : 0,
                format: this.selectedAudioFile ? this.selectedAudioFile.type : "audio/mp3",
                dateAdded: Date.now(),
                isLiked: false,
                playCount: 0,
                lyrics: lyrics
            };

            // Save to Firestore
            if (this.db) {
                try {
                    await this.db.collection("songs").doc(songId).set(songDoc);
                    this.setUploadProgress(100, "Done!");
                    this.showToast("🎉 Song saved to Cloud Firestore!");
                    this.resetAddSongForm();
                    this.switchTab("viewSongs");
                    return;
                } catch (err) {
                    console.error("Firestore document write failed:", err);
                    this.showToast("Firestore write error: " + err.message);
                }
            }

            // Fallback: save to local server
            try {
                const res = await fetch("/api/songs/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(songDoc)
                });
                if (res.ok) {
                    this.setUploadProgress(100, "Done!");
                    this.showToast("✓ Saved to local server library");
                    this.resetAddSongForm();
                    this.fetchLocalSongs();
                    this.switchTab("viewSongs");
                    return;
                }
            } catch (e) { }

            this.hideUploadProgress();
            this.showToast("⚠️ Could not reach Firestore or Server");
        }

        async uploadAudioToServer(file, meta) {
            const headers = {
                "X-File-Name": encodeURIComponent(file.name),
                "X-Title": encodeURIComponent(meta.title || "Untitled"),
                "X-Artist": encodeURIComponent(meta.artist || "Unknown"),
                "X-Album": encodeURIComponent(meta.album || "Single"),
                "X-Genre": encodeURIComponent(meta.genre || "For you"),
                "X-Year": encodeURIComponent(meta.year || ""),
                "X-Duration": String(meta.duration || 0),
                "X-Lyrics": encodeURIComponent(meta.lyrics || "")
            };
            if (meta.coverUrl && meta.coverUrl.startsWith("data:image")) {
                const parts = meta.coverUrl.split(",");
                if (parts[1]) headers["X-Cover-Base64"] = parts[1];
            }

            const res = await fetch("/api/upload", {
                method: "POST",
                headers: headers,
                body: file
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.song) return data.song;
            }
            return null;
        }

        setUploadProgress(percent, label) {
            if (this.dom.uploadProgressWrap) this.dom.uploadProgressWrap.style.display = "block";
            if (this.dom.uploadProgressBar) this.dom.uploadProgressBar.style.width = percent + "%";
            if (this.dom.uploadProgressPercent) this.dom.uploadProgressPercent.textContent = percent + "%";
            if (this.dom.uploadProgressLabel) this.dom.uploadProgressLabel.textContent = label;
        }

        hideUploadProgress() {
            if (this.dom.uploadProgressWrap) this.dom.uploadProgressWrap.style.display = "none";
            if (this.dom.uploadProgressBar) this.dom.uploadProgressBar.style.width = "0%";
        }

        resetAddSongForm() {
            if (this.dom.addSongForm) this.dom.addSongForm.reset();
            this.selectedAudioFile = null;
            this.clearCoverPreview();
            this.hideUploadProgress();
            if (this.dom.audioDropzoneText) this.dom.audioDropzoneText.textContent = "Tap to select Audio (.mp3, .m4a)";
        }

        // =========================================================================
        // DELETE SONG
        // =========================================================================
        async promptDeleteSong(song) {
            const confirmed = window.confirm(`Delete "${song.title}" from Firebase and player?`);
            if (!confirmed) return;

            this.showToast(`Deleting "${song.title}"...`);

            // 1. Delete from Firestore
            if (this.db) {
                try {
                    await this.db.collection("songs").doc(song.id).delete();
                    this.showToast("✓ Deleted from Cloud Firestore");
                    return;
                } catch (err) {
                    console.warn("Firestore delete failed:", err);
                }
            }

            // 2. Delete from server API
            try {
                const res = await fetch(`/api/songs?id=${encodeURIComponent(song.id)}`, { method: "DELETE" });
                if (res.ok) {
                    this.showToast("✓ Deleted from server library");
                    this.fetchLocalSongs();
                    return;
                }
            } catch (e) { }

            // 3. Fallback: filter local memory list
            this.songs = this.songs.filter(s => s.id !== song.id);
            this.updateSongStats();
            this.renderSongCards();
        }

        // =========================================================================
        // EDIT SONG MODAL
        // =========================================================================
        openEditModal(song) {
            this.editCoverDataUrl = null;
            if (this.dom.editSongId) this.dom.editSongId.value = song.id;
            if (this.dom.editSongTitle) this.dom.editSongTitle.value = song.title || "";
            if (this.dom.editSongArtist) this.dom.editSongArtist.value = song.artist || "";
            if (this.dom.editSongAlbum) this.dom.editSongAlbum.value = song.album || "";
            if (this.dom.editSongCategory) this.dom.editSongCategory.value = song.genre || "For you";
            if (this.dom.editSongCoverUrl) this.dom.editSongCoverUrl.value = song.coverUrl || "";
            if (this.dom.editSongAudioUrl) this.dom.editSongAudioUrl.value = song.audioUrl || "";

            if (this.dom.editSongModal) {
                this.dom.editSongModal.classList.add("active");
            }
        }

        closeEditModal() {
            if (this.dom.editSongModal) {
                this.dom.editSongModal.classList.remove("active");
            }
        }

        async saveEditSong() {
            const songId = this.dom.editSongId.value;
            if (!songId) return;

            const title = (this.dom.editSongTitle.value || "").trim();
            if (!title) {
                this.showToast("⚠️ Title cannot be empty");
                return;
            }

            const artist = (this.dom.editSongArtist.value || "").trim();
            const album = (this.dom.editSongAlbum.value || "").trim();
            const genre = this.dom.editSongCategory.value || "For you";
            let coverUrl = (this.dom.editSongCoverUrl.value || "").trim();
            const audioUrl = (this.dom.editSongAudioUrl.value || "").trim();

            if (this.editCoverDataUrl) {
                coverUrl = this.editCoverDataUrl;
            }

            const updateData = {
                title, artist, album, genre,
                language: genre,
                coverUrl: coverUrl || null,
                audioUrl: audioUrl,
                updatedAt: Date.now()
            };

            this.showToast("Saving changes...");

            // 1. Update in Firestore
            if (this.db) {
                try {
                    await this.db.collection("songs").doc(songId).update(updateData);
                    this.showToast("✓ Cloud song updated!");
                    this.closeEditModal();
                    return;
                } catch (err) {
                    console.warn("Firestore update error:", err);
                }
            }

            // 2. Update via server API
            try {
                const res = await fetch("/api/songs/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(Object.assign({ id: songId }, updateData))
                });
                if (res.ok) {
                    this.showToast("✓ Song updated on server");
                    this.closeEditModal();
                    this.fetchLocalSongs();
                    return;
                }
            } catch (e) { }

            this.showToast("⚠️ Failed to update song");
        }

        // =========================================================================
        // BANNERS VIEW
        // =========================================================================
        populateBannerForm(key) {
            this.activeBannerKey = key;
            const b = this.banners[key] || {
                tag: "MADE FOR YOUR MOOD",
                title: "Discover weekly",
                subtitle: "Fresh finds. On repeat all week.",
                songId: "",
                bgUrl: ""
            };

            if (this.dom.bannerTagInput) this.dom.bannerTagInput.value = b.tag || "";
            if (this.dom.bannerTitleInput) this.dom.bannerTitleInput.value = b.title || "";
            if (this.dom.bannerSubtitleInput) this.dom.bannerSubtitleInput.value = b.subtitle || "";
            if (this.dom.bannerSongSelect) this.dom.bannerSongSelect.value = b.songId || "";
            if (this.dom.bannerBgUrlInput) this.dom.bannerBgUrlInput.value = b.bgUrl || "";

            this.updateBannerLivePreview();
        }

        updateBannerLivePreview() {
            const tag = this.dom.bannerTagInput ? this.dom.bannerTagInput.value : "";
            const title = this.dom.bannerTitleInput ? this.dom.bannerTitleInput.value : "";
            const sub = this.dom.bannerSubtitleInput ? this.dom.bannerSubtitleInput.value : "";
            const bg = this.dom.bannerBgUrlInput ? this.dom.bannerBgUrlInput.value : "";

            if (this.dom.prevBannerTag) this.dom.prevBannerTag.textContent = tag || "MADE FOR YOUR MOOD";
            if (this.dom.prevBannerTitle) this.dom.prevBannerTitle.textContent = title || "Discover weekly";
            if (this.dom.prevBannerSubtitle) this.dom.prevBannerSubtitle.textContent = sub || "Fresh finds. On repeat all week.";

            if (this.dom.bannerCardPreview) {
                if (bg) {
                    this.dom.bannerCardPreview.style.backgroundImage = `linear-gradient(135deg, rgba(7,5,18,0.7), rgba(16,11,36,0.85)), url('${bg}')`;
                } else {
                    this.dom.bannerCardPreview.style.backgroundImage = `linear-gradient(135deg, #100b24 0%, #1c143d 100%)`;
                }
            }
        }

        populateBannerSongSelect() {
            const select = this.dom.bannerSongSelect;
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">-- No linked song --</option>';

            this.songs.forEach(song => {
                const opt = document.createElement("option");
                opt.value = song.id;
                opt.textContent = `${song.title} (${song.genre || 'Music'})`;
                select.appendChild(opt);
            });

            select.value = currentVal;
        }

        async saveBannerToCloud() {
            const key = this.activeBannerKey;
            const bannerData = {
                tag: (this.dom.bannerTagInput.value || "").trim(),
                title: (this.dom.bannerTitleInput.value || "").trim(),
                subtitle: (this.dom.bannerSubtitleInput.value || "").trim(),
                songId: this.dom.bannerSongSelect.value || "",
                bgUrl: (this.dom.bannerBgUrlInput.value || "").trim(),
                updatedAt: Date.now()
            };

            this.banners[key] = bannerData;
            this.showToast(`Saving ${key} banner...`);

            // 1. Save to Firestore
            if (this.db) {
                try {
                    await this.db.collection("banners").doc(key).set(bannerData);
                    this.showToast("✓ Banner updated in Firestore!");
                    return;
                } catch (err) {
                    console.warn("Firestore banner save failed:", err);
                }
            }

            // 2. Save via server API
            try {
                const res = await fetch("/api/banners", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lang: key, banner: bannerData })
                });
                if (res.ok) {
                    this.showToast("✓ Banner updated on server");
                    return;
                }
            } catch (e) { }

            this.showToast("⚠️ Could not reach Firestore or Server");
        }

        // =========================================================================
        // 1-CLICK MIGRATION: LOCAL SONGS TO FIRESTORE
        // =========================================================================
        async migrateLocalSongsToFirestore() {
            if (!this.db) {
                this.showToast("⚠️ Firestore is not connected");
                return;
            }

            this.showToast("Fetching local library songs...");
            let songsToMigrate = [];

            try {
                const res = await fetch("data/library.json");
                if (res.ok) {
                    songsToMigrate = await res.json();
                }
            } catch (e) { }

            if (!songsToMigrate || songsToMigrate.length === 0) {
                this.showToast("⚠️ No local songs found in data/library.json");
                return;
            }

            this.showToast(`Migrating ${songsToMigrate.length} songs to Firestore...`);

            try {
                const batch = this.db.batch();
                songsToMigrate.forEach(song => {
                    const docRef = this.db.collection("songs").doc(song.id);
                    batch.set(docRef, song, { merge: true });
                });

                await batch.commit();
                this.showToast(`🎉 Successfully migrated ${songsToMigrate.length} songs to Firestore!`);
            } catch (err) {
                console.error("Migration error:", err);
                this.showToast("Migration failed: " + err.message);
            }
        }

        // =========================================================================
        // AUDIO PREVIEW PLAYER
        // =========================================================================
        initAudioPreview() {
            this.previewAudio = document.getElementById("adminAudioPreview") || new Audio();
            this.previewAudio.addEventListener("play", () => this.updatePreviewUiState(true));
            this.previewAudio.addEventListener("pause", () => this.updatePreviewUiState(false));
            this.previewAudio.addEventListener("ended", () => {
                this.updatePreviewUiState(false);
                this.currentlyPlayingId = null;
                this.renderSongCards();
            });
        }

        togglePreviewSong(song) {
            if (this.currentlyPlayingId === song.id && !this.previewAudio.paused) {
                this.previewAudio.pause();
                return;
            }

            this.currentlyPlayingId = song.id;
            this.previewAudio.src = song.audioUrl;
            this.previewAudio.play().catch(e => {
                console.warn("Autoplay blocked or invalid audio URL:", e);
                this.showToast("⚠️ Unable to play audio URL");
            });

            // Update mini player bar
            if (this.dom.adminMiniPreview) {
                this.dom.adminMiniPreview.classList.add("active");
            }
            if (this.dom.previewCoverImg) {
                this.dom.previewCoverImg.src = song.coverUrl || "icons/icon-192.png";
            }
            if (this.dom.previewTitle) {
                this.dom.previewTitle.textContent = song.title || "Untitled";
            }
            if (this.dom.previewArtist) {
                this.dom.previewArtist.textContent = song.artist || "Unknown Artist";
            }

            this.renderSongCards();
        }

        updatePreviewUiState(isPlaying) {
            if (this.dom.btnPreviewToggle) {
                this.dom.btnPreviewToggle.textContent = isPlaying ? "⏸" : "▶";
            }
        }

        closePreviewPlayer() {
            if (this.previewAudio) {
                this.previewAudio.pause();
            }
            this.currentlyPlayingId = null;
            if (this.dom.adminMiniPreview) {
                this.dom.adminMiniPreview.classList.remove("active");
            }
            this.renderSongCards();
        }

        // =========================================================================
        // EVENT BINDINGS & NAVIGATION
        // =========================================================================
        bindEvents() {
            // Bottom navigation tabs
            this.dom.bottomNavItems.forEach(item => {
                item.addEventListener("click", () => {
                    const tab = item.dataset.tab;
                    if (tab) this.switchTab(tab);
                });
            });

            // Header Refresh
            if (this.dom.btnSyncRefresh) {
                this.dom.btnSyncRefresh.addEventListener("click", () => {
                    this.showToast("Syncing with Cloud...");
                    if (this.db) {
                        this.listenToCloudSongs();
                    } else {
                        this.fetchLocalSongs();
                    }
                });
            }

            // Search input
            if (this.dom.songSearchInput) {
                this.dom.songSearchInput.addEventListener("input", (e) => {
                    this.searchQuery = (e.target.value || "").trim();
                    this.renderSongCards();
                });
            }

            // Category filter chips
            this.dom.categoryChips.forEach(chip => {
                chip.addEventListener("click", () => {
                    this.dom.categoryChips.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                    this.selectedCategory = chip.dataset.genre || "all";
                    this.renderSongCards();
                });
            });

            // Add Song Dropzones
            if (this.dom.audioDropzone && this.dom.audioFileInput) {
                this.dom.audioDropzone.addEventListener("click", () => this.dom.audioFileInput.click());
                this.dom.audioFileInput.addEventListener("change", (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleAudioFileSelect(e.target.files[0]);
                    }
                });
            }

            if (this.dom.coverDropzone && this.dom.coverFileInput) {
                this.dom.coverDropzone.addEventListener("click", () => this.dom.coverFileInput.click());
                this.dom.coverFileInput.addEventListener("change", (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleCoverFileSelect(e.target.files[0]);
                    }
                });
            }

            if (this.dom.btnRemoveCoverPreview) {
                this.dom.btnRemoveCoverPreview.addEventListener("click", () => this.clearCoverPreview());
            }

            // Add Song Form Submit
            if (this.dom.addSongForm) {
                this.dom.addSongForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    this.submitNewSong();
                });
            }

            // Banners View Tabs
            this.dom.bannerLangTabs.forEach(chip => {
                chip.addEventListener("click", () => {
                    this.dom.bannerLangTabs.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                    this.populateBannerForm(chip.dataset.bannerKey || "all");
                });
            });

            // Live banner preview inputs
            ["bannerTagInput", "bannerTitleInput", "bannerSubtitleInput", "bannerBgUrlInput"].forEach(id => {
                const el = this.dom[id];
                if (el) el.addEventListener("input", () => this.updateBannerLivePreview());
            });

            if (this.dom.btnSaveBanner) {
                this.dom.btnSaveBanner.addEventListener("click", () => this.saveBannerToCloud());
            }

            // Migration button
            if (this.dom.btnMigrateLocalSongs) {
                this.dom.btnMigrateLocalSongs.addEventListener("click", () => this.migrateLocalSongsToFirestore());
            }

            // Save custom Firebase config
            if (this.dom.btnSaveFirebaseConfig) {
                this.dom.btnSaveFirebaseConfig.addEventListener("click", () => {
                    const cfg = {
                        projectId: this.dom.cfgProjectId.value.trim(),
                        apiKey: this.dom.cfgApiKey.value.trim(),
                        storageBucket: this.dom.cfgStorageBucket.value.trim()
                    };
                    localStorage.setItem("sangeet_firebase_config", JSON.stringify(cfg));
                    this.showToast("✓ Config saved! Reconnecting...");
                    setTimeout(() => location.reload(), 1000);
                });
            }

            // Edit Modal
            if (this.dom.btnEditModalClose) this.dom.btnEditModalClose.addEventListener("click", () => this.closeEditModal());
            if (this.dom.btnCancelEdit) this.dom.btnCancelEdit.addEventListener("click", () => this.closeEditModal());
            if (this.dom.editSongForm) {
                this.dom.editSongForm.addEventListener("submit", (e) => {
                    e.preventDefault();
                    this.saveEditSong();
                });
            }
            if (this.dom.btnEditChooseCover && this.dom.editCoverFileInput) {
                this.dom.btnEditChooseCover.addEventListener("click", () => this.dom.editCoverFileInput.click());
                this.dom.editCoverFileInput.addEventListener("change", async (e) => {
                    if (e.target.files && e.target.files[0]) {
                        try {
                            const b64 = await this.compressImage(e.target.files[0], 500, 500, 0.85);
                            this.editCoverDataUrl = b64;
                            this.dom.editSongCoverUrl.value = "Selected new photo from device";
                            this.showToast("✓ New artwork selected");
                        } catch (err) { }
                    }
                });
            }

            // Preview Player
            if (this.dom.btnPreviewToggle) {
                this.dom.btnPreviewToggle.addEventListener("click", () => {
                    if (!this.previewAudio) return;
                    if (this.previewAudio.paused) this.previewAudio.play();
                    else this.previewAudio.pause();
                });
            }
            if (this.dom.btnPreviewClose) {
                this.dom.btnPreviewClose.addEventListener("click", () => this.closePreviewPlayer());
            }
        }

        switchTab(tabId) {
            this.activeTab = tabId;

            // Toggle panels
            this.dom.viewPanels.forEach(panel => {
                if (panel.id === tabId) {
                    panel.classList.add("active");
                } else {
                    panel.classList.remove("active");
                }
            });

            // Toggle bottom nav icons
            this.dom.bottomNavItems.forEach(item => {
                if (item.dataset.tab === tabId) {
                    item.classList.add("active");
                } else {
                    item.classList.remove("active");
                }
            });

            // Scroll to top
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        // =========================================================================
        // UTILITIES
        // =========================================================================
        showToast(message) {
            const toast = this.dom.adminToast;
            if (!toast) return;
            toast.textContent = message;
            toast.classList.add("show");
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => {
                toast.classList.remove("show");
            }, 2500);
        }

        formatDuration(seconds) {
            if (!seconds || isNaN(seconds)) return "0:00";
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
        }

        escapeHtml(str) {
            if (!str) return "";
            return String(str)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }

    // Launch Studio when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            window.mobileAdminStudio = new MobileAdminStudio();
        });
    } else {
        window.mobileAdminStudio = new MobileAdminStudio();
    }
})();
