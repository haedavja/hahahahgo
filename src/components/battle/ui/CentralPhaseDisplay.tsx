/**
 * CentralPhaseDisplay.tsx
 *
 * 중앙 단계 표시 및 컨트롤 버튼 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { UI_AUDIO } from '../../../core/effects';
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

/**
 * 중앙 페이즈 디스플레이 컴포넌트 Props
 *
 * 화면 중앙에 현재 전투 단계와 관련 UI를 표시합니다.
 * 선택/대응/진행 단계별로 다른 버튼과 정보가 표시됩니다.
 */
interface CentralPhaseDisplayProps {
  /** 현재 전투 상태 (phase, selected 등) */
  battle: Battle;
  /** 총 사용 속도 */
  totalSpeed: number;
  /** 최대 속도 제한 */
  MAX_SPEED: number;
  /** 최대 제출 카드 수 */
  MAX_SUBMIT_CARDS: number;
  /** 손패 다시 뽑기 함수 */
  redrawHand: () => void;
  /** 다시 뽑기 가능 여부 */
  canRedraw: boolean;
  /** 진행 단계 시작 함수 */
  startResolve: () => void;
  /** 사운드 재생 함수 */
  playSound: (freq: number, duration: number) => void;
  /** 전투 관련 액션 함수들 */
  actions: Actions;
  /** 오버드라이브 예정 여부 */
  willOverdrive: boolean;
  /** 에테르 슬롯 계산 함수 */
  etherSlots: (pts: number) => number;
  /** 플레이어 상태 */
  player: Player;
  /** 대응 단계에서 진행 단계로 전환 함수 */
  beginResolveFromRespond: () => void;
  /** 선택 단계로 되감기 함수 */
  rewindToSelect: () => void;
  /** 되감기 사용 횟수 */
  rewindUsedCount: number;
  /** 최대 되감기 가능 횟수 (기본 1 + 시계 보너스) */
  maxRewinds?: number;
  /** 대응 단계 스냅샷 (되감기용) */
  respondSnapshot: RespondSnapshot | null;
  /** 자동 진행 모드 활성화 여부 */
  autoProgress: boolean;
  /** 에테르 최종 값 (계산 완료 후) */
  etherFinalValue: number | null;
  /** 적 상태 */
  enemy: Enemy;
  /** 턴 종료 함수 */
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
  rewindUsedCount,
  maxRewinds = 1,
  respondSnapshot,
  autoProgress,
  enemy,
  finishTurn
}) => {
  // 핸들러 메모이제이션
  const handleSubmit = useCallback(() => {
    startResolve();
    playSound(UI_AUDIO.SHORTCUT.tone, UI_AUDIO.SHORTCUT.duration);
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
    <div style={CONTAINER_STYLE} data-testid="central-phase-display">
      <div style={PHASE_TITLE_STYLE} data-testid="battle-phase" data-phase={battle.phase}>
        {phaseTitle}
      </div>
      <div style={SPEED_INFO_STYLE} data-testid="battle-speed-info">
        속도 {totalSpeed}/{MAX_SPEED} · 선택 {battle.selected.length}/{MAX_SUBMIT_CARDS}
      </div>

      {battle.phase === 'select' && (
        <div style={BUTTON_GROUP_STYLE}>
          <button onClick={redrawHand} disabled={!canRedraw} className="btn-enhanced flex items-center gap-2" style={BTN_NORMAL_STYLE}>
            🔄 리드로우 (R)
          </button>
          <button onClick={handleSubmit} disabled={battle.selected.length === 0} className="btn-enhanced btn-primary flex items-center gap-2" style={BTN_PRIMARY_STYLE} data-testid="submit-cards-btn">
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
              disabled={rewindUsedCount >= maxRewinds || !respondSnapshot}
              style={{ fontSize: '1rem', padding: '9.6px 18px', fontWeight: 700, minWidth: '160px', opacity: rewindUsedCount >= maxRewinds ? 0.5 : 1 }}
            >
              ⏪ 되감기 ({maxRewinds - rewindUsedCount}/{maxRewinds})
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
