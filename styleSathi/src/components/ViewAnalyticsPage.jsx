// ViewAnalyticsPage.jsx - Enhanced Component
import { useState, useRef, useEffect } from 'react';
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import {
  FaUser,
  FaArrowLeft,
  FaChartLine,
  FaDollarSign,
  FaShoppingCart,
  FaUsers,
  FaBox,
  FaSignOutAlt,
  FaBell,
  FaShoppingBag,
} from "react-icons/fa";
import { catalogApi, ordersApi } from '../services/api';
import { FaArrowTrendDown ,FaArrowTrendUp} from "react-icons/fa6";
const ViewAnalyticsPage = ({ 
  onBack, 
  onLogoClick, 
  onProfileClick, 
  onLogout,
  currentUser,
  token 
}) => {
  const [timeRange, setTimeRange] = useState('30days');
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const profileDropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        const products = await catalogApi.getMyProducts(token);
        const orders = await ordersApi.getSellerOrders(token);
        const productsTotal = products.length;
        const deliveredOrders = (orders || []).filter((o) => (o.status === 'delivered'));
        const ordersTotal = (orders || []).length;
        const customersSet = new Set((orders || []).map((o) => o.email || o.full_name || ''));
        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const productAgg = {};
        for (const o of orders || []) {
          const items = Array.isArray(o.items) ? o.items : [];
          for (const it of items) {
            const pid = (it.product && it.product.id) || null;
            const title = (it.product && it.product.title) || '';
            const categoryName = (() => {
              const c = it.product && it.product.category;
              return typeof c === 'string' ? c : (c && c.name) || '';
            })();
            const imageUrl = (it.product && (it.product.image_url || (Array.isArray(it.product.images) ? it.product.images[0] : ''))) || '';
            const qty = Number(it.quantity || 0);
            const price = Number(it.price || (it.product && it.product.price) || 0);
            if (!pid) continue;
            if (!productAgg[pid]) productAgg[pid] = { id: pid, title, category: categoryName, imageUrl, sales: 0, revenue: 0 };
            productAgg[pid].sales += qty;
            productAgg[pid].revenue += price * qty;
          }
        }
        const topProducts = Object.values(productAgg).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        const now = Date.now();
        const daysAgo = (n) => now - n * 24 * 60 * 60 * 1000;
        const within = (d, startMs, endMs) => {
          const t = new Date(String(d || '')).getTime();
          return Number.isFinite(t) && t >= startMs && t < endMs;
        };
        const recentStart = daysAgo(30);
        const recentEnd = now;
        const prevStart = daysAgo(60);
        const prevEnd = daysAgo(30);
        const deliveredRecent = deliveredOrders.filter((o) => within(o.created_at, recentStart, recentEnd));
        const deliveredPrev = deliveredOrders.filter((o) => within(o.created_at, prevStart, prevEnd));
        const revenueRecent = deliveredRecent.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const revenuePrev = deliveredPrev.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const ordersRecent = (orders || []).filter((o) => within(o.created_at, recentStart, recentEnd)).length;
        const ordersPrev = (orders || []).filter((o) => within(o.created_at, prevStart, prevEnd)).length;
        const customersPrevSet = new Set(deliveredPrev.map((o) => o.email || o.full_name || ''));
        const topProductsNormalized = topProducts.map((p) => {
          return {
            id: p.id,
            name: p.title,
            category: p.category || '',
            sales: p.sales,
            revenue: p.revenue,
          };
        });
        const calculatedData = {
          revenue: {
            total: totalRevenue,
            growth: revenuePrev > 0 ? Math.round(((revenueRecent - revenuePrev) / revenuePrev) * 100) : 0,
            previous: revenuePrev
          },
          orders: {
            total: ordersTotal,
            growth: ordersPrev > 0 ? Math.round(((ordersRecent - ordersPrev) / ordersPrev) * 100) : 0,
            previous: ordersPrev
          },
          customers: {
            total: customersSet.size,
            growth: customersPrevSet.size > 0 ? Math.round(((customersSet.size - customersPrevSet.size) / customersPrevSet.size) * 100) : 0,
            previous: customersPrevSet.size
          },
          products: {
            total: productsTotal,
            growth: 0,
            previous: 0
          },
          topProducts: topProductsNormalized,
          recentActivity: (orders || []).slice(0, 5).map((o) => ({
            type: 'order',
            message: `Order ${o.id} ${o.status}`,
            time: (o.created_at || '').toString(),
          })),
          performanceMetrics: {
            conversionRate: 0,
            averageOrderValue: ordersTotal ? Math.round((totalRevenue / Math.max(ordersTotal, 1)) * 100) / 100 : 0,
            customerSatisfaction: 0
          }
        };
        setAnalyticsData(calculatedData);
      } catch {
        setAnalyticsData(null);
      }
      setLoading(false);
    };
    fetchAnalyticsData();
    const handler = () => fetchAnalyticsData();
    window.addEventListener('catalogInvalidated', handler);
    const orderHandler = (e) => {
      const t = String((e.detail || {}).type || '');
      if (t.includes('order-')) fetchAnalyticsData();
    };
    window.addEventListener('notification:push', orderHandler);
    return () => window.removeEventListener('catalogInvalidated', handler);
  }, [timeRange, token]);

  // Click outside handlers
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const statsCards = [
    {
      title: 'Total Revenue',
      value: analyticsData ? formatCurrency(analyticsData.revenue.total) : '$0',
      growth: analyticsData?.revenue.growth || 0,
      previous: analyticsData?.revenue.previous || 0,
      icon: FaDollarSign,
      color: mainColor,
      format: 'currency'
    },
    {
      title: 'Total Orders',
      value: analyticsData ? formatNumber(analyticsData.orders.total) : '0',
      growth: analyticsData?.orders.growth || 0,
      previous: analyticsData?.orders.previous || 0,
      icon: FaShoppingCart,
      color: secondaryColor,
      format: 'number'
    },
    {
      title: 'Total Customers',
      value: analyticsData ? formatNumber(analyticsData.customers.total) : '0',
      growth: analyticsData?.customers.growth || 0,
      previous: analyticsData?.customers.previous || 0,
      icon: FaUsers,
      color: '#10b981',
      format: 'number'
    },
    {
      title: 'Products Listed',
      value: analyticsData ? formatNumber(analyticsData.products.total) : '0',
      growth: analyticsData?.products.growth || 0,
      previous: analyticsData?.products.previous || 0,
      icon: FaBox,
      color: '#8b5cf6',
      format: 'number'
    }
  ];

  const renderStatCard = (stat, index) => (
    <div key={index} className="col-xl-3 col-lg-6 col-md-6">
      <div className="card border-0 shadow-sm h-100 hover-lift">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
              style={{
                width: '50px',
                height: '50px',
                backgroundColor: `${stat.color}15`,
                color: stat.color
              }}
            >
              <stat.icon size={20} />
            </div>
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-1">{stat.value}</h4>
              <p className="text-muted mb-1 small">{stat.title}</p>
              <div className="d-flex align-items-center gap-2">
                <span className={`badge ${stat.growth > 0 ? 'bg-success' : 'bg-danger'}`}>
                  {stat.growth > 0 ? <FaArrowTrendUp size={12} /> : <FaArrowTrendDown size={12} />}
                  {stat.growth > 0 ? '+' : ''}{stat.growth}%
                </span>
                <span className="text-muted small">
                  vs. {stat.format === 'currency' ? formatCurrency(stat.previous) : formatNumber(stat.previous)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => {
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
              backgroundColor: `${mainColor}15`,
              borderColor: `${mainColor}30`,
            }}
          >
            <FaBell style={{ color: mainColor, fontSize: '18px' }} />
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
              3
            </span>
          </div>
        </div>

        {showNotificationPanel && (
          <div 
            className="position-absolute bg-white shadow-lg rounded mt-2 py-2"
            style={{ 
              width: '320px',
              right: 0,
              zIndex: 1000,
              border: `1px solid ${mainColor}20`,
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            <div className="px-3 py-2 border-bottom">
              <h6 className="mb-0 fw-bold">Notifications</h6>
            </div>
            {analyticsData?.recentActivity.map((activity, index) => (
              <div key={index} className="px-3 py-2 border-bottom hover-bg-light">
                <div className="d-flex align-items-start">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: `${mainColor}15`,
                      color: mainColor
                    }}
                  >
                    <FaBell size={12} />
                  </div>
                  <div className="flex-grow-1">
                    <p className="mb-1 small">{activity.message}</p>
                    <small className="text-muted">{activity.time}</small>
                  </div>
                </div>
              </div>
            ))}
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
            backgroundColor: `${mainColor}15`,
            borderColor: `${mainColor}30`,
          }}
        >
          <FaUser style={{ color: mainColor, fontSize: '18px' }} />
        </div>
        <div className="d-none d-md-block">
          <small className="fw-bold text-dark">{currentUser?.name || 'Seller'}</small>
          <br />
          <small className="text-muted">{currentUser?.email || 'seller@stylesathi.com'}</small>
        </div>
      </div>

      {showProfileDropdown && (
        <div 
          className="position-absolute bg-white shadow-lg rounded end-0 mt-2 py-2"
          style={{ 
            minWidth: '200px',
            zIndex: 1000,
            border: `1px solid ${mainColor}20`
          }}
        >
          <div className="px-3 py-2 border-bottom">
            <div className="fw-bold text-dark">{currentUser?.name || 'Seller'}</div>
            <small className="text-muted">{currentUser?.email || 'seller@stylesathi.com'}</small>
          </div>
          
          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2 hover-bg-light"
            style={{ color: mainColor, fontSize: '0.9rem' }}
            onClick={() => {
              setShowProfileDropdown(false);
              onProfileClick?.();
            }}
          >
            <FaUser size={14} /> Profile Settings
          </button>

          <button
            className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2 hover-bg-light"
            style={{ color: '#dc3545', fontSize: '0.9rem' }}
            onClick={() => {
              setShowProfileDropdown(false);
              onLogout?.();
            }}
          >
            <FaSignOutAlt size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );

  const renderPerformanceMetrics = () => {
    if (!analyticsData) return null;

    const metrics = [
      {
        label: 'Conversion Rate',
        value: `${analyticsData.performanceMetrics.conversionRate}%`,
        description: 'Visitor to customer conversion'
      },
      {
        label: 'Avg Order Value',
        value: formatCurrency(analyticsData.performanceMetrics.averageOrderValue),
        description: 'Average revenue per order'
      },
      {
        label: 'Customer Satisfaction',
        value: `${analyticsData.performanceMetrics.customerSatisfaction}/5`,
        description: 'Based on customer reviews'
      }
    ];

    return (
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-4">Performance Metrics</h5>
              <div className="row text-center">
                {metrics.map((metric, index) => (
                  <div key={index} className="col-md-4">
                    <div className="border-end-md border-end-lg-0 pe-md-3 pe-lg-0">
                      <h3 className="fw-bold text-primary">{metric.value}</h3>
                      <h6 className="text-dark mb-1">{metric.label}</h6>
                      <small className="text-muted">{metric.description}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTopProducts = () => {
    if (!analyticsData) return null;

    return (
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-4">Top Performing Products</h5>
              <div className="list-group list-group-flush">
                {analyticsData.topProducts.map((product, index) => (
                  <div key={product.id} className="list-group-item px-0 py-3 border-bottom">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-light text-dark me-3">{index + 1}</span>
                        <div>
                          <h6 className="mb-1">{product.name}</h6>
                          <small className="text-muted">{product.category}</small>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success">{product.sales} sales</div>
                        <small className="text-muted">{formatCurrency(product.revenue)}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-4">Analytics Overview</h5>
              <p className="text-muted">
                Detailed charts and analytics visualization would be implemented here
                with libraries like Chart.js or Recharts in a real application.
              </p>
              <div className="text-center py-4">
                <FaChartLine size={48} className="text-muted mb-3 opacity-50" />
                <p className="text-muted small">Interactive charts placeholder</p>
                <small className="text-muted">
                  Revenue trends, customer acquisition, and product performance charts
                  would be displayed here based on the selected time range.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border" style={{ color: mainColor }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '40px', cursor: 'pointer' }} onClick={onLogoClick} />
            </div>

            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-center">
                <button
                  onClick={onBack}
                  className="btn btn-outline-secondary d-flex align-items-center gap-2 hover-lift"
                  style={{ borderColor: mainColor, color: mainColor }}
                >
                  <FaArrowLeft /> Back to Dashboard
                </button>
              </div>
            </div>

            <div className="col-md-3 d-flex justify-content-end align-items-center gap-3">
              {renderNotifications()}
              {renderProfileDropdown()}
            </div>
          </div>
        </div>
      </header>

      <div className="container py-5">
        {/* Page Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: "60px",
                  height: "60px",
                  backgroundColor: `${mainColor}15`,
                }}
              >
                <FaChartLine size={24} style={{ color: mainColor }} />
              </div>
              <div>
                <h1 className="display-6 fw-bold text-dark mb-0">Store Analytics</h1>
                <p className="text-muted mb-0">
                  Track your store performance and insights for {timeRange.replace('days', ' days').replace('1year', 'the last year')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <h5 className="mb-0">Performance Overview</h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">Time Range:</span>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="form-select"
                      style={{ width: 'auto' }}
                    >
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="90days">Last 90 Days</option>
                      <option value="1year">Last Year</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-4 mb-5">
          {statsCards.map(renderStatCard)}
        </div>

        {/* Performance Metrics */}
        {renderPerformanceMetrics()}

        {/* Top Products & Analytics Overview */}
        {renderTopProducts()}
      </div>

      <style>{`
        .hover-scale {
          transition: transform 0.2s ease-in-out;
        }
        .hover-scale:hover {
          transform: scale(1.05);
        }
        .hover-lift {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
        .border-end-md {
          border-right: 1px solid #dee2e6;
        }
        @media (max-width: 767.98px) {
          .border-end-md {
            border-right: none;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 1rem;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ViewAnalyticsPage;
