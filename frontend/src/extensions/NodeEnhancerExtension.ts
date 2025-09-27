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
      label: 'ND Super Selector'
    },
    {
      nodeType: 'CheckpointLoaderSimple',
      fileType: 'models',
      widgetName: 'ckpt_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'VAELoader',
      fileType: 'vae',
      widgetName: 'vae_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'LoraLoader',
      fileType: 'loras',
      widgetName: 'lora_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'UNETLoader',
      fileType: 'diffusion_models',
      widgetName: 'unet_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'UnetLoaderGGUF',
      fileType: 'gguf_unet_models',
      widgetName: 'unet_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'UnetLoaderGGUFAdvanced',
      fileType: 'gguf_unet_models',
      widgetName: 'unet_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'CLIPLoader',
      fileType: 'text_encoders',
      widgetName: 'clip_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'CLIPLoaderGGUF',
      fileType: 'text_encoders',
      widgetName: 'clip_name',
      label: 'ND Super Selector'
    },
    ...Object.entries(GGUF_CLIP_WIDGET_MAP).flatMap(([nodeType, widgetNames]) =>
      widgetNames.map((widgetName, index) => ({
        nodeType,
        fileType: 'text_encoders',
        widgetName,
        label: `ND Super Selector (${index + 1})`
      }))
    ),
    {
      nodeType: 'ControlNetLoader',
      fileType: 'controlnet',
      widgetName: 'control_net_name',
      label: 'ND Super Selector'
    },
    {
      nodeType: 'UpscaleModelLoader',
      fileType: 'upscale_models',
      widgetName: 'model_name',
      label: 'ND Super Selector'
    }
  ];

  private static filePickerService: FilePickerService = FilePickerService.getInstance();
  private static readonly HIDDEN_WIDGET_SIZE = (_width?: number) => [0, -4] as [number, number];
  private static readonly DEBUG = true;
  private static readonly NODE_FLAG_KEY = 'ndSuperSelectorEnabled';
  private static readonly LEGACY_NODE_FLAG_KEY = 'ndPowerEnabled';
  private static readonly OVERLAY_WIDGET_TYPE = 'ndSuperSelectorOverlay';
  private static readonly SETTINGS = {
    enabled: 'nodeEnhancer.enabled',
    autoEnhanceAll: 'nodeEnhancer.autoEnhanceAll',
    contextToggle: 'nodeEnhancer.enableContextToggle'
  } as const;

  private static settingsHookInitialized = false;
  private static suppressSettingSideEffects = false;
  private static settingsStyleInjected = false;
  private static extensionLookup: Map<string, string[]> | null = null;
  private static readonly DEFAULT_LABEL = 'ND Super Selector';

  private static debugLog(...args: any[]): void {
    if (this.DEBUG) {
      console.debug('[NodeEnhancer]', ...args);
    }
  }

  private static isExtensionEnabled(): boolean {
    try {
      return app?.ui?.settings?.getSettingValue?.(this.SETTINGS.enabled, true) !== false;
    } catch {
      return true;
    }
  }

  private static isAutoEnhanceEnabled(): boolean {
    try {
      if (!this.isExtensionEnabled()) {
        return false;
      }
      return app?.ui?.settings?.getSettingValue?.(this.SETTINGS.autoEnhanceAll, false) === true;
    } catch {
      return false;
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
      if (!this.isExtensionEnabled()) {
        return false;
      }
      return app?.ui?.settings?.getSettingValue?.(this.SETTINGS.contextToggle, true) !== false;
    } catch {
      return true;
    }
  }

  private static setNodeFlag(node: any, enabled: boolean): void {
    try {
      node.properties = node.properties || {};
      if (enabled) {
        node.properties[NodeEnhancerExtension.NODE_FLAG_KEY] = true;
        node.properties[NodeEnhancerExtension.LEGACY_NODE_FLAG_KEY] = true;
      } else if (node.properties) {
        delete node.properties[NodeEnhancerExtension.NODE_FLAG_KEY];
        delete node.properties[NodeEnhancerExtension.LEGACY_NODE_FLAG_KEY];
      }
    } catch {}
  }

  private static shouldRestoreEnabled(node: any, data?: any): boolean {
    if (data) {
      if (typeof data.ndSuperSelectorEnabled !== 'undefined') {
        return !!data.ndSuperSelectorEnabled;
      }
      if (typeof data.ndPowerEnabled !== 'undefined') {
        return !!data.ndPowerEnabled;
      }
    }
    try {
      const props = node?.properties;
      if (props?.[NodeEnhancerExtension.NODE_FLAG_KEY] === true) {
        return true;
      }
      if (props?.[NodeEnhancerExtension.LEGACY_NODE_FLAG_KEY] === true) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private static createOverlayWidget(node: any, targetWidget: any, config: EnhancedNodeConfig): any {
    const overlayWidget: any = {
      name: `${config.widgetName}__ndOverlay`,
      type: NodeEnhancerExtension.OVERLAY_WIDGET_TYPE,
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
  const x = margin + gutter;
  const y = widgetY;
  const availableWidth = Math.max(60, widgetWidth - margin * 2 - gutter * 2);
  const w = Math.max(120, Math.min(availableWidth, (nodeRef?.size?.[0] || widgetWidth) - 24));
  const caretX = x + w - inset - 12;
  const iconX = caretX + 10;
  const valueEnd = caretX - 10;
        const labelText = this._ndWidgetLabel || config.widgetName;
        const rawValue = (this._ndDisplayValue && String(this._ndDisplayValue)) || this._ndPlaceholder;
        const isPlaceholder = rawValue === this._ndPlaceholder;

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#FFD700';
        ctx.fillStyle = '#1f1f1f';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x, y, w, H, 8);
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
        const labelSpacing = 8;

        const totalSpace = valueEnd - (x + inset);
        const neededValueWidth = Math.min(valueFullWidth, totalSpace);
        const availableForLabel = totalSpace - neededValueWidth;

        let showLabel = labelFullWidth > 0;
        let labelWidth = 0;

        if (showLabel && availableForLabel > labelSpacing) {
          labelWidth = Math.min(labelFullWidth, availableForLabel - labelSpacing);
          showLabel = labelWidth > 0;
        } else {
          showLabel = false;
        }

        const valueStart = showLabel ? x + inset + labelWidth + labelSpacing : x + inset;
        const valueMaxWidth = Math.max(12, valueEnd - valueStart);

        const displayLabel = showLabel ? NodeEnhancerExtension.truncateText(ctx, labelText, labelWidth, false) : '';
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

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd54f';
        ctx.fillText('⚡', iconX, y + H / 2 + 0.5);

        ctx.fillStyle = '#888';
        ctx.fillText('▾', caretX, y + H / 2 + 1);

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

    this.setupSettingsSync();
    this.refreshSettingState();

    console.log('Node Enhancer Extension: Initialized successfully');
  }

  /**
   * Set up enhancement for a specific node type
   */
  static setup(nodeType: any, nodeData: any): void {
    const baseConfigs = this.getBaseConfigsForType(nodeData?.name);

    const originalCreate = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function() {
      originalCreate?.apply(this, arguments);
      const configs = NodeEnhancerExtension.buildConfigsForNode(this, baseConfigs);

      if (!configs.length) {
        this.__ndPowerEnabled = false;
        NodeEnhancerExtension.restoreTitle(this);
        NodeEnhancerExtension.setNodeFlag(this, false);
        return;
      }

      if (typeof this.__ndPowerEnabled === 'undefined') {
        this.__ndPowerEnabled = false;
      }

      if (typeof this.__ndOriginalTitle === 'undefined') {
        this.__ndOriginalTitle = this.title || this.constructor?.title || '';
      }

      if (this.__ndPowerEnabled) {
        NodeEnhancerExtension.enableConfigsForNode(this, configs);
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

      const configs = NodeEnhancerExtension.buildConfigsForNode(this, baseConfigs);
      if (!configs.length) {
        return originalMenu ? originalMenu.call(this, canvas, optionsArr) : optionsArr;
      }

      const providedOptions = Array.isArray(optionsArr) ? optionsArr : [];
      const originalResult = originalMenu ? originalMenu.call(this, canvas, providedOptions) : providedOptions;
      const targetOptions = Array.isArray(originalResult)
        ? originalResult
        : Array.isArray(optionsArr)
          ? optionsArr
          : providedOptions;

      const options = Array.isArray(targetOptions) ? targetOptions : [];

      for (let i = options.length - 1; i >= 0; i--) {
        if (options[i]?.__ndSuperSelectorToggle) {
          options.splice(i, 1);
        }
      }

      const toggleOption: any = {
        content: this.__ndPowerEnabled ? '➖ Disable ND Super Selector' : '⚡ Enable ND Super Selector',
        callback: () => {
          try {
            if (this.__ndPowerEnabled) {
              NodeEnhancerExtension.disableAllForNodeInstance(this, baseConfigs);
              this.__ndPowerEnabled = false;
              NodeEnhancerExtension.restoreTitle(this);
              NodeEnhancerExtension.setNodeFlag(this, false);
              this.setDirtyCanvas?.(true, true);
            } else {
              NodeEnhancerExtension.enableAllForNodeInstance(this, baseConfigs);
            }
          } catch (error) {
            console.warn('Node Enhancer: toggle failed', error);
          }
        }
      };
      toggleOption.__ndSuperSelectorToggle = true;

      if (options.length && options[0] !== null) {
        options.unshift(null);
      }

      options.unshift(toggleOption);

      if (Array.isArray(optionsArr) && optionsArr !== options) {
        optionsArr.length = 0;
        optionsArr.push(...options);
      }

      return options;
    };

    const originalSerialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function() {
      const data = originalSerialize ? originalSerialize.apply(this, arguments) : {};
      try {
        const configs = NodeEnhancerExtension.buildConfigsForNode(this, baseConfigs);
        const hasEnhancements = configs.length > 0 || (this.__ndEnhancedWidgets && Object.keys(this.__ndEnhancedWidgets).length > 0);
        if (!hasEnhancements) {
          return data;
        }

        const enabled = !!this.__ndPowerEnabled;
        data.ndSuperSelectorEnabled = enabled;
        data.ndPowerEnabled = enabled;
        data.properties = data.properties || {};
        if (enabled) {
          data.properties[NodeEnhancerExtension.NODE_FLAG_KEY] = true;
          data.properties[NodeEnhancerExtension.LEGACY_NODE_FLAG_KEY] = true;
        } else if (data.properties) {
          delete data.properties[NodeEnhancerExtension.NODE_FLAG_KEY];
          delete data.properties[NodeEnhancerExtension.LEGACY_NODE_FLAG_KEY];
        }

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
        const configs = NodeEnhancerExtension.buildConfigsForNode(this, baseConfigs);
        if (!configs.length) {
          this.__ndPowerEnabled = false;
          NodeEnhancerExtension.restoreTitle(this);
          NodeEnhancerExtension.setNodeFlag(this, false);
          return;
        }

        const shouldEnable = NodeEnhancerExtension.shouldRestoreEnabled(this, data);

        if (shouldEnable) {
          if (!this.__ndPowerEnabled) {
            this.__ndPowerEnabled = true;
            NodeEnhancerExtension.enableConfigsForNode(this, configs);
          }
          NodeEnhancerExtension.applyTitleBadge(this);
        } else if (this.__ndPowerEnabled) {
          NodeEnhancerExtension.disableConfigsForNode(this, configs);
          this.__ndPowerEnabled = false;
          NodeEnhancerExtension.restoreTitle(this);
        } else {
          NodeEnhancerExtension.disableConfigsForNode(this, configs);
          NodeEnhancerExtension.restoreTitle(this);
        }
        NodeEnhancerExtension.setNodeFlag(this, !!this.__ndPowerEnabled);
      } catch {}
    };

    const originalOnMouseDown = nodeType.prototype.onMouseDown;
    nodeType.prototype.onMouseDown = function(event: any, pos: any) {
      const activeConfigs = NodeEnhancerExtension.buildConfigsForNode(this, baseConfigs);
      const fallbackConfigs = activeConfigs.length
        ? activeConfigs
        : Object.keys(this.__ndEnhancedWidgets || {})
            .map((widgetName) => NodeEnhancerExtension.createConfigFromWidget(this, widgetName))
            .filter((cfg): cfg is EnhancedNodeConfig => !!cfg);

      const handled = fallbackConfigs.some((cfg: EnhancedNodeConfig) =>
        NodeEnhancerExtension.handleEnhancedMouseDown(this, event, pos, cfg)
      );
      if (handled) {
        return true;
      }
      return originalOnMouseDown ? originalOnMouseDown.call(this, event, pos) : false;
    };

    if (Array.isArray(baseConfigs) && baseConfigs.length) {
      console.log(`Node Enhancer: Registered ND Super Selector support for ${nodeData?.name}`);
    }
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

    const metaEntry = node.__ndEnhancedWidgets[config.widgetName];
    metaEntry.fileType = config.fileType;
    if (config.label) {
      metaEntry.label = config.label;
    }

    NodeEnhancerExtension.debugLog('Enhancing widget', {
      nodeType: node?.type,
      widgetName: widget?.name,
      initialValue: widget?.value,
      options: widget?.options?.values
    });

    this.enhanceWidget(node, widget, config);
    this.applyTitleBadge(node);
    this.setNodeFlag(node, true);
  }

  /** Enable enhancement for a specific node instance */
  private static enableForNode(node: any, config: EnhancedNodeConfig): void {
    this.setupEnhancedNode(node, config);
    this.setNodeFlag(node, true);
  }

  private static enableConfigsForNode(node: any, configs: EnhancedNodeConfig[]): void {
    if (!node || !Array.isArray(configs) || !configs.length) {
      return;
    }

    let anyEnabled = false;

    for (const config of configs) {
      try {
        this.enableForNode(node, config);
        anyEnabled = true;
      } catch (error) {
        console.warn('Node Enhancer: failed to enable config', config, error);
      }
    }

    if (anyEnabled) {
      node.__ndPowerEnabled = true;
      this.applyTitleBadge(node);
      this.setNodeFlag(node, true);
      node.setDirtyCanvas?.(true, true);
    }
  }

  private static enableAllForNodeInstance(node: any, baseConfigs?: EnhancedNodeConfig[]): boolean {
    if (!node) {
      return false;
    }

    const configs = this.buildConfigsForNode(node, baseConfigs);
    if (!configs.length) {
      return false;
    }

    this.enableConfigsForNode(node, configs);
    return true;
  }

  private static disableAllForNodeInstance(node: any, baseConfigs?: EnhancedNodeConfig[]): void {
    if (!node) {
      return;
    }

    let configs = this.buildConfigsForNode(node, baseConfigs);

    if ((!configs || !configs.length) && node.__ndEnhancedWidgets) {
      configs = Object.keys(node.__ndEnhancedWidgets)
        .map((widgetName) => this.createConfigFromWidget(node, widgetName))
        .filter((cfg): cfg is EnhancedNodeConfig => !!cfg);
    }

    if (!configs || !configs.length) {
      node.__ndPowerEnabled = false;
      NodeEnhancerExtension.restoreTitle(node);
      this.setNodeFlag(node, false);
      return;
    }

    this.disableConfigsForNode(node, configs);
  }

  static enableEnhancementsForNode(node: any): boolean {
    if (!this.isExtensionEnabled()) {
      return false;
    }

    if (!node?.type) {
      return false;
    }

    return this.enableAllForNodeInstance(node);
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
    this.setNodeFlag(node, !!node.__ndPowerEnabled);
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
    if (!this.isExtensionEnabled()) {
      return;
    }

    const graph = (window as any).app?.graph;
    if (!graph) {
      return;
    }

    (graph._nodes || []).forEach((node: any) => {
      if (node?.type === nodeTypeName) {
        try {
          this.enableAllForNodeInstance(node);
        } catch (error) {
          console.warn('Node Enhancer: failed to enable node', node, error);
        }
      }
    });
  }

  private static setupSettingsSync(attempt = 0): void {
    if (this.settingsHookInitialized) {
      return;
    }

    const settings = app?.ui?.settings;
    if (!settings) {
      if (attempt > 20) {
        return;
      }
      const delay = Math.min(1000, 100 * Math.max(1, attempt + 1));
      setTimeout(() => this.setupSettingsSync(attempt + 1), delay);
      return;
    }

    this.settingsHookInitialized = true;

    try {
      const originalSet = settings.setSettingValue?.bind(settings);
      if (typeof originalSet === 'function') {
        const self = this;
        settings.setSettingValue = function(key: string, value: any) {
          const result = originalSet(key, value);
          self.handleSettingChanged(key, value);
          return result;
        };
      }
    } catch (error) {
      console.warn('Node Enhancer: failed to hook settings.setSettingValue', error);
    }

    try {
      const originalLoad = settings.loadSettings?.bind(settings);
      if (typeof originalLoad === 'function') {
        const self = this;
        settings.loadSettings = async function(...args: any[]) {
          const result = await originalLoad(...args);
          self.refreshSettingState();
          return result;
        };
      }
    } catch (error) {
      console.warn('Node Enhancer: failed to hook settings.loadSettings', error);
    }

    this.refreshSettingState();
  }

  private static handleSettingChanged(key: string, value: any): void {
    if (this.suppressSettingSideEffects) {
      return;
    }

    if (key === this.SETTINGS.enabled) {
      this.handleGlobalEnabledChange(value !== false);
    }

    if (key === this.SETTINGS.autoEnhanceAll) {
      if (value) {
        this.applyAutoEnhanceAll();
      }
    }

    if (key === this.SETTINGS.contextToggle || key === this.SETTINGS.autoEnhanceAll || key === this.SETTINGS.enabled) {
      this.updateSettingVisibility();
    }
  }

  private static refreshSettingState(): void {
    this.updateSettingVisibility();

    if (!this.isExtensionEnabled()) {
      this.disableAllEnhancements();
      return;
    }

    if (this.isAutoEnhanceEnabled()) {
      this.applyAutoEnhanceAll();
    }
  }

  private static handleGlobalEnabledChange(enabled: boolean): void {
    if (!enabled) {
      this.disableAllEnhancements();
    } else if (this.isAutoEnhanceEnabled()) {
      this.applyAutoEnhanceAll();
    }
  }

  private static updateSettingVisibility(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.ensureSettingsStyles();

    const enabled = this.isExtensionEnabled();
    const targets = [this.SETTINGS.autoEnhanceAll, this.SETTINGS.contextToggle];

    for (const id of targets) {
      const element = this.findSettingElement(id);
      this.setSettingDisabled(element, !enabled);
    }
  }

  private static ensureSettingsStyles(): void {
    if (this.settingsStyleInjected || typeof document === 'undefined') {
      return;
    }

    try {
      const style = document.createElement('style');
      style.id = 'nd-super-nodes-settings-styles';
      style.textContent = `
        .nd-super-nodes-setting-disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .nd-super-nodes-setting-disabled input,
        .nd-super-nodes-setting-disabled button,
        .nd-super-nodes-setting-disabled select {
          pointer-events: none;
        }
      `;
      document.head?.appendChild(style);
      this.settingsStyleInjected = true;
    } catch (error) {
      console.warn('Node Enhancer: failed to inject settings styles', error);
    }
  }

  private static findSettingElement(id: string): HTMLElement | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const settings = app?.ui?.settings;
    const candidates: Array<HTMLElement | null | undefined> = [];

    try {
      const stored = settings?.settings?.get?.(id)?.element ?? settings?.settings?.[id]?.element;
      if (stored instanceof HTMLElement) {
        candidates.push(stored);
      }
    } catch {}

    const selectorCandidates = [
      `[data-setting-id="${id}"]`,
      `[data-id="${id}"]`,
      `[data-setting="${id}"]`,
      `[data-settingname="${id}"]`,
      (() => {
        try {
          if (typeof (window as any).CSS?.escape === 'function') {
            return `#${(window as any).CSS.escape(id)}`;
          }
        } catch {}
        return null;
      })()
    ].filter(Boolean) as string[];

    for (const selector of selectorCandidates) {
      try {
        const el = document.querySelector(selector);
        if (el instanceof HTMLElement) {
          candidates.push(el);
        }
      } catch {}
    }

    for (const candidate of candidates) {
      if (candidate instanceof HTMLElement) {
        return candidate;
      }
    }

    try {
      const label = Array.from(document.querySelectorAll('label')).find((node) => node.textContent?.includes(id));
      if (label && label instanceof HTMLElement) {
        return label.closest('.setting-item') as HTMLElement;
      }
    } catch {}

    return null;
  }

  private static setSettingDisabled(element: HTMLElement | null, disabled: boolean): void {
    if (!element) {
      return;
    }

    const className = 'nd-super-nodes-setting-disabled';
    if (disabled) {
      element.classList.add(className);
      element.setAttribute('aria-disabled', 'true');
    } else {
      element.classList.remove(className);
      element.removeAttribute('aria-disabled');
    }

    const inputs = element.querySelectorAll('input, button, select');
    inputs.forEach((input) => {
      if (input instanceof HTMLInputElement || input instanceof HTMLButtonElement || input instanceof HTMLSelectElement) {
        input.disabled = disabled;
      }
    });
  }

  private static applyAutoEnhanceAll(): void {
    if (!this.isAutoEnhanceEnabled()) {
      return;
    }

    const graph = (window as any).app?.graph;
    if (!graph) {
      return;
    }

    const nodes = Array.isArray(graph._nodes) ? graph._nodes : [];
    nodes.forEach((node: any) => {
      if (!node?.type) {
        return;
      }
      this.enableAllForNodeInstance(node);
    });
  }

  private static disableAllEnhancements(): void {
    const graph = (window as any).app?.graph;
    if (!graph) {
      return;
    }

    const nodes = Array.isArray(graph._nodes) ? graph._nodes : [];
    nodes.forEach((node: any) => {
      if (!node?.type) {
        return;
      }
      this.disableAllForNodeInstance(node);
    });
  }

  private static disableConfigsForNode(node: any, configs: EnhancedNodeConfig[]): void {
    if (!node) {
      return;
    }

    let targets = Array.isArray(configs) ? configs : [];

    if ((!targets || !targets.length) && node.__ndEnhancedWidgets) {
      targets = Object.keys(node.__ndEnhancedWidgets)
        .map((widgetName) => this.createConfigFromWidget(node, widgetName))
        .filter((cfg): cfg is EnhancedNodeConfig => !!cfg);
    }

    if (!targets || !targets.length) {
      return;
    }

    let changed = false;

    for (const config of targets) {
      if (node.__ndEnhancedWidgets?.[config.widgetName]) {
        try {
          this.disableForNode(node, config);
          changed = true;
        } catch (error) {
          console.warn('Node Enhancer: failed to disable config', config, error);
        }
      }
    }

    if (changed) {
      node.__ndPowerEnabled = false;
      this.setNodeFlag(node, false);
      node.setDirtyCanvas?.(true, true);
    }
  }

  static onGraphConfigured(): void {
    if (!this.isExtensionEnabled()) {
      this.disableAllEnhancements();
      return;
    }

    if (this.isAutoEnhanceEnabled()) {
      this.applyAutoEnhanceAll();
    }
  }

  private static getBaseConfigsForType(nodeTypeName: string): EnhancedNodeConfig[] {
    if (typeof nodeTypeName !== 'string' || !nodeTypeName) {
      return [];
    }

    return this.ENHANCED_NODES
      .filter((cfg) => cfg.nodeType === nodeTypeName)
      .map((cfg) => ({ ...cfg }));
  }

  private static buildConfigsForNode(node: any, baseConfigs?: EnhancedNodeConfig[]): EnhancedNodeConfig[] {
    if (!node) {
      return [];
    }

    const base = Array.isArray(baseConfigs)
      ? baseConfigs.map((cfg) => ({ ...cfg }))
      : this.getBaseConfigsForType(node.type);

    const dynamic = this.detectFileWidgets(node);
    return this.mergeConfigLists(base, dynamic);
  }

  private static mergeConfigLists(base: EnhancedNodeConfig[], extras: EnhancedNodeConfig[]): EnhancedNodeConfig[] {
    const map = new Map<string, EnhancedNodeConfig>();

    (base || []).forEach((cfg) => {
      if (cfg?.widgetName) {
        map.set(cfg.widgetName, { ...cfg });
      }
    });

    (extras || []).forEach((cfg) => {
      if (cfg?.widgetName && !map.has(cfg.widgetName)) {
        map.set(cfg.widgetName, { ...cfg });
      }
    });

    return Array.from(map.values());
  }

  private static createConfigFromWidget(node: any, widgetName: string): EnhancedNodeConfig | null {
    if (!node || typeof widgetName !== 'string' || !widgetName) {
      return null;
    }

    const meta = node.__ndEnhancedWidgets?.[widgetName];
    const widget = Array.isArray(node.widgets)
      ? node.widgets.find((w: any) => w && w.name === widgetName)
      : null;

    let fileType: string | null = null;
    if (meta && typeof meta.fileType === 'string' && meta.fileType) {
      fileType = meta.fileType;
    } else if (widget) {
      const guessed = this.guessFileType(node, widget);
      if (guessed) {
        fileType = guessed;
      }
    }

    if (!fileType) {
      return null;
    }

    const label = (meta && typeof meta.label === 'string' && meta.label)
      || this.buildAutoLabel(widgetName, fileType);

    return {
      nodeType: node.type,
      fileType,
      widgetName,
      label
    };
  }

  private static detectFileWidgets(node: any): EnhancedNodeConfig[] {
    if (!node || !Array.isArray(node.widgets) || !node.widgets.length) {
      return [];
    }

    const results: EnhancedNodeConfig[] = [];

    for (const widget of node.widgets) {
      if (!this.isWidgetEligibleForAutoDetection(node, widget)) {
        continue;
      }

      const widgetName = typeof widget?.name === 'string'
        ? widget.name
        : typeof widget?.label === 'string'
          ? widget.label
          : null;

      if (!widgetName) {
        continue;
      }

      const fileType = this.guessFileType(node, widget);
      if (!fileType) {
        continue;
      }

      results.push({
        nodeType: node.type,
        fileType,
        widgetName,
        label: this.buildAutoLabel(widgetName, fileType)
      });
    }

    return results;
  }

  private static isWidgetEligibleForAutoDetection(node: any, widget: any): boolean {
    if (!widget || typeof widget !== 'object') {
      return false;
    }

    if (widget.__ndOverlay) {
      return false;
    }

    if (widget.type && typeof widget.type === 'string') {
      const typeLower = widget.type.toLowerCase();
      if (typeLower !== 'combo' && typeLower !== 'text' && typeLower !== 'string') {
        return false;
      }
    }

    const stringValues = this.extractStringValues(widget);
    if (!stringValues.length) {
      return false;
    }

    const hasFileLikeValue = stringValues.some((value) => this.isFileishValue(value));
    if (!hasFileLikeValue) {
      return false;
    }

    const widgetName = typeof widget?.name === 'string' ? widget.name : '';
    if (node?.__ndEnhancedWidgets && widgetName && node.__ndEnhancedWidgets[widgetName]) {
      return true;
    }

    return true;
  }

  private static extractStringValues(widget: any): string[] {
    const result: string[] = [];
    if (!widget) {
      return result;
    }

    const values = widget.options?.values;

    if (Array.isArray(values)) {
      for (const entry of values) {
        if (typeof entry === 'string') {
          result.push(entry);
        } else if (entry && typeof entry === 'object') {
          if (typeof entry.value === 'string') {
            result.push(entry.value);
          }
          if (typeof entry.name === 'string') {
            result.push(entry.name);
          }
          if (typeof entry.label === 'string') {
            result.push(entry.label);
          }
        }
      }
    } else if (values && typeof values === 'object') {
      for (const [key, value] of Object.entries(values)) {
        if (typeof key === 'string') {
          result.push(key);
        }
        if (typeof value === 'string') {
          result.push(value);
        }
      }
    }

    if (typeof widget.value === 'string') {
      result.push(widget.value);
    }

    return result
      .filter((entry): entry is string => typeof entry === 'string' && !!entry)
      .filter((entry, index, arr) => arr.indexOf(entry) === index);
  }

  private static isFileishValue(value: string): boolean {
    if (typeof value !== 'string' || !value.trim()) {
      return false;
    }

    const trimmed = value.trim();
    if (trimmed.toLowerCase() === 'none') {
      return false;
    }

    if (/[\\/]/.test(trimmed)) {
      return true;
    }

    return /\.[a-z0-9]{2,5}(?:\s|$)/i.test(trimmed);
  }

  private static guessFileType(node: any, widget: any): string | null {
    const widgetName = typeof widget?.name === 'string' ? widget.name : '';
    const nodeType = typeof node?.type === 'string' ? node.type : '';
    const values = this.extractStringValues(widget);

    const byValues = this.guessFileTypeFromValues(values, widgetName, nodeType);
    if (byValues) {
      return byValues;
    }

    return this.guessFileTypeFromHints(widgetName, nodeType);
  }

  private static guessFileTypeFromValues(values: string[], widgetName: string, nodeType: string): string | null {
    if (!Array.isArray(values) || !values.length) {
      return null;
    }

    const lowered = values
      .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
      .filter(Boolean);

    if (!lowered.length) {
      return null;
    }

    const includes = (keyword: string) => lowered.some((val) => val.includes(keyword));

    if (includes('loras/') || includes('loras\\') || includes('/lora/') || includes('\\lora\\')) {
      return 'loras';
    }

    if (includes('/vae') || includes('\\vae') || includes('/autoencoder') || includes('vae/')) {
      return 'vae';
    }

    if (includes('/clip') || includes('text_encoder') || includes('text-encoder')) {
      return 'text_encoders';
    }

    if (includes('controlnet') || includes('control_net')) {
      return 'controlnet';
    }

    if (includes('/unet') || includes('\\unet') || includes('diffusion')) {
      return lowered.some((val) => val.endsWith('.gguf')) ? 'gguf_unet_models' : 'diffusion_models';
    }

    if (includes('upscale')) {
      return 'upscale_models';
    }

    const lookup = this.getExtensionLookup();
    for (const entry of lowered) {
      const ext = this.extractExtension(entry);
      if (!ext) {
        continue;
      }

      const candidates = lookup.get(ext);
      if (!candidates || !candidates.length) {
        continue;
      }

      if (candidates.length === 1) {
        return candidates[0];
      }

      const hint = this.guessFileTypeFromHints(widgetName, nodeType);
      if (hint && candidates.includes(hint)) {
        return hint;
      }

      if (ext === '.gguf') {
        if (candidates.includes('text_encoders') && (entry.includes('clip') || entry.includes('text') || widgetName.toLowerCase().includes('clip'))) {
          return 'text_encoders';
        }
        if (candidates.includes('gguf_unet_models')) {
          return 'gguf_unet_models';
        }
      }

      if (candidates.includes('models')) {
        return 'models';
      }
    }

    return null;
  }

  private static guessFileTypeFromHints(widgetName: string, nodeType: string): string | null {
    const hints = [widgetName, nodeType]
      .filter((value): value is string => typeof value === 'string' && !!value)
      .map((value) => value.toLowerCase());

    if (!hints.length) {
      return null;
    }

    const includes = (keyword: string) => hints.some((hint) => hint.includes(keyword));

    if (includes('lora')) {
      return 'loras';
    }
    if (includes('controlnet')) {
      return 'controlnet';
    }
    if (includes('vae')) {
      return 'vae';
    }
    if (includes('clip') || includes('text_encoder')) {
      return 'text_encoders';
    }
    if (includes('gguf')) {
      if (includes('clip')) {
        return 'text_encoders';
      }
      return 'gguf_unet_models';
    }
    if (includes('unet') || includes('diffusion')) {
      return 'diffusion_models';
    }
    if (includes('upscale')) {
      return 'upscale_models';
    }
    if (includes('checkpoint') || includes('ckpt') || includes('model')) {
      return 'models';
    }

    return null;
  }

  private static getExtensionLookup(): Map<string, string[]> {
    if (this.extensionLookup) {
      return this.extensionLookup;
    }

    const lookup = new Map<string, string[]>();

    try {
      const fileTypes = FilePickerService.getSupportedFileTypes();
      Object.entries(fileTypes).forEach(([fileType, config]) => {
        (config?.fileExtensions || []).forEach((ext) => {
          if (typeof ext !== 'string') {
            return;
          }
          const normalized = ext.toLowerCase();
          const existing = lookup.get(normalized) || [];
          if (!existing.includes(fileType)) {
            existing.push(fileType);
          }
          lookup.set(normalized, existing);
        });
      });
    } catch (error) {
      console.warn('Node Enhancer: failed to build extension lookup', error);
    }

    this.extensionLookup = lookup;
    return lookup;
  }

  private static extractExtension(value: string): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const match = value.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
    if (!match) {
      return null;
    }

    return `.${match[1].toLowerCase()}`;
  }

  private static buildAutoLabel(_widgetName: string, _fileType: string): string {
    return this.DEFAULT_LABEL;
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
