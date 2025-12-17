import { FaTimes, FaShoppingCart } from 'react-icons/fa'
import CartItemRow from './CartItemRow'

const CartDrawer = ({
  show = false,
  items = [],
  mainColor = '#c4a62c',
  onClose,
  onUpdateCart,
  onNavigateToCartPage,
  onNavigateToCheckout
}) => {
  const subtotal = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0)
  const shipping = subtotal > 100 ? 0 : 9.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  const handleIncrease = (id) => {
    if (!onUpdateCart) return
    const updated = items.map((it) => it.id === id ? { ...it, quantity: it.quantity + 1 } : it)
    onUpdateCart(updated)
  }

  const handleDecrease = (id) => {
    if (!onUpdateCart) return
    const updated = items.map((it) => it.id === id ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it)
    onUpdateCart(updated)
  }

  const handleRemove = (id) => {
    if (!onUpdateCart) return
    const updated = items.filter((it) => it.id !== id)
    onUpdateCart(updated)
  }

  if (!show) return null

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1050 }}>
      <div
        className="w-100 h-100"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      />
      <div
        className="position-absolute top-0 end-0 h-100 bg-white shadow-lg d-flex flex-column"
        style={{ width: '420px', maxWidth: '100%', borderLeft: `${mainColor}20 solid 4px`, borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}
      >
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ borderColor: `${mainColor}20` }}>
          <div className="d-flex align-items-center gap-2">
            <FaShoppingCart style={{ color: mainColor }} />
            <h6 className="mb-0" style={{ color: mainColor }}>Your Cart</h6>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="flex-grow-1 overflow-auto p-3" style={{ backgroundColor: '#f8f9fa' }}>
          {items.length === 0 ? (
            <div className="text-center text-muted py-5">No items in cart</div>
          ) : (
            items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                mainColor={mainColor}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
        <div className="border-top p-3" style={{ borderColor: `${mainColor}20` }}>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Subtotal</span>
            <span className="fw-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">Shipping</span>
            <span className="fw-semibold">{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div className="d-flex justify-content-between mb-3">
            <span className="text-muted">Tax</span>
            <span className="fw-semibold">${tax.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between mb-3">
            <span className="fw-bold" style={{ color: mainColor }}>Total</span>
            <span className="fw-bold">${total.toFixed(2)}</span>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn flex-fill"
              style={{ backgroundColor: mainColor, color: 'white', borderRadius: '8px' }}
              onClick={() => onNavigateToCheckout && onNavigateToCheckout()}
              disabled={items.length === 0}
            >
              Checkout
            </button>
            <button
              className="btn flex-fill btn-outline-secondary"
              onClick={() => onNavigateToCartPage && onNavigateToCartPage()}
            >
              View Full Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartDrawer
