/**
 * Simple local persistence for manual trigger words keyed by LoRA filename.
 * Prevents re-fetching from CivitAI when the user has supplied their own.
 */

const STORAGE_KEY = 'super_lora_manual_triggers_v1';

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

export const TriggerWordStore = {
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
  }
};


