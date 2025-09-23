# Super LoRA Loader — Development & Power User Docs

This document contains the full, detailed documentation for developers and power users. For the simplified user guide, see the main README.

<!-- Sourced from the previous README content -->

## 🌟 Features

### Core Features
- **Multiple LoRA Loading**: Load multiple LoRAs in a single node
- **Individual Controls**: Toggle and adjust strength for each LoRA independently
- **Dual Strength Support**: Separate model and CLIP strength controls
- **Trigger Words**: Automatic trigger word fetching from CivitAI + manual input
- **Template System**: Save and load LoRA configurations
- **Duplicate Detection**: Prevents adding the same LoRA twice

### Advanced Features
- **Tag System**: Organize LoRAs by categories (Character, Style, Quality, etc.)
- **Collapsible Groups**: Expand/collapse tag sections for better organization
- **Auto-fetch Metadata**: Automatic CivitAI integration for trigger words
- **Visual Indicators**: Shows auto-populated vs manual trigger words
- **Master Controls**: Toggle all, show combined trigger words

### Modern UI Features
- **Settings Panel**: Configurable options for all features
- **Toast Notifications**: Success, warning, and error messages
- **Responsive Design**: Clean, modern interface
- **Keyboard Support**: Efficient keyboard shortcuts
- **Multi-select Add LoRA Overlay**: Toggle multi-select; single-click add in single mode
- **Folder Filter Chips**: Quickly scope lists by top-level folders
- **Batch Add Footer**: Add Selected, Clear selection, Cancel in multi-select
- **Duplicate-aware Selection**: Already-added items disabled; summary toasts on batch add
- **Inline Editors**: In-canvas text/number editors for quick tweaks

## 🏗️ Architecture

### Backend (Python)
- `backend/__init__.py` - ComfyUI node registration
- `backend/super_lora_node.py` - Main node implementation
- `backend/lora_utils.py` - LoRA processing utilities
- `backend/civitai_service.py` - CivitAI API integration
- `backend/template_manager.py` - Template save/load system

### Frontend (TypeScript)
- `frontend/src/extension.ts` - Main extension entry point
- `frontend/src/nodes/SuperLoraNode.ts` - Node implementation
- `frontend/src/widgets/` - Individual widget components
- `frontend/src/services/` - Business logic services
- `frontend/src/types/` - TypeScript type definitions
- `frontend/src/styles/` - Modern SCSS styling

## 🚀 Installation

1. Copy the directory to `ComfyUI/custom_nodes/super-lora-loader/`
2. Optional: `pip install -r requirements.txt`
3. Frontend: `cd frontend && npm install && npm run build`
4. Restart ComfyUI

### Quick Setup (Development)
```
cd ComfyUI/custom_nodes/super-lora-loader
cd frontend && npm install && npm run build
```

### Testing
```
# Backend
python test_backend.py

# Widgets
python test_widgets.py

# Frontend (open)
open test_frontend.html

# Extension debug (open)
open debug_extension.html
```

### Troubleshooting
- Wait for ComfyUI to fully load; the extension retries
- Check browser console for registration logs
- Refresh if needed; ensure recent ComfyUI

## 🔧 Development

### Frontend Dev (hot reload)
```
cd frontend
npm run dev
```

### Type Checking
```
cd frontend
npm run type-check
```

### Production Build
```
cd frontend
npm run build
```

## 📖 Usage

1. Add the node (search for "Super LoRA Loader")
2. Connect MODEL/CLIP
3. Add LoRAs via "➕ Add LoRA"
4. Configure strengths, triggers, tags
5. Save/load templates

### Add LoRA Overlay
- Single-select: click to add
- Multi-select: toggle on; select items; use footer to Add Selected/Clear
- Duplicates disabled; first selection updates current row (when opened from a row), others append
- Folder filters with top-level and subfolder chips; session-persistent

### Settings
- Auto-fetch Trigger Words
- Enable Tags
- Separate Model/CLIP Strengths
- Show Trigger Words
- Show Tag Chip
- Show Move Arrows
- Show Remove Button
- Show Strength Controls
- Enable Templates
- Enable Deletion
- Enable Sorting

### Tag System
- Default groups; fully editable via tag selector (rename/delete)

### Templates
- Save, load, rename (✏️), delete (🗑) via overlay actions

## 🔗 Integration
- CivitAI: auto fetch trigger words by hash
- ComfyUI Frontend: modern TS architecture

## 🤝 Contributing
- Fork → branch → PR; include tests when applicable

## 📝 License
MIT

## 📞 Support
Use GitHub issues

## 🎯 Latest Updates
- Multi-select Add LoRA overlay; batch add footer
- Folder and subfolder chips; session-persistent filters
- Duplicate-aware UX; added/skipped counts
- Template inline rename/delete
- Expanded settings toggles

