/**
 * @file sync.ts
 * @description 게임 데이터 ↔ 시뮬레이터 데이터 동기화
 *
 * 게임의 cards.ts, enemyPatterns.ts, relics.ts, anomalies.ts를
 * 시뮬레이터가 사용할 수 있는 형태로 변환
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 게임 데이터 임포트
import { CARD_LIBRARY, PLAYER_STARTER_DECK, ENEMY_DECKS } from '../../data/cards';
import { ENEMY_PATTERNS, getPatternAction, patternActionToMode } from '../../data/enemyPatterns';
import { RELICS, RELIC_TAGS } from '../../data/relics';
import { ANOMALY_TYPES, ALL_ANOMALIES } from '../../data/anomalies';

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

export function syncCards(): Record<string, SimCardData> {
  const cards: Record<string, SimCardData> = {};

  for (const [id, card] of Object.entries(CARD_LIBRARY)) {
    const c = card as {
      id: string;
      name: string;
      type: string;
      tags?: string[];
      speedCost: number;
      actionCost: number;
      priority: string;
      damage?: number;
      block?: number;
      description: string;
    };

    cards[id] = {
      id: c.id,
      name: c.name,
      type: mapCardType(c.type),
      speedCost: c.speedCost,
      actionCost: c.actionCost,
      priority: c.priority,
      tags: c.tags || [],
      description: c.description,
    };

    if (c.damage) {
      cards[id].attack = c.damage;
    }
    if (c.block) {
      cards[id].defense = c.block;
      cards[id].block = c.block;
    }
  }

  // 적 카드 추가
  addEnemyCards(cards);

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

function addEnemyCards(cards: Record<string, SimCardData>): void {
  // 구울 카드
  cards['ghoul_attack'] = {
    id: 'ghoul_attack',
    name: '구울의 할퀴기',
    type: 'attack',
    attack: 6,
    speedCost: 5,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy', 'melee'],
    description: '구울이 할퀴어 공격합니다.',
  };
  cards['ghoul_block'] = {
    id: 'ghoul_block',
    name: '구울의 웅크림',
    type: 'defense',
    defense: 5,
    block: 5,
    speedCost: 4,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy'],
    description: '구울이 웅크려 방어합니다.',
  };

  // 약탈자 카드
  cards['marauder_attack'] = {
    id: 'marauder_attack',
    name: '약탈자의 베기',
    type: 'attack',
    attack: 8,
    speedCost: 6,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy', 'melee'],
    description: '약탈자가 검으로 벱니다.',
  };
  cards['marauder_block'] = {
    id: 'marauder_block',
    name: '약탈자의 방패',
    type: 'defense',
    defense: 7,
    block: 7,
    speedCost: 5,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy'],
    description: '약탈자가 방패로 막습니다.',
  };

  // 슬러심 카드 (디버프)
  cards['slurthim_burn'] = {
    id: 'slurthim_burn',
    name: '슬러심의 화염',
    type: 'skill',
    attack: 3,
    speedCost: 5,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy', 'debuff'],
    description: '화상 2 부여',
    effects: { applyBurn: 2 },
  };
  cards['slurthim_vulnerable'] = {
    id: 'slurthim_vulnerable',
    name: '슬러심의 산성',
    type: 'skill',
    attack: 2,
    speedCost: 4,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy', 'debuff'],
    description: '취약 2 부여',
    effects: { applyVulnerable: 2 },
  };

  // 탈영병 카드
  cards['deserter_attack'] = {
    id: 'deserter_attack',
    name: '탈영병의 찌르기',
    type: 'attack',
    attack: 10,
    speedCost: 6,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy', 'melee'],
    description: '탈영병이 찌릅니다.',
  };
  cards['deserter_block'] = {
    id: 'deserter_block',
    name: '탈영병의 방어',
    type: 'defense',
    defense: 8,
    block: 8,
    speedCost: 5,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy'],
    description: '탈영병이 방어합니다.',
  };
  cards['deserter_double'] = {
    id: 'deserter_double',
    name: '연속 베기',
    type: 'attack',
    attack: 6,
    speedCost: 8,
    actionCost: 2,
    priority: 'normal',
    tags: ['enemy', 'melee', 'multi'],
    description: '2회 공격',
    effects: { hits: 2 },
  };
  cards['deserter_offense'] = {
    id: 'deserter_offense',
    name: '기합',
    type: 'skill',
    speedCost: 4,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy', 'buff'],
    description: '공세 2 획득',
    effects: { applyOffensive: 2 },
  };

  // 살육자 카드 (보스)
  cards['slaughterer_heavy'] = {
    id: 'slaughterer_heavy',
    name: '처형',
    type: 'attack',
    attack: 20,
    speedCost: 12,
    actionCost: 2,
    priority: 'slow',
    tags: ['enemy', 'boss', 'heavy'],
    description: '강력한 처형 공격',
  };
  cards['slaughterer_blur_block'] = {
    id: 'slaughterer_blur_block',
    name: '흐릿한 방어',
    type: 'defense',
    defense: 15,
    block: 15,
    speedCost: 6,
    actionCost: 1,
    priority: 'normal',
    tags: ['enemy', 'boss'],
    description: '강력한 방어',
    effects: { applyBlur: 1 },
  };
  cards['slaughterer_quick'] = {
    id: 'slaughterer_quick',
    name: '빠른 베기',
    type: 'attack',
    attack: 8,
    speedCost: 3,
    actionCost: 1,
    priority: 'quick',
    tags: ['enemy', 'boss', 'quick'],
    description: '빠른 공격',
  };
  cards['slaughterer_rest'] = {
    id: 'slaughterer_rest',
    name: '휴식',
    type: 'skill',
    speedCost: 8,
    actionCost: 1,
    priority: 'slow',
    tags: ['enemy', 'boss'],
    description: '체력 5 회복',
    effects: { heal: 5 },
  };
}

// ==================== 적 동기화 ====================

export function syncEnemies(): Record<string, SimEnemyData> {
  const enemies: Record<string, SimEnemyData> = {};

  // ENEMY_PATTERNS에서 적 정보 추출
  for (const [id, pattern] of Object.entries(ENEMY_PATTERNS)) {
    const p = pattern as {
      type: string;
      pattern?: string[];
      phases?: Array<{ hpThreshold: number; pattern: string[]; description: string }>;
      specialActions?: Record<string, unknown>;
      description: string;
    };

    const enemy: SimEnemyData = {
      id,
      name: getEnemyName(id),
      maxHp: getEnemyHp(id),
      tier: getEnemyTier(id),
      patternType: p.type as 'cycle' | 'phase' | 'random',
      deck: getEnemyDeck(id),
      description: p.description,
    };

    if (p.type === 'cycle' && p.pattern) {
      enemy.pattern = p.pattern;
    } else if (p.type === 'phase' && p.phases) {
      enemy.phases = p.phases;
      enemy.specialActions = p.specialActions;
    }

    enemies[id] = enemy;
  }

  return enemies;
}

function getEnemyName(id: string): string {
  const names: Record<string, string> = {
    ghoul: '구울',
    marauder: '약탈자',
    slurthim: '슬러심',
    deserter: '탈영병',
    slaughterer: '살육자',
    wildrat: '들쥐',
    berserker: '폭주자',
    polluted: '오염체',
    hunter: '현상금 사냥꾼',
    captain: '탈영병 대장',
  };
  return names[id] || id;
}

function getEnemyHp(id: string): number {
  const hpMap: Record<string, number> = {
    ghoul: 25,
    marauder: 30,
    slurthim: 20,
    deserter: 45,
    slaughterer: 100,
    wildrat: 12,
    berserker: 35,
    polluted: 22,
    hunter: 40,
    captain: 80,
  };
  return hpMap[id] || 30;
}

function getEnemyTier(id: string): number {
  const tierMap: Record<string, number> = {
    ghoul: 1,
    marauder: 1,
    slurthim: 1,
    wildrat: 1,
    polluted: 1,
    deserter: 2,
    berserker: 2,
    hunter: 2,
    slaughterer: 3,
    captain: 3,
  };
  return tierMap[id] || 1;
}

function getEnemyDeck(id: string): string[] {
  const deckMap: Record<string, string[]> = {
    ghoul: ['ghoul_attack', 'ghoul_attack', 'ghoul_block'],
    marauder: ['marauder_attack', 'marauder_block'],
    slurthim: ['slurthim_burn', 'slurthim_vulnerable'],
    deserter: ['deserter_attack', 'deserter_block', 'deserter_double', 'deserter_offense'],
    slaughterer: ['slaughterer_heavy', 'slaughterer_blur_block', 'slaughterer_quick', 'slaughterer_rest'],
  };
  return deckMap[id] || ['ghoul_attack', 'ghoul_block'];
}

// ==================== 유물 동기화 ====================

export function syncRelics(): Record<string, SimRelicData> {
  const relics: Record<string, SimRelicData> = {};

  for (const [id, relic] of Object.entries(RELICS)) {
    const r = relic as {
      id: string;
      name: string;
      emoji: string;
      rarity: string;
      tags: string[];
      description: string;
      effects: { type: string } & Record<string, unknown>;
    };

    // 개발자 전용 유물 제외
    if (r.rarity === 'dev') continue;

    relics[id] = {
      id: r.id,
      name: r.name,
      emoji: r.emoji,
      rarity: r.rarity,
      tags: r.tags,
      description: r.description,
      effectType: r.effects.type,
      effects: { ...r.effects },
    };
  }

  return relics;
}

// ==================== 이변 동기화 ====================

export function syncAnomalies(): Record<string, SimAnomalyData> {
  const anomalies: Record<string, SimAnomalyData> = {};

  for (const [key, anomaly] of Object.entries(ANOMALY_TYPES)) {
    const a = anomaly as {
      id: string;
      name: string;
      emoji: string;
      color: string;
      description: string;
      getEffect: (level: number) => { type: string; value?: number; description: string };
    };

    // 각 레벨의 효과 생성
    const levelEffects = [];
    for (let level = 1; level <= 4; level++) {
      const effect = a.getEffect(level);
      levelEffects.push({
        level,
        value: effect.value,
        description: effect.description,
      });
    }

    anomalies[a.id] = {
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      color: a.color,
      description: a.description,
      effectType: a.getEffect(1).type,
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
      description: '공격 위주 덱',
      cards: ['quick_slash', 'quick_slash', 'heavy_strike', 'heavy_strike', 'charge', 'sweep', 'bone_crush', 'dash'],
    },
    defensive: {
      id: 'defensive',
      name: '방어 덱',
      description: '방어 위주 덱',
      cards: ['guard', 'guard', 'guard', 'counter_stance', 'reinforce', 'quick_slash', 'quick_slash', 'dash'],
    },
    balanced: {
      id: 'balanced',
      name: '밸런스 덱',
      description: '균형잡힌 덱',
      cards: ['quick_slash', 'quick_slash', 'guard', 'guard', 'heavy_strike', 'counter_stance', 'charge', 'reinforce'],
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
