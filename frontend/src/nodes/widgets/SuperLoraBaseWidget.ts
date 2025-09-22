export class SuperLoraBaseWidget {
  public type: string;
  public value: any;
  public hitAreas: any;

  constructor(public name: string) {
    this.type = "custom";
    this.value = {};
    this.hitAreas = {};
  }

  draw(_ctx: any, _node: any, _w: number, _posY: number, _height: number): void {
    // Override in subclasses
  }

  onMouseDown(event: any, pos: any, node: any): boolean {
    return this.handleHitAreas(event, pos, node, 'onDown');
  }

  onClick(event: any, pos: any, node: any): boolean {
    return this.handleHitAreas(event, pos, node, 'onClick');
  }

  protected handleHitAreas(event: any, pos: any, node: any, handler: 'onDown' | 'onClick'): boolean {
    // console.log(`[${this.constructor.name}] Click at: [${pos[0]}, ${pos[1]}], Handler: ${handler}`);

    type HitArea = { bounds: number[]; onDown?: (e:any,p:any,n:any)=>boolean; onClick?: (e:any,p:any,n:any)=>boolean; priority?: number };
    const entries: Array<[string, HitArea]> = Object.entries(this.hitAreas as Record<string, HitArea>) as Array<[string, HitArea]>;
    entries.sort((a, b) => {
      const pa = (a[1]?.priority) || 0;
      const pb = (b[1]?.priority) || 0;
      return pb - pa; // higher priority first
    });

    for (const [key, area] of entries) {
      const bounds = area.bounds;
      // console.log(`  Checking ${key}: bounds=${bounds}`);

      if (bounds && bounds.length >= 4 && this.isInBounds(pos, bounds)) {
        const fn = (handler === 'onDown' ? area.onDown : area.onClick) || (handler === 'onDown' ? area.onClick : area.onDown);
        if (fn) {
          // console.log(`  ✓ HIT: ${key} - calling ${handler}`);
          return fn.call(this, event, pos, node);
        }
      }
    }
    // console.log('  ✗ No hit areas matched');
    return false;
  }

  protected isInBounds(pos: any, bounds: number[]): boolean {
    if (bounds.length < 4) return false;
    const [x, y, width, height] = bounds;
    return pos[0] >= x && pos[0] <= x + width && 
           pos[1] >= y && pos[1] <= y + height;
  }

  computeSize(): [number, number] {
    return [200, 25];
  }
}


