/**
 * @file sync.ts
 * @description 게임 데이터 ↔ 시뮬레이터 데이터 동기화
 *
 * 이 파일은 game-data-sync.ts의 래퍼로, JSON 파일 저장 기능을 제공합니다.
 * 실제 데이터 동기화 로직은 game-data-sync.ts에서 처리됩니다.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 중앙화된 게임 데이터 동기화 모듈
import {
  syncAllCards,
  syncAllTokens,
  syncAllRelics,
  syncAllTraits,
  syncAllEnemies,
  syncAllAnomalies,
  clearDataCache,
  type SimulatorAnomaly,
} from './game-data-sync';

// 추가 데이터 임포트 (프리셋용)
import { PLAYER_STARTER_DECK } from '../../data/cards';
import { ENEMY_PATTERNS } from '../../data/enemyPatterns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================== 타입 정의 ====================

export interface SimCardData {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'skill' | 'move' | 'reaction' | 'support';
  attack?: number;
  defense?: number;
  block?: number;
  speedCost: number;
  actionCost: number;
  priority: string;
  tags: string[];
  description: string;
  traits?: string[];
  effects?: Record<string, unknown>;
}

export interface SimEnemyData {
  id: string;
  name: string;
  maxHp: number;
  tier: number;
  patternType: 'cycle' | 'phase' | 'random';
  pattern?: string[];
  phases?: Array<{
    hpThreshold: number;
    pattern: string[];
    description: string;
  }>;
  specialActions?: Record<string, unknown>;
  deck: string[];
  description: string;
}

export interface SimRelicData {
  id: string;
  name: string;
  emoji: string;
  rarity: string;
  tags: string[];
  description: string;
  effectType: string;
  effects: Record<string, unknown>;
}

export interface SimAnomalyData {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  effectType: string;
  levelEffects: Array<{
    level: number;
    value?: number;
    description: string;
  }>;
}

// ==================== 카드 동기화 ====================

/**
 * 모든 게임 카드를 시뮬레이터 형식으로 변환 (game-data-sync.ts 래핑)
 */
export function syncCards(): Record<string, SimCardData> {
  const gameCards = syncAllCards();
  const cards: Record<string, SimCardData> = {};

  for (const [id, card] of Object.entries(gameCards)) {
    cards[id] = {
      id: card.id,
      name: card.name,
      type: mapCardType(card.type),
      speedCost: card.speedCost,
      actionCost: card.actionCost,
      priority: card.priority || 'normal',
      tags: card.tags || [],
      description: card.description,
      traits: card.traits,
    };

    if (card.damage) {
      cards[id].attack = card.damage;
    }
    if (card.block) {
      cards[id].defense = card.block;
      cards[id].block = card.block;
    }
  }

  return cards;
}

function mapCardType(type: string): SimCardData['type'] {
  const typeMap: Record<string, SimCardData['type']> = {
    attack: 'attack',
    defense: 'defense',
    skill: 'skill',
    move: 'move',
    reaction: 'reaction',
    support: 'support',
  };
  return typeMap[type] || 'skill';
}

// 적 카드는 이제 game-data-sync.ts에서 중앙 관리됨 (ENEMY_CARDS 배열 사용)

// ==================== 적 동기화 ====================

/**
 * 모든 게임 적을 시뮬레이터 형식으로 변환 (game-data-sync.ts 래핑)
 * ENEMY_PATTERNS의 패턴 정보도 포함
 */
export function syncEnemies(): Record<string, SimEnemyData> {
  const gameEnemies = syncAllEnemies();
  const enemies: Record<string, SimEnemyData> = {};

  for (const [id, enemy] of Object.entries(gameEnemies)) {
    // ENEMY_PATTERNS에서 패턴 정보 가져오기
    const pattern = (ENEMY_PATTERNS as Record<string, {
      type?: string;
      pattern?: string[];
      phases?: Array<{ hpThreshold: number; pattern: string[]; description: string }>;
      specialActions?: Record<string, unknown>;
      description?: string;
    } | undefined>)[id] as {
      type?: string;
      pattern?: string[];
      phases?: Array<{ hpThreshold: number; pattern: string[]; description: string }>;
      specialActions?: Record<string, unknown>;
      description?: string;
    } | undefined;

    const simEnemy: SimEnemyData = {
      id,
      name: enemy.name,
      maxHp: enemy.maxHp,
      tier: enemy.tier,
      patternType: (pattern?.type as 'cycle' | 'phase' | 'random') || 'cycle',
      deck: enemy.deck,
      description: pattern?.description || enemy.description || '',
    };

    if (pattern?.type === 'cycle' && pattern.pattern) {
      simEnemy.pattern = pattern.pattern;
    } else if (pattern?.type === 'phase' && pattern.phases) {
      simEnemy.phases = pattern.phases;
      simEnemy.specialActions = pattern.specialActions;
    }

    enemies[id] = simEnemy;
  }

  return enemies;
}

// ==================== 유물 동기화 ====================

/**
 * 모든 게임 상징을 시뮬레이터 형식으로 변환 (game-data-sync.ts 래핑)
 */
export function syncRelics(): Record<string, SimRelicData> {
  const gameRelics = syncAllRelics();
  const relics: Record<string, SimRelicData> = {};

  for (const [id, relic] of Object.entries(gameRelics)) {
    // 개발자 전용 유물 제외
    if (relic.rarity === 'dev') continue;

    relics[id] = {
      id: relic.id,
      name: relic.name,
      emoji: relic.emoji,
      rarity: relic.rarity,
      tags: relic.tags,
      description: relic.description,
      effectType: relic.effects?.type || 'unknown',
      effects: { ...relic.effects },
    };
  }

  return relics;
}

// ==================== 이변 동기화 ====================

/**
 * 모든 게임 이변을 시뮬레이터 형식으로 변환 (game-data-sync.ts 래핑)
 */
export function syncAnomalies(): Record<string, SimAnomalyData> {
  const gameAnomalies = syncAllAnomalies();
  const anomalies: Record<string, SimAnomalyData> = {};

  for (const [id, anomaly] of Object.entries(gameAnomalies)) {
    // 각 레벨의 효과 생성
    const levelEffects = [];
    for (let level = 1; level <= 4; level++) {
      const effect = anomaly.getEffect(level);
      levelEffects.push({
        level,
        value: effect.value,
        description: effect.description,
      });
    }

    anomalies[anomaly.id] = {
      id: anomaly.id,
      name: anomaly.name,
      emoji: anomaly.emoji,
      color: anomaly.color,
      description: anomaly.description,
      effectType: anomaly.getEffect(1).type,
      levelEffects,
    };
  }

  return anomalies;
}

// ==================== 프리셋 동기화 ====================

export function syncPresets(): Record<string, { id: string; name: string; description: string; cards: string[] }> {
  return {
    starter: {
      id: 'starter',
      name: '시작 덱',
      description: '기본 시작 덱',
      cards: PLAYER_STARTER_DECK,
    },
    aggressive: {
      id: 'aggressive',
      name: '공격 덱',
      description: '공격 위주 덱 - 검격/사격 혼합',
      cards: ['shoot', 'shoot', 'strike', 'strike', 'lunge', 'fleche', 'beat', 'feint'],
    },
    defensive: {
      id: 'defensive',
      name: '방어 덱',
      description: '방어 위주 덱 - 수비와 반격',
      cards: ['marche', 'marche', 'octave', 'quarte', 'deflect', 'defensive_stance', 'reload', 'septime'],
    },
    balanced: {
      id: 'balanced',
      name: '밸런스 덱',
      description: '균형잡힌 덱 - 공격과 방어',
      cards: ['shoot', 'shoot', 'strike', 'strike', 'marche', 'octave', 'lunge', 'reload'],
    },
    gunslinger: {
      id: 'gunslinger',
      name: '총잡이 덱',
      description: '총기 위주 덱 - 연사와 특수탄',
      cards: ['shoot', 'shoot', 'quick_shot', 'aimed_shot', 'fan_the_hammer', 'reload', 'ap_load', 'incendiary_load'],
    },
    fencer: {
      id: 'fencer',
      name: '펜서 덱',
      description: '검격 위주 덱 - 콤보와 연계',
      cards: ['strike', 'strike', 'thrust', 'feint', 'binding', 'beat', 'lunge', 'deflect'],
    },
  };
}

// ==================== 파일 저장 ====================

export function saveAllData(outputDir?: string): void {
  const dir = outputDir || __dirname;

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  console.log('📦 게임 데이터 동기화 시작...');

  // 카드 저장
  const cards = syncCards();
  writeFileSync(join(dir, 'cards.json'), JSON.stringify(cards, null, 2), 'utf-8');
  console.log(`  ✓ cards.json: ${Object.keys(cards).length}개 카드`);

  // 적 저장
  const enemies = syncEnemies();
  writeFileSync(join(dir, 'enemies.json'), JSON.stringify(enemies, null, 2), 'utf-8');
  console.log(`  ✓ enemies.json: ${Object.keys(enemies).length}개 적`);

  // 유물 저장
  const relics = syncRelics();
  writeFileSync(join(dir, 'relics.json'), JSON.stringify(relics, null, 2), 'utf-8');
  console.log(`  ✓ relics.json: ${Object.keys(relics).length}개 유물`);

  // 이변 저장
  const anomalies = syncAnomalies();
  writeFileSync(join(dir, 'anomalies.json'), JSON.stringify(anomalies, null, 2), 'utf-8');
  console.log(`  ✓ anomalies.json: ${Object.keys(anomalies).length}개 이변`);

  // 프리셋 저장
  const presets = syncPresets();
  writeFileSync(join(dir, 'presets.json'), JSON.stringify(presets, null, 2), 'utf-8');
  console.log(`  ✓ presets.json: ${Object.keys(presets).length}개 프리셋`);

  console.log('✅ 동기화 완료!');
}

// ==================== 데이터 검증 ====================

export function validateSync(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const cards = syncCards();
  const enemies = syncEnemies();
  const relics = syncRelics();

  // 적 덱에 없는 카드 확인
  for (const enemy of Object.values(enemies)) {
    for (const cardId of enemy.deck) {
      if (!cards[cardId]) {
        errors.push(`적 ${enemy.id}의 덱에 없는 카드: ${cardId}`);
      }
    }
  }

  // 카드 필수 필드 확인
  for (const card of Object.values(cards)) {
    if (!card.name) errors.push(`카드 ${card.id}에 name 없음`);
    if (!card.type) errors.push(`카드 ${card.id}에 type 없음`);
    if (card.type === 'attack' && !card.attack) {
      errors.push(`공격 카드 ${card.id}에 attack 없음`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== CLI ====================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔄 데이터 동기화 도구\n');

  const validation = validateSync();
  if (!validation.valid) {
    console.log('⚠️ 검증 경고:');
    validation.errors.forEach(e => console.log(`  - ${e}`));
    console.log('');
  }

  saveAllData();
}
