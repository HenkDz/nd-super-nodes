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

// ========== Prompt Builder Types ==========

export interface PromptSegment {
  /** Unique segment ID */
  id: string;
  /** Segment type (positive, negative, or custom) */
  type: 'positive' | 'negative' | 'custom';
  /** Segment text content */
  text: string;
  /** Whether this segment is enabled */
  enabled: boolean;
  /** Weight/strength for this segment (default 1.0) */
  weight: number;
  /** Tag/category for organization */
  tag?: string;
  /** Custom variables defined in this segment */
  variables?: Record<string, string>;
  /** Order/position in the list */
  order?: number;
}

export interface PromptVariable {
  /** Variable key (e.g., "character", "trigger.1") */
  key: string;
  /** Variable value/content */
  value: string;
  /** Source of the variable (lora, user, wildcard) */
  source: 'lora' | 'user' | 'wildcard';
  /** Display label */
  label?: string;
}

export interface PromptHistoryEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Positive prompt text */
  positive: string;
  /** Negative prompt text */
  negative: string;
  /** Original segments used */
  segments: PromptSegment[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface PromptFavorite {
  /** Unique favorite ID */
  id: string;
  /** User-friendly name */
  name: string;
  /** Timestamp */
  timestamp: string;
  /** Positive prompt text */
  positive: string;
  /** Negative prompt text */
  negative: string;
  /** Original segments */
  segments: PromptSegment[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface PromptTemplate {
  /** Template name */
  name: string;
  /** Template segments */
  segments: PromptSegment[];
  /** Creation timestamp */
  timestamp: string;
}

export interface PromptBuilderSettings {
  /** Auto-save to history */
  autoSaveHistory: boolean;
  /** Enable variables system */
  enableVariables: boolean;
  /** Show token counter */
  showTokenCounter: boolean;
  /** Enable tag system */
  enableTags: boolean;
  /** Auto-import LoRA trigger words */
  autoImportTriggerWords: boolean;
  /** Variable format preference (mustache, dollar, curly) */
  variableFormat: 'mustache' | 'dollar' | 'curly';
}
