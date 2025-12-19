import { getProductImageUrl, resolveAssetUrl } from '../../services/api'

const CloudinaryImage = ({
  product,
  src,
  alt = '',
  className = '',
  style = {},
  width,
  height,
  fit = 'cover',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}) => {
  const url = (() => {
    if (product) return getProductImageUrl(product)
    const s = src || ''
    if (s.includes('res.cloudinary.com')) {
      const parts = s.split('/upload/')
      if (parts.length === 2) return `${parts[0]}/upload/f_auto,q_auto,w_600/${parts[1]}`
    }
    const r = resolveAssetUrl(s)
    return r || s
  })()
  const mergedStyle = { ...style, objectFit: fit, width, height }
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={mergedStyle}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        e.currentTarget.onerror = null;
        const ph = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width||200}" height="${height||200}"><rect width="100%" height="100%" fill="#f4f4f4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="14" font-family="Arial, Helvetica, sans-serif">Image unavailable</text></svg>`);
        e.currentTarget.src = ph;
      }}
      {...rest}
    />
  )
}

export default CloudinaryImage
