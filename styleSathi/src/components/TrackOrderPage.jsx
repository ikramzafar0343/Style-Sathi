import { useState, useEffect, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import {
  FaShoppingCart,
  FaUser,
  FaArrowLeft,
  FaTruck,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaShieldAlt,
  FaCheckCircle,
  FaClock,
  FaBox,
  FaCreditCard,
  FaHome,
  FaShoppingBag,
  FaSearch,
  FaSignOutAlt,
  FaExclamationTriangle,
  FaSync,
  FaDownload
} from "react-icons/fa";
import { ordersApi } from "../services/api";
import styleSathiLogo from '../assets/styleSathiLogo.svg';


const TrackOrderPage = ({ 
  orderId,
  onNavigateBack, 
  onNavigateToSupport,
  onNavigateToShop,
  onNavigateToCart,
  onNavigateToAccountSettings,
  onLogout,
  currentUser = {},
  cartItemsCount = 0,
  token,
  initialOrder
}) => {
  const [trackingNumber, setTrackingNumber] = useState(orderId || '');
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      if (onNavigateToShop) onNavigateToShop();
      else if (onNavigateBack) onNavigateBack();
    }
  };
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const profileDropdownRef = useRef(null);

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";

  // Close dropdown when clicking outside
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

  // Load recent orders from localStorage on component mount
  useEffect(() => {
    const savedRecentOrders = localStorage.getItem('recentTrackedOrders');
    if (savedRecentOrders) {
      setRecentOrders(JSON.parse(savedRecentOrders));
    }
  }, []);

  // Save to recent orders when an order is successfully tracked
  useEffect(() => {
    if (order && !recentOrders.find(o => o.id === order.id)) {
      const updatedRecentOrders = [
        { 
          id: order.id, 
          date: order.date, 
          status: order.status,
          total: order.total,
          trackingNumber: order.trackingNumber
        },
        ...recentOrders.slice(0, 4) // Keep only last 5 orders
      ];
      setRecentOrders(updatedRecentOrders);
      localStorage.setItem('recentTrackedOrders', JSON.stringify(updatedRecentOrders));
    }
  }, [order, recentOrders]);
 

  // Dynamic tracking steps based on order status
  const getTrackingSteps = useCallback((order) => {
    const baseSteps = [
      { 
        status: 'Order Placed', 
        description: 'Your order has been confirmed', 
        date: new Date(order.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }), 
        completed: true,
        icon: FaCheckCircle
      },
      { 
        status: 'Processing', 
        description: 'Your order is being prepared', 
        date: new Date(new Date(order.date).getTime() + 4 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
          hour: '2-digit',
          minute: '2-digit'
        }), 
        completed: order.status !== 'ordered' && order.status !== 'confirmed',
        icon: FaBox
      },
      { 
        status: 'Shipped', 
        description: 'Your order has been shipped', 
        date: new Date(new Date(order.date).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
          hour: '2-digit',
          minute: '2-digit'
        }), 
        completed: order.status === 'in_transit' || order.status === 'delivered',
        icon: FaTruck
      },
      { 
        status: 'In Transit', 
        description: 'Your order is on the way', 
        date: `Expected ${order.estimatedDelivery}`, 
        completed: order.status === 'delivered',
        current: order.status === 'in_transit',
        icon: FaClock
      },
      { 
        status: 'Delivered', 
        description: 'Your order has been delivered', 
        date: order.status === 'delivered' ? order.estimatedDelivery : 'Not yet delivered', 
        completed: order.status === 'delivered',
        icon: FaCheckCircle
      }
    ];

    return baseSteps;
  }, []);

  const normalizeAnyOrder = (orderData) => ({
    id: orderData.id,
    date: orderData.date || orderData.created_at || new Date().toISOString(),
    status: orderData.status || 'confirmed',
    estimatedDelivery: orderData.estimatedDelivery || orderData.estimated_delivery || '',
    items: Array.isArray(orderData.items) ? orderData.items.map(it => ({
      id: (it.product && it.product.id) || it.product_id || it.id,
      name: (it.product && it.product.title) || it.name || 'Item',
      price: Number(it.price || (it.product && it.product.price) || 0),
      quantity: it.quantity || 1,
      image: (it.product && it.product.image_url) || it.image || it.image_url || '',
      brand: (it.product && it.product.brand) || it.brand || ''
    })) : [],
    total: Number(orderData.total || 0),
    shippingAddress: orderData.shippingAddress || {
      fullName: orderData.full_name || '',
      email: orderData.email || '',
      phoneNumber: orderData.phone_number || '',
      streetAddress: orderData.street_address || '',
      city: orderData.city || '',
      zipCode: orderData.zip_code || '',
      country: orderData.country || ''
    },
    trackingNumber: orderData.tracking_number || orderData.trackingNumber || String(orderData.id || ''),
    carrier: orderData.carrier || '',
    service: orderData.service || '',
    weight: orderData.weight || '',
    dimensions: orderData.dimensions || '',
    paymentMethod: orderData.paymentMethod || { brand: orderData.payment_brand || '', lastFour: orderData.payment_last_four || '' },
    realTimeUpdates: Array.isArray(orderData.real_time_updates) ? orderData.real_time_updates : []
  });

  

  const handleTrackOrderById = useCallback(async (id) => {
    setIsLoading(true);
    setError('');
    setAutoRefresh(false);
    try {
      const orderData = await ordersApi.getOrder(token, id);
      const normalized = {
        id: orderData.id,
        date: orderData.created_at,
        status: orderData.status,
        estimatedDelivery: orderData.estimated_delivery,
        items: (orderData.items || []).map(it => ({
          id: it.product.id,
          name: it.product.title,
          price: Number(it.price),
          quantity: it.quantity,
          image: it.product.image_url,
          brand: it.product.brand,
          rating: it.product.rating,
        })),
        total: Number(orderData.total),
        shippingAddress: {
          fullName: orderData.full_name,
          email: orderData.email,
          phoneNumber: orderData.phone_number,
          streetAddress: orderData.street_address,
          city: orderData.city,
          zipCode: orderData.zip_code,
          country: orderData.country,
        },
        trackingNumber: orderData.tracking_number || orderData.trackingNumber || String(orderData.id || ''),
        carrier: orderData.carrier || '',
        service: orderData.service || '',
        weight: orderData.weight || '',
        dimensions: orderData.dimensions || '',
        paymentMethod: orderData.paymentMethod || { brand: orderData.payment_brand || '', lastFour: orderData.payment_last_four || '' },
        realTimeUpdates: Array.isArray(orderData.real_time_updates) ? orderData.real_time_updates : [],
      };
      setOrder(normalized);
      setTrackingNumber(String(normalized.id));
      setError('');
      if (normalized.status === 'in_transit') setAutoRefresh(true);
    } catch {
      if (initialOrder) {
        const normalized = normalizeAnyOrder(initialOrder);
        setOrder(normalized);
        setTrackingNumber(String(normalized.id));
        setError('');
      } else {
        setError('Unable to find order. Please check the tracking number.');
        setOrder(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, initialOrder]);

  useEffect(() => {
    if (orderId) {
      handleTrackOrderById(orderId);
    } else if (initialOrder) {
      const normalized = normalizeAnyOrder(initialOrder);
      setOrder(normalized);
      setTrackingNumber(String(normalized.id));
    }
  }, [orderId, initialOrder, handleTrackOrderById]);

  useEffect(() => {
    let interval;
    if (autoRefresh && order && order.status === 'in_transit') {
      interval = setInterval(() => handleTrackOrderById(order.id), 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, order, handleTrackOrderById]);

  const handleTrackOrder = (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Please enter an order number');
      return;
    }

    handleTrackOrderById(trackingNumber);
  };

  const getLogoDataUrl = async () => {
    try {
      const resp = await fetch(styleSathiLogo);
      const blob = await resp.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    const lines = [];
    lines.push('STYLE SATHI Invoice');
    lines.push(`Order: ${order.id}`);
    lines.push(`Date: ${new Date(order.date).toLocaleString()}`);
    lines.push(`Customer: ${currentUser?.name || order.shippingAddress?.fullName || ''}`);
    lines.push(`Email: ${order.shippingAddress?.email || ''}`);
    lines.push(`Phone: ${order.shippingAddress?.phoneNumber || ''}`);
    lines.push(`Shipping: ${order.shippingAddress?.streetAddress}, ${order.shippingAddress?.city} ${order.shippingAddress?.zipCode}, ${order.shippingAddress?.country}`);
    lines.push('Items:');
    (order.items || []).forEach((it, idx) => {
      lines.push(`${idx + 1}. ${it.name} x${it.quantity} @ $${Number(it.price).toFixed(2)} = $${(Number(it.price) * Number(it.quantity)).toFixed(2)}`);
    });
    const subtotalVal = (order.items || []).reduce((s, i) => s + (i.price * i.quantity), 0);
    lines.push(`Subtotal: $${subtotalVal.toFixed(2)}`);
    lines.push(`Total: $${(order.total ? Number(order.total) : subtotalVal).toFixed(2)}`);

    const downloadDoc = async () => {
      const logoDataUrl = await getLogoDataUrl();
      const header = logoDataUrl
        ? `<div style="display:flex;align-items:center;gap:12px"><img src="${logoDataUrl}" style="height:40px" /><h2 style="margin:0;color:#222">Invoice</h2></div>`
        : `<h2>STYLE SATHI Invoice</h2>`;
      const html = `<html><head><meta charset="utf-8"></head><body>${header}<pre>${lines.join('\n')}</pre></body></html>`;
      const blob = new Blob([html], { type: 'application/msword' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `invoice-${order.id}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    const downloadPng = async () => {
      const canvas = document.createElement('canvas');
      const width = 900;
      const lineHeight = 28;
      const padding = 20;
      canvas.width = width;
      canvas.height = padding * 2 + lineHeight * (lines.length + 4);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const logoDataUrl = await getLogoDataUrl();
      if (logoDataUrl) {
        const img = new Image();
        img.src = logoDataUrl;
        await new Promise((r) => { img.onload = r; img.onerror = r; });
        const h = 36; const w = (img.width && img.height) ? (img.width * (h / img.height)) : 160;
        ctx.drawImage(img, padding, padding, w, h);
        ctx.fillStyle = '#222222';
        ctx.font = '18px Arial';
        ctx.fillText('Invoice', padding + w + 12, padding + 24);
      } else {
        ctx.fillStyle = '#222222';
        ctx.font = '18px Arial';
        ctx.fillText('STYLE SATHI Invoice', padding, padding + 10);
      }
      ctx.font = '16px Arial';
      lines.forEach((ln, i) => {
        ctx.fillText(ln, padding, padding + 60 + i * lineHeight);
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `invoice-${order.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    const downloadPdf = () => {
      const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      const contentLines = ['BT','/F1 16 Tf','50 760 Td','(STYLE SATHI Invoice) Tj'];
      let y = 730;
      lines.forEach((ln) => { contentLines.push(`50 ${y} Td (${esc(ln)}) Tj`); y -= 20; });
      contentLines.push('ET');
      const stream = contentLines.join('\n');
      const objs = [];
      objs.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
      objs.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n');
      objs.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n');
      objs.push(`4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`);
      objs.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n');
      let pdf = '%PDF-1.4\n';
      const xref = [];
      let offset = pdf.length;
      objs.forEach((o) => { xref.push(offset); pdf += o; offset = pdf.length; });
      const xrefStart = offset;
      pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
      xref.forEach((pos) => { pdf += String(pos).padStart(10, '0') + ' 00000 n \n'; });
      pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `invoice-${order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    await downloadDoc();
    downloadPdf();
    await downloadPng();
  };

  const handleOrderAgain = () => {
    if (onNavigateToShop) {
      onNavigateToShop();
    } else {
      Swal.fire({ icon: 'info', title: 'Order Again', text: 'Order again functionality would be implemented here' });
    }
  };

  const handleRefreshOrder = () => {
    if (order) {
      handleTrackOrderById(order.id);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Function to generate a random order ID for demo purposes
  const generateDemoOrder = () => {
    Swal.fire({ icon: 'info', title: 'Demo Order', text: 'Use a real order ID returned from checkout to track your order.' });
  };

  const TrackingInputSection = () => (
    <div className="container py-5">
      <button className="btn btn-link p-0 mb-4 d-flex align-items-center gap-2" style={{ color: mainColor }} onClick={onNavigateBack}>
        <FaArrowLeft /> Back to Home
      </button>

      {/* Tracking Input */}
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5 text-center">
              <div className="mb-4">
                <FaTruck style={{ fontSize: "64px", color: mainColor }} />
              </div>
              <h2 className="fw-bold mb-3" style={{ color: mainColor }}>Track Your Order</h2>
              <p className="text-muted mb-4">Enter your order number to check the status of your order</p>
              
              <form onSubmit={handleTrackOrder} className="mb-4">
                <div className="row g-3">
                  <div className="col-md-8">
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      placeholder="Enter your order number (e.g., SS-789456123 or 1764000637859)"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      style={{ borderColor: mainColor }}
                    />
                  </div>
                  <div className="col-md-4">
                    <button
                      type="submit"
                      className="btn btn-lg w-100 fw-semibold border-0"
                      style={{ backgroundColor: mainColor, color: 'white' }}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Tracking...' : 'Track Order'}
                    </button>
                  </div>
                </div>
              </form>

              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <FaExclamationTriangle className="me-2" />
                  {error}
                </div>
              )}

              {/* Recent Orders */}
              {recentOrders.length > 0 && (
                <div className="mt-4">
                  <h6 className="fw-semibold mb-3" style={{ color: mainColor }}>Recent Orders</h6>
                  <div className="d-flex flex-wrap gap-2 justify-content-center">
                    {recentOrders.map(recentOrder => (
                      <button
                        key={recentOrder.id}
                        onClick={() => {
                          setTrackingNumber(recentOrder.id);
                          handleTrackOrderById(recentOrder.id);
                        }}
                        className="btn btn-outline-secondary btn-sm"
                        style={{ borderRadius: '20px' }}
                      >
                        {recentOrder.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-muted mb-3">Don't have an order number?</p>
                <button
                  onClick={generateDemoOrder}
                  className="btn d-flex align-items-center justify-content-center gap-2 mx-auto fw-semibold"
                  style={{ 
                    border: `2px solid ${secondaryColor}`, 
                    color: secondaryColor,
                    borderRadius: '10px',
                    backgroundColor: 'transparent'
                  }}
                >
                  View Demo Order
                </button>
              </div>

              <div className="mt-3">
                <small className="text-muted">
                  Can't find your order number? Check your order confirmation email.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const Header = () => (
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
                      onClick={() => {
                        onNavigateToAccountSettings?.();
                        setShowProfileDropdown(false);
                      }}
                    >
                      <FaUser size={14} /> Profile
                    </button>
                    <button
                      className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
                      style={{ color: '#dc3545', fontSize: '0.9rem' }}
                      onClick={() => {
                        onLogout?.();
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
      </div>
    </header>
  );

  if (!order && !isLoading) {
    return (
      <div className="min-vh-100 bg-light">
        <Header />
        <TrackingInputSection />
      </div>
    );
  }

  const trackingSteps = order ? getTrackingSteps(order) : [];

  return (
    <div className="min-vh-100 bg-light">
      <Header />

      <div className="container py-5">
        <button className="btn btn-link p-0 mb-4 d-flex align-items-center gap-2" style={{ color: mainColor }} onClick={onNavigateBack}>
          <FaArrowLeft /> Back to Home
        </button>

        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: mainColor }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Tracking your order...</p>
          </div>
        ) : order && (
          <div className="row">
            <div className="col-lg-8">
              {/* Order Status Header */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <h2 className="fw-bold mb-2" style={{ color: mainColor }}>Order #{order.id}</h2>
                      <p className="text-muted mb-3">Track your order in real-time</p>
                      <div className="d-flex align-items-center gap-4">
                        <div>
                          <small className="text-muted d-block">Status</small>
                          <span className="badge px-3 py-2 fw-semibold" style={{ 
                            backgroundColor: order.status === 'in_transit' ? '#fff3cd' : 
                                           order.status === 'delivered' ? '#d1eddc' : 
                                           order.status === 'processing' ? '#d1ecf1' : '#e2e3e5',
                            color: order.status === 'in_transit' ? '#856404' : 
                                   order.status === 'delivered' ? '#0f5132' : 
                                   order.status === 'processing' ? '#0c5460' : '#383d41'
                          }}>
                            {order.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                        </div>
                        <div>
                          <small className="text-muted d-block">Estimated Delivery</small>
                          <strong>{order.estimatedDelivery}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex justify-content-end gap-3 align-items-start">
                        <div className="bg-light rounded p-3 text-center">
                          <small className="text-muted d-block">Tracking Number</small>
                          <strong className="fs-5">{order.trackingNumber}</strong>
                        </div>
                        <div className="d-flex flex-column gap-2">
                          <button
                            onClick={handleRefreshOrder}
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                            disabled={isLoading}
                          >
                            <FaSync className={isLoading ? 'spinning' : ''} />
                            Refresh
                          </button>
                          {order.status === 'in_transit' && (
                            <button
                              onClick={toggleAutoRefresh}
                              className={`btn btn-sm d-flex align-items-center gap-2 ${
                                autoRefresh ? 'btn-success' : 'btn-outline-success'
                              }`}
                            >
                              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Updates */}
              {order.realTimeUpdates && order.realTimeUpdates.length > 0 && (
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-body p-4">
                    <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Real-time Updates</h4>
                    <div className="space-y-3">
                      {order.realTimeUpdates.map(update => (
                        <div key={update.id} className="d-flex align-items-start gap-3 p-3 bg-light rounded">
                          <div className="flex-shrink-0">
                            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" 
                                 style={{ width: '40px', height: '40px' }}>
                              <FaTruck className="text-white" size={16} />
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                              <h6 className="fw-bold mb-0">{update.status}</h6>
                              <small className="text-muted">
                                {new Date(update.timestamp).toLocaleTimeString()}
                              </small>
                            </div>
                            <p className="text-muted mb-1">{update.description}</p>
                            <small className="text-primary">
                              <FaMapMarkerAlt className="me-1" />
                              {update.location}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Timeline */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Order Tracking</h4>
                  
                  <div className="position-relative">
                    {trackingSteps.map((step, index) => (
                      <div key={index} className="d-flex gap-4 mb-4">
                        {/* Timeline Indicator */}
                        <div className="d-flex flex-column align-items-center">
                          <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                            step.completed ? 'text-white' : step.current ? 'text-white' : 'bg-light border text-muted'
                          }`} style={{ 
                            width: '50px', 
                            height: '50px', 
                            minWidth: '50px',
                            backgroundColor: step.completed ? mainColor : step.current ? secondaryColor : '',
                            borderColor: mainColor
                          }}>
                            <step.icon size={20} />
                          </div>
                          {index < trackingSteps.length - 1 && (
                            <div className={`flex-grow-1 w-2 ${step.completed ? 'bg-success' : 'bg-light'}`} style={{ minHeight: '80px' }}></div>
                          )}
                        </div>

                        {/* Timeline Content */}
                        <div className="flex-grow-1">
                          <div className={`p-3 rounded ${step.current ? 'bg-light' : ''}`} style={{ borderLeft: step.current ? `4px solid ${secondaryColor}` : 'none' }}>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="fw-bold mb-0" style={{ color: mainColor }}>{step.status}</h6>
                              <small className="text-muted">{step.date}</small>
                            </div>
                            <p className="text-muted mb-0">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Order Items</h4>
                  <div className="mb-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="d-flex gap-3 mb-3 pb-3 border-bottom">
                        <div className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden" 
                             style={{ width: '80px', height: '80px', minWidth: '80px' }}>
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="img-fluid"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="fw-semibold mb-1" style={{ color: mainColor }}>{item.name}</h6>
                          <small className="text-muted d-block">{item.brand}</small>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">Qty: {item.quantity}</small>
                            <strong style={{ color: secondaryColor }}>${(item.price * item.quantity).toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Summary */}
                  <div className="border-top pt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">Subtotal</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">Shipping</span>
                      <span>$0.00</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted">Tax</span>
                      <span>$0.00</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center border-top pt-2">
                      <strong>Total</strong>
                      <strong style={{ color: mainColor }}>${order.total.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="mt-4">
                    <h6 className="fw-semibold mb-3" style={{ color: mainColor }}>
                      <FaCreditCard className="me-2" />
                      Payment Method
                    </h6>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted">{order.paymentMethod.brand} ending in {order.paymentMethod.lastFour}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Delivery Information</h4>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="d-flex align-items-start gap-3">
                        <FaTruck style={{ color: mainColor, marginTop: '4px' }} />
                        <div>
                          <h6 className="fw-bold">Shipping Carrier</h6>
                          <p className="text-muted mb-0">{order.carrier} {order.service}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="d-flex align-items-start gap-3">
                        <FaBox style={{ color: mainColor, marginTop: '4px' }} />
                        <div>
                          <h6 className="fw-bold">Package Details</h6>
                          <p className="text-muted mb-0">{order.weight} • {order.dimensions}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex align-items-start gap-3">
                        <FaMapMarkerAlt style={{ color: mainColor, marginTop: '4px' }} />
                        <div>
                          <h6 className="fw-bold">Shipping Address</h6>
                          <p className="text-muted mb-0">
                            {order.shippingAddress.fullName}<br />
                            {order.shippingAddress.streetAddress}<br />
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                            {order.shippingAddress.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              {/* Action Buttons */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3" style={{ color: mainColor }}>Order Actions</h5>
                  <div className="d-grid gap-2">
                    <button
                      onClick={handleDownloadInvoice}
                      className="btn d-flex align-items-center justify-content-center gap-2 py-3 fw-semibold"
                      style={{ 
                        border: `2px solid ${mainColor}`, 
                        color: mainColor,
                        borderRadius: '10px',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <FaDownload />
                      Download Invoice
                    </button>
                    
                    <button
                      onClick={handleOrderAgain}
                      className="btn d-flex align-items-center justify-content-center gap-2 py-3 fw-semibold border-0"
                      style={{ 
                        backgroundColor: secondaryColor,
                        color: 'white',
                        borderRadius: '10px'
                      }}
                    >
                      <FaHome />
                      Order Similar Items
                    </button>

                    <button
                      onClick={() => {
                        setOrder(null);
                        setTrackingNumber('');
                      }}
                      className="btn d-flex align-items-center justify-content-center gap-2 py-3 fw-semibold border"
                      style={{ 
                        color: mainColor,
                        borderRadius: '10px',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <FaSearch />
                      Track Another Order
                    </button>
                  </div>
                </div>
              </div>

              {/* Support Card */}
              <div className="card shadow-sm border-0 sticky-top" style={{ top: '100px' }}>
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3" style={{ color: mainColor }}>Need Help?</h5>
                  <p className="text-muted mb-4">
                    Our customer support team is here to help you with any questions about your order.
                  </p>
                  
                  <div className="d-flex flex-column gap-3">
                    <button 
                      className="btn d-flex align-items-center gap-3 p-3 text-start"
                      style={{ 
                        backgroundColor: mainColor + '10',
                        border: `1px solid ${mainColor}30`,
                        borderRadius: '10px'
                      }}
                      onClick={onNavigateToSupport}
                    >
                      <FaPhone style={{ color: mainColor }} />
                      <div>
                        <strong style={{ color: mainColor }}>Call Support</strong>
                        <p className="small text-muted mb-0">+1 (555) 123-4567</p>
                      </div>
                    </button>

                    <button 
                      className="btn d-flex align-items-center gap-3 p-3 text-start"
                      style={{ 
                        backgroundColor: mainColor + '10',
                        border: `1px solid ${mainColor}30`,
                        borderRadius: '10px'
                      }}
                      onClick={onNavigateToSupport}
                    >
                      <FaEnvelope style={{ color: mainColor }} />
                      <div>
                        <strong style={{ color: mainColor }}>Email Support</strong>
                        <p className="small text-muted mb-0">support@stylesathi.com</p>
                      </div>
                    </button>

                    <button 
                      className="btn d-flex align-items-center gap-3 p-3 text-start"
                      style={{ 
                        backgroundColor: mainColor + '10',
                        border: `1px solid ${mainColor}30`,
                        borderRadius: '10px'
                      }}
                      onClick={onNavigateToSupport}
                    >
                      <FaMapMarkerAlt style={{ color: mainColor }} />
                      <div>
                        <strong style={{ color: mainColor }}>Live Chat</strong>
                        <p className="small text-muted mb-0">Available 24/7</p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-4 p-3 rounded" style={{ backgroundColor: secondaryColor + '10' }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <FaShieldAlt style={{ color: secondaryColor }} />
                      <strong style={{ color: secondaryColor }}>Order Protection</strong>
                    </div>
                    <p className="small text-muted mb-0">
                      Your order is protected by our 100% satisfaction guarantee and secure payment processing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .hover-underline:hover {
          text-decoration: underline !important;
        }
        .hover-scale:hover {
          transform: scale(1.05);
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .space-y-3 > * + * {
          margin-top: 1rem;
        }
        .w-2 {
          width: 2px;
        }
      `}</style>
    </div>
  );
};

export default TrackOrderPage;
