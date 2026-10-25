import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../services/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devResetInfo, setDevResetInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      return setError('Please enter your registered email address.');
    }

    setLoading(true);
    const res = await forgotPasswordApi(email.trim());
    setLoading(false);

    if (res.ok) {
      setSubmitted(true);
      if (res.data._dev) {
        setDevResetInfo(res.data._dev);
      }
    } else {
      setError(res.data?.message || 'Failed to submit request. Please try again.');
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF7F2', minHeight: '80vh' }} className="py-5 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            <div
              className="overflow-hidden"
              style={{
                backgroundColor: '#FFFDF9',
                border: '1px solid #D8C7B5',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(62, 48, 39, 0.05)',
              }}
            >
              {/* Header */}
              <div className="p-4 text-center border-bottom" style={{ backgroundColor: '#F5EFE6', borderColor: '#D8C7B5' }}>
                <div
                  className="d-inline-flex align-items-center justify-content-center p-2 rounded mb-2"
                  style={{ width: '40px', height: '40px', backgroundColor: '#5A3E2B', color: '#FFFDF9' }}
                >
                  <i className="bi bi-key-fill fs-5"></i>
                </div>
                <h4 className="fw-bold mb-1" style={{ color: '#5A3E2B' }}>Password Recovery</h4>
                <p className="small mb-0" style={{ color: '#4A382C' }}>
                  Enter your registered email address to receive password reset instructions.
                </p>
              </div>

              <div className="p-4 p-md-5">
                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 small mb-4 py-2" role="alert">
                    <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                    <div>{error}</div>
                  </div>
                )}

                {/* Success Message */}
                {submitted ? (
                  <div>
                    <div className="alert alert-success d-flex align-items-start gap-2 mb-4 py-2.5 small" role="alert">
                      <i className="bi bi-check-circle-fill flex-shrink-0 mt-0.5"></i>
                      <div>
                        <strong className="d-block mb-1">Check Your Inbox</strong>
                        <p className="mb-0">
                          If an account with that email address exists, a password reset link has been dispatched. The link expires in <strong>15 minutes</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Development / Demo Mode Helper */}
                    {devResetInfo && (
                      <div
                        className="p-3 mb-4 rounded"
                        style={{ backgroundColor: '#F9F2E7', border: '1px solid #E6D4BD' }}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span
                            className="badge d-inline-flex align-items-center gap-1"
                            style={{ backgroundColor: '#A9793F', color: '#FFFDF9' }}
                          >
                            <i className="bi bi-tools"></i> Demo Reset Link
                          </span>
                          <span className="small" style={{ color: '#4A382C', fontSize: '0.75rem' }}>Expires in 15 mins</span>
                        </div>
                        <p className="small mb-3" style={{ color: '#6E4C23' }}>
                          Email delivery is simulated in this development environment. You can test your password reset directly with the link below:
                        </p>
                        <Link
                          to={`/reset-password?token=${encodeURIComponent(devResetInfo.resetToken)}`}
                          className="btn btn-sm w-100 fw-semibold text-white d-flex align-items-center justify-content-center gap-1"
                          style={{ backgroundColor: '#A9793F', borderColor: '#A9793F' }}
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i> Proceed to Reset Password Form
                        </Link>
                      </div>
                    )}

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm px-4"
                        onClick={() => {
                          setSubmitted(false);
                          setEmail('');
                          setDevResetInfo(null);
                        }}
                      >
                        <i className="bi bi-arrow-counterclockwise me-1"></i> Request Another Reset Link
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="form-label" style={{ color: '#3E3027' }}>
                        Registered Email Address
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. user@homefix.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        required
                        autoFocus
                      />
                      <div className="form-text small" style={{ color: '#4A382C', fontSize: '0.8rem' }}>
                        We'll verify this email against registered Customer and Technician accounts.
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                      disabled={loading}
                      style={{ backgroundColor: '#5A3E2B', borderColor: '#5A3E2B', color: '#FFFDF9' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                          <span>Verifying &amp; Sending...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-envelope-check"></i>
                          <span>Send Reset Link</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Card Footer Links */}
                <div className="mt-4 pt-3 border-top text-center d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ borderColor: '#EBE0D3' }}>
                  <Link to="/login" className="small text-decoration-none" style={{ color: '#4A382C' }}>
                    <i className="bi bi-arrow-left me-1"></i> Back to Login
                  </Link>
                  <Link to="/register" className="small text-decoration-none fw-semibold" style={{ color: '#5A3E2B' }}>
                    New to HOMEFIX? Sign Up
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
