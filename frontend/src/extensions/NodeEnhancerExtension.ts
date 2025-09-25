/**
 * Node Enhancer Extension
 * Enhances existing ComfyUI nodes with advanced file picker overlays
 * Uses beforeRegisterNodeDef to inject enhanced UI into standard nodes
 */

// @ts-ignore: Provided by ComfyUI runtime
import { app } from '/scripts/app.js';
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
      label: 'ND Selector'
    },
    {
      nodeType: 'CheckpointLoaderSimple',
      fileType: 'models',
      widgetName: 'ckpt_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'VAELoader',
      fileType: 'vae',
      widgetName: 'vae_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'LoraLoader',
      fileType: 'loras',
      widgetName: 'lora_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'UNETLoader',
      fileType: 'diffusion_models',
      widgetName: 'unet_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'UnetLoaderGGUF',
      fileType: 'gguf_unet_models',
      widgetName: 'unet_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'UnetLoaderGGUFAdvanced',
      fileType: 'gguf_unet_models',
      widgetName: 'unet_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'CLIPLoader',
      fileType: 'text_encoders',
      widgetName: 'clip_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'CLIPLoaderGGUF',
      fileType: 'text_encoders',
      widgetName: 'clip_name',
      label: 'ND Selector'
    },
    ...Object.entries(GGUF_CLIP_WIDGET_MAP).flatMap(([nodeType, widgetNames]) =>
      widgetNames.map((widgetName, index) => ({
        nodeType,
        fileType: 'text_encoders',
        widgetName,
        label: `ND Selector (${index + 1})`
      }))
    ),
    {
      nodeType: 'ControlNetLoader',
      fileType: 'controlnet',
      widgetName: 'control_net_name',
      label: 'ND Selector'
    },
    {
      nodeType: 'UpscaleModelLoader',
      fileType: 'upscale_models',
      widgetName: 'model_name',
      label: 'ND Selector'
    }
  ];

  private static filePickerService: FilePickerService = FilePickerService.getInstance();
  private static readonly INDICATOR_LABEL = '⚡ ND UI';
  private static readonly HIDDEN_WIDGET_SIZE = (_width?: number) => [0, -4] as [number, number];
  private static readonly DEBUG = true;

  private static debugLog(...args: any[]): void {
    if (this.DEBUG) {
      console.debug('[NodeEnhancer]', ...args);
    }
  }

  private static normalizeValueForWidget(widget: any, value: string): string {
    if (!widget || typeof value !== 'string') {
      return value;
    }

    const sample = (() => {
      const opts = widget.options?.values;
      if (Array.isArray(opts)) {
        return opts.find((entry: any) => typeof entry === 'string');
      }
      if (opts && typeof opts === 'object') {
        return Object.keys(opts).find((key) => typeof key === 'string');
      }
      return undefined;
    })();

    if (typeof sample === 'string') {
      const prefersBackslash = sample.includes('\\') && !sample.includes('/');
      const prefersSlash = sample.includes('/') && !sample.includes('\\');

      if (prefersBackslash) {
        return value.replace(/\//g, '\\');
      }
      if (prefersSlash) {
        return value.replace(/\\/g, '/');
      }
    }

    return value;
  }
  private static isGloballyEnabled(): boolean {
    try {
      return app?.ui?.settings?.getSettingValue?.('nodeEnhancer.enableContextToggle', true) !== false;
    } catch {
      return true;
    }
  }

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

  private static ensureWidgetValueSelectable(widget: any, value: string): void {
    if (!widget || typeof value !== 'string') {
      return;
    }

    try {
      const before = widget.options?.values;
      if (!widget.options) {
        widget.options = { values: [value] };
        NodeEnhancerExtension.debugLog('Initialized widget options for value', value, { widgetName: widget.name });
        return;
      }

      const options = widget.options;
      const { values } = options;

      if (Array.isArray(values)) {
        if (!values.includes(value)) {
          options.values = [...values, value];
          NodeEnhancerExtension.debugLog('Appended value to array options', value, { widgetName: widget.name, before, after: options.values });
        }
        return;
      }

      if (values && typeof values === 'object') {
        if (!(value in values)) {
          options.values = { ...values, [value]: value };
          NodeEnhancerExtension.debugLog('Added value to object options', value, { widgetName: widget.name, before, after: options.values });
        }
        return;
      }

      options.values = [value];
      NodeEnhancerExtension.debugLog('Reset options.values to single entry', value, { widgetName: widget.name, before });
    } catch (error) {
      console.warn('Node Enhancer: failed to sync widget values', error);
    }
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
    if (!('values' in original)) original.values = widget.options?.values ? [...widget.options.values] : undefined;
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
          if (original.values !== undefined) {
            widget.options.values = [...original.values];
          }
        }
      } else if (widget.options && 'values' in widget.options) {
        delete widget.options.values;
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
    NodeEnhancerExtension.restoreTitle(node);
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
      if (typeof this.__ndOriginalTitle === 'undefined') {
        this.__ndOriginalTitle = this.title || this.constructor?.title || '';
      }
      if (this.__ndPowerEnabled) {
        configs.forEach(cfg => NodeEnhancerExtension.enableForNode(this, cfg));
        NodeEnhancerExtension.applyTitleBadge(this);
      } else {
        NodeEnhancerExtension.restoreTitle(this);
      }
    };

    const originalMenu = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(canvas: any, optionsArr?: any[]) {
      if (!NodeEnhancerExtension.isGloballyEnabled()) {
        return originalMenu ? originalMenu.call(this, canvas, optionsArr) : optionsArr;
      }
      let options = Array.isArray(optionsArr) ? optionsArr : [];
      const maybe = originalMenu?.call(this, canvas, options);
      if (Array.isArray(maybe)) options = maybe;

      const toggleOption = {
        content: this.__ndPowerEnabled ? '➖ Disable ND Power UI' : '⚡ Enable ND Power UI',
        callback: () => {
          try {
            if (this.__ndPowerEnabled) {
              configs.forEach(cfg => NodeEnhancerExtension.disableForNode(this, cfg));
              this.__ndPowerEnabled = false;
              NodeEnhancerExtension.restoreTitle(this);
            } else {
              configs.forEach(cfg => NodeEnhancerExtension.enableForNode(this, cfg));
              this.__ndPowerEnabled = true;
              NodeEnhancerExtension.applyTitleBadge(this);
            }
            this.setDirtyCanvas?.(true, true);
          } catch (error) {
            console.warn('Node Enhancer: toggle failed', error);
          }
        }
      };

      if (options[0] !== null) {
        options.unshift(null);
      }
      options.unshift(toggleOption);
      return options;
    };

    const originalOnDrawForeground = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function(ctx: any) {
      if (originalOnDrawForeground) {
        originalOnDrawForeground.call(this, ctx);
      }
      NodeEnhancerExtension.drawSelectorBadge(this, ctx);
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
          NodeEnhancerExtension.applyTitleBadge(this);
        } else {
          configs.forEach((cfg) => NodeEnhancerExtension.disableForNode(this, cfg));
          this.__ndPowerEnabled = false;
          NodeEnhancerExtension.restoreTitle(this);
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

    NodeEnhancerExtension.debugLog('Enhancing widget', {
      nodeType: node?.type,
      widgetName: widget?.name,
      initialValue: widget?.value,
      options: widget?.options?.values
    });

    this.enhanceWidget(node, widget, config);
    this.applyTitleBadge(node);
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
    NodeEnhancerExtension.restoreTitle(node);
  }

  private static showEnhancedPicker(node: any, config: EnhancedNodeConfig): void {
    const widget = node.widgets?.find((w: any) => w.name === config.widgetName);
    if (!widget) return;

    const currentValue = widget.value;

    this.filePickerService.showFilePicker(
      config.fileType,
      (file) => {
        let newValue: string | undefined;
        if (file && typeof file.id === 'string') {
          newValue = file.id;
        } else if (file && typeof file.path === 'string') {
          newValue = file.path;
        } else if (file && typeof file.filename === 'string') {
          newValue = file.filename;
        }

        NodeEnhancerExtension.debugLog('File picker selection', {
          nodeType: node?.type,
          widgetName: config.widgetName,
          file,
          proposedValue: newValue,
          existingValues: widget.options?.values
        });

        if (typeof newValue === 'string') {
          try {
            const normalizedValue = NodeEnhancerExtension.normalizeValueForWidget(widget, newValue);
            widget.value = normalizedValue;
            NodeEnhancerExtension.ensureWidgetValueSelectable(widget, normalizedValue);
            NodeEnhancerExtension.debugLog('Applied widget value', {
              nodeType: node?.type,
              widgetName: config.widgetName,
              newValue: normalizedValue,
              updatedValues: widget.options?.values
            });
          } catch (error) {
            console.warn('Node Enhancer: failed to assign widget value', error);
          }
        }

        const meta = node.__ndEnhancedWidgets?.[config.widgetName];
        if (meta?.overlay) {
          const displayValue = NodeEnhancerExtension.formatDisplayValue(
            (file && typeof file.label === 'string' && file.label) ||
            (file && typeof file.path === 'string' && file.path) ||
            (file && typeof file.filename === 'string' && file.filename) ||
            widget.value
          );
          meta.overlay.updateDisplay(widget.value, displayValue);
          NodeEnhancerExtension.debugLog('Updated overlay display', {
            nodeType: node?.type,
            widgetName: config.widgetName,
            displayValue,
            widgetValue: widget.value
          });
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

    // Legacy indicator is kept for compatibility but hidden by default.
  }

  private static drawSelectorBadge(node: any, ctx: any): void {
    if (!node.__ndPowerEnabled) return;

    const titleHeight = node.constructor?.title_height ?? node.title_height ?? 24;
    const nodeWidth = node.size?.[0] || 140;

    ctx.save();
    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    const label = NodeEnhancerExtension.INDICATOR_LABEL;
    const metrics = ctx.measureText(label);
    const textWidth = metrics.width;
    const textHeight = (metrics.actualBoundingBoxAscent ?? 7) + (metrics.actualBoundingBoxDescent ?? 3);
    const horizontalPadding = 10;
    const verticalPadding = 4;
    const minBadgeWidth = textWidth + horizontalPadding * 2;
    const badgeWidth = Math.max(56, Math.min(nodeWidth - 12, minBadgeWidth));
    const badgeHeight = Math.max(16, textHeight + verticalPadding * 2);
    const originX = Math.max(6, (nodeWidth - badgeWidth) / 2);
    const originY = Math.max(2, (titleHeight - badgeHeight) / 2);
    const radius = Math.min(8, badgeHeight / 2);

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(29, 114, 194, 0.22)';
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(originX, originY, badgeWidth, badgeHeight, radius);
      ctx.fill();
      ctx.strokeStyle = 'rgba(76, 176, 255, 0.55)';
      ctx.stroke();
    } else {
      ctx.fillRect(originX, originY, badgeWidth, badgeHeight);
      ctx.strokeStyle = 'rgba(76, 176, 255, 0.55)';
      ctx.strokeRect(originX, originY, badgeWidth, badgeHeight);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#6ec6ff';
    ctx.fillText(label, originX + badgeWidth / 2, originY + badgeHeight / 2 + 0.5);
    ctx.restore();
    ctx.restore();
  }

  private static applyTitleBadge(node: any): void {
    try {
      if (typeof node.__ndOriginalTitle === 'undefined') {
        node.__ndOriginalTitle = node.title || node.constructor?.title || '';
      } else {
        node.title = node.__ndOriginalTitle;
      }
    } catch {}
  }

  private static restoreTitle(node: any): void {
    try {
      if (typeof node.__ndOriginalTitle !== 'undefined') {
        node.title = node.__ndOriginalTitle;
      }
    } catch {}
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
