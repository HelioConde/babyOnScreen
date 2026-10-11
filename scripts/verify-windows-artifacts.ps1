# Fails the build if NSIS and portable collapse into one file.
$ErrorActionPreference = "Stop"
$folder = Join-Path (Resolve-Path ".").Path "dist"
$files = @(Get-ChildItem -LiteralPath $folder -File -Filter "*.exe")
$versions = (Get-Content -Raw -LiteralPath "package.json" | ConvertFrom-Json).version
$expected = @(
  "Baby-On-Screen-Setup-$versions-x64.exe",
  "Baby-On-Screen-Portable-$versions-x64.exe"
)
foreach ($file in $expected) {
  $found = Join-Path $folder $file
  if (-not (Test-Path -LiteralPath $found -PathType Leaf)) { throw "Required Windows executable missing: $file" }
  $entry = Get-Item -LiteralPath $found
  if ($entry.Length -lt 50MB) { throw "Windows executable appears truncated: $file ($($entry.Length) bytes)" }
  $bytes = [System.IO.File]::ReadAllBytes($found)
  if ($bytes.Length -lt 2 -or $bytes[0] -ne 77 -or $bytes[1] -ne 90) { throw "Invalid PE executable signature: $file" }
  Write-Host "OK $file: $($entry.Length) bytes" -ForegroundColor Green
}
if ($files.Count -ne 2) { throw "Expected exactly 2 Windows executables; found $($files.Count): $($files.Name -join ', ')" }
$first = (Get-FileHash -Algorithm SHA256 (Join-Path $folder $expected[0])).Hash
$second = (Get-FileHash -Algorithm SHA256 (Join-Path $folder $expected[1])).Hash
if ($first -eq $second) { throw "Installer and portable unexpectedly have identical hashes" }
Write-Host "Windows packaging verified: installer and portable are distinct." -ForegroundColor Green
