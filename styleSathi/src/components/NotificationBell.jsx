import { useState, useEffect, useRef } from 'react'
import { FaBell } from 'react-icons/fa'
import { notificationsApi } from '../services/api'

const NotificationBell = ({ mainColor = '#c4a62c', secondaryColor = '#2c67c4' }) => {
  const [showPanel, setShowPanel] = useState(false)
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
        setNotifications(mapped.slice(0, 100))
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
      setNotifications((prev) => [item, ...prev].slice(0, 50))
    }
    const onMarkAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const onClear = () => setNotifications([])
    window.addEventListener('notification:push', onPush)
    window.addEventListener('notification:markAllRead', onMarkAllRead)
    window.addEventListener('notification:clear', onClear)
    const onClickOutside = (evt) => {
      if (panelRef.current && !panelRef.current.contains(evt.target)) setShowPanel(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      window.removeEventListener('notification:push', onPush)
      window.removeEventListener('notification:markAllRead', onMarkAllRead)
      window.removeEventListener('notification:clear', onClear)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length
  const markAsRead = async (id) => {
    try { await notificationsApi.markRead(undefined, id) } catch { void 0 }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }
  const markAllRead = async () => {
    try { await notificationsApi.markAllRead() } catch { void 0 }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try { window.dispatchEvent(new CustomEvent('notification:markAllRead')) } catch { void 0 }
  }
  const clearAll = async () => {
    try { await notificationsApi.clear() } catch { void 0 }
    setNotifications([])
    try { window.dispatchEvent(new CustomEvent('notification:clear')) } catch { void 0 }
  }

  return (
    <div className="position-relative" ref={panelRef}>
      <div
        className="cursor-pointer hover-scale position-relative"
        onClick={() => setShowPanel(!showPanel)}
        style={{ transition: 'transform 0.2s' }}
      >
        <div
          className="rounded-circle d-flex align-items-center justify-content-center border"
          style={{ width: '45px', height: '45px', backgroundColor: `${mainColor}20`, borderColor: `${mainColor}50` }}
        >
          <FaBell style={{ color: mainColor, fontSize: '18px' }} />
        </div>
        {unreadCount > 0 && (
          <span
            className="badge rounded-pill position-absolute top-0 start-100 translate-middle"
            style={{ backgroundColor: secondaryColor, color: 'white', fontSize: '0.7rem', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {showPanel && (
        <div
          className="position-absolute bg-white shadow rounded end-0 mt-2 py-2"
          style={{ minWidth: '320px', maxHeight: '400px', overflowY: 'auto', zIndex: 1050, border: `1px solid ${mainColor}20` }}
        >
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
            <h6 className="fw-semibold mb-0">Notifications</h6>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={markAllRead}>Mark all read</button>
              <button className="btn btn-sm btn-outline-danger" onClick={clearAll}>Clear</button>
            </div>
          </div>
          <div>
            {notifications.length === 0 ? (
              <div className="p-3 text-center text-muted">No notifications</div>
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
      )}
    </div>
  )
}

export default NotificationBell
