import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Modern Empty State Component for HOMEFIX
 */
export function EmptyState({
  icon = 'bi-inbox',
  title = 'No items found',
  description = 'There are currently no records available to display.',
  actionLabel,
  actionLink,
  onActionClick,
  className = '',
}) {
  return (
    <div className={`hf-card text-center py-5 px-4 my-3 ${className}`} style={{ backgroundColor: '#FFFDF9', borderColor: '#D8C7B5', borderRadius: '8px' }}>
      <div
        className="d-inline-flex align-items-center justify-content-center p-3 mb-3 mx-auto"
        style={{ width: '56px', height: '56px', backgroundColor: '#F5EFE6', color: '#5A3E2B', borderRadius: '8px', border: '1px solid #D8C7B5' }}
      >
        <i className={`bi ${icon} fs-2`}></i>
      </div>
      <h5 className="fw-bold mb-1" style={{ color: '#3E3027' }}>{title}</h5>
      <p className="text-muted small mx-auto mb-3" style={{ maxWidth: '420px' }}>
        {description}
      </p>
      {(actionLabel && (actionLink || onActionClick)) && (
        <div>
          {actionLink ? (
            <Link to={actionLink} className="btn btn-primary btn-sm px-4 shadow-sm">
              {actionLabel}
            </Link>
          ) : (
            <button type="button" onClick={onActionClick} className="btn btn-primary btn-sm px-4 shadow-sm">
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
