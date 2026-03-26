/**
 * @file BattleSidebars.tsx
 * @description 전투 화면의 고정 사이드바 컴포넌트들
 *
 * BattleApp.tsx에서 분리된 사이드바 렌더링 로직
 * - 왼쪽: 에테르 바, 아이템 슬롯, 파토스 슬롯
 * - 오른쪽: 예상 피해량 미리보기
 */

import React, { lazy, Suspense, memo, type MutableRefObject } from 'react';
import { EtherBar } from '../EtherBar';
import { ItemSlots } from '../ItemSlots';
import { PathosSlots } from '../PathosSlots';
import type { HandAction, Card, TokenEntity } from '../../../../types';
import type { BattleActions } from '../../hooks/useBattleState';

// Lazy loaded
const ExpectedDamagePreview = lazy(() => import('../ExpectedDamagePreview').then(m => ({ default: m.ExpectedDamagePreview })));

export interface BattleSidebarsProps {
  // 에테르 바
  playerEtherValue: number;
  playerEtherSlots: number;
  previewEtherGain: number;
  playerTransferPulse: boolean;
  showBarTooltip: boolean;
  showPtsTooltip: boolean;

  // 아이템/파토스 슬롯
  phase: string;
  battleActions: BattleActions;
  player: TokenEntity & { hp: number; block?: number; strength?: number };
  enemy: TokenEntity & { hp: number; block?: number };
  enemyPlan: { actions: unknown[]; mode: string | null };
  battleRef: MutableRefObject<unknown>;
  pathosCooldowns: Record<string, number>;
  onPathosUsed: (id: string, result: unknown) => void;

  // 예상 피해량 미리보기
  fixedOrder: HandAction[] | null;
  playerTimeline: HandAction[];
  willOverdrive: boolean;
  log: string[];
  qIndex: number;
  queue: HandAction[];
  stepOnce: () => void;
  runAll: () => void;
  finishTurn: () => void;
  postCombatOptions: { type: string } | null;
  handleExitToMap: () => void;
  autoProgress: boolean;
  setAutoProgress: (v: boolean) => void;
  resolveStartPlayer: unknown;
  resolveStartEnemy: unknown;
  turnNumber: number;
  simulatePreview: () => unknown;
  comboStepsLog: string[];
}

/**
 * 전투 사이드바 통합 컴포넌트
 */
export const BattleSidebars = memo(function BattleSidebars({
  // 에테르 바
  playerEtherValue,
  playerEtherSlots,
  previewEtherGain,
  playerTransferPulse,
  showBarTooltip,
  showPtsTooltip,
  // 슬롯
  phase,
  battleActions,
  player,
  enemy,
  enemyPlan,
  battleRef,
  pathosCooldowns,
  onPathosUsed,
  // 예상 피해량
  fixedOrder,
  playerTimeline,
  willOverdrive,
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
  turnNumber,
  simulatePreview,
  comboStepsLog,
}: BattleSidebarsProps) {
  return (
    <>
      {/* 에테르 게이지 - 왼쪽 고정 */}
      <div style={{
        position: 'fixed',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100
      }}>
        <EtherBar
          key={`player-ether-${playerEtherValue}`}
          pts={playerEtherValue}
          slots={playerEtherSlots}
          previewGain={previewEtherGain}
          label="ETHER"
          pulse={playerTransferPulse}
          showBarTooltip={showBarTooltip}
          showPtsTooltip={showPtsTooltip}
        />
      </div>

      {/* 아이템 슬롯 - 왼쪽 상단 고정 */}
      <ItemSlots
        phase={phase}
        battleActions={battleActions}
        player={player}
        enemy={enemy}
        enemyPlan={enemyPlan}
        battleRef={battleRef}
      />

      {/* 파토스 슬롯 - 아이템 슬롯 아래 */}
      <PathosSlots
        phase={phase}
        player={player}
        enemy={enemy}
        cooldowns={pathosCooldowns}
        onPathosUsed={onPathosUsed}
        battleRef={battleRef}
      />

      {/* 예상 피해량 - 오른쪽 고정 패널 */}
      <div className="expect-sidebar-fixed">
        <Suspense fallback={<div style={{ padding: '16px', color: '#94a3b8' }}>로딩 중...</div>}>
          <ExpectedDamagePreview
            player={player}
            enemy={enemy}
            fixedOrder={fixedOrder || playerTimeline}
            willOverdrive={willOverdrive}
            enemyMode={(enemyPlan.mode ?? null) as string}
            enemyActions={enemyPlan.actions ?? []}
            phase={phase}
            log={log}
            qIndex={qIndex}
            queue={queue}
            stepOnce={stepOnce}
            runAll={runAll}
            finishTurn={finishTurn}
            postCombatOptions={postCombatOptions}
            handleExitToMap={handleExitToMap}
            autoProgress={autoProgress}
            setAutoProgress={setAutoProgress}
            resolveStartPlayer={resolveStartPlayer}
            resolveStartEnemy={resolveStartEnemy}
            turnNumber={turnNumber}
            simulatePreview={simulatePreview}
          />
        </Suspense>
        {/* 배율 경로 */}
        {comboStepsLog.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.2)', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, marginBottom: '6px', color: '#fbbf24' }}>🧮 배율 경로</div>
            {comboStepsLog.map((step: string, idx: number) => (
              <div key={idx} style={{ color: '#cbd5e1' }}>{idx + 1}. {step}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
});
