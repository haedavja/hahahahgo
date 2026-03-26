/**
 * BlessingModal.tsx
 * 축복 선택 모달 컴포넌트
 * RestModal에서 분리됨
 */

import { memo, useCallback } from 'react';

/** 임시 버프 타입 */
interface TempBuff {
  stat: 'strength' | 'agility' | 'insight';
  value: number;
  remainingNodes: number;
}

interface BlessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBless: (buff: TempBuff) => void;
  grace: number;
  blessingUsed: boolean;
}

const BLESSING_OPTIONS = [
  {
    id: 'strength',
    emoji: '⚔️',
    name: '전투의 축복',
    description: '5노드 동안',
    bonus: '힘 +2',
    color: 'rgba(248, 113, 113',
    buff: { stat: 'strength' as const, value: 2, remainingNodes: 5 },
  },
  {
    id: 'agility',
    emoji: '💨',
    name: '신속의 축복',
    description: '5노드 동안',
    bonus: '민첩 +1',
    color: 'rgba(96, 165, 250',
    buff: { stat: 'agility' as const, value: 1, remainingNodes: 5 },
  },
] as const;

export const BlessingModal = memo(function BlessingModal({
  isOpen,
  onClose,
  onBless,
  grace,
  blessingUsed,
}: BlessingModalProps) {
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const handleBless = useCallback((buff: TempBuff) => {
    if (grace < 1 || blessingUsed) return;
    onBless(buff);
  }, [grace, blessingUsed, onBless]);

  if (!isOpen) return null;

  return (
    <div
      className="event-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1001 }}
    >
      <div
        className="event-modal"
        onClick={handleStopPropagation}
        style={{ maxWidth: '400px' }}
      >
        <header>
          <h3>🙏 축복 선택</h3>
          <small>은총화 1개를 소모하여 5노드 동안 스탯 버프를 받습니다</small>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {BLESSING_OPTIONS.map(option => (
            <button
              key={option.id}
              className="btn"
              onClick={() => handleBless(option.buff)}
              disabled={grace < 1 || blessingUsed}
              style={{
                padding: '16px',
                background: `${option.color}, 0.15)`,
                border: `1px solid ${option.color}, 0.4)`,
                borderRadius: '8px',
                textAlign: 'left',
                opacity: grace < 1 || blessingUsed ? 0.5 : 1,
              }}
              data-testid={`rest-btn-bless-${option.id}`}
            >
              <div style={{ fontWeight: 'bold', color: `${option.color}, 1)`, fontSize: '15px' }}>
                {option.emoji} {option.name}
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
                {option.description} <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{option.bonus}</span>
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '16px', padding: '8px', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '6px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', color: '#a78bfa' }}>
            비용: 은총화 1개 (보유: {grace}개)
          </span>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
});

export default BlessingModal;
