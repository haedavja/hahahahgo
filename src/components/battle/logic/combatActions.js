import { hasTrait } from '../utils/battleUtils';
import { applyTokenEffectsToCard, applyTokenEffectsOnDamage, consumeTokens } from '../../../lib/tokenEffects';
import {
  processPreAttackSpecials,
  processPostAttackSpecials,
  shouldIgnoreBlock,
  calculateGrowingDefense
} from '../utils/cardSpecialEffects';

/**
 * 전투 행동 처리 로직
 * applyAction 함수를 모듈화
 */

// =====================
// 방어 행동 처리
// =====================

/**
 * 방어 행동 적용
 * @param {Object} actor - 행동 주체 (player 또는 enemy)
 * @param {Object} card - 사용한 카드
 * @param {string} actorName - 'player' 또는 'enemy'
 * @param {Object} battleContext - 전투 컨텍스트 (special 효과용)
 * @returns {Object} - { actor: 업데이트된 actor, events: 이벤트 배열, log: 로그 메시지 }
 */
export function applyDefense(actor, card, actorName, battleContext = {}) {
  console.log('[applyDefense] called with:', {
    cardName: card?.name,
    cardSpecial: card?.special,
    battleContextCurrentSp: battleContext?.currentSp,
    ignoreStatus: card?.ignoreStatus,
    ignoreStrength: card?.ignoreStrength
  });

  // 유령카드나 ignoreStatus 특성이 있으면 토큰 효과 미적용
  const isGhost = card.isGhost === true;
  const skipTokenEffects = isGhost || card.ignoreStatus === true;
  const { modifiedCard, consumedTokens } = skipTokenEffects
    ? { modifiedCard: card, consumedTokens: [] }
    : applyTokenEffectsToCard(card, actor, 'defense');

  const prev = actor.block || 0;
  // ignoreStrength 특성이 있으면 힘 보너스 무시 (방어자세)
  const strengthBonus = modifiedCard.ignoreStrength ? 0 : (actor.strength || 0);

  // growingDefense 특성: 타임라인이 지날수록 방어력 증가 (방어자세)
  const currentSp = battleContext.currentSp || 0;
  const growingDefenseBonus = calculateGrowingDefense(modifiedCard, currentSp);
  console.log('[applyDefense] growingDefenseBonus:', growingDefenseBonus);

  const added = (modifiedCard.block || 0) + strengthBonus + growingDefenseBonus;
  const after = prev + added;

  // 소모된 토큰 제거
  let tokenLogs = [];
  let updatedTokens = actor.tokens;
  if (consumedTokens.length > 0) {
    const consumeResult = consumeTokens(actor, consumedTokens);
    updatedTokens = consumeResult.tokens;
    tokenLogs = consumeResult.logs;
  }

  const updatedActor = {
    ...actor,
    def: true,
    block: after,
    counter: card.counter !== undefined ? (card.counter || 0) : actor.counter,
    tokens: updatedTokens
  };

  const who = actorName === 'player' ? '플레이어' : '몬스터';
  const growingText = growingDefenseBonus > 0 ? ` (+${growingDefenseBonus} 방어자세)` : '';
  const msg = prev === 0
    ? `${who} • 🛡️ +${added}${growingText} = ${after}`
    : `${who} • 🛡️ ${prev} + ${added}${growingText} = ${after}`;

  const event = {
    actor: actorName,
    card: card.name,
    type: 'defense',
    msg
  };

  const logMsg = `${actorName === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`;
  const allLogs = tokenLogs.length > 0 ? [logMsg, ...tokenLogs] : [logMsg];

  return {
    actor: updatedActor,
    dealt: 0,
    taken: 0,
    events: [event],
    log: allLogs.join(' | ')
  };
}

// =====================
// 공격 행동 처리
// =====================

/**
 * 단일 타격 계산
 * @param {Object} attacker - 공격자
 * @param {Object} defender - 방어자
 * @param {Object} card - 사용한 카드
 * @param {string} attackerName - 'player' 또는 'enemy'
 * @param {Object} battleContext - 전투 컨텍스트 (special 효과용)
 * @returns {Object} - { attacker, defender, damage, events, logs }
 */
function calculateSingleHit(attacker, defender, card, attackerName, battleContext = {}) {
  // 유령카드는 토큰 효과 미적용
  const isGhost = card.isGhost === true;
  const { modifiedCard: tokenModifiedCard, consumedTokens: attackerConsumedTokens } = isGhost
    ? { modifiedCard: card, consumedTokens: [] }
    : applyTokenEffectsToCard(card, attacker, 'attack');

  // special 효과 적용 (공격 전)
  const preAttackResult = processPreAttackSpecials({
    card: tokenModifiedCard,
    attacker,
    defender,
    attackerName,
    battleContext
  });

  const modifiedCard = preAttackResult.modifiedCard;
  let currentAttacker = preAttackResult.attacker;
  let currentDefender = preAttackResult.defender;
  const specialEvents = preAttackResult.events;
  const specialLogs = preAttackResult.logs;

  const base = modifiedCard.damage;
  const strengthBonus = currentAttacker.strength || 0;
  const boost = currentAttacker.etherOverdriveActive ? 2 : 1;
  let dmg = (base + strengthBonus) * boost;

  const crushMultiplier = hasTrait(card, 'crush') ? 2 : 1;
  const events = [...specialEvents];
  const logs = [...specialLogs];
  let damageDealt = 0;
  let damageTaken = 0;

  let updatedAttacker = { ...currentAttacker };
  let updatedDefender = { ...currentDefender };

  // 공격자의 소모된 토큰 제거
  if (attackerConsumedTokens.length > 0) {
    const consumeResult = consumeTokens(updatedAttacker, attackerConsumedTokens);
    updatedAttacker.tokens = consumeResult.tokens;
    logs.push(...consumeResult.logs);
  }

  // 토큰 효과 적용 (회피, 허약, 반격 등)
  const tokenDamageResult = applyTokenEffectsOnDamage(dmg, currentDefender, currentAttacker);

  // 방어자의 소모된 토큰 제거
  if (tokenDamageResult.consumedTokens.length > 0) {
    const consumeResult = consumeTokens(updatedDefender, tokenDamageResult.consumedTokens);
    updatedDefender.tokens = consumeResult.tokens;
    logs.push(...consumeResult.logs);
  }

  // 회피 성공 시 즉시 리턴
  if (tokenDamageResult.dodged) {
    events.push({
      actor: attackerName,
      card: card.name,
      type: 'dodge',
      msg: tokenDamageResult.logs.join(', ')
    });
    logs.push(...tokenDamageResult.logs);
    return {
      attacker: updatedAttacker,
      defender: updatedDefender,
      damage: 0,
      events,
      logs
    };
  }

  // 토큰 효과 로그 추가
  if (tokenDamageResult.logs.length > 0) {
    logs.push(...tokenDamageResult.logs);
  }

  // 피해 증가/감소 효과 적용 (허약, 아픔)
  dmg = tokenDamageResult.finalDamage;

  // ignoreBlock 체크 - 방어력 무시 시 방어력이 없는 것처럼 처리
  const ignoreBlock = shouldIgnoreBlock(modifiedCard);

  // 방어력이 있는 경우 (단, ignoreBlock이면 무시)
  if (!ignoreBlock && updatedDefender.def && (updatedDefender.block || 0) > 0) {
    const beforeBlock = updatedDefender.block;
    const effectiveDmg = dmg * crushMultiplier;

    // 완전 차단
    if (effectiveDmg < beforeBlock) {
      const remaining = beforeBlock - effectiveDmg;
      updatedDefender.block = remaining;
      dmg = 0;

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const formula = `(방어력 ${beforeBlock} - 공격력 ${base}${boost > 1 ? '×2' : ''}${crushText} = ${remaining})`;
      const msg = `${attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 성공 ${formula}`;

      events.push({ actor: attackerName, card: card.name, type: 'blocked', msg });
      logs.push(`${attackerName === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
    }
    // 부분 차단 + 관통
    else {
      const blocked = beforeBlock;
      const remained = Math.max(0, effectiveDmg - blocked);
      updatedDefender.block = 0;

      const vulnMul = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
      const finalDmg = Math.floor(remained * vulnMul);
      const beforeHP = updatedDefender.hp;
      updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const formula = `(방어력 ${blocked} - 공격력 ${base}${boost > 1 ? '×2' : ''}${crushText} = 0)`;
      const msg = `${attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 ${blocked} ${formula}, 관통 ${finalDmg} (체력 ${beforeHP} -> ${updatedDefender.hp})`;

      events.push({
        actor: attackerName,
        card: card.name,
        type: 'pierce',
        dmg: finalDmg,
        beforeHP,
        afterHP: updatedDefender.hp,
        msg
      });
      logs.push(`${attackerName === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);

      damageDealt += finalDmg;

      // 반격 처리 (기존 counter 속성 + 토큰 반격)
      const totalCounter = (updatedDefender.counter || 0) + (tokenDamageResult.reflected || 0);
      if (totalCounter > 0 && finalDmg > 0) {
        const counterResult = applyCounter(updatedDefender, updatedAttacker, attackerName, totalCounter);
        updatedAttacker = counterResult.attacker;
        events.push(...counterResult.events);
        logs.push(...counterResult.logs);
        damageTaken += counterResult.damage;
      }
    }
  }
  // 방어력이 없는 경우 (또는 ignoreBlock으로 무시)
  else {
    const vulnMul = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
    const finalDmg = Math.floor(dmg * vulnMul);
    const beforeHP = updatedDefender.hp;
    updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

    const ignoreBlockText = ignoreBlock && (updatedDefender.block || 0) > 0 ? ' [방어 무시]' : '';
    const msg = `${attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 데미지 ${finalDmg}${boost > 1 ? ' (에테르 폭주×2)' : ''}${ignoreBlockText} (체력 ${beforeHP} -> ${updatedDefender.hp})`;

    events.push({
      actor: attackerName,
      card: card.name,
      type: 'hit',
      dmg: finalDmg,
      beforeHP,
      afterHP: updatedDefender.hp,
      msg
    });
    logs.push(`${attackerName === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);

    damageDealt += finalDmg;

    // 반격 처리 (기존 counter 속성 + 토큰 반격)
    const totalCounter = (updatedDefender.counter || 0) + (tokenDamageResult.reflected || 0);
    if (totalCounter > 0 && finalDmg > 0) {
      const counterResult = applyCounter(updatedDefender, updatedAttacker, attackerName, totalCounter);
      updatedAttacker = counterResult.attacker;
      events.push(...counterResult.events);
      logs.push(...counterResult.logs);
      damageTaken += counterResult.damage;
    }
  }

  return {
    attacker: updatedAttacker,
    defender: updatedDefender,
    damage: damageDealt,
    damageTaken,
    events,
    logs
  };
}

/**
 * 반격 처리
 * @param {Object} defender - 방어자
 * @param {Object} attacker - 공격자
 * @param {string} attackerName - 공격자 이름
 * @param {number} counterDmg - 반격 피해량 (기본값: defender.counter)
 */
function applyCounter(defender, attacker, attackerName, counterDmg = null) {
  const actualCounterDmg = counterDmg !== null ? counterDmg : (defender.counter || 0);
  const beforeHP = attacker.hp;
  const updatedAttacker = {
    ...attacker,
    hp: Math.max(0, attacker.hp - actualCounterDmg)
  };

  const cmsg = `${attackerName === 'player' ? '몬스터 -> 플레이어' : '플레이어 -> 몬스터'} • 반격 ${actualCounterDmg} (체력 ${beforeHP} -> ${updatedAttacker.hp})`;

  const event = { actor: 'counter', value: actualCounterDmg, msg: cmsg };
  const log = `${attackerName === 'player' ? '🔵' : '👾'} ${cmsg}`;

  return {
    attacker: updatedAttacker,
    damage: actualCounterDmg,
    events: [event],
    logs: [log]
  };
}

/**
 * 공격 행동 적용 (다중 타격 지원 + special 효과)
 * @param {Object} attacker - 공격자
 * @param {Object} defender - 방어자
 * @param {Object} card - 사용한 카드
 * @param {string} attackerName - 'player' 또는 'enemy'
 * @param {Object} battleContext - 전투 컨텍스트 (special 효과용)
 */
export function applyAttack(attacker, defender, card, attackerName, battleContext = {}) {
  const hits = card.hits || 1;
  let totalDealt = 0;
  let totalTaken = 0;
  const allEvents = [];
  const allLogs = [];

  let currentAttacker = { ...attacker };
  let currentDefender = { ...defender };

  // 기본 타격 수행
  for (let i = 0; i < hits; i++) {
    const result = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext);
    currentAttacker = result.attacker;
    currentDefender = result.defender;
    totalDealt += result.damage;
    totalTaken += result.damageTaken || 0;
    allEvents.push(...result.events);
    allLogs.push(...result.logs);
  }

  // 공격 후 special 효과 처리
  const postAttackResult = processPostAttackSpecials({
    card,
    attacker: currentAttacker,
    defender: currentDefender,
    attackerName,
    damageDealt: totalDealt,
    battleContext
  });

  currentAttacker = postAttackResult.attacker;
  currentDefender = postAttackResult.defender;
  allEvents.push(...postAttackResult.events);
  allLogs.push(...postAttackResult.logs);

  // 추가 타격 처리 (repeatIfLast, repeatPerUnusedAttack 등)
  if (postAttackResult.extraHits > 0) {
    for (let i = 0; i < postAttackResult.extraHits; i++) {
      const result = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext);
      currentAttacker = result.attacker;
      currentDefender = result.defender;
      totalDealt += result.damage;
      totalTaken += result.damageTaken || 0;
      allEvents.push(...result.events);
      allLogs.push(...result.logs);
    }
  }

  return {
    attacker: currentAttacker,
    defender: currentDefender,
    dealt: totalDealt,
    taken: totalTaken,
    events: allEvents,
    logs: allLogs
  };
}

// =====================
// 통합 행동 처리
// =====================

/**
 * 전투 행동 통합 처리 (방어/공격 자동 판별)
 * @param {Object} state - 전체 전투 상태 { player, enemy, log }
 * @param {string} actor - 'player' 또는 'enemy'
 * @param {Object} card - 사용할 카드
 * @param {Object} battleContext - 전투 컨텍스트 (special 효과용)
 * @returns {Object} - { dealt, taken, events, updatedState }
 */
export function applyAction(state, actor, card, battleContext = {}) {
  const A = actor === 'player' ? state.player : state.enemy;
  const B = actor === 'player' ? state.enemy : state.player;

  let result;

  if (card.type === 'defense') {
    result = applyDefense(A, card, actor, battleContext);
    const updatedState = {
      ...state,
      [actor]: result.actor,
      log: [...state.log, result.log]
    };
    return {
      dealt: result.dealt,
      taken: result.taken,
      events: result.events,
      updatedState
    };
  }

  if (card.type === 'attack') {
    result = applyAttack(A, B, card, actor, battleContext);
    const actorKey = actor;
    const defenderKey = actor === 'player' ? 'enemy' : 'player';
    const updatedState = {
      ...state,
      [actorKey]: result.attacker,
      [defenderKey]: result.defender,
      log: [...state.log, ...result.logs]
    };
    return {
      dealt: result.dealt,
      taken: result.taken,
      events: result.events,
      updatedState
    };
  }

  // 알 수 없는 타입
  return {
    dealt: 0,
    taken: 0,
    events: [],
    updatedState: state
  };
}
