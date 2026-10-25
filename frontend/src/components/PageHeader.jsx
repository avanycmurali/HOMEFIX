import React from 'react';

/**
 * Standard Page Header Banner for HOMEFIX
 */
export function PageHeader({
  badge,
  badgeIcon = 'bi-stars',
  title,
  subtitle,
  actions,
  className = '',
}) {
  return (
    <div className={`d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-2 border-bottom ${className}`} style={{ borderColor: '#D8C7B5' }}>
      <div>
        {badge && (
          <span
            className="badge px-3 py-1 small fw-semibold mb-2 d-inline-flex align-items-center gap-1"
            style={{ backgroundColor: '#F5EFE6', color: '#5A3E2B', border: '1px solid #D8C7B5', borderRadius: '4px' }}
          >
            <i className={`bi ${badgeIcon}`} style={{ color: '#5A3E2B' }}></i>
            <span>{badge}</span>
          </span>
        )}
        <h2 className="fw-bold mb-1" style={{ color: '#2B1E16' }}>{title}</h2>
        {subtitle && <p className="small mb-0" style={{ color: '#4A382C' }}>{subtitle}</p>}
      </div>
      {actions && <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export default PageHeader;
