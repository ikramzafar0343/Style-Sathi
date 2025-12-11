// src/components/ProductDetailPage.jsx
import { useState, useEffect } from "react";
import {
  FaShoppingCart,
  FaUser,
  FaSignOutAlt,
  FaSearchPlus,
  FaFacebookF,
  FaTwitter,
  FaSearch,
  FaInstagram,
  FaLinkedin,
  FaHeart,
  FaShare,
  FaTruck,
  FaShieldAlt,
  FaArrowLeft,
} from "react-icons/fa";
import { BsSearch, BsStarFill } from "react-icons/bs";
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { catalogApi, resolveAssetUrl, getProductImageUrl } from '../services/api';

const ProductDetailPage = ({ 
  productId, 
  product: initialProduct,
  currentUser,
  onNavigateBack, 
  onNavigateToCart, 
  onNavigateToAccountSettings, 
  onNavigateToVR,
  onNavigateToAR,
  onNavigateToCheckout,
  onAddToCart,
  onLogout 
}) => {
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedImage, setSelectedImage] = useState(0);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [cartCount, setCartCount] = useState(3);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";

  const userName = (currentUser?.name || currentUser?.username || 'Customer');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (initialProduct) {
        if (mounted) {
          setProduct(initialProduct);
          const initial = Array.isArray(initialProduct?.reviews) ? initialProduct.reviews : [];
          setReviews(initial);
        }
        return;
      }
      const numericId = Number(productId);
      if (Number.isFinite(numericId)) {
        try {
          const p = await catalogApi.getProduct(numericId);
          if (mounted) {
            setProduct(p);
            const initial = Array.isArray(p?.reviews) ? p.reviews : [];
            setReviews(initial);
          }
        } catch {
          if (mounted) setProduct(null);
        }
      } else {
        if (mounted) setProduct(null);
      }
    };
    load();
    return () => { mounted = false };
  }, [productId, initialProduct]);

  const ensureModelViewer = () => {
    if (!document.querySelector('script[data-model-viewer]')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.dataset.modelViewer = '1';
      s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(s);
    }
  };

  useEffect(() => { ensureModelViewer(); }, []);

  

  // Generate product images array
  const mainImage = product ? getProductImageUrl(product) : null;
  const productImages = product
    ? (Array.isArray(product.images) && product.images.length > 0
        ? product.images.map((u) => resolveAssetUrl(u)).filter(Boolean)
        : (mainImage ? [mainImage] : []))
    : [];

  const thumbnails = productImages.map((imageUrl, index) => ({
    id: index + 1,
    label: ['Front View', 'Side View', 'Top View', 'Detail View'][index] || 'View',
    imageUrl: resolveAssetUrl(imageUrl)
  }));

  const sizes = ['6', '6.5', '7', '7.5', '8', '8.5', '9'];

  const handleAddToCart = () => {
    if (onAddToCart && product) {
      onAddToCart(product, quantity);
    }
    setShowAddToCartModal(true);
    setCartCount(prev => prev + quantity);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => {
      onNavigateToCheckout && onNavigateToCheckout();
    }, 1000);
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <BsStarFill 
        key={i} 
        style={{ 
          color: i < Math.floor(rating) ? mainColor : '#e0e0e0',
          fontSize: '16px'
        }} 
      />
    ));
  };

  const renderInteractiveStars = (rating, onRate) => {
    return [...Array(5)].map((_, i) => (
      <BsStarFill 
        key={i} 
        style={{ 
          color: i < Math.floor(rating) ? mainColor : '#e0e0e0',
          fontSize: '16px',
          cursor: 'pointer'
        }} 
        onClick={() => onRate(i + 1)}
      />
    ));
  };
  
  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      onNavigateBack && onNavigateBack();
    }
  };

  const submitProductReview = () => {
    const text = reviewText.trim();
    if (!text || !product) return;
    const newReview = {
      id: Date.now(),
      user: (currentUser?.name || currentUser?.username || 'Customer'),
      text,
      rating: reviewRating,
      date: new Date().toISOString()
    };
    setReviews(prev => [newReview, ...prev]);
    setReviewText('');
    setReviewRating(0);
  };

  // Loading state
  if (!product) {
    return (
      <div className="min-h-screen bg-light d-flex justify-content-center align-items-center">
        <div className="spinner-border" style={{ color: mainColor }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Generate product specifications from product data
  const productSpecifications = {
    Brand: product.brand,
    Category: typeof product.category === 'string' ? product.category : (product.category?.name || 'N/A'),
    Material: Array.isArray(product.features)
      ? (typeof product.features?.[0] === 'string'
          ? product.features[0]
          : (product.features?.[0]?.name || product.features?.[0]?.label || 'Premium Materials'))
      : 'Premium Materials',
    'In Stock': product.in_stock ? 'Yes' : 'No',
    Rating: `${product.rating || 0}/5`,
    'Warranty': 'Lifetime',
    'Shipping': 'Free Worldwide',
  };

  // Related products (excluding current product)
  const relatedProducts = [];

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <header className="sticky-top bg-white border-bottom shadow-sm" style={{ zIndex: 1030 }}>
        <div className="container py-3">
          <div className="row align-items-center">
            {/* LOGO & BACK BUTTON */}
            <div className="col-md-3">
              <div className="d-flex align-items-center gap-3">
                <button
                  onClick={onNavigateBack}
                  className="btn btn-outline-secondary d-flex align-items-center gap-2"
                  style={{ borderColor: mainColor, color: mainColor }}
                >
                  <FaArrowLeft /> Back
                </button>
                <img
                  src={styleSathiLogo}
                  alt="STYLE SATHI"
                  className="d-none d-md-block"
                  style={{ height: '36px', cursor: 'pointer' }}
                  onClick={onNavigateBack}
                />
              </div>
            </div>

            {/* SEARCH */}
            <div className="col-md-6">
              <div className="position-relative">
                <input
                  className="form-control ps-5 py-2"
                  placeholder="Search rings, glasses, watches, shoes, cap/hat, hairs, makeup, jewelry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKey}
                  style={{ 
                    borderColor: mainColor, 
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                />
                <FaSearch
                  className="position-absolute top-50 start-0 translate-middle-y ms-3"
                  style={{ color: mainColor, fontSize: '14px' }}
                />
              </div>
            </div>

            {/* CART + PROFILE */}
            <div className="col-md-3">
              <div className="d-flex align-items-center justify-content-end gap-4">
                {/* CART */}
                <div
                  className="position-relative cursor-pointer"
                  onClick={onNavigateToCart}
                  style={{ transition: 'transform 0.2s' }}
                >
                  <FaShoppingCart style={{ fontSize: "24px", color: mainColor }} />
                  {cartCount > 0 && (
                    <span 
                      className="badge rounded-pill position-absolute top-0 start-100 translate-middle"
                      style={{ 
                        backgroundColor: secondaryColor, 
                        color: 'white',
                        fontSize: '0.7rem',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {cartCount}
                    </span>
                  )}
                </div>

                {/* PROFILE */}
                <div className="position-relative">
                  <div
                    className="d-flex align-items-center gap-2 cursor-pointer"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    style={{ transition: 'transform 0.2s' }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center border"
                      style={{
                        width: "45px",
                        height: "45px",
                        backgroundColor: mainColor + "20",
                        borderColor: mainColor + "50",
                      }}
                    >
                      <FaUser style={{ color: mainColor, fontSize: '18px' }} />
                    </div>

                    <div className="d-none d-md-block">
                      <span style={{ color: mainColor, fontWeight: '500' }}>
                        {userName}
                      </span>
                    </div>
                  </div>

                  {showProfileDropdown && (
                    <div 
                      className="position-absolute bg-white shadow rounded end-0 mt-2 py-2"
                      style={{ 
                        minWidth: '160px',
                        zIndex: 1040,
                        border: `1px solid ${mainColor}20`
                      }}
                    >
                      <button
                        className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
                        style={{ color: mainColor, fontSize: '0.9rem' }}
                        onClick={onNavigateToAccountSettings}
                      >
                        <FaUser size={14} /> Profile
                      </button>

                      <button
                        className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
                        style={{ color: '#dc3545', fontSize: '0.9rem' }}
                        onClick={onLogout}
                      >
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

      {/* Main Content */}
      <div className="container py-5">
        <div className="row">
          {/* Left Side - Product Images */}
          <div className="col-lg-6 mb-5">
            {/* Main Image */}
            <div 
              className="rounded-4 mb-4 position-relative overflow-hidden"
              style={{ 
                height: '500px', 
                backgroundColor: '#f8f9fa',
                border: `2px solid ${mainColor}20`
              }}
            >
              {product?.model_glb_url ? (
                <model-viewer src={resolveAssetUrl(product.model_glb_url)} ar camera-controls auto-rotate style={{ width: '100%', height: '100%' }}></model-viewer>
              ) : (
                <img
                  src={thumbnails[selectedImage]?.imageUrl}
                  alt={product.title}
                  className="w-100 h-100 object-fit-contain p-4"
                  style={{ transition: 'transform 0.3s ease' }}
                  onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                />
              )}
              {product.originalPrice && (
                <div 
                  className="position-absolute top-3 end-3 px-3 py-1 rounded-pill"
                  style={{ 
                    backgroundColor: mainColor, 
                    color: 'white',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}
                >
                  {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="row g-3">
              {thumbnails.map((thumb, index) => (
                <div className="col-3" key={thumb.id}>
                  <div
                    onClick={() => setSelectedImage(index)}
                    className={`rounded-3 cursor-pointer border-3 overflow-hidden ${
                      selectedImage === index
                        ? 'border-warning'
                        : 'border-light'
                    }`}
                    style={{ 
                      height: '100px',
                      backgroundColor: '#f8f9fa',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = mainColor;
                    }}
                    onMouseLeave={(e) => {
                      if (selectedImage !== index) {
                        e.currentTarget.style.borderColor = '#f8f9fa';
                      }
                    }}
                  >
                    <img
                      src={thumb.imageUrl}
                      alt={thumb.label}
                      className="w-100 h-100 object-fit-cover"
                      style={{ 
                        filter: selectedImage === index ? 'none' : 'grayscale(20%)',
                        opacity: selectedImage === index ? 1 : 0.7
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Product Info */}
          <div className="col-lg-6">
            {/* Breadcrumb */}
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <button className="btn btn-link p-0 text-decoration-none" style={{ color: mainColor }} onClick={onNavigateBack}>
                    Home
                  </button>
                </li>
                <li className="breadcrumb-item">
                  <button className="btn btn-link p-0 text-decoration-none" style={{ color: mainColor }} onClick={onNavigateBack}>
                    {typeof product.category === 'string' ? product.category : (product.category?.name || 'Category')}
                  </button>
                </li>
                <li className="breadcrumb-item active">{product.title}</li>
              </ol>
            </nav>

            {/* Product Title */}
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h1 className="fw-bold" style={{ color: mainColor, fontSize: '2rem' }}>
                {product.title}
              </h1>
              <div className="d-flex gap-2">
                <button 
                  className={`btn btn-lg ${isWishlisted ? 'text-danger' : 'text-muted'}`}
                  onClick={handleWishlist}
                >
                  <FaHeart />
                </button>
                <button className="btn btn-lg text-muted">
                  <FaShare />
                </button>
              </div>
            </div>

            {/* Rating and Reviews */}
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="d-flex align-items-center gap-2">
                <div className="d-flex gap-1">
                  {renderStars(product.rating)}
                </div>
                <span className="fw-semibold" style={{ color: mainColor }}>
                  {product.rating}
                </span>
              </div>
              <span className="text-muted">•</span>
              <span className="text-muted">128 reviews</span>
              <span className="text-muted">•</span>
              <span className={product.inStock ? "text-success" : "text-danger"}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="d-flex align-items-center gap-3 mb-2">
                <span className="fw-bold display-6" style={{ color: secondaryColor }}>
                  ${product.price}
                </span>
                {product.originalPrice && (
                  <span className="fs-4 text-muted text-decoration-line-through">
                    ${product.originalPrice}
                  </span>
                )}
              </div>
              <p className="text-success mb-0">
                <FaTruck className="me-2" /> Free Shipping & Returns
              </p>
            </div>

            {/* Size Selection */}
            <div className="mb-4">
              <label className="form-label fw-semibold" style={{ color: mainColor }}>
                Select Size
              </label>
              <div className="d-flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`btn ${selectedSize === size ? '' : 'btn-outline-secondary'}`}
                    style={{ 
                      backgroundColor: selectedSize === size ? mainColor : 'transparent',
                      color: selectedSize === size ? 'white' : mainColor,
                      borderColor: mainColor,
                      minWidth: '60px'
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="form-label fw-semibold" style={{ color: mainColor }}>
                Quantity
              </label>
              <div className="d-flex align-items-center gap-3">
                <div className="input-group" style={{ width: '140px' }}>
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <input 
                    type="text" 
                    className="form-control text-center" 
                    value={quantity}
                    readOnly
                  />
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <span className="text-muted">Only 5 left in stock</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="row g-3 mb-4">
              <div className="col-6">
                <button 
                  onClick={handleBuyNow}
                  className="btn w-100 py-3 fw-semibold border-0"
                  style={{ 
                    backgroundColor: mainColor, 
                    color: '#fff',
                    borderRadius: '15px',
                    fontSize: '1.1rem'
                  }}
                  disabled={!selectedSize || !product.inStock}
                >
                  Buy Now
                </button>
              </div>
              <div className="col-6">
                <button
                  onClick={handleAddToCart}
                  className="btn w-100 py-3 fw-semibold"
                  style={{ 
                    border: `2px solid ${mainColor}`, 
                    color: mainColor,
                    borderRadius: '15px',
                    backgroundColor: 'transparent',
                    fontSize: '1.1rem'
                  }}
                  disabled={!selectedSize || !product.inStock}
                >
                  Add to Cart
                </button>
              </div>
            </div>

            {/* AR Try-On Button */}
            <button
              onClick={() => (typeof onNavigateToAR === 'function' ? onNavigateToAR(product) : (onNavigateToVR && onNavigateToVR(product)))}
              className="btn w-100 py-3 mb-4 d-flex align-items-center justify-content-center gap-2 fw-semibold"
              style={{ 
                border: `2px solid ${secondaryColor}`, 
                color: secondaryColor,
                borderRadius: '15px',
                backgroundColor: 'transparent'
              }}
            >
              <FaSearchPlus /> Try On (AR)
            </button>

            {/* Key Features */}
            <div className="mb-4 p-4 rounded-3" style={{ backgroundColor: mainColor + '10', border: `1px solid ${mainColor}20` }}>
              <h6 className="fw-bold mb-3" style={{ color: mainColor }}>Key Features</h6>
              <div className="row g-3">
                {product.features.map((feature, index) => (
                  <div className="col-6" key={index}>
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center"
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          backgroundColor: mainColor,
                          color: 'white',
                          fontSize: '10px'
                        }}
                      >
                        ✓
                      </div>
                      <small>{typeof feature === 'string' ? feature : (feature?.name || feature?.label || String(feature))}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mb-4">
              <div className="row g-3">
                <div className="col-6">
                  <div className="d-flex align-items-center gap-2 text-muted">
                    <FaTruck />
                    <small>Free shipping</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex align-items-center gap-2 text-muted">
                    <FaShieldAlt />
                    <small>2-year warranty</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Tabs */}
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                <ul className="nav nav-tabs border-bottom" style={{ borderColor: mainColor + '20' }}>
                  {[
                    { id: 'description', label: 'Description', icon: 'bi-file-text' },
                    { id: 'specifications', label: 'Specifications', icon: 'bi-list-ul' },
                    { id: 'reviews', label: 'Reviews', icon: 'bi-star' },
                    { id: 'shipping', label: 'Shipping', icon: 'bi-truck' },
                  ].map((tab) => (
                    <li className="nav-item" key={tab.id}>
                      <button
                        className={`nav-link py-3 px-4 border-0 ${
                          activeTab === tab.id 
                            ? 'fw-bold active' 
                            : 'text-muted'
                        }`}
                        style={{ 
                          color: activeTab === tab.id ? mainColor : '',
                          backgroundColor: activeTab === tab.id ? mainColor + '10' : 'transparent',
                          borderBottom: activeTab === tab.id ? `3px solid ${mainColor}` : 'none'
                        }}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="p-4">
                  {activeTab === 'description' && (
                    <div>
                      <h6 className="fw-bold mb-3" style={{ color: mainColor }}>Product Description</h6>
                      <p className="text-muted" style={{ lineHeight: '1.8' }}>
                        {product.description}
                      </p>
                    </div>
                  )}

                  {activeTab === 'specifications' && (
                    <div>
                      <h6 className="fw-bold mb-3" style={{ color: mainColor }}>Product Specifications</h6>
                      <div className="row">
                        {Object.entries(productSpecifications).map(([key, value]) => (
                          <div key={key} className="col-md-6 mb-3">
                            <div className="d-flex justify-content-between border-bottom pb-2">
                              <span className="fw-semibold text-muted">{key}:</span>
                              <span style={{ color: mainColor }}>{value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h6 className="fw-bold mb-0" style={{ color: mainColor }}>Customer Reviews</h6>
                      </div>
                      {reviews.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <p>No reviews yet</p>
                        </div>
                      ) : (
                        <div className="mb-4">
                          {reviews.map((rev) => (
                            <div key={rev.id} className="d-flex align-items-start gap-3 mb-3">
                              <div className="flex-shrink-0">
                                {renderStars(rev.rating || 0)}
                              </div>
                              <div>
                                <div className="small text-muted">{rev.user}</div>
                                <div className="small">{rev.text}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="border rounded p-3">
                        <div className="mb-2 fw-semibold" style={{ color: mainColor }}>Add your review</div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          {renderInteractiveStars(reviewRating, setReviewRating)}
                          <small className="text-muted">Your rating</small>
                        </div>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Share your thoughts"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            style={{ borderColor: mainColor }}
                          />
                          <button
                            className="btn"
                            style={{ backgroundColor: mainColor, color: '#fff' }}
                            onClick={submitProductReview}
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'shipping' && (
                    <div>
                      <h6 className="fw-bold mb-3" style={{ color: mainColor }}>Shipping & Returns</h6>
                      <div className="row g-4">
                        <div className="col-md-6">
                          <div className="d-flex align-items-start gap-3">
                            <FaTruck style={{ color: mainColor, fontSize: '1.5rem' }} />
                            <div>
                              <h6 className="fw-bold">Free Shipping</h6>
                              <p className="text-muted mb-0">Standard delivery in 3-5 business days</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-start gap-3">
                            <i className="bi bi-arrow-left-right" style={{ color: mainColor, fontSize: '1.5rem' }}></i>
                            <div>
                              <h6 className="fw-bold">Easy Returns</h6>
                              <p className="text-muted mb-0">30-day return policy with free returns</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-start gap-3">
                            <FaShieldAlt style={{ color: mainColor, fontSize: '1.5rem' }} />
                            <div>
                              <h6 className="fw-bold">Secure Packaging</h6>
                              <p className="text-muted mb-0">Luxury packaging with insurance</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-start gap-3">
                            <i className="bi bi-gem" style={{ color: mainColor, fontSize: '1.5rem' }}></i>
                            <div>
                              <h6 className="fw-bold">Free Resizing</h6>
                              <p className="text-muted mb-0">One-time free resizing within 60 days</p>
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

        {/* You May Also Like Section */}
        <section className="mt-5 pt-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold" style={{ color: mainColor }}>You May Also Like</h3>
            <button className="btn btn-link p-0 text-decoration-none" style={{ color: mainColor }}>
              View All <i className="bi bi-arrow-right"></i>
            </button>
          </div>

          <div className="row g-4">
            {relatedProducts.map((relatedProduct) => (
              <div className="col-md-3" key={relatedProduct.id}>
                <div 
                  className="card border-0 shadow-sm h-100"
                  style={{
                    transition: 'all 0.3s ease',
                    borderRadius: '15px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = `0 10px 30px ${mainColor}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                  onClick={() => window.location.href = `/product/${relatedProduct.id}`}
                >
                  <div 
                    className="card-img-top position-relative overflow-hidden"
                    style={{ 
                      height: '200px',
                      backgroundColor: '#f8f9fa',
                      borderTopLeftRadius: '15px',
                      borderTopRightRadius: '15px'
                    }}
                  >
                    <img
                      src={relatedProduct.imageUrl}
                      alt={relatedProduct.title}
                      className="w-100 h-100 object-fit-contain p-3"
                      style={{ transition: 'transform 0.3s ease' }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                      }}
                    />
                  </div>
                  <div className="card-body">
                    <p className="small text-muted mb-1">{relatedProduct.brand}</p>
                    <h6 className="fw-semibold mb-2" style={{ color: mainColor }}>
                      {relatedProduct.title}
                    </h6>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="d-flex gap-1">
                        {renderStars(relatedProduct.rating)}
                      </div>
                      <small className="text-muted">({relatedProduct.rating})</small>
                    </div>
                    <p className="h5 fw-bold mb-0" style={{ color: secondaryColor }}>
                      ${relatedProduct.price}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="bg-dark text-white py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-3 col-md-6 mb-4">
              <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '36px' }} />
              <p className="text-light opacity-75">
                Your trusted partner in fashion and lifestyle. We bring you the latest trends with quality and style.
              </p>
              <div className="d-flex gap-3 mt-3">
                {[FaFacebookF, FaTwitter, FaInstagram, FaLinkedin].map(
                  (Icon, i) => (
                    <div
                      key={i}
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: mainColor + "20",
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = mainColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = mainColor + "20";
                      }}
                    >
                      <Icon style={{ color: mainColor }} />
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">QUICK LINKS</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Home</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Shop</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>New Arrivals</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={() => (typeof onNavigateToAR === 'function' ? onNavigateToAR() : (onNavigateToVR && onNavigateToVR()))}>AR Try-On</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">CUSTOMER CARE</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Contact Us</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">FAQ</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Shipping Info</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Returns</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Size Guide</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">LEGAL</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Privacy Policy</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Terms of Service</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Cookie Policy</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Refund Policy</button>
              </div>
            </div>
          </div>

          <div className="text-center mt-5 pt-3 border-top border-secondary">
            <p className="text-light opacity-75 mb-0">
              © 2024 STYLE SATHI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Add to Cart Modal */}
      {showAddToCartModal && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAddToCartModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content rounded-4">
              <div className="modal-header border-0">
                <div className="d-flex align-items-center gap-2">
                  <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '24px' }} />
                  <h5 className="modal-title fw-bold" style={{ color: mainColor }}>
                    Added to Cart!
                  </h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddToCartModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Added <strong>{quantity} x {product.title}</strong> to your cart!</p>
                <div className="d-flex gap-2">
                  <button 
                    className="btn flex-fill"
                    style={{ 
                      backgroundColor: mainColor, 
                      color: '#fff'
                    }}
                    onClick={() => {
                      setShowAddToCartModal(false);
                      onNavigateToCart && onNavigateToCart();
                    }}
                  >
                    View Cart
                  </button>
                  <button 
                    className="btn flex-fill btn-outline-secondary"
                    onClick={() => setShowAddToCartModal(false)}
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
