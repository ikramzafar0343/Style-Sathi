import { useState } from 'react'
import { FaEnvelope, FaKey, FaLock, FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { authApi } from '../services/api'

const ForgotPassword = ({ onNavigateBack, onNavigateToLogin }) => {
  const mainColor = '#c4a62c'
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleRequest = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!email) {
      setError('Please enter your email.')
      return
    }
    setIsLoading(true)
    try {
      const resp = await authApi.requestPasswordReset({ email })
      setMessage(resp?.message || 'Reset instructions sent to your email.')
      setStep('reset')
    } catch (e) {
      setError(e.message || 'Failed to request password reset')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!token || !newPassword) {
      setError('Enter the token and new password.')
      return
    }
    setIsLoading(true)
    try {
      const resp = await authApi.resetPassword({ email, token, new_password: newPassword })
      setMessage(resp?.message || 'Password updated successfully.')
      setTimeout(() => onNavigateToLogin?.(), 1000)
    } catch (e) {
      setError(e.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
      <div className="card shadow-lg border-0 p-4" style={{ width: '480px', maxWidth: '95%', borderRadius: '14px' }}>
        <button className="btn btn-link text-decoration-none p-0 mb-3" onClick={onNavigateBack} style={{ color: mainColor }}>
          <FaArrowLeft /> Back
        </button>
        <h3 className="fw-bold mb-2" style={{ color: mainColor }}>Forgot Password</h3>
        <p className="text-muted small mb-4">Reset your account password securely</p>

        {error && (
          <div className="alert alert-danger py-2 small d-flex align-items-center"><FaExclamationTriangle className="me-2" />{error}</div>
        )}
        {message && (
          <div className="alert alert-success py-2 small d-flex align-items-center"><FaCheckCircle className="me-2" />{message}</div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest}>
            <div className="mb-3">
              <label className="form-label small fw-semibold"><FaEnvelope className="me-1" style={{ color: mainColor }} /> Email</label>
              <div className="input-group">
                <span className="input-group-text bg-white" style={{ borderColor: mainColor }}>
                  <FaEnvelope style={{ color: mainColor }} />
                </span>
                <input type="email" className="form-control" style={{ borderColor: mainColor }} placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn w-100 fw-semibold" style={{ backgroundColor: mainColor, color: '#fff' }} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <div className="mb-3">
              <label className="form-label small fw-semibold"><FaKey className="me-1" style={{ color: mainColor }} /> Token</label>
              <div className="input-group">
                <span className="input-group-text bg-white" style={{ borderColor: mainColor }}>
                  <FaKey style={{ color: mainColor }} />
                </span>
                <input type="text" className="form-control" style={{ borderColor: mainColor }} placeholder="Enter token from email" value={token} onChange={(e) => setToken(e.target.value)} />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label small fw-semibold"><FaLock className="me-1" style={{ color: mainColor }} /> New Password</label>
              <div className="input-group">
                <span className="input-group-text bg-white" style={{ borderColor: mainColor }}>
                  <FaLock style={{ color: mainColor }} />
                </span>
                <input type="password" className="form-control" style={{ borderColor: mainColor }} placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn w-100 fw-semibold" style={{ backgroundColor: mainColor, color: '#fff' }} disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
