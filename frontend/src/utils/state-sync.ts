/**
 * State Synchronization Layer
 *
 * Provides a unified state management system that works in both
 * Canvas and Vue rendering modes. This ensures state consistency
 * when transitioning between modes and provides clean serialization
 * for workflow saving.
 */

import {
  type LoraConfig,
  type TagGroup,
  type SuperLoraSettings,
  type LoraWidgetState,
  type TagHeaderState,
  type SuperLoraNodeState,
  type WidgetAction,
} from '@/types';
import { getRenderingMode } from './nodes2-detection';

// ============================================
// State Store
// ============================================

type StateListener = (state: SuperLoraNodeState) => void;
type ActionMiddleware = (action: WidgetAction, state: SuperLoraNodeState) => WidgetAction | null;

/**
 * Central state store for a SuperLoraNode instance.
 * Provides reactive state management with middleware support.
 */
export class StateStore {
  private state: SuperLoraNodeState;
  private listeners: Set<StateListener> = new Set();
  private middleware: ActionMiddleware[] = [];
  private node: any;

  constructor(node: any, initialState?: Partial<SuperLoraNodeState>) {
    this.node = node;
    this.state = {
      groups: [],
      settings: {
        autoFetchTriggerWords: true,
        enableTags: false,
        showSeparateStrengths: false,
        enableTemplates: true,
        enableDeletion: true,
        enableSorting: true,
      },
      activeTemplate: undefined,
      ui: {
        filterQuery: '',
        addPanelOpen: false,
        selectedIndices: new Set(),
        dragSourceIndex: undefined,
        dropTargetIndex: undefined,
      },
      ...initialState,
    };
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<SuperLoraNodeState> {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Add middleware that can intercept/modify actions
   */
  use(middleware: ActionMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Dispatch an action to update state
   */
  dispatch(action: WidgetAction): void {
    // Run through middleware
    let processedAction: WidgetAction | null = action;
    for (const mw of this.middleware) {
      if (!processedAction) break;
      processedAction = mw(processedAction, this.state);
    }

    if (!processedAction) return;

    // Apply action to state
    this.state = this.reduce(this.state, processedAction);

    // Notify listeners
    this.notifyListeners();

    // Sync to hidden widget for serialization
    this.syncToWidget();

    // Request canvas redraw
    this.requestRedraw();
  }

  /**
   * Bulk update state (for loading from serialized data)
   */
  setState(newState: Partial<SuperLoraNodeState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
    this.syncToWidget();
    this.requestRedraw();
  }

  /**
   * State reducer - applies actions to produce new state
   */
  private reduce(state: SuperLoraNodeState, action: WidgetAction): SuperLoraNodeState {
    switch (action.type) {
      case 'toggle-enabled': {
        return this.updateLoraById(state, action.loraId, (lora) => ({
          ...lora,
          enabled: !lora.enabled,
        }));
      }

      case 'update-strength': {
        const field = action.field === 'model' ? 'strength_model' : 'strength_clip';
        return this.updateLoraById(state, action.loraId, (lora) => ({
          ...lora,
          [field]: Math.max(-10, Math.min(10, action.value)),
        }));
      }

      case 'update-trigger': {
        return this.updateLoraById(state, action.loraId, (lora) => ({
          ...lora,
          trigger_word: action.value,
          auto_populated: false,
        }));
      }

      case 'delete-lora': {
        return {
          ...state,
          groups: state.groups.map((group) => ({
            ...group,
            loras: group.loras.filter((l) => this.getLoraId(l) !== action.loraId),
          })).filter((g) => g.loras.length > 0),
        };
      }

      case 'reorder-lora': {
        const allLoras = this.flattenLoras(state);
        if (action.fromIndex < 0 || action.fromIndex >= allLoras.length) return state;
        if (action.toIndex < 0 || action.toIndex >= allLoras.length) return state;

        const [moved] = allLoras.splice(action.fromIndex, 1);
        allLoras.splice(action.toIndex, 0, moved);

        return {
          ...state,
          groups: this.groupLorasByTag(allLoras, state.settings.enableTags),
        };
      }

      case 'toggle-tag': {
        return {
          ...state,
          groups: state.groups.map((group) =>
            group.tag === action.tag
              ? { ...group, collapsed: !group.collapsed }
              : group
          ),
        };
      }

      case 'add-lora': {
        const tag = action.config.tag || 'General';
        const existingGroup = state.groups.find((g) => g.tag === tag);

        if (existingGroup) {
          return {
            ...state,
            groups: state.groups.map((group) =>
              group.tag === tag
                ? { ...group, loras: [...group.loras, action.config] }
                : group
            ),
          };
        }

        return {
          ...state,
          groups: [
            ...state.groups,
            { tag, collapsed: false, loras: [action.config] },
          ],
        };
      }

      case 'clear-all': {
        return {
          ...state,
          groups: [],
        };
      }

      default:
        return state;
    }
  }

  /**
   * Helper to update a specific LoRA by ID
   */
  private updateLoraById(
    state: SuperLoraNodeState,
    loraId: string,
    updater: (lora: LoraConfig) => LoraConfig
  ): SuperLoraNodeState {
    return {
      ...state,
      groups: state.groups.map((group) => ({
        ...group,
        loras: group.loras.map((lora) =>
          this.getLoraId(lora) === loraId ? updater(lora) : lora
        ),
      })),
    };
  }

  /**
   * Generate a unique ID for a LoRA config
   */
  private getLoraId(lora: LoraConfig): string {
    return `${lora.lora}-${lora.tag}`;
  }

  /**
   * Flatten all groups into a single LoRA array
   */
  private flattenLoras(state: SuperLoraNodeState): LoraConfig[] {
    return state.groups.flatMap((g) => g.loras);
  }

  /**
   * Group LoRAs by tag
   */
  private groupLorasByTag(loras: LoraConfig[], enableTags: boolean): TagGroup[] {
    if (!enableTags) {
      return loras.length > 0
        ? [{ tag: 'General', collapsed: false, loras }]
        : [];
    }

    const groups = new Map<string, LoraConfig[]>();
    for (const lora of loras) {
      const tag = lora.tag || 'General';
      const existing = groups.get(tag) || [];
      groups.set(tag, [...existing, lora]);
    }

    return Array.from(groups.entries()).map(([tag, loras]) => ({
      tag,
      collapsed: false,
      loras,
    }));
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('StateStore listener error:', e);
      }
    }
  }

  /**
   * Sync state to hidden widget for workflow serialization
   */
  private syncToWidget(): void {
    try {
      const loraBundleWidget = this.node.widgets?.find(
        (w: any) => w.name === 'lora_bundle'
      );
      if (loraBundleWidget) {
        const bundle = this.serializeToBundle();
        loraBundleWidget.value = JSON.stringify(bundle);
      }
    } catch (e) {
      console.error('StateStore sync error:', e);
    }
  }

  /**
   * Request canvas redraw
   */
  private requestRedraw(): void {
    try {
      this.node.setDirtyCanvas?.(true, true);
    } catch {}
  }

  /**
   * Serialize state to lora_bundle format
   */
  serializeToBundle(): { lora_configs: LoraConfig[] } {
    return {
      lora_configs: this.flattenLoras(this.state),
    };
  }

  /**
   * Load state from lora_bundle format
   */
  loadFromBundle(bundle: { lora_configs?: LoraConfig[]; loras?: LoraConfig[] }): void {
    const loras = bundle.lora_configs || bundle.loras || [];
    this.setState({
      groups: this.groupLorasByTag(loras, this.state.settings.enableTags),
    });
  }
}

// ============================================
// Widget State Adapters
// ============================================

/**
 * Convert internal LoraConfig to LoraWidgetState for Vue components
 */
export function toLoraWidgetState(
  lora: LoraConfig,
  index: number,
  ui?: Partial<LoraWidgetState['ui']>
): LoraWidgetState {
  return {
    id: `${lora.lora}-${lora.tag}-${index}`,
    config: lora,
    ui: {
      expanded: false,
      hovered: false,
      dragging: false,
      loading: false,
      ...ui,
    },
  };
}

/**
 * Convert internal TagGroup to TagHeaderState for Vue components
 */
export function toTagHeaderState(
  group: TagGroup,
  ui?: Partial<TagHeaderState['ui']>
): TagHeaderState {
  return {
    tag: group.tag,
    collapsed: group.collapsed,
    count: group.loras.length,
    ui: {
      hovered: false,
      dragOver: false,
      ...ui,
    },
  };
}

/**
 * Convert LoraWidgetState back to LoraConfig
 */
export function fromLoraWidgetState(state: LoraWidgetState): LoraConfig {
  return state.config;
}

// ============================================
// Node Integration
// ============================================

const storeMap = new WeakMap<any, StateStore>();

/**
 * Get or create a StateStore for a node instance
 */
export function getStoreForNode(node: any): StateStore {
  let store = storeMap.get(node);
  if (!store) {
    store = new StateStore(node);
    storeMap.set(node, store);
  }
  return store;
}

/**
 * Create dispatch function bound to a node's store
 */
export function createDispatch(node: any): (action: WidgetAction) => void {
  return (action) => getStoreForNode(node).dispatch(action);
}

/**
 * Hook for Vue components to subscribe to state
 */
export function useNodeState(node: any): {
  state: SuperLoraNodeState;
  dispatch: (action: WidgetAction) => void;
} {
  const store = getStoreForNode(node);
  return {
    state: store.getState() as SuperLoraNodeState,
    dispatch: createDispatch(node),
  };
}
