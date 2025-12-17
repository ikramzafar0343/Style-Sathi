import { FaPlus, FaTimes } from 'react-icons/fa'
import CloudinaryImage from './CloudinaryImage'

const ProductForm = ({
  product,
  formData,
  categories = [],
  newFeature,
  mainColor = '#c4a62c',
  onChange,
  onAddFeature,
  onRemoveFeature,
  onNewFeatureChange
}) => {
  return (
    <div className="row">
      <div className="col-md-4 text-center">
        <CloudinaryImage
          src={product.image}
          alt={product.name}
          className="img-fluid rounded mb-3"
          style={{ maxHeight: '200px', objectFit: 'cover' }}
        />
        <p className="text-muted small">Product Image</p>
        <div className="mt-4">
          <h6 className="fw-semibold">Product Stats</h6>
          <div className="list-group list-group-flush small">
            <div className="list-group-item d-flex justify-content-between px-0">
              <span>SKU:</span>
              <code>{product.sku}</code>
            </div>
            <div className="list-group-item d-flex justify-content-between px-0">
              <span>Sales:</span>
              <strong>{product.sales}</strong>
            </div>
            <div className="list-group-item d-flex justify-content-between px-0">
              <span>Revenue:</span>
              <strong>${product.revenue.toLocaleString()}</strong>
            </div>
            <div className="list-group-item d-flex justify-content-between px-0">
              <span>Rating:</span>
              <strong>{product.rating} ⭐</strong>
            </div>
            <div className="list-group-item d-flex justify-content-between px-0">
              <span>Reviews:</span>
              <strong>{product.reviews}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-8">
        <div className="mb-3">
          <label className="form-label fw-semibold">Product Name *</label>
          <input
            type="text"
            className="form-control"
            value={formData.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Enter product name"
          />
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Current Price *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={formData.price}
              onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Original Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={formData.originalPrice}
              onChange={(e) => onChange({ originalPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Brand *</label>
            <input
              type="text"
              className="form-control"
              value={formData.brand}
              onChange={(e) => onChange({ brand: e.target.value })}
              placeholder="Enter brand name"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Category *</label>
            <select
              className="form-select"
              value={formData.category}
              onChange={(e) => onChange({ category: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Weight</label>
            <input
              type="text"
              className="form-control"
              value={formData.weight}
              onChange={(e) => onChange({ weight: e.target.value })}
              placeholder="e.g., 0.5 kg"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Dimensions</label>
            <input
              type="text"
              className="form-control"
              value={formData.dimensions}
              onChange={(e) => onChange({ dimensions: e.target.value })}
              placeholder="e.g., 10x5x3 cm"
            />
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Description</label>
          <textarea
            className="form-control"
            rows="4"
            value={formData.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Enter product description..."
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Features</label>
          <div className="d-flex gap-2 mb-2">
            <input
              type="text"
              className="form-control"
              placeholder="Add a feature..."
              value={newFeature}
              onChange={(e) => onNewFeatureChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onAddFeature()}
            />
            <button
              className="btn"
              style={{ backgroundColor: mainColor, color: 'white' }}
              onClick={onAddFeature}
            >
              <FaPlus />
            </button>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {formData.features.map((feature, index) => (
              <span
                key={index}
                className="badge d-flex align-items-center gap-1"
                style={{ backgroundColor: `${mainColor}15`, color: mainColor }}
              >
                {feature}
                <button
                  type="button"
                  className="btn btn-sm p-0"
                  style={{ color: mainColor }}
                  onClick={() => onRemoveFeature(index)}
                >
                  <FaTimes size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            checked={formData.inStock}
            onChange={(e) => onChange({ inStock: e.target.checked })}
            style={{ backgroundColor: formData.inStock ? mainColor : '#6c757d' }}
          />
          <label className="form-check-label fw-semibold">
            Product Available for Sale
          </label>
        </div>
      </div>
    </div>
  )
}

export default ProductForm
