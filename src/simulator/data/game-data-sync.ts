/**
 * @file game-data-sync.ts
 * @description 실제 게임 데이터와 동기화하는 모듈
 *
 * 실제 게임 파일에서 직접 데이터를 가져와 시뮬레이터에서 사용합니다.
 */

import type {
  GameCard,
  GameToken,
  GameRelic,
  GameTrait,
  GameEnemy,
  TokenType,
  TokenCategory,
  CardType,
  RelicEffects,
} from '../core/game-types';

// ==================== 실제 게임 데이터 임포트 ====================

// 실제 게임 카드 데이터
import { CARDS as BATTLE_CARDS, ENEMY_CARDS, ENEMIES, TRAITS as BATTLE_TRAITS } from '../../components/battle/battleData';
import { CARD_LIBRARY } from '../../data/cards';
import { TOKENS as GAME_TOKENS, TOKEN_TYPES, TOKEN_CATEGORIES } from '../../data/tokens';
import { RELICS as GAME_RELICS } from '../../data/relics';

// ==================== 카드 동기화 ====================

/**
 * 모든 게임 카드를 시뮬레이터 형식으로 변환
 */
export function syncAllCards(): Record<string, GameCard> {
  const cards: Record<string, GameCard> = {};

  // battleData.ts의 CARDS 배열 변환
  for (const card of BATTLE_CARDS as unknown[]) {
    const c = card as Record<string, unknown>;
    const gameCard: GameCard = {
      id: c.id as string,
      name: c.name as string,
      type: (c.type as CardType) || 'attack',
      damage: c.damage as number | undefined,
      block: c.block as number | undefined,
      hits: c.hits as number | undefined,
      speedCost: (c.speedCost as number) || 5,
      actionCost: (c.actionCost as number) || 1,
      priority: c.priority as GameCard['priority'],
      description: (c.description as string) || '',
      traits: c.traits as string[] | undefined,
      cardCategory: c.cardCategory as GameCard['cardCategory'],
      special: c.special as string | undefined,
      advanceAmount: c.advanceAmount as number | undefined,
      pushAmount: c.pushAmount as number | undefined,
      appliedTokens: c.appliedTokens as GameCard['appliedTokens'],
      requiredTokens: c.requiredTokens as GameCard['requiredTokens'],
      crossBonus: c.crossBonus as GameCard['crossBonus'],
    };
    cards[gameCard.id] = gameCard;
  }

  // cards.ts의 CARD_LIBRARY 변환
  for (const [id, card] of Object.entries(CARD_LIBRARY)) {
    if (!cards[id]) {
      const c = card as Record<string, unknown>;
      cards[id] = {
        id,
        name: c.name as string,
        type: (c.type as CardType) || 'attack',
        damage: c.damage as number | undefined,
        block: c.block as number | undefined,
        speedCost: (c.speedCost as number) || 5,
        actionCost: (c.actionCost as number) || 1,
        priority: c.priority as GameCard['priority'],
        description: (c.description as string) || '',
        tags: c.tags as string[] | undefined,
        traits: c.traits as string[] | undefined,
      };
    }
  }

  // battleData.ts의 ENEMY_CARDS 배열 변환
  for (const card of ENEMY_CARDS as unknown[]) {
    const c = card as Record<string, unknown>;
    const cardId = c.id as string;
    if (!cards[cardId]) {
      cards[cardId] = {
        id: cardId,
        name: c.name as string,
        type: (c.type as CardType) || 'attack',
        damage: c.damage as number | undefined,
        block: c.block as number | undefined,
        hits: c.hits as number | undefined,
        speedCost: (c.speedCost as number) || 5,
        actionCost: (c.actionCost as number) || 1,
        priority: c.priority as GameCard['priority'],
        description: (c.description as string) || '',
        special: c.special as string | string[] | undefined,
        pushAmount: c.pushAmount as number | undefined,
        appliedTokens: c.appliedTokens as GameCard['appliedTokens'],
      };
    }
  }

  return cards;
}

/**
 * 카드 ID로 카드 정보 조회
 */
export function getCard(cardId: string): GameCard | undefined {
  const cards = syncAllCards();
  return cards[cardId];
}

/**
 * 카드 수 통계
 */
export function getCardStats(): { total: number; byType: Record<string, number>; byCategory: Record<string, number> } {
  const cards = syncAllCards();
  const byType: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const card of Object.values(cards)) {
    byType[card.type] = (byType[card.type] || 0) + 1;
    if (card.cardCategory) {
      byCategory[card.cardCategory] = (byCategory[card.cardCategory] || 0) + 1;
    }
  }

  return { total: Object.keys(cards).length, byType, byCategory };
}

// ==================== 토큰 동기화 ====================

/**
 * 모든 게임 토큰을 시뮬레이터 형식으로 변환
 */
export function syncAllTokens(): Record<string, GameToken> {
  const tokens: Record<string, GameToken> = {};

  for (const [id, token] of Object.entries(GAME_TOKENS)) {
    const t = token as Record<string, unknown>;
    tokens[id] = {
      id,
      name: t.name as string,
      type: t.type as TokenType,
      category: t.category as TokenCategory,
      emoji: (t.emoji as string) || '❓',
      description: (t.description as string) || '',
      effect: t.effect as GameToken['effect'],
    };
  }

  return tokens;
}

/**
 * 토큰 ID로 토큰 정보 조회
 */
export function getToken(tokenId: string): GameToken | undefined {
  const tokens = syncAllTokens();
  return tokens[tokenId];
}

/**
 * 카테고리별 토큰 조회
 */
export function getTokensByCategory(category: TokenCategory): GameToken[] {
  const tokens = syncAllTokens();
  return Object.values(tokens).filter(t => t.category === category);
}

/**
 * 토큰 수 통계
 */
export function getTokenStats(): { total: number; byCategory: Record<string, number>; byType: Record<string, number> } {
  const tokens = syncAllTokens();
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const token of Object.values(tokens)) {
    byCategory[token.category] = (byCategory[token.category] || 0) + 1;
    byType[token.type] = (byType[token.type] || 0) + 1;
  }

  return { total: Object.keys(tokens).length, byCategory, byType };
}

// ==================== 상징 동기화 ====================

/**
 * 모든 게임 상징을 시뮬레이터 형식으로 변환
 */
export function syncAllRelics(): Record<string, GameRelic> {
  const relics: Record<string, GameRelic> = {};

  for (const [id, relic] of Object.entries(GAME_RELICS)) {
    const r = relic as Record<string, unknown>;
    relics[id] = {
      id,
      name: r.name as string,
      emoji: (r.emoji as string) || '🔮',
      rarity: r.rarity as GameRelic['rarity'],
      tags: (r.tags as string[]) || [],
      description: (r.description as string) || '',
      effects: r.effects as RelicEffects,
    };
  }

  return relics;
}

/**
 * 상징 ID로 상징 정보 조회
 */
export function getRelic(relicId: string): GameRelic | undefined {
  const relics = syncAllRelics();
  return relics[relicId];
}

/**
 * 희귀도별 상징 조회
 */
export function getRelicsByRarity(rarity: GameRelic['rarity']): GameRelic[] {
  const relics = syncAllRelics();
  return Object.values(relics).filter(r => r.rarity === rarity);
}

/**
 * 상징 수 통계
 */
export function getRelicStats(): { total: number; byRarity: Record<string, number> } {
  const relics = syncAllRelics();
  const byRarity: Record<string, number> = {};

  for (const relic of Object.values(relics)) {
    byRarity[relic.rarity] = (byRarity[relic.rarity] || 0) + 1;
  }

  return { total: Object.keys(relics).length, byRarity };
}

// ==================== 특성 동기화 ====================

/**
 * 모든 게임 특성을 시뮬레이터 형식으로 변환
 */
export function syncAllTraits(): Record<string, GameTrait> {
  const traits: Record<string, GameTrait> = {};

  for (const [id, trait] of Object.entries(BATTLE_TRAITS)) {
    const t = trait as Record<string, unknown>;
    traits[id] = {
      id,
      name: t.name as string,
      type: t.type as 'positive' | 'negative',
      weight: (t.weight as number) || 1,
      description: (t.description as string) || '',
    };
  }

  return traits;
}

/**
 * 특성 ID로 특성 정보 조회
 */
export function getTrait(traitId: string): GameTrait | undefined {
  const traits = syncAllTraits();
  return traits[traitId];
}

/**
 * 특성 수 통계
 */
export function getTraitStats(): { total: number; positive: number; negative: number } {
  const traits = syncAllTraits();
  let positive = 0;
  let negative = 0;

  for (const trait of Object.values(traits)) {
    if (trait.type === 'positive') positive++;
    else negative++;
  }

  return { total: Object.keys(traits).length, positive, negative };
}

// ==================== 적 동기화 ====================

/**
 * 모든 게임 적을 시뮬레이터 형식으로 변환
 */
export function syncAllEnemies(): Record<string, GameEnemy> {
  const enemies: Record<string, GameEnemy> = {};

  for (const enemy of ENEMIES) {
    const e = enemy as Record<string, unknown>;
    enemies[e.id as string] = {
      id: e.id as string,
      name: e.name as string,
      hp: e.hp as number,
      maxHp: e.hp as number,
      ether: (e.ether as number) || 0,
      speed: (e.speed as number) || 10,
      maxSpeed: (e.maxSpeed as number) || 30,
      deck: (e.deck as string[]) || [],
      cardsPerTurn: (e.cardsPerTurn as number) || 1,
      emoji: (e.emoji as string) || '👹',
      tier: (e.tier as number) || 1,
      description: (e.description as string) || '',
      isBoss: (e.isBoss as boolean) || false,
      passives: e.passives as GameEnemy['passives'],
      block: 0,
      tokens: {},
    };
  }

  return enemies;
}

/**
 * 적 ID로 적 정보 조회
 */
export function getEnemy(enemyId: string): GameEnemy | undefined {
  const enemies = syncAllEnemies();
  return enemies[enemyId];
}

/**
 * 티어별 적 조회
 */
export function getEnemiesByTier(tier: number): GameEnemy[] {
  const enemies = syncAllEnemies();
  return Object.values(enemies).filter(e => e.tier === tier);
}

/**
 * 적 수 통계
 */
export function getEnemyStats(): { total: number; byTier: Record<number, number>; bosses: number } {
  const enemies = syncAllEnemies();
  const byTier: Record<number, number> = {};
  let bosses = 0;

  for (const enemy of Object.values(enemies)) {
    byTier[enemy.tier] = (byTier[enemy.tier] || 0) + 1;
    if (enemy.isBoss) bosses++;
  }

  return { total: Object.keys(enemies).length, byTier, bosses };
}

// ==================== 전체 동기화 상태 ====================

export interface SyncStatus {
  cards: { synced: number; total: number };
  tokens: { synced: number; total: number };
  relics: { synced: number; total: number };
  traits: { synced: number; total: number };
  lastSync: number;
}

/**
 * 전체 동기화 상태 확인
 */
export function getSyncStatus(): SyncStatus {
  const cardStats = getCardStats();
  const tokenStats = getTokenStats();
  const relicStats = getRelicStats();
  const traitStats = getTraitStats();

  return {
    cards: { synced: cardStats.total, total: cardStats.total },
    tokens: { synced: tokenStats.total, total: tokenStats.total },
    relics: { synced: relicStats.total, total: relicStats.total },
    traits: { synced: traitStats.total, total: traitStats.total },
    lastSync: Date.now(),
  };
}

/**
 * 동기화 요약 출력
 */
export function printSyncSummary(): void {
  const status = getSyncStatus();
  console.log('=== 게임 데이터 동기화 상태 ===');
  console.log(`카드: ${status.cards.synced}개`);
  console.log(`토큰: ${status.tokens.synced}개`);
  console.log(`상징: ${status.relics.synced}개`);
  console.log(`특성: ${status.traits.synced}개`);
}

/**
 * 게임 데이터 전체 통계
 */
export function getGameDataStats(): {
  cards: ReturnType<typeof getCardStats>;
  tokens: ReturnType<typeof getTokenStats>;
  relics: ReturnType<typeof getRelicStats>;
  traits: ReturnType<typeof getTraitStats>;
  enemies: ReturnType<typeof getEnemyStats>;
} {
  return {
    cards: getCardStats(),
    tokens: getTokenStats(),
    relics: getRelicStats(),
    traits: getTraitStats(),
    enemies: getEnemyStats(),
  };
}
