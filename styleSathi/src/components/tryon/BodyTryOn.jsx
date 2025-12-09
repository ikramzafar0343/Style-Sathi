import TryOnBase from './TryOnBase';

const BodyTryOn = ({ product, onClose }) => {
  const overlaySrc = product?.overlay_image || product?.image_url || (Array.isArray(product?.images) ? product.images[0] : null) || product?.image || null;
  return <TryOnBase overlaySrc={overlaySrc} mode="body" onClose={onClose} />;
};

export default BodyTryOn;
