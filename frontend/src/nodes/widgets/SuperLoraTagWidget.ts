import { SuperLoraBaseWidget } from './SuperLoraBaseWidget';
import { WidgetAPI } from './WidgetAPI';
import { SuperLoraWidget } from './SuperLoraWidget';

export class SuperLoraTagWidget extends SuperLoraBaseWidget {
  constructor(public tag: string) {
    super(`tag_${tag}`);
    this.value = { type: "SuperLoraTagWidget", tag, collapsed: false };
    this.hitAreas = {
      toggle: { bounds: [0, 0], onDown: this.onToggleDown, priority: 10 },
      collapse: { bounds: [0, 0], onDown: this.onCollapseDown, priority: 0 }
    };
  }

  draw(ctx: any, node: any, w: number, posY: number, height: number): void {
    const margin = 10;
    let posX = margin;

    ctx.save();
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, posY, w, height);
    //ctx.strokeStyle = "#3a3a3a";
    //ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, posY + 0.5);
    ctx.lineTo(w, posY + 0.5);
    ctx.moveTo(0, posY + height - 0.5);
    ctx.lineTo(w, posY + height - 0.5);
    //ctx.stroke();

    const midY = height / 2;
    const lorasInTag = this.getLorasInTag(node);
    lorasInTag.length > 0 && lorasInTag.every((w2: any) => w2.value.enabled);

    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.value.collapsed ? "▶" : "▼", posX, posY + midY);
    this.hitAreas.collapse.bounds = [0, 0, w, height];
    posX += 20;
    this.hitAreas.toggle.bounds = [0, 0, 0, 0];

    ctx.fillStyle = "#fff";
    ctx.fillText(`${this.tag} (${lorasInTag.length})`, posX, posY + midY);

    ctx.restore();
  }

  private getLorasInTag(node: any): any[] {
    if (!node.customWidgets) return [];
    return node.customWidgets.filter((w: any) => 
      w instanceof SuperLoraWidget && w.value.tag === this.tag
    );
  }

  onCollapseDown = (_event: any, _pos: any, node: any): boolean => {
    this.value.collapsed = !this.value.collapsed;
    WidgetAPI.calculateNodeSize(node);
    node.setDirtyCanvas(true, false);
    return true;
  };

  onToggleDown = (_event: any, _pos: any, node: any): boolean => {
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


