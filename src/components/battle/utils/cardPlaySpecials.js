/**
 * @file cardPlaySpecials.js
 * @description 카드 사용 시 special 효과 처리
 * @typedef {import('../../../types').Card} Card
 *
 * cardSpecialEffects.js에서 분리됨
 *
 * ## 처리되는 효과
 * - comboStyle: 조합 스타일 보너스
 * - autoReload: 자동 장전
 * - mentalFocus: 정신 집중
 * - drawCard: 카드 드로우
 */

import { getAllTokens, getTokenStacks } from '../../../lib/tokenUtils';
import { TOKENS, TOKEN_CATEGORIES } from '../../../data/tokens';
import { hasSpecial } from './preAttackSpecials';

/**
 * 토큰 존재 여부 확인
 */
function hasToken(entity, tokenId) {
  return getTokenStacks(entity, tokenId) > 0;
}

/**
 * 카드 사용 시 special 효과 처리
 * @param {Object} params
 * @returns {Object} { bonusCards, tokensToAdd, tokensToRemove, nextTurnEffects, events, logs }
 */
export function processCardPlaySpecials({
  card,
  attacker,
  attackerName,
  battleContext = {}
}) {
  const events = [];
  const logs = [];
  const bonusCards = [];
  const tokensToAdd = [];
  const tokensToRemove = [];
  let nextTurnEffects = null;

  const { hand = [], allCards = [] } = battleContext;

  // === 교차 특성: 타임라인에서 적 카드와 겹치면 보너스 효과 ===
  const hasCrossTrait = card.traits && card.traits.includes('cross');
  if (hasCrossTrait && card.crossBonus) {
    const { queue = [], currentSp = 0, currentQIndex = 0 } = battleContext;
    const oppositeActor = attackerName === 'player' ? 'enemy' : 'player';

    const isOverlapping = queue.some((q, idx) => {
      if (q.actor !== oppositeActor) return false;
      if (idx <= currentQIndex) return false;
      const spDiff = Math.abs((q.sp || 0) - currentSp);
      return spDiff < 1;
    });

    if (isOverlapping) {
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const { type: bonusType, count = 1 } = card.crossBonus;

      if (bonusType === 'gun_attack') {
        const basicShoot = allCards.find(c => c.id === 'shoot');
        if (basicShoot) {
          for (let i = 0; i < count; i++) {
            bonusCards.push({
              ...basicShoot,
              damage: basicShoot.damage,
              block: basicShoot.block,
              hits: basicShoot.hits,
              speedCost: basicShoot.speedCost,
              actionCost: basicShoot.actionCost,
              type: basicShoot.type,
              cardCategory: basicShoot.cardCategory,
              special: basicShoot.special,
              traits: basicShoot.traits,
              isGhost: true,
              createdBy: card.id,
              createdId: `${basicShoot.id}_cross_${Date.now()}_${i}`
            });
            const msg = `${who} • ✨ ${card.name}: 교차! "${basicShoot.name}" 사격 추가!`;
            events.push({ actor: attackerName, card: card.name, type: 'cross', msg });
            logs.push(msg);
          }
        }
      } else if (bonusType === 'add_tokens') {
        const tokens = card.crossBonus.tokens || [];
        tokens.forEach(tokenInfo => {
          const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
          if (tokenInfo.target === 'enemy') {
            tokensToAdd.push({ id: tokenInfo.id, stacks: tokenInfo.stacks || 1, grantedAt, targetEnemy: true });
          } else {
            tokensToAdd.push({ id: tokenInfo.id, stacks: tokenInfo.stacks || 1, grantedAt });
          }
          const msg = `${who} • ✨ ${card.name}: 교차! ${tokenInfo.id} 토큰 추가!`;
          events.push({ actor: attackerName, card: card.name, type: 'cross', msg });
          logs.push(msg);
        });
      } else if (bonusType === 'intercept_upgrade') {
        const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
        tokensToRemove.push({ id: 'dullPlus', stacks: 1, targetEnemy: true });
        tokensToAdd.push({ id: 'dullnessPlus', stacks: 1, grantedAt, targetEnemy: true });
        tokensToRemove.push({ id: 'shakenPlus', stacks: 1, targetEnemy: true });
        tokensToAdd.push({ id: 'vulnerablePlus', stacks: 1, grantedAt, targetEnemy: true });
        const msg = `${who} • ✨ ${card.name}: 교차! 무딤+→부러짐+, 흔들림+→무방비+ 강화!`;
        events.push({ actor: attackerName, card: card.name, type: 'cross', msg });
        logs.push(msg);
      } else if (bonusType === 'destroy_card') {
        nextTurnEffects = { ...nextTurnEffects, destroyOverlappingCard: true };
        const msg = `${who} • ⚡ ${card.name}: 교차! 적 카드 파괴!`;
        events.push({ actor: attackerName, card: card.name, type: 'cross', msg });
        logs.push(msg);
      } else if (bonusType === 'guaranteed_crit') {
        nextTurnEffects = { ...nextTurnEffects, guaranteedCrit: true };
        const msg = `${who} • 💥 ${card.name}: 교차! 확정 치명타!`;
        events.push({ actor: attackerName, card: card.name, type: 'cross', msg });
        logs.push(msg);
      }
    }
  }

  // === autoReload: 손패에 장전 카드가 있으면 자동 장전 ===
  if (hasSpecial(card, 'autoReload')) {
    const hasReloadCard = hand.some(c => c.id === 'reload' || c.id === 'ap_load' || c.id === 'incendiary_load');
    if (hasReloadCard) {
      tokensToAdd.push({ id: 'loaded', stacks: 1 });
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔄 ${card.name}: 손패에 장전 카드 감지! 자동 장전!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === mentalFocus: 정신집중 토큰 부여 ===
  if (hasSpecial(card, 'mentalFocus')) {
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
    tokensToAdd.push({ id: 'focus', stacks: 1, grantedAt });
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • 🧘 ${card.name}: 정신집중!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === recallCard: 함성 ===
  if (hasSpecial(card, 'recallCard')) {
    nextTurnEffects = { ...nextTurnEffects, recallCard: true };
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • 📢 ${card.name}: 다음 턴에 대기 카드 1장을 손패로!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === emergencyDraw: 비상대응 ===
  if (hasSpecial(card, 'emergencyDraw')) {
    const { handSize = 0 } = battleContext;
    if (handSize <= 6) {
      nextTurnEffects = { ...nextTurnEffects, emergencyDraw: 3 };
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🚨 ${card.name}: 비상! 대기 카드 3장 즉시 뽑기!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    } else {
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • ❌ ${card.name}: 손패가 6장 초과! 효과 없음`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === stance: 스탠스 ===
  if (hasSpecial(card, 'stance')) {
    const { queue = [], currentQIndex = 0 } = battleContext;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;

    let previousCard = null;
    for (let i = currentQIndex - 1; i >= 0; i--) {
      if (queue[i]?.actor === attackerName) {
        previousCard = queue[i].card;
        break;
      }
    }

    if (previousCard) {
      if (previousCard.cardCategory === 'gun') {
        tokensToAdd.push({ id: 'offense', stacks: 1, grantedAt });
        const msg = `${who} • ⚔️ ${card.name}: 이전 총격! 공세 획득!`;
        events.push({ actor: attackerName, card: card.name, type: 'special', msg });
        logs.push(msg);
      } else if (previousCard.cardCategory === 'fencing') {
        tokensToAdd.push({ id: 'loaded', stacks: 1, grantedAt });
        const msg = `${who} • 🔫 ${card.name}: 이전 검격! 장전 획득!`;
        events.push({ actor: attackerName, card: card.name, type: 'special', msg });
        logs.push(msg);
      }
    }

    const attackerTokens = getAllTokens(attacker);
    const negativeTokens = attackerTokens.filter(t => {
      const tokenDef = TOKENS[t.id];
      return tokenDef && tokenDef.category === TOKEN_CATEGORIES.NEGATIVE;
    });

    if (negativeTokens.length > 0) {
      negativeTokens.forEach(t => {
        tokensToRemove.push({ id: t.id, stacks: t.stacks || 1 });
      });
      const removedNames = negativeTokens.map(t => TOKENS[t.id]?.name || t.id).join(', ');
      const msg2 = `${who} • ✨ ${card.name}: 부정적 토큰 제거! (${removedNames})`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg: msg2 });
      logs.push(msg2);
    } else {
      const msg2 = `${who} • ✨ ${card.name}: 제거할 부정적 토큰 없음`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg: msg2 });
      logs.push(msg2);
    }
  }

  // === elRapide: 민첩 +2, 아픔 1회 (기교 1 소모시 생략) ===
  if (hasSpecial(card, 'elRapide')) {
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;

    const hasFinesseToken = hasToken(attacker, 'finesse');
    const finesseStacks = getTokenStacks(attacker, 'finesse');

    if (hasFinesseToken && finesseStacks >= 1) {
      tokensToRemove.push({ id: 'finesse', stacks: 1 });
      const msg = `${who} • ✨ ${card.name}: 기교 1 소모! 아픔 생략, 민첩 +2`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    } else {
      tokensToAdd.push({ id: 'pain', stacks: 1, grantedAt });
      const msg = `${who} • 💢 ${card.name}: 아픔 1 획득, 민첩 +2`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }

    tokensToAdd.push({ id: 'agility', stacks: 2, grantedAt });
  }

  // === manipulation: 탄걸림이면 장전, 아니면 사격 ===
  if (hasSpecial(card, 'manipulation')) {
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const hasJam = getTokenStacks(attacker, 'gun_jam') > 0;

    if (hasJam) {
      tokensToRemove.push({ id: 'gun_jam', stacks: 99 });
      const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
      tokensToAdd.push({ id: 'loaded', stacks: 1, grantedAt });
      const msg = `${who} • 🔧 ${card.name}: 탄걸림 해제! 장전!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    } else {
      const basicShoot = allCards.find(c => c.id === 'shoot');
      if (basicShoot) {
        bonusCards.push({
          ...basicShoot,
          damage: basicShoot.damage,
          speedCost: 0,
          actionCost: 0,
          isGhost: true,
          createdBy: card.id,
          createdId: `${basicShoot.id}_manip_${Date.now()}`
        });
        const msg = `${who} • 🔫 ${card.name}: 사격!`;
        events.push({ actor: attackerName, card: card.name, type: 'special', msg });
        logs.push(msg);
      }
    }
  }

  // === spreadShot: 적의 수만큼 사격 ===
  if (hasSpecial(card, 'spreadShot')) {
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const { enemyUnits = [] } = battleContext;
    const aliveUnits = enemyUnits.filter(u => u.hp > 0);
    const enemyCount = Math.max(1, aliveUnits.length);

    const basicShoot = allCards.find(c => c.id === 'shoot');
    if (basicShoot) {
      for (let i = 0; i < enemyCount; i++) {
        bonusCards.push({
          ...basicShoot,
          damage: basicShoot.damage,
          speedCost: 0,
          actionCost: 0,
          isGhost: true,
          createdBy: card.id,
          createdId: `${basicShoot.id}_spread_${Date.now()}_${i}`,
          __targetUnitId: aliveUnits[i]?.unitId ?? 0
        });
      }
      const msg = `${who} • 🔫 ${card.name}: ${enemyCount}회 스프레드 사격!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === executionSquad: 장전 + 탄걸림 면역 + 총격카드 4장 창조 ===
  if (hasSpecial(card, 'executionSquad')) {
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;

    tokensToAdd.push({ id: 'loaded', stacks: 1, grantedAt });
    tokensToAdd.push({ id: 'jam_immune', stacks: 1, grantedAt });

    const basicShoot = allCards.find(c => c.id === 'shoot');
    if (basicShoot) {
      for (let i = 0; i < 4; i++) {
        bonusCards.push({
          ...basicShoot,
          damage: basicShoot.damage,
          speedCost: 1,
          actionCost: 0,
          isGhost: true,
          createdBy: card.id,
          createdId: `${basicShoot.id}_exec_${Date.now()}_${i}`
        });
      }
      const msg = `${who} • 🔫 ${card.name}: 총살! 장전 + 탄걸림 면역 + 사격 4장 창조!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === sharpenBlade: 이번 전투 모든 검격 카드 공격력 +3 ===
  if (hasSpecial(card, 'sharpenBlade')) {
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    nextTurnEffects = { ...nextTurnEffects, fencingDamageBonus: 3 };
    const msg = `${who} • ⚔️ ${card.name}: 날 세우기! 이번 전투 모든 검격 공격력 +3!`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === evasiveShot: 사격 1회 ===
  if (hasSpecial(card, 'evasiveShot')) {
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const basicShoot = allCards.find(c => c.id === 'shoot');
    if (basicShoot) {
      bonusCards.push({
        ...basicShoot,
        damage: basicShoot.damage,
        speedCost: 0,
        actionCost: 0,
        isGhost: true,
        createdBy: card.id,
        createdId: `${basicShoot.id}_evasive_${Date.now()}`
      });
      const msg = `${who} • 🔫 ${card.name}: 회피 사격!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === createFencingCards3: 검격 카드 3x3 창조 ===
  if (hasSpecial(card, 'createFencingCards3')) {
    nextTurnEffects = { ...nextTurnEffects, triggerCreation3x3: true, creationIsAoe: true };
  }

  // === aoeAttack 플래그 설정 ===
  if (hasSpecial(card, 'aoeAttack')) {
    nextTurnEffects = { ...nextTurnEffects, isAoeAttack: true };
  }

  return { bonusCards, tokensToAdd, tokensToRemove, nextTurnEffects, events, logs };
}
