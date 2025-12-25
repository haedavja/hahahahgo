/**
 * @file enemyAI.ts
 * @description 적 AI 행동 결정 시스템
 *
 * ## AI 모드
 * - aggro: 공격적 (공격 카드 우선)
 * - turtle: 방어적 (방어 카드 우선)
 * - balanced: 균형 (상황에 따라)
 *
 * ## 행동 결정 흐름
 * 1. 몬스터별 모드 가중치 확인
 * 2. 가중치 기반 모드 선택
 * 3. 모드에 따른 카드 선택
 */

import { MAX_SPEED, BASE_PLAYER_ENERGY, ENEMY_CARDS } from "../battleData";
import { choice } from "./battleUtils";
import { calculateEtherSlots } from "../../../lib/etherUtils";

interface Card {
  id: string;
  name: string;
  damage?: number;
  block?: number;
  hits?: number;
  speedCost: number;
  actionCost: number;
  type?: string;
  isGhost?: boolean;
  createdBy?: string;
  __sourceUnitId?: number;
  __uid?: string;
  [key: string]: unknown;
}

interface Enemy {
  id?: string;
  hp: number;
  deck?: string[];
  unitId?: number;
  [key: string]: unknown;
}

interface ModeWeights {
  aggro: number;
  turtle: number;
  balanced: number;
}

interface Mode {
  name: string;
  key: 'aggro' | 'turtle' | 'balanced';
  prefer: string;
}

interface CardStats {
  atk: number;
  def: number;
  dmg: number;
  blk: number;
  sp: number;
  en: number;
}

// 몬스터별 AI 모드 가중치
export const ENEMY_MODE_WEIGHTS: Record<string, ModeWeights> = {
  // Tier 1 - 일반 몬스터
  'ghoul': { aggro: 60, turtle: 10, balanced: 30 },
  'marauder': { aggro: 40, turtle: 20, balanced: 40 },
  'slurthim': { aggro: 30, turtle: 30, balanced: 40 },

  // Tier 2 - 중급 몬스터
  'deserter': { aggro: 50, turtle: 25, balanced: 25 },

  // Tier 3 - 보스 몬스터
  'slaughterer': { aggro: 80, turtle: 5, balanced: 15 },

  // 기본값 (알 수 없는 몬스터)
  'default': { aggro: 33, turtle: 33, balanced: 34 }
};

/**
 * 가중치 기반 랜덤 선택
 */
function weightedChoice(weights: ModeWeights): 'aggro' | 'turtle' | 'balanced' {
  const entries = Object.entries(weights) as Array<['aggro' | 'turtle' | 'balanced', number]>;
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) return key;
  }

  return entries[0][0];
}

/**
 * 적의 성향 결정 (몬스터별 가중치 적용)
 */
export function decideEnemyMode(enemy: Enemy | string | null = null): Mode {
  const MODES: Record<string, Mode> = {
    aggro: { name: '공격적', key: 'aggro', prefer: 'attack' },
    turtle: { name: '수비적', key: 'turtle', prefer: 'defense' },
    balanced: { name: '균형적', key: 'balanced', prefer: 'mixed' }
  };

  const enemyId = typeof enemy === 'string' ? enemy : enemy?.id;
  const weights = ENEMY_MODE_WEIGHTS[enemyId || ''] || ENEMY_MODE_WEIGHTS['default'];

  const selectedKey = weightedChoice(weights);
  return MODES[selectedKey];
}

/**
 * 배열에서 최대 maxCards개의 모든 조합 생성
 */
function combosUpToN(arr: Card[], maxCards: number = 3): Card[][] {
  const out: Card[][] = [];
  const n = arr.length;

  function generate(start: number, current: Card[]): void {
    if (current.length > 0) {
      out.push([...current]);
    }
    if (current.length >= maxCards) return;

    for (let i = start; i < n; i++) {
      current.push(arr[i]);
      generate(i + 1, current);
      current.pop();
    }
  }

  generate(0, []);
  return out;
}

/**
 * 적의 행동 생성
 */
export function generateEnemyActions(
  enemy: Enemy | null,
  mode: Mode | null,
  enemyEtherSlots: number = 0,
  maxCards: number = 3,
  minCards: number = 1
): Card[] {
  if (!enemy) return [];

  const extraEnergy = Math.max(0, minCards - 1) * 2;
  const energyBudget = BASE_PLAYER_ENERGY + (enemyEtherSlots || 0) + extraEnergy;
  const effectiveMaxSpeed = MAX_SPEED + Math.max(0, minCards - 1) * 10;

  let deck = (enemy.deck || [])
    .map(id => ENEMY_CARDS.find((c: Card) => c.id === id))
    .filter((c): c is Card => Boolean(c));

  if (deck.length === 0) {
    deck = [...ENEMY_CARDS];
  }

  if (deck.length < minCards) {
    const originalDeck = [...deck];
    while (deck.length < minCards * 2) {
      deck = [...deck, ...originalDeck];
    }
  }

  const allCombos = combosUpToN(deck, maxCards);
  const candidates = allCombos.filter(cards => {
    const sp = cards.reduce((s, c) => s + c.speedCost, 0);
    const en = cards.reduce((s, c) => s + c.actionCost, 0);
    return sp <= effectiveMaxSpeed && en <= energyBudget;
  });

  const validCandidates = candidates.filter(c => c.length >= minCards);
  const targetCandidates = validCandidates.length > 0 ? validCandidates : candidates;

  function stat(list: Card[]): CardStats {
    const atk = list.filter(c => c.type === 'attack').reduce((a, c) => a + c.actionCost, 0);
    const def = list.filter(c => c.type === 'general' || c.type === 'defense').reduce((a, c) => a + c.actionCost, 0);
    const dmg = list.filter(c => c.type === 'attack').reduce((a, c) => a + (c.damage || 0) * (c.hits || 1), 0);
    const blk = list.filter(c => c.type === 'general' || c.type === 'defense').reduce((a, c) => a + (c.block || 0), 0);
    const sp = list.reduce((a, c) => a + c.speedCost, 0);
    const en = list.reduce((a, c) => a + c.actionCost, 0);
    return { atk, def, dmg, blk, sp, en };
  }

  function satisfies(m: Mode | null, list: Card[]): boolean {
    const baseThreshold = Math.ceil((BASE_PLAYER_ENERGY + (enemyEtherSlots || 0)) / 2);
    const s = stat(list);
    if (m?.key === 'aggro') return s.atk >= baseThreshold;
    if (m?.key === 'turtle') return s.def >= baseThreshold;
    if (m?.key === 'balanced') return s.atk === s.def;
    return true;
  }

  function score(m: Mode | null, list: Card[]): number {
    const s = stat(list);
    let base = 0;
    if (m?.key === 'aggro') base = s.atk * 100 + s.dmg * 10 - s.sp;
    else if (m?.key === 'turtle') base = s.def * 100 + s.blk * 10 - s.sp;
    else base = (s.dmg + s.blk) * 10 - s.sp;

    base += list.length * 10000;
    return base;
  }

  const satisfied = targetCandidates.filter(c => satisfies(mode, c));

  if (satisfied.length > 0) {
    satisfied.sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length;
      const sa = score(mode, a), sb = score(mode, b);
      if (sa !== sb) return sb - sa;
      const saStat = stat(a), sbStat = stat(b);
      if (saStat.sp !== sbStat.sp) return saStat.sp - sbStat.sp;
      if (saStat.en !== sbStat.en) return saStat.en - sbStat.en;
      const aKey = a.map(c => c.id).join(','), bKey = b.map(c => c.id).join(',');
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
    return satisfied[0];
  }

  if (targetCandidates.length > 0) {
    targetCandidates.sort((a, b) => {
      if (a.length !== b.length) return b.length - a.length;
      return score(mode, b) - score(mode, a);
    });
    return targetCandidates[0];
  }

  const single = deck
    .filter(c => c.speedCost <= effectiveMaxSpeed && c.actionCost <= energyBudget)
    .sort((a, b) => a.speedCost - b.speedCost || a.actionCost - b.actionCost)[0];
  return single ? [single] : [];
}

/**
 * 적이 폭주(Overdrive)할지 결정
 */
function shouldEnemyOverdriveWithTurn(
  mode: Mode | null,
  actions: Card[] | null,
  etherPts: number,
  turnNumber: number = 1
): boolean {
  const slots = calculateEtherSlots(etherPts);
  if (slots <= 0) return false;
  if (turnNumber <= 1) return false;
  return false;
}

/**
 * 적이 폭주할지 결정 (Wrapper)
 */
export function shouldEnemyOverdrive(
  mode: Mode | null,
  actions: Card[] | null,
  etherPts: number,
  turnNumber: number = 1
): boolean {
  return shouldEnemyOverdriveWithTurn(mode, actions, etherPts, turnNumber);
}

/**
 * 적 행동에 __sourceUnitId 할당
 */
export function assignSourceUnitToActions(actions: Card[], units: Enemy[]): Card[] {
  if (!actions || actions.length === 0) return actions;
  if (!units || units.length === 0) return actions;

  const aliveUnits = units.filter(u => u.hp > 0);
  if (aliveUnits.length === 0) return actions;

  const unitCardUsage = new Map<number, Map<string, number>>();
  aliveUnits.forEach(u => unitCardUsage.set(u.unitId!, new Map()));

  return actions.map(card => {
    const candidateUnits = aliveUnits.filter(u => {
      if (!u.deck) return false;
      return u.deck.includes(card.id);
    });

    if (candidateUnits.length === 0) {
      return { ...card, __sourceUnitId: aliveUnits[0].unitId };
    }

    if (candidateUnits.length === 1) {
      return { ...card, __sourceUnitId: candidateUnits[0].unitId };
    }

    let minUsage = Infinity;
    let selectedUnit = candidateUnits[0];

    for (const unit of candidateUnits) {
      const usage = unitCardUsage.get(unit.unitId!)?.get(card.id) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        selectedUnit = unit;
      }
    }

    const usageMap = unitCardUsage.get(selectedUnit.unitId!);
    usageMap!.set(card.id, (usageMap!.get(card.id) || 0) + 1);

    return { ...card, __sourceUnitId: selectedUnit.unitId };
  });
}

/**
 * 다중 몬스터 유령카드 확장
 */
export function expandActionsWithGhosts(actions: Card[], units: Enemy[]): Card[] {
  if (!actions || actions.length === 0) return actions;
  if (!units || units.length === 0) return actions;

  const aliveUnits = units.filter(u => u.hp > 0);
  if (aliveUnits.length <= 1) {
    return assignSourceUnitToActions(actions, units);
  }

  const expandedActions: Card[] = [];
  let unitIndex = 0;

  for (const card of actions) {
    const primaryUnit = aliveUnits[unitIndex % aliveUnits.length];
    const realCard: Card = {
      ...card,
      __sourceUnitId: primaryUnit.unitId,
      __uid: `real_${card.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    };
    expandedActions.push(realCard);

    for (let i = 1; i < aliveUnits.length; i++) {
      const ghostUnit = aliveUnits[(unitIndex + i) % aliveUnits.length];
      const ghostCard: Card = {
        ...card,
        isGhost: true,
        __sourceUnitId: ghostUnit.unitId,
        __uid: `ghost_${card.id}_${ghostUnit.unitId}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        createdBy: card.id
      };
      expandedActions.push(ghostCard);
    }

    unitIndex++;
  }

  return expandedActions;
}
