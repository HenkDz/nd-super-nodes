/**
 * Super LoRA Loader Node - Advanced Implementation
 * Based on rgthree's sophisticated custom widget system
 */

import { LoraConfig } from '@/types';
import { LoraService } from '@/services/LoraService';
import { TemplateService } from '@/services/TemplateService';
import { CivitAiService } from '@/services/CivitAiService';
import { TagSetService } from '@/services/TagSetService';
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
  
  static async initialize(): Promise<void> {
    this.loraService = LoraService.getInstance();
    this.templateService = TemplateService.getInstance();
    this.civitaiService = CivitAiService.getInstance();
    
    await Promise.all([
      this.loraService.initialize(),
      this.templateService.initialize()
    ]);
    // Bridge internal helpers/services to widgets via WidgetAPI
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
    nodeType.prototype.getExtraMenuOptions = function(_canvas: any) {
     
      
      try {
        const baseOptions = originalGetExtraMenuOptions ? originalGetExtraMenuOptions.call(this, _canvas) : [];
        const options = Array.isArray(baseOptions) ? baseOptions : [];
        options.push(null); // Separator
        options.push({
          content: "🏷️ Add LoRA",
          callback: (_event: any) => SuperLoraNode.showLoraSelector(this, undefined, undefined)
        });
        options.push({
          content: "⚙️ Settings",
          callback: (_event: any) => SuperLoraNode.showSettingsDialog(this)
        });
        return options;
      } catch (e) {
        // Always return a sane default to avoid other extensions crashing when they append
        return [
          null,
          { content: "🏷️ Add LoRA", callback: (_event: any) => SuperLoraNode.showLoraSelector(this, undefined, undefined) },
          { content: "⚙️ Settings", callback: (_event: any) => SuperLoraNode.showSettingsDialog(this) }
        ];
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
    
    // Set minimum size
    node.size = [Math.max(node.size[0], 450), Math.max(node.size[1], 100)];
    
    console.log('Super LoRA Loader: Advanced node setup complete');
  }

  /**
   * Calculate required node size based on widgets
   */
  static calculateNodeSize(node: any): void {
    if (!node.customWidgets) return;
    
    const marginDefault = SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET; // USE THE CONSTANT

    // Determine the list of widgets that will actually render (non-zero height and not collapsed-by-tag)
    const renderable: any[] = [];
    for (const widget of node.customWidgets) {
      const isCollapsed = widget instanceof SuperLoraWidget && widget.isCollapsedByTag(node);
      if (isCollapsed) continue;
      const size = widget.computeSize();
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      if (height === 0) continue;
      renderable.push(widget);
    }

    // Accumulate heights including margins, ensuring last collapsed tag gets a bottom margin
    renderable.forEach((widget, index) => {
      const size = widget.computeSize();
      const height = widget instanceof SuperLoraWidget ? 34 : size[1];
      let marginAfter = (widget instanceof SuperLoraTagWidget && widget.isCollapsed()) ? 0 : marginDefault;
      const isLast = index === renderable.length - 1;
      if (isLast && widget instanceof SuperLoraTagWidget && widget.isCollapsed()) {
        // Give extra breathing room to allow resizing without toggling expand
        marginAfter = Math.max(marginDefault, 8);
      }
      currentY += height + marginAfter;
    });

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
    const marginDefault = SuperLoraNode.MARGIN_SMALL;
    let currentY = this.NODE_WIDGET_TOP_OFFSET; // USE THE CONSTANT

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
        )).sort()
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

    this.showSearchOverlay({
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
  public static showToast(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
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
    // Ensure only one overlay at a time
    try {
      document.querySelectorAll('[data-super-lora-overlay="1"]').forEach((el: any) => el.remove());
    } catch {}

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
    overlay.setAttribute('data-super-lora-overlay', '1');

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

    // Optional multi-select mode (default off)
    const multiEnabled = !!opts.enableMultiToggle;
    let multiMode = false;
    const selectedIds = new Set<string>();
    // Special key for root (no top-level folder)
    const ROOT_KEY = '__ROOT__';

    // Controls row (e.g., multi-select toggle)
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: ${multiEnabled ? 'flex' : 'none'};
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 12px 6px 12px;
      color: #ddd;
      font-size: 12px;
    `;
    const multiLabel = document.createElement('label');
    multiLabel.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';
    const multiToggle = document.createElement('input');
    multiToggle.type = 'checkbox';
    multiToggle.addEventListener('change', () => {
      multiMode = !!multiToggle.checked;
      // Do not clear selection when switching modes
      render(search.value);
      renderFooter();
    });
    const multiText = document.createElement('span');
    multiText.textContent = 'Multi-select';
    multiLabel.appendChild(multiToggle);
    multiLabel.appendChild(multiText);
    controls.appendChild(multiLabel);

    // Folder chips row
    const chipWrap = document.createElement('div');
    chipWrap.style.cssText = `
      display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 6px 12px;
    `;

    // Subfolder chips row (appears when at least one folder chip is active)
    const subChipWrap = document.createElement('div');
    subChipWrap.style.cssText = `
      display: none; flex-wrap: wrap; gap: 6px; padding: 0 12px 6px 12px;
    `;

    // Gate folder features so other overlays (e.g., tags) are unaffected
    let folderFeatureEnabled = false;

    // Persist selected folders per-session
    const FILTER_KEY = 'superlora_folder_filters';
    const saved = (() => { try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) || '[]'); } catch { return []; } })();
    const activeFolders = new Set<string>(Array.isArray(saved) ? saved : []);
    const SUBFILTER_KEY = 'superlora_subfolder_filters';
    const savedSubs = (() => { try { return JSON.parse(sessionStorage.getItem(SUBFILTER_KEY) || '[]'); } catch { return []; } })();
    const activeSubfolders = new Set<string>(Array.isArray(savedSubs) ? savedSubs : []);

    const renderChips = (folderCounts: Record<string, number>) => {
      chipWrap.innerHTML = '';
      const allFolderNames = Object.keys(folderCounts);
      // Sort to ensure 'loras - root' chip is always first, then alphabetical
      allFolderNames.sort((a, b) => {
        if (a === ROOT_KEY) return -1;
        if (b === ROOT_KEY) return 1;
        return a.localeCompare(b);
      });
      allFolderNames.forEach((name) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        const isActive = activeFolders.has(name);
        const label = (name === ROOT_KEY) ? 'loras - root' : name;
        const count = folderCounts[name] ?? 0;
        chip.textContent = `${label} (${count})`;
        chip.style.cssText = `
          padding: 6px 10px; border-radius: 6px; background: ${isActive ? '#333' : '#252525'};
          color: #fff; border: ${isActive ? '2px solid #66aaff' : '1px solid #3a3a3a'}; cursor: pointer;
        `;
        chip.addEventListener('click', () => {
          if (activeFolders.has(name)) activeFolders.delete(name); else activeFolders.add(name);
          try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(Array.from(activeFolders))); } catch {}
          // Prune subfolder selections that no longer belong to active top-level folders
          try {
            const toRemove: string[] = [];
            activeSubfolders.forEach((key) => { const t = key.split('/')[0]; if (!activeFolders.has(t)) toRemove.push(key); });
            toRemove.forEach((k) => activeSubfolders.delete(k));
            sessionStorage.setItem(SUBFILTER_KEY, JSON.stringify(Array.from(activeSubfolders)));
          } catch {}
          render(search.value);
          renderSubChips();
        });
        chipWrap.appendChild(chip);
      });
    };

    // Build subfolder chips for selected top-level folders
    const renderSubChips = () => {
      subChipWrap.innerHTML = '';
      // Only show sub-chips when at least one top-level folder is active
      const show = activeFolders.size > 0;
      subChipWrap.style.display = show ? 'flex' : 'none';
      if (!show) return;

      // Compute subfolder counts limited to active top-level folders
      const subCountsByKey: Record<string, number> = {};
      const subToTops: Record<string, Set<string>> = {};
      (opts.items || []).forEach((i) => {
        const parts = i.id.split(/[\\/]/);
        const top = parts.length > 1 ? parts[0] : ROOT_KEY;
        const sub = parts.length > 2 ? parts[1] : ROOT_KEY; // root files directly under top
        // Do not render subchips for global root (files with no top-level folder)
        if (top === ROOT_KEY) return;
        if (!activeFolders.has(top)) return;
        // For root-level files under a top folder, we include a special ROOT sub-chip
        if (sub === ROOT_KEY) {
          const key = `${top}/${ROOT_KEY}`;
          subCountsByKey[key] = (subCountsByKey[key] || 0) + 1;
          if (!subToTops['(root)']) subToTops['(root)'] = new Set<string>();
          subToTops['(root)'].add(top);
          return;
        }
        if (!activeFolders.has(top)) return;
        const key = `${top}/${sub}`;
        subCountsByKey[key] = (subCountsByKey[key] || 0) + 1;
        if (!subToTops[sub]) subToTops[sub] = new Set<string>();
        subToTops[sub].add(top);
      });

      const keys = Object.keys(subCountsByKey).sort();
      keys.forEach((key) => {
        const [top, sub] = key.split('/');
        const isRootSub = (sub === ROOT_KEY);
        let label: string;
        if (isRootSub) {
          // Always show "Top - root" to avoid confusing multiple roots
          label = `${top} - root`;
        } else {
          const duplicate = (subToTops[sub] && subToTops[sub].size > 1);
          label = duplicate ? `${sub} (${top})` : sub;
        }
        const count = subCountsByKey[key] ?? 0;
        const chip = document.createElement('button');
        chip.type = 'button';
        const isActive = activeSubfolders.has(key);
        chip.textContent = `${label} (${count})`;
        chip.title = `${top}/${sub}`;
        chip.style.cssText = `
          padding: 6px 10px; border-radius: 6px; background: ${isActive ? '#333' : '#252525'};
          color: #fff; border: ${isActive ? '2px solid #66aaff' : '1px solid #3a3a3a'}; cursor: pointer;
        `;
        chip.addEventListener('click', () => {
          if (activeSubfolders.has(key)) activeSubfolders.delete(key); else activeSubfolders.add(key);
          try { sessionStorage.setItem(SUBFILTER_KEY, JSON.stringify(Array.from(activeSubfolders))); } catch {}
          render(search.value);
          renderSubChips();
        });
        subChipWrap.appendChild(chip);
      });
    };

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
      const termFiltered = q ? opts.items.filter(i => i.label.toLowerCase().includes(q)) : opts.items;

      // Folder feature: only compute/update chips and apply filters when enabled
      if (folderFeatureEnabled) {
        const folderCounts: Record<string, number> = {};
        termFiltered.forEach(i => {
          const parts = i.id.split(/[\\/]/);
          const top = parts.length > 1 ? parts[0] : ROOT_KEY;
          folderCounts[top] = (folderCounts[top] || 0) + 1;
        });
        renderChips(folderCounts);
      }

      // Now apply active folder filters (multi-select) only when folder feature is enabled
      let filtered = termFiltered;
      if (folderFeatureEnabled && activeFolders.size > 0) {
        filtered = termFiltered.filter(i => {
          const parts = i.id.split(/[\\/]/);
          const top = parts.length > 1 ? parts[0] : ROOT_KEY;
          return activeFolders.has(top);
        });

        // Additionally apply subfolder filters when any are selected
        if (activeSubfolders.size > 0) {
          filtered = filtered.filter(i => {
            const parts = i.id.split(/[\\/]/);
            const top = parts.length > 1 ? parts[0] : '';
            if (!top) return false;
            const sub = parts.length > 2 ? parts[1] : ROOT_KEY;
            const key = `${top}/${sub}`;
            return activeSubfolders.has(key);
          });
        }
      }

      // Note: further folder-based filtering is only applied when folderFeatureEnabled is true (handled above)

      // Optional create-new row when allowed and search doesn't exactly match
      if (opts.allowCreate && q) {
        const exact = opts.items.some(i => i.label.toLowerCase() === q);
        if (!exact) {
          filtered = [{ id: term, label: `Create "${term}"` }, ...filtered];
        }
      }

      empty.style.display = filtered.length ? 'none' : 'block';
      // Update header count: (displayed/total)
      try { header.textContent = `${opts.title} (${filtered.length}/${opts.items.length})`; } catch {}

      const maxToShow = Math.min(2000, filtered.length); // show many, still capped for perf
      filtered.slice(0, maxToShow).forEach(i => {
        const row = document.createElement('div');
        row.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0;
        `;

        // Left main button (select)
        const leftBtn = document.createElement('button');
        leftBtn.type = 'button';
        const isSelected = selectedIds.has(i.id);
        leftBtn.textContent = (multiMode ? ((isSelected ? '☑ ' : '☐ ')) : '') + i.label + (i.disabled ? '  (added)' : '');
        leftBtn.disabled = !!i.disabled;
        leftBtn.style.cssText = `
          flex: 1;
          text-align: left;
          padding: 10px 12px;
          background: ${i.disabled ? '#2a2a2a' : (multiMode && isSelected ? '#263238' : '#252525')};
          color: ${i.disabled ? '#888' : '#fff'};
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          cursor: ${i.disabled ? 'not-allowed' : 'pointer'};
        `;
        leftBtn.addEventListener('click', () => {
          if (i.disabled) return;
          if (!multiMode) {
            opts.onChoose(i.id);
            close();
            return;
          }
          if (selectedIds.has(i.id)) selectedIds.delete(i.id); else selectedIds.add(i.id);
          // Update button text and background without full re-render for slight responsiveness
          const nowSelected = selectedIds.has(i.id);
          leftBtn.textContent = (multiMode ? ((nowSelected ? '☑ ' : '☐ ')) : '') + i.label + (i.disabled ? '  (added)' : '');
          leftBtn.style.background = nowSelected ? '#263238' : '#252525';
          renderFooter();
        });
        row.appendChild(leftBtn);

        // Right action buttons (e.g., rename, delete) aligned far right
        const actions: Array<{ icon: string; title?: string; onClick: (id: string) => void }> = [];
        if (opts.rightActions && opts.rightActions.length) {
          actions.push(...opts.rightActions);
        } else if (opts.onRightAction) {
          actions.push({ icon: (opts.rightActionIcon || '🗑'), title: opts.rightActionTitle, onClick: opts.onRightAction });
        }
        if (actions.length && !i.disabled) {
          actions.forEach((action) => {
            const rightBtn = document.createElement('button');
            rightBtn.type = 'button';
            rightBtn.textContent = action.icon;
            if (action.title) rightBtn.title = action.title;
            rightBtn.style.cssText = `
              margin-left: 8px;
              padding: 10px 12px;
              background: #3a2a2a;
              color: #fff;
              border: 1px solid #5a3a3a;
              border-radius: 6px;
              cursor: pointer;
            `;
            rightBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); action.onClick(i.id); });
            row.appendChild(rightBtn);
          });
        }

        list.appendChild(row);
      });
    };

    // Footer for multi-select actions
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: none;
      padding: 10px 12px;
      border-top: 1px solid #444;
      background: #1e1e1e;
      display: ${multiEnabled ? 'flex' : 'none'};
      gap: 8px;
      justify-content: flex-end;
    `;
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Add Selected (0)';
    addBtn.style.cssText = `padding: 8px 12px; border-radius: 6px; background: #1976d2; color: #fff; border: 1px solid #0d47a1; cursor: pointer; opacity: 0.6;`;
    addBtn.disabled = true;
    addBtn.addEventListener('click', () => {
      if (!multiMode) return;
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      if (typeof opts.onChooseMany === 'function') {
        opts.onChooseMany(ids);
      } else {
        ids.forEach((id) => opts.onChoose(id));
      }
      close();
    });
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = `padding: 8px 12px; border-radius: 6px; background: #333; color: #fff; border: 1px solid #555; cursor: pointer;`;
    clearBtn.addEventListener('click', () => {
      selectedIds.clear();
      render(search.value);
      renderFooter();
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `padding: 8px 12px; border-radius: 6px; background: #444; color: #fff; border: 1px solid #555; cursor: pointer;`;
    cancelBtn.addEventListener('click', () => close());
    footer.appendChild(clearBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(addBtn);

    const renderFooter = () => {
      const n = selectedIds.size;
      addBtn.textContent = `Add Selected (${n})`;
      addBtn.disabled = n === 0;
      addBtn.style.opacity = n === 0 ? '0.6' : '1';
      footer.style.display = (multiEnabled && multiMode) ? 'flex' : 'none';
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey as any); } });

    listWrap.appendChild(empty);
    listWrap.appendChild(list);
    panel.appendChild(header);
    panel.appendChild(search);
    panel.appendChild(controls);
    // Compute unique top-level folders from items once for initial chips container
    const allowFolderChips = (Array.isArray(opts.folderChips) && opts.folderChips.length > 0)
      || ((opts.items || []).some((i) => /[\\/]/.test(i.id)));
    if (allowFolderChips) {
      const initialCounts: Record<string, number> = {};
      (opts.items || []).forEach((i) => {
        const parts = i.id.split(/[\\/]/);
        const top = parts.length > 1 ? parts[0] : ROOT_KEY;
        initialCounts[top] = (initialCounts[top] || 0) + 1;
      });
      if (Object.keys(initialCounts).length) {
        folderFeatureEnabled = true;
        renderChips(initialCounts);
        panel.appendChild(chipWrap);
        panel.appendChild(subChipWrap);
        // Initial render of subfolder chips if folders were pre-selected
        renderSubChips();
      }
    }
    panel.appendChild(listWrap);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    search.addEventListener('input', () => render(search.value));
    setTimeout(() => { search.focus(); render(''); renderFooter(); }, 0);
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
