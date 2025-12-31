/**
 * @file turnEndCore.ts
 * @description 턴 종료 핵심 로직
 *
 * battleExecution.js에서 분리됨
 *
 * ## 턴 종료 처리 흐름
 * 1. 콤보 감지 및 에테르 계산
 * 2. 카드 특성 효과 처리
 * 3. 상징 턴 종료 효과 적용
 * 4. 승리/패배 조건 확인
 */

import type { FinishTurnCoreParams, FinishTurnResult, Relic } from '../../../types';
import { detectPokerCombo } from '../utils/comboDetection';
import { processCardTraitEffects } from '../utils/cardTraitEffects';
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from '../utils/turnEndEtherCalculation';
import { updateComboUsageCount, createTurnEndPlayerState, createTurnEndEnemyState, checkVictoryCondition } from '../utils/turnEndStateUpdate';
import { playTurnEndRelicAnimations, applyTurnEndRelicEffectsToNextTurn } from '../utils/turnEndRelicEffectsProcessing';
import { startEnemyEtherAnimation } from '../utils/enemyEtherAnimation';
import { processEtherTransfer } from '../utils/etherTransferProcessing';
import { processVictoryDefeatTransition } from '../utils/victoryDefeatTransition';
import { gainGrace, createInitialGraceState } from '../../../data/monsterEther';
import { applyTurnEndEffects } from '../../../lib/relicEffects';

/**
 * finishTurn 핵심 로직
 */
export function finishTurnCore(params: FinishTurnCoreParams): FinishTurnResult {
  const {
    reason,
    player,
    enemy,
    battle,
    battleRef,
    selected,
    enemyPlan,
    queue,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    finalComboMultiplier,
    relics,
    nextTurnEffects,
    escapeBanRef,
    escapeUsedThisTurnRef,
    RELICS,
    calculateEtherTransfer,
    addLog,
    playSound,
    actions,
  } = params;

  addLog(`턴 종료: ${reason || ''}`);

  // 턴소모 토큰 제거
  actions.clearPlayerTurnTokens();
  actions.clearEnemyTurnTokens();

  // 탈주 카드 차단
  escapeBanRef.current = new Set(escapeUsedThisTurnRef.current);
  escapeUsedThisTurnRef.current = new Set();

  // 다음 턴 효과 처리
  const newNextTurnEffects = processCardTraitEffects(selected as never, addLog);

  // 상징 턴 종료 효과
  const relicIds = relics.map((r: Relic) => (typeof r === 'string' ? r : r.id || ''));
  const turnEndRelicEffects = applyTurnEndEffects(relicIds, {
    cardsPlayedThisTurn: battle.selected.length,
    player,
    enemy,
  });

  playTurnEndRelicAnimations({
    relics: relicIds,
    RELICS: RELICS as never,
    cardsPlayedThisTurn: battle.selected.length,
    player,
    enemy,
    playSound: playSound as never,
    actions: actions as never
  });

  const updatedNextTurnEffects = applyTurnEndRelicEffectsToNextTurn({
    turnEndRelicEffects,
    nextTurnEffects: newNextTurnEffects as never,
    player,
    addLog,
    actions: actions as never
  });

  actions.setNextTurnEffects(updatedNextTurnEffects);

  // 조합 감지
  const pComboEnd = detectPokerCombo(selected as never);
  const eComboEnd = detectPokerCombo(enemyPlan.actions as never);

  // 에테르 최종 계산
  const latestPlayer = battleRef.current?.player || player;
  const etherResult = calculateTurnEndEther({
    playerCombo: pComboEnd,
    enemyCombo: eComboEnd,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    finalComboMultiplier,
    player: latestPlayer,
    enemy
  });

  const { player: playerEther, enemy: enemyEther } = etherResult;
  const playerFinalEther = playerEther.finalEther;
  const enemyFinalEther = enemyEther.finalEther;
  const playerAppliedEther = playerEther.appliedEther;
  const enemyAppliedEther = enemyEther.appliedEther;
  const playerOverflow = playerEther.overflow;

  // 로깅
  if (playerFinalEther > 0) {
    addLog(formatPlayerEtherLog(playerEther, turnEtherAccumulated));
    actions.setEtherFinalValue(playerFinalEther);
  }

  if (enemyFinalEther > 0) {
    addLog(formatEnemyEtherLog(enemyEther, enemyTurnEtherAccumulated));
    startEnemyEtherAnimation({
      enemyFinalEther,
      enemyEther,
      actions: actions as never
    });
  }

  actions.setEnemyEtherFinalValue(enemyFinalEther);

  // 에테르 이동
  const curPlayerPts = player.etherPts || 0;
  const curEnemyPts = enemy.etherPts || 0;

  const effectivePlayerAppliedEther = player.etherBan ? 0 : playerAppliedEther;
  if (player.etherBan && playerAppliedEther > 0) {
    addLog('⚠️ [디플레이션의 저주] 에테르 획득이 차단되었습니다!');
  }

  const { nextPlayerPts, nextEnemyPts, enemyGraceGain } = processEtherTransfer({
    playerAppliedEther: effectivePlayerAppliedEther,
    enemyAppliedEther,
    curPlayerPts,
    curEnemyPts,
    enemyHp: enemy.hp,
    calculateEtherTransfer: calculateEtherTransfer as never,
    addLog,
    playSound: playSound as never,
    actions: actions as never
  });

  // 적 은총 획득 적용 (영혼과 별개로 은총 상태 업데이트)
  let updatedEnemy = enemy;
  if (enemyGraceGain > 0) {
    const currentGrace = enemy.grace || createInitialGraceState((enemy as unknown as { availablePrayers?: string[] }).availablePrayers as never);
    const newGrace = gainGrace(currentGrace, enemyGraceGain);
    updatedEnemy = { ...enemy, grace: newGrace };
  }

  // 조합 사용 카운트 업데이트
  const newUsageCount = updateComboUsageCount(player.comboUsageCount, pComboEnd, queue, 'player');
  const newEnemyUsageCount = updateComboUsageCount(updatedEnemy.comboUsageCount, eComboEnd, [], 'enemy');

  // 상태 업데이트
  actions.setPlayer(createTurnEndPlayerState(player as never, {
    comboUsageCount: newUsageCount,
    etherPts: nextPlayerPts,
    etherOverflow: playerOverflow,
    etherMultiplier: 1
  }));

  const nextPts = Math.max(0, nextEnemyPts);
  actions.setEnemy(createTurnEndEnemyState(updatedEnemy, {
    comboUsageCount: newEnemyUsageCount,
    etherPts: nextPts
  }));

  // 리셋
  actions.setTurnEtherAccumulated(0);
  actions.setEnemyTurnEtherAccumulated(0);
  actions.setSelected([]);
  actions.setQueue([]);
  actions.setQIndex(0);
  actions.setFixedOrder(null);
  actions.setUsedCardIndices([]);
  actions.setDisappearingCards([]);
  actions.setHiddenCards([]);

  // 승리/패배 체크
  const transitionResult = processVictoryDefeatTransition({
    enemy,
    player,
    nextEnemyPtsSnapshot: nextPts,
    checkVictoryCondition,
    actions: actions as never
  });

  if (transitionResult.shouldReturn) {
    return { shouldReturn: true };
  }

  actions.setTurnNumber((t: number) => t + 1);
  actions.setNetEtherDelta(null);
  actions.setPhase('select');

  return { shouldReturn: false };
}
