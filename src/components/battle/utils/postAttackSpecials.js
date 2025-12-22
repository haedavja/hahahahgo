/**
 * postAttackSpecials.js
 *
 * 공격 후 special 효과 처리 (피해 적용 후)
 * cardSpecialEffects.js에서 분리됨
 */

import { addToken, removeToken, setTokenStacks } from '../../../lib/tokenUtils';
import { hasSpecial } from './preAttackSpecials';

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
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const target = attackerName === 'player' ? '몬스터' : '플레이어';
      const hpBeforeDmg = beforeHp + damageDealt;
      const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBeforeDmg} -> ${beforeHp}),` : '';
      const msg = `${who} -> ${target} •${dmgInfo} 💀 ${card.name}: 즉사 발동! (체력 ${beforeHp} < ${threshold})`;
      events.push({ actor: attackerName, card: card.name, type: 'execute', msg });
      logs.push(msg);
    }
  }

  // === vulnIfNoBlock: 방어력 없으면 취약 부여 ===
  if (hasSpecial(card, 'vulnIfNoBlock')) {
    const hadNoBlock = !defender.def || (defender.block || 0) <= 0;

    if (hadNoBlock) {
      const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
      const result = addToken(modifiedDefender, 'vulnerable', 1, grantedAt);
      modifiedDefender.tokens = result.tokens;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const target = attackerName === 'player' ? '몬스터' : '플레이어';
      const hpBefore = modifiedDefender.hp + damageDealt;
      const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
      const msg = `${who} -> ${target} •${dmgInfo} 🔻 ${card.name}: 취약 부여! (방어력 없음)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === doubleVulnIfNoBlock: 방어력 없으면 2배 취약 ===
  if (hasSpecial(card, 'doubleVulnIfNoBlock')) {
    const hadNoBlock = !defender.def || (defender.block || 0) <= 0;

    if (hadNoBlock) {
      const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
      const result = addToken(modifiedDefender, 'vulnerable', 2, grantedAt);
      modifiedDefender.tokens = result.tokens;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const target = attackerName === 'player' ? '몬스터' : '플레이어';
      const hpBefore = modifiedDefender.hp + damageDealt;
      const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
      const msg = `${who} -> ${target} •${dmgInfo} 🔻🔻 ${card.name}: 2배 취약 부여! (방어력 없음)`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === repeatIfLast: 마지막 카드면 1회 추가 타격 ===
  if (hasSpecial(card, 'repeatIfLast')) {
    const { isLastCard = false } = battleContext;

    if (isLastCard) {
      extraHits = 1;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔁 ${card.name}: 마지막 카드! 1회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === repeatPerUnusedAttack: 미사용 공격 카드당 반복 ===
  if (hasSpecial(card, 'repeatPerUnusedAttack')) {
    const { unusedAttackCards = 0 } = battleContext;

    if (unusedAttackCards > 0) {
      extraHits = unusedAttackCards;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔁 ${card.name}: 미사용 공격 카드 ${unusedAttackCards}장 → ${unusedAttackCards}회 추가 타격`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === hitOnEnemyAction: 적 카드 발동 시마다 타격 ===
  if (hasSpecial(card, 'hitOnEnemyAction')) {
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
    const result = addToken(modifiedAttacker, 'persistent_strike', 1, grantedAt);
    modifiedAttacker.tokens = result.tokens;
    modifiedAttacker._persistentStrikeDamage = card.damage || 20;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} 👊 ${card.name}: 집요한 타격 활성화! (적 행동 시마다 ${card.damage} 피해)`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === halfEnemyEther: 적 에테르 획득 절반 ===
  if (hasSpecial(card, 'halfEnemyEther')) {
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
    const result = addToken(modifiedDefender, 'half_ether', 1, grantedAt);
    modifiedDefender.tokens = result.tokens;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} ✨ ${card.name}: 이번 턴 적 에테르 획득 50% 감소!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === emptyAfterUse: 사용 후 탄걸림 ===
  if (hasSpecial(card, 'emptyAfterUse') || card._addGunJam) {
    const result = addToken(modifiedAttacker, 'gun_jam', 1);
    modifiedAttacker.tokens = result.tokens;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} 🔫 ${card.name}: 사용 후 탄걸림!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === reloadSpray: 장전 후 사격, 사용 후 탄걸림 ===
  if (hasSpecial(card, 'reloadSpray')) {
    const result = addToken(modifiedAttacker, 'gun_jam', 1);
    modifiedAttacker.tokens = result.tokens;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';
    const hpBefore = modifiedDefender.hp + damageDealt;
    const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
    const msg = `${who} -> ${target} •${dmgInfo} 🔫 ${card.name}: 난사 후 탄걸림!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === _applyBurn: 소이탄 토큰 효과 - 화상 부여 ===
  if (card._applyBurn) {
    const hits = card.hits || 1;
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
    const result = addToken(modifiedDefender, 'burn', hits, grantedAt);
    modifiedDefender.tokens = result.tokens;
    const msg = hits > 1
      ? `🔥 소이탄: 화상 ${hits}스택 부여!`
      : `🔥 소이탄: 화상 부여!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === stealBlock: 파괴한 방어력 획득 ===
  if (hasSpecial(card, 'stealBlock')) {
    const { blockDestroyed = 0 } = battleContext;
    if (blockDestroyed > 0) {
      modifiedAttacker.block = (modifiedAttacker.block || 0) + blockDestroyed;
      modifiedAttacker.def = true;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const target = attackerName === 'player' ? '몬스터' : '플레이어';
      const hpBefore = modifiedDefender.hp + damageDealt;
      const dmgInfo = damageDealt > 0 ? ` 데미지 ${damageDealt} (체력 ${hpBefore} -> ${modifiedDefender.hp}),` : '';
      const msg = `${who} -> ${target} •${dmgInfo} 🛡️ ${card.name}: 방어력 ${blockDestroyed} 탈취!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === critLoad: 치명타 시 장전 (탄걸림 해제 + 룰렛 초기화) ===
  if (hasSpecial(card, 'critLoad')) {
    const { isCritical = false } = battleContext;
    if (isCritical) {
      const removeJamResult = removeToken(modifiedAttacker, 'gun_jam', 'permanent', 99);
      modifiedAttacker = { ...modifiedAttacker, tokens: removeJamResult.tokens };
      const resetRouletteResult = setTokenStacks(modifiedAttacker, 'roulette', 'permanent', 0);
      modifiedAttacker = { ...modifiedAttacker, tokens: resetRouletteResult.tokens };

      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 💥 ${card.name}: 치명타! 장전 완료!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === interceptTokens: 요격 - 무딤+ 부여, 치명타시 흔들림+ 추가 ===
  if (hasSpecial(card, 'interceptTokens')) {
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const target = attackerName === 'player' ? '몬스터' : '플레이어';

    const dullResult = addToken(modifiedDefender, 'dullPlus', 1, grantedAt);
    modifiedDefender = { ...modifiedDefender, tokens: dullResult.tokens };
    const dullMsg = `${who} -> ${target} • 🔻 ${card.name}: 무딤+ 부여!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg: dullMsg });
    logs.push(dullMsg);

    const { isCritical = false } = battleContext;
    if (isCritical) {
      const shakenResult = addToken(modifiedDefender, 'shakenPlus', 1, grantedAt);
      modifiedDefender = { ...modifiedDefender, tokens: shakenResult.tokens };
      const shakenMsg = `${who} -> ${target} • 💥 ${card.name}: 치명타! 흔들림+ 추가!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg: shakenMsg });
      logs.push(shakenMsg);
    }
  }

  return {
    attacker: modifiedAttacker,
    defender: modifiedDefender,
    events,
    logs,
    extraHits
  };
}
