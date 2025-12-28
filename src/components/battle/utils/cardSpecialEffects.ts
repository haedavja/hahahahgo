/**
 * @file cardSpecialEffects.ts
 * @description 카드 special 효과 처리 시스템
 *
 * 각 카드의 special 필드에 정의된 고유 효과를 처리
 *
 * ## 효과 처리 시점
 * - preAttackSpecials: 공격 피해 계산 전
 * - postAttackSpecials: 공격 피해 적용 후
 * - cardPlaySpecials: 카드 사용 시 (공격/방어 무관)
 *
 * 분리된 모듈:
 * - preAttackSpecials.ts: 공격 전 효과
 * - postAttackSpecials.ts: 공격 후 효과
 * - cardPlaySpecials.ts: 카드 사용 시 효과
 */

import type {
  Card,
  SpecialCard,
  SpecialActor,
  SpecialQueueItem,
  SpecialEvent,
  RouletteResult,
  CollisionResult,
  TimelineChanges,
  TimelineResult,
  CardCreationResult,
  TokensContainer
} from '../../../types';
import { addToken, setTokenStacks } from '../../../lib/tokenUtils';
import { shuffle } from '../../../lib/randomUtils';

// 분리된 모듈에서 re-export
export { hasSpecial, processPreAttackSpecials } from './preAttackSpecials';
export { processPostAttackSpecials } from './postAttackSpecials';
export { processCardPlaySpecials } from './cardPlaySpecials';

// 치명타 시스템 re-export
export {
  calculateCritChance,
  rollCritical,
  getCritKnockback,
  applyCriticalDamage,
  applyCriticalStacks
} from './criticalEffects';

// hasSpecial 로컬 참조 (내부 사용용)
import { hasSpecial } from './preAttackSpecials';

/**
 * 타격별 룰렛 체크 (총기 카드 전용)
 */
export function processPerHitRoulette(
  attacker: SpecialActor,
  card: SpecialCard,
  attackerName: 'player' | 'enemy',
  hitIndex: number,
  totalHits: number
): RouletteResult {
  if (card.cardCategory !== 'gun' || card.type !== 'attack') {
    return { jammed: false, updatedAttacker: attacker, event: null, log: null };
  }

  const hasSingleRoulette = hasSpecial(card, 'singleRoulette');
  if (hasSingleRoulette && hitIndex > 0) {
    return { jammed: false, updatedAttacker: attacker, event: null, log: null };
  }

  let updatedAttacker: SpecialActor = { ...attacker };
  const attackerTokens = (updatedAttacker.tokens || { usage: [], turn: [], permanent: [] }) as TokensContainer;
  const allAttackerTokens = [...(attackerTokens.usage || []), ...(attackerTokens.turn || []), ...(attackerTokens.permanent || [])];
  const rouletteToken = allAttackerTokens.find(t => t.id === 'roulette');
  const currentRouletteStacks = rouletteToken?.stacks || 0;
  const jamChance = currentRouletteStacks * 0.05;

  const who = attackerName === 'player' ? '플레이어' : '몬스터';
  const hitLabel = totalHits > 1 && !hasSingleRoulette ? ` [${hitIndex + 1}/${totalHits}]` : '';

  // 탄걸림 면역 체크
  const jamImmunityToken = allAttackerTokens.find(t => t.id === 'jam_immunity');
  const hasJamImmunity = jamImmunityToken && (jamImmunityToken.stacks || 0) > 0;

  if (currentRouletteStacks > 0 && Math.random() < jamChance) {
    if (hasJamImmunity) {
      // 면역으로 탄걸림 무효화
      const msg = `${who} • 🎰 ${card.name}${hitLabel}: 탄걸림 발생했으나 ♾️ 무제한 탄창으로 무효화!`;
      return {
        jammed: false,
        updatedAttacker,
        event: { actor: attackerName, card: card.name, type: 'roulette', msg },
        log: msg
      };
    }

    const jamResult = addToken(updatedAttacker, 'gun_jam', 1);
    updatedAttacker = { ...updatedAttacker, tokens: jamResult.tokens };

    const removeResult = setTokenStacks(updatedAttacker, 'roulette', 'permanent', 0);
    updatedAttacker = { ...updatedAttacker, tokens: removeResult.tokens };

    const msg = `${who} • 🎰 ${card.name}${hitLabel}: 탄걸림 발생! (${Math.round(jamChance * 100)}% 확률) 남은 타격 취소`;
    return {
      jammed: true,
      updatedAttacker,
      event: { actor: attackerName, card: card.name, type: 'jam', msg },
      log: msg
    };
  }

  const rouletteResult = addToken(updatedAttacker, 'roulette', 1);
  updatedAttacker = { ...updatedAttacker, tokens: rouletteResult.tokens };
  const newStacks = (currentRouletteStacks || 0) + 1;

  const msg = `${who} • 🎰 ${card.name}${hitLabel}: 룰렛 ${newStacks} (${Math.round(newStacks * 5)}% 위험)`;
  return {
    jammed: false,
    updatedAttacker,
    event: { actor: attackerName, card: card.name, type: 'roulette', msg },
    log: msg
  };
}

/**
 * 타임라인 충돌 시 special 효과 처리
 */
export function processCollisionSpecials({
  card,
  enemyCard,
  attackerName
}: {
  card: SpecialCard;
  enemyCard: SpecialCard | null;
  attackerName: 'player' | 'enemy';
}): CollisionResult {
  const events: SpecialEvent[] = [];
  const logs: string[] = [];
  let destroyed = false;

  if (hasSpecial(card, 'destroyOnCollision')) {
    destroyed = true;
    const who = attackerName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • 💥 ${card.name}: 충돌! ${enemyCard?.name || '적 카드'} 파괴!`;
    events.push({ actor: attackerName, card: card.name, type: 'destroy', msg });
    logs.push(msg);
  }

  return { destroyed, events, logs };
}

/**
 * 큐에서 충돌 감지 및 적 카드 파괴 처리
 */
export function processQueueCollisions(
  queue: SpecialQueueItem[],
  addLog?: (msg: string) => void
): { filteredQueue: SpecialQueueItem[]; destroyedCards: SpecialCard[]; logs: string[] } {
  const destroyedCards: SpecialCard[] = [];
  const logs: string[] = [];

  const playerCardsWithCollision = queue.filter(
    item => item.actor === 'player' && hasSpecial(item.card, 'destroyOnCollision')
  );

  if (playerCardsWithCollision.length === 0) {
    return { filteredQueue: queue, destroyedCards, logs };
  }

  const cardsToRemove = new Set<SpecialQueueItem>();

  for (const playerItem of playerCardsWithCollision) {
    const collidingEnemyCards = queue.filter(
      item => item.actor === 'enemy' && item.sp === playerItem.sp
    );

    for (const enemyItem of collidingEnemyCards) {
      if (!cardsToRemove.has(enemyItem)) {
        cardsToRemove.add(enemyItem);
        if (enemyItem.card) {
          destroyedCards.push(enemyItem.card);
        }
        const msg = `플레이어 • 💥 ${playerItem.card?.name}: 타임라인 충돌! ${enemyItem.card?.name || '적 카드'} 파괴!`;
        logs.push(msg);
        if (addLog) addLog(msg);
      }
    }
  }

  const filteredQueue = queue.filter(item => !cardsToRemove.has(item));
  return { filteredQueue, destroyedCards, logs };
}

/**
 * 방어력 무시 여부 확인
 */
export function shouldIgnoreBlock(card: SpecialCard): boolean {
  return hasSpecial(card, 'ignoreBlock') || hasSpecial(card, 'piercing') || card._ignoreBlock === true;
}

/**
 * 민첩 보너스로 speedCost 감소 계산
 */
export function calculateAgilitySpeedReduction(card: SpecialCard, player: SpecialActor): number {
  if (!hasSpecial(card, 'agilityBonus')) return 0;
  const agility = player.agility || 0;
  return agility * 3;
}

/**
 * 타임라인 조작 효과 처리
 */
export function processTimelineSpecials({
  card,
  actor,
  actorName,
  queue,
  currentIndex,
  damageDealt = 0
}: {
  card: SpecialCard;
  actor: SpecialActor;
  actorName: 'player' | 'enemy';
  queue: SpecialQueueItem[];
  currentIndex: number;
  damageDealt?: number;
}): TimelineResult {
  const events: SpecialEvent[] = [];
  const logs: string[] = [];
  const timelineChanges: TimelineChanges = {
    advancePlayer: 0,
    pushEnemy: 0,
    pushLastEnemy: 0,
  };

  if (hasSpecial(card, 'advanceTimeline')) {
    const amount = card.advanceAmount || 4;
    timelineChanges.advancePlayer = amount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • ⏪ ${card.name}: 내 타임라인 ${amount} 앞당김!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg });
    logs.push(msg);
  }

  if (hasSpecial(card, 'pushEnemyTimeline') && damageDealt > 0) {
    const amount = card.pushAmount || 5;
    timelineChanges.pushEnemy = amount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • ⏩ ${card.name}: 피해 성공! 적 타임라인 ${amount} 뒤로 밀림!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg });
    logs.push(msg);
  }

  if (hasSpecial(card, 'beatEffect')) {
    const advanceAmount = card.advanceAmount || 1;
    timelineChanges.advancePlayer = advanceAmount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg1 = `${who} • ⏪ ${card.name}: 내 타임라인 ${advanceAmount} 앞당김!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg: msg1 });
    logs.push(msg1);

    if (damageDealt > 0) {
      const pushAmount = card.pushAmount || 2;
      timelineChanges.pushEnemy = pushAmount;
      const msg2 = `${who} • ⏩ ${card.name}: 피해 성공! 적 타임라인 ${pushAmount} 뒤로 밀림!`;
      events.push({ actor: actorName, card: card.name, type: 'timeline', msg: msg2 });
      logs.push(msg2);
    }
  }

  if (hasSpecial(card, 'pushLastEnemyCard')) {
    const amount = card.pushAmount || 9;
    timelineChanges.pushLastEnemy = amount;
    const who = actorName === 'player' ? '플레이어' : '몬스터';
    const msg = `${who} • ⏩ ${card.name}: 적의 마지막 카드를 ${amount} 뒤로 밀음!`;
    events.push({ actor: actorName, card: card.name, type: 'timeline', msg });
    logs.push(msg);
  }

  const hasChainTrait = card.traits && card.traits.includes('chain');
  if (hasChainTrait || hasSpecial(card, 'advanceIfNextFencing')) {
    const nextPlayerCard = queue.slice(currentIndex + 1).find(q => q.actor === actorName);
    if (nextPlayerCard && nextPlayerCard.card?.cardCategory === 'fencing') {
      const amount = card.advanceAmount || 3;
      timelineChanges.advancePlayer = (timelineChanges.advancePlayer || 0) + amount;
      const who = actorName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • ⏪ ${card.name}: 연계! 타임라인 ${amount} 앞당김!`;
      events.push({ actor: actorName, card: card.name, type: 'timeline', msg });
      logs.push(msg);
    }
  }

  return { timelineChanges, events, logs };
}

/**
 * 성장하는 방어력 계산 (방어자세)
 */
export function calculateGrowingDefense(card: SpecialCard, ticksPassed: number): number {
  if (!hasSpecial(card, 'growingDefense')) return 0;
  return 0;
}

/**
 * 카드 창조 효과 처리
 */
export function processCardCreationSpecials({
  card,
  actorName,
  damageDealt = 0,
  allCards = []
}: {
  card: SpecialCard;
  actorName: 'player' | 'enemy';
  damageDealt?: number;
  allCards?: Card[];
}): CardCreationResult {
  const events: SpecialEvent[] = [];
  const logs: string[] = [];
  const createdCards: Card[] = [];

  const MAX_FLECHE_CHAIN = 2;
  const currentChainCount = card.flecheChainCount || 0;
  const canChain = card.isFromFleche ? currentChainCount < MAX_FLECHE_CHAIN : true;
  const shouldCreateCards = (hasSpecial(card, 'createAttackOnHit') || card.isFromFleche) && damageDealt > 0 && canChain;

  if (shouldCreateCards) {
    const originalCardId = card.createdBy || card.id;
    const attackCards = allCards.filter(c =>
      c.type === 'attack' &&
      c.id !== originalCardId &&
      (!c.requiredTokens || c.requiredTokens.length === 0)
    );
    if (attackCards.length > 0) {
      const shuffled = shuffle(attackCards);
      const selectedCards: Card[] = [];
      const usedIds = new Set<string>();
      for (const c of shuffled) {
        if (!usedIds.has(c.id) && selectedCards.length < 3) {
          selectedCards.push(c);
          usedIds.add(c.id);
        }
      }

      const nextChainCount = card.isFromFleche ? currentChainCount + 1 : 1;

      for (let i = 0; i < selectedCards.length; i++) {
        const selectedCard = selectedCards[i];
        const newCard: Card = {
          ...selectedCard,
          damage: selectedCard.damage,
          block: selectedCard.block,
          hits: selectedCard.hits,
          speedCost: selectedCard.speedCost,
          actionCost: selectedCard.actionCost,
          type: selectedCard.type,
          cardCategory: selectedCard.cardCategory,
          special: selectedCard.special,
          traits: selectedCard.traits,
          isGhost: true,
          createdBy: originalCardId,
          createdId: `${selectedCard.id}_created_${Date.now()}_${i}`,
          isFromFleche: true,
          flecheChainCount: nextChainCount
        };
        createdCards.push(newCard);
      }
      const cardNames = createdCards.map(c => c.name).join(', ');
      const sourceName = card.isFromFleche ? `플레쉬 연쇄 ${currentChainCount + 1}` : card.name;
      const chainInfo = nextChainCount < MAX_FLECHE_CHAIN ? '' : ' (마지막 연쇄)';
      const who = actorName === 'player' ? '플레이어' : '몬스터';
      const msg = `${who} • ✨ ${sourceName}: 피해 성공! ${createdCards.length}장의 공격 카드 창조!${chainInfo} (${cardNames})`;
      events.push({ actor: actorName, card: card.name, type: 'create', msg });
      logs.push(msg);
    }
  }

  return { createdCards, events, logs };
}
