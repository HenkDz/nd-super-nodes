/**
 * Super LoRA Loader - ComfyUI Extension
 *
 * A modern, standalone implementation of a powerful LoRA loader with advanced features.
 */

// @ts-ignore ComfyUI provides this at runtime
import { app } from '/scripts/app.js';
import { ComfyExtension } from './types';
import { SuperLoraNode } from './nodes/SuperLoraNode';
import './styles/super-lora.scss';
import './extensions/NodeEnhancer';

// Extension configuration
const EXTENSION_NAME = 'SuperLoraLoader';
const NODE_TYPE = 'NdSuperLoraLoader';

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
    }
  ],
  
  /**
   * Called before a node type is registered
   */
  beforeRegisterNodeDef(nodeType: any, nodeData: any): void {
    if (nodeData.name === NODE_TYPE) {
      console.log('Super LoRA Loader: Registering node type');

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

// Bridge SuperLoraNode helpers for other modules (e.g., ND Power UI)
try {
  (window as any).SuperLoraNode = SuperLoraNode;
} catch {}
