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
import { gainGrace, createInitialGraceState, type MonsterGraceState } from '../../../data/monsterEther';
import { applyComboEffects, applyGraceGainEffects, calculatePassiveEffects } from '../../../lib/relicEffects';
import { executeTurnEndEffects, type TurnState } from '../../../core/effects';
import { COMBO_INFO, type ComboName } from '../../../lib/comboDetection';
import { hasToken, getTokenStacks, removeToken, addToken } from '../../../lib/tokenUtils';
import { processTurnEndStack } from '../utils/enemyStack';

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

  // soulWeaken 토큰 지속시간 감소 (매 턴 1씩 감소)
  if (hasToken(enemy, 'soulWeaken')) {
    const currentStacks = getTokenStacks(enemy, 'soulWeaken');
    if (currentStacks > 1) {
      // 스택 감소
      const tokenResult = removeToken(enemy, 'soulWeaken', 'permanent', 1);
      actions.setEnemy({ ...enemy, tokens: tokenResult.tokens });
      addLog(`👻 영혼 쇠약: 지속시간 감소 (${currentStacks} → ${currentStacks - 1}턴)`);
    } else {
      // 토큰 제거
      const tokenResult = removeToken(enemy, 'soulWeaken', 'permanent', currentStacks);
      const updatedEnemy = { ...enemy, tokens: tokenResult.tokens, soulBroken: false };
      actions.setEnemy(updatedEnemy);
      addLog(`👻 영혼 쇠약이 해제되었습니다!`);
    }
  }

  // 탈주 카드 차단
  escapeBanRef.current = new Set(escapeUsedThisTurnRef.current);
  escapeUsedThisTurnRef.current = new Set();

  // 다음 턴 효과 처리
  const newNextTurnEffects = processCardTraitEffects(selected as never, addLog);

  // 상징 턴 종료 효과
  const relicIds = relics.map((r: Relic) => (typeof r === 'string' ? r : r.id || ''));

  // 조건부 효과 판단용 턴 상태 구성
  const cardsPlayedThisTurn = battle.selected?.length ?? selected?.length ?? 0;
  const turnState: TurnState = {
    cardsPlayedThisTurn,
    // 모든 카드가 방어 카드인지 (카드 타입이 defense인지 확인)
    allCardsDefense: selected.length > 0 && selected.every((card: { type?: string }) => card?.type === 'defense'),
    // 모든 카드가 저비용(1코스트 이하)인지
    allCardsLowCost: selected.length > 0 && selected.every((card: { actionCost?: number }) => (card?.actionCost ?? 0) <= 1),
    // 피격 횟수 (battle에서 추적하는 경우)
    timesAttackedThisTurn: (battle as { timesAttackedThisTurn?: number }).timesAttackedThisTurn ?? 0,
  };

  const turnEndRelicEffects = executeTurnEndEffects(relicIds, turnState);

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

  // ON_COMBO 상징 효과 처리 (목장갑, 총알)
  let comboMultiplierBonus = 0;
  if (pComboEnd?.name) {
    // 콤보 랭크 계산 (1-indexed: 하이카드=1, 페어=2, ...)
    const comboRank = (COMBO_INFO[pComboEnd.name as ComboName]?.rank ?? 0) + 1;
    const comboEffects = applyComboEffects(relicIds, comboRank);

    // 목장갑: 공세+ 부여
    if (comboEffects.grantOffensePlus > 0) {
      actions.addPlayerToken('offensePlus', comboEffects.grantOffensePlus);
      addLog(`🧤 목장갑: 공세+ ${comboEffects.grantOffensePlus}회 획득 (${pComboEnd.name})`);
    }

    // 총알: 콤보 배율 보너스
    if (comboEffects.comboMultiplierBonus > 0) {
      comboMultiplierBonus = comboEffects.comboMultiplierBonus;
      addLog(`🔫 총알: 에테르 배율 +${comboEffects.comboMultiplierBonus} (하이카드)`);
    }
  }

  // 에테르 최종 계산 (총알 상징 보너스 적용)
  const latestPlayer = battleRef.current?.player || player;
  const adjustedComboMultiplier = finalComboMultiplier + comboMultiplierBonus;
  const etherResult = calculateTurnEndEther({
    playerCombo: pComboEnd,
    enemyCombo: eComboEnd,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    finalComboMultiplier: adjustedComboMultiplier,
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

  // 현재 은총 상태 가져오기
  const rawGrace = enemy.grace;
  const availablePrayers = Array.isArray(enemy.availablePrayers) ? enemy.availablePrayers : undefined;
  const currentGrace: MonsterGraceState = (rawGrace && typeof rawGrace === 'object' && 'gracePts' in rawGrace)
    ? rawGrace as MonsterGraceState
    : createInitialGraceState(availablePrayers);

  const { nextPlayerPts, nextEnemyPts, enemyGraceGain, updatedGraceState } = processEtherTransfer({
    playerAppliedEther: effectivePlayerAppliedEther,
    enemyAppliedEther,
    curPlayerPts,
    curEnemyPts,
    enemyHp: enemy.hp,
    graceState: currentGrace,
    calculateEtherTransfer: calculateEtherTransfer as never,
    addLog,
    playSound: playSound as never,
    actions: actions as never
  });

  // 은총 상태 업데이트 (보호막 소모 + 은총 획득)
  const validUpdatedGrace = (updatedGraceState && typeof updatedGraceState === 'object' && 'gracePts' in updatedGraceState)
    ? updatedGraceState as MonsterGraceState
    : null;
  let newGrace: MonsterGraceState = validUpdatedGrace || currentGrace;
  if (enemyGraceGain > 0) {
    newGrace = gainGrace(newGrace, enemyGraceGain);

    // ON_GRACE_GAIN 상징 효과 처리 (화환)
    const graceGainEffects = applyGraceGainEffects(relicIds);
    if (graceGainEffects.grantOffense > 0) {
      actions.addPlayerToken('offense', graceGainEffects.grantOffense);
      addLog(`🌸 화환: 공세 ${graceGainEffects.grantOffense}회 획득 (적 은총 획득)`);
    }
    if (graceGainEffects.grantDefense > 0) {
      actions.addPlayerToken('defense', graceGainEffects.grantDefense);
      addLog(`🌸 화환: 수세 ${graceGainEffects.grantDefense}회 획득 (적 은총 획득)`);
    }
  }
  let updatedEnemy = enemy;
  if (newGrace !== currentGrace || enemyGraceGain > 0) {
    updatedEnemy = { ...enemy, grace: newGrace };
  }

  // 스택 시스템 처리 (에테르 델타 기반)
  if (updatedEnemy.stack) {
    const etherDelta = enemyAppliedEther - effectivePlayerAppliedEther;
    const stackResult = processTurnEndStack(updatedEnemy.stack, etherDelta);
    updatedEnemy = { ...updatedEnemy, stack: stackResult.newStack };

    // 스택 획득 로깅
    if (etherDelta > 0) {
      const stackGain = Math.floor(etherDelta / 10);
      if (stackGain > 0) {
        addLog(`📊 적 스택 증가: +${stackGain} (에테르 우세: ${etherDelta})`);
      }
    }

    // 스택 효과 발동 처리 (D형: 턴 종료 시 발동)
    if (stackResult.triggeredEffect) {
      const effect = stackResult.triggeredEffect;
      addLog(`⚡ 스택 효과 발동!`);

      // 플레이어에게 피해
      if (effect.damage && effect.damage > 0) {
        const newPlayerHp = Math.max(0, player.hp - effect.damage);
        actions.setPlayer({ ...player, hp: newPlayerHp });
        addLog(`💥 스택 피해: ${effect.damage} (${player.hp} → ${newPlayerHp})`);
      }

      // 적 체력 회복
      if (effect.heal && effect.heal > 0) {
        const newEnemyHp = Math.min(updatedEnemy.maxHp, updatedEnemy.hp + effect.heal);
        updatedEnemy = { ...updatedEnemy, hp: newEnemyHp };
        addLog(`💚 적 회복: ${effect.heal}`);
      }

      // 적 방어막
      if (effect.block && effect.block > 0) {
        const newBlock = (updatedEnemy.block || 0) + effect.block;
        updatedEnemy = { ...updatedEnemy, block: newBlock };
        addLog(`🛡️ 적 방어막: +${effect.block}`);
      }

      // 적 자신에게 토큰 부여
      if (effect.selfTokens && effect.selfTokens.length > 0) {
        let enemyTokens = { ...updatedEnemy.tokens };
        for (const tokenInfo of effect.selfTokens) {
          const result = addToken({ tokens: enemyTokens } as never, tokenInfo.id, 'permanent', tokenInfo.stacks || 1);
          enemyTokens = result.tokens;
          addLog(`🔶 적 토큰: ${tokenInfo.id} +${tokenInfo.stacks || 1}`);
        }
        updatedEnemy = { ...updatedEnemy, tokens: enemyTokens };
      }

      // 플레이어에게 토큰 부여
      if (effect.playerTokens && effect.playerTokens.length > 0) {
        for (const tokenInfo of effect.playerTokens) {
          actions.addPlayerToken(tokenInfo.id, tokenInfo.stacks || 1);
          addLog(`🔷 플레이어 토큰: ${tokenInfo.id} +${tokenInfo.stacks || 1}`);
        }
      }
    }
  }

  // 조합 사용 카운트 업데이트
  const newUsageCount = updateComboUsageCount(player.comboUsageCount, pComboEnd, queue, 'player');
  const newEnemyUsageCount = updateComboUsageCount(updatedEnemy.comboUsageCount, eComboEnd, [], 'enemy');

  // 상징 패시브 효과: 매 턴 체력 손실 (심연의핵)
  const passiveRelicEffects = calculatePassiveEffects(relicIds);
  let playerHpAfterLoss = player.hp;
  if (passiveRelicEffects.hpLossPerTurn > 0) {
    const hpLoss = passiveRelicEffects.hpLossPerTurn;
    playerHpAfterLoss = Math.max(1, player.hp - hpLoss); // 최소 1 HP 유지
    addLog(`⚫ 심연의핵: 턴 종료 시 ${hpLoss} 체력 손실 (${player.hp} → ${playerHpAfterLoss})`);
  }

  // 상태 업데이트 (턴 종료 상징 효과의 힘 증가 반영)
  const playerWithHpAndStrength = {
    ...player,
    hp: playerHpAfterLoss,
    strength: turnEndRelicEffects.strength !== 0
      ? (player.strength || 0) + turnEndRelicEffects.strength
      : player.strength || 0
  };
  actions.setPlayer(createTurnEndPlayerState(playerWithHpAndStrength as never, {
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
    actions: {
      ...(actions as never),
      setEnemy: actions.setEnemy
    },
    addLog
  });

  if (transitionResult.shouldReturn) {
    return { shouldReturn: true };
  }

  actions.setTurnNumber((t: number) => t + 1);
  actions.setNetEtherDelta(null);
  actions.setPhase('select');

  return { shouldReturn: false };
}
