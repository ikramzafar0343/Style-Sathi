import { useState, useEffect } from 'react';
import { 
  FaBox, 
  FaCheckCircle, 
  FaClock, 
  FaTimesCircle, 
  FaTruck,
  FaEye,
  FaDollarSign,
  FaShoppingCart,
  FaExclamationTriangle,
  FaShippingFast,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown
} from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import { ordersApi } from '../services/api';

const SellerOrders = ({ 
  onBack, 
  onViewOrderDetails,
  token
}) => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";

  const handleViewOrderDetails = (order) => {
    onViewOrderDetails?.(order);
  };

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const list = await ordersApi.getSellerOrders(token);
        const normalized = (list || []).map((o) => {
          const items = Array.isArray(o.items) ? o.items.map((it) => ({
            name: (it.product && it.product.title) || 'Item',
            quantity: it.quantity,
            price: Number(it.price || (it.product && it.product.price) || 0)
          })) : [];
          const addrParts = [o.street_address, o.city, o.zip_code, o.country].filter(Boolean);
          const s = o.status || 'confirmed';
          const mappedStatus = s === 'confirmed' ? 'pending' : (s === 'in_transit' ? 'shipped' : s);
          return {
            id: String(o.id),
            customer: o.full_name || (o.email ? String(o.email).split('@')[0] : ''),
            date: o.created_at || '',
            status: mappedStatus,
            items,
            total: Number(o.total || 0),
            email: o.email || '',
            phone: o.phone_number || '',
            address: addrParts.join(', '),
            trackingNumber: '',
            estimatedDelivery: o.estimated_delivery || '',
            paymentMethod: o.payment_method || '',
            shippingMethod: ''
          };
        });
        setOrders(normalized);
      } catch (e) {
        setError(e?.message || 'Failed to load orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const getStatusConfig = (status) => {
    const config = {
      delivered: {
        color: 'success',
        bgColor: '#d1fae5',
        textColor: '#065f46',
        icon: <FaCheckCircle className="me-1" />
      },
      shipped: {
        color: 'info',
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        icon: <FaTruck className="me-1" />
      },
      processing: {
        color: 'warning',
        bgColor: '#fef3c7',
        textColor: '#92400e',
        icon: <FaClock className="me-1" />
      },
      pending: {
        color: 'secondary',
        bgColor: '#f3f4f6',
        textColor: '#374151',
        icon: <FaClock className="me-1" />
      },
      cancelled: {
        color: 'danger',
        bgColor: '#fee2e2',
        textColor: '#991b1b',
        icon: <FaTimesCircle className="me-1" />
      }
    };
    return config[status] || config.pending;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <FaCheckCircle className="text-success" />;
      case 'shipped':
        return <FaTruck className="text-info" />;
      case 'processing':
        return <FaClock className="text-warning" />;
      case 'pending':
        return <FaClock className="text-secondary" />;
      case 'cancelled':
        return <FaTimesCircle className="text-danger" />;
      default:
        return <FaClock className="text-secondary" />;
    }
  };

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.items.some(item => 
                            item.name.toLowerCase().includes(searchTerm.toLowerCase())
                          );
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      }
      if (sortBy === 'total') {
        return sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
      }
      if (sortBy === 'customer') {
        return sortOrder === 'desc' 
          ? b.customer.localeCompare(a.customer)
          : a.customer.localeCompare(b.customer);
      }
      if (sortBy === 'id') {
        return sortOrder === 'desc' 
          ? b.id.localeCompare(a.id)
          : a.id.localeCompare(b.id);
      }
      return 0;
    });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const pendingOrdersCount = statusCounts.pending + statusCounts.processing;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return <FaSort className="text-muted" />;
    return sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleProcessOrder = (orderId) => {
    updateOrderStatus(orderId, 'processing');
  };

  const handleShipOrder = (orderId) => {
    updateOrderStatus(orderId, 'shipped');
  };

  const handleDeliverOrder = (orderId) => {
    updateOrderStatus(orderId, 'delivered');
  };

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      if (detail.orderId && detail.status) {
        updateOrderStatus(detail.orderId, detail.status);
      }
    };
    window.addEventListener('sellerOrderStatusUpdated', handler);
    return () => window.removeEventListener('sellerOrderStatusUpdated', handler);
  }, []);

  useEffect(() => {
    const refreshOnOrderEvent = async (e) => {
      const d = e.detail || {};
      const t = String(d.type || '');
      if (!token) return;
      if (t.includes('order-placed') || t.includes('order-confirmed')) {
        try {
          const list = await ordersApi.getSellerOrders(token);
          const normalized = (list || []).map((o) => {
            const items = Array.isArray(o.items) ? o.items.map((it) => ({
              name: (it.product && it.product.title) || 'Item',
              quantity: it.quantity,
              price: Number(it.price || (it.product && it.product.price) || 0)
            })) : [];
            const addrParts = [o.street_address, o.city, o.zip_code, o.country].filter(Boolean);
            const s = o.status || 'confirmed';
            const mappedStatus = s === 'confirmed' ? 'pending' : (s === 'in_transit' ? 'shipped' : s);
            return {
              id: String(o.id),
              customer: o.full_name || (o.email ? String(o.email).split('@')[0] : ''),
              date: o.created_at || new Date().toISOString(),
              status: mappedStatus,
              items,
              total: Number(o.total || 0),
              email: o.email || '',
              phone: o.phone_number || '',
              address: addrParts.join(', '),
              trackingNumber: '',
              estimatedDelivery: o.estimated_delivery || '',
              paymentMethod: o.payment_method || '',
              shippingMethod: ''
            };
          });
          setOrders(normalized);
        } catch (e) { void e; }
      }
    };
    window.addEventListener('notification:push', refreshOnOrderEvent);
    return () => window.removeEventListener('notification:push', refreshOnOrderEvent);
  }, [token]);

  // Fix for status filter buttons - properly handle the 'all' status
  const getStatusButtonClass = (status) => {
    const isActive = selectedStatus === status;
    if (status === 'all') {
      return `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-primary'} position-relative`;
    }
    
    const config = getStatusConfig(status);
    return `btn btn-sm ${isActive ? '' : 'btn-outline-'}${config.color} position-relative`;
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center gap-3">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                    style={{ borderColor: mainColor, color: mainColor }}
                  >
                    <FaBox className="me-1" />
                    Back to Dashboard
                  </button>
                )}
                <div>
                  <h1 className="h3 mb-1 fw-bold" style={{ color: mainColor }}>Orders Management</h1>
                  <p className="text-muted mb-0">Manage and track all customer orders</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-end align-items-center gap-3">
                <NotificationBell mainColor={mainColor} secondaryColor={secondaryColor} />
                <div className="input-group" style={{ maxWidth: '300px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset to first page when searching
                    }}
                  />
                  <button className="btn btn-outline-secondary" type="button" style={{ borderColor: mainColor, color: mainColor }}>
                    <FaSearch />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-4">
        {/* Statistics Cards */}
        <div className="row g-4 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        backgroundColor: `${mainColor}20` 
                      }}
                    >
                      <FaShoppingCart style={{ color: mainColor, fontSize: '20px' }} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="card-title text-muted mb-1">Total Orders</h6>
                    <h4 className="fw-bold mb-0">{statusCounts.all}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        backgroundColor: `${secondaryColor}20` 
                      }}
                    >
                      <FaDollarSign style={{ color: secondaryColor, fontSize: '20px' }} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="card-title text-muted mb-1">Total Revenue</h6>
                    <h4 className="fw-bold mb-0">${totalRevenue.toFixed(2)}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        backgroundColor: '#10b98120' 
                      }}
                    >
                      <FaShippingFast style={{ color: '#10b981', fontSize: '20px' }} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="card-title text-muted mb-1">Avg. Order Value</h6>
                    <h4 className="fw-bold mb-0">${averageOrderValue.toFixed(2)}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        backgroundColor: '#ef444420' 
                      }}
                    >
                      <FaExclamationTriangle style={{ color: '#ef4444', fontSize: '20px' }} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="card-title text-muted mb-1">Pending Actions</h6>
                    <h4 className="fw-bold mb-0">{pendingOrdersCount}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-6">
                <h5 className="card-title mb-0">Filter by Status</h5>
              </div>
              <div className="col-md-6">
                <div className="d-flex flex-wrap gap-2 justify-content-end">
                  {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedStatus(status);
                        setCurrentPage(1);
                      }}
                      className={getStatusButtonClass(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                      {status !== 'all' && (
                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark">
                          {statusCounts[status]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            {loading && (
              <div className="text-center py-4 text-muted">Loading orders…</div>
            )}
            {error && !loading && (
              <div className="alert alert-warning">{error}</div>
            )}
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th 
                      className="cursor-pointer"
                      onClick={() => handleSort('id')}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Order ID
                        {getSortIcon('id')}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer"
                      onClick={() => handleSort('customer')}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Customer
                        {getSortIcon('customer')}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Date
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th>Items</th>
                    <th 
                      className="cursor-pointer"
                      onClick={() => handleSort('total')}
                    >
                      <div className="d-flex align-items-center gap-1">
                        Total
                        {getSortIcon('total')}
                      </div>
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.length > 0 ? (
                    currentOrders.map((order) => {
                      const statusConfig = getStatusConfig(order.status);
                      return (
                        <tr key={order.id} className="align-middle">
                          <td>
                            <div className="fw-semibold text-primary">{order.id}</div>
                          </td>
                          <td>
                            <div className="fw-medium">{order.customer}</div>
                            <small className="text-muted">{order.email}</small>
                          </td>
                          <td>
                            <div>{formatDate(order.date)}</div>
                          </td>
                          <td>
                            <div>
                              {order.items.map((item, idx) => (
                                <div key={idx} className="small">
                                  {item.name} <span className="text-muted">(x{item.quantity})</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className="fw-bold">${order.total.toFixed(2)}</div>
                          </td>
                          <td>
                            <span 
                              className={`badge d-flex align-items-center justify-content-center`}
                              style={{ 
                                backgroundColor: statusConfig.bgColor,
                                color: statusConfig.textColor,
                                minWidth: '100px'
                              }}
                            >
                              {statusConfig.icon}
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                onClick={() => handleViewOrderDetails(order)}
                                className="btn btn-sm d-flex align-items-center gap-1"
                                style={{ borderColor: mainColor, color: mainColor }}
                              >
                                <FaEye size={12} />
                                View
                              </button>
                              {order.status === 'pending' && (
                                <button 
                                  onClick={() => handleProcessOrder(order.id)}
                                  className="btn btn-sm"
                                  style={{ borderColor: mainColor, color: mainColor }}
                                >
                                  Process
                                </button>
                              )}
                              {order.status === 'processing' && (
                                <button 
                                  onClick={() => handleShipOrder(order.id)}
                                  className="btn btn-sm"
                                  style={{ borderColor: mainColor, color: mainColor }}
                                >
                                  Ship
                                </button>
                              )}
                              {order.status === 'shipped' && (
                                <button 
                                  onClick={() => handleDeliverOrder(order.id)}
                                  className="btn btn-sm"
                                  style={{ borderColor: mainColor, color: mainColor }}
                                >
                                  Deliver
                                </button>
                              )}
                              {order.status === 'shipped' && (
                                <button 
                                  onClick={() => handleDeliverOrder(order.id)}
                                  className="btn btn-sm btn-outline-success"
                                >
                                  Deliver
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-4">
                        <div className="text-muted">
                          <FaBox size={48} className="mb-3 opacity-50" />
                          <p>No orders found matching your criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-4">
                <div className="text-muted small">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of {filteredOrders.length} orders
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(totalPages)].map((_, index) => (
                      <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>

        {/* Status Summary */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="card-title mb-3">Order Status Summary</h6>
                <div className="row g-3">
                  {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
                    const config = getStatusConfig(status);
                    const count = statusCounts[status];
                    const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
                    
                    return (
                      <div key={status} className="col-md-2 col-6">
                        <div className="d-flex align-items-center gap-2">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center"
                            style={{ 
                              width: '30px', 
                              height: '30px', 
                              backgroundColor: config.bgColor,
                              color: config.textColor
                            }}
                          >
                            {getStatusIcon(status)}
                          </div>
                          <div>
                            <div className="fw-semibold">{count}</div>
                            <small className="text-muted text-uppercase">
                              {status}
                            </small>
                          </div>
                        </div>
                        <div className="progress mt-1" style={{ height: '4px' }}>
                          <div 
                            className="progress-bar" 
                            style={{ 
                              backgroundColor: config.textColor,
                              width: `${percentage}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default SellerOrders;
