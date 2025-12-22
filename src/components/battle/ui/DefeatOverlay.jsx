/**
 * 패배 오버레이 컴포넌트
 * 패배 시 중앙에 표시되는 오버레이
 */
export function DefeatOverlay({ onExit }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.7)',
      zIndex: 9999,
      pointerEvents: 'auto'
    }}>
      <div style={{
        fontSize: '64px',
        fontWeight: 'bold',
        color: '#ef4444',
        textShadow: '0 4px 20px rgba(0,0,0,0.9)',
        marginBottom: '24px'
      }}>
        💀 패배...
      </div>
      <button
        onClick={onExit}
        className="btn-enhanced btn-primary"
        style={{ fontSize: '20px', padding: '16px 48px' }}
      >
        확인
      </button>
    </div>
  );
}
