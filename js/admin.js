/**
 * Sangeet PC Master Admin Controller
 * Manages 3-language hero banners, music uploads, cover artwork, and song editing/deletion.
 */

// Compress and downscale any image (phone camera photos up to 15MB) into a lightweight JPEG (~60-120KB)
// This guarantees instant uploads, avoids exceeding browser/server memory, and loads smoothly on mobile!
function compressImageFile(file, maxWidth = 600, maxHeight = 600, quality = 0.85) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        if (!file.type || !file.type.startsWith("image/")) {
            const r = new FileReader();
            r.onload = () => resolve(r.target.result);
            r.onerror = (err) => reject(err);
            r.readAsDataURL(file);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL("image/jpeg", quality);
                resolve(compressed);
            };
            img.onerror = () => {
                resolve(e.target.result);
            };
            img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

class AdminStudio {
    constructor() {
        this.currentLang = "all";
        this.bannersData = {};
        this.songsList = [];

        // Upload state
        this.selectedAudioFile = null;
        this.selectedCoverFile = null;
        this.selectedCoverBase64 = null;

        // Banner cover & background state
        this.bannerCustomImageFile = null;
        this.bannerCustomImageBase64 = null;
        this.bannerCoverRemoved = false;
        this.bannerCustomBgFile = null;
        this.bannerCustomBgBase64 = null;
        this.bannerBgRemoved = false;

        // Direct cover change state
        this.directCoverSongId = null;

        // Edit modal state
        this.editCoverFile = null;
        this.editCoverBase64 = null;
        this.editCoverRemoved = false;

        this.initDOM();
        this.initEvents();
        this.loadData();
    }

    initDOM() {
        this.dom = {
            totalSongsBadge: document.getElementById("totalSongsBadge"),
            serverStatusBadge: document.getElementById("serverStatusBadge"),
            btnPublishGithub: document.getElementById("btnPublishGithub"),
            btnPublishBannerNotice: document.getElementById("btnPublishBannerNotice"),

            // Banners Tab
            bannerPreviewBox: document.getElementById("bannerPreviewBox"),
            bannerPreviewImg: document.getElementById("bannerPreviewImg"),
            bannerPreviewTag: document.getElementById("bannerPreviewTag"),
            bannerPreviewTitle: document.getElementById("bannerPreviewTitle"),
            bannerPreviewSubtitle: document.getElementById("bannerPreviewSubtitle"),
            bannerSongSelect: document.getElementById("bannerSongSelect"),
            bannerTitleInput: document.getElementById("bannerTitleInput"),
            bannerTagInput: document.getElementById("bannerTagInput"),
            bannerSubtitleInput: document.getElementById("bannerSubtitleInput"),
            bannerBgStatusBadge: document.getElementById("bannerBgStatusBadge"),
            btnChooseBannerBg: document.getElementById("btnChooseBannerBg"),
            btnRemoveBannerBg: document.getElementById("btnRemoveBannerBg"),
            bannerBgFileInput: document.getElementById("bannerBgFileInput"),
            bannerBgUrlInput: document.getElementById("bannerBgUrlInput"),
            bannerCoverUrlInput: document.getElementById("bannerCoverUrlInput"),
            bannerCoverFileInput: document.getElementById("bannerCoverFileInput"),
            btnChooseBannerCover: document.getElementById("btnChooseBannerCover"),
            btnResetBannerCover: document.getElementById("btnResetBannerCover"),
            btnRemoveBannerCover: document.getElementById("btnRemoveBannerCover"),
            btnSaveBanner: document.getElementById("btnSaveBanner"),

            // Direct image chooser for library
            adminDirectCoverFileInput: document.getElementById("adminDirectCoverFileInput"),

            // Add Music Tab
            addMusicForm: document.getElementById("addMusicForm"),
            adminAudioFileInput: document.getElementById("adminAudioFileInput"),
            btnBrowseAudio: document.getElementById("btnBrowseAudio"),
            selectedAudioBadge: document.getElementById("selectedAudioBadge"),
            adminCoverFileInput: document.getElementById("adminCoverFileInput"),
            btnBrowseCover: document.getElementById("btnBrowseCover"),
            btnRemoveCover: document.getElementById("btnRemoveCover"),
            addCoverPreview: document.getElementById("addCoverPreview"),
            adminCoverUrlInput: document.getElementById("adminCoverUrlInput"),
            addSongTitle: document.getElementById("addSongTitle"),
            addSongArtist: document.getElementById("addSongArtist"),
            addSongAlbum: document.getElementById("addSongAlbum"),
            addSongYear: document.getElementById("addSongYear"),
            addSongGenre: document.getElementById("addSongGenre"),
            addSongLyrics: document.getElementById("addSongLyrics"),

            // Manage Tab
            searchSongsManage: document.getElementById("searchSongsManage"),
            songsManageContainer: document.getElementById("songsManageContainer"),

            // Edit Modal
            adminEditModal: document.getElementById("adminEditModal"),
            btnCloseEditModal: document.getElementById("btnCloseEditModal"),
            btnCancelEditModal: document.getElementById("btnCancelEditModal"),
            btnSaveEditModal: document.getElementById("btnSaveEditModal"),
            editModalSongId: document.getElementById("editModalSongId"),
            editModalCoverImg: document.getElementById("editModalCoverImg"),
            editModalCoverFileInput: document.getElementById("editModalCoverFileInput"),
            btnEditChooseCover: document.getElementById("btnEditChooseCover"),
            btnEditRemoveCover: document.getElementById("btnEditRemoveCover"),
            editModalCoverUrlInput: document.getElementById("editModalCoverUrlInput"),
            editModalTitle: document.getElementById("editModalTitle"),
            editModalArtist: document.getElementById("editModalArtist"),
            editModalAlbum: document.getElementById("editModalAlbum"),
            editModalYear: document.getElementById("editModalYear"),
            editModalGenre: document.getElementById("editModalGenre"),
            editModalLyrics: document.getElementById("editModalLyrics"),

            toastContainer: document.getElementById("toastContainer"),

            // Mobile Links Hub
            linkWifiInput: document.getElementById("linkWifiInput"),
            btnCopyWifiLink: document.getElementById("btnCopyWifiLink"),
            btnOpenWifiLink: document.getElementById("btnOpenWifiLink"),
            linkGithubInput: document.getElementById("linkGithubInput"),
            btnCopyGithubLink: document.getElementById("btnCopyGithubLink"),
            btnOpenGithubLink: document.getElementById("btnOpenGithubLink")
        };
    }

    initEvents() {
        // Main Tab Switching
        document.querySelectorAll(".admin-nav-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".admin-nav-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                const targetId = tab.getAttribute("data-tab");
                ["tabBanners", "tabAddMusic", "tabManageSongs", "tabPublish"].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.display = (id === targetId) ? "block" : "none";
                });
            });
        });

        // Language Subtab Switching
        document.querySelectorAll(".lang-subtab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".lang-subtab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.currentLang = btn.getAttribute("data-lang");
                this.populateBannerInputs(this.currentLang);
            });
        });

        // Banner live preview inputs
        [this.dom.bannerTitleInput, this.dom.bannerTagInput, this.dom.bannerSubtitleInput, this.dom.bannerCoverUrlInput, this.dom.bannerBgUrlInput].forEach(inp => {
            if (inp) inp.addEventListener("input", () => this.updateBannerPreview());
        });
        if (this.dom.bannerSongSelect) {
            this.dom.bannerSongSelect.addEventListener("change", () => this.updateBannerPreview());
        }

        // --- HERO BANNER BACKGROUND IMAGE EVENTS ---
        if (this.dom.btnChooseBannerBg) {
            this.dom.btnChooseBannerBg.addEventListener("click", () => this.dom.bannerBgFileInput.click());
        }
        if (this.dom.bannerBgFileInput) {
            this.dom.bannerBgFileInput.addEventListener("change", async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.bannerCustomBgFile = file;
                    this.bannerBgRemoved = false;
                    this.showToast("Compressing & preparing background wallpaper...");
                    try {
                        const b64 = await compressImageFile(file, 1280, 720, 0.82);
                        this.bannerCustomBgBase64 = b64;
                        if (this.dom.bannerBgUrlInput) this.dom.bannerBgUrlInput.value = "";
                        this.updateBannerPreview();
                        this.showToast("Background image ready! Click 'Save & Publish Banner' below.");
                    } catch (err) {
                        this.showToast("Error processing background image: " + err.message, "danger");
                    }
                }
            });
        }
        if (this.dom.btnRemoveBannerBg) {
            this.dom.btnRemoveBannerBg.addEventListener("click", () => {
                this.bannerCustomBgFile = null;
                this.bannerCustomBgBase64 = null;
                this.bannerBgRemoved = true;
                if (this.dom.bannerBgFileInput) this.dom.bannerBgFileInput.value = "";
                if (this.dom.bannerBgUrlInput) this.dom.bannerBgUrlInput.value = "";
                this.updateBannerPreview();
                this.showToast("Background image removed (using default gradient).");
            });
        }

        // --- HERO BANNER ARTWORK IMAGE EVENTS ---
        if (this.dom.btnChooseBannerCover) {
            this.dom.btnChooseBannerCover.addEventListener("click", () => this.dom.bannerCoverFileInput.click());
        }
        if (this.dom.bannerCoverFileInput) {
            this.dom.bannerCoverFileInput.addEventListener("change", async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.bannerCustomImageFile = file;
                    this.bannerCoverRemoved = false;
                    this.showToast("Compressing & preparing banner artwork...");
                    try {
                        const b64 = await compressImageFile(file, 600, 600, 0.85);
                        this.bannerCustomImageBase64 = b64;
                        if (this.dom.bannerCoverUrlInput) this.dom.bannerCoverUrlInput.value = "";
                        this.updateBannerPreview();
                        this.showToast("Banner artwork ready! Click 'Save & Publish Banner' below.");
                    } catch (err) {
                        this.showToast("Error processing banner artwork: " + err.message, "danger");
                    }
                }
            });
        }
        if (this.dom.btnResetBannerCover) {
            this.dom.btnResetBannerCover.addEventListener("click", () => {
                this.bannerCustomImageFile = null;
                this.bannerCustomImageBase64 = null;
                this.bannerCoverRemoved = false;
                if (this.dom.bannerCoverFileInput) this.dom.bannerCoverFileInput.value = "";
                if (this.dom.bannerCoverUrlInput) this.dom.bannerCoverUrlInput.value = "";
                this.updateBannerPreview();
                this.showToast("Banner cover reset to song artwork.");
            });
        }
        if (this.dom.btnRemoveBannerCover) {
            this.dom.btnRemoveBannerCover.addEventListener("click", () => {
                this.bannerCustomImageFile = null;
                this.bannerCustomImageBase64 = null;
                this.bannerCoverRemoved = true;
                if (this.dom.bannerCoverFileInput) this.dom.bannerCoverFileInput.value = "";
                if (this.dom.bannerCoverUrlInput) this.dom.bannerCoverUrlInput.value = "";
                this.updateBannerPreview();
                this.showToast("Banner artwork removed.");
            });
        }
        if (this.dom.btnSaveBanner) {
            this.dom.btnSaveBanner.addEventListener("click", () => this.saveCurrentBanner());
        }

        // --- DIRECT COVER IMAGE CHANGER FOR LIBRARY ROWS ---
        if (this.dom.adminDirectCoverFileInput) {
            this.dom.adminDirectCoverFileInput.addEventListener("change", async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file && this.directCoverSongId) {
                    const songId = this.directCoverSongId;
                    const song = this.songsList.find(s => s.id === songId);
                    const title = song ? song.title : "track";
                    this.showToast(`Compressing & uploading cover image for "${title}"...`);
                    try {
                        const b64 = await compressImageFile(file, 600, 600, 0.85);
                        if (!b64) throw new Error("Could not process image file");
                        const res = await fetch("/api/songs/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: songId, coverBase64: b64 })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.song && song) {
                                song.coverUrl = data.song.coverUrl;
                                song.updatedAt = data.song.updatedAt;
                            }
                            this.showToast(`✓ Cover image updated for "${title}"! Click 'Publish to Mobile' above to push to live app.`);
                            await this.loadData();
                        } else {
                            this.showToast("Failed to update cover on server.", "danger");
                        }
                    } catch (err) {
                        this.showToast("Error updating cover: " + err.message, "danger");
                    }
                }
            });
        }

        // Add Music Audio & Cover Pickers
        if (this.dom.btnBrowseAudio) {
            this.dom.btnBrowseAudio.addEventListener("click", () => this.dom.adminAudioFileInput.click());
        }
        if (this.dom.adminAudioFileInput) {
            this.dom.adminAudioFileInput.addEventListener("change", (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.selectedAudioFile = file;
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                    this.dom.selectedAudioBadge.textContent = `🎵 ${file.name} (${sizeMB} MB)`;
                    this.dom.selectedAudioBadge.style.color = "#10b981";

                    // Pre-fill title from filename
                    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
                    if (!this.dom.addSongTitle.value) this.dom.addSongTitle.value = cleanName;
                }
            });
        }

        if (this.dom.btnBrowseCover) {
            this.dom.btnBrowseCover.addEventListener("click", () => this.dom.adminCoverFileInput.click());
        }
        if (this.dom.adminCoverFileInput) {
            this.dom.adminCoverFileInput.addEventListener("change", async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.selectedCoverFile = file;
                    try {
                        const b64 = await compressImageFile(file, 600, 600, 0.85);
                        this.selectedCoverBase64 = b64;
                        this.dom.addCoverPreview.src = b64;
                        if (this.dom.adminCoverUrlInput) this.dom.adminCoverUrlInput.value = "";
                    } catch (err) {
                        this.showToast("Error processing cover: " + err.message, "danger");
                    }
                }
            });
        }
        if (this.dom.btnRemoveCover) {
            this.dom.btnRemoveCover.addEventListener("click", () => {
                this.selectedCoverFile = null;
                this.selectedCoverBase64 = null;
                if (this.dom.adminCoverFileInput) this.dom.adminCoverFileInput.value = "";
                if (this.dom.adminCoverUrlInput) this.dom.adminCoverUrlInput.value = "";
                this.dom.addCoverPreview.src = "icons/icon-192.png";
            });
        }

        // Add Category Pills
        document.querySelectorAll("#addCategoryPills .category-pill-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#addCategoryPills .category-pill-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const cat = btn.getAttribute("data-cat");
                if (this.dom.addSongGenre) this.dom.addSongGenre.value = cat;
            });
        });

        // Submit Add Music Form
        if (this.dom.addMusicForm) {
            this.dom.addMusicForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.uploadSong();
            });
        }

        // Manage Songs Search
        if (this.dom.searchSongsManage) {
            this.dom.searchSongsManage.addEventListener("input", (e) => {
                this.renderManageSongs(e.target.value);
            });
        }

        // Edit Modal Events
        if (this.dom.btnCloseEditModal) {
            this.dom.btnCloseEditModal.addEventListener("click", () => this.closeEditModal());
        }
        if (this.dom.btnCancelEditModal) {
            this.dom.btnCancelEditModal.addEventListener("click", () => this.closeEditModal());
        }
        if (this.dom.btnEditChooseCover) {
            this.dom.btnEditChooseCover.addEventListener("click", () => this.dom.editModalCoverFileInput.click());
        }
        if (this.dom.editModalCoverFileInput) {
            this.dom.editModalCoverFileInput.addEventListener("change", async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    this.editCoverFile = file;
                    this.editCoverRemoved = false;
                    try {
                        const b64 = await compressImageFile(file, 600, 600, 0.85);
                        this.editCoverBase64 = b64;
                        this.dom.editModalCoverImg.src = b64;
                        if (this.dom.editModalCoverUrlInput) this.dom.editModalCoverUrlInput.value = "";
                    } catch (err) {
                        this.showToast("Error processing cover: " + err.message, "danger");
                    }
                }
            });
        }
        if (this.dom.btnEditRemoveCover) {
            this.dom.btnEditRemoveCover.addEventListener("click", () => {
                this.editCoverFile = null;
                this.editCoverBase64 = null;
                this.editCoverRemoved = true;
                if (this.dom.editModalCoverFileInput) this.dom.editModalCoverFileInput.value = "";
                if (this.dom.editModalCoverUrlInput) this.dom.editModalCoverUrlInput.value = "";
                this.dom.editModalCoverImg.src = "icons/icon-192.png";
            });
        }

        // --- PUBLISH TO GITHUB PAGES HANDLER ---
        const handlePublish = async () => {
            if (this.isPublishing) return;
            this.isPublishing = true;
            const origText = this.dom.btnPublishGithub ? this.dom.btnPublishGithub.innerHTML : "";
            if (this.dom.btnPublishGithub) {
                this.dom.btnPublishGithub.disabled = true;
                this.dom.btnPublishGithub.innerHTML = `<span>⏳ Publishing to GitHub...</span>`;
            }
            if (this.dom.btnPublishBannerNotice) {
                this.dom.btnPublishBannerNotice.disabled = true;
                this.dom.btnPublishBannerNotice.textContent = "⏳ Publishing...";
            }
            this.showToast("⏳ Publishing all covers, banners & library to GitHub Pages...", "info");

            try {
                const res = await fetch("/api/publish", { method: "POST" });
                const data = await res.json();
                if (res.ok && data.success) {
                    this.showToast("🎉 " + data.message, "success");
                } else {
                    this.showToast("Publish failed: " + (data.message || "Unknown error"), "danger");
                }
            } catch (err) {
                this.showToast("Publish error: " + err.message + ". You can also run 'upload-to-github.bat' on your PC.", "danger");
            } finally {
                this.isPublishing = false;
                if (this.dom.btnPublishGithub) {
                    this.dom.btnPublishGithub.disabled = false;
                    this.dom.btnPublishGithub.innerHTML = origText;
                }
                if (this.dom.btnPublishBannerNotice) {
                    this.dom.btnPublishBannerNotice.disabled = false;
                    this.dom.btnPublishBannerNotice.textContent = "🚀 Publish Changes Now";
                }
            }
        };

        if (this.dom.btnPublishGithub) {
            this.dom.btnPublishGithub.addEventListener("click", handlePublish);
        }
        if (this.dom.btnPublishBannerNotice) {
            this.dom.btnPublishBannerNotice.addEventListener("click", handlePublish);
        }
        document.querySelectorAll("#editModalCategoryPills .category-pill-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll("#editModalCategoryPills .category-pill-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                if (this.dom.editModalGenre) this.dom.editModalGenre.value = btn.getAttribute("data-cat");
            });
        });
        if (this.dom.btnSaveEditModal) {
            this.dom.btnSaveEditModal.addEventListener("click", () => this.saveEditModal());
        }

        // --- MOBILE LINKS HUB COPY BUTTONS ---
        if (this.dom.btnCopyWifiLink) {
            this.dom.btnCopyWifiLink.addEventListener("click", () => {
                const val = this.dom.linkWifiInput ? this.dom.linkWifiInput.value : "";
                if (navigator.clipboard && val) {
                    navigator.clipboard.writeText(val).then(() => {
                        this.showToast("Copied mobile Wi-Fi link to clipboard!");
                    }).catch(() => {
                        this.dom.linkWifiInput.select();
                        document.execCommand("copy");
                        this.showToast("Copied mobile Wi-Fi link!");
                    });
                } else if (val) {
                    this.dom.linkWifiInput.select();
                    document.execCommand("copy");
                    this.showToast("Copied mobile Wi-Fi link!");
                }
            });
        }

        if (this.dom.btnCopyGithubLink) {
            this.dom.btnCopyGithubLink.addEventListener("click", () => {
                const val = this.dom.linkGithubInput ? this.dom.linkGithubInput.value : "";
                if (navigator.clipboard && val) {
                    navigator.clipboard.writeText(val).then(() => {
                        this.showToast("Copied public mobile app link to clipboard!");
                    }).catch(() => {
                        this.dom.linkGithubInput.select();
                        document.execCommand("copy");
                        this.showToast("Copied public mobile app link!");
                    });
                } else if (val) {
                    this.dom.linkGithubInput.select();
                    document.execCommand("copy");
                    this.showToast("Copied public mobile app link!");
                }
            });
        }
    }

    async loadData() {
        // Fetch server network info (local IP, Wi-Fi link, GitHub link)
        try {
            const infoRes = await fetch("/api/info?_t=" + Date.now());
            if (infoRes.ok) {
                const info = await infoRes.json();
                if (this.dom.linkWifiInput && info.mobileWifiUrl) {
                    this.dom.linkWifiInput.value = info.mobileWifiUrl;
                }
                if (this.dom.btnOpenWifiLink && info.mobileWifiUrl) {
                    this.dom.btnOpenWifiLink.href = info.mobileWifiUrl;
                }
                if (this.dom.linkGithubInput && info.mobileGithubUrl) {
                    this.dom.linkGithubInput.value = info.mobileGithubUrl;
                }
                if (this.dom.btnOpenGithubLink && info.mobileGithubUrl) {
                    this.dom.btnOpenGithubLink.href = info.mobileGithubUrl;
                }
            }
        } catch (e) {
            // Static or offline mode
        }
        try {
            // Load songs
            const songsRes = await fetch("/api/songs?_t=" + Date.now());
            if (songsRes.ok) {
                const data = await songsRes.json();
                this.songsList = data.songs || [];
            }
        } catch (e) {
            // Fallback to static file
            try {
                const sRes = await fetch("data/library.json?_t=" + Date.now());
                if (sRes.ok) this.songsList = await sRes.json();
            } catch (err) {
                console.warn("Could not load songs:", err);
            }
        }

        try {
            // Load banners
            const banRes = await fetch("/api/banners?_t=" + Date.now());
            if (banRes.ok) {
                const bdata = await banRes.json();
                this.bannersData = bdata.banners || {};
            }
        } catch (e) {
            try {
                const bRes = await fetch("data/banners.json?_t=" + Date.now());
                if (bRes.ok) this.bannersData = await bRes.json();
            } catch (err) {
                console.warn("Could not load banners:", err);
            }
        }

        if (this.dom.totalSongsBadge) {
            this.dom.totalSongsBadge.textContent = this.songsList.length;
        }

        this.populateSongDropdown();
        this.populateBannerInputs(this.currentLang);
        this.renderManageSongs();
    }

    populateSongDropdown() {
        if (!this.dom.bannerSongSelect) return;
        let html = '<option value="">-- Choose a song to feature --</option>';
        this.songsList.forEach(s => {
            const cat = s.genre ? ` [${s.genre}]` : "";
            html += `<option value="${s.id}">${this.escapeHtml(s.title)} - ${this.escapeHtml(s.artist)}${cat}</option>`;
        });
        this.dom.bannerSongSelect.innerHTML = html;
    }

    populateBannerInputs(langKey) {
        const banner = (this.bannersData && this.bannersData[langKey]) || {};

        if (this.dom.bannerSongSelect) {
            this.dom.bannerSongSelect.value = banner.songId || "";
        }
        if (this.dom.bannerTitleInput) {
            this.dom.bannerTitleInput.value = banner.title || "";
        }
        if (this.dom.bannerTagInput) {
            const defaultTags = {
                all: "🎵 Sangeet Local",
                koch_rajbongshi: "🎵 Koch Rajbongshi",
                assamese: "🎵 Assamese",
                bodo: "🎵 Bodo"
            };
            this.dom.bannerTagInput.value = banner.tag || defaultTags[langKey] || "🎵 Sangeet Local";
        }
        if (this.dom.bannerSubtitleInput) {
            this.dom.bannerSubtitleInput.value = banner.subtitle || "";
        }
        if (this.dom.bannerCoverUrlInput) {
            this.dom.bannerCoverUrlInput.value = (banner.coverUrl && !banner.coverUrl.startsWith("data:")) ? banner.coverUrl : "";
        }
        if (this.dom.bannerBgUrlInput) {
            this.dom.bannerBgUrlInput.value = (banner.bgUrl && !banner.bgUrl.startsWith("data:")) ? banner.bgUrl : "";
        }

        this.bannerCustomImageFile = null;
        this.bannerCustomImageBase64 = null;
        this.bannerCoverRemoved = false;
        if (this.dom.bannerCoverFileInput) this.dom.bannerCoverFileInput.value = "";

        this.bannerCustomBgFile = null;
        this.bannerCustomBgBase64 = null;
        this.bannerBgRemoved = false;
        if (this.dom.bannerBgFileInput) this.dom.bannerBgFileInput.value = "";

        this.updateBannerPreview();
    }

    updateBannerPreview() {
        const selectedId = this.dom.bannerSongSelect ? this.dom.bannerSongSelect.value : "";
        const song = this.songsList.find(s => s.id === selectedId);

        const customTitle = this.dom.bannerTitleInput ? this.dom.bannerTitleInput.value.trim() : "";
        const title = customTitle || (song ? song.title : "Choose a song or enter custom title");
        if (this.dom.bannerPreviewTitle) this.dom.bannerPreviewTitle.textContent = title;

        const customTag = this.dom.bannerTagInput ? this.dom.bannerTagInput.value.trim() : "";
        const tag = customTag || (song ? `🎵 ${song.genre || 'Spotlight'}` : "🎵 Sangeet Local");
        if (this.dom.bannerPreviewTag) this.dom.bannerPreviewTag.textContent = tag;

        const customSub = this.dom.bannerSubtitleInput ? this.dom.bannerSubtitleInput.value.trim() : "";
        const sub = customSub || (song ? `By ${song.artist} • ${song.album || 'Single'} • Streaming Live` : "Regional Music Spotlight");
        if (this.dom.bannerPreviewSubtitle) this.dom.bannerPreviewSubtitle.textContent = sub;

        // Foreground Artwork Image
        let coverSrc = "icons/icon-192.png";
        if (this.bannerCoverRemoved) {
            coverSrc = "icons/icon-192.png";
        } else if (this.bannerCustomImageBase64) {
            coverSrc = this.bannerCustomImageBase64;
        } else if (this.dom.bannerCoverUrlInput && this.dom.bannerCoverUrlInput.value.trim()) {
            coverSrc = this.dom.bannerCoverUrlInput.value.trim();
        } else if (song && song.coverUrl) {
            coverSrc = song.coverUrl.startsWith("/") ? song.coverUrl.substring(1) : song.coverUrl;
        }
        if (this.dom.bannerPreviewImg) {
            this.dom.bannerPreviewImg.src = coverSrc;
        }

        // Background Wallpaper Image
        let bgSrc = "";
        if (this.bannerBgRemoved) {
            bgSrc = "";
        } else if (this.bannerCustomBgBase64) {
            bgSrc = this.bannerCustomBgBase64;
        } else if (this.dom.bannerBgUrlInput && this.dom.bannerBgUrlInput.value.trim()) {
            bgSrc = this.dom.bannerBgUrlInput.value.trim();
        } else {
            const banner = (this.bannersData && this.bannersData[this.currentLang]) || {};
            if (banner.bgUrl) {
                bgSrc = banner.bgUrl.startsWith("/") ? banner.bgUrl.substring(1) : banner.bgUrl;
            }
        }

        if (this.dom.bannerPreviewBox) {
            if (bgSrc) {
                this.dom.bannerPreviewBox.style.background = `linear-gradient(135deg, rgba(11, 15, 23, 0.8) 0%, rgba(15, 23, 42, 0.88) 100%), url('${bgSrc}') center/cover no-repeat`;
                if (this.dom.bannerBgStatusBadge) {
                    this.dom.bannerBgStatusBadge.textContent = "Custom Background Active";
                    this.dom.bannerBgStatusBadge.style.color = "#38bdf8";
                    this.dom.bannerBgStatusBadge.style.background = "rgba(56, 189, 248, 0.2)";
                }
            } else {
                this.dom.bannerPreviewBox.style.background = `linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(236, 72, 153, 0.2))`;
                if (this.dom.bannerBgStatusBadge) {
                    this.dom.bannerBgStatusBadge.textContent = "Default Gradient";
                    this.dom.bannerBgStatusBadge.style.color = "#10b981";
                    this.dom.bannerBgStatusBadge.style.background = "rgba(16, 185, 129, 0.2)";
                }
            }
        }
    }

    async saveCurrentBanner() {
        const lang = this.currentLang;
        const selectedId = this.dom.bannerSongSelect ? this.dom.bannerSongSelect.value : "";
        const song = this.songsList.find(s => s.id === selectedId);

        const customTitle = this.dom.bannerTitleInput ? this.dom.bannerTitleInput.value.trim() : "";
        const customSub = this.dom.bannerSubtitleInput ? this.dom.bannerSubtitleInput.value.trim() : "";
        const customTag = this.dom.bannerTagInput ? this.dom.bannerTagInput.value.trim() : "";
        const coverUrlInput = this.dom.bannerCoverUrlInput ? this.dom.bannerCoverUrlInput.value.trim() : "";
        const bgUrlInput = this.dom.bannerBgUrlInput ? this.dom.bannerBgUrlInput.value.trim() : "";

        const title = customTitle || (song ? song.title : "Sangeet Local");
        const subtitle = customSub || (song ? `By ${song.artist} • ${song.album || 'Single'}` : "");
        const tag = customTag || "🎵 Sangeet Local";
        const coverUrl = coverUrlInput || (song && song.coverUrl ? song.coverUrl : "");

        const payload = {
            language: lang,
            title,
            subtitle,
            tag,
            songId: selectedId,
            coverUrl,
            coverBase64: this.bannerCustomImageBase64 || null,
            removeCover: this.bannerCoverRemoved,
            bgUrl: bgUrlInput || (this.bannerBgRemoved ? "" : null),
            bgBase64: this.bannerCustomBgBase64 || null,
            removeBg: this.bannerBgRemoved
        };

        try {
            const res = await fetch("/api/banners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                this.bannersData = data.banners || this.bannersData;
                this.showToast(`🌟 Saved banner for [${lang}] locally! Click 'Publish to Mobile' above to update live app.`);
            } else {
                this.showToast("Failed to save banner on server.", "danger");
            }
        } catch (err) {
            this.showToast(`Error saving banner: ${err.message}`, "danger");
        }
    }

    async uploadSong() {
        if (!this.selectedAudioFile) {
            this.showToast("Please choose an audio file first!", "danger");
            return;
        }

        const title = this.dom.addSongTitle.value.trim();
        const artist = this.dom.addSongArtist.value.trim();
        const album = this.dom.addSongAlbum.value.trim() || "Single";
        const year = this.dom.addSongYear.value.trim() || "2024";
        const genre = this.dom.addSongGenre.value.trim() || "Koch Rajbongshi";
        const lyrics = this.dom.addSongLyrics.value.trim();

        if (!title || !artist) {
            this.showToast("Title and Artist are required!", "danger");
            return;
        }

        const btn = document.getElementById("btnSubmitAddMusic");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span>⏳ Uploading "${this.escapeHtml(title)}"...</span>`;
        }

        const headers = {
            "x-filename": encodeURIComponent(this.selectedAudioFile.name),
            "x-file-name": encodeURIComponent(this.selectedAudioFile.name),
            "x-title": encodeURIComponent(title),
            "x-artist": encodeURIComponent(artist),
            "x-album": encodeURIComponent(album),
            "x-genre": encodeURIComponent(genre),
            "x-year": encodeURIComponent(year),
            "x-lyrics": encodeURIComponent(lyrics),
            "x-duration": "0"
        };

        // Only send cover in header if small (< 8KB) to avoid HTTP header overflow
        if (this.selectedCoverBase64 && this.selectedCoverBase64.length < 8192) {
            headers["x-cover-base64"] = this.selectedCoverBase64;
        }

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: headers,
                body: this.selectedAudioFile
            });

            if (res.ok) {
                const uploadData = await res.json();
                const uploadedSong = uploadData && uploadData.song;
                if (this.selectedCoverBase64 && uploadedSong && uploadedSong.id && !uploadedSong.coverUrl) {
                    try {
                        await fetch("/api/songs/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: uploadedSong.id, coverBase64: this.selectedCoverBase64 })
                        });
                    } catch (e) {}
                }

                // Automatically trigger live publish in background so mobile app updates immediately
                fetch("/api/publish", { method: "POST" }).catch(() => {});

                this.showToast(`🎉 "${title}" uploaded! Mobile app and APK library synchronized.`);
                // Reset form
                this.selectedAudioFile = null;
                this.selectedCoverFile = null;
                this.selectedCoverBase64 = null;
                this.dom.addMusicForm.reset();
                this.dom.selectedAudioBadge.textContent = "No file selected";
                this.dom.selectedAudioBadge.style.color = "var(--text-muted)";
                this.dom.addCoverPreview.src = "icons/icon-192.png";
                await this.loadData();
            } else {
                this.showToast("Upload failed on server.", "danger");
            }
        } catch (err) {
            this.showToast(`Upload error: ${err.message}`, "danger");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span>+ Upload Song to Library</span>`;
            }
        }
    }

    renderManageSongs(query = "") {
        const container = this.dom.songsManageContainer;
        if (!container) return;

        const q = (query || "").toLowerCase().trim();
        const filtered = q ? this.songsList.filter(s => {
            const t = (s.title || "").toLowerCase();
            const a = (s.artist || "").toLowerCase();
            const alb = (s.album || "").toLowerCase();
            const g = (s.genre || "").toLowerCase();
            return t.includes(q) || a.includes(q) || alb.includes(q) || g.includes(q);
        }) : this.songsList;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
                    <div>No songs found matching your search.</div>
                </div>
            `;
            return;
        }

        let html = "";
        filtered.forEach(song => {
            let coverSrc = "icons/icon-192.png";
            if (song.coverUrl) {
                coverSrc = song.coverUrl.startsWith("/") ? song.coverUrl.substring(1) : song.coverUrl;
                if (!coverSrc.startsWith("data:") && !coverSrc.startsWith("http")) {
                    const sep = coverSrc.includes("?") ? "&" : "?";
                    coverSrc = `${coverSrc}${sep}_t=${song.updatedAt || Date.now()}`;
                }
            }

            html += `
                <div class="song-manage-row">
                    <img src="${coverSrc}" alt="Art" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover;" onerror="this.onerror=null; this.src='icons/icon-192.png';">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${this.escapeHtml(song.title)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${this.escapeHtml(song.artist)} • ${this.escapeHtml(song.album || 'Single')}
                        </div>
                    </div>
                    <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: rgba(124, 58, 237, 0.2); color: #c084fc; font-weight: 600;">
                        ${this.escapeHtml(song.genre || 'Music')}
                    </span>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" class="btn-secondary" data-change-image-id="${song.id}" style="padding: 6px 12px; font-size: 12px;" title="Directly change album cover image from PC">
                            🖼️ Change Image
                        </button>
                        <button type="button" class="btn-secondary" data-edit-id="${song.id}" style="padding: 6px 12px; font-size: 12px;" title="Edit song metadata and cover">
                            ✏️ Edit Details
                        </button>
                        <button type="button" class="btn-secondary" data-delete-id="${song.id}" style="padding: 6px 12px; font-size: 12px; color: #ef4444; border-color: rgba(239, 68, 68, 0.4);" title="Delete track">
                            🗑 Delete
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Bind Change Image, Edit, and Delete clicks
        container.querySelectorAll("[data-change-image-id]").forEach(btn => {
            btn.addEventListener("click", () => {
                this.directCoverSongId = btn.getAttribute("data-change-image-id");
                if (this.dom.adminDirectCoverFileInput) {
                    this.dom.adminDirectCoverFileInput.value = "";
                    this.dom.adminDirectCoverFileInput.click();
                }
            });
        });

        container.querySelectorAll("[data-edit-id]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-edit-id");
                this.openEditModal(id);
            });
        });

        container.querySelectorAll("[data-delete-id]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-delete-id");
                this.deleteSong(id);
            });
        });
    }

    openEditModal(songId) {
        const song = this.songsList.find(s => s.id === songId);
        if (!song) return;

        this.editCoverFile = null;
        this.editCoverBase64 = null;
        this.editCoverRemoved = false;

        this.dom.editModalSongId.value = song.id;
        this.dom.editModalTitle.value = song.title || "";
        this.dom.editModalArtist.value = song.artist || "";
        this.dom.editModalAlbum.value = song.album || "";
        this.dom.editModalYear.value = song.year || "2024";
        this.dom.editModalGenre.value = song.genre || "Koch Rajbongshi";
        this.dom.editModalLyrics.value = song.lyrics || "";

        let coverSrc = "icons/icon-192.png";
        if (song.coverUrl) {
            coverSrc = song.coverUrl.startsWith("/") ? song.coverUrl.substring(1) : song.coverUrl;
            if (!coverSrc.startsWith("data:") && !coverSrc.startsWith("http")) {
                const sep = coverSrc.includes("?") ? "&" : "?";
                coverSrc = `${coverSrc}${sep}_t=${Date.now()}`;
            }
            this.dom.editModalCoverUrlInput.value = (song.coverUrl.startsWith("http")) ? song.coverUrl : "";
        } else {
            this.dom.editModalCoverUrlInput.value = "";
        }
        this.dom.editModalCoverImg.src = coverSrc;

        document.querySelectorAll("#editModalCategoryPills .category-pill-btn").forEach(p => {
            p.classList.toggle("active", p.getAttribute("data-cat") === song.genre);
        });

        this.dom.adminEditModal.classList.add("active");
    }

    closeEditModal() {
        this.dom.adminEditModal.classList.remove("active");
    }

    async saveEditModal() {
        const songId = this.dom.editModalSongId.value;
        const title = this.dom.editModalTitle.value.trim();
        const artist = this.dom.editModalArtist.value.trim();
        const album = this.dom.editModalAlbum.value.trim();
        const year = this.dom.editModalYear.value.trim();
        const genre = this.dom.editModalGenre.value.trim();
        const lyrics = this.dom.editModalLyrics.value.trim();
        const coverUrl = this.dom.editModalCoverUrlInput.value.trim();

        const payload = {
            id: songId,
            title,
            artist,
            album,
            year,
            genre,
            lyrics,
            removeCover: this.editCoverRemoved,
            coverBase64: this.editCoverBase64,
            coverUrl: coverUrl || null
        };

        try {
            const res = await fetch("/api/songs/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                this.showToast(`✓ Saved changes for "${title}"! Click 'Publish to Mobile' above to push to live app.`);
                this.closeEditModal();
                await this.loadData();
            } else {
                this.showToast("Failed to update song on server.", "danger");
            }
        } catch (err) {
            this.showToast("Server error: please ensure 'start-master-admin.bat' is running. (" + err.message + ")", "danger");
        }
    }

    async deleteSong(songId) {
        const song = this.songsList.find(s => s.id === songId);
        const name = song ? song.title : "this track";
        if (!confirm(`Are you sure you want to permanently delete "${name}" from your library and disk?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/songs?id=${encodeURIComponent(songId)}`, {
                method: "DELETE"
            });

            if (res.ok) {
                this.showToast(`Deleted "${name}".`);
                await this.loadData();
            } else {
                this.showToast("Failed to delete song on server.", "danger");
            }
        } catch (err) {
            this.showToast(`Error deleting song: ${err.message}`, "danger");
        }
    }

    showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast ${type === 'danger' ? 'toast-danger' : ''}`;
        toast.innerHTML = `
            <span>${type === 'danger' ? '⚠️' : '✓'}</span>
            <span>${this.escapeHtml(message)}</span>
        `;
        this.dom.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
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

document.addEventListener("DOMContentLoaded", () => {
    window.adminStudio = new AdminStudio();
});
