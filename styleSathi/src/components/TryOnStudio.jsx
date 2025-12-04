import { useEffect, useState } from 'react'
import styleSathiLogo from '../assets/styleSathiLogo.svg'
import { FaUser, FaShoppingCart, FaArrowLeft } from 'react-icons/fa'
import { IoIosGlasses } from 'react-icons/io'
import { GiBigDiamondRing, GiConverseShoe, GiWatch } from 'react-icons/gi'
import TryOnBase from './tryon/TryOnBase'
import { catalogApi } from '../services/api'

const TryOnStudio = ({ onBack, currentUser, onNavigateToCart, onNavigateToAccountSettings, cartItemsCount = 0 }) => {
  const [mode, setMode] = useState('face')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [makeupColors, setMakeupColors] = useState({ lips: '#ff4d88', eyes: '#4d79ff', brows: '#8b4513', cheeks: '#ff9999' })
  const [makeupIntensity, setMakeupIntensity] = useState({ lips: 0.35, eyes: 0.25, brows: 0.4, cheeks: 0.35 })
  const [applyMakeup, setApplyMakeup] = useState(false)
  const mainColor = '#c4a62c'
  const secondaryColor = '#2c67c4'

  useEffect(() => {
    let mounted = true
    catalogApi.getProducts().then((list) => {
      const arr = (list || []).filter((p) => p.model_glb_url || p.image_url || p.image).map((p) => ({
        id: p.id,
        title: p.title || p.name,
        imageUrl: p.image_url || p.image || '',
        modelGlbUrl: p.model_glb_url || '',
      }))
      if (mounted) setItems(arr)
    }).catch(() => { if (mounted) setItems([]) })
    return () => { mounted = false }
  }, [])

  const overlaySrc = selected && !selected.modelGlbUrl ? (selected.imageUrl || '') : ''
  const modelGlbUrl = selected && selected.modelGlbUrl ? selected.modelGlbUrl : ''

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
                <button className={`btn ${mode==='makeup'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='makeup'?mainColor:undefined, color: mode==='makeup'?'#fff':undefined }} onClick={() => setMode('makeup')}>Makeup</button>
                <button className={`btn ${mode==='hand'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='hand'?mainColor:undefined, color: mode==='hand'?'#fff':undefined }} onClick={() => setMode('hand')}><GiBigDiamondRing className="me-2"/>Hand</button>
                <button className={`btn ${mode==='feet'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='feet'?mainColor:undefined, color: mode==='feet'?'#fff':undefined }} onClick={() => setMode('feet')}><GiConverseShoe className="me-2"/>Feet</button>
                <button className={`btn ${mode==='body'?'btn':'btn-outline-primary'}`} style={{ backgroundColor: mode==='body'?mainColor:undefined, color: mode==='body'?'#fff':undefined }} onClick={() => setMode('body')}><GiWatch className="me-2"/>Body</button>
              </div>
            </div>
          </div>
          <div className="col-md-9">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', background: `linear-gradient(135deg, ${mainColor}15, ${secondaryColor}10)` }}>
              <div className="card-body">
                <div className="d-flex justify-content-center">
                  <TryOnBase
                    inline
                    width={900}
                    height={500}
                    mode={mode}
                    overlaySrc={overlaySrc}
                    modelGlbUrl={modelGlbUrl}
                    makeupColors={makeupColors}
                    makeupIntensity={makeupIntensity}
                    applyMakeup={applyMakeup}
                  />
                </div>
                {mode === 'makeup' && (
                  <div className="mt-3">
                    <div className="row g-3 align-items-end">
                      <div className="col-sm-4">
                        <label className="form-label small" style={{ color: mainColor }}>Lips Color</label>
                        <input type="color" className="form-control form-control-color" value={makeupColors.lips} onChange={(e) => setMakeupColors(v => ({ ...v, lips: e.target.value }))} />
                        <div className="mt-2">
                          <label className="form-label small" style={{ color: mainColor }}>Intensity</label>
                          <input type="range" className="form-range" min="0" max="100" step="5" value={Math.round((makeupIntensity.lips||0)*100)} onChange={(e) => setMakeupIntensity(v => ({ ...v, lips: Math.max(0, Math.min(1, Number(e.target.value)/100)) }))} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label small" style={{ color: mainColor }}>Eyes Color</label>
                        <input type="color" className="form-control form-control-color" value={makeupColors.eyes} onChange={(e) => setMakeupColors(v => ({ ...v, eyes: e.target.value }))} />
                        <div className="mt-2">
                          <label className="form-label small" style={{ color: mainColor }}>Intensity</label>
                          <input type="range" className="form-range" min="0" max="100" step="5" value={Math.round((makeupIntensity.eyes||0)*100)} onChange={(e) => setMakeupIntensity(v => ({ ...v, eyes: Math.max(0, Math.min(1, Number(e.target.value)/100)) }))} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label small" style={{ color: mainColor }}>Eyebrows Color</label>
                        <input type="color" className="form-control form-control-color" value={makeupColors.brows} onChange={(e) => setMakeupColors(v => ({ ...v, brows: e.target.value }))} />
                        <div className="mt-2">
                          <label className="form-label small" style={{ color: mainColor }}>Intensity</label>
                          <input type="range" className="form-range" min="0" max="100" step="5" value={Math.round((makeupIntensity.brows||0)*100)} onChange={(e) => setMakeupIntensity(v => ({ ...v, brows: Math.max(0, Math.min(1, Number(e.target.value)/100)) }))} />
                        </div>
                      </div>
                      <div className="col-sm-4">
                        <label className="form-label small" style={{ color: mainColor }}>Cheeks Glow</label>
                        <input type="color" className="form-control form-control-color" value={makeupColors.cheeks} onChange={(e) => setMakeupColors(v => ({ ...v, cheeks: e.target.value }))} />
                        <div className="mt-2">
                          <label className="form-label small" style={{ color: mainColor }}>Intensity</label>
                          <input type="range" className="form-range" min="0" max="100" step="5" value={Math.round((makeupIntensity.cheeks||0)*100)} onChange={(e) => setMakeupIntensity(v => ({ ...v, cheeks: Math.max(0, Math.min(1, Number(e.target.value)/100)) }))} />
                        </div>
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <button className="btn" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={() => setApplyMakeup(true)}>Apply</button>
                      {applyMakeup && (
                        <button className="btn btn-outline-secondary" onClick={() => setApplyMakeup(false)}>Clear</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {mode !== 'makeup' && (
              <div className="mt-3 card">
                <div className="card-body">
                  <div className="d-flex gap-3 overflow-auto">
                    {items.map((it) => (
                      <div key={it.id} className="text-center" style={{ minWidth: '160px' }}>
                        <div className="ratio ratio-4x3 bg-light rounded mb-2">
                          {it.imageUrl ? (
                            <img src={it.imageUrl} alt={it.title} className="w-100 h-100 object-fit-cover rounded" />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center text-muted">3D</div>
                          )}
                        </div>
                        <div className="small mb-2">{it.title}</div>
                        <div className="d-flex justify-content-center gap-2 mb-2">
                          {it.modelGlbUrl ? <span className="badge bg-light text-dark">3D</span> : <span className="badge bg-light text-dark">Image</span>}
                        </div>
                        <button className="btn btn-sm" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={() => setSelected(it)}>Try</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TryOnStudio
