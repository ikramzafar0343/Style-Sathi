import { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import {
  FaUser,
  FaShoppingCart,
  FaKey,
  FaShieldAlt,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaTrash,
  FaArrowLeft,
  FaSignOutAlt,
  FaBell,
  FaSearch,
  FaShoppingBag,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaHistory,
  FaStore,
  FaChartLine,
  FaBox,
  FaTruck,
  FaDollarSign,
  FaUsers,
  FaCog
} from "react-icons/fa";

import { profileApi, ordersApi } from '../services/api'

const SellerAccountSetting = ({ 
  onBack, 
  onLogoClick, 
  onProfileClick, 
  onLogout, 
  currentUser,
  token,
  onUpdateUser
}) => {
  const [activeSection, setActiveSection] = useState('personal');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";
  const handleFooterInfo = (label) => {
    Swal.fire({ icon: 'info', title: label, text: 'Information will be shown here' });
  };

  // Dynamic form data based on currentUser
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || 'Seller User',
    email: currentUser?.email || 'seller@stylesathi.com',
    phone: currentUser?.phone || '+1 234 567 8900',
    country: currentUser?.country || 'United States',
    storeName: currentUser?.storeName || 'Premium Jewelry Store',
    businessType: currentUser?.businessType || 'Jewelry Retail',
    taxId: currentUser?.taxId || 'TAX-123456789',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State to track the current displayed name
  const [displayName, setDisplayName] = useState(formData.fullName);

  // Dynamic seller-specific notifications
  const [notifications] = useState([
    { 
      id: '1', 
      type: 'order-placed', 
      message: 'New order #ORD-2024-001 for Premium Diamond Ring', 
      timestamp: '2m ago', 
      read: false 
    },
    { 
      id: '2', 
      type: 'sold-out', 
      message: 'Classic Diamond Ring is sold out', 
      timestamp: '1h ago', 
      read: false 
    },
    { 
      id: '3', 
      type: 'low-stock', 
      message: 'Luxury Watch running low on stock', 
      timestamp: '3h ago', 
      read: true 
    }
  ]);

  // Seller-specific order history
  const [orderHistory, setOrderHistory] = useState([]);

  // Seller performance metrics
  const [performanceMetrics] = useState({
    totalSales: 12450,
    activeListings: 23,
    conversionRate: 3.2,
    customerRating: 4.8,
    responseTime: '2.3 hours'
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      if (!token) return;
      try {
        const list = await ordersApi.getSellerOrders(token);
        const normalized = (list || []).map((o) => {
          const items = Array.isArray(o.items) ? o.items.map((it) => ({
            name: (it.product && it.product.title) || 'Item',
            quantity: Number(it.quantity || 0),
            price: Number(it.price || (it.product && it.product.price) || 0)
          })) : [];
          const s = o.status || 'confirmed';
          const status = s; // keep backend statuses used by badge: delivered, in_transit, processing, confirmed
          return {
            id: `ORD-${String(o.id).padStart(4,'0')}`,
            date: o.created_at || '',
            status,
            customer: o.full_name || (o.email ? String(o.email).split('@')[0] : ''),
            items,
            total: Number(o.total || 0),
            revenue: Number(o.total || 0)
          };
        });
        setOrderHistory(normalized);
      } catch {
        setOrderHistory([]);
      }
    };
    loadOrders();
    const orderHandler = (e) => {
      const t = String((e.detail || {}).type || '');
      if (t.includes('order-')) loadOrders();
    };
    window.addEventListener('notification:push', orderHandler);
    return () => window.removeEventListener('notification:push', orderHandler);
  }, [token]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    const parts = String(formData.fullName || '').trim().split(' ');
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ');
    try {
      const resp = await profileApi.update(token, {
        first_name,
        last_name,
        email: formData.email,
        phone: formData.phone,
        business_name: formData.storeName,
        business_type: formData.businessType,
      });
      const user = resp.user || resp;
      const updated = {
        ...currentUser,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        business_name: user.business_name,
        business_type: user.business_type,
        storeName: user.business_name,
        businessType: user.business_type,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || formData.fullName,
        type: user.role || currentUser?.type,
      };
      setDisplayName(updated.name);
      onUpdateUser && onUpdateUser(updated);
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'profile-updated', title: 'Profile Updated', message: 'Seller profile changes are saved', time: 'Just now' } }));
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Update Failed', text: e?.message || 'Failed to update seller profile' });
    }
  };

  // Handle password update
  const handlePasswordUpdate = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'Password Mismatch', text: 'New passwords do not match!' });
      return;
    }
    if (formData.newPassword.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Weak Password', text: 'Password must be at least 6 characters long!' });
      return;
    }
    console.log('Updating seller password...');
    Swal.fire({ icon: 'success', title: 'Password Updated', text: 'Password updated successfully!' });
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  };

  // Get status badge for orders
  const getStatusBadge = (status) => {
    const statusConfig = {
      delivered: { class: 'bg-success', text: 'Delivered' },
      in_transit: { class: 'bg-warning text-dark', text: 'In Transit' },
      processing: { class: 'bg-info', text: 'Processing' },
      cancelled: { class: 'bg-danger', text: 'Cancelled' },
      pending: { class: 'bg-secondary', text: 'Pending' }
    };
    const config = statusConfig[status] || statusConfig.processing;
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const renderNotifications = () => {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    return (
      <div className="position-relative" ref={notificationRef}>
        <div
          className="cursor-pointer hover-scale position-relative"
          onClick={() => setShowNotificationPanel(!showNotificationPanel)}
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
            <FaBell style={{ color: mainColor, fontSize: '18px' }} />
          </div>
          {unreadCount > 0 && (
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
              {unreadCount}
            </span>
          )}
        </div>

        {showNotificationPanel && (
          <div 
            className="position-absolute bg-white shadow rounded end-0 mt-2 py-2"
            style={{ 
              minWidth: '320px',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 1050,
              border: `1px solid ${mainColor}20`
            }}
          >
            <div className="p-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-semibold mb-0">Seller Notifications</h6>
                <button
                  className="btn btn-sm p-0"
                  style={{ color: mainColor }}
                  onClick={() => setShowNotificationPanel(false)}
                >
                  ×
                </button>
              </div>
            </div>
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-bottom ${!notification.read ? 'bg-light' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="mb-1 small fw-medium">{notification.message}</p>
                      <p className="text-muted small mb-0">
                        {notification.timestamp}
                      </p>
                    </div>
                    {!notification.read && (
                      <div 
                        className="rounded-circle"
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: secondaryColor
                        }}
                      ></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 text-center">
              <button
                className="btn btn-sm w-100"
                style={{ color: mainColor }}
              >
                View All Notifications
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
            {displayName}
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
      {/* HEADER */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <img
                src={styleSathiLogo}
                alt="STYLE SATHI"
                style={{ height: '40px', cursor: 'pointer' }}
                onClick={onLogoClick}
              />
            </div>

            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-center">
                <button
                  onClick={onBack}
                  className="btn btn-outline-secondary d-flex align-items-center gap-2"
                >
                  <FaArrowLeft /> Back to Dashboard
                </button>
              </div>
            </div>

            <div className="col-md-3 d-flex justify-content-end align-items-center gap-4">
              {renderNotifications()}
              {renderProfileDropdown()}
            </div>
          </div>
        </div>
      </header>

      <div className="container py-5">
        <div className="row g-4">
          {/* Left Sidebar */}
          <div className="col-lg-3">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="position-relative d-inline-block mb-3">
                    <div className="profile-avatar-lg">
                      <FaStore className="text-gold fs-2" />
                    </div>
                    <div className="position-absolute bottom-0 end-0 bg-gold rounded-circle border-2 border-white d-flex align-items-center justify-content-center" style={{width: '24px', height: '24px'}}>
                      <FaCheckCircle className="text-white" size={12} />
                    </div>
                  </div>
                  <h5 className="fw-bold text-gold mb-1">{displayName}</h5>
                  <p className="text-muted small mb-2">{formData.email}</p>
                  <span className="badge bg-gold-light text-gold px-3 py-2">
                    <FaCheckCircle className="me-1" />
                    Verified Seller
                  </span>
                </div>

                {/* Performance Metrics */}
                <div className="mb-4 p-3 bg-light rounded">
                  <h6 className="fw-semibold text-gold mb-3">Store Performance</h6>
                  <div className="space-y-2">
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">Rating</small>
                      <small className="fw-semibold">{performanceMetrics.customerRating}/5</small>
                    </div>
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">Response Time</small>
                      <small className="fw-semibold">{performanceMetrics.responseTime}</small>
                    </div>
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">Conversion</small>
                      <small className="fw-semibold">{performanceMetrics.conversionRate}%</small>
                    </div>
                  </div>
                </div>

                <nav className="nav flex-column gap-2">
                  <button
                    onClick={() => setActiveSection('personal')}
                    className={`nav-link text-start d-flex align-items-center gap-3 py-3 ${
                      activeSection === 'personal' ? 'bg-gold text-white' : 'text-gold hover-bg-gold-light'
                    } rounded`}
                  >
                    <FaUser />
                    <span className="fw-semibold">Personal Info</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('store')}
                    className={`nav-link text-start d-flex align-items-center gap-3 py-3 ${
                      activeSection === 'store' ? 'bg-gold text-white' : 'text-gold hover-bg-gold-light'
                    } rounded`}
                  >
                    <FaStore />
                    <span className="fw-semibold">Store Settings</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('orders')}
                    className={`nav-link text-start d-flex align-items-center gap-3 py-3 ${
                      activeSection === 'orders' ? 'bg-gold text-white' : 'text-gold hover-bg-gold-light'
                    } rounded`}
                  >
                    <FaShoppingCart />
                    <span className="fw-semibold">Order History</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('password')}
                    className={`nav-link text-start d-flex align-items-center gap-3 py-3 ${
                      activeSection === 'password' ? 'bg-gold text-white' : 'text-gold hover-bg-gold-light'
                    } rounded`}
                  >
                    <FaKey />
                    <span className="fw-semibold">Change Password</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('privacy')}
                    className={`nav-link text-start d-flex align-items-center gap-3 py-3 ${
                      activeSection === 'privacy' ? 'bg-gold text-white' : 'text-gold hover-bg-gold-light'
                    } rounded`}
                  >
                    <FaShieldAlt />
                    <span className="fw-semibold">Privacy & Security</span>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-lg-9">
            {/* Personal Information Section */}
            {activeSection === 'personal' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Personal Information</h4>
                  <div className="row g-4">
                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Full Name</label>
                        </div>
                        <div className="col-md-9">
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            className="form-control border-gold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Email Address</label>
                        </div>
                        <div className="col-md-9">
                          <div className="position-relative">
                            <input
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleInputChange('email', e.target.value)}
                              className="form-control border-gold pe-5"
                            />
                            <FaCheckCircle className="position-absolute top-50 end-0 translate-middle-y text-gold me-3" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Phone Number</label>
                        </div>
                        <div className="col-md-9">
                          <div className="row g-2">
                            <div className="col-8">
                              <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="form-control border-gold"
                              />
                            </div>
                            <div className="col-4">
                              <button 
                                className="btn btn-gold w-100"
                                disabled={verifying}
                                onClick={async () => {
                                  setVerifying(true);
                                  try {
                                    await profileApi.requestPhoneVerification(token, formData.phone);
                                    setVerificationSent(true);
                                  } catch (e) {
                                    Swal.fire({ icon: 'error', title: 'Send Failed', text: e?.message || 'Failed to send code' });
                                  } finally {
                                    setVerifying(false);
                                  }
                                }}
                              >
                                {phoneVerified ? 'Verified' : (verifying ? 'Sending...' : 'Verify')}
                              </button>
                            </div>
                            {verificationSent && !phoneVerified && (
                              <div className="col-12 mt-2 d-flex gap-2">
                                <input 
                                  type="text" 
                                  className="form-control border-gold" 
                                  placeholder="Enter code" 
                                  value={verificationCode}
                                  onChange={(e) => setVerificationCode(e.target.value)}
                                />
                                <button 
                                  className="btn btn-outline-secondary"
                                  onClick={async () => {
                                    try {
                                      await profileApi.verifyPhone(token, verificationCode);
                                      setPhoneVerified(true);
                                      setVerificationSent(false);
                                      setVerificationCode('');
                                      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'phone-verified', title: 'Phone Verified', message: 'Your phone number has been verified', time: 'Just now' } }));
                                    } catch (e) {
                                      Swal.fire({ icon: 'error', title: 'Invalid Code', text: e?.message || 'Invalid code' });
                                    }
                                  }}
                                >Confirm</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Country/Region</label>
                        </div>
                        <div className="col-md-9">
                          <select 
                            value={formData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            className="form-select border-gold"
                          >
                            <option>United States</option>
                            <option>Canada</option>
                            <option>United Kingdom</option>
                            <option>Australia</option>
                            <option>Pakistan</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row">
                        <div className="col-md-9 offset-md-3">
                          <div className="d-flex justify-content-end pt-3">
                            <button 
                              onClick={handleSaveChanges}
                              className="btn btn-gold px-4"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Store Settings Section */}
            {activeSection === 'store' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Store Settings</h4>
                  <div className="row g-4">
                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Store Name</label>
                        </div>
                        <div className="col-md-9">
                          <input
                            type="text"
                            value={formData.storeName}
                            onChange={(e) => handleInputChange('storeName', e.target.value)}
                            className="form-control border-gold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Business Type</label>
                        </div>
                        <div className="col-md-9">
                          <select 
                            value={formData.businessType}
                            onChange={(e) => handleInputChange('businessType', e.target.value)}
                            className="form-select border-gold"
                          >
                            <option>Jewelry Retail</option>
                            <option>Fashion Accessories</option>
                            <option>Luxury Goods</option>
                            <option>Multi-brand Store</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Tax ID</label>
                        </div>
                        <div className="col-md-9">
                          <input
                            type="text"
                            value={formData.taxId}
                            onChange={(e) => handleInputChange('taxId', e.target.value)}
                            className="form-control border-gold"
                            placeholder="Enter your business tax identification number"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row">
                        <div className="col-md-9 offset-md-3">
                          <div className="d-flex justify-content-end pt-3">
                            <button 
                              onClick={handleSaveChanges}
                              className="btn btn-gold px-4"
                            >
                              Update Store Settings
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order History Section */}
            {activeSection === 'orders' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Order History</h4>
                  <div className="row g-4">
                    {orderHistory.map((order) => (
                      <div key={order.id} className="col-12">
                        <div className="card border border-gold">
                          <div className="card-body">
                            <div className="row align-items-center">
                              <div className="col-md-3">
                                <div className="d-flex align-items-center gap-3">
                                  <FaHistory size={24} className="text-gold" />
                                  <div>
                                    <h6 className="fw-semibold text-gold mb-1">{order.id}</h6>
                                    <small className="text-muted">Customer: {order.customer}</small>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-2">
                                {getStatusBadge(order.status)}
                              </div>
                              <div className="col-md-2">
                                <small className="text-muted d-block">Total</small>
                                <strong className="text-blue">
                                  ${order.total.toFixed(2)}
                                </strong>
                              </div>
                              <div className="col-md-2">
                                <small className="text-muted d-block">Revenue</small>
                                <strong className="text-success">
                                  ${order.revenue.toFixed(2)}
                                </strong>
                              </div>
                              <div className="col-md-3 text-end">
                                <small className="text-muted d-block">{order.date}</small>
                                <button className="btn btn-sm btn-outline-gold">
                                  View Details
                                </button>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-top">
                              <div className="d-flex gap-2 mb-2">
                                {order.items.map((item, index) => (
                                  <div 
                                    key={index}
                                    className="bg-light rounded d-flex align-items-center justify-content-center position-relative p-2"
                                    style={{minWidth: '80px'}}
                                  >
                                    <FaBox className="text-gold me-2" />
                                    <div>
                                      <small className="fw-semibold">{item.quantity}x</small>
                                      <br />
                                      <small className="text-muted">{item.name}</small>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Change Password Section */}
            {activeSection === 'password' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Change Password</h4>
                  <div className="row g-4">
                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Current Password</label>
                        </div>
                        <div className="col-md-9">
                          <div className="position-relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={formData.currentPassword}
                              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                              className="form-control border-gold pe-5"
                            />
                            <button
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-gold p-0 me-3"
                            >
                              {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">New Password</label>
                        </div>
                        <div className="col-md-9">
                          <div className="position-relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={formData.newPassword}
                              onChange={(e) => handleInputChange('newPassword', e.target.value)}
                              className="form-control border-gold pe-5"
                            />
                            <button
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-gold p-0 me-3"
                            >
                              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Confirm New Password</label>
                        </div>
                        <div className="col-md-9">
                          <div className="position-relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                              className="form-control border-gold pe-5"
                            />
                            <button
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-gold p-0 me-3"
                            >
                              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="row">
                        <div className="col-md-9 offset-md-3">
                          <div className="d-flex justify-content-end pt-3">
                            <button 
                              onClick={handlePasswordUpdate}
                              className="btn btn-gold px-4"
                            >
                              Update Password
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy & Security Section */}
            {activeSection === 'privacy' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Privacy & Security</h4>
                  <div className="space-y-4">
                    <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                      <div>
                        <h6 className="fw-semibold text-gold mb-1">Two-Factor Authentication</h6>
                        <p className="text-muted small mb-0">Add an extra layer of security to your account</p>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={twoFactorEnabled}
                          onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                          style={{backgroundColor: twoFactorEnabled ? mainColor : '', borderColor: mainColor}}
                        />
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                      <div>
                        <h6 className="fw-semibold text-gold mb-1">Email Notifications</h6>
                        <p className="text-muted small mb-0">Receive updates about your orders and promotions</p>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          style={{backgroundColor: emailNotifications ? mainColor : '', borderColor: mainColor}}
                        />
                      </div>
                    </div>
                    <div className="pt-3">
                      <button 
                        className="btn btn-link text-danger p-0 d-flex align-items-center gap-2"
                        onClick={async () => {
                          const res = await Swal.fire({
                            icon: 'warning',
                            title: 'Confirm Deletion',
                            text: 'Delete your seller account? This cannot be undone.',
                            showCancelButton: true,
                            confirmButtonText: 'Delete',
                            cancelButtonText: 'Cancel'
                          });
                          if (!res.isConfirmed) return;
                          try {
                            await profileApi.delete(token);
                            onLogout && onLogout();
                          } catch (e) {
                            Swal.fire({ icon: 'error', title: 'Delete Failed', text: e?.message || 'Failed to delete account' });
                          }
                        }}
                      >
                        <FaTrash />
                        Delete Seller Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
              <h6 className="fw-bold mb-3" style={{ color: mainColor }}>SELLER RESOURCES</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Seller Guidelines')}>Seller Guidelines</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Pricing & Fees')}>Pricing & Fees</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Shipping Policies')}>Shipping Policies</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Seller Support')}>Seller Support</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="fw-bold mb-3" style={{ color: mainColor }}>CUSTOMER CARE</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Contact Us')}>Contact Us</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('FAQ')}>FAQ</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Shipping Info')}>Shipping Info</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Returns')}>Returns</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="fw-bold mb-3" style={{ color: mainColor }}>LEGAL</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Privacy Policy')}>Privacy Policy</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Terms of Service')}>Terms of Service</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Cookie Policy')}>Cookie Policy</button>
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
        .text-gold { color: #c4a62c !important; }
        .text-blue { color: #2c67c4 !important; }
        .text-red { color: #dc3545 !important; }
        .bg-blue { background-color: #2c67c4 !important; }
        .bg-gold { background-color: #c4a62c !important; }
        .bg-gold-light { background-color: rgba(196, 166, 44, 0.1) !important; }
        .border-gold { border-color: #c4a62c !important; }
        .btn-gold { 
          background-color: #c4a62c; 
          color: white; 
          border: none;
          transition: all 0.3s ease;
        }
        .btn-gold:hover { 
          background-color: #b39925; 
          color: white; 
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(196, 166, 44, 0.3);
        }
        .btn-outline-gold {
          border-color: #c4a62c;
          color: #c4a62c;
        }
        .btn-outline-gold:hover {
          background-color: #c4a62c;
          color: white;
        }
        .profile-avatar-lg {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(196, 166, 44, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(196,166,44,0.4);
        }
        .hover-underline:hover {
          text-decoration: underline !important;
        }
        .hover-bg-gold-light:hover {
          background-color: rgba(196, 166, 44, 0.1) !important;
        }
        .hover-scale:hover {
          transform: scale(1.05);
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .form-check-input:checked {
          background-color: #c4a62c;
          border-color: #c4a62c;
        }
        .form-control:focus, .form-select:focus {
          border-color: #c4a62c;
          box-shadow: 0 0 0 0.2rem rgba(196, 166, 44, 0.25);
        }
        .nav-link {
          transition: all 0.3s ease;
        }
        .nav-link:hover {
          transform: translateX(5px);
        }
        .space-y-2 > * + * {
          margin-top: 0.5rem;
        }
        .space-y-4 > * + * {
          margin-top: 1.5rem;
        }
        @media (max-width: 768px) {
          .col-md-3 .form-label {
            margin-bottom: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default SellerAccountSetting;
