# Enhanced UI Feature Development Guide

## Overview

The Enhanced UI feature (also known as "ND Super Selector") allows injecting our custom search overlay onto existing ComfyUI nodes without modifying their source code. This feature enables users to enhance nodes like CheckpointLoader, VAELoader, LoraLoader, etc., with our advanced file picker overlay through a right-click context menu option.

## Architecture

### Core Components

1. **NodeEnhancerExtension** (`frontend/src/extensions/NodeEnhancerExtension.ts`)
   - Main orchestrator for node enhancement
   - Handles node type detection and UI injection
   - Manages enhancement state persistence

2. **FilePickerService** (`frontend/src/services/FilePickerService.ts`)
   - Abstraction layer for file fetching and overlay display
   - Maps node types to file configurations
   - Interfaces with backend APIs

3. **SuperLoraNode Overlay System** (`frontend/src/nodes/SuperLoraNode.ts`)
   - Provides `showSearchOverlay()` and `showToast()` functions
   - Contains the actual overlay UI logic
   - Reused by enhanced nodes

4. **Backend File API** (`backend/file_api.py`)
   - Provides REST endpoints for file listing
   - Uses ComfyUI's `folder_paths` for directory traversal
   - Supports recursive file discovery

## Implementation Details

### 1. Node Enhancement System

#### How It Works

The enhancement system uses ComfyUI's `beforeRegisterNodeDef` hook to inject custom behavior into existing node types:

```typescript
// In extension.ts
async beforeRegisterNodeDef(nodeType: any, nodeData: any): Promise<void> {
  // ... Super LoRA Node setup ...
  
  // Initialize NodeEnhancerExtension and set up enhancements for other nodes
  await NodeEnhancerExtension.initialize();
  NodeEnhancerExtension.setup(nodeType, nodeData);
}
```

#### Supported Node Types

Currently enhanced nodes are defined in `ENHANCED_NODES` array:

```typescript
private static readonly ENHANCED_NODES: EnhancedNodeConfig[] = [
  { nodeType: "CheckpointLoaderSimple", targetWidget: "ckpt_name", fileType: "checkpoints" },
  { nodeType: "VAELoader", targetWidget: "vae_name", fileType: "vae" },
  { nodeType: "LoraLoader", targetWidget: "lora_name", fileType: "loras" },
  { nodeType: "ControlNetLoader", targetWidget: "control_net_name", fileType: "controlnet" },
  { nodeType: "UpscaleModelLoader", targetWidget: "model_name", fileType: "upscale_models" },
  { nodeType: "CLIPLoader", targetWidget: "clip_name", fileType: "clip" },
  { nodeType: "UNETLoader", targetWidget: "unet_name", fileType: "unet" },
  { nodeType: "DiffusersLoader", targetWidget: "model_path", fileType: "diffusers" },
  { nodeType: "GLIGENLoader", targetWidget: "gligen_name", fileType: "gligen" }
];
```

### 2. UI Injection Mechanism

#### Method Overrides

The enhancement works by overriding key node prototype methods:

1. **onNodeCreated**: Sets up enhanced nodes when they're instantiated
2. **onDrawForeground**: Draws the "⚡ Enhanced" indicator
3. **onMouseDown**: Handles mouse events for widget interactions
4. **getExtraMenuOptions**: Adds the "Enable ND Super Selector" context menu option

#### Widget Replacement

For enhanced nodes, the target widget's behavior is completely replaced:

```typescript
// Replace widget callback entirely – no default dropdown, only our overlay
targetWidget.callback = function() {
  NodeEnhancerExtension.showEnhancedPicker(node, config);
};

// Override the widget's mouse method to prevent dropdown on click
targetWidget.mouse = function(event: any, pos: any, node: any) {
  if (event.type === 'pointerdown' && event.button === 0) {
    NodeEnhancerExtension.showEnhancedPicker(node, config);
    return true; // Consume the event
  }
  return node._ndOriginalMouse ? node._ndOriginalMouse.call(this, event, pos, node) : false;
};
```

### 3. File Type Configuration

#### FilePickerService Configuration

File types are mapped to their respective ComfyUI folder names and extensions:

```typescript
private static readonly FILE_TYPES: Record<string, FileTypeConfig> = {
  "checkpoints": {
    folderName: "checkpoints",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    displayName: "Checkpoint"
  },
  "vae": {
    folderName: "vae",
    fileExtensions: [".ckpt", ".pt", ".pt2", ".bin", ".pth", ".safetensors", ".pkl", ".sft"],
    displayName: "VAE"
  },
  // ... more configurations
};
```

### 4. Backend API Integration

#### Endpoints

- Primary: `GET /super_lora/files`
- Fallback: `POST /superlora/files` (legacy compatibility)

#### Request Format

```http
GET /super_lora/files?folder_name=vae&extensions=.ckpt,.pt,.safetensors
```

#### Response Format

```json
{
  "files": [
    {
      "name": "filename.safetensors",
      "path": "subfolder/filename.safetensors",
      "extension": ".safetensors",
      "size": 1234567,
      "modified": 1640995200
    }
  ]
}
```

#### Backend Implementation

The backend uses ComfyUI's `folder_paths` module for directory discovery:

```python
def get_files(request):
    folder_name = request.query.get("folder_name")
    extensions_str = request.query.get("extensions")
    
    mapped_folder_name = map_legacy_folder_name(folder_name)
    base_paths = folder_paths.get_folder_paths(mapped_folder_name)
    
    # Recursive file discovery with os.walk()
    for base_path in base_paths:
        for root, _, filenames in os.walk(base_path):
            # Process files and build response...
```

### 5. State Persistence

#### Enhancement State

The enhancement state is persisted in two ways:

1. **Node Properties**: Serialized into workflow JSON

```typescript
// In serialize override
if (this.__ndPowerEnabled) {
  data.properties = data.properties || {};
  data.properties.__ndPowerEnabled = true;
}

// In configure override
if (data.properties?.__ndPowerEnabled) {
  this.__ndPowerEnabled = true;
}
```

1. **localStorage**: User preferences across sessions

```typescript
private static loadUserPreferences(): Set<string> {
  try {
    const saved = localStorage.getItem('ndPowerUI_enabledNodes');
    return new Set(saved ? JSON.parse(saved) : []);
  } catch {
    return new Set();
  }
}
```

### 6. Overlay Integration

#### Reusing SuperLoraNode Overlay

The enhanced nodes reuse the existing overlay system:

```typescript
private static showEnhancedPicker(node: any, config: EnhancedNodeConfig): void {
  const filePickerService = FilePickerService.getInstance();
  
  filePickerService.showFilePicker(config.fileType, (selectedFile) => {
    // Update the widget value
    const widget = node.widgets?.find((w: any) => w.name === config.targetWidget);
    if (widget) {
      widget.value = selectedFile.name;
      // Trigger node update without auto-queuing
    }
  }, {
    title: `Select ${filePickerService.getSupportedFileTypes()[config.fileType]?.displayName || config.fileType}`
  });
}
```

#### Folder Filtering Logic

The overlay shows all files initially, filtering only when chips are selected:

```typescript
// In SuperLoraNode.showSearchOverlay()
// When no folder filters active, show all files (filtered = termFiltered)
let filtered = termFiltered;
if (folderFeatureEnabled && activeFolders.size > 0) {
  // Apply folder and subfolder filters only when chips are actively selected
  filtered = termFiltered.filter(item => {
    // Filtering logic...
  });
}
```

## Key Design Decisions

### 1. Non-Invasive Approach

- **Decision**: Enhance existing nodes without modifying their source
- **Implementation**: Use ComfyUI's extension system and prototype overrides
- **Benefit**: Maintains compatibility with ComfyUI updates

### 2. Reuse Existing Overlay

- **Decision**: Reuse SuperLoraNode's overlay system instead of creating new UI
- **Implementation**: Global exposure via `window.SuperLoraNode`
- **Benefit**: Consistent UI/UX and reduced code duplication

### 3. Configurable Node Types

- **Decision**: Define enhanced nodes in a static configuration array
- **Implementation**: `ENHANCED_NODES` with node type, widget, and file type mapping
- **Benefit**: Easy to add/remove supported node types

### 4. Progressive Enhancement

- **Decision**: Enhancement is opt-in per node instance
- **Implementation**: Right-click context menu to enable/disable
- **Benefit**: Users can choose when to use enhanced UI

### 5. State Persistence Strategy

- **Decision**: Dual persistence (localStorage + node properties)
- **Implementation**: User preferences + workflow-specific state
- **Benefit**: Remembers user choices and workflow-specific configurations

## Common Issues and Solutions

### 1. Widget Click Handler Override (NOT FIXED)

**Problem**: Default dropdown still appears alongside our overlay
**Solution**: Completely replace widget's `callback` and `mouse` methods (or find a better solution)

### 2. Context Menu Integration

**Problem**: `Cannot read properties of undefined (reading 'push')`
**Solution**: Robust handling of `optionsArr` parameter in `getExtraMenuOptions`

### 3. File Type Mapping

**Problem**: Backend can't find files for certain node types
**Solution**: Legacy folder name mapping (`map_legacy_folder_name`)

### 4. Initial File Display

**Problem**: Files not showing until folder chips are selected
**Solution**: Start with empty filter sets, show all files by default

### 5. API Endpoint Compatibility

**Problem**: 404 errors when backend routes don't match
**Solution**: Try primary endpoint first, fallback to legacy route

## Future Development Considerations

### 1. Overlay Logic Separation

When separating overlay logic:

- Create `OverlayManager.ts` service
- Move `showSearchOverlay` logic from `SuperLoraNode`
- Update both `SuperLoraNode` and `FilePickerService` to use new service
- Maintain backward compatibility

### 2. Right-Click Disable Feature (added - just make proper icon)

To add right-click disable:

- Extend `getExtraMenuOptions` with disable option
- Add confirmation dialog for safety
- Update persistence logic to handle disabled state

### 3. Additional Node Types

To add more node types:

- Update `ENHANCED_NODES` array
- Add corresponding `FILE_TYPES` configuration
- Test file discovery for new folder types
- Update documentation
- Start by adding the Unet Loader (GGUF)

### 4. Overlay Trigger Experiments (September 2025)

We attempted several approaches to remove the legacy combo dropdown and trigger the ND Super Selector overlay in a single click:

- **Widget override** (`frontend/src/extensions/NodeEnhancerExtension.ts`): replaced the widget’s `callback` and `mouse` handlers so we can intercept the click before the LiteGraph dropdown opens. This prevents crashes but the built-in dropdown still shows briefly, and the first click targets the widget focus while the second opens the overlay.
- **DOM button injection** (same file, now reverted): tried to grab `widget.inputEl`, hide it, and append a custom “Open Picker” button. Modern ComfyUI LiteGraph widgets no longer expose a stable DOM input element, so the button never rendered. That change was rolled back.
- **Pointer guard**: we now guard against recursive pointer events to avoid the “Maximum call stack size exceeded” seen during testing.

Related files touched while experimenting:

- `frontend/src/extensions/NodeEnhancerExtension.ts`
- `frontend/src/services/FilePickerService.ts`
- `frontend/src/services/OverlayService.ts`
- `backend/file_api.py`

The main limitation remains: the default dropdown briefly appears and users still need a second click to open the overlay. Future work should focus on either patching the LiteGraph combo creation earlier in the chain or introducing a reliable custom trigger rendered alongside the widget.

### 4. Performance Optimization

Consider for large file sets:

- Implement file caching strategies
- Add pagination to overlay
- Lazy loading for folder contents
- Virtual scrolling for large lists

### 5. UI Improvements

## Testing Strategy

### Manual Testing Checklist

- [x] Right-click context menu appears
- [x] Enhancement toggle works
- [ ] Enhanced indicator displays correctly
- [x] First click opens overlay (no dropdown)
- [x] File selection updates widget
- [x] State persists across reloads
- [x] Multiple node types work correctly
- [x] Folder filtering works as expected
- [x] Backend API responds correctly

### Automated Testing Considerations

- Unit tests for `FilePickerService`
- Integration tests for widget override logic
- E2E tests for full enhancement workflow
- Backend API endpoint testing
- Performance testing with large file sets

## Conclusion

The Enhanced UI feature successfully provides a non-invasive way to upgrade existing ComfyUI nodes with our advanced file picker interface. The architecture is modular, configurable, and maintains compatibility with the existing ComfyUI ecosystem while providing significant UX improvements for file selection workflows.

## September 2025 Enhancements

- Resolved the lingering single-click issue by hiding the native LiteGraph combo widget entirely and inserting our compact overlay proxy in its place. The overlay now opens on the very first click with no dropdown flash.
- Added per-widget enhancement metadata so we no longer reuse the same draw handler across inputs. This prevents neighbouring fields from inheriting the selected file path and keeps non-file widgets (e.g., integers) from showing `NaN`.
- Updated the GGUF loaders (UNet and CLIP variants) to iterate every exposed `clip_name*` input. Dual, Triple, and Quad CLIP loaders now get individual overlays without hiding the second (or third/fourth) slot, and the “Enable ND Super Selector” toggle is available again on both regular and advanced GGUF nodes.
- Restored the original widget handlers when disabling the enhancement so the native dropdown reappears immediately and the compact proxy is removed cleanly.
- Reapplied the narrow overlay styling (≈120px width, reduced padding) so the trigger maintains the compact footprint we standardised on earlier experiments.

### Special Notes / Pitfalls

- Always hide the native LiteGraph combo (`widget.hidden = true`, `computeSize = [0, -4]`) before drawing our proxy. Leaving it visible causes the original dropdown to reappear or flicker behind the overlay.
- Track per-widget metadata. Reusing a single draw/mouse handler for multiple widgets forces LiteGraph to echo the selected file path into neighbouring inputs (especially numeric fields).
- When disabling the enhancement, restore every original handler (draw, mouse, callback, computeSize) and unhide the widget. Only removing the proxy overlay leaves the node without a functional dropdown.
- Multi-input GGUF nodes expose multiple `clip_name*` widgets; iterate and store metadata per field or the lower slots will disappear.
- Keep the overlay’s width capped (~120px). Letting it expand to the full node width breaks alignment and restores the spacing bugs we hit earlier.
