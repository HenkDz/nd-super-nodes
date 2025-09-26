param(
    [switch]$Prerelease,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

function Write-Info($Message) {
    Write-Host "[ND Super Nodes] $Message"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) {
    throw "Unable to determine script directory."
}

$rootDir = Resolve-Path $scriptDir
Write-Info "Using installation at '$rootDir'"
Write-Info "Ensure ComfyUI is closed before running this updater."

$manifestPath = Join-Path $rootDir 'version.json'

function Get-LocalVersion {
    param($Path)
    if (-not (Test-Path $Path)) {
        return @{ version = '0.0.0'; builtAt = '' }
    }
    try {
        return Get-Content -Raw -Path $Path | ConvertFrom-Json
    } catch {
        Write-Info "Warning: Unable to parse version file. Assuming 0.0.0."
        return @{ version = '0.0.0'; builtAt = '' }
    }
}

function ConvertTo-Version {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return [Version]'0.0.0' }
    $sanitized = $Value -replace '[^0-9\.]+', ''
    if ([string]::IsNullOrWhiteSpace($sanitized)) { return [Version]'0.0.0' }
    try {
        return [Version]$sanitized
    } catch {
        $parts = ($sanitized -split '\.') | Where-Object { $_ -match '^\d+$' }
        while ($parts.Count -lt 3) { $parts += '0' }
        return [Version]::new([int]$parts[0], [int]$parts[1], [int]$parts[2])
    }
}

function Get-TargetRelease {
    param([switch]$IncludePrerelease)

    $headers = @{ 'Accept' = 'application/vnd.github+json'; 'User-Agent' = 'ND-Super-Nodes-Updater' }
    $releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/HenkDz/nd-super-nodes/releases' -Headers $headers
    if (-not $releases) {
        throw "No releases found on GitHub."
    }

    if ($IncludePrerelease) {
        return ($releases | Where-Object { $_.draft -eq $false })[0]
    }

    return ($releases | Where-Object { $_.draft -eq $false -and $_.prerelease -eq $false })[0]
}

$local = Get-LocalVersion -Path $manifestPath
$currentVersion = ConvertTo-Version $local.version
Write-Info "Current version: $($local.version)"

$release = Get-TargetRelease -IncludePrerelease:$Prerelease
if (-not $release) {
    throw "Unable to determine target release."
}

$latestTag = $release.tag_name
$latestVersion = ConvertTo-Version ($latestTag -replace '^v', '')
Write-Info "Latest release: $latestTag"

if (-not $Force -and $latestVersion -le $currentVersion) {
    Write-Info "Installation already up to date. Use -Force to re-install."
    return
}

$asset = $release.assets | Where-Object { $_.name -like 'nd-super-nodes-v*.zip' }
if (-not $asset) {
    throw "Release asset nd-super-nodes-v*.zip not found."
}

Write-Info "Downloading $($asset.name)..."
$tempFile = Join-Path ([System.IO.Path]::GetTempPath()) ("nd-super-nodes-" + [System.Guid]::NewGuid().ToString() + '.zip')
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tempFile

Write-Info "Creating backup..."
$backupsDir = Join-Path $rootDir 'backups'
New-Item -ItemType Directory -Path $backupsDir -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupTarget = Join-Path $backupsDir ("backup-$($local.version)-$timestamp")
New-Item -ItemType Directory -Path $backupTarget -Force | Out-Null

Get-ChildItem -Path $rootDir -Force | Where-Object { $_.Name -notin @('backups', '.git', '.github') } | ForEach-Object {
    $destination = Join-Path $backupTarget $_.Name
    Copy-Item -Path $_.FullName -Destination $destination -Recurse -Force
}

Write-Info "Extracting release..."
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("nd-super-nodes-unpack-" + [System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Expand-Archive -Path $tempFile -DestinationPath $tempDir -Force

$preserve = @('backups', 'update.ps1', 'update.sh')
Get-ChildItem -Path $rootDir -Force | Where-Object { $_.Name -notin $preserve } | ForEach-Object {
    if ($_.PSIsContainer) {
        Remove-Item -Path $_.FullName -Recurse -Force
    } else {
        Remove-Item -Path $_.FullName -Force
    }
}

Get-ChildItem -Path $tempDir -Force | ForEach-Object {
    $target = Join-Path $rootDir $_.Name
    Copy-Item -Path $_.FullName -Destination $target -Recurse -Force
}

Write-Info "Cleaning up temporary files..."
Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Info "Update complete! Installed version $latestTag."
Write-Info "Restart ComfyUI to load the latest ND Super Nodes build."
