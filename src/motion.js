const clamp = (value) => Math.max(0, Math.min(1, value));

export function motionOffsets({ x = 0, y = 0, width = 1, height = 1, scroll = 0, reduced = false }) {
  if (reduced) return { x: 0, y: 0, scroll: 0 };
  return {
    x: clamp(x / Math.max(width, 1)) * 2 - 1,
    y: clamp(y / Math.max(height, 1)) * 2 - 1,
    scroll: clamp(scroll),
  };
}
