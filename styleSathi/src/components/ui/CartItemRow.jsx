import { FaPlus, FaMinus, FaTrash } from 'react-icons/fa'
import CloudinaryImage from './CloudinaryImage'

const CartItemRow = ({
  item,
  mainColor = '#c4a62c',
  onIncrease,
  onDecrease,
  onRemove
}) => {
  const imageUrl = item.imageUrl || item.image || ''
  const total = Number(item.price || 0) * Number(item.quantity || 0)
  return (
    <div className="card shadow-sm border-0 mb-3">
      <div className="p-3">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="bg-light rounded overflow-hidden" style={{ width: '80px', height: '80px' }}>
            <CloudinaryImage
              src={imageUrl}
              alt={item.name}
              className="w-100 h-100 object-fit-cover"
            />
          </div>

          <div className="flex-grow-1" style={{ minWidth: '180px' }}>
            <div className="d-flex justify-content-between align-items-start">
              <div className="me-3">
                <h6 className="mb-1" style={{ color: mainColor }}>{item.name}</h6>
                <p className="text-muted small mb-2">{item.brand}</p>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-semibold" style={{ color: mainColor }}>
                    ${Number(item.price || 0).toFixed(2)}
                  </span>
                  <span className="text-muted">×</span>
                  <div className="input-group input-group-sm" style={{ width: '132px' }}>
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => onDecrease && onDecrease(item.id)}
                      disabled={item.quantity <= 1}
                      style={{ borderColor: mainColor, color: mainColor }}
                    >
                      <FaMinus />
                    </button>
                    <input
                      type="text"
                      className="form-control text-center"
                      value={item.quantity}
                      readOnly
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => onIncrease && onIncrease(item.id)}
                      style={{ borderColor: mainColor, color: mainColor }}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-end">
                <div className="fw-bold">${total.toFixed(2)}</div>
                <button
                  className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 mt-2"
                  onClick={() => onRemove && onRemove(item.id)}
                >
                  <FaTrash /> Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartItemRow
