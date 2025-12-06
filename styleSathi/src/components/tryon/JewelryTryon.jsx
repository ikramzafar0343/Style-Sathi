import TryOnBase from './TryOnBase'

const JewelryTryon = ({ inline = true, width = 900, height = 500, overlaySrc, modelGlbUrl, applyMakeup = false }) => {
  return (
    <TryOnBase
      inline={inline}
      width={width}
      height={height}
      mode={'jewelry'}
      overlaySrc={overlaySrc}
      modelGlbUrl={modelGlbUrl}
      applyMakeup={applyMakeup}
    />
  )
}

export default JewelryTryon
