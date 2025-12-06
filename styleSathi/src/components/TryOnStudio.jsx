import { useEffect, useState } from 'react'
import { FaceMesh, FACEMESH_LIPS, FACEMESH_LEFT_EYE, FACEMESH_RIGHT_EYE } from '@mediapipe/face_mesh'
import styleSathiLogo from '../assets/styleSathiLogo.svg'
import { FaUser, FaShoppingCart, FaArrowLeft, FaEye, FaKissWinkHeart, FaPaintBrush, FaSmileBeam, FaHighlighter, FaEyeSlash, FaPenNib, FaMarker, FaEyeDropper, FaFillDrip, FaGem } from 'react-icons/fa'
import { IoIosGlasses, IoMdWatch } from 'react-icons/io'
import GlassesTryon from './tryon/GlassesTryon'
import { GiBigDiamondRing, GiConverseShoe, GiWatch, GiHairStrands } from 'react-icons/gi'
import WristTryon from './tryon/WristTryon'
import HatTryon from './tryon/HatTryon'
import JewelryTryon from './tryon/JewelryTryon'
import HairTryon from './tryon/HairTryon'
import SkinAnalysis from './tryon/SkinAnalysis'
import TryOnBase from './tryon/TryOnBase'
import { catalogApi, resolveAssetUrl } from '../services/api'

const TryOnStudio = ({ onBack, currentUser, onNavigateToCart, onNavigateToAccountSettings, cartItemsCount = 0 }) => {
  const [mode, setMode] = useState('face')
  const [_items, setItems] = useState([])
  const [selected, _setSelected] = useState(null)
  const [makeupColors, setMakeupColors] = useState({ 
    lips: '#ff4d88', 
    eyes: '#4d79ff', 
    brows: '#8b4513', 
    cheeks: '#ff9999', 
    lashes: '#222222', 
    foundation: '#e0c0a0', 
    highlight: '#fff3cc', 
    underEye: '#e8d7c5',
    eyeliner: '#1a1a1a',
    kajal: '#1a1a1a'
  })
  const [makeupIntensity, setMakeupIntensity] = useState({ 
    lips: 0.35, 
    eyes: 0.25, 
    brows: 0.4, 
    cheeks: 0.35, 
    lashes: 0.5, 
    foundation: 0.25, 
    highlight: 0.35, 
    underEye: 0.3,
    eyeliner: 0.4,
    kajal: 0.35
  })
  const [applyMakeup, setApplyMakeup] = useState(false)
  const [makeupTab, setMakeupTab] = useState('lips')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoResult, setPhotoResult] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  
  const mainColor = '#c4a62c'
  const secondaryColor = '#2c67c4'

  useEffect(() => {
    let mounted = true
    catalogApi.getProducts().then((list) => {
      
      const arr = (list || []).filter((p) => p.model_glb_url || p.image_url || p.image).map((p) => ({
        id: p.id,
        title: p.title || p.name,
        imageUrl: resolveAssetUrl(p.image_url || p.image || ''),
        modelGlbUrl: resolveAssetUrl(p.model_glb_url || ''),
      }))
      if (mounted) setItems(arr)
    }).catch(() => { if (mounted) setItems([]) })
    return () => { mounted = false }
  }, [])

  


  const overlaySrc = selected && !selected.modelGlbUrl ? (selected.imageUrl || '') : ''
  const modelGlbUrl = selected && selected.modelGlbUrl ? selected.modelGlbUrl : ''
  const hatTestGlb = '/static/uploads/product_6_nmah-2018_0055_02-rendon_hat-150k-4096_std.glb'
  const modelGlbUrlForMode = mode === 'hat' ? (selected?.modelGlbUrl || hatTestGlb) : modelGlbUrl

  const applyMakeupToPhoto = async () => {
    if (!photoFile) return
    setPhotoLoading(true)
    try {
      const img = new Image()
      img.src = URL.createObjectURL(photoFile)
      await new Promise((resolve) => { const done = () => resolve(); img.onload = done; img.onerror = done })
      const maxW = 480
      const scale = Math.min(1, maxW / (img.width || maxW))
      const w = Math.max(1, Math.round((img.width || maxW) * scale))
      const h = Math.max(1, Math.round((img.height || maxW) * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      const fm = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` })
      fm.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
      const results = await new Promise((resolve) => { fm.onResults(resolve); fm.send({ image: img }) })
      const face = (results.multiFaceLandmarks || [])[0]
      if (face) {
        const toXY = (p) => ({ x: p.x * w, y: p.y * h })
        const uniq = new Set()
        FACEMESH_LIPS.forEach(([a, b]) => { uniq.add(a); uniq.add(b) })
        const lipPoints = Array.from(uniq).map(i => toXY(face[i]))
        const cx = lipPoints.reduce((s, p) => s + p.x, 0) / lipPoints.length
        const cy = lipPoints.reduce((s, p) => s + p.y, 0) / lipPoints.length
        const sorted = lipPoints.slice().sort((p1, p2) => Math.atan2(p1.y - cy, p1.x - cx) - Math.atan2(p2.y - cy, p2.x - cx))
        const parseHex = (hex) => { const h2 = hex.replace('#',''); const r = parseInt(h2.substring(0,2),16)||0; const g = parseInt(h2.substring(2,4),16)||0; const b = parseInt(h2.substring(4,6),16)||0; return { r, g, b } }
        const lipsColor = parseHex(makeupColors.lips)
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, makeupIntensity.lips || 0.35))
        ctx.beginPath()
        sorted.forEach((p, idx) => { if (idx === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) })
        ctx.closePath()
        ctx.fillStyle = `rgba(${lipsColor.r},${lipsColor.g},${lipsColor.b},1)`
        ctx.fill()
        ctx.restore()

        const eyeSet = [...FACEMESH_LEFT_EYE, ...FACEMESH_RIGHT_EYE]
        const eyeUniq = new Set(); eyeSet.forEach(([a,b]) => { eyeUniq.add(a); eyeUniq.add(b) })
        const eyeColor = parseHex(makeupColors.eyeliner)
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, makeupIntensity.eyeliner || 0.3))
        ctx.strokeStyle = `rgba(${eyeColor.r},${eyeColor.g},${eyeColor.b},1)`
        ctx.lineWidth = 2
        for (const [a,b] of eyeSet) {
          const pa = toXY(face[a]); const pb = toXY(face[b]);
          ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke()
        }
        ctx.restore()
      }

      const url = canvas.toDataURL('image/png')
      setPhotoResult(url)
    } finally {
      setPhotoLoading(false)
    }
  }

  const downloadPhoto = () => {
    if (!photoResult) return
    const a = document.createElement('a')
    a.href = photoResult
    a.download = 'makeup.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="min-vh-100 bg-light">
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3 d-flex align-items-center gap-3">
              <button className="btn d-flex align-items-center gap-2" onClick={onBack} style={{ border: `2px solid ${mainColor}`, color: mainColor, borderRadius: '25px', backgroundColor: 'transparent' }}>
                <FaArrowLeft /> Back
              </button>
              <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '40px', cursor: 'pointer' }} onClick={onBack} />
            </div>
            <div className="col-md-6">
              <h5 className="mb-0" style={{ color: mainColor }}>Try-On Studio</h5>
            </div>
            <div className="col-md-3">
              <div className="d-flex align-items-center justify-content-end gap-4">
                <div className="position-relative" onClick={onNavigateToCart} style={{ cursor: 'pointer' }}>
                  <FaShoppingCart style={{ fontSize: '24px', color: mainColor }} />
                  {cartItemsCount > 0 && (
                    <span className="badge rounded-pill position-absolute top-0 start-100 translate-middle" style={{ backgroundColor: secondaryColor, color: 'white', fontSize: '0.7rem', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartItemsCount}</span>
                  )}
                </div>
                <div className="d-flex align-items-center gap-2" onClick={onNavigateToAccountSettings} style={{ cursor: 'pointer' }}>
                  <div className="rounded-circle d-flex align-items-center justify-content-center border" style={{ width: '45px', height: '45px', backgroundColor: mainColor + '20', borderColor: mainColor + '50' }}>
                    <FaUser style={{ color: mainColor, fontSize: '18px' }} />
                  </div>
                  <div className="d-none d-md-block">
                    <span style={{ color: mainColor, fontWeight: '500' }}>{currentUser?.name || 'Customer'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4">
        <button className="btn btn-link p-0 mb-3 d-flex align-items-center gap-2" onClick={onBack}><FaArrowLeft /> Back</button>
        <div className="row g-4">
          <div className="col-md-3">
            <div className="card">
              <div className="card-body d-grid gap-2">
                <button className={`btn ${mode==='face'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='face'?mainColor:undefined, color: mode==='face'?'#fff':undefined }} onClick={() => setMode('face')}><IoIosGlasses className="me-2"/>Face</button>
                <button className={`btn ${mode==='glasses'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='glasses'?mainColor:undefined, color: mode==='glasses'?'#fff':undefined }} onClick={() => setMode('glasses')}><IoIosGlasses className="me-2"/>Glasses</button>
                <button className={`btn ${mode==='makeup'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='makeup'?mainColor:undefined, color: mode==='makeup'?'#fff':undefined }} onClick={() => setMode('makeup')}>Makeup</button>
                <button className={`btn ${mode==='hair'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='hair'?mainColor:undefined, color: mode==='hair'?'#fff':undefined }} onClick={() => setMode('hair')}><GiHairStrands className="me-2"/>Hair</button>
                <button className={`btn ${mode==='skin'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='skin'?mainColor:undefined, color: mode==='skin'?'#fff':undefined }} onClick={() => setMode('skin')}><FaSmileBeam className="me-2"/>Skin</button>
                <button className={`btn ${mode==='jewelry'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='jewelry'?mainColor:undefined, color: mode==='jewelry'?'#fff':undefined }} onClick={() => setMode('jewelry')}><FaGem className="me-2"/>Jewelry</button>
                <button className={`btn ${mode==='hat'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='hat'?mainColor:undefined, color: mode==='hat'?'#fff':undefined }} onClick={() => setMode('hat')}><GiWatch className="me-2"/>Hat</button>
                <button className={`btn ${mode==='hand'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='hand'?mainColor:undefined, color: mode==='hand'?'#fff':undefined }} onClick={() => setMode('hand')}><GiBigDiamondRing className="me-2"/>Hand</button>
                <button className={`btn ${mode==='wrist'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='wrist'?mainColor:undefined, color: mode==='wrist'?'#fff':undefined }} onClick={() => setMode('wrist')}><IoMdWatch className="me-2"/>Wrist</button>
                <button className={`btn ${mode==='feet'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='feet'?mainColor:undefined, color: mode==='feet'?'#fff':undefined }} onClick={() => setMode('feet')}><GiConverseShoe className="me-2"/>Feet</button>
                <button className={`btn ${mode==='body'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='body'?mainColor:undefined, color: mode==='body'?'#fff':undefined }} onClick={() => setMode('body')}><GiWatch className="me-2"/>Body</button>
              </div>
            </div>
          </div>
          <div className="col-md-9">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: `linear-gradient(135deg, ${mainColor}15, ${secondaryColor}10)` }}>
              <div className="card-body">
                <div className="d-flex justify-content-center">
                  {mode === 'wrist' ? (
                    <WristTryon
                      inline
                      width={900}
                      height={500}
                      overlaySrc={overlaySrc}
                      modelGlbUrl={modelGlbUrl}
                      applyMakeup={applyMakeup}
                    />
                  ) : mode === 'jewelry' ? (
                    <JewelryTryon
                      inline
                      width={900}
                      height={500}
                      overlaySrc={overlaySrc}
                      modelGlbUrl={modelGlbUrl}
                      applyMakeup={applyMakeup}
                    />
                  ) : mode === 'hair' ? (
                    <HairTryon
                      inline
                      width={900}
                      height={500}
                      overlaySrc={overlaySrc}
                      modelGlbUrl={modelGlbUrl}
                      applyMakeup={applyMakeup}
                    />
                  ) : mode === 'skin' ? (
                    <TryOnBase
                      inline
                      width={900}
                      height={500}
                      mode={'skin'}
                    />
                  ) : mode === 'glasses' ? (
                    <GlassesTryon
                      inline
                      width={900}
                      height={500}
                      overlaySrc={overlaySrc}
                      modelGlbUrl={modelGlbUrl}
                      applyMakeup={applyMakeup}
                    />
                  ) : mode === 'glasses' ? (
                    <GlassesTryon
                      inline
                      width={900}
                      height={500}
                      overlaySrc={overlaySrc}
                      modelGlbUrl={modelGlbUrl}
                      applyMakeup={applyMakeup}
                    />
                  ) : (
                    <TryOnBase
                      inline
                      width={900}
                      height={500}
                      mode={mode}
                      overlaySrc={overlaySrc}
                      modelGlbUrl={modelGlbUrlForMode}
                      makeupColors={makeupColors}
                      makeupIntensity={makeupIntensity}
                      applyMakeup={applyMakeup}
                    />
                  )}
                </div>
                {mode === 'skin' && (
                  <div className="mt-3 card">
                    <div className="card-body">
                      <SkinAnalysis inline width={900} height={0} embedViewer={false} showControls={true} />
                    </div>
                  </div>
                )}
                {mode === 'makeup' && (
                  <div className="mt-3">
                    <div className="d-flex gap-2 mb-3">
                      {(() => {
                        const tabList = ['lips','eyes','brows','cheeks','lashes','eyeliner','kajal','highlight','underEye','foundation']
                        const iconMap = {
                          lips: FaKissWinkHeart,
                          eyes: FaEye,
                          brows: FaPaintBrush,
                          cheeks: FaSmileBeam,
                          lashes: FaEyeSlash,
                          eyeliner: FaPenNib,
                          kajal: FaMarker,
                          highlight: FaHighlighter,
                          underEye: FaEyeDropper,
                          foundation: FaFillDrip
                        }
                        return tabList.map(t => {
                          const Icon = iconMap[t]
                          return (
                            <button
                              key={t}
                              className={`makeup-tab-btn ${makeupTab===t?'active':''}`}
                              onClick={() => setMakeupTab(t)}
                              title={t}
                            >
                              <Icon className="icon" />
                            </button>
                          )
                        })
                      })()}
                    </div>
                    <div className="row g-3 align-items-end">
                      <div className="col-sm-6">
                        <label className="form-label small" style={{ color: mainColor }}>Color</label>
                        <input type="color" className="form-control form-control-color" value={makeupColors[makeupTab]} onChange={(e) => setMakeupColors(v => ({ ...v, [makeupTab]: e.target.value }))} />
                        <div className="mt-2 d-flex flex-wrap gap-2">
                          {(
                            makeupTab==='lips' ? ['#e63946','#ff4d88','#d63384','#a4161a','#cc6666','#ff7f50','#d35d6e'] :
                            makeupTab==='eyes' ? ['#4d79ff','#2c67c4','#1e1e2f','#6a5acd','#2b2d42','#00bcd4','#3f51b5'] :
                            makeupTab==='brows' ? ['#8b4513','#5d4037','#3e2723','#795548','#a0522d','#6d4c41','#4e342e'] :
                            makeupTab==='cheeks' ? ['#ff9999','#f28ea0','#f5a9b8','#f7c6c7','#f4b8b8','#e78fb3','#ffb3ba'] :
                            makeupTab==='lashes' ? ['#000000','#111111','#222222','#333333','#444444','#555555'] :
                            makeupTab==='eyeliner' ? ['#000000','#111111','#1a1a1a','#222222','#333333'] :
                            makeupTab==='kajal' ? ['#000000','#111111','#1a1a1a','#222222','#333333'] :
                            makeupTab==='highlight' ? ['#fff3cc','#ffe9a3','#ffd966','#fff0e5','#e8e9ff'] :
                            makeupTab==='underEye' ? ['#f0e0d0','#e8d7c5','#dccab0','#cdb89a','#bfa783'] :
                            makeupTab==='foundation' ? ['#f3d7c6','#eacbb6','#e0c0a0','#d0af8f','#bf9c7b','#ad8866'] :
                            []
                          ).map(hex => (
                            <button key={hex} className="btn btn-sm p-0 border" style={{ width: '28px', height: '28px', backgroundColor: hex, borderColor: mainColor+'50', borderRadius: '50%' }} onClick={() => setMakeupColors(v => ({ ...v, [makeupTab]: hex }))}></button>
                          ))}
                        </div>
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label small" style={{ color: mainColor }}>Intensity</label>
                        <input type="range" className="form-range" min="0" max="100" step="5" value={Math.round((makeupIntensity[makeupTab]||0)*100)} onChange={(e) => setMakeupIntensity(v => ({ ...v, [makeupTab]: Math.max(0, Math.min(1, Number(e.target.value)/100)) }))} />
                        <div className="mt-2 d-flex gap-2">
                          {[
                            { name: 'Natural', payload: { lips: 0.25, eyes: 0.15, brows: 0.35, cheeks: 0.20, lashes: 0.35, eyeliner: 0.25, kajal: 0.25, highlight: 0.25, underEye: 0.2, foundation: 0.2 } },
                            { name: 'Glam', payload: { lips: 0.55, eyes: 0.45, brows: 0.5, cheeks: 0.45, lashes: 0.6, eyeliner: 0.5, kajal: 0.5, highlight: 0.4, underEye: 0.3, foundation: 0.3 } },
                            { name: 'Bold', payload: { lips: 0.75, eyes: 0.65, brows: 0.6, cheeks: 0.55, lashes: 0.8, eyeliner: 0.7, kajal: 0.7, highlight: 0.5, underEye: 0.35, foundation: 0.35 } }
                          ].map(p => (
                            <button
                              key={p.name}
                              className="btn btn-sm"
                              style={{ borderColor: mainColor, color: mainColor }}
                              onClick={() => { setMakeupIntensity(v => ({ ...v, ...p.payload })); setApplyMakeup(true); }}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <button className="btn" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={() => setApplyMakeup(true)}>Apply</button>
                      {applyMakeup && (
                        <button className="btn btn-outline-secondary" onClick={() => setApplyMakeup(false)}>Clear</button>
                      )}
                    </div>
                    <div className="row g-3 mt-3 align-items-start">
                      <div className="col-md-6">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                          <div className="card-body">
                            <h6 className="fw-bold mb-2" style={{ color: mainColor }}>Makeup on Picture</h6>
                            <input type="file" accept="image/*" className="form-control mb-2" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                            <div className="d-flex gap-2">
                              <button className="btn" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={applyMakeupToPhoto} disabled={!photoFile || photoLoading}>Apply Makeup</button>
                              <button className="btn btn-outline-secondary" onClick={downloadPhoto} disabled={!photoResult}>Download</button>
                            </div>
                            {photoLoading && <div className="small mt-2" style={{ color: secondaryColor }}>Processing...</div>}
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                          <div className="card-body d-flex align-items-center justify-content-center" style={{ minHeight: '200px' }}>
                            {photoResult ? (
                              <img src={photoResult} alt="Makeup Preview" className="rounded w-100 h-100" style={{ objectFit: 'cover' }} />
                            ) : (
                              <span className="text-muted small">Upload a picture and apply makeup</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
      <style>{`
        .makeup-tab-btn {
          border: 2px solid ${mainColor};
          color: ${mainColor};
          background: transparent;
          border-radius: 16px;
          width: 36px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 0 0 rgba(0,0,0,0);
        }
        .makeup-tab-btn .icon { font-size: 16px; transition: transform 0.2s ease, color 0.2s ease; }
        .makeup-tab-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }
        .makeup-tab-btn:hover .icon { transform: scale(1.05); }
        .makeup-tab-btn.active {
          background: linear-gradient(135deg, ${mainColor}, ${mainColor}CC);
          color: #fff;
          border-color: ${mainColor};
        }
        .makeup-tab-btn.active .icon { color: #fff; }
      `}</style>
    </div>
  )
}

export default TryOnStudio
