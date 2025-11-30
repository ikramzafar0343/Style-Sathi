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

const TryOnBase = ({ overlaySrc, modelGlbUrl, mode, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const webglCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);
  const [showTracking, setShowTracking] = useState(true);
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
  const anchorRef = useRef({ x: 0, y: 0, s: 1, r: 0 });

  

  

  const iou = (a, b) => {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = a.w * a.h + b.w * b.h - inter;
    return union > 0 ? inter / union : 0;
  };

  const loop = useCallback(async function tick(ts) {
    const v = videoRef.current;
    const c = canvasRef.current;
    const wc = webglCanvasRef.current;
    const o = overlayRef.current;
    if (v && c) {
      if (faceMeshRef.current && mode === 'face') { try { await faceMeshRef.current.send({ image: v }); } catch { void 0; } }
      if (handsRef.current && mode === 'hand') { try { await handsRef.current.send({ image: v }); } catch { void 0; } }
      if (poseRef.current && (mode === 'feet' || mode === 'body')) { try { await poseRef.current.send({ image: v }); } catch { void 0; } }
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
      const pctx = pc.getContext('2d');
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
            const my = (ly + ry) / 2;
            const fx = (x) => c.width - x;
            const flx = fx(lx);
            const frx = fx(rx);
            const fmx = fx(mx);
            const d = Math.hypot(frx - flx, ry - ly);
            const s = Math.max(0.001, d * 0.02);
            const a = 0.35;
            const px = anchorRef.current.x * (1 - a) + fmx * a;
            const py = anchorRef.current.y * (1 - a) + my * a;
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
            const s = Math.max(0.001, box.w * 0.02);
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
      
      if (o) {
        const lm = landmarksRef.current;
        const hlm = handLmRef.current;
        const plm = poseLmRef.current;
        const fx = (x) => c.width - x;
        if (mode === 'face' && lm && lm.length > 0) {
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
          ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
          ctx.restore();
        } else if (mode === 'hand' && hlm && hlm.length > 0) {
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
          ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
          ctx.restore();
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
            ctx.drawImage(o, -ow / 2, -oh * 0.55, ow, oh);
            ctx.restore();
          }
        } else {
          const nw = o.naturalWidth || 1;
          const nh = o.naturalHeight || 1;
          const ratio = nw / nh;
          let baseW = Math.min(c.width, c.height) * 0.35;
          if (box) {
            if (mode === 'face') baseW = box.w * 1.15;
            else if (mode === 'hand') baseW = Math.max(box.w, box.h) * 1.2;
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
            if (mode === 'feet') oy += oh * 0.3;
            if (mode === 'body') oy -= oh * 0.05;
          } else {
            if (mode === 'face') oy = c.height * 0.18;
            else if (mode === 'hand') { ox = c.width * 0.68; oy = c.height * 0.55; }
            else if (mode === 'feet') oy = c.height * 0.75;
            else if (mode === 'body') oy = c.height * 0.25;
          }
          ctx.drawImage(o, ox, oy, ow, oh);
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
        if (mode === 'hand' && hlm && hlm.length > 0) {
          ctx.fillStyle = '#ff00aa';
          const fx = (x) => c.width - x;
          for (let i = 0; i < hlm.length; i++) {
            const p = hlm[i];
            ctx.beginPath();
            ctx.arc(fx(p.x * c.width), p.y * c.height, 3, 0, Math.PI * 2);
            ctx.fill();
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
  }, [mode, trackCenter, showTracking]);

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
            try { await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js'); } catch { /* fallback below */ }
          }
          if (!window.THREE || !window.THREE.GLTFLoader) {
            try { await loadScript('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/GLTFLoader.js'); } catch { /* fallback below */ }
          }
          if (!window.THREE || !window.THREE.GLTFLoader) {
            try {
              await loadScript('https://cdn.jsdelivr.net/npm/three@0.125.2/build/three.min.js');
              await loadScript('https://cdn.jsdelivr.net/npm/three@0.125.2/examples/js/loaders/GLTFLoader.js');
            } catch { /* ignore */ }
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
          const light = new window.THREE.DirectionalLight(0xffffff, 1);
          light.position.set(0, 0, 10);
          scene.add(light);
          const amb = new window.THREE.AmbientLight(0xffffff, 0.7);
          scene.add(amb);
          threeRef.current = { scene, camera, renderer, model: null };
          threeLoadedRef.current = true;
          const getApiOrigin = () => {
            const host = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_HOST)
              || (typeof window !== 'undefined' && window.location && window.location.hostname)
              || 'localhost';
            const normalizedHost = (!host || host === '0.0.0.0' || host === '::') ? 'localhost' : host;
            const port = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PORT) || '8000';
            const protocol = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PROTOCOL) || 'http';
            return `${protocol}://${normalizedHost}:${port}`;
          };
          const resolveAssetUrl = (u) => {
            if (!u) return '';
            if (u.startsWith('http://') || u.startsWith('https://')) return u;
            const origin = getApiOrigin();
            return `${origin}${u.startsWith('/') ? '' : '/'}${u}`;
          };
          const loader = new window.THREE.GLTFLoader();
          const src = resolveAssetUrl(modelGlbUrl);
          loader.load(src, (g) => {
            const m = g.scene || (g.scenes && g.scenes[0]) || null;
            if (m) {
              m.position.set(w / 2, h / 2, 0);
              m.rotation.set(0, 0, 0);
              m.scale.set(1, 1, 1);
              m.traverse((obj) => {
                if (obj.isMesh && obj.material) {
                  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                  for (const mat of mats) { if (window.THREE && window.THREE.DoubleSide) mat.side = window.THREE.DoubleSide; }
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
              } catch { /* ignore */ }
              threeRef.current.scene.add(m);
              threeRef.current.model = m;
              modelLoadedRef.current = true;
            }
          }, undefined, () => { setErr('Failed to load 3D model'); });
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
              <canvas ref={canvasRef} className="position-absolute top-0 start-0 w-100 h-100" style={{ transform: 'scaleX(-1)' }}></canvas>
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
