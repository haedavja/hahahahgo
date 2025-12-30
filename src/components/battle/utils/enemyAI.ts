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

import type { AICard, AIEnemy, AIModeWeights, AIMode, AICardStats } from '../../../types';
import { MAX_SPEED, BASE_PLAYER_ENERGY, ENEMY_CARDS } from "../battleData";
import { choice } from "./battleUtils";
import { calculateEtherSlots } from "../../../lib/etherUtils";
import { generateTimestampUid } from "../../../lib/randomUtils";

/**
 * 몬스터별 AI 모드 가중치
 * { aggro, turtle, balanced } - 상대적 가중치로 모드 선택 확률 결정
 */
export const ENEMY_MODE_WEIGHTS: Record<string, AIModeWeights> = {
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
function weightedChoice(weights: AIModeWeights): 'aggro' | 'turtle' | 'balanced' {
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
export function decideEnemyMode(enemy: AIEnemy | string | null = null): AIMode {
  const MODES: Record<string, AIMode> = {
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
function combosUpToN(arr: AICard[], maxCards: number = 3): AICard[][] {
  const out: AICard[][] = [];
  const n = arr.length;

  function generate(start: number, current: AICard[]): void {
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
 * enemy는 EnemyUnit/AIEnemy 호환, mode는 AIMode 객체 또는 문자열 허용
 */
export function generateEnemyActions(
  enemy: AIEnemy | null,
  mode: AIMode | string | null,
  enemyEtherSlots: number = 0,
  maxCards: number = 3,
  minCards: number = 1
): AICard[] {
  if (!enemy) return [];

  const extraEnergy = Math.max(0, minCards - 1) * 2;
  const energyBudget = BASE_PLAYER_ENERGY + (enemyEtherSlots || 0) + extraEnergy;
  const effectiveMaxSpeed = MAX_SPEED + Math.max(0, minCards - 1) * 10;

  let deck = (enemy.deck || [])
    .map(id => ENEMY_CARDS.find((c: AICard) => c.id === id))
    .filter(Boolean) as AICard[];

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
    const sp = cards.reduce((s, c) => s + (c.speedCost || 0), 0);
    const en = cards.reduce((s, c) => s + (c.actionCost || 0), 0);
    return sp <= effectiveMaxSpeed && en <= energyBudget;
  });

  const validCandidates = candidates.filter(c => c.length >= minCards);
  const targetCandidates = validCandidates.length > 0 ? validCandidates : candidates;

  function stat(list: AICard[]): AICardStats {
    const atk = list.filter(c => c.type === 'attack').reduce((a, c) => a + (c.actionCost || 0), 0);
    const def = list.filter(c => c.type === 'general' || c.type === 'defense').reduce((a, c) => a + (c.actionCost || 0), 0);
    const dmg = list.filter(c => c.type === 'attack').reduce((a, c) => a + (c.damage || 0) * (c.hits || 1), 0);
    const blk = list.filter(c => c.type === 'general' || c.type === 'defense').reduce((a, c) => a + (c.block || 0), 0);
    const sp = list.reduce((a, c) => a + (c.speedCost || 0), 0);
    const en = list.reduce((a, c) => a + (c.actionCost || 0), 0);
    return { atk, def, dmg, blk, sp, en };
  }

  // mode 키 추출 (객체면 key, 문자열이면 그대로)
  const getModeKey = (m: AIMode | string | null): string | undefined => {
    if (!m) return undefined;
    if (typeof m === 'string') return m;
    return m.key;
  };

  function satisfies(m: AIMode | string | null, list: AICard[]): boolean {
    const baseThreshold = Math.ceil((BASE_PLAYER_ENERGY + (enemyEtherSlots || 0)) / 2);
    const s = stat(list);
    const key = getModeKey(m);
    if (key === 'aggro') return s.atk >= baseThreshold;
    if (key === 'turtle') return s.def >= baseThreshold;
    if (key === 'balanced') return s.atk === s.def;
    return true;
  }

  function score(m: AIMode | string | null, list: AICard[]): number {
    const s = stat(list);
    let base = 0;
    const key = getModeKey(m);
    if (key === 'aggro') base = s.atk * 100 + s.dmg * 10 - s.sp;
    else if (key === 'turtle') base = s.def * 100 + s.blk * 10 - s.sp;
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
    .filter(c => (c.speedCost ?? 0) <= effectiveMaxSpeed && (c.actionCost ?? 0) <= energyBudget)
    .sort((a, b) => (a.speedCost ?? 0) - (b.speedCost ?? 0) || (a.actionCost ?? 0) - (b.actionCost ?? 0))[0];
  return single ? [single] : [];
}

/**
 * 적이 폭주(Overdrive)할지 결정
 */
function shouldEnemyOverdriveWithTurn(
  mode: AIMode | string | null,
  actions: AICard[] | null,
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
 * mode는 AIMode 객체 또는 문자열 허용
 */
export function shouldEnemyOverdrive(
  mode: AIMode | string | null,
  actions: AICard[] | null,
  etherPts: number,
  turnNumber: number = 1
): boolean {
  return shouldEnemyOverdriveWithTurn(mode, actions, etherPts, turnNumber);
}

/**
 * 적 행동에 __sourceUnitId 할당
 */
export function assignSourceUnitToActions(actions: AICard[], units: AIEnemy[]): AICard[] {
  if (!actions || actions.length === 0) return actions;
  if (!units || units.length === 0) return actions;

  const aliveUnits = units.filter(u => (u.hp ?? 0) > 0);
  if (aliveUnits.length === 0) return actions;

  const unitCardUsage = new Map<number, Map<string, number>>();
  aliveUnits.forEach(u => unitCardUsage.set(u.unitId!, new Map()));

  return actions.map(card => {
    const candidateUnits = aliveUnits.filter(u => {
      if (!u.deck) return false;
      return u.deck.includes(card.id!);
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
      const usage = unitCardUsage.get(unit.unitId!)?.get(card.id!) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        selectedUnit = unit;
      }
    }

    const usageMap = unitCardUsage.get(selectedUnit.unitId!);
    if (usageMap) {
      usageMap.set(card.id!, (usageMap.get(card.id!) || 0) + 1);
    }

    return { ...card, __sourceUnitId: selectedUnit.unitId };
  });
}

/**
 * 다중 몬스터 유령카드 확장
 */
export function expandActionsWithGhosts(actions: AICard[], units: AIEnemy[]): AICard[] {
  if (!actions || actions.length === 0) return actions;
  if (!units || units.length === 0) return actions;

  const aliveUnits = units.filter(u => (u.hp ?? 0) > 0);
  if (aliveUnits.length <= 1) {
    return assignSourceUnitToActions(actions, units);
  }

  const expandedActions: AICard[] = [];
  let unitIndex = 0;

  for (const card of actions) {
    const primaryUnit = aliveUnits[unitIndex % aliveUnits.length];
    const realCard: AICard = {
      ...card,
      __sourceUnitId: primaryUnit.unitId,
      __uid: generateTimestampUid(`real_${card.id}`)
    };
    expandedActions.push(realCard);

    for (let i = 1; i < aliveUnits.length; i++) {
      const ghostUnit = aliveUnits[(unitIndex + i) % aliveUnits.length];
      const ghostCard: AICard = {
        ...card,
        isGhost: true,
        __sourceUnitId: ghostUnit.unitId,
        __uid: generateTimestampUid(`ghost_${card.id}_${ghostUnit.unitId}`),
        createdBy: card.id
      };
      expandedActions.push(ghostCard);
    }

    unitIndex++;
  }

  return expandedActions;
}
