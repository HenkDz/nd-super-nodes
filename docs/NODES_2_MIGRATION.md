# ND Super Nodes - Nodes 2.0 Migration Plan

## Overview

ComfyUI's **Nodes 2.0** transitions from LiteGraph.js Canvas rendering to a **Vue-based architecture**. This is a significant change that enables faster development, richer interactions, and more flexible UI customization.

Our current implementation relies heavily on Canvas-based workarounds that Nodes 2.0 aims to solve natively.

## Current Architecture Analysis

### 1. Super LoRA Loader Node (`SuperLoraNode.ts`)

**Canvas-Based Patterns (Need Migration):**

| Pattern | Current Implementation | Nodes 2.0 Approach |
|---------|----------------------|-------------------|
| Custom widget drawing | `SuperLoraWidget.draw()` with Canvas2D | Vue components with reactive state |
| Hit area detection | Manual coordinate math in `handleMouseEvent()` | Native Vue event handlers |
| Mouse interaction | `onMouseDown/onMouseUp` with offset calculations | Vue `@click`, `@mousedown` events |
| Node size calculation | `computeContentHeight()` manual calculation | Vue computed properties + CSS flex |
| Inline text editors | DOM elements positioned via screen coords | Vue input components |

**Files Affected:**
- `frontend/src/nodes/SuperLoraNode.ts` - Main node orchestration
- `frontend/src/nodes/widgets/SuperLoraWidget.ts` - LoRA row widget
- `frontend/src/nodes/widgets/SuperLoraHeaderWidget.ts` - Header widget  
- `frontend/src/nodes/widgets/SuperLoraTagWidget.ts` - Tag section widget
- `frontend/src/nodes/widgets/SuperLoraBaseWidget.ts` - Base widget class

### 2. Node Enhancer Extension (`NodeEnhancerExtension.ts`)

**Canvas-Based Patterns:**

| Pattern | Current Implementation | Nodes 2.0 Approach |
|---------|----------------------|-------------------|
| Overlay widget drawing | `createOverlayWidget().draw()` with Canvas2D | Vue overlay component |
| Widget hiding | `computeSize = () => [0, -4]` hack | CSS `display: none` or conditional render |
| Mouse event interception | `mouse()` callback with coordinate checks | Vue event modifiers |
| Title badge rendering | Canvas text manipulation | Vue template interpolation |

**Files Affected:**
- `frontend/src/extensions/NodeEnhancerExtension.ts`
- `frontend/src/extensions/NodeEnhancer.ts`
- `frontend/src/services/FilePickerService.ts`

### 3. Overlay Service (`OverlayService.ts`)

**Current State:**
- Uses DOM manipulation for modals/toasts
- Independent of Canvas rendering
- **Should remain mostly compatible** with Nodes 2.0

**Minor Updates Needed:**
- Ensure z-index compatibility with Vue layer
- Test keyboard event handling

## Migration Phases

### Phase 1: Foundation (Week 1-2)
> Establish Nodes 2.0 compatibility infrastructure

1. **Feature Detection System**
   ```typescript
   // src/utils/nodes2-detection.ts
   export function isNodes2Enabled(): boolean {
     return !!(window as any).__COMFYUI_NODES_2_ENABLED__;
   }
   
   export function getNodeRenderingMode(): 'canvas' | 'vue' {
     return isNodes2Enabled() ? 'vue' : 'canvas';
   }
   ```

2. **Dual Rendering Architecture**
   - Keep existing Canvas widgets for LiteGraph fallback
   - Add Vue component alternatives that activate in Nodes 2.0 mode

3. **Shared State Management**
   - Extract widget state to reactive stores (Pinia or Vue reactive refs)
   - Both rendering modes read from same state

### Phase 2: Widget Components (Week 2-3)
> Convert custom widgets to Vue components

1. **Create Vue Widget Components**
   ```
   frontend/src/components/nodes2/
   ├── SuperLoraRow.vue       # Single LoRA entry
   ├── SuperLoraHeader.vue    # Header with add/template buttons
   ├── SuperLoraTagGroup.vue  # Collapsible tag section
   ├── StrengthControl.vue    # Model/CLIP strength input
   ├── TriggerWordInput.vue   # Trigger word editor
   └── FilePickerOverlay.vue  # Enhanced file selector
   ```

2. **Component Specifications**

   **SuperLoraRow.vue:**
   ```vue
   <template>
     <div class="super-lora-row" :class="{ disabled: !enabled }">
       <input type="checkbox" v-model="enabled" />
       <button @click="showLoraSelector">{{ loraName }}</button>
       <StrengthControl v-model="strength" label="Model" />
       <StrengthControl v-model="strengthClip" label="CLIP" v-if="showSeparate" />
       <TriggerWordInput v-model="triggerWords" />
       <button @click="remove">🗑</button>
     </div>
   </template>
   ```

3. **Eliminate Hit Area Math**
   - Replace `hitAreas` object with actual DOM elements
   - Use `@click.stop` for event isolation
   - No coordinate calculations needed

### Phase 3: Node Integration (Week 3-4)
> Wire Vue components into Nodes 2.0 system

1. **Register Vue Node Component**
   ```typescript
   // Integration with ComfyUI Nodes 2.0 API (TBD based on official docs)
   app.registerNodeComponent('NdSuperLoraLoader', {
     component: SuperLoraNodeComponent,
     // ... configuration
   });
   ```

2. **State Synchronization**
   - Vue component state → `lora_bundle` hidden widget for backend
   - Workflow serialization reads from Vue state
   - `configure()` restores Vue state from saved data

3. **Remove Canvas Overrides**
   - Conditionally disable `onDrawForeground` override
   - Remove `handleMouseDown/handleMouseUp` in Nodes 2.0 mode

### Phase 4: Node Enhancer Migration (Week 4-5)
> Convert file picker overlays to Vue

1. **Vue Overlay Component**
   ```vue
   <template>
     <div class="nd-super-selector" @click="toggle">
       <span class="label">{{ label }}</span>
       <span class="value">{{ displayValue }}</span>
       <span class="icon">⚡</span>
     </div>
   </template>
   ```

2. **Eliminate Widget Hiding Hack**
   - Instead of `computeSize = () => [0, -4]`, use CSS or conditional rendering
   - No need to manipulate native widget visibility

3. **Simplified Event Handling**
   - Direct Vue events instead of `mouse()` callback interception
   - No coordinate math for click detection

### Phase 5: Testing & Polish (Week 5-6)
> Ensure dual-mode compatibility

1. **Test Matrix**
   | Feature | LiteGraph Mode | Nodes 2.0 Mode |
   |---------|---------------|----------------|
   | Add LoRA | ✅ | ✅ |
   | Strength controls | ✅ | ✅ |
   | Trigger word fetch | ✅ | ✅ |
   | Template save/load | ✅ | ✅ |
   | File picker overlay | ✅ | ✅ |
   | Workflow serialization | ✅ | ✅ |

2. **Performance Testing**
   - Large workflows (50+ nodes)
   - Multiple Super LoRA Loaders
   - Memory usage comparison

## Code Removal Candidates

After Nodes 2.0 becomes stable default, these patterns can be removed:

```typescript
// SuperLoraWidget.ts - REMOVE
draw(ctx: any, node: any, w: number, posY: number, height: number): void {
  // All Canvas2D drawing code
}

hitAreas = {
  enabled: { bounds: [0, 0], onDown: this.onEnabledDown, priority: 60 },
  // ... manual hit area definitions
}

// SuperLoraNode.ts - REMOVE
static handleMouseDown(node: any, event: any, pos: any): boolean {
  // Manual coordinate-based hit testing
}

static drawCustomWidgets(node: any, ctx: any): void {
  // Manual Canvas iteration
}

// NodeEnhancerExtension.ts - REMOVE
private static readonly HIDDEN_WIDGET_SIZE = (_width?: number) => [0, -4];
// Widget size hack no longer needed
```

## New Files to Create

```
frontend/src/
├── components/
│   └── nodes2/
│       ├── index.ts
│       ├── SuperLoraRow.vue
│       ├── SuperLoraHeader.vue
│       ├── SuperLoraTagGroup.vue
│       ├── SuperLoraContainer.vue
│       ├── StrengthControl.vue
│       ├── TriggerWordInput.vue
│       └── FilePickerWidget.vue
├── composables/
│   ├── useLoraState.ts
│   ├── useTemplates.ts
│   └── useTriggerWords.ts
├── stores/
│   └── loraNodeStore.ts (Pinia)
└── utils/
    ├── nodes2-detection.ts
    └── render-mode.ts
```

## Build System Updates

```typescript
// vite.config.ts additions
export default defineConfig({
  // Add Vue support
  plugins: [
    vue(),           // <-- New
    // ... existing plugins
  ],
  
  // External ComfyUI Vue runtime (if shared)
  build: {
    rollupOptions: {
      external: [
        '/scripts/app.js',
        'vue',  // <-- If ComfyUI provides Vue runtime
      ],
    }
  }
});
```

## Dependencies to Add

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0"  // Optional: for state management
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0"
  }
}
```

## API Compatibility Notes

### ComfyUI Nodes 2.0 API (Preliminary)

Based on the docs at https://docs.comfy.org/interface/nodes-2, the new system:

1. **Retains LiteGraph.js** as an option (toggle in settings)
2. **Vue components** render node contents
3. **Existing custom nodes** should continue working in compatibility mode
4. **New features** require Vue integration for full benefit

### Backwards Compatibility Strategy

```typescript
// entry point
import { isNodes2Enabled } from './utils/nodes2-detection';

if (isNodes2Enabled()) {
  // Use Vue components
  import('./nodes2/SuperLoraVueNode').then(m => m.register());
} else {
  // Use existing Canvas widgets
  import('./nodes/SuperLoraNode').then(m => m.register());
}
```

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| 1. Foundation | 1-2 weeks | Feature detection + dual architecture |
| 2. Widget Components | 1 week | Vue components for all widgets |
| 3. Node Integration | 1 week | Nodes 2.0 registration |
| 4. Node Enhancer | 1 week | Vue file picker overlay |
| 5. Testing | 1 week | Full test coverage both modes |
| **Total** | **5-6 weeks** | Complete Nodes 2.0 support |

## Open Questions

1. **Vue Runtime**: Does ComfyUI Nodes 2.0 expose a shared Vue instance, or should we bundle our own?
2. **Component Registration**: What's the official API for registering Vue components as node widgets?
3. **State Persistence**: Does Nodes 2.0 provide new serialization hooks?
4. **Event System**: How do Vue events bubble through the node graph?

## Resources

- [ComfyUI Nodes 2.0 Docs](https://docs.comfy.org/interface/nodes-2)
- [ComfyUI Frontend Issues](https://github.com/Comfy-Org/ComfyUI_frontend/issues)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

---

*Last Updated: January 26, 2026*
*Branch: `feat/nodes-2.0-migration`*
