import TryOnBase from './TryOnBase';

const FaceTryOn = ({ product, onClose }) => {
  const overlaySrc = product?.overlay_image || product?.image_url || product?.image || null;
  return <TryOnBase overlaySrc={overlaySrc} mode="face" onClose={onClose} />;
};

export default FaceTryOn;
