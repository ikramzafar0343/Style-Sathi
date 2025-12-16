import { useEffect, useRef, useState, useCallback } from 'react'
import TryOnBase from './TryOnBase'
import { tryonApi } from '../../services/api'

const SkinAnalysis = ({ inline = true, width = 900, height = 500, embedViewer = true, showControls = true }) => {
  const fileRef = useRef(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [live, setLive] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(true)

  const analyzeLocal = useCallback(async (fileOrBlob) => {
    const url = typeof fileOrBlob === 'string' ? fileOrBlob : URL.createObjectURL(fileOrBlob)
    const img = new Image()
    const p = new Promise((resolve) => { img.onload = resolve })
    img.src = url
    await p
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = Math.max(256, Math.round(512 * (img.height / img.width)))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = id.data
    const heat = document.createElement('canvas')
    heat.width = canvas.width
    heat.height = canvas.height
    const hctx = heat.getContext('2d')
    hctx.drawImage(canvas, 0, 0)
    const sampleRect = (x, y, w, h) => {
      const x0 = Math.max(0, Math.floor(x))
      const y0 = Math.max(0, Math.floor(y))
      const x1 = Math.min(canvas.width - 1, Math.floor(x + w))
      const y1 = Math.min(canvas.height - 1, Math.floor(y + h))
      let rSum = 0, gSum = 0, bSum = 0, n = 0
      let varSum = 0
      let prev = null
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const idx = (yy * canvas.width + xx) * 4
          const r = data[idx], g = data[idx+1], b = data[idx+2]
          rSum += r; gSum += g; bSum += b; n++
          const lum = (r + g + b) / 3
          if (prev != null) varSum += Math.abs(lum - prev)
          prev = lum
        }
      }
      const rAvg = rSum / Math.max(1, n), gAvg = gSum / Math.max(1, n), bAvg = bSum / Math.max(1, n)
      const brightness = (rAvg + gAvg + bAvg) / 3 / 255
      const redness = rAvg / Math.max(1, (gAvg + bAvg) / 2)
      const coolness = bAvg / Math.max(1, rAvg)
      const texture = varSum / Math.max(1, n) / 255
      return { brightness, redness, coolness, texture }
    }
    const lm = typeof window !== 'undefined' ? (window.__styleSathiLm || null) : null
    const regions = () => {
      if (!lm || !Array.isArray(lm) || lm.length === 0) {
        const cx = canvas.width / 2
        const cy = canvas.height / 2
        return {
          forehead: { x: cx - 80, y: cy - 140, w: 160, h: 60 },
          nose: { x: cx - 40, y: cy - 40, w: 80, h: 80 },
          cheekL: { x: cx - 160, y: cy - 20, w: 120, h: 100 },
          cheekR: { x: cx + 40, y: cy - 20, w: 120, h: 100 },
          underEyeL: { x: cx - 120, y: cy - 70, w: 80, h: 40 },
          underEyeR: { x: cx + 40, y: cy - 70, w: 80, h: 40 },
          chin: { x: cx - 80, y: cy + 80, w: 160, h: 60 },
        }
      }
      const mapX = (normX) => normX * canvas.width
      const mapY = (normY) => normY * canvas.height
      const lEye = lm[33], rEye = lm[263], noseTip = lm[1] || lm[4] || lm[6]
      const chin = lm[152], forehead = lm[10], cheekL = lm[234], cheekR = lm[454]
      const eyeDist = Math.hypot(mapX(rEye.x) - mapX(lEye.x), mapY(rEye.y) - mapY(lEye.y))
      const b = Math.max(30, eyeDist)
      return {
        forehead: { x: mapX(forehead.x) - b, y: mapY(forehead.y) - b * 0.6, w: b * 2, h: b * 0.8 },
        nose: { x: mapX((lEye.x + rEye.x)/2) - b * 0.4, y: mapY(noseTip?.y || ((lEye.y + rEye.y)/2)) - b * 0.3, w: b * 0.8, h: b * 0.8 },
        cheekL: { x: mapX(cheekL.x) - b * 0.7, y: mapY(cheekL.y) - b * 0.6, w: b * 1.4, h: b * 1.2 },
        cheekR: { x: mapX(cheekR.x) - b * 0.7, y: mapY(cheekR.y) - b * 0.6, w: b * 1.4, h: b * 1.2 },
        underEyeL: { x: mapX(lEye.x) - b * 0.6, y: mapY(lEye.y) + b * 0.1, w: b * 1.2, h: b * 0.5 },
        underEyeR: { x: mapX(rEye.x) - b * 0.6, y: mapY(rEye.y) + b * 0.1, w: b * 1.2, h: b * 0.5 },
        chin: { x: mapX(chin.x) - b, y: mapY(chin.y) - b * 0.1, w: b * 2, h: b * 0.8 },
      }
    }
    const r = regions()
    const f = sampleRect(r.forehead.x, r.forehead.y, r.forehead.w, r.forehead.h)
    const n = sampleRect(r.nose.x, r.nose.y, r.nose.w, r.nose.h)
    const cl = sampleRect(r.cheekL.x, r.cheekL.y, r.cheekL.w, r.cheekL.h)
    const cr = sampleRect(r.cheekR.x, r.cheekR.y, r.cheekR.w, r.cheekR.h)
    const uel = sampleRect(r.underEyeL.x, r.underEyeL.y, r.underEyeL.w, r.underEyeL.h)
    const uer = sampleRect(r.underEyeR.x, r.underEyeR.y, r.underEyeR.w, r.underEyeR.h)
    const ch = sampleRect(r.chin.x, r.chin.y, r.chin.w, r.chin.h)
    const avg = (a, b) => (a + b) / 2
    const tzoneOil = (n.brightness - avg(cl.brightness, cr.brightness))
    const cheeksRed = avg(cl.redness, cr.redness)
    const underEyeDark = 1 - Math.min(1, avg(uel.brightness, uer.brightness))
    const textureAvg = avg(avg(cl.texture, cr.texture), avg(f.texture, ch.texture))
    const poresScore = Math.max(0, textureAvg * 1.4)
    const oiliness = Math.max(0, tzoneOil)
    const dryness = Math.max(0, 0.6 - avg(cl.brightness, cr.brightness))
    const skinType = (() => {
      if (oiliness > 0.12 && dryness < 0.1) return 'Oily'
      if (dryness > 0.15 && oiliness < 0.08) return 'Dry'
      if (oiliness > 0.1 && dryness > 0.12) return 'Combination'
      return 'Normal'
    })()
    const rednessScore = Math.max(0, cheeksRed - 1.0)
    const wrinklesScore = Math.max(0, textureAvg - 0.18)
    const melanin = 1 - Math.min(1, avg(cl.brightness, cr.brightness))
    const pigmentation = melanin > 0.3 ? 'High' : melanin > 0.18 ? 'Medium' : 'Low'
    const acneAreas = (() => {
      const redTh = 1.25
      const acneLeft = cl.redness > redTh
      const acneRight = cr.redness > redTh
      const acneTzone = n.redness > redTh
      const arr = []
      if (acneLeft) arr.push('Left cheek')
      if (acneRight) arr.push('Right cheek')
      if (acneTzone) arr.push('T-zone')
      return arr
    })()
    const hydration = dryness < 0.1 ? 'Good' : dryness < 0.2 ? 'Moderate' : 'Low'
    const sebumZones = (() => {
      const arr = []
      if (tzoneOil > 0.08) arr.push('T-zone')
      if ((cl.brightness - n.brightness) > 0.05 || (cr.brightness - n.brightness) > 0.05) arr.push('Cheeks')
      return arr.length ? arr : ['Balanced']
    })()
    const bioAge = (() => {
      const b = wrinklesScore + poresScore + rednessScore + underEyeDark * 0.5
      if (b < 0.25) return 'Younger than actual'
      if (b < 0.5) return 'Near actual age'
      return 'Older than actual'
    })()
    const report = {
      skin_type: skinType,
      texture: textureAvg.toFixed(2),
      pores: poresScore > 0.4 ? 'Enlarged' : poresScore > 0.25 ? 'Medium' : 'Small',
      fine_lines: wrinklesScore > 0.25 ? 'Visible' : wrinklesScore > 0.1 ? 'Mild' : 'None',
      deep_wrinkles: wrinklesScore > 0.5 ? 'Present' : 'Low',
      micro_texture: textureAvg > 0.25 ? 'Coarse' : 'Smooth',
      tone_overall: avg(cl.brightness, cr.brightness).toFixed(2),
      uneven_tone: Math.abs(cl.brightness - cr.brightness) > 0.08 ? 'Uneven' : 'Even',
      pigmentation_level: pigmentation,
      melanin_concentration: melanin.toFixed(2),
      acne: acneAreas.length ? acneAreas : ['None'],
      redness_inflammation: rednessScore > 0.2 ? 'High' : rednessScore > 0.1 ? 'Moderate' : 'Low',
      under_eye_darkness: underEyeDark > 0.4 ? 'High' : underEyeDark > 0.25 ? 'Moderate' : 'Low',
      eyebags_puffiness: textureAvg > 0.22 ? 'Moderate' : 'Low',
      sunspots: 'Not detected',
      age_spots: 'Not detected',
      freckles: 'Not detected',
      red_spots_vascular: rednessScore > 0.25 ? 'Possible' : 'Low',
      hydration: hydration,
      oil_balance: sebumZones,
      skin_age_estimation: bioAge,
      brightness: Number(avg(cl.brightness, cr.brightness).toFixed(2)),
      redness: Number(cheeksRed.toFixed(2)),
      coolness: Number(avg(cl.coolness, cr.coolness).toFixed(2)),
      summary: 'Automated skin analysis based on regional sampling',
      recommendations: [
        skinType === 'Dry' ? 'Increase hydration; use hyaluronic acid serums' : null,
        skinType === 'Oily' ? 'Use non-comedogenic moisturizers; control sebum in T-zone' : null,
        rednessScore > 0.2 ? 'Consider calming products with niacinamide' : null,
        wrinklesScore > 0.25 ? 'Introduce retinoids and sunscreen daily' : null,
        pigmentation !== 'Low' ? 'Use vitamin C and SPF to even tone' : null,
      ].filter(Boolean)
    }
    if (showHeatmap) {
      const drawRegion = (rect, color, intensity = 0.6) => {
        hctx.save()
        hctx.globalAlpha = Math.min(0.85, Math.max(0.15, intensity))
        hctx.fillStyle = color
        hctx.strokeStyle = '#ffffff80'
        hctx.lineWidth = 2
        hctx.beginPath()
        hctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10)
        hctx.fill()
        hctx.stroke()
        hctx.restore()
      }
      drawRegion(r.nose, '#ffcc00', oiliness * 6) // T-zone oil
      drawRegion(r.cheekL, '#ff3344', Math.max(0.15, (cl.redness - 1.0) * 2))
      drawRegion(r.cheekR, '#ff3344', Math.max(0.15, (cr.redness - 1.0) * 2))
      drawRegion(r.underEyeL, '#3366ff', underEyeDark * 1.5)
      drawRegion(r.underEyeR, '#3366ff', underEyeDark * 1.5)
      drawRegion(r.forehead, '#ffcc00', oiliness * 5)
      drawRegion(r.chin, '#aa66ff', dryness * 3)
      setPreviewUrl(heat.toDataURL('image/png'))
    } else {
      setPreviewUrl('')

    }
    return report
  }, [showHeatmap])

  const analyzeBlob = useCallback(async (blob) => {
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('image', blob, 'capture.png')
      const json = await tryonApi.analyzeSkin(fd)
      setReport(json)
      if (json && json.overlay) setPreviewUrl(json.overlay)
    } catch {
      const local = await analyzeLocal(blob)
      setReport(local)
    } finally {
      setLoading(false)
    }
  }, [analyzeLocal])

  const onAnalyze = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    await analyzeBlob(file)
  }

  const onCaptureAnalyze = async () => {
    const canvas = document.getElementById('tryon-canvas')
    if (!canvas) return
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    await analyzeBlob(blob)
  }
  useEffect(() => {
    let id = 0
    const tick = async () => {
      if (!live || loading) return
      const canvas = document.getElementById('tryon-canvas')
      if (!canvas) return
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return
      await analyzeBlob(blob)
    }
    if (live) { id = window.setInterval(tick, 2500) }
    return () => { if (id) window.clearInterval(id) }
  }, [live, loading, analyzeBlob])

  useEffect(() => { /* no auto capture */ }, [])

  return (
    <div className="w-100">
      {embedViewer && (
        <div className="mb-3 d-flex justify-content-center">
          <TryOnBase inline={inline} width={width} height={height} mode={'skin'} />
        </div>
      )}
      <div className="mt-3">
        {showControls && (
          <div className="d-flex align-items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="form-control" style={{ maxWidth: '320px' }} />
            <button className="btn btn-primary" onClick={onAnalyze} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Image'}</button>
            <button className="btn btn-outline-primary" onClick={onCaptureAnalyze} disabled={loading}>Capture from Camera</button>
            <button className={`btn ${live ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setLive(v => !v)} disabled={loading}>{live ? 'Stop Live' : 'Live Analyze'}</button>
            <div className="form-check ms-2">
              <input className="form-check-input" type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} id="showHeatmapCheck" />
              <label className="form-check-label" htmlFor="showHeatmapCheck">Heatmap</label>
            </div>
          </div>
        )}
        {report && (
          <div className="mt-3 card">
            <div className="card-body">
              <h6>Skin Report</h6>
              {previewUrl && (
                <div className="mb-3">
                  <img src={previewUrl} alt="analysis overlay" className="rounded" style={{ maxWidth: '100%', border: '1px solid #eee' }} />
                </div>
              )}
              <div>Skin Type: {report.skin_type}</div>
              <div>Texture: {report.texture}</div>
              <div>Pores: {report.pores}</div>
              <div>Fine Lines: {report.fine_lines}</div>
              <div>Deep Wrinkles: {report.deep_wrinkles}</div>
              <div>Micro Texture: {report.micro_texture}</div>
              <div>Overall Tone: {report.tone_overall}</div>
              <div>Pigmentation Level: {report.pigmentation_level}</div>
              <div>Melanin: {report.melanin_concentration}</div>
              <div>Redness/Inflammation: {report.redness_inflammation}</div>
              <div>Under-Eye Darkness: {report.under_eye_darkness}</div>
              <div>Eyebags Puffiness: {report.eyebags_puffiness}</div>
              <div>Hydration: {report.hydration}</div>
              <div>Oil Balance: {Array.isArray(report.oil_balance) ? report.oil_balance.join(', ') : report.oil_balance}</div>
              <div>Skin Age: {report.skin_age_estimation}</div>
              {report.acne && Array.isArray(report.acne) && report.acne.length > 0 && (
                <div className="mt-2">Acne Areas: {report.acne.join(', ')}</div>
              )}
              <div className="mt-2">{report.summary ?? 'AI summary unavailable'}</div>
              {report.recommendations && Array.isArray(report.recommendations) && (
                <ul className="mt-2">
                  {report.recommendations.map((r, i) => (<li key={i}>{r}</li>))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SkinAnalysis
