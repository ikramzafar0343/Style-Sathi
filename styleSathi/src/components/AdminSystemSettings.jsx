import { useState, useRef, useEffect } from 'react'
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
  FaSearch,
  FaShoppingBag,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaCog,
  FaBell,
  FaFileAlt,
  FaServer
} from "react-icons/fa";
import NotificationBell from './NotificationBell';
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import Swal from 'sweetalert2';

const AdminSystemSettings = ({ onBack, onLogoClick, onProfileClick, onLogout }) => {
  const [activeSection, setActiveSection] = useState('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileDropdownRef = useRef(null)
  const nameRef = useRef(null)
  const emailRef = useRef(null)
  const phoneRef = useRef(null)
  const usernameRef = useRef(null)
  const currentPasswordRef = useRef(null)
  const newPasswordRef = useRef(null)
  const confirmPasswordRef = useRef(null)
  const initialSettings = (() => {
    try {
      const raw = localStorage.getItem('adminSettings')
      return raw ? JSON.parse(raw) : {}
    } catch (e) {
      console.warn('adminSettings load failed', e)
      return {}
    }
  })()
  const [profileName, setProfileName] = useState(initialSettings.profile?.name || 'Admin User')
  const [profileEmail, setProfileEmail] = useState(initialSettings.profile?.email || 'admin@stylesathi.com')
  const [profilePhone, setProfilePhone] = useState(initialSettings.profile?.phone || '+1 555 000 0000')
  const [profileUsername, setProfileUsername] = useState(initialSettings.profile?.username || 'admin')
  const [roleSuperadmin, setRoleSuperadmin] = useState(!!initialSettings.roles?.superadmin)
  const [roleModerator, setRoleModerator] = useState(initialSettings.roles?.moderator !== undefined ? !!initialSettings.roles?.moderator : true)
  const [roleSupport, setRoleSupport] = useState(!!initialSettings.roles?.support)
  const [permUsers, setPermUsers] = useState(initialSettings.permissions?.manageUsers !== undefined ? !!initialSettings.permissions?.manageUsers : true)
  const [permProducts, setPermProducts] = useState(initialSettings.permissions?.manageProducts !== undefined ? !!initialSettings.permissions?.manageProducts : true)
  const [permContent, setPermContent] = useState(initialSettings.permissions?.moderateContent !== undefined ? !!initialSettings.permissions?.moderateContent : true)
  const [permReports, setPermReports] = useState(!!initialSettings.permissions?.accessReports)
  const [maintenanceMode, setMaintenanceMode] = useState(!!initialSettings.system?.maintenanceMode)
  const [enableRegistrations, setEnableRegistrations] = useState(initialSettings.system?.enableRegistrations !== undefined ? !!initialSettings.system?.enableRegistrations : true)
  const [requireSellerVerification, setRequireSellerVerification] = useState(initialSettings.system?.requireSellerVerification !== undefined ? !!initialSettings.system?.requireSellerVerification : true)
  const [alertSystem, setAlertSystem] = useState(initialSettings.notifications?.alerts?.system !== undefined ? !!initialSettings.notifications?.alerts?.system : true)
  const [alertReports, setAlertReports] = useState(initialSettings.notifications?.alerts?.reports !== undefined ? !!initialSettings.notifications?.alerts?.reports : true)
  const [alertSecurity, setAlertSecurity] = useState(initialSettings.notifications?.alerts?.security !== undefined ? !!initialSettings.notifications?.alerts?.security : true)
  const [chanEmail, setChanEmail] = useState(initialSettings.notifications?.channels?.email !== undefined ? !!initialSettings.notifications?.channels?.email : true)
  const [chanInapp, setChanInapp] = useState(initialSettings.notifications?.channels?.inapp !== undefined ? !!initialSettings.notifications?.channels?.inapp : true)
  const [chanWebhook, setChanWebhook] = useState(!!initialSettings.notifications?.channels?.webhook)
  const [apiKey, setApiKey] = useState(initialSettings.integrations?.apiKey || '*****-*****-*****')
  const [webhookUrl, setWebhookUrl] = useState(initialSettings.integrations?.webhook || 'https://api.stylesathi.com/webhook')

  

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
  
  const saveToStorage = (partial) => {
    try {
      const prev = JSON.parse(localStorage.getItem('adminSettings') || '{}')
      const next = { ...prev, ...partial }
      localStorage.setItem('adminSettings', JSON.stringify(next))
      window.dispatchEvent(new CustomEvent('admin:settings:update', { detail: next }))
    } catch (e) { console.warn('adminSettings save failed', e) }
  }
  const handleFooterQuickLink = (label) => {
    const t = String(label || '').toLowerCase();
    if (t.includes('home')) { onLogoClick && onLogoClick(); return; }
    onBack && onBack();
  };
  const handleFooterInfo = (label) => {
    Swal.fire({ icon: 'info', title: label, text: 'Information will be shown here' });
  };
  const handleSaveProfile = () => {
    const name = nameRef.current?.value || profileName
    const email = emailRef.current?.value || profileEmail
    const phone = phoneRef.current?.value || profilePhone
    const username = usernameRef.current?.value || profileUsername
    setProfileName(name)
    setProfileEmail(email)
    setProfilePhone(phone)
    setProfileUsername(username)
    saveToStorage({ profile: { name, email, phone, username } })
    try {
      const cu = JSON.parse(localStorage.getItem('currentUser') || '{}')
      localStorage.setItem('currentUser', JSON.stringify({ ...cu, name, email, username }))
      window.dispatchEvent(new CustomEvent('profile:update', { detail: { name, email, username } }))
    } catch (e) { console.warn('profile update failed', e) }
  }
  const handleSaveRoles = () => {
    saveToStorage({ roles: { superadmin: roleSuperadmin, moderator: roleModerator, support: roleSupport }, permissions: { manageUsers: permUsers, manageProducts: permProducts, moderateContent: permContent, accessReports: permReports } })
  }
  const handleUpdatePassword = () => {
    const np = newPasswordRef.current?.value || ''
    const cp = confirmPasswordRef.current?.value || ''
    if (!np || np !== cp) return
    saveToStorage({ security: { twoFactorEnabled, lastPasswordChange: new Date().toISOString() } })
  }
  const handleForceLogoutAll = () => {
    try {
      localStorage.removeItem('authTokens')
      window.dispatchEvent(new CustomEvent('auth:logout-all'))
    } catch (err) { console.warn('force logout failed', err) }
  }
  const handleApplySystem = () => {
    saveToStorage({ system: { maintenanceMode, enableRegistrations, requireSellerVerification } })
  }
  const handleResetCache = () => {
    try {
      localStorage.removeItem('adminSettings')
      window.dispatchEvent(new CustomEvent('cache:reset'))
    } catch (err) { console.warn('reset cache failed', err) }
  }
  const handleSaveNotifications = () => {
    saveToStorage({ notifications: { alerts: { system: alertSystem, reports: alertReports, security: alertSecurity }, channels: { email: chanEmail, inapp: chanInapp, webhook: chanWebhook } } })
  }
  const handleSendTest = () => {
    window.dispatchEvent(new CustomEvent('notification:push', { detail: { title: 'Test Notification', message: 'This is a test', time: 'Just now' } }))
  }
  const handleExportCsv = () => {
    const rows = [
      ['Time', 'User', 'Action', 'Details'],
      ['2025-11-29 10:11', 'admin', 'update_settings', 'Changed maintenance mode'],
      ['2025-11-29 10:12', 'admin', 'save_roles', 'Updated permissions'],
      ['2025-11-29 10:13', 'admin', 'save_profile', 'Updated profile'],
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audit.csv'
    a.click()
    URL.revokeObjectURL(url)
  }
  const handleRegenerateApiKey = () => {
    const s = Math.random().toString(36).slice(2, 7) + '-' + Math.random().toString(36).slice(2, 7) + '-' + Math.random().toString(36).slice(2, 7)
    setApiKey(s)
    saveToStorage({ integrations: { apiKey: s, webhook: webhookUrl } })
  }
  const handleSaveWebhook = () => {
    saveToStorage({ integrations: { apiKey, webhook: webhookUrl } })
  }

  const mainColor = "#2c67c4";
  const [searchQuery, setSearchQuery] = useState('');
  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      (onBack || onLogoClick) && (onBack ? onBack() : onLogoClick());
    }
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
                <input className="form-control border-gold" placeholder="Search for rings, watches, glasses, shoes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKey} />
              </div>
            </div>

            <div className="col-md-3 d-flex justify-content-end align-items-center gap-4">
              <NotificationBell mainColor={mainColor} secondaryColor={mainColor} />
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
                    {profileName}
                  </button>
                  <div className="d-flex align-items-center gap-1 mt-1">
                    <FaCheckCircle className="text-gold" size={12} />
                    <small className="text-gold">Administrator</small>
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
                  <h5 className="fw-bold text-gold mb-1">{profileName}</h5>
                  <p className="text-muted small mb-2">{profileEmail}</p>
                  <span className="badge bg-gold-light text-gold px-3 py-2">
                    <FaCheckCircle className="me-1" />
                    Administrator
                  </span>
                </div>

                <nav className="nav flex-column gap-2">
                  {[
                    { id: 'profile', label: 'Admin Profile', icon: FaUser },
                    { id: 'roles', label: 'Roles & Permissions', icon: FaShieldAlt },
                    { id: 'security', label: 'Security', icon: FaKey },
                    { id: 'system', label: 'System Configuration', icon: FaCog },
                    { id: 'notifications', label: 'Notification Preferences', icon: FaBell },
                    { id: 'audit', label: 'Audit Logs', icon: FaFileAlt },
                    { id: 'integrations', label: 'Integrations', icon: FaServer },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`nav-link text-start d-flex align-items-center gap-3 py-3 rounded`}
                      style={
                        activeSection === item.id
                          ? { backgroundColor: mainColor, color: '#fff' }
                          : { color: mainColor, backgroundColor: 'rgba(44, 103, 196, 0.12)' }
                      }
                    >
                      <item.icon />
                      <span className="fw-semibold">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-lg-9">
            {/* Admin Profile Section */}
            {activeSection === 'profile' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Admin Profile</h4>
                  <div className="row g-4">
                    {/* Full Name */}
                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Full Name</label>
                        </div>
                        <div className="col-md-9">
                          <input
                            ref={nameRef}
                            type="text"
                            defaultValue={profileName}
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
                              ref={emailRef}
                              type="email"
                              defaultValue={profileEmail}
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
                                ref={phoneRef}
                                type="tel"
                                defaultValue={profilePhone}
                                className="form-control border-gold"
                              />
                          </div>
                          <div className="col-4">
                            <button className="btn btn-gold w-100">Verify</button>
                          </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Username */}
                    <div className="col-12">
                      <div className="row align-items-center">
                        <div className="col-md-3">
                          <label className="form-label text-muted mb-2 mb-md-0">Username</label>
                        </div>
                        <div className="col-md-9">
                          <input ref={usernameRef} type="text" defaultValue={profileUsername} className="form-control border-gold" />
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="col-12">
                      <div className="row">
                        <div className="col-md-9 offset-md-3">
                          <div className="d-flex justify-content-end pt-3">
                            <button className="btn btn-gold px-4" onClick={handleSaveProfile}>Save Changes</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'roles' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Roles & Permissions</h4>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="border border-gold rounded p-3">
                        <h6 className="fw-semibold mb-2">Assign Roles</h6>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="role-superadmin" checked={roleSuperadmin} onChange={(e) => setRoleSuperadmin(e.target.checked)} />
                          <label className="form-check-label" htmlFor="role-superadmin">Super Admin</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="role-moderator" checked={roleModerator} onChange={(e) => setRoleModerator(e.target.checked)} />
                          <label className="form-check-label" htmlFor="role-moderator">Moderator</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="role-support" checked={roleSupport} onChange={(e) => setRoleSupport(e.target.checked)} />
                          <label className="form-check-label" htmlFor="role-support">Support</label>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border border-gold rounded p-3">
                        <h6 className="fw-semibold mb-2">Permissions</h6>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="perm-users" checked={permUsers} onChange={(e) => setPermUsers(e.target.checked)} />
                          <label className="form-check-label" htmlFor="perm-users">Manage Users</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="perm-products" checked={permProducts} onChange={(e) => setPermProducts(e.target.checked)} />
                          <label className="form-check-label" htmlFor="perm-products">Manage Products</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="perm-content" checked={permContent} onChange={(e) => setPermContent(e.target.checked)} />
                          <label className="form-check-label" htmlFor="perm-content">Moderate Content</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="perm-reports" checked={permReports} onChange={(e) => setPermReports(e.target.checked)} />
                          <label className="form-check-label" htmlFor="perm-reports">Access Reports</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end pt-3">
                    <button className="btn btn-gold px-4" onClick={handleSaveRoles}>Save Roles</button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Security</h4>
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
                              ref={currentPasswordRef}
                              type={showCurrentPassword ? 'text' : 'password'}
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
                              ref={newPasswordRef}
                              type={showNewPassword ? 'text' : 'password'}
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
                              ref={confirmPasswordRef}
                              type={showConfirmPassword ? 'text' : 'password'}
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
                            <button className="btn btn-gold px-4" onClick={handleUpdatePassword}>Update Password</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center py-3 border-top">
                      <div>
                        <h6 className="fw-semibold text-gold mb-1">Two-Factor Authentication</h6>
                        <p className="text-muted small mb-0">Require 2FA for admin login</p>
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
                    <div className="d-flex justify-content-between align-items-center py-3 border-top">
                      <div>
                        <h6 className="fw-semibold text-gold mb-1">Force Logout All Sessions</h6>
                        <p className="text-muted small mb-0">End all active admin sessions</p>
                      </div>
                      <button className="btn btn-outline-danger" onClick={handleForceLogoutAll}>Force Logout</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Configuration Section */}
            {activeSection === 'system' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">System Configuration</h4>
                  <div className="space-y-4">
                    <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                      <div>
                        <h6 className="fw-semibold text-gold mb-1">Maintenance Mode</h6>
                        <p className="text-muted small mb-0">Temporarily take the platform offline</p>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                      <div>
                        <h6 className="fw-semibold text-gold mb-1">Enable Registrations</h6>
                        <p className="text-muted small mb-0">Allow new user signups</p>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={enableRegistrations} onChange={(e) => setEnableRegistrations(e.target.checked)} />
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-3 border-bottom">
                      <div>
                        <h6 className="fw-semibold text-gold mb-1">Require Seller Verification</h6>
                        <p className="text-muted small mb-0">Only verified sellers can list products</p>
                      </div>
                      <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" checked={requireSellerVerification} onChange={(e) => setRequireSellerVerification(e.target.checked)} />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end pt-3 gap-2">
                      <button className="btn btn-outline-secondary" onClick={handleResetCache}>Reset Cache</button>
                      <button className="btn btn-gold" onClick={handleApplySystem}>Apply Changes</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Notification Preferences</h4>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="border border-gold rounded p-3">
                        <h6 className="fw-semibold mb-2">Admin Alerts</h6>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="alert-system" checked={alertSystem} onChange={(e) => setAlertSystem(e.target.checked)} />
                          <label className="form-check-label" htmlFor="alert-system">System Alerts</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="alert-reports" checked={alertReports} onChange={(e) => setAlertReports(e.target.checked)} />
                          <label className="form-check-label" htmlFor="alert-reports">Reports & Analytics</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="alert-security" checked={alertSecurity} onChange={(e) => setAlertSecurity(e.target.checked)} />
                          <label className="form-check-label" htmlFor="alert-security">Security Incidents</label>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border border-gold rounded p-3">
                        <h6 className="fw-semibold mb-2">Channels</h6>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="chan-email" checked={chanEmail} onChange={(e) => setChanEmail(e.target.checked)} />
                          <label className="form-check-label" htmlFor="chan-email">Email</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="chan-inapp" checked={chanInapp} onChange={(e) => setChanInapp(e.target.checked)} />
                          <label className="form-check-label" htmlFor="chan-inapp">In-app</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="chan-webhook" checked={chanWebhook} onChange={(e) => setChanWebhook(e.target.checked)} />
                          <label className="form-check-label" htmlFor="chan-webhook">Webhook</label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end pt-3 gap-2">
                    <button className="btn btn-outline-secondary" onClick={handleSendTest}>Send Test</button>
                    <button className="btn btn-gold" onClick={handleSaveNotifications}>Save Preferences</button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'audit' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Audit Logs</h4>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Time</th>
                          <th>User</th>
                          <th>Action</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1,2,3,4].map((i) => (
                          <tr key={i}>
                            <td className="text-muted">2025-11-29 10:{10+i}</td>
                            <td>admin</td>
                            <td>update_settings</td>
                            <td>Changed maintenance mode</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="d-flex justify-content-end pt-3 gap-2">
                    <button className="btn btn-outline-secondary" onClick={handleExportCsv}>Export CSV</button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'integrations' && (
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold text-gold mb-4">Integrations</h4>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="border border-gold rounded p-3">
                        <h6 className="fw-semibold mb-2">API Keys</h6>
                        <div className="input-group">
                          <input className="form-control" value={apiKey} readOnly />
                          <button className="btn btn-outline-secondary" onClick={handleRegenerateApiKey}>Regenerate</button>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border border-gold rounded p-3">
                        <h6 className="fw-semibold mb-2">Webhook Endpoint</h6>
                        <div className="input-group">
                          <input className="form-control" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                          <button className="btn btn-outline-secondary" onClick={handleSaveWebhook}>Save</button>
                        </div>
                      </div>
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
              <h6 className="text-gold fw-bold mb-3">QUICK LINKS</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterQuickLink('Home')}>Home</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterQuickLink('Shop')}>Shop</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterQuickLink('Categories')}>Categories</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterQuickLink('New Arrivals')}>New Arrivals</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="text-gold fw-bold mb-3">CUSTOMER CARE</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Contact Us')}>Contact Us</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('FAQ')}>FAQ</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Shipping Info')}>Shipping Info</button>
                <button className="btn text-start text-light opacity-75 hover-underline" onClick={() => handleFooterInfo('Returns')}>Returns</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 className="text-gold fw-bold mb-3">LEGAL</h6>
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
        .text-gold { color: #2c67c4 !important; }
        .text-blue { color: #2c67c4 !important; }
        .text-red { color: #dc3545 !important; }
        .bg-blue { background-color: #2c67c4 !important; }
        .bg-gold { background-color: #2c67c4 !important; }
        .bg-gold-light { background-color: rgba(44, 103, 196, 0.1) !important; }
        .border-gold { border-color: #2c67c4 !important; }
        .btn-gold { 
          background-color: #2c67c4; 
          color: white; 
          border: none;
          transition: all 0.3s ease;
        }
        .btn-gold:hover { 
          background-color: #2353a5; 
          color: white; 
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(44, 103, 196, 0.3);
        }
        .profile-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(44, 103, 196, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(44,103,196,0.4);
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

export default AdminSystemSettings
