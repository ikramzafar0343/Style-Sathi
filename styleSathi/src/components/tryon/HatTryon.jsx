import TryOnBase from './TryOnBase'

const HatTryon = ({ inline = true, width = 900, height = 500, overlaySrc, modelGlbUrl, applyMakeup = false }) => {
  return (
    <TryOnBase
      inline={inline}
      width={width}
      height={height}
      mode={'hat'}
      overlaySrc={overlaySrc}
      modelGlbUrl={modelGlbUrl}
      applyMakeup={applyMakeup}
    />
  )
}

export default HatTryon
