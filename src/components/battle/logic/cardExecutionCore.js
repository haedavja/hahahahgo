/**
 * @file cardExecutionCore.js
 * @description 카드 실행 핵심 로직
 * @typedef {import('../../../types').Card} Card
 *
 * battleExecution.js에서 분리됨
 *
 * ## 카드 실행 흐름
 * 1. 카드 특성 즉시 효과 처리
 * 2. 공격/방어 액션 적용
 * 3. 에테르 누적 처리
 * 4. 이벤트 애니메이션 처리
 */

import { hasTrait } from '../utils/battleUtils';
import { getCardEtherGain } from '../utils/etherCalculations';
import { BASE_PLAYER_ENERGY } from '../battleData';
import { applyAction } from './combatActions';
import { processTimelineSpecials } from '../utils/cardSpecialEffects';
import { processCardTraitEffects } from '../utils/cardTraitEffects';
import { processImmediateCardTraits, processCardPlayedRelicEffects } from '../utils/cardImmediateEffects';
import { processActionEventAnimations } from '../utils/eventAnimationProcessing';
import { processStunEffect } from '../utils/stunProcessing';
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from '../utils/etherAccumulationProcessing';
import { addToken, removeToken, getAllTokens, setTokenStacks } from '../../../lib/tokenUtils';

/**
 * executeCardAction 핵심 로직
 */
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
  // 이번 턴 사용하지 않은 공격 카드 수
  const usedCardIndices = battleRef.current?.usedCardIndices || [];
  const unusedAttackCards = playerAttackCards.filter((c, idx) => {
    const cardQueueIndex = queue.findIndex(q => q.card?.id === c.id && q.actor === 'player');
    return cardQueueIndex > currentQIndex;
  }).length;

  // 진행 단계 최종 남은 행동력 계산
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
    currentSp: action.sp || 0,
    remainingEnergy,
    enemyRemainingEnergy
  };

  // 카드 트레잇 즉시 효과 처리
  const traitResult = processImmediateCardTraits(action.card, action.actor, P, E, addLog);
  P = traitResult.player;
  E = traitResult.enemy;

  // 상징 효과 처리 (카드 플레이 시)
  const relicResult = processCardPlayedRelicEffects({
    card: action.card,
    actor: action.actor,
    player: P,
    enemy: E,
    relics: orderedRelicList,
    flashRelic,
    addLog
  });
  P = relicResult.player;
  E = relicResult.enemy;

  // 스턴 효과 처리
  const stunResult = processStunEffect(action.card, action.actor, P, E, addLog);
  P = stunResult.player;
  E = stunResult.enemy;

  // 액션 적용
  const actionResult = applyAction(tempState, action.actor, action.card, battleContext);
  let actionEvents = actionResult.events || [];

  if (actionResult.updatedState) {
    P = actionResult.updatedState.player;
    E = actionResult.updatedState.enemy;
  }

  // 타임라인 조작 효과 처리
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
    const qIdx = battleRef.current.qIndex;

    if (timelineChanges.advancePlayer > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > qIdx && item.actor === 'player') {
          return { ...item, sp: Math.max(0, item.sp - timelineChanges.advancePlayer) };
        }
        return item;
      });
    }

    if (timelineChanges.pushEnemy > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > qIdx && item.actor === 'enemy') {
          return { ...item, sp: item.sp + timelineChanges.pushEnemy };
        }
        return item;
      });
    }

    if (timelineChanges.pushLastEnemy > 0) {
      let lastEnemyIdx = -1;
      for (let i = updatedQueue.length - 1; i > qIdx; i--) {
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

    // 큐 재정렬
    const processedCards = updatedQueue.slice(0, qIdx + 1);
    const remainingCards = updatedQueue.slice(qIdx + 1);
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

    // 집요한 타격 효과 처리
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
