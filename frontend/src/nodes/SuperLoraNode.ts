/**
 * Super LoRA Loader Node - Advanced Implementation
 * Based on rgthree's sophisticated custom widget system
 */

import { LoraConfig } from '@/types';
import { LoraService } from '@/services/LoraService';
import { TemplateService } from '@/services/TemplateService';
import { CivitAiService } from '@/services/CivitAiService';

// ComfyUI imports
import { app } from '/scripts/app.js';

// Widget drawing utilities (simplified versions of rgthree utilities)
const LiteGraph = (window as any).LiteGraph;

// Base widget class for custom drawing
class SuperLoraBaseWidget {
  public type: string;
  public value: any;
  public hitAreas: any;
  
  constructor(public name: string) {
    this.type = "custom";
    this.value = {};
    this.hitAreas = {};
  }

  draw(ctx: any, node: any, w: number, posY: number, height: number): void {
    // Override in subclasses
  }

  onMouseDown(event: any, pos: any, node: any): boolean {
    return this.handleHitAreas(event, pos, node, 'onDown');
  }

  onClick(event: any, pos: any, node: any): boolean {
    return this.handleHitAreas(event, pos, node, 'onClick');
  }

  private handleHitAreas(event: any, pos: any, node: any, handler: string): boolean {
    console.log(`[${this.constructor.name}] Click at: [${pos[0]}, ${pos[1]}], Handler: ${handler}`);

    const entries = Object.entries(this.hitAreas as any).sort((a: any, b: any) => {
      const pa = (a[1] && a[1].priority) || 0;
      const pb = (b[1] && b[1].priority) || 0;
      return pb - pa; // higher priority first
    });

    for (const [key, area] of entries) {
      const bounds = area.bounds;
      console.log(`  Checking ${key}: bounds=${bounds}`);

      if (bounds && bounds.length >= 4 && this.isInBounds(pos, bounds)) {
        // Prefer exact handler, but gracefully fallback to the other one
        const fn = area[handler] || (handler === 'onDown' ? area.onClick : area.onDown);
        if (fn) {
          console.log(`  ✓ HIT: ${key} - calling ${fn === area[handler] ? handler : (handler === 'onDown' ? 'onClick' : 'onDown')}`);
          return fn.call(this, event, pos, node);
        }
      }
    }
    console.log('  ✗ No hit areas matched');
    return false;
  }

  private isInBounds(pos: any, bounds: number[]): boolean {
    if (bounds.length < 4) return false;
    const [x, y, width, height] = bounds;
    return pos[0] >= x && pos[0] <= x + width && 
           pos[1] >= y && pos[1] <= y + height;
  }

  computeSize(): [number, number] {
    return [200, 25];
  }
}

// Header widget with master controls
class SuperLoraHeaderWidget extends SuperLoraBaseWidget {
  constructor() {
    super("SuperLoraHeaderWidget");
    this.value = { type: "SuperLoraHeaderWidget" };
    this.hitAreas = {
      toggleAll: { bounds: [0, 0], onDown: this.onToggleAllDown },
      addLora: { bounds: [0, 0], onDown: this.onAddLoraDown },
      saveTemplate: { bounds: [0, 0], onDown: this.onSaveTemplateDown },
      loadTemplate: { bounds: [0, 0], onDown: this.onLoadTemplateDown },
      settings: { bounds: [0, 0], onDown: this.onSettingsDown }
    };
  }

  draw(ctx: any, node: any, w: number, posY: number, height: number): void {
    const margin = 8;
    const buttonHeight = 22;
    const buttonSpacing = 6;
    let posX = margin;

    ctx.save();
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, posY, 0, posY + height);
    gradient.addColorStop(0, "#3a3a3a");
    gradient.addColorStop(1, "#2a2a2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, posY, w, height);
    
    // Border
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, posY, w, height);
    
    const midY = posY + height / 2;
    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";

    // Helper function to draw rounded button
    const drawButton = (x: number, width: number, color: string, text: string, icon?: string) => {
      // Button background with rounded corners
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, posY + (height - buttonHeight) / 2, width, buttonHeight, 3);
      ctx.fill();
      
      // Button border
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Button text
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      const textX = x + width / 2;
      if (icon) {
        ctx.fillText(icon + " " + text, textX, midY);
      } else {
        ctx.fillText(text, textX, midY);
      }
    };

    // Responsive button layout
    const allState = this.getAllLorasState(node);
    const availableWidth = w - (margin * 2);
    const buttons = [
      { id: 'toggleAll', color: allState ? "#4CAF50" : "#666", text: "Toggle All", shortText: "Toggle", icon: "⏯️", priority: 1 },
      { id: 'addLora', color: "#2196F3", text: "Add LoRA", shortText: "Add", icon: "➕", priority: 2 },
      { id: 'saveTemplate', color: "#FF9800", text: "Save", shortText: "Save", icon: "💾", priority: 3 },
      { id: 'loadTemplate', color: "#9C27B0", text: "Load", shortText: "Load", icon: "📂", priority: 4 },
      { id: 'settings', color: "#607D8B", text: "Settings", shortText: "Set", icon: "⚙️", priority: 5 }
    ];

    // Calculate responsive button sizes
    const totalSpacing = buttonSpacing * (buttons.length - 1);
    const buttonWidth = Math.max(40, (availableWidth - totalSpacing) / buttons.length);
    const useShortText = buttonWidth < 60;
    const useIconOnly = buttonWidth < 45;

    buttons.forEach((btn, index) => {
      let displayText = useIconOnly ? btn.icon : (useShortText ? btn.shortText : btn.text);

      drawButton(posX, buttonWidth, btn.color, displayText);
      this.hitAreas[btn.id].bounds = [posX, 0, buttonWidth, height];
      posX += buttonWidth + buttonSpacing;
    });

    ctx.restore();
  }

  private getAllLorasState(node: any): boolean {
    if (!node.customWidgets) return false;
    const loraWidgets = node.customWidgets.filter((w: any) => w instanceof SuperLoraWidget);
    return loraWidgets.length > 0 && loraWidgets.every((w: any) => w.value.enabled);
  }

  onToggleAllDown = (event: any, pos: any, node: any): boolean => {
    const allState = this.getAllLorasState(node);
    if (!node.customWidgets) return true;
    const loraWidgets = node.customWidgets.filter((w: any) => w instanceof SuperLoraWidget);
    loraWidgets.forEach((w: any) => w.value.enabled = !allState);
    node.setDirtyCanvas(true, true);
    return true;
  };

  onAddLoraDown = (event: any, pos: any, node: any): boolean => {
    SuperLoraNode.showLoraSelector(node, undefined, event);
    return true;
  };

  onSaveTemplateDown = (event: any, pos: any, node: any): boolean => {
    // Use modern overlay input instead of prompt
    SuperLoraNode.showNameOverlay({
      title: 'Save Template',
      placeholder: 'Template name...',
      initial: 'My LoRA Set',
      submitLabel: 'Save',
      onCommit: async (templateName: string) => {
        const name = (templateName || '').trim();
        if (!name) {
          SuperLoraNode.showToast('Please enter a template name', 'warning');
          return;
        }

        const configs = SuperLoraNode.getLoraConfigs(node);
        const validConfigs = configs.filter(config => config.lora && config.lora !== 'None');
        if (validConfigs.length === 0) {
          SuperLoraNode.showToast('⚠️ No valid LoRAs to save in template', 'warning');
          return;
        }

        try {
          // Optional: warn if name exists
          const exists = await SuperLoraNode.templateService.templateExists(name);
          if (exists) {
            SuperLoraNode.showToast(`⚠️ Template "${name}" already exists. Choose a different name.`, 'warning');
            return;
          }

          const success = await SuperLoraNode.templateService.saveTemplate(name, validConfigs);
          if (success) {
            SuperLoraNode.showToast(`✅ Template "${name}" saved successfully!`, 'success');
          } else {
            SuperLoraNode.showToast('❌ Failed to save template. Please try again.', 'error');
          }
        } catch (error) {
          console.error('Template save error:', error);
          SuperLoraNode.showToast('❌ Error saving template. Check console for details.', 'error');
        }
      }
    });
    return true;
  };

  onLoadTemplateDown = (event: any, pos: any, node: any): boolean => {
    SuperLoraNode.showLoadTemplateDialog(node, event);
    return true;
  };

  onSettingsDown = (event: any, pos: any, node: any): boolean => {
    SuperLoraNode.showSettingsDialog(node, event);
    return true;
  };

  computeSize(): [number, number] {
    return [450, 35];
  }
}

// Tag header widget (collapsible)
class SuperLoraTagWidget extends SuperLoraBaseWidget {
  constructor(public tag: string) {
    super(`tag_${tag}`);
    this.value = { type: "SuperLoraTagWidget", tag, collapsed: false };
    this.hitAreas = {
      toggle: { bounds: [0, 0], onDown: this.onToggleDown },
      collapse: { bounds: [0, 0], onDown: this.onCollapseDown }
    };
  }

  draw(ctx: any, node: any, w: number, posY: number, height: number): void {
    const margin = 10;
    let posX = margin;

    ctx.save();
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, posY, w, height);
    
    const midY = height / 2; // Relative middle Y
    const lorasInTag = this.getLorasInTag(node);
    const allEnabled = lorasInTag.every((w: any) => w.value.enabled);

    // Collapse arrow
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.value.collapsed ? "▶" : "▼", posX, posY + midY); // Absolute Y for draw
    this.hitAreas.collapse.bounds = [posX, 0, 15, height]; // Relative Y for hitbox
    posX += 20;

    // Tag toggle
    ctx.fillStyle = allEnabled ? "#4CAF50" : "#666";
    ctx.fillRect(posX, posY + 4, 20, height - 8); // Absolute Y for draw
    ctx.fillStyle = "#fff";
    ctx.fillText(allEnabled ? "✓" : "○", posX + 6, posY + midY); // Absolute Y for draw
    this.hitAreas.toggle.bounds = [posX, 0, 20, height]; // Relative Y for hitbox
    posX += 30;

    // Tag name and count
    ctx.fillStyle = "#fff";
    ctx.fillText(`${this.tag} (${lorasInTag.length})`, posX, posY + midY); // Absolute Y for draw

    ctx.restore();
  }

  private getLorasInTag(node: any): any[] {
    if (!node.customWidgets) return [];
    return node.customWidgets.filter((w: any) => 
      w instanceof SuperLoraWidget && w.value.tag === this.tag
    );
  }

  onCollapseDown = (event: any, pos: any, node: any): boolean => {
    this.value.collapsed = !this.value.collapsed;
    SuperLoraNode.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onToggleDown = (event: any, pos: any, node: any): boolean => {
    const lorasInTag = this.getLorasInTag(node);
    const allEnabled = lorasInTag.every((w: any) => w.value.enabled);
    lorasInTag.forEach((w: any) => w.value.enabled = !allEnabled);
    node.setDirtyCanvas(true, false);
    return true;
  };

  computeSize(): [number, number] {
    return [400, 25];
  }

  isCollapsed(): boolean {
    return this.value.collapsed;
  }
}

// Individual LoRA widget with all controls
class SuperLoraWidget extends SuperLoraBaseWidget {
  constructor(name: string) {
    super(name);
    this.value = {
      lora: "None",
      enabled: true,
      strength: 1.0,
      strengthClip: 1.0,
      triggerWords: "",
      tag: "General",
      autoFetched: false
    };
    this.hitAreas = {
      enabled: { bounds: [0, 0], onDown: this.onEnabledDown, priority: 60 },
      lora: { bounds: [0, 0], onClick: this.onLoraClick, priority: 10 },
      strength: { bounds: [0, 0], onClick: this.onStrengthClick, priority: 80 },
      strengthDown: { bounds: [0, 0], onClick: this.onStrengthDownClick, priority: 90 },
      strengthUp: { bounds: [0, 0], onClick: this.onStrengthUpClick, priority: 90 },
      triggerWords: { bounds: [0, 0], onClick: this.onTriggerWordsClick, priority: 85 },
      remove: { bounds: [0, 0], onClick: this.onRemoveClick, priority: 100 },
      moveUp: { bounds: [0, 0], onClick: this.onMoveUpClick, priority: 70 },
      moveDown: { bounds: [0, 0], onClick: this.onMoveDownClick, priority: 70 }
    };
  }

  draw(ctx: any, node: any, w: number, posY: number, height: number): void {
    const margin = 8;
    const rowHeight = 28;

    ctx.save();
    
    // Main background with rounded corners and subtle gradient
    const gradient = ctx.createLinearGradient(0, posY, 0, posY + height);
    gradient.addColorStop(0, this.value.enabled ? "#4a4a4a" : "#2a2a2a");
    gradient.addColorStop(1, this.value.enabled ? "#3a3a3a" : "#1a1a1a");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(margin, posY + 2, w - margin * 2, height - 4, 6);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = this.value.enabled ? "#666" : "#444";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Disabled overlay
    if (!this.value.enabled) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
    }

    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";
    
    // Vertical layout: top padding when two rows, centered when single row
    const topPad = node.properties?.showTriggerWords ? 4 : Math.max(4, Math.floor((height - rowHeight) / 2));
    let currentY = posY + topPad;

    // First row: Enable toggle, LoRA name, and controls
    this.drawFirstRow(ctx, node, w, currentY, rowHeight, height);
    // Single-row compact layout: no second row drawing

    ctx.restore();
  }

  private drawFirstRow(ctx: any, node: any, w: number, posY: number, rowHeight: number, fullHeight: number): void {
    const margin = 8;
    let posX = margin + 6;
    const midY = rowHeight / 2; // Relative middle Y

    // Enable toggle (modern rounded toggle) - square like + and - buttons
    const toggleSize = 20;
    const toggleY = (rowHeight - toggleSize) / 2 - 2; // RELATIVE Y for logic - move up slightly
    ctx.fillStyle = this.value.enabled ? "#4CAF50" : "#666";
    ctx.beginPath();
    // Use absolute Y for drawing
    ctx.roundRect(posX, posY + toggleY, toggleSize, toggleSize, 2);
    ctx.fill();
     
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "12px Arial";
    // Use absolute Y for drawing
    ctx.fillText(this.value.enabled ? "✓" : "", posX + toggleSize / 2, posY + midY);
    // Use RELATIVE Y for hitbox - smaller to avoid overlap with other controls
    this.hitAreas.enabled.bounds = [posX, 0, toggleSize, fullHeight];
    posX += toggleSize + 8; // More spacing after toggle

    // Dimensions
    const loraWidgets = node.customWidgets?.filter((w: any) => w instanceof SuperLoraWidget) || [];
    const indexInLoras = loraWidgets.indexOf(this as any);
    const lastIndex = loraWidgets.length - 1;
    const showMoveArrows = loraWidgets.length > 1;

    const arrowSize = 20;
    const strengthWidth = 50;
    const btnSize = 20;
    const removeSize = 20;
    const gapSmall = 2;
    const gap = 8;

    // Determine layout bounds
    const rightEdge = node.size[0] - margin;
    const removeX =  rightEdge - removeSize - gap;

    // Place strength and +/- anchored to right (before remove)
    let cursorX = removeX - gap; // start left of remove
    const plusX = cursorX - btnSize;
    cursorX = plusX - gapSmall;
    const strengthX = cursorX - strengthWidth;
    cursorX = strengthX - gapSmall;
    const minusX = cursorX - btnSize;
    cursorX = minusX - gap;

    // Place arrows if visible (both left of minus)
    let upX = cursorX - arrowSize;
    let downX = upX - (arrowSize + 2); // place down to the LEFT of up
    if (!showMoveArrows) {
      upX = downX = -9999; // hide offscreen
    }

    // Compute LoRA name width as the space left
    const loraLeft = posX;
    const loraMaxRight = showMoveArrows ? (downX - gap) : (minusX - gap);
    const loraWidth = Math.max(100, loraMaxRight - loraLeft);

    const showTriggers = !!(node.properties && node.properties.showTriggerWords);
    // Split text slot into name (left) and trigger/placeholder (right) when enabled
    const nameWidth = showTriggers ? Math.max(80, Math.floor(loraWidth * 0.6)) : loraWidth;
    const trigWidth = showTriggers ? (loraWidth - nameWidth) : 0;

    // Draw LoRA name (left)
    ctx.textAlign = "left";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = this.value.enabled ? "#fff" : "#888";
    const loraText = this.value.lora === "None" ? "Click to select LoRA..." : this.value.lora;
    const loraDisplay = this.truncateText(ctx, loraText, nameWidth);
    ctx.fillText(loraDisplay, loraLeft, posY + midY);
    this.hitAreas.lora.bounds = [loraLeft, 0, nameWidth, fullHeight];

    // Draw trigger text or placeholder (right) if setting enabled
    const triggerLeft = loraLeft + nameWidth;
    if (showTriggers && trigWidth > 0) {
      const hasTrigger = !!(this.value.triggerWords && String(this.value.triggerWords).trim());
      ctx.textAlign = "right";
      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      if (hasTrigger) {
        ctx.fillStyle = this.value.enabled ? "#fff" : "#aaa";
        const trigDisplay = this.truncateText(ctx, String(this.value.triggerWords), trigWidth - 4);
        ctx.fillText(trigDisplay, triggerLeft + trigWidth - 4, posY + midY);
      } else {
        ctx.fillStyle = "#666";
        const placeholder = "Click to add trigger words...";
        const phDisplay = this.truncateText(ctx, placeholder, trigWidth - 4);
        ctx.fillText(phDisplay, triggerLeft + trigWidth - 4, posY + midY);
      }
      this.hitAreas.triggerWords.bounds = [triggerLeft, 0, trigWidth, fullHeight];
    } else {
      // Disabled by settings: no trigger area
      this.hitAreas.triggerWords.bounds = [0, 0, 0, 0];
    }

    // Draw arrows (with disable state for first/last)
    if (showMoveArrows) {
      const arrowY = (rowHeight - arrowSize) / 2;
      const disableDown = indexInLoras === lastIndex;
      const disableUp = indexInLoras === 0;

      // Down
      ctx.globalAlpha = disableDown ? 0.35 : 1.0;
      ctx.fillStyle = "#555"; ctx.beginPath();
      ctx.roundRect(downX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("▼", downX + arrowSize / 2, posY + midY);
      this.hitAreas.moveDown.bounds = disableDown ? [0, 0, 0, 0] : [downX, 0, arrowSize, fullHeight];

      // Up
      ctx.globalAlpha = disableUp ? 0.35 : 1.0;
      ctx.fillStyle = "#555"; ctx.beginPath();
      ctx.roundRect(upX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("▲", upX + arrowSize / 2, posY + midY);
      this.hitAreas.moveUp.bounds = disableUp ? [0, 0, 0, 0] : [upX, 0, arrowSize, fullHeight];

      ctx.globalAlpha = 1.0;
    } else {
      this.hitAreas.moveUp.bounds = [0, 0, 0, 0];
      this.hitAreas.moveDown.bounds = [0, 0, 0, 0];
    }

    // Draw minus
    const btnY = (rowHeight - btnSize) / 2;
    ctx.fillStyle = "#666"; ctx.beginPath();
    ctx.roundRect(minusX, posY + btnY, btnSize, btnSize, 2);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
    ctx.fillText("-", minusX + btnSize / 2, posY + midY);
    this.hitAreas.strengthDown.bounds = [minusX, 0, btnSize, fullHeight];

    // Draw strength
    const strengthY = (rowHeight - 20) / 2;
    ctx.fillStyle = "#FF9800"; ctx.beginPath();
    ctx.roundRect(strengthX, posY + strengthY, strengthWidth, 20, 3);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
    ctx.fillText(this.value.strength.toFixed(2), strengthX + strengthWidth / 2, posY + midY);
    this.hitAreas.strength.bounds = [strengthX, 0, strengthWidth, fullHeight];

    // Draw plus
    ctx.fillStyle = "#666"; ctx.beginPath();
    ctx.roundRect(plusX, posY + btnY, btnSize, btnSize, 2);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
    ctx.fillText("+", plusX + btnSize / 2, posY + midY);
    this.hitAreas.strengthUp.bounds = [plusX, 0, btnSize, fullHeight];

    // Draw remove (X)
    const removeY = (rowHeight - removeSize) / 2;
    ctx.fillStyle = "#f44336"; ctx.beginPath();
    ctx.roundRect(removeX, posY + removeY, removeSize, removeSize, 2);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "14px Arial";
    ctx.fillText("✖", removeX + removeSize / 2, posY + midY);
    this.hitAreas.remove.bounds = [removeX, 0, removeSize, fullHeight];
  }

  // drawSecondRow removed in compact single-row layout

  private isCollapsedByTag(node: any): boolean {
    if (!node.customWidgets) return false;
    const tagWidget = node.customWidgets.find((w: any) => 
      w instanceof SuperLoraTagWidget && w.tag === this.value.tag
    );
    return tagWidget?.isCollapsed() || false;
  }

  private truncateText(ctx: any, text: string, maxWidth: number): string {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;
    
    let truncated = text;
    while (ctx.measureText(truncated + "...").width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "...";
  }

  onEnabledDown = (event: any, pos: any, node: any): boolean => {
    this.value.enabled = !this.value.enabled;
    node.setDirtyCanvas(true, false);
    return true;
  };

  onLoraClick = (event: any, pos: any, node: any): boolean => {
    SuperLoraNode.showLoraSelector(node, this, event);
    return true;
  };

  onStrengthClick = (event: any, pos: any, node: any): boolean => {
    try {
      const canvas = (app as any)?.canvas;
      if (canvas?.prompt) {
        canvas.prompt("Model Strength", this.value.strength ?? 1, (v: any) => {
          const val = parseFloat(v);
          if (!Number.isNaN(val)) {
            this.value.strength = Math.max(-2, Math.min(2, val));
            node.setDirtyCanvas(true, true);
          }
        }, event);
        return true;
      }
    } catch {}
    return false;
  };

  onStrengthDownClick = (event: any, pos: any, node: any): boolean => {
    this.value.strength = Math.max(-2, this.value.strength - 0.1);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onStrengthUpClick = (event: any, pos: any, node: any): boolean => {
    this.value.strength = Math.min(2, this.value.strength + 0.1);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onMoveUpClick = (event: any, pos: any, node: any): boolean => {
    const index = node.customWidgets.indexOf(this);
    if (index > 1) { // Don't move above header
      const temp = node.customWidgets[index];
      node.customWidgets[index] = node.customWidgets[index - 1];
      node.customWidgets[index - 1] = temp;
      node.setDirtyCanvas(true, false);
    }
    return true;
  };

  onMoveDownClick = (event: any, pos: any, node: any): boolean => {
    const index = node.customWidgets.indexOf(this);
    if (index < node.customWidgets.length - 1) {
      const temp = node.customWidgets[index];
      node.customWidgets[index] = node.customWidgets[index + 1];
      node.customWidgets[index + 1] = temp;
      node.setDirtyCanvas(true, false);
    }
    return true;
  };

  onTriggerWordsClick = (event: any, pos: any, node: any): boolean => {
    try {
      const canvas = (app as any)?.canvas;
      if (canvas?.prompt) {
        canvas.prompt("Trigger Words", this.value.triggerWords || "", (v: any) => {
          this.value.triggerWords = String(v ?? "");
          this.value.autoFetched = false;
          node.setDirtyCanvas(true, true);
        }, event);
        return true;
      }
    } catch {}
    return false;
  };

  onTagClick = (event: any, pos: any, node: any): boolean => {
    SuperLoraNode.showTagSelector(node, this);
    return true;
  };

  onRemoveClick = (event: any, pos: any, node: any): boolean => {
    SuperLoraNode.removeLoraWidget(node, this);
    return true;
  };

  computeSize(): [number, number] {
    return [450, 50]; // Bigger widget with 2 rows
  }

  setLora(lora: string): void {
    this.value.lora = lora;
    if (lora !== "None") {
      // Auto-fetch trigger words
      this.fetchTriggerWords();
    }
  }

  private async fetchTriggerWords(): Promise<void> {
    try {
      const words = await SuperLoraNode.civitaiService.getTriggerWords(this.value.lora);
      if (words.length > 0) {
        this.value.triggerWords = words.join(", ");
        this.value.autoFetched = true;
      }
    } catch (error) {
      console.warn("Failed to fetch trigger words:", error);
    }
  }
}

export class SuperLoraNode {
  private static readonly NODE_WIDGET_TOP_OFFSET = 64;
  private static loraService: LoraService = LoraService.getInstance();
  private static templateService: TemplateService = TemplateService.getInstance();
  private static civitaiService: CivitAiService;
  
  static async initialize(): Promise<void> {
    this.loraService = LoraService.getInstance();
    this.templateService = TemplateService.getInstance();
    this.civitaiService = CivitAiService.getInstance();
    
    await Promise.all([
      this.loraService.initialize(),
      this.templateService.initialize()
    ]);
  }

  /**
   * Set up the node type with custom widgets
   */
  static setup(nodeType: any, nodeData: any): void {
    const originalNodeCreated = nodeType.prototype.onNodeCreated;
    
    nodeType.prototype.onNodeCreated = function() {
      if (originalNodeCreated) {
        originalNodeCreated.apply(this, arguments);
      }
      
      SuperLoraNode.setupAdvancedNode(this);
    };

    // Override drawing and interaction
    const originalOnDrawForeground = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function(ctx: any) {
      if (originalOnDrawForeground) {
        originalOnDrawForeground.call(this, ctx);
      }
      SuperLoraNode.drawCustomWidgets(this, ctx);
    };

    const originalOnMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function(event: any, pos: any) {
      if (SuperLoraNode.handleMouseDown(this, event, pos)) {
        return true;
      }
      return originalOnMouseDown ? originalOnMouseDown.call(this, event, pos) : false;
    };

    const originalOnMouseUp = nodeType.prototype.onMouseUp;
    nodeType.prototype.onMouseUp = function(event: any, pos: any) {
      if (SuperLoraNode.handleMouseUp(this, event, pos)) {
        return true;
      }
      return originalOnMouseUp ? originalOnMouseUp.call(this, event, pos) : false;
    };

    // Override serialization to include custom widget data
    const originalSerialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function() {
      const data = originalSerialize ? originalSerialize.call(this) : {};
      data.customWidgets = SuperLoraNode.serializeCustomWidgets(this);
      return data;
    };

    // Override configure to restore custom widget data
    const originalConfigure = nodeType.prototype.configure;
    nodeType.prototype.configure = function(data: any) {
      if (originalConfigure) {
        originalConfigure.call(this, data);
      }
      if (data.customWidgets) {
        SuperLoraNode.deserializeCustomWidgets(this, data.customWidgets);
      } else {
        // Ensure we have at least a header widget
        SuperLoraNode.setupAdvancedNode(this);
      }
    };

    // Add getExtraMenuOptions for additional context menu items
    const originalGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(canvas: any) {
      const options = originalGetExtraMenuOptions ? originalGetExtraMenuOptions.call(this, canvas) : [];
      
      options.push(null); // Separator
      options.push({
        content: "🏷️ Add LoRA",
        callback: (event: any) => SuperLoraNode.showLoraSelector(this, undefined, event)
      });
      options.push({
        content: "⚙️ Settings",
        callback: (event: any) => SuperLoraNode.showSettingsDialog(this)
      });
      
      return options;
    };
  }

  /**
   * Initialize advanced node with custom widgets
   */
  private static setupAdvancedNode(node: any): void {
    console.log('Super LoRA Loader: Setting up advanced node');
    
    // Don't reinitialize if already set up
    if (node.customWidgets && node.customWidgets.length > 0) {
      console.log('Super LoRA Loader: Node already initialized, skipping');
      return;
    }
    
    // Initialize properties
    node.properties = node.properties || {};
    node.properties.enableTags = node.properties.enableTags !== false;
    node.properties.showTriggerWords = node.properties.showTriggerWords !== false;
    node.properties.showSeparateStrengths = node.properties.showSeparateStrengths || false;
    node.properties.autoFetchTriggerWords = node.properties.autoFetchTriggerWords !== false;
    
    // Initialize custom widgets array
    node.customWidgets = node.customWidgets || [];
    
    // Add header widget
    node.customWidgets.push(new SuperLoraHeaderWidget());
    
    // Set minimum size
    node.size = [Math.max(node.size[0], 450), Math.max(node.size[1], 100)];
    
    console.log('Super LoRA Loader: Advanced node setup complete');
  }

  /**
   * Calculate required node size based on widgets
   */
  static calculateNodeSize(node: any): void {
    if (!node.customWidgets) return;

    const margin = 5;
    let currentY = this.NODE_WIDGET_TOP_OFFSET; // USE THE CONSTANT

    for (const widget of node.customWidgets) {
      // Check if the widget is collapsed by its tag
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (isCollapsed) continue;

      const size = widget.computeSize();
      // Compact single-row height with small padding; no second row
      const height = widget instanceof SuperLoraWidget
        ? 34
        : size[1];
      if (height === 0) continue;

      currentY += height + margin;
    }

    // Update node size based on content
    const newHeight = Math.max(currentY, 100);
    const newWidth = Math.max(node.size[0], 450);
    if (node.size[1] !== newHeight) {
      node.size[1] = newHeight;
    }
    if (node.size[0] !== newWidth) {
      node.size[0] = newWidth;
    }
  }

  /**
   * Custom drawing for all widgets
   */
  static drawCustomWidgets(node: any, ctx: any): void {
    if (!node.customWidgets) return;

    const margin = 5;
    let currentY = this.NODE_WIDGET_TOP_OFFSET; // USE THE CONSTANT

    for (const widget of node.customWidgets) {
      const size = widget.computeSize();

      // Check if the widget is collapsed by its tag
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (size[1] === 0 || isCollapsed) {
        currentY += size[1] + margin;
        continue;
      }

      // Always single-row height (compact)
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];

      widget.draw(ctx, node, node.size[0], currentY, height);
      currentY += height + margin;
    }
  }

  /**
   * Handle mouse interactions
   */
  static handleMouseDown(node: any, event: any, pos: any): boolean {
    return this.handleMouseEvent(node, event, pos, 'onMouseDown');
  }

  static handleMouseUp(node: any, event: any, pos: any): boolean {
    return this.handleMouseEvent(node, event, pos, 'onClick');
  }

  private static handleMouseEvent(node: any, event: any, pos: any, handler: string): boolean {
    if (!node.customWidgets) return false;

    console.log(`[SuperLoraNode] Mouse event: pos=[${pos[0]}, ${pos[1]}], handler=${handler}`);
    console.log('Node customWidgets:', node.customWidgets.map((w: any, i: number) => `${i}:${w.constructor.name}`));

    // Capture last pointer screen position for inline editors
    try {
      const rect = (app as any)?.canvas?.canvas?.getBoundingClientRect?.();
      const ds = (app as any)?.canvas?.ds;
      let sx: number | null = (event && (event.clientX ?? event.pageX)) || null;
      let sy: number | null = (event && (event.clientY ?? event.pageY)) || null;
      if ((sx == null || sy == null) && rect && ds) {
        sx = rect.left + (pos[0] + (ds.offset?.[0] || 0)) * (ds.scale || 1);
        sy = rect.top + (pos[1] + (ds.offset?.[1] || 0)) * (ds.scale || 1);
      }
      if (sx != null && sy != null) {
        (SuperLoraNode as any)._lastPointerScreen = {x: sx, y: sy};
      }
    } catch {}

    const margin = 5;
    let currentY = this.NODE_WIDGET_TOP_OFFSET; // USE THE CONSTANT
    console.log(`[SuperLoraNode] Starting currentY: ${currentY}`);

    for (const widget of node.customWidgets) {
      const size = widget.computeSize();

      // Also respect collapsed widgets during hit detection
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (size[1] === 0 || isCollapsed) {
        currentY += size[1] + margin;
        continue;
      }

      const height = widget instanceof SuperLoraWidget ? 34 : size[1];

      // Check if click is within widget bounds
      const widgetStartY = currentY;
      const widgetEndY = currentY + height;
      if (pos[1] >= widgetStartY && pos[1] <= widgetEndY) {
        console.log(`[SuperLoraNode] ✓ Click within ${widget.constructor.name} bounds`);

        // Adjust local position to account for the widget's offset
        const localPos = [pos[0], pos[1] - widgetStartY];
        console.log(`[SuperLoraNode] Local position: [${localPos[0]}, ${localPos[1]}], widgetStartY=${widgetStartY}`);

        if (widget[handler]) {
          console.log(`[SuperLoraNode] Calling ${widget.constructor.name}.${handler}()`);
          if (widget[handler](event, localPos, node)) {
            console.log(`[SuperLoraNode] ✓ Handler returned true`);
            return true;
          } else {
            console.log(`[SuperLoraNode] ✗ Handler returned false`);
          }
        } else {
          console.log(`[SuperLoraNode] ✗ No ${handler} method on ${widget.constructor.name}`);
        }
      } else {
        console.log(`[SuperLoraNode] ✗ Click outside ${widget.constructor.name} bounds`);
      }

      currentY += height + margin;
    }

    console.log(`[SuperLoraNode] No widget handled the event`);
    return false;
  }

  /**
   * Show LoRA selector dialog with enhanced search functionality
   */
  static async showLoraSelector(node: any, widget?: SuperLoraWidget, event?: any): Promise<void> {
    try {
      // Pull available LoRAs
      const availableLoras = await SuperLoraNode.loraService.getAvailableLoras();
      const usedLoras = this.getUsedLoras(node);
      const items = availableLoras.map(name => ({
        id: name,
        label: name.replace(/\.(safetensors|ckpt|pt)$/, ''),
        disabled: usedLoras.has(name)
      }));

      // Show overlay picker (no prompt)
      this.showSearchOverlay({
        title: 'Add LoRA',
        placeholder: 'Search LoRAs...',
        items,
        onChoose: (id: string) => {
          if (this.isDuplicateLora(node, id)) {
            this.showToast('⚠️ Already added to the list', 'warning');
            return;
          }
          if (widget) {
            widget.setLora(id);
            this.showToast('✅ LoRA updated', 'success');
          } else {
            this.addLoraWidget(node, { lora: id });
            this.showToast('✅ LoRA added', 'success');
          }
          node.setDirtyCanvas(true, true);
        }
      });
    } catch (error) {
      console.error('Failed to show LoRA selector:', error);
      this.showToast('Failed to load LoRAs', 'error');
    }
  }

  /**
   * Show tag selector dialog
   */
  static showTagSelector(node: any, widget: SuperLoraWidget): void {
    const existingTags = this.getExistingTags(node);
    const commonTags = ["General", "Character", "Style", "Quality", "Effect"];
    const allTags = Array.from(new Set([...commonTags, ...existingTags]));
    
    const menuItems = allTags.map(tag => ({
      content: tag,
        callback: () => {
          widget.value.tag = tag;
          this.organizeByTags(node);
          this.calculateNodeSize(node);
          node.setDirtyCanvas(true, false);
        }
    }));
    
    menuItems.push(null, {
      content: "Custom...",
      callback: () => {
        const customTag = prompt("Enter custom tag:", widget.value.tag);
        if (customTag) {
          widget.value.tag = customTag;
          this.organizeByTags(node);
          this.calculateNodeSize(node);
          node.setDirtyCanvas(true, false);
        }
      }
    });

    new LiteGraph.ContextMenu(menuItems, { title: 'Select Tag' });
  }

  /**
   * Show settings dialog
   */
  static showSettingsDialog(node: any, event?: any): void {
    const menuItems = [
      {
        content: `${node.properties.enableTags ? "✅" : "❌"} Enable Tags`,
        callback: () => {
          node.properties.enableTags = !node.properties.enableTags;
          this.organizeByTags(node);
          this.calculateNodeSize(node);
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.showTriggerWords ? "✅" : "❌"} Show Trigger Words`,
        callback: () => {
          node.properties.showTriggerWords = !node.properties.showTriggerWords;
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.showSeparateStrengths ? "✅" : "❌"} Separate Model/CLIP Strengths`,
        callback: () => {
          node.properties.showSeparateStrengths = !node.properties.showSeparateStrengths;
          node.setDirtyCanvas(true, false);
        }
      },
      {
        content: `${node.properties.autoFetchTriggerWords ? "✅" : "❌"} Auto-fetch Trigger Words`,
        callback: () => {
          node.properties.autoFetchTriggerWords = !node.properties.autoFetchTriggerWords;
        }
      }
    ];

    new LiteGraph.ContextMenu(menuItems, { title: 'Settings', event: event });
  }

  /**
   * Show save template dialog
   */
  static showSaveTemplateDialog(node: any): void {
    const templateName = prompt('Enter template name:', 'My LoRA Set');
    if (templateName && templateName.trim()) {
            const configs = this.getLoraConfigs(node);
      this.templateService.saveTemplate(templateName.trim(), configs)
        .then(success => {
            if (success) {
            this.showToast(`Template "${templateName.trim()}" saved successfully!`, 'success');
            } else {
              this.showToast('Failed to save template', 'error');
            }
        });
    }
  }

  /**
   * Show load template dialog with enhanced UI
   */
  static async showLoadTemplateDialog(node: any, event?: any): Promise<void> {
    try {
      const templateNames = await this.templateService.getTemplateNames();
      if (templateNames.length === 0) {
        this.showToast('📁 No templates available. Create one first!', 'info');
        return;
      }

      const items = templateNames.map(name => ({ id: name, label: name }));

      this.showSearchOverlay({
        title: 'Load Template',
        placeholder: 'Search templates...',
        items,
        onChoose: async (name: string) => {
          try {
            const template = await this.templateService.loadTemplate(name);
            if (template) {
              this.loadTemplate(node, template);
              this.showToast(`✅ Template "${name}" loaded successfully!`, 'success');
            } else {
              this.showToast(`❌ Failed to load template "${name}". It may be corrupted.`, 'error');
            }
          } catch (error) {
            console.error(`Template load error for "${name}":`, error);
            this.showToast(`❌ Error loading template "${name}". Check console for details.`, 'error');
          }
        }
      });
    } catch (error) {
      console.error('Failed to show template selector:', error);
      this.showToast('❌ Error loading templates. Check console for details.', 'error');
    }
  }

  /**
   * Add a new LoRA widget
   */
  static addLoraWidget(node: any, config?: Partial<LoraConfig>): SuperLoraWidget {
    const widget = new SuperLoraWidget(`lora_${Date.now()}`);
    
    if (config) {
      Object.assign(widget.value, config);
    }
    
    // Append to bottom (after all existing widgets)
    node.customWidgets = node.customWidgets || [];
    node.customWidgets.push(widget);
    
    // Update node size and trigger redraw
    this.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    
    return widget;
  }

  /**
   * Remove a LoRA widget
   */
  static removeLoraWidget(node: any, widget: SuperLoraWidget): void {
    const index = node.customWidgets.indexOf(widget);
    if (index >= 0) {
      node.customWidgets.splice(index, 1);
      this.organizeByTags(node);
      this.calculateNodeSize(node);
      node.setDirtyCanvas(true, false);
    }
  }

  /**
   * Organize widgets by tags
   */
  static organizeByTags(node: any): void {
    if (!node.properties.enableTags) {
      // Remove all tag widgets when tags are disabled
      node.customWidgets = node.customWidgets.filter(w => !(w instanceof SuperLoraTagWidget));
      return;
    }
    
    const loraWidgets = node.customWidgets.filter(w => w instanceof SuperLoraWidget);
    const headerWidget = node.customWidgets.find(w => w instanceof SuperLoraHeaderWidget);
    
    // Group by tags
    const tagGroups: { [key: string]: SuperLoraWidget[] } = {};
    for (const widget of loraWidgets) {
      const tag = widget.value.tag || "General";
      if (!tagGroups[tag]) tagGroups[tag] = [];
      tagGroups[tag].push(widget);
    }

    // Rebuild widgets array
    node.customWidgets = [headerWidget].filter(Boolean);
    
    const sortedTags = Object.keys(tagGroups).sort((a, b) => 
      a === "General" ? -1 : b === "General" ? 1 : a.localeCompare(b)
    );
    
    for (const tag of sortedTags) {
      // Find or create tag widget
      let tagWidget = node.customWidgets.find((w: any) => 
        w instanceof SuperLoraTagWidget && w.tag === tag
      );
      
      if (!tagWidget) {
        tagWidget = new SuperLoraTagWidget(tag);
      }
      
      node.customWidgets.push(tagWidget);
      node.customWidgets.push(...tagGroups[tag]);
    }
  }

  /**
   * Get used LoRA names
   */
  private static getUsedLoras(node: any): Set<string> {
    return new Set(
      node.customWidgets
        .filter((w: any) => w instanceof SuperLoraWidget)
        .map((w: any) => w.value.lora)
        .filter((lora: string) => lora && lora !== "None")
    );
  }

  /**
   * Check if a LoRA is already used in the node
   */
  private static isDuplicateLora(node: any, loraName: string): boolean {
    const usedLoras = this.getUsedLoras(node);
    return usedLoras.has(loraName);
  }

  /**
   * Get existing tags
   */
  private static getExistingTags(node: any): string[] {
    return Array.from(new Set(
      node.customWidgets
        .filter((w: any) => w instanceof SuperLoraWidget)
        .map((w: any) => w.value.tag)
        .filter((tag: string) => tag)
    ));
  }

  /**
   * Get LoRA configurations
   */
  private static getLoraConfigs(node: any): LoraConfig[] {
    return node.customWidgets
      .filter((w: any) => w instanceof SuperLoraWidget)
      .map((w: any) => ({
        lora: w.value.lora,
        enabled: w.value.enabled,
        strength_model: w.value.strength,
        strength_clip: w.value.strengthClip,
        trigger_word: w.value.triggerWords,
        tag: w.value.tag,
        auto_populated: w.value.autoFetched
      }))
      .filter((config: LoraConfig) => config.lora && config.lora !== "None");
  }

  /**
   * Load template configurations
   */
  private static loadTemplate(node: any, configs: LoraConfig[]): void {
    // Clear existing LoRA widgets
    node.customWidgets = node.customWidgets.filter(w => 
      !(w instanceof SuperLoraWidget) && !(w instanceof SuperLoraTagWidget)
    );
    
    // Add widgets for each config
    for (const config of configs) {
      const widget = new SuperLoraWidget(`lora_${Date.now()}_${Math.random()}`);
      widget.value = {
        lora: config.lora,
        enabled: config.enabled !== false,
        strength: config.strength_model || 1.0,
        strengthClip: config.strength_clip || config.strength_model || 1.0,
        triggerWords: config.trigger_word || "",
        tag: config.tag || "General",
        autoFetched: config.auto_populated || false
      };
      node.customWidgets.push(widget);
    }
    
    this.organizeByTags(node);
    this.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
  }

  /**
   * Serialize custom widgets for saving
   */
  static serializeCustomWidgets(node: any): any {
    if (!node.customWidgets) return null;
    
    return {
      properties: node.properties,
      widgets: node.customWidgets.map((widget: any) => ({
        name: widget.name,
        type: widget.constructor.name,
        value: widget.value
      }))
    };
  }

  /**
   * Deserialize custom widgets when loading
   */
  static deserializeCustomWidgets(node: any, data: any): void {
    if (!data) return;
    
    // Restore properties
    if (data.properties) {
      Object.assign(node.properties, data.properties);
    }
    
    // Restore widgets
    if (data.widgets) {
      node.customWidgets = [];
      
      for (const widgetData of data.widgets) {
        let widget: any;
        
        switch (widgetData.type) {
          case 'SuperLoraHeaderWidget':
            widget = new SuperLoraHeaderWidget();
            break;
          case 'SuperLoraTagWidget':
            widget = new SuperLoraTagWidget(widgetData.value.tag);
            break;
          case 'SuperLoraWidget':
            widget = new SuperLoraWidget(widgetData.name);
            break;
          default:
            continue;
        }
        
        widget.value = { ...widget.value, ...widgetData.value };
        node.customWidgets.push(widget);
      }
    }
    
    // Ensure minimum widgets
    if (!node.customWidgets.find((w: any) => w instanceof SuperLoraHeaderWidget)) {
      node.customWidgets.unshift(new SuperLoraHeaderWidget());
    }
    
    node.setDirtyCanvas(true, true);
  }

  /**
   * Get execution data for backend
   */
  static getExecutionData(node: any): any {
    const loraWidgets = node.customWidgets?.filter((w: any) => w instanceof SuperLoraWidget) || [];
    const executionData: any = {};
    
    // Add LoRA configurations
    loraWidgets.forEach((widget: any, index: number) => {
      if (widget.value.lora && widget.value.lora !== "None") {
        executionData[`lora_${index}`] = {
          lora: widget.value.lora,
          enabled: widget.value.enabled,
          strength: widget.value.strength,
          strengthClip: widget.value.strengthClip,
          triggerWords: widget.value.triggerWords,
          tag: widget.value.tag,
          autoFetched: widget.value.autoFetched
        };
      }
    });
    
    return executionData;
  }

  /**
   * Show toast notification with enhanced styling
   */
  private static showToast(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    console.log(`Super LoRA Loader [${type}]: ${message}`);

    // Define colors for different types
    const colors = {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 14px 20px;
      border-radius: 6px;
      z-index: 10000;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;

    // Add a subtle border
    toast.style.borderLeft = '4px solid rgba(255,255,255,0.3)';
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);

    // Auto remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, type === 'error' ? 5000 : 3000); // Errors stay longer
  }

  // Inline editors for better UX
  static showInlineNumber(event: any, initial: number, onCommit: (v: number) => void): void {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.05';
    input.value = String(initial ?? 0);
    input.style.cssText = `
      position: fixed;
      left: ${(() => { const p = (SuperLoraNode as any)._lastPointerScreen; return ((event?.clientX ?? p?.x ?? 100) + 8); })()}px;
      top: ${(() => { const p = (SuperLoraNode as any)._lastPointerScreen; return ((event?.clientY ?? p?.y ?? 100) - 10); })()}px;
      width: 80px;
      padding: 4px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
    `;
    const cleanup = () => input.remove();
    const commit = () => { const v = parseFloat(input.value); if (!Number.isNaN(v)) onCommit(v); cleanup(); };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') cleanup();
    });
    input.addEventListener('blur', cleanup);
    document.body.appendChild(input);
    input.focus();
    input.select();
  }

  static showInlineText(event: any, initial: string, onCommit: (v: string) => void): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = initial ?? '';
    input.style.cssText = `
      position: fixed;
      left: ${(() => { const p = (SuperLoraNode as any)._lastPointerScreen; return ((event?.clientX ?? p?.x ?? 100) + 8); })()}px;
      top: ${(() => { const p = (SuperLoraNode as any)._lastPointerScreen; return ((event?.clientY ?? p?.y ?? 100) - 10); })()}px;
      width: 260px;
      padding: 4px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
    `;
    const cleanup = () => input.remove();
    const commit = () => { onCommit(input.value ?? ''); cleanup(); };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') cleanup();
    });
    input.addEventListener('blur', cleanup);
    document.body.appendChild(input);
    input.focus();
    input.select();
  }

  // Overlay utilities
  private static showSearchOverlay(opts: { title: string; placeholder: string; items: { id: string; label: string; disabled?: boolean }[]; onChoose: (id: string) => void; }): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 2147483600;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 560px;
      max-height: 70vh;
      background: #222;
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      color: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.textContent = opts.title;
    header.style.cssText = `
      padding: 12px 14px;
      font-weight: 600;
      border-bottom: 1px solid #444;
      background: #2a2a2a;
    `;

    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = opts.placeholder;
    search.style.cssText = `
      margin: 10px 12px;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #555;
      background: #1a1a1a;
      color: #fff;
      outline: none;
    `;

    const listWrap = document.createElement('div');
    listWrap.style.cssText = `
      overflow: auto;
      padding: 6px 4px 10px 4px;
    `;

    const list = document.createElement('div');
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 0 8px 8px 8px;
    `;

    const empty = document.createElement('div');
    empty.textContent = 'No results';
    empty.style.cssText = 'padding: 12px; color: #aaa; display: none;';

    const close = () => overlay.remove();

    const render = (term: string) => {
      list.innerHTML = '';
      const q = (term || '').trim().toLowerCase();
      const filtered = q
        ? opts.items.filter(i => i.label.toLowerCase().includes(q))
        : opts.items;
      empty.style.display = filtered.length ? 'none' : 'block';
      const maxToShow = Math.min(2000, filtered.length); // show many, still capped for perf
      filtered.slice(0, maxToShow).forEach(i => {
        const row = document.createElement('button');
        row.type = 'button';
        row.textContent = i.label + (i.disabled ? '  (added)' : '');
        row.disabled = !!i.disabled;
        row.style.cssText = `
          text-align: left;
          padding: 10px 12px;
          background: ${i.disabled ? '#2a2a2a' : '#252525'};
          color: ${i.disabled ? '#888' : '#fff'};
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          cursor: ${i.disabled ? 'not-allowed' : 'pointer'};
        `;
        row.addEventListener('click', () => { if (!i.disabled) { opts.onChoose(i.id); close(); } });
        list.appendChild(row);
      });
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey as any); } });

    listWrap.appendChild(empty);
    listWrap.appendChild(list);
    panel.appendChild(header);
    panel.appendChild(search);
    panel.appendChild(listWrap);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    search.addEventListener('input', () => render(search.value));
    setTimeout(() => { search.focus(); render(''); }, 0);
  }

  private static showNameOverlay(opts: { title: string; placeholder: string; initial?: string; submitLabel?: string; onCommit: (name: string) => void }): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 2147483600; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);`;
    const panel = document.createElement('div');
    panel.style.cssText = `width: 420px; background: #222; border: 1px solid #444; border-radius: 8px; color: #fff; font-family: 'Segoe UI', Arial, sans-serif; box-shadow: 0 12px 30px rgba(0,0,0,0.4); overflow: hidden;`;
    const header = document.createElement('div'); header.textContent = opts.title; header.style.cssText = `padding: 12px 14px; font-weight: 600; border-bottom: 1px solid #444; background: #2a2a2a;`;
    const form = document.createElement('form'); form.style.cssText = `display: flex; gap: 8px; padding: 14px;`;
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = opts.placeholder; input.value = opts.initial || ''; input.style.cssText = `flex: 1; padding: 10px 12px; border-radius: 6px; border: 1px solid #555; background: #1a1a1a; color: #fff; outline: none;`;
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = opts.submitLabel || 'Save'; submit.style.cssText = `padding: 10px 14px; background: #1976d2; color: #fff; border: 1px solid #0d47a1; border-radius: 6px; cursor: pointer;`;
    const close = () => overlay.remove();
    form.addEventListener('submit', (e) => { e.preventDefault(); opts.onCommit(input.value); close(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey as any); } });
    form.appendChild(input); form.appendChild(submit);
    panel.appendChild(header); panel.appendChild(form); overlay.appendChild(panel); document.body.appendChild(overlay);
    setTimeout(() => input.focus(), 0);
  }
}
