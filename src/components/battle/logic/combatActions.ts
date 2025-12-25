/**
 * @file combatActions.ts
 * @description 전투 행동 처리 로직
 *
 * 분리된 모듈:
 * - defenseLogic.ts: 방어 행동 처리
 * - hitCalculation.ts: 단일 타격 계산 및 반격 처리
 */

import type {
  Card,
  AttackResult,
  ActionResult,
  CombatActor,
  CombatCard,
  CombatBattleContext,
  CombatState,
  MultiHitPrepareResult,
  MultiHitFinalizeResult
} from '../../../types';
import { addToken, removeToken } from '../../../lib/tokenUtils';
import {
  processPostAttackSpecials,
  processCardCreationSpecials,
  processCardPlaySpecials,
  rollCritical
} from '../utils/cardSpecialEffects';

// 분리된 모듈에서 import 및 re-export
export { applyDefense } from './defenseLogic';
export { calculateSingleHit, applyCounter, applyCounterShot } from './hitCalculation';
import { applyDefense } from './defenseLogic';
import { calculateSingleHit } from './hitCalculation';

/**
 * 공격 행동 적용 (다중 타격 지원 + special 효과)
 * @param attacker - 공격자
 * @param defender - 방어자
 * @param card - 사용된 카드
 * @param attackerName - 공격자 이름
 * @param battleContext - 전투 컨텍스트
 * @returns 공격 결과
 */
export function applyAttack(
  attacker: CombatActor,
  defender: CombatActor,
  card: CombatCard,
  attackerName: 'player' | 'enemy',
  battleContext: CombatBattleContext = {}
): AttackResult {
  // 입력 검증
  if (!attacker || !defender || !card) {
    console.error('[applyAttack] Invalid input:', { attacker: !!attacker, defender: !!defender, card: !!card });
    return {
      attacker: attacker || {},
      defender: defender || {},
      totalDealt: 0,
      totalTaken: 0,
      events: [],
      logs: ['⚠️ 공격 처리 오류']
    };
  }

  let totalDealt = 0;
  let totalTaken = 0;
  let totalBlockDestroyed = 0;
  const allEvents = [];
  const allLogs = [];

  let currentAttacker = { ...attacker };
  let currentDefender = { ...defender };

  // 치명타 판정 (카드당 1번만 롤)
  const attackerRemainingEnergy = attackerName === 'player'
    ? (battleContext.remainingEnergy || 0)
    : (battleContext.enemyRemainingEnergy || 0);
  const isCritical = rollCritical(currentAttacker, attackerRemainingEnergy, card, attackerName);

  // 첫 번째 타격
  const firstHitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, isCritical, null);
  currentAttacker = firstHitResult.attacker;
  currentDefender = firstHitResult.defender;
  totalDealt += firstHitResult.damage;
  totalTaken += firstHitResult.damageTaken || 0;
  totalBlockDestroyed += firstHitResult.blockDestroyed || 0;

  const preProcessedResult = firstHitResult.preProcessedResult;
  const modifiedCard = preProcessedResult?.modifiedCard || card;
  const hits = modifiedCard.hits || card.hits || 1;

  const isGhostCard = card.isGhost === true;
  const ghostLabel = isGhostCard ? ' [👻유령]' : '';

  // 다중 타격 시 개별 hit 이벤트 필터링
  const skipEventTypes = hits > 1 ? ['hit', 'blocked', 'pierce'] : [];
  const filteredFirstEvents = firstHitResult.events.filter(ev => !skipEventTypes.includes(ev.type));
  allEvents.push(...filteredFirstEvents);
  if (hits === 1) {
    allLogs.push(...firstHitResult.logs);
  }

  // 추가 타격 수행
  for (let i = 1; i < hits; i++) {
    const result = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, isCritical, preProcessedResult);
    currentAttacker = result.attacker;
    currentDefender = result.defender;
    totalDealt += result.damage;
    totalTaken += result.damageTaken || 0;
    totalBlockDestroyed += result.blockDestroyed || 0;
    const filteredEvents = result.events.filter(ev => !skipEventTypes.includes(ev.type));
    allEvents.push(...filteredEvents);
  }

  // 다중 타격 총합 로그
  if (hits > 1) {
    const enemyNameMulti = battleContext.enemyDisplayName || '몬스터';
    const who = attackerName === 'player' ? `플레이어 -> ${enemyNameMulti}` : `${enemyNameMulti} -> 플레이어`;
    const baseDmg = modifiedCard.damage || card.damage || 0;
    const totalAttack = baseDmg * hits;
    const critText = isCritical ? ' 💥치명타!' : '';
    const isGunCard = card.cardCategory === 'gun';
    const icon = isGunCard ? '🔫' : '🔥';
    const actorEmoji = attackerName === 'player' ? '🔵' : '👾';

    let dmgFormula;
    if (totalBlockDestroyed > 0) {
      dmgFormula = `공격력 ${totalAttack} - 방어력 ${totalBlockDestroyed} = ${totalDealt}`;
    } else {
      dmgFormula = `${totalDealt}`;
    }

    const multiHitMsg = `${actorEmoji} ${who} • ${icon} ${card.name}${ghostLabel}: ${dmgFormula}${critText} 데미지!`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: multiHitMsg, dmg: totalDealt });
    allLogs.push(multiHitMsg);
  }

  // 공격 후 special 효과 처리
  const postAttackResult = processPostAttackSpecials({
    card: modifiedCard,
    attacker: currentAttacker,
    defender: currentDefender,
    attackerName,
    damageDealt: totalDealt,
    battleContext: { ...battleContext, blockDestroyed: totalBlockDestroyed, isCritical }
  });

  currentAttacker = postAttackResult.attacker;
  currentDefender = postAttackResult.defender;
  allEvents.push(...postAttackResult.events);
  allLogs.push(...postAttackResult.logs);

  // 추가 타격 처리
  if (postAttackResult.extraHits > 0) {
    for (let i = 0; i < postAttackResult.extraHits; i++) {
      const result = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, isCritical);
      currentAttacker = result.attacker;
      currentDefender = result.defender;
      totalDealt += result.damage;
      totalTaken += result.damageTaken || 0;
      allEvents.push(...result.events);
      allLogs.push(...result.logs);
    }
  }

  // 카드 창조 효과 처리
  const cardCreationResult = processCardCreationSpecials({
    card,
    actorName: attackerName,
    damageDealt: totalDealt,
    allCards: battleContext.allCards || []
  });

  allEvents.push(...cardCreationResult.events);
  allLogs.push(...cardCreationResult.logs);

  return {
    attacker: currentAttacker,
    defender: currentDefender,
    dealt: totalDealt,
    taken: totalTaken,
    events: allEvents,
    logs: allLogs,
    isCritical,
    createdCards: cardCreationResult.createdCards
  };
}


/**
 * 다중 타격 공격 준비 (비동기 처리용)
 */
export function prepareMultiHitAttack(
  attacker: CombatActor,
  defender: CombatActor,
  card: CombatCard,
  attackerName: 'player' | 'enemy',
  battleContext: CombatBattleContext = {}
): MultiHitPrepareResult {
  const currentAttacker = { ...attacker };
  const currentDefender = { ...defender };

  const attackerRemainingEnergy = attackerName === 'player'
    ? (battleContext.remainingEnergy || 0)
    : (battleContext.enemyRemainingEnergy || 0);
  const firstHitCritical = rollCritical(currentAttacker, attackerRemainingEnergy, card, attackerName);

  const firstHitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, firstHitCritical, null);

  const preProcessedResult = firstHitResult.preProcessedResult;
  const modifiedCard = preProcessedResult?.modifiedCard || card;
  const hits = modifiedCard.hits || card.hits || 1;

  return {
    hits,
    firstHitCritical,
    preProcessedResult,
    modifiedCard,
    firstHitResult,
    currentAttacker: firstHitResult.attacker,
    currentDefender: firstHitResult.defender,
    attackerRemainingEnergy
  };
}


/**
 * 공격 후 special 효과 처리 (외부 호출용)
 */
export function finalizeMultiHitAttack(
  modifiedCard: CombatCard,
  attacker: CombatActor,
  defender: CombatActor,
  attackerName: 'player' | 'enemy',
  totalDealt: number,
  totalBlockDestroyed: number,
  battleContext: CombatBattleContext = {}
): MultiHitFinalizeResult {
  const postAttackResult = processPostAttackSpecials({
    card: modifiedCard,
    attacker,
    defender,
    attackerName,
    damageDealt: totalDealt,
    battleContext: { ...battleContext, blockDestroyed: totalBlockDestroyed }
  });

  const cardCreationResult = processCardCreationSpecials({
    card: modifiedCard,
    actorName: attackerName,
    damageDealt: totalDealt,
    allCards: battleContext.allCards || []
  });

  return {
    attacker: postAttackResult.attacker,
    defender: postAttackResult.defender,
    events: [...postAttackResult.events, ...cardCreationResult.events],
    logs: [...postAttackResult.logs, ...cardCreationResult.logs],
    extraHits: postAttackResult.extraHits || 0,
    createdCards: cardCreationResult.createdCards
  };
}

/**
 * 전투 행동 통합 처리 (방어/공격 자동 판별)
 */
export function applyAction(
  state: CombatState,
  actor: 'player' | 'enemy',
  card: CombatCard,
  battleContext: CombatBattleContext = {}
): ActionResult {
  const A = actor === 'player' ? state.player : state.enemy;
  const B = actor === 'player' ? state.enemy : state.player;

  let result;
  let updatedActor = A;

  if (card.type === 'general' || card.type === 'defense') {
    result = applyDefense(A, card, actor, battleContext);
    updatedActor = result.actor;
    let updatedOpponent = B;

    const cardPlayResult = processCardPlaySpecials({
      card,
      attacker: updatedActor,
      attackerName: actor,
      battleContext
    });

    if (cardPlayResult.tokensToAdd && cardPlayResult.tokensToAdd.length > 0) {
      cardPlayResult.tokensToAdd.forEach(tokenInfo => {
        if (tokenInfo.targetEnemy) {
          const tokenResult = addToken(updatedOpponent, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
          updatedOpponent = { ...updatedOpponent, tokens: tokenResult.tokens };
        } else {
          const tokenResult = addToken(updatedActor, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
          updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
        }
      });
    }

    if (cardPlayResult.tokensToRemove && cardPlayResult.tokensToRemove.length > 0) {
      cardPlayResult.tokensToRemove.forEach(tokenInfo => {
        const tokenResult = removeToken(updatedActor, tokenInfo.id, 'permanent', tokenInfo.stacks);
        updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
      });
    }

    const opponentKey = actor === 'player' ? 'enemy' : 'player';
    const updatedState = {
      ...state,
      [actor]: updatedActor,
      [opponentKey]: updatedOpponent,
      log: [...state.log, result.log, ...cardPlayResult.logs]
    };
    return {
      dealt: result.dealt,
      taken: result.taken,
      events: [...result.events, ...cardPlayResult.events],
      updatedState,
      cardPlaySpecials: cardPlayResult
    };
  }

  if (card.type === 'attack') {
    result = applyAttack(A, B, card, actor, battleContext);
    updatedActor = result.attacker;
    let updatedDefender = result.defender;

    const cardPlayResult = processCardPlaySpecials({
      card,
      attacker: updatedActor,
      attackerName: actor,
      battleContext
    });

    if (cardPlayResult.tokensToAdd && cardPlayResult.tokensToAdd.length > 0) {
      cardPlayResult.tokensToAdd.forEach(tokenInfo => {
        if (tokenInfo.targetEnemy) {
          const tokenResult = addToken(updatedDefender, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
          updatedDefender = { ...updatedDefender, tokens: tokenResult.tokens };
        } else {
          const tokenResult = addToken(updatedActor, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
          updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
        }
      });
    }

    if (cardPlayResult.tokensToRemove && cardPlayResult.tokensToRemove.length > 0) {
      cardPlayResult.tokensToRemove.forEach(tokenInfo => {
        const tokenResult = removeToken(updatedActor, tokenInfo.id, 'permanent', tokenInfo.stacks);
        updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
      });
    }

    const actorKey = actor;
    const defenderKey = actor === 'player' ? 'enemy' : 'player';
    const updatedState = {
      ...state,
      [actorKey]: updatedActor,
      [defenderKey]: updatedDefender,
      log: [...state.log, ...result.logs, ...cardPlayResult.logs]
    };
    return {
      dealt: result.dealt,
      taken: result.taken,
      events: [...result.events, ...cardPlayResult.events],
      updatedState,
      isCritical: result.isCritical,
      createdCards: result.createdCards || [],
      cardPlaySpecials: cardPlayResult
    };
  }

  return {
    dealt: 0,
    taken: 0,
    events: [],
    updatedState: state
  };
}

// rollCritical 재-export
export { rollCritical } from '../utils/cardSpecialEffects';
