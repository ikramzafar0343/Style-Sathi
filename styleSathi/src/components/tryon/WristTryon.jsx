import TryOnBase from './TryOnBase'
import watchImg from '../../assets/images/watch.png'

const WristTryon = ({ inline = true, width = 900, height = 500, overlaySrc, modelGlbUrl, applyMakeup = false }) => {
  return (
    <TryOnBase
      inline={inline}
      width={width}
      height={height}
      mode={'wrist'}
      overlaySrc={overlaySrc || watchImg}
      modelGlbUrl={modelGlbUrl}
      applyMakeup={applyMakeup}
    />
  )
}

export default WristTryon
