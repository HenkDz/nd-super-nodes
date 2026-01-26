/**
 * Canvas Drawing Utilities
 *
 * Reusable drawing primitives for Canvas-mode widgets.
 * These functions provide consistent styling and can be used
 * by multiple widget types.
 */

// ============================================
// Theme Constants
// ============================================

export const THEME = {
  // Backgrounds
  bgPrimary: '#2a2a2a',
  bgSecondary: '#2f2f2f',
  bgButton: '#555',
  bgButtonHover: '#666',
  bgRemove: '#3a2a2a',
  bgModelStrength: '#3b2a4a',
  bgClipStrength: '#4a3f1f',

  // Borders
  borderDefault: '#3a3a3a',
  borderHover: '#4a4a4a',
  borderActive: '#ffd700',
  borderEnabled: '#1b5e20',
  borderRemove: '#5a3a3a',

  // Text
  textPrimary: '#fff',
  textSecondary: '#888',
  textDisabled: '#bdbdbd',
  textPlaceholder: '#7a7a7a',
  textAccent: '#ffd700',

  // Status indicators
  statusEnabled: '#2e7d32',
  statusAuto: 'rgba(40, 167, 69, 0.85)',
  statusManual: 'rgba(74, 158, 255, 0.85)',
  statusEmpty: 'rgba(160, 160, 160, 0.7)',
  statusPending: 'rgba(253, 126, 20, 0.9)',

  // Sizing
  toggleSize: 20,
  buttonSize: 20,
  arrowSize: 20,
  strengthWidth: 50,
  rowHeight: 28,
  cornerRadius: 6,
  smallRadius: 2,
  mediumRadius: 3,

  // Spacing
  marginSmall: 2,
  marginMedium: 6,
  marginLarge: 8,
  gap: 8,
  iconPadding: 6,
} as const;

// ============================================
// Drawing Primitives
// ============================================

/**
 * Draw a rounded rectangle with optional fill and stroke
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  options: {
    fill?: string;
    stroke?: string;
    lineWidth?: number;
  } = {}
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    // Fallback for older browsers
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  if (options.fill) {
    ctx.fillStyle = options.fill;
    ctx.fill();
  }

  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.lineWidth ?? 1;
    ctx.stroke();
  }
}

/**
 * Draw a toggle button (checkbox-like)
 */
export function drawToggle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  enabled: boolean,
  size: number = THEME.toggleSize
): { bounds: [number, number, number, number] } {
  const centerY = y + size / 2;

  drawRoundedRect(ctx, x, y, size, size, THEME.smallRadius, {
    fill: THEME.bgPrimary,
    stroke: enabled ? THEME.borderEnabled : THEME.borderDefault,
    lineWidth: 1,
  });

  if (enabled) {
    ctx.fillStyle = THEME.statusEnabled;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Arial';
    ctx.fillText('●', x + size / 2, centerY);
  }

  return { bounds: [x, y, size, size] };
}

/**
 * Draw a simple button with text
 */
export function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  options: {
    bg?: string;
    textColor?: string;
    fontSize?: number;
    disabled?: boolean;
  } = {}
): { bounds: [number, number, number, number] } {
  const alpha = options.disabled ? 0.35 : 1;
  ctx.save();
  ctx.globalAlpha *= alpha;

  drawRoundedRect(ctx, x, y, width, height, THEME.smallRadius, {
    fill: options.bg ?? THEME.bgButton,
  });

  ctx.fillStyle = options.textColor ?? THEME.textPrimary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${options.fontSize ?? 12}px Arial`;
  ctx.fillText(text, x + width / 2, y + height / 2);

  ctx.restore();

  return { bounds: [x, y, width, height] };
}

/**
 * Draw strength value box (model or clip)
 */
export function drawStrengthBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: number,
  type: 'model' | 'clip',
  enabled: boolean = true
): { bounds: [number, number, number, number] } {
  const width = THEME.strengthWidth;
  const height = 20;
  const bg = enabled
    ? type === 'model'
      ? THEME.bgModelStrength
      : THEME.bgClipStrength
    : THEME.bgPrimary;

  drawRoundedRect(ctx, x, y, width, height, THEME.mediumRadius, {
    fill: bg,
    stroke: THEME.borderHover,
    lineWidth: 1,
  });

  ctx.fillStyle = enabled ? '#e5e5e5' : THEME.textDisabled;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '12px Arial';
  ctx.fillText(value.toFixed(2), x + width / 2, y + height / 2);

  return { bounds: [x, y, width, height] };
}

/**
 * Draw icon button (emoji-based)
 */
export function drawIconButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  icon: string,
  options: {
    size?: number;
    bg?: string;
    border?: string;
    disabled?: boolean;
  } = {}
): { bounds: [number, number, number, number] } {
  const size = options.size ?? THEME.buttonSize;
  const alpha = options.disabled ? 0.35 : 1;

  ctx.save();
  ctx.globalAlpha *= alpha;

  drawRoundedRect(ctx, x, y, size, size, THEME.smallRadius, {
    fill: options.bg ?? THEME.bgSecondary,
    stroke: options.border,
    lineWidth: options.border ? 1 : 0,
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '12px Arial';
  ctx.fillText(icon, x + size / 2, y + size / 2);

  ctx.restore();

  return { bounds: [x, y, size, size] };
}

/**
 * Draw a circular indicator (for trigger word status)
 */
export function drawStatusIndicator(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  status: 'auto' | 'manual' | 'empty' | 'pending',
  icon: string = '↻',
  spinning: boolean = false,
  spinProgress: number = 0
): { bounds: [number, number, number, number] } {
  const colors = {
    auto: THEME.statusAuto,
    manual: THEME.statusManual,
    empty: THEME.statusEmpty,
    pending: THEME.statusPending,
  };

  ctx.save();

  // Outer circle
  ctx.fillStyle = colors[status];
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Icon with optional rotation
  ctx.fillStyle = '#111';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (spinning) {
    ctx.translate(cx, cy);
    ctx.rotate(spinProgress * Math.PI * 2);
    ctx.fillText(icon, 0, 0);
  } else {
    ctx.fillText(icon, cx, cy);
  }

  ctx.restore();

  const size = radius * 2 + 2;
  return { bounds: [cx - radius, cy - radius, size, size] };
}

/**
 * Truncate text to fit within maxWidth, adding ellipsis
 */
export function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  keepEnd: boolean = false
): string {
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

// ============================================
// Layout Calculation Utilities
// ============================================

export interface LayoutConfig {
  width: number;
  margin: number;
  showTags: boolean;
  showTriggerWords: boolean;
  showMoveArrows: boolean;
  showStrength: boolean;
  showSeparateStrengths: boolean;
  showRemove: boolean;
  loraCount: number;
  currentIndex: number;
}

export interface LayoutResult {
  toggleX: number;
  tagX: number;
  loraX: number;
  loraWidth: number;
  triggerX: number;
  triggerWidth: number;
  moveUpX: number;
  moveDownX: number;
  modelMinusX: number;
  modelValueX: number;
  modelPlusX: number;
  clipMinusX: number;
  clipValueX: number;
  clipPlusX: number;
  removeX: number;
}

/**
 * Calculate X positions for all elements in a LoRA row
 */
export function calculateRowLayout(config: LayoutConfig): LayoutResult {
  const {
    width,
    margin,
    showTags,
    showTriggerWords,
    showMoveArrows,
    showStrength,
    showSeparateStrengths,
    showRemove,
  } = config;

  let posX = margin + THEME.marginMedium;
  const rightEdge = width - margin;

  // Toggle is always at the start
  const toggleX = posX;
  posX += THEME.toggleSize + THEME.gap;

  // Tag chip (optional)
  const tagX = showTags ? posX : -9999;
  if (showTags) {
    posX += THEME.buttonSize + THEME.marginMedium;
  }

  // Calculate from right edge
  let cursorX = rightEdge;

  // Remove button
  const removeX = showRemove ? cursorX - THEME.buttonSize : -9999;
  if (showRemove) {
    cursorX -= THEME.buttonSize + THEME.gap;
  }

  // Model strength (always rightmost strength group)
  let modelPlusX = -9999,
    modelValueX = -9999,
    modelMinusX = -9999;
  if (showStrength) {
    cursorX -= THEME.buttonSize;
    modelPlusX = cursorX;
    cursorX -= THEME.marginSmall;
    cursorX -= THEME.strengthWidth;
    modelValueX = cursorX;
    cursorX -= THEME.marginSmall;
    cursorX -= THEME.buttonSize;
    modelMinusX = cursorX;
    cursorX -= THEME.gap;
  }

  // CLIP strength (optional, left of model)
  let clipPlusX = -9999,
    clipValueX = -9999,
    clipMinusX = -9999;
  if (showStrength && showSeparateStrengths) {
    cursorX -= THEME.buttonSize;
    clipPlusX = cursorX;
    cursorX -= THEME.marginSmall;
    cursorX -= THEME.strengthWidth;
    clipValueX = cursorX;
    cursorX -= THEME.marginSmall;
    cursorX -= THEME.buttonSize;
    clipMinusX = cursorX;
    cursorX -= THEME.gap;
  }

  // Move arrows
  let moveUpX = -9999,
    moveDownX = -9999;
  if (showMoveArrows) {
    moveUpX = cursorX - THEME.arrowSize - 4;
    moveDownX = moveUpX - (THEME.arrowSize + 2);
    cursorX = moveDownX - THEME.gap;
  }

  // LoRA name fills remaining space
  const loraX = posX;
  const loraMaxRight = cursorX - THEME.gap;
  const totalLoraSpace = Math.max(100, loraMaxRight - loraX);

  // Split between name and trigger words if both shown
  let loraWidth: number;
  let triggerX = -9999;
  let triggerWidth = 0;

  if (showTriggerWords) {
    loraWidth = Math.max(80, Math.floor(totalLoraSpace * 0.6));
    triggerX = loraX + loraWidth;
    triggerWidth = totalLoraSpace - loraWidth;
  } else {
    loraWidth = totalLoraSpace;
  }

  return {
    toggleX,
    tagX,
    loraX,
    loraWidth,
    triggerX,
    triggerWidth,
    moveUpX,
    moveDownX,
    modelMinusX,
    modelValueX,
    modelPlusX,
    clipMinusX,
    clipValueX,
    clipPlusX,
    removeX,
  };
}
