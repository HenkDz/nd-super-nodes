/**
 * LoRA management service
 */

import { LoraConfig } from '@/types';

export class LoraService {
  private static instance: LoraService;
  private availableLoras: string[] = [];
  private loraCache: Map<string, any> = new Map();

  static getInstance(): LoraService {
    if (!LoraService.instance) {
      LoraService.instance = new LoraService();
    }
    return LoraService.instance;
  }

  /**
   * Initialize the service and load available LoRAs
   */
  async initialize(): Promise<void> {
    try {
      await this.refreshLoraList();
    } catch (error) {
      console.error('Super LoRA Loader: Failed to initialize LoRA service:', error);
    }
  }

  /**
   * Get list of available LoRA files
   */
  async getAvailableLoras(): Promise<string[]> {
    if (this.availableLoras.length === 0) {
      await this.refreshLoraList();
    }
    return this.availableLoras;
  }

  /**
   * Refresh the list of available LoRAs from the backend
   */
  async refreshLoraList(): Promise<void> {
    try {
      // Call ComfyUI API to get LoRA files
      const response = await fetch('/object_info');
      const data = await response.json();
      
      // Extract LoRA list from the response
      const loraLoader = data.LoraLoader;
      if (loraLoader && loraLoader.input && loraLoader.input.required && loraLoader.input.required.lora_name) {
        this.availableLoras = loraLoader.input.required.lora_name[0] || [];
      } else {
        // Fallback: try to get from folder_paths
        const folderResponse = await fetch('/api/v1/folder_paths');
        if (folderResponse.ok) {
          const folderData = await folderResponse.json();
          this.availableLoras = folderData.loras || [];
        }
      }
      
      console.log(`Super LoRA Loader: Found ${this.availableLoras.length} LoRAs`);
    } catch (error) {
      console.error('Super LoRA Loader: Failed to refresh LoRA list:', error);
      this.availableLoras = [];
    }
  }

  /**
   * Create a new LoRA configuration with defaults
   */
  createLoraConfig(loraName: string = "None"): LoraConfig {
    return {
      lora: loraName,
      enabled: true,
      strength_model: 1.0,
      strength_clip: 1.0,
      trigger_word: '',
      tag: 'General',
      auto_populated: false
    };
  }

  /**
   * Validate a LoRA configuration
   */
  validateLoraConfig(config: LoraConfig): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check required fields
    if (typeof config.lora !== 'string' || typeof config.enabled !== 'boolean') {
      return false;
    }

    // Validate strength values
    const strengthModel = Number(config.strength_model);
    const strengthClip = Number(config.strength_clip);
    
    if (isNaN(strengthModel) || isNaN(strengthClip)) {
      return false;
    }

    if (strengthModel < 0 || strengthModel > 2 || strengthClip < 0 || strengthClip > 2) {
      return false;
    }

    return true;
  }

  /**
   * Check if a LoRA is already in the configuration list
   */
  isDuplicateLora(configs: LoraConfig[], loraName: string): boolean {
    return configs.some(config => config.lora === loraName && loraName !== "None");
  }

  /**
   * Sort LoRA configurations by tag and name
   */
  sortLoraConfigs(configs: LoraConfig[]): LoraConfig[] {
    return [...configs].sort((a, b) => {
      // First sort by tag
      if (a.tag !== b.tag) {
        // "General" tag always comes first
        if (a.tag === 'General') return -1;
        if (b.tag === 'General') return 1;
        return a.tag.localeCompare(b.tag);
      }
      
      // Then sort by LoRA name
      return a.lora.localeCompare(b.lora);
    });
  }

  /**
   * Group LoRA configurations by tag
   */
  groupLorasByTag(configs: LoraConfig[]): Map<string, LoraConfig[]> {
    const groups = new Map<string, LoraConfig[]>();
    
    for (const config of configs) {
      const tag = config.tag || 'General';
      if (!groups.has(tag)) {
        groups.set(tag, []);
      }
      groups.get(tag)!.push(config);
    }
    
    return groups;
  }

  /**
   * Get available tags from a list of LoRA configurations
   */
  getAvailableTags(configs: LoraConfig[]): string[] {
    const tags = new Set<string>();
    
    for (const config of configs) {
      tags.add(config.tag || 'General');
    }
    
    return Array.from(tags).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Get common tag suggestions
   */
  getCommonTags(): string[] {
    return [
      'General',
      'Character',
      'Style',
      'Quality',
      'Effect',
      'Background',
      'Clothing',
      'Pose',
      'Lighting'
    ];
  }

  /**
   * Convert LoRA configs to backend format
   */
  convertToBackendFormat(configs: LoraConfig[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    configs.forEach((config, index) => {
      if (config.lora && config.lora !== "None") {
        const key = `lora_${index + 1}`;
        result[key] = {
          lora: config.lora,
          enabled: config.enabled,
          strength_model: config.strength_model,
          strength_clip: config.strength_clip,
          trigger_word: config.trigger_word || '',
          tag: config.tag || 'General'
        };
      }
    });
    
    return result;
  }

  /**
   * Extract trigger words from all enabled LoRAs
   */
  extractTriggerWords(configs: LoraConfig[]): string {
    const triggerWords: string[] = [];
    
    for (const config of configs) {
      if (config.enabled && config.trigger_word && config.trigger_word.trim()) {
        triggerWords.push(config.trigger_word.trim());
      }
    }
    
    return triggerWords.join(', ');
  }
}
