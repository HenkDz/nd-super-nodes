/**
 * Utils module index
 * 
 * Exports all utility functions for Nodes 2.0 migration support.
 */

// Feature detection
export {
  isNodes2Enabled,
  isLiteGraphMode,
  getRenderingMode,
  getCachedRenderingMode,
  clearRenderingModeCache,
  onRenderingModeChange,
  getNodes2Capabilities,
  type RenderingMode,
  type Nodes2Capabilities,
} from './nodes2-detection';

// Render mode utilities
export {
  rendererRegistry,
  createDualModeWidget,
  whenMode,
  inCanvasMode,
  inVueMode,
  modeSwitch,
  ModeSwitch,
  type DualModeRenderer,
  type RenderBounds,
} from './render-mode';
