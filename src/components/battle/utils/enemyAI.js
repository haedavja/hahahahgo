/**
 * enemyAI.js
 *
 * 적 AI 행동 결정 시스템
 */

import { MAX_SPEED, BASE_PLAYER_ENERGY, ENEMY_CARDS } from "../battleData";
import { choice } from "./battleUtils";
import { calculateEtherSlots } from "../../../lib/etherUtils";

// =====================
// 몬스터별 AI 모드 가중치
// =====================
// { aggro, turtle, balanced } - 합계가 100일 필요 없음 (상대적 가중치)
export const ENEMY_MODE_WEIGHTS = {
  // Tier 1 - 일반 몬스터
  'ghoul': { aggro: 60, turtle: 10, balanced: 30 },       // 공격적인 언데드
  'marauder': { aggro: 40, turtle: 20, balanced: 40 },    // 균형잡힌 약탈자
  'slurthim': { aggro: 30, turtle: 30, balanced: 40 },    // 디버프 위주

  // Tier 2 - 중급 몬스터
  'deserter': { aggro: 50, turtle: 25, balanced: 25 },    // 전술적 전투원

  // Tier 3 - 보스 몬스터
  'slaughterer': { aggro: 80, turtle: 5, balanced: 15 },  // 극공격형 보스

  // 기본값 (알 수 없는 몬스터)
  'default': { aggro: 33, turtle: 33, balanced: 34 }
};

/**
 * 가중치 기반 랜덤 선택
 * @param {Object} weights - { option: weight } 형태
 * @returns {string} 선택된 옵션 키
 */
function weightedChoice(weights) {
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of entries) {
    random -= weight;
    if (random <= 0) return key;
  }

  return entries[0][0]; // fallback
}

/**
 * 적의 성향 결정 (몬스터별 가중치 적용)
 * @param {Object|string} enemy - 적 객체 또는 적 ID
 * @returns {Object} 선택된 모드 { name, key, prefer }
 */
export function decideEnemyMode(enemy = null) {
  const MODES = {
    aggro: { name: '공격적', key: 'aggro', prefer: 'attack' },
    turtle: { name: '수비적', key: 'turtle', prefer: 'defense' },
    balanced: { name: '균형적', key: 'balanced', prefer: 'mixed' }
  };

  // 적 ID 추출
  const enemyId = typeof enemy === 'string' ? enemy : enemy?.id;
  const weights = ENEMY_MODE_WEIGHTS[enemyId] || ENEMY_MODE_WEIGHTS['default'];

  // 가중치 기반 선택
  const selectedKey = weightedChoice(weights);
  return MODES[selectedKey];
}

/**
 * 배열에서 최대 maxCards개의 모든 조합 생성
 * @param {Array} arr - 카드 배열
 * @param {number} maxCards - 최대 카드 수
 * @returns {Array} 모든 조합의 배열
 */
function combosUpToN(arr, maxCards = 3) {
  const out = [];
  const n = arr.length;

  function generate(start, current) {
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
 * @param {Object} enemy - 적 객체
 * @param {Object} mode - 결정된 모드
 * @param {number} enemyEtherSlots - 적의 에테르 슬롯
 * @param {number} maxCards - 최대 카드 수
 * @param {number} minCards - 최소 카드 수
 * @returns {Array} 선택된 카드 배열
 */
export function generateEnemyActions(enemy, mode, enemyEtherSlots = 0, maxCards = 3, minCards = 1) {
  if (!enemy) return [];

  // Energy boost: give enemies extra energy based on count
  const extraEnergy = Math.max(0, minCards - 1) * 2;
  const energyBudget = BASE_PLAYER_ENERGY + (enemyEtherSlots || 0) + extraEnergy;

  // Speed limit relaxation: allow more speed for multiple enemies
  const effectiveMaxSpeed = MAX_SPEED + Math.max(0, minCards - 1) * 10;

  let deck = (enemy.deck || [])
    .map(id => ENEMY_CARDS.find(c => c.id === id))
    .filter(Boolean);
  if (deck.length === 0) {
    // 덱 정보가 없을 때는 기본 적 카드 풀에서 임의 선택
    deck = [...ENEMY_CARDS];
  }

  // Ensure deck has enough cards to meet minCards requirement
  // If deck is too small, duplicate cards until we have at least minCards * 2 (to give some variety)
  if (deck.length < minCards) {
    const originalDeck = [...deck];
    while (deck.length < minCards * 2) {
      deck = [...deck, ...originalDeck];
    }
  }

  // Generate all valid combinations
  const allCombos = combosUpToN(deck, maxCards);
  const candidates = allCombos.filter(cards => {
    const sp = cards.reduce((s, c) => s + c.speedCost, 0);
    const en = cards.reduce((s, c) => s + c.actionCost, 0);
    return sp <= effectiveMaxSpeed && en <= energyBudget;
  });

  // Filter candidates that meet minimum card count
  const validCandidates = candidates.filter(c => c.length >= minCards);

  const targetCandidates = validCandidates.length > 0 ? validCandidates : candidates;

  function stat(list) {
    const atk = list.filter(c => c.type === 'attack').reduce((a, c) => a + c.actionCost, 0);
    const def = list.filter(c => c.type === 'general' || c.type === 'defense').reduce((a, c) => a + c.actionCost, 0);
    const dmg = list.filter(c => c.type === 'attack').reduce((a, c) => a + (c.damage || 0) * (c.hits || 1), 0);
    const blk = list.filter(c => c.type === 'general' || c.type === 'defense').reduce((a, c) => a + (c.block || 0), 0);
    const sp = list.reduce((a, c) => a + c.speedCost, 0);
    const en = list.reduce((a, c) => a + c.actionCost, 0);
    return { atk, def, dmg, blk, sp, en };
  }

  function satisfies(m, list) {
    // Use BASE energy threshold (not boosted) to avoid overly strict filtering
    const baseThreshold = Math.ceil((BASE_PLAYER_ENERGY + (enemyEtherSlots || 0)) / 2);
    const s = stat(list);
    if (m?.key === 'aggro') return s.atk >= baseThreshold;
    if (m?.key === 'turtle') return s.def >= baseThreshold;
    if (m?.key === 'balanced') return s.atk === s.def;
    return true;
  }

  function score(m, list) {
    const s = stat(list);
    let base = 0;
    if (m?.key === 'aggro') base = s.atk * 100 + s.dmg * 10 - s.sp;
    else if (m?.key === 'turtle') base = s.def * 100 + s.blk * 10 - s.sp;
    else base = (s.dmg + s.blk) * 10 - s.sp;

    // HUGE bonus for card count
    base += list.length * 10000;

    return base;
  }

  const satisfied = targetCandidates.filter(c => satisfies(mode, c));

  if (satisfied.length > 0) {
    satisfied.sort((a, b) => {
      // Priority 1: MORE cards first (reversed from original)
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
      // Priority 1: MORE cards first
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
 * @param {Object} mode - 적 모드
 * @param {Array} actions - 적 행동 배열
 * @param {number} etherPts - 에테르 포인트
 * @param {number} turnNumber - 턴 번호
 * @returns {boolean} 폭주 여부
 */
function shouldEnemyOverdriveWithTurn(mode, actions, etherPts, turnNumber = 1) {
  const slots = calculateEtherSlots(etherPts);
  if (slots <= 0) return false;
  if (turnNumber <= 1) return false;
  // 몬스터 폭주는 패턴 확정 전까지 금지
  return false;
  // eslint-disable-next-line no-unreachable
  if (!mode) return false;
  if (mode.key === 'aggro') return true;
  if (mode.key === 'balanced') return (actions || []).some(c => c.type === 'attack');
  return false;
}

/**
 * 적이 폭주할지 결정 (Wrapper)
 * @param {Object} mode - 적 모드
 * @param {Array} actions - 적 행동 배열
 * @param {number} etherPts - 에테르 포인트
 * @param {number} turnNumber - 턴 번호
 * @returns {boolean} 폭주 여부
 */
export function shouldEnemyOverdrive(mode, actions, etherPts, turnNumber = 1) {
  return shouldEnemyOverdriveWithTurn(mode, actions, etherPts, turnNumber);
}

/**
 * 적 행동에 __sourceUnitId 할당
 * 각 카드가 어떤 유닛에서 나왔는지 추적 (방어력 개별 적용용)
 * @param {Array} actions - 생성된 적 행동 배열
 * @param {Array} units - 적 유닛 배열 (각 유닛은 deck, unitId 보유)
 * @returns {Array} __sourceUnitId가 할당된 행동 배열
 */
export function assignSourceUnitToActions(actions, units) {
  if (!actions || actions.length === 0) return actions;
  if (!units || units.length === 0) return actions;

  // 살아있는 유닛만 고려
  const aliveUnits = units.filter(u => u.hp > 0);
  if (aliveUnits.length === 0) return actions;

  // 유닛당 카드 사용 카운터 (같은 카드를 여러 유닛이 가질 수 있으므로)
  const unitCardUsage = new Map();
  aliveUnits.forEach(u => unitCardUsage.set(u.unitId, new Map()));

  return actions.map(card => {
    // 이 카드를 덱에 가지고 있는 유닛 찾기
    const candidateUnits = aliveUnits.filter(u => {
      if (!u.deck) return false;
      const deckCardIds = u.deck;
      return deckCardIds.includes(card.id);
    });

    if (candidateUnits.length === 0) {
      // 어떤 유닛의 덱에도 없는 카드: 첫 번째 살아있는 유닛에 할당
      return { ...card, __sourceUnitId: aliveUnits[0].unitId };
    }

    if (candidateUnits.length === 1) {
      // 한 유닛만 이 카드를 가짐
      return { ...card, __sourceUnitId: candidateUnits[0].unitId };
    }

    // 여러 유닛이 같은 카드를 가진 경우: 아직 덜 사용한 유닛에 할당
    let minUsage = Infinity;
    let selectedUnit = candidateUnits[0];

    for (const unit of candidateUnits) {
      const usage = unitCardUsage.get(unit.unitId)?.get(card.id) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        selectedUnit = unit;
      }
    }

    // 사용 카운터 증가
    const usageMap = unitCardUsage.get(selectedUnit.unitId);
    usageMap.set(card.id, (usageMap.get(card.id) || 0) + 1);

    return { ...card, __sourceUnitId: selectedUnit.unitId };
  });
}

/**
 * 다중 몬스터 유령카드 확장
 * 실제 카드 1장당 (유닛 수 - 1)개의 유령 복사본 생성
 *
 * 예: 약탈자 3마리, 실제 카드 [공격1]
 * → [공격1 (유닛1)] + [공격1 👻 (유닛2)] + [공격1 👻 (유닛3)]
 *
 * @param {Array} actions - 실제 카드 배열
 * @param {Array} units - 적 유닛 배열
 * @returns {Array} 유령카드가 포함된 확장 배열
 */
export function expandActionsWithGhosts(actions, units) {
  if (!actions || actions.length === 0) return actions;
  if (!units || units.length === 0) return actions;

  // 살아있는 유닛만 고려
  const aliveUnits = units.filter(u => u.hp > 0);
  if (aliveUnits.length <= 1) {
    // 유닛이 1개 이하면 유령카드 불필요
    return assignSourceUnitToActions(actions, units);
  }

  const expandedActions = [];
  let unitIndex = 0;

  for (const card of actions) {
    // 첫 번째 유닛에 실제 카드 할당
    const primaryUnit = aliveUnits[unitIndex % aliveUnits.length];
    const realCard = {
      ...card,
      __sourceUnitId: primaryUnit.unitId,
      __uid: `real_${card.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    };
    expandedActions.push(realCard);

    // 나머지 유닛에 유령카드 할당
    for (let i = 1; i < aliveUnits.length; i++) {
      const ghostUnit = aliveUnits[(unitIndex + i) % aliveUnits.length];
      const ghostCard = {
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
