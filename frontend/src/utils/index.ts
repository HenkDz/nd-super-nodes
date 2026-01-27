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

// Canvas drawing utilities
export {
  THEME,
  drawRoundedRect,
  drawToggle,
  drawButton,
  drawStrengthBox,
  drawIconButton,
  drawStatusIndicator,
  truncateText,
  calculateRowLayout,
  type LayoutConfig,
  type LayoutResult,
} from './canvas-drawing';

// State synchronization
export {
  StateStore,
  toLoraWidgetState,
  toTagHeaderState,
  fromLoraWidgetState,
  getStoreForNode,
  createDispatch,
  useNodeState,
} from './state-sync';

// Vue integration (Nodes 2.0)
export {
  mountVueToNode,
  unmountVueFromNode,
  cleanupAllVueApps,
  isVueMounted,
  updateVueProps,
  useLoraRowState,
  useTagHeaderState,
  useRenderingMode,
  type VueNodeConfig,
} from './vue-integration';
