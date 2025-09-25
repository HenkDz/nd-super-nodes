import { SuperLoraBaseWidget } from './SuperLoraBaseWidget';
import { WidgetAPI } from './WidgetAPI';
import { TriggerWordStore } from '@/services/TriggerWordStore';
import { SuperLoraTagWidget } from './SuperLoraTagWidget';

export class SuperLoraWidget extends SuperLoraBaseWidget {
  constructor(name: string) {
    super(name);
    this.value = {
      lora: "None",
      enabled: true,
      strength: 1.0,
      strengthClip: 1.0,
      triggerWords: "",
      tag: "General",
      autoFetched: false,
      fetchAttempted: false
    };
    this.hitAreas = {
      enabled: { bounds: [0, 0], onDown: this.onEnabledDown, priority: 60 },
      lora: { bounds: [0, 0], onClick: this.onLoraClick, priority: 10 },
      tag: { bounds: [0, 0], onClick: this.onTagClick, priority: 20 },
      strength: { bounds: [0, 0], onClick: this.onStrengthClick, priority: 80 },
      strengthDown: { bounds: [0, 0], onClick: this.onStrengthDownClick, priority: 90 },
      strengthUp: { bounds: [0, 0], onClick: this.onStrengthUpClick, priority: 90 },
      strengthClip: { bounds: [0, 0], onClick: this.onStrengthClipClick, priority: 80 },
      strengthClipDown: { bounds: [0, 0], onClick: this.onStrengthClipDownClick, priority: 90 },
      strengthClipUp: { bounds: [0, 0], onClick: this.onStrengthClipUpClick, priority: 90 },
      triggerWords: { bounds: [0, 0], onClick: this.onTriggerWordsClick, priority: 85 },
      refresh: { bounds: [0, 0], onClick: this.onRefreshClick, priority: 95 },
      remove: { bounds: [0, 0], onClick: this.onRemoveClick, priority: 100 },
      moveUp: { bounds: [0, 0], onClick: this.onMoveUpClick, priority: 70 },
      moveDown: { bounds: [0, 0], onClick: this.onMoveDownClick, priority: 70 }
    };
  }

  draw(ctx: any, node: any, w: number, posY: number, height: number): void {
    const margin = 8;
    const rowHeight = 28;

    ctx.save();
    const innerWidth = Math.max(0, w - margin * 2);
    const clampedHeight = Math.max(0, height);

    ctx.beginPath();
    ctx.rect(margin, posY, innerWidth, clampedHeight);
    ctx.clip();

    const bodyHeight = Math.max(4, height - 4);
    const bodyY = posY + (height >= bodyHeight ? Math.floor((height - bodyHeight) / 2) : 0);
    const cornerRadius = Math.min(6, bodyHeight / 2);

    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.roundRect(margin, bodyY, innerWidth, bodyHeight, cornerRadius || 0);
    ctx.fill();
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    if (!this.value.enabled) {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();
    }

    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";

    const topPad = node.properties?.showTriggerWords ? 4 : Math.max(4, Math.floor((height - rowHeight) / 2));
    let currentY = posY + topPad;

    this.drawFirstRow(ctx, node, w, currentY, rowHeight, height);

    ctx.restore();
  }

  private drawFirstRow(ctx: any, node: any, w: number, posY: number, rowHeight: number, fullHeight: number): void {
    const margin = 8;
    let posX = margin + 6;
    const midY = rowHeight / 2;

    const toggleSize = 20;
    const toggleY = (rowHeight - toggleSize) / 2;
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.roundRect(posX, posY + toggleY, toggleSize, toggleSize, 2);
    ctx.fill();
    ctx.strokeStyle = this.value.enabled ? "#1b5e20" : "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = this.value.enabled ? "#2e7d32" : "";
    ctx.textAlign = "center";
    ctx.font = "12px Arial";
    if (this.value.enabled) {
      ctx.fillText("●", posX + toggleSize / 2, posY + midY);
    }
    this.hitAreas.enabled.bounds = [posX, 0, toggleSize, fullHeight];
    posX += toggleSize + 8;

    const loraWidgets = node.customWidgets?.filter((w: any) => w instanceof SuperLoraWidget) || [];
    const indexInLoras = loraWidgets.indexOf(this as any);
    const lastIndex = loraWidgets.length - 1;
    const showMoveArrows = (loraWidgets.length > 1) && (node?.properties?.showMoveArrows !== false);
    const showStrength = node?.properties?.showStrengthControls !== false;
    const showRemove = node?.properties?.showRemoveButton !== false;

    const arrowSize = 20;
    const strengthWidth = 50;
    const btnSize = 20;
    const removeSize = 20;
    const gapSmall = 2;
    const gap = 8;

    const rightEdge = node.size[0] - margin;
    let cursorX = rightEdge;
    let removeX = -9999;
    let plusX = -9999;
    let minusX = -9999;
    let strengthX = -9999;
    let plusClipX = -9999;
    let minusClipX = -9999;
    let strengthClipX = -9999;
    let upX = -9999;
    let downX = -9999;

    if (showRemove) {
      cursorX -= removeSize; removeX = cursorX - gap; cursorX -= gap;
    }
    if (showStrength) {
      // Model strength group (rightmost)
      cursorX -= btnSize; plusX = cursorX - gap; cursorX -= gapSmall;
      cursorX -= strengthWidth; strengthX = cursorX - gap; cursorX -= gapSmall;
      cursorX -= btnSize; minusX = cursorX - gap; cursorX -= gap;
      // Optional CLIP strength group (to the left) when separate strengths enabled
      if (node?.properties?.showSeparateStrengths) {
        cursorX -= btnSize; plusClipX = cursorX - gap; cursorX -= gapSmall;
        cursorX -= strengthWidth; strengthClipX = cursorX - gap; cursorX -= gapSmall;
        cursorX -= btnSize; minusClipX = cursorX - gap; cursorX -= gap;
      }
    }
    if (showMoveArrows) {
      const leftMostMinus = (showStrength && node?.properties?.showSeparateStrengths)
        ? Math.min(minusX, minusClipX)
        : minusX;
      const arrowRightStart = showStrength ? (leftMostMinus - gap) : (showRemove ? (removeX - gap) : (rightEdge - gap));
      upX = arrowRightStart - arrowSize - 4;
      downX = upX - (arrowSize + 2);
      cursorX -= gap;
    }

    if (node?.properties?.enableTags && node?.properties?.showTagChip !== false) {
      const iconSize = 20;
      const iconY = posY + Math.floor((rowHeight - iconSize) / 2);
      ctx.fillStyle = this.value.enabled ? "#333" : "#2a2a2a";
      ctx.beginPath(); ctx.roundRect(posX, iconY, iconSize, iconSize, 2); ctx.fill();
      ctx.strokeStyle = "#444"; ctx.lineWidth = 1; ctx.stroke();
      // Set the icon font color to golden and dim when disabled
      ctx.fillStyle = "#FFD700"; // Gold color
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "12px Arial";
      ctx.save();
      if (!this.value.enabled) { ctx.globalAlpha *= 0.55; }
      ctx.fillText("🏷", posX + iconSize / 2, posY + midY);
      ctx.restore();
      this.hitAreas.tag.bounds = [posX, 0, iconSize, fullHeight];
      posX += iconSize + 6;
      ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    } else {
      this.hitAreas.tag.bounds = [0,0,0,0];
    }

    const loraLeft = posX;
    const rightMost = [
      showMoveArrows ? downX : null,
      showStrength ? minusX : null,
      (showStrength && node?.properties?.showSeparateStrengths) ? minusClipX : null,
      showRemove ? removeX : null
    ].filter(v => typeof v === 'number') as number[];
    const loraMaxRight = (rightMost.length ? Math.min(...rightMost) : rightEdge) - gap;
    const loraWidth = Math.max(100, loraMaxRight - loraLeft);

    const showTriggers = !!(node.properties && node.properties.showTriggerWords);
    const nameWidth = showTriggers ? Math.max(80, Math.floor(loraWidth * 0.6)) : loraWidth;
    const trigWidth = showTriggers ? (loraWidth - nameWidth) : 0;

    ctx.textAlign = "left";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = this.value.enabled ? "#fff" : "#888";
    const loraText = this.value.lora === "None" ? "Click to select LoRA..." : this.value.lora;
    const loraDisplay = this.truncateText(ctx, loraText, nameWidth);
    ctx.fillText(loraDisplay, loraLeft, posY + midY);
    this.hitAreas.lora.bounds = [loraLeft, 0, nameWidth, fullHeight];

    const controlsAlpha = this.value.enabled ? 1 : 0.55;
    ctx.save();
    ctx.globalAlpha *= controlsAlpha;

    const triggerLeft = loraLeft + nameWidth;
    if (showTriggers && trigWidth > 0) {
      const hasTrigger = !!(this.value.triggerWords && String(this.value.triggerWords).trim());
      const pillH = 20;
      const pillY = posY + Math.floor((rowHeight - pillH) / 2);
      (this as any)._triggerRect = { x: triggerLeft, y: pillY, w: trigWidth, h: pillH };
      ctx.fillStyle = "#2f2f2f";
      ctx.beginPath(); ctx.roundRect(triggerLeft, pillY, trigWidth, pillH, 3); ctx.fill();
      const padX = 6;
      ctx.textAlign = "left";
      ctx.font = "10px 'Segoe UI', Arial, sans-serif";
      if (hasTrigger) {
        ctx.fillStyle = this.value.enabled ? "#fff" : "#aaa";
        const trigDisplay = this.truncateText(ctx, String(this.value.triggerWords), trigWidth - padX * 2);
        ctx.fillText(trigDisplay, triggerLeft + padX, posY + midY);
      } else {
        ctx.fillStyle = "#888";
        const placeholder = "Click to add trigger words...";
        const phDisplay = this.truncateText(ctx, placeholder, trigWidth - padX * 2);
        ctx.fillText(phDisplay, triggerLeft + padX, posY + midY);
      }
      this.hitAreas.triggerWords.bounds = [triggerLeft, 0, trigWidth, fullHeight];

      try {
      const dotRadius = 7; // larger for clickable icon
      const dotCx = triggerLeft + trigWidth - 10;
      const dotCy = posY + midY;
        let showDot = true;
        let color = "rgba(74, 158, 255, 0.85)"; // default manual/edited (blue)
        const has = hasTrigger;
        const auto = !!this.value.autoFetched;
        const attempted = !!(this as any).value?.fetchAttempted;
        if (has && auto) {
          color = "rgba(40, 167, 69, 0.85)"; // green
        } else if (has && !auto) {
          color = "rgba(74, 158, 255, 0.85)"; // blue manual
        } else if (!has && attempted) {
          color = "rgba(253, 126, 20, 0.9)"; // orange, attempted but empty
        } else {
          // No trigger and not attempted yet: show neutral gray, keep clickable
          color = "rgba(160, 160, 160, 0.7)";
        }
      if (showDot) {
        ctx.save();
        // Outer circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dotCx, dotCy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        // Refresh arrow glyph (↻) with optional spin animation
        const now = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
        const spinActive = !!(this as any)._refreshSpinActive;
        const spinEnd = (this as any)._refreshSpinEnd || 0;
        const spinStart = (this as any)._refreshSpinStarted || 0;
        const isSpinning = spinActive && now < spinEnd;

        // Schedule next frame while spinning
        if (isSpinning) {
          try {
            if (!(this as any)._spinRafScheduled) {
              (this as any)._spinRafScheduled = true;
              (window.requestAnimationFrame || ((cb: any) => setTimeout(cb, 16)))(() => {
                (this as any)._spinRafScheduled = false;
                try { node.setDirtyCanvas(true, false); } catch {}
              });
            }
          } catch {}
        }

        ctx.fillStyle = '#111';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isSpinning) {
          const period = Math.max(500, (this as any)._refreshSpinPeriod || 800); // ms per rotation
          const progress = ((now - spinStart) % period) / period;
          const angle = progress * Math.PI * 2;
          ctx.save();
          ctx.translate(dotCx, dotCy);
          ctx.rotate(angle);
          ctx.fillText('↻', 0, 0);
          ctx.restore();
        } else {
          ctx.fillText('↻', dotCx, dotCy);
        }
        ctx.restore();
        // Click bounds for refresh (always enabled)
        const size = dotRadius * 2 + 2;
        this.hitAreas.refresh.bounds = [dotCx - dotRadius, 0, size, fullHeight];
      } else {
        this.hitAreas.refresh.bounds = [0,0,0,0];
      }
      } catch {}
    } else {
      this.hitAreas.triggerWords.bounds = [0, 0, 0, 0];
    }

    if (showMoveArrows && node?.properties?.showMoveArrows !== false) {
      const arrowY = (rowHeight - arrowSize) / 2;
      let disableDown: boolean;
      let disableUp: boolean;
      if (node?.properties?.enableTags) {
        const groupWidgets = (node.customWidgets || []).filter((w: any) => w instanceof SuperLoraWidget && w.value?.tag === this.value.tag);
        const groupIndex = groupWidgets.indexOf(this as any);
        const groupLastIndex = groupWidgets.length - 1;
        disableDown = groupIndex === groupLastIndex;
        disableUp = groupIndex === 0;
      } else {
        disableDown = indexInLoras === lastIndex;
        disableUp = indexInLoras === 0;
      }

      ctx.globalAlpha = (controlsAlpha) * (disableDown ? 0.35 : 1.0);
      ctx.fillStyle = "#555"; ctx.beginPath();
      ctx.roundRect(downX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("▼", downX + arrowSize / 2, posY + midY);
      this.hitAreas.moveDown.bounds = disableDown ? [0, 0, 0, 0] : [downX, 0, arrowSize, fullHeight];

      ctx.globalAlpha = (controlsAlpha) * (disableUp ? 0.35 : 1.0);
      ctx.fillStyle = "#555"; ctx.beginPath();
      ctx.roundRect(upX, posY + arrowY, arrowSize, arrowSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("▲", upX + arrowSize / 2, posY + midY);
      this.hitAreas.moveUp.bounds = disableUp ? [0, 0, 0, 0] : [upX, 0, arrowSize, fullHeight];

      ctx.globalAlpha = controlsAlpha;
    } else {
      this.hitAreas.moveUp.bounds = [0, 0, 0, 0];
      this.hitAreas.moveDown.bounds = [0, 0, 0, 0];
    }

    const btnY = (rowHeight - btnSize) / 2;
    if (showStrength) {
      ctx.fillStyle = "#666"; ctx.beginPath();
      ctx.roundRect(minusX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("-", minusX + btnSize / 2, posY + midY);
      this.hitAreas.strengthDown.bounds = [minusX, 0, btnSize, fullHeight];
    } else {
      this.hitAreas.strengthDown.bounds = [0,0,0,0];
    }

    if (node?.properties?.showStrengthControls !== false) {
      const strengthY = (rowHeight - 20) / 2;
      // Model strength background: muted purple when enabled, dark neutral when disabled
      ctx.fillStyle = this.value.enabled ? "#3b2a4a" : "#2a2a2a"; ctx.beginPath();
      ctx.roundRect(strengthX, posY + strengthY, strengthWidth, 20, 3);
      ctx.fill();
      ctx.strokeStyle = "#4a4a4a"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = this.value.enabled ? "#e5e5e5" : "#bdbdbd"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText(this.value.strength.toFixed(2), strengthX + strengthWidth / 2, posY + midY);
      this.hitAreas.strength.bounds = [strengthX, 0, strengthWidth, fullHeight];
    } else {
      this.hitAreas.strength.bounds = [0,0,0,0];
    }

    if (node?.properties?.showStrengthControls !== false) {
      ctx.fillStyle = "#666"; ctx.beginPath();
      ctx.roundRect(plusX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("+", plusX + btnSize / 2, posY + midY);
      this.hitAreas.strengthUp.bounds = [plusX, 0, btnSize, fullHeight];
    } else {
      this.hitAreas.strengthUp.bounds = [0,0,0,0];
    }

    // Draw CLIP strength controls when separate strengths are enabled
    if (showStrength && node?.properties?.showSeparateStrengths) {
      // Minus
      ctx.fillStyle = "#666"; ctx.beginPath();
      ctx.roundRect(minusClipX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("-", minusClipX + btnSize / 2, posY + midY);
      this.hitAreas.strengthClipDown.bounds = [minusClipX, 0, btnSize, fullHeight];

      // Value box
      const strengthY2 = (rowHeight - 20) / 2;
      // CLIP strength background: muted yellow/amber when enabled, dark neutral when disabled
      ctx.fillStyle = this.value.enabled ? "#4a3f1f" : "#2a2a2a"; ctx.beginPath();
      ctx.roundRect(strengthClipX, posY + strengthY2, strengthWidth, 20, 3);
      ctx.fill();
      ctx.strokeStyle = "#4a4a4a"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = this.value.enabled ? "#e5e5e5" : "#bdbdbd"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText(this.value.strengthClip.toFixed(2), strengthClipX + strengthWidth / 2, posY + midY);
      this.hitAreas.strengthClip.bounds = [strengthClipX, 0, strengthWidth, fullHeight];

      // Plus
      ctx.fillStyle = "#666"; ctx.beginPath();
      ctx.roundRect(plusClipX, posY + btnY, btnSize, btnSize, 2);
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("+", plusClipX + btnSize / 2, posY + midY);
      this.hitAreas.strengthClipUp.bounds = [plusClipX, 0, btnSize, fullHeight];
    } else {
      this.hitAreas.strengthClipDown.bounds = [0,0,0,0];
      this.hitAreas.strengthClip.bounds = [0,0,0,0];
      this.hitAreas.strengthClipUp.bounds = [0,0,0,0];
    }

    ctx.restore();

    if (node?.properties?.showRemoveButton !== false) {
      const removeY = (rowHeight - removeSize) / 2;
      ctx.fillStyle = "#3a2a2a"; ctx.beginPath();
      ctx.roundRect(removeX, posY + removeY, removeSize, removeSize, 2);
      ctx.fill();
      ctx.strokeStyle = "#5a3a3a"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px Arial";
      ctx.fillText("🗑", removeX + removeSize / 2, posY + midY);
      this.hitAreas.remove.bounds = [removeX, 0, removeSize, fullHeight];
    } else {
      this.hitAreas.remove.bounds = [0,0,0,0];
    }
  }

  public isCollapsedByTag(node: any): boolean {
    if (!node.customWidgets) return false;
    const tagWidget = node.customWidgets.find((w: any) => w instanceof SuperLoraTagWidget && w.tag === this.value.tag);
    return tagWidget?.isCollapsed?.() || false;
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

  onEnabledDown = (_event: any, _pos: any, node: any): boolean => {
    this.value.enabled = !this.value.enabled;
    node.setDirtyCanvas(true, false);
    try { WidgetAPI.syncExecutionWidgets(node); } catch {}
    return true;
  };

  onLoraClick = (event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showLoraSelector(node, this, event);
    return true;
  };

  onStrengthClick = (event: any, _pos: any, node: any): boolean => {
    try {
      const app = (window as any)?.app;
      const canvas = app?.canvas;
      if (canvas?.prompt) {
        canvas.prompt("Model Strength", this.value.strength ?? 1, (v: any) => {
          const val = parseFloat(v);
          if (!Number.isNaN(val)) {
            this.value.strength = Math.max(-10, Math.min(10, val));
            node.setDirtyCanvas(true, true);
          }
        }, event);
        return true;
      }
    } catch {}
    return false;
  };

  onStrengthDownClick = (_event: any, _pos: any, node: any): boolean => {
    this.value.strength = Math.max(-10, this.value.strength - 0.1);
    node.setDirtyCanvas(true, false);
    try { WidgetAPI.syncExecutionWidgets(node); } catch {}
    return true;
  };

  onStrengthUpClick = (_event: any, _pos: any, node: any): boolean => {
    this.value.strength = Math.min(10, this.value.strength + 0.1);
    node.setDirtyCanvas(true, false);
    try { WidgetAPI.syncExecutionWidgets(node); } catch {}
    return true;
  };

  onStrengthClipClick = (event: any, _pos: any, node: any): boolean => {
    try {
      const app = (window as any)?.app;
      const canvas = app?.canvas;
      if (canvas?.prompt) {
        canvas.prompt("CLIP Strength", this.value.strengthClip ?? this.value.strength ?? 1, (v: any) => {
          const val = parseFloat(v);
          if (!Number.isNaN(val)) {
            this.value.strengthClip = Math.max(-10, Math.min(10, val));
            node.setDirtyCanvas(true, true);
            try { WidgetAPI.syncExecutionWidgets(node); } catch {}
          }
        }, event);
        return true;
      }
    } catch {}
    return false;
  };

  onStrengthClipDownClick = (_event: any, _pos: any, node: any): boolean => {
    this.value.strengthClip = Math.max(-10, (this.value.strengthClip ?? this.value.strength ?? 1) - 0.1);
    node.setDirtyCanvas(true, false);
    try { WidgetAPI.syncExecutionWidgets(node); } catch {}
    return true;
  };

  onStrengthClipUpClick = (_event: any, _pos: any, node: any): boolean => {
    this.value.strengthClip = Math.min(10, (this.value.strengthClip ?? this.value.strength ?? 1) + 0.1);
    node.setDirtyCanvas(true, false);
    try { WidgetAPI.syncExecutionWidgets(node); } catch {}
    return true;
  };

  onMoveUpClick = (_event: any, _pos: any, node: any): boolean => {
    const idx = node.customWidgets.indexOf(this);
    if (idx <= 1) return true;
    if (node?.properties?.enableTags) {
      for (let j = idx - 1; j >= 0; j--) {
        const w = node.customWidgets[j];
        if (w instanceof SuperLoraWidget) {
          if (w.value?.tag === (this as any).value?.tag) {
            const tmp = node.customWidgets[idx];
            node.customWidgets[idx] = node.customWidgets[j];
            node.customWidgets[j] = tmp;
            break;
          } else if (!(w instanceof SuperLoraWidget)) {
            break;
          }
        }
        if (w instanceof SuperLoraTagWidget) break;
      }
    } else {
      const temp = node.customWidgets[idx];
      node.customWidgets[idx] = node.customWidgets[idx - 1];
      node.customWidgets[idx - 1] = temp;
    }
    WidgetAPI.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onMoveDownClick = (_event: any, _pos: any, node: any): boolean => {
    const idx = node.customWidgets.indexOf(this);
    if (idx >= node.customWidgets.length - 1) return true;
    if (node?.properties?.enableTags) {
      for (let j = idx + 1; j < node.customWidgets.length; j++) {
        const w = node.customWidgets[j];
        if (w instanceof SuperLoraWidget) {
          if (w.value?.tag === (this as any).value?.tag) {
            const tmp = node.customWidgets[idx];
            node.customWidgets[idx] = node.customWidgets[j];
            node.customWidgets[j] = tmp;
            break;
          } else if (!(w instanceof SuperLoraWidget)) {
            break;
          }
        }
        if (w instanceof SuperLoraTagWidget) break;
      }
    } else {
      const temp = node.customWidgets[idx];
      node.customWidgets[idx] = node.customWidgets[idx + 1];
      node.customWidgets[idx + 1] = temp;
    }
    WidgetAPI.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onTriggerWordsClick = (event: any, _pos: any, node: any): boolean => {
    try {
      try { event?.stopPropagation?.(); event?.preventDefault?.(); } catch {}
      if (WidgetAPI && typeof WidgetAPI.showInlineText === 'function') {
        const rect = (this as any)._triggerRect;
        const place = rect ? { rect, node, widget: this } : undefined as any;
        WidgetAPI.showInlineText(event, this.value.triggerWords || "", async (v: string) => {
          const newVal = String(v ?? "");
          this.value.triggerWords = newVal;
          this.value.autoFetched = false;
          (this as any).value = { ...this.value, fetchAttempted: false };
          try { TriggerWordStore.set(this.value.lora, newVal); } catch {}
          // If cleared, do NOT auto-fetch while widget remains. Fetch will occur on re-add or via refresh.
          (this as any).value = { ...this.value };
          node.setDirtyCanvas(true, true);
          try { WidgetAPI.syncExecutionWidgets(node); } catch {}
        }, place);
        return true;
      }
    } catch {}
    try {
      const app = (window as any)?.app;
      const canvas = app?.canvas;
      if (canvas?.prompt) {
        canvas.prompt("Trigger Words", this.value.triggerWords || "", async (v: any) => {
          const newVal = String(v ?? "");
          this.value.triggerWords = newVal;
          this.value.autoFetched = false;
          (this as any).value = { ...this.value, fetchAttempted: false };
          try { TriggerWordStore.set(this.value.lora, newVal); } catch {}
          // Do not auto-fetch on clear while widget remains
          node.setDirtyCanvas(true, true);
          try { WidgetAPI.syncExecutionWidgets(node); } catch {}
        }, event);
        return true;
      }
    } catch {}
    return false;
  };

  onRefreshClick = async (_event: any, _pos: any, node: any): Promise<boolean> => {
    // Start a short spin animation immediately for user feedback
    try {
      const now = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
      (this as any)._refreshSpinActive = true;
      (this as any)._refreshSpinStarted = now;
      (this as any)._refreshSpinEnd = now + 650; // minimum visible spin duration
      (this as any)._refreshSpinPeriod = 800; // ms per full rotation
      try { node.setDirtyCanvas(true, false); } catch {}
    } catch {}
    try {
      // Force re-fetch regardless of saved manual state
      try { TriggerWordStore.remove(this.value.lora); } catch {}
      this.value.triggerWords = '';
      this.value.autoFetched = false;
      (this as any).value = { ...this.value, fetchAttempted: false };
      await this.fetchTriggerWords();
      node.setDirtyCanvas(true, true);
      try { WidgetAPI.syncExecutionWidgets(node); } catch {}
      return true;
    } catch {
      return false;
    } finally {
      // Ensure the spin continues briefly even if operation is instant
      try {
        const now2 = (typeof performance !== 'undefined' && (performance as any).now) ? (performance as any).now() : Date.now();
        const end = Math.max(((this as any)._refreshSpinEnd || now2), now2 + 200);
        (this as any)._refreshSpinEnd = end;
        const timeoutMs = Math.max(0, end - now2);
        setTimeout(() => { (this as any)._refreshSpinActive = false; try { node.setDirtyCanvas(true, false); } catch {}; }, timeoutMs);
      } catch {}
    }
  };

  onTagClick = (_event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showTagSelector(node, this);
    return true;
  };

  onRemoveClick = (_event: any, _pos: any, node: any): boolean => {
    WidgetAPI.removeLoraWidget(node, this);
    return true;
  };

  computeSize(): [number, number] {
    return [450, 50];
  }

  setLora(lora: string, node?: any): void {
    this.value.lora = lora;
    // Always reset base state on LoRA change to avoid stale trigger words
    this.value.triggerWords = '';
    this.value.autoFetched = false;
    (this as any).value = { ...this.value, fetchAttempted: false };
    if (lora !== "None") {
      // Load any manually stored trigger words first
      try {
        const manual = TriggerWordStore.get(lora);
        if (manual) {
          this.value.triggerWords = manual;
          this.value.autoFetched = false;
          return; // Do not auto-fetch if user provided
        }
      } catch {}
      // If no manual value and auto-fetch enabled, fetch (only when node context provided)
      if (node && node?.properties?.autoFetchTriggerWords !== false) {
        this.fetchTriggerWords();
      }
    }
  }

  private async fetchTriggerWords(): Promise<void> {
    try {
      (this as any).value.fetchAttempted = true;
      // Respect manual override
      try {
        const manual = TriggerWordStore.get(this.value.lora);
        if (manual) {
          this.value.triggerWords = manual;
          this.value.autoFetched = false;
          return;
        }
      } catch {}

      const words = await WidgetAPI.civitaiService.getTriggerWords(this.value.lora);
      if (words.length > 0) {
        this.value.triggerWords = words.join(", ");
        this.value.autoFetched = true;
        try { TriggerWordStore.set(this.value.lora, this.value.triggerWords); } catch {}
      } else {
        // Mark attempted with no result so the indicator shows orange
        (this as any).value = { ...this.value, fetchAttempted: true };
      }
    } catch (error) {
      console.warn("Failed to fetch trigger words:", error);
    }
  }
}


