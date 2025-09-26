/**
 * Super LoRA Loader Node - Advanced Implementation
 * Based on rgthree's sophisticated custom widget system
 */

import { LoraConfig } from '@/types';
import { LoraService } from '@/services/LoraService';
import { TemplateService } from '@/services/TemplateService';
import { CivitAiService } from '@/services/CivitAiService';
import { TagSetService } from '@/services/TagSetService';
import { OverlayService } from '@/services/OverlayService';
import { UpdateService } from '@/services/UpdateService';
// import { SuperLoraBaseWidget } from './widgets/SuperLoraBaseWidget';
import { SuperLoraHeaderWidget } from './widgets/SuperLoraHeaderWidget';
import { SuperLoraTagWidget } from './widgets/SuperLoraTagWidget';
import { SuperLoraWidget } from './widgets/SuperLoraWidget';
import { setWidgetAPI } from './widgets/WidgetAPI';

// ComfyUI imports
const app: any = (window as any).app;

// Widget drawing utilities (simplified versions of rgthree utilities)
const LiteGraph = (window as any).LiteGraph;

// Widgets moved to ./widgets/*.ts

export class SuperLoraNode {
  private static readonly NODE_WIDGET_TOP_OFFSET = 68;
  private static readonly MARGIN_SMALL = 2;
  private static loraService: LoraService = LoraService.getInstance();
  public static templateService: TemplateService = TemplateService.getInstance();
  public static civitaiService: CivitAiService;
  private static updateService: UpdateService;
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;
  
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      this.loraService = LoraService.getInstance();
      this.templateService = TemplateService.getInstance();
      this.civitaiService = CivitAiService.getInstance();
  this.updateService = UpdateService.getInstance();

      // Bridge internal helpers/services to widgets via WidgetAPI immediately
      setWidgetAPI({
        showLoraSelector: (node: any, widget?: any, e?: any) => SuperLoraNode.showLoraSelector(node, widget, e),
        showTagSelector: (node: any, widget: any) => SuperLoraNode.showTagSelector(node, widget),
        showSettingsDialog: (node: any, e?: any) => SuperLoraNode.showSettingsDialog(node, e),
        showLoadTemplateDialog: (node: any, e?: any) => SuperLoraNode.showLoadTemplateDialog(node, e),
        showNameOverlay: (opts: any) => SuperLoraNode.showNameOverlay(opts),
        showInlineText: (e: any, initial: string, onCommit: (v: string) => void, place?: any) => SuperLoraNode.showInlineText(e, initial, onCommit, place),
        showToast: (m: string, t?: any) => SuperLoraNode.showToast(m, t),
        calculateNodeSize: (node: any) => SuperLoraNode.calculateNodeSize(node),
        organizeByTags: (node: any) => SuperLoraNode.organizeByTags(node),
        addLoraWidget: (node: any, config?: any) => SuperLoraNode.addLoraWidget(node, config),
        removeLoraWidget: (node: any, widget: any) => SuperLoraNode.removeLoraWidget(node, widget),
        getLoraConfigs: (node: any) => SuperLoraNode.getLoraConfigs(node),
        templateService: SuperLoraNode.templateService,
        civitaiService: SuperLoraNode.civitaiService,
        syncExecutionWidgets: (node: any) => SuperLoraNode.syncExecutionWidgets(node),
      });

      await Promise.all([
        this.loraService.initialize(),
        this.templateService.initialize(),
        this.updateService.initialize()
      ]);

      try {
        (window as any).NDSuperNodesUpdateStatus = this.updateService.getStatus();
      } catch {}

      this.initialized = true;
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private static isNodeBypassed(node: any): boolean {
    if (!node) {
      return false;
    }
    const flags = node.flags || {};
    if (flags.bypass || flags.bypassed || flags.skip_processing || flags.skipProcessing) {
      return true;
    }
    if (node.properties && (node.properties.bypass === true || node.properties.skip === true)) {
      return true;
    }
    try {
      if (typeof LiteGraph !== 'undefined' && LiteGraph && typeof LiteGraph.NEVER === 'number') {
        if (node.mode === LiteGraph.NEVER) {
          return true;
        }
      }
    } catch {}
    return false;
  }

  /**
   * Set up the node type with custom widgets
   */
  static setup(nodeType: any, _nodeData: any): void {
    const originalNodeCreated = nodeType.prototype.onNodeCreated;
    
    nodeType.prototype.onNodeCreated = function() {
      if (originalNodeCreated) {
        originalNodeCreated.apply(this, arguments);
      }
      
      SuperLoraNode.setupAdvancedNode(this);
      // Purge any legacy execution widgets (ensure nothing visible remains)
      try {
        this.widgets = (this.widgets || []).filter((w: any) => {
          const nm = w?.name || "";
          return !(nm === 'lora_bundle' || nm.startsWith('lora_'));
        });
      } catch {}
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

    const originalOnResize = nodeType.prototype.onResize;
    nodeType.prototype.onResize = function(size: any, ...rest: any[]) {
      const minHeight = SuperLoraNode.computeContentHeight(this);

      if (Array.isArray(size)) {
        size[1] = Math.max(size[1], minHeight);
      } else if (size && typeof size === 'object') {
        if (typeof size[1] === 'number') {
          size[1] = Math.max(size[1], minHeight);
        }
        if (typeof size.y === 'number') {
          size.y = Math.max(size.y, minHeight);
        }
      }

      if (this.size) {
        this.size[1] = Math.max(this.size[1], minHeight);
      }

      if (originalOnResize) {
        return originalOnResize.apply(this, [size, ...rest]);
      }
      return undefined;
    };

    // Override serialization to include custom widget data
    const originalSerialize = nodeType.prototype.serialize;
    nodeType.prototype.serialize = function() {
      // Start with the default serialization (ensures normal ComfyUI behavior)
      const data = originalSerialize.apply(this, arguments);

      // Always inject the backend optional input 'lora_bundle' with a fresh JSON bundle.
      try {
        // If a bridge widget exists, update it with a fresh bundle and serialize its value.
        const freshBundle = SuperLoraNode.buildBundle(this);
        let bridge = (this.widgets || []).find((w: any) => w?.name === 'lora_bundle');
        if (!bridge) {
          // Create once (real widget so ComfyUI serializes it reliably)
          bridge = this.addWidget('text', 'lora_bundle', freshBundle, () => {}, {});
        }
        // Make it effectively invisible and non-interactive while still serializable
        bridge.type = 'text';
        bridge.hidden = true;
        bridge.draw = () => {};
        bridge.computeSize = () => [0, 0];
        bridge.value = freshBundle;
        bridge.serializeValue = () => freshBundle;

        data.inputs = data.inputs || {};
        data.inputs.lora_bundle = freshBundle;
      } catch {}

      // Also save our custom UI widget structures for workflow persistence
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
      // Purge any legacy execution widgets except the lora_bundle bridge
      try {
        this.widgets = (this.widgets || []).filter((w: any) => {
          const nm = w?.name || "";
          return !(nm.startsWith('lora_') && nm !== 'lora_bundle');
        });
      } catch {}
      // Sync invisible widgets after configuring
      SuperLoraNode.syncExecutionWidgets(this);
    };

    // Add getExtraMenuOptions for additional context menu items
    const originalGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
    nodeType.prototype.getExtraMenuOptions = function(_canvas: any, optionsArr?: any[]) {
      try {
        let options = Array.isArray(optionsArr) ? optionsArr : [];
        if (originalGetExtraMenuOptions) {
          const maybe = originalGetExtraMenuOptions.call(this, _canvas, options);
          if (Array.isArray(maybe)) options = maybe;
        }

        const hasAddLoRA = options.some((opt: any) => opt && opt.content === "🏷️ Add LoRA");
        const hasSettings = options.some((opt: any) => opt && opt.content === "⚙️ Settings");

        if (!hasAddLoRA || !hasSettings) {
          if (options.length === 0 || options[options.length - 1] !== null) {
            options.push(null);
          }
          if (!hasAddLoRA) {
            options.push({ content: "🏷️ Add LoRA", callback: (_event: any) => SuperLoraNode.showLoraSelector(this, undefined, undefined) });
          }
          if (!hasSettings) {
            options.push({ content: "⚙️ Settings", callback: (_event: any) => SuperLoraNode.showSettingsDialog(this) });
          }
        }

        return options;
      } catch {
        const safe: any[] = optionsArr && Array.isArray(optionsArr) ? optionsArr : [];
        const ensureSeparator = () => {
          if (safe.length === 0 || safe[safe.length - 1] !== null) {
            safe.push(null);
          }
        };
        if (!safe.some((opt: any) => opt && opt.content === "🏷️ Add LoRA")) {
          ensureSeparator();
          safe.push({ content: "🏷️ Add LoRA", callback: (_event: any) => SuperLoraNode.showLoraSelector(this, undefined, undefined) });
        }
        if (!safe.some((opt: any) => opt && opt.content === "⚙️ Settings")) {
          ensureSeparator();
          safe.push({ content: "⚙️ Settings", callback: (_event: any) => SuperLoraNode.showSettingsDialog(this) });
        }
        return safe;
      }
    };
  }

  /**
   * Initialize advanced node with custom widgets
   */
  private static setupAdvancedNode(node: any): void {
    // console.log('Super LoRA Loader: Setting up advanced node');
    
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
    
    // Set minimum height only - preserve user's width preference
    const contentHeight = this.computeContentHeight(node);
    node.size = [node.size[0], Math.max(node.size[1], contentHeight)];
    
    console.log('Super LoRA Loader: Advanced node setup complete');
  }

  private static computeContentHeight(node: any): number {
    const marginDefault = SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;

    if (!node?.customWidgets) {
      return Math.max(currentY, 100);
    }

    const renderable: any[] = [];
    for (const widget of node.customWidgets) {
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (isCollapsed) continue;
      const size = widget.computeSize();
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      if (height === 0) continue;
      renderable.push(widget);
    }

    renderable.forEach((widget, index) => {
      const size = widget.computeSize();
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      let marginAfter = (widget instanceof SuperLoraTagWidget && widget.isCollapsed()) ? 0 : marginDefault;
      const isLast = index === renderable.length - 1;
      if (isLast && widget instanceof SuperLoraTagWidget && widget.isCollapsed()) {
        marginAfter = Math.max(marginDefault, 8);
      }
      currentY += height + marginAfter;
    });

    return Math.max(currentY, 100);
  }

  /**
   * Calculate required node size based on widgets
   */
  static calculateNodeSize(node: any): void {
    const newHeight = this.computeContentHeight(node);
    // Preserve the user's preferred width - only update height
    if (node.size[1] !== newHeight) {
      node.size[1] = newHeight;
    }
  }

  /**
   * Custom drawing for all widgets
   */
  static drawCustomWidgets(node: any, ctx: any): void {
    if (!node.customWidgets) return;
    const isBypassed = SuperLoraNode.isNodeBypassed(node);
    const marginDefault = SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET; // USE THE CONSTANT

    if (!isBypassed) {
      // Build list of widgets that will render
      const renderable: any[] = [];
      for (const widget of node.customWidgets) {
        const size = widget.computeSize();
        const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
        const height = widget instanceof SuperLoraWidget ? 34 : size[1];
        if (height === 0 || isCollapsed) continue;
        renderable.push(widget);
      }

      renderable.forEach((widget, index) => {
        const size = widget.computeSize();
        const height = widget instanceof SuperLoraWidget ? 34 : size[1];
        widget.draw(ctx, node, node.size[0], currentY, height);
        let marginAfter = (widget instanceof SuperLoraTagWidget && widget.isCollapsed()) ? 0 : marginDefault;
        const isLast = index === renderable.length - 1;
        if (isLast && widget instanceof SuperLoraTagWidget && widget.isCollapsed()) {
          marginAfter = Math.max(marginDefault, 8);
        }
        currentY += height + marginAfter;
      });
    }

    if (isBypassed) {
      try {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(142, 88, 255, 0.42)';
        const radius = 6;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(4, 4, Math.max(0, node.size[0] - 8), Math.max(0, node.size[1] - 8), radius);
          ctx.fill();
        } else {
          ctx.fillRect(4, 4, Math.max(0, node.size[0] - 8), Math.max(0, node.size[1] - 8));
        }
        ctx.restore();
      } catch {}
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

    if (SuperLoraNode.isNodeBypassed(node)) {
      return true;
    }

    //console.log(`[SuperLoraNode] Mouse event: pos=[${pos[0]}, ${pos[1]}], handler=${handler}`);
    //console.log('Node customWidgets:', node.customWidgets.map((w: any, i: number) => `${i}:${w.constructor.name}`));

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

    const marginDefault = SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET; // USE THE CONSTANT
    // console.log(`[SuperLoraNode] Starting currentY: ${currentY}`);

    for (const widget of node.customWidgets) {
      const size = widget.computeSize();

      // Also respect collapsed widgets during hit detection
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (size[1] === 0 || isCollapsed) {
        // Skip collapsed widgets without advancing Y so lower headers align
        continue;
      }

      const height = widget instanceof SuperLoraWidget ? 34 : size[1];

      // Check if click is within widget bounds
      const widgetStartY = currentY;
      const widgetEndY = currentY + height;
      if (pos[1] >= widgetStartY && pos[1] <= widgetEndY) {
        // console.log(`[SuperLoraNode] ✓ Click within ${widget.constructor.name} bounds`);

        // Adjust local position to account for the widget's offset
        const localPos = [pos[0], pos[1] - widgetStartY];
        // console.log(`[SuperLoraNode] Local position: [${localPos[0]}, ${localPos[1]}], widgetStartY=${widgetStartY}`);

        if (widget[handler]) {
          // console.log(`[SuperLoraNode] Calling ${widget.constructor.name}.${handler}()`);
          if (widget[handler](event, localPos, node)) {
            // console.log(`[SuperLoraNode] ✓ Handler returned true`);
            return true;
          } else {
            // console.log(`[SuperLoraNode] ✗ Handler returned false`);
          }
        } else {
          // console.log(`[SuperLoraNode] ✗ No ${handler} method on ${widget.constructor.name}`);
        }
      } else {
        // console.log(`[SuperLoraNode] ✗ Click outside ${widget.constructor.name} bounds`);
      }

      const marginAfter = (widget instanceof SuperLoraTagWidget && widget.isCollapsed()) ? 0 : marginDefault;
      currentY += height + marginAfter;
    }

    // console.log(`[SuperLoraNode] No widget handled the event`);
    return false;
  }

  /**
   * Compute the top Y offset (in node-local coordinates) for a given widget
   */
  private static computeWidgetTop(node: any, targetWidget: any): number {
    if (!node?.customWidgets) return this.NODE_WIDGET_TOP_OFFSET;
    const marginDefault = SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET;
    for (const widget of node.customWidgets) {
      const size = widget.computeSize?.() || [0, 0];
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag?.(node);
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      if (height === 0 || isCollapsed) {
        continue;
      }
      if (widget === targetWidget) {
        return currentY;
      }
      const marginAfter = (widget instanceof SuperLoraTagWidget && widget.isCollapsed?.()) ? 0 : marginDefault;
      currentY += height + marginAfter;
    }
    return currentY;
  }

  /**
   * Show LoRA selector dialog with enhanced search functionality
   */
  static async showLoraSelector(node: any, widget?: SuperLoraWidget, _event?: any): Promise<void> {
    try {
      // Pull available LoRAs
      const availableLoras = await SuperLoraNode.loraService.getAvailableLoras();
      const usedLoras = this.getUsedLoras(node);
      const items = availableLoras.map(name => ({
        id: name,
        label: name.replace(/\.(safetensors|ckpt|pt)$/i, ''),
        disabled: usedLoras.has(name)
      }));

      // Show overlay picker (no prompt)
      OverlayService.getInstance().showSearchOverlay({
        title: 'Add LoRA',
        placeholder: 'Search LoRAs...',
        items,
        onChoose: (id: string) => {
          if (this.isDuplicateLora(node, id)) {
            this.showToast('⚠️ Already added to the list', 'warning');
            return;
          }
          if (widget) {
            widget.setLora(id, node);
            this.showToast('✅ LoRA updated', 'success');
          } else {
            this.addLoraWidget(node, { lora: id });
            this.showToast('✅ LoRA added', 'success');
          }
          node.setDirtyCanvas(true, true);
        },
        enableMultiToggle: true,
        onChooseMany: (ids: string[]) => {
          const added: string[] = [];
          const skipped: string[] = [];
          ids.forEach((id) => {
            if (this.isDuplicateLora(node, id)) {
              skipped.push(id);
              return;
            }
            if (widget) {
              // If launched from a specific row, first selection updates that row
              if (added.length === 0) {
                widget.setLora(id, node);
                added.push(id);
                return;
              }
            }
            this.addLoraWidget(node, { lora: id });
            added.push(id);
          });
          if (added.length) this.showToast(`✅ Added ${added.length} LoRA${added.length>1?'s':''}`, 'success');
          if (skipped.length) this.showToast(`⚠️ Skipped ${skipped.length} duplicate${skipped.length>1?'s':''}`, 'warning');
          node.setDirtyCanvas(true, true);
        },
        // Provide folder chips explicitly (top-level folders)
        folderChips: Array.from(new Set(
          availableLoras
            .map((p: string) => p.split(/[\\/]/)[0])
            .filter(Boolean)
        )).sort(),
        // Fix the root chip label for LoRAs
        baseFolderName: 'loras'
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
    const svc = TagSetService.getInstance();
    const existingTags = this.getExistingTags(node);
    const fromStore = svc.getAll();
    const allTags = Array.from(new Set([...
      fromStore,
      ...existingTags
    ]));
    const items = allTags.map(tag => ({ id: tag, label: tag }));

    OverlayService.getInstance().showSearchOverlay({
      title: 'Select Tag',
      placeholder: 'Search or create tag...',
      items,
      allowCreate: true,
      onChoose: (tag: string) => {
        // Persist in TagSet store if new
        try { svc.addTag(tag); } catch {}
        widget.value.tag = tag;
        this.organizeByTags(node);
        this.calculateNodeSize(node);
        node.setDirtyCanvas(true, false);
      },
      rightActions: [
        {
          icon: '✏️',
          title: 'Rename tag',
          onClick: (name: string) => {
            this.showNameOverlay({
              title: 'Rename Tag',
              placeholder: 'New tag name...',
              initial: name,
              submitLabel: 'Rename',
              onCommit: (newName: string) => {
                const ok = svc.renameTag(name, newName);
                this.showToast(ok ? '✅ Tag renamed' : '❌ Failed to rename tag', ok ? 'success' : 'error');
                this.showTagSelector(node, widget);
              }
            });
          }
        },
        {
          icon: '🗑',
          title: 'Delete tag',
          onClick: (name: string) => {
            const okConfirm = confirm(`Delete tag "${name}"?`);
            if (!okConfirm) return;
            const ok = svc.deleteTag(name);
            this.showToast(ok ? '✅ Tag deleted' : '❌ Failed to delete tag', ok ? 'success' : 'error');
            this.showTagSelector(node, widget);
          }
        }
      ]
    });
  }

  /**
   * Show settings dialog
   */
  static showSettingsDialog(node: any, event?: any): void {
    // Top: core toggles
    const coreItems: any[] = [
      {
        content: `${node.properties.enableTags ? "✅" : "❌"} Enable Tags`,
        callback: () => {
          node.properties.enableTags = !node.properties.enableTags;
          this.organizeByTags(node);
          this.calculateNodeSize(node);
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showSeparateStrengths ? "✅" : "❌"} Separate Model/CLIP Strengths`,
        callback: () => {
          const enabling = !node.properties.showSeparateStrengths;
          node.properties.showSeparateStrengths = enabling;
          try {
            // Initialize or merge strengths for better UX
            const widgets = (node.customWidgets || []).filter((w: any) => w instanceof SuperLoraWidget);
            if (enabling) {
              // When turning on separate strengths, seed CLIP = Model for all
              widgets.forEach((w: any) => {
                const m = parseFloat(w.value?.strength ?? 0) || 0;
                w.value.strengthClip = (typeof w.value?.strengthClip === 'number') ? w.value.strengthClip : m;
              });
            } else {
              // When turning off, merge CLIP back to Model for consistency
              widgets.forEach((w: any) => {
                const m = parseFloat(w.value?.strength ?? 0) || 0;
                w.value.strength = m;
                w.value.strengthClip = m;
              });
            }
          } catch {}
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.autoFetchTriggerWords ? "✅" : "❌"} Auto-fetch Trigger Words`,
        callback: () => {
          node.properties.autoFetchTriggerWords = !node.properties.autoFetchTriggerWords;
          this.syncExecutionWidgets(node);
        }
      }
    ];

    // Bottom: visibility toggles
    const showItems: any[] = [
      {
        content: `${node.properties.showTriggerWords ? "✅" : "❌"} Show Trigger Words`,
        callback: () => {
          node.properties.showTriggerWords = !node.properties.showTriggerWords;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showTagChip !== false ? "✅" : "❌"} Show Tag Chip`,
        callback: () => {
          node.properties.showTagChip = node.properties.showTagChip === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showMoveArrows !== false ? "✅" : "❌"} Show Move Arrows`,
        callback: () => {
          node.properties.showMoveArrows = node.properties.showMoveArrows === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showRemoveButton !== false ? "✅" : "❌"} Show Remove Button`,
        callback: () => {
          node.properties.showRemoveButton = node.properties.showRemoveButton === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      },
      {
        content: `${node.properties.showStrengthControls !== false ? "✅" : "❌"} Show Strength Controls`,
        callback: () => {
          node.properties.showStrengthControls = node.properties.showStrengthControls === false ? true : false;
          node.setDirtyCanvas(true, false);
          this.syncExecutionWidgets(node);
        }
      }
    ];

    const menuItems: any[] = [...coreItems, null, ...showItems];
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
            this.showToast(`❌ Error loading template. Check console for details.`, 'error');
          }
        },
        rightActions: [
          {
            icon: '✏️',
            title: 'Rename template',
            onClick: async (name: string) => {
              this.showNameOverlay({
                title: 'Rename Template',
                placeholder: 'New template name...',
                initial: name,
                submitLabel: 'Rename',
                onCommit: async (newName: string) => {
                  const src = (name || '').trim();
                  const dst = (newName || '').trim();
                  if (!dst || dst === src) return;
                  const ok = await this.templateService.renameTemplate(src, dst);
                  this.showToast(ok ? '✅ Template renamed' : '❌ Failed to rename', ok ? 'success' : 'error');
                  if (ok) this.showLoadTemplateDialog(node, event);
                }
              });
            }
          },
          {
            icon: '🗑',
            title: 'Delete template',
            onClick: async (name: string) => {
              const ok = confirm(`Delete template "${name}"? This cannot be undone.`);
              if (!ok) return;
              const deleted = await this.templateService.deleteTemplate(name);
              this.showToast(deleted ? '✅ Template deleted' : '❌ Failed to delete template', deleted ? 'success' : 'error');
              if (deleted) this.showLoadTemplateDialog(node, event);
            }
          }
        ]
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
      // Apply all non-lora fields first
      const { lora: cfgLora, ...rest } = config as any;
      if (Object.keys(rest).length) {
        Object.assign(widget.value, rest);
      }
      // If a LoRA is provided, use setLora to trigger auto-fetch and UI updates
      if (cfgLora && cfgLora !== 'None') {
        widget.setLora(cfgLora as string, node);
      }
    }
    // Ensure default tag is General when tags are enabled
    if (node?.properties?.enableTags) {
      widget.value.tag = widget.value.tag || 'General';
    }
    
    // Append to bottom (after all existing widgets)
    node.customWidgets = node.customWidgets || [];
    node.customWidgets.push(widget);

    // If tags are enabled, re-group under headers immediately
    if (node?.properties?.enableTags) {
      this.organizeByTags(node);
    }
    
    // Update node size and trigger redraw
    this.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    
    this.syncExecutionWidgets(node);
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
      this.syncExecutionWidgets(node);
    }
  }

  /**
   * Organize widgets by tags
   */
  static organizeByTags(node: any): void {
    if (!node.properties.enableTags) {
      // Remove all tag widgets when tags are disabled
      node.customWidgets = node.customWidgets.filter((w: any) => !(w instanceof SuperLoraTagWidget));
      return;
    }
    
    const loraWidgets = node.customWidgets.filter((w: any) => w instanceof SuperLoraWidget);
    const headerWidget = node.customWidgets.find((w: any) => w instanceof SuperLoraHeaderWidget);
    
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
      // Insert a subtle group border/separator as a visual container
      // Tag headers already provide the title; lora rows follow.
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
  public static getLoraConfigs(node: any): LoraConfig[] {
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
    node.customWidgets = node.customWidgets.filter((w: any) => 
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
    this.syncExecutionWidgets(node);
  }

  /**
   * (THE BRIDGE) Syncs data from custom lora widgets to invisible execution widgets.
   */
  static syncExecutionWidgets(node: any): void {
    // Do not create any visible/hidden widgets for backend comms. We inject during serialize.
    // Still mark canvas dirty to refresh visuals as needed.
    node.setDirtyCanvas(true, true);
  }

  // Build the JSON bundle the backend expects from current custom widgets
  private static buildBundle(node: any): string {
    const loraWidgets = node.customWidgets?.filter((w: any) => w instanceof SuperLoraWidget) || [];
    const bundle = loraWidgets
      .filter((w: any) => w?.value?.lora && w.value.lora !== 'None')
      .map((w: any) => ({
        lora: w.value.lora,
        enabled: w.value.enabled,
        strength: w.value.strength,
        strengthClip: w.value.strengthClip,
        triggerWords: w.value.triggerWords,
        tag: w.value.tag,
        autoFetched: w.value.autoFetched,
      }));
    try { return JSON.stringify(bundle); } catch { return '[]'; }
  }
    
  /**
   * Serialize custom widgets for saving
   */
  static serializeCustomWidgets(node: any): any {
    if (!node.customWidgets) return null;

    const cloneProperties = JSON.parse(JSON.stringify(node.properties || {}));

    return {
      properties: cloneProperties,
      widgets: node.customWidgets.map((widget: any) => ({
        name: widget.name,
        type: widget.constructor.name,
        value: JSON.parse(JSON.stringify(widget.value))
      }))
    };
  }

  /**
   * Deserialize custom widgets when loading
   */
  static deserializeCustomWidgets(node: any, data: any): void {
    if (!data) return;

    try {
      node.properties = node.properties || {};
      if (data.properties) {
        Object.assign(node.properties, JSON.parse(JSON.stringify(data.properties)));
      }

      const restoredWidgets: any[] = [];
      if (Array.isArray(data.widgets)) {
        for (const widgetData of data.widgets) {
          let widget: any;
          switch (widgetData.type) {
            case 'SuperLoraHeaderWidget':
              widget = new SuperLoraHeaderWidget();
              break;
            case 'SuperLoraTagWidget':
              widget = new SuperLoraTagWidget(widgetData.value?.tag);
              break;
            case 'SuperLoraWidget':
              widget = new SuperLoraWidget(widgetData.name);
              break;
            default:
              continue;
          }
          widget.value = { ...widget.value, ...JSON.parse(JSON.stringify(widgetData.value || {})) };
          restoredWidgets.push(widget);
        }
      }

      node.customWidgets = restoredWidgets.length ? restoredWidgets : [new SuperLoraHeaderWidget()];
    } catch (error) {
      console.warn('SuperLoRA: Failed to restore custom widgets, resetting defaults', error);
      node.customWidgets = [new SuperLoraHeaderWidget()];
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
  public static showToast(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    OverlayService.getInstance().showToast(message, type);
  }

  // Inline editors for better UX
  static showInlineNumber(event: any, initial: number, onCommit: (v: number) => void): void {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.05';
    input.value = String(initial ?? 0);

    // Calculate position using event coordinates
    let leftPx: number, topPx: number;

    try {
      if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        leftPx = event.clientX + 8;
        topPx = event.clientY - 10;
        console.log(`[showInlineNumber] Using event coordinates: ${leftPx}, ${topPx}`);
      } else {
        const lastPointer = (SuperLoraNode as any)._lastPointerScreen;
        leftPx = (lastPointer?.x ?? 100) + 8;
        topPx = (lastPointer?.y ?? 100) - 10;
        console.log(`[showInlineNumber] Using fallback coordinates: ${leftPx}, ${topPx}`);
      }
    } catch (error) {
      console.warn('[showInlineNumber] Coordinate calculation failed, using fallback:', error);
      const lastPointer = (SuperLoraNode as any)._lastPointerScreen;
      leftPx = (lastPointer?.x ?? 100) + 8;
      topPx = (lastPointer?.y ?? 100) - 10;
    }

    input.style.cssText = `
      position: fixed;
      left: ${leftPx}px;
      top: ${topPx}px;
      width: 80px;
      padding: 4px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
      border: 1px solid #444;
      border-radius: 3px;
      background: #2f2f2f;
      color: #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.2) inset;
    `;
    let removedNum = false;
    const cleanup = () => { if (removedNum) return; removedNum = true; try { input.remove(); } catch {} };
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

  static showInlineText(event: any, initial: string, onCommit: (v: string) => void, place?: { rect: { x: number; y: number; w: number; h: number }, node: any, widget?: any }): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = initial ?? '';

    // Calculate position - prioritize event coordinates, then try place rect, finally fallback
    let leftPx: number, topPx: number, widthPx: number, heightPx: number;

    try {
      // Method 1: Use event coordinates if available (most reliable)
      if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        leftPx = event.clientX + 8;
        topPx = event.clientY - 10;
        widthPx = 260;
        heightPx = 20;
        console.log(`[showInlineText] Using event coordinates: ${leftPx}, ${topPx}`);
      }
      // Method 2: Use place rect if event coords not available
      else if (place?.rect && place?.node) {
        const rect = place.rect;
        const node = place.node;

        // Get canvas information for coordinate transformation
        const canvasEl = (app as any)?.canvas?.canvas;
        const cRect = canvasEl?.getBoundingClientRect?.();
        const ds = (app as any)?.canvas?.ds;
        const scale = ds?.scale || 1;
        const offset = ds?.offset || [0, 0];

        if (cRect) {
          // Transform widget-local coordinates to screen coordinates
          const nodePos = node.pos || [0, 0];
          const worldX = nodePos[0] + rect.x;
          const worldY = nodePos[1] + rect.y;

          leftPx = cRect.left + (worldX + offset[0]) * scale;
          topPx = cRect.top + (worldY + offset[1]) * scale;
          widthPx = Math.max(100, rect.w * scale);
          heightPx = Math.max(16, rect.h * scale);

          console.log(`[showInlineText] Using place rect: ${leftPx}, ${topPx}, rect:`, rect);
        } else {
          throw new Error('Canvas rect not available');
        }
      }
      // Method 3: Fallback to last pointer screen position
      else {
        const lastPointer = (SuperLoraNode as any)._lastPointerScreen;
        leftPx = (lastPointer?.x ?? 100) + 8;
        topPx = (lastPointer?.y ?? 100) - 10;
        widthPx = 260;
        heightPx = 20;
        console.log(`[showInlineText] Using fallback coordinates: ${leftPx}, ${topPx}`);
      }
    } catch (error) {
      console.warn('[showInlineText] Coordinate calculation failed, using fallback:', error);
      // Ultimate fallback
      const lastPointer = (SuperLoraNode as any)._lastPointerScreen;
      leftPx = (lastPointer?.x ?? 100) + 8;
      topPx = (lastPointer?.y ?? 100) - 10;
      widthPx = 260;
      heightPx = 20;
    }

    input.style.cssText = `
      position: fixed;
      left: ${leftPx}px;
      top: ${topPx}px;
      width: ${widthPx}px;
      height: ${heightPx}px;
      padding: 2px 6px;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: auto;
      border: 1px solid #444;
      border-radius: 3px;
      background: #2f2f2f;
      color: #fff;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.2) inset;
    `;
    let removedTxt = false;
    const cleanup = () => { if (removedTxt) return; removedTxt = true; try { input.remove(); } catch {} };
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
  public static showSearchOverlay(opts: { title: string; placeholder: string; items: { id: string; label: string; disabled?: boolean }[]; onChoose: (id: string) => void; allowCreate?: boolean, onRightAction?: (id: string) => void, rightActionIcon?: string, rightActionTitle?: string, rightActions?: Array<{ icon: string; title?: string; onClick: (id: string) => void }>, folderChips?: string[], enableMultiToggle?: boolean, onChooseMany?: (ids: string[]) => void }): void {
    OverlayService.getInstance().showSearchOverlay(opts);
  }

  public static showNameOverlay(opts: { title: string; placeholder: string; initial?: string; submitLabel?: string; onCommit: (name: string) => void }): void {
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
