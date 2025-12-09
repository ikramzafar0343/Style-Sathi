import React, { useState, useEffect, useRef } from 'react'
import {
  FaShoppingCart,
  FaUser,
  FaSignOutAlt,
  FaSearchPlus,
  FaSearchMinus,
  FaCheckCircle,
  FaArrowLeft,
  FaExpand,
  FaCompress
} from "react-icons/fa";
import { BsSearch } from "react-icons/bs";
import TryOnBase from './tryon/TryOnBase';
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { catalogApi, resolveAssetUrl } from '../services/api';

const mainColor = "#c4a62c";
const secondaryColor = "#2c67c4";

const ARProductViewer = ({ 
  product, 
  onClose, 
  onSelectProduct, 
  onAddToCart, 
  onNavigateToCart,
  onNavigateToProducts,
  onNavigateToHome,
  onNavigateToAccountSettings,
  onLogout,
  currentUser = {},
  cartItems = [],
  productsData = []
}) => {
  const [showTryOn, setShowTryOn] = useState(false);
  const [tryOnMode, setTryOnMode] = useState('body');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(product);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [modelError, setModelError] = useState(false);
  
  
  const profileDropdownRef = useRef(null);
  const viewerRef = useRef(null);
  const modelViewerRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const ensureModelViewer = () => {
    if (!document.querySelector('script[data-model-viewer]')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.dataset.modelViewer = '1';
      s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(s);
    }
  };

  

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [internalProducts, setInternalProducts] = useState(productsData);
  useEffect(() => {
    if (!productsData || productsData.length === 0) {
      (async () => {
        try {
          const list = await catalogApi.getProducts({});
          const mapped = (list || []).map(p => ({
            id: p.id,
            title: p.title || p.name,
            price: Number(p.price),
            imageUrl: resolveAssetUrl(p.image_url || (Array.isArray(p.images) ? p.images[0] : '') || p.image),
            modelGlbUrl: resolveAssetUrl(p.model_glb_url || ''),
            sketchfabEmbedUrl: p.sketchfab_embed_url || '',
            brand: p.brand,
            category: typeof p.category === 'string' ? p.category : (p.category?.name || ''),
            inStock: p.in_stock ?? (p.stock > 0),
            rating: Number(p.rating || 0)
          }));
          setInternalProducts(mapped);
        } catch {
          setInternalProducts([]);
        }
      })();
    }
    ensureModelViewer();
  }, [productsData]);

  const categories = [...new Set(internalProducts.map(p => {
    const cat = p.category;
    return typeof cat === 'string' ? cat : (cat?.name || '');
  }))].filter(Boolean);

  const getFilteredProducts = () => {
    if (!selectedCategory) return internalProducts;
    return internalProducts.filter(p => {
      const cat = p.category;
      const name = typeof cat === 'string' ? cat : (cat?.name || '');
      return name === selectedCategory;
    });
  };
  const displayedProducts = getFilteredProducts();

  const productData = selectedProduct || product || internalProducts[0];
  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;
    const onErr = () => setModelError(true);
    const onLoad = () => setModelError(false);
    mv.addEventListener('error', onErr);
    mv.addEventListener('load', onLoad);
    return () => { mv.removeEventListener('error', onErr); mv.removeEventListener('load', onLoad); };
  }, [productData && (productData.modelGlbUrl || productData.model_glb_url)]);
  const userName = currentUser?.name || currentUser?.username || 'Customer';
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const sketchfabUrl = (
    (productData && (productData.sketchfabEmbedUrl || productData.sketchfab_embed_url))
    || (typeof window !== 'undefined' && window.SKETCHFAB_EMBED_URL)
    || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SKETCHFAB_EMBED)
    || ''
  );

  const handleMouseMove = (e) => {
    if (!viewerRef.current) return;
    const rect = viewerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setRotation({ x: y * 30, y: -x * 30 });
  };
  const handleMouseLeave = () => setRotation({ x: 0, y: 0 });
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const toggleFullscreen = async () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) await viewerRef.current.requestFullscreen();
    else await document.exitFullscreen();
  };

  const handleAddToCart = () => {
    if (!selectedProduct && !product) return;
    const productToAdd = {
      ...productData,
      id: productData.id,
      name: productData.title,
      price: productData.price,
      imageUrl: productData.imageUrl,
      size: selectedSize || 'N/A',
      brand: productData.brand,
      quantity: 1
    };
    onAddToCart && onAddToCart(productToAdd, 1);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleProductSelect = (prod) => {
    setSelectedProduct(prod);
    onSelectProduct && onSelectProduct(prod);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      if (onNavigateToProducts) onNavigateToProducts(q);
      else if (onNavigateToHome) onNavigateToHome();
    }
  };

  const sizes = ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10'];

  return (
    <div className="container-fluid vh-100 p-0 bg-light">
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <img
                src={styleSathiLogo}
                alt="STYLE SATHI"
                style={{ height: '40px', cursor: 'pointer' }}
                onClick={() => {
                  if (onNavigateToHome) onNavigateToHome();
                  else if (onNavigateToProducts) onNavigateToProducts(null);
                  else if (onClose) onClose();
                }}
              />
            </div>
            <div className="col-md-6">
              <div className="position-relative">
                <input
                  className="form-control ps-5 py-2"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  style={{ borderColor: mainColor, borderRadius: '25px', fontSize: '0.9rem' }}
                />
                <BsSearch className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: mainColor }} />
              </div>
            </div>
            <div className="col-md-3">
              <div className="d-flex align-items-center justify-content-end gap-4">
                <div className="position-relative cursor-pointer hover-scale" onClick={onNavigateToCart} style={{ transition: 'transform 0.2s' }}>
                  <FaShoppingCart style={{ fontSize: "24px", color: mainColor }} />
                  {cartCount > 0 && (
                    <span className="badge rounded-pill position-absolute top-0 start-100 translate-middle" style={{ backgroundColor: secondaryColor, color: 'white', fontSize: '0.7rem', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {cartCount}
                    </span>
                  )}
                </div>
                <div className="position-relative" ref={profileDropdownRef}>
                  <div className="d-flex align-items-center gap-2 cursor-pointer hover-scale" onClick={() => setShowProfileDropdown(!showProfileDropdown)} style={{ transition: 'transform 0.2s' }}>
                    <div className="rounded-circle d-flex align-items-center justify-content-center border" style={{ width: "45px", height: "45px", backgroundColor: mainColor + "20", borderColor: mainColor + "50" }}>
                      <FaUser style={{ color: mainColor, fontSize: '18px' }} />
                    </div>
                    <div className="d-none d-md-block">
                      <span style={{ color: mainColor, fontWeight: '500' }}>{userName}</span>
                    </div>
                  </div>
                  {showProfileDropdown && (
                    <div className="position-absolute bg-white shadow rounded end-0 mt-2 py-2" style={{ minWidth: '160px', zIndex: 1000, border: `1px solid ${mainColor}20` }}>
                      <button className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2" style={{ color: mainColor, fontSize: '0.9rem' }} onClick={() => { onNavigateToAccountSettings && onNavigateToAccountSettings(); setShowProfileDropdown(false); }}>
                        <FaUser size={14} /> Profile
                      </button>
                      <button className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2" style={{ color: '#dc3545', fontSize: '0.9rem' }} onClick={() => { onLogout && onLogout(); setShowProfileDropdown(false); }}>
                        <FaSignOutAlt size={14} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="row h-100 m-0" style={{ marginTop: '0px' }}>
        <div className="col-md-3 p-4 border-end bg-white overflow-auto">
          {!product && !selectedProduct ? (
            <div>
              <h2 className="h5 fw-bold mb-3" style={{ color: mainColor }}>Select a Product</h2>
              <p className="small mb-3" style={{ color: secondaryColor }}>Choose a product to try in AR</p>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: mainColor }}>Filter by Category</label>
                <select value={selectedCategory || ''} onChange={(e) => setSelectedCategory(e.target.value || null)} className="form-select" style={{ borderColor: mainColor, color: secondaryColor }}>
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{String(cat)}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-auto" style={{maxHeight: 'calc(100vh - 300px)'}}>
                {displayedProducts.length > 0 ? (
                  displayedProducts.map((prod) => (
                    <div key={prod.id} className="card mb-3 cursor-pointer border-0 shadow-sm" onClick={() => handleProductSelect(prod)} style={{ cursor: 'pointer', borderLeft: `4px solid ${mainColor}` }}>
                      <div className="card-body">
                        <div className="d-flex">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.title} className="rounded me-3" style={{ width: '60px', height: '60px', objectFit: 'cover', border: `2px solid ${secondaryColor}30` }} />
                          ) : (
                            <div className="rounded me-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', backgroundColor: `${secondaryColor}20`, border: `2px solid ${secondaryColor}30` }}>
                              <FaSearchPlus style={{ color: secondaryColor }} />
                            </div>
                          )}
                          <div className="flex-grow-1">
                            <h6 className="card-title mb-1 fw-bold" style={{ color: mainColor }}>{prod.title}</h6>
                            <p className="card-text small mb-1" style={{ color: secondaryColor }}>{prod.brand}</p>
                            <p className="card-text small mb-1" style={{ color: secondaryColor }}>{typeof prod.category === 'string' ? prod.category : (prod.category?.name || 'N/A')}</p>
                            <p className="card-text fw-bold" style={{ color: mainColor }}>${prod.price}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4" style={{ color: secondaryColor }}>
                    <p>No products found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <small style={{ color: secondaryColor }}>Category</small>
                <p className="fw-semibold mb-0" style={{ color: mainColor }}>
                  {typeof productData.category === 'string' ? productData.category : (productData.category?.name || 'N/A')}
                </p>
              </div>
              <div className="mb-4">
                <h2 className="h4 fw-bold" style={{ color: mainColor }}>{productData.title || 'Unknown Product'}</h2>
                <p className="h5 fw-bold mb-3" style={{ color: secondaryColor }}>${productData.price || '0'}</p>
              </div>
              <div className="mb-4">
                <small style={{ color: secondaryColor }}>Brand</small>
                <p className="fw-semibold" style={{ color: mainColor }}>{productData.brand || 'N/A'}</p>
              </div>
              <div className="mb-4">
                <small style={{ color: secondaryColor }}>Rating</small>
                <p className="fw-semibold" style={{ color: mainColor }}>{productData.rating}/5</p>
              </div>
              {productData.imageUrl && (
                <div className="mb-4">
                  <img src={resolveAssetUrl(productData.imageUrl)} alt={productData.title || 'Product'} className="img-fluid rounded border" style={{ borderColor: `${mainColor}30` }} onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=styleSathiLogo; }} />
                </div>
              )}
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ color: mainColor }}>Size</label>
                <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} className="form-select" style={{ borderColor: mainColor, color: secondaryColor }}>
                  <option value="">Select Size</option>
                  {sizes.map((size) => (<option key={size} value={size}>{size}</option>))}
                </select>
              </div>
              {!product && (
                <button onClick={() => setSelectedProduct(null)} className="btn w-100 mb-3 fw-semibold" style={{ backgroundColor: 'transparent', color: mainColor, border: `2px solid ${mainColor}` }}>
                  Select Different Product
                </button>
              )}
              <button onClick={handleAddToCart} disabled={!selectedProduct && !product} className="btn w-100 py-2 fw-semibold" style={{ backgroundColor: mainColor, color: 'white', border: 'none' }}>
                Add to Cart
              </button>
            </>
          )}
        </div>

        <div className="col-md-6 p-0 bg-dark position-relative">
          <div className="position-absolute top-0 start-0 w-100 p-3 z-3">
            <div className="d-flex align-items-center justify-content-between">
              <button onClick={onClose} className="btn btn-outline-light d-flex align-items-center gap-2">
                <FaArrowLeft /> Exit AR
              </button>
              <div className="d-flex align-items-center gap-3">
                <button onClick={toggleFullscreen} className="btn btn-outline-light d-flex align-items-center gap-2">
                  {isFullscreen ? <FaCompress /> : <FaExpand />} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </div>
            </div>
          </div>

          <div ref={viewerRef} className="ar-viewer w-100 h-100 d-flex align-items-center justify-content-center" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={{ cursor: 'grab', transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${scale})`, transition: 'transform 0.1s ease-out' }}>
            {selectedProduct || product ? (
              <div className="text-center text-white w-100">
                {sketchfabUrl ? (
                  <iframe title="Sketchfab AR" frameBorder="0" allowFullScreen mozallowfullscreen="true" webkitallowfullscreen="true" allow="autoplay; fullscreen; xr-spatial-tracking" xr-spatial-tracking="" execution-while-out-of-viewport="" execution-while-not-rendered="" web-share="" src={String(sketchfabUrl)} style={{ width: '100%', height: '60vh', border: '0' }}></iframe>
                ) : (productData?.modelGlbUrl && !modelError) ? (
                  <model-viewer ref={modelViewerRef} src={resolveAssetUrl(productData.modelGlbUrl)} ar ar-modes="webxr scene-viewer quick-look" camera-controls style={{ width: '100%', height: '60vh' }}></model-viewer>
                ) : productData.imageUrl ? (
                  <div className="position-relative">
                    <img src={resolveAssetUrl(productData.imageUrl)} alt={productData.title || 'Product'} className="img-fluid rounded" style={{ maxHeight: '60vh', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))', transform: `scale(${scale})`, transition: 'transform 0.2s ease' }} onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=styleSathiLogo; }} />
                  </div>
                ) : (
                  <div className="mb-5">
                    <div className="rounded d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '200px', height: '200px', backgroundColor: `${mainColor}20`, border: `2px solid ${mainColor}50` }}>
                      <FaSearchPlus style={{ color: mainColor, fontSize: '2rem' }} />
                    </div>
                    <div className="h5 mb-2" style={{ color: mainColor }}>{productData.title || 'Unknown Product'}</div>
                  </div>
                )}

                <div className="position-absolute bottom-0 end-0 m-3">
                  <div className="btn-group-vertical">
                    <button onClick={handleZoomIn} className="btn btn-light btn-sm">+</button>
                    <button onClick={handleZoomOut} className="btn btn-light btn-sm">-</button>
                  </div>
                </div>

                <div className="position-absolute bottom-0 start-0 m-3">
                  <div className="card bg-dark bg-opacity-50 border-light">
                    <div className="card-body p-3">
                      <small className="text-light">
                        <strong>AR Controls:</strong><br />
                        • Move mouse to rotate product<br />
                        • Use +/- to zoom<br />
                        • Fullscreen for immersive experience
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="h5 mb-2" style={{ color: secondaryColor }}>No Product Selected</div>
                <div className="opacity-75" style={{ color: mainColor }}>Select a product from the left panel to try in AR</div>
              </div>
            )}
          </div>
        </div>

        <div className="col-md-3 p-4 bg-white border-start">
          <div className="mb-4">
            <h6 className="fw-bold text-uppercase small mb-3" style={{ color: mainColor }}>TRY ON</h6>
            <div className="d-grid gap-2">
              <button onClick={() => { setTryOnMode('face'); setShowTryOn(true); }} className="btn fw-semibold" style={{ backgroundColor: mainColor, color: '#fff' }}>Try On Face</button>
              <button onClick={() => { setTryOnMode('hand'); setShowTryOn(true); }} className="btn fw-semibold" style={{ backgroundColor: mainColor, color: '#fff' }}>Try On Hand</button>
              <button onClick={() => { setTryOnMode('wrist'); setShowTryOn(true); }} className="btn fw-semibold" style={{ backgroundColor: mainColor, color: '#fff' }}>Try On Wrist</button>
              <button onClick={() => { setTryOnMode('feet'); setShowTryOn(true); }} className="btn fw-semibold" style={{ backgroundColor: mainColor, color: '#fff' }}>Try On Feet</button>
              <button onClick={() => { setTryOnMode('body'); setShowTryOn(true); }} className="btn fw-semibold" style={{ backgroundColor: mainColor, color: '#fff' }}>Try On Body</button>
            </div>
          </div>

          <div className="mb-4">
            <h6 className="fw-bold text-uppercase small mb-3" style={{ color: mainColor }}>ZOOM</h6>
            <div className="d-grid gap-2">
              <button onClick={handleZoomOut} className="btn d-flex align-items-center justify-content-center fw-semibold border" style={{ color: mainColor, borderColor: mainColor }}>
                <FaSearchMinus className="me-2" />
                <span>Zoom Out</span>
              </button>
              <button onClick={handleZoomIn} className="btn d-flex align-items-center justify-content-center fw-semibold border" style={{ color: mainColor, borderColor: mainColor }}>
                <FaSearchPlus className="me-2" />
                <span>Zoom In</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-top">
            <div className="d-flex align-items-center mb-2">
              <FaCheckCircle style={{ color: secondaryColor }} className="me-2" />
              <span className="small" style={{ color: mainColor }}>AR Ready</span>
            </div>
          </div>
        </div>
      </div>

      {showTryOn && (
        <TryOnBase
          overlaySrc={(productData?.modelGlbUrl || productData?.model_glb_url) ? '' : resolveAssetUrl(productData?.imageUrl || productData?.image_url || (Array.isArray(productData?.images) ? productData.images[0] : ''))}
          modelGlbUrl={resolveAssetUrl(productData?.modelGlbUrl || productData?.model_glb_url || '')}
          mode={tryOnMode}
          onClose={() => setShowTryOn(false)}
        />
      )}

      {showSuccess && (
        <div className="position-fixed bottom-0 end-0 m-4">
          <div className="toast show border-0 shadow" role="alert" style={{ borderLeft: `4px solid ${mainColor}` }}>
            <div className="toast-header text-white border-0" style={{ backgroundColor: mainColor }}>
              <FaCheckCircle className="me-2" />
              <strong className="me-auto">Success</strong>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowSuccess(false)}></button>
            </div>
            <div className="toast-body">
              <strong style={{ color: mainColor }}>{productData.title || 'Product'}</strong> added to cart!
              {onNavigateToCart && (
                <div className="mt-2">
                  <button className="btn btn-sm" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={onNavigateToCart}>View Cart</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ar-viewer:active { cursor: grabbing; }
      `}</style>
    </div>
  );
};

export default ARProductViewer;
