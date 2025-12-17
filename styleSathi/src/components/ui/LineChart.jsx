const LineChart = ({
  data = [],
  valueKey,
  labelKey = 'date',
  isCurrency = false,
  progress = 1,
  height = 240,
  padding = 24
}) => {
  const width = 600
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0)
  const values = data.map((d) => (d[valueKey] || 0) * progress)
  const max = Math.max(...values, 0)
  const points = values.map((val, i) => {
    const x = padding + (i * (width - padding * 2)) / Math.max(1, data.length - 1)
    const y = padding + (max > 0 ? (1 - val / max) * (height - padding * 2) : height - padding * 2)
    return `${x},${y}`
  })
  const labels = data.map((item) =>
    labelKey === 'month'
      ? (item.month?.slice(0, 3) || '')
      : (item.date ? new Date(item.date).getDate().toString() : '')
  )
  return (
    <div className="position-relative">
      <svg width={width} height={height} className="w-100 h-auto">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#2c67c4"
          strokeWidth="2"
        />
        {points.map((pt, i) => {
          const [x, y] = pt.split(',').map(Number)
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="#2c67c4" />
          )
        })}
      </svg>
      <div className="d-flex justify-content-between mt-1 small text-muted">
        {labels.map((lab, i) => (
          <span key={i} className="text-center" style={{ width: `${100 / Math.max(1, labels.length)}%` }}>
            {lab}
          </span>
        ))}
      </div>
      <div className="position-absolute start-0 top-0 h-100 d-flex flex-column justify-content-between pe-2 small text-muted">
        <span>{isCurrency ? formatCurrency(max) : formatNumber(max)}</span>
        <span>{isCurrency ? formatCurrency(max * 0.75) : formatNumber(Math.floor(max * 0.75))}</span>
        <span>{isCurrency ? formatCurrency(max * 0.5) : formatNumber(Math.floor(max * 0.5))}</span>
        <span>{isCurrency ? formatCurrency(max * 0.25) : formatNumber(Math.floor(max * 0.25))}</span>
        <span>0</span>
      </div>
    </div>
  )
}

export default LineChart
