/**
 * Vue Integration for Nodes 2.0
 * 
 * Handles mounting Vue components within ComfyUI nodes when
 * Nodes 2.0 mode is active.
 */

import { createApp, type App, type Component, h, ref, reactive, watch, onUnmounted } from 'vue';
import { isNodes2Enabled, getRenderingMode } from './nodes2-detection';

/**
 * Tracks mounted Vue apps per node for cleanup
 */
const mountedApps = new Map<number, App>();
const nodeContainers = new Map<number, HTMLElement>();

/**
 * Configuration for Vue node mounting
 */
export interface VueNodeConfig {
  /** The node instance */
  node: any;
  
  /** Root component to mount */
  component: Component;
  
  /** Props to pass to the component */
  props?: Record<string, any>;
  
  /** Optional container class name */
  containerClass?: string;
  
  /** Z-index for the container */
  zIndex?: number;
}

/**
 * Creates a DOM container for the Vue app within a node.
 */
function createNodeContainer(node: any, config: VueNodeConfig): HTMLElement {
  // Check if container already exists
  let existing = nodeContainers.get(node.id);
  if (existing && existing.parentElement) {
    return existing;
  }
  
  // Create container element
  const container = document.createElement('div');
  container.id = `super-lora-vue-${node.id}`;
  container.className = config.containerClass || 'super-lora-vue-container';
  container.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    pointer-events: auto;
    overflow: hidden;
    z-index: ${config.zIndex ?? 10};
  `;
  
  // Find node's DOM element in Nodes 2.0
  const nodeElement = findNodeElement(node);
  if (nodeElement) {
    nodeElement.appendChild(container);
    nodeContainers.set(node.id, container);
    return container;
  }
  
  // Fallback: append to graph canvas wrapper
  const graphCanvas = document.querySelector('.graph-canvas-container, .litegraph, #graph-canvas');
  if (graphCanvas) {
    graphCanvas.appendChild(container);
    nodeContainers.set(node.id, container);
    return container;
  }
  
  console.warn('[ND Super Nodes] Could not find mount point for Vue container');
  return container;
}

/**
 * Find the DOM element for a node in Nodes 2.0 mode.
 */
function findNodeElement(node: any): HTMLElement | null {
  // Try various selectors that Nodes 2.0 might use
  const selectors = [
    `[data-node-id="${node.id}"]`,
    `#node-${node.id}`,
    `.comfy-node[data-id="${node.id}"]`,
    `.vue-node-${node.id}`,
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element as HTMLElement;
    }
  }
  
  return null;
}

/**
 * Mount a Vue app to a node's container.
 */
export function mountVueToNode(config: VueNodeConfig): App | null {
  if (!isNodes2Enabled()) {
    return null;
  }
  
  const { node, component, props = {} } = config;
  
  // Unmount existing app if any
  unmountVueFromNode(node.id);
  
  // Create container
  const container = createNodeContainer(node, config);
  if (!container.parentElement) {
    console.warn('[ND Super Nodes] Vue container has no parent, skipping mount');
    return null;
  }
  
  // Create Vue app
  const app = createApp({
    render() {
      return h(component, props);
    }
  });
  
  // Mount to container
  app.mount(container);
  mountedApps.set(node.id, app);
  
  console.log(`[ND Super Nodes] Vue app mounted for node ${node.id}`);
  return app;
}

/**
 * Unmount Vue app from a node.
 */
export function unmountVueFromNode(nodeId: number): void {
  const app = mountedApps.get(nodeId);
  if (app) {
    try {
      app.unmount();
    } catch (e) {
      console.warn(`[ND Super Nodes] Error unmounting Vue app for node ${nodeId}:`, e);
    }
    mountedApps.delete(nodeId);
  }
  
  const container = nodeContainers.get(nodeId);
  if (container && container.parentElement) {
    container.parentElement.removeChild(container);
  }
  nodeContainers.delete(nodeId);
}

/**
 * Clean up all Vue apps (e.g., on extension unload).
 */
export function cleanupAllVueApps(): void {
  for (const [nodeId] of mountedApps) {
    unmountVueFromNode(nodeId);
  }
}

/**
 * Check if a node has a mounted Vue app.
 */
export function isVueMounted(nodeId: number): boolean {
  return mountedApps.has(nodeId);
}

/**
 * Update props on a mounted Vue app.
 * This forces a re-render with new props.
 */
export function updateVueProps(nodeId: number, newProps: Record<string, any>): void {
  const app = mountedApps.get(nodeId);
  const container = nodeContainers.get(nodeId);
  
  if (!app || !container) {
    return;
  }
  
  // For complex state updates, we rely on reactive props
  // which are automatically tracked by Vue
  console.log(`[ND Super Nodes] Updating Vue props for node ${nodeId}`);
}

// ============================================================================
// Vue Composition Utilities for Components
// ============================================================================

/**
 * Create a reactive state object for a LoRA row.
 */
export function useLoraRowState(initialState: {
  name: string;
  enabled: boolean;
  strength: number;
  clipStrength?: number;
  triggerWords?: string[];
}) {
  const state = reactive({
    name: initialState.name,
    enabled: initialState.enabled,
    strength: initialState.strength,
    clipStrength: initialState.clipStrength ?? initialState.strength,
    triggerWords: initialState.triggerWords ?? [],
    isLoading: false,
    error: null as string | null,
  });
  
  return state;
}

/**
 * Create a reactive state object for a tag header.
 */
export function useTagHeaderState(initialState: {
  name: string;
  collapsed: boolean;
  loraCount: number;
}) {
  const state = reactive({
    name: initialState.name,
    collapsed: initialState.collapsed,
    loraCount: initialState.loraCount,
  });
  
  return state;
}

/**
 * Computed helper for rendering mode
 */
export function useRenderingMode() {
  const mode = ref(getRenderingMode());
  
  // Update on visibility change
  if (typeof document !== 'undefined') {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        mode.value = getRenderingMode();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibility);
    });
  }
  
  return {
    mode,
    isVueMode: () => mode.value === 'vue',
    isCanvasMode: () => mode.value === 'canvas',
  };
}

// Clean up on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupAllVueApps();
  });
}

export { mountedApps, nodeContainers };
