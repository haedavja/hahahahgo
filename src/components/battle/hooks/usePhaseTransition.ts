/**
 * @file usePhaseTransition.js
 * @description 전투 페이즈 전환 훅
 * @typedef {import('../../../types').Card} Card
 *
 * ## 페이즈 흐름
 * select → respond → resolve
 *
 * ## 제공 기능
 * - startResolve: select → respond
 * - beginResolveFromRespond: respond → resolve
 * - rewindToSelect: respond → select (되감기)
 *
 * ## 처리 내용
 * - 적 행동 자동 생성
 * - 포커 조합 보너스 적용
 * - 타임라인 순서 결정
 * - 에테르 폭주 발동
 */

import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { detectPokerCombo, applyPokerBonus } from '../utils/comboDetection';
import { createFixedOrder } from '../utils/cardOrdering';
import { sortCombinedOrderStablePF } from '../utils/combatUtils';
import type {
  Card,
  BattleAction,
  PlayerBattleState,
  EnemyUnit,
  EnemyPlan,
  AICard
} from '../../../types';
import type { BattleRefValue } from '../../../types/hooks';
import { generateEnemyActions, shouldEnemyOverdrive, assignSourceUnitToActions } from '../utils/enemyAI';
import { applyTraitModifiers, markCrossedCards } from '../utils/battleUtils';
import { processQueueCollisions } from '../utils/cardSpecialEffects';
import { playCardSubmitSound, playProceedSound } from '../../../lib/soundUtils';
import { ETHER_THRESHOLD } from '../battleData';

/** 되감기 스냅샷 */
interface RespondSnapshot {
  selectedSnapshot: Card[];
  enemyActions: Card[];
}

/** 페이즈 전환 액션 */
interface PhaseTransitionActions {
  setEnemyPlan: (plan: EnemyPlan) => void;
  setFixedOrder: (order: BattleAction[] | null) => void;
  setPlayer: (player: PlayerBattleState) => void;
  setFrozenOrder: (count: number) => void;
  setRespondSnapshot: (snapshot: RespondSnapshot) => void;
  setPhase: (phase: string) => void;
  setQueue: (queue: BattleAction[]) => void;
  setQIndex: (index: number) => void;
  setEtherCalcPhase: (phase: string | null) => void;
  setEtherFinalValue: (value: number | null) => void;
  setEnemyEtherFinalValue: (value: number | null) => void;
  setCurrentDeflation: (value: number | null) => void;
  setEnemyEtherCalcPhase: (phase: string | null) => void;
  setEnemyCurrentDeflation: (value: number | null) => void;
  setEnemy: (enemy: EnemyUnit) => void;
  setPlayerOverdriveFlash: (flash: boolean) => void;
  setEnemyOverdriveFlash: (flash: boolean) => void;
  setResolveStartPlayer: (player: PlayerBattleState) => void;
  setResolveStartEnemy: (enemy: EnemyUnit) => void;
  setResolvedPlayerCards: (count: number) => void;
  setTimelineProgress: (progress: number) => void;
  setTimelineIndicatorVisible: (visible: boolean) => void;
  setNetEtherDelta: (delta: number | null) => void;
  setAutoProgress: (auto: boolean) => void;
  setRewindUsed: (used: boolean) => void;
  setSelected: (cards: Card[]) => void;
}

/** 파토스 다음 카드 효과 */
interface PathosNextCardEffects {
  guaranteeCrit?: boolean;
  setSpeed?: number;
  aoe?: boolean;
}

/** 페이즈 전환 훅 파라미터 */
interface UsePhaseTransitionParams {
  battleRef: MutableRefObject<BattleRefValue | null>;
  battlePhase: string;
  battleSelected: Card[];
  selected: Card[];
  fixedOrder: BattleAction[] | null;
  effectiveAgility: number;
  enemy: EnemyUnit;
  enemyPlan: EnemyPlan;
  enemyCount: number;
  player: PlayerBattleState;
  willOverdrive: boolean;
  turnNumber: number;
  rewindUsed: boolean;
  respondSnapshot: RespondSnapshot | null;
  devilDiceTriggeredRef: MutableRefObject<boolean>;
  etherSlots: (etherPts: number) => number;
  playSound: (frequency: number, duration: number) => void;
  addLog: (message: string) => void;
  actions: PhaseTransitionActions;
  pathosNextCardEffects?: PathosNextCardEffects;
  consumeNextCardEffects?: () => void;
}

/** 페이즈 전환 훅 반환 타입 */
interface UsePhaseTransitionReturn {
  startResolve: () => void;
  beginResolveFromRespond: () => void;
  rewindToSelect: () => void;
}

/**
 * 페이즈 전환 훅
 * @param params - 훅 파라미터
 * @returns 페이즈 전환 함수들
 */
export function usePhaseTransition({
  battleRef,
  battlePhase,
  battleSelected,
  selected,
  fixedOrder,
  effectiveAgility,
  enemy,
  enemyPlan,
  enemyCount,
  player,
  willOverdrive,
  turnNumber,
  rewindUsed,
  respondSnapshot,
  devilDiceTriggeredRef,
  etherSlots,
  playSound,
  addLog,
  actions,
  pathosNextCardEffects,
  consumeNextCardEffects
}: UsePhaseTransitionParams): UsePhaseTransitionReturn {
  // select → respond 전환
  const startResolve = useCallback(() => {
    const currentBattle = battleRef.current;
    const currentEnemyPlan = currentBattle.enemyPlan as EnemyPlan;

    if (currentBattle.phase !== 'select') return;

    // manuallyModified가 true면 재생성하지 않음
    const hasActions = currentEnemyPlan.actions && currentEnemyPlan.actions.length > 0;
    const willRegenerate = !(hasActions || currentEnemyPlan.manuallyModified);

    const cardsPerTurn = enemy?.cardsPerTurn || enemyCount || 2;
    let generatedActions: Card[];
    if (willRegenerate) {
      const rawActions = generateEnemyActions(enemy, currentEnemyPlan.mode, etherSlots(enemy.etherPts ?? 0), cardsPerTurn, Math.min(1, cardsPerTurn));
      generatedActions = assignSourceUnitToActions(rawActions, enemy?.units || []) as unknown as Card[];
    } else {
      generatedActions = currentEnemyPlan.actions;
    }

    actions.setEnemyPlan({
      mode: currentEnemyPlan.mode,
      actions: generatedActions,
      manuallyModified: currentEnemyPlan.manuallyModified
    });

    const pCombo = detectPokerCombo(selected);

    const traitEnhancedSelected = battleSelected.map((card) =>
      applyTraitModifiers(card, {
        usageCount: 0,
        isInCombo: pCombo !== null,
      })
    );

    const enhancedSelected = applyPokerBonus(traitEnhancedSelected, pCombo);

    const currentPlayer = currentBattle.player as PlayerBattleState;
    const q = currentPlayer.enemyFrozen
      ? createFixedOrder(enhancedSelected, generatedActions, effectiveAgility)
      : sortCombinedOrderStablePF(enhancedSelected, generatedActions, effectiveAgility, 0);
    actions.setFixedOrder(q);

    if (currentPlayer.enemyFrozen) {
      actions.setPlayer({ ...currentPlayer, enemyFrozen: false });
      const currentFrozenOrder = battleRef.current?.frozenOrder || 0;
      if (currentFrozenOrder <= 0) {
        actions.setFrozenOrder(1);
        if (battleRef.current) {
          battleRef.current.frozenOrder = 1;
        }
      }
    }

    if (!rewindUsed) {
      actions.setRespondSnapshot({
        selectedSnapshot: selected,
        enemyActions: generatedActions,
      });
    }
    playCardSubmitSound();
    actions.setPhase('respond');
  }, [battleRef, battleSelected, selected, effectiveAgility, enemy, enemyCount, etherSlots, rewindUsed, actions]);

  // respond → resolve 전환
  const beginResolveFromRespond = useCallback(() => {
    const currentBattle = battleRef.current;
    const currentEnemyPlan = currentBattle?.enemyPlan as EnemyPlan | undefined;
    const currentFixedOrder = (currentBattle?.fixedOrder as BattleAction[] | null) || fixedOrder;

    if (currentBattle?.phase !== 'respond') return;
    if (!currentFixedOrder) return addLog('오류: 고정된 순서가 없습니다');

    if (currentFixedOrder.length === 0) {
      addLog('⚠️ 실행할 행동이 없습니다. 최소 1장 이상을 유지하거나 적이 행동 가능한 상태여야 합니다.');
      return;
    }

    let effectiveFixedOrder = currentFixedOrder;
    if (currentEnemyPlan?.manuallyModified && currentEnemyPlan?.actions) {
      const remainingActions = new Set(currentEnemyPlan.actions);
      effectiveFixedOrder = currentFixedOrder.filter((item: BattleAction) => {
        if (item.actor === 'player') return true;
        return item.card && remainingActions.has(item.card);
      });
    }

    let newQ = effectiveFixedOrder.map((x: BattleAction) => ({ actor: x.actor, card: x.card, sp: x.sp }));
    if (newQ.length === 0) {
      addLog('⚠️ 큐 생성 실패: 실행할 항목이 없습니다');
      return;
    }

    // 파토스 setSpeed 효과: 첫 번째 플레이어 카드의 속도 변경
    if (pathosNextCardEffects?.setSpeed !== undefined) {
      const firstPlayerIdx = newQ.findIndex(item => item.actor === 'player');
      if (firstPlayerIdx !== -1) {
        const setSpeedValue = pathosNextCardEffects.setSpeed;
        newQ = newQ.map((item, idx) => {
          if (idx === firstPlayerIdx) {
            return { ...item, sp: setSpeedValue };
          }
          return item;
        });
        addLog(`⚡ 파토스: 첫 번째 카드 속도 → ${setSpeedValue}`);
      }
    }

    const frozenOrderCount = currentBattle?.frozenOrder || battleRef.current?.frozenOrder || 0;

    if (frozenOrderCount <= 0) {
      newQ.sort((a: BattleAction, b: BattleAction) => {
        const aSp = a.sp ?? 0;
        const bSp = b.sp ?? 0;
        if (aSp !== bSp) return aSp - bSp;
        return 0;
      });
    } else {
      const newCount = frozenOrderCount - 1;
      actions.setFrozenOrder(newCount);
      if (battleRef.current) {
        battleRef.current.frozenOrder = newCount;
      }
      addLog(`❄️ 빙결 효과 발동: 플레이어 카드 우선!${newCount > 0 ? ` (${newCount}턴 남음)` : ''}`);
    }

    const collisionResult = processQueueCollisions(newQ, addLog);
    const finalQ = collisionResult.filteredQueue;

    // repeatMyTimeline 효과는 BattleApp.tsx에서 카드 실행 시 즉시 처리됨

    // 에테르 애니메이션 상태 초기화
    actions.setEtherCalcPhase(null);
    actions.setEtherFinalValue(null);
    actions.setEnemyEtherFinalValue(null);
    actions.setCurrentDeflation(null);
    actions.setEnemyEtherCalcPhase(null);
    actions.setEnemyCurrentDeflation(null);

    // 에테르 폭주 체크
    const enemyWillOD = shouldEnemyOverdrive(enemyPlan.mode, enemyPlan.actions as unknown as AICard[], enemy.etherPts ?? 0, turnNumber) && etherSlots(enemy.etherPts ?? 0) > 0;
    if (willOverdrive && etherSlots(player.etherPts ?? 0) > 0) {
      actions.setPlayer({ ...player, etherPts: (player.etherPts ?? 0) - ETHER_THRESHOLD, etherOverdriveActive: true });
      actions.setPlayerOverdriveFlash(true);
      playSound(1400, 220);
      setTimeout(() => actions.setPlayerOverdriveFlash(false), 650);
      addLog('✴️ 에테르 폭주 발동! (이 턴 전체 유지)');
    }
    if (enemyWillOD) {
      actions.setEnemy({ ...enemy, etherPts: (enemy.etherPts ?? 0) - ETHER_THRESHOLD, etherOverdriveActive: true });
      actions.setEnemyOverdriveFlash(true);
      playSound(900, 220);
      setTimeout(() => actions.setEnemyOverdriveFlash(false), 650);
      addLog('☄️ 적 에테르 폭주 발동!');
    }

    playProceedSound();
    // 교차 체크: 같은 SP에 플레이어/적 카드가 있으면 hasCrossed 마킹
    const markedQueue = markCrossedCards(finalQ);
    actions.setQueue(markedQueue);
    actions.setQIndex(0);
    actions.setPhase('resolve');
    addLog('▶ 진행 시작');

    setTimeout(() => {}, 100);
    setTimeout(() => {}, 500);

    actions.setResolveStartPlayer({ ...player });
    actions.setResolveStartEnemy({ ...enemy });
    actions.setResolvedPlayerCards(0);
    devilDiceTriggeredRef.current = false;
    actions.setTimelineProgress(0);
    actions.setTimelineIndicatorVisible(true);
    actions.setNetEtherDelta(null);
    actions.setAutoProgress(true);
  }, [battleRef, fixedOrder, enemyPlan, enemy, player, willOverdrive, turnNumber, etherSlots, playSound, addLog, actions, devilDiceTriggeredRef, pathosNextCardEffects, consumeNextCardEffects]);

  // respond → select 되감기
  const rewindToSelect = useCallback(() => {
    if (rewindUsed) {
      addLog('⚠️ 되감기는 전투당 1회만 사용할 수 있습니다.');
      return;
    }
    if (!respondSnapshot) {
      addLog('⚠️ 되감기할 상태가 없습니다.');
      return;
    }
    actions.setRewindUsed(true);
    actions.setPhase('select');
    actions.setFixedOrder(null);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setTimelineProgress(0);
    actions.setSelected(respondSnapshot.selectedSnapshot || []);
    addLog('⏪ 되감기 사용: 대응 단계 → 선택 단계 (전투당 1회)');
  }, [rewindUsed, respondSnapshot, addLog, actions]);

  return {
    startResolve,
    beginResolveFromRespond,
    rewindToSelect
  };
}
