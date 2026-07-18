Add-Type -AssemblyName System.Drawing
$files = @('picture_10.jpg', 'picture_11.jpg', 'picture_12.jpg')
foreach ($f in $files) {
    $img = [System.Drawing.Image]::FromFile("C:\dev\tennis-analyzer\images\$f")
    Write-Host "$f : $($img.Width)x$($img.Height)"
    $img.Dispose()
}
