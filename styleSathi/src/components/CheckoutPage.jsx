import { useState, useRef } from 'react'
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import {
  FaShoppingCart,
  FaUser,
  FaArrowLeft,
  FaTruck,
  FaShieldAlt,
  FaCreditCard,
  FaPaypal,
  FaMobileAlt,
  FaCheckCircle,
  FaPlus,
  FaTrash,
  FaSignOutAlt,
  FaSearch
} from "react-icons/fa";

const CheckoutPage = ({ 
  onNavigateBack, 
  onNavigateToCart,
  onNavigateToAccountSettings,
  onConfirmOrder,
  onLogout,
  cartItems = [],
  currentUser = {}
}) => {
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [savedAddresses, setSavedAddresses] = useState([])
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const profileDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    fullName: currentUser?.name || '',
    email: currentUser?.email || '',
    phoneNumber: '',
    cnic: '',
    streetAddress: '',
    city: '',
    zipCode: '',
    country: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
  })

  const [newAddress, setNewAddress] = useState({
    type: 'Home',
    fullName: currentUser?.name || '',
    email: currentUser?.email || '',
    phoneNumber: '',
    cnic: '',
    streetAddress: '',
    city: '',
    zipCode: '',
    country: '',
    isDefault: false
  })

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNewAddressChange = (field, value) => {
    setNewAddress((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddNewAddress = () => {
    if (!newAddress.fullName || !newAddress.email || !newAddress.phoneNumber || !newAddress.cnic || !newAddress.streetAddress || !newAddress.city || !newAddress.zipCode || !newAddress.country) {
      alert('Please fill in all required fields')
      return
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(newAddress.phoneNumber)) {
      alert('Please enter a valid phone number');
      return;
    }

    // Validate CNIC (basic validation for 13 digits)
    const cnicRegex = /^\d{13}$/;
    if (!cnicRegex.test(newAddress.cnic.replace(/\D/g, ''))) {
      alert('Please enter a valid 13-digit CNIC number');
      return;
    }

    const newAddressWithId = {
      ...newAddress,
      id: Date.now(), // Use timestamp for unique ID
      cnic: newAddress.cnic.replace(/\D/g, '') // Remove non-digits from CNIC
    }

    setSavedAddresses(prev => [...prev, newAddressWithId])
    setSelectedAddressId(newAddressWithId.id)
    setShowAddAddress(false)
    
    // Also update form data with new address
    setFormData(prev => ({
      ...prev,
      fullName: newAddress.fullName,
      email: newAddress.email,
      phoneNumber: newAddress.phoneNumber,
      cnic: newAddress.cnic,
      streetAddress: newAddress.streetAddress,
      city: newAddress.city,
      zipCode: newAddress.zipCode,
      country: newAddress.country
    }))
    
    // Reset new address form
    setNewAddress({
      type: 'Home',
      fullName: currentUser?.name || '',
      email: currentUser?.email || '',
      phoneNumber: '',
      cnic: '',
      streetAddress: '',
      city: '',
      zipCode: '',
      country: '',
      isDefault: false
    })
  }

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId)
    const selectedAddress = savedAddresses.find(addr => addr.id === addressId)
    if (selectedAddress) {
      setFormData(prev => ({
        ...prev,
        fullName: selectedAddress.fullName,
        email: selectedAddress.email,
        phoneNumber: selectedAddress.phoneNumber,
        cnic: selectedAddress.cnic,
        streetAddress: selectedAddress.streetAddress,
        city: selectedAddress.city,
        zipCode: selectedAddress.zipCode,
        country: selectedAddress.country
      }))
    }
  }

  const handleDeleteAddress = (addressId, e) => {
    e.stopPropagation()
    if (savedAddresses.length <= 1) {
      alert('You must have at least one saved address')
      return
    }
    
    setSavedAddresses(prev => prev.filter(addr => addr.id !== addressId))
    if (selectedAddressId === addressId) {
      const remainingAddress = savedAddresses.find(addr => addr.id !== addressId)
      setSelectedAddressId(remainingAddress?.id || null)
    }
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const q = String(searchQuery || '').trim();
      if (!q) return;
      try { sessionStorage.setItem('globalSearchQuery', q); } catch { void 0; }
      onNavigateBack && onNavigateBack();
    }
  }

  // Calculate order summary from cartItems
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.price * (item.quantity || 1)),
    0
  )
  const shipping = subtotal > 100 ? 0 : 9.99 // Free shipping over $100
  const tax = (subtotal * 0.08).toFixed(2)
  const total = subtotal + shipping + parseFloat(tax)

  const cartItemsCount = cartItems.reduce((count, item) => count + (item.quantity || 1), 0)

  const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId)

  const handleSubmitOrder = (e) => {
    e.preventDefault()
    
    // Validate form data
    const requiredFields = ['fullName', 'email', 'phoneNumber', 'cnic', 'streetAddress', 'city', 'zipCode', 'country'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      alert('Please fill in all required fields')
      return
    }
    
    // Validate phone number
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      alert('Please enter a valid phone number');
      return;
    }

    // Validate CNIC
    const cnicRegex = /^\d{13}$/;
    if (!cnicRegex.test(formData.cnic.replace(/\D/g, ''))) {
      alert('Please enter a valid 13-digit CNIC number');
      return;
    }
    
    if (paymentMethod === 'card' && (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.nameOnCard)) {
      alert('Please fill in all card details')
      return
    }
    
    // Proceed with order confirmation
    onConfirmOrder({
      shippingAddress: {
        ...formData,
        cnic: formData.cnic.replace(/\D/g, '') // Clean CNIC format
      },
      paymentMethod: paymentMethod,
      orderItems: cartItems,
      total: total,
      selectedAddress: selectedAddress
    })
  }

  const mainColor = "#c4a62c";
  const secondaryColor = "#2c67c4";

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="sticky-top bg-white border-bottom shadow-sm">
        <div className="container py-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <img 
                src={styleSathiLogo}
                alt="STYLE SATHI"
                style={{ height: '40px', cursor: 'pointer' }}
                onClick={onNavigateBack}
              />
            </div>

            <div className="col-md-6">
              <div className="position-relative">
                <input
                  className="form-control ps-5 py-2"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  style={{
                    borderColor: mainColor,
                    borderRadius: '25px',
                    fontSize: '0.9rem'
                  }}
                />
                <FaSearch
                  className="position-absolute top-50 start-0 translate-middle-y ms-3"
                  style={{ color: mainColor }}
                />
              </div>
            </div>

            <div className="col-md-3">
              <div className="d-flex align-items-center justify-content-end gap-4">
                {/* Cart */}
                <div
                  className="position-relative cursor-pointer hover-scale"
                  onClick={onNavigateToCart}
                  style={{ transition: 'transform 0.2s' }}
                >
                  <FaShoppingCart style={{ fontSize: '24px', color: mainColor }} />
                  {cartItemsCount > 0 && (
                    <span
                      className="badge rounded-pill position-absolute top-0 start-100 translate-middle"
                      style={{
                        backgroundColor: secondaryColor,
                        color: 'white',
                        fontSize: '0.7rem',
                        minWidth: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {cartItemsCount}
                    </span>
                  )}
                </div>

                {/* Profile */}
                <div className="position-relative" ref={profileDropdownRef}>
                  <div
                    className="d-flex align-items-center gap-2 cursor-pointer hover-scale"
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    style={{ transition: 'transform 0.2s' }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center border"
                      style={{
                        width: '45px',
                        height: '45px',
                        backgroundColor: mainColor + '20',
                        borderColor: mainColor + '50'
                      }}
                    >
                      <FaUser style={{ color: mainColor, fontSize: '18px' }} />
                    </div>
                    <div className="d-none d-md-block">
                      <span style={{ color: mainColor, fontWeight: '500' }}>
                        {currentUser?.name || 'Customer'}
                      </span>
                    </div>
                  </div>

                  {showProfileDropdown && (
                    <div
                      className="position-absolute bg-white shadow rounded end-0 mt-2 py-2"
                      style={{
                        minWidth: '160px',
                        zIndex: 1000,
                        border: `1px solid ${mainColor}20`
                      }}
                    >
                      <button
                        className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
                        style={{ color: mainColor, fontSize: '0.9rem' }}
                        onClick={() => {
                          onNavigateToAccountSettings()
                          setShowProfileDropdown(false)
                        }}
                      >
                        <FaUser size={14} /> Profile
                      </button>
                      <button
                        className="btn text-start w-100 px-3 py-2 d-flex align-items-center gap-2"
                        style={{ color: '#dc3545', fontSize: '0.9rem' }}
                        onClick={() => {
                          onLogout()
                          setShowProfileDropdown(false)
                        }}
                      >
                        <FaSignOutAlt size={14} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-5">
        {/* Progress Indicator */}
        <div className="row justify-content-center mb-5">
          <div className="col-md-8">
            <div className="d-flex align-items-center justify-content-between position-relative">
              <div className="progress position-absolute w-100" style={{ height: '2px', top: '15px', zIndex: 0 }}>
                <div 
                  className="progress-bar" 
                  style={{ 
                    width: '66%',
                    backgroundColor: mainColor
                  }}
                ></div>
              </div>
              
              {[
                { step: 1, label: 'Cart', active: true },
                { step: 2, label: 'Checkout', active: true },
                { step: 3, label: 'Confirmation', active: false }
              ].map(({ step, label, active }) => (
                <div key={step} className="d-flex flex-column align-items-center position-relative" style={{ zIndex: 1 }}>
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center ${
                      active ? 'text-white' : 'bg-light border text-muted'
                    }`}
                    style={{ 
                      width: '32px', 
                      height: '32px',
                      backgroundColor: active ? mainColor : '',
                      borderColor: mainColor
                    }}
                  >
                    {active ? <FaCheckCircle /> : step}
                  </div>
                  <span className={`small mt-1 ${active ? 'fw-bold' : 'text-muted'}`} style={{ color: active ? mainColor : '' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className="text-center mb-5">
          <h2 className="fw-bold mb-2" style={{ color: mainColor }}>Checkout</h2>
          <p className="text-muted">Complete your purchase with Style Sathi</p>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-5">
            <div className="card border-0 shadow-sm py-5">
              <div className="card-body">
                <h4 style={{ color: mainColor }}>Your cart is empty</h4>
                <p className="text-muted mb-4">Add some items to your cart before proceeding to checkout</p>
                <button 
                  onClick={onNavigateToCart}
                  className="btn"
                  style={{ 
                    backgroundColor: mainColor, 
                    color: 'white',
                    borderRadius: '10px'
                  }}
                >
                  Back to Shopping
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {/* Left Column - Forms */}
            <div className="col-lg-8">
              {/* Delivery Address Section */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4" style={{ color: mainColor }}>
                    <FaTruck className="me-2" />
                    Delivery Address
                  </h4>

                  {/* Saved Addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="mb-4">
                      <label className="form-label text-muted">Select saved address</label>
                      <div className="row g-3">
                        {savedAddresses.map((address) => (
                          <div key={address.id} className="col-12">
                            <div 
                              className={`border rounded p-3 cursor-pointer ${selectedAddressId === address.id ? 'border-primary' : ''}`}
                              style={{ 
                                borderColor: selectedAddressId === address.id ? mainColor : '#dee2e6',
                                backgroundColor: selectedAddressId === address.id ? mainColor + '10' : 'transparent',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleAddressSelect(address.id)}
                            >
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <h6 className="fw-semibold mb-1">
                                    {address.type}
                                  </h6>
                                  <p className="mb-1 text-muted">{address.fullName}</p>
                                  <p className="mb-1 text-muted">{address.email}</p>
                                  <p className="mb-1 text-muted">Phone: {address.phoneNumber}</p>
                                  <p className="mb-1 text-muted">CNIC: {address.cnic}</p>
                                  <p className="mb-1 text-muted">{address.streetAddress}</p>
                                  <p className="mb-0 text-muted">{address.city}, {address.zipCode}, {address.country}</p>
                                </div>
                                <div className="d-flex gap-2">
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={(e) => handleDeleteAddress(address.id, e)}
                                    disabled={savedAddresses.length <= 1}
                                  >
                                    <FaTrash />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Address Form */}
                  {showAddAddress ? (
                    <div className="border rounded p-4 mb-4" style={{ borderColor: mainColor }}>
                      <h6 className="fw-semibold mb-3" style={{ color: mainColor }}>Add New Address</h6>
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label text-muted">Address Type</label>
                          <select
                            value={newAddress.type}
                            onChange={(e) => handleNewAddressChange('type', e.target.value)}
                            className="form-select"
                            style={{ borderColor: mainColor }}
                          >
                            <option value="Home">Home</option>
                            <option value="Work">Work</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label text-muted">Full Name *</label>
                          <input
                            type="text"
                            value={newAddress.fullName}
                            onChange={(e) => handleNewAddressChange('fullName', e.target.value)}
                            className="form-control"
                            placeholder="Enter your full name"
                            style={{ borderColor: mainColor }}
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label text-muted">Email *</label>
                          <input
                            type="email"
                            value={newAddress.email}
                            onChange={(e) => handleNewAddressChange('email', e.target.value)}
                            className="form-control"
                            placeholder="Enter your email"
                            style={{ borderColor: mainColor }}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">Phone Number *</label>
                          <input
                            type="tel"
                            value={newAddress.phoneNumber}
                            onChange={(e) => handleNewAddressChange('phoneNumber', e.target.value)}
                            className="form-control"
                            placeholder="Enter phone number"
                            style={{ borderColor: mainColor }}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">CNIC *</label>
                          <input
                            type="text"
                            value={newAddress.cnic}
                            onChange={(e) => handleNewAddressChange('cnic', e.target.value)}
                            className="form-control"
                            placeholder="Enter 13-digit CNIC"
                            style={{ borderColor: mainColor }}
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label text-muted">Street Address *</label>
                          <input
                            type="text"
                            value={newAddress.streetAddress}
                            onChange={(e) => handleNewAddressChange('streetAddress', e.target.value)}
                            className="form-control"
                            placeholder="Enter street address"
                            style={{ borderColor: mainColor }}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">City *</label>
                          <input
                            type="text"
                            value={newAddress.city}
                            onChange={(e) => handleNewAddressChange('city', e.target.value)}
                            className="form-control"
                            placeholder="Enter city"
                            style={{ borderColor: mainColor }}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted">ZIP Code *</label>
                          <input
                            type="text"
                            value={newAddress.zipCode}
                            onChange={(e) => handleNewAddressChange('zipCode', e.target.value)}
                            className="form-control"
                            placeholder="Enter ZIP code"
                            style={{ borderColor: mainColor }}
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label text-muted">Country *</label>
                          <select
                            value={newAddress.country}
                            onChange={(e) => handleNewAddressChange('country', e.target.value)}
                            className="form-select"
                            style={{ borderColor: mainColor }}
                            required
                          >
                            <option value="">Select country</option>
                            <option value="US">United States</option>
                            <option value="PK">Pakistan</option>
                            <option value="UK">United Kingdom</option>
                            <option value="CA">Canada</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <div className="d-flex gap-2">
                            <button
                              onClick={handleAddNewAddress}
                              className="btn"
                              style={{ 
                                backgroundColor: mainColor, 
                                color: 'white',
                                borderRadius: '10px'
                              }}
                            >
                              Save Address
                            </button>
                            <button
                              onClick={() => setShowAddAddress(false)}
                              className="btn btn-outline-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-link p-0 mt-3 d-flex align-items-center gap-2" 
                      style={{ color: mainColor }}
                      onClick={() => setShowAddAddress(true)}
                    >
                      <FaPlus />
                      Add New Address
                    </button>
                  )}

                  {/* Manual Address Form */}
                  <div className="mt-4">
                    <h6 className="fw-semibold mb-3" style={{ color: mainColor }}>Shipping Information</h6>
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label text-muted">Full Name *</label>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="form-control"
                          placeholder="Enter your full name"
                          style={{ borderColor: mainColor }}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label text-muted">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="form-control"
                          placeholder="Enter your email"
                          style={{ borderColor: mainColor }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted">Phone Number *</label>
                        <input
                          type="tel"
                          value={formData.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          className="form-control"
                          placeholder="Enter phone number"
                          style={{ borderColor: mainColor }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted">CNIC *</label>
                        <input
                          type="text"
                          value={formData.cnic}
                          onChange={(e) => handleInputChange('cnic', e.target.value)}
                          className="form-control"
                          placeholder="Enter 13-digit CNIC"
                          style={{ borderColor: mainColor }}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label text-muted">Street Address *</label>
                        <input
                          type="text"
                          value={formData.streetAddress}
                          onChange={(e) => handleInputChange('streetAddress', e.target.value)}
                          className="form-control"
                          placeholder="Enter street address"
                          style={{ borderColor: mainColor }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted">City *</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="form-control"
                          placeholder="Enter city"
                          style={{ borderColor: mainColor }}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted">ZIP Code *</label>
                        <input
                          type="text"
                          value={formData.zipCode}
                          onChange={(e) => handleInputChange('zipCode', e.target.value)}
                          className="form-control"
                          placeholder="Enter ZIP code"
                          style={{ borderColor: mainColor }}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label text-muted">Country *</label>
                        <select
                          value={formData.country}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className="form-select"
                          style={{ borderColor: mainColor }}
                          required
                        >
                          <option value="">Select country</option>
                          <option value="US">United States</option>
                          <option value="PK">Pakistan</option>
                          <option value="UK">United Kingdom</option>
                          <option value="CA">Canada</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="card shadow-sm border-0">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4" style={{ color: mainColor }}>
                    <FaCreditCard className="me-2" />
                    Payment Method
                  </h4>

                  <div className="row g-3">
                    {/* Credit/Debit Card */}
                    <div className="col-12">
                      <div className={`border rounded p-3 ${paymentMethod === 'card' ? 'bg-light' : ''}`} style={{ borderColor: paymentMethod === 'card' ? mainColor : '#dee2e6' }}>
                        <label className="form-check-label d-flex align-items-center gap-3 w-100">
                          <input
                            type="radio"
                            name="payment"
                            value="card"
                            checked={paymentMethod === 'card'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="form-check-input"
                            style={{ borderColor: mainColor }}
                          />
                          <span className="fw-semibold" style={{ color: mainColor }}>Credit/Debit Card</span>
                        </label>

                        {paymentMethod === 'card' && (
                          <div className="row g-3 mt-3">
                            <div className="col-12">
                              <label className="form-label text-muted">Card Number *</label>
                              <input
                                type="text"
                                value={formData.cardNumber}
                                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                                className="form-control"
                                placeholder="1234 5678 9012 3456"
                                style={{ borderColor: mainColor }}
                                required
                              />
                            </div>

                            <div className="col-md-6">
                              <label className="form-label text-muted">Expiry Date *</label>
                              <input
                                type="text"
                                value={formData.expiryDate}
                                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                                className="form-control"
                                placeholder="MM/YY"
                                style={{ borderColor: mainColor }}
                                required
                              />
                            </div>

                            <div className="col-md-6">
                              <label className="form-label text-muted">CVV *</label>
                              <input
                                type="text"
                                value={formData.cvv}
                                onChange={(e) => handleInputChange('cvv', e.target.value)}
                                className="form-control"
                                placeholder="123"
                                style={{ borderColor: mainColor }}
                                required
                              />
                            </div>

                            <div className="col-12">
                              <label className="form-label text-muted">Name on Card *</label>
                              <input
                                type="text"
                                value={formData.nameOnCard}
                                onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                                className="form-control"
                                placeholder="Enter name as shown on card"
                                style={{ borderColor: mainColor }}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PayPal */}
                    <div className="col-12">
                      <div className={`border rounded p-3 ${paymentMethod === 'paypal' ? 'bg-light' : ''}`} style={{ borderColor: paymentMethod === 'paypal' ? mainColor : '#dee2e6' }}>
                        <label className="form-check-label d-flex align-items-center gap-3 w-100">
                          <input
                            type="radio"
                            name="payment"
                            value="paypal"
                            checked={paymentMethod === 'paypal'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="form-check-input"
                            style={{ borderColor: mainColor }}
                          />
                          <FaPaypal style={{ color: mainColor }} />
                          <span className="fw-semibold" style={{ color: mainColor }}>PayPal</span>
                        </label>

                        {paymentMethod === 'paypal' && (
                          <div className="row g-3 mt-3">
                            <div className="col-12">
                              <label className="form-label text-muted">PayPal Email *</label>
                              <input
                                type="email"
                                className="form-control"
                                placeholder="Enter your PayPal email"
                                style={{ borderColor: mainColor }}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mobile Payment Options */}
                    {['jazzcash', 'easypaisa'].map((method) => (
                      <div className="col-12" key={method}>
                        <div className={`border rounded p-3 ${paymentMethod === method ? 'bg-light' : ''}`} style={{ borderColor: paymentMethod === method ? mainColor : '#dee2e6' }}>
                          <label className="form-check-label d-flex align-items-center gap-3 w-100">
                            <input
                              type="radio"
                              name="payment"
                              value={method}
                              checked={paymentMethod === method}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="form-check-input"
                              style={{ borderColor: mainColor }}
                            />
                            <FaMobileAlt style={{ color: mainColor }} />
                            <span className="fw-semibold text-capitalize" style={{ color: mainColor }}>
                              {method}
                            </span>
                          </label>

                          {paymentMethod === method && (
                            <div className="row g-3 mt-3">
                              <div className="col-12">
                                <label className="form-label text-muted">{method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Number *</label>
                                <input
                                  type="tel"
                                  className="form-control"
                                  placeholder={`Enter your ${method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} number`}
                                  style={{ borderColor: mainColor }}
                                  required
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="col-lg-4">
              <div className="card shadow-sm border-0 sticky-top" style={{ top: '100px' }}>
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4" style={{ color: mainColor }}>Order Summary</h4>

                  {/* Order Items */}
                  <div className="mb-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="d-flex gap-3 mb-3 pb-3 border-bottom">
                        <div className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden" 
                             style={{ width: '60px', height: '60px' }}>
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="img-fluid"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <i className="bi bi-gem" style={{ color: mainColor }}></i>
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="fw-semibold mb-1" style={{ color: mainColor }}>{item.title}</h6>
                          <small className="text-muted d-block">{item.brand}</small>
                          <div className="d-flex justify-content-between align-items-center mt-1">
                            <small className="text-muted">Qty: {item.quantity || 1}</small>
                            <strong style={{ color: secondaryColor }}>
                              ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cost Breakdown */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Subtotal</span>
                      <strong>${subtotal.toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Shipping</span>
                      <strong>
                        {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Tax</span>
                      <strong>${tax}</strong>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between fs-5 fw-bold" style={{ color: secondaryColor }}>
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={handleSubmitOrder}
                    className="btn w-100 mb-3 py-3 fw-semibold border-0"
                    style={{ 
                      backgroundColor: mainColor, 
                      color: 'white',
                      borderRadius: '10px'
                    }}
                  >
                    Confirm Order
                  </button>

                  <button
                    onClick={onNavigateToCart}
                    className="btn btn-link w-100 p-0 d-flex align-items-center justify-content-center gap-2"
                    style={{ color: mainColor }}
                  >
                    <FaArrowLeft className="me-2" />
                    Back to Cart
                  </button>

                  {/* Security Badge */}
                  <div className="text-center mt-3">
                    <FaShieldAlt className="text-success me-2" />
                    <small className="text-muted">Secure Payment</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-dark text-white py-5 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-3 col-md-6 mb-4">
              <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '36px' }} />
              <p className="text-light opacity-75">
                Your trusted partner in fashion and lifestyle. We bring you the latest trends with quality and style.
              </p>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">QUICK LINKS</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Home</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Shop</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>Categories</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline" onClick={onNavigateBack}>New Arrivals</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">CUSTOMER CARE</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Contact Us</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">FAQ</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Shipping Info</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Returns</button>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-4">
              <h6 style={{ color: mainColor }} className="fw-bold mb-3">LEGAL</h6>
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Privacy Policy</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Terms of Service</button>
                <button className="btn btn-link p-0 text-start text-light opacity-75 text-decoration-none hover-underline">Cookie Policy</button>
              </div>
            </div>
          </div>

          <div className="text-center mt-5 pt-3 border-top border-secondary">
            <p className="text-light opacity-75 mb-0">
              © 2024 STYLE SATHI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        .form-check-input:checked {
          background-color: ${mainColor};
          border-color: ${mainColor};
        }
        
        .hover-underline:hover {
          text-decoration: underline !important;
        }
        
        .form-control:focus, .form-select:focus {
          border-color: ${mainColor};
          box-shadow: 0 0 0 0.2rem rgba(196, 166, 44, 0.25);
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

export default CheckoutPage
