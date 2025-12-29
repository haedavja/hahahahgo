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
  const queueModifications: Array<{ index: number; newSp: number }> = [];
  let blockToAdd = 0;

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

  // === 교차 특성: push_gain_block (교차 시 밀어내고 방어력 획득) ===
  if (hasCrossTrait && card.crossBonus?.type === 'push_gain_block') {
    const { queue = [], currentSp = 0, currentQIndex = 0 } = battleContext;
    const oppositeActor = attackerName === 'player' ? 'enemy' : 'player';
    const who = attackerName === 'player' ? '플레이어' : '몬스터';

    if (import.meta.env.DEV) {
      console.log('[바인딩 디버그] queue:', queue.map(q => ({ actor: q.actor, sp: q.sp, card: q.card?.name })));
      console.log('[바인딩 디버그] currentSp:', currentSp, 'currentQIndex:', currentQIndex);
    }

    // 교차된 적 카드 찾기 (인덱스도 필요)
    let overlappingIdx = -1;
    const overlappingCard = queue.find((q, idx) => {
      if (q.actor !== oppositeActor) return false;
      if (idx <= currentQIndex) return false;
      const spDiff = Math.abs((q.sp || 0) - currentSp);
      if (import.meta.env.DEV) {
        console.log('[바인딩 디버그] 검사:', { idx, actor: q.actor, sp: q.sp, spDiff });
      }
      if (spDiff < 1) {
        overlappingIdx = idx;
        return true;
      }
      return false;
    });

    if (import.meta.env.DEV) {
      console.log('[바인딩 디버그] overlappingCard:', overlappingCard?.card?.name, 'overlappingIdx:', overlappingIdx);
    }

    // 이미 실행된 교차 카드 확인 (알림용)
    if (!overlappingCard) {
      const alreadyExecutedCross = queue.find((q, idx) => {
        if (q.actor !== oppositeActor) return false;
        if (idx > currentQIndex) return false; // 아직 실행 안된 카드는 제외
        const spDiff = Math.abs((q.sp || 0) - currentSp);
        return spDiff < 1;
      });
      if (alreadyExecutedCross) {
        const msg = `${who} • 🔗 ${card.name}: 교차 카드(${alreadyExecutedCross.card?.name})가 이미 실행됨`;
        events.push({ actor: attackerName, card: card.name, type: 'special', msg });
        logs.push(msg);
      }
    }

    if (overlappingCard && overlappingIdx !== -1) {
      // 적의 다음 카드 찾기 (밀려난 카드가 다음 적 카드를 넘어가지 않도록)
      let nextEnemyCardSp = Infinity;
      for (let i = overlappingIdx + 1; i < queue.length; i++) {
        if (queue[i]?.actor === oppositeActor) {
          nextEnemyCardSp = queue[i].sp || Infinity;
          if (import.meta.env.DEV) {
            console.log('[바인딩 디버그] 다음 적 카드 발견! idx:', i, 'sp:', nextEnemyCardSp);
          }
          break;
        }
      }

      const overlappedSp = overlappingCard.sp || 0;
      const maxPush = card.crossBonus.maxPush || 8;

      // 다음 적 카드 너머까지 밀어내기 (최대 maxPush)
      const distanceToNext = nextEnemyCardSp - overlappedSp;
      // 다음 카드를 넘어가도록 +0.01 (다음 카드가 없으면 maxPush)
      const rawPush = distanceToNext < Infinity ? Math.ceil(distanceToNext + 0.01) : maxPush;
      const pushAmount = Math.min(Math.max(0, rawPush), maxPush);

      if (import.meta.env.DEV) {
        console.log('[바인딩 디버그] nextEnemyCardSp:', nextEnemyCardSp, 'overlappedSp:', overlappedSp, 'distanceToNext:', distanceToNext, 'pushAmount:', pushAmount);
      }

      if (pushAmount > 0) {
        // 밀어내기 정보 추가 (호출하는 쪽에서 적용)
        queueModifications.push({ index: overlappingIdx, newSp: overlappedSp + pushAmount });
        // 밀어낸 만큼 방어력 획득
        blockToAdd += pushAmount;
        const enemyCardName = overlappingCard.card?.name || '적 카드';
        const msg = `${who} • 🔗 ${card.name}: 교차! ${enemyCardName}를 ${pushAmount}만큼 밀어내고 방어력 +${pushAmount}`;
        events.push({ actor: attackerName, card: card.name, type: 'cross', msg });
        logs.push(msg);
        if (import.meta.env.DEV) {
          console.log('[바인딩 디버그] 효과 적용! blockToAdd:', blockToAdd, 'queueMods:', queueModifications);
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('[바인딩 디버그] pushAmount가 0이라 효과 미적용');
        }
      }
    }
  }

  // === 후속/마무리 특성 처리 ===
  const hasFollowupTrait = card.traits && card.traits.includes('followup');
  const hasFinisherTrait = card.traits && card.traits.includes('finisher');
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

      if (hasFollowupTrait && prevHasChain) {
        const bonusMessages: string[] = [];

        if (modifiedCard.damage) {
          const originalDamage = modifiedCard.damage;
          modifiedCard.damage = Math.ceil(originalDamage * 1.5);
          bonusMessages.push(`피해 ${originalDamage}→${modifiedCard.damage}`);
        }

        if (modifiedCard.block) {
          const originalBlock = modifiedCard.block;
          modifiedCard.block = Math.ceil(originalBlock * 1.5);
          bonusMessages.push(`방어 ${originalBlock}→${modifiedCard.block}`);
        }

        if (bonusMessages.length > 0) {
          const msg = `${who} • ⚡ ${card.name}: 후속! 50% 증가 (${bonusMessages.join(', ')})`;
          events.push({ actor: attackerName, card: card.name, type: 'special', msg });
          logs.push(msg);
        }
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
    const baseHits = modifiedCard.hits || card.hits || 3;
    const bonusHits = finesseStacks * 3;
    modifiedCard.hits = baseHits + bonusHits;

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

  // 방어력 추가 적용
  if (blockToAdd > 0) {
    modifiedAttacker.block = (modifiedAttacker.block || 0) + blockToAdd;
  }

  return {
    modifiedCard,
    attacker: modifiedAttacker,
    defender: modifiedDefender,
    events,
    logs,
    skipNormalDamage,
    queueModifications: queueModifications.length > 0 ? queueModifications : undefined
  };
}
