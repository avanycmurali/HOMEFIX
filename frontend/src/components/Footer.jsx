import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-dark text-light py-4 mt-auto">
      <div className="container text-center text-md-start">
        <div className="row align-items-center">
          <div className="col-md-6 mb-3 mb-md-0">
            <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-tools text-primary"></i> HOMEFIX
            </h6>
            <p className="text-secondary small mb-0">
              Smart Home Service Booking System with Intelligent Technician Recommendation
            </p>
          </div>
          <div className="col-md-6 text-md-end text-secondary small">
            <span>Final-Year Engineering Project &copy; {new Date().getFullYear()} HOMEFIX.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
