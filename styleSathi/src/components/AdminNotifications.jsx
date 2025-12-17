import { useEffect, useState, useRef } from 'react'
import { FaBell, FaArrowLeft } from 'react-icons/fa'
import { notificationsApi } from '../services/api'

const AdminNotifications = ({ onBack }) => {
  const secondaryColor = '#2c67c4'
  const [notifications, setNotifications] = useState([])
  const panelRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const list = await notificationsApi.list()
        const mapped = (Array.isArray(list) ? list : []).map((n) => ({
          id: String(n.id || n._id || Date.now() + Math.random()),
          type: n.type || 'info',
          title: n.title || n.subject || 'Notification',
          message: n.message || n.body || '',
          time: (n.time || n.created_at || n.createdAt || '').toString(),
          read: !!(n.read || n.is_read)
        }))
        setNotifications(mapped.slice(0, 200))
      } catch {
        setNotifications([])
      }
    }
    load()
    const onPush = (e) => {
      const d = e.detail || {}
      const item = {
        id: String(Date.now()),
        type: d.type || 'info',
        title: d.title || 'Notification',
        message: d.message || '',
        time: d.time || 'Just now',
        read: false
      }
      setNotifications((prev) => [item, ...prev].slice(0, 100))
    }
    const onMarkAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const onClear = () => setNotifications([])
    window.addEventListener('notification:push', onPush)
    window.addEventListener('notification:markAllRead', onMarkAllRead)
    window.addEventListener('notification:clear', onClear)
    return () => {
      window.removeEventListener('notification:push', onPush)
      window.removeEventListener('notification:markAllRead', onMarkAllRead)
      window.removeEventListener('notification:clear', onClear)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length
  const markAsRead = async (id) => {
    try { await notificationsApi.markRead(undefined, id) } catch { void 0 }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }
  const markAllRead = () => {
    (async () => { try { await notificationsApi.markAllRead() } catch { void 0 } })()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try { window.dispatchEvent(new CustomEvent('notification:markAllRead')) } catch { void 0 }
  }
  const clearAll = () => {
    (async () => { try { await notificationsApi.clear() } catch { void 0 } })()
    setNotifications([])
    try { window.dispatchEvent(new CustomEvent('notification:clear')) } catch { void 0 }
  }

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <header className="bg-white border-bottom px-4 py-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button onClick={onBack} className="btn btn-outline-secondary btn-sm d-flex align-items-center">
              <FaArrowLeft className="me-1" /> Back
            </button>
            <h1 className="h5 mb-0 fw-bold" style={{ color: secondaryColor }}>Notifications</h1>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-sm btn-outline-primary" onClick={markAllRead} style={{ borderColor: secondaryColor, color: secondaryColor }}>Mark all read</button>
            <button className="btn btn-sm btn-outline-danger" onClick={clearAll}>Clear</button>
          </div>
        </div>
      </header>

      <main className="flex-grow-1 p-4 d-flex justify-content-center">
        <div ref={panelRef} className="w-100" style={{ maxWidth: '720px' }}>
          <div className="card shadow-sm border-0">
            <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: secondaryColor }}>
              <div className="d-flex align-items-center gap-2 text-white">
                <FaBell />
                <span className="fw-semibold">Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="badge bg-danger">{unreadCount} unread</span>
              )}
            </div>
            <div className="card-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted">No notifications</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 border-bottom ${!n.read ? 'bg-light' : ''}`}
                    onClick={() => markAsRead(n.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="mb-1 small fw-medium">{n.title}</p>
                        <p className="text-muted small mb-0">{n.message}</p>
                        <p className="text-muted small mb-0">{n.time}</p>
                      </div>
                      {!n.read && (
                        <div className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: secondaryColor }}></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminNotifications
