import { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { aiApi } from '../services/api';
import { FaTint, FaMagic, FaUpload, FaPlay, FaStop } from 'react-icons/fa';

const TryOnStudio = ({ token, onBack }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [lipColor, setLipColor] = useState('#c2185b');
  const [intensity, setIntensity] = useState(0.5);
  const [error, setError] = useState('');

  const drawOverlay = useCallback((ctx, w, h) => {
    const alpha = Math.min(1, Math.max(0, intensity));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = lipColor;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.72, w * 0.18, h * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [lipColor, intensity]);

  useEffect(() => {
    let id;
    const loop = () => {
      const video = webcamRef.current?.video;
      const canvas = canvasRef.current;
      if (video && canvas) {
        const w = video.videoWidth; const h = video.videoHeight;
        if (w && h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (running) drawOverlay(ctx, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const bytes = atob(dataUrl.split(',')[1]);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        } catch {}
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
      await aiApi.upload(token, file);
    } catch (e) {
      setError(e?.message || 'Upload failed');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">AI Try-On Studio</h4>
        <button className="btn btn-outline-secondary" onClick={onBack}>Back</button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <div className="col-md-8">
          <div className="position-relative">
            <Webcam ref={webcamRef} audio={false} mirrored style={{ width: '100%', borderRadius: 8 }} />
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">Controls</div>
            <div className="card-body d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <FaTint /> <span>Lip Color</span>
                <input type="color" className="form-control form-control-color ms-auto" value={lipColor} onChange={(e) => setLipColor(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Intensity</label>
                <input type="range" min={0} max={1} step={0.05} value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value))} className="form-range" />
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={() => setRunning(true)}><FaPlay /> Start</button>
                <button className="btn btn-secondary" onClick={() => setRunning(false)}><FaStop /> Stop</button>
                <button className="btn btn-outline-info" onClick={handleUploadFrame}><FaUpload /> Upload Frame</button>
              </div>
              <div className="small text-muted">Streaming: <a href="/api/ai/stream/mjpeg" target="_blank" rel="noreferrer">MJPEG</a></div>
              <button className="btn btn-outline-success" onClick={async () => { await aiApi.processMakeup(token, { lips: lipColor, intensity }); }}>
                <FaMagic /> Apply Makeup via AI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryOnStudio;
