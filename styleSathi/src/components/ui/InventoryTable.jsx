import { FaMinus, FaPlus, FaEdit, FaEyeSlash, FaEye, FaTrash, FaChartLine } from 'react-icons/fa'
import CloudinaryImage from './CloudinaryImage'

const InventoryTable = ({
  products = [],
  selectedProducts,
  sortConfig,
  mainColor = '#c4a62c',
  secondaryColor = '#2c67c4',
  onSort,
  onToggleSelectAll,
  onToggleSelection,
  updateStock,
  onEdit,
  onToggleStatus,
  onDelete,
  getStatusBadge,
  getStockBadge
}) => {
  return (
    <div className="table-responsive">
      <table className="table table-sm table-hover table-striped align-middle mb-0" style={{ fontSize: '0.92rem' }}>
        <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <tr>
            <th className="ps-4" style={{ width: '48px' }}>
              <input
                type="checkbox"
                checked={selectedProducts.size === products.length && products.length > 0}
                onChange={onToggleSelectAll}
                className="form-check-input"
              />
            </th>
            <th
              className="cursor-pointer"
              onClick={() => onSort('name')}
            >
              Product {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th style={{ width: '120px' }}>SKU</th>
            <th style={{ width: '160px' }}>Category</th>
            <th
              className="cursor-pointer"
              onClick={() => onSort('price')}
            >
              Price {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => onSort('stock')}
            >
              Stock {sortConfig.key === 'stock' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th>Status</th>
            <th
              className="cursor-pointer"
              onClick={() => onSort('sales')}
            >
              Sales {sortConfig.key === 'sales' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className="cursor-pointer"
              onClick={() => onSort('revenue')}
            >
              Revenue {sortConfig.key === 'revenue' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </th>
            <th className="pe-4" style={{ width: '160px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const statusBadge = getStatusBadge(product.status, product.stock)
            const stockBadge = getStockBadge(product.stock)
            const StatusIcon = statusBadge.icon

            return (
              <tr key={product.id}>
                <td className="ps-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => onToggleSelection(product.id)}
                    className="form-check-input"
                  />
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <div className="bg-light rounded overflow-hidden flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                      <CloudinaryImage
                        src={product.image}
                        alt={product.name}
                        className="w-100 h-100 object-fit-cover"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div className="text-truncate" style={{ maxWidth: '320px' }}>
                      <h6 className="fw-semibold mb-0 text-truncate">{product.name}</h6>
                      <small className="text-muted text-truncate">{product.brand}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <code>{product.sku}</code>
                </td>
                <td>
                  <span
                    className="badge text-uppercase"
                    style={{
                      backgroundColor: `${mainColor}15`,
                      color: mainColor
                    }}
                  >
                    {product.category}
                  </span>
                </td>
                <td>
                  <div>
                    <strong style={{ color: secondaryColor }}>
                      ${product.price.toFixed(2)}
                    </strong>
                    {product.originalPrice > product.price && (
                      <div>
                        <small className="text-muted text-decoration-line-through">
                          ${product.originalPrice.toFixed(2)}
                        </small>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${stockBadge.class}`}>
                      {stockBadge.text}
                    </span>
                    <span className="fw-semibold">{product.stock}</span>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary p-1 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '28px', height: '28px' }}
                        onClick={() => updateStock(product.id, product.stock - 1)}
                        disabled={product.stock <= 0}
                        title="Decrease stock"
                      >
                        <FaMinus size={10} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary p-1 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: '28px', height: '28px' }}
                        onClick={() => updateStock(product.id, product.stock + 1)}
                        title="Increase stock"
                      >
                        <FaPlus size={10} />
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${statusBadge.class} d-flex align-items-center gap-1`}>
                    <StatusIcon size={10} />
                    {statusBadge.text}
                  </span>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <strong>{product.sales}</strong>
                    <FaChartLine size={12} className="text-success" />
                  </div>
                </td>
                <td>
                  <strong style={{ color: secondaryColor }}>
                    ${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </td>
                <td className="pe-4">
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-primary p-2 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => onEdit(product)}
                      title="Edit product"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary p-2 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => onToggleStatus(product.id)}
                      title={product.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {product.status === 'active' ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger p-2 rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width: '36px', height: '36px' }}
                      onClick={() => onDelete(product.id)}
                      title="Delete product"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default InventoryTable
