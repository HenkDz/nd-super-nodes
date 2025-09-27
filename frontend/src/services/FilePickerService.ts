/**
 * Generic File Picker Service
 * Provides enhanced file selection with overlay, filters, and multi-select
 * Works with different file types (models, VAEs, LoRAs, etc.)
 */

import { OverlayService } from '@/services/OverlayService';
import { LoraService } from '@/services/LoraService';

export interface FileTypeConfig {
  folderName: string;           // ComfyUI folder name (e.g., "checkpoints", "vae", "loras")
  displayName: string;          // Human-readable name (e.g., "Models", "VAEs", "LoRAs")
  fileExtensions: string[];     // Supported file extensions
  icon?: string;                // Optional icon
  placeholder?: string;         // Search placeholder text
}

export interface FileItem {
  id: string;                   // Value applied to LiteGraph widget (relative path)
  label: string;                // Display name (filename without extension)
  path: string;                 // Relative path (matches ComfyUI combo values)
  fullPath: string;             // Absolute path on disk
  filename: string;             // Just the filename
  extension: string;            // File extension
  size?: number;                // File size in bytes
  modified?: number;            // Last modified timestamp
}

export class FilePickerService {
  private static instance: FilePickerService;
  private fileCache: Map<string, FileItem[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private static readonly REFRESH_DEBOUNCE_MS = 400;
  private lastRefreshTimestamp = 0;
  private pendingLoraRefresh: Promise<void> | null = null;
  private readonly handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (!this.isRefreshHotkey(event)) {
      return;
    }
    this.onExternalRefresh('hotkey:R');
  };
  private readonly handleManualRefreshEvent: EventListener = () => {
    this.onExternalRefresh('event:nd-super-nodes:refresh-files');
  };

  private constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    this.setupGlobalRefreshListeners();
  }

  // Supported file types
  private static readonly FILE_TYPES: Record<string, FileTypeConfig> = {
    models: {
      folderName: 'checkpoints',
      displayName: 'Models',
      fileExtensions: ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft'],
      icon: '🏗️',
      placeholder: 'Search models...'
    },
    vae: {
      folderName: 'vae',
      displayName: 'VAEs',
      fileExtensions: ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft'],
      icon: '🎨',
      placeholder: 'Search VAEs...'
    },
    loras: {
      folderName: 'loras',
      displayName: 'LoRAs',
      fileExtensions: ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft'],
      icon: '🏷️',
      placeholder: 'Search LoRAs...'
    },
    text_encoders: {
      folderName: 'text_encoders',
      displayName: 'Text Encoders',
      fileExtensions: ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft'],
      icon: '📝',
      placeholder: 'Search text encoders...'
    },
    diffusion_models: {
      folderName: 'diffusion_models',
      displayName: 'Diffusion Models',
      fileExtensions: ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft'],
      icon: '🧠',
      placeholder: 'Search diffusion models...'
    },
    gguf_unet_models: {
      folderName: 'unet',
      displayName: 'UNET GGUF Models',
      fileExtensions: ['.gguf'],
      icon: '🧠',
      placeholder: 'Search GGUF UNET models...'
    },
    controlnet: {
      folderName: 'controlnet',
      displayName: 'ControlNets',
      fileExtensions: ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft'],
      icon: '🎛️',
      placeholder: 'Search ControlNets...'
    },
    upscale_models: {
      folderName: 'upscale_models',
      displayName: 'Upscale Models',
      fileExtensions: ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft'],
      icon: '🔍',
      placeholder: 'Search upscale models...'
    }
  };

  static getInstance(): FilePickerService {
    if (!FilePickerService.instance) {
      FilePickerService.instance = new FilePickerService();
    }
    return FilePickerService.instance;
  }

  private setupGlobalRefreshListeners(): void {
    try {
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('keydown', this.handleGlobalKeyDown, true);
      }

      window.addEventListener('nd-super-nodes:refresh-files', this.handleManualRefreshEvent);
    } catch (error) {
      console.warn('ND Super Nodes: failed to attach refresh listeners', error);
    }

    this.tryHookComfyRefreshFunctions();
  }

  private tryHookComfyRefreshFunctions(attempt = 0): void {
    const hooked =
      this.patchRefreshFunctions((window as any)?.app, 'app') ||
      this.patchRefreshFunctions((window as any)?.api, 'api') ||
      this.patchRefreshFunctions((window as any)?.ui, 'ui');

    if (hooked || attempt >= 20) {
      return;
    }

    setTimeout(() => this.tryHookComfyRefreshFunctions(attempt + 1), 250 * Math.max(1, attempt + 1));
  }

  private patchRefreshFunctions(source: any, sourceName: string): boolean {
    if (!source || typeof source !== 'object') {
      return false;
    }

    const marker = '__ndSuperNodesRefreshWrapped';
    const service = this;
    const seen = new Set<string>();
    let hookedAny = false;

    let cursor: any = source;
    while (cursor && cursor !== Object.prototype && cursor !== Function.prototype) {
      const keys = Object.getOwnPropertyNames(cursor);
      for (const key of keys) {
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        if (!/refresh/i.test(key) || key === marker) {
          continue;
        }

        const original = (source as any)[key];
        if (typeof original !== 'function' || original[marker]) {
          continue;
        }

        const wrapped = function(this: any, ...args: any[]) {
          try {
            service.onExternalRefresh(`${sourceName}.${key}`);
          } catch (error) {
            console.warn('ND Super Nodes: refresh hook error', error);
          }
          return original.apply(this, args);
        };
        (wrapped as any)[marker] = true;

        const descriptor = Object.getOwnPropertyDescriptor(source, key);
        if (descriptor && 'value' in descriptor) {
          Object.defineProperty(source, key, {
            ...descriptor,
            value: wrapped,
          });
        } else {
          (source as any)[key] = wrapped;
        }

        hookedAny = true;
      }
      cursor = Object.getPrototypeOf(cursor);
    }

    return hookedAny;
  }

  private isRefreshHotkey(event: KeyboardEvent): boolean {
    if (!event || event.repeat) {
      return false;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    const key = event.key?.toLowerCase();
    if (key !== 'r') {
      return false;
    }

    const target = event.target as EventTarget | null;
    if (this.isInteractiveElement(target)) {
      return false;
    }

    return true;
  }

  private isInteractiveElement(target: EventTarget | null): boolean {
    if (!target || typeof window === 'undefined') {
      return false;
    }

    if (target instanceof HTMLElement) {
      if (target.isContentEditable) {
        return true;
      }

      const interactiveTags = ['INPUT', 'TEXTAREA', 'SELECT'];
      if (interactiveTags.includes(target.tagName)) {
        return true;
      }

      const role = target.getAttribute?.('role');
      if (role && ['textbox', 'combobox', 'searchbox'].includes(role)) {
        return true;
      }
    }

    return false;
  }

  private onExternalRefresh(trigger: string): void {
    const now = Date.now();
    if (now - this.lastRefreshTimestamp < FilePickerService.REFRESH_DEBOUNCE_MS) {
      return;
    }
    this.lastRefreshTimestamp = now;

    this.clearCache();
    this.triggerLinkedServiceRefresh();

    try {
      window.dispatchEvent(new CustomEvent('nd-super-nodes:files-refreshed', { detail: { trigger } }));
    } catch (error) {
      // Intentionally ignored: overlay event dispatch failures are non-critical
      // Uncomment below for debug logging if needed
      // console.debug('ND Super Nodes: files-refreshed event dispatch error', error);
    }
  }

  private triggerLinkedServiceRefresh(): void {
    try {
      const loraService = LoraService.getInstance();
      if (!loraService || typeof loraService.refreshLoraList !== 'function') {
        return;
      }

      if (this.pendingLoraRefresh) {
        return;
      }

      this.pendingLoraRefresh = Promise.resolve(loraService.refreshLoraList())
        .catch((error) => {
          console.warn('ND Super Nodes: Failed to refresh LoRA list after global refresh', error);
        })
        .finally(() => {
          this.pendingLoraRefresh = null;
        });
    } catch (error) {
      console.warn('ND Super Nodes: LoRA refresh hook failed', error);
    }
  }

  static getSupportedFileTypes(): Record<string, FileTypeConfig> {
    return this.FILE_TYPES;
  }

  /**
   * Get files for a specific file type
   */
  async getFilesForType(fileType: string): Promise<FileItem[]> {
    const config = FilePickerService.FILE_TYPES[fileType];
    if (!config) {
      throw new Error(`Unknown file type: ${fileType}`);
    }

    // Check cache first (5 minute expiry)
    const cacheKey = `files_${fileType}`;
    const cached = this.getCachedFiles(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Fetch from our API endpoint (prefer GET for broader server compatibility)
      const params = new URLSearchParams();
      params.set('folder_name', config.folderName);
      params.set('extensions', config.fileExtensions.join(','));
      // Prefer our aiohttp route under /super_lora/files; fallback to /superlora/files for legacy
      let response = await fetch(`/super_lora/files?${params.toString()}`, { method: 'GET' });
      if (!response.ok) {
        response = await fetch(`/superlora/files?${params.toString()}`, { method: 'GET' });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }

      const data = await response.json();
      const files: FileItem[] = data.files?.map((file: any) => {
        const relativePath: string = file.relative_path || file.path;
        return {
          id: relativePath,
          label: file.name.replace(/\.(ckpt|pt|pt2|bin|pth|safetensors|pkl|sft|gguf)$/i, ''),
          path: relativePath,
          fullPath: file.path,
          filename: file.name,
          extension: file.extension || '',
          size: file.size,
          modified: file.modified
        } as FileItem;
      }) || [];

      // Cache the results
      this.setCachedFiles(cacheKey, files);
      return files;
    } catch (error) {
      console.error(`Error fetching ${fileType} files:`, error);
      return [];
    }
  }

  /**
   * Show enhanced file picker overlay
   */
  showFilePicker(
    fileType: string,
    onSelect: (file: FileItem) => void,
    options: {
      title?: string;
      multiSelect?: boolean;
      onMultiSelect?: (files: FileItem[]) => void;
      currentValue?: string;
    } = {}
  ): void {
    const config = FilePickerService.FILE_TYPES[fileType];
    if (!config) {
      throw new Error(`Unknown file type: ${fileType}`);
    }

    const {
      title = `Select ${config.displayName}`,
      multiSelect = false,
      onMultiSelect,
      currentValue
    } = options;

    this.getFilesForType(fileType).then(files => {
      const items = files.map(file => ({
        id: file.id,
        label: file.label,
        disabled: currentValue === file.id
      }));

      const overlay = OverlayService.getInstance();
      // Compute folder chips from first path segment of relative path
      const topFolders = Array.from(new Set(
        files.map(file => {
          const rel = file.path || '';
          const parts = rel.split(/[\\/]/);
          return parts.length > 1 ? parts[0] : '__ROOT__';
        })
      ));

      overlay.showSearchOverlay({
        title,
        placeholder: config.placeholder || `Search ${config.displayName.toLowerCase()}...`,
        items,
        allowCreate: false,
        enableMultiToggle: multiSelect,
        onChoose: (id: string) => {
          const file = files.find(f => f.id === id);
          if (file) {
            onSelect(file);
          }
        },
        onChooseMany: onMultiSelect ? (ids: string[]) => {
          const selectedFiles = ids.map(id => files.find(f => f.id === id)).filter(Boolean) as FileItem[];
          if (onMultiSelect && selectedFiles.length > 0) {
            onMultiSelect(selectedFiles);
          }
        } : undefined,
        folderChips: topFolders,
        baseFolderName: config.folderName,
        currentValue,
        rightActions: []
      });
    }).catch(error => {
      console.error('Failed to load file picker:', error);
      OverlayService.getInstance().showToast(`Failed to load ${config.displayName.toLowerCase()}`, 'error');
    });
  }

  /**
   * Cache management
   */
  private getCachedFiles(key: string): FileItem[] | null {
    const cacheTime = this.cacheTimestamps.get(key);
    if (!cacheTime) return null;

    // Cache expires after 5 minutes
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    if (cacheTime < fiveMinutesAgo) {
      this.fileCache.delete(key);
      this.cacheTimestamps.delete(key);
      return null;
    }

    return this.fileCache.get(key) || null;
  }

  private setCachedFiles(key: string, files: FileItem[]): void {
    this.fileCache.set(key, files);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.fileCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Refresh cache for specific file type
   */
  async refreshFileType(fileType: string): Promise<void> {
    const cacheKey = `files_${fileType}`;
    this.fileCache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
    await this.getFilesForType(fileType);
  }
}
