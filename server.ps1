# Sangeet Universal Music Server with Shared Library, Auto-Folder Scanner & Mobile Sync
param(
    [int]$Port = 8080
)

$DocRoot = $PSScriptRoot
$MusicDir = Join-Path $DocRoot "music"
$CoversDir = Join-Path $MusicDir "covers"
$DataDir = Join-Path $DocRoot "data"
$LibraryFile = Join-Path $DataDir "library.json"
$PlaylistsFile = Join-Path $DataDir "playlists.json"
$BannersFile = Join-Path $DataDir "banners.json"

# Ensure directories and database files exist
if (-not (Test-Path $MusicDir)) { New-Item -ItemType Directory -Path $MusicDir -Force | Out-Null }
if (-not (Test-Path $CoversDir)) { New-Item -ItemType Directory -Path $CoversDir -Force | Out-Null }
if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }
if (-not (Test-Path $LibraryFile)) { Set-Content -Path $LibraryFile -Value "[]" -Encoding UTF8 }
if (-not (Test-Path $PlaylistsFile)) { Set-Content -Path $PlaylistsFile -Value "[]" -Encoding UTF8 }
if (-not (Test-Path $BannersFile)) { Set-Content -Path $BannersFile -Value "{}" -Encoding UTF8 }

# Detect Local Network IPv4 Address
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch 'Loopback|vEthernet' -and $_.IPAddress -notmatch '^169\.254\.'
} | Select-Object -First 1).IPAddress

if (-not $LocalIP) {
    $LocalIP = "192.168.31.41"
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
    ".flac" = "audio/flac"
    ".m4a"  = "audio/mp4"
    ".ogg"  = "audio/ogg"
    ".webm" = "audio/webm"
}

function Read-JsonFile($path) {
    try {
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        if (-not $content -or $content.Trim() -eq "") { return @() }
        $obj = ConvertFrom-Json $content
        if ($null -eq $obj) { return @() }
        return @($obj)
    } catch {
        return @()
    }
}

function Read-JsonObject($path) {
    try {
        if (-not (Test-Path $path)) { return $null }
        $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
        if (-not $content -or $content.Trim() -eq "") { return $null }
        return (ConvertFrom-Json $content)
    } catch {
        return $null
    }
}

function Save-JsonFile($path, $data) {
    try {
        $json = ConvertTo-Json -InputObject @($data) -Depth 10
        [System.IO.File]::WriteAllText($path, $json, [System.Text.Encoding]::UTF8)
    } catch {
        Write-Host "Failed to save JSON file $path : $_"
    }
}

# Auto-sync files in music/ directory with library.json
function Sync-MusicFolder {
    param($musicDir, $libraryFile)

    $existingSongs = @(Read-JsonFile $libraryFile)
    $files = Get-ChildItem -Path $musicDir -File | Where-Object { 
        $_.Extension -match '^\.(mp3|wav|flac|m4a|ogg|aac)$' 
    }

    $existingUrls = @{}
    foreach ($s in $existingSongs) {
        if ($s.audioUrl) { $existingUrls[$s.audioUrl] = $s }
    }

    $newList = [System.Collections.Generic.List[PSCustomObject]]::new()
    $presentUrls = @{}

    foreach ($file in $files) {
        $encodedName = [System.Uri]::EscapeDataString($file.Name)
        $audioUrl = "/music/$encodedName"
        $presentUrls[$audioUrl] = $true

        if ($existingUrls.ContainsKey($audioUrl)) {
            $newList.Add($existingUrls[$audioUrl])
        } else {
            # Extract clean title from filename
            $cleanTitle = [System.IO.Path]::GetFileNameWithoutExtension($file.Name).Replace("_", " ")
            $songId = "song_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + "_" + (Get-Random -Minimum 100 -Maximum 999)

            # Estimate duration based on size (~128kbps = 16000 bytes/sec)
            $estDur = [Math]::Max(30, [Math]::Round($file.Length / 16000))

            # Auto-detect regional genre
            $detectedGenre = "Assamese"
            $detectedArtist = "Assamese Artist"
            if ($cleanTitle -match '(?i)koch|rajbongshi|rajbanshi|kamtapur|kamatapur') {
                $detectedGenre = "Koch Rajbongshi"
                $detectedArtist = "Koch Rajbongshi Artist"
            } elseif ($cleanTitle -match '(?i)bodo|borok|mech|bathou') {
                $detectedGenre = "Bodo"
                $detectedArtist = "Bodo Artist"
            } elseif ($cleanTitle -match '(?i)assamese|asomiya|axomiya' -or $cleanTitle -match '[\u0980-\u09FF]') {
                $detectedGenre = "Assamese"
                $detectedArtist = "Assamese Artist"
            }

            $newSong = [PSCustomObject]@{
                id = $songId
                title = $cleanTitle
                artist = $detectedArtist
                album = "PC Uploads"
                genre = $detectedGenre
                year = "2024"
                duration = $estDur
                audioUrl = $audioUrl
                coverUrl = $null
                fileSize = $file.Length
                format = "audio/" + $file.Extension.TrimStart(".")
                dateAdded = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                isLiked = $false
                playCount = 0
                lyrics = ""
            }
            $newList.Add($newSong)
            Write-Host "Auto-indexed music file: $($file.Name)" -ForegroundColor Green
        }
    }

    # Keep any remote URL tracks that aren't local files
    foreach ($s in $existingSongs) {
        if ($s.audioUrl -and -not $s.audioUrl.StartsWith("/music/")) {
            $newList.Add($s)
        }
    }

    Save-JsonFile $libraryFile $newList
    return $newList
}

# Initial scan on startup
$null = Sync-MusicFolder -musicDir $MusicDir -libraryFile $LibraryFile

# Start TCP Listener on Any IP (0.0.0.0)
try {
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
    $Listener.Start()
} catch {
    $Port = 8081
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
    $Listener.Start()
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  🎵 Sangeet Music Server - PC & Mobile Live Sync" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  🖥️  Desktop Link: http://localhost:${Port}" -ForegroundColor Yellow
Write-Host "  📱 Mobile Link:  http://${LocalIP}:${Port}" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  PC music files in 'music\' folder are automatically synced" -ForegroundColor White
Write-Host "  and ready to stream instantly on your mobile phone!" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

while ($true) {
    try {
        $Client = $Listener.AcceptTcpClient()
        $Stream = $Client.GetStream()

        # Read Request Headers
        $HeaderBytes = New-Object System.Collections.Generic.List[byte]
        $Buffer = New-Object byte[] 1
        $CRLFCount = 0

        while ($true) {
            $read = $Stream.Read($Buffer, 0, 1)
            if ($read -le 0) { break }
            $b = $Buffer[0]
            $HeaderBytes.Add($b)

            if ($b -eq 13) { continue }
            elseif ($b -eq 10) {
                $CRLFCount++
                if ($HeaderBytes.Count -ge 4) {
                    $cnt = $HeaderBytes.Count
                    if ($HeaderBytes[$cnt-4] -eq 13 -and $HeaderBytes[$cnt-3] -eq 10 -and 
                        $HeaderBytes[$cnt-2] -eq 13 -and $HeaderBytes[$cnt-1] -eq 10) {
                        break
                    }
                }
            } else {
                $CRLFCount = 0
            }
        }

        if ($HeaderBytes.Count -eq 0) {
            $Client.Close()
            continue
        }

        $HeaderText = [System.Text.Encoding]::UTF8.GetString($HeaderBytes.ToArray())
        $HeaderLines = $HeaderText -split "\r?\n"
        $RequestLine = $HeaderLines[0]
        $Parts = $RequestLine -split " "
        $Method = $Parts[0]
        $Url = $Parts[1]

        # Parse Headers
        $Headers = @{}
        for ($i = 1; $i -lt $HeaderLines.Length; $i++) {
            $line = $HeaderLines[$i]
            if ($line -match '^([^:]+):\s*(.*)$') {
                $Headers[$Matches[1].ToLower()] = $Matches[2].Trim()
            }
        }

        $ContentLength = 0
        if ($Headers.ContainsKey("content-length")) {
            $ContentLength = [int64]$Headers["content-length"]
        }

        $SendJson = {
            param($statusCode, $data)
            $jsonStr = ConvertTo-Json -InputObject $data -Depth 10 -Compress
            $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)

            $sw = New-Object System.IO.StreamWriter($Stream, [System.Text.Encoding]::ASCII)
            $sw.WriteLine("HTTP/1.1 $statusCode")
            $sw.WriteLine("Content-Type: application/json; charset=utf-8")
            $sw.WriteLine("Content-Length: " + $jsonBytes.Length)
            $sw.WriteLine("Access-Control-Allow-Origin: *")
            $sw.WriteLine("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS")
            $sw.WriteLine("Access-Control-Allow-Headers: *")
            $sw.WriteLine("Connection: close")
            $sw.WriteLine()
            $sw.Flush()
            $Stream.Write($jsonBytes, 0, $jsonBytes.Length)
            $Stream.Flush()
        }

        $ReadBodyBytes = {
            if ($ContentLength -le 0) { return New-Object byte[] 0 }
            $body = New-Object byte[] $ContentLength
            $totalRead = 0
            while ($totalRead -lt $ContentLength) {
                $toRead = [Math]::Min(65536, [int]($ContentLength - $totalRead))
                $r = $Stream.Read($body, $totalRead, $toRead)
                if ($r -le 0) { break }
                $totalRead += $r
            }
            return $body
        }

        if ($Method -eq "OPTIONS") {
            $sw = New-Object System.IO.StreamWriter($Stream, [System.Text.Encoding]::ASCII)
            $sw.WriteLine("HTTP/1.1 200 OK")
            $sw.WriteLine("Access-Control-Allow-Origin: *")
            $sw.WriteLine("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS")
            $sw.WriteLine("Access-Control-Allow-Headers: *")
            $sw.WriteLine("Content-Length: 0")
            $sw.WriteLine("Connection: close")
            $sw.WriteLine()
            $sw.Flush()
            $Client.Close()
            continue
        }

        $ParsedUrl = $Url.Split("?")
        $Path = $ParsedUrl[0]
        $QueryString = if ($ParsedUrl.Length -gt 1) { $ParsedUrl[1] } else { "" }

        $QueryParams = @{}
        if ($QueryString) {
            foreach ($param in $QueryString.Split('&')) {
                $kv = $param.Split("=")
                if ($kv.Length -eq 2) {
                    $QueryParams[[System.Uri]::UnescapeDataString($kv[0])] = [System.Uri]::UnescapeDataString($kv[1])
                }
            }
        }

        # ==============================================================
        # API ROUTES
        # ==============================================================

        # 1. GET /api/songs (Auto-scans music/ folder so new PC songs show immediately)
        if ($Method -eq "GET" -and $Path -eq "/api/songs") {
            $songs = Sync-MusicFolder -musicDir $MusicDir -libraryFile $LibraryFile
            & $SendJson "200 OK" @{ songs = $songs }
            $Client.Close()
            continue
        }

        # 2. POST /api/upload
        if ($Method -eq "POST" -and $Path -eq "/api/upload") {
            $rawBody = & $ReadBodyBytes

            $rawFilename = if ($Headers.ContainsKey("x-file-name")) { [System.Uri]::UnescapeDataString($Headers["x-file-name"]) } else { "track.mp3" }
            $ext = [System.IO.Path]::GetExtension($rawFilename)
            if (-not $ext) { $ext = ".mp3" }

            $title = if ($Headers.ContainsKey("x-title")) { [System.Uri]::UnescapeDataString($Headers["x-title"]) } else { [System.IO.Path]::GetFileNameWithoutExtension($rawFilename) }
            $artist = if ($Headers.ContainsKey("x-artist")) { [System.Uri]::UnescapeDataString($Headers["x-artist"]) } else { "Unknown Artist" }
            $album = if ($Headers.ContainsKey("x-album")) { [System.Uri]::UnescapeDataString($Headers["x-album"]) } else { "PC Music" }
            $genre = if ($Headers.ContainsKey("x-genre")) { [System.Uri]::UnescapeDataString($Headers["x-genre"]) } else { "Music" }
            $year = if ($Headers.ContainsKey("x-year")) { [System.Uri]::UnescapeDataString($Headers["x-year"]) } else { "2024" }
            $duration = if ($Headers.ContainsKey("x-duration")) { [double]$Headers["x-duration"] } else { 0 }
            $lyrics = if ($Headers.ContainsKey("x-lyrics")) { [System.Uri]::UnescapeDataString($Headers["x-lyrics"]) } else { "" }
            $coverBase64 = if ($Headers.ContainsKey("x-cover-base64")) { $Headers["x-cover-base64"] } else { $null }

            $songId = "song_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + "_" + (Get-Random -Minimum 1000 -Maximum 9999)
            $savedFilename = $rawFilename.Replace('/', '_').Replace('\', '_')
            $audioFilePath = Join-Path $MusicDir $savedFilename

            [System.IO.File]::WriteAllBytes($audioFilePath, $rawBody)

            $coverUrl = $null
            if ($coverBase64) {
                try {
                    $coverBytes = [System.Convert]::FromBase64String($coverBase64)
                    $coverFilename = "${songId}_cover.png"
                    $coverFilePath = Join-Path $CoversDir $coverFilename
                    [System.IO.File]::WriteAllBytes($coverFilePath, $coverBytes)
                    $coverUrl = "/music/covers/$coverFilename"
                } catch {}
            }

            $encodedAudioUrl = "/music/" + [System.Uri]::EscapeDataString($savedFilename)
            $songRecord = [PSCustomObject]@{
                id = $songId
                title = $title
                artist = $artist
                album = $album
                genre = $genre
                year = $year
                duration = $duration
                audioUrl = $encodedAudioUrl
                coverUrl = $coverUrl
                fileSize = $rawBody.Length
                format = "audio/" + $ext.TrimStart(".")
                dateAdded = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                isLiked = $false
                playCount = 0
                lyrics = $lyrics
            }

            $existing = @(Read-JsonFile $LibraryFile)
            $newList = @($songRecord) + $existing
            Save-JsonFile $LibraryFile $newList

            $bodyLen = $rawBody.Length
            Write-Host ("Uploaded song: " + $title + " by " + $artist + " (" + $bodyLen + " bytes)") -ForegroundColor Cyan
            & $SendJson "200 OK" @{ success = $true; song = $songRecord }
            $Client.Close()
            continue
        }

        # 3. DELETE /api/songs
        if ($Method -eq "DELETE" -and $Path -eq "/api/songs") {
            $id = $QueryParams["id"]
            if ($id) {
                $songs = @(Read-JsonFile $LibraryFile)
                $toDelete = $songs | Where-Object { $_.id -eq $id }

                if ($toDelete) {
                    if ($toDelete.audioUrl) {
                        $decodedAudioUrl = [System.Uri]::UnescapeDataString($toDelete.audioUrl)
                        $audioRel = $decodedAudioUrl.TrimStart("/").Replace('/', '\')
                        $phyPath = Join-Path $DocRoot $audioRel
                        if (Test-Path $phyPath) { Remove-Item -Path $phyPath -Force -ErrorAction SilentlyContinue }
                    }
                    if ($toDelete.coverUrl) {
                        $decodedCovUrl = [System.Uri]::UnescapeDataString($toDelete.coverUrl)
                        $coverRel = $decodedCovUrl.TrimStart("/").Replace('/', '\')
                        $covPath = Join-Path $DocRoot $coverRel
                        if (Test-Path $covPath) { Remove-Item -Path $covPath -Force -ErrorAction SilentlyContinue }
                    }

                    $remaining = @($songs | Where-Object { $_.id -ne $id })
                    Save-JsonFile $LibraryFile $remaining

                    $pls = @(Read-JsonFile $PlaylistsFile)
                    foreach ($pl in $pls) {
                        if ($pl.songIds) {
                            $pl.songIds = @($pl.songIds | Where-Object { $_ -ne $id })
                        }
                    }
                    Save-JsonFile $PlaylistsFile $pls
                    Write-Host "Deleted song ID: $id" -ForegroundColor Yellow
                }
            }
            & $SendJson "200 OK" @{ success = $true }
            $Client.Close()
            continue
        }

        # 4. POST /api/songs/like
        if ($Method -eq "POST" -and $Path -eq "/api/songs/like") {
            $id = $QueryParams["id"]
            $isLiked = $false
            if ($id) {
                $songs = @(Read-JsonFile $LibraryFile)
                foreach ($s in $songs) {
                    if ($s.id -eq $id) {
                        $s.isLiked = -not [bool]$s.isLiked
                        $isLiked = $s.isLiked
                        break
                    }
                }
                Save-JsonFile $LibraryFile $songs
            }
            & $SendJson "200 OK" @{ success = $true; isLiked = $isLiked }
            $Client.Close()
            continue
        }

        # 5. POST /api/songs/update
        if ($Method -eq "POST" -and $Path -eq "/api/songs/update") {
            $rawBody = & $ReadBodyBytes
            $bodyStr = [System.Text.Encoding]::UTF8.GetString($rawBody)
            $updateData = ConvertFrom-Json $bodyStr

            $updatedSong = $null
            if ($updateData -and $updateData.id) {
                $songs = @(Read-JsonFile $LibraryFile)
                foreach ($s in $songs) {
                    if ($s.id -eq $updateData.id) {
                        if ($updateData.title) { $s.title = $updateData.title }
                        if ($updateData.artist) { $s.artist = $updateData.artist }
                        if ($updateData.album) { $s.album = $updateData.album }
                        if ($updateData.genre) { $s.genre = $updateData.genre }
                        if ($updateData.year) { $s.year = $updateData.year }
                        if ($updateData.lyrics -ne $null) { $s.lyrics = $updateData.lyrics }

                        # Cover image updates / removal
                        if ($updateData.removeCover -eq $true) {
                            if ($s.coverUrl -and $s.coverUrl.StartsWith("/music/covers/")) {
                                $oldCoverPath = Join-Path $DocRoot ($s.coverUrl.TrimStart("/").Replace('/', '\'))
                                if (Test-Path $oldCoverPath) { Remove-Item -Path $oldCoverPath -Force -ErrorAction SilentlyContinue }
                            }
                            $s.coverUrl = $null
                            Write-Host "Removed cover art for song: $($s.title)" -ForegroundColor Yellow
                        } elseif ($updateData.coverBase64) {
                            try {
                                $cleanB64 = $updateData.coverBase64 -replace '^data:image\/[a-z]+;base64,', ''
                                $coverBytes = [System.Convert]::FromBase64String($cleanB64)
                                $coverFilename = "$($s.id)_cover_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ".jpg"
                                $coverFilePath = Join-Path $CoversDir $coverFilename
                                [System.IO.File]::WriteAllBytes($coverFilePath, $coverBytes)
                                $s.coverUrl = "/music/covers/$coverFilename"
                                Write-Host "Updated cover art for song: $($s.title)" -ForegroundColor Green
                            } catch {
                                Write-Host "Failed to save cover art: $_" -ForegroundColor Red
                            }
                        } elseif ($updateData.coverUrl -ne $null) {
                            $s.coverUrl = $updateData.coverUrl
                        }

                        $updatedSong = $s
                        break
                    }
                }
                Save-JsonFile $LibraryFile $songs
            }
            & $SendJson "200 OK" @{ success = $true; song = $updatedSong }
            $Client.Close()
            continue
        }

        # 6. GET /api/playlists
        if ($Method -eq "GET" -and $Path -eq "/api/playlists") {
            $pls = Read-JsonFile $PlaylistsFile
            & $SendJson "200 OK" @{ playlists = $pls }
            $Client.Close()
            continue
        }

        # 7. GET /api/banners (Multi-language hero banners)
        if ($Method -eq "GET" -and $Path -eq "/api/banners") {
            $banners = Read-JsonObject $BannersFile
            if (-not $banners) {
                $banners = @{
                    all = @{ title = "Sangeet Local"; subtitle = "Regional Hits"; tag = "🎵 Sangeet Local"; coverUrl = ""; songId = "" }
                    koch_rajbongshi = @{ title = "Koch Rajbongshi Melodies"; subtitle = "Traditional Songs"; tag = "🎵 Koch Rajbongshi"; coverUrl = ""; songId = "" }
                    assamese = @{ title = "Assamese Superhits"; subtitle = "Classic & Modern Hits"; tag = "🎵 Assamese"; coverUrl = ""; songId = "" }
                    bodo = @{ title = "Bodo Regional Beats"; subtitle = "Regional Beats"; tag = "🎵 Bodo"; coverUrl = ""; songId = "" }
                }
            }
            & $SendJson "200 OK" @{ banners = $banners }
            $Client.Close()
            continue
        }

        # 8. POST /api/banners (Update language-specific banner from PC Master Admin)
        if ($Method -eq "POST" -and $Path -eq "/api/banners") {
            $rawBody = & $ReadBodyBytes
            $bodyStr = [System.Text.Encoding]::UTF8.GetString($rawBody)
            $payload = ConvertFrom-Json $bodyStr

            $lang = if ($payload.language) { $payload.language } else { "all" }
            $coverUrl = if ($payload.coverUrl) { $payload.coverUrl } else { "" }

            if ($payload.coverBase64) {
                try {
                    $cleanB64 = $payload.coverBase64 -replace '^data:image\/[a-z]+;base64,', ''
                    $coverBytes = [System.Convert]::FromBase64String($cleanB64)
                    $coverFilename = "banner_${lang}_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + ".jpg"
                    $coverFilePath = Join-Path $CoversDir $coverFilename
                    [System.IO.File]::WriteAllBytes($coverFilePath, $coverBytes)
                    $coverUrl = "/music/covers/$coverFilename"
                    Write-Host "Saved banner cover for ${lang}: $coverFilename" -ForegroundColor Green
                } catch {
                    Write-Host "Failed to save banner cover: $_" -ForegroundColor Red
                }
            }

            $currentBanners = Read-JsonObject $BannersFile
            if (-not $currentBanners) { $currentBanners = [PSCustomObject]@{} }

            $bannerObj = [PSCustomObject]@{
                title = if ($payload.title) { $payload.title } else { "Sangeet Local" }
                subtitle = if ($payload.subtitle) { $payload.subtitle } else { "" }
                tag = if ($payload.tag) { $payload.tag } else { "🎵 Sangeet Local" }
                coverUrl = $coverUrl
                songId = if ($payload.songId) { $payload.songId } else { "" }
                updatedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
            }

            $currentBanners | Add-Member -NotePropertyName $lang -NotePropertyValue $bannerObj -Force

            $jsonStr = ConvertTo-Json -InputObject $currentBanners -Depth 10
            [System.IO.File]::WriteAllText($BannersFile, $jsonStr, [System.Text.Encoding]::UTF8)

            Write-Host "Saved ${lang} banner: $($bannerObj.title)" -ForegroundColor Cyan
            & $SendJson "200 OK" @{ success = $true; banners = $currentBanners }
            $Client.Close()
            continue
        }

        # ==============================================================
        # STATIC FILE SERVING WITH UNICODE FILENAME DECODING & HTTP 206 RANGE STREAMING
        # ==============================================================

        if ($Path -eq "/" -or $Path -eq "") {
            $Path = "/index.html"
        }

        # CRITICAL FOR MOBILE: Decode URL percent-encoding (for Assamese/Bengali Unicode names)
        $DecodedPath = [System.Uri]::UnescapeDataString($Path)
        $RelPath = $DecodedPath.TrimStart("/").Replace('/', '\')
        $FilePath = Join-Path $DocRoot $RelPath

        if (Test-Path $FilePath -PathType Leaf) {
            $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
            $ContentType = $MimeTypes[$Ext]
            if (-not $ContentType) { $ContentType = "application/octet-stream" }

            $FileBytes = [System.IO.File]::ReadAllBytes($FilePath)
            $TotalLength = $FileBytes.Length

            $Writer = New-Object System.IO.StreamWriter($Stream, [System.Text.Encoding]::ASCII)
            $RangeHeader = if ($Headers.ContainsKey("range")) { $Headers["range"] } else { $null }

            # Range Request handling (Essential for mobile audio streaming on iOS Safari & Android Chrome)
            if ($RangeHeader -and $RangeHeader -match "bytes=(\d+)-(\d*)") {
                $Start = [int64]$Matches[1]
                $End = if ($Matches[2] -ne "") { [int64]$Matches[2] } else { $TotalLength - 1 }
                if ($End -ge $TotalLength) { $End = $TotalLength - 1 }
                $Length = $End - $Start + 1

                $Writer.WriteLine("HTTP/1.1 206 Partial Content")
                $Writer.WriteLine("Content-Type: $ContentType")
                $Writer.WriteLine("Content-Range: bytes ${Start}-${End}/${TotalLength}")
                $Writer.WriteLine("Content-Length: $Length")
                $Writer.WriteLine("Accept-Ranges: bytes")
                $Writer.WriteLine("Access-Control-Allow-Origin: *")
                $Writer.WriteLine("Connection: close")
                $Writer.WriteLine()
                $Writer.Flush()

                $Stream.Write($FileBytes, [int]$Start, [int]$Length)
            } else {
                $Writer.WriteLine("HTTP/1.1 200 OK")
                $Writer.WriteLine("Content-Type: $ContentType")
                $Writer.WriteLine("Content-Length: $TotalLength")
                $Writer.WriteLine("Accept-Ranges: bytes")
                $Writer.WriteLine("Access-Control-Allow-Origin: *")
                $Writer.WriteLine("Connection: close")
                $Writer.WriteLine()
                $Writer.Flush()

                if ($Method -ne "HEAD") {
                    $Stream.Write($FileBytes, 0, $TotalLength)
                }
            }
            $Stream.Flush()
        } else {
            $Writer = New-Object System.IO.StreamWriter($Stream, [System.Text.Encoding]::ASCII)
            $NotFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $Writer.WriteLine("HTTP/1.1 404 Not Found")
            $Writer.WriteLine("Content-Type: text/plain")
            $Writer.WriteLine("Content-Length: " + $NotFound.Length)
            $Writer.WriteLine("Connection: close")
            $Writer.WriteLine()
            $Writer.Flush()
            $Stream.Write($NotFound, 0, $NotFound.Length)
            $Stream.Flush()
        }

        $Client.Close()
    } catch {
        # Continue on client abort
    }
}
