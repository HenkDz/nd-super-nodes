/**
 * Type definitions for Super LoRA Loader
 */

export interface LoraConfig {
  /** LoRA filename */
  lora: string;
  /** Whether this LoRA is enabled */
  enabled: boolean;
  /** Model strength (0.0 to 2.0) */
  strength_model: number;
  /** CLIP strength (0.0 to 2.0, defaults to model strength) */
  strength_clip: number;
  /** Trigger words for this LoRA */
  trigger_word: string;
  /** Tag/category for organization */
  tag: string;
  /** Whether trigger word was auto-populated */
  auto_populated: boolean;
}

export interface LoraTemplate {
  /** Template name */
  name: string;
  /** Template version */
  version: string;
  /** List of LoRA configurations */
  loras: LoraConfig[];
  /** Creation timestamp */
  created_at: string;
}

export interface TagGroup {
  /** Tag name */
  tag: string;
  /** Whether the group is collapsed */
  collapsed: boolean;
  /** LoRAs in this group */
  loras: LoraConfig[];
}

export interface SuperLoraSettings {
  /** Auto-fetch trigger words from CivitAI */
  autoFetchTriggerWords: boolean;
  /** Enable tag system */
  enableTags: boolean;
  /** Show separate model/clip strengths */
  showSeparateStrengths: boolean;
  /** Enable template system */
  enableTemplates: boolean;
  /** Enable LoRA deletion */
  enableDeletion: boolean;
  /** Enable sorting/reordering */
  enableSorting: boolean;
}

export interface CivitAiModelInfo {
  /** Model ID */
  id: number;
  /** Model name */
  name: string;
  /** Trained words/trigger words */
  trainedWords: string[] | { word: string; count?: number }[];
  /** Model description */
  description?: string;
}

// ComfyUI type augmentations
declare global {
  interface Window {
    app: any;
    api: any;
    ui: any;
  }
}

// Widget-related types
export interface WidgetOptions {
  name: string;
  value?: any;
  callback?: (value: any) => void;
  options?: any;
}

export interface LoraWidgetValue extends LoraConfig {
  // Widget-specific properties
}

export interface TagHeaderWidgetValue {
  tag: string;
  collapsed: boolean;
  count: number;
}

// ============================================
// Shared State Types for Dual Rendering
// These types are used by both Canvas and Vue renderers
// ============================================

/**
 * Shared state for a single LoRA widget row
 * This state is serialized and synchronized between rendering modes
 */
export interface LoraWidgetState {
  /** Unique identifier for this widget instance */
  id: string;
  /** The LoRA configuration data */
  config: LoraConfig;
  /** UI-specific state (not persisted to workflow) */
  ui: {
    /** Whether this row is expanded to show details */
    expanded: boolean;
    /** Whether the widget is hovered */
    hovered: boolean;
    /** Whether any part of this widget is being dragged */
    dragging: boolean;
    /** Loading state for async operations */
    loading: boolean;
    /** Error message if any */
    error?: string;
  };
}

/**
 * Shared state for tag header widget
 */
export interface TagHeaderState {
  /** The tag name */
  tag: string;
  /** Whether the group is collapsed */
  collapsed: boolean;
  /** Number of LoRAs in this group */
  count: number;
  /** UI-specific state */
  ui: {
    hovered: boolean;
    dragOver: boolean;
  };
}

/**
 * Shared state for the entire SuperLoraNode
 * This represents the complete widget tree state
 */
export interface SuperLoraNodeState {
  /** All LoRA configurations, grouped by tag */
  groups: TagGroup[];
  /** Node-level settings */
  settings: SuperLoraSettings;
  /** Active template name, if any */
  activeTemplate?: string;
  /** UI state for the whole node */
  ui: {
    /** Search/filter query */
    filterQuery: string;
    /** Whether the add panel is open */
    addPanelOpen: boolean;
    /** Selected LoRA indices for bulk operations */
    selectedIndices: Set<number>;
    /** Index of LoRA being dragged, if any */
    dragSourceIndex?: number;
    /** Index of drop target, if any */
    dropTargetIndex?: number;
  };
}

/**
 * Event types for state changes
 * Used to synchronize state between Canvas and Vue renderers
 */
export type StateChangeEvent<T> = {
  type: 'state-change';
  source: 'canvas' | 'vue';
  timestamp: number;
  payload: Partial<T>;
};

/**
 * Widget action types for unified event handling
 */
export type WidgetAction =
  | { type: 'toggle-enabled'; loraId: string }
  | { type: 'update-strength'; loraId: string; field: 'model' | 'clip'; value: number }
  | { type: 'update-trigger'; loraId: string; value: string }
  | { type: 'delete-lora'; loraId: string }
  | { type: 'reorder-lora'; fromIndex: number; toIndex: number }
  | { type: 'toggle-tag'; tag: string }
  | { type: 'add-lora'; config: LoraConfig }
  | { type: 'load-template'; name: string }
  | { type: 'save-template'; name: string }
  | { type: 'clear-all' };

/**
 * Dispatch function type for widget actions
 */
export type WidgetDispatch = (action: WidgetAction) => void;

// Node-related types
export interface SuperLoraNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  widgets: any[];
  inputs: any[];
  outputs: any[];
  size: [number, number];
  serialize(): any;
  configure(data: any): void;
  addWidget(type: string, name: string, value: any, callback?: any, options?: any): any;
  removeWidget(index: number): void;
  setDirtyCanvas(fg: boolean, bg: boolean): void;
}

export interface ComfyExtension {
  name: string;
  version?: string;
  settings?: Array<{
    id: string;
    name: string;
    type: string;
    defaultValue: any;
  }>;
  commands?: Array<{
    id: string;
    label: string;
    function: () => void;
  }>;
  init?(): void | Promise<void>;
  beforeRegisterNodeDef?(nodeType: any, nodeData: any): void;
  nodeCreated?(node: SuperLoraNode): void;
  beforeConfigureGraph?(graphData: any): void;
  afterConfigureGraph?(graphData: any): void;
  // Custom helper we attach at runtime in our extension implementation
  setupNodeEventHandlers?(node: any): void;
}
