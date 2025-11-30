import { useState, useEffect } from 'react';
import {
  FaArrowLeft, FaBox, FaCheckCircle, FaClock, FaTimesCircle, FaTruck,
  FaMapMarkerAlt, FaPhone, FaEnvelope, FaCalendarAlt, FaExclamationTriangle,
  FaShoppingCart, FaDollarSign, FaShippingFast, FaUser, FaCreditCard,
  FaStickyNote, FaPlus
} from 'react-icons/fa';

import { ordersApi } from '../services/api';

const SellerOrderDetails = ({ 
  order, 
  onBack, 
  onUpdateStatus,
  currentUser,
  token 
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(null);
  const [notes, setNotes] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [fetchedOrder, setFetchedOrder] = useState(null);

  const mainColor = "#c4a62c";

  // Enhanced sample order data with proper structure
  const sampleOrder = {
    id: 'ORD-2024-001',
    customer: 'John Smith',
    date: '2024-01-15',
    status: 'processing',
    items: [
      { 
        name: 'Premium Diamond Ring', 
        quantity: 1, 
        price: 1299.99,
        image: '/api/placeholder/80/80',
        sku: 'SKU-DIAMOND-001',
        variant: 'Size: 7, Gold'
      }
    ],
    total: 1299.99,
    subtotal: 1299.99,
    shipping: 0.00,
    tax: 129.99,
    discount: 0.00,
    email: 'john.smith@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street, New York, NY 10001',
    shippingAddress: '123 Main Street, New York, NY 10001',
    billingAddress: '456 Business Ave, New York, NY 10002',
    trackingNumber: 'TRK123456789',
    estimatedDelivery: '2024-01-18',
    paymentMethod: 'Credit Card',
    shippingMethod: 'Express Shipping',
    orderNotes: [
      {
        id: 1,
        message: 'Customer requested gift wrapping',
        timestamp: '2024-01-15 14:30:00',
        author: 'System'
      },
      {
        id: 2,
        message: 'Confirmed stock availability',
        timestamp: '2024-01-15 15:45:00',
        author: 'Jane Doe'
      }
    ]
  };

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      const rawId = (order && order.id) || '';
      const idNum = String(rawId).replace(/\D/g, '') || rawId;
      if (!idNum) {
        setFetchedOrder(null);
        return;
      }
      try {
        const o = await ordersApi.getSellerOrder(token, idNum);
        const s = o.status || 'confirmed';
        const mapped = s === 'confirmed' ? 'pending' : (s === 'in_transit' ? 'shipped' : s);
        const items = Array.isArray(o.items) ? o.items.map((it) => ({
          name: (it.product && it.product.title) || 'Item',
          quantity: Number(it.quantity || 0),
          price: Number(it.price || (it.product && it.product.price) || 0),
          image: (it.product && it.product.image_url) || ''
        })) : [];
        const addrParts = [o.street_address, o.city, o.zip_code, o.country].filter(Boolean);
        setFetchedOrder({
          id: `ORD-${String(o.id).padStart(4, '0')}`,
          customer: o.full_name || (o.email ? String(o.email).split('@')[0] : ''),
          date: o.created_at || '',
          status: mapped,
          items,
          total: Number(o.total || 0),
          subtotal: Number(o.total || 0),
          shipping: 0,
          tax: 0,
          discount: 0,
          email: o.email || '',
          phone: o.phone_number || '',
          address: addrParts.join(', '),
          shippingAddress: addrParts.join(', '),
          billingAddress: '',
          trackingNumber: '',
          estimatedDelivery: o.estimated_delivery || '',
          paymentMethod: o.payment_method || '',
          shippingMethod: ''
        });
      } catch {
        setFetchedOrder(null);
      }
    };
    load();
    const statusEvt = (e) => {
      const d = e.detail || {};
      if (String(d.orderId || '').replace(/\D/g, '') === String((order && order.id) || '').replace(/\D/g, '')) {
        load();
      }
    };
    const notifEvt = (e) => {
      const t = String((e.detail || {}).type || '');
      if (t.includes('order-')) load();
    };
    window.addEventListener('sellerOrderStatusUpdated', statusEvt);
    window.addEventListener('notification:push', notifEvt);
    return () => {
      window.removeEventListener('sellerOrderStatusUpdated', statusEvt);
      window.removeEventListener('notification:push', notifEvt);
    };
  }, [order, token]);

  // Safe order data handling with proper fallbacks
  const currentOrder = (fetchedOrder && typeof fetchedOrder === 'object')
    ? fetchedOrder
    : (order && typeof order === 'object' ? order : sampleOrder);
  
  // Safe access to nested properties with comprehensive fallbacks
  const orderItems = currentOrder?.items || [];
  const orderNotes = currentOrder?.orderNotes || [];
  const orderId = currentOrder?.id || 'N/A';
  const orderCustomer = currentOrder?.customer || 'Unknown Customer';
  const orderDate = currentOrder?.date || new Date().toISOString().split('T')[0];
  const orderStatus = currentOrder?.status || 'pending';
  const orderTotal = currentOrder?.total || 0;
  const orderSubtotal = currentOrder?.subtotal || orderTotal;
  const orderShipping = currentOrder?.shipping || 0;
  const orderTax = currentOrder?.tax || 0;
  const orderDiscount = currentOrder?.discount || 0;
  const orderEmail = currentOrder?.email || '';
  const orderPhone = currentOrder?.phone || '';
  const orderAddress = currentOrder?.address || '';
  const orderShippingAddress = currentOrder?.shippingAddress || orderAddress;
  const orderBillingAddress = currentOrder?.billingAddress || '';
  const orderTrackingNumber = currentOrder?.trackingNumber || '';
  const orderEstimatedDelivery = currentOrder?.estimatedDelivery || '';
  const orderPaymentMethodRaw = currentOrder?.paymentMethod;
  const orderShippingMethodRaw = currentOrder?.shippingMethod;
  const orderPaymentMethod = typeof orderPaymentMethodRaw === 'object' && orderPaymentMethodRaw !== null
    ? [orderPaymentMethodRaw.type, orderPaymentMethodRaw.brand, orderPaymentMethodRaw.lastFour ? `•••• ${orderPaymentMethodRaw.lastFour}` : null]
        .filter(Boolean)
        .join(' • ')
    : (orderPaymentMethodRaw || '');
  const orderShippingMethod = typeof orderShippingMethodRaw === 'object' && orderShippingMethodRaw !== null
    ? [orderShippingMethodRaw.service || orderShippingMethodRaw.type, orderShippingMethodRaw.carrier].filter(Boolean).join(' • ')
    : (orderShippingMethodRaw || '');

  if (!currentOrder || typeof currentOrder !== 'object') {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="mb-4">
            <FaBox size={64} className="text-muted opacity-50" />
          </div>
          <h4 className="text-muted mb-3">Order Not Found</h4>
          <p className="text-muted mb-4">The requested order could not be found.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="btn text-white"
              style={{ backgroundColor: mainColor }}
            >
              <FaArrowLeft className="me-2" />
              Back to Orders
            </button>
          )}
        </div>
      </div>
    );
  }

  const getStatusConfig = (status) => {
    const config = {
      delivered: {
        color: 'success',
        bgColor: '#d1fae5',
        textColor: '#065f46',
        icon: <FaCheckCircle className="me-2" />,
        label: 'Delivered'
      },
      shipped: {
        color: 'info',
        bgColor: '#dbeafe',
        textColor: '#1e40af',
        icon: <FaTruck className="me-2" />,
        label: 'Shipped'
      },
      processing: {
        color: 'warning',
        bgColor: '#fef3c7',
        textColor: '#92400e',
        icon: <FaBox className="me-2" />,
        label: 'Processing'
      },
      pending: {
        color: 'secondary',
        bgColor: '#f3f4f6',
        textColor: '#374151',
        icon: <FaClock className="me-2" />,
        label: 'Pending'
      },
      cancelled: {
        color: 'danger',
        bgColor: '#fee2e2',
        textColor: '#991b1b',
        icon: <FaTimesCircle className="me-2" />,
        label: 'Cancelled'
      }
    };
    return config[status] || config.pending;
  };

  const handleStatusUpdate = (newStatus) => {
    if (newStatus === 'cancelled') {
      setShowCancelConfirm(true);
    } else {
      onUpdateStatus?.(orderId, newStatus);
      setShowSuccessMessage({
        message: `Order has been marked as ${newStatus}`,
        type: 'success'
      });
      setTimeout(() => setShowSuccessMessage(null), 3000);
    }
  };

  const confirmCancel = () => {
    onUpdateStatus?.(orderId, 'cancelled');
    setShowSuccessMessage({
      message: 'Order has been cancelled',
      type: 'warning'
    });
    setShowCancelConfirm(false);
    setTimeout(() => setShowSuccessMessage(null), 3000);
  };

  const getStatusOptions = (currentStatus) => {
    const workflow = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };
    return workflow[currentStatus] || [];
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount);
  };

  const handleAddNote = () => {
    if (notes.trim()) {
      // In a real app, you would send this to your API
      console.log('Adding note:', notes);
      const newNote = {
        id: (orderNotes[0]?.id || 0) + 1,
        message: notes,
        timestamp: new Date().toISOString(),
        author: currentUser?.name || 'Seller'
      };
      
      // Update local state for demo purposes
      orderNotes.unshift(newNote);
      
      setNotes('');
      setIsAddingNote(false);
      setShowSuccessMessage({
        message: 'Note added successfully',
        type: 'success'
      });
      setTimeout(() => setShowSuccessMessage(null), 3000);
    }
  };

  const statusOptions = getStatusOptions(orderStatus);
  const statusConfig = getStatusConfig(orderStatus);

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
                    <FaArrowLeft />
                    Back to Orders
                  </button>
                )}
                <div>
                  <h1 className="h4 mb-1 fw-bold" style={{ color: mainColor }}>Order Details</h1>
                  <p className="text-muted mb-0">Manage order #{orderId}</p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-end align-items-center gap-3">
                <span 
                  className={`badge d-flex align-items-center px-3 py-2`}
                  style={{ 
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.textColor
                  }}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container py-4">
        <div className="row g-4">
          {/* Left Column - Order Items & Timeline */}
          <div className="col-lg-8">
            {/* Order Items */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <FaShoppingCart className="me-2" style={{ color: mainColor }} />
                  Order Items
                </h5>
              </div>
              <div className="card-body">
                {orderItems.length > 0 ? (
                  orderItems.map((item, index) => (
                    <div key={index} className="row align-items-center border-bottom pb-3 mb-3">
                      <div className="col-2">
                        <div 
                          className="bg-light rounded d-flex align-items-center justify-content-center"
                          style={{ width: '60px', height: '60px' }}
                        >
                          <FaBox className="text-muted" />
                        </div>
                      </div>
                      <div className="col-5">
                        <h6 className="fw-semibold mb-1">{item.name || 'Unnamed Item'}</h6>
                        {item.sku && (
                          <small className="text-muted d-block">SKU: {item.sku}</small>
                        )}
                        {item.variant && (
                          <small className="text-muted">{item.variant}</small>
                        )}
                      </div>
                      <div className="col-2 text-center">
                        <span className="text-muted">Qty: {item.quantity || 1}</span>
                      </div>
                      <div className="col-3 text-end">
                        <div className="fw-bold">{formatCurrency(item.price)}</div>
                        <small className="text-muted">
                          Total: {formatCurrency((item.price || 0) * (item.quantity || 1))}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-center py-3">No items found in this order.</p>
                )}
                
                {/* Order Totals */}
                <div className="row justify-content-end mt-4">
                  <div className="col-md-6">
                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Subtotal:</span>
                        <span>{formatCurrency(orderSubtotal)}</span>
                      </div>
                      {orderDiscount > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Discount:</span>
                          <span className="text-success">-{formatCurrency(orderDiscount)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Shipping:</span>
                        <span>{formatCurrency(orderShipping)}</span>
                      </div>
                      {orderTax > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Tax:</span>
                          <span>{formatCurrency(orderTax)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-2">
                        <span>Total:</span>
                        <span style={{ color: mainColor }}>
                          {formatCurrency(orderTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <FaClock className="me-2" style={{ color: mainColor }} />
                  Order Timeline
                </h5>
              </div>
              <div className="card-body">
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-marker bg-success"></div>
                    <div className="timeline-content">
                      <h6 className="fw-semibold">Order Placed</h6>
                      <p className="text-muted mb-0">{formatDate(orderDate)}</p>
                    </div>
                  </div>
                  
                  {orderStatus !== 'pending' && (
                    <div className="timeline-item">
                      <div className="timeline-marker bg-primary"></div>
                      <div className="timeline-content">
                        <h6 className="fw-semibold">Order Confirmed</h6>
                        <p className="text-muted mb-0">
                          {formatDate(new Date(orderDate).setHours(
                            new Date(orderDate).getHours() + 1
                          ))}
                        </p>
                      </div>
                    </div>
                  )}

                  {(orderStatus === 'shipped' || orderStatus === 'delivered') && (
                    <div className="timeline-item">
                      <div className="timeline-marker bg-info"></div>
                      <div className="timeline-content">
                        <h6 className="fw-semibold">Order Shipped</h6>
                        <p className="text-muted mb-0">
                          {orderTrackingNumber && `Tracking: ${orderTrackingNumber}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {orderStatus === 'delivered' && (
                    <div className="timeline-item">
                      <div className="timeline-marker bg-success"></div>
                      <div className="timeline-content">
                        <h6 className="fw-semibold">Order Delivered</h6>
                        <p className="text-muted mb-0">
                          {orderEstimatedDelivery && formatDate(orderEstimatedDelivery)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Notes */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <FaStickyNote className="me-2" style={{ color: mainColor }} />
                  Order Notes
                </h5>
                <button
                  className="btn btn-sm text-white d-flex align-items-center gap-1"
                  style={{ backgroundColor: mainColor }}
                  onClick={() => setIsAddingNote(true)}
                >
                  <FaPlus size={12} />
                  Add Note
                </button>
              </div>
              <div className="card-body">
                {isAddingNote && (
                  <div className="mb-4 p-3 border rounded">
                    <textarea
                      className="form-control mb-2"
                      rows="3"
                      placeholder="Add a note about this order..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm text-white"
                        style={{ backgroundColor: mainColor }}
                        onClick={handleAddNote}
                      >
                        Save Note
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setIsAddingNote(false);
                          setNotes('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {orderNotes.length > 0 ? (
                  <div className="notes-list">
                    {orderNotes.map((note) => (
                      <div key={note.id} className="border-bottom pb-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="fw-semibold">{note.author || 'Unknown'}</span>
                          <small className="text-muted">
                            {formatDate(note.timestamp)}
                          </small>
                        </div>
                        <p className="mb-0 text-muted">{note.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-center py-3">No notes added yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Customer Info & Actions */}
          <div className="col-lg-4">
            {/* Customer Information */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0 d-flex align-items-center">
                  <FaUser className="me-2" style={{ color: mainColor }} />
                  Customer Information
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <h6 className="fw-semibold mb-1">{orderCustomer}</h6>
                  {orderEmail && (
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <FaEnvelope className="text-muted" size={14} />
                      <small className="text-muted">{orderEmail}</small>
                    </div>
                  )}
                  {orderPhone && (
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <FaPhone className="text-muted" size={14} />
                      <small className="text-muted">{orderPhone}</small>
                    </div>
                  )}
                </div>

                <div className="border-top pt-3">
                  <h6 className="fw-semibold mb-2">Shipping Address</h6>
                  <div className="d-flex align-items-start gap-2">
                    <FaMapMarkerAlt className="text-muted mt-1" size={14} />
                    <small className="text-muted">{orderShippingAddress}</small>
                  </div>
                </div>

                {orderBillingAddress && orderBillingAddress !== orderShippingAddress && (
                  <div className="border-top pt-3 mt-3">
                    <h6 className="fw-semibold mb-2">Billing Address</h6>
                    <div className="d-flex align-items-start gap-2">
                      <FaMapMarkerAlt className="text-muted mt-1" size={14} />
                      <small className="text-muted">{orderBillingAddress}</small>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Actions */}
            {statusOptions.length > 0 && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="card-title mb-0">Update Status</h5>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    {statusOptions.map((status) => {
                      const config = getStatusConfig(status);
                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(status)}
                          className={`btn d-flex align-items-center justify-content-center`}
                          style={{
                            borderColor: status === 'cancelled' ? '#dc3545' : mainColor,
                            color: status === 'cancelled' ? '#dc3545' : mainColor
                          }}
                        >
                          {config.icon}
                          {status === 'cancelled' ? 'Cancel Order' : `Mark as ${config.label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Order Information */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0">Order Information</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <small className="text-muted d-block">Order Date</small>
                  <div className="d-flex align-items-center gap-2">
                    <FaCalendarAlt className="text-muted" size={12} />
                    <span className="fw-semibold">{formatDate(orderDate)}</span>
                  </div>
                </div>

                {orderPaymentMethod && (
                  <div className="mb-3">
                    <small className="text-muted d-block">Payment Method</small>
                    <div className="d-flex align-items-center gap-2">
                      <FaCreditCard className="text-muted" size={12} />
                      <span className="fw-semibold">{orderPaymentMethod}</span>
                    </div>
                  </div>
                )}

                {orderShippingMethod && (
                  <div className="mb-3">
                    <small className="text-muted d-block">Shipping Method</small>
                    <div className="d-flex align-items-center gap-2">
                      <FaShippingFast className="text-muted" size={12} />
                      <span className="fw-semibold">{orderShippingMethod}</span>
                    </div>
                  </div>
                )}

                {orderTrackingNumber && (
                  <div className="mb-3">
                    <small className="text-muted d-block">Tracking Number</small>
                    <div className="d-flex align-items-center gap-2">
                      <FaTruck className="text-muted" size={12} />
                      <span className="fw-semibold">{orderTrackingNumber}</span>
                    </div>
                  </div>
                )}

                {orderEstimatedDelivery && (
                  <div>
                    <small className="text-muted d-block">Estimated Delivery</small>
                    <div className="d-flex align-items-center gap-2">
                      <FaCalendarAlt className="text-muted" size={12} />
                      <span className="fw-semibold">{formatDate(orderEstimatedDelivery)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelConfirm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center">
                  <FaExclamationTriangle className="me-2 text-warning" />
                  Cancel Order?
                </h5>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to cancel order <strong>#{orderId}</strong>? 
                  This action cannot be undone.
                </p>
                <p className="text-muted small">
                  Customer will be notified about the cancellation.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmCancel}
                >
                  Yes, Cancel Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div 
          className="position-fixed bottom-0 end-0 m-4 p-3 rounded shadow-lg"
          style={{ 
            backgroundColor: showSuccessMessage.type === 'success' ? '#d1fae5' : '#fef3c7',
            color: showSuccessMessage.type === 'success' ? '#065f46' : '#92400e',
            zIndex: 1050,
            minWidth: '300px'
          }}
        >
          <div className="d-flex align-items-center gap-2">
            {showSuccessMessage.type === 'success' ? (
              <FaCheckCircle className="text-success" />
            ) : (
              <FaExclamationTriangle className="text-warning" />
            )}
            <span className="fw-semibold">{showSuccessMessage.message}</span>
          </div>
        </div>
      )}

      <style>{`
        .timeline {
          position: relative;
          padding-left: 2rem;
        }
        .timeline-item {
          position: relative;
          padding-bottom: 1.5rem;
        }
        .timeline-marker {
          position: absolute;
          left: -2rem;
          top: 0.25rem;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }
        .timeline-content {
          padding-left: 1rem;
        }
        .timeline-item:not(:last-child)::before {
          content: '';
          position: absolute;
          left: -1.7rem;
          top: 1.25rem;
          bottom: -0.5rem;
          width: 2px;
          background-color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default SellerOrderDetails;
