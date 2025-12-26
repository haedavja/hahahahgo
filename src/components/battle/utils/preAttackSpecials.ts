/**
 * @file preAttackSpecials.ts
 * @description 공격 전 special 효과 처리 (피해 계산 전)
 *
 * ## 처리되는 효과
 * - ignoreBlock: 방어력 무시
 * - pierce: 관통 피해
 * - lifesteal: 흡혈
 * - multiShot: 다중 사격
 */

import type {
  SpecialCard,
  SpecialActor,
  SpecialQueueItem,
  SpecialBattleContext,
  SpecialEvent,
  PreAttackResult
} from '../../../types';
import { addToken, removeToken, setTokenStacks, getTokenStacks } from '../../../lib/tokenUtils';

/**
 * 카드의 special 효과 존재 여부 확인 (배열 지원)
 */
export function hasSpecial(card: SpecialCard | null | undefined, specialName: string): boolean {
  if (!card?.special) return false;
  if (Array.isArray(card.special)) {
    return card.special.includes(specialName);
  }
  return card.special === specialName;
}

/**
 * 공격 전 special 효과 처리 (피해 계산 전)
 */
export function processPreAttackSpecials({
  card,
  attacker,
  defender,
  attackerName,
  battleContext = {}
}: {
  card: SpecialCard;
  attacker: SpecialActor;
  defender: SpecialActor;
  attackerName: 'player' | 'enemy';
  battleContext?: SpecialBattleContext;
}): PreAttackResult {
  let modifiedCard: SpecialCard = { ...card };
  let modifiedAttacker: SpecialActor = { ...attacker };
  let modifiedDefender: SpecialActor = { ...defender };
  const events: SpecialEvent[] = [];
  const logs: string[] = [];
  const skipNormalDamage = false;

  // === ignoreBlock: 방어력 무시 ===
  if (hasSpecial(card, 'ignoreBlock')) {
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
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 💥 ${card.name}: 양측 방어력 제거! (공격자: ${playerBlockBefore}→0, 방어자: ${enemyBlockBefore}→0)`;
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
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • ⚡ ${card.name}: 유일한 공격 카드! 피해 2배 (${card.damage}→${modifiedCard.damage})`;
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
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🌀 ${card.name}: 민첩 ${agility} → +${bonusDamage} 추가 피해`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === 교차 특성: 타임라인 겹침 시 피해 배율 적용 ===
  const hasCrossTrait = card.traits && card.traits.includes('cross');
  if (hasCrossTrait && card.crossBonus?.type === 'damage_mult') {
    const { queue = [], currentSp = 0, currentQIndex = 0 } = battleContext;
    const oppositeActor = attackerName === 'player' ? 'enemy' : 'player';

    const isOverlapping = queue.some((q, idx) => {
      if (q.actor !== oppositeActor) return false;
      if (idx <= currentQIndex) return false;
      const spDiff = Math.abs((q.sp || 0) - currentSp);
      return spDiff < 1;
    });

    if (isOverlapping) {
      const multiplier = card.crossBonus.value || 2;
      const originalDamage = modifiedCard.damage || 0;
      modifiedCard.damage = originalDamage * multiplier;
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • ✨ ${card.name}: 교차! 피해 ${multiplier}배 (${originalDamage}→${modifiedCard.damage})`;
      events.push({ actor: attackerName, card: card.name, type: 'cross', msg });
      logs.push(msg);
    }
  }

  // === 후속/마무리 특성 처리 ===
  const hasFollowupTrait = card.traits && card.traits.includes('followup' as any);
  const hasFinisherTrait = card.traits && card.traits.includes('finisher' as any);
  if (hasFollowupTrait || hasFinisherTrait) {
    const { queue = [], currentQIndex = 0 } = battleContext;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';

    let previousCard: any = null;
    for (let i = currentQIndex - 1; i >= 0; i--) {
      if (queue[i]?.actor === attackerName) {
        previousCard = queue[i].card || null;
        break;
      }
    }

    if (previousCard) {
      const prevHasChain = previousCard.traits && previousCard.traits.includes('chain');
      const prevHasFollowup = previousCard.traits && previousCard.traits.includes('followup');

      if (hasFollowupTrait && prevHasChain && modifiedCard.damage) {
        const originalDamage = modifiedCard.damage;
        modifiedCard.damage = Math.ceil(originalDamage * 1.5);
        const msg = `${who} • ⚡ ${card.name}: 후속! 피해 50% 증가 (${originalDamage}→${modifiedCard.damage})`;
        events.push({ actor: attackerName, card: card.name, type: 'special', msg });
        logs.push(msg);
      }

      if (hasFinisherTrait) {
        if (prevHasChain && modifiedCard.damage) {
          const originalDamage = modifiedCard.damage;
          modifiedCard.damage = Math.ceil(originalDamage * 1.5);
          const msg = `${who} • ⚡ ${card.name}: 마무리(연계)! 피해 50% 증가 (${originalDamage}→${modifiedCard.damage})`;
          events.push({ actor: attackerName, card: card.name, type: 'special', msg });
          logs.push(msg);
        }
        if (prevHasFollowup) {
          const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
          const finesseResult = addToken(modifiedAttacker, 'finesse', 1, grantedAt);
          modifiedAttacker.tokens = finesseResult.tokens;
          const msg = `${who} • ✨ ${card.name}: 마무리(후속)! 기교 획득!`;
          events.push({ actor: attackerName, card: card.name, type: 'special', msg });
          logs.push(msg);
        }
      }
    }
  }

  // === reloadSpray: 장전 후 사격 (탄걸림 제거 + 룰렛 초기화) ===
  if (hasSpecial(card, 'reloadSpray')) {
    const result = removeToken(modifiedAttacker, 'gun_jam', 'permanent', 99);
    modifiedAttacker.tokens = result.tokens;
    const rouletteResult = setTokenStacks(modifiedAttacker, 'roulette', 'permanent', 0);
    modifiedAttacker.tokens = rouletteResult.tokens;
    if (result.logs.length > 0) {
      const who = attackerName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • 🔫 ${card.name}: 장전! 탄걸림 해제!`;
      events.push({ actor: attackerName, card: card.name, type: 'special', msg });
      logs.push(msg);
    }
  }

  // === gyrusRoulette: 행동력 1당 50% 확률로 2회 타격 ===
  if (hasSpecial(card, 'gyrusRoulette')) {
    const remainingEnergy = battleContext.remainingEnergy || 0;
    let hits = 0;
    let bonusCount = 0;
    for (let i = 0; i < remainingEnergy; i++) {
      if (Math.random() < 0.5) {
        hits += 2;
        bonusCount++;
      } else {
        hits += 1;
      }
    }
    hits = Math.max(1, hits);
    modifiedCard.hits = hits;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • 🎰 ${card.name}: 행동력 ${remainingEnergy} → ${hits}회 사격! (🎲 보너스 ${bonusCount}회)`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
  }

  // === tempeteDechainee: 기교 스택 x3만큼 추가 타격 후 기교 모두 소모 ===
  if (hasSpecial(card, 'tempeteDechainee')) {
    const finesseStacks = getTokenStacks(modifiedAttacker, 'finesse');
    const baseHits = (modifiedCard as any).hits || (card as any).hits || 3;
    const bonusHits = (finesseStacks as any) * 3;
    (modifiedCard as any).hits = baseHits + bonusHits;

    if (finesseStacks > 0) {
      const result = removeToken(modifiedAttacker, 'finesse', 'permanent', finesseStacks);
      modifiedAttacker.tokens = result.tokens;
    }

    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = bonusHits > 0
      ? `${who} • ⚔️ ${card.name}: 기교 ${finesseStacks} → +${bonusHits}회 추가! (총 ${modifiedCard.hits}회)`
      : `${who} • ⚔️ ${card.name}: ${baseHits}회 타격`;
    events.push({ actor: attackerName, card: card.name, type: 'special', msg });
    logs.push(msg);
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
