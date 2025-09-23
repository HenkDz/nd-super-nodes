/**
 * TagSetService
 * Simple persistent store for available tag names.
 * Uses localStorage for persistence and provides basic CRUD operations.
 */

export class TagSetService {
  private static instance: TagSetService | null = null;
  private static readonly STORAGE_KEY = 'superlora_tagset_v1';
  private static readonly DEFAULT_TAGS = ['General', 'Character', 'Style', 'Quality', 'Effect'];

  static getInstance(): TagSetService {
    if (!TagSetService.instance) {
      TagSetService.instance = new TagSetService();
    }
    return TagSetService.instance;
  }

  private read(): string[] {
    try {
      const raw = localStorage.getItem(TagSetService.STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return this.normalize(arr);
      }
    } catch {}
    // Initialize with defaults
    this.write(TagSetService.DEFAULT_TAGS);
    return [...TagSetService.DEFAULT_TAGS];
  }

  private write(tags: string[]): void {
    try {
      const unique = this.normalize(tags);
      localStorage.setItem(TagSetService.STORAGE_KEY, JSON.stringify(unique));
    } catch {}
  }

  private normalize(tags: string[]): string[] {
    const set = new Set<string>();
    for (const t of tags) {
      const name = String(t || '').trim();
      if (!name) continue;
      set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  getAll(): string[] {
    return this.read();
  }

  addTag(name: string): boolean {
    const n = String(name || '').trim();
    if (!n) return false;
    const tags = this.read();
    if (tags.includes(n)) return false;
    tags.push(n);
    this.write(tags);
    return true;
  }

  renameTag(oldName: string, newName: string): boolean {
    const src = String(oldName || '').trim();
    const dst = String(newName || '').trim();
    if (!src || !dst || src === dst) return false;
    const tags = this.read();
    const idx = tags.indexOf(src);
    if (idx === -1) return false;
    // Avoid duplicates on rename
    if (!tags.includes(dst)) {
      tags[idx] = dst;
    } else {
      tags.splice(idx, 1);
    }
    this.write(tags);
    return true;
  }

  deleteTag(name: string): boolean {
    const n = String(name || '').trim();
    if (!n) return false;
    const tags = this.read();
    const idx = tags.indexOf(n);
    if (idx === -1) return false;
    tags.splice(idx, 1);
    // Ensure fallback exists
    if (!tags.includes('General')) tags.push('General');
    this.write(tags);
    return true;
  }
}


