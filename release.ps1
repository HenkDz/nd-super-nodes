# Release script for Super LoRA Loader
# Usage: .\release.ps1 -Version "1.1.0"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ReleaseName = "super-lora-loader-v$Version"
$ZipPath = "$ReleaseName.zip"
$TempDir = "release-temp"

# Create temp directory
New-Item -ItemType Directory -Path $TempDir -Force

# Copy runtime files
Copy-Item __init__.py $TempDir/
Copy-Item -Recurse backend $TempDir/
Copy-Item -Recurse web $TempDir/
Copy-Item -Recurse templates $TempDir/

# Create ZIP
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force

# Create GitHub release
$Notes = @"
This is a compiled release containing only the runtime files needed for ComfyUI. No source code or build tools included.

## Installation
1. Download `$ReleaseName.zip` from Assets below.
2. Extract to your ComfyUI `custom_nodes` folder (e.g., `ComfyUI/custom_nodes/super-lora-loader`).
3. Restart ComfyUI.

For full source code, clone the repo instead.
"@

gh release create "v$Version" $ZipPath --title "Super LoRA Loader v$Version (Compiled Release)" --notes $Notes

# Clean up
Remove-Item -Recurse -Force $TempDir
Remove-Item $ZipPath

Write-Host "Release v$Version created successfully!"
