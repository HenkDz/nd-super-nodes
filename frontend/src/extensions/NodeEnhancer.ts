/**
 * Node Enhancer Extension - Main Entry Point
 * Registers the node enhancement system with ComfyUI
 */

// @ts-ignore: Provided by ComfyUI runtime
import { app } from '/scripts/app.js';
import { ComfyExtension } from '../types';
import { NodeEnhancerExtension } from './NodeEnhancerExtension';

// Extension configuration
const EXTENSION_NAME = 'NodeEnhancer';
const EXTENSION_VERSION = '1.0.0';

// Main extension object
const nodeEnhancerExtension: ComfyExtension = {
  name: EXTENSION_NAME,
  version: EXTENSION_VERSION,

  // Extension settings
  settings: [
    {
      id: 'nodeEnhancer.enabled',
      name: 'Enable Node Enhancement',
      type: 'boolean',
      defaultValue: true
    },
    {
      id: 'nodeEnhancer.autoEnhanceAll',
      name: 'Auto-enhance All Nodes',
      type: 'boolean',
      defaultValue: false
    },
    {
      id: 'nodeEnhancer.enableContextToggle',
      name: 'Show ND Super Selector Toggle in Node Menu',
      type: 'boolean',
      defaultValue: true
    }
  ],

  // Extension commands (minimal; per-node toggle lives in right-click menu)
  commands: [
    {
      id: 'nodeEnhancer.clearCache',
      label: 'ND Super Selector: Clear File Cache',
      function: () => {
        try {
          (NodeEnhancerExtension as any)['filePickerService']?.clearCache?.();
          console.log('ND Super Selector: File cache cleared');
        } catch {}
      }
    }
  ],

  /**
   * Called when the extension is loaded
   */
  async init(): Promise<void> {
    console.log(`${EXTENSION_NAME} v${EXTENSION_VERSION}: Initializing...`);

    try {
      // Initialize the node enhancer
      await NodeEnhancerExtension.initialize();
      console.log(`${EXTENSION_NAME}: Initialization successful`);
    } catch (error) {
      console.error(`${EXTENSION_NAME}: Initialization failed:`, error);
    }
  },

  /**
   * Called before a node type is registered
   * This is where we inject our enhancements
   */
  async beforeRegisterNodeDef(nodeType: any, nodeData: any): Promise<void> {
    try {
      // Set up enhancement for this node type
      NodeEnhancerExtension.setup(nodeType, nodeData);

    } catch (error) {
      console.error('Node Enhancer: Error in beforeRegisterNodeDef:', error);
      // Don't block node registration on errors
    }
  },

  /**
   * Called when a node is created
   */
  nodeCreated(node: any): void {
    // Auto-enhance nodes if setting is enabled
    const enabled = app.ui.settings.getSettingValue('nodeEnhancer.enabled', true);
    const autoEnhanceAll = enabled && app.ui.settings.getSettingValue('nodeEnhancer.autoEnhanceAll', false);

    if (autoEnhanceAll && node?.type) {
      const availableEnhancements = NodeEnhancerExtension.getAvailableEnhancements();
      const hasEnhancement = availableEnhancements.some(e => e.nodeType === node.type);

      if (hasEnhancement) {
        NodeEnhancerExtension.enableEnhancementsForNode(node);
        console.log(`Node Enhancer: Auto-enhanced ${node.type}`);
      }
    }
  },

  /**
   * Called before the graph is configured
   */
  beforeConfigureGraph(_graphData: any): void {
    console.log('Node Enhancer: Configuring graph');
  },

  /**
   * Called after the graph is configured
   */
  afterConfigureGraph(_graphData: any): void {
    console.log('Node Enhancer: Graph configured');
    NodeEnhancerExtension.onGraphConfigured();
  }
};

// Register the extension with ComfyUI
console.log(`${EXTENSION_NAME}: Registering extension with ComfyUI`);
app.registerExtension(nodeEnhancerExtension);
console.log(`${EXTENSION_NAME}: Extension registered successfully`);

// Export for potential external use
export default nodeEnhancerExtension;
export { NodeEnhancerExtension };
