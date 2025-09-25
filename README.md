# Super LoRA Loader

Modern, easy LoRA loader for ComfyUI.

## 🌟 Features

- Add multiple LoRAs quickly (single-click or multi-select)
- Per-LoRA enable and strengths (Model/CLIP)
- Trigger words (auto or manual)
- Templates: save, load, rename, delete
- Optional tags with collapsible groups
- Duplicate detection (prevents adding the same LoRA twice)

## ⚡ ND Power UI Enhancements

Enhance standard ComfyUI nodes with advanced file picker overlays:

- **Enhanced Nodes**: CheckpointLoader, VAELoader, LoraLoader, UNETLoader, CLIPLoader, ControlNetLoader, UpscaleModelLoader, and GGUF variants
- **Visual Indicators**: Golden-bordered overlay widgets with lightning icon (⚡) for easy identification
- **File Picker**: Click the overlay to open an advanced file browser with folder navigation and search
- **Per-Node Toggle**: Enable/disable enhancements via right-click menu on individual nodes
- **Persistence**: Settings and selections persist across workflow saves/loads

To enable: Right-click on a supported node → "⚡ Enable ND Power UI"

## Install (Git clone)

1) Go to your ComfyUI custom nodes folder:
   - Windows: `ComfyUI\custom_nodes`
   - macOS/Linux: `ComfyUI/custom_nodes`
2) Clone this repo:

```
git clone https://github.com/HenkDz/super-lora-loader.git super-lora-loader
```

3) Restart ComfyUI

## Use

1) Add node: search "Super LoRA Loader"
2) Connect MODEL (required) and CLIP (optional)
3) Click "➕ Add LoRA"; select one or use Multi-select to add many
4) Adjust strengths/trigger words; save a template if you like

Tips:

- In the overlay, use folder/subfolder chips to narrow large lists
- The first selection updates the clicked row; extra selections append

More details: see `docs/development.md`

License: MIT
