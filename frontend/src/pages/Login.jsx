import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Role portal tab: 'user' | 'technician' | 'admin'
  const [selectedRole, setSelectedRole] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check if role was passed in URL query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam && ['user', 'technician', 'admin'].includes(roleParam)) {
      setSelectedRole(roleParam);
    }
  }, [location]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      return setError('Please enter your email address.');
    }
    if (!password) {
      return setError('Please enter your password.');
    }

    setLoading(true);
    const result = await login({
      email: email.trim(),
      password,
      expectedRole: selectedRole,
    });
    setLoading(false);

    if (result.success) {
      setSuccessMsg(`Welcome back, ${result.user.name}! Redirecting to dashboard...`);
      setTimeout(() => navigate('/dashboard'), 800);
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF7F2', minHeight: '80vh' }} className="d-flex align-items-center justify-content-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5">
            {/* Main Form Card */}
            <div
              className="p-4 p-sm-5"
              style={{
                backgroundColor: '#FFFDF9',
                border: '1px solid #D8C7B5',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(62, 48, 39, 0.05)',
              }}
            >
              {/* Header */}
              <div className="text-center mb-4">
                <Link to="/" className="d-inline-flex align-items-center gap-2 text-decoration-none mb-2">
                  <div
                    className="d-flex align-items-center justify-content-center rounded"
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: '#5A3E2B',
                      color: '#FFFDF9',
                      fontSize: '1.1rem',
                    }}
                  >
                    <i className="bi bi-tools"></i>
                  </div>
                  <span className="fw-bold fs-4" style={{ color: '#5A3E2B' }}>HOMEFIX</span>
                </Link>
                <h4 className="fw-bold mb-1" style={{ color: '#5A3E2B' }}>
                  Sign In to Your Account
                </h4>
                <p className="small mb-0" style={{ color: '#4A382C' }}>
                  Select your role to access your dashboard.
                </p>
              </div>

              {/* Portal Selector Tabs */}
              <div
                className="d-flex p-1 mb-4"
                style={{
                  backgroundColor: '#F5EFE6',
                  borderRadius: '6px',
                  border: '1px solid #D8C7B5',
                }}
              >
                {[
                  { key: 'user', label: 'Customer', icon: 'bi-person' },
                  { key: 'technician', label: 'Technician', icon: 'bi-wrench' },
                  { key: 'admin', label: 'Admin', icon: 'bi-shield-lock' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className="btn btn-sm flex-fill py-1.5 fw-semibold border-0"
                    style={{
                      backgroundColor: selectedRole === tab.key ? '#5A3E2B' : 'transparent',
                      color: selectedRole === tab.key ? '#FFFDF9' : '#5A3E2B',
                      fontSize: '0.85rem',
                      borderRadius: '4px',
                    }}
                    onClick={() => {
                      setSelectedRole(tab.key);
                      setError('');
                    }}
                  >
                    <i className={`bi ${tab.icon} me-1`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="alert alert-danger py-2 px-3 small mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-circle-fill flex-shrink-0"></i>
                  <div>{error}</div>
                </div>
              )}

              {/* Success Alert */}
              {successMsg && (
                <div className="alert alert-success py-2 px-3 small mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill flex-shrink-0"></i>
                  <div>{successMsg}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" style={{ color: '#3E3027' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. user@homefix.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label mb-0" style={{ color: '#3E3027' }}>
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="small text-decoration-none"
                      style={{ color: '#7A5C45', fontSize: '0.8rem' }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold mt-2"
                  disabled={loading}
                  style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Signing in...
                    </>
                  ) : (
                    `Sign In as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="text-center pt-3 border-top mt-4" style={{ borderColor: '#EBE0D3' }}>
                <span className="small" style={{ color: '#4A382C' }}>
                  Don't have an account?{' '}
                  <Link to="/register" className="fw-semibold text-decoration-none" style={{ color: '#5A3E2B' }}>
                    Sign Up
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
