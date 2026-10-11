$ErrorActionPreference = "Stop"
$version = (Get-Content -Raw -LiteralPath package.json | ConvertFrom-Json).version
$file = Join-Path dist "latest.yml"
if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "latest.yml is missing" }
$contents = Get-Content -Raw -LiteralPath $file
$setup = "Baby-On-Screen-Setup-$version-x64.exe"
if (-not $contents.Contains("version: $version")) { throw "latest.yml has the wrong version" }
if (-not $contents.Contains($setup)) { throw "latest.yml does not list the Setup installer" }
if ($contents.Contains("Baby-On-Screen-Portable-$version")) { throw "Portable must not be the update payload" }
if ($contents -notmatch 'sha512:\s*[A-Za-z0-9+/=]{80,}') { throw "Missing strong SHA512 update checksum" }
$inside = Join-Path dist "win-unpacked/resources/app-update.yml"
if (-not (Test-Path -LiteralPath $inside -PathType Leaf)) { throw "Missing app-update.yml inside packaged app" }
$settings = Get-Content -Raw -LiteralPath $inside
foreach ($word in @('github', 'HelioConde', 'babyOnScreen')) {
  if (-not $settings.Contains($word)) { throw "Invalid packaged update provider: missing $word" }
}
Write-Host "Release update feed verified for $version" -ForegroundColor Green
