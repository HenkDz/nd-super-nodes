# Super LoRA Loader

A modern, standalone Super LoRA Loader custom node for ComfyUI with advanced features and a clean architecture.

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

This implementation uses a clean, modern architecture:

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

1. **Copy the directory** to your ComfyUI custom nodes folder:
   ```bash
   # Copy the entire super-lora-loader directory to:
   ComfyUI/custom_nodes/super-lora-loader/
   ```

2. **Install backend dependencies** (optional, for CivitAI integration):
   ```bash
   cd ComfyUI/custom_nodes/super-lora-loader
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

4. **Build the frontend**:
   ```bash
   npm run build
   ```

5. **Restart ComfyUI** to load the new custom node.

### Quick Setup (Development)

If you have the directory already set up:
```bash
cd ComfyUI/custom_nodes/super-lora-loader
cd frontend && npm install && npm run build
```

### Testing

Run the included tests to verify everything works:
```bash
# Test backend (Python)
python test_backend.py

# Test widget processing (Python)
python test_widgets.py

# Test frontend (open test_frontend.html in browser)
# The frontend is already built and ready to use

# Debug extension registration (open debug_extension.html in browser)
# This tool helps diagnose ComfyUI integration issues
```

### Troubleshooting

#### Extension Registration Issues

If you see the error "Failed to register extension - ComfyUI app not found":

1. **Wait for ComfyUI to fully load**: The extension has multiple fallback mechanisms and will retry automatically
2. **Check browser console**: Look for "Extension registered successfully" message
3. **Refresh ComfyUI**: Sometimes a full page reload helps
4. **Check ComfyUI version**: Ensure you're using a recent version with the new frontend

The extension includes robust registration logic that will:
- Try to register immediately
- Retry for up to 5 seconds if the app isn't ready
- Listen for ComfyUI initialization events
- Provide detailed logging for debugging

## 🔧 Development

### Frontend Development
To develop the frontend with hot reload:

```bash
cd frontend
npm run dev
```

This will watch for changes and rebuild automatically.

### Type Checking
To check TypeScript types:

```bash
cd frontend
npm run type-check
```

### Building for Production
To build the optimized frontend:

```bash
cd frontend
npm run build
```

## 📖 Usage

1. **Add the Node**: Search for "Super LoRA Loader" in ComfyUI's node menu
2. **Connect Inputs**: Connect MODEL and CLIP inputs (both optional)
3. **Add LoRAs**: Click "➕ Add LoRA" to add LoRA files
4. **Configure**: Adjust strengths, set trigger words, organize with tags
5. **Templates**: Save configurations as templates for reuse

### Add LoRA Overlay

- **Single-select (default)**: Click an item to add immediately
- **Multi-select**: Enable the "Multi-select" toggle at the top
  - Click items to select/deselect; use the footer to "Add Selected" or "Clear"
  - Already-added LoRAs are disabled and cannot be selected
  - If opened from an existing LoRA row, the first selection updates that row; additional selections append as new rows
- **Folder filters**: Use chips to narrow results by top-level folder; filters persist for the session

### Settings

Access settings via the ⚙️ Settings button:

- **Auto-fetch Trigger Words**: Automatically fetch from CivitAI
- **Enable Tags**: Organize LoRAs by categories
- **Show Separate Strengths**: Show model/CLIP strength controls
- **Show Trigger Words**: Display per-row trigger words pill
- **Show Tag Chip**: Display a tag chip on each LoRA row
- **Show Move Arrows**: Up/down arrows for quick reordering
- **Show Remove Button**: Per-row remove button
- **Show Strength Controls**: Toggle visibility of strength boxes/buttons
- **Enable Templates**: Allow saving/loading configurations
- **Enable Deletion**: Allow removing LoRAs from the list
- **Enable Sorting**: Allow reordering LoRAs

### Tag System

When enabled, LoRAs are organized by tags:
- **General**: Default category
- **Character**: Character-specific LoRAs
- **Style**: Art style LoRAs
- **Quality**: Quality enhancement LoRAs
- **Effect**: Special effects LoRAs
- **Custom**: User-defined categories

### Templates

Save and load LoRA configurations:
1. Configure your LoRAs as desired
2. Click "💾 Save Template"
3. Enter a template name
4. Use "📂 Load Template" to restore configurations

#### Template Management

From the "Load Template" overlay:

- **✏️ Rename** a template inline
- **🗑 Delete** a template (confirmation required)

## 🔗 Integration

### CivitAI Integration

The node automatically fetches trigger words from CivitAI:
- Calculates file hashes to identify models
- Fetches metadata including trained words
- Auto-populates trigger words (shown with green indicator)

### ComfyUI Frontend

Built for the new ComfyUI Frontend architecture:
- Modern widget system
- TypeScript type safety
- Modular component design
- Responsive UI patterns

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Use the existing service architecture
- Add JSDoc comments for public APIs
- Test your changes thoroughly
- Update documentation as needed

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the original rgthree Power LoRA Loader
- Built for the ComfyUI community
- Uses the modern ComfyUI Frontend architecture

## 📞 Support

For issues and feature requests, please use the GitHub issue tracker.

---

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Compatibility**: ComfyUI with new Frontend architecture

## 🎯 **Latest Updates**

- ✅ **Advanced Custom Widget System**: Complete rgthree-style custom drawing and interaction
- ✅ **Professional UI**: Custom-drawn widgets with sophisticated controls  
- ✅ **Master Controls**: Toggle all, add LoRA, save/load templates, settings
- ✅ **Tag Organization**: Collapsible tag headers with individual tag controls
- ✅ **Individual LoRA Controls**: Enable/disable, strength controls, trigger words, tag assignment
- ✅ **Template System**: Save and load LoRA configurations
- ✅ **Settings Dialog**: Toggleable features (tags, trigger words, separate strengths)
- ✅ **Context Menus**: Right-click options and additional controls
- ✅ **Serialization**: Proper save/load of custom widget states

### 🆕 Recent additions

- **Add LoRA Overlay Multi-select**: Toggle multi-select; batch add via footer actions
- **Folder Filter Chips**: Narrow large lists quickly; session-persistent filters
- **Duplicate-aware UX**: Already-added LoRAs disabled; batch add shows added/skipped counts
- **Template Inline Actions**: Rename and delete directly from the Load Template overlay
- **Expanded Settings Toggles**: Show Tag Chip, Move Arrows, Remove Button, Strength Controls

The Super LoRA Loader now has **all the advanced features** of rgthree's power LoRA loader and more!

### 🚀 **Advanced Features Implemented**

- **Custom Drawing**: Professional canvas-based UI like rgthree
- **Hit Area Detection**: Precise click handling for all interactive elements
- **Collapsible Tags**: Organize LoRAs by categories (Character, Style, Quality, etc.)
- **Master Controls**: Toggle all LoRAs, add new ones, manage templates
- **Individual Controls**: Each LoRA has enable/disable, strength sliders, trigger words
- **Visual Indicators**: Color-coded elements, auto-fetched trigger word indicators
- **Template Management**: Save/load LoRA sets for quick reuse
- **Settings Panel**: Enable/disable features as needed
- **Drag & Drop Ready**: Framework for future drag-drop reordering
