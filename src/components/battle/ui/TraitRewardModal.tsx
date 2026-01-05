/**
 * TraitRewardModal.tsx
 *
 * 전투 승리 시 특성 보상 선택 모달
 * 30% 확률로 등장하며, 3개의 특성 중 하나를 선택
 */

import { FC, memo } from 'react';

interface TraitOption {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface TraitRewardModalProps {
  traits: TraitOption[];
  onSelect: (trait: TraitOption) => void;
  onSkip: () => void;
}

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
};

const MODAL_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  border: '2px solid #86efac',
  borderRadius: '16px',
  padding: '24px',
  maxWidth: '500px',
  width: '90%'
};

const TITLE_STYLE: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '20px',
  color: '#86efac',
  fontSize: '1.3rem',
  fontWeight: 700
};

const DESC_STYLE: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '0.9rem',
  textAlign: 'center',
  marginBottom: '16px'
};

const BUTTON_STYLE: React.CSSProperties = {
  padding: '16px',
  background: 'rgba(134, 239, 172, 0.1)',
  border: '2px solid #86efac',
  borderRadius: '10px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s',
  width: '100%'
};

const SKIP_BUTTON_STYLE: React.CSSProperties = {
  width: '100%',
  marginTop: '16px',
  padding: '12px',
  background: 'transparent',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#94a3b8',
  cursor: 'pointer'
};

export const TraitRewardModal: FC<TraitRewardModalProps> = memo(function TraitRewardModal({
  traits,
  onSelect,
  onSkip
}) {
  return (
    <div style={OVERLAY_STYLE}>
      <div style={MODAL_STYLE}>
        <div style={TITLE_STYLE}>✨ 특성 보상</div>
        <div style={DESC_STYLE}>
          카드 특화에 사용할 수 있는 특성을 획득합니다
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {traits.map((trait) => (
            <button
              key={trait.id}
              onClick={() => onSelect(trait)}
              style={BUTTON_STYLE}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(134, 239, 172, 0.25)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(134, 239, 172, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={{
                color: '#86efac',
                fontWeight: 700,
                marginBottom: '4px'
              }}>
                +{trait.name}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                {trait.description}
              </div>
            </button>
          ))}
        </div>
        <button onClick={onSkip} style={SKIP_BUTTON_STYLE}>
          건너뛰기
        </button>
      </div>
    </div>
  );
});
