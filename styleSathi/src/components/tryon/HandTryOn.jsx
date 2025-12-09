import TryOnBase from './TryOnBase';

const HandTryOn = ({ product, onClose }) => {
  const overlaySrc = product?.overlay_image || product?.image_url || (Array.isArray(product?.images) ? product.images[0] : null) || product?.image || null;
  return <TryOnBase overlaySrc={overlaySrc} mode="hand" onClose={onClose} />;
};

export default HandTryOn;
