// src/components/HomePage.jsx
import { useState, useRef, useEffect } from 'react';
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { 
  FaShoppingCart, 
  FaUser, 
  FaSignOutAlt, 
  FaSearchPlus,
  FaSearch,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedin
} from 'react-icons/fa';
import { BsGrid3X3Gap, BsStarFill } from 'react-icons/bs';
import { GiBigDiamondRing, GiWatch, GiConverseShoe, GiTopHat, GiHairStrands } from 'react-icons/gi';
import { IoIosGlasses } from 'react-icons/io';
import { FaPaintBrush, FaGem } from 'react-icons/fa';
import { catalogApi, resolveAssetUrl, getProductImageUrl } from '../services/api';
import Swal from 'sweetalert2';

const HomePage = ({
  onNavigateToProducts,
  onNavigateToCart,
  onNavigateToAccountSettings,
  onNavigateToProductDetail,
  onNavigateToVR,
  onNavigateToAR,
  onNavigateToAIStudio,
  onAddToCart,
  onLogout,
  currentUser,
  cartItemsCount,
  onNavigateToTrackOrder,
  hasOrder
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCartSuccess, setShowCartSuccess] = useState(false);
  const [addedProductName, setAddedProductName] = useState('');
  const [showNoOrders, setShowNoOrders] = useState(false);
  const profileDropdownRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  
  

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFooterInfo = (label) => {
    Swal.fire({ icon: 'info', title: label, text: 'Information will be shown here' });
  };
  useEffect(() => {
    const load = async () => {
      try {
        const cats = await catalogApi.getCategories();
        setCategoryOptions(cats.map((c) => c.name));
      } catch { setCategoryOptions([]); }
      try {
        const list = await catalogApi.getProducts({});
        const normalized = Array.isArray(list) ? list.map(p => ({
          ...p,
          imageUrl: getProductImageUrl(p),
          image_url: getProductImageUrl(p),
          model_glb_url: resolveAssetUrl(p.model_glb_url || p.modelGlbUrl),
        })) : list;
        setProducts(Array.isArray(normalized) ? normalized : []);
      } catch { setProducts([]); }
    };
    load();
    const handler = () => load();
    window.addEventListener('catalogInvalidated', handler);
    return () => window.removeEventListener('catalogInvalidated', handler);
  }, []);

  const mainColor = '#c4a62c';
  const secondaryColor = '#2c67c4';
  useEffect(() => {
    if (!document.querySelector('script[data-model-viewer]')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.dataset.modelViewer = '1';
      s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(s);
    }
  }, []);

  const handleAddToCart = (product) => {
    onAddToCart(product, 1);
    setAddedProductName(product.title);
    setShowCartSuccess(true);
    setTimeout(() => setShowCartSuccess(false), 2000);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      onNavigateToProducts && onNavigateToProducts(q);
    }
  };

  const openAIStudio = () => {
    if (typeof onNavigateToAIStudio === 'function') onNavigateToAIStudio();
  };



  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<BsStarFill key={i} style={{ color: mainColor }} />);
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" style={{ position: 'relative', display: 'inline-block' }}>
          <BsStarFill style={{ color: '#e0e0e0' }} />
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '50%', 
            overflow: 'hidden' 
          }}>
            <BsStarFill style={{ color: mainColor }} />
          </div>
        </div>
      );
    }

    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<BsStarFill key={`empty-${i}`} style={{ color: '#e0e0e0' }} />);
    }

    return stars;
  };

  const categoryIcons = {
    'All Categories': <BsGrid3X3Gap size={30} color={mainColor} />,
    'Rings': <GiBigDiamondRing size={30} color={mainColor} />,
    'Glasses': <IoIosGlasses size={30} color={mainColor} />,
    'Watches': <GiWatch size={30} color={mainColor} />,
    'Shoes': <GiConverseShoe size={30} color={mainColor} />,
    'Cap/Hat': <GiTopHat size={30} color={mainColor} />,
    'Hat': <GiTopHat size={30} color={mainColor} />,
    'Hair': <GiHairStrands size={30} color={mainColor} />,
    'Hairs': <GiHairStrands size={30} color={mainColor} />,
    'Makeup': <FaPaintBrush size={28} color={mainColor} />,
    'Jewelry': <FaGem size={28} color={mainColor} />
  };

  // Enhanced categories with all categories option
  const enhancedCategories = [
    { name: 'All Categories', count: products.length, isAllCategories: true },
    ...categoryOptions.map((name) => ({ name, count: products.filter((p) => (typeof p.category === 'string' ? p.category : p.category?.name) === name).length }))
  ];

  return (
    <div className="homepage min-vh-100 bg-light">
      {/* Header */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <img
                src={styleSathiLogo}
                alt="STYLE SATHI"
                style={{ height: '40px', cursor: 'pointer' }}
                onClick={() => onNavigateToProducts(null)}
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
                  style={{
                    borderColor: mainColor,
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                />
                <FaSearch
                  className="position-absolute top-50 start-0 translate-middle-y ms-3"
                  style={{ color: mainColor }}
                />
              </div>
            </div>

            <div className="col-md-3">
              <div className="d-flex align-items-center justify-content-end gap-4">
                {/* Cart */}
                <div
                  className="position-relative cursor-pointer hover-scale"
                  onClick={onNavigateToCart}
                  style={{ transition: 'transform 0.2s' }}
                >
                  <FaShoppingCart style={{ fontSize: '24px', color: mainColor }} />
                  {cartItemsCount > 0 && (
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
                      {cartItemsCount}
                    </span>
                  )}
                </div>

                {/* Profile */}
                <div className="position-relative" ref={profileDropdownRef}>
                  <div
                    className="d-flex align-items-center gap-2 cursor-pointer hover-scale"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    style={{ transition: 'transform 0.2s' }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center border"
                      style={{
                        width: '45px',
                        height: '45px',
                        backgroundColor: mainColor + '20',
                        borderColor: mainColor + '50'
                      }}
                    >
                      <FaUser style={{ color: mainColor, fontSize: '18px' }} />
                    </div>
                    <div className="d-none d-md-block">
                      <span style={{ color: mainColor, fontWeight: '500' }}>
                        {currentUser?.name || 'Customer'}
                      </span>
                    </div>
                  </div>

                  {showProfileDropdown && (
                    <div
                      className="position-absolute bg-white shadow rounded end-0 mt-2 py-2"
                      style={{
                        minWidth: '160px',
                        zIndex: 1000,
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

      {/* Hero Section */}
      <section className="hero-section position-relative overflow-hidden">
        <div 
          className="hero-background w-100 h-100 position-absolute"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.7)'
          }}
        />
        
        <div className="container position-relative" style={{ height: '500px', zIndex: 2 }}>
          <div className="row h-100 align-items-center">
            <div className="col-lg-6">
              <div className="hero-content text-white">
                <h1 className="display-4 fw-bold mb-3">
                  Elevate Your Style
                </h1>
                <p className="fs-5 mb-4 opacity-90">
                  Discover the perfect blend of elegance and innovation with our premium collection
                </p>
                <button
                  className="btn btn-lg px-5 py-3 fw-semibold"
                  style={{ 
                    backgroundColor: mainColor, 
                    color: "#fff",
                    borderRadius: '30px',
                    border: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = secondaryColor;
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = mainColor;
                    e.target.style.transform = 'translateY(0)';
                  }}
                  onClick={() => onNavigateToProducts(null)}
                >
                  Shop Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3" style={{ color: mainColor }}>
              Shop By Category
            </h2>
            <p className="text-muted">Explore our wide range of premium products</p>
          </div>

          <div className="d-flex flex-nowrap gap-3 overflow-auto px-2" style={{ scrollSnapType: 'x mandatory' }}>
            {enhancedCategories.map((category) => (
              <div key={category.name} className="flex-shrink-0" style={{ width: '160px' }}>
                <div
                  className="category-card text-center cursor-pointer p-3 rounded-3"
                  onClick={() =>
                    category.isAllCategories
                      ? onNavigateToProducts(null)
                      : onNavigateToProducts(category.name)
                  }
                  style={{
                    transition: 'all 0.3s ease',
                    border: `2px solid ${mainColor}20`,
                    scrollSnapAlign: 'start'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = `0 8px 20px ${mainColor}20`;
                    e.currentTarget.style.borderColor = mainColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = `${mainColor}20`;
                  }}
                >
                  <div
                    className="category-icon mx-auto rounded-circle d-flex align-items-center justify-content-center mb-2"
                    style={{
                      width: "56px",
                      height: "56px",
                      backgroundColor: mainColor + "15",
                    }}
                  >
                    {categoryIcons[category.name]}
                  </div>
                  <div className="small fw-semibold mb-1" style={{ color: mainColor }}>
                    {category.name}
                  </div>
                  <small className="text-muted">{category.count} items</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommended Products */}
      <section className="recommended-section py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3" style={{ color: mainColor }}>
              Recommended For You
            </h2>
            <p className="text-muted">Handpicked items just for you</p>
          </div>

          <div className="row g-4">
            {products.filter(p => (p.in_stock ?? (p.stock > 0))).slice(0, 4).map((product) => (
              <div className="col-12 col-sm-6 col-lg-3" key={product.id}>
                <div 
                  className="card product-card h-100 border-0 shadow-sm"
                  style={{
                    transition: 'all 0.3s ease',
                    borderRadius: '15px',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = `0 10px 30px ${mainColor}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  }}
                >
                  <div
                    className="product-image position-relative"
                    style={{ height: "250px", overflow: "hidden", cursor: 'pointer' }}
                    onClick={() => onNavigateToProductDetail(product.id, product)}
                  >
                    {(() => {
                      const imageSrc = getProductImageUrl(product);
                      return (
                        <img
                          src={imageSrc || styleSathiLogo}
                          className="w-100 h-100 object-fit-cover"
                          alt={product.title}
                          style={{ transition: 'transform 0.3s ease' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = styleSathiLogo;
                          }}
                          onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; }}
                        />
                      );
                    })()}
                    
                    {/* Removed NEW badge */}

                    {/* Out of Stock Overlay */}
                    {!product.in_stock && (
                      <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                      >
                        <span className="text-white fw-bold">Out of Stock</span>
                      </div>
                    )}
                  </div>

                  <div className="card-body d-flex flex-column p-4">
                    <h5 className="fw-semibold mb-2" style={{ color: mainColor }}>
                      {product.title}
                    </h5>

                    {/* Brand Name */}
                    {product.brand && (
                      <p className="text-muted small mb-2">{product.brand}</p>
                    )}

                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="d-flex gap-1">
                        {renderStars(product.rating)}
                      </div>
                      <small className="text-muted">({product.rating})</small>
                    </div>

                    <p className="fs-4 fw-bold mb-3" style={{ color: secondaryColor }}>
                      ${product.price}
                    </p>

                    <div className="mt-auto d-flex flex-column gap-2">
                      <button
                        className="btn w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                        style={{ 
                          border: `2px solid ${mainColor}`, 
                          color: mainColor,
                          borderRadius: '25px',
                          fontWeight: '500',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = mainColor;
                          e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                          e.target.style.color = mainColor;
                        }}
                        onClick={() => (typeof onNavigateToAR === 'function' ? onNavigateToAR(product) : (onNavigateToVR && onNavigateToVR(product)))}
                      >
                        <FaSearchPlus /> View in AR
                      </button>

                      <button
                        className="btn w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                        style={{ 
                          backgroundColor: mainColor, 
                          color: "#fff",
                          borderRadius: '25px',
                          fontWeight: '500',
                          border: 'none',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = secondaryColor;
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = mainColor;
                          e.target.style.transform = 'translateY(0)';
                        }}
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.in_stock}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-5 bg-white">
        <div className="container">
          <div className="d-flex flex-nowrap gap-4 overflow-auto px-2" style={{ scrollSnapType: 'x mandatory' }}>
            <div className="flex-shrink-0" style={{ width: '640px' }}>
              <div
                className="position-relative rounded-4 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${mainColor}20, ${secondaryColor}20)`,
                  border: `2px solid ${mainColor}30`,
                  transition: 'all 0.3s ease',
                  scrollSnapAlign: 'start'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.borderColor = mainColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = `${mainColor}30`;
                }}
              >
                <div className="row align-items-center">
                  <div className="col-md-6 p-4">
                    <h3 className="fw-bold mb-3" style={{ color: mainColor }}>
                      Immersive AR Try-On
                    </h3>
                    <p className="text-muted mb-4">
                      Try before you buy with augmented reality. See products on you or in your space.
                    </p>
                    <button
                      className="btn px-4 py-3 d-flex align-items-center gap-2"
                      style={{ 
                        backgroundColor: mainColor, 
                        color: '#fff',
                        borderRadius: '25px',
                        border: 'none',
                        fontWeight: '500'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        (typeof onNavigateToAR === 'function' ? onNavigateToAR() : (onNavigateToVR && onNavigateToVR()));
                      }}
                    >
                      <FaSearchPlus /> Explore AR Try-On
                    </button>
                  </div>
                  <div className="col-md-6">
                    <img
                      src="https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=600&h=400&fit=crop"
                      className="w-100 h-100 object-fit-cover"
                      alt="AR Try-On"
                      style={{ minHeight: '300px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0" style={{ width: '640px' }}>
              <div
                className="position-relative rounded-4 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${mainColor}20, ${secondaryColor}20)`,
                  border: `2px solid ${mainColor}30`,
                  transition: 'all 0.3s ease',
                  scrollSnapAlign: 'start'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.borderColor = mainColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = `${mainColor}30`;
                }}
              >
                <div className="row align-items-center">
                  <div className="col-md-6 p-4">
                    <h3 className="fw-bold mb-3" style={{ color: mainColor }}>
                      AI Try-On Studio
                    </h3>
                    <p className="text-muted mb-4">
                      Experiment with makeup, jewelry, hair and accessories using your camera.
                    </p>
                    <button
                      className="btn px-4 py-3 d-flex align-items-center gap-2"
                      style={{ 
                        backgroundColor: mainColor, 
                        color: '#fff',
                        borderRadius: '25px',
                        border: 'none',
                        fontWeight: '500'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openAIStudio();
                      }}
                    >
                      <FaSearchPlus /> Open Studio
                    </button>
                  </div>
                  <div className="col-md-6">
                    <img
                      src="https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&h=400&fit=crop"
                      className="w-100 h-100 object-fit-cover"
                      alt="AI Try-On"
                      style={{ minHeight: '300px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons Section */}
      <section className="action-buttons py-5 bg-light">
        <div className="container">
          <div className="row g-4 justify-content-center">

            {/* AR Button */}
            <div className="col-md-4">
              <button
                className="action-btn w-100 h-100 p-4 text-center bg-white rounded-3 border-0"
                style={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 10px 25px ${mainColor}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => (typeof onNavigateToAR === 'function' ? onNavigateToAR() : (onNavigateToVR && onNavigateToVR()))}
              >
                <div
                  className="action-icon mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "70px",
                    height: "70px",
                    backgroundColor: mainColor + "15",
                  }}
                >
                  <FaSearchPlus size={24} style={{ color: mainColor }} />
                </div>
                <h6 className="fw-semibold mb-2" style={{ color: mainColor }}>
                  AR Try-On
                </h6>
                <p className="text-muted small mb-0">
                  Try on products in augmented reality before purchase
                </p>
              </button>
            </div>

            {/* Track Order */}
            <div className="col-md-4">
              <button
                className="action-btn w-100 h-100 p-4 text-center bg-white rounded-3 border-0"
                style={{
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 10px 25px ${mainColor}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => {
                  if (hasOrder && onNavigateToTrackOrder) {
                    onNavigateToTrackOrder();
                  } else {
                    setShowNoOrders(true);
                  }
                }}
              >
                <div
                  className="action-icon mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "70px",
                    height: "70px",
                    backgroundColor: mainColor + "15",
                  }}
                >
                  <svg className="w-12 h-12" fill="none" stroke={mainColor} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <h6 className="fw-semibold mb-2" style={{ color: mainColor }}>
                  Track Orders
                </h6>
                <p className="text-muted small mb-0">
                  Monitor your order status and delivery in real-time
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => onNavigateToProducts?.(null)}>Home</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => onNavigateToProducts?.(null)}>Shop</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => onNavigateToProducts?.(null)}>Categories</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => onNavigateToProducts?.(null)}>New Arrivals</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => onNavigateToAR?.()}>AR Try-On</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">CUSTOMER CARE</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Contact Us')}>Contact Us</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('FAQ')}>FAQ</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Shipping Info')}>Shipping Info</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Returns')}>Returns</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Size Guide')}>Size Guide</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">LEGAL</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Privacy Policy')}>Privacy Policy</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Terms of Service')}>Terms of Service</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Cookie Policy')}>Cookie Policy</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Refund Policy')}>Refund Policy</button>
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

      {/* Cart Success Popup */}
      {showCartSuccess && (
        <div
          className="position-fixed bottom-0 end-0 m-4 p-3 rounded-3 shadow-lg"
          style={{ 
            backgroundColor: mainColor, 
            color: "#fff",
            zIndex: 1050,
            animation: 'slideInUp 0.3s ease-out'
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <FaShoppingCart />
            <span className="fw-semibold">{addedProductName} added to cart!</span>
          </div>
        </div>
      )}

      {/* Add some custom styles */}
      <style>{`
        .hover-scale:hover {
          transform: scale(1.05);
        }
        
        .hover-underline:hover {
          text-decoration: underline !important;
        }
        
        .hero-section {
          height: 500px;
        }
        
        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .object-fit-cover {
          object-fit: cover;
        }
      `}</style>

      {showNoOrders && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1060 }}>
          <div className="bg-white p-4 rounded-3 shadow" style={{ maxWidth: '420px', width: '90%' }}>
            <h5 className="fw-bold mb-2" style={{ color: mainColor }}>No orders yet</h5>
            <p className="text-muted mb-3">You haven’t placed any orders. Continue shopping to place your first order.</p>
            <div className="d-flex gap-2 justify-content-end">
              <button className="btn btn-outline-secondary" onClick={() => setShowNoOrders(false)}>Close</button>
              <button className="btn" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={() => { setShowNoOrders(false); onNavigateToProducts?.(null); }}>Continue Shopping</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
