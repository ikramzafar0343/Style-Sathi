const BarChart = ({
  data = [],
  valueKey,
  labelKey = 'month',
  isCurrency = false,
  progress = 1,
  height = 256
}) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0)
  const maxValue = Math.max(...data.map((item) => item[valueKey] || 0), 0)
  return (
    <div className="position-relative" style={{ height }}>
      <div className="d-flex align-items-end justify-content-between gap-2 h-100 pb-4">
        {data.map((item, index) => {
          const raw = item[valueKey] || 0
          const value = raw * progress
          const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0
          const displayValue = isCurrency ? formatCurrency(value) : formatNumber(value)
          return (
            <div key={index} className="flex-fill d-flex flex-column align-items-center position-relative">
              <div className="w-100 h-100 d-flex flex-column justify-content-end">
                <div className="position-relative w-100">
                  <div
                    className="w-100 rounded-top shadow-sm"
                    style={{
                      height: `${barHeight}%`,
                      minHeight: barHeight > 0 ? '4px' : '0',
                      background: 'linear-gradient(to top, #c4a62c, #e9d35f)',
                      transition: 'height 300ms ease'
                    }}
                    title={displayValue}
                  />
                </div>
              </div>
              <div className="mt-2 w-100">
                <span className="text-muted small d-block text-center">
                  {labelKey === 'month'
                    ? (item.month?.slice(0, 3) || '')
                    : (item.date ? new Date(item.date).getDate().toString() : '')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="position-absolute start-0 top-0 h-100 d-flex flex-column justify-content-between pe-2 small text-muted">
        <span>{isCurrency ? formatCurrency(maxValue) : formatNumber(maxValue)}</span>
        <span>{isCurrency ? formatCurrency(maxValue * 0.75) : formatNumber(Math.floor(maxValue * 0.75))}</span>
        <span>{isCurrency ? formatCurrency(maxValue * 0.5) : formatNumber(Math.floor(maxValue * 0.5))}</span>
        <span>{isCurrency ? formatCurrency(maxValue * 0.25) : formatNumber(Math.floor(maxValue * 0.25))}</span>
        <span>0</span>
      </div>
    </div>
  )
}

export default BarChart
