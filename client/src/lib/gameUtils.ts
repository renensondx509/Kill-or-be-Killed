export const PAINT_PALETTE = [
  "#3498db",
  "#e67e22",
  "#2ecc71",
  "#9b59b6",
  "#e74c3c",
  "#f1c40f",
  "#1abc9c",
  "#e91e63",
];

export function getPaintColor(name: string): string {
  if (!name) return PAINT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return PAINT_PALETTE[Math.abs(hash) % PAINT_PALETTE.length];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export function normalizeInput(x: number, y: number, width: number, height: number) {
  return { nx: clamp(x / width, 0, 1), ny: clamp(y / height, 0, 1) };
}
