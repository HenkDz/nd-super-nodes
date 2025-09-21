/**
 * Individual LoRA widget implementation
 */

import { LoraConfig } from '@/types';
import { LoraService } from '@/services/LoraService';
import { CivitAiService } from '@/services/CivitAiService';

export class LoraWidget {
  public name: string;
  public value: LoraConfig;
  public node: any;
  public type: string = 'lora_widget';
  
  private loraService: LoraService;
  private civitaiService: CivitAiService;

  constructor(name: string, initialValue?: Partial<LoraConfig>) {
    this.name = name;
    this.loraService = LoraService.getInstance();
    this.civitaiService = CivitAiService.getInstance();
    
    // Initialize with default values
    this.value = {
      lora: 'None',
      enabled: true,
      strength_model: 1.0,
      strength_clip: 1.0,
      trigger_word: '',
      tag: 'General',
      auto_populated: false,
      ...initialValue
    };
  }

  /**
   * Set the LoRA file and optionally auto-populate trigger words
   */
  async setLora(loraName: string): Promise<void> {
    this.value.lora = loraName;
    
    // Clear previous trigger word if switching LoRAs
    if (this.value.auto_populated) {
      this.value.trigger_word = '';
      this.value.auto_populated = false;
    }

    // Auto-populate trigger words if enabled
    if (loraName && loraName !== 'None') {
      try {
        const triggerWord = await this.civitaiService.autoPopulateTriggerWords(loraName);
        if (triggerWord) {
          this.value.trigger_word = triggerWord;
          this.value.auto_populated = true;
        }
      } catch (error) {
        console.warn(`Super LoRA Loader: Failed to auto-populate trigger words for ${loraName}:`, error);
      }
    }

    this.markDirty();
  }

  /**
   * Set the enabled state
   */
  setEnabled(enabled: boolean): void {
    this.value.enabled = enabled;
    this.markDirty();
  }

  /**
   * Set model strength
   */
  setModelStrength(strength: number): void {
    this.value.strength_model = Math.max(0, Math.min(2, strength));
    this.markDirty();
  }

  /**
   * Set CLIP strength
   */
  setClipStrength(strength: number): void {
    this.value.strength_clip = Math.max(0, Math.min(2, strength));
    this.markDirty();
  }

  /**
   * Set trigger word
   */
  setTriggerWord(triggerWord: string): void {
    this.value.trigger_word = triggerWord;
    // Mark as manually edited if it was auto-populated
    if (this.value.auto_populated) {
      this.value.auto_populated = false;
    }
    this.markDirty();
  }

  /**
   * Set tag
   */
  setTag(tag: string): void {
    this.value.tag = tag || 'General';
    this.markDirty();
  }

  /**
   * Get display name for the LoRA
   */
  getDisplayName(): string {
    if (!this.value.lora || this.value.lora === 'None') {
      return 'Select LoRA...';
    }
    
    // Remove file extension for display
    const name = this.value.lora;
    const lastDot = name.lastIndexOf('.');
    return lastDot > 0 ? name.substring(0, lastDot) : name;
  }

  /**
   * Get the widget's serialized value
   */
  serialize(): LoraConfig {
    return { ...this.value };
  }

  /**
   * Load from serialized data
   */
  deserialize(data: LoraConfig): void {
    this.value = {
      lora: data.lora || 'None',
      enabled: data.enabled !== false,
      strength_model: data.strength_model || 1.0,
      strength_clip: data.strength_clip || data.strength_model || 1.0,
      trigger_word: data.trigger_word || '',
      tag: data.tag || 'General',
      auto_populated: data.auto_populated || false
    };
  }

  /**
   * Check if this widget has valid LoRA configuration
   */
  isValid(): boolean {
    return this.loraService.validateLoraConfig(this.value);
  }

  /**
   * Check if this LoRA is actually doing anything
   */
  isEffective(): boolean {
    return this.value.enabled && 
           this.value.lora && 
           this.value.lora !== 'None' &&
           (this.value.strength_model !== 0 || this.value.strength_clip !== 0);
  }

  /**
   * Mark the node as dirty to trigger re-rendering
   */
  private markDirty(): void {
    if (this.node && typeof this.node.setDirtyCanvas === 'function') {
      this.node.setDirtyCanvas(true, true);
    }
  }

  /**
   * Show LoRA selection dialog
   */
  async showLoraSelector(): Promise<void> {
    try {
      const availableLoras = await this.loraService.getAvailableLoras();
      
      // Create selection dialog
      const menuItems = [
        { content: 'None', callback: () => this.setLora('None') },
        null, // separator
        ...availableLoras.map(lora => ({
          content: lora,
          callback: () => this.setLora(lora)
        }))
      ];

      // Show context menu
      const LiteGraph = (window as any).LiteGraph;
      if (LiteGraph && LiteGraph.ContextMenu) {
        new LiteGraph.ContextMenu(menuItems, {
          title: 'Select LoRA'
        });
      }
    } catch (error) {
      console.error('Super LoRA Loader: Failed to show LoRA selector:', error);
    }
  }

  /**
   * Show tag selection dialog
   */
  showTagSelector(): void {
    const commonTags = this.loraService.getCommonTags();
    
    const menuItems = [
      ...commonTags.map(tag => ({
        content: tag,
        callback: () => this.setTag(tag)
      })),
      null, // separator
      {
        content: 'Custom...',
        callback: () => this.showCustomTagDialog()
      }
    ];

    const LiteGraph = (window as any).LiteGraph;
    if (LiteGraph && LiteGraph.ContextMenu) {
      new LiteGraph.ContextMenu(menuItems, {
        title: 'Select Tag'
      });
    }
  }

  /**
   * Show custom tag input dialog
   */
  private showCustomTagDialog(): void {
    const app = (window as any).app;
    if (app && app.canvas && app.canvas.prompt) {
      app.canvas.prompt(
        'Enter custom tag',
        this.value.tag,
        (newTag: string) => {
          if (newTag && newTag.trim()) {
            this.setTag(newTag.trim());
          }
        }
      );
    }
  }
}
