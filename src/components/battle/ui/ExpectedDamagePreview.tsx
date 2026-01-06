/**
 * ExpectedDamagePreview.tsx
 *
 * 예상 피해량 미리보기 패널 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, memo, useMemo, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { BattleLog } from './BattleLog';
import type {
  ExpectedDamagePlayer as Player,
  ExpectedDamageEnemy as Enemy,
  SimulationResult,
  PostCombatOptions,
  UITimelineAction,
  Card,
} from '../../../types';

// =====================
// 스타일 상수
// =====================

const BOARD_STYLE: CSSProperties = {
  position: 'relative'
};

const TITLE_CONTAINER_STYLE: CSSProperties = {
  marginBottom: '16px',
  paddingBottom: '12px',
  borderBottom: '2px solid rgba(148, 163, 184, 0.3)'
};

const TITLE_STYLE: CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#f8fafc'
};

const LOG_SECTION_STYLE: CSSProperties = {
  marginTop: '20px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(148, 163, 184, 0.15)'
};

const LINE_NUMBER_STYLE: CSSProperties = {
  color: '#94a3b8',
  marginRight: '4px'
};

const HP_INFO_BASE_STYLE: CSSProperties = {
  fontSize: '13px',
  fontWeight: 'bold',
  marginTop: '4px'
};

const LOG_LINE_BASE_STYLE: CSSProperties = {
  fontSize: '13px',
  marginBottom: '6px'
};

const CONTROL_SECTION_STYLE: CSSProperties = {
  marginTop: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
  paddingBottom: '80px',
  background: 'rgba(7, 11, 30, 0.98)',
  borderTop: '2px solid rgba(148, 163, 184, 0.3)',
  position: 'relative'
};

const VICTORY_TEXT_STYLE: CSSProperties = {
  fontSize: '48px',
  fontWeight: 'bold',
  color: '#22c55e',
  textShadow: '0 4px 12px rgba(0,0,0,0.8)',
  marginTop: '16px',
  marginBottom: '16px'
};

interface ExpectedDamagePreviewProps {
  player: Player;
  enemy: Enemy;
  fixedOrder: UITimelineAction[] | null;
  willOverdrive: boolean;
  enemyMode: string;
  enemyActions: Card[];
  phase: string;
  log: string[] | null;
  qIndex: number;
  queue: UITimelineAction[] | null;
  stepOnce: () => void;
  runAll: () => void;
  finishTurn: (reason: string) => void;
  postCombatOptions: PostCombatOptions | null;
  handleExitToMap: () => void;
  autoProgress: boolean;
  setAutoProgress: (value: boolean) => void;
  resolveStartPlayer: Player | null;
  resolveStartEnemy: Enemy | null;
  turnNumber?: number;
  simulatePreview: (params: {
    player: Player;
    enemy: Enemy;
    fixedOrder: UITimelineAction[] | null;
    willOverdrive: boolean;
    enemyMode: string;
    enemyActions: Card[];
    turnNumber: number;
  }) => SimulationResult;
}

export const ExpectedDamagePreview: FC<ExpectedDamagePreviewProps> = memo(({
  player,
  enemy,
  fixedOrder,
  willOverdrive,
  enemyMode,
  enemyActions,
  phase,
  log,
  qIndex,
  queue,
  stepOnce,
  runAll,
  finishTurn,
  postCombatOptions,
  handleExitToMap,
  autoProgress,
  setAutoProgress,
  resolveStartPlayer,
  resolveStartEnemy,
  turnNumber = 1,
  simulatePreview
}) => {
  // 진행 단계에서는 시작 시점의 상태로 시뮬레이션, 그 외는 현재 상태 사용
  const simPlayer = phase === 'resolve' && resolveStartPlayer ? resolveStartPlayer : player;
  const simEnemy = phase === 'resolve' && resolveStartEnemy ? resolveStartEnemy : enemy;

  const res = useMemo(() => simulatePreview({ player: simPlayer, enemy: simEnemy, fixedOrder, willOverdrive, enemyMode, enemyActions, turnNumber }), [simPlayer, simEnemy, fixedOrder, willOverdrive, enemyMode, enemyActions, turnNumber, simulatePreview]);

  const summaryItems = useMemo(() => [
    { icon: "🗡️", label: "예상 타격 피해", value: res.pDealt, accent: "text-emerald-300", hpInfo: `몬스터 HP ${simEnemy.hp} → ${res.finalEHp}`, hpColor: "#fca5a5" },
    { icon: "💥", label: "예상 피격 피해", value: phase === 'select' ? '?' : res.pTaken, accent: "text-rose-300", hpInfo: `플레이어 HP ${simPlayer.hp} → ${res.finalPHp}`, hpColor: "#e2e8f0" },
  ], [res.pDealt, res.pTaken, res.finalEHp, res.finalPHp, simEnemy.hp, simPlayer.hp, phase]);

  const phaseLabel = phase === 'select' ? '선택 단계' : phase === 'respond' ? '대응 단계' : '진행 단계';

  // 전투 로그 자동 스크롤
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (logContainerRef.current && phase === 'resolve' && log && log.length > 0) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log, phase]);

  return (
    <div className="expect-board expect-board-vertical" style={BOARD_STYLE}>
      {/* 타이틀 */}
      <div style={TITLE_CONTAINER_STYLE}>
        <div style={TITLE_STYLE}>
          예상 피해량
        </div>
      </div>

      <div className="expect-summary-vertical">
        {summaryItems.map((item) => (
          <div key={item.label} className="expect-item-vertical">
            <span className="expect-icon">{item.icon}</span>
            <div>
              <div className="expect-label">{item.label}</div>
              <div className={`expect-value ${item.accent}`}>{item.value}</div>
              {item.hpInfo && (
                <div style={{ ...HP_INFO_BASE_STYLE, color: item.hpColor }}>
                  {item.hpInfo}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 진행 단계가 아닐 때만 예상 피해량 로그 표시 */}
      {phase !== 'resolve' && !!res.lines?.length && (
        <div style={LOG_SECTION_STYLE}>
          {res.lines.map((line, idx) => {
            const startsWithMonster = line.trim().startsWith('몬스터');
            const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어→') || line.includes('플레이어 •');
            const lineColor = startsWithMonster ? '#fca5a5' : isPlayerAction ? '#60a5fa' : '#cbd5e1';
            return (
              <div key={idx} style={{ ...LOG_LINE_BASE_STYLE, color: lineColor }}>
                <span style={LINE_NUMBER_STYLE}>{idx + 1}.</span>
                {line}
              </div>
            );
          })}
        </div>
      )}

      {/* 진행 단계 전투 로그 (전투 종료 후에도 유지) */}
      <BattleLog phase={phase} log={log} logContainerRef={logContainerRef} showAlways={!!postCombatOptions} />

      {/* 진행 단계 제어 버튼 또는 승리 UI (패배는 중앙 오버레이로 표시) */}
      {(phase === 'resolve' || postCombatOptions?.type === 'victory') && (
        <div style={CONTROL_SECTION_STYLE}>
          {postCombatOptions?.type === 'victory' && (
            <>
              <div style={VICTORY_TEXT_STYLE}>
                🎉 승리!
              </div>
              <button onClick={handleExitToMap} className="btn-enhanced btn-primary flex items-center gap-2">
                🗺️ 맵으로 돌아가기
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});
