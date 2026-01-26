/**
 * Super LoRA Loader - ComfyUI Extension
 *
 * A modern, standalone implementation of a powerful LoRA loader with advanced features.
 * Supports both legacy Canvas (LiteGraph) and Nodes 2.0 (Vue) rendering modes.
 */

// @ts-ignore ComfyUI provides this at runtime
import { app } from '/scripts/app.js';
import { ComfyExtension } from './types';
import { SuperLoraNode } from './nodes/SuperLoraNode';
import './styles/super-lora.scss';
import './extensions/NodeEnhancer';
import { UpdateService } from './services/UpdateService';
import {
  isNodes2Enabled,
  getRenderingMode,
  onRenderingModeChange,
  getNodes2Capabilities,
  Nodes2Capabilities,
  RenderingMode
} from './utils';

// Extension configuration
const EXTENSION_NAME = 'SuperLoraLoader';
const NODE_TYPE = 'NdSuperLoraLoader';

// Track current rendering mode
let currentRenderingMode: RenderingMode = 'canvas';
let nodes2Capabilities: Nodes2Capabilities | null = null;

/**
 * Initialize rendering mode detection
 */
function initRenderingModeDetection(): void {
  currentRenderingMode = getRenderingMode();
  nodes2Capabilities = getNodes2Capabilities();
  
  console.log(`Super LoRA Loader: Rendering mode = ${currentRenderingMode}`);
  if (nodes2Capabilities) {
    console.log('Super LoRA Loader: Nodes 2.0 capabilities:', nodes2Capabilities);
  }

  // Subscribe to mode changes (for dynamic switching if supported)
  onRenderingModeChange((newMode) => {
    console.log(`Super LoRA Loader: Rendering mode changed to ${newMode}`);
    currentRenderingMode = newMode;
    // Future: Trigger re-render of all nodes in new mode
  });
}

/**
 * Get current rendering mode
 * Exported for use by other modules
 */
export function getCurrentRenderingMode(): RenderingMode {
  return currentRenderingMode;
}

/**
 * Check if Nodes 2.0 is active
 * Exported for use by other modules
 */
export function isNodes2Active(): boolean {
  return isNodes2Enabled();
}

// Main extension object
const superLoraExtension: ComfyExtension = {
  name: EXTENSION_NAME,
  
  // Extension settings
  settings: [
    {
      id: 'superLora.autoFetchTriggerWords',
      name: 'Auto-fetch Trigger Words',
      type: 'boolean',
      defaultValue: true
    },
    {
      id: 'superLora.enableTags',
      name: 'Enable Tag System',
      type: 'boolean',
      defaultValue: false
    },
    {
      id: 'superLora.showSeparateStrengths',
      name: 'Show Separate Model/CLIP Strengths',
      type: 'boolean',
      defaultValue: false
    },
    {
      id: 'superLora.enableTemplates',
      name: 'Enable Template System',
      type: 'boolean',
      defaultValue: true
    },
    {
      id: 'superLora.enableDeletion',
      name: 'Enable LoRA Deletion',
      type: 'boolean',
      defaultValue: true
    },
    {
      id: 'superLora.enableSorting',
      name: 'Enable LoRA Sorting',
      type: 'boolean',
      defaultValue: true
    }
  ],
  
  // Extension commands
  commands: [
    {
      id: 'superLora.addLora',
      label: 'Add LoRA to Super LoRA Loader',
      function: () => {
        // This could trigger adding a LoRA to a selected node
        console.log('Super LoRA Loader: Add LoRA command triggered');
      }
    },
    {
      id: 'superLora.showTriggerWords',
      label: 'Show All Trigger Words',
      function: () => {
        // This could show a combined view of all trigger words
        console.log('Super LoRA Loader: Show trigger words command triggered');
      }
    },
    {
      id: 'superLora.checkUpdates',
      label: 'Check ND Super Nodes Updates',
      function: () => {
        UpdateService.getInstance().checkForUpdates({ force: true, silent: false })
          .catch(() => {
            /* handled in service */
          });
      }
    }
  ],
  
  /**
   * Called before a node type is registered
   */
  beforeRegisterNodeDef(nodeType: any, nodeData: any): void {
    // Initialize rendering mode detection once (on first node registration)
    if (currentRenderingMode === 'canvas' && !nodes2Capabilities) {
      initRenderingModeDetection();
    }

    if (nodeData.name === NODE_TYPE) {
      console.log(`Super LoRA Loader: Registering node type (mode: ${currentRenderingMode})`);

      // Kick off async initialization without blocking node registration.
      SuperLoraNode.initialize()
        .then(() => {
          console.log('Super LoRA Loader: Services initialized');
        })
        .catch((err) => {
          console.error('Super LoRA Loader: Initialization error', err);
        });

      try {
        // Set up the node type immediately so ComfyUI can register it synchronously.
        SuperLoraNode.setup(nodeType, nodeData);
        console.log('Super LoRA Loader: Node type registered successfully');
      } catch (err) {
        // Never block node registration on errors here; log and continue so the node still exists
        console.error('Super LoRA Loader: Error during node setup; continuing with default registration', err);
      }
    }
  },
  
  /**
   * Called when a node is created
   */
  nodeCreated(node: any): void {
    if (node.type === NODE_TYPE) {
      console.log('Super LoRA Loader: Node created', node.id);
      
      // Additional node setup if needed
      this.setupNodeEventHandlers?.(node);
    }
  },
  
  /**
   * Called before the graph is configured
   */
  beforeConfigureGraph(_graphData: any): void {
    // Pre-process graph data if needed
    console.log('Super LoRA Loader: Configuring graph');
  },
  
  /**
   * Set up additional event handlers for the node
   */
  setupNodeEventHandlers(node: any): void {
    // Handle node removal
    const originalOnRemoved = node.onRemoved;
    node.onRemoved = function() {
      console.log('Super LoRA Loader: Node removed', this.id);
      
      if (originalOnRemoved) {
        originalOnRemoved.apply(this, arguments);
      }
    };
    
    // Handle node copying
    const originalClone = node.clone;
    node.clone = function() {
      const clonedNode = originalClone ? originalClone.apply(this, arguments) : this;
      console.log('Super LoRA Loader: Node cloned', this.id, '->', clonedNode.id);
      return clonedNode;
    };
    
    // Handle property changes
    const originalOnPropertyChanged = node.onPropertyChanged;
    node.onPropertyChanged = function(name: string, value: any) {
      console.log('Super LoRA Loader: Property changed', name, value);
      
      // Handle setting changes that affect the UI
      if (name.startsWith('@')) {
        const settingName = name.substring(1);
        this.onSettingChanged?.(settingName, value);
      }
      
      if (originalOnPropertyChanged) {
        originalOnPropertyChanged.apply(this, arguments);
      }
    };
  }
};

// Register the extension with ComfyUI (immediate)
console.log('Super LoRA Loader: Registering extension with ComfyUI');
app.registerExtension(superLoraExtension);
console.log('Super LoRA Loader: Extension registered successfully');

// Export for potential external use
export default superLoraExtension;
export { SuperLoraNode };
export * from './types';
export * from './services/LoraService';
export * from './services/CivitAiService';
export * from './services/TemplateService';
export * from './utils';

// Bridge SuperLoraNode helpers for other modules (e.g., ND Super Selector)
try {
  (window as any).SuperLoraNode = SuperLoraNode;
} catch {}
