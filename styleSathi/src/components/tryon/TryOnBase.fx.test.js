import { describe, it, expect } from 'vitest';

const makeCtx = () => {
  const calls = [];
  const ctx = {
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    translate: (x, y) => calls.push(['translate', x, y]),
    rotate: (ang) => calls.push(['rotate', ang]),
    scale: (sx, sy) => calls.push(['scale', sx, sy]),
    drawImage: (...args) => calls.push(['drawImage', ...args]),
    beginPath: () => calls.push(['beginPath']),
    closePath: () => calls.push(['closePath']),
  };
  return { ctx, calls };
};

const drawHatOverlayShim = (ctx, c, compensateMirror, mx, yOff, ang, ow, oh) => {
  const fx = (x) => c.width - x;
  const fmx = fx(mx);
  ctx.save();
  ctx.translate(fmx, yOff);
  ctx.rotate(ang);
  if (compensateMirror) ctx.scale(-1, 1);
  ctx.drawImage('overlay', -ow / 2, -oh * 0.6, ow, oh);
  ctx.restore();
  return { fmx };
};

const computeGlassesAngleShim = (c, lx, ly, rx, ry) => {
  const fx = (x) => c.width - x;
  const dx = fx(rx) - fx(lx);
  const dy = ry - ly;
  return Math.atan2(dy, dx);
};

const computeFeetAngleLenShim = (c, hx, hy, tx, ty) => {
  const fx = (x) => c.width - x;
  const dx = fx(tx) - fx(hx);
  const dy = ty - hy;
  const ang = Math.atan2(dy, dx);
  const len = Math.max(1, Math.hypot(dx, dy));
  return { ang, len };
};

const computeHandAngleShim = (c, ix, iy, kx, ky) => {
  const fx = (x) => c.width - x;
  const dx = fx(kx) - fx(ix);
  const dy = ky - iy;
  return Math.atan2(dy, dx);
};

const computeWristAngleShim = (c, ix, iy, kx, ky) => {
  const fx = (x) => c.width - x;
  const dx = fx(kx) - fx(ix);
  const dy = ky - iy;
  return Math.atan2(dy, dx);
};

const computeJewelryEyesShim = (c, lx, ly, rx, ry) => {
  const fx = (x) => c.width - x;
  const mx = (lx + rx) / 2;
  const fmx = fx(mx);
  const flx = fx(lx);
  const frx = fx(rx);
  const d = Math.hypot(frx - flx, ry - ly);
  const ang = Math.atan2(ry - ly, frx - flx);
  return { fmx, d, ang };
};

const computeJewelryShouldersShim = (c, lx, ly, rx, ry) => {
  const fx = (x) => c.width - x;
  const mx = (lx + rx) / 2;
  const fmx = fx(mx);
  const d = Math.hypot(fx(rx) - fx(lx), ry - ly);
  const ang = Math.atan2(ry - ly, fx(rx) - fx(lx));
  return { fmx, d, ang };
};

const computeBodyOverlayShim = (c, lx, ly, rx, ry) => {
  const fx = (x) => c.width - x;
  const d = Math.hypot(fx(rx) - fx(lx), ry - ly);
  const ow = Math.max(40, d * 2.4);
  const ang = Math.atan2(ry - ly, fx(rx) - fx(lx));
  const mx = fx((lx + rx) / 2);
  const my = (ly + ry) / 2;
  return { d, ow, ang, mx, my };
};

const computeHairShim = (c, lx, ly, rx, ry) => {
  const fx = (x) => c.width - x;
  const mx = (lx + rx) / 2;
  const my = (ly + ry) / 2;
  const flx = fx(lx);
  const frx = fx(rx);
  const fmx = fx(mx);
  const d = Math.hypot(frx - flx, ry - ly);
  const ang = Math.atan2(ry - ly, frx - flx);
  const yOff = my - d * 0.45;
  return { fmx, d, ang, yOff };
};

const computeBody3DScaleShim = (c, lx, ly, rx, ry) => {
  const fx = (x) => c.width - x;
  const d = Math.hypot(fx(rx) - fx(lx), ry - ly);
  const s = Math.max(0.1, d * 0.25);
  return { d, s };
};

describe('TryOnBase fx mirror compensation shim', () => {
  it('mirrors x when compensateMirror is true and calls scale(-1,1)', () => {
    const c = { width: 100, height: 50 };
    const { ctx, calls } = makeCtx();
    const res = drawHatOverlayShim(ctx, c, true, 10, 20, Math.PI / 8, 200, 100);
    expect(res.fmx).toBe(90);
    const scaleCalls = calls.filter(([name]) => name === 'scale');
    expect(scaleCalls.length).toBe(1);
    expect(scaleCalls[0]).toEqual(['scale', -1, 1]);
    const translateCalls = calls.filter(([name]) => name === 'translate');
    expect(translateCalls[0]).toEqual(['translate', 90, 20]);
  });

  it('does not call scale when compensateMirror is false', () => {
    const c = { width: 100, height: 50 };
    const { ctx, calls } = makeCtx();
    const res = drawHatOverlayShim(ctx, c, false, 30, 5, 0, 100, 50);
    expect(res.fmx).toBe(70);
    const scaleCalls = calls.filter(([name]) => name === 'scale');
    expect(scaleCalls.length).toBe(0);
    const translateCalls = calls.filter(([name]) => name === 'translate');
    expect(translateCalls[0]).toEqual(['translate', 70, 5]);
  });

  it('computes glasses angle using fx-corrected x', () => {
    const c = { width: 100, height: 50 };
    const ang = computeGlassesAngleShim(c, 30, 40, 70, 50);
    const expected = Math.atan2(10, (100 - 70) - (100 - 30));
    expect(ang).toBeCloseTo(expected, 6);
  });

  it('computes feet angle and length using fx-corrected x', () => {
    const c = { width: 100, height: 50 };
    const { ang, len } = computeFeetAngleLenShim(c, 20, 80, 60, 70);
    const dx = (100 - 60) - (100 - 20);
    const dy = 70 - 80;
    expect(ang).toBeCloseTo(Math.atan2(dy, dx), 6);
    expect(len).toBeCloseTo(Math.hypot(dx, dy), 6);
  });

  it('computes hand angle between index and pinky using fx', () => {
    const c = { width: 120, height: 80 };
    const ang = computeHandAngleShim(c, 30, 40, 90, 50);
    const dx = (120 - 90) - (120 - 30);
    const dy = 50 - 40;
    expect(ang).toBeCloseTo(Math.atan2(dy, dx), 6);
  });

  it('computes wrist angle using fx between index and pinky', () => {
    const c = { width: 150, height: 90 };
    const ang = computeWristAngleShim(c, 35, 20, 100, 55);
    const dx = (150 - 100) - (150 - 35);
    const dy = 55 - 20;
    expect(ang).toBeCloseTo(Math.atan2(dy, dx), 6);
  });

  it('computes jewelry metrics from eyes landmarks', () => {
    const c = { width: 200, height: 120 };
    const { fmx, d, ang } = computeJewelryEyesShim(c, 60, 50, 140, 60);
    const expectedMx = (60 + 140) / 2;
    expect(fmx).toBe(200 - expectedMx);
    const flx = 200 - 60, frx = 200 - 140;
    expect(d).toBeCloseTo(Math.hypot(frx - flx, 60 - 50), 6);
    expect(ang).toBeCloseTo(Math.atan2(60 - 50, frx - flx), 6);
  });

  it('computes jewelry metrics from shoulders landmarks', () => {
    const c = { width: 180, height: 100 };
    const { fmx, d, ang } = computeJewelryShouldersShim(c, 40, 55, 120, 65);
    const expectedMx = (40 + 120) / 2;
    expect(fmx).toBe(180 - expectedMx);
    const dx = (180 - 120) - (180 - 40);
    const dy = 65 - 55;
    expect(d).toBeCloseTo(Math.hypot(dx, dy), 6);
    expect(ang).toBeCloseTo(Math.atan2(dy, dx), 6);
  });

  it('computes body overlay width and angle using fx', () => {
    const c = { width: 160, height: 100 };
    const { d, ow, ang, mx, my } = computeBodyOverlayShim(c, 30, 40, 110, 60);
    const dx = (160 - 110) - (160 - 30);
    const dy = 60 - 40;
    expect(d).toBeCloseTo(Math.hypot(dx, dy), 6);
    expect(ow).toBeCloseTo(Math.max(40, d * 2.4), 6);
    expect(ang).toBeCloseTo(Math.atan2(dy, dx), 6);
    expect(mx).toBeCloseTo(160 - ((30 + 110) / 2), 6);
    expect(my).toBeCloseTo((40 + 60) / 2, 6);
  });

  it('computes hair angle and y offset using fx and d', () => {
    const c = { width: 220, height: 140 };
    const { fmx, d, ang, yOff } = computeHairShim(c, 80, 60, 150, 70);
    const expectedMx = (80 + 150) / 2;
    expect(fmx).toBe(220 - expectedMx);
    const dx = (220 - 150) - (220 - 80);
    const dy = 70 - 60;
    expect(d).toBeCloseTo(Math.hypot(dx, dy), 6);
    expect(ang).toBeCloseTo(Math.atan2(dy, dx), 6);
    const my = (60 + 70) / 2;
    expect(yOff).toBeCloseTo(my - d * 0.45, 6);
  });

  it('computes body 3D model scale from shoulder distance', () => {
    const c = { width: 200, height: 140 };
    const { d, s } = computeBody3DScaleShim(c, 60, 40, 140, 80);
    const dx = (200 - 140) - (200 - 60);
    const dy = 80 - 40;
    const dExp = Math.hypot(dx, dy);
    expect(d).toBeCloseTo(dExp, 6);
    expect(s).toBeCloseTo(Math.max(0.1, dExp * 0.25), 6);
  });
});
