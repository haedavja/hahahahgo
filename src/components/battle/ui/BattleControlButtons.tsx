/**
 * BattleControlButtons.tsx
 *
 * 전투 화면 우측 하단 제어 버튼 (간소화, 정렬, DEV)
 */

import { FC, memo, useCallback } from 'react';
import { playSound } from '../../../lib/soundUtils';
import type { SortType } from '../reducer/battleReducerActions';

interface BattleControlButtonsProps {
  isSimplified: boolean;
  sortType: SortType;
  devForceAllCards: boolean;
  setIsSimplified: (value: boolean) => void;
  cycleSortType: () => void;
  setDevForceAllCards: (value: boolean) => void;
}

const SORT_TYPE_LABELS: Record<SortType, string> = {
  speed: '시간',
  cost: '비용',
  order: '순서',
  energy: '행동력',
  value: '밸류',
  type: '종류',
};

export const BattleControlButtons: FC<BattleControlButtonsProps> = memo(function BattleControlButtons({
  isSimplified,
  sortType,
  devForceAllCards,
  setIsSimplified,
  cycleSortType,
  setDevForceAllCards,
}) {
  const handleSimplifyToggle = useCallback(() => {
    const newVal = !isSimplified;
    try {
      localStorage.setItem('battleIsSimplified', newVal.toString());
    } catch {
      /* ignore */
    }
    setIsSimplified(newVal);
    playSound(500, 60);
  }, [isSimplified, setIsSimplified]);

  const handleDevToggle = useCallback(() => {
    setDevForceAllCards(!devForceAllCards);
    playSound(500, 60);
  }, [devForceAllCards, setDevForceAllCards]);

  return (
    <div className="submit-button-fixed" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={handleSimplifyToggle}
        className={`btn-enhanced ${isSimplified ? 'btn-primary' : ''} flex items-center gap-2`}
      >
        {isSimplified ? '📋' : '📄'} 간소화 (Q)
      </button>
      <button
        onClick={cycleSortType}
        className="btn-enhanced flex items-center gap-2"
        style={{ fontSize: '0.9rem' }}
      >
        🔀 정렬 ({SORT_TYPE_LABELS[sortType]}) (F)
      </button>
      <button
        onClick={handleDevToggle}
        className={`btn-enhanced ${devForceAllCards ? 'btn-primary' : ''} flex items-center gap-2`}
        style={{ fontSize: '0.8rem' }}
      >
        🛠️ DEV: 전체카드 {devForceAllCards ? 'ON' : 'OFF'}
      </button>
    </div>
  );
});
