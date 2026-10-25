import React from 'react';

/**
 * Standard Status and Urgency Badge Component for HOMEFIX
 */
export function StatusBadge({ status, className = '' }) {
  if (!status) return null;

  const normalizedStatus = String(status).trim().toLowerCase();

  switch (normalizedStatus) {
    case 'completed':
      return (
        <span className={`hf-badge hf-badge-completed ${className}`}>
          <i className="bi bi-check2-all"></i>
          <span>Completed</span>
        </span>
      );
    case 'in_progress':
      return (
        <span className={`hf-badge hf-badge-in-progress ${className}`}>
          <span className="spinner-grow spinner-grow-sm text-primary" style={{ width: '0.65rem', height: '0.65rem' }}></span>
          <span>In Progress</span>
        </span>
      );
    case 'accepted':
      return (
        <span className={`hf-badge hf-badge-accepted ${className}`}>
          <i className="bi bi-person-check-fill"></i>
          <span>Accepted</span>
        </span>
      );
    case 'customer_selected_technician':
      return (
        <span className={`hf-badge hf-badge-waiting ${className}`}>
          <i className="bi bi-clock-history"></i>
          <span>Waiting Confirmation</span>
        </span>
      );
    case 'technician_assigned':
      return (
        <span className={`hf-badge hf-badge-accepted ${className}`}>
          <i className="bi bi-person-check-fill"></i>
          <span>Accepted</span>
        </span>
      );
    case 'technician_rejected':
    case 'rejected':
      return (
        <span className={`hf-badge hf-badge-rejected ${className}`}>
          <i className="bi bi-x-circle-fill"></i>
          <span>Rejected</span>
        </span>
      );
    case 'cancelled':
      return (
        <span className={`hf-badge hf-badge-cancelled ${className}`}>
          <i className="bi bi-slash-circle"></i>
          <span>Cancelled</span>
        </span>
      );
    case 'paid':
      return (
        <span className={`hf-badge hf-badge-completed ${className}`}>
          <i className="bi bi-patch-check-fill"></i>
          <span>Paid</span>
        </span>
      );
    case 'pending':
    default:
      return (
        <span className={`hf-badge hf-badge-pending ${className}`}>
          <i className="bi bi-hourglass-split"></i>
          <span>Pending</span>
        </span>
      );
  }
}

export function UrgencyBadge({ urgency, className = '' }) {
  if (!urgency) return null;

  switch (urgency.toLowerCase()) {
    case 'emergency':
      return (
        <span
          className={`badge text-uppercase px-2 py-1 ${className}`}
          style={{ backgroundColor: '#9A4F43', color: '#FFFDF9', borderRadius: '4px' }}
        >
          <i className="bi bi-exclamation-octagon-fill me-1"></i> Emergency
        </span>
      );
    case 'high':
      return (
        <span
          className={`badge text-uppercase px-2 py-1 ${className}`}
          style={{ backgroundColor: '#A9793F', color: '#FFFDF9', borderRadius: '4px' }}
        >
          <i className="bi bi-lightning-fill me-1"></i> High
        </span>
      );
    case 'low':
      return (
        <span
          className={`badge text-uppercase px-2 py-1 ${className}`}
          style={{ backgroundColor: '#F5EFE6', color: '#4A382C', border: '1px solid #D8C7B5', borderRadius: '4px' }}
        >
          Low
        </span>
      );
    default:
      return (
        <span
          className={`badge text-uppercase px-2 py-1 ${className}`}
          style={{ backgroundColor: '#E8D8C7', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
        >
          Medium
        </span>
      );
  }
}

export default StatusBadge;
