import styleSathiLogo from '../../assets/styleSathiLogo.svg'
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
      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = styleSathiLogo }}
      {...rest}
    />
  )
}

export default CloudinaryImage
