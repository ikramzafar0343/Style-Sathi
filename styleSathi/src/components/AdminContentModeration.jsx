import { useState, useRef, useEffect } from 'react'
import {
  FaArrowLeft,
  FaFlag,
  FaSearch,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  
} from 'react-icons/fa'

import { adminApi } from '../services/api'
import NotificationBell from './NotificationBell'

 

const AdminContentModeration = ({ onBack, onLogout, currentUser, token }) => {
  const secondaryColor = '#2c67c4';
  const [selectedReport, setSelectedReport] = useState(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileDropdownRef = useRef(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createForm, setCreateForm] = useState({ type: '', user_email: '', description: '', severity: 'low' })
  

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  
  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const resp = await adminApi.getReports(token)
        if (mounted) {
          setReports(resp.reports || [])
        }
      } catch (e) {
        setError(e?.message || 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [token])

  const updateReportStatusLocal = (id, status) => {
    const shouldRemove = status === 'Resolved' || status === 'Rejected'
    setReports((prev) => shouldRemove ? prev.filter((r) => r.id !== id) : prev.map((r) => (r.id === id ? { ...r, status } : r)))
    setSelectedReport((prev) => {
      if (!prev) return prev
      if (prev.id !== id) return prev
      return shouldRemove ? null : { ...prev, status }
    })
    window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'moderation', title: `Report ${status}`, message: `${id} ${status.toLowerCase()}`, time: 'Just now' } }))
    window.dispatchEvent(new Event('admin:moderation:update'))
  }

  const [moderationNote, setModerationNote] = useState('')
  const handleResolve = async () => {
    if (!selectedReport) return
    try {
      const resp = await adminApi.updateReport(token, { id: selectedReport.id, action: 'resolve', reason: moderationNote })
      updateReportStatusLocal(resp.id, resp.status)
      setModerationNote('')
    } catch (e) {
      alert(`Resolve failed: ${e.message}`)
    }
  }

  const handleReject = async () => {
    if (!selectedReport) return
    try {
      const resp = await adminApi.updateReport(token, { id: selectedReport.id, action: 'reject', reason: moderationNote })
      updateReportStatusLocal(resp.id, resp.status)
      setModerationNote('')
    } catch (e) {
      alert(`Reject failed: ${e.message}`)
    }
  }

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <header className="bg-white border-bottom px-4 py-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button onClick={onBack} className="btn btn-outline-secondary btn-sm d-flex align-items-center">
              <FaArrowLeft className="me-1" /> Back
            </button>
            <div>
              <h1 className="h5 mb-0 fw-bold" style={{ color: secondaryColor }}>Content Moderation</h1>
              <p className="text-muted small mb-0">Review and resolve user reports</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <NotificationBell mainColor={secondaryColor} secondaryColor={secondaryColor} />
            <div className="position-relative" ref={profileDropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="btn btn-light d-flex align-items-center gap-2"
              >
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '34px', height: '34px', backgroundColor: 'rgba(44, 103, 196, 0.12)' }}>
                  <FaUser style={{ color: secondaryColor }} />
                </div>
                <span className="small">{currentUser?.name || 'Admin'}</span>
              </button>
              {showProfileDropdown && (
                <div className="position-absolute end-0 mt-2 bg-white rounded shadow border" style={{ minWidth: '200px', zIndex: 1050 }}>
                  <button onClick={onLogout} className="w-100 btn btn-link text-danger text-start px-3 py-2">
                    Logout
                  </button>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </header>

      <main className="flex-grow-1 p-4">
        <div className="row g-3">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: secondaryColor }}>
                    <FaFlag /> Reports
                  </h2>
                  <div className="input-group" style={{ maxWidth: '280px' }}>
                    <span className="input-group-text bg-white border-end-0" style={{ borderColor: secondaryColor, borderRadius: '8px 0 0 8px' }}><FaSearch style={{ color: secondaryColor }} /></span>
                    <input className="form-control border-start-0" placeholder="Search reports..." style={{ borderColor: secondaryColor, borderRadius: '0 8px 8px 0' }} />
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-4 text-muted">Loading reports…</div>
                ) : error ? (
                  <div className="alert alert-warning">{error}</div>
                ) : (
                <div className="list-group">
                  {reports.length === 0 && (
                    <div className="text-center py-4 text-muted">No reports found</div>
                  )}
                  {reports.map((r) => (
                    <button
                      key={r.id}
                      className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${selectedReport?.id === r.id ? 'active' : ''}`}
                      onClick={() => setSelectedReport(r)}
                    >
                      <div className="ms-2 me-auto">
                        <div className="fw-semibold">{r.type} • {r.id}</div>
                        <small className="text-muted">{r.user} • {r.time}</small>
                      </div>
                      <span className={`badge ${r.severity === 'High' ? 'bg-danger' : 'bg-warning'} rounded-pill`}>{r.severity}</span>
                    </button>
                  ))}
                </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: secondaryColor }}>
                  <FaInfoCircle /> Details
                </h2>
                {selectedReport ? (
                  <div>
                    <p className="mb-1"><strong>ID:</strong> {selectedReport.id}</p>
                    <p className="mb-1"><strong>Type:</strong> {selectedReport.type}</p>
                    <p className="mb-1"><strong>User:</strong> {selectedReport.user}</p>
                    <p className="mb-1"><strong>Submitted By:</strong> {selectedReport.submittedBy}</p>
                    <p className="mb-1"><strong>Severity:</strong> {selectedReport.severity}</p>
                    <p className="mb-3"><strong>Description:</strong> {selectedReport.description}</p>
                    <div className="mb-3">
                      <label className="form-label small">Moderation Note (optional)</label>
                      <textarea className="form-control" rows="3" value={moderationNote} onChange={(e) => setModerationNote(e.target.value)} placeholder="Add a note or reason" />
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-success d-flex align-items-center gap-2" onClick={handleResolve}>
                        <FaCheckCircle /> Resolve
                      </button>
                      <button className="btn btn-danger d-flex align-items-center gap-2" onClick={handleReject}>
                        <FaTimesCircle /> Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">Select a report to view details</p>
                )}
                <hr className="my-4" />
                <h2 className="h6 fw-bold mb-3" style={{ color: secondaryColor }}>Create Report</h2>
                {createError && <div className="alert alert-warning">{createError}</div>}
                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label small">Type *</label>
                    <input className="form-control" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">User Email</label>
                    <input className="form-control" value={createForm.user_email} onChange={(e) => setCreateForm({ ...createForm, user_email: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Description</label>
                    <textarea className="form-control" rows="3" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small">Severity</label>
                    <select className="form-select" value={createForm.severity} onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <button className="btn btn-primary" disabled={creating} onClick={async () => {
                    setCreating(true); setCreateError('');
                    try {
                      const resp = await adminApi.createReport(token, createForm);
                      if (resp && resp.id) {
                        const newReport = {
                          id: resp.id,
                          type: createForm.type,
                          user: createForm.user_email,
                          submittedBy: currentUser?.email || '',
                          time: 'Just now',
                          severity: String(createForm.severity || 'low').toLowerCase().replace(/(^|\s)\S/g, (t) => t.toUpperCase()),
                          status: 'Pending',
                          description: createForm.description,
                        };
                        setReports((prev) => [newReport, ...prev]);
                        setCreateForm({ type: '', user_email: '', description: '', severity: 'low' });
                        window.dispatchEvent(new CustomEvent('notification:push', { detail: { type: 'moderation', title: 'Report Created', message: `${newReport.id} created`, time: 'Just now' } }))
                      }
                    } catch (e) {
                      setCreateError(e?.message || 'Failed to create report');
                    } finally { setCreating(false); }
                  }}>Create</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminContentModeration
