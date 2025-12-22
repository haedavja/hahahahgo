import { useCallback } from 'react';
import { detectPokerCombo } from '../utils/comboDetection';
import { clearTurnTokens } from '../../../lib/tokenUtils';
import { processCardTraitEffects } from '../utils/cardTraitEffects';
import { applyTurnEndEffects, calculatePassiveEffects } from '../utils/relicEffects';
import { playTurnEndRelicAnimations, applyTurnEndRelicEffectsToNextTurn } from '../utils/turnEndRelicEffectsProcessing';
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from '../utils/turnEndEtherCalculation';
import { startEnemyEtherAnimation } from '../utils/enemyEtherAnimation';
import { processEtherTransfer } from '../utils/etherTransferProcessing';
import { updateComboUsageCount, createTurnEndPlayerState, createTurnEndEnemyState } from '../utils/turnEndStateUpdate';
import { processVictoryDefeatTransition } from '../utils/victoryDefeatTransition';
import { startEtherCalculationAnimationSequence } from '../utils/etherCalculationAnimation';
import { applyAction, getCardEtherGain } from '../utils/battleExecution';
import { CARDS, BASE_PLAYER_ENERGY } from '../battleData';

/**
 * 진행(resolve) 단계 실행 훅
 * finishTurn, runAll 기능 제공
 */
export function useResolveExecution({
  battle,
  player,
  enemy,
  selected,
  queue,
  qIndex,
  turnNumber,
  turnEtherAccumulated,
  enemyTurnEtherAccumulated,
  finalComboMultiplier,
  enemyPlan,
  relics,
  orderedRelicList,
  battleRef,
  parryReadyStatesRef,
  setParryReadyStates,
  growingDefenseRef,
  escapeBanRef,
  escapeUsedThisTurnRef,
  calculateEtherTransfer,
  checkVictoryCondition,
  showCardRewardModal,
  startEtherCalculationAnimation,
  addLog,
  playSound,
  actions
}) {
  // 턴 종료 처리
  const finishTurn = useCallback((reason) => {
    addLog(`턴 종료: ${reason || ''}`);

    // 턴소모 토큰 제거 - battleRef에서 최신 상태 사용 (stale closure 방지)
    const currentBattle = battleRef.current || {};
    let latestPlayer = currentBattle.player || battle.player;
    let latestEnemy = currentBattle.enemy || battle.enemy;

    const playerTokenResult = clearTurnTokens(latestPlayer);
    playerTokenResult.logs.forEach(log => addLog(log));
    latestPlayer = { ...latestPlayer, tokens: playerTokenResult.tokens };
    actions.setPlayer(latestPlayer);

    const enemyTokenResult = clearTurnTokens(latestEnemy);
    enemyTokenResult.logs.forEach(log => addLog(log));
    latestEnemy = { ...latestEnemy, tokens: enemyTokenResult.tokens };
    actions.setEnemy(latestEnemy);

    // battleRef 동기 업데이트
    if (battleRef.current) {
      battleRef.current = { ...battleRef.current, player: latestPlayer, enemy: latestEnemy };
    }

    // 패리 대기 상태 배열 초기화
    parryReadyStatesRef.current = [];
    setParryReadyStates([]);

    // 방어자세 성장 방어력 초기화
    growingDefenseRef.current = null;

    // 이번 턴 사용한 탈주 카드를 다음 턴 한정으로 차단
    escapeBanRef.current = new Set(escapeUsedThisTurnRef.current);
    escapeUsedThisTurnRef.current = new Set();

    // 다음 턴 효과 처리 (특성 기반)
    const traitNextTurnEffects = processCardTraitEffects(selected, addLog);

    // 카드 플레이 중 설정된 효과 병합
    const currentNextTurnEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects;
    const newNextTurnEffects = {
      ...traitNextTurnEffects,
      bonusEnergy: (traitNextTurnEffects.bonusEnergy || 0) + (currentNextTurnEffects.bonusEnergy || 0),
      maxSpeedBonus: (traitNextTurnEffects.maxSpeedBonus || 0) + (currentNextTurnEffects.maxSpeedBonus || 0),
      extraCardPlay: (traitNextTurnEffects.extraCardPlay || 0) + (currentNextTurnEffects.extraCardPlay || 0)
    };

    // 상징 턴 종료 효과 적용
    const turnEndRelicEffects = applyTurnEndEffects(relics, {
      cardsPlayedThisTurn: battle.selected.length,
      player,
      enemy,
    });

    // 턴 종료 상징 발동 애니메이션
    playTurnEndRelicAnimations({
      relics,
      RELICS: require('../battleData').RELICS,
      cardsPlayedThisTurn: battle.selected.length,
      player,
      enemy,
      playSound,
      actions
    });

    // 턴 종료 상징 효과를 다음 턴 효과에 적용
    const updatedNextTurnEffects = applyTurnEndRelicEffectsToNextTurn({
      turnEndRelicEffects,
      nextTurnEffects: newNextTurnEffects,
      player,
      addLog,
      actions
    });

    actions.setNextTurnEffects(updatedNextTurnEffects);

    // 턴 종료 시 조합 카운트 증가 (Deflation)
    const pComboEnd = detectPokerCombo(selected);
    const eComboEnd = detectPokerCombo(enemyPlan.actions);

    // 에테르 최종 계산
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

    // 플레이어 에테르 획득 처리
    if (playerFinalEther > 0) {
      addLog(formatPlayerEtherLog(playerEther, turnEtherAccumulated));
      actions.setEtherFinalValue(playerFinalEther);
    }

    // 적 에테르 획득 처리
    if (enemyFinalEther > 0) {
      addLog(formatEnemyEtherLog(enemyEther, enemyTurnEtherAccumulated));
      startEnemyEtherAnimation({ enemyFinalEther, enemyEther, actions });
    }

    actions.setEnemyEtherFinalValue(enemyFinalEther);

    // 에테르 소지량 이동
    const curPlayerPts = player.etherPts || 0;
    const curEnemyPts = enemy.etherPts || 0;

    // 이변: 에테르 획득 불가 체크
    const effectivePlayerAppliedEther = player.etherBan ? 0 : playerAppliedEther;
    if (player.etherBan && playerAppliedEther > 0) {
      addLog('⚠️ [디플레이션의 저주] 에테르 획득이 차단되었습니다!');
    }

    const { nextPlayerPts, nextEnemyPts } = processEtherTransfer({
      playerAppliedEther: effectivePlayerAppliedEther,
      enemyAppliedEther,
      curPlayerPts,
      curEnemyPts,
      enemyHp: enemy.hp,
      calculateEtherTransfer,
      addLog,
      playSound,
      actions
    });

    // 조합 사용 카운트 업데이트
    const newUsageCount = updateComboUsageCount(player.comboUsageCount, pComboEnd, queue, 'player');
    const newEnemyUsageCount = updateComboUsageCount(enemy.comboUsageCount, eComboEnd, [], 'enemy');

    // 턴 종료 상태 업데이트
    let newPlayerState;
    try {
      newPlayerState = createTurnEndPlayerState(latestPlayer, {
        comboUsageCount: newUsageCount,
        etherPts: nextPlayerPts,
        etherOverflow: playerOverflow,
        etherMultiplier: 1
      });
    } catch (err) {
      console.error('[finishTurn] createTurnEndPlayerState 에러:', err);
      newPlayerState = { ...latestPlayer, etherMultiplier: 1 };
    }
    actions.setPlayer(newPlayerState);

    if (battleRef.current) {
      battleRef.current.player = newPlayerState;
    }

    const nextPts = Math.max(0, nextEnemyPts);
    const nextEnemyPtsSnapshot = nextPts;
    actions.setEnemy(createTurnEndEnemyState(latestEnemy, {
      comboUsageCount: newEnemyUsageCount,
      etherPts: nextPts
    }));

    // 에테르 누적 카운터 리셋
    actions.setTurnEtherAccumulated(0);
    actions.setEnemyTurnEtherAccumulated(0);

    actions.setSelected([]);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setFixedOrder(null);
    actions.setUsedCardIndices([]);
    actions.setDisappearingCards([]);
    actions.setHiddenCards([]);

    // 턴 종료 시 승리/패배 체크
    const transitionResult = processVictoryDefeatTransition({
      enemy,
      player,
      nextEnemyPtsSnapshot,
      checkVictoryCondition,
      actions,
      onVictory: showCardRewardModal
    });
    if (transitionResult.shouldReturn) return;

    actions.setTurnNumber(t => t + 1);
    actions.setNetEtherDelta(null);
    actions.setEnemyPlan({ actions: [], mode: enemyPlan.mode, manuallyModified: false });
    actions.setPhase('select');
  }, [
    battle, player, enemy, selected, queue, turnNumber,
    turnEtherAccumulated, enemyTurnEtherAccumulated, finalComboMultiplier,
    enemyPlan, relics, orderedRelicList, battleRef,
    parryReadyStatesRef, setParryReadyStates, growingDefenseRef,
    escapeBanRef, escapeUsedThisTurnRef, calculateEtherTransfer,
    checkVictoryCondition, showCardRewardModal, addLog, playSound, actions
  ]);

  // 전부 실행 (한 번에 모든 카드 처리)
  const runAll = useCallback(() => {
    if (battle.qIndex >= battle.queue.length) return;
    playSound(1000, 150);
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    let P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, etherPts: player.etherPts || 0 };
    let E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, etherPts: enemy.etherPts || 0 };
    const tempState = { player: P, enemy: E, log: [] };
    const newEvents = {};
    let enemyDefeated = false;

    // 진행 단계 최종 남은 행동력 계산
    const allPlayerCards = battle.queue.filter(q => q.actor === 'player');
    const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
    const finalRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);
    const allEnemyCards = battle.queue.filter(q => q.actor === 'enemy');
    const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
    const finalEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

    let localTurnEther = turnEtherAccumulated;
    let localEnemyTurnEther = enemyTurnEtherAccumulated;

    for (let i = qIndex; i < battle.queue.length; i++) {
      const a = battle.queue[i];

      if (enemyDefeated && a.actor === 'enemy') {
        continue;
      }

      const executedPlayerCards = battle.queue.slice(0, i).filter(q => q.actor === 'player');
      const usedCardCategories = [...new Set(executedPlayerCards.map(q => q.card?.cardCategory).filter(Boolean))];
      const previewNextTurnEffects = battle.nextTurnEffects || {};

      const battleContext = {
        currentSp: a.sp || 0,
        queue: battle.queue,
        currentQIndex: i,
        remainingEnergy: finalRemainingEnergy,
        enemyRemainingEnergy: finalEnemyRemainingEnergy,
        allCards: CARDS,
        usedCardCategories,
        hand: battle.hand || [],
        fencingDamageBonus: previewNextTurnEffects.fencingDamageBonus || 0
      };

      const { events } = applyAction(tempState, a.actor, a.card, battleContext);
      newEvents[i] = events;
      events.forEach(ev => addLog(ev.msg));

      if (a.actor === 'player') {
        const gain = Math.floor(getCardEtherGain(a.card) * passiveRelicEffects.etherMultiplier);
        localTurnEther += gain;
      } else if (a.actor === 'enemy') {
        localEnemyTurnEther += getCardEtherGain(a.card);
      }

      if (P.hp <= 0) {
        actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 });
        actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 });
        actions.setActionEvents({ ...battle.actionEvents, ...newEvents });
        actions.setQIndex(i + 1);
        actions.setPostCombatOptions({ type: 'defeat' });
        actions.setPhase('post');
        return;
      }
      if (E.hp <= 0 && !enemyDefeated) {
        actions.setEnemyHit(true);
        playSound(200, 500);
        addLog('💀 적 처치! 남은 적 행동 건너뛰기');
        enemyDefeated = true;
      }
    }

    actions.setTurnEtherAccumulated(localTurnEther);
    actions.setEnemyTurnEtherAccumulated(localEnemyTurnEther);
    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 });
    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 });
    actions.setActionEvents({ ...battle.actionEvents, ...newEvents });
    actions.setQIndex(battle.queue.length);

    // 타임라인 완료 후 에테르 계산 애니메이션
    const latestPlayerForAnim = battleRef.current?.player || player;
    startEtherCalculationAnimationSequence({
      turnEtherAccumulated: localTurnEther,
      selected,
      player: latestPlayerForAnim,
      playSound,
      actions,
      onMultiplierConsumed: () => {
        const currentPlayer = battleRef.current?.player || player;
        const updatedPlayer = { ...currentPlayer, etherMultiplier: 1 };
        actions.setPlayer(updatedPlayer);
        battleRef.current.player = updatedPlayer;
      }
    });
  }, [
    battle, player, enemy, selected, qIndex,
    turnEtherAccumulated, enemyTurnEtherAccumulated,
    orderedRelicList, battleRef, addLog, playSound, actions
  ]);

  return { finishTurn, runAll };
}
