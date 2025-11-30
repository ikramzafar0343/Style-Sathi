import { useState, useEffect } from 'react';
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { 
  FaUsers, 
  FaCheckCircle, 
  FaFlag, 
  FaChartLine, 
  FaSearch, 
  FaChevronDown,
  FaSignOutAlt,
  FaThLarge,
  FaBox,
  FaShieldAlt,
  FaExclamationTriangle,
  FaFileAlt,
  FaChartBar,
  FaCode,
  FaCog,
  FaServer,
  FaExclamationCircle,
  FaUserCheck,
  FaTimesCircle,
  FaEnvelope,
  FaPhone,
  FaCalendar,
  FaDollarSign,
  FaShoppingCart,
  FaComment,
  FaExclamation,
  FaClock,
  FaUser,
  FaBuilding,
  FaInfoCircle
} from 'react-icons/fa';
import { IoMdTrendingUp } from "react-icons/io";
import { adminApi } from '../services/api';
import NotificationBell from './NotificationBell';

const AdminDashboard = ({ 
  onUserManagement, 
  onOrdersManagement,
  onContentModeration, 
  onSystemSettings, 
  onReports, 
  onLogout, 
  currentUser,
  token
}) => {
  const secondaryColor = '#2c67c4';
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.name || 'Admin User');
  
  const [selectedActivity, setSelectedActivity] = useState(null);
  

  

  const [recentActivities, setRecentActivities] = useState([]);

  

  // Get current date and time
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const timeString = currentDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaThLarge, handler: () => setActiveMenu('dashboard') },
    { id: 'user-management', label: 'User Management', icon: FaUsers, handler: onUserManagement },
    { id: 'orders-management', label: 'Orders Management', icon: FaShoppingCart, handler: () => { setActiveMenu('orders-management'); window.dispatchEvent(new Event('admin:navigate:orders')); } },
    { id: 'product-management', label: 'Product Management', icon: FaBox, handler: () => { setActiveMenu('product-management'); window.dispatchEvent(new Event('admin:navigate:products')); } },
    { id: 'reports', label: 'Reports', icon: FaChartBar, handler: onReports },
    { id: 'content-moderation', label: 'Content Moderation', icon: FaFlag, handler: onContentModeration },
    { id: 'system-settings', label: 'System Settings', icon: FaCog, handler: onSystemSettings },
  ];

  const [keyMetrics, setKeyMetrics] = useState([]);

  const [systemHealth, setSystemHealth] = useState([]);

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await adminApi.getDashboard(token);
        if (!mounted) return;
        const iconMap = {
          users: FaUsers,
          check: FaCheckCircle,
          flag: FaFlag,
          chart: FaChartLine,
          server: FaServer,
          trend: IoMdTrendingUp,
          error: FaExclamationCircle,
          usercheck: FaUserCheck
        };
        setKeyMetrics((resp.keyMetrics || []).map(m => ({ ...m, icon: iconMap[m.icon] || FaChartLine })));
        setSystemHealth((resp.systemHealth || []).map(h => ({ ...h, icon: iconMap[h.icon] || FaServer })));
        setRecentActivities(resp.recentActivities || []);
      } catch {
        console.error('admin dashboard fetch failed');
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    const load = () => {
      try {
        const cu = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (cu?.name) setDisplayName(cu.name);
      } catch (e) { console.warn('load currentUser failed', e) }
    };
    load();
    const onProfileUpdate = (e) => {
      const name = e?.detail?.name;
      if (name) setDisplayName(name);
      else load();
    };
    const onSettingsUpdate = () => load();
    const onModerationUpdate = async () => {
      try {
        const resp = await adminApi.getDashboard(token);
        setRecentActivities(resp.recentActivities || []);
      } catch {
        console.error('admin dashboard refresh failed');
      }
    };
    window.addEventListener('profile:update', onProfileUpdate);
    window.addEventListener('admin:settings:update', onSettingsUpdate);
    window.addEventListener('admin:moderation:update', onModerationUpdate);
    return () => {
      window.removeEventListener('profile:update', onProfileUpdate);
      window.removeEventListener('admin:settings:update', onSettingsUpdate);
      window.removeEventListener('admin:moderation:update', onModerationUpdate);
    };
  }, [currentUser?.name, token]);


  return (
    <div className="min-vh-100 bg-light d-flex">
      {/* Left Sidebar */}
      <div className="bg-white border-end" style={{ width: '250px' }}>
        <div className="p-4 border-bottom">
          <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '36px' }} />
          <p className="text-muted small mb-0">Admin Portal</p>
        </div>
        <nav className="p-3">
          {menuItems.map((item) => (
            <div key={item.id} className="mb-2">
              <button
                onClick={item.handler}
                className={`w-100 btn d-flex align-items-center gap-3 px-3 py-2 text-start ${
                  activeMenu === item.id ? '' : ''
                }`}
                style={
                  activeMenu === item.id
                    ? { backgroundColor: secondaryColor, color: '#fff' }
                    : { backgroundColor: 'rgba(44, 103, 196, 0.06)', color: secondaryColor, borderColor: 'rgba(44, 103, 196, 0.3)' }
                }
              >
                <item.icon className="flex-shrink-0" />
                <span className="fw-medium">{item.label}</span>
              </button>
              
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Top Header */}
        <header className="bg-white border-bottom px-4 py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-4 flex-grow-1">
              {/* Search Bar */}
              <div className="flex-grow-1" style={{ maxWidth: '400px' }}>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0" style={{ borderColor: secondaryColor }}>
                    <FaSearch style={{ color: secondaryColor }} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search users, products, posts..."
                    className="form-control border-start-0"
                    style={{ borderColor: secondaryColor }}
                  />
                </div>
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-3">
              <NotificationBell mainColor={secondaryColor} secondaryColor={secondaryColor} />
              {/* Profile Dropdown */}
              <div className="position-relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="btn btn-light d-flex align-items-center gap-3"
                >
                  <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backgroundColor: 'rgba(44, 103, 196, 0.12)' }}>
                    <FaUser style={{ color: secondaryColor }} />
                  </div>
                  <div className="text-start">
                    <p className="mb-0 fw-medium text-dark">{displayName}</p>
                    <small className="text-muted">{dateString}</small>
                  </div>
                  <FaChevronDown className="text-muted" />
                </button>
                
                {showProfileDropdown && (
                  <div className="position-absolute end-0 mt-2 w-100 bg-white rounded shadow-lg border" style={{ minWidth: '200px', zIndex: 1050 }}>
                    <div className="p-3 border-bottom">
                      <p className="mb-0 fw-medium text-dark">{displayName}</p>
                      <small className="text-muted">{timeString}</small>
                    </div>
                    <button
                      onClick={onLogout}
                      className="w-100 btn d-flex align-items-center gap-2 px-3 py-2 text-danger text-start border-0 bg-transparent"
                    >
                      <FaSignOutAlt />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow-1 p-4 overflow-auto">
          {/* Welcome Section */}
          <div className="mb-4">
            <h2 className="h3 fw-bold mb-2" style={{ color: secondaryColor }}>Welcome back, {displayName}</h2>
            <p className="text-muted mb-0">Here's what's happening with your platform today.</p>
          </div>

          {/* Key Metrics Cards */}
          <div className="row g-3 mb-4">
            {keyMetrics.map((metric) => (
              <div key={metric.label} className="col-md-6 col-lg-3">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="text-muted small mb-1">{metric.label}</p>
                        <h3 className="fw-bold text-dark mb-0">{metric.value}</h3>
                      </div>
                      <div className={`rounded-circle d-flex align-items-center justify-content-center ${metric.color}`} style={{ width: '50px', height: '50px' }}>
                        <metric.icon className="text-white" size={20} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity Section */}
          <div className="card mb-4 border-0 shadow-sm">
            <div className="card-header bg-white border-bottom-0">
              <h3 className="h5 fw-bold text-dark mb-0">Recent Activity</h3>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="border-0">Time</th>
                      <th className="border-0">Action</th>
                      <th className="border-0">User</th>
                      <th className="border-0">Status</th>
                      <th className="border-0">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((activity, index) => (
                      <tr key={index}>
                        <td className="text-muted">{activity.time}</td>
                        <td className="fw-medium text-dark">{activity.action}</td>
                        <td className="text-muted">{activity.user}</td>
                        <td>
                          <span className={`badge ${activity.statusColor}`}>
                            {activity.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            onClick={() => handleViewDetails(activity)}
                            className="btn btn-link p-0 text-decoration-none fw-medium"
                            style={{ color: secondaryColor }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* System Health Section */}
          <div className="row g-3">
            {systemHealth.map((health) => (
              <div key={health.label} className="col-md-6 col-lg-3">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <p className="text-muted small mb-0">{health.label}</p>
                      <health.icon className={health.color} />
                    </div>
                    <h4 className="fw-bold text-dark mb-0">{health.value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSelectedActivity(null)}
        >
          <div 
            className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Activity Details</h5>
                  <p className="text-muted small mb-0">ID: {selectedActivity.id}</p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedActivity(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <FaInfoCircle className="me-2" />
                  Detailed activity view for {selectedActivity.action}
                </div>
                
                {/* User Information */}
                <div className="card mb-3">
                  <div className="card-header">
                    <h6 className="mb-0">
                      <FaUser className="me-2" />
                      User Information
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <p className="mb-1"><strong>Name:</strong> {selectedActivity.details.fullName}</p>
                        <p className="mb-1"><strong>Email:</strong> {selectedActivity.details.email}</p>
                        <p className="mb-1"><strong>Role:</strong> {selectedActivity.details.role}</p>
                      </div>
                      <div className="col-md-6">
                        <p className="mb-1"><strong>Phone:</strong> {selectedActivity.details.phone}</p>
                        <p className="mb-1"><strong>Status:</strong> {selectedActivity.details.accountStatus}</p>
                        <p className="mb-1"><strong>Registered:</strong> {selectedActivity.details.registrationDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-3">
                  <button
                    onClick={() => {
                      const t = (selectedActivity?.type || '').toLowerCase();
                      const a = (selectedActivity?.action || '').toLowerCase();
                      const goOrders = () => {
                        if (typeof onOrdersManagement === 'function') onOrdersManagement();
                        else window.dispatchEvent(new Event('admin:navigate:orders'));
                      };
                      const goUsers = () => {
                        if (typeof onUserManagement === 'function') onUserManagement();
                        else window.dispatchEvent(new Event('admin:navigate:users'));
                      };
                      const goProducts = () => {
                        window.dispatchEvent(new Event('admin:navigate:products'));
                      };
                      if (t.startsWith('order') || a.includes('order')) goOrders();
                      else if (t.startsWith('user') || a.includes('user')) goUsers();
                      else if (t.startsWith('product') || a.includes('product')) goProducts();
                      else goUsers();
                      setSelectedActivity(null);
                    }}
                    className="btn"
                    style={{ backgroundColor: secondaryColor, color: '#fff' }}
                  >
                    Take Action
                  </button>
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
