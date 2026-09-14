import React from 'react';
import { Link } from 'react-router-dom';

export default function Home({ healthData, healthLoading, onRefreshHealth }) {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section text-center">
        <div className="container py-4">
          <span className="badge bg-light text-primary px-3 py-2 rounded-pill fw-semibold mb-3 shadow-sm">
            <i className="bi bi-stars me-1"></i> Final-Year Capstone Project
          </span>
          <h1 className="display-4 fw-bold mb-3">HOMEFIX</h1>
          <p className="lead mb-4 mx-auto text-light opacity-90" style={{ maxWidth: '750px' }}>
            Smart Home Service Booking System with Intelligent Technician Recommendation
          </p>

          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/register" className="btn btn-light btn-lg px-4 fw-semibold text-primary shadow-sm">
              <i className="bi bi-person-plus-fill me-2"></i> Register Now
            </Link>
            <Link to="/login" className="btn btn-outline-light btn-lg px-4">
              <i className="bi bi-box-arrow-in-right me-2"></i> Sign In
            </Link>
            <a href="#system-status" className="btn btn-link text-white text-decoration-none d-flex align-items-center">
              <i className="bi bi-activity me-1"></i> System Health
            </a>
          </div>
        </div>
      </section>

      <div className="container py-5">
        {/* System Health Check Status Banner */}
        <section id="system-status" className="mb-5">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h5 className="card-title fw-bold mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-cpu text-primary fs-4"></i> Full-Stack System Connectivity
                </h5>
                <button
                  className="btn btn-outline-primary btn-sm rounded-pill px-3"
                  onClick={onRefreshHealth}
                  disabled={healthLoading}
                >
                  <i className={`bi bi-arrow-clockwise me-1 ${healthLoading ? 'spin' : ''}`}></i>
                  {healthLoading ? 'Checking...' : 'Refresh Status'}
                </button>
              </div>

              {healthLoading ? (
                <div className="alert alert-info d-flex align-items-center mb-0" role="alert">
                  <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                  <span>Connecting to Node.js/Express backend API...</span>
                </div>
              ) : healthData?.ok ? (
                <div className="alert alert-success border-0 bg-success-subtle text-success-emphasis rounded-3 mb-0 p-3">
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-check-circle-fill fs-5 text-success"></i>
                    <div className="flex-grow-1">
                      <div className="fw-bold">{healthData.data.message}</div>
                      <small className="d-block text-muted mt-1">
                        <strong>API Endpoint:</strong> <code>GET /api/health</code> &bull;{' '}
                        <strong>Server Time:</strong> {new Date(healthData.data.timestamp).toLocaleTimeString()} &bull;{' '}
                        <strong>Uptime:</strong> {healthData.data.uptimeSeconds}s
                      </small>
                      <small className="d-block mt-1">
                        <strong>Database Status:</strong>{' '}
                        {healthData.data.database.connected ? (
                          <span className="badge bg-success">MySQL Connected</span>
                        ) : (
                          <span className="badge bg-secondary">MySQL Pending Configuration</span>
                        )}
                        <span className="ms-2 text-secondary">({healthData.data.database.details})</span>
                      </small>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning border-0 bg-warning-subtle text-warning-emphasis rounded-3 mb-0 p-3">
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-exclamation-triangle-fill fs-5 text-warning"></i>
                    <div>
                      <div className="fw-bold">Backend Server Not Detected</div>
                      <small className="d-block text-muted mt-1">
                        Make sure your Express server is running on port 5000:
                        <code className="ms-1">cd backend && npm run dev</code>
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3 Core Roles Section */}
        <section id="roles" className="mb-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold">System Roles</h2>
            <p className="text-muted">HOMEFIX supports three distinct user roles with dedicated interfaces</p>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm feature-card p-3 text-center">
                <div className="card-body d-flex flex-column">
                  <div className="icon-box bg-primary-subtle text-primary mx-auto mb-3">
                    <i className="bi bi-person-fill"></i>
                  </div>
                  <h5 className="card-title fw-bold">1. Customer</h5>
                  <p className="card-text text-muted small flex-grow-1">
                    Registers complaints, uploads problem photos, receives intelligent technician recommendations, and tracks service completion.
                  </p>
                  <div className="mt-3">
                    <Link to="/login?role=user" className="btn btn-outline-primary btn-sm w-100 mb-2">
                      Customer Portal
                    </Link>
                    <Link to="/register" className="small text-muted text-decoration-none">
                      New here? Sign Up
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm feature-card p-3 text-center">
                <div className="card-body d-flex flex-column">
                  <div className="icon-box bg-warning-subtle text-warning mx-auto mb-3">
                    <i className="bi bi-tools"></i>
                  </div>
                  <h5 className="card-title fw-bold">2. Technician</h5>
                  <p className="card-text text-muted small flex-grow-1">
                    Accepts/rejects assigned service requests, views problem details/photos, receives tool recommendations, and updates service progress.
                  </p>
                  <div className="mt-3">
                    <Link to="/login?role=technician" className="btn btn-outline-warning btn-sm text-dark w-100 mb-2">
                      Technician Portal
                    </Link>
                    <Link to="/register" className="small text-muted text-decoration-none">
                      Join as a Technician
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100 border-0 shadow-sm feature-card p-3 text-center">
                <div className="card-body d-flex flex-column">
                  <div className="icon-box bg-danger-subtle text-danger mx-auto mb-3">
                    <i className="bi bi-shield-lock-fill"></i>
                  </div>
                  <h5 className="card-title fw-bold">3. Administrator</h5>
                  <p className="card-text text-muted small flex-grow-1">
                    Manages users, verifies technicians, oversees service categories, monitors active bookings, and views analytics reports.
                  </p>
                  <div className="mt-3">
                    <Link to="/login?role=admin" className="btn btn-outline-danger btn-sm w-100 mb-2">
                      Admin Dashboard
                    </Link>
                    <span className="small text-muted">Authorized Personnel Only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 Core Project Modules Section */}
        <section id="modules" className="mb-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold">Project Architecture & Modules</h2>
            <p className="text-muted">Structured modular workflow built for scalable expansion</p>
          </div>

          <div className="row g-4">
            {[
              {
                num: '01',
                title: 'Registration & Authentication',
                icon: 'bi-key-fill',
                color: 'text-primary bg-primary-subtle',
                desc: 'Role-based registration and secure login for Users, Technicians, and Admin with bcrypt hashing & JWT tokens.',
                active: true,
              },
              {
                num: '02',
                title: 'Complaint & Booking',
                icon: 'bi-file-earmark-medical',
                color: 'text-info bg-info-subtle',
                desc: 'Service category selection, problem description, photo upload, and location tagging.',
                active: false,
              },
              {
                num: '03',
                title: 'Intelligent Recommendation',
                icon: 'bi-robot',
                color: 'text-success bg-success-subtle',
                desc: 'Rule-based engine matching technicians by service category, location, rating, experience, and fee.',
                active: false,
              },
              {
                num: '04',
                title: 'Payment & Service Management',
                icon: 'bi-credit-card-2-front',
                color: 'text-danger bg-danger-subtle',
                desc: 'Service status lifecycle (Pending, Accepted, In-Progress, Completed) with Razorpay integration readiness.',
                active: false,
              },
              {
                num: '05',
                title: 'Admin & Service History',
                icon: 'bi-clock-history',
                color: 'text-secondary bg-secondary-subtle',
                desc: 'Complete audit history of bookings, customer reviews, ratings, and technician verification.',
                active: false,
              },
            ].map((module) => (
              <div className="col-md-6 col-lg-4" key={module.num}>
                <div className={`card h-100 border-0 shadow-sm feature-card p-3 ${module.active ? 'border border-primary' : ''}`}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className={`icon-box ${module.color}`}>
                        <i className={`bi ${module.icon}`}></i>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {module.active && <span className="badge bg-success">Ready</span>}
                        <span className="fs-5 fw-bold text-black-50">Module {module.num}</span>
                      </div>
                    </div>
                    <h5 className="card-title fw-bold mb-2">{module.title}</h5>
                    <p className="card-text text-muted small mb-0">{module.desc}</p>
                    {module.active && (
                      <div className="mt-3 pt-2 border-top">
                        <Link to="/register" className="btn btn-sm btn-link p-0 text-decoration-none fw-semibold">
                          Try Registration &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
