/**
 * DefeatOverlay.tsx
 *
 * 패배 오버레이 컴포넌트
 * 패배 시 중앙에 표시되는 오버레이
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo } from 'react';
import type { CSSProperties } from 'react';

// =====================
// 스타일 상수
// =====================

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.7)',
  zIndex: 9999,
  pointerEvents: 'auto'
};

const MESSAGE_STYLE: CSSProperties = {
  fontSize: '64px',
  fontWeight: 'bold',
  color: '#ef4444',
  textShadow: '0 4px 20px rgba(0,0,0,0.9)',
  marginBottom: '24px'
};

const BUTTON_STYLE: CSSProperties = {
  fontSize: '20px',
  padding: '16px 48px'
};

interface DefeatOverlayProps {
  onExit: () => void;
}

export const DefeatOverlay: FC<DefeatOverlayProps> = memo(({ onExit }) => {
  return (
    <div style={OVERLAY_STYLE}>
      <div style={MESSAGE_STYLE}>
        💀 패배...
      </div>
      <button
        onClick={onExit}
        className="btn-enhanced btn-primary"
        style={BUTTON_STYLE}
      >
        확인
      </button>
    </div>
  );
});
