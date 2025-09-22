import { SuperLoraBaseWidget } from './SuperLoraBaseWidget';
import { WidgetAPI } from './WidgetAPI';
import { SuperLoraWidget } from './SuperLoraWidget';

export class SuperLoraHeaderWidget extends SuperLoraBaseWidget {
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
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, posY, w, height);
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, posY + 0.5);
    ctx.lineTo(w, posY + 0.5);
    ctx.moveTo(0, posY + height - 0.5);
    ctx.lineTo(w, posY + height - 0.5);
    ctx.stroke();

    const midY = posY + height / 2;
    ctx.font = "11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";

    const drawButton = (x: number, width: number, _color: string, text: string) => {
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.roundRect(x, posY + (height - buttonHeight) / 2, width, buttonHeight, 3);
      ctx.fill();
      ctx.strokeStyle = "#3f3f3f";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#e0e0e0";
      ctx.textAlign = "center";
      const textX = x + width / 2;
      ctx.fillText(text, textX, midY);
    };

    const availableWidth = w - (margin * 2);
    const buttons = [
      { id: 'toggleAll', color: "#2a2a2a", text: "Toggle All", shortText: "Toggle", icon: "⏯️", priority: 1 },
      { id: 'addLora', color: "#2a2a2a", text: "Add LoRA", shortText: "Add", icon: "➕", priority: 2 },
      { id: 'saveTemplate', color: "#2a2a2a", text: "Save Set", shortText: "Save", icon: "💾", priority: 3 },
      { id: 'loadTemplate', color: "#2a2a2a", text: "Load Set", shortText: "Load", icon: "📂", priority: 4 },
      { id: 'settings', color: "#2a2a2a", text: "Settings", shortText: "Set", icon: "⚙️", priority: 5 }
    ];

    const totalSpacing = buttonSpacing * (buttons.length - 1);
    const buttonWidth = Math.max(40, (availableWidth - totalSpacing) / buttons.length);
    const useShortText = buttonWidth < 60;
    const useIconOnly = buttonWidth < 45;

    buttons.forEach((btn) => {
      const displayText = useIconOnly ? btn.icon : (useShortText ? btn.shortText : btn.text);
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

  onToggleAllDown = (_event: any, _pos: any, node: any): boolean => {
    const allState = this.getAllLorasState(node);
    if (!node.customWidgets) return true;
    const loraWidgets = node.customWidgets.filter((w: any) => w instanceof SuperLoraWidget);
    loraWidgets.forEach((w: any) => w.value.enabled = !allState);
    node.setDirtyCanvas(true, true);
    return true;
  };

  onAddLoraDown = (event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showLoraSelector(node, undefined, event);
    return true;
  };

  onSaveTemplateDown = (_event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showNameOverlay({
      title: 'Save Template',
      placeholder: 'Template name...',
      initial: 'My LoRA Set',
      submitLabel: 'Save',
      onCommit: async (templateName: string) => {
        const name = (templateName || '').trim();
        if (!name) {
          WidgetAPI.showToast('Please enter a template name', 'warning');
          return;
        }
        const configs = WidgetAPI.getLoraConfigs(node);
        const validConfigs = configs.filter((config: any) => config.lora && config.lora !== 'None');
        if (validConfigs.length === 0) {
          WidgetAPI.showToast('⚠️ No valid LoRAs to save in template', 'warning');
          return;
        }
        try {
          const exists = await WidgetAPI.templateService.templateExists(name as string);
          if (exists) {
            WidgetAPI.showToast(`⚠️ Template "${name}" already exists. Choose a different name.`, 'warning');
            return;
          }
          const success = await WidgetAPI.templateService.saveTemplate(name as string, validConfigs);
          WidgetAPI.showToast(success ? `✅ Template "${name}" saved successfully!` : '❌ Failed to save template. Please try again.', success ? 'success' : 'error');
        } catch (error) {
          console.error('Template save error:', error);
          WidgetAPI.showToast('❌ Error saving template. Check console for details.', 'error');
        }
      }
    });
    return true;
  };

  onLoadTemplateDown = (event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showLoadTemplateDialog(node, event);
    return true;
  };

  onSettingsDown = (event: any, _pos: any, node: any): boolean => {
    WidgetAPI.showSettingsDialog(node, event);
    return true;
  };

  computeSize(): [number, number] {
    return [450, 35];
  }
}


