import TryOnBase from './TryOnBase'
import glassesImg from '../../assets/images/Glasses.png'

const GlassesTryon = ({ inline = true, width = 900, height = 500, overlaySrc, modelGlbUrl, applyMakeup = false }) => {
  return (
    <TryOnBase
      inline={inline}
      width={width}
      height={height}
      mode={'glasses'}
      overlaySrc={overlaySrc || glassesImg}
      modelGlbUrl={modelGlbUrl}
      applyMakeup={applyMakeup}
    />
  )
}

export default GlassesTryon
