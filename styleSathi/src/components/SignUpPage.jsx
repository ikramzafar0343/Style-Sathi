import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { authApi } from '../services/api'
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaUserTie,
  FaStore,
  FaArrowLeft,
  FaSpinner
} from "react-icons/fa";

const SignUpScreen = ({ 
  onNavigateToLogin, 
  onSignUpComplete, 
  isSellerSignUp = false,
  onNavigateToCustomerSignUp 
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState(isSellerSignUp ? 'seller' : 'customer')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  
  // Ensure role is set to seller when isSellerSignUp is true
  useEffect(() => {
    if (isSellerSignUp) {
      setRole('seller')
    }
  }, [isSellerSignUp])

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: ''
  })

  const validateForm = () => {
    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Seller-specific validations
    if (role === 'seller') {
      if (!formData.businessName.trim()) {
        newErrors.businessName = 'Business name is required'
      }
      if (!formData.businessType) {
        newErrors.businessType = 'Business type is required'
      }
    }

    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        businessName: formData.businessName,
        businessType: formData.businessType,
      }
      const resp = role === 'seller' ? await authApi.sellerSignup(payload) : await authApi.signup(payload)
      const parts = String(formData.fullName || '').trim().split(' ')
      const first_name = parts[0] || ''
      const last_name = parts.slice(1).join(' ')
      const enriched = {
        ...resp,
        user: {
          ...(resp?.user || {}),
          first_name,
          last_name,
          name: formData.fullName || `${first_name} ${last_name}`.trim(),
          username: (resp?.user?.username) || formData.email?.split('@')[0] || undefined,
          role: (resp?.user?.role) || role
        }
      }
      onSignUpComplete && onSignUpComplete(enriched)
    } catch (error) {
      console.error('Sign up error:', error)
      Swal.fire({ icon: 'error', title: 'Sign Up Failed', text: 'Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }


  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
      {/* Fixed Size Sign Up Container */}
      <div 
        className="bg-white rounded-3 shadow-sm p-4 position-relative"
        style={{ 
          width: '480px',
          minHeight: '720px',
          maxWidth: '90vw'
        }}
      >
        {/* Header with Back Button */}
        <div className="d-flex align-items-center mb-3">
          {isSellerSignUp && (
            <button
              type="button"
              onClick={onNavigateToCustomerSignUp}
              className="btn btn-link text-gold p-0 me-2"
              disabled={isLoading}
            >
              <FaArrowLeft className="fs-5" />
            </button>
          )}
          <div className="text-center flex-grow-1">
            <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '42px' }} />
            <p className="text-muted small">Your Fashion Companion</p>
          </div>
          {isSellerSignUp && <div style={{ width: '32px' }}></div>} {/* Spacer for alignment */}
        </div>

        {/* Header */}
        <h2 className="fw-bold text-gold mb-3 text-center fs-4">
          {isSellerSignUp ? 'Become a Seller' : 'Create your account'}
        </h2>
        <p className="text-muted text-center mb-4 small">
          {isSellerSignUp 
            ? 'Start selling on Style Sathi and reach thousands of customers' 
            : 'Start your fashion journey with Style Sathi'
          }
        </p>

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit}>
          {/* Full Name Field */}
          <div className="row align-items-center mb-3">
            <div className="col-4">
              <label htmlFor="fullName" className="form-label text-muted fw-semibold mb-0 small">
                <FaUser className="me-1 text-gold" />
                Full Name
              </label>
            </div>
            <div className="col-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-gold py-2">
                  <FaUser className="text-gold" />
                </span>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter full name"
                  className={`form-control border-gold py-2 ${errors.fullName ? 'is-invalid' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && <div className="invalid-feedback d-block small">{errors.fullName}</div>}
            </div>
          </div>

          {/* Email Address Field */}
          <div className="row align-items-center mb-3">
            <div className="col-4">
              <label htmlFor="email" className="form-label text-muted fw-semibold mb-0 small">
                <FaEnvelope className="me-1 text-gold" />
                Email
              </label>
            </div>
            <div className="col-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-gold py-2">
                  <FaEnvelope className="text-gold" />
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="name@example.com"
                  className={`form-control border-gold py-2 ${errors.email ? 'is-invalid' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && <div className="invalid-feedback d-block small">{errors.email}</div>}
            </div>
          </div>

          {/* Phone Number Field */}
          <div className="row align-items-center mb-3">
            <div className="col-4">
              <label htmlFor="phone" className="form-label text-muted fw-semibold mb-0 small">
                <FaPhone className="me-1 text-gold" />
                Phone
              </label>
            </div>
            <div className="col-8">
              <div className="row g-1">
                <div className="col-4">
                  <input
                    type="text"
                    value="+92-"
                    readOnly
                    className="form-control border-gold bg-light text-muted small py-2"
                    style={{ fontSize: '0.8rem' }}
                    disabled={isLoading}
                  />
                </div>
                <div className="col-8">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-gold py-2">
                      <FaPhone className="text-gold" />
                    </span>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Phone number"
                      className={`form-control border-gold py-2 ${errors.phone ? 'is-invalid' : ''}`}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
              {errors.phone && <div className="invalid-feedback d-block small">{errors.phone}</div>}
            </div>
          </div>

          {/* Seller-specific fields */}
          {role === 'seller' && (
            <>
              {/* Business Name Field */}
              <div className="row align-items-center mb-3">
                <div className="col-4">
                  <label htmlFor="businessName" className="form-label text-muted fw-semibold mb-0 small">
                    <FaStore className="me-1 text-gold" />
                    Business Name
                  </label>
                </div>
                <div className="col-8">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-gold py-2">
                      <FaStore className="text-gold" />
                    </span>
                    <input
                      type="text"
                      id="businessName"
                      name="businessName"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      placeholder="Enter business name"
                      className={`form-control border-gold py-2 ${errors.businessName ? 'is-invalid' : ''}`}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.businessName && <div className="invalid-feedback d-block small">{errors.businessName}</div>}
                </div>
              </div>

              {/* Business Type Field */}
              <div className="row align-items-center mb-3">
                <div className="col-4">
                  <label htmlFor="businessType" className="form-label text-muted fw-semibold mb-0 small">
                    Business Type
                  </label>
                </div>
                <div className="col-8">
                  <select
                    id="businessType"
                    name="businessType"
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className={`form-select border-gold py-2 ${errors.businessType ? 'is-invalid' : ''}`}
                    disabled={isLoading}
                  >
                    <option value="">Select business type</option>
                    <option value="individual">Individual</option>
                    <option value="retail">Retail Store</option>
                    <option value="wholesale">Wholesaler</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="online">Online Store</option>
                  </select>
                  {errors.businessType && <div className="invalid-feedback d-block small">{errors.businessType}</div>}
                </div>
              </div>
            </>
          )}

          {/* Create Password Field */}
          <div className="row align-items-center mb-3">
            <div className="col-4">
              <label htmlFor="password" className="form-label text-muted fw-semibold mb-0 small">
                <FaLock className="me-1 text-gold" />
                Password
              </label>
            </div>
            <div className="col-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-gold py-2">
                  <FaLock className="text-gold" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  className={`form-control border-gold py-2 ${errors.password ? 'is-invalid' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-group-text bg-white border-gold py-2"
                  aria-label="Toggle password visibility"
                  disabled={isLoading}
                >
                  {showPassword ? <FaEyeSlash className="text-gold" /> : <FaEye className="text-gold" />}
                </button>
              </div>
              <div className="mt-1">
                <p className="text-muted small mb-0">Min. 8 characters with mix of letters, numbers & symbols</p>
                {errors.password && <div className="invalid-feedback d-block small">{errors.password}</div>}
              </div>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="row align-items-center mb-3">
            <div className="col-4">
              <label htmlFor="confirmPassword" className="form-label text-muted fw-semibold mb-0 small">
                <FaLock className="me-1 text-gold" />
                Confirm Password
              </label>
            </div>
            <div className="col-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-gold py-2">
                  <FaLock className="text-gold" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className={`form-control border-gold py-2 ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="input-group-text bg-white border-gold py-2"
                  aria-label="Toggle password visibility"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <FaEyeSlash className="text-gold" /> : <FaEye className="text-gold" />}
                </button>
              </div>
              {errors.confirmPassword && <div className="invalid-feedback d-block small">{errors.confirmPassword}</div>}
            </div>
          </div>

          {/* Role Selection - Only show if not in seller signup mode */}
          {!isSellerSignUp && (
            <div className="row align-items-center mb-3">
              <div className="col-4">
                <label className="form-label text-muted fw-semibold mb-0 small">
                  Join as
                </label>
              </div>
              <div className="col-8">
                <div className="row g-2">
                  {/* Customer Card */}
                  <div className="col-6">
                    <div 
                      className={`card border-2 ${role === 'customer' ? 'border-gold bg-gold-light' : 'border-light'} cursor-pointer h-100`}
                      onClick={() => !isLoading && setRole('customer')}
                      style={{ minHeight: '80px' }}
                    >
                      <div className="card-body p-2 d-flex flex-column justify-content-center align-items-center text-center">
                        <FaUser className={`${role === 'customer' ? 'text-gold' : 'text-muted'} mb-1`} style={{ fontSize: '1.1rem' }} />
                        <div className="form-check mb-0 d-flex align-items-center">
                          <input
                            type="radio"
                            id="customer"
                            name="role"
                            value="customer"
                            checked={role === 'customer'}
                            onChange={(e) => !isLoading && setRole(e.target.value)}
                            className="form-check-input me-2"
                            style={{ transform: 'scale(0.9)' }}
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="customer"
                            className="form-check-label small cursor-pointer"
                          >
                            Customer
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Seller Card */}
                  <div className="col-6">
                    <div 
                      className={`card border-2 ${role === 'seller' ? 'border-gold bg-gold-light' : 'border-light'} cursor-pointer h-100`}
                      onClick={() => !isLoading && setRole('seller')}
                      style={{ minHeight: '80px' }}
                    >
                      <div className="card-body p-2 d-flex flex-column justify-content-center align-items-center text-center">
                        <FaUserTie className={`${role === 'seller' ? 'text-gold' : 'text-muted'} mb-1`} style={{ fontSize: '1.1rem' }} />
                        <div className="form-check mb-0 d-flex align-items-center">
                          <input
                            type="radio"
                            id="seller"
                            name="role"
                            value="seller"
                            checked={role === 'seller'}
                            onChange={(e) => !isLoading && setRole(e.target.value)}
                            className="form-check-input me-2"
                            style={{ transform: 'scale(0.9)' }}
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="seller"
                            className="form-check-label small cursor-pointer"
                          >
                            Seller
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms and Privacy Checkbox */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  checked={agreeToTerms}
                  onChange={(e) => !isLoading && setAgreeToTerms(e.target.checked)}
                  className={`form-check-input ${errors.terms ? 'is-invalid' : ''}`}
                  style={{ transform: 'scale(0.9)' }}
                  disabled={isLoading}
                />
                <label htmlFor="terms" className="form-check-label text-muted small">
                  I agree to STYLE SATHI's{' '}
                  <button type="button" className="btn btn-link text-gold p-0 text-decoration-none" onClick={() => Swal.fire({ icon: 'info', title: 'Terms of Service', text: 'Terms will be shown here' })}>
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" className="btn btn-link text-gold p-0 text-decoration-none" onClick={() => Swal.fire({ icon: 'info', title: 'Privacy Policy', text: 'Policy will be shown here' })}>
                    Privacy Policy
                  </button>
                </label>
                {errors.terms && <div className="invalid-feedback d-block small">{errors.terms}</div>}
              </div>
            </div>
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            className="btn btn-gold w-100 py-2 fw-semibold mb-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FaSpinner className="spinner-border spinner-border-sm me-2" />
                Creating Account...
              </>
            ) : (
              isSellerSignUp ? 'Become a Seller' : `Create ${role} Account`
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center">
          <p className="text-muted mb-0 small">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="btn btn-link text-gold p-0 text-decoration-none fw-semibold small"
              disabled={isLoading}
            >
              Log in
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .text-gold { color: #c4a62c !important; }
        .bg-gold { background-color: #c4a62c !important; }
        .bg-gold-light { background-color: rgba(196, 166, 44, 0.1) !important; }
        .border-gold { border-color: #c4a62c !important; }
        .btn-gold { 
          background-color: #c4a62c; 
          color: white; 
          border: none;
        }
        .btn-gold:hover:not(:disabled) { 
          background-color: #b39925; 
          color: white; 
        }
        .btn-gold:disabled {
          background-color: #e0d8a8;
          color: white;
        }
        .form-check-input:checked {
          background-color: #c4a62c;
          border-color: #c4a62c;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .form-control:focus {
          border-color: #c4a62c;
          box-shadow: 0 0 0 0.2rem rgba(196, 166, 44, 0.25);
        }
        .card:hover {
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        .small {
          font-size: 0.875rem;
        }
        .is-invalid {
          border-color: #dc3545 !important;
        }
        .invalid-feedback {
          display: block;
          width: 100%;
          margin-top: 0.25rem;
          font-size: 0.875rem;
          color: #dc3545;
        }
        .spinner-border-sm {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  )
}

export default SignUpScreen
