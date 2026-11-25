# 🎵 SANGEET - Personal JioSaavn & Gaana Music Studio

A personal music streaming and library management application inspired by **JioSaavn** and **Gaana**. Designed for local offline music playback, custom playlist organization, and metadata management with zero external dependencies.

---

## 🌟 Key Features

### 🎧 1. JioSaavn & Gaana Inspired UI/UX
- **Three Sleek Themes**:
  - **JioSaavn Emerald**: Signature deep dark layout with emerald and teal glowing accents.
  - **Gaana Sunset**: Fiery crimson and warm amber tones.
  - **Midnight Violet**: Deep cyberpunk purple and neon pink aesthetics.
- **Hero Spotlight Banner**: Spotlight showcase for your top track and trending playlist.
- **Category Filter Chips**: Quick filtering by *All, Hindi & Bollywood, Punjabi Hits, Chill Lo-Fi, Classical Fusion, EDM / Party, Acoustic*.
- **Glassmorphic Persistent Player**: Bottom player with spinning vinyl artwork, waveform visualizer, and scrubbable progress bar.

### 📥 2. Add Music Seamlessly
- **Drag & Drop**: Drag MP3, WAV, FLAC, M4A, OGG, or AAC files directly anywhere on the screen!
- **Folder Upload**: Import entire folders of music at once with the "Select Folder" button.
- **Automatic ID3 Tag Extraction**:
  - Automatically reads **Title, Artist, Album, Genre, Year, Track Number**.
  - Extracts **Embedded Album Cover Art (APIC frame)** straight from the audio file!
  - If no cover image exists, automatically creates a stylized gradient album art cover.
- **Web Audio Stream Import**: Paste direct MP3 or stream URLs to stream remote audio.
- **Starter Showcase Tracks**: Comes with pre-loaded, relaxing Indian lo-fi and classical fusion instrumental tracks rendered via Web Audio API so your library is playable right away!

### 🗑 3. Remove & Manage Music
- **Remove Single Song**: Click the trash (`🗑`) button on any song row to immediately remove it from your personal library and free up browser storage.
- **Remove from Playlists**: Remove tracks from specific playlists without deleting the file from your overall library.
- **Batch Clear**: "Clear All" option in the Library tab for bulk resets.
- **Metadata Editor**: Click the three dots (`⋮`) to edit the song title, artist, album, genre, year, or attach custom lyrics.

### 🎛 4. Audio Engine & Sound FX
- **5-Band Equalizer**: Real-time frequency control (60Hz, 250Hz, 1kHz, 4kHz, 12kHz).
- **Sound Presets**:
  - *Flat / Standard*
  - *Bass Boost* (heavy low-end punch)
  - *Treble Boost* (bright and crisp)
  - *Indian Classical* (vocal warmth and mid-range richness)
  - *Electronic / EDM*
  - *Rock*
  - *Vocal Clarity*
- **Live Audio Visualizer**: Real-time animated audio spectrum analysis on the player bar and in fullscreen mode.
- **Playback Speeds**: 0.75x, 1.0x, 1.25x, 1.5x, 2.0x.
- **Queue Management**: Up Next drawer with live reordering, shuffle, repeat all, and repeat one.

### 📁 5. Custom Playlists & Liked Songs
- Create, rename, and delete custom playlists.
- 1-click Heart (`♥`) button to favorite songs and collect them in your dedicated "Liked Songs" section.

### 💾 6. 100% Offline & Local Storage (IndexedDB)
- All uploaded songs and audio blobs are stored locally in your browser's persistent IndexedDB (`SangeetPersonalMusicDB`).
- Works offline without needing an active internet connection or external cloud subscription.

---

## 🚀 How to Run the App

### Option A: 1-Click Desktop App (Recommended for Windows)
Double-click `start-music-app.bat`.
This will:
1. Start the ultra-lightweight background local server on `http://localhost:8080`.
2. Launch Microsoft Edge or Google Chrome in **Native App Window Mode** (`--app`), giving you a borderless desktop application experience just like Spotify Desktop or JioSaavn Desktop!

### Option B: PowerShell Command Line
Open PowerShell in this folder and run:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```
Then visit `http://localhost:8080` in your web browser.

### Option C: Direct Browser Opening
You can also directly open `index.html` in Microsoft Edge or Google Chrome!

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| **Space** | Play / Pause |
| **Arrow Right** | Seek Forward (+5s) |
| **Arrow Left** | Seek Backward (-5s) |
| **Arrow Up** | Volume Up (+5%) |
| **Arrow Down** | Volume Down (-5%) |
| **M** | Mute / Unmute |
| **N** | Next Song |
| **P** | Previous Song |
| **S** | Toggle Shuffle |
| **R** | Cycle Repeat (Off / All / One) |
| **L** | Like / Favorite Current Song |
| **F** | Toggle Fullscreen Now Playing & Lyrics |
| **Esc** | Close Active Modal or Fullscreen |

---

## 📁 Project Structure

```
Latetst/
├── index.html            # Main application interface
├── css/
│   └── style.css         # JioSaavn & Gaana theme stylesheets
├── js/
│   ├── db.js             # IndexedDB offline storage engine
│   ├── id3.js            # Client-side ID3v1/ID3v2 tag and cover art parser
│   ├── synth.js          # Procedural showcase audio generator
│   ├── audio.js          # Web Audio API engine & 5-band equalizer
│   ├── ui.js             # DOM controller, drag-and-drop, views & visualizer
│   └── app.js            # App coordinator & keyboard shortcuts
├── manifest.json         # PWA desktop manifest
├── sw.js                 # Service worker for offline caching
├── server.ps1            # Lightweight PowerShell web server
├── start-music-app.bat   # 1-click Windows desktop launcher
└── README.md             # Complete documentation
```
