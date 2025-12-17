/**
 * enemyAI.js
 *
 * 적 AI 행동 결정 시스템
 */

import { MAX_SPEED, BASE_PLAYER_ENERGY, ENEMY_CARDS } from "../battleData";
import { choice } from "./battleUtils";
import { calculateEtherSlots } from "../../../lib/etherUtils";

/**
 * 적의 성향 결정
 * @returns {Object} 선택된 모드 { name, key, prefer }
 */
export function decideEnemyMode() {
  return choice([
    { name: '공격적', key: 'aggro', prefer: 'attack' },
    { name: '수비적', key: 'turtle', prefer: 'defense' },
    { name: '균형적', key: 'balanced', prefer: 'mixed' }
  ]);
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
    const def = list.filter(c => c.type === 'defense').reduce((a, c) => a + c.actionCost, 0);
    const dmg = list.filter(c => c.type === 'attack').reduce((a, c) => a + (c.damage || 0) * (c.hits || 1), 0);
    const blk = list.filter(c => c.type === 'defense').reduce((a, c) => a + (c.block || 0), 0);
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
