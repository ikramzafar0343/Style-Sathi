import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import {
  FaShoppingCart,
  FaUser,
  FaCheckCircle,
  FaTruck,
  FaDownload,
  FaHome,
  FaQuestionCircle,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaShoppingBag,
  FaBox,
  FaShippingFast,
  FaMapMarkerAlt,
  FaCreditCard,
  FaSignOutAlt,
  FaSearch
} from "react-icons/fa";

const OrderConfirmationPage = ({ 
  order,
  onNavigateToHome, 
  onNavigateToTrackOrder,
  onNavigateToShop,
  onLogout,
  onNavigateToAccountSettings,
  onNavigateToCart,
  onNavigateBack,
  currentUser = {},
  cartItemsCount = 0
}) => {
  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const [nowISO] = useState(() => new Date().toISOString());

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

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      if (onNavigateToShop) onNavigateToShop();
      else if (onNavigateToHome) onNavigateToHome();
      else if (onNavigateBack) onNavigateBack();
    }
  };

  const normalized = order ? {
    id: order.id,
    date: order.date || order.created_at || nowISO,
    items: Array.isArray(order.items) ? order.items.map(it => ({
      id: (it.product && it.product.id) || it.product_id || it.id,
      name: (it.product && it.product.title) || it.name || 'Item',
      price: Number(it.price || (it.product && it.product.price) || 0),
      quantity: it.quantity || 1,
      image: (it.product && (it.product.image_url || (Array.isArray(it.product.images) ? it.product.images[0] : ''))) || it.image || it.image_url || '',
      brand: (it.product && it.product.brand) || it.brand || ''
    })) : [],
    total: Number(order.total || 0),
    status: order.status || 'confirmed',
    shippingAddress: order.shippingAddress || {
      fullName: order.full_name || '',
      email: order.email || '',
      phoneNumber: order.phone_number || '',
      streetAddress: order.street_address || '',
      city: order.city || '',
      zipCode: order.zip_code || '',
      country: order.country || ''
    },
    paymentMethod: order.paymentMethod || {
      type: order.payment_method || 'card',
      lastFour: '',
      brand: ''
    },
    estimatedDelivery: order.estimated_delivery || order.estimatedDelivery || ''
  } : null;

  const orderData = normalized || order || null;

  if (!orderData || !Array.isArray(orderData.items)) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <h3 className="fw-bold" style={{ color: mainColor }}>No order details available</h3>
          <div className="mt-3">
            {onNavigateToHome && (
              <button className="btn" style={{ backgroundColor: mainColor, color: '#fff' }} onClick={onNavigateToHome}>Go to Home</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const statusStr = String(orderData.status || '').toLowerCase();
  const timeline = [
    {
      status: 'Order Placed',
      date: new Date(orderData.date).toLocaleDateString(),
      completed: true,
      icon: FaCheckCircle,
      description: 'Your order has been received'
    },
    {
      status: 'Processing',
      date: 'In Progress',
      completed: ['processing', 'shipped', 'delivered'].includes(statusStr),
      icon: FaBox,
      description: 'We\'re preparing your order'
    },
    {
      status: 'Shipped',
      date: orderData.shipped_at ? new Date(orderData.shipped_at).toLocaleDateString() : 'Pending',
      completed: ['shipped', 'delivered'].includes(statusStr),
      icon: FaShippingFast,
      description: 'Your order is on the way'
    },
    {
      status: 'Delivered',
      date: orderData.estimatedDelivery || 'Pending',
      completed: statusStr === 'delivered',
      icon: FaTruck,
      description: 'Expected delivery date'
    }
  ];

  const subtotal = orderData.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 100 ? 0 : 9.99;
  const tax = (subtotal * 0.08).toFixed(2);
  const total = subtotal + shipping + parseFloat(tax);

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
    const lines = [];
    lines.push(`STYLE SATHI Invoice`);
    lines.push(`Order: ${orderData.id}`);
    lines.push(`Date: ${new Date(orderData.date).toLocaleString()}`);
    lines.push(`Customer: ${currentUser?.name || orderData.shippingAddress.fullName || ''}`);
    lines.push(`Email: ${orderData.shippingAddress.email || ''}`);
    lines.push(`Phone: ${orderData.shippingAddress.phoneNumber || ''}`);
    lines.push(`Shipping: ${orderData.shippingAddress.streetAddress}, ${orderData.shippingAddress.city} ${orderData.shippingAddress.zipCode}, ${orderData.shippingAddress.country}`);
    lines.push(`Items:`);
    orderData.items.forEach((it, idx) => {
      lines.push(`${idx + 1}. ${it.name} x${it.quantity} @ $${Number(it.price).toFixed(2)} = $${(Number(it.price) * Number(it.quantity)).toFixed(2)}`);
    });
    const subtotalVal = orderData.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    lines.push(`Subtotal: $${subtotalVal.toFixed(2)}`);
    lines.push(`Total: $${(orderData.total ? Number(orderData.total) : subtotalVal).toFixed(2)}`);

    const downloadDoc = async () => {
      const logoDataUrl = await getLogoDataUrl();
      const header = logoDataUrl
        ? `<div style="display:flex;align-items:center;gap:12px"><img src="${logoDataUrl}" style="height:40px" /><h2 style="margin:0;color:#222">Invoice</h2></div>`
        : `<h2>STYLE SATHI Invoice</h2>`;
      const html = `<html><head><meta charset="utf-8"></head><body>${header}<pre>${lines.join('\n')}</pre></body></html>`;
      const blob = new Blob([html], { type: 'application/msword' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `invoice-${orderData.id}.doc`;
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
      a.download = `invoice-${orderData.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    const downloadPdf = () => {
      const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      const contentLines = [
        'BT',
        '/F1 16 Tf',
        '50 760 Td',
        `(STYLE SATHI Invoice) Tj`,
      ];
      let y = 730;
      lines.forEach((ln) => {
        contentLines.push(`50 ${y} Td (${esc(ln)}) Tj`);
        y -= 20;
      });
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
      objs.forEach((o) => {
        xref.push(offset);
        pdf += o;
        offset = pdf.length;
      });
      const xrefStart = offset;
      pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
      xref.forEach((pos) => {
        const line = String(pos).padStart(10, '0') + ' 00000 n \n';
        pdf += line;
      });
      pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `invoice-${orderData.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    await downloadDoc();
    downloadPdf();
    await downloadPng();
  };

  const handleContactSupport = () => {
    Swal.fire({ icon: 'info', title: 'Support', text: 'Contact support functionality would be implemented here' });
  };

  const handleOrderAgain = () => {
    if (onNavigateToShop) {
      onNavigateToShop();
    } else {
      Swal.fire({ icon: 'info', title: 'Order Again', text: 'Order again functionality would be implemented here' });
    }
  };

  const handleTrackOrder = () => {
    if (onNavigateToTrackOrder) {
      onNavigateToTrackOrder(orderData.id);
    } else {
      Swal.fire({ icon: 'info', title: 'Track Order', text: `Track order functionality for ${orderData.id}` });
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
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
        </div>
      </header>

      {/* Order Confirmation Banner */}
      <div style={{ backgroundColor: mainColor + '10', borderBottom: `1px solid ${mainColor}20` }}>
        <div className="container py-5">
          <div className="row align-items-center">
            <div className="col-auto">
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', backgroundColor: mainColor }}>
                <FaCheckCircle className="text-white fs-2" />
              </div>
            </div>
            <div className="col">
              <h2 className="fw-bold mb-2 display-5" style={{ color: mainColor }}>
                Order Confirmed!
              </h2>
              <p className="fs-5 mb-0 text-muted">
                Thank you for your purchase. Your order #{orderData.id} has been confirmed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-4 mb-5">
          {/* Left Column - Order Details & Shipping */}
          <div className="col-lg-6">
            {/* Order Information */}
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Order Information</h4>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <strong className="text-muted">Order ID:</strong>
                      <div className="fw-bold" style={{ color: mainColor }}>{orderData.id}</div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted">Order Date:</strong>
                      <div>{new Date(orderData.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <strong className="text-muted">Status:</strong>
                      <div>
                        <span className="badge bg-success">Confirmed</span>
                      </div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted">Estimated Delivery:</strong>
                      <div>{orderData.estimatedDelivery}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4" style={{ color: mainColor }}>
                  <FaMapMarkerAlt className="me-2" />
                  Shipping Address
                </h4>
                <div style={{ color: mainColor }}>
                  <p className="mb-1 fw-semibold">{orderData.shippingAddress.fullName}</p>
                  <p className="mb-1">{orderData.shippingAddress.email}</p>
                  <p className="mb-1">{orderData.shippingAddress.phoneNumber}</p>
                  <p className="mb-1">{orderData.shippingAddress.streetAddress}</p>
                  <p className="mb-1">{orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.zipCode}</p>
                  <p className="mb-0">{orderData.shippingAddress.country}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Delivery Timeline */}
          <div className="col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-4" style={{ color: mainColor }}>
                  <FaTruck className="me-2" />
                  Order Timeline
                </h4>
                
                <div className="position-relative">
                  {timeline.map((step, index) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={index} className="d-flex gap-3 mb-4">
                        {/* Timeline Indicator */}
                        <div className="d-flex flex-column align-items-center">
                          <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                            step.completed ? 'text-white' : 'bg-light border text-muted'
                          }`} style={{ 
                            width: '40px', 
                            height: '40px', 
                            minWidth: '40px',
                            backgroundColor: step.completed ? mainColor : '',
                            borderColor: mainColor
                          }}>
                            <IconComponent size={16} />
                          </div>
                          {index < timeline.length - 1 && (
                            <div className={`flex-grow-1 w-1 ${step.completed ? 'bg-success' : 'bg-light'}`} style={{ minHeight: '60px' }}></div>
                          )}
                        </div>

                        {/* Timeline Content */}
                        <div className="flex-grow-1">
                          <p className="fw-semibold mb-1" style={{ color: mainColor }}>{step.status}</p>
                          <p className="text-muted mb-1">{step.date}</p>
                          <p className="text-muted small">{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="card shadow-sm border-0 mb-5">
          <div className="card-body p-4">
            <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Order Summary</h4>
            
            {/* Order Items */}
            <div className="mb-4">
              {orderData.items.map((item) => (
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

            {/* Payment Method */}
            <div className="mb-4">
              <h6 className="fw-semibold mb-3" style={{ color: mainColor }}>
                <FaCreditCard className="me-2" />
                Payment Method
              </h6>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted">{orderData.paymentMethod.brand} ending in {orderData.paymentMethod.lastFour}</span>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="row justify-content-end">
              <div className="col-md-6">
                <div className="border-top pt-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Subtotal</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Shipping</span>
                    <strong>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Tax</span>
                    <strong>${tax}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-5 fw-bold border-top pt-2" style={{ color: secondaryColor }}>
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="row g-3 mb-5">
          <div className="col-md-4">
            <button
              onClick={handleTrackOrder}
              className="btn w-100 py-3 fw-semibold border-0 d-flex align-items-center justify-content-center gap-2"
              style={{ 
                backgroundColor: mainColor, 
                color: 'white',
                borderRadius: '10px'
              }}
            >
              <FaTruck />
              Track Order
            </button>
          </div>
          <div className="col-md-4">
            <button 
              onClick={handleDownloadInvoice}
              className="btn w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold"
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
          </div>
          <div className="col-md-4">
            <button
              onClick={onNavigateToHome}
              className="btn w-100 py-3 d-flex align-items-center justify-content-center gap-2 fw-semibold border-0"
              style={{ 
                backgroundColor: secondaryColor,
                color: 'white',
                borderRadius: '10px'
              }}
            >
              <FaHome />
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Help Section */}
        <div className="card border-0 shadow-sm mb-5">
          <div className="card-body p-4 text-center">
            <h5 className="fw-semibold mb-3" style={{ color: mainColor }}>Need Help With Your Order?</h5>
            <p className="text-muted mb-4">
              Our customer support team is here to help with any questions about your order.
            </p>
            <button
              onClick={handleContactSupport}
              className="btn d-flex align-items-center gap-2 mx-auto"
              style={{ 
                color: mainColor,
                backgroundColor: 'transparent',
                border: `1px solid ${mainColor}`
              }}
            >
              <FaQuestionCircle />
              Contact Support
            </button>
          </div>
        </div>

        {/* Order Again Section */}
        <div className="text-center">
          <button
            onClick={handleOrderAgain}
            className="btn btn-link p-0 fw-semibold d-flex align-items-center gap-2 mx-auto"
            style={{ color: mainColor }}
          >
            <FaShoppingBag />
            Order Similar Items
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-dark text-white py-5 mt-5">
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
                      e.currentTarget.querySelector('svg').style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = mainColor + "20";
                      e.currentTarget.querySelector('svg').style.color = mainColor;
                    }}
                  >
                    <Icon style={{ color: mainColor, transition: 'color 0.3s ease' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">QUICK LINKS</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateToHome}>Home</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateToShop}>Shop</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateToHome}>Categories</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateToHome}>New Arrivals</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">CUSTOMER CARE</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={handleContactSupport}>Contact Us</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">FAQ</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Shipping Info</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Returns</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">LEGAL</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Privacy Policy</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Terms of Service</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Cookie Policy</button>
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
        
        .btn-link.hover-underline:hover {
          text-decoration: underline !important;
        }
        
        .hover-scale:hover {
          transform: scale(1.05);
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default OrderConfirmationPage;
