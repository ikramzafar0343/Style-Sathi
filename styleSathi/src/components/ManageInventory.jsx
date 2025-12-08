// src/components/ManageInventory.jsx
import { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { 
  FaUser, 
  FaArrowLeft, 
  FaBox, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaSignOutAlt, 
  FaCheckCircle,
  FaPlus,
  FaMinus,
  FaBell,
  FaShoppingCart,
  FaFilter,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaTimes,
  FaExclamationTriangle,
  FaChartLine,
  FaSync,
  FaDownload,
  FaUpload
} from 'react-icons/fa';
import { catalogApi, ordersApi, resolveAssetUrl } from '../services/api';
 
import NotificationBell from './NotificationBell';

const ManageInventory = ({ 
  onBack, 
  onLogoClick, 
  onProfileClick, 
  onLogout,
  currentUser,
  token,
  onAddProduct 
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({ 
    title: '', 
    price: 0, 
    originalPrice: 0,
    category: '', 
    brand: '',
    description: '',
    inStock: true,
    features: [],
    weight: '',
    dimensions: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  const [newFeature, setNewFeature] = useState('');
  const [bulkStockUpdate, setBulkStockUpdate] = useState('');
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  const dropdownRef = useRef(null);

  // Colors
  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";
  const successColor = "#28a745";
  const warningColor = "#ffc107";
  const dangerColor = "#dc3545";

  // Initialize products with enhanced data structure
  const [products, setProducts] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});

  

  // Categories for filters
  const [allCategories, setAllCategories] = useState(['all']);
  const statuses = ['all', 'active', 'out_of_stock', 'inactive'];

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await catalogApi.getCategories();
        setAllCategories(['all', ...cats.map((c) => c.name)]);
        const map = {};
        for (const c of cats) map[c.name] = c.id;
        setCategoriesMap(map);
      } catch { void 0; }
      try {
        const list = await catalogApi.getMyProducts(token);
        const orders = await ordersApi.getSellerOrders(token);
        const perProduct = {};
        for (const o of orders || []) {
          const items = Array.isArray(o.items) ? o.items : [];
          for (const it of items) {
            const pid = (it.product && it.product.id) || null;
            const qty = Number(it.quantity || 0);
            const price = Number(it.price || (it.product && it.product.price) || 0);
            if (!pid) continue;
            if (!perProduct[pid]) perProduct[pid] = { sales: 0, revenue: 0 };
            perProduct[pid].sales += qty;
            perProduct[pid].revenue += qty * price;
          }
        }
        const mapped = list.map((p) => {
          const catName = typeof p.category === 'string' ? p.category : p.category?.name;
          const agg = perProduct[p.id] || { sales: 0, revenue: 0 };
          return {
            id: p.id,
            name: p.title,
            sku: p.sku || `SKU-${String(p.id).padStart(4, '0')}`,
            stock: p.stock || 0,
            status: p.in_stock ? 'active' : 'out_of_stock',
            sales: agg.sales,
            revenue: agg.revenue,
            image: resolveAssetUrl(p.image_url || p.image || p.imageUrl),
            category: catName || 'all',
            subcategory: catName,
            lastUpdated: new Date().toISOString(),
            weight: '',
            dimensions: '',
            rating: p.rating || 0,
            reviews: 0,
            price: Number(p.price),
            brand: p.brand,
            description: p.description || '',
            features: Array.isArray(p.features) ? p.features : [],
          };
        });
        setProducts(mapped);
      } catch { setProducts([]); }
    };
    load();
    const handler = () => load();
    window.addEventListener('catalogInvalidated', handler);
    const orderHandler = (e) => {
      const t = String((e.detail || {}).type || '');
      if (t.includes('order-')) load();
    };
    window.addEventListener('notification:push', orderHandler);
    return () => window.removeEventListener('catalogInvalidated', handler);
  }, [token]);

  

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });

  // Handle sort
  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  // Stock management
  const updateStock = async (id, newStock) => {
    const updatedProducts = products.map(p => 
      p.id === id 
        ? { 
            ...p, 
            stock: Math.max(0, newStock),
            status: newStock > 0 ? 'active' : 'out_of_stock',
            lastUpdated: new Date().toISOString()
          }
        : p
    );
    setProducts(updatedProducts);
    updateNotifications(updatedProducts);
    try {
      await catalogApi.updateProduct(token, id, { stock: Math.max(0, newStock), in_stock: newStock > 0 });
      window.dispatchEvent(new Event('catalogInvalidated'));
    } catch (e) { console.warn('update stock failed', e); }
  };

  // Bulk stock update
  const handleBulkStockUpdate = async () => {
    const stockValue = parseInt(bulkStockUpdate);
    if (!isNaN(stockValue) && selectedProducts.size > 0) {
      const updatedProducts = products.map(p => 
        selectedProducts.has(p.id)
          ? { 
              ...p, 
              stock: Math.max(0, stockValue),
              status: stockValue > 0 ? 'active' : 'out_of_stock',
              lastUpdated: new Date().toISOString()
            }
          : p
      );
      
      setProducts(updatedProducts);
      updateNotifications(updatedProducts);
      try {
        for (const id of Array.from(selectedProducts.values())) {
          await catalogApi.updateProduct(token, id, { stock: Math.max(0, stockValue), in_stock: stockValue > 0 });
        }
        window.dispatchEvent(new Event('catalogInvalidated'));
      } catch (e) { console.warn('bulk stock update failed', e); }
      setBulkStockUpdate('');
      setShowBulkUpdate(false);
      setSelectedProducts(new Set());
    }
  };

  // Select all products
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Toggle product selection
  const toggleProductSelection = (id) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const updateNotifications = (updatedProducts) => {
    updatedProducts.forEach(product => {
      if (product.stock <= 5 && product.stock > 0) {
        window.dispatchEvent(new CustomEvent('notification:push', {
          detail: {
            type: 'low-stock',
            title: 'Low Stock',
            message: `${product.name} stock is running low (${product.stock} left)`,
            time: 'Just now'
          }
        }));
      } else if (product.stock === 0) {
        window.dispatchEvent(new CustomEvent('notification:push', {
          detail: {
            type: 'sold-out',
            title: 'Out of Stock',
            message: `${product.name} is out of stock`,
            time: 'Just now'
          }
        }));
      }
    });
  };

  // Product editing
  const handleEdit = (product) => {
    setEditingProduct(product);
    setEditFormData({
      title: product.name,
      price: product.price,
      originalPrice: product.originalPrice || product.price * 1.2,
      category: product.category,
      brand: product.brand,
      description: product.description,
      inStock: product.status !== 'out_of_stock',
      features: product.features || [],
      weight: product.weight,
      dimensions: product.dimensions
    });
  };

  const handleSaveEdit = () => {
    setShowSaveConfirm(true);
  };

  const confirmSaveEdit = async () => {
    if (editingProduct) {
      const updatedProducts = products.map(p => 
        p.id === editingProduct.id 
          ? { 
              ...p, 
              name: editFormData.title,
              price: editFormData.price,
              originalPrice: editFormData.originalPrice,
              category: editFormData.category,
              brand: editFormData.brand,
              description: editFormData.description,
              features: editFormData.features,
              weight: editFormData.weight,
              dimensions: editFormData.dimensions,
              status: editFormData.inStock ? 'active' : 'inactive',
              lastUpdated: new Date().toISOString()
            }
          : p
      );
      
      setProducts(updatedProducts);
      const payload = {
        title: String(editFormData.title || editingProduct.name),
        description: String(editFormData.description || ''),
        brand: String(editFormData.brand || ''),
        price: Number(editFormData.price || 0),
        in_stock: !!editFormData.inStock,
        features: Array.isArray(editFormData.features) ? editFormData.features.filter(Boolean) : [],
      };
      const catId = categoriesMap[String(editFormData.category || '')];
      if (catId) payload.category_id = catId;
      try {
        await catalogApi.updateProduct(token, editingProduct.id, payload);
        window.dispatchEvent(new Event('catalogInvalidated'));
      } catch (e) { console.warn('save edit failed', e); }
      setEditingProduct(null);
      setEditFormData({ 
        title: '', 
        price: 0, 
        originalPrice: 0, 
        category: '', 
        brand: '', 
        description: '', 
        inStock: true, 
        features: [],
        weight: '',
        dimensions: ''
      });
      setShowSaveConfirm(false);
    }
  };

  const cancelSaveEdit = () => {
    setShowSaveConfirm(false);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditFormData({ 
      title: '', 
      price: 0, 
      originalPrice: 0, 
      category: '', 
      brand: '', 
      description: '', 
      inStock: true, 
      features: [],
      weight: '',
      dimensions: ''
    });
    setNewFeature('');
  };

  // Feature management
  const addFeature = () => {
    if (newFeature.trim()) {
      setEditFormData({
        ...editFormData,
        features: [...editFormData.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setEditFormData({
      ...editFormData,
      features: editFormData.features.filter((_, i) => i !== index)
    });
  };

  // Product deletion
  const handleDelete = (id) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      const { value: reason } = await Swal.fire({
        title: 'Enter reason for deletion',
        input: 'text',
        inputPlaceholder: 'Reason',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        inputValidator: (v) => (!v || !String(v).trim()) ? 'Reason is required' : undefined,
      });
      if (!reason) return;
      try {
        await catalogApi.deleteProduct(token, showDeleteConfirm, String(reason).trim());
        setProducts(products.filter(p => p.id !== showDeleteConfirm));
        window.dispatchEvent(new Event('catalogInvalidated'));
      } catch (e) {
        Swal.fire({ icon: 'error', title: 'Delete Failed', text: e?.message || 'Failed to delete product' });
      }
      setShowDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Status management
  const handleToggleStatus = async (productId) => {
    let nextStatus = 'active';
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        nextStatus = p.status === 'active' ? 'inactive' : 'active';
        return { ...p, status: nextStatus, lastUpdated: new Date().toISOString() };
      }
      return p;
    });
    setProducts(updatedProducts);
    try {
      await catalogApi.updateProduct(token, productId, { in_stock: nextStatus === 'active' });
      window.dispatchEvent(new Event('catalogInvalidated'));
    } catch (e) { console.warn('toggle status failed', e); }
  };

  // Status badge helper
  const getStatusBadge = (status, stock) => {
    const statusConfig = {
      active: { class: 'bg-success', text: 'Active', icon: FaEye },
      out_of_stock: { class: 'bg-warning text-dark', text: 'Out of Stock', icon: FaExclamationTriangle },
      inactive: { class: 'bg-secondary', text: 'Inactive', icon: FaEyeSlash }
    };
    
    // Auto-update status based on stock
    if (stock === 0 && status !== 'out_of_stock') {
      return statusConfig.out_of_stock;
    }
    
    return statusConfig[status] || statusConfig.inactive;
  };

  // Stock badge helper
  const getStockBadge = (stock) => {
    if (stock > 20) return { class: 'bg-success', text: 'High' };
    if (stock > 10) return { class: 'bg-warning text-dark', text: 'Medium' };
    if (stock > 0) return { class: 'bg-info', text: 'Low' };
    return { class: 'bg-danger', text: 'Out' };
  };

  // Quick actions
  const quickActions = [
    {
      label: 'Add New Product',
      icon: FaPlus,
      color: successColor,
      action: () => {
        if (onAddProduct) onAddProduct();
      }
    },
    {
      label: 'Refresh Data',
      icon: FaSync,
      color: warningColor,
      action: () => {
        window.dispatchEvent(new Event('catalogInvalidated'));
      }
    }
  ];

  // Statistics
  const stats = [
    {
      label: 'Total Products',
      value: products.length,
      color: 'primary',
      icon: FaBox,
      change: '+2.5%'
    },
    {
      label: 'Active Products',
      value: products.filter(p => p.status === 'active').length,
      color: 'success',
      icon: FaEye,
      change: '+1.2%'
    },
    {
      label: 'Out of Stock',
      value: products.filter(p => p.status === 'out_of_stock').length,
      color: 'warning',
      icon: FaExclamationTriangle,
      change: '-0.5%'
    },
    {
      label: 'Total Stock Value',
      value: `$${products.reduce((sum, p) => sum + (p.stock * p.price), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: secondaryColor,
      icon: FaShoppingCart,
      change: '+3.8%'
    }
  ];


  // Profile dropdown component
  const renderProfileDropdown = () => (
    <div className="position-relative" ref={dropdownRef}>
      <div
        className="d-flex align-items-center gap-2 cursor-pointer hover-scale"
        onClick={() => setShowDropdown(!showDropdown)}
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

      {showDropdown && (
        <div 
          className="position-absolute bg-white shadow rounded end-0 mt-2 py-2"
          style={{ 
            minWidth: '200px',
            zIndex: 1000,
            border: `1px solid ${mainColor}20`
          }}
        >
          <div className="px-3 py-2 border-bottom">
            <div className="fw-semibold">{currentUser?.name || 'John Doe'}</div>
            <small className="text-muted">{currentUser?.email || 'seller@stylesathi.com'}</small>
          </div>
          
          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
            style={{ color: mainColor, fontSize: '0.9rem' }}
            onClick={() => {
              setShowDropdown(false);
              onProfileClick?.();
            }}
          >
            <FaUser size={14} /> Profile
          </button>

          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
            style={{ color: '#6c757d', fontSize: '0.9rem' }}
            onClick={() => {
              setShowDropdown(false);
              // Settings handler
            }}
          >
            <FaSync size={14} /> Settings
          </button>

          <div className="border-top my-1"></div>

          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
            style={{ color: dangerColor, fontSize: '0.9rem' }}
            onClick={() => {
              setShowDropdown(false);
              onLogout?.();
            }}
          >
            <FaSignOutAlt size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );

  // Render product cards for grid view
  const renderProductCards = () => (
    <div className="row g-4">
      {sortedProducts.map((product) => {
        const statusBadge = getStatusBadge(product.status, product.stock);
        const stockBadge = getStockBadge(product.stock);
        const StatusIcon = statusBadge.icon;
        
        return (
          <div key={product.id} className="col-xl-4 col-lg-6 col-md-6">
            <div className="card h-100 border-0 shadow-sm hover-shadow">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={resolveAssetUrl(product.image)}
                      alt={product.name}
                      className="rounded"
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=styleSathiLogo; }}
                    />
                    <div>
                      <h6 className="fw-semibold mb-1">{product.name}</h6>
                      <small className="text-muted">{product.brand}</small>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="form-check-input"
                  />
                </div>

                <div className="mb-3">
                  <code className="text-muted small">{product.sku}</code>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <small className="text-muted d-block">Price</small>
                    <strong style={{ color: secondaryColor }}>
                      ${product.price.toFixed(2)}
                    </strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Stock</small>
                    <span className={`badge ${stockBadge.class}`}>
                      {product.stock} units
                    </span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Sales</small>
                    <strong>{product.sales}</strong>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Revenue</small>
                    <strong style={{ color: successColor }}>
                      ${product.revenue.toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className={`badge ${statusBadge.class} d-flex align-items-center gap-1`}>
                    <StatusIcon size={10} />
                    {statusBadge.text}
                  </span>
                  <span 
                    className="badge text-uppercase"
                    style={{ 
                      backgroundColor: `${mainColor}15`,
                      color: mainColor
                    }}
                  >
                    {product.category}
                  </span>
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary flex-fill d-flex align-items-center justify-content-center gap-1"
                    onClick={() => handleEdit(product)}
                  >
                    <FaEdit size={12} />
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary flex-fill d-flex align-items-center justify-content-center gap-1"
                    onClick={() => handleToggleStatus(product.id)}
                  >
                    {product.status === 'active' ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                    {product.status === 'active' ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger flex-fill d-flex align-items-center justify-content-center gap-1"
                    onClick={() => handleDelete(product.id)}
                  >
                    <FaTrash size={12} />
                    Delete
                  </button>
                </div>

                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">Last updated</small>
                    <small className="text-muted">
                      {new Date(product.lastUpdated).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render product table for table view
  const renderProductTable = () => (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead className="table-light">
          <tr>
            <th className="ps-4" style={{ width: '50px' }}>
              <input
                type="checkbox"
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={toggleSelectAll}
                className="form-check-input"
              />
            </th>
            <th 
              className="cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Product {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>SKU</th>
            <th>Category</th>
            <th 
              className="cursor-pointer"
              onClick={() => handleSort('price')}
            >
              Price {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="cursor-pointer"
              onClick={() => handleSort('stock')}
            >
              Stock {sortConfig.key === 'stock' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>Status</th>
            <th 
              className="cursor-pointer"
              onClick={() => handleSort('sales')}
            >
              Sales {sortConfig.key === 'sales' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="cursor-pointer"
              onClick={() => handleSort('revenue')}
            >
              Revenue {sortConfig.key === 'revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th className="pe-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedProducts.map((product) => {
            const statusBadge = getStatusBadge(product.status, product.stock);
            const stockBadge = getStockBadge(product.stock);
            const StatusIcon = statusBadge.icon;
            
            return (
              <tr key={product.id}>
                <td className="ps-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="form-check-input"
                  />
                </td>
                <td>
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={resolveAssetUrl(product.image)}
                      alt={product.name}
                      className="rounded"
                      style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.onerror=null; e.currentTarget.src=styleSathiLogo; }}
                    />
                    <div>
                      <h6 className="fw-semibold mb-1">{product.name}</h6>
                      <small className="text-muted">{product.brand}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <code>{product.sku}</code>
                </td>
                <td>
                  <span 
                    className="badge text-uppercase"
                    style={{ 
                      backgroundColor: `${mainColor}15`,
                      color: mainColor
                    }}
                  >
                    {product.category}
                  </span>
                </td>
                <td>
                  <div>
                    <strong style={{ color: secondaryColor }}>
                      ${product.price.toFixed(2)}
                    </strong>
                    {product.originalPrice > product.price && (
                      <div>
                        <small className="text-muted text-decoration-line-through">
                          ${product.originalPrice.toFixed(2)}
                        </small>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${stockBadge.class}`}>
                      {stockBadge.text}
                    </span>
                    <span className="fw-semibold">{product.stock}</span>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary p-1 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '28px', height: '28px' }}
                        onClick={() => updateStock(product.id, product.stock - 1)}
                        disabled={product.stock <= 0}
                      >
                        <FaMinus size={10} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary p-1 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '28px', height: '28px' }}
                        onClick={() => updateStock(product.id, product.stock + 1)}
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${statusBadge.class} d-flex align-items-center gap-1`}>
                    <StatusIcon size={10} />
                    {statusBadge.text}
                  </span>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <strong>{product.sales}</strong>
                    <FaChartLine size={12} className="text-success" />
                  </div>
                </td>
                <td>
                  <strong style={{ color: secondaryColor }}>
                    ${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </td>
                <td className="pe-4">
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-primary p-2 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => handleEdit(product)}
                      title="Edit product"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary p-2 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => handleToggleStatus(product.id)}
                      title={product.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {product.status === 'active' ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger p-2 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => handleDelete(product.id)}
                      title="Delete product"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
              <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '40px', cursor: 'pointer' }} onClick={onLogoClick} />
            </div>

            {/* Back Button */}
            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-center">
                <button
                  className="btn d-flex align-items-center gap-2"
                  style={{ 
                    color: mainColor,
                    border: `1px solid ${mainColor}`,
                    borderRadius: '25px',
                    padding: '8px 20px'
                  }}
                  onClick={onBack}
                >
                  <FaArrowLeft size={14} />
                  Back to Dashboard
                </button>
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
            <div className="d-flex align-items-center gap-3 mb-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: `${mainColor}15`,
                }}
              >
                <FaBox size={24} style={{ color: mainColor }} />
              </div>
              <div>
                <h1 className="display-6 fw-bold text-dark mb-0">Manage Inventory</h1>
                <p className="text-muted mb-0">Update stock levels and manage your products</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="row g-3 mb-4">
          {quickActions.map((action, index) => (
            <div key={index} className="col-xl-3 col-lg-6">
              <div 
                className="card border-0 shadow-sm h-100 cursor-pointer hover-scale"
                onClick={action.action}
                style={{ transition: 'transform 0.2s' }}
              >
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{
                        width: '50px',
                        height: '50px',
                        backgroundColor: `${action.color}20`,
                        color: action.color
                      }}
                    >
                      <action.icon size={20} />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1">{action.label}</h6>
                      <p className="text-muted mb-0 small">Click to {action.label.toLowerCase()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="row g-3 mb-4">
          {stats.map((stat, index) => (
            <div key={index} className="col-xl-3 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <h4 className="fw-bold mb-1">{stat.value}</h4>
                      <p className="text-muted mb-1">{stat.label}</p>
                      <small 
                        className={`fw-semibold ${
                          stat.change.startsWith('+') ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {stat.change} from last month
                      </small>
                    </div>
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: stat.color === secondaryColor ? `${secondaryColor}20` : `${mainColor}20`,
                        color: stat.color === secondaryColor ? secondaryColor : mainColor
                      }}
                    >
                      <stat.icon size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Controls */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-center">
              <div className="col-md-3">
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control ps-5 py-2"
                    placeholder="Search products by name, SKU, or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
              <div className="col-md-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-select"
                  style={{ 
                    borderColor: mainColor,
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ 
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="all">All Status</option>
                  {statuses.filter(status => status !== 'all').map(status => (
                    <option key={status} value={status}>
                      {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small">View:</span>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setViewMode('table')}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setViewMode('grid')}
                    >
                      Grid
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-outline-secondary w-100"
                  style={{ borderRadius: '25px' }}
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setFilterStatus('all');
                    setSelectedProducts(new Set());
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedProducts.size > 0 && (
              <div className="mt-3 p-3 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{selectedProducts.size} products selected</strong>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        selectedProducts.forEach(id => handleDelete(id));
                        setSelectedProducts(new Set());
                      }}
                    >
                      Delete Selected
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: mainColor, color: 'white' }}
                      onClick={() => setShowBulkUpdate(true)}
                    >
                      Update Stock
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products Display */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Products ({filteredProducts.length})
              {selectedProducts.size > 0 && (
                <span className="text-muted ms-2">({selectedProducts.size} selected)</span>
              )}
            </h5>
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">
                Sorted by: {sortConfig.key} ({sortConfig.direction})
              </small>
            </div>
          </div>
          <div className="card-body p-0">
            {viewMode === 'table' ? renderProductTable() : renderProductCards()}

            {filteredProducts.length === 0 && (
              <div className="text-center py-5">
                <FaBox size={48} className="text-muted mb-3 opacity-25" />
                <h5 className="text-muted">No products found</h5>
                <p className="text-muted">
                  Try adjusting your search or filters
                </p>
                <button
                  className="btn"
                  style={{ backgroundColor: mainColor, color: 'white' }}
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setFilterStatus('all');
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit Product - {editingProduct.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelEdit}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-4 text-center">
                    <img
                      src={editingProduct.image}
                      alt={editingProduct.name}
                      className="img-fluid rounded mb-3"
                      style={{ maxHeight: '200px', objectFit: 'cover' }}
                    />
                    <p className="text-muted small">Product Image</p>
                    
                    <div className="mt-4">
                      <h6 className="fw-semibold">Product Stats</h6>
                      <div className="list-group list-group-flush small">
                        <div className="list-group-item d-flex justify-content-between px-0">
                          <span>SKU:</span>
                          <code>{editingProduct.sku}</code>
                        </div>
                        <div className="list-group-item d-flex justify-content-between px-0">
                          <span>Sales:</span>
                          <strong>{editingProduct.sales}</strong>
                        </div>
                        <div className="list-group-item d-flex justify-content-between px-0">
                          <span>Revenue:</span>
                          <strong>${editingProduct.revenue.toLocaleString()}</strong>
                        </div>
                        <div className="list-group-item d-flex justify-content-between px-0">
                          <span>Rating:</span>
                          <strong>{editingProduct.rating} ⭐</strong>
                        </div>
                        <div className="list-group-item d-flex justify-content-between px-0">
                          <span>Reviews:</span>
                          <strong>{editingProduct.reviews}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-8">
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Product Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        placeholder="Enter product name"
                      />
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Current Price *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={editFormData.price}
                          onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Original Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control"
                          value={editFormData.originalPrice}
                          onChange={(e) => setEditFormData({ ...editFormData, originalPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Brand *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.brand}
                          onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                          placeholder="Enter brand name"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Category *</label>
                        <select
                          className="form-select"
                          value={editFormData.category}
                          onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                        >
                          {allCategories.filter(cat => cat !== 'all').map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Weight</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.weight}
                          onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                          placeholder="e.g., 0.5 kg"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Dimensions</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editFormData.dimensions}
                          onChange={(e) => setEditFormData({ ...editFormData, dimensions: e.target.value })}
                          placeholder="e.g., 10x5x3 cm"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea
                        className="form-control"
                        rows="4"
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        placeholder="Enter product description..."
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Features</label>
                      <div className="d-flex gap-2 mb-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Add a feature..."
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        />
                        <button
                          className="btn"
                          style={{ backgroundColor: mainColor, color: 'white' }}
                          onClick={addFeature}
                        >
                          <FaPlus />
                        </button>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {editFormData.features.map((feature, index) => (
                          <span
                            key={index}
                            className="badge d-flex align-items-center gap-1"
                            style={{ backgroundColor: `${mainColor}15`, color: mainColor }}
                          >
                            {feature}
                            <button
                              type="button"
                              className="btn btn-sm p-0"
                              style={{ color: mainColor }}
                              onClick={() => removeFeature(index)}
                            >
                              <FaTimes size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={editFormData.inStock}
                        onChange={(e) => setEditFormData({ ...editFormData, inStock: e.target.checked })}
                        style={{ backgroundColor: editFormData.inStock ? mainColor : '#6c757d' }}
                      />
                      <label className="form-check-label fw-semibold">
                        Product Available for Sale
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn text-white d-flex align-items-center gap-2" 
                  style={{ backgroundColor: mainColor, borderColor: mainColor }}
                  onClick={handleSaveEdit}
                >
                  <FaSave />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Stock Update Modal */}
      {showBulkUpdate && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Bulk Stock Update</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBulkUpdate(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Update stock for <strong>{selectedProducts.size}</strong> selected products:
                </p>
                <div className="mb-3">
                  <label className="form-label fw-semibold">New Stock Quantity</label>
                  <input
                    type="number"
                    className="form-control"
                    value={bulkStockUpdate}
                    onChange={(e) => setBulkStockUpdate(e.target.value)}
                    placeholder="Enter stock quantity"
                    min="0"
                  />
                </div>
                <div className="alert alert-warning small">
                  <FaExclamationTriangle className="me-2" />
                  This will overwrite current stock levels for all selected products.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowBulkUpdate(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn text-white" 
                  style={{ backgroundColor: mainColor, borderColor: mainColor }}
                  onClick={handleBulkStockUpdate}
                >
                  Update Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Edit Confirmation Modal */}
      {showSaveConfirm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Save Changes?</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cancelSaveEdit}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Are you sure you want to save the changes to "{editFormData.title}"? This will update the product information.
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={cancelSaveEdit}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn text-white" 
                  style={{ backgroundColor: mainColor, borderColor: mainColor }}
                  onClick={confirmSaveEdit}
                >
                  Yes, Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Product</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cancelDelete}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Are you sure you want to delete "{products.find(p => p.id === showDeleteConfirm)?.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-scale:hover {
          transform: scale(1.02);
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </div>
  );
};

export default ManageInventory;
