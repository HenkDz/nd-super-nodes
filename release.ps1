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

# Copy runtime files
Copy-Item __init__.py $TempDir/
Copy-Item -Recurse backend $TempDir/
Copy-Item -Recurse web $TempDir/
Copy-Item -Recurse templates $TempDir/
Copy-Item update.ps1 $TempDir/
Copy-Item update.sh $TempDir/

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

gh release create "v$Version" $ZipPath --title "ND Super Nodes v$Version (Compiled Release)" --notes $Notes

# Clean up
Remove-Item -Recurse -Force $TempDir
Remove-Item $ZipPath

Write-Host "Release v$Version created successfully!"
