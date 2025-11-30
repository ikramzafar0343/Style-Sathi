import { useState, useEffect } from 'react'
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { authApi } from '../services/api'
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaLock,
  FaEnvelope,
  FaCog,
  FaChartLine
} from "react-icons/fa";
import { FaShield } from "react-icons/fa6";
const AdminLogin = ({ 
  onNavigateToUserLogin, 
  onNavigateToForgot, 
  onLoginSuccess, 
  error: externalError 
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Update error when external error changes
  useEffect(() => {
    if (externalError) {
      setError(externalError)
    }
  }, [externalError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!username || !password) {
      setError('Please enter both username and password')
      setIsLoading(false)
      return
    }

    try {
      const resp = await authApi.adminLogin({ email: username, password })
      onLoginSuccess && onLoginSuccess('admin', resp)
    } catch {
      setError('Invalid admin credentials')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-dark">
      {/* Fixed Size Admin Login Container */}
      <div 
        className="bg-white rounded-3 shadow-lg p-4 position-relative"
        style={{ 
          width: '420px',
          minHeight: '520px',
          maxWidth: '90vw'
        }}
      >
        {/* Admin Logo */}
        <div className="text-center mb-4">
          <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
               style={{ width: '60px', height: '60px' }}>
            <FaShield className="text-white fs-4" />
          </div>
          <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '40px' }} />
          <p className="text-muted small">Admin Portal</p>
        </div>

        {/* Welcome Heading */}
        <h2 className="fw-bold text-primary mb-3 text-center fs-4">
          Admin Access
        </h2>
        <p className="text-muted text-center mb-4 small">Secure administrator login</p>

        {/* Security Notice */}
        <div className="alert alert-info d-flex align-items-center mb-4 py-2" role="alert">
          <FaShield className="me-2 text-primary" />
          <small className="fw-semibold">Restricted Access - Authorized Personnel Only</small>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center mb-3 py-2" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <small>{error}</small>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="row align-items-center mb-3">
            <div className="col-4">
              <label htmlFor="username" className="form-label text-muted fw-semibold mb-0 small">
                <FaUser className="me-1 text-primary" />
                Username
              </label>
            </div>
            <div className="col-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-primary py-2">
                  <FaUser className="text-primary" />
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  className="form-control border-primary py-2"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div className="row align-items-center mb-3">
            <div className="col-4">
              <label htmlFor="password" className="form-label text-muted fw-semibold mb-0 small">
                <FaLock className="me-1 text-primary" />
                Password
              </label>
            </div>
            <div className="col-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-primary py-2">
                  <FaLock className="text-primary" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="form-control border-primary py-2"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-group-text bg-white border-primary py-2"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <FaEyeSlash className="text-primary" /> : <FaEye className="text-primary" />}
                </button>
              </div>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="row align-items-center mb-4">
            <div className="col-6">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="remember"
                  name="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="form-check-input"
                />
                <label htmlFor="remember" className="form-check-label text-muted small">
                  Remember me
                </label>
              </div>
            </div>
            <div className="col-6 text-end">
              <button
                type="button"
                onClick={onNavigateToForgot}
                className="btn btn-link text-primary p-0 text-decoration-none small"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-100 py-2 fw-semibold mb-3"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Verifying Admin Access...
              </>
            ) : (
              <>
                <FaShield className="me-2" />
                Login as Admin
              </>
            )}
          </button>
        </form>

        {/* Admin Features Preview */}
        <div className="border-top pt-3 mt-3">
          <h6 className="text-muted text-center mb-3 small fw-semibold">Admin Capabilities</h6>
          <div className="row text-center g-2">
            <div className="col-4">
              <div className="border rounded p-2">
                <FaUser className="text-primary mb-1 small" />
                <div className="small text-muted">User Management</div>
              </div>
            </div>
            <div className="col-4">
              <div className="border rounded p-2">
                <FaChartLine className="text-primary mb-1 small" />
                <div className="small text-muted">Analytics</div>
              </div>
            </div>
            <div className="col-4">
              <div className="border rounded p-2">
                <FaCog className="text-primary mb-1 small" />
                <div className="small text-muted">System Settings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to User Login */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={onNavigateToUserLogin}
            className="btn btn-outline-secondary w-100 py-2 small"
          >
            ← Back to User Login
          </button>
        </div>

        {/* Security Footer */}
        <div className="text-center mt-3">
          <p className="text-muted mb-0 small">
            <FaShield className="me-1" />
            Secure Admin Portal • v1.0
          </p>
        </div>
      </div>

      <style>{`
        .text-primary { color: #0d6efd !important; }
        .bg-primary { background-color: #0d6efd !important; }
        .border-primary { border-color: #0d6efd !important; }
        .btn-primary { 
          background-color: #0d6efd; 
          color: white; 
          border: none;
        }
        .btn-primary:hover { 
          background-color: #0b5ed7; 
          color: white; 
        }
        .btn-outline-primary {
          border-color: #0d6efd;
          color: #0d6efd;
        }
        .btn-outline-primary:hover {
          background-color: #0d6efd;
          color: white;
        }
        .form-check-input:checked {
          background-color: #0d6efd;
          border-color: #0d6efd;
        }
        .input-group-text {
          transition: all 0.3s ease;
        }
        .form-control:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
        }
        .small {
          font-size: 0.875rem;
        }
        .bg-dark {
          background-color: #1a1a1a !important;
        }
      `}</style>
    </div>
  )
}

export default AdminLogin
