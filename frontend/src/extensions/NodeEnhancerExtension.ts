/**
 * Node Enhancer Extension
 * Enhances existing ComfyUI nodes with advanced file picker overlays
 * Uses beforeRegisterNodeDef to inject enhanced UI into standard nodes
 */

import { FilePickerService } from '../services/FilePickerService';

// Enhanced node configurations
interface EnhancedNodeConfig {
  nodeType: string;
  fileType: string;
  widgetName: string;
  label?: string;
}

const GGUF_CLIP_WIDGET_MAP: Record<string, string[]> = {
  DualCLIPLoaderGGUF: ['clip_name1', 'clip_name2'],
  TripleCLIPLoaderGGUF: ['clip_name1', 'clip_name2', 'clip_name3'],
  QuadrupleCLIPLoaderGGUF: ['clip_name1', 'clip_name2', 'clip_name3', 'clip_name4']
};

export class NodeEnhancerExtension {
  private static readonly ENHANCED_NODES: EnhancedNodeConfig[] = [
    {
      nodeType: 'CheckpointLoader',
      fileType: 'models',
      widgetName: 'ckpt_name',
      label: 'Enhanced Model Picker'
    },
    {
      nodeType: 'CheckpointLoaderSimple',
      fileType: 'models',
      widgetName: 'ckpt_name',
      label: 'Enhanced Model Picker'
    },
    {
      nodeType: 'VAELoader',
      fileType: 'vae',
      widgetName: 'vae_name',
      label: 'Enhanced VAE Picker'
    },
    {
      nodeType: 'LoraLoader',
      fileType: 'loras',
      widgetName: 'lora_name',
      label: 'Enhanced LoRA Picker'
    },
    {
      nodeType: 'UNETLoader',
      fileType: 'diffusion_models',
      widgetName: 'unet_name',
      label: 'Enhanced UNET Picker'
    },
    {
      nodeType: 'UnetLoaderGGUF',
      fileType: 'gguf_unet_models',
      widgetName: 'unet_name',
      label: 'Enhanced UNET GGUF Picker'
    },
    {
      nodeType: 'UnetLoaderGGUFAdvanced',
      fileType: 'gguf_unet_models',
      widgetName: 'unet_name',
      label: 'Enhanced UNET GGUF Picker'
    },
    {
      nodeType: 'CLIPLoader',
      fileType: 'text_encoders',
      widgetName: 'clip_name',
      label: 'Enhanced CLIP Picker'
    },
    {
      nodeType: 'CLIPLoaderGGUF',
      fileType: 'text_encoders',
      widgetName: 'clip_name',
      label: 'Enhanced CLIP GGUF Picker'
    },
    ...Object.entries(GGUF_CLIP_WIDGET_MAP).flatMap(([nodeType, widgetNames]) =>
      widgetNames.map((widgetName, index) => ({
        nodeType,
        fileType: 'text_encoders',
        widgetName,
        label: `Enhanced CLIP GGUF Picker (${index + 1})`
      }))
    ),
    {
      nodeType: 'ControlNetLoader',
      fileType: 'controlnet',
      widgetName: 'control_net_name',
      label: 'Enhanced ControlNet Picker'
    },
    {
      nodeType: 'UpscaleModelLoader',
      fileType: 'upscale_models',
      widgetName: 'model_name',
      label: 'Enhanced Upscale Picker'
    }
  ];

  private static filePickerService: FilePickerService = FilePickerService.getInstance();
  private static readonly HIDDEN_WIDGET_SIZE = (_width?: number) => [0, -4] as [number, number];

  private static createOverlayWidget(node: any, targetWidget: any, config: EnhancedNodeConfig): any {
    const overlayWidget: any = {
      name: `${config.widgetName}__ndOverlay`,
      type: 'ndPowerOverlay',
      value: targetWidget.value ?? '',
      _ndDisplayValue: targetWidget.value ?? '',
      _ndWidgetLabel: targetWidget.label || targetWidget.name || config.widgetName,
      _ndPlaceholder: NodeEnhancerExtension.buildPlaceholder(config, targetWidget),
      __ndOverlay: true,
      __ndTargetWidgetName: config.widgetName,
      serialize: false,
      parent: node,
      computeSize(width: number) {
        const H = (window as any).LiteGraph?.NODE_WIDGET_HEIGHT || 20;
        return [width, H];
      },
      draw(this: any, ctx: CanvasRenderingContext2D, nodeRef: any, widgetWidth: number, widgetY: number) {
        const H = (window as any).LiteGraph?.NODE_WIDGET_HEIGHT || 20;
        const margin = 6;
        const gutter = 10;
        const inset = 8;
        const caretPadding = 14;
        const x = margin + gutter;
        const y = widgetY;
        const availableWidth = Math.max(60, widgetWidth - margin * 2 - gutter * 2);
        const w = Math.max(120, Math.min(availableWidth, (nodeRef?.size?.[0] || widgetWidth) - 24));
        const labelText = this._ndWidgetLabel || config.widgetName;
        const rawValue = (this._ndDisplayValue && String(this._ndDisplayValue)) || this._ndPlaceholder;
        const isPlaceholder = rawValue === this._ndPlaceholder;

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#555';
        ctx.fillStyle = '#1f1f1f';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x, y, w, H, 5);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(x, y, w, H);
          ctx.strokeRect(x, y, w, H);
        }

        ctx.font = '12px Arial';
        ctx.textBaseline = 'middle';

        const labelFullWidth = ctx.measureText(labelText).width;
        const valueFullWidth = ctx.measureText(rawValue).width;
        const valueEnd = x + w - inset - caretPadding;
        const labelSpacing = 8;

        let showLabel = labelFullWidth > 0;
        let labelWidth = Math.min(labelFullWidth, w * 0.35);
        let valueStart = showLabel ? x + inset + labelWidth + labelSpacing : x + inset;
        let valueMaxWidth = Math.max(12, valueEnd - valueStart);

        if (valueFullWidth > valueMaxWidth && showLabel) {
          showLabel = false;
          labelWidth = 0;
          valueStart = x + inset;
          valueMaxWidth = Math.max(12, valueEnd - valueStart);
        }

        let displayLabel = '';
        if (showLabel) {
          const labelMaxWidth = Math.max(12, valueStart - (x + inset) - labelSpacing);
          displayLabel = labelFullWidth <= labelMaxWidth
            ? labelText
            : NodeEnhancerExtension.truncateText(ctx, labelText, labelMaxWidth, false);
          if (!displayLabel.trim()) {
            showLabel = false;
            valueStart = x + inset;
            valueMaxWidth = Math.max(12, valueEnd - valueStart);
          }
        }

        const displayValue = valueFullWidth <= valueMaxWidth
          ? rawValue
          : NodeEnhancerExtension.truncateText(ctx, rawValue, valueMaxWidth, false);

        if (showLabel) {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#888888';
          ctx.fillText(displayLabel, x + inset, y + H / 2);
        }

        ctx.textAlign = 'right';
        ctx.fillStyle = isPlaceholder ? '#7a7a7a' : '#ffffff';
        ctx.fillText(displayValue, valueEnd, y + H / 2);

        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText('▾', x + w - inset - 4, y + H / 2 + 1);

        ctx.restore();

        this.last_y = widgetY;
        this.last_height = H;
      },
      mouse(this: any, event: any, pos: any, nodeRef: any) {
        const evtType = event?.type;
        const isLeft = event?.button === 0 || event?.which === 1 || event?.button === undefined;
        if (evtType === 'pointerdown' && isLeft) {
          NodeEnhancerExtension.showEnhancedPicker(nodeRef ?? node, config);
          return true;
        }
        if (evtType === 'pointerup' && isLeft) {
          return true;
        }
        return false;
      },
      serializeValue() {
        if (typeof targetWidget.serializeValue === 'function') {
          try {
            return targetWidget.serializeValue();
          } catch {}
        }
        return targetWidget.value;
      }
    };

    overlayWidget.callback = () => {
      NodeEnhancerExtension.showEnhancedPicker(node, config);
    };

    overlayWidget.updateDisplay = (value: string | undefined | null, displayValue?: string | null) => {
      const normalizedValue = typeof value === 'string' ? value : '';
      const normalizedDisplay = typeof displayValue === 'string' ? displayValue : normalizedValue;
      overlayWidget.value = normalizedValue;
      overlayWidget._ndDisplayValue = normalizedDisplay || '';
    };

    return overlayWidget;
  }

  private static formatDisplayValue(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    try {
      return String(value);
    } catch {
      return '';
    }
  }

  private static buildPlaceholder(config: EnhancedNodeConfig, widget: any): string {
    const base = widget?.label || widget?.name || config.label || config.widgetName || 'file';
    return `Select ${base}`;
  }

  private static enhanceWidget(node: any, widget: any, config: EnhancedNodeConfig): void {
    node.__ndEnhancedWidgets = node.__ndEnhancedWidgets || {};
    const meta = node.__ndEnhancedWidgets[config.widgetName] || { original: {} };
    const original = meta.original as Record<string, any>;

    if (!('callback' in original)) original.callback = widget.callback;
    if (!('mouse' in original)) original.mouse = widget.mouse;
    if (!('draw' in original)) original.draw = widget.draw;
    if (!('computeSize' in original)) original.computeSize = widget.computeSize;
    if (!('hidden' in original)) original.hidden = widget.hidden;
    if (!('options' in original)) original.options = widget.options ? { ...widget.options } : undefined;
    if (!('serialize' in original)) original.serialize = widget.serialize;
    if (!('skipSerialize' in original)) original.skipSerialize = widget.skipSerialize;

    widget._ndPlaceholder = NodeEnhancerExtension.buildPlaceholder(config, widget);
    widget.hidden = true;
    widget.computeSize = NodeEnhancerExtension.HIDDEN_WIDGET_SIZE;

    if (!meta.overlay) {
      const overlay = NodeEnhancerExtension.createOverlayWidget(node, widget, config);
      meta.overlay = overlay;
      if (!node.widgets) node.widgets = [];
      const idx = node.widgets.indexOf(widget);
      if (idx >= 0) node.widgets.splice(idx + 1, 0, overlay);
      else node.widgets.push(overlay);
    }

    widget.callback = function() {
      NodeEnhancerExtension.showEnhancedPicker(node, config);
      return true;
    };

    widget.mouse = function(event: any, pos: any, nodeRef: any) {
      const evtType = event?.type;
      const isLeft = evtType === 'pointerdown' && (event?.button === 0 || event?.which === 1 || event?.button === undefined);
      if (isLeft) {
        NodeEnhancerExtension.showEnhancedPicker(nodeRef ?? node, config);
        return true;
      }
      if (typeof meta.original.mouse === 'function') {
        return meta.original.mouse.call(this, event, pos, nodeRef ?? node);
      }
      return false;
    };

    node.__ndEnhancedWidgets[config.widgetName] = meta;
  }

  private static restoreWidget(node: any, widget: any | undefined, config: EnhancedNodeConfig): void {
    const meta = node.__ndEnhancedWidgets?.[config.widgetName];
    if (!meta) return;

    const original = meta.original || {};

    if (widget) {
      if ('callback' in original) {
        widget.callback = original.callback;
      } else {
        delete widget.callback;
      }

      if ('mouse' in original) {
        widget.mouse = original.mouse;
      } else {
        delete widget.mouse;
      }

      if ('draw' in original) {
        widget.draw = original.draw;
      } else {
        delete widget.draw;
      }

      if ('computeSize' in original) {
        if (original.computeSize) {
          widget.computeSize = original.computeSize;
        } else {
          delete widget.computeSize;
        }
      }

      if ('serialize' in original) {
        widget.serialize = original.serialize;
      } else {
        delete widget.serialize;
      }

      if ('skipSerialize' in original) {
        widget.skipSerialize = original.skipSerialize;
      } else {
        delete widget.skipSerialize;
      }

      if ('options' in original) {
        if (original.options === undefined) {
          delete widget.options;
        } else {
          widget.options = { ...original.options };
        }
      }

      if ('hidden' in original) {
        if (original.hidden === undefined) {
          delete widget.hidden;
        } else {
          widget.hidden = original.hidden;
        }
      } else {
        delete widget.hidden;
      }

      delete widget._ndPlaceholder;
      delete widget.last_y;
      delete widget.last_height;
      delete widget._ndDisplayValue;
    }

    if (meta.overlay) {
      const idx = node.widgets?.indexOf(meta.overlay) ?? -1;
      if (idx >= 0) node.widgets.splice(idx, 1);
      delete meta.overlay;
    }

    delete node.__ndEnhancedWidgets[config.widgetName];
    if (node.__ndEnhancedWidgets && Object.keys(node.__ndEnhancedWidgets).length === 0) {
      delete node.__ndEnhancedWidgets;
    }
  }

  /**
   * Initialize the node enhancer extension
   */
  static async initialize(): Promise<void> {
    console.log('Node Enhancer Extension: Initializing...');

    // Load user preferences
    this.loadUserPreferences();

    // Initialize file picker service
    await this.filePickerService;

    console.log('Node Enhancer Extension: Initialized successfully');
  }

  /**
   * Set up enhancement for a specific node type
   */
  static setup(nodeType: any, nodeData: any): void {
    const configs = this.ENHANCED_NODES.filter(c => c.nodeType === nodeData.name);
    if (!configs.length) return;

    const originalCreate = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function() {
      originalCreate?.apply(this, arguments);
      if (!this.__ndPowerEnabled) this.__ndPowerEnabled = false;
      if (this.__ndPowerEnabled) {
        configs.forEach(cfg => NodeEnhancerExtension.enableForNode(this, cfg));
      }
    };

    const originalMenu = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(canvas: any, optionsArr?: any[]) {
      let options = Array.isArray(optionsArr) ? optionsArr : [];
      const maybe = originalMenu?.call(this, canvas, options);
      if (Array.isArray(maybe)) options = maybe;

      options.push(null);
      options.push({
        content: this.__ndPowerEnabled ? '➖ Disable ND Power UI' : '⚡ Enable ND Power UI',
        callback: () => {
          try {
            if (this.__ndPowerEnabled) {
              configs.forEach(cfg => NodeEnhancerExtension.disableForNode(this, cfg));
              this.__ndPowerEnabled = false;
            } else {
              configs.forEach(cfg => NodeEnhancerExtension.enableForNode(this, cfg));
              this.__ndPowerEnabled = true;
            }
            this.setDirtyCanvas?.(true, true);
          } catch (error) {
            console.warn('Node Enhancer: toggle failed', error);
          }
        }
      });
      return options;
    };

    const originalOnDrawForeground = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function(ctx: any) {
      if (originalOnDrawForeground) {
        originalOnDrawForeground.call(this, ctx);
      }
      NodeEnhancerExtension.drawEnhancedWidgets(this, ctx);
    };

    const originalSerialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function() {
      const data = originalSerialize ? originalSerialize.apply(this, arguments) : {};
      try {
        data.ndPowerEnabled = !!this.__ndPowerEnabled;

        if (this.__ndEnhancedWidgets && Array.isArray(this.widgets)) {
          const hasOverlayWidgets = this.widgets.some((w: any) => w?.__ndOverlay);
          if (hasOverlayWidgets) {
            const serializedValues: any[] = [];

            for (const widget of this.widgets) {
              if (!widget || widget.__ndOverlay || widget.serialize === false) {
                continue;
              }

              if (typeof widget.serializeValue === 'function') {
                try {
                  serializedValues.push(widget.serializeValue());
                  continue;
                } catch {}
              }

              serializedValues.push(widget.value ?? null);
            }

            data.widgets_values = serializedValues;
          }
        }
      } catch {}
      return data;
    };

    const originalConfigure = nodeType.prototype.configure;
    nodeType.prototype.configure = function(data: any) {
      if (originalConfigure) {
        originalConfigure.call(this, data);
      }
      try {
        if (typeof this.__ndPowerEnabled === 'undefined') this.__ndPowerEnabled = false;
        if (data && data.ndPowerEnabled) {
          if (!this.__ndPowerEnabled) {
            this.__ndPowerEnabled = true;
            configs.forEach((cfg) => NodeEnhancerExtension.enableForNode(this, cfg));
          }
        } else {
          configs.forEach((cfg) => NodeEnhancerExtension.disableForNode(this, cfg));
          this.__ndPowerEnabled = false;
        }
      } catch {}
    };

    const originalOnMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function(event: any, pos: any) {
      const handled = configs.some((cfg) => NodeEnhancerExtension.handleEnhancedMouseDown(this, event, pos, cfg));
      if (handled) {
        return true;
      }
      return originalOnMouseDown ? originalOnMouseDown.call(this, event, pos) : false;
    };

    console.log(`Node Enhancer: Successfully enhanced ${nodeData.name}`);
  }

  /**
   * Set up enhanced node with custom widgets
   */
  private static setupEnhancedNode(node: any, config: EnhancedNodeConfig): void {
    if (node.__ndEnhancedWidgets?.[config.widgetName]) {
      return;
    }

    const widget = node.widgets?.find((w: any) => w.name === config.widgetName);
    if (!widget) {
      console.warn(`Node Enhancer: Could not find widget "${config.widgetName}" in ${config.nodeType}`);
      return;
    }

    node.__ndPowerEnabled = true;
    node.__ndEnhancedWidgets = node.__ndEnhancedWidgets || {};
    node.__ndEnhancedWidgets[config.widgetName] = node.__ndEnhancedWidgets[config.widgetName] || { original: {} };

    this.enhanceWidget(node, widget, config);
  }

  /** Enable enhancement for a specific node instance */
  private static enableForNode(node: any, config: EnhancedNodeConfig): void {
    this.setupEnhancedNode(node, config);
  }

  /** Disable enhancement for a specific node instance */
  private static disableForNode(node: any, config: EnhancedNodeConfig): void {
    if (!node.__ndEnhancedWidgets || !node.__ndEnhancedWidgets[config.widgetName]) {
      return;
    }
    const widget = node.widgets?.find((w: any) => w.name === config.widgetName);
    NodeEnhancerExtension.restoreWidget(node, widget, config);
    if (!node.__ndEnhancedWidgets) {
      node.__ndPowerEnabled = false;
    }
  }

  private static showEnhancedPicker(node: any, config: EnhancedNodeConfig): void {
    const widget = node.widgets?.find((w: any) => w.name === config.widgetName);
    if (!widget) return;

    const currentValue = widget.value;

    this.filePickerService.showFilePicker(
      config.fileType,
      (file) => {
        try { widget.value = file.id; } catch {}
        const meta = node.__ndEnhancedWidgets?.[config.widgetName];
        if (meta?.overlay) {
          meta.overlay.updateDisplay(widget.value, file?.path || file?.id || file?.filename || widget.value);
        }
        node.setDirtyCanvas?.(true, true);
      },
      {
        title: `Select ${config.fileType}`,
        multiSelect: false,
        currentValue
      }
    );
  }

  /**
   * Handle mouse events for enhanced widgets
   */
  private static handleEnhancedMouseDown(node: any, event: any, pos: any, config: EnhancedNodeConfig): boolean {
    if (!node.__ndPowerEnabled || !node.__ndEnhancedWidgets || !node.__ndEnhancedWidgets[config.widgetName]) return false;

    const widget = node.widgets?.find((w: any) => w.name === config.widgetName);
    if (!widget) return false;

    try {
      const isLeft = (event?.button === 0) || (event?.which === 1) || !('button' in (event || {}));
      if (!isLeft) return false;

      const y = widget?.last_y ?? null;
      const H = (window as any).LiteGraph?.NODE_WIDGET_HEIGHT || 20;
      if (y == null) return false;

      const withinX = pos[0] >= 0 && pos[0] <= (node.size?.[0] || 200);
      const withinY = pos[1] >= y && pos[1] <= y + H;
      if (withinX && withinY) {
        this.showEnhancedPicker(node, config);
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Draw enhanced widgets (visual indicators)
   */
  private static drawEnhancedWidgets(node: any, ctx: any): void {
    if (!node.__ndPowerEnabled) return;

    const indicatorText = '⚡ Enhanced';

    ctx.save();
    ctx.font = '12px Arial';
    ctx.fillStyle = '#4CAF50';
    ctx.textAlign = 'left';

    const titleHeight = (node.constructor?.title_height ?? node.title_height ?? 24);
    const padding = 4;
    const y = Math.max(titleHeight, padding + 12);

    ctx.fillText(indicatorText, padding, y);
    ctx.restore();
  }

  // Preference helpers retained for future global defaults (no-op currently)
  private static loadUserPreferences(): void { /* no-op for per-node mode */ }
  private static saveUserPreferences(): void { /* no-op for per-node mode */ }
  static getAvailableEnhancements(): EnhancedNodeConfig[] { return this.ENHANCED_NODES; }

  static enableEnhancement(nodeTypeName: string): void {
    const config = this.ENHANCED_NODES.find(cfg => cfg.nodeType === nodeTypeName);
    if (!config) return;
    const graph = (window as any).app?.graph;
    if (!graph) return;
    (graph._nodes || []).forEach((node: any) => {
      if (node.type === nodeTypeName) {
        try {
          this.enableForNode(node, config);
          node.setDirtyCanvas?.(true, true);
        } catch (error) {
          console.warn('Node Enhancer: failed to enable node', node, error);
        }
      }
    });
  }

  private static loadSet(key: string, sessionFirst = false): Set<string> {
    try {
      if (sessionFirst) {
        const fromSession = sessionStorage.getItem(key);
        if (fromSession) return new Set(JSON.parse(fromSession));
      }
      const fromLocal = localStorage.getItem(key);
      if (fromLocal) return new Set(JSON.parse(fromLocal));
      if (!sessionFirst) {
        const fromSession = sessionStorage.getItem(key);
        if (fromSession) return new Set(JSON.parse(fromSession));
      }
    } catch {}
    return new Set();
  }

  private static persistSet(key: string, value: Set<string>): void {
    try {
      const data = JSON.stringify(Array.from(value));
      sessionStorage.setItem(key, data);
      localStorage.setItem(key, data);
    } catch {}
  }

  private static truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, keepEnd: boolean = false): string {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    const ellipsis = '…';

    if (keepEnd) {
      let length = text.length;
      while (length > 0) {
        const candidate = ellipsis + text.slice(Math.max(0, text.length - length));
        if (ctx.measureText(candidate).width <= maxWidth) {
          return candidate;
        }
        length--;
      }
      return text.slice(-1);
    }

    let length = text.length;
    while (length > 0) {
      const candidate = text.slice(0, length) + ellipsis;
      if (ctx.measureText(candidate).width <= maxWidth) {
        return candidate;
      }
      length--;
    }
    return ellipsis;
  }
}

// Export for use in other modules
export { NodeEnhancerExtension as default };
