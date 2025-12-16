import TryOnBase from './TryOnBase'

const HairTryon = ({
  product,
  inline = true,
  width = 900,
  height = 500,
  overlaySrc,
  modelGlbUrl,
  applyMakeup = false,
  onClose
}) => {
  const resolvedOverlay =
    overlaySrc ??
    product?.overlay_image ??
    product?.image_url ??
    (Array.isArray(product?.images) ? product.images[0] : null) ??
    product?.image ??
    '';
  const resolvedModel =
    modelGlbUrl ??
    product?.modelGlbUrl ??
    product?.model_glb_url ??
    '';
  return (
    <TryOnBase
      inline={inline}
      width={width}
      height={height}
      mode={'hair'}
      overlaySrc={resolvedOverlay}
      modelGlbUrl={resolvedModel}
      applyMakeup={applyMakeup}
      onClose={onClose}
    />
  )
}

export default HairTryon
