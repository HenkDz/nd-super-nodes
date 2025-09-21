/**
 * Main header widget with master controls
 */

import { SuperLoraSettings } from '@/types';

export class MainHeaderWidget {
  public name: string = 'main_header';
  public value: any;
  public node: any;
  public type: string = 'main_header_widget';
  
  constructor() {
    this.value = {
      type: 'main_header_widget'
    };
  }

  /**
   * Toggle all LoRAs on/off
   */
  toggleAllLoras(): void {
    if (!this.node) return;
    
    const loraWidgets = this.getLoraWidgets();
    if (loraWidgets.length === 0) return;
    
    // Check if all are enabled
    const allEnabled = loraWidgets.every(widget => widget.value?.enabled);
    
    // Toggle all to opposite state
    for (const widget of loraWidgets) {
      if (widget.setEnabled) {
        widget.setEnabled(!allEnabled);
      }
    }
    
    this.markDirty();
  }

  /**
   * Collapse all tag groups
   */
  collapseAll(): void {
    if (!this.node) return;
    
    const tagHeaders = this.getTagHeaders();
    for (const header of tagHeaders) {
      if (header.setCollapsed) {
        header.setCollapsed(true);
      }
    }
    
    this.markDirty();
  }

  /**
   * Expand all tag groups
   */
  expandAll(): void {
    if (!this.node) return;
    
    const tagHeaders = this.getTagHeaders();
    for (const header of tagHeaders) {
      if (header.setCollapsed) {
        header.setCollapsed(false);
      }
    }
    
    this.markDirty();
  }

  /**
   * Show all trigger words in a combined view
   */
  showTriggerWords(): void {
    if (!this.node) return;
    
    const loraWidgets = this.getLoraWidgets();
    const triggerWords: string[] = [];
    
    for (const widget of loraWidgets) {
      if (widget.value?.enabled && widget.value.trigger_word && widget.value.trigger_word.trim()) {
        triggerWords.push(widget.value.trigger_word.trim());
      }
    }
    
    const combinedWords = triggerWords.join(', ');
    
    // Show in a dialog or copy to clipboard
    const app = (window as any).app;
    if (app && app.canvas) {
      if (combinedWords) {
        // Try to copy to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(combinedWords).then(() => {
            this.showToast('Trigger words copied to clipboard!', 'success');
          }).catch(() => {
            this.showDialog('Trigger Words', combinedWords);
          });
        } else {
          this.showDialog('Trigger Words', combinedWords);
        }
      } else {
        this.showToast('No trigger words found', 'warning');
      }
    }
  }

  /**
   * Show settings dialog
   */
  showSettings(): void {
    const settings = this.getCurrentSettings();
    
    // Create settings dialog content
    const menuItems = [
      {
        content: `☑ Auto-fetch Trigger Words: ${settings.autoFetchTriggerWords ? 'ON' : 'OFF'}`,
        callback: () => this.toggleSetting('autoFetchTriggerWords')
      },
      {
        content: `☑ Enable Tags: ${settings.enableTags ? 'ON' : 'OFF'}`,
        callback: () => this.toggleSetting('enableTags')
      },
      {
        content: `☑ Show Separate Strengths: ${settings.showSeparateStrengths ? 'ON' : 'OFF'}`,
        callback: () => this.toggleSetting('showSeparateStrengths')
      },
      {
        content: `☑ Enable Templates: ${settings.enableTemplates ? 'ON' : 'OFF'}`,
        callback: () => this.toggleSetting('enableTemplates')
      },
      {
        content: `☑ Enable Deletion: ${settings.enableDeletion ? 'ON' : 'OFF'}`,
        callback: () => this.toggleSetting('enableDeletion')
      },
      {
        content: `☑ Enable Sorting: ${settings.enableSorting ? 'ON' : 'OFF'}`,
        callback: () => this.toggleSetting('enableSorting')
      }
    ];

    const LiteGraph = (window as any).LiteGraph;
    if (LiteGraph && LiteGraph.ContextMenu) {
      new LiteGraph.ContextMenu(menuItems, {
        title: 'Super LoRA Settings'
      });
    }
  }

  /**
   * Get current settings from node properties
   */
  private getCurrentSettings(): SuperLoraSettings {
    const nodeProps = this.node?.properties || {};
    
    return {
      autoFetchTriggerWords: nodeProps['Auto-fetch Trigger Words'] !== false,
      enableTags: nodeProps['Enable Tags'] === true,
      showSeparateStrengths: nodeProps['Show Separate Strengths'] === true,
      enableTemplates: nodeProps['Enable Templates'] !== false,
      enableDeletion: nodeProps['Enable Deletion'] !== false,
      enableSorting: nodeProps['Enable Sorting'] !== false
    };
  }

  /**
   * Toggle a setting value
   */
  private toggleSetting(setting: keyof SuperLoraSettings): void {
    if (!this.node || !this.node.properties) return;
    
    const propMap: Record<string, string> = {
      autoFetchTriggerWords: 'Auto-fetch Trigger Words',
      enableTags: 'Enable Tags',
      showSeparateStrengths: 'Show Separate Strengths',
      enableTemplates: 'Enable Templates',
      enableDeletion: 'Enable Deletion',
      enableSorting: 'Enable Sorting'
    };
    
    const propName = propMap[setting];
    if (propName) {
      this.node.properties[propName] = !this.node.properties[propName];
      
      // Trigger node reconfiguration if needed
      if (this.node.onSettingChanged) {
        this.node.onSettingChanged(setting, this.node.properties[propName]);
      }
      
      this.markDirty();
    }
  }

  /**
   * Get all LoRA widgets in the node
   */
  private getLoraWidgets(): any[] {
    if (!this.node || !this.node.widgets) return [];
    
    return this.node.widgets.filter((widget: any) => widget.type === 'lora_widget');
  }

  /**
   * Get all tag header widgets in the node
   */
  private getTagHeaders(): any[] {
    if (!this.node || !this.node.widgets) return [];
    
    return this.node.widgets.filter((widget: any) => widget.type === 'tag_header_widget');
  }

  /**
   * Show a simple dialog
   */
  private showDialog(title: string, content: string): void {
    const app = (window as any).app;
    if (app && app.canvas && app.canvas.prompt) {
      // Use prompt as a simple dialog
      app.canvas.prompt(title, content, () => {}, null, true);
    } else {
      alert(`${title}:\n\n${content}`);
    }
  }

  /**
   * Show a toast notification (if available)
   */
  private showToast(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    // Try to use ComfyUI's notification system if available
    const app = (window as any).app;
    if (app && app.ui && app.ui.dialog && app.ui.dialog.show) {
      app.ui.dialog.show(message);
      return;
    }
    
    // Fallback to console
    console.log(`Super LoRA Loader [${type}]: ${message}`);
    
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // Fade out and remove
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Mark the node as dirty to trigger re-rendering
   */
  private markDirty(): void {
    if (this.node && typeof this.node.setDirtyCanvas === 'function') {
      this.node.setDirtyCanvas(true, true);
    }
  }
}
