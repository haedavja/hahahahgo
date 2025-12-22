import { useCallback } from 'react';
import { detectPokerCombo, applyPokerBonus } from '../utils/comboDetection';
import { createFixedOrder } from '../utils/cardOrdering';
import { sortCombinedOrderStablePF } from '../utils/combatUtils';
import { generateEnemyActions, shouldEnemyOverdrive, assignSourceUnitToActions } from '../utils/enemyAI';
import { applyTraitModifiers } from '../utils/battleUtils';
import { processQueueCollisions } from '../utils/cardSpecialEffects';
import { calculateEtherSlots } from '../../../lib/etherUtils';
import { playCardSubmitSound, playProceedSound } from '../../../lib/soundUtils';
import { ETHER_THRESHOLD } from '../battleData';

/**
 * 페이즈 전환 훅
 * select → respond → resolve 페이즈 전환 처리
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
  actions
}) {
  // select → respond 전환
  const startResolve = useCallback(() => {
    const currentBattle = battleRef.current;
    const currentEnemyPlan = currentBattle.enemyPlan;

    if (currentBattle.phase !== 'select') return;

    // manuallyModified가 true면 재생성하지 않음
    const hasActions = currentEnemyPlan.actions && currentEnemyPlan.actions.length > 0;
    const willRegenerate = !(hasActions || currentEnemyPlan.manuallyModified);

    const cardsPerTurn = enemy?.cardsPerTurn || enemyCount || 2;
    let generatedActions;
    if (willRegenerate) {
      const rawActions = generateEnemyActions(enemy, currentEnemyPlan.mode, etherSlots(enemy.etherPts), cardsPerTurn, Math.min(1, cardsPerTurn));
      generatedActions = assignSourceUnitToActions(rawActions, enemy?.units || []);
    } else {
      generatedActions = currentEnemyPlan.actions;
    }

    actions.setEnemyPlan({
      mode: currentEnemyPlan.mode,
      actions: generatedActions,
      manuallyModified: currentEnemyPlan.manuallyModified
    });

    const pCombo = detectPokerCombo(selected);

    const traitEnhancedSelected = battleSelected.map(card =>
      applyTraitModifiers(card, {
        usageCount: 0,
        isInCombo: pCombo !== null,
      })
    );

    const enhancedSelected = applyPokerBonus(traitEnhancedSelected, pCombo);

    const currentPlayer = currentBattle.player;
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
    const currentEnemyPlan = currentBattle?.enemyPlan;
    const currentFixedOrder = currentBattle?.fixedOrder || fixedOrder;

    if (currentBattle?.phase !== 'respond') return;
    if (!currentFixedOrder) return addLog('오류: 고정된 순서가 없습니다');

    if (currentFixedOrder.length === 0) {
      addLog('⚠️ 실행할 행동이 없습니다. 최소 1장 이상을 유지하거나 적이 행동 가능한 상태여야 합니다.');
      return;
    }

    let effectiveFixedOrder = currentFixedOrder;
    if (currentEnemyPlan?.manuallyModified && currentEnemyPlan?.actions) {
      const remainingActions = new Set(currentEnemyPlan.actions);
      effectiveFixedOrder = currentFixedOrder.filter(item => {
        if (item.actor === 'player') return true;
        return remainingActions.has(item.card);
      });
    }

    const newQ = effectiveFixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
    if (newQ.length === 0) {
      addLog('⚠️ 큐 생성 실패: 실행할 항목이 없습니다');
      return;
    }

    const frozenOrderCount = currentBattle?.frozenOrder || battleRef.current?.frozenOrder || 0;

    if (frozenOrderCount <= 0) {
      newQ.sort((a, b) => {
        if (a.sp !== b.sp) return a.sp - b.sp;
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

    // 에테르 애니메이션 상태 초기화
    actions.setEtherCalcPhase(null);
    actions.setEtherFinalValue(null);
    actions.setEnemyEtherFinalValue(null);
    actions.setCurrentDeflation(null);
    actions.setEnemyEtherCalcPhase(null);
    actions.setEnemyCurrentDeflation(null);

    // 에테르 폭주 체크
    const enemyWillOD = shouldEnemyOverdrive(enemyPlan.mode, enemyPlan.actions, enemy.etherPts, turnNumber) && etherSlots(enemy.etherPts) > 0;
    if (willOverdrive && etherSlots(player.etherPts) > 0) {
      actions.setPlayer({ ...player, etherPts: player.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true });
      actions.setPlayerOverdriveFlash(true);
      playSound(1400, 220);
      setTimeout(() => actions.setPlayerOverdriveFlash(false), 650);
      addLog('✴️ 에테르 폭주 발동! (이 턴 전체 유지)');
    }
    if (enemyWillOD) {
      actions.setEnemy({ ...enemy, etherPts: enemy.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true });
      actions.setEnemyOverdriveFlash(true);
      playSound(900, 220);
      setTimeout(() => actions.setEnemyOverdriveFlash(false), 650);
      addLog('☄️ 적 에테르 폭주 발동!');
    }

    playProceedSound();
    actions.setQueue(finalQ);
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
  }, [battleRef, fixedOrder, enemyPlan, enemy, player, willOverdrive, turnNumber, etherSlots, playSound, addLog, actions, devilDiceTriggeredRef]);

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
