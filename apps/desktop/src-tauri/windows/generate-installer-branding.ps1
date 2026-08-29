$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$brandingDir = Join-Path $PSScriptRoot "branding"
New-Item -ItemType Directory -Path $brandingDir -Force | Out-Null

function New-LivariantHeaderBitmap {
  param([string]$Path)

  $bitmap = New-Object System.Drawing.Bitmap 150, 57
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  try {
    $rect = New-Object System.Drawing.Rectangle 0, 0, 150, 57
    $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $rect,
      [System.Drawing.Color]::FromArgb(5, 10, 24),
      [System.Drawing.Color]::FromArgb(11, 18, 42),
      0.0
    )
    $graphics.FillRectangle($background, $rect)
    $background.Dispose()

    $violet = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(128, 79, 255))
    $blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, 169, 255))
    $graphics.FillEllipse($violet, 112, -12, 56, 56)
    $graphics.FillPolygon($blue, [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point 106, 14),
      (New-Object System.Drawing.Point 124, 24),
      (New-Object System.Drawing.Point 124, 42),
      (New-Object System.Drawing.Point 106, 32)
    ))
    $graphics.FillPolygon($violet, [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point 106, 14),
      (New-Object System.Drawing.Point 106, 32),
      (New-Object System.Drawing.Point 94, 25)
    ))
    $blue.Dispose()
    $violet.Dispose()

    $titleFont = New-Object System.Drawing.Font("Segoe UI Semibold", 12, [System.Drawing.FontStyle]::Bold)
    $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 7.5)
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(239, 244, 255))
    $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(152, 171, 208))
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

  $bitmap = New-Object System.Drawing.Bitmap 164, 314
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  try {
    $rect = New-Object System.Drawing.Rectangle 0, 0, 164, 314
    $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $rect,
      [System.Drawing.Color]::FromArgb(4, 8, 19),
      [System.Drawing.Color]::FromArgb(8, 15, 35),
      90.0
    )
    $graphics.FillRectangle($background, $rect)
    $background.Dispose()

    $blueGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 102, 205))
    $violetGlow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(88, 48, 181))
    $graphics.FillEllipse($blueGlow, -64, 66, 182, 182)
    $graphics.FillEllipse($violetGlow, 74, 202, 128, 128)
    $blueGlow.Dispose()
    $violetGlow.Dispose()

    $blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(48, 169, 255))
    $violet = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(128, 79, 255))
    $graphics.FillPolygon($blue, [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point 82, 40),
      (New-Object System.Drawing.Point 105, 53),
      (New-Object System.Drawing.Point 105, 81),
      (New-Object System.Drawing.Point 82, 95),
      (New-Object System.Drawing.Point 59, 81),
      (New-Object System.Drawing.Point 59, 53)
    ))
    $graphics.FillPolygon($violet, [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point 82, 49),
      (New-Object System.Drawing.Point 97, 58),
      (New-Object System.Drawing.Point 97, 75),
      (New-Object System.Drawing.Point 82, 84),
      (New-Object System.Drawing.Point 82, 69),
      (New-Object System.Drawing.Point 68, 61),
      (New-Object System.Drawing.Point 68, 53)
    ))
    $blue.Dispose()
    $violet.Dispose()

    $titleFont = New-Object System.Drawing.Font("Segoe UI Semibold", 16, [System.Drawing.FontStyle]::Bold)
    $bodyFont = New-Object System.Drawing.Font("Segoe UI", 8.5)
    $smallFont = New-Object System.Drawing.Font("Segoe UI", 8)
    $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(239, 244, 255))
    $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(157, 176, 211))
    $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(104, 111, 255))

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
