/**
 * AnomalyDisplay.jsx
 *
 * 이변(Anomaly) 표시 UI 컴포넌트
 * 전투 중 활성화된 이변을 표시
 */

import React from 'react';

// 이변 표시 컴포넌트
export function AnomalyDisplay({ anomalies = [], style = {} }) {
  if (!anomalies || anomalies.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        ...style
      }}
    >
      {anomalies.map(({ anomaly, level }, idx) => (
        <div
          key={idx}
          style={{
            padding: '4px 8px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '6px',
            color: '#fca5a5',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title={anomaly?.getEffect?.(level)?.description || ''}
        >
          <span>{anomaly?.emoji || '⚠️'}</span>
          <span>{anomaly?.name || '이변'}</span>
          <span style={{ opacity: 0.7 }}>Lv.{level}</span>
        </div>
      ))}
    </div>
  );
}

// 이변 알림 컴포넌트 (전투 시작 시 표시)
export function AnomalyNotification({ anomalies = [], show = false, onClose }) {
  if (!show || !anomalies || anomalies.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid rgba(239, 68, 68, 0.7)',
        borderRadius: '12px',
        padding: '24px',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '500px'
      }}
    >
      <h3
        style={{
          margin: '0 0 16px 0',
          color: '#ef4444',
          fontSize: '18px',
          fontWeight: 'bold',
          textAlign: 'center'
        }}
      >
        ⚠️ 이변 발생!
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {anomalies.map(({ anomaly, level }, idx) => {
          const effect = anomaly?.getEffect?.(level);
          return (
            <div
              key={idx}
              style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>{anomaly?.emoji || '⚠️'}</span>
                <span style={{ color: '#fca5a5', fontWeight: 'bold' }}>
                  {anomaly?.name || '알 수 없는 이변'} (Lv.{level})
                </span>
              </div>
              <p style={{ margin: 0, color: '#d1d5db', fontSize: '14px' }}>
                {effect?.description || '효과 없음'}
              </p>
            </div>
          );
        })}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginTop: '16px',
            width: '100%',
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.3)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          확인
        </button>
      )}
    </div>
  );
}

export default AnomalyDisplay;
