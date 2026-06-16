param(
  [string]$InputPath = "A_source.png",
  [string]$SlicesOut = "public/slices2",
  [int]$TargetSize = 4500,
  [int]$CellSize = 900,
  [int]$CanvasSize = 1200,
  [int]$AnchorX = 600,
  [int]$AnchorY = 900
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-Dir([string]$Path) {
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Is-BackgroundLike([System.Drawing.Color]$Color) {
  $max = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $min = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  $mean = [int](($Color.R + $Color.G + $Color.B) / 3)
  return (($max - $min) -le 26 -and $mean -ge 118 -and $mean -le 188)
}

function Convert-ToTransparentSource([string]$Path) {
  $src = [System.Drawing.Bitmap]::new((Resolve-Path $Path).Path)
  $out = [System.Drawing.Bitmap]::new($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  for ($y = 0; $y -lt $src.Height; $y++) {
    for ($x = 0; $x -lt $src.Width; $x++) {
      $c = $src.GetPixel($x, $y)
      if (Is-BackgroundLike $c) {
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B))
      } else {
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $c.R, $c.G, $c.B))
      }
    }
  }

  $src.Dispose()
  return $out
}

function Resize-Square([System.Drawing.Bitmap]$Image, [int]$Size) {
  $resized = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($resized)
  $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.DrawImage($Image, 0, 0, $Size, $Size)
  $g.Dispose()
  return $resized
}

function Get-CellComponent([System.Drawing.Bitmap]$Sheet, [int]$Row, [int]$Col, [int]$Cell, [int]$AlphaThreshold) {
  $x0 = $Col * $Cell
  $y0 = $Row * $Cell
  $count = $Cell * $Cell
  $foreground = [byte[]]::new($count)
  $visited = [byte[]]::new($count)

  for ($yy = 0; $yy -lt $Cell; $yy++) {
    $base = $yy * $Cell
    for ($xx = 0; $xx -lt $Cell; $xx++) {
      if ($Sheet.GetPixel($x0 + $xx, $y0 + $yy).A -gt $AlphaThreshold) {
        $foreground[$base + $xx] = 1
      }
    }
  }

  $bestPixels = $null
  $bestArea = 0
  $bestBounds = $null
  $queue = [int[]]::new($count)

  for ($i = 0; $i -lt $count; $i++) {
    if ($foreground[$i] -eq 0 -or $visited[$i] -ne 0) { continue }

    $componentPixels = New-Object System.Collections.Generic.List[int]
    $head = 0
    $tail = 0
    $queue[$tail] = $i
    $tail++
    $visited[$i] = 1

    $minX = $Cell
    $minY = $Cell
    $maxX = -1
    $maxY = -1

    while ($head -lt $tail) {
      $idx = $queue[$head]
      $head++
      $componentPixels.Add($idx)

      $py = [int][Math]::Floor($idx / $Cell)
      $px = $idx - ($py * $Cell)
      if ($px -lt $minX) { $minX = $px }
      if ($py -lt $minY) { $minY = $py }
      if ($px -gt $maxX) { $maxX = $px }
      if ($py -gt $maxY) { $maxY = $py }

      for ($dy = -1; $dy -le 1; $dy++) {
        for ($dx = -1; $dx -le 1; $dx++) {
          if ($dx -eq 0 -and $dy -eq 0) { continue }
          $nx = $px + $dx
          $ny = $py + $dy
          if ($nx -lt 0 -or $nx -ge $Cell -or $ny -lt 0 -or $ny -ge $Cell) { continue }
          $nidx = $ny * $Cell + $nx
          if ($foreground[$nidx] -ne 0 -and $visited[$nidx] -eq 0) {
            $visited[$nidx] = 1
            $queue[$tail] = $nidx
            $tail++
          }
        }
      }
    }

    if ($componentPixels.Count -gt $bestArea) {
      $bestArea = $componentPixels.Count
      $bestPixels = $componentPixels
      $bestBounds = @{ MinX = $minX; MinY = $minY; MaxX = $maxX; MaxY = $maxY }
    }
  }

  if ($bestArea -le 0) { throw "empty cell row=$Row col=$Col" }

  $mask = [byte[]]::new($count)
  foreach ($idx in $bestPixels) { $mask[$idx] = 1 }
  return @{ Bounds = $bestBounds; Mask = $mask; Area = $bestArea }
}

function Save-Cell([System.Drawing.Bitmap]$Sheet, [string]$OutPath, [int]$Row, [int]$Col) {
  $component = Get-CellComponent $Sheet $Row $Col $CellSize 24
  $bounds = $component.Bounds
  $mask = $component.Mask
  $centerX = ($bounds.MinX + $bounds.MaxX) / 2.0
  $dstX = [int][Math]::Round($AnchorX - $centerX)
  $dstY = [int]($AnchorY - $bounds.MaxY)

  $canvas = [System.Drawing.Bitmap]::new($CanvasSize, $CanvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($yy = 0; $yy -lt $CellSize; $yy++) {
    for ($xx = 0; $xx -lt $CellSize; $xx++) {
      if ($mask[$yy * $CellSize + $xx] -eq 0) { continue }
      $targetX = $dstX + $xx
      $targetY = $dstY + $yy
      if ($targetX -lt 0 -or $targetX -ge $CanvasSize -or $targetY -lt 0 -or $targetY -ge $CanvasSize) { continue }
      $c = $Sheet.GetPixel($Col * $CellSize + $xx, $Row * $CellSize + $yy)
      $canvas.SetPixel($targetX, $targetY, $c)
    }
  }

  New-Dir ([System.IO.Path]::GetDirectoryName($OutPath))
  $canvas.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Dispose()

  Write-Output ("{0} offset=({1},{2}) area={3}" -f $OutPath, $dstX, $dstY, $component.Area)
}

New-Dir $SlicesOut
$transparent = Convert-ToTransparentSource $InputPath
$sheet = Resize-Square $transparent $TargetSize
$transparent.Dispose()

for ($row = 0; $row -lt 5; $row++) {
  for ($col = 0; $col -lt 5; $col++) {
    $outPath = Join-Path (Join-Path $SlicesOut "A") ("r{0}c{1}.png" -f $row, $col)
    Save-Cell $sheet $outPath $row $col
  }
}

$sheet.Dispose()
