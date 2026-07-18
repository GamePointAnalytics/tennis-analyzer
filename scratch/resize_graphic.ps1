Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\yingz\.gemini\antigravity\brain\6e15fce5-68ec-43e3-905d-365eb8291de5\play_store_feature_graphic_1783774356633.jpg"
$destPath = "C:\dev\tennis-analyzer\images\play_store_feature_graphic.png"

$targetWidth = 1024
$targetHeight = 500

$srcImg = [System.Drawing.Image]::FromFile($srcPath)
$destBmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$g = [System.Drawing.Graphics]::FromImage($destBmp)

$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# Calculate cropping coordinates to fill 1024x500
$srcRatio = $srcImg.Width / $srcImg.Height
$targetRatio = $targetWidth / $targetHeight

$cropWidth = 0
$cropHeight = 0
$cropX = 0
$cropY = 0

if ($srcRatio -gt $targetRatio) {
    # Source is wider than target ratio
    $cropHeight = $srcImg.Height
    $cropWidth = [int]($srcImg.Height * $targetRatio)
    $cropX = [int](($srcImg.Width - $cropWidth) / 2)
    $cropY = 0
} else {
    # Source is taller than target ratio
    $cropWidth = $srcImg.Width
    $cropHeight = [int]($srcImg.Width / $targetRatio)
    $cropX = 0
    $cropY = [int](($srcImg.Height - $cropHeight) / 2)
}

$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)
$destRect = New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)

$g.DrawImage($srcImg, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Clean up GDI+ resources
$g.Dispose()
$srcImg.Dispose()

# Save as PNG
$destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$destBmp.Dispose()

Write-Host "Success: Resized and saved to $destPath"
