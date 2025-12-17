import { hasTrait } from '../utils/battleUtils';
import { applyTokenEffectsToCard, applyTokenEffectsOnDamage, consumeTokens } from '../../../lib/tokenEffects';
import { addToken } from '../../../lib/tokenUtils';
import {
  processPreAttackSpecials,
  processPostAttackSpecials,
  processCardCreationSpecials,
  processCardPlaySpecials,
  shouldIgnoreBlock,
  calculateGrowingDefense,
  rollCritical,
  applyCriticalDamage
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
 * @param {boolean} isCritical - 치명타 여부 (외부에서 전달)
 * @param {Object} preProcessedResult - 이미 처리된 preAttack 결과 (선택적, 다중 타격 시 재사용)
 * @returns {Object} - { attacker, defender, damage, events, logs }
 */
export function calculateSingleHit(attacker, defender, card, attackerName, battleContext = {}, isCritical = false, preProcessedResult = null) {
  // 유령카드는 토큰 효과 미적용
  const isGhost = card.isGhost === true;

  let modifiedCard, currentAttacker, currentDefender, specialEvents, specialLogs, attackerConsumedTokens;

  if (preProcessedResult) {
    // 이미 처리된 결과 사용 (다중 타격 시)
    // modifiedCard만 재사용하고, attacker/defender는 전달된 값 사용 (이전 타격 결과 반영)
    modifiedCard = preProcessedResult.modifiedCard;
    currentAttacker = { ...attacker };  // 전달된 attacker 사용 (이전 타격으로 업데이트된 상태)
    currentDefender = { ...defender };  // 전달된 defender 사용 (이전 타격으로 업데이트된 상태)
    specialEvents = [];  // 첫 타격에서 이미 로그됨
    specialLogs = [];
    attackerConsumedTokens = [];  // 토큰은 첫 타격에서만 소모
  } else {
    // 첫 타격: pre-attack special 먼저 적용 (reloadSpray 장전 등)
    const preAttackResult = processPreAttackSpecials({
      card,
      attacker,
      defender,
      attackerName,
      battleContext
    });

    // 그 다음 토큰 효과 적용 (빈탄창 체크 등) - preAttackResult.attacker의 토큰 사용
    const tokenResult = isGhost
      ? { modifiedCard: preAttackResult.modifiedCard, consumedTokens: [] }
      : applyTokenEffectsToCard(preAttackResult.modifiedCard, preAttackResult.attacker, 'attack');

    modifiedCard = tokenResult.modifiedCard;
    currentAttacker = preAttackResult.attacker;
    currentDefender = preAttackResult.defender;
    specialEvents = preAttackResult.events;
    specialLogs = preAttackResult.logs;
    attackerConsumedTokens = tokenResult.consumedTokens;
  }

  const base = modifiedCard.damage || 0;
  const strengthBonus = currentAttacker.strength || 0;
  const ghostText = isGhost ? ' [👻유령]' : '';
  const boost = currentAttacker.etherOverdriveActive ? 2 : 1;
  let dmg = (base + strengthBonus) * boost;

  // 치명타 적용 (isCritical은 외부에서 전달됨)
  if (isCritical) {
    dmg = applyCriticalDamage(dmg, true);
  }
  const critText = isCritical ? ' [💥치명타!]' : '';

  const crushMultiplier = hasTrait(card, 'crush') ? 2 : 1;
  const events = [...specialEvents];
  const logs = [...specialLogs];
  let damageDealt = 0;
  let damageTaken = 0;
  let blockDestroyed = 0;  // 파괴한 방어력 추적 (stealBlock용)

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
      blockDestroyed = effectiveDmg;  // 파괴한 방어력
      dmg = 0;

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const formula = `(방어력 ${beforeBlock} - 공격력 ${base}${boost > 1 ? '×2' : ''}${critText}${crushText} = ${remaining})`;
      const msg = `${attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 성공${critText}${ghostText} ${formula}`;

      events.push({ actor: attackerName, card: card.name, type: 'blocked', msg });
      logs.push(`${attackerName === 'player' ? '🔵' : '👾'} ${card.name}${ghostText} → ${msg}`);
    }
    // 부분 차단 + 관통
    else {
      const blocked = beforeBlock;
      const remained = Math.max(0, effectiveDmg - blocked);
      updatedDefender.block = 0;
      blockDestroyed = blocked;  // 파괴한 방어력 = 전체 방어력

      const vulnMul = (updatedDefender.vulnMult && updatedDefender.vulnMult > 1) ? updatedDefender.vulnMult : 1;
      const finalDmg = Math.floor(remained * vulnMul);
      const beforeHP = updatedDefender.hp;
      updatedDefender.hp = Math.max(0, updatedDefender.hp - finalDmg);

      const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
      const formula = `(방어력 ${blocked} - 공격력 ${base}${boost > 1 ? '×2' : ''}${critText}${crushText} = 0)`;
      const msg = `${attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 ${blocked}${critText}${ghostText} ${formula}, 관통 ${finalDmg} (체력 ${beforeHP} -> ${updatedDefender.hp})`;

      events.push({
        actor: attackerName,
        card: card.name,
        type: 'pierce',
        dmg: finalDmg,
        beforeHP,
        afterHP: updatedDefender.hp,
        msg
      });
      logs.push(`${attackerName === 'player' ? '🔵' : '👾'} ${card.name}${ghostText} → ${msg}`);

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
    const msg = `${attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 데미지 ${finalDmg}${critText}${ghostText}${boost > 1 ? ' (에테르 폭주×2)' : ''}${ignoreBlockText} (체력 ${beforeHP} -> ${updatedDefender.hp})`;

    events.push({
      actor: attackerName,
      card: card.name,
      type: 'hit',
      dmg: finalDmg,
      beforeHP,
      afterHP: updatedDefender.hp,
      msg
    });
    logs.push(`${attackerName === 'player' ? '🔵' : '👾'} ${card.name}${ghostText} → ${msg}`);

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

  // preProcessedResult 생성 (첫 타격 시에만 유효)
  const resultPreProcessed = preProcessedResult || {
    modifiedCard,
    attacker: currentAttacker,
    defender: currentDefender,
    consumedTokens: attackerConsumedTokens
  };

  return {
    attacker: updatedAttacker,
    defender: updatedDefender,
    damage: damageDealt,
    damageTaken,
    blockDestroyed,  // 파괴한 방어력 (stealBlock용)
    events,
    logs,
    preProcessedResult: resultPreProcessed
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
  let totalDealt = 0;
  let totalTaken = 0;
  let totalBlockDestroyed = 0;  // 총 파괴한 방어력 (stealBlock용)
  const allEvents = [];
  const allLogs = [];

  let currentAttacker = { ...attacker };
  let currentDefender = { ...defender };

  // 치명타 판정 (카드당 1번만 롤)
  // 플레이어는 남은 행동력 사용, 적은 자체 남은 에너지 사용 (없으면 0)
  const attackerRemainingEnergy = attackerName === 'player'
    ? (battleContext.remainingEnergy || 0)
    : (battleContext.enemyRemainingEnergy || 0);
  const isCritical = rollCritical(currentAttacker, attackerRemainingEnergy);

  // 첫 번째 타격: processPreAttackSpecials 호출하여 hits 결정
  const firstHitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, isCritical, null);
  currentAttacker = firstHitResult.attacker;
  currentDefender = firstHitResult.defender;
  totalDealt += firstHitResult.damage;
  totalTaken += firstHitResult.damageTaken || 0;
  totalBlockDestroyed += firstHitResult.blockDestroyed || 0;
  allEvents.push(...firstHitResult.events);
  allLogs.push(...firstHitResult.logs);

  // preProcessedResult 저장 (후속 타격에서 재사용)
  const preProcessedResult = firstHitResult.preProcessedResult;
  const modifiedCard = preProcessedResult?.modifiedCard || card;
  const hits = modifiedCard.hits || card.hits || 1;

  // 유령카드 여부 체크
  const isGhostCard = card.isGhost === true;
  const ghostLabel = isGhostCard ? ' [👻유령]' : '';

  // 다중 타격 시 첫 번째 타격 로그 추가 (이벤트로도 추가하여 전투 로그에 표시)
  if (hits > 1) {
    const firstHitDmg = firstHitResult.damage;
    const hitLog = `💥 ${card.name}${ghostLabel} [1/${hits}]: ${firstHitDmg} 데미지`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'hitBreakdown', msg: hitLog });
    allLogs.push(hitLog);
  }

  // 추가 타격 수행 (hits - 1번, 첫 타격은 이미 수행함)
  for (let i = 1; i < hits; i++) {
    const result = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, isCritical, preProcessedResult);
    currentAttacker = result.attacker;
    currentDefender = result.defender;
    totalDealt += result.damage;
    totalTaken += result.damageTaken || 0;
    totalBlockDestroyed += result.blockDestroyed || 0;
    allEvents.push(...result.events);
    // 각 타격별 로그 추가 (이벤트로도 추가하여 전투 로그에 표시)
    const hitLog = `💥 ${card.name}${ghostLabel} [${i + 1}/${hits}]: ${result.damage} 데미지`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'hitBreakdown', msg: hitLog });
    allLogs.push(hitLog);
  }

  // 다중 타격 총합 로그 (피해량x타격횟수 형식)
  if (hits > 1) {
    const who = attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어';
    const perHitDmg = firstHitResult.damage;
    const multiHitMsg = `${who} • 🔥 ${card.name}${ghostLabel}: ${perHitDmg}x${hits} = ${totalDealt} 데미지!`;
    allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: multiHitMsg, dmg: totalDealt });
    allLogs.push(multiHitMsg);
  }

  // 공격 후 special 효과 처리 (modifiedCard 사용 - _applyBurn 등 토큰 효과 포함)
  const postAttackResult = processPostAttackSpecials({
    card: modifiedCard,
    attacker: currentAttacker,
    defender: currentDefender,
    attackerName,
    damageDealt: totalDealt,
    battleContext: { ...battleContext, blockDestroyed: totalBlockDestroyed }
  });

  currentAttacker = postAttackResult.attacker;
  currentDefender = postAttackResult.defender;
  allEvents.push(...postAttackResult.events);
  allLogs.push(...postAttackResult.logs);

  // 추가 타격 처리 (repeatIfLast, repeatPerUnusedAttack 등)
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

  // 카드 창조 효과 처리 (플레쉬: 피해 입히면 3장의 공격 카드 창조)
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
    isCritical,  // 치명타 여부 반환 (토큰 효과용)
    createdCards: cardCreationResult.createdCards  // 창조된 카드 배열
  };
}

/**
 * 다중 타격 공격 준비 (비동기 처리용)
 * 첫 타격을 실행하고, 후속 타격에 필요한 데이터를 반환
 * @returns {Object} - { hits, isCritical, preProcessedResult, modifiedCard, firstHitResult, currentAttacker, currentDefender }
 */
export function prepareMultiHitAttack(attacker, defender, card, attackerName, battleContext = {}) {
  const currentAttacker = { ...attacker };
  const currentDefender = { ...defender };

  // 치명타 판정 (카드당 1번만 롤)
  const attackerRemainingEnergy = attackerName === 'player'
    ? (battleContext.remainingEnergy || 0)
    : (battleContext.enemyRemainingEnergy || 0);
  const isCritical = rollCritical(currentAttacker, attackerRemainingEnergy);

  // 첫 타격 실행하여 preProcessedResult 획득
  const firstHitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, isCritical, null);

  const preProcessedResult = firstHitResult.preProcessedResult;
  const modifiedCard = preProcessedResult?.modifiedCard || card;
  const hits = modifiedCard.hits || card.hits || 1;

  return {
    hits,
    isCritical,
    preProcessedResult,
    modifiedCard,
    firstHitResult,
    currentAttacker: firstHitResult.attacker,
    currentDefender: firstHitResult.defender
  };
}

/**
 * 공격 후 special 효과 처리 (외부 호출용)
 */
export function finalizeMultiHitAttack(modifiedCard, attacker, defender, attackerName, totalDealt, totalBlockDestroyed, battleContext = {}) {
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

// =====================
// 통합 행동 처리
// =====================

/**
 * 전투 행동 통합 처리 (방어/공격 자동 판별)
 * @param {Object} state - 전체 전투 상태 { player, enemy, log }
 * @param {string} actor - 'player' 또는 'enemy'
 * @param {Object} card - 사용할 카드
 * @param {Object} battleContext - 전투 컨텍스트 (special 효과용)
 * @returns {Object} - { dealt, taken, events, updatedState, cardPlaySpecials }
 */
export function applyAction(state, actor, card, battleContext = {}) {
  const A = actor === 'player' ? state.player : state.enemy;
  const B = actor === 'player' ? state.enemy : state.player;

  let result;
  let updatedActor = A;

  if (card.type === 'defense') {
    result = applyDefense(A, card, actor, battleContext);
    updatedActor = result.actor;

    // 카드 사용 시 special 효과 처리 (autoReload, mentalFocus 등)
    const cardPlayResult = processCardPlaySpecials({
      card,
      attacker: updatedActor,
      attackerName: actor,
      battleContext
    });

    // tokensToAdd 처리
    if (cardPlayResult.tokensToAdd && cardPlayResult.tokensToAdd.length > 0) {
      cardPlayResult.tokensToAdd.forEach(tokenInfo => {
        const tokenResult = addToken(updatedActor, tokenInfo.id, tokenInfo.stacks);
        updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
      });
    }

    // tokensToRemove 처리
    if (cardPlayResult.tokensToRemove && cardPlayResult.tokensToRemove.length > 0) {
      cardPlayResult.tokensToRemove.forEach(tokenInfo => {
        const tokenResult = removeToken(updatedActor, tokenInfo.id, 'permanent', tokenInfo.stacks);
        updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
      });
    }

    const updatedState = {
      ...state,
      [actor]: updatedActor,
      log: [...state.log, result.log, ...cardPlayResult.logs]
    };
    return {
      dealt: result.dealt,
      taken: result.taken,
      events: [...result.events, ...cardPlayResult.events],
      updatedState,
      cardPlaySpecials: cardPlayResult  // bonusCards, nextTurnEffects 등
    };
  }

  if (card.type === 'attack') {
    result = applyAttack(A, B, card, actor, battleContext);
    updatedActor = result.attacker;
    let updatedDefender = result.defender;

    // 카드 사용 시 special 효과 처리 (comboStyle 등)
    const cardPlayResult = processCardPlaySpecials({
      card,
      attacker: updatedActor,
      attackerName: actor,
      battleContext
    });

    // tokensToAdd 처리
    if (cardPlayResult.tokensToAdd && cardPlayResult.tokensToAdd.length > 0) {
      cardPlayResult.tokensToAdd.forEach(tokenInfo => {
        const tokenResult = addToken(updatedActor, tokenInfo.id, tokenInfo.stacks);
        updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
      });
    }

    // tokensToRemove 처리
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
      isCritical: result.isCritical,  // 치명타 여부 전달 (토큰 효과용)
      createdCards: result.createdCards || [],  // 창조된 카드 배열
      cardPlaySpecials: cardPlayResult  // bonusCards, nextTurnEffects 등
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
