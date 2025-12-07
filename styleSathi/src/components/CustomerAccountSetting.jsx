import { useState, useRef, useEffect } from 'react'
import Swal from 'sweetalert2'
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
  FaHistory
} from "react-icons/fa";
import { profileApi } from '../services/api';

const CustomerAccountSetting = ({ onBack, onLogoClick, onProfileClick, onLogout, currentUser, token, onUpdateUser }) => {
  const [activeSection, setActiveSection] = useState('personal')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileDropdownRef = useRef(null)

  // Dynamic form data based on currentUser
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || 'Customer User',
    email: currentUser?.email || 'customer@stylesathi.com',
    phone: currentUser?.phone || '+1 234 567 8900',
    country: currentUser?.country || 'United States',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State to track the current displayed name (will update when saved)
  const [displayName, setDisplayName] = useState(formData.fullName);

  // Dynamic notifications based on user activity
  const [notifications] = useState([]);

  // Dynamic order history based on user purchases
  const [orderHistory] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false)
      }
    }

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileDropdown])

  const mainColor = "#c4a62c";

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
      });
      const user = resp.user || resp;
      const updated = {
        ...currentUser,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || formData.fullName,
        type: user.role || currentUser?.type,
      };
      setDisplayName(updated.name);
      onUpdateUser && onUpdateUser(updated);
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'profile-updated', title: 'Profile Updated', message: 'Your profile changes are saved', time: 'Just now' } }));
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Update Failed', text: e?.message || 'Failed to update profile' });
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
    console.log('Updating password...');
    Swal.fire({ icon: 'success', title: 'Password Updated', text: 'Password updated successfully!' });
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      delivered: { class: 'bg-success', text: 'Delivered' },
      in_transit: { class: 'bg-warning text-dark', text: 'In Transit' },
      processing: { class: 'bg-info', text: 'Processing' },
      cancelled: { class: 'bg-danger', text: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig.processing;
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* HEADER */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '40px', cursor: 'pointer' }} onClick={onLogoClick || onBack} />
            </div>

            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-gold">
                  <FaSearch className="text-gold" />
                </span>
                <input className="form-control border-gold" placeholder="Search for rings, watches, glasses, shoes..." />
              </div>
            </div>

            <div className="col-md-3 d-flex justify-content-end align-items-center gap-4">
              {/* Notification Bell - No panel */}
              <div className="position-relative">
                <button
                  className="btn btn-link text-gold p-0 position-relative"
                >
                  <FaBell className="fs-4" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge bg-blue rounded-pill">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
              </div>

              {/* Profile Dropdown */}
              <div className="d-flex align-items-center gap-2 position-relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="profile-avatar"
                >
                  <FaUser className="text-gold" />
                </button>
                <div className="d-none d-md-block">
                  <button
                    onClick={onProfileClick}
                    className="text-gold fw-semibold text-decoration-none border-0 bg-transparent"
                  >
                    {displayName}
                  </button>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <FaCheckCircle className="text-gold" size={12} />
                    <small className="text-gold">Verified Customer</small>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="position-absolute top-100 end-0 bg-white border border-gold rounded shadow-lg py-2 min-w-160 z-50 mt-2">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false)
                        if (onProfileClick) onProfileClick()
                      }}
                      className="w-100 px-4 py-2 text-start text-gold hover-bg-gold-light border-0 bg-transparent d-flex align-items-center gap-2"
                    >
                      <FaUser className="text-gold" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false)
                        if (onLogout) onLogout()
                      }}
                      className="w-100 px-4 py-2 text-start text-danger hover-bg-gold-light border-0 bg-transparent d-flex align-items-center gap-2"
                    >
                      <FaSignOutAlt />
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
                      <FaUser className="text-gold fs-2" />
                    </div>
                    <div className="position-absolute bottom-0 end-0 bg-gold rounded-circle border-2 border-white d-flex align-items-center justify-content-center" style={{width: '24px', height: '24px'}}>
                      <FaCheckCircle className="text-white" size={12} />
                    </div>
                  </div>
                  <h5 className="fw-bold text-gold mb-1">{displayName}</h5>
                  <p className="text-muted small mb-2">{formData.email}</p>
                  <span className="badge bg-gold-light text-gold px-3 py-2">
                    <FaCheckCircle className="me-1" />
                    Verified Customer
                  </span>
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
                    {/* Full Name */}
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

                    {/* Email Address */}
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

                    {/* Phone Number */}
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
                          </div>
                          {verificationSent && !phoneVerified && (
                            <div className="mt-2 d-flex gap-2">
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

                    {/* Country/Region */}
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

                    {/* Save Button */}
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
                              <div className="col-md-4">
                                <div className="d-flex align-items-center gap-3">
                                  <FaHistory size={24} className="text-gold" />
                                  <div>
                                    <h6 className="fw-semibold text-gold mb-1">{order.id}</h6>
                                    <small className="text-muted">{order.date}</small>
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-3">
                                {getStatusBadge(order.status)}
                              </div>
                              <div className="col-md-3">
                                <strong className="text-blue">
                                  ${order.total.toFixed(2)}
                                </strong>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-top">
                              <div className="d-flex gap-2 mb-2">
                                {order.items.map((item, index) => (
                                  <div 
                                    key={index}
                                    className="bg-light rounded d-flex align-items-center justify-content-center position-relative"
                                    style={{width: '60px', height: '60px'}}
                                  >
                                    {item.image ? (
                                      <img 
                                        src={item.image} 
                                        alt={item.name}
                                        className="rounded"
                                        style={{width: '100%', height: '100%', objectFit: 'cover'}}
                                      />
                                    ) : (
                                      <i className="bi bi-gem text-gold"></i>
                                    )}
                                    <span className="position-absolute top-0 start-100 translate-middle badge bg-gold rounded-pill">
                                      {item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <small className="text-muted">
                                Items: {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                              </small>
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
                    {/* Current Password */}
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

                    {/* New Password */}
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

                    {/* Confirm New Password */}
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

                    {/* Update Button */}
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
                          if (!window.confirm('Delete your account? This cannot be undone.')) return;
                          try {
                            await profileApi.delete(token);
                            onLogout && onLogout();
                          } catch (e) {
                            Swal.fire({ icon: 'error', title: 'Delete Failed', text: e?.message || 'Failed to delete account' });
                          }
                        }}
                      >
                        <FaTrash />
                        Delete Account
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
              <h6 className="fw-bold mb-3" style={{ color: mainColor }}>QUICK LINKS</h6>
              <div className="d-flex flex-column gap-2">
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Home</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Shop</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Categories</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">New Arrivals</a>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="fw-bold mb-3" style={{ color: mainColor }}>CUSTOMER CARE</h6>
              <div className="d-flex flex-column gap-2">
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Contact Us</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">FAQ</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Shipping Info</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Returns</a>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="fw-bold mb-3" style={{ color: mainColor }}>LEGAL</h6>
              <div className="d-flex flex-column gap-2">
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Privacy Policy</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Terms of Service</a>
                <a href="#" className="text-light opacity-75 text-decoration-none hover-underline">Cookie Policy</a>
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
        .profile-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(196, 166, 44, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(196,166,44,0.4);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .profile-avatar:hover {
          background: rgba(196, 166, 44, 0.25);
          transform: scale(1.05);
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
        .min-w-160 {
          min-width: 160px;
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
  )
}

export default CustomerAccountSetting
