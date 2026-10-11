# Baby On Screen - sincroniza imagens locais com a branch gh-pages.
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File .\sync_local_sprites.ps1
# Prévia sem publicar: acrescente -PreviewOnly
[CmdletBinding()]
param(
    [string]$Source = (Join-Path $env:USERPROFILE 'Pictures\baby_sprite_pack'),
    [switch]$PreviewOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repository = 'https://github.com/HelioConde/babyOnScreen.git'
$branch = 'gh-pages'
$categoryNames = @(
    'alimentacao', 'banho', 'casa', 'crescimento', 'escola',
    'fralda', 'npcs', 'quarto', 'quintal', 'sono'
)
$imageExtensions = @('.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif')
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('babyonscreen-sprites-' + [guid]::NewGuid().ToString('N'))
$checkout = Join-Path $tempRoot 'repo'
$finishedSuccessfully = $false

function Assert-GitSuccess {
    param([string]$Operation)
    if ($LASTEXITCODE -ne 0) {
        throw "Git falhou em: $Operation (código $LASTEXITCODE)."
    }
}

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw 'Git não foi encontrado. Instale o Git for Windows: https://git-scm.com/downloads/win'
    }

    $sourceRoot = Get-Item -LiteralPath $Source -ErrorAction Stop
    if (-not $sourceRoot.PSIsContainer) {
        throw "A origem precisa ser uma pasta: $Source"
    }

    # Primeiro validar a origem, para não publicar um pacote parcial por engano.
    $imagesByCategory = @{}
    $totalImages = 0
    foreach ($category in $categoryNames) {
        $folder = Join-Path $sourceRoot.FullName $category
        if (-not (Test-Path -LiteralPath $folder -PathType Container)) {
            throw "Pasta obrigatória ausente: $folder"
        }
        $images = @(Get-ChildItem -LiteralPath $folder -File -Recurse |
            Where-Object { $imageExtensions -contains $_.Extension.ToLowerInvariant() })
        if ($images.Count -eq 0) {
            throw "Nenhuma imagem encontrada na pasta: $folder"
        }
        foreach ($file in $images) {
            if ($file.Length -le 0) {
                throw "Imagem vazia encontrada: $($file.FullName)"
            }
        }
        $imagesByCategory[$category] = $images
        $totalImages += $images.Count
        Write-Host ("{0}: {1} imagens" -f $category, $images.Count)
    }
    Write-Host ("Origem validada: {0} imagens nas 10 pastas." -f $totalImages) -ForegroundColor Green

    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    Write-Host 'Clonando somente a branch gh-pages em uma pasta temporária...'
    & git clone --depth 1 --single-branch --branch $branch $repository $checkout
    Assert-GitSuccess 'clone da branch gh-pages'

    $destinationRoot = Join-Path $checkout 'assets\sprites\generated'
    if (-not (Test-Path -LiteralPath $destinationRoot -PathType Container)) {
        throw "Destino não encontrado no repositório: $destinationRoot"
    }

    # Só copiar imagens; manter README, manifestos e outros arquivos existentes.
    foreach ($category in $categoryNames) {
        $sourceCategory = Join-Path $sourceRoot.FullName $category
        $destinationCategory = Join-Path $destinationRoot $category
        New-Item -ItemType Directory -Path $destinationCategory -Force | Out-Null

        foreach ($file in $imagesByCategory[$category]) {
            $relative = $file.FullName.Substring($sourceCategory.Length).TrimStart([char]'\', [char]'/')
            $destination = Join-Path $destinationCategory $relative
            $parent = Split-Path -Parent $destination
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
            Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
        }
    }

    & git -C $checkout add -- assets/sprites/generated
    Assert-GitSuccess 'preparar imagens para o commit'
    & git -C $checkout diff --cached --quiet -- assets/sprites/generated
    $diffCode = $LASTEXITCODE
    if ($diffCode -eq 0) {
        Write-Host 'Nenhuma mudança: o GitHub já tem essas imagens.' -ForegroundColor Green
        $finishedSuccessfully = $true
        return
    }
    if ($diffCode -ne 1) {
        throw "Não foi possível conferir as alterações do Git (código $diffCode)."
    }

    Write-Host 'Alterações encontradas:'
    & git -C $checkout diff --cached --stat
    Assert-GitSuccess 'resumir alterações'

    if ($PreviewOnly) {
        Write-Host 'Modo prévia: nenhuma alteração foi enviada ao GitHub.' -ForegroundColor Yellow
        $finishedSuccessfully = $true
        return
    }

    & git -C $checkout commit -m 'assets: sync local baby sprite pack to gh-pages'
    Assert-GitSuccess 'criar commit (confira nome/email no Git, se necessário)'
    & git -C $checkout push origin 'HEAD:gh-pages'
    Assert-GitSuccess 'enviar imagens à branch gh-pages'

    Write-Host 'Sprites enviados à branch gh-pages com sucesso!' -ForegroundColor Green
    Write-Host 'Confira: https://github.com/HelioConde/babyOnScreen/tree/gh-pages/assets/sprites/generated'
    $finishedSuccessfully = $true
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    if ($finishedSuccessfully -and (Test-Path -LiteralPath $tempRoot)) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    elseif (Test-Path -LiteralPath $tempRoot) {
        Write-Host "Cópia temporária preservada para diagnóstico: $tempRoot" -ForegroundColor Yellow
    }
}