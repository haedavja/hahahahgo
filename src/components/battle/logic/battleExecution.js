/**
 * battleExecution.js
 *
 * 전투 실행 로직 - stepOnce, executeCardAction, finishTurn, runAll
 * LegacyBattleApp.jsx에서 분리됨
 */

import { hasTrait } from '../utils/battleUtils';
import { detectPokerCombo } from '../utils/comboDetection';
import { getCardEtherGain } from '../utils/etherCalculations';
import { BASE_PLAYER_ENERGY } from '../battleData';
import { applyAction, prepareMultiHitAttack, calculateSingleHit, finalizeMultiHitAttack, rollCritical } from './combatActions';
import { processTimelineSpecials, processPerHitRoulette } from '../utils/cardSpecialEffects';
import { processCardTraitEffects } from '../utils/cardTraitEffects';
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from '../utils/turnEndEtherCalculation';
import { updateComboUsageCount, createTurnEndPlayerState, createTurnEndEnemyState, checkVictoryCondition } from '../utils/turnEndStateUpdate';
import { processImmediateCardTraits, processCardPlayedRelicEffects } from '../utils/cardImmediateEffects';
import { processActionEventAnimations } from '../utils/eventAnimationProcessing';
import { processStunEffect } from '../utils/stunProcessing';
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from '../utils/etherAccumulationProcessing';
import { processEnemyDeath } from '../utils/enemyDeathProcessing';
import { playTurnEndRelicAnimations, applyTurnEndRelicEffectsToNextTurn } from '../utils/turnEndRelicEffectsProcessing';
import { startEnemyEtherAnimation } from '../utils/enemyEtherAnimation';
import { processEtherTransfer } from '../utils/etherTransferProcessing';
import { processVictoryDefeatTransition } from '../utils/victoryDefeatTransition';
import { calculatePassiveEffects, applyTurnEndEffects } from '../../../lib/relicEffects';
import { addToken, removeToken, getAllTokens, setTokenStacks } from '../../../lib/tokenUtils';

// =====================
// 타이밍 상수 (밀리초)
// =====================
export const TIMING = {
  // stepOnce 타이밍
  CARD_EXECUTION_DELAY: 250,      // 시곗바늘 이동 후 카드 발동 대기
  CARD_SHAKE_DURATION: 200,       // 카드 흔들림 애니메이션
  CARD_FADEOUT_DELAY: 150,        // 마지막 카드 페이드아웃
  CARD_DISAPPEAR_START: 150,      // 카드 소멸 시작
  CARD_DISAPPEAR_DURATION: 300,   // 카드 소멸 애니메이션

  // 자동진행 타이밍
  AUTO_PROGRESS_DELAY: 450,       // 다음 카드로 넘어가는 대기 시간

  // 다중 타격 타이밍
  MULTI_HIT_DELAY: 100,           // 연속 타격 사이 딜레이 (100ms)

  // 에테르 계산 타이밍
  ETHER_CALC_START_DELAY: 400,    // 에테르 계산 시작 딜레이
  ETHER_MULTIPLY_DELAY: 600,      // 배율 적용 딜레이
  ETHER_DEFLATION_DELAY: 400,     // 디플레이션 딜레이
};

// =====================
// stepOnce 애니메이션 처리
// =====================
export function createStepOnceAnimations(params) {
  const {
    currentQIndex,
    queueLength,
    action,
    battleRef,
    actions,
    escapeUsedThisTurnRef,
  } = params;

  return {
    // 카드 실행 애니메이션 시작
    startExecution: () => {
      actions.setExecutingCardIndex(currentQIndex);
    },

    // 카드 실행 완료 후 처리
    finishExecution: () => {
      actions.setExecutingCardIndex(null);
      const currentBattle = battleRef.current;
      const currentUsedIndices = currentBattle.usedCardIndices || [];
      actions.setUsedCardIndices([...currentUsedIndices, currentQIndex]);
    },

    // 마지막 카드 페이드아웃
    handleLastCard: () => {
      if (currentQIndex >= queueLength - 1) {
        setTimeout(() => {
          actions.setTimelineIndicatorVisible(false);
        }, TIMING.CARD_FADEOUT_DELAY);
      }
    },

    // 플레이어 카드 소멸 처리
    handlePlayerCardDisappear: () => {
      if (action.actor !== 'player') return;

      if (hasTrait(action.card, 'escape')) {
        escapeUsedThisTurnRef.current = new Set([...escapeUsedThisTurnRef.current, action.card.id]);
      }

      setTimeout(() => {
        const currentBattle = battleRef.current;
        const currentDisappearing = currentBattle.disappearingCards || [];
        actions.setDisappearingCards([...currentDisappearing, currentQIndex]);

        setTimeout(() => {
          const currentBattle = battleRef.current;
          const currentHidden = currentBattle.hiddenCards || [];
          const currentDisappearing2 = currentBattle.disappearingCards || [];
          actions.setHiddenCards([...currentHidden, currentQIndex]);
          actions.setDisappearingCards(currentDisappearing2.filter(i => i !== currentQIndex));
        }, TIMING.CARD_DISAPPEAR_DURATION);
      }, TIMING.CARD_DISAPPEAR_START);
    },
  };
}

// =====================
// executeCardAction 핵심 로직
// =====================
export function executeCardActionCore(params) {
  const {
    action,
    player,
    enemy,
    battle,
    battleRef,
    cardUsageCount,
    nextTurnEffects,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    orderedRelicList,
    cardUpgrades,
    resolvedPlayerCards,
    playerTimeline,
    relics,
    safeInitialPlayer,
    triggeredRefs,
    calculatePassiveEffects: calcPassive,
    collectTriggeredRelics,
    playRelicActivationSequence,
    flashRelic,
    addLog,
    playHitSound,
    playBlockSound,
    actions,
  } = params;

  // 초기 상태 설정
  let P = {
    ...player,
    def: player.def || false,
    block: player.block || 0,
    counter: player.counter || 0,
    vulnMult: player.vulnMult || 1,
    strength: player.strength || 0,
    tokens: player.tokens
  };
  let E = {
    ...enemy,
    def: enemy.def || false,
    block: enemy.block || 0,
    counter: enemy.counter || 0,
    vulnMult: enemy.vulnMult || 1,
    tokens: enemy.tokens
  };

  const tempState = { player: P, enemy: E, log: [] };

  // battleContext 생성 (special 효과용)
  const queue = battleRef.current?.queue || [];
  const currentQIndex = battleRef.current?.qIndex || 0;
  const selected = battle.selected || [];

  // 플레이어 공격 카드 목록
  const playerAttackCards = selected.filter(c => c.type === 'attack');
  // 이 카드가 타임라인상 마지막인지
  const isLastCard = currentQIndex >= queue.length - 1;
  // 이번 턴 사용하지 않은 공격 카드 수 (선택했지만 아직 발동하지 않은 공격 카드)
  const usedCardIndices = battleRef.current?.usedCardIndices || [];
  const unusedAttackCards = playerAttackCards.filter((c, idx) => {
    // 현재 카드 이후에 발동할 카드 중 공격 카드 개수
    const cardQueueIndex = queue.findIndex(q => q.card?.id === c.id && q.actor === 'player');
    return cardQueueIndex > currentQIndex;
  }).length;

  // 진행 단계 최종 남은 행동력 계산 (가이러스 룰렛: 모든 선택 카드 비용 차감 후)
  const allPlayerCards = queue.filter(q => q.actor === 'player');
  const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
  const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);

  // 적 남은 에너지 계산
  const allEnemyCards = queue.filter(q => q.actor === 'enemy');
  const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
  const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
  const enemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

  const battleContext = {
    playerAttackCards,
    isLastCard,
    unusedAttackCards,
    queue,
    currentQIndex,
    currentSp: action.sp || 0,  // 현재 카드의 타임라인 위치 (growingDefense용)
    remainingEnergy,  // 플레이어 치명타 확률용 남은 에너지
    enemyRemainingEnergy  // 적 치명타 확률용 남은 에너지
  };

  // 다중 유닛: 공격 전 enemy HP 저장 (데미지 계산용)
  const enemyHpBefore = tempState.enemy.hp;
  const selectedTargetUnit = battle.selectedTargetUnit ?? 0;
  const enemyUnits = enemy.units || [];
  const hasUnits = enemyUnits.length > 0;

  const actionResult = applyAction(tempState, action.actor, action.card, battleContext);
  const { events, updatedState } = actionResult;
  let actionEvents = events;

  if (updatedState) {
    P = updatedState.player;
    E = updatedState.enemy;
  } else {
    console.error('[executeCardAction] updatedState is undefined!', {
      card: action.card,
      actor: action.actor,
      actionResult
    });
  }

  // === 다중 유닛 데미지 분배 ===
  // 플레이어가 공격할 때 선택된 유닛에 데미지 적용
  if (hasUnits && action.actor === 'player' && action.card?.type === 'attack') {
    const damageDealt = Math.max(0, enemyHpBefore - E.hp);

    if (damageDealt > 0) {
      // 살아있는 유닛 중 선택된 유닛 찾기
      const aliveUnits = enemyUnits.filter(u => u.hp > 0);
      let targetUnit = aliveUnits.find(u => u.unitId === selectedTargetUnit);
      if (!targetUnit && aliveUnits.length > 0) {
        targetUnit = aliveUnits[0]; // 폴백: 첫 번째 살아있는 유닛
      }

      if (targetUnit) {
        // 유닛에 데미지 적용
        const unitHpBefore = targetUnit.hp;
        const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);

        // 유닛 배열 업데이트
        const updatedUnits = enemyUnits.map(u => {
          if (u.unitId === targetUnit.unitId) {
            return { ...u, hp: newUnitHp };
          }
          return u;
        });

        // 전체 HP 재계산 (모든 유닛 HP 합계)
        const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);

        // E 상태에 유닛과 총 HP 반영
        E.hp = newTotalHp;
        E.units = updatedUnits;

        // 로그에 유닛 정보 추가
        if (targetUnit.name) {
          addLog(`🎯 ${targetUnit.name}에게 ${damageDealt} 피해 (${unitHpBefore} -> ${newUnitHp})`);
        }
      }
    }
  }

  // === 화상(BURN) 피해 처리: 카드 사용 시마다 피해 ===
  if (action.actor === 'player') {
    const playerBurnTokens = getAllTokens(P).filter(t => t.effect?.type === 'BURN');
    if (playerBurnTokens.length > 0) {
      const burnDamage = playerBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
      P.hp = Math.max(0, P.hp - burnDamage);
      addLog(`🔥 화상: 플레이어 -${burnDamage} HP`);
      actionEvents.push({
        actor: 'player',
        card: action.card.name,
        type: 'burn',
        dmg: burnDamage,
        msg: `🔥 화상: 플레이어 -${burnDamage} HP`
      });
    }
  } else if (action.actor === 'enemy') {
    const enemyBurnTokens = getAllTokens(E).filter(t => t.effect?.type === 'BURN');
    if (enemyBurnTokens.length > 0) {
      const burnDamage = enemyBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
      E.hp = Math.max(0, E.hp - burnDamage);
      addLog(`🔥 화상: 적 -${burnDamage} HP`);
      actionEvents.push({
        actor: 'enemy',
        card: action.card.name,
        type: 'burn',
        dmg: burnDamage,
        msg: `🔥 화상: 적 -${burnDamage} HP`
      });
    }
  }

  // 플레이어 카드 사용 시 추가 처리
  if (action.actor === 'player' && action.card.id) {
    // 카드 사용 횟수 증가
    actions.setCardUsageCount({
      ...cardUsageCount,
      [action.card.id]: (cardUsageCount[action.card.id] || 0) + 1
    });

    // 즉시 발동 특성 처리 (vanish 포함)
    const updatedNextTurnEffects = processImmediateCardTraits({
      card: action.card,
      playerState: P,
      nextTurnEffects,
      addLog,
      addVanishedCard: actions.addVanishedCard
    });
    if (updatedNextTurnEffects !== nextTurnEffects) {
      actions.setNextTurnEffects(updatedNextTurnEffects);
    }

    // 상징 효과
    processCardPlayedRelicEffects({
      relics,
      card: action.card,
      playerState: P,
      enemyState: E,
      safeInitialPlayer,
      addLog,
      setRelicActivated: actions.setRelicActivated
    });

    // 토큰 onPlay 효과 - 현재 플레이어 상태(P)를 사용하도록 래핑
    if (action.card.onPlay && typeof action.card.onPlay === 'function') {
      try {
        const isCritical = actionResult.isCritical;
        // P는 현재 카드 실행 후의 최신 상태 (빈탄창 등 포함)
        const currentPlayerForToken = { ...P };

        const tokenActions = {
          ...actions,
          addTokenToPlayer: (tokenId, stacks = 1) => {
            const actualStacks = isCritical ? stacks + 1 : stacks;
            if (isCritical) {
              addLog(`💥 치명타! ${tokenId} +1 강화`);
            }
            // 현재 플레이어 상태(P)를 사용하여 토큰 추가
            const result = addToken(currentPlayerForToken, tokenId, actualStacks);
            // 결과를 P에 반영하고 dispatch
            P.tokens = result.tokens;
            currentPlayerForToken.tokens = result.tokens;
            actions.setPlayer({ ...P });
            result.logs.forEach(log => addLog(log));
            return result;
          },
          removeTokenFromPlayer: (tokenId, tokenType, stacks = 1) => {
            // 현재 플레이어 상태(P)를 사용하여 토큰 제거
            const result = removeToken(currentPlayerForToken, tokenId, tokenType, stacks);
            // 결과를 P에 반영하고 dispatch
            P.tokens = result.tokens;
            currentPlayerForToken.tokens = result.tokens;
            actions.setPlayer({ ...P });
            result.logs.forEach(log => addLog(log));
            return result;
          },
          addTokenToEnemy: (tokenId, stacks = 1) => {
            const actualStacks = isCritical ? stacks + 1 : stacks;
            if (isCritical) {
              addLog(`💥 치명타! ${tokenId} +1 강화`);
            }
            return actions.addTokenToEnemy(tokenId, actualStacks);
          },
          // 룰렛 초기화 등을 위한 토큰 스택 리셋
          resetTokenForPlayer: (tokenId, tokenType, newStacks = 0) => {
            const result = setTokenStacks(currentPlayerForToken, tokenId, tokenType, newStacks);
            P.tokens = result.tokens;
            currentPlayerForToken.tokens = result.tokens;
            actions.setPlayer({ ...P });
            result.logs.forEach(log => addLog(log));
            return result;
          }
        };
        action.card.onPlay(battle, tokenActions);
      } catch (error) {
        console.error('[Token onPlay Error]', error);
      }
    }
  }

  // 스턴 효과 처리
  if (hasTrait(action.card, 'stun')) {
    const { updatedQueue, stunEvent } = processStunEffect({
      action,
      queue: battleRef.current.queue,
      currentQIndex: battleRef.current.qIndex,
      addLog
    });
    if (updatedQueue !== battleRef.current.queue) {
      actions.setQueue(updatedQueue);
    }
    if (stunEvent) {
      actionEvents = [...actionEvents, stunEvent];
    }
  }

  // 타임라인 조작 효과 처리 (마르쉐, 런지, 비트, 흐트리기 등)
  const timelineResult = processTimelineSpecials({
    card: action.card,
    actor: action.actor,
    actorName: action.actor,
    queue: battleRef.current.queue,
    currentIndex: battleRef.current.qIndex,
    damageDealt: actionResult.dealt || 0
  });

  if (timelineResult.events.length > 0) {
    actionEvents = [...actionEvents, ...timelineResult.events];
    timelineResult.logs.forEach(log => addLog(log));
  }

  // 타임라인 변경 적용
  const { timelineChanges } = timelineResult;
  if (timelineChanges.advancePlayer > 0 || timelineChanges.pushEnemy > 0 || timelineChanges.pushLastEnemy > 0) {
    let updatedQueue = [...battleRef.current.queue];
    const currentQIndex = battleRef.current.qIndex;

    // 플레이어 카드 앞당기기 (현재 카드 이후의 플레이어 카드들)
    if (timelineChanges.advancePlayer > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > currentQIndex && item.actor === 'player') {
          return { ...item, sp: Math.max(0, item.sp - timelineChanges.advancePlayer) };
        }
        return item;
      });
    }

    // 적 카드 뒤로 밀기 (현재 카드 이후의 적 카드들)
    if (timelineChanges.pushEnemy > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > currentQIndex && item.actor === 'enemy') {
          return { ...item, sp: item.sp + timelineChanges.pushEnemy };
        }
        return item;
      });
    }

    // 적의 마지막 카드만 밀기
    if (timelineChanges.pushLastEnemy > 0) {
      // 현재 이후의 적 카드들 중 가장 마지막 카드 찾기
      let lastEnemyIdx = -1;
      for (let i = updatedQueue.length - 1; i > currentQIndex; i--) {
        if (updatedQueue[i].actor === 'enemy') {
          lastEnemyIdx = i;
          break;
        }
      }
      if (lastEnemyIdx !== -1) {
        updatedQueue = updatedQueue.map((item, idx) => {
          if (idx === lastEnemyIdx) {
            return { ...item, sp: item.sp + timelineChanges.pushLastEnemy };
          }
          return item;
        });
      }
    }

    // 큐 재정렬 (sp 값 기준, 이미 처리된 카드들은 유지)
    const processedCards = updatedQueue.slice(0, currentQIndex + 1);
    const remainingCards = updatedQueue.slice(currentQIndex + 1);
    remainingCards.sort((a, b) => a.sp - b.sp);
    updatedQueue = [...processedCards, ...remainingCards];

    actions.setQueue(updatedQueue);
  }

  // 에테르 누적
  if (action.actor === 'player') {
    processPlayerEtherAccumulation({
      card: action.card,
      turnEtherAccumulated,
      orderedRelicList,
      cardUpgrades,
      resolvedPlayerCards,
      playerTimeline,
      relics,
      triggeredRefs,
      calculatePassiveEffects: calcPassive,
      getCardEtherGain,
      collectTriggeredRelics,
      playRelicActivationSequence,
      flashRelic,
      actions
    });
  } else if (action.actor === 'enemy') {
    processEnemyEtherAccumulation({
      card: action.card,
      enemyTurnEtherAccumulated,
      getCardEtherGain,
      actions
    });

    // 집요한 타격 (persistent_strike) 효과 처리
    const persistentStrikeToken = P.tokens?.find(t => t.id === 'persistent_strike');
    if (persistentStrikeToken) {
      const strikeDamage = P._persistentStrikeDamage || 20;
      const beforeHP = E.hp;
      E.hp = Math.max(0, E.hp - strikeDamage);
      const msg = `👊 집요한 타격: 적에게 ${strikeDamage} 피해! (체력 ${beforeHP} -> ${E.hp})`;
      addLog(msg);
      actionEvents.push({
        actor: 'player',
        card: '집요한 타격',
        type: 'hit',
        dmg: strikeDamage,
        msg
      });
    }
  }

  // 상태 업데이트
  actions.setPlayer({
    ...player,
    hp: P.hp,
    def: P.def,
    block: P.block,
    counter: P.counter,
    vulnMult: P.vulnMult || 1,
    strength: P.strength || 0,
    tokens: P.tokens
  });
  actions.setEnemy({
    ...enemy,
    hp: E.hp,
    def: E.def,
    block: E.block,
    counter: E.counter,
    vulnMult: E.vulnMult || 1,
    tokens: E.tokens,
    // 다중 유닛: 유닛 배열도 업데이트
    ...(E.units && { units: E.units })
  });
  actions.setActionEvents({ ...battleRef.current.actionEvents, [battleRef.current.qIndex]: actionEvents });

  // 이벤트 애니메이션
  processActionEventAnimations({
    actionEvents,
    action,
    playHitSound,
    playBlockSound,
    actions
  });

  return { P, E, actionEvents };
}

// =====================
// finishTurn 핵심 로직
// =====================
export function finishTurnCore(params) {
  const {
    reason,
    player,
    enemy,
    battle,
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
  const newNextTurnEffects = processCardTraitEffects(selected, addLog);

  // 상징 턴 종료 효과
  const turnEndRelicEffects = applyTurnEndEffects(relics, {
    cardsPlayedThisTurn: battle.selected.length,
    player,
    enemy,
  });

  playTurnEndRelicAnimations({
    relics,
    RELICS,
    cardsPlayedThisTurn: battle.selected.length,
    player,
    enemy,
    playSound,
    actions
  });

  const updatedNextTurnEffects = applyTurnEndRelicEffectsToNextTurn({
    turnEndRelicEffects,
    nextTurnEffects: newNextTurnEffects,
    player,
    addLog,
    actions
  });

  actions.setNextTurnEffects(updatedNextTurnEffects);

  // 조합 감지
  const pComboEnd = detectPokerCombo(selected);
  const eComboEnd = detectPokerCombo(enemyPlan.actions);

  // 에테르 최종 계산
  // battleRef에서 최신 player 상태 가져오기 (아이템 효과의 etherMultiplier 등)
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
    startEnemyEtherAnimation({ enemyFinalEther, enemyEther, actions });
  }

  actions.setEnemyEtherFinalValue(enemyFinalEther);

  // 에테르 이동
  const curPlayerPts = player.etherPts || 0;
  const curEnemyPts = enemy.etherPts || 0;

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

  // 상태 업데이트
  actions.setPlayer(createTurnEndPlayerState(player, {
    comboUsageCount: newUsageCount,
    etherPts: nextPlayerPts,
    etherOverflow: playerOverflow,
    etherMultiplier: 1  // 에테르 증폭 배율 초기화
  }));

  const nextPts = Math.max(0, nextEnemyPts);
  actions.setEnemy(createTurnEndEnemyState(enemy, {
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
    actions
  });

  if (transitionResult.shouldReturn) {
    return { shouldReturn: true };
  }

  actions.setTurnNumber(t => t + 1);
  actions.setNetEtherDelta(null);
  actions.setPhase('select');

  return { shouldReturn: false };
}

// =====================
// runAll 핵심 로직
// =====================
export function runAllCore(params) {
  const {
    battle,
    player,
    enemy,
    qIndex,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    orderedRelicList,
    selected,
    addLog,
    playSound,
    actions,
  } = params;

  if (battle.qIndex >= battle.queue.length) return { completed: false };

  playSound(1000, 150);
  const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);

  let P = {
    ...player,
    def: player.def || false,
    block: player.block || 0,
    counter: player.counter || 0,
    vulnMult: player.vulnMult || 1,
    etherPts: player.etherPts || 0,
    tokens: player.tokens
  };
  let E = {
    ...enemy,
    def: enemy.def || false,
    block: enemy.block || 0,
    counter: enemy.counter || 0,
    vulnMult: enemy.vulnMult || 1,
    etherPts: enemy.etherPts || 0,
    tokens: enemy.tokens
  };

  let tempState = { player: P, enemy: E, log: [] };
  const newEvents = {};
  let enemyDefeated = false;
  let playerDefeated = false;
  let finalQIndex = qIndex;

  // runAll용 battleContext 생성
  const playerAttackCards = selected.filter(c => c.type === 'attack');
  const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
  const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;

  for (let i = qIndex; i < battle.queue.length; i++) {
    const a = battle.queue[i];

    if (enemyDefeated && a.actor === 'enemy') {
      continue;
    }

    // battleContext 생성 (각 카드마다 남은 에너지를 동적으로 계산)
    const isLastCard = i >= battle.queue.length - 1;
    const unusedAttackCards = playerAttackCards.filter(c => {
      const cardQueueIndex = battle.queue.findIndex(q => q.card?.id === c.id && q.actor === 'player');
      return cardQueueIndex > i;
    }).length;

    // 현재까지 사용된 에너지 계산 (가이러스 룰렛 등 실시간 남은 에너지 기반 효과용)
    const executedPlayerCards = battle.queue.slice(0, i).filter(q => q.actor === 'player');
    const energyUsedSoFar = executedPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const calcRemainingEnergy = Math.max(0, playerEnergyBudget - energyUsedSoFar);
    const executedEnemyCards = battle.queue.slice(0, i).filter(q => q.actor === 'enemy');
    const enemyEnergyUsedSoFar = executedEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const calcEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyEnergyUsedSoFar);

    const battleContext = {
      playerAttackCards,
      isLastCard,
      unusedAttackCards,
      queue: battle.queue,
      currentQIndex: i,
      currentSp: a.sp || 0,  // 현재 카드의 타임라인 위치 (growingDefense용)
      remainingEnergy: calcRemainingEnergy,  // 플레이어 치명타/가이러스룰렛용 남은 에너지
      enemyRemainingEnergy: calcEnemyRemainingEnergy  // 적 치명타 확률용 남은 에너지
    };

    // 다중 유닛: 공격 전 enemy HP 저장 (데미지 계산용)
    const enemyHpBefore = tempState.enemy.hp;
    const selectedTargetUnit = battle.selectedTargetUnit ?? 0;
    const enemyUnits = E.units || enemy.units || [];
    const hasUnits = enemyUnits.length > 0;

    const actionResult = applyAction(tempState, a.actor, a.card, battleContext);
    const { events, updatedState } = actionResult;
    newEvents[i] = events;
    events.forEach(ev => addLog(ev.msg));

    // 상태 업데이트 (다음 카드가 이전 카드의 결과를 반영하도록)
    if (updatedState) {
      P = updatedState.player;
      E = updatedState.enemy;
      tempState = { player: P, enemy: E, log: [] };
    }

    // === 다중 유닛 데미지 분배 ===
    if (hasUnits && a.actor === 'player' && a.card?.type === 'attack') {
      const damageDealt = Math.max(0, enemyHpBefore - E.hp);

      if (damageDealt > 0) {
        // 현재 유닛 배열에서 살아있는 유닛 찾기
        const currentUnits = E.units || enemyUnits;
        const aliveUnits = currentUnits.filter(u => u.hp > 0);
        let targetUnit = aliveUnits.find(u => u.unitId === selectedTargetUnit);
        if (!targetUnit && aliveUnits.length > 0) {
          targetUnit = aliveUnits[0];
        }

        if (targetUnit) {
          const unitHpBefore = targetUnit.hp;
          const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);

          const updatedUnits = currentUnits.map(u => {
            if (u.unitId === targetUnit.unitId) {
              return { ...u, hp: newUnitHp };
            }
            return u;
          });

          const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
          E.hp = newTotalHp;
          E.units = updatedUnits;
          tempState = { player: P, enemy: E, log: [] };

          if (targetUnit.name) {
            addLog(`🎯 ${targetUnit.name}에게 ${damageDealt} 피해 (${unitHpBefore} -> ${newUnitHp})`);
          }
        }
      }
    }

    // === 화상(BURN) 피해 처리: 카드 사용 시마다 피해 ===
    if (a.actor === 'player') {
      const playerBurnTokens = getAllTokens(P).filter(t => t.effect?.type === 'BURN');
      if (playerBurnTokens.length > 0) {
        const burnDamage = playerBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        P.hp = Math.max(0, P.hp - burnDamage);
        addLog(`🔥 화상: 플레이어 -${burnDamage} HP`);
        tempState = { player: P, enemy: E, log: [] };
      }
    } else if (a.actor === 'enemy') {
      const enemyBurnTokens = getAllTokens(E).filter(t => t.effect?.type === 'BURN');
      if (enemyBurnTokens.length > 0) {
        const burnDamage = enemyBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        E.hp = Math.max(0, E.hp - burnDamage);
        addLog(`🔥 화상: 적 -${burnDamage} HP`);
        tempState = { player: P, enemy: E, log: [] };
      }
    }

    if (a.actor === 'player') {
      const gain = Math.floor(getCardEtherGain(a.card) * passiveRelicEffects.etherMultiplier);
      actions.setTurnEtherAccumulated(turnEtherAccumulated + gain);
    } else if (a.actor === 'enemy') {
      actions.setEnemyTurnEtherAccumulated(enemyTurnEtherAccumulated + getCardEtherGain(a.card));
    }

    if (P.hp <= 0) {
      playerDefeated = true;
      finalQIndex = i + 1;
      break;
    }

    if (E.hp <= 0 && !enemyDefeated) {
      actions.setEnemyHit(true);
      playSound(200, 500);
      addLog('💀 적 처치! 남은 적 행동 건너뛰기');
      enemyDefeated = true;
    }
  }

  // 상태 업데이트
  actions.setPlayer({
    ...player,
    hp: P.hp,
    def: P.def,
    block: P.block,
    counter: P.counter,
    vulnMult: P.vulnMult || 1,
    tokens: P.tokens
  });
  actions.setEnemy({
    ...enemy,
    hp: E.hp,
    def: E.def,
    block: E.block,
    counter: E.counter,
    vulnMult: E.vulnMult || 1,
    tokens: E.tokens,
    // 다중 유닛: 유닛 배열도 업데이트
    ...(E.units && { units: E.units })
  });
  actions.setActionEvents({ ...battle.actionEvents, ...newEvents });

  if (playerDefeated) {
    actions.setQIndex(finalQIndex);
    actions.setPostCombatOptions({ type: 'defeat' });
    actions.setPhase('post');
    return { completed: true, result: 'defeat' };
  }

  actions.setQIndex(battle.queue.length);

  return {
    completed: true,
    result: enemyDefeated ? 'enemyDefeated' : 'continue',
    P,
    E
  };
}

// =====================
// 다중 타격 비동기 실행
// =====================

/**
 * 다중 타격 비동기 실행 (딜레이 + 타격별 룰렛 체크 + 타격별 치명타 판정)
 */
export async function executeMultiHitAsync(card, attacker, defender, attackerName, battleContext, onHitCallback) {
  const isGunCard = card.cardCategory === 'gun' && card.type === 'attack';
  const ghostLabel = card.isGhost ? ' [👻유령]' : '';

  // 첫 타격 준비 (치명타 판정, preProcessedResult 획득)
  const prepResult = prepareMultiHitAttack(attacker, defender, card, attackerName, battleContext);
  let { hits, firstHitCritical, preProcessedResult, modifiedCard, currentAttacker, currentDefender, attackerRemainingEnergy } = prepResult;
  const firstHitResult = prepResult.firstHitResult;

  // 치명타 추적 (타격별 개별 판정)
  const criticalHits = [firstHitCritical];
  let totalCritCount = firstHitCritical ? 1 : 0;

  let totalDealt = firstHitResult.damage;
  let totalTaken = firstHitResult.damageTaken || 0;
  let totalBlockDestroyed = firstHitResult.blockDestroyed || 0;

  // 다중 타격 시 개별 데미지 로그 필터링 (요약만 표시)
  const skipEventTypes = hits > 1 ? ['hit', 'blocked', 'pierce'] : [];
  const filteredEvents = firstHitResult.events.filter(ev => !skipEventTypes.includes(ev.type));
  const allEvents = [...filteredEvents];
  const allLogs = [];

  // 첫 타격 후 룰렛 체크 (총기 카드)
  if (isGunCard) {
    const rouletteResult = processPerHitRoulette(currentAttacker, card, attackerName, 0, hits);
    currentAttacker = rouletteResult.updatedAttacker;
    if (rouletteResult.jammed) {
      const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, { ...battleContext, isCritical: totalCritCount > 0 });
      const enemyName = battleContext.enemyDisplayName || '몬스터';
      const who = attackerName === 'player' ? `플레이어 -> ${enemyName}` : `${enemyName} -> 플레이어`;
      const baseDmgJam = modifiedCard.damage || card.damage || 0;
      const critText = firstHitCritical ? ' 💥치명타!' : '';
      const jamMsg = hits > 1
        ? `${who} • 🔫 ${card.name}${ghostLabel}: ${baseDmgJam}x1 = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - 1}회 취소)`
        : `${who} • 🔫 ${card.name}${ghostLabel}: ${totalDealt}${critText} 데미지 (탄걸림!)`;
      allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: jamMsg, dmg: totalDealt });

      return {
        attacker: finalResult.attacker,
        defender: finalResult.defender,
        dealt: totalDealt,
        taken: totalTaken,
        events: [...allEvents, ...finalResult.events],
        logs: [jamMsg],
        isCritical: totalCritCount > 0,
        criticalHits: totalCritCount,
        jammed: true,
        hitsCompleted: 1,
        totalHits: hits,
        createdCards: finalResult.createdCards
      };
    }
  }

  // 첫 타격 콜백 (애니메이션/사운드)
  if (onHitCallback) {
    await onHitCallback(firstHitResult, 0, hits);
  }

  // 후속 타격 (딜레이 포함)
  for (let i = 1; i < hits; i++) {
    await new Promise(resolve => setTimeout(resolve, TIMING.MULTI_HIT_DELAY));

    // 타격별 치명타 판정
    const hitCritical = rollCritical(currentAttacker, attackerRemainingEnergy, card, attackerName);
    criticalHits.push(hitCritical);
    if (hitCritical) totalCritCount++;

    // 타격 실행
    const hitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, hitCritical, preProcessedResult);
    currentAttacker = hitResult.attacker;
    currentDefender = hitResult.defender;
    totalDealt += hitResult.damage;
    totalTaken += hitResult.damageTaken || 0;
    totalBlockDestroyed += hitResult.blockDestroyed || 0;

    const filteredHitEvents = hitResult.events.filter(ev => !skipEventTypes.includes(ev.type));
    allEvents.push(...filteredHitEvents);

    if (onHitCallback) {
      await onHitCallback(hitResult, i, hits);
    }

    // 룰렛 체크 (총기 카드)
    if (isGunCard) {
      const rouletteResult = processPerHitRoulette(currentAttacker, card, attackerName, i, hits);
      currentAttacker = rouletteResult.updatedAttacker;
      if (rouletteResult.jammed && i < hits - 1) {
        const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, { ...battleContext, isCritical: totalCritCount > 0 });
        const enemyNameJam = battleContext.enemyDisplayName || '몬스터';
        const who = attackerName === 'player' ? `플레이어 -> ${enemyNameJam}` : `${enemyNameJam} -> 플레이어`;
        const baseDmgJam2 = modifiedCard.damage || card.damage || 0;
        const actualHits = i + 1;
        const critText = totalCritCount > 0 ? ` 💥치명타x${totalCritCount}!` : '';
        const jamMsg = `${who} • 🔫 ${card.name}${ghostLabel}: ${baseDmgJam2}x${actualHits} = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - actualHits}회 취소)`;
        allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: jamMsg, dmg: totalDealt });

        return {
          attacker: finalResult.attacker,
          defender: finalResult.defender,
          dealt: totalDealt,
          taken: totalTaken,
          events: [...allEvents, ...finalResult.events],
          logs: [...allLogs, jamMsg],
          isCritical: totalCritCount > 0,
          criticalHits: totalCritCount,
          jammed: true,
          hitsCompleted: actualHits,
          totalHits: hits,
          createdCards: finalResult.createdCards
        };
      }
    }
  }

  // 총합 로그
  const enemyNameSum = battleContext.enemyDisplayName || '몬스터';
  const who = attackerName === 'player' ? `플레이어 -> ${enemyNameSum}` : `${enemyNameSum} -> 플레이어`;
  const baseDmg = modifiedCard.damage || card.damage || 0;
  const totalAttack = baseDmg * hits;
  const critText = totalCritCount > 0 ? ` 💥치명타x${totalCritCount}!` : '';
  const icon = isGunCard ? '🔫' : '🔥';

  let dmgFormula;
  if (totalBlockDestroyed > 0) {
    dmgFormula = `공격력 ${totalAttack} - 방어력 ${totalBlockDestroyed} = ${totalDealt}`;
  } else {
    dmgFormula = `${totalDealt}`;
  }

  if (hits > 1) {
    const multiHitMsg = `${who} • ${icon} ${card.name}${ghostLabel}: ${dmgFormula}${critText} 데미지!`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: multiHitMsg, dmg: totalDealt });
    allLogs.push(multiHitMsg);
  } else {
    const singleCritText = totalCritCount > 0 ? ' 💥치명타!' : '';
    const singleHitMsg = `${who} • ${icon} ${card.name}${ghostLabel}: ${dmgFormula}${singleCritText} 데미지`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'hit', msg: singleHitMsg, dmg: totalDealt });
    allLogs.push(singleHitMsg);
  }

  // 후처리 (화상 부여 등)
  const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, { ...battleContext, isCritical: totalCritCount > 0 });

  return {
    attacker: finalResult.attacker,
    defender: finalResult.defender,
    dealt: totalDealt,
    taken: totalTaken,
    events: [...allEvents, ...finalResult.events],
    logs: [...allLogs, ...finalResult.logs],
    isCritical: totalCritCount > 0,
    criticalHits: totalCritCount,
    jammed: false,
    hitsCompleted: hits,
    totalHits: hits,
    createdCards: finalResult.createdCards
  };
}
