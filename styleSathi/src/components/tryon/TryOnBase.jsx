import { useEffect, useRef, useState, useCallback } from 'react';
const TRACK_PARAMS = {
  procWidth: 240,
  motionThreshold: 50,
  bin: 10,
  minComponentArea: 500,
  matchMaxDistance: 120,
  iouThreshold: 0.15,
  smoothingAlpha: 0.25,
  maxMiss: 7,
};
import styleSathiLogo from '../../assets/styleSathiLogo.svg';
import { resolveAssetUrl } from '../../services/api';
import { computeBlend, iou } from '../../utils/geometry';

const TryOnBase = ({ overlaySrc, modelGlbUrl, mode, onClose, inline = false, width = 800, height = 450, makeupColors = { lips: '#ff4d88', eyes: '#4d79ff', brows: '#8b4513', cheeks: '#ff9999' }, makeupIntensity = { lips: 0.35, eyes: 0.25, brows: 0.4, cheeks: 0.35 }, makeupSoftness = 0.5, applyMakeup = false, compensateMirror = true }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webglCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [fps, setFps] = useState(0);
  const [trackCenter, setTrackCenter] = useState(null);
  const prevFrameRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const lastTsRef = useRef(0);
  const procCanvasRef = useRef(null);
  const tracksRef = useRef([]);
  const nextTrackIdRef = useRef(1);

  const faceMeshRef = useRef(null);
  const landmarksRef = useRef(null);
  const handsRef = useRef(null);
  const handLmRef = useRef(null);
  const poseRef = useRef(null);
  const poseLmRef = useRef(null);
  const prevHandLmRef = useRef(null);
  const prevPoseLmRef = useRef(null);
  const lastHandTsRef = useRef(0);
  const lastPoseTsRef = useRef(0);
  const threeRef = useRef(null);
  const threeLoadedRef = useRef(false);
  const modelLoadedRef = useRef(false);
  const fallbackAttemptedRef = useRef(false);
  const anchorRef = useRef({ x: 0, y: 0, s: 1, r: 0 });
  const applyMakeupRef = useRef(false);
  const makeupColorsRef = useRef(makeupColors);
  const makeupIntensityRef = useRef(makeupIntensity);
  const skinCanvasRef = useRef(null);
  const makeupSoftnessRef = useRef(makeupSoftness);

  

  useEffect(() => { applyMakeupRef.current = !!applyMakeup; }, [applyMakeup]);
  useEffect(() => { makeupColorsRef.current = makeupColors || makeupColorsRef.current; }, [makeupColors]);
  useEffect(() => { makeupIntensityRef.current = makeupIntensity || makeupIntensityRef.current; }, [makeupIntensity]);
  useEffect(() => { makeupSoftnessRef.current = (typeof makeupSoftness === 'number' ? makeupSoftness : makeupSoftnessRef.current); }, [makeupSoftness]);

  const loop = useCallback(async function tick(ts) {
    const v = videoRef.current;
    const c = canvasRef.current;
    const wc = webglCanvasRef.current;
    const o = overlayRef.current;
    if (v && c) {
      if (faceMeshRef.current && (mode === 'face' || mode === 'makeup' || mode === 'glasses' || mode === 'hat' || mode === 'jewelry' || mode === 'hair' || mode === 'skin')) { try { await faceMeshRef.current.send({ image: v }); } catch { void 0; } }
      if (handsRef.current && (mode === 'hand' || mode === 'wrist')) { try { await handsRef.current.send({ image: v }); } catch { void 0; } }
      if (poseRef.current && (mode === 'feet' || mode === 'body' || mode === 'jewelry')) { try { await poseRef.current.send({ image: v }); } catch { void 0; } }
      const ctx = c.getContext('2d');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      let center = trackCenter;
      let box = null;
      let detections = [];
      const hasFace = typeof window !== 'undefined' && 'FaceDetector' in window && faceDetectorRef.current;
      if (mode === 'face' && hasFace) {
        try {
          const faces = await faceDetectorRef.current.detect(v);
          if (faces && faces.length > 0) {
            const b = faces[0].boundingBox || faces[0].bounds || faces[0];
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            detections.push({ x: b.x, y: b.y, w: b.width, h: b.height, cx, cy });
          }
        } catch { void 0; }
      }
      if (!procCanvasRef.current) { procCanvasRef.current = document.createElement('canvas'); }
      const pc = procCanvasRef.current;
      const aspect = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9;
      pc.width = TRACK_PARAMS.procWidth;
      pc.height = Math.max(90, Math.round(pc.width / aspect));
      const pctx = pc.getContext('2d', { willReadFrequently: true });
      pctx.drawImage(v, 0, 0, pc.width, pc.height);
      const small = pctx.getImageData(0, 0, pc.width, pc.height);
      const prevSmall = prevFrameRef.current;
      if (prevSmall && prevSmall.width === small.width && prevSmall.height === small.height) {
        const bin = TRACK_PARAMS.bin;
        const gw = Math.ceil(pc.width / bin);
        const gh = Math.ceil(pc.height / bin);
        const active = Array.from({ length: gh }, () => new Array(gw).fill(0));
        for (let y = 0; y < pc.height; y++) {
          for (let x = 0; x < pc.width; x++) {
            const idx = (y * pc.width + x) * 4;
            const dr = Math.abs(small.data[idx] - prevSmall.data[idx]);
            const dg = Math.abs(small.data[idx + 1] - prevSmall.data[idx + 1]);
            const db = Math.abs(small.data[idx + 2] - prevSmall.data[idx + 2]);
            if ((dr + dg + db) > TRACK_PARAMS.motionThreshold) {
              const xb = Math.floor(x / bin);
              const yb = Math.floor(y / bin);
              active[yb][xb]++;
            }
          }
        }
        
        const visited = Array.from({ length: gh }, () => new Array(gw).fill(false));
        const comps = [];
        for (let yb = 0; yb < gh; yb++) {
          for (let xb = 0; xb < gw; xb++) {
            if (visited[yb][xb]) continue;
            if (active[yb][xb] < bin) continue;
            let minx = xb, maxx = xb, miny = yb, maxy = yb;
            const q = [[xb, yb]];
            visited[yb][xb] = true;
            while (q.length) {
              const [cx, cy] = q.shift();
              minx = Math.min(minx, cx);
              maxx = Math.max(maxx, cx);
              miny = Math.min(miny, cy);
              maxy = Math.max(maxy, cy);
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = cx + dx;
                  const ny = cy + dy;
                  if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
                  if (visited[ny][nx]) continue;
                  if (active[ny][nx] < bin) continue;
                  visited[ny][nx] = true;
                  q.push([nx, ny]);
                }
              }
            }
            const bw = (maxx - minx + 1) * bin;
            const bh = (maxy - miny + 1) * bin;
            if (bw * bh >= TRACK_PARAMS.minComponentArea) comps.push({ minx, miny, maxx, maxy });
          }
        }
        const sx = c.width / pc.width;
        const sy = c.height / pc.height;
        detections = detections.concat(comps.map(cmp => {
          const x = cmp.minx * bin * sx;
          const y = cmp.miny * bin * sy;
          const w = (cmp.maxx - cmp.minx + 1) * bin * sx;
          const h = (cmp.maxy - cmp.miny + 1) * bin * sy;
          return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
        }));
        const tracks = tracksRef.current;
        const used = new Array(detections.length).fill(false);
        for (const t of tracks) {
          const px = t.cx; const py = t.cy;
          t.cx = t.cx + (t.vx || 0);
          t.cy = t.cy + (t.vy || 0);
          t.x = t.cx - t.w / 2; t.y = t.cy - t.h / 2;
          t.prevCx = px; t.prevCy = py;
        }
        for (const t of tracks) {
          let best = -1; let bestScore = -Infinity; let bestD = Infinity; let bestIou = 0;
          for (let i = 0; i < detections.length; i++) {
            if (used[i]) continue;
            const d = Math.hypot(detections[i].cx - t.cx, detections[i].cy - t.cy);
            const candidate = { x: detections[i].x, y: detections[i].y, w: detections[i].w, h: detections[i].h };
            const curr = { x: t.x, y: t.y, w: t.w, h: t.h };
            const ov = iou(candidate, curr);
            const score = ov - (d / TRACK_PARAMS.matchMaxDistance) * 0.2;
            if (score > bestScore) { bestScore = score; best = i; bestD = d; bestIou = ov; }
          }
          if (best !== -1 && (bestIou >= TRACK_PARAMS.iouThreshold || bestD < TRACK_PARAMS.matchMaxDistance)) {
            const d = detections[best];
            const a = TRACK_PARAMS.smoothingAlpha;
            const newCx = t.cx * (1 - a) + d.cx * a;
            const newCy = t.cy * (1 - a) + d.cy * a;
            const newW = t.w * (1 - a) + d.w * a;
            const newH = t.h * (1 - a) + d.h * a;
            t.vx = (newCx - t.cx);
            t.vy = (newCy - t.cy);
            t.cx = newCx; t.cy = newCy; t.w = newW; t.h = newH;
            t.x = t.cx - t.w / 2; t.y = t.cy - t.h / 2;
            t.miss = 0;
            t.age = (t.age || 0) + 1;
            t.conf = Math.min(1, (t.conf || 0.5) + 0.1);
            used[best] = true;
          } else {
            t.miss = (t.miss || 0) + 1;
          }
        }
        for (let i = 0; i < detections.length; i++) {
          if (used[i]) continue;
          const d = detections[i];
          const id = nextTrackIdRef.current++;
          const hue = (id * 47) % 360;
          tracks.push({ id, cx: d.cx, cy: d.cy, x: d.x, y: d.y, w: d.w, h: d.h, miss: 0, age: 1, conf: 0.5, vx: 0, vy: 0, color: `hsl(${hue} 80% 50%)` });
        }
        tracksRef.current = tracks.filter(t => (t.miss || 0) <= TRACK_PARAMS.maxMiss);
        if (!center && tracksRef.current.length > 0) {
          const score = (t) => (t.w * t.h) * (0.5 + (t.conf || 0)) - (t.miss || 0) * 500;
          const main = tracksRef.current.reduce((a, b) => (score(a) > score(b) ? a : b));
          center = { x: main.cx, y: main.cy };
          box = { x: main.x, y: main.y, w: main.w, h: main.h };
        }
      }
      prevFrameRef.current = small;
      setTrackCenter(center || null);
      if (threeRef.current && threeRef.current.renderer && wc) {
        const lm = landmarksRef.current;
        let hlm = handLmRef.current;
        let plm = poseLmRef.current;
        const nowTs = typeof ts === 'number' ? ts : performance.now();
        if (!hlm && (nowTs - (lastHandTsRef.current || 0)) < 300) hlm = prevHandLmRef.current;
        if (!plm && (nowTs - (lastPoseTsRef.current || 0)) < 300) plm = prevPoseLmRef.current;
        const m = threeRef.current.model;
        if (m) {
          if (mode === 'face' && lm && lm.length > 0) {
            const li = lm[33];
            const ri = lm[263];
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const fx = (x) => c.width - x;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const s = Math.max(0.001, d * 0.02);
            const a = 0.35;
            const px = anchorRef.current.x * (1 - a) + fmx * a;
            const my = (ly + ry) / 2;
            const py = anchorRef.current.y * (1 - a) + my * a;
            const pr = anchorRef.current.r * (1 - a) + Math.atan2(ry - ly, frx - flx) * a;
            const ps = anchorRef.current.s * (1 - a) + s * a;
            anchorRef.current = { x: px, y: py, r: pr, s: ps };
            m.position.set(px, c.height - py, 0);
            m.rotation.z = pr;
            m.scale.set(ps, ps, ps);
          } else if (mode === 'hat' && lm && lm.length > 0) {
            const li = lm[33];
            const ri = lm[263];
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const fx = (x) => c.width - x;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const base = Math.max(1e-6, threeRef.current.modelBaseSize || d);
            const targetW = Math.max(80, d * 2.0);
            const s = Math.max(0.001, targetW / base);
            const a = 0.35;
            const my = (ly + ry) / 2;
            const lift = d * 0.40;
            const px = anchorRef.current.x * (1 - a) + fmx * a;
            const py = anchorRef.current.y * (1 - a) + (my - lift) * a;
            const pr = anchorRef.current.r * (1 - a) + Math.atan2(ry - ly, frx - flx) * a;
            const ps = anchorRef.current.s * (1 - a) + s * a;
            anchorRef.current = { x: px, y: py, r: pr, s: ps };
            m.position.set(px, c.height - py, 0);
            m.rotation.z = pr;
            m.scale.set(ps, ps, ps);
          } else if (mode === 'hand' && hlm && hlm.length > 0) {
          const wrist = hlm[0];
          const idx = hlm[5];
          const mid = hlm[9];
          const ring = hlm[13];
          const pky = hlm[17];
          const pts = [wrist, idx, mid, ring, pky].filter(Boolean);
          const mx = pts.reduce((a,p)=>a+p.x,0)/pts.length * c.width;
          const my = pts.reduce((a,p)=>a+p.y,0)/pts.length * c.height;
          const ix = idx.x * c.width;
          const iy = idx.y * c.height;
          const pxh = pky.x * c.width;
          const pyh = pky.y * c.height;
          const fx = (x) => c.width - x;
          const fmx = fx(mx);
          const fix = fx(ix);
          const fpx = fx(pxh);
          const d = Math.hypot(fpx - fix, pyh - iy);
          const s = Math.max(0.05, d * 0.12);
          const a = 0.35;
          const pr = Math.atan2(pyh - iy, fpx - fix);
          const px2 = anchorRef.current.x * (1 - a) + fmx * a;
          const py2 = anchorRef.current.y * (1 - a) + my * a;
          const pr2 = anchorRef.current.r * (1 - a) + pr * a;
          const ps2 = anchorRef.current.s * (1 - a) + s * a;
          anchorRef.current = { x: px2, y: py2, r: pr2, s: ps2 };
          m.position.set(px2, c.height - py2, 0);
          m.rotation.z = pr2;
          m.scale.set(ps2, ps2, ps2);
          } else if (mode === 'wrist' && hlm && hlm.length > 0) {
            const wrist = hlm[0];
            const idx = hlm[5];
            const pky = hlm[17];
            if (wrist && idx && pky) {
              const wx = wrist.x * c.width;
              const wy = wrist.y * c.height;
              const ix = idx.x * c.width;
              const iy = idx.y * c.height;
              const kx = pky.x * c.width;
              const ky = pky.y * c.height;
              const fx = (x) => c.width - x;
              const fwx = fx(wx);
              const fix = fx(ix);
              const fkx = fx(kx);
              const palmW = Math.max(30, Math.hypot(fkx - fix, ky - iy));
              const s = Math.max(0.05, palmW * 0.10);
              const a = 0.35;
              const pr = Math.atan2(ky - iy, fkx - fix);
              const px2 = anchorRef.current.x * (1 - a) + fwx * a;
              const py2 = anchorRef.current.y * (1 - a) + wy * a;
              const pr2 = anchorRef.current.r * (1 - a) + pr * a;
              const ps2 = anchorRef.current.s * (1 - a) + s * a;
              anchorRef.current = { x: px2, y: py2, r: pr2, s: ps2 };
              m.position.set(px2, c.height - py2, 0);
              m.rotation.z = pr2;
              m.scale.set(ps2, ps2, ps2);
            }
          } else if (mode === 'feet' && plm && plm.length > 0) {
            const l_ank = plm[27];
            const r_ank = plm[28];
            const l_heel = plm[29];
            const r_heel = plm[30];
            const l_toe = plm[31];
            const r_toe = plm[32];
            const useLeft = !!(l_ank && l_toe);
            const ax = (useLeft ? l_ank.x : r_ank.x) * c.width;
            const ay = (useLeft ? l_ank.y : r_ank.y) * c.height;
            const tx = (useLeft ? l_toe.x : r_toe.x) * c.width;
            const ty = (useLeft ? l_toe.y : r_toe.y) * c.height;
            const hx = (useLeft ? l_heel?.x : r_heel?.x) * c.width || ax;
            const hy = (useLeft ? l_heel?.y : r_heel?.y) * c.height || ay;
            const fx = (x) => c.width - x;
            const mx = fx((ax + tx) / 2);
            const my = (ay + ty) / 2;
            const footLen = Math.max(1, Math.hypot(fx(tx) - fx(hx), ty - hy));
            const s = Math.max(0.08, footLen * 0.18);
            const a = 0.35;
            const pr = Math.atan2(ty - hy, fx(tx) - fx(hx));
            const px2 = anchorRef.current.x * (1 - a) + mx * a;
            const py2 = anchorRef.current.y * (1 - a) + my * a;
            const pr2 = anchorRef.current.r * (1 - a) + pr * a;
            const ps2 = anchorRef.current.s * (1 - a) + s * a;
            anchorRef.current = { x: px2, y: py2, r: pr2, s: ps2 };
            m.position.set(px2, c.height - py2, 0);
            m.rotation.z = pr2;
            m.scale.set(ps2, ps2, ps2);
          } else if (mode === 'body' && plm && plm.length > 0) {
            const ls = plm[11];
            const rs = plm[12];
            const lx = ls.x * c.width;
            const ly = ls.y * c.height;
            const rx = rs.x * c.width;
            const ry = rs.y * c.height;
            const fx = (x) => c.width - x;
            const mx = fx((lx + rx) / 2);
            const my = (ly + ry) / 2;
            const d = Math.hypot(fx(rx) - fx(lx), ry - ly);
            const s = Math.max(0.1, d * 0.25);
            const a = 0.35;
            const pr = Math.atan2(ry - ly, fx(rx) - fx(lx));
            const px2 = anchorRef.current.x * (1 - a) + mx * a;
            const py2 = anchorRef.current.y * (1 - a) + my * a;
            const pr2 = anchorRef.current.r * (1 - a) + pr * a;
            const ps2 = anchorRef.current.s * (1 - a) + s * a;
            anchorRef.current = { x: px2, y: py2, r: pr2, s: ps2 };
            m.position.set(px2, c.height - py2, 0);
            m.rotation.z = pr2;
            m.scale.set(ps2, ps2, ps2);
          } else if (box) {
            const mx = box.x + box.w / 2;
            const my = box.y + box.h / 2;
            const base = Math.max(1e-6, threeRef.current.modelBaseSize || box.w);
            const targetW = Math.max(60, box.w * 1.6);
            const s = Math.max(0.001, targetW / base);
            m.position.set(mx, c.height - my, 0);
            m.scale.set(s, s, s);
          }
        }
        const cam = threeRef.current.camera;
        if (cam && (cam.right !== c.width || cam.top !== c.height)) {
          cam.left = 0; cam.right = c.width; cam.top = c.height; cam.bottom = 0; cam.updateProjectionMatrix();
          threeRef.current.renderer.setSize(c.width, c.height);
        }
        threeRef.current.renderer.render(threeRef.current.scene, cam);
      }

      const lm = landmarksRef.current;
      const hlm = handLmRef.current;
      const plm = poseLmRef.current;
      const fx = (x) => c.width - x;
      if (mode === 'makeup' && lm && lm.length > 0) {
        const toRgba = (hex, alpha) => {
          const h = String(hex || '').replace('#','');
          const r = parseInt(h.length===3 ? h[0]+h[0] : h.slice(0,2), 16);
          const g = parseInt(h.length===3 ? h[1]+h[1] : h.slice(2,4), 16);
          const b = parseInt(h.length===3 ? h[2]+h[2] : h.slice(4,6), 16);
          const a = Math.max(0, Math.min(1, alpha));
          return `rgba(${isFinite(r)?r:0},${isFinite(g)?g:0},${isFinite(b)?b:0},${a})`;
        };
        const getLighting = () => {
          const pc = procCanvasRef.current;
          if (!pc) return 0.5;
          const pctx2 = pc.getContext('2d');
          const data = pctx2.getImageData(0, 0, pc.width, pc.height).data;
          let sum = 0; let n = 0;
          for (let i = 0; i < data.length; i += 4) { sum += (data[i] + data[i+1] + data[i+2]) / 3; n++; }
          return Math.max(0, Math.min(1, (sum / n) / 255));
        };
        const light = getLighting();
        const sampleRect = (cx, cy, r) => {
          const pc = procCanvasRef.current;
          if (!pc) return { brightness: 0.5, redness: 0, coolness: 0 };
          const pctx2 = pc.getContext('2d');
          const x0 = Math.max(0, Math.floor(cx - r));
          const y0 = Math.max(0, Math.floor(cy - r));
          const x1 = Math.min(pc.width, Math.ceil(cx + r));
          const y1 = Math.min(pc.height, Math.ceil(cy + r));
          let br = 0; let red = 0; let cool = 0; let count = 0;
          const data = pctx2.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
          for (let i = 0; i < data.length; i += 4) {
            const R = data[i], G = data[i+1], B = data[i+2];
            br += (R + G + B) / 3;
            red += Math.max(0, R - G);
            cool += Math.max(0, B - R);
            count++;
          }
          if (count === 0) return { brightness: 0.5, redness: 0, coolness: 0 };
          return {
            brightness: Math.max(0, Math.min(1, (br / count) / 255)),
            redness: Math.max(0, Math.min(1, (red / count) / 255)),
            coolness: Math.max(0, Math.min(1, (cool / count) / 255)),
          };
        };
        const fillRegion = (pairs, color, alpha) => {
          const set = new Set();
          for (let i = 0; i < pairs.length; i++) { set.add(pairs[i][0]); set.add(pairs[i][1]); }
          const pts = Array.from(set).map(idx => lm[idx]).filter(Boolean).map(p => ({ x: fx(p.x * c.width), y: p.y * c.height }));
          if (pts.length < 3) return;
          const cx = pts.reduce((a,p)=>a+p.x,0)/pts.length;
          const cy = pts.reduce((a,p)=>a+p.y,0)/pts.length;
          pts.sort((a,b)=>Math.atan2(a.y-cy, a.x-cx) - Math.atan2(b.y-cy, b.x-cx));
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          const soft = Math.max(0, Math.min(1, makeupSoftnessRef.current || 0));
          const blur = Math.round(soft * 8);
          const blend = computeBlend(light, soft);
          ctx.save();
          ctx.globalCompositeOperation = blend;
          ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
          ctx.fillStyle = toRgba(color, alpha);
          ctx.fill();
          ctx.restore();
        };
        const strokeRegion = (pairs, color, width = 2, blend = 'multiply') => {
          const set = new Set();
          for (let i = 0; i < pairs.length; i++) { set.add(pairs[i][0]); set.add(pairs[i][1]); }
          const pts = Array.from(set).map(idx => lm[idx]).filter(Boolean).map(p => ({ x: fx(p.x * c.width), y: p.y * c.height }));
          if (pts.length < 2) return;
          const cx = pts.reduce((a,p)=>a+p.x,0)/pts.length;
          const cy = pts.reduce((a,p)=>a+p.y,0)/pts.length;
          pts.sort((a,b)=>Math.atan2(a.y-cy, a.x-cx) - Math.atan2(b.y-cy, b.x-cx));
          ctx.save();
          const soft = Math.max(0, Math.min(1, makeupSoftnessRef.current || 0));
          const blur = Math.round(soft * 4);
          ctx.globalCompositeOperation = blend;
          ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.strokeStyle = toRgba(color, 1);
          ctx.lineWidth = width;
          ctx.stroke();
          ctx.restore();
        };
        const clipRegion = (pairs, run) => {
          const set = new Set();
          for (let i = 0; i < pairs.length; i++) { set.add(pairs[i][0]); set.add(pairs[i][1]); }
          const pts = Array.from(set).map(idx => lm[idx]).filter(Boolean).map(p => ({ x: fx(p.x * c.width), y: p.y * c.height }));
          if (pts.length < 3) return;
          const cx = pts.reduce((a,p)=>a+p.x,0)/pts.length;
          const cy = pts.reduce((a,p)=>a+p.y,0)/pts.length;
          pts.sort((a,b)=>Math.atan2(a.y-cy, a.x-cx) - Math.atan2(b.y-cy, b.x-cx));
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.clip('nonzero');
          run();
          ctx.restore();
        };
        const lips = (typeof window !== 'undefined' && window.FACEMESH_LIPS) ? window.FACEMESH_LIPS : [[61,146],[146,91],[91,181],[181,84],[84,17],[17,314],[314,405],[405,321],[321,375],[375,291],[291,308],[308,324],[324,318],[318,402],[402,317],[317,14],[14,87],[87,178],[178,88],[88,95],[95,61]];
        const leftEye = (typeof window !== 'undefined' && window.FACEMESH_LEFT_EYE) ? window.FACEMESH_LEFT_EYE : [[33,7],[7,163],[163,144],[144,145],[145,153],[153,154],[154,155],[155,133],[133,33]];
        const rightEye = (typeof window !== 'undefined' && window.FACEMESH_RIGHT_EYE) ? window.FACEMESH_RIGHT_EYE : [[263,249],[249,390],[390,373],[373,374],[374,380],[380,381],[381,382],[382,362],[362,263]];
        const leftBrow = (typeof window !== 'undefined' && window.FACEMESH_LEFT_EYEBROW) ? window.FACEMESH_LEFT_EYEBROW : [[70,63],[63,105],[105,66],[66,107],[107,55]];
        const rightBrow = (typeof window !== 'undefined' && window.FACEMESH_RIGHT_EYEBROW) ? window.FACEMESH_RIGHT_EYEBROW : [[300,293],[293,334],[334,296],[296,336],[336,285]];
        const leftEyeTop = (typeof window !== 'undefined' && window.FACEMESH_LEFT_EYE_TOP_BOUNDARY) ? window.FACEMESH_LEFT_EYE_TOP_BOUNDARY : leftEye;
        const rightEyeTop = (typeof window !== 'undefined' && window.FACEMESH_RIGHT_EYE_TOP_BOUNDARY) ? window.FACEMESH_RIGHT_EYE_TOP_BOUNDARY : rightEye;
        const leftEyeBot = (typeof window !== 'undefined' && window.FACEMESH_LEFT_EYE_BOTTOM_BOUNDARY) ? window.FACEMESH_LEFT_EYE_BOTTOM_BOUNDARY : leftEye;
        const rightEyeBot = (typeof window !== 'undefined' && window.FACEMESH_RIGHT_EYE_BOTTOM_BOUNDARY) ? window.FACEMESH_RIGHT_EYE_BOTTOM_BOUNDARY : rightEye;
        const faceOval = (typeof window !== 'undefined' && window.FACEMESH_FACE_OVAL) ? window.FACEMESH_FACE_OVAL : null;
        
        
        const apply = applyMakeupRef.current;
        const colorsBase = makeupColorsRef.current || { lips: '#ff4d88', eyes: '#4d79ff', brows: '#8b4513', cheeks: '#ff9999' };
        const intensBase = makeupIntensityRef.current || { lips: 0.35, eyes: 0.25, brows: 0.4, cheeks: 0.35 };
        const li = lm[33];
        const ri = lm[263];
        const ml = lm[61];
        const mr = lm[291];
        let colors = { ...colorsBase };
        let intens = { ...intensBase };
        if (li && ml && ri && mr) {
          const pc = procCanvasRef.current;
          const sx = pc ? (pc.width / c.width) : 1;
          const sy = pc ? (pc.height / c.height) : 1;
          const lx = li.x * c.width * sx;
          const ly = li.y * c.height * sy;
          const rx = ri.x * c.width * sx;
          const ry = ri.y * c.height * sy;
          const mxL = ml.x * c.width * sx;
          const myL = ml.y * c.height * sy;
          const mxR = mr.x * c.width * sx;
          const myR = mr.y * c.height * sy;
          const dL = Math.hypot(mxL - lx, myL - ly);
          const dR = Math.hypot(mxR - rx, myR - ry);
          const leftCheek = sampleRect((lx + mxL) / 2, (ly + myL) / 2, Math.max(10, dL * 0.35));
          const rightCheek = sampleRect((rx + mxR) / 2, (ry + myR) / 2, Math.max(10, dR * 0.35));
          const cheeksRedness = (leftCheek.redness + rightCheek.redness) / 2;
          const cheeksCoolness = (leftCheek.coolness + rightCheek.coolness) / 2;
          const overallBright = light;
          const underEyeL = sampleRect(lx, ly + Math.max(6, dL * 0.15), Math.max(6, dL * 0.20));
          const underEyeR = sampleRect(rx, ry + Math.max(6, dR * 0.15), Math.max(6, dR * 0.20));
          const underEyeDark = 1 - Math.min(1, (underEyeL.brightness + underEyeR.brightness) / 2);
          const blushAdjust = Math.max(0.7, 1 - Math.max(0, cheeksRedness - 0.12) * 0.8);
          const lipsAdjust = overallBright < 0.35 ? 1.15 : overallBright > 0.65 ? 0.9 : 1.0;
          const foundationAdjust = overallBright < 0.35 ? 1.2 : 1.0;
          const underEyeAdjust = Math.max(intensBase.underEye || 0, Math.min(0.8, underEyeDark * 0.6));
          intens = {
            ...intens,
            cheeks: Math.max(0, Math.min(1, (intensBase.cheeks || 0) * blushAdjust)),
            lips: Math.max(0, Math.min(1, (intensBase.lips || 0) * lipsAdjust)),
            foundation: Math.max(0, Math.min(1, (intensBase.foundation || 0) * foundationAdjust)),
            underEye: underEyeAdjust,
          };
          if (cheeksCoolness > 0.08) {
            colors.highlight = colorsBase.highlight || '#eaf2ff';
          } else {
            colors.highlight = colorsBase.highlight || '#fff3cc';
          }
        }
        if (apply) {
          fillRegion(lips, colors.lips, Math.max(0, Math.min(1, intens.lips || 0)));
          fillRegion(leftEye, colors.eyes, Math.max(0, Math.min(1, intens.eyes || 0)));
          fillRegion(rightEye, colors.eyes, Math.max(0, Math.min(1, intens.eyes || 0)));
          fillRegion(leftBrow, colors.brows, Math.max(0, Math.min(1, intens.brows || 0)));
          fillRegion(rightBrow, colors.brows, Math.max(0, Math.min(1, intens.brows || 0)));
          if (intens.lashes) {
            const w = 2 + (Math.max(0, Math.min(1, intens.lashes)) * 4);
            strokeRegion(leftEyeTop, colors.lashes || '#222', w, 'multiply');
            strokeRegion(rightEyeTop, colors.lashes || '#222', w, 'multiply');
          }
          if (intens.eyeliner) {
            const li2 = lm[33];
            const le2 = lm[133];
            const ri2 = lm[263];
            const re2 = lm[362];
            const leftSpan2 = (li2 && le2) ? Math.hypot(le2.x * c.width - li2.x * c.width, le2.y * c.height - li2.y * c.height) : 60;
            const rightSpan2 = (ri2 && re2) ? Math.hypot(re2.x * c.width - ri2.x * c.width, re2.y * c.height - ri2.y * c.height) : 60;
            const base2 = Math.max(0, Math.min(1, intens.eyeliner));
            const wL2 = 1 + base2 * 3 * (leftSpan2 / 60);
            const wR2 = 1 + base2 * 3 * (rightSpan2 / 60);
            strokeRegion(leftEyeTop, colors.eyeliner || '#1a1a1a', wL2, 'multiply');
            strokeRegion(rightEyeTop, colors.eyeliner || '#1a1a1a', wR2, 'multiply');
          }
          if (intens.kajal) {
            const li3 = lm[33];
            const le3 = lm[133];
            const ri3 = lm[263];
            const re3 = lm[362];
            const leftSpan3 = (li3 && le3) ? Math.hypot(le3.x * c.width - li3.x * c.width, le3.y * c.height - li3.y * c.height) : 60;
            const rightSpan3 = (ri3 && re3) ? Math.hypot(re3.x * c.width - ri3.x * c.width, re3.y * c.height - ri3.y * c.height) : 60;
            const base3 = Math.max(0, Math.min(1, intens.kajal));
            const wL3 = 1 + base3 * 3 * (leftSpan3 / 60);
            const wR3 = 1 + base3 * 3 * (rightSpan3 / 60);
            strokeRegion(leftEyeBot, colors.kajal || '#1a1a1a', wL3, 'multiply');
            strokeRegion(rightEyeBot, colors.kajal || '#1a1a1a', wR3, 'multiply');
          }
          if (intens.foundation && faceOval) {
            const alpha = Math.max(0, Math.min(1, intens.foundation));
            clipRegion(faceOval, () => {
              ctx.save();
              const soft = Math.max(0, Math.min(1, makeupSoftnessRef.current || 0));
              const blend = soft < 0.5 ? 'multiply' : 'soft-light';
              const blur = Math.round(soft * 8);
              ctx.globalCompositeOperation = blend;
              ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
              ctx.fillStyle = toRgba(colors.foundation || '#e0c0a0', alpha);
              ctx.fillRect(0, 0, c.width, c.height);
              ctx.restore();
            });
          }
          if (faceOval) {
            const soft = Math.max(0, Math.min(1, makeupSoftnessRef.current || 0));
            const blur = Math.round(soft * 6);
            const smoothAlpha = Math.max(0, Math.min(1, (intens.foundation || 0) * 0.25 + soft * 0.15));
            const sc = skinCanvasRef.current || (skinCanvasRef.current = document.createElement('canvas'));
            sc.width = c.width; sc.height = c.height;
            const sctx = sc.getContext('2d');
            sctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
            sctx.drawImage(v, 0, 0, c.width, c.height);
            clipRegion(faceOval, () => {
              ctx.save();
              ctx.globalAlpha = smoothAlpha;
              ctx.globalCompositeOperation = 'source-over';
              ctx.drawImage(sc, 0, 0);
              ctx.restore();
            });
          }
          if (intens.highlight) {
            const soft = Math.max(0, Math.min(1, makeupSoftnessRef.current || 0));
            const b2 = Math.round(soft * 8);
            const brows = [...leftBrow, ...rightBrow];
            const set2 = new Set(); for (let i = 0; i < brows.length; i++) { set2.add(brows[i][0]); set2.add(brows[i][1]); }
            const pts2 = Array.from(set2).map(idx => lm[idx]).filter(Boolean).map(p => ({ x: fx(p.x * c.width), y: p.y * c.height }));
            if (pts2.length) {
              const mx2 = pts2.reduce((a,p)=>a+p.x,0)/pts2.length;
              const my2 = pts2.reduce((a,p)=>a+p.y,0)/pts2.length;
              const r2 = Math.max(20, (Math.max(...pts2.map(p=>p.x)) - Math.min(...pts2.map(p=>p.x))) * 0.5);
              const g3 = ctx.createRadialGradient(mx2, my2 - r2 * 0.6, 0, mx2, my2 - r2 * 0.6, r2);
              g3.addColorStop(0, toRgba(colors.highlight || '#fff3cc', Math.max(0, Math.min(1, intens.highlight))));
              g3.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              ctx.filter = b2 > 0 ? `blur(${b2}px)` : 'none';
              ctx.fillStyle = g3;
              ctx.beginPath(); ctx.arc(mx2, my2 - r2 * 0.6, r2, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
            }
          }
          if (intens.underEye) {
            const alpha = Math.max(0, Math.min(1, intens.underEye));
            const doUnder = (pairs) => {
              const set = new Set(); for (let i = 0; i < pairs.length; i++) { set.add(pairs[i][0]); set.add(pairs[i][1]); }
              const pts = Array.from(set).map(idx => lm[idx]).filter(Boolean).map(p => ({ x: fx(p.x * c.width), y: p.y * c.height }));
              if (pts.length < 3) return;
              const span = Math.max(10, (Math.max(...pts.map(p=>p.x)) - Math.min(...pts.map(p=>p.x))));
              const off = span * 0.12;
              ctx.save();
              ctx.beginPath();
              for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                ctx.lineTo(p.x, p.y + off);
              }
              ctx.closePath();
              ctx.globalCompositeOperation = 'soft-light';
              const soft = Math.max(0, Math.min(1, makeupSoftnessRef.current || 0));
              const blur = Math.round(soft * 6);
              ctx.filter = blur > 0 ? `blur(${blur}px)` : 'none';
              ctx.fillStyle = toRgba(colors.underEye || '#e8d7c5', alpha);
              ctx.fill();
              ctx.restore();
            };
            doUnder(leftEyeBot);
            doUnder(rightEyeBot);
          }
          {
            const set = new Set();
            for (let i = 0; i < lips.length; i++) { set.add(lips[i][0]); set.add(lips[i][1]); }
            const pts = Array.from(set).map(idx => lm[idx]).filter(Boolean).map(p => ({ x: fx(p.x * c.width), y: p.y * c.height }));
            if (pts.length >= 3) {
              const minx = Math.min(...pts.map(p=>p.x));
              const maxx = Math.max(...pts.map(p=>p.x));
              const miny = Math.min(...pts.map(p=>p.y));
              const maxy = Math.max(...pts.map(p=>p.y));
              const hx = (minx + maxx) / 2;
              const hy = miny + (maxy - miny) * 0.35;
              const hr = Math.max(6, (maxx - minx) * 0.12);
              const g2 = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
              g2.addColorStop(0, 'rgba(255,255,255,0.25)');
              g2.addColorStop(1, 'rgba(255,255,255,0)');
              ctx.save();
              ctx.globalCompositeOperation = 'screen';
              const b2 = Math.round((makeupSoftnessRef.current||0)*6);
              ctx.filter = b2 > 0 ? `blur(${b2}px)` : 'none';
              ctx.fillStyle = g2;
              ctx.beginPath();
              ctx.arc(hx, hy, hr, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              const pL = lm[61];
              const pR = lm[291];
              if (pL && pR) {
                const lx = fx(pL.x * c.width);
                const ly = pL.y * c.height;
                const rx = fx(pR.x * c.width);
                const ry = pR.y * c.height;
                const rSmall = Math.max(4, (maxx - minx) * 0.06);
                const gL = ctx.createRadialGradient(lx, ly, 0, lx, ly, rSmall);
                gL.addColorStop(0, toRgba('#000000', 0.08));
                gL.addColorStop(1, 'rgba(0,0,0,0)');
                const gR = ctx.createRadialGradient(rx, ry, 0, rx, ry, rSmall);
                gR.addColorStop(0, toRgba('#000000', 0.08));
                gR.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.save();
                ctx.globalCompositeOperation = 'multiply';
                const bLip = Math.round((makeupSoftnessRef.current||0)*4);
                ctx.filter = bLip > 0 ? `blur(${bLip}px)` : 'none';
                ctx.fillStyle = gL; ctx.beginPath(); ctx.arc(lx, ly, rSmall, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = gR; ctx.beginPath(); ctx.arc(rx, ry, rSmall, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
              }
            }
          }
          const li = lm[33];
          const ri = lm[263];
          const ml = lm[61];
          const mr = lm[291];
          if (li && ml && ri) {
            const ex = li.x * c.width; const ey = li.y * c.height;
            const mx = ml.x * c.width; const my = ml.y * c.height;
            const rx = ri.x * c.width; const ry = ri.y * c.height;
            const eyeSpan = Math.max(1, Math.hypot(rx - ex, ry - ey));
            const dx = mx - ex; const dy = my - ey; const d = Math.hypot(dx, dy);
            let cx = (ex + mx) / 2; let cy = (ey + my) / 2 + d * 0.10;
            cx -= eyeSpan * 0.22; // push outward from face center
            cy -= d * 0.08;       // lift toward cheekbone to avoid moustache
            const r = Math.max(12, d * 0.32);
            const g = ctx.createRadialGradient(fx(cx), cy, 0, fx(cx), cy, r);
            g.addColorStop(0, toRgba(colors.cheeks, Math.max(0, Math.min(1, intens.cheeks || 0))));
            g.addColorStop(1, toRgba(colors.cheeks, 0));
            ctx.save();
            ctx.globalCompositeOperation = 'soft-light';
            const b0 = Math.round((makeupSoftnessRef.current||0)*8);
            ctx.filter = b0 > 0 ? `blur(${b0}px)` : 'none';
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx(cx), cy, r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
          if (ri && mr && li) {
            const ex = ri.x * c.width; const ey = ri.y * c.height;
            const mx = mr.x * c.width; const my = mr.y * c.height;
            const lx = li.x * c.width; const ly = li.y * c.height;
            const eyeSpan = Math.max(1, Math.hypot(ex - lx, ey - ly));
            const dx = mx - ex; const dy = my - ey; const d = Math.hypot(dx, dy);
            let cx = (ex + mx) / 2; let cy = (ey + my) / 2 + d * 0.10;
            cx += eyeSpan * 0.22; // push outward
            cy -= d * 0.08;       // lift toward cheekbone
            const r = Math.max(12, d * 0.32);
            const g = ctx.createRadialGradient(fx(cx), cy, 0, fx(cx), cy, r);
            g.addColorStop(0, toRgba(colors.cheeks, Math.max(0, Math.min(1, intens.cheeks || 0))));
            g.addColorStop(1, toRgba(colors.cheeks, 0));
            ctx.save();
            ctx.globalCompositeOperation = 'soft-light';
            const b1 = Math.round((makeupSoftnessRef.current||0)*8);
            ctx.filter = b1 > 0 ? `blur(${b1}px)` : 'none';
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx(cx), cy, r, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        }
      }

      if (o) {
        const ok = !!(o.naturalWidth && o.naturalHeight);
        if (ok && mode === 'face' && lm && lm.length > 0) {
          const li = lm[33];
          const ri = lm[263];
          const lx = li.x * c.width;
          const ly = li.y * c.height;
          const rx = ri.x * c.width;
          const ry = ri.y * c.height;
          const mx = (lx + rx) / 2;
          const my = (ly + ry) / 2;
          const flx = fx(lx);
          const frx = fx(rx);
          const fmx = fx(mx);
          const d = Math.hypot(frx - flx, ry - ly);
          const nw = o.naturalWidth || 1;
          const nh = o.naturalHeight || 1;
          const ratio = nw / nh;
          let ow = d * 2.1;
          let oh = Math.max(1, ow / ratio);
          const ang = Math.atan2(ry - ly, frx - flx);
          ctx.save();
          ctx.translate(fmx, my);
          ctx.rotate(ang);
          if (compensateMirror) ctx.scale(-1, 1);
          ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
          ctx.restore();
        } else if (ok && mode === 'glasses' && lm && lm.length > 0) {
          const li = lm[33];
          const ri = lm[263];
          if (li && ri) {
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const nw = o.naturalWidth || 1;
            const nh = o.naturalHeight || 1;
            const ratio = nw / nh;
            let ow = Math.max(40, d * 2.0);
            let oh = Math.max(1, ow / ratio);
            const ang = Math.atan2(ry - ly, frx - flx);
            ctx.save();
            const my = (ly + ry) / 2;
            ctx.translate(fmx, my);
            ctx.rotate(ang);
            if (compensateMirror) ctx.scale(-1, 1);
            ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
            ctx.restore();
          }
        } else if (ok && mode === 'hand' && hlm && hlm.length > 0) {
          const wrist = hlm[0];
          const idx = hlm[5];
          const pky = hlm[17];
          const pts = [wrist, idx, pky].filter(Boolean);
          const mx = pts.reduce((a,p)=>a+p.x,0)/pts.length * c.width;
          const my = pts.reduce((a,p)=>a+p.y,0)/pts.length * c.height;
          const ix = idx.x * c.width;
          const iy = idx.y * c.height;
          const kx = pky.x * c.width;
          const ky = pky.y * c.height;
          const fmx = fx(mx);
          const fix = fx(ix);
          const fkx = fx(kx);
          const d = Math.hypot(fkx - fix, ky - iy);
          const nw = o.naturalWidth || 1;
          const nh = o.naturalHeight || 1;
          const ratio = nw / nh;
          let ow = Math.max(20, d * 2.0);
          let oh = Math.max(1, ow / ratio);
          const ang = Math.atan2(ky - iy, fkx - fix);
          ctx.save();
          ctx.translate(fmx, my);
          ctx.rotate(ang);
          if (compensateMirror) ctx.scale(-1, 1);
          ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
          ctx.restore();
        } else if (ok && mode === 'wrist' && hlm && hlm.length > 0) {
          const wrist = hlm[0];
          const idx = hlm[5];
          const pky = hlm[17];
          if (wrist && idx && pky) {
            const wx = wrist.x * c.width;
            const wy = wrist.y * c.height;
            const ix = idx.x * c.width;
            const iy = idx.y * c.height;
            const kx = pky.x * c.width;
            const ky = pky.y * c.height;
            const fwx = fx(wx);
            const fix = fx(ix);
            const fkx = fx(kx);
            const d = Math.max(20, Math.hypot(fkx - fix, ky - iy));
            const r = Math.max(10, Math.round(d * 0.25));
            const wyWatch = wy + r * 1.4;
            const nw = o.naturalWidth || 1;
            const nh = o.naturalHeight || 1;
            const ratio = nw / nh;
            let ow = Math.max(20, d * 1.8);
            let oh = Math.max(1, ow / ratio);
            const ang = Math.atan2(ky - iy, fkx - fix);
            ctx.save();
            ctx.translate(fwx, wyWatch);
            ctx.rotate(ang);
            if (compensateMirror) ctx.scale(-1, 1);
            ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
            ctx.restore();
          }
        } else if (ok && mode === 'hat' && lm && lm.length > 0) {
          const li = lm[33];
          const ri = lm[263];
          if (li && ri) {
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const nw = o.naturalWidth || 1;
            const nh = o.naturalHeight || 1;
            const ratio = nw / nh;
            let ow = Math.max(40, d * 2.6);
            let oh = Math.max(1, ow / ratio);
            const ang = Math.atan2(ry - ly, frx - flx);
            const my = (ly + ry) / 2;
            const yOff = my - d * 0.65;
            ctx.save();
            ctx.translate(fmx, yOff);
            ctx.rotate(ang);
            ctx.scale(-1, 1);
            ctx.drawImage(o, -ow / 2, -oh * 0.6, ow, oh);
            ctx.restore();
          }
        } else if (mode === 'hair' && lm && lm.length > 0) {
          const li = lm[33];
          const ri = lm[263];
          if (li && ri) {
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const my = (ly + ry) / 2;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const nw = o.naturalWidth || 1;
            const nh = o.naturalHeight || 1;
            const ratio = nw / nh;
            let ow = Math.max(60, d * 3.2);
            let oh = Math.max(1, ow / ratio);
            const ang = Math.atan2(ry - ly, frx - flx);
            const yOff = my - d * 0.45;
            ctx.save();
            ctx.translate(fmx, yOff);
            ctx.rotate(ang);
            ctx.drawImage(o, -ow / 2, -oh * 0.6, ow, oh);
            // hairline dots
            ctx.rotate(-ang);
            ctx.fillStyle = '#ffffff';
            const nDots = 7;
            for (let i = 0; i < nDots; i++) {
              const t = i / (nDots - 1);
              const x = flx * (1 - t) + frx * t;
              const y = yOff - d * 0.05;
              ctx.beginPath();
              ctx.arc(x - fmx, y - yOff, Math.max(2, d * 0.04), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        } else if ((mode === 'feet' || mode === 'body') && plm && plm.length > 0) {
          const nw = o.naturalWidth || 1;
          const nh = o.naturalHeight || 1;
          const ratio = nw / nh;
          if (mode === 'feet') {
            const l_ank = plm[27];
            const r_ank = plm[28];
            const l_heel = plm[29];
            const r_heel = plm[30];
            const l_toe = plm[31];
            const r_toe = plm[32];
            const useLeft = !!(l_ank && l_toe);
            const ax = (useLeft ? l_ank.x : r_ank.x) * c.width;
            const ay = (useLeft ? l_ank.y : r_ank.y) * c.height;
            const tx = (useLeft ? l_toe.x : r_toe.x) * c.width;
            const ty = (useLeft ? l_toe.y : r_toe.y) * c.height;
            const hx = (useLeft ? l_heel?.x : r_heel?.x) * c.width || ax;
            const hy = (useLeft ? l_heel?.y : r_heel?.y) * c.height || ay;
            const mx = fx((ax + tx) / 2);
            const my = (ay + ty) / 2;
            const footLen = Math.max(1, Math.hypot(fx(tx) - fx(hx), ty - hy));
            let ow = Math.max(30, footLen * 2.2);
            let oh = Math.max(1, ow / ratio);
            const ang = Math.atan2(ty - hy, fx(tx) - fx(hx));
            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(ang);
            if (compensateMirror) ctx.scale(-1, 1);
            ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
            ctx.restore();
          } else {
            const ls = plm[11];
            const rs = plm[12];
            const lx = ls.x * c.width;
            const ly = ls.y * c.height;
            const rx = rs.x * c.width;
            const ry = rs.y * c.height;
            const mx = fx((lx + rx) / 2);
            const my = (ly + ry) / 2;
            const d = Math.hypot(fx(rx) - fx(lx), ry - ly);
            let ow = Math.max(40, d * 2.4);
            let oh = Math.max(1, ow / ratio);
            const ang = Math.atan2(ry - ly, fx(rx) - fx(lx));
            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(ang);
            if (compensateMirror) ctx.scale(-1, 1);
            ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
            ctx.restore();
          }
        } else if (ok) {
          const nw = o.naturalWidth || 1;
          const nh = o.naturalHeight || 1;
          const ratio = nw / nh;
          let baseW = Math.min(c.width, c.height) * 0.35;
          if (box) {
            if (mode === 'face') baseW = box.w * 1.15;
            else if (mode === 'hand') baseW = Math.max(box.w, box.h) * 1.2;
            else if (mode === 'wrist') baseW = Math.max(box.w, box.h) * 1.15;
            else if (mode === 'feet') baseW = box.w * 1.25;
            else if (mode === 'body') baseW = box.w * 1.1;
          }
          let ow = baseW;
          let oh = Math.max(1, ow / ratio);
          let ox = c.width * 0.5 - ow * 0.5;
          let oy = c.height * 0.5 - oh * 0.5;
          if (center) {
            ox = fx(center.x) - ow * 0.5;
            oy = center.y - oh * 0.5;
            if (mode === 'face') oy -= oh * 0.1;
            if (mode === 'hand') ox += ow * 0.2;
            if (mode === 'wrist') oy += oh * 0.1;
            if (mode === 'feet') oy += oh * 0.3;
            if (mode === 'body') oy -= oh * 0.05;
          } else {
            if (mode === 'face') oy = c.height * 0.18;
            else if (mode === 'hand') { ox = c.width * 0.68; oy = c.height * 0.55; }
            else if (mode === 'wrist') { ox = c.width * 0.70; oy = c.height * 0.60; }
            else if (mode === 'feet') oy = c.height * 0.75;
            else if (mode === 'body') oy = c.height * 0.25;
          }
          ctx.drawImage(o, ox, oy, ow, oh);
        }
        if (!o && mode === 'hair' && lm && lm.length > 0) {
          const li = lm[33];
          const ri = lm[263];
          if (li && ri) {
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const my = (ly + ry) / 2;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const ang = Math.atan2(ry - ly, frx - flx);
            const yOff = my - d * 0.45;
            let ow = Math.max(50, d * 3.0);
            let oh = Math.max(20, d * 1.2);
            ctx.save();
            ctx.translate(fmx, yOff);
            ctx.rotate(ang);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, ow / 2, oh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // hairline dots along the top edge
            const nDots = 7;
            for (let i = 0; i < nDots; i++) {
              const t = i / (nDots - 1);
              const x = -ow / 2 + t * ow;
              const y = -oh * 0.4;
              ctx.beginPath();
              ctx.arc(x, y, Math.max(2, d * 0.04), 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
        if (!o && mode === 'glasses' && lm && lm.length > 0) {
          const li = lm[33];
          const ri = lm[263];
          if (li && ri) {
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const ang = Math.atan2(ry - ly, frx - flx);
            let ow = Math.max(20, d * 1.6);
            let oh = Math.max(8, d * 0.35);
            ctx.save();
            const my = (ly + ry) / 2;
            ctx.translate(fmx, my);
            ctx.rotate(ang);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, ow / 2, oh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
        if (!ok && mode === 'hat' && lm && lm.length > 0) {
          const li = lm[33];
          const ri = lm[263];
          if (li && ri) {
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const my = (ly + ry) / 2;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const ang = Math.atan2(ry - ly, frx - flx);
            const yOff = my - d * 0.65;
            let ow = Math.max(30, d * 2.2);
            let oh = Math.max(12, d * 0.55);
            ctx.save();
            ctx.translate(fmx, yOff);
            ctx.rotate(ang);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, ow / 2, oh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
        if (mode === 'jewelry') {
          const flm = landmarksRef.current;
          const plm = poseLmRef.current;
          const li = flm && flm[33];
          const ri = flm && flm[263];
          const leFace = flm && flm[127];
          const reFace = flm && flm[356];
          const chin = flm && flm[152];
          const lEarPose = plm && plm[7];
          const rEarPose = plm && plm[8];
          const lShoulder = plm && plm[11];
          const rShoulder = plm && plm[12];
          let d = 40;
          let ang = 0;
          let fmx = c.width * 0.5;
          if (li && ri) {
            const lx = li.x * c.width;
            const ly = li.y * c.height;
            const rx = ri.x * c.width;
            const ry = ri.y * c.height;
            const mx = (lx + rx) / 2;
            const flx = fx(lx);
            const frx = fx(rx);
            fmx = fx(mx);
            d = Math.hypot(frx - flx, ry - ly);
            ang = Math.atan2(ry - ly, frx - flx);
          } else if (lShoulder && rShoulder) {
            const lx = lShoulder.x * c.width;
            const ly = lShoulder.y * c.height;
            const rx = rShoulder.x * c.width;
            const ry = rShoulder.y * c.height;
            const mx = (lx + rx) / 2;
            fmx = fx(mx);
            d = Math.hypot(fx(rx) - fx(lx), ry - ly);
            ang = Math.atan2(ry - ly, fx(rx) - fx(lx));
          }
          const drawEarring = (pt) => {
            if (!pt) return;
            const ex = fx(pt.x * c.width);
            const ey = pt.y * c.height + d * 0.15;
            const r = Math.max(6, d * 0.18);
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex, ey + r * 1.2);
            ctx.stroke();
            ctx.restore();
          };
          drawEarring(lEarPose || leFace);
          drawEarring(rEarPose || reFace);
          const drawNeck = () => {
            let cx = fmx;
            let cy;
            if (chin) {
              cy = chin.y * c.height + d * 0.25;
            } else if (lShoulder && rShoulder) {
              const sy = (lShoulder.y + rShoulder.y) / 2 * c.height;
              cy = sy + d * 0.15;
            } else {
              cy = c.height * 0.6;
            }
            let ow = Math.max(40, d * 2.0);
            let oh = Math.max(12, d * 0.6);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(ang);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, ow / 2, oh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-ow * 0.15, 0);
            ctx.lineTo(ow * 0.15, 0);
            ctx.stroke();
            ctx.beginPath();
            const rd = Math.max(4, d * 0.08);
            ctx.arc(0, 0, rd, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          };
          drawNeck();
        }
        if (showTracking) {
          const ax = anchorRef.current.x;
          const ay = anchorRef.current.y;
          if (ax && ay) {
            ctx.strokeStyle = '#00ccff';
            ctx.beginPath();
            ctx.arc(ax, ay, 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      if (showTracking) {
        const ax = anchorRef.current.x;
        const ay = anchorRef.current.y;
        if (ax && ay) {
          ctx.strokeStyle = '#00ccff';
          ctx.beginPath();
          ctx.arc(ax, ay, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
        const hlm = handLmRef.current;
        if ((mode === 'hand' || mode === 'wrist') && hlm && hlm.length > 0) {
          ctx.fillStyle = '#ff00aa';
          const fx = (x) => c.width - x;
          for (let i = 0; i < hlm.length; i++) {
            const p = hlm[i];
            ctx.beginPath();
            ctx.arc(fx(p.x * c.width), p.y * c.height, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (mode === 'hat' && lm && lm.length > 0) {
          ctx.fillStyle = '#ffffff';
          const ids = [10, 33, 263, 127, 356];
          for (let i = 0; i < ids.length; i++) {
            const p = lm[ids[i]];
            if (!p) continue;
            ctx.beginPath();
            ctx.arc(fx(p.x * c.width), p.y * c.height, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        const flm = landmarksRef.current;
        if (mode === 'face' && flm && flm.length > 0) {
          const fx = (x) => c.width - x;
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < flm.length; i++) {
            const p = flm[i];
            ctx.beginPath();
            ctx.arc(fx(p.x * c.width), p.y * c.height, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          const tess = typeof window !== 'undefined' && window.FACEMESH_TESSELATION ? window.FACEMESH_TESSELATION : null;
          if (tess) {
            ctx.strokeStyle = '#dddddd';
            ctx.lineWidth = 1;
            for (let i = 0; i < tess.length; i++) {
              const a = flm[tess[i][0]];
              const b = flm[tess[i][1]];
              if (!a || !b) continue;
              ctx.beginPath();
              ctx.moveTo(fx(a.x * c.width), a.y * c.height);
              ctx.lineTo(fx(b.x * c.width), b.y * c.height);
              ctx.stroke();
            }
          }
        }
      }
      if (showTracking) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        if (box) {
          const bx = c.width - (box.x + box.w);
          ctx.strokeRect(bx, box.y, box.w, box.h);
        }
        if (trackCenter) {
          ctx.beginPath();
          ctx.arc(c.width - trackCenter.x, trackCenter.y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const t of tracksRef.current) {
          ctx.strokeStyle = t.color;
          const tx = c.width - (t.x + t.w);
          ctx.strokeRect(tx, t.y, t.w, t.h);
          ctx.fillStyle = t.color;
          ctx.fillRect(tx, Math.max(0, t.y - 18), 38, 18);
          ctx.fillStyle = '#fff';
          ctx.font = '12px sans-serif';
          ctx.fillText(String(t.id), tx + 4, Math.max(12, t.y - 6));
        }
      }
      if (typeof ts === 'number') {
        const dt = ts - (lastTsRef.current || ts);
        if (dt > 0) setFps(Math.round(1000 / dt));
        lastTsRef.current = ts;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [mode, trackCenter, showTracking, compensateMirror]);

  const stopCamera = () => {
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = useCallback(async () => {
    try {
      setErr('');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErr('Camera not supported in this browser');
        return;
      }
      const host = String(location.hostname || '');
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
      if (location.protocol !== 'https:' && !isLocal) {
        setErr('Camera requires HTTPS or localhost');
        return;
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (typeof window !== 'undefined' && 'FaceDetector' in window) {
        try { faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }); } catch { void 0; }
      }
      try {
        if (!window.FaceMesh) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
            s.onload = () => res();
            s.onerror = () => rej(new Error('face_mesh'));
            document.head.appendChild(s);
          });
        }
        if (window.FaceMesh && !faceMeshRef.current) {
          faceMeshRef.current = new window.FaceMesh({ locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + f });
          faceMeshRef.current.setOptions({ maxNumFaces: 1, refineLandmarks: true, selfieMode: true });
          faceMeshRef.current.onResults((r) => { landmarksRef.current = (r.multiFaceLandmarks && r.multiFaceLandmarks[0]) || null; });
        }
        if (!window.Hands) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
            s.onload = () => res();
            s.onerror = () => rej(new Error('hands'));
            document.head.appendChild(s);
          });
        }
        if (window.Hands && !handsRef.current) {
          handsRef.current = new window.Hands({ locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + f });
          handsRef.current.setOptions({ maxNumHands: 1, modelComplexity: 1, selfieMode: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
          handsRef.current.onResults((r) => { const lm = (r.multiHandLandmarks && r.multiHandLandmarks[0]) || null; handLmRef.current = lm; if (lm) { prevHandLmRef.current = lm; lastHandTsRef.current = performance.now(); } });
        }
        if (!window.Pose) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
            s.onload = () => res();
            s.onerror = () => rej(new Error('pose'));
            document.head.appendChild(s);
          });
        }
        if (window.Pose && !poseRef.current) {
          poseRef.current = new window.Pose({ locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + f });
          poseRef.current.setOptions({ modelComplexity: 1, selfieMode: true, smoothLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
          poseRef.current.onResults((r) => { const lm = (r.poseLandmarks) || null; poseLmRef.current = lm; if (lm) { prevPoseLmRef.current = lm; lastPoseTsRef.current = performance.now(); } });
        }
      } catch { void 0; }
      if (modelGlbUrl) {
        try {
          const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); });
          if (!window.THREE) {
            await loadScript('https://cdn.jsdelivr.net/npm/three@0.125.2/build/three.min.js');
          }
          if (!window.THREE.GLTFLoader) {
            await loadScript('https://cdn.jsdelivr.net/npm/three@0.125.2/examples/js/loaders/GLTFLoader.js');
          }
          if (!window.THREE.DRACOLoader) {
            await loadScript('https://cdn.jsdelivr.net/npm/three@0.125.2/examples/js/loaders/DRACOLoader.js');
          }
          if (!window.THREE.KTX2Loader) {
            await loadScript('https://cdn.jsdelivr.net/npm/three@0.125.2/examples/js/loaders/KTX2Loader.js');
          }
          if (!(window.THREE && window.THREE.GLTFLoader)) { throw new Error('GLTFLoaderUnavailable'); }
          const w = videoRef.current.videoWidth || 640;
          const h = videoRef.current.videoHeight || 480;
          const scene = new window.THREE.Scene();
          const camera = new window.THREE.OrthographicCamera(0, w, h, 0, -1000, 1000);
          camera.position.set(0, 0, 10);
          const renderer = new window.THREE.WebGLRenderer({ canvas: webglCanvasRef.current, alpha: true, antialias: true });
          renderer.setPixelRatio(Math.max(1, window.devicePixelRatio || 1));
          renderer.setSize(w, h);
          renderer.setClearColor(0x000000, 0);
          try {
            renderer.outputEncoding = window.THREE && window.THREE.sRGBEncoding ? window.THREE.sRGBEncoding : renderer.outputEncoding;
            renderer.toneMapping = window.THREE && window.THREE.ACESFilmicToneMapping ? window.THREE.ACESFilmicToneMapping : renderer.toneMapping;
            renderer.toneMappingExposure = 1.0;
            renderer.physicallyCorrectLights = true;
          } catch { /* ignore */ }
          const light = new window.THREE.DirectionalLight(0xffffff, 1);
          light.position.set(0, 0, 10);
          scene.add(light);
          const amb = new window.THREE.AmbientLight(0xffffff, 0.7);
          scene.add(amb);
          threeRef.current = { scene, camera, renderer, model: null };
          threeLoadedRef.current = true;
          const loader = new window.THREE.GLTFLoader();
          try {
            if (window.THREE && window.THREE.DRACOLoader) {
              const dracoLoader = new window.THREE.DRACOLoader();
              const decPath = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DRACO_DECODER_PATH) || 'https://cdn.jsdelivr.net/npm/three@0.125.2/examples/js/libs/draco/';
              dracoLoader.setDecoderPath(decPath);
              loader.setDRACOLoader(dracoLoader);
            }
            if (window.THREE && window.THREE.KTX2Loader) {
              const ktx2Loader = new window.THREE.KTX2Loader();
              const basisPath = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_KTX2_TRANSCODER_PATH) || 'https://cdn.jsdelivr.net/npm/three@0.125.2/examples/js/libs/basis/';
              ktx2Loader.setTranscoderPath(basisPath);
              try { ktx2Loader.detectSupport(threeRef.current?.renderer || null); } catch { /* ignore */ }
              loader.setKTX2Loader(ktx2Loader);
            }
          } catch { /* ignore */ }
          const getFallbackUrl = () => {
            const envFallback = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FALLBACK_GLB) || '';
            if (envFallback) return envFallback;
            return 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/master/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb';
          };
          const src = resolveAssetUrl(modelGlbUrl) || getFallbackUrl();
          const tryLoad = (url) => {
            loader.load(url, (g) => {
              const m = g.scene || (g.scenes && g.scenes[0]) || null;
              if (m) {
                m.rotation.set(0, 0, 0);
                m.scale.set(1, 1, 1);
                m.traverse((obj) => {
                  if (obj.isMesh && obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    for (const mat of mats) {
                      if (window.THREE && window.THREE.DoubleSide) mat.side = window.THREE.DoubleSide;
                      mat.transparent = false;
                      mat.depthWrite = true;
                      mat.depthTest = true;
                    }
                  }
                });
                try {
                  const box = new window.THREE.Box3().setFromObject(m);
                  const size = new window.THREE.Vector3();
                  box.getSize(size);
                  const target = Math.max(120, Math.min(w, h) * 0.25);
                  const base = Math.max(1e-6, Math.max(size.x, size.y));
                  const k = target / base;
                  m.scale.set(k, k, k);
                  threeRef.current.modelBaseSize = base;
                  const center = new window.THREE.Vector3();
                  box.getCenter(center);
                  m.position.sub(center);
                } catch { /* ignore */ }
                const pivot = new window.THREE.Object3D();
                pivot.position.set(w / 2, h / 2, 0);
                pivot.add(m);
                threeRef.current.scene.add(pivot);
                threeRef.current.model = pivot;
                threeRef.current.modelChild = m;
                modelLoadedRef.current = true;
              }
            }, undefined, () => {
              if (!fallbackAttemptedRef.current) {
                fallbackAttemptedRef.current = true;
                const fb = getFallbackUrl();
                tryLoad(fb);
              } else {
                setErr('Failed to load 3D model');
              }
            });
          };
          tryLoad(src);
        } catch (err2) { if (String(err2 && err2.message).includes('GLTFLoaderUnavailable')) setErr('3D support not available'); }
      }
      setRunning(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const name = e?.name || '';
      const msg = name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Camera access denied. Allow camera in site permissions.'
        : name === 'NotFoundError'
          ? 'No camera found. Connect a camera device.'
          : name === 'OverconstrainedError'
            ? 'Camera constraints not met. Try default camera.'
            : name === 'NotReadableError'
              ? 'Camera busy or not readable. Close other apps and retry.'
              : (e?.message || 'Camera error');
      setErr(msg);
      setRunning(false);
    }
  }, [loop, modelGlbUrl]);

  useEffect(() => {
    const id = setTimeout(() => { startCamera(); }, 0);
    return () => {
      clearTimeout(id);
      stopCamera();
    };
  }, [mode, startCamera]);

  useEffect(() => {
    anchorRef.current = { x: 0, y: 0, s: 1, r: 0 };
  }, [mode]);

  if (inline) {
    return (
      <div className="position-relative" style={{ width: `${width}px`, height: `${height}px` }}>
        {err ? (
          <div className="alert alert-warning m-2">
            <div>{err}</div>
            <button className="btn btn-sm mt-2" style={{ backgroundColor: '#c4a62c', color: '#fff' }} onClick={startCamera}>Retry</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover" style={{ transform: 'scaleX(-1)' }}></video>
            <canvas id="tryon-canvas" ref={canvasRef} className="position-absolute top-0 start-0 w-100 h-100" style={{ transform: 'scaleX(-1)' }}></canvas>
            <canvas ref={webglCanvasRef} className="position-absolute top-0 start-0 w-100 h-100" style={{ transform: 'scaleX(-1)' }}></canvas>
            {overlaySrc ? (
              <img ref={overlayRef} src={overlaySrc} alt="overlay" style={{ display: 'none' }} />
            ) : null}
            <div className="position-absolute top-0 end-0 m-2 d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark">FPS {fps}</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowTracking(v => !v)}>{showTracking ? 'Hide Tracking' : 'Show Tracking'}</button>
            </div>
          </>
        )}
        {!running && !err && (
          <div className="text-center text-muted py-3">Starting camera…</div>
        )}
      </div>
    );
  }
  return (
    <div className="position-fixed top-0 start-0 w-100 h-100" style={{ background: '#0008', zIndex: 1060 }} onClick={onClose}>
      <div className="position-absolute top-50 start-50 translate-middle bg-white rounded shadow" style={{ width: '92%', maxWidth: '1000px' }} onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '24px' }} />
            <h6 className="mb-0">Live Try-On</h6>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-light text-dark">FPS {fps}</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowTracking(v => !v)}>{showTracking ? 'Hide Tracking' : 'Show Tracking'}</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="p-3">
          {err ? (
            <div className="alert alert-warning">
              <div>{err}</div>
              <ul className="small mt-2 mb-3">
                <li>Use a browser that supports camera access.</li>
                <li>Ensure the site is served over HTTPS or on localhost.</li>
                <li>Open browser site settings and allow camera permission.</li>
              </ul>
              <button className="btn btn-sm" style={{ backgroundColor: '#c4a62c', color: '#fff' }} onClick={startCamera}>Retry</button>
            </div>
          ) : (
            <div className="position-relative" style={{ width: '100%', height: '600px' }}>
              <video ref={videoRef} playsInline muted className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover" style={{ transform: 'scaleX(-1)' }}></video>
              <canvas id="tryon-canvas" ref={canvasRef} className="position-absolute top-0 start-0 w-100 h-100" style={{ transform: 'scaleX(-1)' }}></canvas>
              <canvas ref={webglCanvasRef} className="position-absolute top-0 start-0 w-100 h-100" style={{ transform: 'scaleX(-1)' }}></canvas>
              {overlaySrc ? (
                <img ref={overlayRef} src={overlaySrc} alt="overlay" style={{ display: 'none' }} />
              ) : null}
            </div>
          )}
          {!running && !err && (
            <div className="text-center text-muted py-3">Starting camera…</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TryOnBase;
