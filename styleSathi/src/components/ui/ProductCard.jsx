import { FaSearchPlus } from 'react-icons/fa'
import { BsStarFill } from 'react-icons/bs'
import CloudinaryImage from './CloudinaryImage'

const ProductCard = ({
  product,
  viewMode = 'grid',
  mainColor = '#c4a62c',
  secondaryColor = '#2c67c4',
  onNavigateToProductDetail,
  onAddToCart,
  onNavigateToAR
}) => {
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <BsStarFill 
        key={i} 
        style={{ 
          color: i < Math.floor(rating || 0) ? mainColor : '#e0e0e0',
          fontSize: '14px'
        }} 
      />
    ))
  }
  return (
    <div 
      className={`card product-card h-100 border-0 shadow-sm ${viewMode === 'list' ? 'flex-row' : ''}`}
      style={{
        transition: 'all 0.3s ease',
        borderRadius: '15px',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: product.inStock ? 1 : 0.7
      }}
      onMouseEnter={(e) => {
        if (product.inStock) {
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.boxShadow = `0 10px 30px ${mainColor}15`
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
      }}
      onClick={() => product.inStock && onNavigateToProductDetail && onNavigateToProductDetail(product.id, product)}
    >
      <div
        className={viewMode === 'list' ? "col-md-4 position-relative" : "position-relative"}
        style={{ 
          height: viewMode === 'grid' ? '250px' : '200px',
          overflow: 'hidden'
        }}
      >
        <CloudinaryImage
          product={product}
          alt={product.title}
          className="w-100 h-100 object-fit-cover"
          style={{ 
            transition: 'transform 0.3s ease',
            filter: !product.inStock ? 'grayscale(50%)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (product.inStock) {
              e.target.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
          }}
        />
        {product.originalPrice && (
          <div
            className="position-absolute top-0 end-0 m-2 px-2 py-1 rounded"
            style={{ 
              backgroundColor: '#dc3545', 
              color: 'white', 
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}
          >
            Save {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
          </div>
        )}
        {!product.inStock && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <span 
              className="text-white fw-bold px-3 py-2 rounded"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            >
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className={viewMode === 'list' ? "col-md-8 card-body" : "card-body"}>
        <p className="small text-muted mb-1">{product.brand}</p>
        <h6 className="fw-semibold mb-2" style={{ color: mainColor }}>
          {product.title}
        </h6>
        <div className="d-flex align-items-center gap-2 mb-2">
          <div className="d-flex gap-1">
            {renderStars(product.rating)}
          </div>
          <small className="text-muted">({product.rating || 0})</small>
        </div>
        <div className="d-flex align-items-center gap-2 mb-3">
          <p className="h5 fw-bold mb-0" style={{ color: secondaryColor }}>
            ${product.price}
          </p>
          {product.originalPrice && (
            <span className="text-muted text-decoration-line-through small">
              ${product.originalPrice}
            </span>
          )}
          <span 
            className="badge ms-auto"
            style={{ 
              backgroundColor: mainColor, 
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            {(() => {
              const cat = product.category
              if (typeof cat === 'object' && cat) {
                return cat.name || cat.title || JSON.stringify(cat)
              }
              return cat || 'Uncategorized'
            })()}
          </span>
        </div>
        <div className="mb-3">
          <small className={product.inStock ? "text-success" : "text-danger"}>
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </small>
        </div>
        {viewMode === 'list' && (
          <div>
            <p className="text-muted small mb-3">
              {product.description}
            </p>
            <div className="mb-3">
              <small className="fw-semibold">Features:</small>
              <div className="d-flex flex-wrap gap-1 mt-1">
                {(Array.isArray(product.features) ? product.features : []).map((feature, index) => (
                  <span 
                    key={index}
                    className="badge"
                    style={{ 
                      backgroundColor: mainColor + '20',
                      color: mainColor,
                      fontSize: '0.65rem'
                    }}
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => onAddToCart && onAddToCart(product, e)}
            className="btn flex-fill py-2"
            disabled={!product.inStock}
            style={{ 
              backgroundColor: product.inStock ? mainColor : '#cccccc', 
              color: "#fff",
              borderRadius: '25px',
              fontWeight: '500',
              border: 'none',
              fontSize: '0.9rem',
              cursor: product.inStock ? 'pointer' : 'not-allowed'
            }}
          >
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onNavigateToAR && product.inStock) onNavigateToAR(product)
            }}
            disabled={!product.inStock}
            className="btn flex-fill py-2 d-flex align-items-center justify-content-center gap-1"
            style={{ 
              border: `2px solid ${product.inStock ? mainColor : '#cccccc'}`, 
              color: product.inStock ? mainColor : '#cccccc',
              borderRadius: '25px',
              fontWeight: '500',
              backgroundColor: 'transparent',
              fontSize: '0.9rem',
              cursor: product.inStock ? 'pointer' : 'not-allowed'
            }}
          >
            <FaSearchPlus /> AR
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
