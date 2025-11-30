import TryOnBase from './TryOnBase';

const HandTryOn = ({ product, onClose }) => {
  const overlaySrc = product?.overlay_image || product?.image_url || product?.image || null;
  return <TryOnBase overlaySrc={overlaySrc} mode="hand" onClose={onClose} />;
};

export default HandTryOn;
