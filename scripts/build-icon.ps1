# Generates src/assets/icon.ico from the canonical sun-arc brand PNG,
# embedding 16/32/48/64/128/256 PNG-compressed entries.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "docs/handoff/brand/horizon-icon-1024.png"
$out = Join-Path $root "src/assets/icon.ico"
$sizes = 16, 32, 48, 64, 128, 256

$source = [System.Drawing.Image]::FromFile($src)
$entries = @()
try {
  foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($source, 0, 0, $size, $size)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $entries += [pscustomobject]@{ Size = $size; Bytes = $ms.ToArray() }
    $ms.Dispose()
  }
} finally {
  $source.Dispose()
}

$count = $entries.Count
$fs = [System.IO.File]::Create($out)
$bw = New-Object System.IO.BinaryWriter $fs
try {
  # ICONDIR
  $bw.Write([uint16]0)      # reserved
  $bw.Write([uint16]1)      # type = icon
  $bw.Write([uint16]$count) # image count

  # Directory entries follow the header; image data follows all entries.
  $offset = 6 + (16 * $count)
  foreach ($e in $entries) {
    $dim = if ($e.Size -ge 256) { 0 } else { $e.Size }
    $bw.Write([byte]$dim)            # width  (0 => 256)
    $bw.Write([byte]$dim)            # height (0 => 256)
    $bw.Write([byte]0)               # palette count
    $bw.Write([byte]0)               # reserved
    $bw.Write([uint16]1)             # color planes
    $bw.Write([uint16]32)            # bits per pixel
    $bw.Write([uint32]$e.Bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $e.Bytes.Length
  }
  foreach ($e in $entries) {
    $bw.Write($e.Bytes)
  }
} finally {
  $bw.Dispose()
  $fs.Dispose()
}

Write-Output "Wrote $out with sizes: $($sizes -join ', ') ($((Get-Item $out).Length) bytes)"
