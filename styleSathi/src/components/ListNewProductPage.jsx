// src/components/ListNewProductPage.jsx
import { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import TryOnBase from './tryon/TryOnBase';
import { catalogApi, apiOrigin } from '../services/api';
import {
  FaArrowLeft,
  FaUpload,
  FaPlus,
  FaMinus,
  FaImage,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaCheckCircle
} from 'react-icons/fa';
import NotificationBell from './NotificationBell';

const ListNewProductPage = ({ 
  onBack, 
  currentUser,
  onLogoClick, 
  onProfileClick, 
  onLogout, 
  onManageInventory, 
  token
}) => {
  const [formData, setFormData] = useState({
    // Basic Details
    name: '',
    description: '',
    category: '',
    brand: '',
    condition: 'new',
    
    // Pricing
    price: '',
    originalPrice: '',
    discountType: 'percentage',
    discountValue: '',
    
    // Inventory
    sku: '',
    stock: '',
    usageDuration: '',
    
    // Additional
    features: [''],
    images: [],
    allowExchange: false,
    donateToCharity: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [glbFile, setGlbFile] = useState(null);
  const [showARPreview, setShowARPreview] = useState(false);
  const [arPreviewMode, setArPreviewMode] = useState('image');
  const [glbObjectUrl, setGlbObjectUrl] = useState('');
  
  const fileInputRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";

  const [categoriesList, setCategoriesList] = useState(['Rings', 'Glasses', 'Watches', 'Shoes', 'Cap/Hat', 'Hairs', 'Makeup', 'Jewelry']);
  const [categoriesMap, setCategoriesMap] = useState({});
  const usageDurations = [
    'Less than 1 month',
    '1-3 months', 
    '3-6 months',
    '6-12 months',
    'More than 12 months'
  ];


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const cats = await catalogApi.getCategories();
        setCategoriesList(cats.map((c) => c.name));
        const map = {};
        for (const c of cats) { map[c.name] = c.id; }
        setCategoriesMap(map);
      } catch {
        setCategoriesList(['Rings', 'Glasses', 'Watches', 'Shoes', 'Cap/Hat', 'Hairs', 'Makeup', 'Jewelry']);
        setCategoriesMap({});
      }
    };
    loadCats();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({
      ...prev,
      features: newFeatures
    }));
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const removeFeature = (index) => {
    if (formData.features.length > 1) {
      const newFeatures = formData.features.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        features: newFeatures
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
        name: file.name,
        file
      }));
      const updatedImages = [...formData.images, ...newImages].slice(0, 5);
      setFormData(prev => ({ ...prev, images: updatedImages }));
    }
  };

  const handleGlbUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file && file.name.toLowerCase().endsWith('.glb')) {
      setGlbFile(file);
      try {
        const url = URL.createObjectURL(file);
        setGlbObjectUrl(url);
      } catch { void 0; }
    } else {
      setGlbFile(null);
      setGlbObjectUrl('');
      Swal.fire({ icon: 'warning', title: 'Invalid File', text: 'Please upload a valid .glb file' });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      const newImages = Array.from(files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
        name: file.name,
        file
      }));
      const updatedImages = [...formData.images, ...newImages].slice(0, 5);
      setFormData(prev => ({ ...prev, images: updatedImages }));
    }
  };

  const removeImage = (imageId) => {
    const updatedImages = formData.images.filter(img => img.id !== imageId);
    setFormData(prev => ({ ...prev, images: updatedImages }));
  };

  const generateSKU = () => {
    const sku = `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setFormData(prev => ({ ...prev, sku }));
  };

  const calculateDiscountedPrice = () => {
    if (!formData.discountValue || !formData.price) return formData.price;
    
    const price = parseFloat(formData.price);
    const discount = parseFloat(formData.discountValue);
    
    if (formData.discountType === 'percentage') {
      return (price * (1 - discount / 100)).toFixed(2);
    } else {
      return Math.max(0, price - discount).toFixed(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try { console.log('ListNewProduct: submit start'); } catch { void 0; }

    // Validate required fields
    const requiredFields = ['name', 'category', 'price', 'stock'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      Swal.fire({ icon: 'warning', title: 'Missing Fields', text: 'Please fill in all required fields' });
      setIsLoading(false);
      return;
    }

    // Client-side validation and minimal payload expected by backend
    const priceNum = Number(formData.price);
    const stockNum = Number(formData.stock) || 0;
    if (!formData.name?.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Product name is required' }); return; }
    if (!formData.description?.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Product description is required' }); return; }
    if (!formData.category?.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Product category is required' }); return; }
    if (!formData.brand?.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Product brand is required' }); return; }
    if (!categoriesMap[formData.category]) {
      Swal.fire({ icon: 'warning', title: 'Invalid Category', text: 'Please select a valid category from the list' });
      setIsLoading(false);
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) { Swal.fire({ icon: 'warning', title: 'Invalid Price', text: 'Price must be a positive number' }); return; }
    const isValidHttpUrl = (u) => {
      try {
        const url = new URL(u);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    };
    const fileObj = formData.images?.[0]?.file;
    let imageUrl = '';
    if (!fileObj) {
      const rawImageUrl = formData.image_url || formData.images[0]?.url || '';
      imageUrl = rawImageUrl;
      if (!imageUrl || !isValidHttpUrl(imageUrl)) {
        imageUrl = 'https://via.placeholder.com/600x600?text=Product+Image';
        Swal.fire({ icon: 'info', title: 'Placeholder Image', text: 'Using a placeholder image URL. Please provide a valid https image URL to display your product image.' });
      }
    }

    const skuValue = (formData.sku?.trim()) || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const categoryId = categoriesMap[formData.category];

    const payload = {
      title: formData.name.trim(),
      description: formData.description.trim(),
      ...(Number.isFinite(Number(categoryId)) ? { category_id: Number(categoryId) } : {}),
      category_name: formData.category,
      brand: formData.brand.trim(),
      price: priceNum,
      image_url: imageUrl,
      in_stock: stockNum > 0,
      sku: skuValue,
      stock: stockNum,
      ...(formData.originalPrice ? { original_price: Number(formData.originalPrice) } : {}),
      features: Array.isArray(formData.features) ? formData.features.filter(Boolean) : [],
    };
    try { console.log('ListNewProduct: payload', payload); } catch { void 0; }
    try {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (k === 'features' && Array.isArray(v)) {
          fd.append(k, v.join(', '));
        } else {
          fd.append(k, String(v));
        }
      });
      if (fileObj instanceof File) {
        fd.delete('image_url');
        fd.append('image', fileObj, fileObj.name);
      }
      if (glbFile instanceof File) {
        fd.append('model_glb', glbFile, glbFile.name);
      }
      try {
        const entries = [];
        for (const [k, v] of fd.entries()) {
          entries.push([k, v instanceof File ? { name: v.name, size: v.size, type: v.type } : String(v)]);
        }
        console.log('ListNewProduct: formData entries', entries);
      } catch { void 0; }
      try { console.log('ListNewProduct: POST', `${apiOrigin}/products/create`); } catch { void 0; }
      const result = await catalogApi.createProductMultipart(token, fd);
      try { console.log('ListNewProduct: result', result); } catch { void 0; }
      window.dispatchEvent(new Event('catalogInvalidated'));
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'product-listed', title: 'Product Listed', message: `${payload.title} listed successfully`, time: 'Just now' } }))
      setIsLoading(false);
      Swal.fire({ icon: 'success', title: 'Success', text: 'Product listed successfully' });
      if (onManageInventory) onManageInventory();
      else onBack();
    } catch (e) {
      setIsLoading(false);
      try { console.error('ListNewProduct: error', e); } catch { void 0; }
      Swal.fire({ icon: 'error', title: 'Listing Failed', text: e.message || 'Failed to list product' });
    }
  };

  useEffect(() => {
    if (showARPreview && arPreviewMode === 'glb' && glbObjectUrl) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      document.head.appendChild(script);
      return () => {
        try { document.head.removeChild(script); } catch { void 0; }
      };
    }
  }, [showARPreview, arPreviewMode, glbObjectUrl]);


  const renderProfileDropdown = () => (
    <div className="position-relative" ref={profileDropdownRef}>
      <div
        className="d-flex align-items-center gap-2 cursor-pointer hover-scale"
        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        style={{ transition: 'transform 0.2s' }}
      >
        <div
          className="rounded-circle d-flex align-items-center justify-content-center border"
          style={{
            width: "45px",
            height: "45px",
            backgroundColor: `${mainColor}20`,
            borderColor: `${mainColor}50`,
          }}
        >
          <FaUser style={{ color: mainColor, fontSize: '18px' }} />
        </div>

        <div className="d-none d-md-block text-start">
          <div style={{ color: mainColor, fontWeight: '500', fontSize: '0.9rem' }}>
            {currentUser?.name || 'John Doe'}
          </div>
          <button
            className="badge border-0 p-1 small mt-1 d-flex align-items-center gap-1"
            style={{ 
              backgroundColor: `${mainColor}15`,
              color: mainColor,
              fontSize: '0.7rem'
            }}
          >
            <FaCheckCircle size={10} />
            Verified Seller
          </button>
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
            onClick={() => {
              setShowProfileDropdown(false);
              if (onProfileClick) onProfileClick();
            }}
          >
            <FaUser size={14} /> Profile
          </button>

          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
            style={{ color: '#dc3545', fontSize: '0.9rem' }}
            onClick={() => {
              setShowProfileDropdown(false);
              if (onLogout) onLogout();
            }}
          >
            <FaSignOutAlt size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            {/* LOGO */}
            <div className="col-md-3">
              <h1
                className="fs-2 fw-bold cursor-pointer mb-0"
                style={{ color: mainColor }}
                onClick={onLogoClick}
              >
                STYLE SATHI
              </h1>
            </div>

            {/* Navigation */}
            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-center">
                <nav className="text-sm">
                  <button
                    onClick={onBack}
                    className="text-muted text-decoration-none border-0 bg-transparent d-flex align-items-center gap-1"
                  >
                    <FaArrowLeft size={12} />
                    Back to Dashboard
                  </button>
                  <span className="text-muted mx-2">›</span>
                  <span className="fw-semibold" style={{ color: mainColor }}>
                    List New Product
                  </span>
                </nav>
              </div>
            </div>

            {/* NOTIFICATIONS + PROFILE */}
            <div className="col-md-3">
              <div className="d-flex align-items-center justify-content-end gap-4">
                <NotificationBell mainColor={mainColor} secondaryColor={secondaryColor} />
                {renderProfileDropdown()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-4">
        {/* Title Section */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="display-6 fw-bold text-dark mb-2">List Your Product</h1>
            <p className="text-muted">Fill in the details to list your product on STYLE SATHI</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-4">
            {/* Left Column - Main Form */}
            <div className="col-lg-8">
              {/* Basic Details Section */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-4" style={{ color: mainColor }}>
                    Basic Details
                  </h5>
                  
                  <div className="row g-3">
                    {/* Product Title */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Product Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Premium Diamond Ring"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>

                    {/* Category */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Category *</label>
                      <select 
                        className="form-select"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        required
                      >
                        <option value="">Select a category</option>
                        {categoriesList.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    {/* Brand */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Brand</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Tiffany & Co., Rolex, Ray-Ban"
                        value={formData.brand}
                        onChange={(e) => handleInputChange('brand', e.target.value)}
                      />
                    </div>

                    {/* Condition */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Condition</label>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div
                            className={`card cursor-pointer border-2 ${
                              formData.condition === 'new' 
                                ? 'border-primary' 
                                : 'border-light'
                            }`}
                            onClick={() => handleInputChange('condition', 'new')}
                            style={{ 
                              transition: 'all 0.3s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div className="card-body text-center">
                              <h6 className="fw-semibold">New with Tags</h6>
                              <p className="text-muted small mb-0">Brand new, unused</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div
                            className={`card cursor-pointer border-2 ${
                              formData.condition === 'pre-owned' 
                                ? 'border-primary' 
                                : 'border-light'
                            }`}
                            onClick={() => handleInputChange('condition', 'pre-owned')}
                            style={{ 
                              transition: 'all 0.3s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div className="card-body text-center">
                              <h6 className="fw-semibold">Pre-owned</h6>
                              <p className="text-muted small mb-0">Used but in good condition</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Usage Duration for Pre-owned */}
                    {formData.condition === 'pre-owned' && (
                      <div className="col-12">
                        <label className="form-label fw-semibold">Usage Duration</label>
                        <select 
                          className="form-select"
                          value={formData.usageDuration}
                          onChange={(e) => handleInputChange('usageDuration', e.target.value)}
                        >
                          <option value="">Select duration</option>
                          {usageDurations.map((duration, index) => (
                            <option key={index} value={duration}>{duration}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing Details Section */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-4" style={{ color: mainColor }}>
                    Pricing Details
                  </h5>
                  
                  <div className="row g-3">
                    {/* Price */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Price ($) *</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Stock Quantity *</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Enter stock quantity"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => handleInputChange('stock', e.target.value)}
                        required
                      />
                    </div>

                    {/* Original Price */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Original Price</label>
                      <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          value={formData.originalPrice}
                          onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                        />
                      </div>
                      <small className="text-muted">Leave empty if no discount</small>
                    </div>

                    {/* Discount */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Discount (Optional)</label>
                      <div className="row g-2">
                        <div className="col-7">
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0"
                            value={formData.discountValue}
                            onChange={(e) => handleInputChange('discountValue', e.target.value)}
                          />
                        </div>
                        <div className="col-5">
                          <select 
                            className="form-select"
                            value={formData.discountType}
                            onChange={(e) => handleInputChange('discountType', e.target.value)}
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">$</option>
                          </select>
                        </div>
                      </div>
                      {formData.discountValue && (
                        <div className="mt-2">
                          <small className="text-success">
                            Final Price: ${calculateDiscountedPrice()}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Information Section */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-4" style={{ color: mainColor }}>
                    Product Information
                  </h5>
                  
                  <div className="row g-3">
                    {/* Description */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Description *</label>
                      <textarea
                        rows={6}
                        className="form-control"
                        placeholder="Describe your product..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        required
                      />
                    </div>

                    {/* Features */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Product Features</label>
                      {formData.features.map((feature, index) => (
                        <div key={index} className="row g-2 mb-2">
                          <div className="col-10">
                            <input
                              type="text"
                              className="form-control"
                              placeholder={`Feature ${index + 1}`}
                              value={feature}
                              onChange={(e) => handleFeatureChange(index, e.target.value)}
                            />
                          </div>
                          <div className="col-2">
                            {formData.features.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-outline-danger w-100"
                                onClick={() => removeFeature(index)}
                              >
                                <FaMinus />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-outline-primary mt-2"
                        onClick={addFeature}
                      >
                        <FaPlus className="me-2" />
                        Add Feature
                      </button>
                    </div>

                    {/* Media Uploads */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">3D Model (GLB) or Product Image *</label>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="border rounded p-3">
                            <div className="mb-2 fw-semibold">Upload GLB (optional)</div>
                            <input type="file" accept=".glb" className="form-control" onChange={handleGlbUpload} />
                            {glbFile && (
                              <div className="small text-muted mt-2">{glbFile.name}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="border rounded p-3">
                            <div className="mb-2 fw-semibold">Upload PNG/JPG (required if no GLB)</div>
                            <input type="file" accept="image/png,image/jpeg" multiple={false} className="form-control" onChange={handleImageUpload} />
                            {formData.images[0] && (
                              <div className="mt-2 d-flex align-items-center gap-2">
                                <img src={formData.images[0].url} alt={formData.images[0].name} style={{ width: '64px', height: '64px', objectFit: 'cover' }} />
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeImage(formData.images[0].id)}>Remove</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            if (glbFile) { setArPreviewMode('glb'); setShowARPreview(true); }
                            else if (formData.images[0]) { setArPreviewMode('image'); setShowARPreview(true); }
                            else { Swal.fire({ icon: 'info', title: 'Preview Unavailable', text: 'Please upload a GLB or an image first' }); }
                          }}
                        >
                          Preview in AR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Details */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-4" style={{ color: mainColor }}>
                    Inventory Details
                  </h5>
                  
                  <div className="row g-3">
                    {/* SKU */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">SKU</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Generate or enter SKU"
                          value={formData.sku}
                          onChange={(e) => handleInputChange('sku', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={generateSKU}
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Images and Actions */}
            <div className="col-lg-4">
              {/* Product Images Section */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-4" style={{ color: mainColor }}>
                    Product Images
                  </h5>
                  
                  {/* Upload Area */}
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="border-2 border-dashed rounded p-4 text-center mb-4 cursor-pointer"
                    style={{ 
                      borderColor: mainColor + '50',
                      backgroundColor: mainColor + '10'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload size={48} className="text-muted mb-3" />
                    <p className="text-muted mb-2">
                      Drag and drop up to 5 images or{' '}
                      <span style={{ color: mainColor }} className="fw-semibold">
                        click to upload
                      </span>
                    </p>
                    <p className="text-muted small">Min 800x800px, Max 5MB each</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="d-none"
                    />
                  </div>

                  {/* Image Preview */}
                  <div className="row g-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="col-4 col-md-6">
                        <div className="position-relative border rounded p-2" style={{ aspectRatio: '1/1' }}>
                          {formData.images[index] ? (
                            <>
                              <img
                                src={formData.images[index].url}
                                alt={`Upload ${index + 1}`}
                                className="w-100 h-100 object-fit-cover rounded"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(formData.images[index].id)}
                                className="position-absolute top-0 end-0 bg-danger text-white rounded-circle border-0"
                                style={{ width: '24px', height: '24px', transform: 'translate(50%, -50%)' }}
                              >
                                <FaTimes size={12} />
                              </button>
                            </>
                          ) : (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                              <FaImage size={24} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                  <h5 className="card-title fw-bold mb-4" style={{ color: mainColor }}>
                    Additional Options
                  </h5>
                  
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="allow-exchange"
                      checked={formData.allowExchange}
                      onChange={(e) => handleInputChange('allowExchange', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="allow-exchange">
                      Allow Exchange
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="donate-charity"
                      checked={formData.donateToCharity}
                      onChange={(e) => handleInputChange('donateToCharity', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="donate-charity">
                      Donate 5% to Charity
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions Card */}
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h6 className="fw-semibold mb-3">Publish</h6>
                  
                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-lg py-3 fw-semibold text-white"
                      style={{ backgroundColor: mainColor, borderColor: mainColor }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Listing Product...
                        </>
                      ) : (
                        'List Product'
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={onBack}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              {/* Tips Card */}
              <div className="card border-0 shadow-sm mt-4">
                <div className="card-body">
                  <h6 className="fw-semibold mb-3">Listing Tips</h6>
                  <ul className="small text-muted">
                    <li>Use high-quality, clear images</li>
                    <li>Write detailed, accurate descriptions</li>
                    <li>Set competitive pricing</li>
                    <li>Include all relevant features</li>
                    <li>Ensure accurate stock levels</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {showARPreview && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowARPreview(false)}>
          <div className="modal-dialog modal-xl modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title">AR Preview</h5>
                <button type="button" className="btn-close" onClick={() => setShowARPreview(false)}></button>
              </div>
              <div className="modal-body">
                {arPreviewMode === 'glb' && glbObjectUrl ? (
                  <model-viewer src={glbObjectUrl} ar camera-controls auto-rotate style={{ width: '100%', height: '600px' }}></model-viewer>
                ) : (
                  <TryOnBase overlaySrc={formData.images[0]?.url || ''} mode={'body'} onClose={() => setShowARPreview(false)} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cursor-pointer {
          cursor: pointer;
        }
        .hover-scale:hover {
          transform: scale(1.05);
        }
        .object-fit-cover {
          object-fit: cover;
        }
      `}</style>
    </div>
  );
};

export default ListNewProductPage;
