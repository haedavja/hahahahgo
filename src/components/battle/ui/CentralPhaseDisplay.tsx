/**
 * CentralPhaseDisplay.tsx
 *
 * 중앙 단계 표시 및 컨트롤 버튼 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type {
  CentralBattle as Battle,
  CentralPlayer as Player,
  CentralEnemy as Enemy,
  CentralActions as Actions,
  RespondSnapshot,
} from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  textAlign: 'center',
  flex: '0 0 auto',
  paddingTop: '20px',
  marginRight: '0',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '10px',
  background: 'transparent',
  border: 'none',
  borderRadius: '16px',
  padding: '20px 28px',
  boxShadow: 'none',
  position: 'fixed',
  top: '270px',
  left: '50%',
  transform: 'translate(calc(-50% - 165px), 0)',
  zIndex: 3600,
  pointerEvents: 'auto'
};

const PHASE_TITLE_STYLE: CSSProperties = {
  fontSize: '36px',
  fontWeight: 'bold',
  color: '#f8fafc',
  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  marginBottom: '16px'
};

const SPEED_INFO_STYLE: CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#7dd3fc',
  marginBottom: '12px'
};

const BUTTON_GROUP_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  alignItems: 'center',
  marginTop: '16px'
};

const BUTTON_ROW_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: '16px'
};

const BUTTON_PAIR_STYLE: CSSProperties = {
  display: 'flex',
  gap: '10px'
};

const BTN_NORMAL_STYLE: CSSProperties = {
  fontSize: '1rem',
  padding: '8px 20px',
  minWidth: '200px'
};

const BTN_PRIMARY_STYLE: CSSProperties = {
  fontSize: '1.25rem',
  padding: '9.6px 24px',
  fontWeight: 700,
  minWidth: '200px'
};

const BTN_LARGE_STYLE: CSSProperties = {
  fontSize: '1.25rem',
  padding: '12px 24px',
  fontWeight: 700,
  minWidth: '200px'
};

const KEY_HINT_STYLE: CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 900
};

interface CentralPhaseDisplayProps {
  battle: Battle;
  totalSpeed: number;
  MAX_SPEED: number;
  MAX_SUBMIT_CARDS: number;
  redrawHand: () => void;
  canRedraw: boolean;
  startResolve: () => void;
  playSound: (freq: number, duration: number) => void;
  actions: Actions;
  willOverdrive: boolean;
  etherSlots: (pts: number) => number;
  player: Player;
  beginResolveFromRespond: () => void;
  rewindToSelect: () => void;
  rewindUsed: boolean;
  respondSnapshot: RespondSnapshot | null;
  autoProgress: boolean;
  etherFinalValue: number | null;
  enemy: Enemy;
  finishTurn: (reason: string) => void;
}

export const CentralPhaseDisplay: FC<CentralPhaseDisplayProps> = memo(({
  battle,
  totalSpeed,
  MAX_SPEED,
  MAX_SUBMIT_CARDS,
  redrawHand,
  canRedraw,
  startResolve,
  playSound,
  actions,
  willOverdrive,
  etherSlots,
  player,
  beginResolveFromRespond,
  rewindToSelect,
  rewindUsed,
  respondSnapshot,
  autoProgress,
  enemy,
  finishTurn
}) => {
  // 핸들러 메모이제이션
  const handleSubmit = useCallback(() => {
    startResolve();
    playSound(900, 120);
  }, [startResolve, playSound]);

  const handleOverdriveToggle = useCallback(() => {
    actions.setWillOverdrive(!willOverdrive);
  }, [actions, willOverdrive]);

  const handleAutoProgressToggle = useCallback(() => {
    actions.setAutoProgress(!autoProgress);
  }, [actions, autoProgress]);

  const handleVictory = useCallback(() => {
    finishTurn('전투 승리');
  }, [finishTurn]);

  const handleTurnEnd = useCallback(() => {
    finishTurn('수동 턴 종료');
  }, [finishTurn]);

  const phaseTitle = battle.phase === 'select' ? '선택 단계' : battle.phase === 'respond' ? '대응 단계' : '진행 단계';

  return (
    <div style={CONTAINER_STYLE}>
      <div style={PHASE_TITLE_STYLE}>
        {phaseTitle}
      </div>
      <div style={SPEED_INFO_STYLE}>
        속도 {totalSpeed}/{MAX_SPEED} · 선택 {battle.selected.length}/{MAX_SUBMIT_CARDS}
      </div>

      {battle.phase === 'select' && (
        <div style={BUTTON_GROUP_STYLE}>
          <button onClick={redrawHand} disabled={!canRedraw} className="btn-enhanced flex items-center gap-2" style={BTN_NORMAL_STYLE}>
            🔄 리드로우 (R)
          </button>
          <button onClick={handleSubmit} disabled={battle.selected.length === 0} className="btn-enhanced btn-primary flex items-center gap-2" style={BTN_PRIMARY_STYLE}>
            ▶️ 제출 <span style={KEY_HINT_STYLE}>(E)</span>
          </button>
          <button onClick={handleOverdriveToggle}
            disabled={etherSlots(player.etherPts ?? 0) <= 0}
            className={`btn-enhanced ${willOverdrive ? 'btn-primary' : ''} flex items-center gap-2`}
            style={BTN_NORMAL_STYLE}>
            ✨ 기원 {willOverdrive ? 'ON' : 'OFF'} (Space)
          </button>
        </div>
      )}
      {battle.phase === 'respond' && (
        <div style={BUTTON_ROW_STYLE}>
          <div style={BUTTON_PAIR_STYLE}>
            <button onClick={beginResolveFromRespond} className="btn-enhanced btn-success flex items-center gap-2" style={BTN_PRIMARY_STYLE}>
              ▶️ 진행 시작 <span style={KEY_HINT_STYLE}>(E)</span>
            </button>
            <button
              onClick={rewindToSelect}
              className="btn-enhanced flex items-center gap-2"
              disabled={rewindUsed || !respondSnapshot}
              style={{ fontSize: '1rem', padding: '9.6px 18px', fontWeight: 700, minWidth: '160px', opacity: rewindUsed ? 0.5 : 1 }}
            >
              ⏪ 되감기 (1회)
            </button>
          </div>
        </div>
      )}
      {battle.phase === 'resolve' && battle.qIndex < battle.queue.length && (
        <div style={BUTTON_ROW_STYLE}>
          <button
            onClick={handleAutoProgressToggle}
            className={`btn-enhanced flex items-center gap-2 ${autoProgress ? 'btn-primary' : ''}`}
            style={BTN_LARGE_STYLE}
          >
            {autoProgress ? (
              <>⏸️ 진행 중지 <span style={KEY_HINT_STYLE}>(E)</span></>
            ) : (
              <>▶️ 진행 <span style={KEY_HINT_STYLE}>(E)</span></>
            )}
          </button>
        </div>
      )}
      {battle.phase === 'resolve' && battle.qIndex >= battle.queue.length && (
        <div style={BUTTON_ROW_STYLE}>
          {enemy.hp <= 0 ? (
            <button onClick={handleVictory} className="btn-enhanced btn-success flex items-center gap-2" style={BTN_LARGE_STYLE}>
              🎉 전투 종료 <span style={KEY_HINT_STYLE}>(E)</span>
            </button>
          ) : (
            <button onClick={handleTurnEnd} className="btn-enhanced btn-primary flex items-center gap-2" style={BTN_LARGE_STYLE}>
              ⏭️ 턴 종료 <span style={KEY_HINT_STYLE}>(E)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});
