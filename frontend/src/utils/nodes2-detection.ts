/**
 * Nodes 2.0 Feature Detection
 * 
 * Utilities for detecting whether ComfyUI is running in Nodes 2.0 (Vue-based) mode
 * or legacy LiteGraph Canvas mode.
 */

/**
 * Check if Nodes 2.0 (Vue-based rendering) is enabled in ComfyUI.
 * 
 * Detection strategy:
 * 1. Check for official Nodes 2.0 global flag
 * 2. Check for Vue runtime indicators
 * 3. Check ComfyUI app settings
 * 4. Check for Vue-specific DOM structure
 */
export function isNodes2Enabled(): boolean {
  try {
    // Method 1: Official flag (if ComfyUI exposes it)
    const win = window as any;
    if (typeof win.__COMFYUI_NODES_2_ENABLED__ === 'boolean') {
      return win.__COMFYUI_NODES_2_ENABLED__;
    }
    
    // Method 2: Check app.extensionManager for Nodes 2.0 specific APIs
    const app = win.app;
    if (app?.extensionManager?.nodeComponents) {
      return true;
    }
    
    // Method 3: Check settings for Nodes 2.0 toggle
    if (app?.ui?.settings) {
      const nodes2Setting = app.ui.settings.getSettingValue?.('Comfy.UseNodes2', null);
      if (nodes2Setting === true) {
        return true;
      }
      // Also check alternate setting names
      const nodes2AltSetting = app.ui.settings.getSettingValue?.('Comfy.Nodes2.Enabled', null);
      if (nodes2AltSetting === true) {
        return true;
      }
    }
    
    // Method 4: Check for Vue app mount point in DOM
    if (typeof document !== 'undefined') {
      const vueRoot = document.querySelector('[data-v-app]') || 
                      document.querySelector('#comfyui-vue-app') ||
                      document.querySelector('.comfy-vue-nodes');
      if (vueRoot) {
        return true;
      }
    }
    
    // Method 5: Check for Vue runtime on window
    if (win.Vue || win.__VUE__) {
      // Vue exists, but might not mean Nodes 2.0 is active
      // Check for ComfyUI-specific Vue usage
      if (win.__COMFYUI_VUE_NODES__) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('[ND Super Nodes] Error detecting Nodes 2.0 mode:', error);
    return false;
  }
}

/**
 * Check if the LiteGraph canvas is available and being used for rendering.
 */
export function isLiteGraphMode(): boolean {
  return !isNodes2Enabled();
}

/**
 * Get the current rendering mode.
 */
export type RenderingMode = 'canvas' | 'vue';

export function getRenderingMode(): RenderingMode {
  return isNodes2Enabled() ? 'vue' : 'canvas';
}

/**
 * Cache for rendering mode to avoid repeated detection.
 * Reset on visibility change in case user toggles mode.
 */
let cachedMode: RenderingMode | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

export function getCachedRenderingMode(): RenderingMode {
  const now = Date.now();
  if (cachedMode && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedMode;
  }
  cachedMode = getRenderingMode();
  cacheTimestamp = now;
  return cachedMode;
}

/**
 * Clear the cached rendering mode (e.g., when settings change).
 */
export function clearRenderingModeCache(): void {
  cachedMode = null;
  cacheTimestamp = 0;
}

/**
 * Watch for rendering mode changes (settings toggle).
 * Calls the callback when mode might have changed.
 */
export function onRenderingModeChange(callback: (mode: RenderingMode) => void): () => void {
  const app = (window as any).app;
  
  // Listen for settings changes
  const handleSettingsChange = () => {
    const oldMode = cachedMode;
    clearRenderingModeCache();
    const newMode = getCachedRenderingMode();
    if (oldMode !== newMode) {
      callback(newMode);
    }
  };
  
  // Try to hook into ComfyUI settings system
  if (app?.ui?.settings) {
    try {
      const originalSet = app.ui.settings.setSettingValue?.bind(app.ui.settings);
      if (typeof originalSet === 'function') {
        app.ui.settings.setSettingValue = function(key: string, value: any) {
          const result = originalSet(key, value);
          if (key.toLowerCase().includes('nodes2') || key.toLowerCase().includes('vue')) {
            setTimeout(handleSettingsChange, 100);
          }
          return result;
        };
      }
    } catch {}
  }
  
  // Also listen for visibility changes (user might toggle in another tab)
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      setTimeout(handleSettingsChange, 200);
    }
  };
  
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibility);
  }
  
  // Return cleanup function
  return () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  };
}

/**
 * Get detailed capability information for the current mode.
 */
export interface Nodes2Capabilities {
  mode: RenderingMode;
  hasVueComponents: boolean;
  hasCanvasWidgets: boolean;
  hasNodeComponentRegistry: boolean;
  hasReactiveState: boolean;
  version: string | null;
}

export function getNodes2Capabilities(): Nodes2Capabilities {
  const app = (window as any).app;
  const mode = getRenderingMode();
  
  return {
    mode,
    hasVueComponents: mode === 'vue',
    hasCanvasWidgets: mode === 'canvas',
    hasNodeComponentRegistry: !!(app?.extensionManager?.nodeComponents),
    hasReactiveState: !!(window as any).Vue || !!(window as any).__VUE__,
    version: (window as any).__COMFYUI_NODES_2_VERSION__ || null
  };
}

// Log detection result on load (for debugging)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const mode = getRenderingMode();
    console.log(`[ND Super Nodes] Rendering mode detected: ${mode}`);
  }, 1000);
}
