import { useState, useEffect } from 'react'
import {
  FaShoppingCart,
  FaUser,
  FaArrowLeft,
  FaTruck,
  FaTrash,
  FaShieldAlt,
  FaStar,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaPlus,
  FaMinus,
  FaSearch,
  FaShoppingBag,
  FaSignOutAlt
} from "react-icons/fa";
import { BsStarFill } from "react-icons/bs";
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { catalogApi, resolveAssetUrl, getProductImageUrl } from '../services/api';

const ShoppingCartPage = ({ 
  cartItems = [], 
  onNavigateBack, 
  onNavigateToProduct, 
  onNavigateToCheckout,
  onUpdateCart,
  onNavigateToAccountSettings,
  onLogout,
  currentUser = {},
}) => {
  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [reviewInputs, setReviewInputs] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Update item quantity
  const updateQuantity = (id, change) => {
    if (!onUpdateCart) return;
    
    const updatedItems = cartItems.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item
    );
    onUpdateCart(updatedItems);
  };

  // Remove item from cart
  const removeItem = (id) => {
    if (!onUpdateCart) return;
    const updatedItems = cartItems.filter(item => item.id !== id);
    onUpdateCart(updatedItems);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = (subtotal * 0.08).toFixed(2);
  const total = subtotal + shipping + parseFloat(tax);

  const [relatedProducts, setRelatedProducts] = useState([]);
  useEffect(() => {
    const loadRelated = async () => {
      try {
        const list = await catalogApi.getProducts({});
        const cartIds = new Set(cartItems.map(i => i.id));
        const cartCats = new Set(cartItems.map(i => i.category).filter(Boolean));
        const cartBrands = new Set(cartItems.map(i => i.brand).filter(Boolean));
        const mapped = (list || []).map(p => ({
          id: p.id,
          title: p.title,
          price: Number(p.price || 0),
          imageUrl: resolveAssetUrl(p.image_url || p.image),
          brand: p.brand,
          rating: Number(p.rating || 0),
          category: typeof p.category === 'string' ? p.category : (p.category?.name || '')
        }));
        const filtered = mapped.filter(p => !cartIds.has(p.id));
        const prioritized = filtered.sort((a, b) => {
          const aScore = (cartCats.has(a.category) ? 2 : 0) + (cartBrands.has(a.brand) ? 1 : 0);
          const bScore = (cartCats.has(b.category) ? 2 : 0) + (cartBrands.has(b.brand) ? 1 : 0);
          if (aScore !== bScore) return bScore - aScore;
          return (b.rating || 0) - (a.rating || 0);
        }).slice(0, 8);
        setRelatedProducts(prioritized);
      } catch {
        setRelatedProducts([]);
      }
    };
    loadRelated();
  }, [cartItems]);

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <BsStarFill
        key={i}
        style={{ 
          color: i < Math.floor(rating) ? mainColor : '#e0e0e0',
          fontSize: '12px'
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
          fontSize: '12px',
          cursor: 'pointer'
        }}
        onClick={() => onRate(i + 1)}
      />
    ));
  };

  const setItemRating = (id, rating) => {
    if (!onUpdateCart) return;
    const updatedItems = cartItems.map(item =>
      item.id === id ? { ...item, rating } : item
    );
    onUpdateCart(updatedItems);
  };

  const handleReviewChange = (id, text) => {
    setReviewInputs(prev => ({ ...prev, [id]: text }));
  };

  const submitReview = (id) => {
    const text = (reviewInputs[id] || '').trim();
    if (!text || !onUpdateCart) return;
    const updatedItems = cartItems.map(item => {
      if (item.id !== id) return item;
      const reviews = Array.isArray(item.reviews) ? item.reviews : [];
      const newReview = {
        id: Date.now(),
        user: currentUser?.name || currentUser?.username || 'Customer',
        text,
        rating: item.rating || 0,
        date: new Date().toISOString()
      };
      return { ...item, reviews: [newReview, ...reviews] };
    });
    onUpdateCart(updatedItems);
    setReviewInputs(prev => ({ ...prev, [id]: '' }));
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-vh-100 bg-light">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-md-6 text-center">
              <div className="card border-0 shadow-sm">
                <div className="card-body py-5">
                  <FaShoppingBag size={64} className="text-muted mb-4" />
                  <h3 className="fw-bold mb-3" style={{ color: mainColor }}>Your Cart is Empty</h3>
                  <p className="text-muted mb-4">
                    Looks like you haven't added any items to your cart yet.
                  </p>
                  <button
                    onClick={onNavigateBack}
                    className="btn btn-lg"
                    style={{ backgroundColor: mainColor, color: 'white' }}
                  >
                    Continue Shopping
                  </button>
                </div>
                <div className="d-none d-md-block">
                  <span style={{ color: mainColor, fontWeight: '500' }}>
                    {currentUser?.name || 'Customer'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      onNavigateBack && onNavigateBack();
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* HEADER */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <img
                src={styleSathiLogo}
                alt="STYLE SATHI"
                style={{ height: '40px', cursor: 'pointer' }}
                onClick={onNavigateBack}
              />
            </div>

            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white" style={{ borderColor: mainColor }}>
                  <FaSearch style={{ color: mainColor }} />
                </span>
                <input 
                  className="form-control" 
                  placeholder="Search for rings, watches, glasses, shoes..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKey}
                  style={{ borderColor: mainColor }}
                />
              </div>
            </div>

            <div className="col-md-3 d-flex justify-content-end align-items-center gap-4">
              <div className="position-relative" style={{ cursor: "pointer" }} onClick={onNavigateBack}>
                <FaShoppingCart style={{ fontSize: "24px", color: mainColor }} />
                {cartItems.length > 0 && (
                  <span className="badge rounded-pill position-absolute top-0 start-100 translate-middle"
                    style={{ 
                      backgroundColor: secondaryColor, 
                      color: 'white',
                      fontSize: '0.7rem',
                      minWidth: '20px',
                      height: '20px'
                    }}>
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>

              {/* PROFILE DROPDOWN - FIXED SECTION */}
              <div className="position-relative">
                <div
                  className="d-flex align-items-center gap-2 cursor-pointer"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
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
                      onClick={() => {
                        onNavigateToAccountSettings && onNavigateToAccountSettings();
                        setShowProfileDropdown(false);
                      }}
                    >
                      <FaUser size={14} /> Profile
                    </button>

                    <button
                      className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
                      style={{ color: '#dc3545', fontSize: '0.9rem' }}
                      onClick={() => {
                        onLogout && onLogout();
                        setShowProfileDropdown(false);
                      }}
                    >
                      <FaSignOutAlt size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-5">
        <button className="btn btn-link p-0 mb-4 d-flex align-items-center gap-2" style={{ color: mainColor }} onClick={onNavigateBack}>
          <FaArrowLeft /> Continue Shopping
        </button>

        <div className="row g-4">
          <div className="col-lg-8">
            <h2 className="fw-bold mb-4" style={{ color: mainColor }}>Shopping Cart ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</h2>

            {cartItems.map((item) => (
              <div className="card shadow-sm border-0 mb-4" key={item.id}>
                <div className="row g-0 p-3">
                  <div className="col-md-3 d-flex align-items-center justify-content-center">
                    <div className="bg-light rounded d-flex align-items-center justify-content-center w-100 overflow-hidden" style={{ height: "140px" }}>
                      <img 
                        src={getProductImageUrl(item)} 
                        alt={item.title || item.name}
                        className="img-fluid"
                        style={{ maxHeight: "100%", objectFit: "cover" }}
                      />
                    </div>
                  </div>

                  <div className="col-md-9">
                    <h5 style={{ color: mainColor, fontWeight: 'bold' }}>{item.title || item.name}</h5>

                    <div className="row small text-muted mb-2">
                      <div className="col-6"><strong>Brand:</strong> {item.brand}</div>
                      <div className="col-6">
                        <strong>Rating:</strong> 
                        <span className="ms-1">
                          {renderInteractiveStars(item.rating || 0, (r) => setItemRating(item.id, r))}
                        </span>
                        <span className="ms-1">({item.rating || 0})</span>
                      </div>
                      {item.size && (
                        <div className="col-6"><strong>Size:</strong> {item.size}</div>
                      )}
                      {item.color && (
                        <div className="col-6"><strong>Color:</strong> {item.color}</div>
                      )}
                      {item.condition && (
                        <div className="col-6"><strong>Condition:</strong> {item.condition}</div>
                      )}
                    </div>

                    <p className="mb-3 small">
                      <FaTruck className="me-1" /> 
                      Estimated delivery: {item.delivery || "3-5 business days"}
                    </p>

                    <div className="mt-2">
                      <div className="mb-2 fw-semibold" style={{ color: mainColor }}>Reviews</div>
                      {Array.isArray(item.reviews) && item.reviews.length > 0 ? (
                        <div className="mb-2">
                          {item.reviews.slice(0, 2).map((rev) => (
                            <div key={rev.id} className="small mb-2">
                              <span className="me-2">{renderStars(rev.rating || 0)}</span>
                              <span className="text-muted">{rev.text}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="small text-muted mb-2">No reviews yet</div>
                      )}
                      <div className="d-flex align-items-center gap-2 mb-2">
                        {renderInteractiveStars(item.rating || 0, (r) => setItemRating(item.id, r))}
                        <small className="text-muted">Your rating</small>
                      </div>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Write a review"
                          value={reviewInputs[item.id] || ''}
                          onChange={(e) => handleReviewChange(item.id, e.target.value)}
                          style={{ borderColor: mainColor }}
                        />
                        <button
                          className="btn"
                          style={{ backgroundColor: mainColor, color: 'white' }}
                          onClick={() => submitReview(item.id)}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-4">
                        <h4 style={{ color: secondaryColor, fontWeight: 'bold', marginBottom: 0 }}>
                          ${((item.price || 0) * item.quantity).toFixed(2)}
                        </h4>
                        {item.quantity > 1 && (
                          <small className="text-muted">
                            ${(item.price || 0).toFixed(2)} each
                          </small>
                        )}

                        <div className="input-group" style={{ width: "120px" }}>
                          <button 
                            className="btn btn-outline-secondary" 
                            onClick={() => updateQuantity(item.id, -1)}
                            style={{ borderColor: mainColor, color: mainColor }}
                          >
                            <FaMinus />
                          </button>
                          <input className="form-control text-center" value={item.quantity} readOnly />
                          <button 
                            className="btn btn-outline-secondary" 
                            onClick={() => updateQuantity(item.id, 1)}
                            style={{ borderColor: mainColor, color: mainColor }}
                          >
                            <FaPlus />
                          </button>
                        </div>
                      </div>

                      <button 
                        className="btn btn-sm btn-outline-danger" 
                        onClick={() => removeItem(item.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="col-lg-4">
            <div className="card p-4 shadow-sm sticky-top" style={{ top: "100px", border: 'none' }}>
              <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Order Summary</h4>

              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <strong>${subtotal.toFixed(2)}</strong>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span>Shipping</span>
                <strong>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</strong>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span>Tax</span>
                <strong>${tax}</strong>
              </div>

              <hr />

              <div className="d-flex justify-content-between fs-5 fw-bold" style={{ color: secondaryColor }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {subtotal < 100 && (
                <div className="alert alert-info mt-3 small" role="alert">
                  Add <strong>${(100 - subtotal).toFixed(2)}</strong> more for free shipping!
                </div>
              )}

              <button 
                className="btn w-100 mt-4 py-3 fw-semibold border-0"
                style={{ 
                  backgroundColor: mainColor, 
                  color: 'white',
                  borderRadius: '10px'
                }}
                onClick={onNavigateToCheckout}
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout
              </button>

              <p className="small text-center mt-3 text-muted">
                <FaShieldAlt className="text-success me-1" /> Secure Checkout
              </p>

              {/* Promo Code */}
              <div className="mt-4">
                <label className="form-label text-muted">Promo Code</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter promo code"
                    style={{ borderColor: mainColor }}
                  />
                  <button className="btn" style={{ 
                    backgroundColor: mainColor, 
                    color: 'white',
                    borderColor: mainColor
                  }}>
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-5 pt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold" style={{ color: mainColor }}>You May Also Like</h4>
          </div>

          <div className="row g-4">
            {relatedProducts.map((product) => (
              <div className="col-md-3" key={product.id}>
                <div
                  className="card border-0 shadow-sm p-2 h-100"
                  style={{ cursor: "pointer" }}
                  onClick={() => onNavigateToProduct && onNavigateToProduct(product.id)}
                >
                  <div className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden" style={{ height: "180px" }}>
                    <img 
                      src={getProductImageUrl(product)} 
                      alt={product.title}
                      className="img-fluid"
                      style={{ maxHeight: "100%", objectFit: "cover" }}
                    />
                  </div>

                  <div className="p-3 d-flex flex-column flex-grow-1">
                    <small className="text-muted">{product.brand}</small>
                    <h6 className="fw-semibold flex-grow-1" style={{ color: mainColor }}>{product.title}</h6>

                    <div className="d-flex align-items-center gap-1 mb-2">
                      {renderStars(product.rating)}
                      <small className="text-muted ms-1">({product.rating})</small>
                    </div>

                    <strong style={{ color: secondaryColor }}>${product.price.toFixed(2)}</strong>
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
                {[FaFacebookF, FaTwitter, FaInstagram, FaLinkedin].map((Icon, i) => (
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
                ))}
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">QUICK LINKS</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Home</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Shop</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Categories</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>New Arrivals</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>AR Experience</button>
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

      <style>{`
        .hover-underline:hover {
          text-decoration: underline !important;
        }
        
        .btn:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ShoppingCartPage;
