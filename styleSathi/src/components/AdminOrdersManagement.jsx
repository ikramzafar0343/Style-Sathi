import { useEffect, useState } from 'react';
import { FaArrowLeft, FaSearch, FaFilter, FaTruck, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import { ordersApi } from '../services/api';

const statusBadge = (s) => {
  switch (s) {
    case 'confirmed': return { text: 'Confirmed', className: 'bg-primary' };
    case 'processing': return { text: 'Processing', className: 'bg-info' };
    case 'in_transit': return { text: 'In Transit', className: 'bg-warning' };
    case 'delivered': return { text: 'Delivered', className: 'bg-success' };
    case 'cancelled': return { text: 'Cancelled', className: 'bg-danger' };
    default: return { text: s || 'Unknown', className: 'bg-secondary' };
  }
};

const AdminOrdersManagement = ({ onBack, token }) => {
  const mainColor = '#2c67c4';
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const list = await ordersApi.getAdminOrders(token);
        if (mounted) setOrders(Array.isArray(list) ? list : (list.orders || []));
      } catch { if (mounted) setOrders([]); }
      finally { if (mounted) setLoading(false); }
    };
    load();
    const inval = () => load();
    window.addEventListener('ordersInvalidated', inval);
    return () => { mounted = false; window.removeEventListener('ordersInvalidated', inval); };
  }, [token]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const resp = await ordersApi.updateSellerOrderStatus(token, id, status);
      const updated = resp?.id ? resp : { id, status };
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o)));
      window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'order-status', title: 'Order Updated', message: `Order ${id} ${status}`, time: 'Just now' } }));
      window.dispatchEvent(new Event('ordersInvalidated'));
    } catch { void 0; }
    finally { setUpdatingId(null); }
  };

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    const matches = !q || [o.id, o.full_name, o.email, o.phone_number, o.payment_method].map((v) => String(v || '').toLowerCase()).some((t) => t.includes(q));
    const statusOk = statusFilter === 'all' || String(o.status).toLowerCase() === statusFilter;
    return matches && statusOk;
  });

  return (
    <div className="min-vh-100 bg-light">
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <button className="btn btn-link text-decoration-none" onClick={onBack} style={{ color: mainColor }}>
                <FaArrowLeft /> Back to Dashboard
              </button>
              <h1 className="h4 fw-bold mb-0" style={{ color: mainColor }}>Admin Orders Management</h1>
            </div>
            <div className="d-flex align-items-center gap-4">
              <NotificationBell mainColor={mainColor} secondaryColor={mainColor} />
            </div>
          </div>
        </div>
      </header>

      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-end mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="input-group" style={{ maxWidth: '320px' }}>
              <span className="input-group-text bg-white border-end-0"><FaSearch style={{ color: mainColor }} /></span>
              <input className="form-control border-start-0" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaFilter className="text-muted" />
              <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="p-4 text-center text-muted">Loading orders...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Placed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o) => {
                      const badge = statusBadge(o.status);
                      const items = Array.isArray(o.items) ? o.items : [];
                      return (
                        <tr key={o.id}>
                          <td>ORD-{String(o.id).padStart(4, '0')}</td>
                          <td>
                            <div className="fw-semibold">{o.full_name || '-'}</div>
                            <div className="small text-muted">{o.email || '-'}</div>
                          </td>
                          <td className="small">
                            <div>{o.phone_number || '-'}</div>
                            <div className="text-muted">{[o.city, o.country].filter(Boolean).join(', ')}</div>
                          </td>
                          <td>
                            <div className="small text-muted">{items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)} items</div>
                          </td>
                          <td>₹{Number(o.total || 0).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${badge.className}`}>{badge.text}</span>
                          </td>
                          <td className="small">{o.payment_method || 'card'}</td>
                          <td className="small">{(o.created_at || '').toString().replace('T', ' ').slice(0, 19)}</td>
                          <td className="d-flex align-items-center gap-2">
                            <button className="btn btn-sm btn-outline-danger" disabled={updatingId === o.id} onClick={() => updateStatus(o.id, 'cancelled')}> <FaTimesCircle /> Cancel</button>
                          </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrdersManagement;
