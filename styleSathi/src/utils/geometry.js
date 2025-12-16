export const iou = (a, b) => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
};

export const computeBlend = (light, softness) => {
  const soft = Math.max(0, Math.min(1, softness || 0));
  return light < 0.35 ? 'screen' : (soft < 0.5 ? 'multiply' : 'soft-light');
};

export const flipX = (width, x, compensateMirror = true) => {
  return compensateMirror ? (width - x) : x;
};
