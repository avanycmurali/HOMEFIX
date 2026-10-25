import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [navCollapsed, setNavCollapsed] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span
            className="badge px-2 py-0.5"
            style={{ backgroundColor: '#9A4F43', color: '#FFFDF9', fontSize: '0.725rem' }}
          >
            Admin
          </span>
        );
      case 'technician':
        return (
          <span
            className="badge px-2 py-0.5"
            style={{ backgroundColor: '#A9793F', color: '#FFFDF9', fontSize: '0.725rem' }}
          >
            Technician
          </span>
        );
      default:
        return null;
    }
  };

  const isActive = (path) => location.pathname === path;
  const closeNav = () => setNavCollapsed(true);

  return (
    <nav className="navbar navbar-expand-lg hf-navbar sticky-top py-2">
      <div className="container">
        {/* Brand Logo */}
        <Link
          className="hf-brand"
          to={isAuthenticated ? '/dashboard' : '/'}
          onClick={closeNav}
        >
          <div className="hf-brand-icon">
            <i className="bi bi-tools"></i>
          </div>
          <div className="d-flex flex-column">
            <span className="fw-bold fs-5 tracking-tight lh-1" style={{ color: '#FFFDF9' }}>HOMEFIX</span>
            <span style={{ color: '#E8D8C7', fontSize: '0.65rem', letterSpacing: '0.06em' }}>
              Home Services
            </span>
          </div>
        </Link>

        {/* Mobile Hamburger Toggle */}
        <button
          className="navbar-toggler border-0 p-2 shadow-none"
          type="button"
          onClick={() => setNavCollapsed(!navCollapsed)}
          aria-controls="navbarHomefix"
          aria-expanded={!navCollapsed}
          aria-label="Toggle navigation"
        >
          <i className={`bi ${navCollapsed ? 'bi-list' : 'bi-x-lg'} fs-3 text-white`}></i>
        </button>

        {/* Navigation Links & Actions */}
        <div className={`collapse navbar-collapse ${!navCollapsed ? 'show' : ''}`} id="navbarHomefix">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-lg-1">
            {/* PUBLIC NAVIGATION (Guests) */}
            {!isAuthenticated && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link hf-nav-link ${isActive('/') ? 'active' : ''}`}
                    to="/"
                    onClick={closeNav}
                  >
                    Home
                  </Link>
                </li>
                <li className="nav-item">
                  <a className="nav-link hf-nav-link" href="/#services" onClick={closeNav}>
                    Services
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link hf-nav-link" href="/#about" onClick={closeNav}>
                    About
                  </a>
                </li>
              </>
            )}

            {/* CUSTOMER NAVIGATION */}
            {isAuthenticated && user?.role === 'user' && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link hf-nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                    to="/dashboard"
                    onClick={closeNav}
                  >
                    Home
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link hf-nav-link ${isActive('/book-service') ? 'active' : ''}`}
                    to="/book-service"
                    onClick={closeNav}
                  >
                    Book Service
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link hf-nav-link ${isActive('/my-bookings') ? 'active' : ''}`}
                    to="/my-bookings"
                    onClick={closeNav}
                  >
                    My Bookings
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link hf-nav-link ${isActive('/service-history') ? 'active' : ''}`}
                    to="/service-history"
                    onClick={closeNav}
                  >
                    Service History
                  </Link>
                </li>
              </>
            )}

            {/* TECHNICIAN NAVIGATION */}
            {isAuthenticated && user?.role === 'technician' && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link hf-nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                    to="/dashboard"
                    onClick={closeNav}
                  >
                    Home
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link hf-nav-link"
                    to="/dashboard?tab=requests"
                    onClick={closeNav}
                  >
                    <i className="bi bi-inbox me-1 opacity-75"></i> Requests
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link hf-nav-link"
                    to="/dashboard?tab=assigned"
                    onClick={closeNav}
                  >
                    <i className="bi bi-briefcase me-1 opacity-75"></i> Active Jobs
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link hf-nav-link"
                    to="/dashboard?tab=profile"
                    onClick={closeNav}
                  >
                    <i className="bi bi-person-badge me-1 opacity-75"></i> Profile
                  </Link>
                </li>
              </>
            )}

            {/* ADMIN NAVIGATION */}
            {isAuthenticated && user?.role === 'admin' && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link hf-nav-link ${isActive('/dashboard') ? 'active' : ''}`}
                    to="/dashboard"
                    onClick={closeNav}
                  >
                    <i className="bi bi-speedometer2 me-1 opacity-75"></i> Overview
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link hf-nav-link"
                    to="/dashboard?tab=customers"
                    onClick={closeNav}
                  >
                    Users
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link hf-nav-link"
                    to="/dashboard?tab=technicians"
                    onClick={closeNav}
                  >
                    Technicians
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link hf-nav-link"
                    to="/dashboard?tab=bookings"
                    onClick={closeNav}
                  >
                    Bookings
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link hf-nav-link"
                    to="/dashboard?tab=payments"
                    onClick={closeNav}
                  >
                    Payments
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* Right Action / Auth Controls */}
          <div className="d-flex align-items-center flex-wrap gap-2 pt-2 pt-lg-0 border-top border-lg-0 border-secondary">
            {isAuthenticated && user ? (
              <>
                <Link
                  to="/dashboard"
                  className="d-flex align-items-center gap-2 text-decoration-none px-2 py-1 rounded"
                  onClick={closeNav}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                    style={{
                      width: '32px',
                      height: '32px',
                      fontSize: '0.85rem',
                      backgroundColor: '#7A5C45',
                      color: '#FFFDF9',
                    }}
                  >
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="fw-medium small d-none d-sm-inline" style={{ color: '#FFFDF9' }}>
                    {user.role === 'admin' && (user.name === 'System Administrator' || user.name === 'System Administration') ? 'Admin' : user.name}
                  </span>
                  {getRoleBadge(user.role)}
                </Link>
                <button
                  onClick={() => {
                    closeNav();
                    handleLogout();
                  }}
                  className="btn btn-sm px-3"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: '#7A5C45',
                    color: '#E8D8C7',
                  }}
                  type="button"
                >
                  <i className="bi bi-box-arrow-right me-1"></i> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="btn btn-sm px-3 fw-semibold"
                  style={{
                    backgroundColor: '#7A5C45',
                    borderColor: '#8E6E55',
                    color: '#FFFDF9',
                  }}
                  onClick={closeNav}
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  className="btn btn-sm px-3 fw-semibold"
                  style={{
                    backgroundColor: '#F5EFE6',
                    borderColor: '#D8C7B5',
                    color: '#2B1E16',
                  }}
                  onClick={closeNav}
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
