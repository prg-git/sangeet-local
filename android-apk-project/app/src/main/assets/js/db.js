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
        this._songsCache = null;
        this._playlistsCache = null;
        this._firestore = null;
        this._isFirestoreConnected = false;
    }

    async initFirestore() {
        if (this._firestore) return this._firestore;
        if (typeof firebase !== "undefined" && firebase.apps) {
            try {
                if (!firebase.apps.length) {
                    let config = {
                        projectId: "lafa-xaak",
                        storageBucket: "lafa-xaak.appspot.com",
                        apiKey: "AIzaSyDummyKeyForPublicFirestoreRules"
                    };
                    try {
                        const saved = localStorage.getItem("sangeet_firebase_config");
                        if (saved) config = Object.assign(config, JSON.parse(saved));
                    } catch (e) { }
                    firebase.initializeApp(config);
                }
                this._firestore = firebase.firestore();
                this._isFirestoreConnected = true;
                return this._firestore;
            } catch (err) {
                console.warn("Firestore init in db.js error:", err);
            }
        }
        return null;
    }

    async init() {
        // Fast test of server connection with 800ms timeout
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 800);
            const res = await fetch("/api/songs", { cache: "no-store", signal: controller.signal });
            clearTimeout(timer);
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

    // --- LIKED / FAVORITES STATE MANAGEMENT (PERSISTENT & REACTIVE) ---
    getLikedIds() {
        try {
            const raw = localStorage.getItem("sangeet_liked_song_ids_v2");
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) return new Set(arr);
            }
        } catch (e) { }
        return new Set();
    }

    saveLikedIds(set) {
        try {
            localStorage.setItem("sangeet_liked_song_ids_v2", JSON.stringify(Array.from(set)));
        } catch (e) { }
    }

    getSongIdentifier(song) {
        if (!song) return "";
        if (song.id) return String(song.id);
        if (song.audioUrl) return String(song.audioUrl);
        return `${song.title || ''}_${song.artist || ''}`.trim();
    }

    isSongLiked(song) {
        if (!song) return false;
        const likedSet = this.getLikedIds();
        if (song.id && likedSet.has(String(song.id))) return true;
        if (song.audioUrl && likedSet.has(String(song.audioUrl))) return true;
        const key = this.getSongIdentifier(song);
        return key ? likedSet.has(key) : false;
    }

    applyLikedState(songs) {
        if (!Array.isArray(songs)) return songs;
        const likedSet = this.getLikedIds();
        songs.forEach(song => {
            const idKey = song.id ? String(song.id) : null;
            const urlKey = song.audioUrl ? String(song.audioUrl) : null;
            const sigKey = this.getSongIdentifier(song);
            song.isLiked = (idKey && likedSet.has(idKey)) ||
                (urlKey && likedSet.has(urlKey)) ||
                (sigKey && likedSet.has(sigKey));
        });
        return songs;
    }

    // --- SONG OPERATIONS ---

    async getAllSongs(force = false) {
        if (!force && this._songsCache && this._songsCache.length > 0) {
            return this.applyLikedState(this._songsCache);
        }

        await this.init();

        let songs = [];

        // 1. Try Firebase Cloud Firestore first (Real-time Cloud Sync across all phones & devices)
        try {
            const fs = await this.initFirestore();
            if (fs) {
                const fsPromise = fs.collection("songs").get();
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 1200));
                const snap = await Promise.race([fsPromise, timeoutPromise]);
                if (snap && !snap.empty) {
                    const cloudSongs = [];
                    snap.forEach(doc => {
                        const data = doc.data();
                        data.id = doc.id;
                        cloudSongs.push(data);
                    });
                    cloudSongs.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
                    this._songsCache = cloudSongs;
                    this.cacheSongsToIndexedDB(cloudSongs);
                    return this.applyLikedState(cloudSongs);
                }
            }
        } catch (fErr) {
            // Graceful fallback to server / local cache
        }

        if (this.isServerConnected) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 1200);
                const res = await fetch("/api/songs?_t=" + Date.now(), { cache: "no-store", signal: controller.signal });
                clearTimeout(timer);
                if (res.ok) {
                    const data = await res.json();
                    songs = data.songs || [];
                    this._songsCache = songs;
                    this.cacheSongsToIndexedDB(songs);
                    return this.applyLikedState(songs);
                }
            } catch (e) {
                console.warn("Server fetch failed, falling back to local cache:", e);
            }
        }

        // Network-First for static hosting (GitHub Pages / remote web host):
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1200);
            const staticRes = await fetch("data/library.json?_t=" + Date.now(), { cache: "no-store", signal: controller.signal });
            clearTimeout(timer);
            if (staticRes.ok) {
                const bundledSongs = await staticRes.json();
                if (Array.isArray(bundledSongs) && bundledSongs.length > 0) {
                    this._songsCache = bundledSongs;
                    await this.cacheSongsToIndexedDB(bundledSongs);
                    return this.applyLikedState(bundledSongs);
                }
            }
        } catch (e) {
            console.warn("Static library.json fetch failed, falling back to local cache:", e);
        }

        // Fallback to IndexedDB (e.g. offline)
        const localSongs = await this.getLocalIndexedDBSongs();
        if (localSongs && localSongs.length > 0) {
            this._songsCache = localSongs;
            return this.applyLikedState(localSongs);
        }

        return [];
    }

    async getSong(id) {
        const songs = await this.getAllSongs();
        return songs.find(s => s.id === id) || null;
    }

    async addSong(songData, audioBlobOrFile, coverBlob = null) {
        this._songsCache = null;
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
        this._songsCache = null;
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

        const songs = await this.getAllSongs();
        const song = songs.find(s => String(s.id) === String(id) || String(s.audioUrl) === String(id));

        const likedSet = this.getLikedIds();
        const idKey = String(id);
        const urlKey = song && song.audioUrl ? String(song.audioUrl) : null;
        const sigKey = song ? this.getSongIdentifier(song) : null;

        const isCurrentlyLiked = likedSet.has(idKey) || (urlKey && likedSet.has(urlKey)) || (sigKey && likedSet.has(sigKey));
        const newLiked = !isCurrentlyLiked;

        if (newLiked) {
            likedSet.add(idKey);
            if (urlKey) likedSet.add(urlKey);
            if (sigKey) likedSet.add(sigKey);
        } else {
            likedSet.delete(idKey);
            if (urlKey) likedSet.delete(urlKey);
            if (sigKey) likedSet.delete(sigKey);
        }
        this.saveLikedIds(likedSet);

        if (song) {
            song.isLiked = newLiked;
            if (this.db) {
                try {
                    const tx = this.db.transaction(["songs"], "readwrite");
                    tx.objectStore("songs").put(song);
                } catch (e) { }
            }
        }

        if (this.isServerConnected) {
            try {
                await fetch(`/api/songs/like?id=${encodeURIComponent(id)}`, { method: "POST" });
            } catch (e) { }
        }

        return newLiked;
    }

    async updateSong(song, coverBlobOrBase64 = null, removeCover = false) {
        this._songsCache = null;
        await this.init();

        const payload = Object.assign({}, song);
        if (removeCover) {
            payload.removeCover = true;
            payload.coverUrl = null;
        } else if (coverBlobOrBase64) {
            if (typeof coverBlobOrBase64 === "string") {
                payload.coverBase64 = coverBlobOrBase64.replace(/^data:image\/[^;]+;base64,/, '');
            } else {
                const b64 = await this.blobToBase64(coverBlobOrBase64);
                payload.coverBase64 = b64 ? b64.replace(/^data:image\/[^;]+;base64,/, '') : null;
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

    async getAllPlaylists(force = false) {
        if (!force && this._playlistsCache && this._playlistsCache.length > 0) {
            return this._playlistsCache;
        }

        await this.init();

        if (this.isServerConnected) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 800);
                const res = await fetch("/api/playlists?_t=" + Date.now(), { cache: "no-store", signal: controller.signal });
                clearTimeout(timer);
                if (res.ok) {
                    const data = await res.json();
                    this._playlistsCache = data.playlists || [];
                    return this._playlistsCache;
                }
            } catch (e) { }
        }

        const localPlaylists = await new Promise((resolve) => {
            if (!this.db) return resolve([]);
            const tx = this.db.transaction(["playlists"], "readonly");
            const req = tx.objectStore("playlists").getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });

        if (localPlaylists && localPlaylists.length > 0) {
            this._playlistsCache = localPlaylists;
            return localPlaylists;
        }

        // Fallback to static data/playlists.json
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 800);
            const staticPl = await fetch("data/playlists.json", { signal: controller.signal });
            clearTimeout(timer);
            if (staticPl.ok) {
                const plData = await staticPl.json();
                this._playlistsCache = Array.isArray(plData) ? plData : [];
                return this._playlistsCache;
            }
        } catch (e) { }

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
            } catch (e) { }
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
            } catch (e) { }
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
            } catch (e) { }
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
            } catch (e) { }
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
        } catch (e) { }
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
        } catch (e) { }
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
