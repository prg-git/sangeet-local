/**
 * Sangeet Music Database & Cloud-Sync Engine
 * Synchronizes music library across PC and Mobile devices via the local server API,
 * with IndexedDB offline fallback.
 */

class MusicDB {
    constructor() {
        this.dbName = "SangeetPersonalMusicDB";
        this.dbVersion = 1;
        this.db = null;
        this.isServerConnected = true;
    }

    async init() {
        // Test server connection
        try {
            const res = await fetch("/api/songs", { cache: "no-store" });
            if (res.ok) {
                this.isServerConnected = true;
            }
        } catch (e) {
            this.isServerConnected = false;
        }

        // Initialize local IndexedDB as well
        if (!this.db) {
            await new Promise((resolve) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains("songs")) {
                        db.createObjectStore("songs", { keyPath: "id" });
                    }
                    if (!db.objectStoreNames.contains("playlists")) {
                        db.createObjectStore("playlists", { keyPath: "id" });
                    }
                    if (!db.objectStoreNames.contains("settings")) {
                        db.createObjectStore("settings", { keyPath: "key" });
                    }
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    resolve(this.db);
                };

                request.onerror = () => resolve(null);
            });
        }

        return this.db;
    }

    // --- SONG OPERATIONS ---

    async getAllSongs() {
        await this.init();

        if (this.isServerConnected) {
            try {
                const res = await fetch("/api/songs?_t=" + Date.now(), { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    const songs = data.songs || [];
                    // Cache to IndexedDB in background
                    this.cacheSongsToIndexedDB(songs);
                    return songs;
                }
            } catch (e) {
                console.warn("Server fetch failed, falling back to local cache:", e);
            }
        }

        // Fallback to IndexedDB
        const localSongs = await this.getLocalIndexedDBSongs();
        if (localSongs && localSongs.length > 0) {
            return localSongs;
        }

        // If IndexedDB is empty (e.g. GitHub Pages / static hosting), load pre-bundled library.json
        try {
            const staticRes = await fetch("data/library.json");
            if (staticRes.ok) {
                const bundledSongs = await staticRes.json();
                if (Array.isArray(bundledSongs) && bundledSongs.length > 0) {
                    await this.cacheSongsToIndexedDB(bundledSongs);
                    return bundledSongs;
                }
            }
        } catch (e) {
            console.warn("Static library.json fetch failed:", e);
        }

        return [];
    }

    async getSong(id) {
        const songs = await this.getAllSongs();
        return songs.find(s => s.id === id) || null;
    }

    async addSong(songData, audioBlobOrFile, coverBlob = null) {
        await this.init();

        // Convert coverBlob to Base64 if present
        let coverBase64 = null;
        if (coverBlob) {
            coverBase64 = await this.blobToBase64(coverBlob);
        }

        if (this.isServerConnected && audioBlobOrFile) {
            try {
                // Upload directly to server storage so Mobile & PC share it!
                const headers = {
                    "X-File-Name": encodeURIComponent(audioBlobOrFile.name || `${songData.title || 'track'}.mp3`),
                    "X-Title": encodeURIComponent(songData.title || "Untitled Track"),
                    "X-Artist": encodeURIComponent(songData.artist || "Unknown Artist"),
                    "X-Album": encodeURIComponent(songData.album || "Unknown Album"),
                    "X-Genre": encodeURIComponent(songData.genre || "Music"),
                    "X-Year": encodeURIComponent(songData.year || ""),
                    "X-Duration": String(songData.duration || 0),
                    "X-Lyrics": encodeURIComponent(songData.lyrics || "")
                };

                if (coverBase64) {
                    headers["X-Cover-Base64"] = coverBase64;
                }

                const res = await fetch("/api/upload", {
                    method: "POST",
                    headers: headers,
                    body: audioBlobOrFile
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.song) {
                        return data.song;
                    }
                }
            } catch (err) {
                console.warn("Server upload failed, falling back to local IndexedDB:", err);
            }
        }

        // Local IndexedDB fallback if server unreachable
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(["songs"], "readwrite");
            const store = tx.objectStore("songs");

            const id = songData.id || "song_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
            const record = {
                id,
                title: songData.title || "Untitled Track",
                artist: songData.artist || "Unknown Artist",
                album: songData.album || "Unknown Album",
                year: songData.year || "",
                genre: songData.genre || "Music",
                duration: songData.duration || 0,
                audioBlob: audioBlobOrFile instanceof Blob ? audioBlobOrFile : null,
                audioUrl: songData.audioUrl || null,
                coverBlob: coverBlob || null,
                coverUrl: songData.coverUrl || null,
                fileSize: audioBlobOrFile ? audioBlobOrFile.size : 0,
                format: audioBlobOrFile ? audioBlobOrFile.type : "audio/mp3",
                dateAdded: Date.now(),
                isLiked: !!songData.isLiked,
                playCount: 0,
                lyrics: songData.lyrics || ""
            };

            const req = store.put(record);
            req.onsuccess = () => resolve(record);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async deleteSong(id) {
        await this.init();

        if (this.isServerConnected) {
            try {
                await fetch(`/api/songs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
            } catch (e) {
                console.warn("Server delete error:", e);
            }
        }

        // Also remove from IndexedDB
        if (this.db) {
            const tx = this.db.transaction(["songs"], "readwrite");
            tx.objectStore("songs").delete(id);
        }

        return true;
    }

    async toggleLike(id) {
        await this.init();

        if (this.isServerConnected) {
            try {
                const res = await fetch(`/api/songs/like?id=${encodeURIComponent(id)}`, { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    return data.isLiked;
                }
            } catch (e) {}
        }

        const song = await this.getSong(id);
        if (!song) return null;
        song.isLiked = !song.isLiked;
        await this.updateSong(song);
        return song.isLiked;
    }

    async updateSong(song, coverBlobOrBase64 = null, removeCover = false) {
        await this.init();

        const payload = Object.assign({}, song);
        if (removeCover) {
            payload.removeCover = true;
            payload.coverUrl = null;
        } else if (coverBlobOrBase64) {
            if (typeof coverBlobOrBase64 === "string") {
                payload.coverBase64 = coverBlobOrBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            } else {
                const b64 = await this.blobToBase64(coverBlobOrBase64);
                payload.coverBase64 = b64 ? b64.replace(/^data:image\/[a-z]+;base64,/, '') : null;
            }
        }

        if (this.isServerConnected) {
            try {
                const res = await fetch("/api/songs/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.song) {
                        if (this.db) {
                            const tx = this.db.transaction(["songs"], "readwrite");
                            tx.objectStore("songs").put(data.song);
                        }
                        return data.song;
                    }
                }
            } catch (e) {
                console.warn("Server update song error:", e);
            }
        }

        if (this.db) {
            const tx = this.db.transaction(["songs"], "readwrite");
            tx.objectStore("songs").put(payload);
        }
        return payload;
    }

    async incrementPlayCount(id) {
        const song = await this.getSong(id);
        if (!song) return;
        song.playCount = (song.playCount || 0) + 1;
        song.lastPlayed = Date.now();
        await this.updateSong(song);
    }

    // --- PLAYLIST OPERATIONS ---

    async getAllPlaylists() {
        await this.init();

        if (this.isServerConnected) {
            try {
                const res = await fetch("/api/playlists?_t=" + Date.now(), { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    return data.playlists || [];
                }
            } catch (e) {}
        }

        const localPlaylists = await new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction(["playlists"], "readonly");
            const req = tx.objectStore("playlists").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });

        if (localPlaylists && localPlaylists.length > 0) {
            return localPlaylists;
        }

        // Fallback to static data/playlists.json
        try {
            const staticPl = await fetch("data/playlists.json");
            if (staticPl.ok) {
                const plData = await staticPl.json();
                return Array.isArray(plData) ? plData : [];
            }
        } catch (e) {}

        return [];
    }

    async createPlaylist(name, description = "") {
        await this.init();

        if (this.isServerConnected) {
            try {
                const res = await fetch("/api/playlists", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, description })
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.playlist;
                }
            } catch (e) {}
        }

        return new Promise((resolve) => {
            const pl = {
                id: "pl_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
                name: name.trim() || "New Playlist",
                description: description.trim(),
                songIds: [],
                createdDate: Date.now()
            };
            if (this.db) {
                const tx = this.db.transaction(["playlists"], "readwrite");
                tx.objectStore("playlists").add(pl);
            }
            resolve(pl);
        });
    }

    async deletePlaylist(id) {
        await this.init();

        if (this.isServerConnected) {
            try {
                await fetch(`/api/playlists?id=${encodeURIComponent(id)}`, { method: "DELETE" });
            } catch (e) {}
        }

        if (this.db) {
            const tx = this.db.transaction(["playlists"], "readwrite");
            tx.objectStore("playlists").delete(id);
        }
        return true;
    }

    async addSongToPlaylist(playlistId, songId) {
        await this.init();

        if (this.isServerConnected) {
            try {
                await fetch(`/api/playlists/add-song?playlistId=${encodeURIComponent(playlistId)}&songId=${encodeURIComponent(songId)}`, { method: "POST" });
                return true;
            } catch (e) {}
        }

        return new Promise((resolve) => {
            if (!this.db) return resolve(false);
            const tx = this.db.transaction(["playlists"], "readwrite");
            const store = tx.objectStore("playlists");
            const req = store.get(playlistId);
            req.onsuccess = () => {
                const pl = req.result;
                if (pl) {
                    if (!pl.songIds) pl.songIds = [];
                    if (!pl.songIds.includes(songId)) pl.songIds.push(songId);
                    store.put(pl);
                }
                resolve(true);
            };
            req.onerror = () => resolve(false);
        });
    }

    async removeSongFromPlaylist(playlistId, songId) {
        await this.init();

        if (this.isServerConnected) {
            try {
                await fetch(`/api/playlists/remove-song?playlistId=${encodeURIComponent(playlistId)}&songId=${encodeURIComponent(songId)}`, { method: "POST" });
                return true;
            } catch (e) {}
        }

        return new Promise((resolve) => {
            if (!this.db) return resolve(false);
            const tx = this.db.transaction(["playlists"], "readwrite");
            const store = tx.objectStore("playlists");
            const req = store.get(playlistId);
            req.onsuccess = () => {
                const pl = req.result;
                if (pl && pl.songIds) {
                    pl.songIds = pl.songIds.filter(id => id !== songId);
                    store.put(pl);
                }
                resolve(true);
            };
            req.onerror = () => resolve(false);
        });
    }

    // --- SETTINGS (LOCAL TO EACH DEVICE) ---

    async getSetting(key, defaultValue = null) {
        try {
            const val = localStorage.getItem("sangeet_setting_" + key);
            return val !== null ? JSON.parse(val) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    async setSetting(key, value) {
        try {
            localStorage.setItem("sangeet_setting_" + key, JSON.stringify(value));
        } catch (e) {}
        return value;
    }

    // --- HELPERS ---

    async blobToBase64(blob) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result.split(",")[1];
                resolve(base64data || null);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    }

    async cacheSongsToIndexedDB(songs) {
        if (!this.db) return;
        try {
            const tx = this.db.transaction(["songs"], "readwrite");
            const store = tx.objectStore("songs");
            songs.forEach(s => store.put(s));
        } catch (e) {}
    }

    getLocalIndexedDBSongs() {
        return new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction(["songs"], "readonly");
            const req = tx.objectStore("songs").getAll();
            req.onsuccess = () => {
                const songs = req.result || [];
                songs.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
                resolve(songs);
            };
            req.onerror = () => resolve([]);
        });
    }
}

window.musicDB = new MusicDB();
