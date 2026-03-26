/**
 * @file sync-game-data.ts
 * @description 실제 게임 데이터(battleData.ts)를 시뮬레이터 JSON으로 동기화
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CARDS, ENEMIES, ENEMY_GROUPS } from '../../components/battle/battleData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SimulatorCard {
  id: string;
  name: string;
  type: string;
  damage?: number;
  block?: number;
  hits?: number;
  speedCost: number;
  actionCost?: number;
  traits?: string[];
  cardCategory?: string;
  special?: string;
  crossBonus?: {
    type: string;
    value?: number;
    count?: number;
  };
  appliedTokens?: Array<{
    id: string;
    target: string;
    stacks?: number;
  }>;
  advanceAmount?: number;
  pushAmount?: number;
  description?: string;
}

interface SimulatorEnemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ether: number;
  maxSpeed: number;
  deck: string[];
  cardsPerTurn: number;
  tier: number;
  isBoss?: boolean;
  passives?: {
    veilAtStart?: boolean;
    healPerTurn?: number;
    strengthPerTurn?: number;
    critBoostAtStart?: number;
    summonOnHalfHp?: boolean;
  };
}

function syncCards(): Record<string, SimulatorCard> {
  const cards: Record<string, SimulatorCard> = {};

  for (const card of CARDS) {
    const simCard: SimulatorCard = {
      id: card.id,
      name: card.name,
      type: card.type,
      speedCost: card.speedCost || 5,
      actionCost: card.actionCost || 1,
    };

    // 피해/방어 값
    if (card.damage !== undefined) simCard.damage = card.damage;
    if (card.block !== undefined) simCard.block = card.block;
    if (card.hits !== undefined) simCard.hits = card.hits;

    // 특성
    if (card.traits && card.traits.length > 0) {
      simCard.traits = [...card.traits];
    }

    // 카테고리
    if (card.cardCategory) simCard.cardCategory = card.cardCategory;

    // 특수 효과
    if (card.special) simCard.special = Array.isArray(card.special) ? card.special[0] : card.special;

    // 교차 보너스
    if (card.crossBonus) {
      simCard.crossBonus = { ...card.crossBonus };
    }

    // 적용 토큰
    if (card.appliedTokens && card.appliedTokens.length > 0) {
      simCard.appliedTokens = card.appliedTokens.map(t => ({
        id: t.id,
        target: t.target,
        stacks: 'stacks' in t ? t.stacks : 1,
      }));
    }

    // 앞당김/넉백
    if (card.advanceAmount) simCard.advanceAmount = card.advanceAmount;
    if (card.pushAmount) simCard.pushAmount = card.pushAmount;

    // 설명
    if (card.description) simCard.description = card.description;

    cards[card.id] = simCard;
  }

  return cards;
}

function syncEnemies(): Record<string, SimulatorEnemy> {
  const enemies: Record<string, SimulatorEnemy> = {};

  for (const enemy of ENEMIES) {
    const simEnemy: SimulatorEnemy = {
      id: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.hp,
      ether: enemy.ether || 100,
      maxSpeed: enemy.maxSpeed || 12,
      deck: enemy.deck || [],
      cardsPerTurn: enemy.cardsPerTurn || 1,
      tier: enemy.tier || 1,
    };

    if (enemy.isBoss) simEnemy.isBoss = true;

    // 패시브 능력
    if (enemy.passives) {
      simEnemy.passives = { ...enemy.passives };
    }

    enemies[enemy.id] = simEnemy;
  }

  return enemies;
}

function syncEnemyGroups(): Record<string, {
  id: string;
  name: string;
  tier: number;
  enemies: string[];
  isBoss?: boolean;
}> {
  const groups: Record<string, any> = {};

  for (const group of ENEMY_GROUPS) {
    groups[group.id] = {
      id: group.id,
      name: group.name,
      tier: group.tier,
      enemies: group.enemies,
      isBoss: group.isBoss,
    };
  }

  return groups;
}

function main() {
  console.log('=== 게임 데이터 동기화 시작 ===\n');

  // 카드 동기화
  const cards = syncCards();
  const cardsJson = {
    version: '2.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    syncedFrom: 'battleData.ts',
    totalCards: Object.keys(cards).length,
    cards,
  };

  const cardsPath = join(__dirname, '../data/cards.json');
  writeFileSync(cardsPath, JSON.stringify(cardsJson, null, 2), 'utf-8');
  console.log(`✅ 카드 동기화 완료: ${Object.keys(cards).length}개`);

  // 적 동기화
  const enemies = syncEnemies();
  const enemiesJson = {
    version: '2.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    syncedFrom: 'battleData.ts',
    totalEnemies: Object.keys(enemies).length,
    enemies,
  };

  const enemiesPath = join(__dirname, '../data/enemies.json');
  writeFileSync(enemiesPath, JSON.stringify(enemiesJson, null, 2), 'utf-8');
  console.log(`✅ 적 동기화 완료: ${Object.keys(enemies).length}개`);

  // 적 그룹 동기화
  const groups = syncEnemyGroups();
  const groupsJson = {
    version: '2.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    syncedFrom: 'battleData.ts',
    totalGroups: Object.keys(groups).length,
    groups,
  };

  const groupsPath = join(__dirname, '../data/enemy-groups.json');
  writeFileSync(groupsPath, JSON.stringify(groupsJson, null, 2), 'utf-8');
  console.log(`✅ 적 그룹 동기화 완료: ${Object.keys(groups).length}개`);

  console.log('\n=== 동기화 완료 ===');
}

main();
