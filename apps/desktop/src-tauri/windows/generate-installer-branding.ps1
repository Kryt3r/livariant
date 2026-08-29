$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$brandingDir = Join-Path $PSScriptRoot "branding"
New-Item -ItemType Directory -Path $brandingDir -Force | Out-Null

function New-Brush([int]$r, [int]$g, [int]$b) {
  return [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($r, $g, $b))
}

function New-LivariantHeaderBitmap {
  param([string]$Path)

  $bitmap = [System.Drawing.Bitmap]::new(150, 57)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  try {
    $rect = [System.Drawing.Rectangle]::new(0, 0, 150, 57)
    $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      $rect,
      [System.Drawing.Color]::FromArgb(5, 10, 24),
      [System.Drawing.Color]::FromArgb(11, 18, 42),
      0.0
    )
    $graphics.FillRectangle($background, $rect)
    $background.Dispose()

    $violet = New-Brush 128 79 255
    $blue = New-Brush 48 169 255
    $graphics.FillEllipse($violet, 112, -12, 56, 56)
    $graphics.FillPolygon($blue, [System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(106, 14),
      [System.Drawing.Point]::new(124, 24),
      [System.Drawing.Point]::new(124, 42),
      [System.Drawing.Point]::new(106, 32)
    ))
    $graphics.FillPolygon($violet, [System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(106, 14),
      [System.Drawing.Point]::new(106, 32),
      [System.Drawing.Point]::new(94, 25)
    ))
    $blue.Dispose()
    $violet.Dispose()

    $titleFont = [System.Drawing.Font]::new("Segoe UI Semibold", 12, [System.Drawing.FontStyle]::Bold)
    $subtitleFont = [System.Drawing.Font]::new("Segoe UI", 7.5)
    $white = New-Brush 239 244 255
    $muted = New-Brush 152 171 208
    $graphics.DrawString("LIVARIANT", $titleFont, $white, 12, 9)
    $graphics.DrawString("Windows setup", $subtitleFont, $muted, 13, 31)
    $titleFont.Dispose()
    $subtitleFont.Dispose()
    $white.Dispose()
    $muted.Dispose()

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Bmp)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function New-LivariantSidebarBitmap {
  param([string]$Path)

  $bitmap = [System.Drawing.Bitmap]::new(164, 314)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  try {
    $rect = [System.Drawing.Rectangle]::new(0, 0, 164, 314)
    $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      $rect,
      [System.Drawing.Color]::FromArgb(4, 8, 19),
      [System.Drawing.Color]::FromArgb(8, 15, 35),
      90.0
    )
    $graphics.FillRectangle($background, $rect)
    $background.Dispose()

    $blueGlow = New-Brush 34 102 205
    $violetGlow = New-Brush 88 48 181
    $graphics.FillEllipse($blueGlow, -64, 66, 182, 182)
    $graphics.FillEllipse($violetGlow, 74, 202, 128, 128)
    $blueGlow.Dispose()
    $violetGlow.Dispose()

    $blue = New-Brush 48 169 255
    $violet = New-Brush 128 79 255
    $graphics.FillPolygon($blue, [System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(82, 40),
      [System.Drawing.Point]::new(105, 53),
      [System.Drawing.Point]::new(105, 81),
      [System.Drawing.Point]::new(82, 95),
      [System.Drawing.Point]::new(59, 81),
      [System.Drawing.Point]::new(59, 53)
    ))
    $graphics.FillPolygon($violet, [System.Drawing.Point[]]@(
      [System.Drawing.Point]::new(82, 49),
      [System.Drawing.Point]::new(97, 58),
      [System.Drawing.Point]::new(97, 75),
      [System.Drawing.Point]::new(82, 84),
      [System.Drawing.Point]::new(82, 69),
      [System.Drawing.Point]::new(68, 61),
      [System.Drawing.Point]::new(68, 53)
    ))
    $blue.Dispose()
    $violet.Dispose()

    $titleFont = [System.Drawing.Font]::new("Segoe UI Semibold", 16, [System.Drawing.FontStyle]::Bold)
    $bodyFont = [System.Drawing.Font]::new("Segoe UI", 8.5)
    $smallFont = [System.Drawing.Font]::new("Segoe UI", 8)
    $white = New-Brush 239 244 255
    $muted = New-Brush 157 176 211
    $accent = New-Brush 104 111 255

    $graphics.DrawString("LIVARIANT", $titleFont, $white, 27, 117)
    $graphics.DrawString("Living software framework", $bodyFont, $muted, 23, 149)
    $graphics.FillRectangle($accent, 43, 181, 78, 3)
    $graphics.DrawString("Install. Verify.", $smallFont, $white, 42, 228)
    $graphics.DrawString("Stay in control.", $smallFont, $muted, 40, 247)

    $titleFont.Dispose()
    $bodyFont.Dispose()
    $smallFont.Dispose()
    $white.Dispose()
    $muted.Dispose()
    $accent.Dispose()

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Bmp)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$header = Join-Path $brandingDir "installer-header.bmp"
$sidebar = Join-Path $brandingDir "installer-sidebar.bmp"

New-LivariantHeaderBitmap -Path $header
New-LivariantSidebarBitmap -Path $sidebar

foreach ($asset in @($header, $sidebar)) {
  if (-not (Test-Path -LiteralPath $asset -PathType Leaf)) {
    throw "Installer branding asset was not generated: $asset"
  }
  $digest = (Get-FileHash -LiteralPath $asset -Algorithm SHA256).Hash.ToLowerInvariant()
  Write-Host "Generated installer branding asset: $asset"
  Write-Host "SHA256: $digest"
}
