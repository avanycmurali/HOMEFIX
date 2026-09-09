import React from 'react';

export default function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-3">
      <div className="container">
        <a className="navbar-brand fw-bold d-flex align-items-center gap-2" href="#home">
          <span className="badge bg-primary fs-5 p-2 rounded-3">
            <i className="bi bi-tools"></i>
          </span>
          <span className="fs-4 tracking-tight">HOMEFIX</span>
        </a>

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
              <a className="nav-link active" aria-current="page" href="#home">Home</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#features">Features</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#modules">Project Modules</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#roles">Roles</a>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-light btn-sm px-3" type="button" title="Technician Portal">
              <i className="bi bi-person-gear me-1"></i> Technician
            </button>
            <button className="btn btn-outline-warning btn-sm px-3" type="button" title="Admin Portal">
              <i className="bi bi-shield-lock me-1"></i> Admin
            </button>
            <button className="btn btn-primary btn-sm px-3" type="button">
              <i className="bi bi-person-circle me-1"></i> User Login
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
