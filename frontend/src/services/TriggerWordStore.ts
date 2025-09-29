/**
 * Simple local persistence for manual trigger words keyed by LoRA filename.
 * Prevents re-fetching from CivitAI when the user has supplied their own.
 * 
 * Also provides runtime storage for active trigger words from Super LoRA Loader
 * to be consumed by Super Prompt Builder.
 */

import type { PromptVariable } from '@/types';

const STORAGE_KEY = 'super_lora_manual_triggers_v1';
const ACTIVE_TRIGGER_WORDS_KEY = 'super_lora_active_trigger_words';

// Runtime storage for current active trigger words (not persisted)
let activeTriggerWords: string = '';
let triggerWordVariables: PromptVariable[] = [];

function readStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeStore(map: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Parse trigger words string into variables
 */
function parseTriggerWordsToVariables(triggerWords: string): PromptVariable[] {
  if (!triggerWords || !triggerWords.trim()) {
    return [];
  }

  const triggers = triggerWords.split(',').map(t => t.trim()).filter(Boolean);
  const variables: PromptVariable[] = [];

  triggers.forEach((trigger, index) => {
    // Create indexed variable (trigger.1, trigger.2, etc.)
    variables.push({
      key: `trigger.${index + 1}`,
      value: trigger,
      source: 'lora',
      label: `Trigger ${index + 1}: ${trigger}`
    });

    // Create named variable if possible (first word as key)
    const firstWord = trigger.split(/\s+/)[0];
    if (firstWord && /^[a-zA-Z]\w*$/.test(firstWord)) {
      variables.push({
        key: `trigger.${firstWord.toLowerCase()}`,
        value: trigger,
        source: 'lora',
        label: `Trigger (${firstWord}): ${trigger}`
      });
    }
  });

  // Add special variable for all triggers
  if (triggers.length > 0) {
    variables.push({
      key: 'trigger.all',
      value: triggers.join(', '),
      source: 'lora',
      label: 'All Triggers'
    });
  }

  return variables;
}

export const TriggerWordStore = {
  // ========== Manual Trigger Words (Persisted) ==========

  get(loraFileName: string): string | null {
    if (!loraFileName) return null;
    const map = readStore();
    const val = map[loraFileName];
    return typeof val === 'string' && val.trim().length ? val : null;
  },

  set(loraFileName: string, triggerWords: string): void {
    if (!loraFileName) return;
    const map = readStore();
    if (typeof triggerWords === 'string' && triggerWords.trim().length) {
      map[loraFileName] = triggerWords.trim();
    } else {
      delete map[loraFileName];
    }
    writeStore(map);
  },

  remove(loraFileName: string): void {
    if (!loraFileName) return;
    const map = readStore();
    if (map[loraFileName] !== undefined) {
      delete map[loraFileName];
      writeStore(map);
    }
  },

  // ========== Active Trigger Words (Runtime) ==========

  /**
   * Set the currently active trigger words from Super LoRA Loader output
   */
  setActiveTriggerWords(triggerWords: string): void {
    activeTriggerWords = triggerWords || '';
    triggerWordVariables = parseTriggerWordsToVariables(activeTriggerWords);
    
    // Also store in sessionStorage for cross-tab awareness
    try {
      sessionStorage.setItem(ACTIVE_TRIGGER_WORDS_KEY, activeTriggerWords);
    } catch {}

    console.log(`TriggerWordStore: Set active trigger words (${triggerWordVariables.length} variables)`);
  },

  /**
   * Get the currently active trigger words
   */
  getActiveTriggerWords(): string {
    return activeTriggerWords;
  },

  /**
   * Get trigger words as prompt variables
   */
  getTriggerWordVariables(): PromptVariable[] {
    return [...triggerWordVariables];
  },

  /**
   * Check if there are active trigger words
   */
  hasActiveTriggerWords(): boolean {
    return activeTriggerWords.trim().length > 0;
  },

  /**
   * Clear active trigger words
   */
  clearActiveTriggerWords(): void {
    activeTriggerWords = '';
    triggerWordVariables = [];
    try {
      sessionStorage.removeItem(ACTIVE_TRIGGER_WORDS_KEY);
    } catch {}
  },

  /**
   * Restore active trigger words from sessionStorage (on page reload)
   */
  restoreActiveTriggerWords(): void {
    try {
      const stored = sessionStorage.getItem(ACTIVE_TRIGGER_WORDS_KEY);
      if (stored) {
        this.setActiveTriggerWords(stored);
      }
    } catch {}
  }
};


