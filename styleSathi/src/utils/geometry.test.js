import { describe, it, expect } from 'vitest';
import { iou, computeBlend, flipX } from './geometry';

describe('geometry utils', () => {
  it('computes IoU correctly for overlapping boxes', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    const inter = 5 * 5;
    const union = 10 * 10 + 10 * 10 - inter;
    const expected = inter / union;
    expect(iou(a, b)).toBeCloseTo(expected, 6);
  });
  it('computes IoU as 0 for non-overlapping boxes', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 20, y: 20, w: 5, h: 5 };
    expect(iou(a, b)).toBe(0);
  });
  it('selects blend mode based on light and softness', () => {
    expect(computeBlend(0.2, 0.3)).toBe('screen');
    expect(computeBlend(0.6, 0.3)).toBe('multiply');
    expect(computeBlend(0.6, 0.7)).toBe('soft-light');
  });
  it('flipX mirrors x when compensating', () => {
    expect(flipX(100, 10, true)).toBe(90);
    expect(flipX(100, 10, false)).toBe(10);
  });
});
