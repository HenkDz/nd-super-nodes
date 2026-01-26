/**
 * Render Mode Utilities
 * 
 * Provides a dual-rendering architecture that supports both:
 * - LiteGraph Canvas mode (current implementation)
 * - Nodes 2.0 Vue mode (new implementation)
 * 
 * This allows gradual migration while maintaining backwards compatibility.
 */

import { 
  getRenderingMode, 
  getCachedRenderingMode, 
  onRenderingModeChange,
  type RenderingMode 
} from './nodes2-detection';

/**
 * Interface for a dual-mode renderer.
 * Implementations provide both Canvas and Vue rendering strategies.
 */
export interface DualModeRenderer<TState> {
  /** Unique identifier for this renderer */
  id: string;
  
  /** Canvas-mode render function (existing implementation) */
  renderCanvas?: (ctx: CanvasRenderingContext2D, state: TState, node: any, bounds: RenderBounds) => void;
  
  /** Vue-mode component name or dynamic import */
  vueComponent?: string | (() => Promise<any>);
  
  /** Handle mouse events in Canvas mode */
  handleCanvasEvent?: (event: MouseEvent, state: TState, node: any, localPos: [number, number]) => boolean;
  
  /** Compute size for Canvas mode */
  computeCanvasSize?: (state: TState, node: any) => [number, number];
}

/**
 * Bounds information for rendering.
 */
export interface RenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Registry for dual-mode renderers.
 */
class RendererRegistry {
  private renderers = new Map<string, DualModeRenderer<any>>();
  private modeChangeListeners: Array<(mode: RenderingMode) => void> = [];
  private currentMode: RenderingMode;
  private initialized = false;
  
  constructor() {
    this.currentMode = 'canvas'; // Default to canvas until detected
  }
  
  /**
   * Initialize the registry and set up mode change detection.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    
    // Get initial mode
    this.currentMode = getCachedRenderingMode();
    
    // Watch for mode changes
    onRenderingModeChange((newMode) => {
      if (this.currentMode !== newMode) {
        console.log(`[ND Super Nodes] Rendering mode changed: ${this.currentMode} -> ${newMode}`);
        this.currentMode = newMode;
        this.notifyModeChange(newMode);
      }
    });
  }
  
  /**
   * Register a dual-mode renderer.
   */
  register<TState>(renderer: DualModeRenderer<TState>): void {
    if (this.renderers.has(renderer.id)) {
      console.warn(`[ND Super Nodes] Renderer "${renderer.id}" already registered, overwriting`);
    }
    this.renderers.set(renderer.id, renderer);
  }
  
  /**
   * Get a renderer by ID.
   */
  get<TState>(id: string): DualModeRenderer<TState> | undefined {
    return this.renderers.get(id);
  }
  
  /**
   * Get the current rendering mode.
   */
  getMode(): RenderingMode {
    return this.currentMode;
  }
  
  /**
   * Check if currently in Canvas mode.
   */
  isCanvasMode(): boolean {
    return this.currentMode === 'canvas';
  }
  
  /**
   * Check if currently in Vue mode.
   */
  isVueMode(): boolean {
    return this.currentMode === 'vue';
  }
  
  /**
   * Subscribe to mode changes.
   */
  onModeChange(listener: (mode: RenderingMode) => void): () => void {
    this.modeChangeListeners.push(listener);
    return () => {
      const idx = this.modeChangeListeners.indexOf(listener);
      if (idx >= 0) this.modeChangeListeners.splice(idx, 1);
    };
  }
  
  private notifyModeChange(mode: RenderingMode): void {
    for (const listener of this.modeChangeListeners) {
      try {
        listener(mode);
      } catch (error) {
        console.error('[ND Super Nodes] Error in mode change listener:', error);
      }
    }
  }
}

// Singleton registry instance
export const rendererRegistry = new RendererRegistry();

/**
 * Decorator/helper for creating components that work in both modes.
 */
export function createDualModeWidget<TState>(config: {
  id: string;
  
  /** Initial state factory */
  createState: () => TState;
  
  /** Canvas drawing implementation */
  draw?: (ctx: CanvasRenderingContext2D, state: TState, node: any, bounds: RenderBounds) => void;
  
  /** Canvas mouse handler */
  onCanvasEvent?: (event: MouseEvent, state: TState, node: any, localPos: [number, number]) => boolean;
  
  /** Canvas size computation */
  computeSize?: (state: TState, node: any) => [number, number];
  
  /** Vue component (lazy loaded) */
  vueComponent?: () => Promise<any>;
}): DualModeRenderer<TState> & { createState: () => TState } {
  const renderer: DualModeRenderer<TState> & { createState: () => TState } = {
    id: config.id,
    createState: config.createState,
    renderCanvas: config.draw,
    handleCanvasEvent: config.onCanvasEvent,
    computeCanvasSize: config.computeSize,
    vueComponent: config.vueComponent,
  };
  
  // Auto-register
  rendererRegistry.register(renderer);
  
  return renderer;
}

/**
 * Execute different code paths based on rendering mode.
 * Useful for conditional logic that differs between modes.
 */
export function whenMode<T>(options: {
  canvas: () => T;
  vue: () => T;
}): T {
  const mode = getCachedRenderingMode();
  return mode === 'canvas' ? options.canvas() : options.vue();
}

/**
 * Execute code only in Canvas mode.
 */
export function inCanvasMode<T>(fn: () => T): T | undefined {
  if (getCachedRenderingMode() === 'canvas') {
    return fn();
  }
  return undefined;
}

/**
 * Execute code only in Vue mode.
 */
export function inVueMode<T>(fn: () => T): T | undefined {
  if (getCachedRenderingMode() === 'vue') {
    return fn();
  }
  return undefined;
}

/**
 * Conditional class for mode-specific logic in objects.
 */
export class ModeSwitch<TCanvas, TVue> {
  constructor(
    private canvasValue: TCanvas,
    private vueValue: TVue
  ) {}
  
  get(): TCanvas | TVue {
    return getCachedRenderingMode() === 'canvas' ? this.canvasValue : this.vueValue;
  }
  
  getCanvas(): TCanvas {
    return this.canvasValue;
  }
  
  getVue(): TVue {
    return this.vueValue;
  }
}

/**
 * Create a mode switch instance.
 */
export function modeSwitch<TCanvas, TVue>(canvas: TCanvas, vue: TVue): ModeSwitch<TCanvas, TVue> {
  return new ModeSwitch(canvas, vue);
}

// Initialize on import
if (typeof window !== 'undefined') {
  // Delay initialization to ensure ComfyUI is loaded
  setTimeout(() => {
    rendererRegistry.initialize();
  }, 500);
}
