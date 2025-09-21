/**
 * Tag group header widget implementation
 */

import { TagHeaderWidgetValue } from '@/types';

export class TagHeaderWidget {
  public name: string;
  public value: TagHeaderWidgetValue;
  public node: any;
  public type: string = 'tag_header_widget';
  public tag: string;
  
  constructor(tag: string) {
    this.tag = tag;
    this.name = `tag_header_${tag}`;
    this.value = {
      tag,
      collapsed: false,
      count: 0
    };
  }

  /**
   * Toggle collapsed state
   */
  toggleCollapsed(): void {
    this.value.collapsed = !this.value.collapsed;
    this.updateVisibility();
    this.markDirty();
  }

  /**
   * Set collapsed state
   */
  setCollapsed(collapsed: boolean): void {
    this.value.collapsed = collapsed;
    this.updateVisibility();
    this.markDirty();
  }

  /**
   * Update the count of LoRAs in this tag group
   */
  updateCount(count: number): void {
    this.value.count = count;
    this.markDirty();
  }

  /**
   * Update visibility of LoRA widgets in this tag group
   */
  updateVisibility(): void {
    if (!this.node) return;

    const widgets = this.node.widgets || [];
    let inThisGroup = false;
    
    for (const widget of widgets) {
      // Start tracking when we hit this header
      if (widget === this) {
        inThisGroup = true;
        continue;
      }
      
      // Stop when we hit another header
      if (widget.type === 'tag_header_widget' && widget !== this) {
        inThisGroup = false;
        continue;
      }
      
      // Update visibility for LoRA widgets in this group
      if (inThisGroup && widget.type === 'lora_widget') {
        const shouldShow = !this.value.collapsed && widget.value?.tag === this.tag;
        if (widget.options) {
          widget.options.hidden = !shouldShow;
        }
      }
    }
  }

  /**
   * Get display text for the header
   */
  getDisplayText(): string {
    const countText = this.value.count > 0 ? ` (${this.value.count})` : '';
    return `${this.getTagIcon()} ${this.tag}${countText}`;
  }

  /**
   * Get icon for the tag
   */
  getTagIcon(): string {
    const iconMap: Record<string, string> = {
      'General': '📁',
      'Character': '👤',
      'Style': '🎨',
      'Quality': '⭐',
      'Effect': '✨',
      'Background': '🌄',
      'Clothing': '👕',
      'Pose': '🤸',
      'Lighting': '💡'
    };
    
    return iconMap[this.tag] || '🏷️';
  }

  /**
   * Get collapse/expand icon
   */
  getCollapseIcon(): string {
    return this.value.collapsed ? '▶' : '▼';
  }

  /**
   * Get tag-specific color class
   */
  getTagColorClass(): string {
    const colorMap: Record<string, string> = {
      'General': 'tag-general',
      'Character': 'tag-character', 
      'Style': 'tag-style',
      'Quality': 'tag-quality',
      'Effect': 'tag-effect'
    };
    
    return colorMap[this.tag] || 'tag-custom';
  }

  /**
   * Check if this tag has any LoRAs
   */
  hasLoras(): boolean {
    return this.value.count > 0;
  }

  /**
   * Get all LoRA widgets in this tag group
   */
  getLoraWidgets(): any[] {
    if (!this.node) return [];
    
    const widgets = this.node.widgets || [];
    const loraWidgets = [];
    let inThisGroup = false;
    
    for (const widget of widgets) {
      if (widget === this) {
        inThisGroup = true;
        continue;
      }
      
      if (widget.type === 'tag_header_widget' && widget !== this) {
        inThisGroup = false;
        continue;
      }
      
      if (inThisGroup && widget.type === 'lora_widget' && widget.value?.tag === this.tag) {
        loraWidgets.push(widget);
      }
    }
    
    return loraWidgets;
  }

  /**
   * Toggle all LoRAs in this tag group
   */
  toggleAllLoras(): void {
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
  }

  /**
   * Show tag actions menu
   */
  showActionsMenu(event: MouseEvent): void {
    const menuItems = [
      {
        content: this.value.collapsed ? 'Expand' : 'Collapse',
        callback: () => this.toggleCollapsed()
      },
      {
        content: 'Toggle All LoRAs',
        callback: () => this.toggleAllLoras()
      },
      null, // separator
      {
        content: 'Rename Tag...',
        callback: () => this.showRenameDialog()
      }
    ];

    const LiteGraph = (window as any).LiteGraph;
    if (LiteGraph && LiteGraph.ContextMenu) {
      new LiteGraph.ContextMenu(menuItems, { event });
    }
  }

  /**
   * Show rename tag dialog
   */
  private showRenameDialog(): void {
    const app = (window as any).app;
    if (app && app.canvas && app.canvas.prompt) {
      app.canvas.prompt(
        'Rename tag',
        this.tag,
        (newTag: string) => {
          if (newTag && newTag.trim() && newTag.trim() !== this.tag) {
            this.renameTag(newTag.trim());
          }
        }
      );
    }
  }

  /**
   * Rename this tag and update all associated LoRAs
   */
  private renameTag(newTag: string): void {
    const oldTag = this.tag;
    this.tag = newTag;
    this.value.tag = newTag;
    
    // Update all LoRA widgets with this tag
    const loraWidgets = this.getLoraWidgets();
    for (const widget of loraWidgets) {
      if (widget.setTag) {
        widget.setTag(newTag);
      }
    }
    
    // Update node to rebuild headers
    if (this.node && this.node.onTagRenamed) {
      this.node.onTagRenamed(oldTag, newTag);
    }
    
    this.markDirty();
  }

  /**
   * Serialize the widget state
   */
  serialize(): TagHeaderWidgetValue {
    return { ...this.value };
  }

  /**
   * Deserialize widget state
   */
  deserialize(data: TagHeaderWidgetValue): void {
    this.value = {
      tag: data.tag || this.tag,
      collapsed: data.collapsed || false,
      count: data.count || 0
    };
    this.tag = this.value.tag;
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
