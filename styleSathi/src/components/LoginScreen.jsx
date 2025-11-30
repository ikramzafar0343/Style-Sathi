import { useState, useEffect } from "react";
import styleSathiLogo from '../assets/styleSathiLogo.svg';
import { authApi } from "../services/api";
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaLock,
  FaEnvelope,
  FaGoogle,
  FaFacebookF,
  FaUserTie,
  FaShieldAlt
} from "react-icons/fa";

const LoginScreen = ({
  onNavigateToSignUp,
  onNavigateToForgot,
  onLoginSuccess,
  onNavigateToAdminLogin,
  error: externalError
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState("customer"); // customer / seller
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync external errors
  useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await authApi.login({ email: formData.email, password: formData.password, expected_role: userType });
      onLoginSuccess(userType, resp);
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
      <div
        className="card shadow-lg border-0 p-4"
        style={{
          width: "430px",
          maxWidth: "92%",
          borderRadius: "14px"
        }}
      >
        {/* Logo */}
        <div className="text-center mb-3">
          <img src={styleSathiLogo} alt="STYLE SATHI" style={{ height: '42px' }} />
          <p className="text-muted small">Your Fashion Companion</p>
        </div>

        {/* Title */}
        <h4 className="fw-bold text-center text-gold mb-3">Welcome Back</h4>
        <p className="text-center text-muted small mb-4">
          Login to your {userType} account
        </p>

        {/* User Type Toggle */}
        <div className="d-flex justify-content-center gap-2 mb-4">
          <button
            className={`btn ${
              userType === "customer" ? "btn-gold" : "btn-outline-gold"
            } py-2 px-3 small fw-semibold`}
            onClick={() => setUserType("customer")}
          >
            <FaUser className="me-2" />
            Customer
          </button>

          <button
            className={`btn ${
              userType === "seller" ? "btn-gold" : "btn-outline-gold"
            } py-2 px-3 small fw-semibold`}
            onClick={() => setUserType("seller")}
          >
            <FaUserTie className="me-2" />
            Seller
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger py-2 small mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-3">
            <label className="form-label small fw-semibold">
              <FaEnvelope className="me-1 text-gold" /> Email
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white border-gold">
                <FaUser className="text-gold" />
              </span>
              <input
                type="email"
                className="form-control border-gold"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="form-label small fw-semibold">
              <FaLock className="me-1 text-gold" /> Password
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white border-gold">
                <FaLock className="text-gold" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control border-gold"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="input-group-text bg-white border-gold"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <FaEyeSlash className="text-gold" />
                ) : (
                  <FaEye className="text-gold" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-end mb-3">
            <button
              type="button"
              onClick={onNavigateToForgot}
              className="btn btn-link text-gold small p-0"
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-gold w-100 py-2 fw-semibold mb-3"
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Logging in...
              </>
            ) : (
              `Login as ${userType}`
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="text-center position-relative my-3">
          <hr />
          <span className="small text-muted bg-white px-2 position-absolute top-50 start-50 translate-middle">
            Or continue with
          </span>
        </div>

        {/* Social Login */}
        <div className="row g-2 mb-3">
          <div className="col-6">
            <button className="btn btn-outline-gold w-100 py-2 small d-flex align-items-center justify-content-center gap-2">
              <FaGoogle className="text-gold" />
              Google
            </button>
          </div>
          <div className="col-6">
            <button className="btn btn-outline-gold w-100 py-2 small d-flex align-items-center justify-content-center gap-2">
              <FaFacebookF className="text-gold" />
              Facebook
            </button>
          </div>
        </div>

        {/* Admin Login */}
        <button
          onClick={onNavigateToAdminLogin}
          className="btn btn-outline-secondary w-100 py-2 small mb-3"
        >
          <FaShieldAlt className="me-2" /> Admin Login
        </button>

        {/* Sign Up */}
        <p className="text-center small text-muted mb-2">
          Don't have an account?{" "}
          <button
            onClick={onNavigateToSignUp}
            className="btn btn-link text-gold fw-semibold p-0"
          >
            Create new account
          </button>
        </p>
      </div>

      {/* Gold Theme Styles */}
      <style>{`
        .text-gold { color: #c4a62c !important; }
        .border-gold { border-color: #c4a62c !important; }
        .btn-gold {
          background-color: #c4a62c !important;
          color: #fff !important;
        }
        .btn-gold:hover {
          background-color: #b39925 !important;
        }
        .btn-outline-gold {
          border-color: #c4a62c !important;
          color: #c4a62c !important;
        }
        .btn-outline-gold:hover {
          background-color: #c4a62c !important;
          color: #fff !important;
        }
        .form-control:focus {
          border-color: #c4a62c !important;
          box-shadow: 0 0 0 2px rgba(196, 166, 44, 0.25) !important;
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
