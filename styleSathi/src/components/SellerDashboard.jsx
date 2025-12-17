import { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  FaShoppingCart,
  FaUser,
  FaSignOutAlt,
  FaPlus,
  FaChartBar,
  FaBox,
  FaShoppingBag,
  FaStar,
  FaList,
  FaCheckCircle,
  FaGavel,
  FaBell,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedin,
  FaDollarSign,
  FaUsers,
  FaSearch
} from "react-icons/fa";
import { BsSearch } from "react-icons/bs";
import { IoIosTrendingUp, IoIosTrendingDown } from "react-icons/io";
import styleSathiLogo from '../assets/styleSathiLogo.svg';

// Import sample data
import { catalogApi, ordersApi } from '../services/api';
import NotificationBell from './NotificationBell';
import CloudinaryImage from './ui/CloudinaryImage';

const SellerDashboard = ({ 
  onProfileClick, 
  onVerifiedSellerClick, 
  onAddProduct, 
  onViewAnalytics, 
  onManageInventory, 
  onViewOrders, 
  onLogout, 
  onLogoClick,
  currentUser,
  token,
  // New props for navigation
  onNavigateToOrderDetails,
  onNavigateToAnalytics,
  onSearch
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  

  // Constants
  const MAIN_COLOR = "#c4a62c";
  const SECONDARY_COLOR = "#2c67c4";
  const DANGER_COLOR = "#dc3545";

  // Dynamic data based on sample products and user
  const [sellerData, setSellerData] = useState({
    stats: {
      totalProducts: 0,
      totalSales: 0,
      totalOrders: 0,
      totalCustomers: 0,
      monthlyRevenue: 0,
      pendingOrders: 0,
      activeListings: 0,
      customerRating: 0
    },
    recentActivities: [],
    topProducts: [],
    notifications: []
  });

  // Initialize dynamic data
  useEffect(() => {
    const load = async () => {
      try {
        const list = await catalogApi.getMyProducts(token);
        const orders = await ordersApi.getSellerOrders(token);
        const notifications = [];
        const aggByProduct = {};
        const activities = (orders || []).slice(0, 20).map((o) => {
          const items = Array.isArray(o.items) ? o.items : [];
          const first = items[0] || {};
          const name = (first.product && first.product.title) || 'Order Item';
          const pid = (first.product && first.product.id) || null;
          const sales = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
          const revenue = Number(o.total || 0);
          if (pid) {
            if (!aggByProduct[pid]) {
              const fromList = (Array.isArray(list) ? list.find((p) => p.id === pid) : null) || {};
              const img =
                (fromList.image_url) ||
                (Array.isArray(fromList.images) ? fromList.images[0] : '') ||
                ((first.product && first.product.image_url) || '');
              aggByProduct[pid] = { id: pid, title: name, imageUrl: img, rating: 0, sales: 0, revenue: 0 };
            }
            aggByProduct[pid].sales += sales;
            aggByProduct[pid].revenue += revenue;
          }
          const s = o.status;
          const mapped = s === 'confirmed' ? 'pending' : (s === 'in_transit' ? 'shipped' : s);
          return {
            id: o.id,
            name,
            status: mapped,
            date: (o.created_at || '').toString(),
            sales,
            revenue,
            orderId: `ORD-${String(o.id).padStart(4,'0')}`,
            productId: pid
          };
        });
        const topProducts = Object.values(aggByProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
        const activeListings = list.filter(p => p.in_stock).length;
        const totalRevenue = (orders || []).filter((o) => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total || 0), 0);
        const totalOrders = (orders || []).length;
        const totalCustomers = new Set((orders || []).map((o) => o.email || o.full_name || '')).size;
        const pendingOrders = (orders || []).filter((o) => ['confirmed','processing'].includes(o.status)).length;
        setSellerData({
          stats: {
            totalProducts: list.length,
            totalSales: totalRevenue,
            totalOrders,
            totalCustomers,
            monthlyRevenue: totalRevenue,
            pendingOrders,
            activeListings,
            customerRating: 0
          },
          recentActivities: activities,
          topProducts,
          notifications
        });
      } catch {
        setSellerData((prev) => prev);
      }
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

  // Key actions - Updated with proper interlinking
  const keyActions = [
    { 
      icon: FaPlus, 
      title: "Add New Product", 
      description: "Upload and list new items", 
      onClick: onAddProduct 
    },
    { 
      icon: FaChartBar, 
      title: "View Analytics", 
      description: "Track your performance", 
      onClick: onViewAnalytics 
    },
    { 
      icon: FaBox, 
      title: "Manage Inventory", 
      description: "Update stock levels", 
      onClick: onManageInventory 
    },
    { 
      icon: FaShoppingBag, 
      title: "View Orders", 
      description: "Manage customer orders", 
      onClick: onViewOrders 
    },
  ];

  // Performance metrics
  const performanceMetrics = [
    { 
      title: "Total Sales", 
      value: `$${sellerData.stats.totalSales.toLocaleString()}`,
      trend: "+15.2%", 
      icon: IoIosTrendingUp, 
      color: MAIN_COLOR 
    },
    { 
      title: "Active Listings", 
      value: sellerData.stats.activeListings.toString(),
      trend: "+8.7%", 
      icon: IoIosTrendingUp, 
      color: MAIN_COLOR 
    },
    { 
      title: "Customer Rating", 
      value: sellerData.stats.customerRating.toString(),
      trend: "+0.2%", 
      icon: IoIosTrendingUp, 
      color: MAIN_COLOR 
    },
  ];

  // Additional metrics
  const additionalMetrics = [
    { 
      icon: FaDollarSign, 
      title: "Monthly Revenue", 
      value: `$${sellerData.stats.monthlyRevenue.toLocaleString()}`,
      trend: "+12.8%", 
      trendColor: MAIN_COLOR 
    },
    { 
      icon: FaBox, 
      title: "Total Products", 
      value: sellerData.stats.totalProducts.toString(),
      trend: '+0%', 
      trendColor: MAIN_COLOR 
    },
    { 
      icon: FaUsers, 
      title: "Total Customers", 
      value: sellerData.stats.totalCustomers.toString(),
      trend: '+0%', 
      trendColor: MAIN_COLOR 
    },
    { 
      icon: FaList, 
      title: "Pending Orders", 
      value: sellerData.stats.pendingOrders.toString(),
      trend: '-0%', 
      trendColor: DANGER_COLOR 
    },
  ];

  const footerLinks = {
    quickLinks: ['Home', 'Shop', 'Categories', 'New Arrivals', 'VR Experience'],
    customerCare: ['Contact Us', 'FAQ', 'Shipping Info', 'Returns', 'Size Guide'],
    legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Refund Policy']
  };

  const socialIcons = [FaFacebookF, FaTwitter, FaInstagram, FaLinkedin];

  // Effects
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

  // Event handlers
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        console.log('Search functionality:', searchQuery);
        Swal.fire({ icon: 'info', title: 'Search', text: `Searching for: ${searchQuery}` });
      }
    }
  };

  // Handle product click in recent activity - navigate to order details
  const handleRecentActivityClick = (activity) => {
    if (onNavigateToOrderDetails) {
      onNavigateToOrderDetails(activity.orderId, activity.productId);
    } else {
      console.log('Navigate to order details:', activity);
      Swal.fire({ icon: 'info', title: 'Order Details', text: `Navigating to order details for ${activity.name}` });
    }
  };

  // Handle view details click in top products - navigate to analytics
  const handleTopProductClick = (product) => {
    if (onNavigateToAnalytics) {
      onNavigateToAnalytics(product.id);
    } else {
      console.log('Navigate to analytics for product:', product);
      Swal.fire({ icon: 'info', title: 'Analytics', text: `Navigating to analytics for ${product.title}` });
    }
  };

  // Update the handleDropdownAction to include profile click
  const handleDropdownAction = (action) => {
    setShowDropdown(false);
    action?.();
  };

  const handleFooterLinkClick = (section, label) => {
    const text = String(label || '').toLowerCase();
    if (section === 'quick') {
      if (text.includes('home')) { onLogoClick && onLogoClick(); return; }
      if (onSearch) {
        if (text.includes('shop')) { onSearch(''); return; }
        if (text.includes('categories')) { onSearch('categories'); return; }
        if (text.includes('new')) { onSearch('new'); return; }
        if (text.includes('vr') || text.includes('ar')) { onSearch('ar'); return; }
      }
    } else if (section === 'care') {
      Swal.fire({ icon: 'info', title: label, text: 'Support information will be shown here' });
      return;
    } else if (section === 'legal') {
      Swal.fire({ icon: 'info', title: label, text: 'Policy details will be shown here' });
      return;
    }
  };

  // Helper functions
  const getStatusBadge = (status) => {
    const statusConfig = {
      'active': { bgColor: `${MAIN_COLOR}15`, color: MAIN_COLOR, text: 'Active' },
      'pending': { bgColor: '#fff3cd', color: '#856404', text: 'Pending' },
      'processing': { bgColor: '#cfe2ff', color: '#084298', text: 'Processing' },
      'shipped': { bgColor: '#d1e7dd', color: '#0f5132', text: 'Shipped' },
      'delivered': { bgColor: '#d1fae5', color: '#065f46', text: 'Delivered' },
      'cancelled': { bgColor: '#f8d7da', color: DANGER_COLOR, text: 'Cancelled' },
      'sold-out': { bgColor: '#f8d7da', color: DANGER_COLOR, text: 'Sold Out' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span 
        className="badge" 
        style={{ 
          backgroundColor: config.bgColor, 
          color: config.color,
          fontSize: '0.75rem',
          padding: '0.25rem 0.5rem'
        }}
      >
        {config.text}
      </span>
    );
  };

  // Removed actions column/button per requirement

  const getTrendColor = (trend) => {
    return trend.startsWith('+') ? MAIN_COLOR : DANGER_COLOR;
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <FaStar
        key={index}
        size={12}
        style={{ 
          color: index < Math.floor(rating) ? MAIN_COLOR : '#e0e0e0'
        }}
      />
    ));
  };

  // Component render functions
  const renderHeader = () => (
    <header className="sticky-top bg-white border-bottom shadow-sm">
      <div className="container py-3">
        <div className="row align-items-center">
          {/* LOGO */}
          <div className="col-md-3">
            <img
              src={styleSathiLogo}
              alt="STYLE SATHI"
              style={{ height: '40px', cursor: 'pointer' }}
              onClick={onLogoClick}
            />
          </div>

          {/* SEARCH */}
          <div className="col-md-6">
            <div className="position-relative">
              <input
                type="text"
                className="form-control ps-5 py-2"
                placeholder="Search products, orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                style={{ 
                  borderColor: MAIN_COLOR, 
                  borderRadius: '25px',
                  fontSize: '0.9rem'
                }}
                aria-label="Search products and orders"
              />
              <BsSearch
                className="position-absolute top-50 start-0 translate-middle-y ms-3"
                style={{ color: MAIN_COLOR }}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* NOTIFICATIONS + PROFILE */}
          <div className="col-md-3">
            <div className="d-flex align-items-center justify-content-end gap-4">
              <NotificationBell mainColor={MAIN_COLOR} secondaryColor={SECONDARY_COLOR} />
              {renderProfileDropdown()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );


  const renderProfileDropdown = () => (
    <div className="position-relative" ref={dropdownRef}>
      <div
        className="d-flex align-items-center gap-2 cursor-pointer hover-scale"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{ transition: 'transform 0.2s' }}
        role="button"
        tabIndex={0}
        aria-label="User profile menu"
        onKeyPress={(e) => e.key === 'Enter' && setShowDropdown(!showDropdown)}
      >
        <div
          className="rounded-circle d-flex align-items-center justify-content-center border"
          style={{
            width: "45px",
            height: "45px",
            backgroundColor: `${MAIN_COLOR}20`,
            borderColor: `${MAIN_COLOR}50`,
          }}
        >
          <FaUser style={{ color: MAIN_COLOR, fontSize: '18px' }} />
        </div>

        <div className="d-none d-md-block text-start">
          <div style={{ color: MAIN_COLOR, fontWeight: '500', fontSize: '0.9rem' }}>
            {currentUser?.name || 'Seller User'}
          </div>
          <button
            onClick={onVerifiedSellerClick}
            className="badge border-0 p-1 small mt-1 d-flex align-items-center gap-1"
            style={{ 
              backgroundColor: `${MAIN_COLOR}15`,
              color: MAIN_COLOR,
              fontSize: '0.7rem'
            }}
            aria-label="Verified seller badge"
          >
            <FaCheckCircle size={10} />
            Verified Seller
          </button>
        </div>
      </div>

      {/* Update the profile dropdown section */}
      {showDropdown && (
        <div 
          className="position-absolute bg-white shadow rounded end-0 mt-2 py-2"
          style={{ 
            minWidth: '160px',
            zIndex: 1000,
            border: `1px solid ${MAIN_COLOR}20`
          }}
          role="menu"
          aria-label="User menu"
        >
          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
            style={{ color: MAIN_COLOR, fontSize: '0.9rem' }}
            onClick={() => handleDropdownAction(onProfileClick)}
            role="menuitem"
          >
            <FaUser size={14} /> Profile
          </button>

          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
            style={{ color: DANGER_COLOR, fontSize: '0.9rem' }}
            onClick={() => handleDropdownAction(onLogout)}
            role="menuitem"
          >
            <FaSignOutAlt size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );

  const renderWelcomeSection = () => (
    <section className="welcome-section mb-5">
      <div className="row">
        <div className="col-12">
          <h1 className="display-6 fw-bold text-dark mb-2">
            Welcome, {currentUser?.name || 'Fashion Pro'}!
          </h1>
          <p className="text-muted">
            Registration: #{currentUser?.id || 'ST78254'} • 
            Store: {currentUser?.storeName || currentUser?.businessName || 'Style Sathi Store'}
          </p>
        </div>
      </div>
    </section>
  );

  const renderKeyActions = () => (
    <section className="key-actions mb-5">
      <div className="row g-4">
        {keyActions.map((action, index) => (
          <div key={index} className="col-12 col-sm-6 col-lg-3">
            <div
              className="card border-0 shadow-sm h-100 cursor-pointer"
              onClick={action.onClick}
              style={{
                transition: 'all 0.3s ease',
                borderRadius: '15px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 10px 30px ${MAIN_COLOR}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && action.onClick?.()}
              aria-label={action.title}
            >
              <div className="card-body p-4 text-center">
                <div
                  className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "70px",
                    height: "70px",
                    backgroundColor: `${MAIN_COLOR}15`,
                  }}
                >
                  <action.icon size={24} style={{ color: MAIN_COLOR }} />
                </div>
                <h5 className="fw-semibold mb-2" style={{ color: MAIN_COLOR }}>
                  {action.title}
                </h5>
                <p className="text-muted small mb-0">
                  {action.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderPerformanceMetrics = () => (
    <section className="performance-metrics mb-5">
      <div className="row g-4">
        {performanceMetrics.map((metric, index) => (
          <div key={index} className="col-12 col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-muted mb-0">{metric.title}</h6>
                  <metric.icon style={{ color: metric.color }} aria-hidden="true" />
                </div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="h4 fw-bold text-dark">{metric.value}</span>
                  <span 
                    className="small fw-semibold" 
                    style={{ color: getTrendColor(metric.trend) }}
                  >
                    {metric.trend}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderRecentActivity = () => (
    <section className="recent-activity mb-5">
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 py-4">
          <h5 className="fw-bold mb-0" style={{ color: MAIN_COLOR }}>Recent Orders</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="border-0 ps-4">Product Name</th>
                  <th className="border-0">Status</th>
                  <th className="border-0">Sales</th>
                  <th className="border-0">Revenue</th>
                  <th className="border-0">Date</th>
                  
                </tr>
              </thead>
              <tbody>
                {sellerData.recentActivities.slice(0, 6).map((activity) => (
                  <tr 
                    key={activity.id} 
                    className="cursor-pointer"
                    onClick={() => handleRecentActivityClick(activity)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRecentActivityClick(activity)}
                    tabIndex={0}
                    style={{ transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${MAIN_COLOR}08`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '';
                    }}
                  >
                    <td className="ps-4 fw-semibold">{activity.name}</td>
                    <td>{getStatusBadge(activity.status)}</td>
                    <td className="text-muted">{activity.sales} sold</td>
                    <td className="fw-semibold" style={{ color: SECONDARY_COLOR }}>
                      ${activity.revenue.toLocaleString()}
                    </td>
                    <td className="text-muted">{activity.date}</td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );

  const renderTopProducts = () => (
    <section className="top-products mb-5">
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 py-4">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: MAIN_COLOR }}>
            <FaStar /> Top Performing Products
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-4">
            {sellerData.topProducts.map((product, index) => (
              <div key={product.id} className="col-12 col-md-6 col-lg-3">
                <div 
                  className="card border-0 h-100 cursor-pointer" 
                  style={{ backgroundColor: `${MAIN_COLOR}05` }}
                  onClick={() => handleTopProductClick(product)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTopProductClick(product)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View analytics for ${product.title}`}
                >
                  <div className="card-body text-center">
                    <div
                      className="mx-auto mb-3 rounded overflow-hidden position-relative"
                      style={{ width: '90px', height: '90px', backgroundColor: '#f8f9fa' }}
                    >
                      <CloudinaryImage
                        product={product}
                        alt={product.title}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                      <span
                        className="position-absolute badge bg-primary"
                        style={{ top: 0, right: 0, transform: 'translate(35%, -35%)' }}
                      >
                        #{index + 1}
                      </span>
                    </div>
                    <h6 className="fw-semibold mb-2">{product.title}</h6>
                    <div className="d-flex justify-content-center align-items-center gap-1 mb-2">
                      {renderStars(product.rating)}
                      <small className="text-muted">({product.rating})</small>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="text-muted">{product.sales} sales</small>
                      <strong style={{ color: SECONDARY_COLOR }}>
                        ${product.revenue.toLocaleString()}
                      </strong>
                    </div>
                    <button 
                      className="btn btn-sm w-100"
                      style={{ 
                        backgroundColor: MAIN_COLOR, 
                        color: 'white',
                        fontSize: '0.8rem'
                      }}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click event
                        handleTopProductClick(product);
                      }}
                    >
                      View Analytics
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const renderAdditionalMetrics = () => (
    <section className="additional-metrics">
      <div className="row g-4">
        {additionalMetrics.map((metric, index) => (
          <div key={index} className="col-12 col-sm-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: "50px",
                      height: "50px",
                      backgroundColor: `${MAIN_COLOR}15`,
                    }}
                  >
                    <metric.icon style={{ color: MAIN_COLOR }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-muted small mb-1">{metric.title}</p>
                    <div className="d-flex align-items-baseline gap-2">
                      <span className="h5 fw-bold text-dark mb-0">{metric.value}</span>
                      <span 
                        className="small fw-semibold" 
                        style={{ color: metric.trendColor }}
                      >
                        {metric.trend}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderFooter = () => (
    <footer className="bg-dark text-white py-5 mt-5">
      <div className="container">
        <div className="row">
          <div className="col-lg-3 col-md-6 mb-4">
            <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '36px' }} />
            <p className="text-light opacity-75">
              Your trusted partner in fashion and lifestyle. We bring you the latest trends with quality and style.
            </p>
            <div className="d-flex gap-3 mt-3">
              {socialIcons.map((Icon, i) => (
                <div
                  key={i}
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: `${MAIN_COLOR}20`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = MAIN_COLOR;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${MAIN_COLOR}20`;
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Follow us on ${Icon.name.replace('Fa', '')}`}
                  onKeyPress={(e) => e.key === 'Enter' && console.log(`Navigate to ${Icon.name}`)}
                >
                  <Icon style={{ color: MAIN_COLOR }} />
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <h6 style={{ color: MAIN_COLOR }} className="fw-bold mb-3">QUICK LINKS</h6>
            <div className="d-flex flex-column gap-2">
              {footerLinks.quickLinks.map((link, index) => (
                <button
                  key={index}
                  className="btn text-start text-light opacity-75 hover-underline"
                  onClick={() => handleFooterLinkClick('quick', link)}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <h6 style={{ color: MAIN_COLOR }} className="fw-bold mb-3">CUSTOMER CARE</h6>
            <div className="d-flex flex-column gap-2">
              {footerLinks.customerCare.map((link, index) => (
                <button
                  key={index}
                  className="btn text-start text-light opacity-75 hover-underline"
                  onClick={() => handleFooterLinkClick('care', link)}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          <div className="col-lg-3 col-md-6 mb-4">
            <h6 style={{ color: MAIN_COLOR }} className="fw-bold mb-3">LEGAL</h6>
            <div className="d-flex flex-column gap-2">
              {footerLinks.legal.map((link, index) => (
                <button
                  key={index}
                  className="btn text-start text-light opacity-75 hover-underline"
                  onClick={() => handleFooterLinkClick('legal', link)}
                >
                  {link}
                </button>
              ))}
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
  );

  return (
    <div className="seller-dashboard min-vh-100 bg-light">
      {renderHeader()}
      
      <main className="container py-4">
        {renderWelcomeSection()}
        {renderKeyActions()}
        {renderPerformanceMetrics()}
        {renderRecentActivity()}
        {renderTopProducts()}
        {renderAdditionalMetrics()}
      </main>

      {renderFooter()}

      {/* Add custom styles */}
      <style>{`
        .hover-scale:hover {
          transform: scale(1.05);
        }
        
        .hover-underline:hover {
          text-decoration: underline !important;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .seller-dashboard {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default SellerDashboard;
