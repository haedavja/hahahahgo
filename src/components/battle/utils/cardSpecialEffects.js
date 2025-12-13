/**
 * cardSpecialEffects.js
 *
 * 카드 special 효과 처리 시스템
 * 각 카드의 special 필드에 정의된 고유 효과를 처리
 */

import { addToken } from '../../../lib/tokenUtils';

/**
 * 카드의 special 효과 존재 여부 확인
 */
export function hasSpecial(card, specialName) {
  return card?.special === specialName;
}

/**
 * 공격 전 special 효과 처리 (피해 계산 전)
 * @param {Object} params
 * @returns {Object} { modifiedCard, attacker, defender, events, logs, skipNormalDamage }
 */
export function processPreAttackSpecials({
  card,
  attacker,
  defender,
  attackerName,
  battleContext = {}
}) {
  let modifiedCard = { ...card };
  let modifiedAttacker = { ...attacker };
  let modifiedDefender = { ...defender };
  const events = [];
  const logs = [];
  let skipNormalDamage = false;

  // === ignoreBlock: 방어력 무시 ===
  if (hasSpecial(card, 'ignoreBlock')) {
    // 피해 계산 시 방어력을 무시하도록 플래그 설정
    modifiedCard._ignoreBlock = true;
  }

  // === clearAllBlock: 양측 방어력 0 ===
  if (hasSpecial(card, 'clearAllBlock')) {
    const playerBlockBefore = modifiedAttacker.block || 0;
    const enemyBlockBefore = modifiedDefender.block || 0;

    modifiedAttacker.block = 0;
    modifiedDefender.block = 0;
    modifiedDefender.def = false;
    modifiedAttacker.def = false;

    if (playerBlockBefore > 0 || enemyBlockBefore > 0) {
      const msg = `💥 ${card.name}: 양측 방어력 제거! (공격자: ${playerBlockBefore}→0, 방어자: ${enemyBlockBefore}→0)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === doubleDamageIfSolo: 유일한 공격 카드일 때 2배 피해 ===
  if (hasSpecial(card, 'doubleDamageIfSolo')) {
    const { playerAttackCards = [] } = battleContext;
    const isOnlyAttack = playerAttackCards.length === 1;

    if (isOnlyAttack) {
      modifiedCard.damage = (modifiedCard.damage || 0) * 2;
      const msg = `⚡ ${card.name}: 유일한 공격 카드! 피해 2배 (${card.damage}→${modifiedCard.damage})`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === agilityBonus: 민첩 보너스 ===
  if (hasSpecial(card, 'agilityBonus')) {
    const agility = attacker.agility || 0;
    if (agility > 0) {
      const bonusDamage = agility * 5;
      modifiedCard.damage = (modifiedCard.damage || 0) + bonusDamage;
      // speedCost 감소는 카드 선택 시점에서 처리해야 함 (타임라인 계산 전)
      const msg = `🌀 ${card.name}: 민첩 ${agility} → +${bonusDamage} 추가 피해`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  return {
    modifiedCard,
    attacker: modifiedAttacker,
    defender: modifiedDefender,
    events,
    logs,
    skipNormalDamage
  };
}

/**
 * 공격 후 special 효과 처리 (피해 적용 후)
 * @param {Object} params
 * @returns {Object} { attacker, defender, events, logs, extraHits }
 */
export function processPostAttackSpecials({
  card,
  attacker,
  defender,
  attackerName,
  damageDealt,
  battleContext = {}
}) {
  let modifiedAttacker = { ...attacker };
  let modifiedDefender = { ...defender };
  const events = [];
  const logs = [];
  let extraHits = 0;

  // === executeUnder10: 10% 미만 즉사 ===
  if (hasSpecial(card, 'executeUnder10')) {
    const maxHp = defender.maxHp || 100;
    const threshold = Math.floor(maxHp * 0.1);

    if (modifiedDefender.hp > 0 && modifiedDefender.hp < threshold) {
      const beforeHp = modifiedDefender.hp;
      modifiedDefender.hp = 0;
      const msg = `💀 ${card.name}: 즉사 발동! (체력 ${beforeHp} < ${threshold} = 최대 체력의 10%)`;
      events.push({ actor: attackerName, card: card.name, type: 'execute', msg });
      logs.push(msg);
    }
  }

  // === vulnIfNoBlock: 방어력 없으면 취약 부여 ===
  if (hasSpecial(card, 'vulnIfNoBlock')) {
    const hadNoBlock = !defender.def || (defender.block || 0) <= 0;

    if (hadNoBlock) {
      const result = addToken(modifiedDefender, 'vulnerable', 1);
      modifiedDefender.tokens = result.tokens;
      const msg = `🔻 ${card.name}: 취약 부여! (방어력 없음)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === doubleVulnIfNoBlock: 방어력 없으면 2배 취약 ===
  if (hasSpecial(card, 'doubleVulnIfNoBlock')) {
    const hadNoBlock = !defender.def || (defender.block || 0) <= 0;

    if (hadNoBlock) {
      const result = addToken(modifiedDefender, 'vulnerable', 2);
      modifiedDefender.tokens = result.tokens;
      const msg = `🔻🔻 ${card.name}: 2배 취약 부여! (방어력 없음)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === repeatIfLast: 마지막 카드면 1회 추가 타격 ===
  if (hasSpecial(card, 'repeatIfLast')) {
    const { isLastCard = false } = battleContext;

    if (isLastCard) {
      extraHits = 1;
      const msg = `🔁 ${card.name}: 마지막 카드! 1회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === repeatPerUnusedAttack: 미사용 공격 카드당 반복 ===
  if (hasSpecial(card, 'repeatPerUnusedAttack')) {
    const { unusedAttackCards = 0 } = battleContext;

    if (unusedAttackCards > 0) {
      extraHits = unusedAttackCards;
      const msg = `🔁 ${card.name}: 미사용 공격 카드 ${unusedAttackCards}장 → ${unusedAttackCards}회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === hitOnEnemyAction: 적 카드 발동 시마다 타격 (상태 토큰으로 처리) ===
  if (hasSpecial(card, 'hitOnEnemyAction')) {
    const result = addToken(modifiedAttacker, 'persistent_strike', 1);
    modifiedAttacker.tokens = result.tokens;
    modifiedAttacker._persistentStrikeDamage = card.damage || 20;
    const msg = `👊 ${card.name}: 집요한 타격 활성화! (적 행동 시마다 ${card.damage} 피해)`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === halfEnemyEther: 적 에테르 획득 절반 ===
  if (hasSpecial(card, 'halfEnemyEther')) {
    const result = addToken(modifiedDefender, 'half_ether', 1);
    modifiedDefender.tokens = result.tokens;
    const msg = `✨ ${card.name}: 이번 턴 적 에테르 획득 50% 감소!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  return {
    attacker: modifiedAttacker,
    defender: modifiedDefender,
    events,
    logs,
    extraHits
  };
}

/**
 * 타임라인 충돌 시 special 효과 처리
 * @param {Object} params
 * @returns {Object} { destroyed, events, logs }
 */
export function processCollisionSpecials({
  card,
  enemyCard,
  attackerName
}) {
  const events = [];
  const logs = [];
  let destroyed = false;

  // === destroyOnCollision: 충돌 시 적 카드 파괴 ===
  if (hasSpecial(card, 'destroyOnCollision')) {
    destroyed = true;
    const msg = `💥 ${card.name}: 충돌! ${enemyCard?.name || '적 카드'} 파괴!`;
    events.push({ actor: attackerName, card: card.name, type: 'destroy', msg });
    logs.push(msg);
  }

  return { destroyed, events, logs };
}

/**
 * 방어력 무시 여부 확인
 */
export function shouldIgnoreBlock(card) {
  return hasSpecial(card, 'ignoreBlock') || card._ignoreBlock === true;
}

/**
 * 민첩 보너스로 speedCost 감소 계산
 */
export function calculateAgilitySpeedReduction(card, player) {
  if (!hasSpecial(card, 'agilityBonus')) return 0;
  const agility = player.agility || 0;
  return agility * 3; // 민첩 1당 시간 소모 3 감소
}
