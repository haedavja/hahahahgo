/**
 * @file loader.ts
 * @description JSON 데이터 로더 - 카드, 적, 프리셋 데이터 로딩
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getLogger } from '../core/logger';

const log = getLogger('DataLoader');

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 타입 정의 ====================

export interface CardData {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'skill' | 'reaction' | 'general' | 'move' | 'support';
  cost: number;
  attack?: number;
  defense?: number;
  hits?: number;
  traits?: string[];
  effects?: Record<string, unknown>;
  description: string;
}

export interface EnemyData {
  id: string;
  name: string;
  tier: number;
  hp: number;
  cardsPerTurn: number;
  deck: string[];
  passive?: {
    type: string;
    effect: string;
  } | null;
  pattern: 'aggressive' | 'defensive' | 'balanced';
  description: string;
}

export interface PresetData {
  name: string;
  description: string;
  cards: string[];
  archetype: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface RelicData {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  effect: Record<string, unknown>;
  description: string;
}

interface CardsJson {
  version: string;
  lastUpdated: string;
  cards: Record<string, CardData>;
}

interface EnemiesJson {
  version: string;
  lastUpdated: string;
  tiers: Record<string, string[]>;
  enemies: Record<string, EnemyData>;
}

interface PresetsJson {
  version: string;
  lastUpdated: string;
  presets: Record<string, PresetData>;
}

// ==================== 데이터 캐시 ====================

let cachedCards: Record<string, CardData> | null = null;
let cachedEnemies: Record<string, EnemyData> | null = null;
let cachedPresets: Record<string, PresetData> | null = null;
let cachedTiers: Record<string, string[]> | null = null;

// ==================== 로더 함수 ====================

export function loadCards(forceReload = false): Record<string, CardData> {
  if (cachedCards && !forceReload) return cachedCards;

  const filePath = join(__dirname, 'cards.json');
  if (!existsSync(filePath)) {
    log.warn('cards.json not found, using empty data');
    return {};
  }

  const data: CardsJson = JSON.parse(readFileSync(filePath, 'utf-8'));
  cachedCards = data.cards;
  return cachedCards;
}

export function loadEnemies(forceReload = false): Record<string, EnemyData> {
  if (cachedEnemies && !forceReload) return cachedEnemies;

  const filePath = join(__dirname, 'enemies.json');
  if (!existsSync(filePath)) {
    log.warn('enemies.json not found, using empty data');
    return {};
  }

  const data: EnemiesJson = JSON.parse(readFileSync(filePath, 'utf-8'));
  cachedEnemies = data.enemies;
  cachedTiers = data.tiers;
  return cachedEnemies;
}

export function loadPresets(forceReload = false): Record<string, PresetData> {
  if (cachedPresets && !forceReload) return cachedPresets;

  const filePath = join(__dirname, 'presets.json');
  if (!existsSync(filePath)) {
    log.warn('presets.json not found, using empty data');
    return {};
  }

  const data: PresetsJson = JSON.parse(readFileSync(filePath, 'utf-8'));
  cachedPresets = data.presets;
  return cachedPresets;
}

export function loadTiers(forceReload = false): Record<string, string[]> {
  if (cachedTiers && !forceReload) {
    return cachedTiers;
  }
  loadEnemies(forceReload);
  return cachedTiers || {};
}

// ==================== 헬퍼 함수 ====================

export function getCard(cardId: string): CardData | undefined {
  const cards = loadCards();
  return cards[cardId];
}

export function getEnemy(enemyId: string): EnemyData | undefined {
  const enemies = loadEnemies();
  return enemies[enemyId];
}

export function getPreset(presetId: string): PresetData | undefined {
  const presets = loadPresets();
  return presets[presetId];
}

export function getEnemiesByTier(tier: number): string[] {
  const tiers = loadTiers();
  return tiers[String(tier)] || [];
}

export function getAllEnemyIds(): string[] {
  const enemies = loadEnemies();
  return Object.keys(enemies);
}

export function getAllCardIds(): string[] {
  const cards = loadCards();
  return Object.keys(cards);
}

export function getAllPresetIds(): string[] {
  const presets = loadPresets();
  return Object.keys(presets);
}

// ==================== 데이터 저장 (수정용) ====================

export function saveCards(cards: Record<string, CardData>): void {
  const filePath = join(__dirname, 'cards.json');
  const data: CardsJson = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    cards,
  };
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  cachedCards = cards;
}

export function saveEnemies(enemies: Record<string, EnemyData>, tiers: Record<string, string[]>): void {
  const filePath = join(__dirname, 'enemies.json');
  const data: EnemiesJson = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    tiers,
    enemies,
  };
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  cachedEnemies = enemies;
  cachedTiers = tiers;
}

export function savePresets(presets: Record<string, PresetData>): void {
  const filePath = join(__dirname, 'presets.json');
  const data: PresetsJson = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    presets,
  };
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  cachedPresets = presets;
}

// ==================== 유효성 검사 ====================

export function validateDeck(cardIds: string[]): { valid: boolean; errors: string[] } {
  const cards = loadCards();
  const errors: string[] = [];

  for (const cardId of cardIds) {
    if (!cards[cardId]) {
      errors.push(`Unknown card: ${cardId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEnemy(enemyId: string): { valid: boolean; errors: string[] } {
  const enemies = loadEnemies();
  const cards = loadCards();
  const errors: string[] = [];

  const enemy = enemies[enemyId];
  if (!enemy) {
    errors.push(`Unknown enemy: ${enemyId}`);
    return { valid: false, errors };
  }

  for (const cardId of enemy.deck) {
    if (!cards[cardId]) {
      errors.push(`Enemy ${enemyId} has unknown card: ${cardId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== 데이터 통계 ====================

export function getDataStats(): {
  cards: number;
  enemies: number;
  presets: number;
  tierDistribution: Record<string, number>;
} {
  const cards = loadCards();
  const enemies = loadEnemies();
  const presets = loadPresets();
  const tiers = loadTiers();

  const tierDistribution: Record<string, number> = {};
  for (const [tier, enemyIds] of Object.entries(tiers)) {
    tierDistribution[`tier${tier}`] = enemyIds.length;
  }

  return {
    cards: Object.keys(cards).length,
    enemies: Object.keys(enemies).length,
    presets: Object.keys(presets).length,
    tierDistribution,
  };
}

// ==================== 캐시 초기화 ====================

export function clearCache(): void {
  cachedCards = null;
  cachedEnemies = null;
  cachedPresets = null;
  cachedTiers = null;
}
