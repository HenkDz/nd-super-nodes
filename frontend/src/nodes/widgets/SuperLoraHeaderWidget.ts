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
  const buttonHeight = 24;
  const buttonSpacing = 8;
  let posX = margin;

    ctx.save();
  ctx.beginPath();
  ctx.rect(0, posY, w, height);
  ctx.clip();

  const headerGradient = ctx.createLinearGradient(0, posY, 0, posY + height);
  headerGradient.addColorStop(0, "#2f2f2f");
  headerGradient.addColorStop(1, "#232323");
  ctx.fillStyle = headerGradient;
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
    ctx.font = "500 11px 'Segoe UI', Arial, sans-serif";
    ctx.textBaseline = "middle";

    type ButtonStyle = {
      gradient: [string, string];
      border: string;
      text: string;
      innerStroke?: string;
      shadow?: {
        color: string;
        blur: number;
        offsetY?: number;
      };
      font?: string;
      iconFont?: string;
    };

    const buttonStyles: Record<"primary" | "secondary", ButtonStyle> = {
      primary: {
        gradient: ["#4f81ff", "#2f60f0"],
        border: "#1f3fbf",
        text: "#f7f9ff",
        innerStroke: "rgba(255, 255, 255, 0.18)",
        shadow: { color: "rgba(56, 109, 255, 0.45)", blur: 10, offsetY: 1 },
        font: "600 11px 'Segoe UI', Arial, sans-serif",
        iconFont: "700 14px 'Segoe UI', Arial, sans-serif"
      },
      secondary: {
        gradient: ["#3a3a3a", "#2c2c2c"],
        border: "#4a4a4a",
        text: "#dedede",
        innerStroke: "rgba(255, 255, 255, 0.08)",
        font: "500 11px 'Segoe UI', Arial, sans-serif",
        iconFont: "600 13px 'Segoe UI', Arial, sans-serif"
      }
    };

    type ButtonMode = "full" | "short" | "icon";

    const modeWidths: Record<string, Record<ButtonMode, number>> = {
      addLora: { full: 132, short: 92, icon: 44 },
      default: { full: 100, short: 64, icon: 36 }
    };

    const drawButton = (
      x: number,
      width: number,
      style: ButtonStyle,
      label: string,
      mode: ButtonMode
    ) => {
      const buttonY = posY + (height - buttonHeight) / 2;
      ctx.save();
      const gradient = ctx.createLinearGradient(x, buttonY, x, buttonY + buttonHeight);
      gradient.addColorStop(0, style.gradient[0]);
      gradient.addColorStop(1, style.gradient[1]);

      ctx.beginPath();
      if (style.shadow) {
        ctx.shadowColor = style.shadow.color;
        ctx.shadowBlur = style.shadow.blur;
        ctx.shadowOffsetY = style.shadow.offsetY ?? 0;
      }
      ctx.fillStyle = gradient;
      ctx.roundRect(x, buttonY, width, buttonHeight, 5);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.lineWidth = 1;
      ctx.strokeStyle = style.border;
      ctx.stroke();

      if (style.innerStroke) {
        ctx.beginPath();
        const inset = 0.6;
        ctx.roundRect(x + inset, buttonY + inset, width - inset * 2, buttonHeight - inset * 2, 4);
        ctx.strokeStyle = style.innerStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = style.text;
      ctx.textAlign = "center";
      const font = mode === "icon" ? style.iconFont ?? "600 13px 'Segoe UI', Arial, sans-serif" : style.font ?? "500 11px 'Segoe UI', Arial, sans-serif";
      ctx.font = font;
      const verticalOffset = mode === "icon" ? -0.5 : 0;
      ctx.fillText(label, x + width / 2, midY + verticalOffset);
      ctx.restore();
    };

    const availableWidth = w - (margin * 2);
    const allEnabled = this.getAllLorasState(node);
    const toggleText = allEnabled ? 'Disable All' : 'Enable All';
    const toggleShort = allEnabled ? 'Disable' : 'Enable';
    const buttons = [
      { id: 'addLora', text: 'Add LoRA', shortText: 'Add', icon: '➕', style: buttonStyles.primary, initialMode: 'full' as ButtonMode, combineIcon: true },
      { id: 'toggleAll', text: toggleText, shortText: toggleShort, icon: '⏯️', style: buttonStyles.secondary, initialMode: 'full' as ButtonMode },
      { id: 'saveTemplate', text: 'Save Set', shortText: 'Save', icon: '💾', style: buttonStyles.secondary, initialMode: 'full' as ButtonMode },
      { id: 'loadTemplate', text: 'Load Set', shortText: 'Load', icon: '📂', style: buttonStyles.secondary, initialMode: 'full' as ButtonMode },
      { id: 'settings', text: 'Settings', shortText: 'Set', icon: '⚙️', style: buttonStyles.secondary, initialMode: 'full' as ButtonMode }
    ];

    const totalSpacing = buttonSpacing * (buttons.length - 1);

    const getModeWidth = (id: string, mode: ButtonMode) => {
      const preset = modeWidths[id as keyof typeof modeWidths] || modeWidths.default;
      return preset[mode];
    };

    const computeTotalWidth = (modes: ButtonMode[]) => {
      return modes.reduce((sum, mode, idx) => {
        const btn = buttons[idx];
        return sum + getModeWidth(btn.id, mode);
      }, 0);
    };

    const modes: ButtonMode[] = buttons.map((btn) => btn.initialMode);

    const degradeSteps: { indices: number[]; from: ButtonMode; to: ButtonMode }[] = [
      { indices: [1, 2, 3], from: 'full', to: 'short' },
      { indices: [4], from: 'full', to: 'short' },
      { indices: [0], from: 'full', to: 'short' },
      { indices: [1, 2, 3], from: 'short', to: 'icon' },
      { indices: [4], from: 'short', to: 'icon' },
      { indices: [0], from: 'short', to: 'icon' }
    ];

    let totalWidth = computeTotalWidth(modes);
    const availableForButtons = Math.max(60, availableWidth - totalSpacing);

    let stepIndex = 0;
    while (totalWidth > availableForButtons && stepIndex < degradeSteps.length) {
      const step = degradeSteps[stepIndex];
      let changed = false;
      for (const index of step.indices) {
        if (modes[index] === step.from) {
          modes[index] = step.to;
          changed = true;
        }
      }
      if (changed) {
        totalWidth = computeTotalWidth(modes);
      } else {
        stepIndex++;
      }
    }

    if (totalWidth > availableForButtons) {
      const scale = availableForButtons / totalWidth;
      const minWidths = buttons.map((btn) => getModeWidth(btn.id, 'icon'));
      totalWidth = 0;
      const scaledWidths = buttons.map((btn, idx) => {
        const rawWidth = getModeWidth(btn.id, modes[idx]) * scale;
        const clamped = Math.max(minWidths[idx], rawWidth);
        totalWidth += clamped;
        return clamped;
      });
      const over = totalWidth - availableForButtons;
      if (over > 0.1) {
        let remainingOver = over;
        for (let i = scaledWidths.length - 1; i >= 0 && remainingOver > 0.1; i--) {
          const minWidth = minWidths[i];
          const reducible = scaledWidths[i] - minWidth;
          if (reducible > 0) {
            const delta = Math.min(reducible, remainingOver);
            scaledWidths[i] -= delta;
            remainingOver -= delta;
          }
        }
      }

      buttons.forEach((btn, idx) => {
        const btnWidth = scaledWidths[idx];
        const mode = modes[idx];
        let label: string;
        if (mode === 'icon') {
          label = btn.icon;
        } else if (mode === 'short') {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.shortText}` : btn.shortText;
        } else {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.text}` : btn.text;
        }
        drawButton(posX, btnWidth, btn.style, label, mode);
        this.hitAreas[btn.id].bounds = [posX, 0, btnWidth, height];
        posX += btnWidth + buttonSpacing;
      });
    } else {
      buttons.forEach((btn, idx) => {
        const mode = modes[idx];
        const btnWidth = getModeWidth(btn.id, mode);
        let label: string;
        if (mode === 'icon') {
          label = btn.icon;
        } else if (mode === 'short') {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.shortText}` : btn.shortText;
        } else {
          label = btn.combineIcon && btn.icon ? `${btn.icon} ${btn.text}` : btn.text;
        }
        drawButton(posX, btnWidth, btn.style, label, mode);
        this.hitAreas[btn.id].bounds = [posX, 0, btnWidth, height];
        posX += btnWidth + buttonSpacing;
      });
    }

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


