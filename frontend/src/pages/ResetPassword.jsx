import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyResetTokenApi, resetPasswordApi } from '../services/api.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState('');
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Extract token from query params and verify
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');

    if (!urlToken || !urlToken.trim()) {
      setCheckingToken(false);
      setTokenValid(false);
      setTokenError('No password reset token was provided. Please request a new link.');
      return;
    }

    setToken(urlToken.trim());

    // Verify token validity with backend
    const checkToken = async () => {
      setCheckingToken(true);
      const res = await verifyResetTokenApi(urlToken.trim());
      setCheckingToken(false);

      if (res.ok && res.data.success) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        setTokenError(res.data?.message || 'This password reset link is invalid or has expired.');
      }
    };

    checkToken();
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match. Please re-enter.');
    }

    setSubmitting(true);
    const res = await resetPasswordApi(token, password, confirmPassword);
    setSubmitting(false);

    if (res.ok && res.data.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } else {
      setError(res.data?.message || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="py-5" style={{ backgroundColor: '#FAF7F2', minHeight: '80vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div className="card shadow-sm border" style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}>
              {/* Header */}
              <div className="card-body p-4 text-center border-bottom" style={{ backgroundColor: '#F5EFE6', borderColor: '#D8C7B5' }}>
                <div
                  className="d-inline-flex align-items-center justify-content-center mb-3 text-white"
                  style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: '#5A3E2B' }}
                >
                  <i className="bi bi-shield-lock-fill fs-3"></i>
                </div>
                <h4 className="fw-bold mb-1" style={{ color: '#2B1E16' }}>Set New Password</h4>
                <p className="small mb-0" style={{ color: '#4A382C' }}>
                  Choose a strong new password for your HOMEFIX account.
                </p>
              </div>

              <div className="card-body p-4 p-md-5">
                {/* Checking Token Loading State */}
                {checkingToken && (
                  <div className="text-center py-4">
                    <div className="spinner-border" style={{ color: '#5A3E2B' }} role="status">
                      <span className="visually-hidden">Validating...</span>
                    </div>
                    <p className="small mt-2 mb-0" style={{ color: '#4A382C' }}>Verifying security token...</p>
                  </div>
                )}

                {/* Invalid or Expired Token State */}
                {!checkingToken && !tokenValid && (
                  <div>
                    <div className="alert alert-danger d-flex align-items-start gap-2 mb-4" role="alert">
                      <i className="bi bi-exclamation-octagon-fill flex-shrink-0 fs-5 mt-1"></i>
                      <div>
                        <strong className="d-block mb-1">Invalid or Expired Link</strong>
                        <p className="small mb-0">{tokenError}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <Link to="/forgot-password" className="btn btn-primary btn-sm px-4 fw-semibold">
                        <i className="bi bi-arrow-repeat me-1"></i> Request a New Reset Link
                      </Link>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {success && (
                  <div>
                    <div className="alert alert-success d-flex align-items-start gap-2 mb-4" role="alert">
                      <i className="bi bi-check-circle-fill flex-shrink-0 fs-5 mt-1"></i>
                      <div>
                        <strong className="d-block mb-1">Password Reset Successful!</strong>
                        <p className="small mb-0">
                          Your password has been securely updated. Automatically redirecting you to login...
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <Link to="/login" className="btn btn-primary btn-sm px-4 fw-semibold">
                        Go to Login Now
                      </Link>
                    </div>
                  </div>
                )}

                {/* Form State */}
                {!checkingToken && tokenValid && !success && (
                  <div>
                    {error && (
                      <div className="alert alert-danger d-flex align-items-center gap-2 alert-dismissible fade show mb-4" role="alert">
                        <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5"></i>
                        <div className="small">{error}</div>
                        <button type="button" className="btn-close" onClick={() => setError('')}></button>
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold" style={{ color: '#2B1E16' }}>
                          New Password
                        </label>
                        <div className="input-group">
                          <span className="input-group-text border-end-0" style={{ backgroundColor: '#F5EFE6', borderColor: '#D8C7B5', color: '#4A382C' }}>
                            <i className="bi bi-lock"></i>
                          </span>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control border-start-0 border-end-0 ps-0"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (error) setError('');
                            }}
                            required
                            minLength={6}
                            autoFocus
                          />
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? 'Hide password' : 'Show password'}
                            style={{ borderColor: '#D8C7B5' }}
                          >
                            <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label small fw-semibold" style={{ color: '#2B1E16' }}>
                          Confirm New Password
                        </label>
                        <div className="input-group">
                          <span className="input-group-text border-end-0" style={{ backgroundColor: '#F5EFE6', borderColor: '#D8C7B5', color: '#4A382C' }}>
                            <i className="bi bi-lock-fill"></i>
                          </span>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="form-control border-start-0 border-end-0 ps-0"
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              if (error) setError('');
                            }}
                            required
                            minLength={6}
                          />
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            title={showConfirmPassword ? 'Hide password' : 'Show password'}
                            style={{ borderColor: '#D8C7B5' }}
                          >
                            <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                        disabled={submitting}
                        style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check2-circle fs-5"></i>
                            <span>Update Password</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-4 pt-3 border-top text-center" style={{ borderColor: '#D8C7B5' }}>
                  <Link to="/login" className="small text-decoration-none fw-medium" style={{ color: '#5A3E2B' }}>
                    <i className="bi bi-arrow-left me-1"></i> Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
