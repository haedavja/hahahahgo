/**
 * @file cardExecutionCore.ts
 * @description 카드 실행 핵심 로직
 *
 * battleExecution.js에서 분리됨
 *
 * ## 카드 실행 흐름
 * 1. 카드 특성 즉시 효과 처리
 * 2. 공격/방어 액션 적용
 * 3. 에테르 누적 처리
 * 4. 이벤트 애니메이션 처리
 */

import type {
  ExecuteCardActionCoreParams,
  ExecuteCardActionResult,
  BattleEvent,
  StunAction,
  StunQueueItem,
  StunProcessingResult,
  Card,
  Combatant,
  BattleAction,
  HandAction,
  SimActionEvent
} from '../../../types';
import { hasTrait, markCrossedCards } from '../utils/battleUtils';

// 하위 호환용 타입 별칭
type SpecialCard = Card;
type SpecialQueueItem = BattleAction;
type SpecialActor = Combatant;
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
export function executeCardActionCore(params: ExecuteCardActionCoreParams): ExecuteCardActionResult {
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

  // 단일 순회로 에너지 계산 + 미사용 공격카드 수 계산 (O(n) 최적화)
  let totalEnergyUsed = 0;
  let enemyTotalEnergyUsed = 0;
  let unusedAttackCards = 0;
  for (let i = 0; i < queue.length; i++) {
    const q = queue[i];
    if (q.actor === 'player') {
      totalEnergyUsed += q.card?.actionCost || 0;
      // 현재 인덱스보다 뒤에 있는 공격 카드 수
      if (i > currentQIndex && q.card?.type === 'attack') {
        unusedAttackCards++;
      }
    } else if (q.actor === 'enemy') {
      enemyTotalEnergyUsed += q.card?.actionCost || 0;
    }
  }

  const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);
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
  const traitResult = processImmediateCardTraits({ card: action.card, actor: action.actor, player: P, enemy: E, addLog } as unknown as Parameters<typeof processImmediateCardTraits>[0]);
  P = traitResult.player as typeof P;
  E = traitResult.enemy as typeof E;

  // 상징 효과 처리 (카드 플레이 시) - P, E는 in-place로 수정됨
  processCardPlayedRelicEffects({
    card: action.card,
    actor: action.actor,
    player: P,
    enemy: E,
    relics: orderedRelicList,
    flashRelic,
    addLog
  } as unknown as Parameters<typeof processCardPlayedRelicEffects>[0]);
  // P, E는 함수 내부에서 직접 수정됨 (playerState.hp = healed 등)

  // 스턴 효과 처리
  const stunResult = processStunEffect({
    action: action as unknown as StunAction,
    queue: battleRef.current?.queue as unknown as StunQueueItem[],
    currentQIndex: battleRef.current?.qIndex ?? 0,
    addLog
  }) as StunProcessingResult;
  if (stunResult.updatedQueue) {
    const markedStunQueue = markCrossedCards(stunResult.updatedQueue as any);
    actions.setQueue(markedStunQueue as any);
  }

  // 액션 적용
  const actionResult = applyAction(tempState, action.actor, action.card, battleContext);
  let actionEvents = (actionResult.events || []) as BattleEvent[];

  if (actionResult.updatedState) {
    P = actionResult.updatedState.player as typeof P;
    E = actionResult.updatedState.enemy as typeof E;
  }

  // queueModifications 적용 (교차 밀어내기 등)
  if (actionResult.queueModifications && actionResult.queueModifications.length > 0) {
    let updatedQueue = [...(battleRef.current?.queue ?? [])];
    const qIdx = battleRef.current?.qIndex ?? 0;

    actionResult.queueModifications.forEach(mod => {
      if (mod.index > qIdx && updatedQueue[mod.index]) {
        updatedQueue[mod.index] = { ...updatedQueue[mod.index], sp: mod.newSp };
      }
    });

    // 큐 재정렬
    const processedCards = updatedQueue.slice(0, qIdx + 1);
    const remainingCards = updatedQueue.slice(qIdx + 1);
    remainingCards.sort((a, b) => (a.sp ?? 0) - (b.sp ?? 0));
    updatedQueue = [...processedCards, ...remainingCards];

    // 겹침 체크
    updatedQueue = markCrossedCards(updatedQueue);

    actions.setQueue(updatedQueue);
  }

  // 타임라인 조작 효과 처리
  const currentActor = action.actor === 'player' ? P : E;
  const timelineResult = processTimelineSpecials({
    card: action.card,
    actor: currentActor,
    actorName: action.actor as 'player' | 'enemy',
    queue: battleRef.current?.queue,
    currentIndex: battleRef.current?.qIndex ?? 0,
    damageDealt: actionResult.dealt || 0
  });

  if (timelineResult.events.length > 0) {
    actionEvents = [...actionEvents, ...timelineResult.events] as BattleEvent[];
    timelineResult.logs.forEach(log => addLog(log));
  }

  // 타임라인 변경 적용
  const { timelineChanges } = timelineResult;
  if (timelineChanges.advancePlayer > 0 || timelineChanges.pushEnemy > 0 || timelineChanges.pushLastEnemy > 0) {
    let updatedQueue = [...(battleRef.current?.queue ?? [])];
    const qIdx = battleRef.current?.qIndex ?? 0;

    if (timelineChanges.advancePlayer > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > qIdx && item.actor === 'player') {
          return { ...item, sp: Math.max(0, (item.sp ?? 0) - timelineChanges.advancePlayer) };
        }
        return item;
      });
    }

    if (timelineChanges.pushEnemy > 0) {
      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > qIdx && item.actor === 'enemy') {
          return { ...item, sp: (item.sp ?? 0) + timelineChanges.pushEnemy };
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
            return { ...item, sp: (item.sp ?? 0) + timelineChanges.pushLastEnemy };
          }
          return item;
        });
      }
    }

    // 큐 재정렬
    const processedCards = updatedQueue.slice(0, qIdx + 1);
    const remainingCards = updatedQueue.slice(qIdx + 1);
    remainingCards.sort((a, b) => (a.sp ?? 0) - (b.sp ?? 0));
    updatedQueue = [...processedCards, ...remainingCards];

    // 겹침 체크
    updatedQueue = markCrossedCards(updatedQueue);

    actions.setQueue(updatedQueue);
  }

  // 방어자 타임라인 앞당김 (rain_defense 등)
  const defenderAdvance = actionResult.defenderTimelineAdvance || 0;
  if (defenderAdvance > 0) {
    const defenderName = action.actor === 'player' ? 'enemy' : 'player';
    let updatedQueue = [...(battleRef.current?.queue ?? [])];
    const qIdx = battleRef.current?.qIndex ?? 0;

    updatedQueue = updatedQueue.map((item, idx) => {
      if (idx > qIdx && item.actor === defenderName) {
        return { ...item, sp: Math.max(0, (item.sp ?? 0) - defenderAdvance) };
      }
      return item;
    });

    // 큐 재정렬
    const processedCards = updatedQueue.slice(0, qIdx + 1);
    const remainingCards = updatedQueue.slice(qIdx + 1);
    remainingCards.sort((a, b) => (a.sp ?? 0) - (b.sp ?? 0));
    updatedQueue = [...processedCards, ...remainingCards];

    // 겹침 체크
    updatedQueue = markCrossedCards(updatedQueue);

    actions.setQueue(updatedQueue);
  }

  // 에테르 누적
  if (action.actor === 'player') {
    // blockPerCardExecution 효과: 카드당 방어력 획득
    const blockPerCard = nextTurnEffects?.blockPerCardExecution || 0;
    if (blockPerCard > 0) {
      P.block = (P.block || 0) + blockPerCard;
      const msg = `🛡️ 노인의 꿈: 카드 실행 시 방어력 +${blockPerCard}`;
      addLog(msg);
      actionEvents.push({
        actor: 'player',
        type: 'special',
        msg
      } as BattleEvent);
    }

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
    const persistentStrikeToken = getAllTokens(P).find((t: { id: string }) => t.id === 'persistent_strike');
    if (persistentStrikeToken) {
      const strikeDamage = (P as { _persistentStrikeDamage?: number })._persistentStrikeDamage || 20;
      const beforeHP = E.hp;
      E.hp = Math.max(0, E.hp - strikeDamage);
      const msg = `👊 집요한 타격: 적에게 ${strikeDamage} 피해! (체력 ${beforeHP} -> ${E.hp})`;
      addLog(msg);
      actionEvents.push({
        actor: 'player',
        card: '집요한 타격',
        type: 'damage',
        dmg: strikeDamage,
        msg
      } as BattleEvent);
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
  const currentQIndexForEvents = battleRef.current?.qIndex ?? 0;
  actions.setActionEvents({ ...(battleRef.current?.actionEvents ?? {}), [currentQIndexForEvents]: actionEvents });

  // 이벤트 애니메이션
  processActionEventAnimations({
    actionEvents: actionEvents as unknown as SimActionEvent[],
    action: action as unknown as HandAction,
    playHitSound: playHitSound ?? (() => {}),
    playBlockSound: playBlockSound ?? (() => {}),
    actions
  });

  return { P, E, actionEvents };
}
