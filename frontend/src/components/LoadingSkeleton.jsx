import React from 'react';

/**
 * Reusable Loading Skeleton Components for HOMEFIX
 */
export function CardSkeleton({ count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div className="hf-card p-4 mb-3" key={idx}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="hf-skeleton" style={{ width: '140px', height: '24px' }}></div>
            <div className="hf-skeleton" style={{ width: '90px', height: '22px', borderRadius: '9999px' }}></div>
          </div>
          <div className="hf-skeleton mb-2" style={{ width: '55%', height: '20px' }}></div>
          <div className="hf-skeleton mb-3" style={{ width: '85%', height: '14px' }}></div>
          <div className="p-3 bg-light rounded-3 mb-3">
            <div className="row g-2">
              <div className="col-6">
                <div className="hf-skeleton" style={{ width: '70%', height: '14px' }}></div>
              </div>
              <div className="col-6">
                <div className="hf-skeleton" style={{ width: '80%', height: '14px' }}></div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
            <div className="hf-skeleton" style={{ width: '80px', height: '24px' }}></div>
            <div className="hf-skeleton" style={{ width: '120px', height: '32px', borderRadius: '6px' }}></div>
          </div>
        </div>
      ))}
    </>
  );
}

export function TableRowSkeleton({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="py-3">
              <div
                className="hf-skeleton"
                style={{
                  width: `${60 + ((cIdx * 17) % 35)}%`,
                  height: '16px',
                }}
              ></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StatCardSkeleton({ count = 4 }) {
  return (
    <div className="row g-3 mb-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div className="col-12 col-sm-6 col-lg-3" key={idx}>
          <div className="hf-stat-card">
            <div className="hf-skeleton" style={{ width: '50px', height: '50px', borderRadius: '12px' }}></div>
            <div className="flex-grow-1">
              <div className="hf-skeleton mb-2" style={{ width: '40%', height: '26px' }}></div>
              <div className="hf-skeleton" style={{ width: '75%', height: '14px' }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CardSkeleton;
