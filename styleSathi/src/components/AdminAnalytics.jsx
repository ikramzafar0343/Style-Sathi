import { useEffect, useState, useRef } from 'react'
import { 
  FaArrowLeft, 
  FaChartBar, 
  FaUsers, 
  FaShoppingBag, 
  FaDollarSign, 
  FaBox, 
  FaDownload, 
  FaCalendar,
  FaFilter,
  FaChartLine,
  FaBullseye,
  FaPercentage,
  FaCheckCircle,
  FaClock,
  FaSync,
  FaTimesCircle
} from 'react-icons/fa'
import { FaArrowTrendUp } from "react-icons/fa6";
import { adminApi } from '../services/api';
import NotificationBell from './NotificationBell';
import BarChart from './ui/BarChart';
import LineChart from './ui/LineChart';

 

const AdminAnalytics = ({ onBack, token }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const secondaryColor = '#2c67c4'
  

  const [analyticsData, setAnalyticsData] = useState(null)
  const [exportFormat, setExportFormat] = useState('doc')
  const canvasRef = useRef(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const resp = await adminApi.getAnalytics(token)
        if (mounted) setAnalyticsData(resp.analytics || null)
      } catch {
        setAnalyticsData(null)
        console.error('admin analytics fetch failed')
      }
    })()
    return () => { mounted = false }
  }, [token])
  const overview = analyticsData?.overview || { totalRevenue: 0, totalUsers: 0, totalSellers: 0, totalCustomers: 0, totalOrders: 0, activeProducts: 0, pendingVerifications: 0, averageOrderValue: 0, monthlyGrowth: { revenue: 0, users: 0, orders: 0 } }
  const revenue = analyticsData?.revenue || { monthly: [], daily: [] }
  const userGrowth = analyticsData?.userGrowth || { monthly: [], daily: [] }
  const categoryPerformance = analyticsData?.categoryPerformance || []
  const topSellers = analyticsData?.topSellers || []
  const userEngagement = analyticsData?.userEngagement || { dailyActiveUsers: 0, weeklyActiveUsers: 0, conversionRate: 0, retentionRate: 0 }
  const orderStatus = analyticsData?.orderStatus || { completed: 0, pending: 0, processing: 0, cancelled: 0 }

  const [progress, setProgress] = useState(0)
  useEffect(() => {
    let start = performance.now()
    let raf
    const duration = 3000
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(t)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const lerpNum = (target) => Math.round(target * progress)
  const displayOverview = {
    totalRevenue: lerpNum(overview.totalRevenue),
    totalUsers: lerpNum(overview.totalUsers),
    totalSellers: lerpNum(overview.totalSellers),
    totalCustomers: lerpNum(overview.totalCustomers),
    totalOrders: lerpNum(overview.totalOrders),
    activeProducts: lerpNum(overview.activeProducts),
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num)

  const exportDoc = () => {
    const now = new Date().toLocaleString()
    const o = analyticsData?.overview || {}
    const html = `\n      <html><head><meta charset="utf-8"><title>StyleSathi Analytics Report</title></head><body>\n        <h1>StyleSathi Analytics Report</h1>\n        <p>Generated: ${now}</p>\n        <h2>Overview</h2>\n        <ul>\n          <li>Total Revenue: ${o.totalRevenue}</li>\n          <li>Total Users: ${o.totalUsers} (Sellers: ${o.totalSellers}, Customers: ${o.totalCustomers})</li>\n          <li>Total Orders: ${o.totalOrders} (Avg: ${o.averageOrderValue})</li>\n          <li>Active Products: ${o.activeProducts}</li>\n        </ul>\n      </body></html>`
    const blob = new Blob([html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().slice(0,10)}.doc`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    a.remove()
  }

  const exportPng = () => {
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 800
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#2c67c4'
    ctx.font = 'bold 28px Arial'
    ctx.fillText('StyleSathi Analytics Report', 40, 60)
    ctx.fillStyle = '#555'
    ctx.font = '16px Arial'
    const now = new Date().toLocaleString()
    ctx.fillText(`Generated: ${now}`, 40, 90)
    const o = analyticsData?.overview || {}
    const lines = [
      `Total Revenue: ${o.totalRevenue}`,
      `Total Users: ${o.totalUsers} (Sellers: ${o.totalSellers}, Customers: ${o.totalCustomers})`,
      `Total Orders: ${o.totalOrders} (Avg: ${o.averageOrderValue})`,
      `Active Products: ${o.activeProducts}`
    ]
    let y = 140
    lines.forEach((line) => { ctx.fillText(line, 40, y); y += 28 })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().slice(0,10)}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const exportPdf = () => {
    window.print()
  }

  const handleExport = () => {
    if (exportFormat === 'doc') return exportDoc()
    if (exportFormat === 'png') return exportPng()
    return exportPdf()
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="bg-white border-bottom border-gray-200 sticky-top z-50">
        <div className="container-fluid px-4 py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <button
                onClick={onBack}
                className="btn btn-outline-secondary btn-sm d-flex align-items-center"
              >
                <FaArrowLeft className="me-1" />
                Back
              </button>
              <div>
                <h1 className="h3 mb-0 fw-bold" style={{ color: secondaryColor }}>Analytics & Reports</h1>
                <p className="text-muted mb-0 small">Platform performance metrics and insights</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <NotificationBell mainColor={secondaryColor} secondaryColor={secondaryColor} />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="form-select form-select-sm"
                style={{ width: '120px' }}
              >
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="form-select form-select-sm"
                style={{ width: '120px' }}
              >
                <option value="doc">DOC</option>
                <option value="png">PNG</option>
                <option value="pdf">PDF</option>
              </select>
              <button onClick={handleExport} className="btn btn-sm d-flex align-items-center gap-2" style={{ backgroundColor: secondaryColor, color: '#fff' }}>
                <FaDownload />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid p-4">
        {/* Overview Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <p className="text-muted small mb-0">Total Revenue</p>
                  <FaDollarSign className="text-success" />
                </div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="h4 fw-bold mb-0" style={{ color: secondaryColor }}>{formatCurrency(displayOverview.totalRevenue)}</span>
                  <span className="badge bg-success bg-opacity-10 text-success d-flex align-items-center gap-1">
                    <FaArrowTrendUp />
                    +{overview.monthlyGrowth.revenue}%
                  </span>
                </div>
                <p className="text-muted small mt-1 mb-0">Last 30 days</p>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <p className="text-muted small mb-0">Total Users</p>
                  <FaUsers className="text-primary" />
                </div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="h4 fw-bold mb-0" style={{ color: secondaryColor }}>{formatNumber(displayOverview.totalUsers)}</span>
                  <span className="badge bg-success bg-opacity-10 text-success d-flex align-items-center gap-1">
                    <FaArrowTrendUp />
                    +{overview.monthlyGrowth.users}%
                  </span>
                </div>
                <p className="text-muted small mt-1 mb-0">{overview.totalSellers} sellers, {overview.totalCustomers} customers</p>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <p className="text-muted small mb-0">Total Orders</p>
                  <FaShoppingBag className="text-purple" />
                </div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="h4 fw-bold mb-0" style={{ color: secondaryColor }}>{formatNumber(displayOverview.totalOrders)}</span>
                  <span className="badge bg-success bg-opacity-10 text-success d-flex align-items-center gap-1">
                    <FaArrowTrendUp />
                    +{overview.monthlyGrowth.orders}%
                  </span>
                </div>
                <p className="text-muted small mt-1 mb-0">Avg: {formatCurrency(overview.averageOrderValue)}</p>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <p className="text-muted small mb-0">Active Products</p>
                  <FaBox className="text-warning" />
                </div>
                <div className="d-flex align-items-baseline gap-2">
                  <span className="h4 fw-bold mb-0" style={{ color: secondaryColor }}>{formatNumber(displayOverview.activeProducts)}</span>
                </div>
                <p className="text-muted small mt-1 mb-0">{overview.pendingVerifications} pending verification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h2 className="h5 fw-bold text-dark mb-1">Revenue Trend</h2>
                <p className="text-muted small mb-0">Revenue over time</p>
              </div>
            </div>
            <div className="position-relative">
            {selectedPeriod === 'monthly' 
              ? <BarChart data={revenue.monthly} valueKey="revenue" labelKey="month" isCurrency progress={progress} />
              : <LineChart data={revenue.daily.slice(-30)} valueKey="revenue" labelKey="date" isCurrency progress={progress} />
            }
            </div>
            <div className="mt-4 row g-2 text-xs border-top pt-3">
              {selectedPeriod === 'monthly' 
                ? revenue.monthly.map((item, idx) => (
                    <div key={idx} className="col text-center">
                      <p className="text-muted small mb-1">{item.month.slice(0, 3)}</p>
                      <p className="fw-semibold text-dark small">{formatCurrency(item.revenue)}</p>
                      <p className="text-muted small mt-1">{item.orders} orders</p>
                    </div>
                  ))
                : revenue.daily.slice(-14).map((item, idx) => (
                    <div key={idx} className="col text-center">
                      <p className="text-muted small mb-1">{new Date(item.date).getDate()}</p>
                      <p className="fw-semibold text-dark small">{formatCurrency(item.revenue)}</p>
                      <p className="text-muted small mt-1">{item.orders} orders</p>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          {/* User Growth Chart */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="mb-4">
                  <h2 className="h5 fw-bold text-dark mb-1">User Growth</h2>
                  <p className="text-muted small mb-0">New user registrations</p>
                </div>
                <div className="position-relative">
                  {selectedPeriod === 'monthly'
                    ? <BarChart data={userGrowth.monthly} valueKey="newUsers" labelKey="month" progress={progress} />
                    : <LineChart data={userGrowth.daily.slice(-14)} valueKey="newUsers" labelKey="date" progress={progress} />
                  }
                </div>
                <div className="mt-3 text-muted small">
                  <p className="mb-2">Breakdown:</p>
                  <div className="row g-2">
                    {selectedPeriod === 'monthly'
                      ? userGrowth.monthly.map((item, idx) => (
                          <div key={idx} className="col text-center">
                            <p className="fw-semibold text-dark small mb-0">{item.newUsers}</p>
                            <p className="text-primary small mb-0">{item.newSellers} sellers</p>
                            <p className="text-purple small mb-0">{item.newCustomers} customers</p>
                          </div>
                        ))
                      : userGrowth.daily.slice(-14).map((item, idx) => (
                          <div key={idx} className="col text-center">
                            <p className="fw-semibold small mb-0" style={{ color: secondaryColor }}>{Math.round(item.newUsers * progress)}</p>
                            <p className="small mb-0" style={{ color: secondaryColor }}>{Math.round(item.newSellers * progress)} sellers</p>
                            <p className="small mb-0" style={{ color: secondaryColor }}>{Math.round(item.newCustomers * progress)} customers</p>
                          </div>
                        ))
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Performance */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="mb-4">
                  <h2 className="h5 fw-bold text-dark mb-1">Category Performance</h2>
                  <p className="text-muted small mb-0">Top performing categories</p>
                </div>
                <div className="space-y-3">
                  {categoryPerformance.slice(0, 5).map((category, idx) => (
                    <div key={idx}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small fw-medium text-dark">{category.category}</span>
                        <span className="small fw-semibold text-dark">{formatCurrency(category.revenue)}</span>
                      </div>
                      <div className="w-100 bg-light rounded-pill" style={{ height: '8px' }}>
                        <div
                          className="bg-gold rounded-pill h-100"
                          style={{ width: `${(category.revenue / categoryPerformance[0].revenue) * 100}%` }}
                        />
                      </div>
                      <div className="d-flex align-items-center justify-content-between mt-1 small text-muted">
                        <span>{category.orders} orders</span>
                        <span className="text-success d-flex align-items-center gap-1">
                          <FaArrowTrendUp />
                          +{category.growth}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Engagement Metrics */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h5 fw-bold text-dark mb-4">User Engagement</h2>
            <div className="row g-4">
              <div className="col-6 col-md-3">
                <p className="text-muted small mb-1">Daily Active Users</p>
                <p className="h4 fw-bold text-dark mb-0">{formatNumber(userEngagement.dailyActiveUsers)}</p>
              </div>
              <div className="col-6 col-md-3">
                <p className="text-muted small mb-1">Weekly Active Users</p>
                <p className="h4 fw-bold text-dark mb-0">{formatNumber(userEngagement.weeklyActiveUsers)}</p>
              </div>
              <div className="col-6 col-md-3">
                <p className="text-muted small mb-1">Conversion Rate</p>
                <p className="h4 fw-bold text-dark mb-0">{userEngagement.conversionRate}%</p>
              </div>
              <div className="col-6 col-md-3">
                <p className="text-muted small mb-1">Retention Rate</p>
                <p className="h4 fw-bold text-dark mb-0">{userEngagement.retentionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Sellers and Order Status */}
        <div className="row g-4 mb-4">
          {/* Top Sellers */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h5 fw-bold text-dark mb-4">Top Sellers</h2>
                <div className="space-y-3">
                  {topSellers.map((seller, idx) => (
                    <div key={idx} className="d-flex align-items-center justify-content-between p-3 bg-light rounded">
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle bg-gold text-white d-flex align-items-center justify-content-center fw-semibold" 
                             style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="fw-medium text-dark mb-0 small">{seller.sellerName}</p>
                          <p className="text-muted small mb-0">{seller.orders} orders • {seller.products} products</p>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="fw-semibold text-dark mb-0 small">{formatCurrency(seller.revenue)}</p>
                        <p className="text-success small mb-0 d-flex align-items-center justify-content-end gap-1">
                          <FaArrowTrendUp />
                          +{seller.growth}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Order Status */}
          <div className="col-lg-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h5 fw-bold text-dark mb-4">Order Status</h2>
                <div className="space-y-3">
                  <div className="d-flex align-items-center justify-content-between p-3 bg-success bg-opacity-10 rounded">
                    <div className="d-flex align-items-center gap-2">
                      <FaCheckCircle className="text-success" />
                      <span className="fw-medium text-dark small">Completed</span>
                    </div>
                    <span className="fw-bold text-dark">{formatNumber(orderStatus.completed)}</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between p-3 bg-warning bg-opacity-10 rounded">
                    <div className="d-flex align-items-center gap-2">
                      <FaClock className="text-warning" />
                      <span className="fw-medium text-dark small">Pending</span>
                    </div>
                    <span className="fw-bold text-dark">{formatNumber(orderStatus.pending)}</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between p-3 bg-info bg-opacity-10 rounded">
                    <div className="d-flex align-items-center gap-2">
                      <FaSync className="text-info" />
                      <span className="fw-medium text-dark small">Processing</span>
                    </div>
                    <span className="fw-bold text-dark">{formatNumber(orderStatus.processing)}</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between p-3 bg-danger bg-opacity-10 rounded">
                    <div className="d-flex align-items-center gap-2">
                      <FaTimesCircle className="text-danger" />
                      <span className="fw-medium text-dark small">Cancelled</span>
                    </div>
                    <span className="fw-bold text-dark">{formatNumber(orderStatus.cancelled)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="d-none" />
      </div>

      <style>{`
        .hover-shadow:hover {
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
        .hover-bg-gold-dark:hover {
          background: linear-gradient(to top, #b39925, #d4b83c) !important;
        }
        .group:hover .group-hover-opacity-100 {
          opacity: 1 !important;
        }
        .text-purple {
          color: #6f42c1 !important;
        }
        .bg-purple {
          background-color: #6f42c1 !important;
        }
        .bg-gold {
          background-color: #c4a62c !important;
        }
        .text-gold {
          color: #c4a62c !important;
        }
        .hover-text-gold:hover {
          color: #c4a62c !important;
        }
        .btn-gold {
          background-color: #c4a62c;
          border-color: #c4a62c;
          color: white;
        }
        .btn-gold:hover {
          background-color: #b39925;
          border-color: #b39925;
          color: white;
        }
      `}</style>
    </div>
  )
}

export default AdminAnalytics
