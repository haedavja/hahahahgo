/**
 * AwakenModal.tsx
 * 각성 선택 모달 컴포넌트
 * RestModal에서 분리됨
 */

import { memo, useCallback } from 'react';

interface AwakenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAwaken: (type: string) => void;
  memoryValue: number;
}

const AWAKEN_CATEGORIES = [
  {
    id: 'warrior',
    emoji: '⚔️',
    name: '전사',
    color: 'rgba(248, 113, 113',
    options: [
      { type: 'brave', name: '용맹', bonus: '+힘 1' },
      { type: 'sturdy', name: '굳건', bonus: '+체력 10' },
    ],
  },
  {
    id: 'sage',
    emoji: '📖',
    name: '현자',
    color: 'rgba(96, 165, 250',
    options: [
      { type: 'cold', name: '냉철', bonus: '+통찰 1' },
      { type: 'thorough', name: '철저', bonus: '+보조슬롯 1' },
    ],
  },
  {
    id: 'hero',
    emoji: '🦸',
    name: '영웅',
    color: 'rgba(251, 191, 36',
    options: [
      { type: 'passionate', name: '열정', bonus: '+속도 5' },
      { type: 'lively', name: '활력', bonus: '+행동력 1' },
    ],
  },
  {
    id: 'faith',
    emoji: '🙏',
    name: '신앙',
    color: 'rgba(167, 139, 250',
    options: [
      { type: 'random', name: '랜덤 개성', bonus: '???' },
    ],
  },
] as const;

export const AwakenModal = memo(function AwakenModal({
  isOpen,
  onClose,
  onAwaken,
}: AwakenModalProps) {
  const handleStopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

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
        style={{ maxWidth: '500px' }}
      >
        <header>
          <h3>✨ 각성 선택</h3>
          <small>기억 100을 소모하여 개성을 획득합니다</small>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '16px' }}>
          {AWAKEN_CATEGORIES.map(category => (
            <div
              key={category.id}
              style={{
                padding: '12px',
                background: `${category.color}, 0.15)`,
                border: `1px solid ${category.color}, 0.4)`,
                borderRadius: '8px',
              }}
            >
              <div style={{ fontWeight: 'bold', color: `${category.color}, 1)`, marginBottom: '8px', fontSize: '14px' }}>
                {category.emoji} {category.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {category.options.map(option => (
                  <button
                    key={option.type}
                    className="btn"
                    onClick={() => onAwaken(option.type)}
                    data-testid={`rest-btn-${option.type}`}
                    style={{ fontSize: '13px' }}
                  >
                    {option.name}{' '}
                    <span style={{ color: option.bonus === '???' ? '#f59e0b' : '#22c55e', fontWeight: 'bold' }}>
                      {option.bonus}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
});

export default AwakenModal;
