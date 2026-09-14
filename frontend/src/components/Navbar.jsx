import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="badge bg-danger rounded-pill"><i className="bi bi-shield-lock-fill me-1"></i> Admin</span>;
      case 'technician':
        return <span className="badge bg-warning text-dark rounded-pill"><i className="bi bi-tools me-1"></i> Technician</span>;
      default:
        return <span className="badge bg-primary rounded-pill"><i className="bi bi-person me-1"></i> Customer</span>;
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-3">
      <div className="container">
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
          <span className="badge bg-primary fs-5 p-2 rounded-3">
            <i className="bi bi-tools"></i>
          </span>
          <span className="fs-4 tracking-tight">HOMEFIX</span>
        </Link>

        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            {isAuthenticated && user?.role === 'user' && (
              <>
                <li className="nav-item">
                  <Link className="nav-link text-warning fw-semibold" to="/book-service">
                    <i className="bi bi-plus-circle me-1"></i> Book Service
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/my-bookings">
                    <i className="bi bi-card-checklist me-1"></i> My Complaints
                  </Link>
                </li>
              </>
            )}
            <li className="nav-item">
              <a className="nav-link" href="/#features">Features</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/#modules">Modules</a>
            </li>
          </ul>

          <div className="d-flex align-items-center flex-wrap gap-2">
            {isAuthenticated && user ? (
              <>
                <Link to="/dashboard" className="btn btn-outline-light btn-sm px-3 d-flex align-items-center gap-2">
                  {getRoleBadge(user.role)}
                  <span className="fw-semibold">{user.name}</span>
                </Link>
                <Link to="/dashboard" className="btn btn-primary btn-sm px-3">
                  <i className="bi bi-speedometer2 me-1"></i> Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-danger btn-sm px-3"
                  type="button"
                  title="Log out"
                >
                  <i className="bi bi-box-arrow-right me-1"></i> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login?role=technician"
                  className="btn btn-outline-light btn-sm px-2 px-md-3"
                  title="Technician Portal"
                >
                  <i className="bi bi-person-gear me-1"></i> Technician
                </Link>
                <Link
                  to="/login?role=admin"
                  className="btn btn-outline-warning btn-sm px-2 px-md-3"
                  title="Admin Portal"
                >
                  <i className="bi bi-shield-lock me-1"></i> Admin
                </Link>
                <Link to="/login" className="btn btn-primary btn-sm px-3">
                  <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
                </Link>
                <Link to="/register" className="btn btn-outline-info btn-sm px-3 text-white">
                  <i className="bi bi-person-plus me-1"></i> Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
