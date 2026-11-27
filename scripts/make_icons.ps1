Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\CMPNYPC\.gemini\antigravity\brain\4a75259c-d94b-44b7-a215-571ab407bbb8\sangeet_local_app_icon_1795776800563.jpg"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)
Write-Output "Source icon loaded: $($srcImage.Width) x $($srcImage.Height)"

function Generate-Icon {
    param (
        [string]$destPath,
        [int]$size,
        [bool]$isRound = $false
    )

    $parentDir = Split-Path -Parent $destPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)

    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($isRound) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $size, $size)
        $gfx.SetClip($path)
    }

    $destRect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $gfx.DrawImage($srcImage, $destRect, 0, 0, $srcImage.Width, $srcImage.Height, [System.Drawing.GraphicsUnit]::Pixel)

    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $gfx.Dispose()
    $bmp.Dispose()
    Write-Output "Created: $destPath ($size x $size)"
}

# Android mipmap launcher icons (Square & Round)
$resBase = "C:\Project\Latetst\android-apk-project\app\src\main\res"

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $sizes.Keys) {
    $dim = $sizes[$folder]
    $squarePath = Join-Path $resBase "$folder\ic_launcher.png"
    $roundPath = Join-Path $resBase "$folder\ic_launcher_round.png"

    Generate-Icon -destPath $squarePath -size $dim -isRound $false
    Generate-Icon -destPath $roundPath -size $dim -isRound $true
}

# Web & PWA icons
Generate-Icon -destPath "C:\Project\Latetst\icons\icon-192.png" -size 192 -isRound $false
Generate-Icon -destPath "C:\Project\Latetst\icons\icon-512.png" -size 512 -isRound $false

# Also copy to Android assets icons
Generate-Icon -destPath "C:\Project\Latetst\android-apk-project\app\src\main\assets\icons\icon-192.png" -size 192 -isRound $false
Generate-Icon -destPath "C:\Project\Latetst\android-apk-project\app\src\main\assets\icons\icon-512.png" -size 512 -isRound $false

$srcImage.Dispose()
Write-Output "All high-res launcher icons successfully generated!"
