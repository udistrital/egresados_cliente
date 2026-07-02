# Genera assets/images/favicon-ud.png a partir del escudo UD circular:
# recorta al contenido, aplica máscara circular (transparente fuera del círculo)
# y reescala a 64x64. Ejecutar desde la raíz del repo:
#   pwsh -File tools/generar-favicon.ps1
Add-Type -AssemblyName System.Drawing

$origen  = Join-Path $PSScriptRoot '..\src\assets\images\logo-ud-circular.png'
$destino = Join-Path $PSScriptRoot '..\src\assets\images\favicon-ud.png'

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $origen))

# 1. Bounds del contenido (píxeles no-blancos, muestreo cada 2px)
$minX = $src.Width; $minY = $src.Height; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $src.Height; $y += 2) {
  for ($x = 0; $x -lt $src.Width; $x += 2) {
    $c = $src.GetPixel($x, $y)
    if ($c.R -lt 245 -or $c.G -lt 245 -or $c.B -lt 245) {
      if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
Write-Host "contenido: ($minX,$minY)-($maxX,$maxY)"

# 2. Recorte cuadrado centrado en el contenido (margen 4px por lado)
$cx = [int](($minX + $maxX) / 2); $cy = [int](($minY + $maxY) / 2)
$lado = [Math]::Max($maxX - $minX, $maxY - $minY) + 8
$half = [int]($lado / 2)
$x0 = [Math]::Max(0, $cx - $half); $y0 = [Math]::Max(0, $cy - $half)
$lado = [Math]::Min($lado, [Math]::Min($src.Width - $x0, $src.Height - $y0))

# 3. Máscara circular: transparente fuera del círculo inscrito
$out = New-Object System.Drawing.Bitmap($lado, $lado, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$r = $lado / 2.0
for ($y = 0; $y -lt $lado; $y++) {
  for ($x = 0; $x -lt $lado; $x++) {
    $dx = $x - $r + 0.5; $dy = $y - $r + 0.5
    if (($dx * $dx + $dy * $dy) -le ($r * $r)) {
      $out.SetPixel($x, $y, $src.GetPixel($x0 + $x, $y0 + $y))
    } else {
      $out.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
    }
  }
}

# 4. Reescalar a 64x64 con alta calidad
$fav = New-Object System.Drawing.Bitmap(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($fav)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.DrawImage($out, 0, 0, 64, 64)
$g.Dispose()

$fav.Save($destino, [System.Drawing.Imaging.ImageFormat]::Png)
$src.Dispose(); $out.Dispose(); $fav.Dispose()
Write-Host "generado: $destino ($((Get-Item $destino).Length) bytes)"
