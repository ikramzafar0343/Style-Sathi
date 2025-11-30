import TryOnBase from './TryOnBase';

const BodyTryOn = ({ product, onClose }) => {
  const overlaySrc = product?.overlay_image || product?.image_url || product?.image || null;
  return <TryOnBase overlaySrc={overlaySrc} mode="body" onClose={onClose} />;
};

export default BodyTryOn;
