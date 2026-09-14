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

  // Check if role was passed in location state or URL params
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

  // Quick fill demo credentials
  const fillDemo = (role) => {
    setError('');
    setSelectedRole(role);
    if (role === 'admin') {
      setEmail('admin@homefix.com');
      setPassword('Admin@123');
    } else if (role === 'technician') {
      setEmail('tech.electric@homefix.com');
      setPassword('Tech@123');
    } else {
      setEmail('user@homefix.com');
      setPassword('User@123');
    }
  };

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
      setSuccessMsg(`Welcome back, ${result.user.name}! Redirecting...`);
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setError(result.message);
    }
  };

  // Portal Theme config based on selected tab
  const getPortalInfo = () => {
    switch (selectedRole) {
      case 'admin':
        return {
          title: 'Administrator Portal',
          subtitle: 'System administration, user verification, and platform oversight',
          badgeClass: 'bg-danger text-white',
          btnClass: 'btn-danger',
          icon: 'bi-shield-lock-fill',
        };
      case 'technician':
        return {
          title: 'Technician Portal',
          subtitle: 'Manage assigned complaints, update availability, and track earnings',
          badgeClass: 'bg-warning text-dark',
          btnClass: 'btn-warning text-dark',
          icon: 'bi-person-gear',
        };
      default:
        return {
          title: 'Customer Login',
          subtitle: 'Book smart home services, track complaints, and view history',
          badgeClass: 'bg-primary text-white',
          btnClass: 'btn-primary',
          icon: 'bi-person-circle',
        };
    }
  };

  const portal = getPortalInfo();

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          {/* Card Container */}
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
            {/* Header with Portal Identity */}
            <div className="card-body p-4 text-center bg-light border-bottom">
              <div
                className={`d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3 shadow-sm ${portal.badgeClass}`}
              >
                <i className={`bi ${portal.icon} fs-2`}></i>
              </div>
              <h3 className="fw-bold mb-1">{portal.title}</h3>
              <p className="text-muted small mb-0">{portal.subtitle}</p>
            </div>

            <div className="card-body p-4 p-md-5">
              {/* Role Switcher Tabs */}
              <label className="form-label small fw-bold text-uppercase text-muted tracking-wide mb-2">
                Select Portal Role
              </label>
              <div className="btn-group w-100 mb-4 shadow-sm" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${selectedRole === 'user' ? 'btn-primary active fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setSelectedRole('user');
                    setError('');
                  }}
                >
                  <i className="bi bi-person me-1"></i> Customer
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedRole === 'technician' ? 'btn-warning active fw-bold text-dark' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setSelectedRole('technician');
                    setError('');
                  }}
                >
                  <i className="bi bi-tools me-1"></i> Technician
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedRole === 'admin' ? 'btn-danger active fw-bold' : 'btn-outline-secondary'}`}
                  onClick={() => {
                    setSelectedRole('admin');
                    setError('');
                  }}
                >
                  <i className="bi bi-shield-lock me-1"></i> Admin
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 alert-dismissible fade show mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5"></i>
                  <div className="small">{error}</div>
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="alert alert-success d-flex align-items-center gap-2 mb-4" role="alert">
                  <i className="bi bi-check-circle-fill flex-shrink-0 fs-5"></i>
                  <div className="small">{successMsg}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold text-secondary">Registered Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted">
                      <i className="bi bi-envelope"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-semibold text-secondary mb-0">Password</label>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-white text-muted">
                      <i className="bi bi-lock"></i>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      required
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btn ${portal.btnClass} btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right fs-5"></i>
                      <span>Sign In to HOMEFIX</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Testing Helper Card */}
              <div className="mt-4 p-3 bg-light rounded-3 border">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="badge bg-secondary-subtle text-dark border">
                    <i className="bi bi-lightning-charge-fill text-warning me-1"></i> Quick Demo Logins
                  </span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>Click to autofill</span>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm flex-fill"
                    onClick={() => fillDemo('user')}
                  >
                    User Demo
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-warning btn-sm text-dark flex-fill"
                    onClick={() => fillDemo('technician')}
                  >
                    Tech Demo
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm flex-fill"
                    onClick={() => fillDemo('admin')}
                  >
                    Admin Demo
                  </button>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-top text-center">
                <p className="text-secondary small mb-0">
                  Don't have an account yet?{' '}
                  <Link to="/register" className="text-primary fw-semibold text-decoration-none">
                    Register now
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
