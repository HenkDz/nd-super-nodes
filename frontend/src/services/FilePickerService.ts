/**
 * Generic File Picker Service
 * Provides enhanced file selection with overlay, filters, and multi-select
 * Works with different file types (models, VAEs, LoRAs, etc.)
 */

import { OverlayService } from '@/services/OverlayService';

export interface FileTypeConfig {
  folderName: string;           // ComfyUI folder name (e.g., "checkpoints", "vae", "loras")
  displayName: string;          // Human-readable name (e.g., "Models", "VAEs", "LoRAs")
  fileExtensions: string[];     // Supported file extensions
  icon?: string;                // Optional icon
  placeholder?: string;         // Search placeholder text
}

export interface FileItem {
  id: string;                   // Full path relative to ComfyUI
  label: string;                // Display name (filename without extension)
  path: string;                 // Directory path
  filename: string;             // Just the filename
  extension: string;            // File extension
  size?: number;                // File size in bytes
  modified?: number;            // Last modified timestamp
}

export class FilePickerService {
  private static instance: FilePickerService;
  private fileCache: Map<string, FileItem[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

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
      const files: FileItem[] = data.files?.map((file: any) => ({
        id: file.path,
        label: file.name.replace(/\.(ckpt|pt|pt2|bin|pth|safetensors|pkl|sft)$/i, ''),
        path: file.path,
        filename: file.name,
        extension: file.extension || '',
        size: file.size,
        modified: file.modified
      })) || [];

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
