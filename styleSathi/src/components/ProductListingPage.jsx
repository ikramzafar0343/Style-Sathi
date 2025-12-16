import { useState, useEffect, useCallback } from 'react'
import {
  FaShoppingCart,
  FaUser,
  FaSignOutAlt,
  FaSearchPlus,
  FaSearch,
  FaArrowLeft,
} from "react-icons/fa";
import { BsGrid3X3Gap, BsStarFill, BsListUl } from "react-icons/bs";
import { catalogApi, getProductImageUrl } from '../services/api';
import NotificationBell from './NotificationBell';
import styleSathiLogo from '../assets/styleSathiLogo.svg';

const ProductListingPage = ({ 
  onNavigateToHome, 
  onNavigateToProductDetail, 
  onNavigateToCart, 
  category, 
  onNavigateToVR,
  onNavigateToAR,
  onNavigateToAccountSettings,
  onLogout,
  onNavigateBack,
  onAddToCart,
  currentUser
}) => {
  const [selectedBrands, setSelectedBrands] = useState([])
  const [selectedRatings, setSelectedRatings] = useState([])
  
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(category || 'All Categories')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCartSuccess, setShowCartSuccess] = useState(false)
  const [addedProductName, setAddedProductName] = useState('')
  const [cartCount, setCartCount] = useState(0)
  const [products, setProducts] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('featured')
  const [allProductsForCounts, setAllProductsForCounts] = useState([])

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";

  const user = { username: (currentUser?.name || currentUser?.username || 'Customer') };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await catalogApi.getCategories();
      setCategoryOptions(cats.map((c) => c.name));
      const catParam = category && category !== 'All Categories' ? category : undefined;
      const list = await catalogApi.getProducts({ category: catParam });
      const normalized = (list || []).map((p) => ({
        ...p,
        inStock: (p?.in_stock !== undefined) ? !!p.in_stock : (Number(p?.stock || 0) > 0),
        imageUrl: getProductImageUrl(p),
        rating: Number(p?.rating || 0),
        price: Number(p?.price || 0),
      }));
      setProducts([...normalized]);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
    try {
      const all = await catalogApi.getProducts({});
      const normalizedAll = (all || []).map((p) => ({
        ...p,
        inStock: (p?.in_stock !== undefined) ? !!p.in_stock : (Number(p?.stock || 0) > 0),
        imageUrl: getProductImageUrl(p),
        rating: Number(p?.rating || 0),
        price: Number(p?.price || 0),
      }));
      setAllProductsForCounts([...normalizedAll]);
    } catch {
      setAllProductsForCounts([]);
    }
  }, [category]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    try {
      const q = sessionStorage.getItem('globalSearchQuery');
      if (q) {
        setSearchQuery(q);
        sessionStorage.removeItem('globalSearchQuery');
      }
    } catch { void 0; }
  }, []);

  useEffect(() => {
    const handler = () => {
      loadProducts();
    };
    window.addEventListener('catalogInvalidated', handler);
    return () => window.removeEventListener('catalogInvalidated', handler);
  }, [loadProducts]);

  // Update category filter when category prop changes
  useEffect(() => {
    if (category) {
      setSelectedCategoryFilter(category);
    }
  }, [category]);

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      // Category filter
      const catNameRaw = typeof product.category === 'string' ? product.category : product.category?.name;
      const catName = String(catNameRaw || '').toLowerCase();
      const sel = String(selectedCategoryFilter || '').toLowerCase();
      if (sel !== 'all categories' && catName !== sel) return false;
      
      // Brand filter
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false;
      
      // Rating filter
      if (selectedRatings.length > 0 && !selectedRatings.some(rating => (product.rating || 0) >= rating)) return false;
      
      // Price range filter
      if (minPrice && Number(product.price) < parseFloat(minPrice)) return false;
      if (maxPrice && Number(product.price) > parseFloat(maxPrice)) return false;
      
      // Search filter
      if (searchQuery && 
          !(product.title || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(product.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
          Array.isArray(product.features) && !product.features.some(feature => (feature || '').toLowerCase().includes(searchQuery.toLowerCase()))
      ) return false;
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return Number(a.price) - Number(b.price);
        case 'price-high':
          return Number(b.price) - Number(a.price);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        default: // featured
          return String(a.id).localeCompare(String(b.id));
      }
    });

  const getBrandOptions = () => {
    return [...new Set(products.map(product => product.brand))];
  }

  const getCategoryOptions = () => {
    const derived = Array.from(new Set(
      (allProductsForCounts.length ? allProductsForCounts : products)
        .map((p) => {
          const cat = p.category;
          return typeof cat === 'string' ? cat : (cat?.name || cat?.title || '');
        })
        .filter(Boolean)
        .map((s) => String(s))
    ));
    const merged = Array.from(new Set([...categoryOptions, ...derived]));
    return ['All Categories', ...merged];
  }

  const handleBrandToggle = (brand) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  const handleRatingToggle = (rating) => {
    setSelectedRatings((prev) =>
      prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]
    )
  }

  

  const clearAllFilters = () => {
    setSelectedBrands([])
    setSelectedRatings([])
    
    setSelectedCategoryFilter(category || 'All Categories')
    setMinPrice('')
    setMaxPrice('')
    setSearchQuery('')
    setSortBy('featured')
  }

  const handleAddToCart = (product, e) => {
    e.stopPropagation()
    setCartCount(prev => prev + 1)
    setAddedProductName(product.title)
    setShowCartSuccess(true)
    
    // Call external add to cart function if provided
    if (onAddToCart) {
      onAddToCart(product, 1);
    }
    window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'cart', title: 'Added to Cart', message: `${product.title} added to cart`, time: 'Just now' } }))
    
    setTimeout(() => setShowCartSuccess(false), 2000)
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <BsStarFill 
        key={i} 
        style={{ 
          color: i < Math.floor(rating) ? mainColor : '#e0e0e0',
          fontSize: '14px'
        }} 
      />
    ))
  }

  const calculateDiscount = (originalPrice, currentPrice) => {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  const getProductCountByCategory = (categoryName) => {
    const source = allProductsForCounts.length ? allProductsForCounts : products;
    if (categoryName === 'All Categories') return source.length;
    const target = String(categoryName).toLowerCase();
    return source.filter((product) => {
      const cat = product.category;
      const name = typeof cat === 'string' ? cat : (cat?.name || cat?.title || '');
      return String(name).toLowerCase() === target;
    }).length;
  }

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <header className="sticky-top bg-white border-bottom shadow-sm" style={{ zIndex: 1030 }}>
        <div className="container py-3">
          <div className="row align-items-center">
            {/* LOGO & BACK BUTTON */}
            <div className="col-md-3">
              <div className="d-flex align-items-center gap-3">
                {onNavigateBack && (
                  <button
                    onClick={onNavigateBack}
                    className="btn btn-outline-secondary d-flex align-items-center gap-2"
                    style={{ borderColor: mainColor, color: mainColor }}
                  >
                    <FaArrowLeft size={14} />
                  </button>
                )}
                <img
                  src={styleSathiLogo}
                  alt="STYLE SATHI"
                  style={{ height: '40px', cursor: 'pointer' }}
                  onClick={onNavigateToHome}
                />
              </div>
            </div>

            {/* SEARCH */}
            <div className="col-md-6">
              <div className="position-relative">
                <input
                  className="form-control ps-5 py-2"
                  placeholder="Search for rings, watches, glasses, shoes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* CART + NOTIFICATIONS + PROFILE */}
            <div className="col-md-3">
              <div className="d-flex align-items-center justify-content-end gap-4">
                <NotificationBell mainColor={mainColor} secondaryColor={secondaryColor} />
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
                        {user.username}
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

      <div className="container-fluid py-4">
        <div className="row">
          {/* Left Sidebar - Filters */}
          <aside className="col-lg-3 col-md-4">
            <div className="sticky-top" style={{ top: '100px' }}>
              <div className="bg-white rounded-3 p-4 shadow-sm">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <h5 className="fw-bold mb-0" style={{ color: mainColor }}>Filters</h5>
                  <button
                    onClick={clearAllFilters}
                    className="btn btn-sm"
                    style={{ 
                      color: mainColor,
                      fontSize: '0.8rem'
                    }}
                  >
                    Clear all
                  </button>
                </div>

                {/* Category Filter */}
                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{ color: mainColor }}>
                    Category
                  </label>
                  <select 
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="form-select"
                    style={{ 
                      borderColor: mainColor,
                      fontSize: '0.9rem'
                    }}
                  >
                    {getCategoryOptions().map(category => (
                      <option key={category} value={category}>
                        {category} ({getProductCountByCategory(category)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range Filter */}
                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{ color: mainColor }}>
                    Price Range ($)
                  </label>
                  <div className="row g-2">
                    <div className="col-6">
                      <input
                        type="number"
                        placeholder="Min"
                        min="0"
                        step="1"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="form-control"
                        style={{ 
                          borderColor: mainColor,
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    <div className="col-6">
                      <input
                        type="number"
                        placeholder="Max"
                        min="0"
                        step="1"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="form-control"
                        style={{ 
                          borderColor: mainColor,
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{ color: mainColor }}>
                    Brand
                  </label>
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {getBrandOptions().map((brand) => (
                      <div
                        key={brand}
                        className="form-check"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => handleBrandToggle(brand)}
                          className="form-check-input"
                          style={{ 
                            backgroundColor: selectedBrands.includes(brand) ? mainColor : '',
                            borderColor: mainColor
                          }}
                        />
                        <label className="form-check-label small">
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="mb-4">
                  <label className="form-label fw-semibold" style={{ color: mainColor }}>
                    Rating
                  </label>
                  <div className="d-flex flex-column gap-2">
                    {[
                      { stars: 5, label: '★★★★★ & up' },
                      { stars: 4, label: '★★★★☆ & up' },
                      { stars: 3, label: '★★★☆☆ & up' },
                    ].map((rating) => (
                      <div
                        key={rating.stars}
                        className="form-check"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRatings.includes(rating.stars)}
                          onChange={() => handleRatingToggle(rating.stars)}
                          className="form-check-input"
                          style={{ 
                            backgroundColor: selectedRatings.includes(rating.stars) ? mainColor : '',
                            borderColor: mainColor
                          }}
                        />
                        <label className="form-check-label small">
                          {rating.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Category Links */}
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ color: mainColor }}>
                    Quick Categories
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {getCategoryOptions().slice(1).map(name => (
                      <button
                        key={name}
                        className={`btn btn-sm ${selectedCategoryFilter === name ? '' : 'btn-outline-'}`}
                        style={{
                          backgroundColor: selectedCategoryFilter === name ? mainColor : 'transparent',
                          color: selectedCategoryFilter === name ? 'white' : mainColor,
                          borderColor: mainColor,
                          fontSize: '0.75rem'
                        }}
                        onClick={() => setSelectedCategoryFilter(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="col-lg-9 col-md-8">
            {/* Results Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="fw-bold mb-2" style={{ color: mainColor }}>
                  {selectedCategoryFilter}
                </h2>
                <span className="text-muted">
                  <span className="fw-semibold">{filteredProducts.length}</span> Products Found
                  {loading && <span className="ms-2">Loading...</span>}
                </span>
              </div>
              
              <div className="d-flex align-items-center gap-3">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-select" 
                  style={{ width: 'auto', borderColor: mainColor }}
                >
                  <option value="featured">Sort by: Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Rating</option>
                  <option value="name">Name</option>
                </select>
                
                <div className="btn-group" role="group">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`btn ${
                      viewMode === 'grid'
                        ? 'text-white border-0'
                        : 'bg-light text-dark'
                    }`}
                    style={{ 
                      backgroundColor: viewMode === 'grid' ? mainColor : '',
                      borderColor: mainColor
                    }}
                  >
                    <BsGrid3X3Gap />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`btn ${
                      viewMode === 'list'
                        ? 'text-white border-0'
                        : 'bg-light text-dark'
                    }`}
                    style={{ 
                      backgroundColor: viewMode === 'list' ? mainColor : '',
                      borderColor: mainColor
                    }}
                  >
                    <BsListUl />
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border" style={{ color: mainColor }} role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3" style={{ color: mainColor }}>Loading products...</p>
              </div>
            )}

            {/* Product Grid */}
            {!loading && (
              <div className={`row g-4 ${viewMode === 'list' ? 'row-cols-1' : 'row-cols-1 row-cols-sm-2 row-cols-lg-3'}`}>
                {filteredProducts.map((product) => (
                  <div className="col" key={product.id}>
                    <div 
                      className={`card product-card h-100 border-0 shadow-sm ${
                        viewMode === 'list' ? 'flex-row' : ''
                      }`}
                      style={{
                        transition: 'all 0.3s ease',
                        borderRadius: '15px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        opacity: product.inStock ? 1 : 0.7
                      }}
                      onMouseEnter={(e) => {
                        if (product.inStock) {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                          e.currentTarget.style.boxShadow = `0 10px 30px ${mainColor}15`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                      }}
                      onClick={() => product.inStock && onNavigateToProductDetail && onNavigateToProductDetail(product.id, product)}
                    >
                      <div
                        className={viewMode === 'list' ? "col-md-4 position-relative" : "position-relative"}
                        style={{ 
                          height: viewMode === 'grid' ? '250px' : '200px',
                          overflow: 'hidden'
                        }}
                      >
                        <img
                          src={getProductImageUrl(product)}
                          alt={product.title}
                          className="w-100 h-100 object-fit-cover"
                          style={{ 
                            transition: 'transform 0.3s ease',
                            filter: !product.inStock ? 'grayscale(50%)' : 'none'
                          }}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = styleSathiLogo; }}
                          onMouseEnter={(e) => {
                            if (product.inStock) {
                              e.target.style.transform = 'scale(1.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                          }}
                        />
                        
                        {/* Sale Badge */}
                        {product.originalPrice && (
                          <div
                            className="position-absolute top-0 end-0 m-2 px-2 py-1 rounded"
                            style={{ 
                              backgroundColor: '#dc3545', 
                              color: 'white', 
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}
                          >
                            Save {calculateDiscount(product.originalPrice, product.price)}%
                          </div>
                        )}
                        
                        {/* Out of Stock Overlay */}
                        {!product.inStock && (
                          <div
                            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                          >
                            <span 
                              className="text-white fw-bold px-3 py-2 rounded"
                              style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                            >
                              Out of Stock
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className={viewMode === 'list' ? "col-md-8 card-body" : "card-body"}>
                        <p className="small text-muted mb-1">{product.brand}</p>
                        <h6 className="fw-semibold mb-2" style={{ color: mainColor }}>
                          {product.title}
                        </h6>
                        
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div className="d-flex gap-1">
                            {renderStars(product.rating)}
                          </div>
                          <small className="text-muted">({product.rating})</small>
                        </div>
                        
                        {/* Price Section */}
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <p className="h5 fw-bold mb-0" style={{ color: secondaryColor }}>
                            ${product.price}
                          </p>
                          {product.originalPrice && (
                            <span className="text-muted text-decoration-line-through small">
                              ${product.originalPrice}
                            </span>
                          )}
                          <span 
                            className="badge ms-auto"
                            style={{ 
                              backgroundColor: mainColor, 
                              color: 'white',
                              fontSize: '0.7rem'
                            }}
                          >
                            {(() => {
                              const cat = product.category;
                              if (typeof cat === 'object' && cat) {
                                return cat.name || cat.title || JSON.stringify(cat);
                              }
                              return cat || 'Uncategorized';
                            })()}
                          </span>
                        </div>
                        
                        {/* Stock Status */}
                        <div className="mb-3">
                          <small className={product.inStock ? "text-success" : "text-danger"}>
                            {product.inStock 
                              ? 'In Stock'
                              : 'Out of Stock'
                            }
                          </small>
                        </div>
                        
                        {/* Description (only in list view) */}
                        {viewMode === 'list' && (
                          <div>
                            <p className="text-muted small mb-3">
                              {product.description}
                            </p>
                            <div className="mb-3">
                              <small className="fw-semibold">Features:</small>
                              <div className="d-flex flex-wrap gap-1 mt-1">
                                {product.features.map((feature, index) => (
                                  <span 
                                    key={index}
                                    className="badge"
                                    style={{ 
                                      backgroundColor: mainColor + '20',
                                      color: mainColor,
                                      fontSize: '0.65rem'
                                    }}
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleAddToCart(product, e)}
                            className="btn flex-fill py-2"
                            disabled={!product.inStock}
                            style={{ 
                              backgroundColor: product.inStock ? mainColor : '#cccccc', 
                              color: "#fff",
                              borderRadius: '25px',
                              fontWeight: '500',
                              border: 'none',
                              fontSize: '0.9rem',
                              cursor: product.inStock ? 'pointer' : 'not-allowed'
                            }}
                          >
                            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const go = onNavigateToAR || onNavigateToVR;
                              if (go && product.inStock) {
                                go(product)
                              }
                            }}
                            disabled={!product.inStock}
                            className="btn flex-fill py-2 d-flex align-items-center justify-content-center gap-1"
                            style={{ 
                              border: `2px solid ${product.inStock ? mainColor : '#cccccc'}`, 
                              color: product.inStock ? mainColor : '#cccccc',
                              borderRadius: '25px',
                              fontWeight: '500',
                              backgroundColor: 'transparent',
                              fontSize: '0.9rem',
                              cursor: product.inStock ? 'pointer' : 'not-allowed'
                            }}
                          >
                            <FaSearchPlus /> AR
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-5">
                <h4 style={{ color: mainColor }}>No products found</h4>
                <p className="text-muted">Try adjusting your filters or search terms</p>
                <button
                  onClick={clearAllFilters}
                  className="btn mt-3"
                  style={{ 
                    backgroundColor: mainColor, 
                    color: '#fff'
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

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

      <style>{`
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
    </div>
  )
}

export default ProductListingPage
