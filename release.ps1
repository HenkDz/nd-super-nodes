# Release script for ND Super Nodes
# Usage: .\release.ps1 -Version "1.1.0"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ReleaseName = "nd-super-nodes-v$Version"
$ZipPath = "$ReleaseName.zip"
$TempDir = "release-temp"

$buildTimestamp = (Get-Date).ToUniversalTime().ToString("o")
$versionManifest = @{ version = $Version; builtAt = $buildTimestamp } | ConvertTo-Json -Depth 2

# Update repo version file for posterity
Set-Content -Path "version.json" -Value $versionManifest -Encoding utf8

# Create temp directory
New-Item -ItemType Directory -Path $TempDir -Force

# Copy runtime files, tolerate optional paths on CI
$copyTargets = @(
    @{ Path = '__init__.py'; Recurse = $false; Required = $true },
    @{ Path = 'backend'; Recurse = $true; Required = $true },
    @{ Path = 'web'; Recurse = $true; Required = $true },
    @{ Path = 'templates'; Recurse = $true; Required = $false },
    @{ Path = 'update.ps1'; Recurse = $false; Required = $true },
    @{ Path = 'update.sh'; Recurse = $false; Required = $true }
)

foreach ($target in $copyTargets) {
    $sourcePath = $target.Path
    if (Test-Path $sourcePath) {
        $destination = $TempDir
        if ($target.Recurse) {
            Copy-Item -Path $sourcePath -Destination $destination -Recurse -Force
        } else {
            Copy-Item -Path $sourcePath -Destination $destination -Force
        }
    } elseif ($target.Required) {
        throw "Release asset missing: $sourcePath"
    } else {
        Write-Warning "Release: Skipping optional path '$sourcePath' (not found)."
    }
}

# Emit version manifest into release payload
Set-Content -Path (Join-Path $TempDir 'version.json') -Value $versionManifest -Encoding utf8

# Create ZIP
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force

# Create GitHub release
$Notes = @"
This is a compiled release containing only the runtime files needed for ComfyUI. No source code or build tools included.

## Installation
1. Download ${ReleaseName}.zip from Assets below.
2. Extract to your ComfyUI `custom_nodes` folder (e.g., `ComfyUI/custom_nodes/nd-super-nodes`).
3. Restart ComfyUI.

For full source code, clone the repo instead.
"@

if (-not $env:GH_TOKEN -and -not $env:GITHUB_TOKEN) {
    Write-Warning "Release: GH_TOKEN/GITHUB_TOKEN not found; attempting unauthenticated release (likely to fail)."
}

& gh release create "v$Version" $ZipPath --title "ND Super Nodes v$Version (Compiled Release)" --notes $Notes
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create GitHub release v$Version (gh exit code $LASTEXITCODE)."
    Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
    Remove-Item $ZipPath -ErrorAction SilentlyContinue
    exit $LASTEXITCODE
}

# Clean up
Remove-Item -Recurse -Force $TempDir
Remove-Item $ZipPath

Write-Host "Release v$Version created successfully!"
