import { useEffect, useRef, useState, useCallback } from 'react';
// using native getUserMedia video element to avoid external deps in production
import { FaceMesh, FACEMESH_LIPS, FACEMESH_LEFT_EYE, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYEBROW, FACEMESH_RIGHT_EYEBROW, FACEMESH_FACE_OVAL } from '@mediapipe/face_mesh';
import { Hands } from '@mediapipe/hands';
import { Pose } from '@mediapipe/pose';
import { aiApi } from '../services/api';
import { FaTint, FaMagic, FaUpload, FaPlay, FaStop } from 'react-icons/fa';

const TryOnStudio = ({ token, onBack }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [lipColor, setLipColor] = useState('#c4a62c');
  const [intensity, setIntensity] = useState(0.5);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mode, setMode] = useState('makeup');
  const faceLmRef = useRef(null);
  const processingRef = useRef(false);
  const handLmRef = useRef(null);
  const poseLmRef = useRef(null);

  const mainColor = '#c4a62c';
  const secondaryColor = '#2c67c4';
  const mirrored = true;

  const toPx = (pt, w, h) => ({ x: (pt.x || 0) * w, y: (pt.y || 0) * h });
  const buildPoly = (edges, lm, w, h) => {
    const pts = new Map();
    for (const [a, b] of edges) {
      const pa = lm[a]; const pb = lm[b];
      if (pa) { const p = toPx(pa, w, h); pts.set(a, p); }
      if (pb) { const p = toPx(pb, w, h); pts.set(b, p); }
    }
    const arr = Array.from(pts.values());
    if (arr.length < 3) return null;
    const cx = arr.reduce((s, p) => s + p.x, 0) / arr.length;
    const cy = arr.reduce((s, p) => s + p.y, 0) / arr.length;
    arr.sort((p1, p2) => Math.atan2(p1.y - cy, p1.x - cx) - Math.atan2(p2.y - cy, p2.x - cx));
    return arr;
  };
  const drawPoly = (ctx, poly, fill, stroke, width = 1, alpha = 1) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = 'blur(0.5px)';
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    ctx.restore();
  };
  const clampRect = (x, y, w0, h0, W, H) => ({
    x: Math.max(0, Math.min(W, x)),
    y: Math.max(0, Math.min(H, y)),
    w: Math.max(0, Math.min(W - x, w0)),
    h: Math.max(0, Math.min(H - y, h0)),
  });
  const polyBounds = (poly) => {
    const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  };
  const drawOverlay = useCallback((ctx, w, h) => {
    const alpha = Math.min(1, Math.max(0, intensity));
    ctx.save();
    ctx.globalAlpha = alpha;
    const lm = faceLmRef.current;
    if (lm && lm.length > 300) {
      const L = (i) => toPx(lm[i] || { x: 0.5, y: 0.5 }, w, h);
      const leftEye = L(33), rightEye = L(263);
      const facePoly = buildPoly(FACEMESH_FACE_OVAL, lm, w, h);
      if (facePoly) drawPoly(ctx, facePoly, null, '#00000022', 2, 0.6);
      if (mode === 'makeup') {
        const lipsPoly = buildPoly(FACEMESH_LIPS, lm, w, h);
        if (lipsPoly) {
          drawPoly(ctx, lipsPoly, lipColor, null, 1, Math.min(0.9, alpha));
          const b = polyBounds(lipsPoly);
          const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
          grad.addColorStop(0, lipColor + '55');
          grad.addColorStop(1, lipColor + '00');
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          drawPoly(ctx, lipsPoly, grad, null, 0, Math.min(0.6, alpha));
          ctx.restore();
        }
        const lePoly = buildPoly(FACEMESH_LEFT_EYE, lm, w, h);
        const rePoly = buildPoly(FACEMESH_RIGHT_EYE, lm, w, h);
        if (lePoly) {
          ctx.save(); ctx.globalCompositeOperation = 'multiply';
          drawPoly(ctx, lePoly, '#f0629222', '#f06292', 1, Math.min(0.5, alpha)); ctx.restore();
        }
        if (rePoly) {
          ctx.save(); ctx.globalCompositeOperation = 'multiply';
          drawPoly(ctx, rePoly, '#f0629222', '#f06292', 1, Math.min(0.5, alpha)); ctx.restore();
        }
      } else if (mode === 'jewelry') {
        ctx.fillStyle = '#ffd700';
        const scale = Math.abs(rightEye.x - leftEye.x);
        const lobeL = L(234), lobeR = L(454);
        ctx.beginPath();
        ctx.arc(lobeL.x, lobeL.y + scale * 0.2, Math.max(6, scale * 0.04), 0, Math.PI * 2);
        ctx.arc(lobeR.x, lobeR.y + scale * 0.2, Math.max(6, scale * 0.04), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        const nx = (leftEye.x + rightEye.x) / 2;
        const ny = Math.max(leftEye.y, rightEye.y) + scale * 1.0;
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(20, scale * 0.8), Math.PI * 0.05, Math.PI * 0.95);
        ctx.stroke();
      } else if (mode === 'hair') {
        const lb = buildPoly(FACEMESH_LEFT_EYEBROW, lm, w, h);
        const rb = buildPoly(FACEMESH_RIGHT_EYEBROW, lm, w, h);
        if (lb && rb) {
          const all = lb.concat(rb);
          const cx = all.reduce((s, p) => s + p.x, 0) / all.length;
          const cy = Math.min(...all.map(p => p.y)) - Math.abs(rightEye.y - leftEye.y) * 0.6;
          const hw = Math.abs(rightEye.x - leftEye.x) * 1.4;
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.filter = 'blur(2px)';
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(40, hw), Math.max(18, hw * 0.35), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else if (mode === 'accessories') {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        const gx = Math.min(leftEye.x, rightEye.x);
        const gw = Math.abs(rightEye.x - leftEye.x);
        const gy = Math.min(leftEye.y, rightEye.y) - gw * 0.15;
        const gh = gw * 0.5;
        ctx.strokeRect(gx, gy, gw, gh);
        ctx.fillStyle = '#111';
        ctx.fillRect(gx + gw * 0.2, gy + gh * 0.45, gw * 0.6, gh * 0.08);
        const lb = buildPoly(FACEMESH_LEFT_EYEBROW, lm, w, h);
        const rb = buildPoly(FACEMESH_RIGHT_EYEBROW, lm, w, h);
        if (lb) drawPoly(ctx, lb, null, '#000', 2, 0.6);
        if (rb) drawPoly(ctx, rb, null, '#000', 2, 0.6);
      }
    } else {
      if (mode === 'makeup') {
        ctx.fillStyle = lipColor;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.72, w * 0.18, h * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const pose = poseLmRef.current;
    if (pose && mode === 'clothing') {
      const ls = toPx(pose[11] || { x: 0.4, y: 0.4 }, w, h);
      const rs = toPx(pose[12] || { x: 0.6, y: 0.4 }, w, h);
      const lh = toPx(pose[23] || { x: 0.45, y: 0.7 }, w, h);
      const rh = toPx(pose[24] || { x: 0.55, y: 0.7 }, w, h);
      const poly = [ls, rs, rh, lh];
      drawPoly(ctx, poly, '#4444', '#666', 1.5, 0.8);
    }
    const hands = handLmRef.current || [];
    if (hands.length && mode === 'accessories') {
      const hw = (p) => toPx(p, w, h);
      for (const hlm of hands) {
        const wrist = hw(hlm[0]);
        const ref = hw(hlm[9]);
        const angle = Math.atan2(ref.y - wrist.y, ref.x - wrist.x);
        ctx.save();
        ctx.translate(wrist.x, wrist.y);
        ctx.rotate(angle);
        ctx.fillStyle = '#222';
        ctx.fillRect(-20, -10, 40, 20);
        ctx.restore();
      }
    }
    ctx.restore();
  }, [lipColor, intensity, mode]);

  useEffect(() => {
    let id;
    // init mediapipe modules
    const fm = new FaceMesh({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
    fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, selfieMode: true });
    fm.onResults((res) => {
      const raw = (res.multiFaceLandmarks && res.multiFaceLandmarks[0]) || null;
      if (!raw) { faceLmRef.current = null; return; }
      const prev = prevFaceLmRef.current;
      if (!prev || prev.length !== raw.length) {
        prevFaceLmRef.current = raw.map(p => ({ x: p.x, y: p.y, z: p.z }));
        faceLmRef.current = raw;
      } else {
        const sm = raw.map((p, i) => {
          const q = prev[i];
          return {
            x: smoothAlpha * q.x + (1 - smoothAlpha) * p.x,
            y: smoothAlpha * q.y + (1 - smoothAlpha) * p.y,
            z: smoothAlpha * q.z + (1 - smoothAlpha) * p.z,
          };
        });
        prevFaceLmRef.current = sm;
        faceLmRef.current = sm;
      }
    });
    const h = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    h.setOptions({ maxNumHands: 2, selfieMode: true });
    h.onResults((res) => { handLmRef.current = res.multiHandLandmarks || []; });
    const p = new Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    p.setOptions({ modelComplexity: 1, selfieMode: true });
    p.onResults((res) => { poseLmRef.current = res.poseLandmarks || null; });
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        const w = video.videoWidth; const h = video.videoHeight;
        if (w && h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!processingRef.current) {
          processingRef.current = true;
          Promise.resolve().then(async () => {
            try { await fm.send({ image: video }); } catch {}
            try { await h.send({ image: video }); } catch {}
            try { await p.send({ image: video }); } catch {}
            processingRef.current = false;
          });
        }
        if (running) drawOverlay(ctx, canvas.width, canvas.height);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running, drawOverlay]);

  const handleUploadFrame = async () => {
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
      const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
      const r = await aiApi.upload(token, file);
      setInfo(`Uploaded: ${typeof r === 'object' ? r.path : 'ok'}`);
    } catch (e) {
      setError(e?.message || 'Upload failed');
      setTimeout(() => setError(''), 3000);
    }
  };

  const videoConstraints = { facingMode: 'user', width: 1280, height: 720 };
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      setError(e?.message || 'Camera permission denied');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="container-fluid vh-100 p-0 bg-light">
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <button className="btn btn-link text-decoration-none" onClick={onBack} style={{ color: mainColor }}>
                Back
              </button>
              <h1 className="h4 fw-bold mb-0" style={{ color: mainColor }}>AI Try-On Studio</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4">
        {(error || info) && (
          <div className={`alert ${error ? 'alert-danger' : 'alert-info'}`}>{error || info}</div>
        )}
        <div className="row g-4">
          <div className="col-lg-8">
            <div
              className="position-relative rounded-4 overflow-hidden"
              style={{ border: `2px solid ${mainColor}30`, backgroundColor: '#000' }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{ width: '100%', height: 'auto', transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1)', transformOrigin: 'center', pointerEvents: 'none' }} />
            </div>
            <div className="d-flex gap-2 mt-3">
              {[
                { key: 'makeup', label: 'Makeup' },
                { key: 'jewelry', label: 'Jewelry' },
                { key: 'hair', label: 'Hair' },
                { key: 'accessories', label: 'Accessories' },
              ].map((m) => (
                <button
                  key={m.key}
                  className={`btn ${mode === m.key ? '' : 'btn-outline-secondary'}`}
                  style={mode === m.key ? { backgroundColor: mainColor, color: '#fff' } : {}}
                  onClick={() => setMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white">
                <strong style={{ color: mainColor }}>Controls</strong>
              </div>
              <div className="card-body d-flex flex-column gap-3">
                <div className="d-flex align-items-center gap-2">
                  <FaTint style={{ color: mainColor }} /> <span>Lip Color</span>
                  <input type="color" className="form-control form-control-color ms-auto" value={lipColor} onChange={(e) => setLipColor(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Intensity</label>
                  <input type="range" min={0} max={1} step={0.05} value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value))} className="form-range" />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={async () => { await startStream(); setRunning(true); }}><FaPlay /> Start</button>
                  <button className="btn btn-outline-secondary" onClick={() => setRunning(false)}><FaStop /> Stop</button>
                  <button className="btn btn-outline-info" onClick={handleUploadFrame}><FaUpload /> Upload Frame</button>
                </div>
                <div className="small text-muted">Streaming: <a href="/api/ai/stream/mjpeg" target="_blank" rel="noreferrer">MJPEG</a></div>
                <div className="d-grid gap-2">
                  <button className="btn" style={{ border: `2px solid ${mainColor}`, color: mainColor }} onClick={async () => {
                    try { await aiApi.processMakeup(token, { lips: lipColor, intensity }); setInfo('AI makeup applied'); setTimeout(() => setInfo(''), 2000); } catch (e) { setError(e?.message || 'AI error'); setTimeout(() => setError(''), 3000); }
                  }}>
                    <FaMagic /> Apply Makeup via AI
                  </button>
                  <button className="btn btn-outline-secondary" onClick={async () => { try { await aiApi.processJewelry(token, { type: 'earrings' }); setInfo('Jewelry processed'); setTimeout(() => setInfo(''), 2000); } catch (e) { setError(e?.message || 'AI error'); setTimeout(() => setError(''), 3000);} }}>Jewelry</button>
                  <button className="btn btn-outline-secondary" onClick={async () => { try { await aiApi.processHair(token, { style: 'band' }); setInfo('Hair processed'); setTimeout(() => setInfo(''), 2000);} catch (e) { setError(e?.message || 'AI error'); setTimeout(() => setError(''), 3000);} }}>Hair</button>
                  <button className="btn btn-outline-secondary" onClick={async () => { try { await aiApi.processAccessories(token, { type: 'glasses' }); setInfo('Accessories processed'); setTimeout(() => setInfo(''), 2000);} catch (e) { setError(e?.message || 'AI error'); setTimeout(() => setError(''), 3000);} }}>Accessories</button>
                  <button className="btn btn-outline-secondary" onClick={async () => { try { await aiApi.processClothing(token, { pose: 'upper-body' }); setInfo('Clothing processed'); setTimeout(() => setInfo(''), 2000);} catch (e) { setError(e?.message || 'AI error'); setTimeout(() => setError(''), 3000);} }}>Clothing</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryOnStudio;
