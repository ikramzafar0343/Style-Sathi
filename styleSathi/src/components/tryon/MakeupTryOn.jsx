import TryOnBase from './TryOnBase'

const MakeupTryOn = ({ onClose }) => {
  return <TryOnBase mode="makeup" inline width={900} height={500} onClose={onClose} />
}

export default MakeupTryOn
