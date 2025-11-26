import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "./legacy-battle.css";
import { playHitSound, playBlockSound, playCardSubmitSound, playProceedSound } from "../../lib/soundUtils";
import {
  MAX_SPEED,
  DEFAULT_PLAYER_MAX_SPEED,
  DEFAULT_ENEMY_MAX_SPEED,
  generateSpeedTicks,
  BASE_PLAYER_ENERGY,
  MAX_SUBMIT_CARDS,
  ETHER_THRESHOLD,
  CARDS as BASE_PLAYER_CARDS,
  ENEMY_CARDS as BASE_ENEMY_CARDS,
  ENEMIES,
  TRAITS,
} from "./battleData";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { useGameStore } from "../../state/gameStore";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_EFFECT, applyRelicEffects, applyRelicComboMultiplier } from "../../lib/relics";
import { applyAgility } from "../../lib/agilityUtils";

// 유물 희귀도별 색상
const RELIC_RARITY_COLORS = {
  [RELIC_RARITIES.COMMON]: '#94a3b8',
  [RELIC_RARITIES.RARE]: '#60a5fa',
  [RELIC_RARITIES.SPECIAL]: '#a78bfa',
  [RELIC_RARITIES.LEGENDARY]: '#fbbf24',
};
import {
  calculatePassiveEffects,
  applyCombatStartEffects,
  applyCombatEndEffects,
  applyTurnStartEffects,
  applyTurnEndEffects,
  applyCardPlayedEffects,
  applyDamageTakenEffects,
  calculateEtherGain as calculateRelicEtherGain
} from "../../lib/relicEffects";

const STUN_RANGE = 5; // 기절 효과 범위(타임라인 기준)

// Lucide icons as simple SVG components
const Sword = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
  </svg>
);

const Shield = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const Heart = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const Zap = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const Flame = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const Clock = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const Skull = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
    <path d="M8 20v2h8v-2M12.5 17l-.5-1-.5 1h1z" />
    <path d="M16 18a8 8 0 1 0-8 0v2h8v-2z" />
  </svg>
);

const X = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronUp = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDown = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Play = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const StepForward = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

const RefreshCw = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ICON_MAP = {
  sword: Sword,
  shield: Shield,
  flame: Flame,
  heart: Heart,
  zap: Zap,
  clock: Clock,
};
const CARDS = BASE_PLAYER_CARDS.map(card => ({
  ...card,
  icon: ICON_MAP[card.iconKey] || (card.type === 'attack' ? Sword : Shield),
}));
const ENEMY_CARDS = BASE_ENEMY_CARDS.map(card => ({
  ...card,
  icon: ICON_MAP[card.iconKey] || (card.type === 'attack' ? Sword : Shield),
}));

// =====================
// Utilities
// =====================
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// =====================
// 특성 효과 헬퍼 함수
// =====================
function hasTrait(card, traitId) {
  return card.traits && card.traits.includes(traitId);
}

function applyTraitModifiers(card, context = {}) {
  let modifiedCard = { ...card };

  // 강골 (strongbone): 피해량/방어력 25% 증가
  if (hasTrait(card, 'strongbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.25);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.25);
  }

  // 약골 (weakbone): 피해량/방어력 20% 감소
  if (hasTrait(card, 'weakbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 0.8);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 0.8);
  }

  // 파괴자 (destroyer): 공격력 50% 증가
  if (hasTrait(card, 'destroyer') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
  }

  // 도살 (slaughter): 기본피해량 75% 증가
  if (hasTrait(card, 'slaughter') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.75);
  }

  // 정점 (pinnacle): 피해량 2.5배
  if (hasTrait(card, 'pinnacle') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 2.5);
  }

  // 협동 (cooperation): 조합 대상이 되면 50% 추가 보너스
  if (hasTrait(card, 'cooperation') && context.isInCombo) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.5);
  }

  // 신속함 (swift): 속도 코스트 감소 (약 15% 성능 기준)
  if (hasTrait(card, 'swift')) {
    modifiedCard.speedCost = Math.max(1, Math.ceil(modifiedCard.speedCost * 0.75));
  }

  // 굼뜸 (slow): 속도 코스트 증가
  if (hasTrait(card, 'slow')) {
    modifiedCard.speedCost = Math.ceil(modifiedCard.speedCost * 1.33);
  }

  // 숙련 (mastery): 사용할수록 시간 감소 (context.usageCount 필요)
  if (hasTrait(card, 'mastery') && context.usageCount) {
    modifiedCard.speedCost = Math.max(1, modifiedCard.speedCost - (context.usageCount * 2));
  }

  // 싫증 (boredom): 사용할수록 시간 증가
  if (hasTrait(card, 'boredom') && context.usageCount) {
    modifiedCard.speedCost = modifiedCard.speedCost + (context.usageCount * 2);
  }

  return modifiedCard;
}

// 힘 스탯을 카드에 적용하는 함수
function applyStrengthToCard(card, strength = 0, isPlayerCard = true) {
  if (!isPlayerCard || strength === 0) return card;

  const modifiedCard = { ...card };

  // 공격 카드: 힘 1당 공격력 +1 (음수 허용, 최소 0)
  if (modifiedCard.damage && modifiedCard.type === 'attack') {
    modifiedCard.damage = Math.max(0, modifiedCard.damage + strength);
  }

  // 방어 카드: 힘 1당 방어력 +1 (음수 허용, 최소 0)
  if (modifiedCard.block && modifiedCard.type === 'defense') {
    modifiedCard.block = Math.max(0, modifiedCard.block + strength);
  }

  return modifiedCard;
}

// 손패 전체에 힘 스탯 적용
function applyStrengthToHand(hand, strength = 0) {
  if (strength === 0) return hand;
  return hand.map(card => applyStrengthToCard(card, strength, true));
}

function sortCombinedOrderStablePF(playerCards, enemyCards, playerAgility = 0, enemyAgility = 0) {
  const q = []; let ps = 0, es = 0;
  (playerCards || []).forEach((c, idx) => {
    const finalSpeed = applyAgility(c.speedCost, playerAgility);
    ps += finalSpeed;
    q.push({ actor: 'player', card: c, sp: ps, idx, originalSpeed: c.speedCost, finalSpeed });
  });
  (enemyCards || []).forEach((c, idx) => {
    const finalSpeed = applyAgility(c.speedCost, enemyAgility);
    es += finalSpeed;
    q.push({ actor: 'enemy', card: c, sp: es, idx, originalSpeed: c.speedCost, finalSpeed });
  });
  q.sort((a, b) => {
    if (a.sp !== b.sp) return a.sp - b.sp;
    if (a.actor !== b.actor) return a.actor === 'player' ? -1 : 1;
    return a.idx - b.idx;
  });
  return q;
}

// =====================
// Poker combo helpers
// =====================
function detectPokerCombo(cards) {
  if (!cards || cards.length < 2) return null;
  const freq = new Map();
  for (const c of cards) { freq.set(c.actionCost, (freq.get(c.actionCost) || 0) + 1); }
  const counts = Array.from(freq.values());
  const have = (n) => counts.includes(n);
  const keysByCount = (n) => new Set(Array.from(freq.entries()).filter(([k, v]) => v === n).map(([k]) => Number(k)));

  const allAttack = cards.every(c => c.type === 'attack');
  const allDefense = cards.every(c => c.type === 'defense');
  const isFlush = (allAttack || allDefense) && cards.length >= 4;

  let result = null;
  if (have(5)) result = { name: '파이브카드', bonusKeys: keysByCount(5) };
  else if (have(4)) result = { name: '포카드', bonusKeys: keysByCount(4) };
  else if (have(3) && have(2)) {
    const b = new Set([...keysByCount(3), ...keysByCount(2)]);
    result = { name: '풀하우스', bonusKeys: b };
  }
  else if (isFlush) result = { name: '플러쉬', bonusKeys: null };
  else {
    const pairKeys = keysByCount(2);
    if (pairKeys.size >= 2) result = { name: '투페어', bonusKeys: pairKeys };
    else if (have(3)) result = { name: '트리플', bonusKeys: keysByCount(3) };
    else if (have(2)) result = { name: '페어', bonusKeys: pairKeys };
  }

  // 디버깅: 조합 감지 로그 (반환값 포함)
  console.log('[detectPokerCombo] 결과:', {
    cardCount: cards.length,
    cards: cards.map(c => ({ name: c.name, type: c.type, cost: c.actionCost })),
    freq: Object.fromEntries(freq),
    counts,
    allAttack,
    allDefense,
    isFlush,
    pairCount: keysByCount(2).size,
    '>>> 반환된 조합': result?.name || 'null'
  });

  return result;
}

function applyPokerBonus(cards, combo) {
  // 조합 보너스 기능 삭제됨 - 이제 조합은 에테르 배율만 제공
  if (!combo) return cards;
  return cards.map(c => {
    // _combo 태그만 추가 (공격력/방어력 보너스는 제거)
    if (combo.bonusKeys && combo.bonusKeys.has(c.actionCost)) {
      return { ...c, _combo: combo.name };
    }
    return c;
  });
}

const etherSlots = (pts) => calculateEtherSlots(pts || 0); // 인플레이션 적용
function addEther(pts, add) { return (pts || 0) + (add || 0); }

// 에테르 Deflation: 같은 조합을 반복할수록 획득량 감소
// 1번: 100%, 2번: 50%, 3번: 25%, ... 0에 수렴
// deflationMultiplier: 추후 카드/아이템으로 조정 가능 (기본값 0.5)
function applyEtherDeflation(baseGain, comboName, comboUsageCount, deflationMultiplier = 0.5) {
  const usageCount = comboUsageCount[comboName] || 0;
  const multiplier = Math.pow(deflationMultiplier, usageCount);
  return {
    gain: Math.round(baseGain * multiplier),
    multiplier: multiplier,
    usageCount: usageCount
  };
}

const COMBO_MULTIPLIERS = {
  '페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러쉬': 3.25,
  '풀하우스': 3.5,
  '포카드': 4,
  '파이브카드': 5,
};
const BASE_ETHER_PER_CARD = 10;
function calculateComboEtherGain({ cardCount = 0, comboName = null, comboUsageCount = {}, extraMultiplier = 1 }) {
  const baseGain = Math.round(cardCount * BASE_ETHER_PER_CARD);
  const comboMult = comboName ? (COMBO_MULTIPLIERS[comboName] || 1) : 1;
  const multiplied = Math.round(baseGain * comboMult * extraMultiplier);
  const deflated = comboName
    ? applyEtherDeflation(multiplied, comboName, comboUsageCount)
    : { gain: multiplied, multiplier: 1 };
  const deflationPct = deflated.multiplier < 1 ? Math.round((1 - deflated.multiplier) * 100) : 0;
  return {
    gain: deflated.gain,
    baseGain,
    comboMult: comboMult * extraMultiplier,
    deflationPct,
    deflationMult: deflated.multiplier,
  };
}

// =====================
// Combat Logic
// =====================
function applyAction(state, actor, card) {
  const A = actor === 'player' ? state.player : state.enemy;
  const B = actor === 'player' ? state.enemy : state.player;
  const events = [];

  if (card.type === 'defense') {
    const prev = A.block || 0;
    const strengthBonus = A.strength || 0;
    const added = (card.block || 0) + strengthBonus;
    const after = prev + added;
    A.def = true; A.block = after;
    if (card.counter !== undefined) { A.counter = card.counter || 0; }
    const who = actor === 'player' ? '플레이어' : '몬스터';
    const msg = prev === 0 ? `${who} • 🛡️ +${added} = ${after}` : `${who} • 🛡️ ${prev} + ${added} = ${after}`;
    events.push({ actor, card: card.name, type: 'defense', msg });
    state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
    return { dealt: 0, taken: 0, events };
  }

  if (card.type === 'attack') {
    let totalDealt = 0, totalTaken = 0;
    const hits = card.hits || 1;

    for (let i = 0; i < hits; i++) {
      const base = card.damage;
      const strengthBonus = A.strength || 0; // Strength 보너스
      const boost = (A.etherOverdriveActive) ? 2 : 1;
      let dmg = (base + strengthBonus) * boost; // base에 strength 추가 후 boost 적용

      // 분쇄 (crush) 특성: 방어력에 2배 피해
      const crushMultiplier = hasTrait(card, 'crush') ? 2 : 1;

      if (B.def && (B.block || 0) > 0) {
        const beforeBlock = B.block;
        const effectiveDmg = dmg * crushMultiplier; // 분쇄 적용
        if (effectiveDmg < beforeBlock) {
          const remaining = beforeBlock - effectiveDmg;
          B.block = remaining; dmg = 0;
          A.vulnMult = 1 + (remaining * 0.5); A.vulnTurns = 1;
          const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
          const formula = `(방어력 ${beforeBlock} - 공격력 ${base}${boost > 1 ? '×2' : ''}${crushText} = ${remaining})`;
          const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 성공 ${formula} + 취약 ×${A.vulnMult.toFixed(1)}`;
          events.push({ actor, card: card.name, type: 'blocked', msg });
          state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
        } else {
          const blocked = beforeBlock;
          const remained = Math.max(0, effectiveDmg - blocked);
          const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
          const formula = `(방어력 ${blocked} - 공격력 ${base}${boost > 1 ? '×2' : ''}${crushText} = 0)`;
          B.block = 0;
          const vulnMul = (B.vulnMult && B.vulnMult > 1) ? B.vulnMult : 1;
          const finalDmg = Math.floor(remained * vulnMul);
          const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
          const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 ${blocked} ${formula}, 관통 ${finalDmg} (체력 ${beforeHP} -> ${B.hp})`;
          events.push({ actor, card: card.name, type: 'pierce', dmg: finalDmg, beforeHP, afterHP: B.hp, msg });
          state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
          if (B.counter && finalDmg > 0) {
            const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
            const cmsg = `${actor === 'player' ? '몬스터 -> 플레이어' : '플레이어 -> 몬스터'} • 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
            events.push({ actor: 'counter', value: B.counter, msg: cmsg });
            state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${cmsg}`);
          }
          totalDealt += finalDmg;
        }
      } else {
        const vulnMul = (B.vulnMult && B.vulnMult > 1) ? B.vulnMult : 1;
        const finalDmg = Math.floor(dmg * vulnMul);
        const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
        const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 데미지 ${finalDmg}${boost > 1 ? ' (에테르 폭주×2)' : ''} (체력 ${beforeHP} -> ${B.hp})`;
        events.push({ actor, card: card.name, type: 'hit', dmg: finalDmg, beforeHP, afterHP: B.hp, msg });
        state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
        if (B.counter && finalDmg > 0) {
          const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
          const cmsg = `${actor === 'player' ? '몬스터→플레이어' : '플레이어→몬스터'} • 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
          events.push({ actor: 'counter', value: B.counter, msg: cmsg });
          state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${cmsg}`);
        }
        totalDealt += finalDmg;
      }
    }
    return { dealt: totalDealt, taken: totalTaken, events };
  }

  return { dealt: 0, taken: 0, events };
}

// AI: 성향 결정 & 행동 생성
function decideEnemyMode() {
  return choice([
    { name: '공격적', key: 'aggro', prefer: 'attack' },
    { name: '수비적', key: 'turtle', prefer: 'defense' },
    { name: '균형적', key: 'balanced', prefer: 'mixed' }
  ]);
}

function combosUpTo3(arr) {
  const out = []; const n = arr.length;
  for (let i = 0; i < n; i++) {
    out.push([arr[i]]);
    for (let j = i + 1; j < n; j++) {
      out.push([arr[i], arr[j]]);
      for (let k = j + 1; k < n; k++) out.push([arr[i], arr[j], arr[k]]);
    }
  }
  return out;
}

function generateEnemyActions(enemy, mode, enemyEtherSlots = 0) {
  if (!enemy) return [];
  const energyBudget = BASE_PLAYER_ENERGY + (enemyEtherSlots || 0);
  const deck = (enemy.deck || [])
    .map(id => ENEMY_CARDS.find(c => c.id === id))
    .filter(Boolean);
  if (deck.length === 0) return [];

  const half = Math.ceil(energyBudget / 2);
  const candidates = combosUpTo3(deck).filter(cards => {
    const sp = cards.reduce((s, c) => s + c.speedCost, 0);
    const en = cards.reduce((s, c) => s + c.actionCost, 0);
    return sp <= MAX_SPEED && en <= energyBudget;
  });

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
    const s = stat(list);
    if (m?.key === 'aggro') return s.atk >= half;
    if (m?.key === 'turtle') return s.def >= half;
    if (m?.key === 'balanced') return s.atk === s.def;
    return true;
  }

  function score(m, list) {
    const s = stat(list);
    let base = 0;
    if (m?.key === 'aggro') base = s.atk * 100 + s.dmg * 10 - s.sp;
    else if (m?.key === 'turtle') base = s.def * 100 + s.blk * 10 - s.sp;
    else base = (s.dmg + s.blk) * 10 - s.sp;
    return base;
  }

  const satisfied = candidates.filter(c => satisfies(mode, c));
  if (satisfied.length > 0) {
    satisfied.sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
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

  if (candidates.length > 0) {
    candidates.sort((a, b) => score(mode, b) - score(mode, a));
    return candidates[0];
  }
  const single = deck
    .filter(c => c.speedCost <= MAX_SPEED && c.actionCost <= energyBudget)
    .sort((a, b) => a.speedCost - b.speedCost || a.actionCost - b.actionCost)[0];
  return single ? [single] : [];
}

function shouldEnemyOverdrive(mode, actions, etherPts) {
  const slots = etherSlots(etherPts);
  if (slots <= 0) return false;
  if (!mode) return false;
  if (mode.key === 'aggro') return true;
  if (mode.key === 'balanced') return (actions || []).some(c => c.type === 'attack');
  return false;
}

function simulatePreview({ player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions }) {
  if (!fixedOrder || fixedOrder.length === 0) {
    return { pDealt: 0, pTaken: 0, finalPHp: player.hp, finalEHp: enemy.hp, lines: [] };
  }
  const enemyWillOD = shouldEnemyOverdrive(enemyMode, enemyActions, enemy.etherPts);
  const P = { ...player, def: false, block: 0, counter: 0, etherOverdriveActive: !!willOverdrive, strength: player.strength || 0 };
  const E = { ...enemy, def: false, block: 0, counter: 0, etherOverdriveActive: enemyWillOD, strength: enemy.strength || 0 };
  const st = { player: P, enemy: E, log: [] };
  let pDealt = 0, pTaken = 0; const lines = [];
  for (const step of fixedOrder) {
    const { events, dealt } = applyAction(st, step.actor, step.card);
    if (step.actor === 'player') pDealt += dealt; else pTaken += dealt;
    events.forEach(ev => lines.push(ev.msg));
    if (st.player.hp <= 0) break;
  }
  return { pDealt, pTaken, finalPHp: st.player.hp, finalEHp: st.enemy.hp, lines };
}

function ExpectedDamagePreview({ player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions, phase, log, qIndex, queue, stepOnce, runAll, finishTurn, postCombatOptions, handleExitToMap, autoProgress, setAutoProgress, resolveStartPlayer, resolveStartEnemy }) {
  // 진행 단계에서는 시작 시점의 상태로 시뮬레이션, 그 외는 현재 상태 사용
  const simPlayer = phase === 'resolve' && resolveStartPlayer ? resolveStartPlayer : player;
  const simEnemy = phase === 'resolve' && resolveStartEnemy ? resolveStartEnemy : enemy;

  const res = useMemo(() => simulatePreview({ player: simPlayer, enemy: simEnemy, fixedOrder, willOverdrive, enemyMode, enemyActions }), [simPlayer, simEnemy, fixedOrder, willOverdrive, enemyMode, enemyActions]);

  const summaryItems = [
    { icon: "🗡️", label: "예상 타격 피해", value: res.pDealt, accent: "text-emerald-300", hpInfo: `몬스터 HP ${simEnemy.hp} → ${res.finalEHp}`, hpColor: "#fca5a5" },
    { icon: "💥", label: "예상 피격 피해", value: phase === 'select' ? '?' : res.pTaken, accent: "text-rose-300", hpInfo: `플레이어 HP ${simPlayer.hp} → ${res.finalPHp}`, hpColor: "#e2e8f0" },
  ];

  const phaseLabel = phase === 'select' ? '선택 단계' : phase === 'respond' ? '대응 단계' : '진행 단계';

  // 전투 로그 자동 스크롤
  const logContainerRef = useRef(null);
  useEffect(() => {
    if (logContainerRef.current && phase === 'resolve' && log && log.length > 0) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log, phase]);

  return (
    <div className="expect-board expect-board-vertical" style={{ position: 'relative' }}>
      {/* 타이틀 */}
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid rgba(148, 163, 184, 0.3)' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>
          예상 피해량
        </div>
      </div>

      <div className="expect-summary-vertical">
        {summaryItems.map((item) => (
          <div key={item.label} className="expect-item-vertical">
            <span className="expect-icon">{item.icon}</span>
            <div>
              <div className="expect-label">{item.label}</div>
              <div className={`expect-value ${item.accent}`}>{item.value}</div>
              {item.hpInfo && (
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: item.hpColor, marginTop: '4px' }}>
                  {item.hpInfo}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 진행 단계가 아닐 때만 예상 피해량 로그 표시 */}
      {phase !== 'resolve' && !!res.lines?.length && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
          {res.lines.map((line, idx) => {
            // 몬스터로 시작하는 텍스트 감지
            const startsWithMonster = line.trim().startsWith('몬스터');
            const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어→') || line.includes('플레이어 •');
            return (
              <div key={idx} style={{
                fontSize: '13px',
                color: startsWithMonster ? '#fca5a5' : isPlayerAction ? '#60a5fa' : '#cbd5e1',
                marginBottom: '6px'
              }}>
                <span style={{ color: '#94a3b8', marginRight: '4px' }}>{idx + 1}.</span>
                {line}
              </div>
            );
          })}
        </div>
      )}

      {/* 진행 단계 전투 로그 */}
      {phase === 'resolve' && log && log.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid rgba(148, 163, 184, 0.3)' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '12px' }}>
            🎮 전투 로그
          </div>
          <div ref={logContainerRef} style={{ height: '360px', minHeight: '360px', maxHeight: '360px', overflowY: 'auto' }}>
            {log.filter(line => {
              // 불필요한 로그 제거
              if (line.includes('게임 시작') || line.includes('적 성향 힌트')) return false;
              return true;
            }).map((line, i) => {
              // 몬스터로 시작하는 텍스트 감지
              const startsWithMonster = line.trim().startsWith('몬스터') || (line.includes('👾') && line.substring(line.indexOf('👾') + 2).trim().startsWith('몬스터'));
              const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어→') || line.includes('플레이어 •');
              return (
                <div key={i} style={{
                  fontSize: '13px',
                  color: startsWithMonster ? '#fca5a5' : isPlayerAction ? '#60a5fa' : '#cbd5e1',
                  marginBottom: '6px',
                  lineHeight: '1.5'
                }} dangerouslySetInnerHTML={{ __html: line }}>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 진행 단계 제어 버튼 (전투 로그 아래) */}
      {phase === 'resolve' && (
        <div style={{
          marginTop: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          paddingBottom: '80px',
          background: 'rgba(7, 11, 30, 0.98)',
          borderTop: '2px solid rgba(148, 163, 184, 0.3)',
          position: 'relative'
        }}>
          {postCombatOptions && (
            <>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: postCombatOptions.type === 'victory' ? '#22c55e' : '#ef4444',
                textShadow: '0 4px 12px rgba(0,0,0,0.8)',
                marginTop: '16px',
                marginBottom: '16px'
              }}>
                {postCombatOptions.type === 'victory' ? '🎉 승리!' : '💀 패배...'}
              </div>
              <button onClick={handleExitToMap} className="btn-enhanced btn-primary flex items-center gap-2">
                🗺️ 맵으로 돌아가기
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EtherBar({ pts, slots, previewGain = 0, color = "cyan", label }) {
  const safePts = Number.isFinite(pts) ? pts : 0;
  const derivedSlots = Number.isFinite(slots) ? slots : etherSlots(safePts);
  const safeSlots = Number.isFinite(derivedSlots) ? derivedSlots : 0;
  const safePreview = Number.isFinite(previewGain) ? previewGain : 0;

  // 현재 슬롯 내의 pt (각 슬롯 도달시마다 0으로 리셋)
  const currentPts = getCurrentSlotPts(safePts);
  // 다음 슬롯을 채우는데 필요한 총 pt
  const nextSlotCost = getNextSlotCost(safePts);
  // 다음 슬롯까지의 진행률 (0-1)
  const slotProgress = getSlotProgress(safePts);
  // 시각적 바 높이 = 진행률
  const ratio = Math.max(0, Math.min(1, slotProgress));
  const tier = `x${safeSlots}`;

  // 디버깅: 값 확인
  console.log('[EtherBar]', {
    pts,
    safePts,
    currentPts,
    nextSlotCost,
    ratio,
    tier,
    safeSlots
  });

  const borderColor = color === 'red' ? '#ef4444' : '#53d7ff';
  const textColor = color === 'red' ? '#fca5a5' : '#8fd3ff';

  // 슬롯별 색상 (플레이어: 보색 관계로 시인성 극대화)
  const playerSlotColors = [
    'linear-gradient(180deg, #67e8f9 0%, #06b6d4 100%)', // x1 - 밝은 시안 (cyan)
    'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)', // x2 - 주황 (시안의 보색)
    'linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)', // x3 - 보라 (주황과 대비)
    'linear-gradient(180deg, #bef264 0%, #84cc16 100%)', // x4 - 라임 (보라의 보색)
    'linear-gradient(180deg, #f472b6 0%, #db2777 100%)', // x5 - 마젠타 (라임과 대비)
    'linear-gradient(180deg, #fde047 0%, #facc15 100%)', // x6 - 밝은 노랑 (마젠타와 대비)
    'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)', // x7 - 파랑 (노랑의 보색)
    'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)', // x8 - 골드 (파랑과 대비)
    'linear-gradient(180deg, #34d399 0%, #059669 100%)', // x9 - 민트 (골드와 대비)
    'linear-gradient(180deg, #e0e7ff 0%, #c7d2fe 100%)'  // x10 - 연보라 (민트와 대비)
  ];

  const enemySlotColors = [
    'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)', // x1 - 다크 레드
    'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)', // x2 - 레드
    'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)', // x3 - 밝은 레드
    'linear-gradient(180deg, #ea580c 0%, #c2410c 100%)', // x4 - 오렌지 레드
    'linear-gradient(180deg, #c2410c 0%, #9a3412 100%)', // x5 - 다크 오렌지
    'linear-gradient(180deg, #92400e 0%, #78350f 100%)', // x6 - 번트 오렌지
    'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)', // x7 - 크림슨
    'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)', // x8 - 파이어 레드
    'linear-gradient(180deg, #f87171 0%, #dc2626 100%)', // x9 - 스칼렛
    'linear-gradient(180deg, #450a0a 0%, #1c0a0a 100%)'  // x10 - 블랙 레드
  ];

  const slotColors = color === 'red' ? enemySlotColors : playerSlotColors;

  return (
    <div style={{
      width: '72px',
      padding: '12px 10px 16px',
      borderRadius: '36px',
      background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.95), rgba(10, 15, 25, 0.75))',
      border: '1px solid rgba(96, 210, 255, 0.35)',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', color: '#5fe0ff', letterSpacing: '0.12em' }}>
        {label}
      </div>
      <div style={{
        position: 'relative',
        width: '46px',
        height: '220px',
        margin: '0 auto',
        borderRadius: '30px',
        border: `2px solid ${borderColor}`,
        background: 'rgba(9, 17, 27, 0.95)',
        overflow: 'hidden'
      }}>
        {/* 이전에 완성된 슬롯 (가장 최근 완성된 슬롯의 색, 바 전체 100%) */}
        {safeSlots > 0 && (
          <div style={{
            position: 'absolute',
            left: '3px',
            right: '3px',
            bottom: '3px',
            height: '100%',
            borderRadius: '24px',
            background: slotColors[safeSlots - 1],
            transition: 'height 0.8s ease-out'
          }} />
        )}
        {/* 현재 진행 중인 슬롯 (현재 슬롯의 진행률만큼 바 전체를 덮어씌움) */}
        <div style={{
          position: 'absolute',
          left: '3px',
          right: '3px',
          bottom: '3px',
          height: `${ratio * 100}%`,
          borderRadius: '24px',
          background: safeSlots < 10 ? slotColors[safeSlots] : slotColors[9],
          transition: 'height 0.8s ease-out'
        }} />
      </div>
      <div style={{ textAlign: 'center', color: textColor, fontSize: '20px' }}>
        <div key={`pts-${safePts}`}>{currentPts}/{nextSlotCost}</div>
        <div>{tier}</div>
        {safePreview > 0 && (
          <div style={{ color: '#6ee7b7', fontSize: '16px', marginTop: '4px' }}>
            +{safePreview}pt
          </div>
        )}
      </div>
    </div>
  );
}

// =====================
// 캐릭터 빌드 기반 손패 생성
// =====================
function drawCharacterBuildHand(characterBuild, nextTurnEffects = {}, previousHand = []) {
  if (!characterBuild) return CARDS.slice(0, 10); // 8장 → 10장

  const { mainSpecials = [], subSpecials = [] } = characterBuild;
  const { guaranteedCards = [], mainSpecialOnly = false, subSpecialBoost = 0 } = nextTurnEffects;

  // 파탄 (ruin) 특성: 주특기만 등장
  if (mainSpecialOnly) {
    const mainCards = mainSpecials
      .map(cardId => CARDS.find(card => card.id === cardId))
      .filter(Boolean);
    return mainCards;
  }

  // 확정 등장 카드 (반복, 보험)
  const guaranteed = guaranteedCards
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(Boolean);

  // 주특기 카드는 100% 등장 (탈주 제외)
  const mainCards = mainSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // 탈주 (escape): 이전에 사용했으면 등장하지 않음
      if (hasTrait(card, 'escape') && previousHand.some(c => c.id === card.id)) {
        return false;
      }
      // 개근 (attendance): 등장확률 25% 증가 (주특기 125%)
      if (hasTrait(card, 'attendance')) {
        return Math.random() < 1.25; // 확정 + 25% 추가 보너스
      }
      // 도피꾼 (deserter): 등장확률 25% 감소 (주특기 75%)
      if (hasTrait(card, 'deserter')) {
        return Math.random() < 0.75;
      }
      return true;
    });

  // 보조특기 카드는 각각 50% 확률로 등장 (장군 특성으로 증가 가능)
  const baseSubProb = 0.5 + subSpecialBoost;
  const subCards = subSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // 탈주 (escape): 이전에 사용했으면 등장하지 않음
      if (hasTrait(card, 'escape') && previousHand.some(c => c.id === card.id)) {
        return false;
      }
      // 조연 (supporting): 보조특기일때만 등장
      // (이미 보조특기로 설정되어 있으므로 등장 가능)

      let prob = baseSubProb;
      // 개근 (attendance): 등장확률 25% 증가
      if (hasTrait(card, 'attendance')) {
        prob += 0.25;
      }
      // 도피꾼 (deserter): 등장확률 25% 감소
      if (hasTrait(card, 'deserter')) {
        prob -= 0.25;
      }
      return Math.random() < prob;
    });

  // 중복 제거 후 반환
  const allCards = [...guaranteed, ...mainCards, ...subCards];
  const uniqueCards = [];
  const seenIds = new Set();
  for (const card of allCards) {
    if (!seenIds.has(card.id)) {
      seenIds.add(card.id);
      uniqueCards.push(card);
    }
  }

  return uniqueCards;
}

// =====================
// Game Component
// =====================
function Game({ initialPlayer, initialEnemy, playerEther = 0, onBattleResult }) {
  const playerStrength = useGameStore((state) => state.playerStrength || 0);
  const playerAgility = useGameStore((state) => state.playerAgility || 0);
  const relics = useGameStore((state) => state.relics || []);
  const safeInitialPlayer = initialPlayer || {};
  const safeInitialEnemy = initialEnemy || {};
  const passiveRelicStats = calculatePassiveEffects(relics);
  const baseEnergy = (safeInitialPlayer.energy ?? BASE_PLAYER_ENERGY) + passiveRelicStats.maxEnergy;
  const startingEther = typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : playerEther;
  const startingBlock = safeInitialPlayer.block ?? 0; // 유물 효과로 인한 시작 방어력
  const [player, setPlayer] = useState({ hp: safeInitialPlayer.hp ?? 30, maxHp: safeInitialPlayer.maxHp ?? safeInitialPlayer.hp ?? 30, energy: baseEnergy, maxEnergy: baseEnergy, vulnMult: 1, vulnTurns: 0, block: startingBlock, counter: 0, etherPts: startingEther ?? 0, etherOverflow: 0, etherOverdriveActive: false, comboUsageCount: {}, strength: playerStrength, maxSpeed: safeInitialPlayer.maxSpeed ?? DEFAULT_PLAYER_MAX_SPEED });
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [enemy, setEnemy] = useState(() => safeInitialEnemy?.name ? ({ ...safeInitialEnemy, hp: safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? 30, maxHp: safeInitialEnemy.maxHp ?? safeInitialEnemy.hp ?? 30, vulnMult: 1, vulnTurns: 0, block: 0, counter: 0, etherPts: 0, etherOverdriveActive: false, strength: 0, maxSpeed: safeInitialEnemy.maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED }) : null);

  const [phase, setPhase] = useState('select');

  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState([]);
  const [canRedraw, setCanRedraw] = useState(true);
  const [sortType, setSortType] = useState(() => {
    try {
      return localStorage.getItem('battleSortType') || 'speed';
    } catch {
      return 'speed';
    }
  }); // speed, energy, value, type

  const [enemyPlan, setEnemyPlan] = useState({ actions: [], mode: null });
  const [fixedOrder, setFixedOrder] = useState(null);

  const [postCombatOptions, setPostCombatOptions] = useState(null);
  const [log, setLog] = useState(["게임 시작!"]);
  const [actionEvents, setActionEvents] = useState({});

  const [queue, setQueue] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const addLog = useCallback((m) => {
    setLog(p => [...p, m].slice(-200));
  }, []);
  const [willOverdrive, setWillOverdrive] = useState(false);
  const [isSimplified, setIsSimplified] = useState(() => {
    try {
      const saved = localStorage.getItem('battleIsSimplified');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [usedCardIndices, setUsedCardIndices] = useState([]);
  const [disappearingCards, setDisappearingCards] = useState([]); // 사라지는 중인 카드 인덱스
  const [hiddenCards, setHiddenCards] = useState([]); // 완전히 숨겨진 카드 인덱스
  const [disabledCardIndices, setDisabledCardIndices] = useState([]); // 비활성화된 카드 인덱스 (몬스터 사망 시 남은 카드)
  const [timelineProgress, setTimelineProgress] = useState(0); // 타임라인 진행 위치 (0~100%)
  const [timelineIndicatorVisible, setTimelineIndicatorVisible] = useState(true); // 시곗바늘 표시 여부
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [cardUsageCount, setCardUsageCount] = useState({}); // 카드별 사용 횟수 추적 (mastery, boredom용)
  const [etherAnimationPts, setEtherAnimationPts] = useState(null); // 에테르 애니메이션 전용 (전체 획득량 표시)
  const [executingCardIndex, setExecutingCardIndex] = useState(null); // 현재 실행 중인 카드 인덱스 (애니메이션용)
  const [vanishedCards, setVanishedCards] = useState([]); // 소멸 특성으로 제거된 카드
  const [turnEtherAccumulated, setTurnEtherAccumulated] = useState(0); // 이번 턴 누적 에테르 (실제 적용 전)
  const [enemyTurnEtherAccumulated, setEnemyTurnEtherAccumulated] = useState(0); // 적 이번 턴 누적 에테르
  const [etherPulse, setEtherPulse] = useState(false); // PT 증가 애니메이션
  const [etherFinalValue, setEtherFinalValue] = useState(null); // 최종 에테르값 표시
  const [etherCalcPhase, setEtherCalcPhase] = useState(null); // 에테르 계산 애니메이션 단계: 'sum', 'multiply', 'deflation', 'result'
  const [currentDeflation, setCurrentDeflation] = useState(null); // 현재 디플레이션 정보 { multiplier, usageCount }
  const [nextTurnEffects, setNextTurnEffects] = useState({
    guaranteedCards: [], // 반복, 보험 특성으로 다음턴 확정 등장
    bonusEnergy: 0, // 몸풀기 특성
    energyPenalty: 0, // 탈진 특성
    etherBlocked: false, // 망각 특성
    mainSpecialOnly: false, // 파탄 특성
    subSpecialBoost: 0, // 장군 특성
  });
  const [playerHit, setPlayerHit] = useState(false); // 플레이어 피격 애니메이션
  const [enemyHit, setEnemyHit] = useState(false); // 적 피격 애니메이션
  const [playerBlockAnim, setPlayerBlockAnim] = useState(false); // 플레이어 방어 애니메이션
  const [enemyBlockAnim, setEnemyBlockAnim] = useState(false); // 적 방어 애니메이션
  const [autoProgress, setAutoProgress] = useState(false); // 자동진행 모드
  const [resolveStartPlayer, setResolveStartPlayer] = useState(null); // 진행 단계 시작 시 플레이어 상태
  const [resolveStartEnemy, setResolveStartEnemy] = useState(null); // 진행 단계 시작 시 적 상태
  const [hoveredRelic, setHoveredRelic] = useState(null); // 호버된 유물 ID
  const [relicActivated, setRelicActivated] = useState(null); // 발동된 유물 ID (애니메이션용)
  const [resolvedPlayerCards, setResolvedPlayerCards] = useState(0); // 진행 단계에서 진행된 플레이어 카드 수
  const [hoveredCard, setHoveredCard] = useState(null); // 호버된 카드 정보 {card, position}
  const [tooltipVisible, setTooltipVisible] = useState(false); // 툴팁 표시 여부(애니메이션용)
  const [previewDamage, setPreviewDamage] = useState({ value: 0, lethal: false, overkill: false });
  const lethalSoundRef = useRef(false);
  const overkillSoundRef = useRef(false);
  const hoveredCardRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false); // 툴팁 표시 여부 (딜레이 후)
  const tooltipTimerRef = useRef(null);
  const logEndRef = useRef(null);
  const initialEtherRef = useRef(typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : (playerEther ?? 0));
  const resultSentRef = useRef(false);
  const notifyBattleResult = useCallback((resultType) => {
    if (!resultType || resultSentRef.current) return;
    const finalEther = player.etherPts;
    const delta = finalEther - (initialEtherRef.current ?? 0);
    onBattleResult?.({
      result: resultType,
      playerEther: finalEther,
      deltaAether: delta
    });
    resultSentRef.current = true;
  }, [player.etherPts, onBattleResult]);

  const closeCharacterSheet = useCallback(() => {
    setShowCharacterSheet(false);
  }, []);

  useEffect(() => {
    hoveredCardRef.current = hoveredCard;
  }, [hoveredCard]);

  const showCardTraitTooltip = useCallback((card, cardElement) => {
    if (!card?.traits || card.traits.length === 0 || !cardElement) return;
    const updatePos = () => {
      const rect = cardElement.getBoundingClientRect();
      setHoveredCard({ card, x: rect.right + 16, y: rect.top });
    };
    updatePos();
    setTooltipVisible(false);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      if (hoveredCardRef.current?.card?.id !== card.id) return;
      updatePos(); // 위치 재측정 후 표시
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTooltipVisible(true));
      });
      setShowTooltip(true);
    }, 300);
  }, []);

  const hideCardTraitTooltip = useCallback(() => {
    setHoveredCard(null);
    setTooltipVisible(false);
    setShowTooltip(false);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  const handleExitToMap = () => {
    const outcome = postCombatOptions?.type || (enemy && enemy.hp <= 0 ? 'victory' : (player && player.hp <= 0 ? 'defeat' : null));
    if (!outcome) return;
    const sent = notifyBattleResult(outcome);
    if (!sent && typeof window !== 'undefined' && window.top === window) {
      window.location.href = '/';
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => {
    const nextEther = typeof safeInitialPlayer?.etherPts === 'number'
      ? safeInitialPlayer.etherPts
      : (playerEther ?? player.etherPts);
    initialEtherRef.current = nextEther;
    resultSentRef.current = false;
    setPlayer(prev => ({
      ...prev,
      hp: safeInitialPlayer?.hp ?? prev.hp,
      maxHp: safeInitialPlayer?.maxHp ?? prev.maxHp,
      energy: safeInitialPlayer?.energy ?? prev.energy,
      maxEnergy: safeInitialPlayer?.energy ?? prev.maxEnergy,
      etherPts: nextEther,
      strength: 0  // Strength 초기화
    }));
    setSelected([]);
    setQueue([]);
    setQIndex(0);
    setFixedOrder(null);
    setPostCombatOptions(null);
    setEnemyPlan({ actions: [], mode: null });
    setPhase('select');
    // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const rawHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild)
      : CARDS.slice(0, 10); // 8장 → 10장
    const initialHand = applyStrengthToHand(rawHand, playerStrength);
    setHand(initialHand);
    setCanRedraw(true);
  }, [safeInitialPlayer, playerEther, addLog, playerStrength]);

  useEffect(() => {
    if (!safeInitialEnemy) return;
    const hp = safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? enemy?.maxHp ?? 30;
    setEnemy(prev => ({
      ...(prev || {}),
      deck: safeInitialEnemy.deck || prev?.deck || ENEMIES[enemyIndex]?.deck || [],
      name: safeInitialEnemy.name ?? prev?.name ?? '적',
      hp,
      maxHp: safeInitialEnemy.maxHp ?? hp,
      vulnMult: 1,
      vulnTurns: 0,
      block: 0,
      counter: 0,
      etherPts: 0,
      etherOverdriveActive: false
    }));
    setSelected([]);
    setQueue([]);
    setQIndex(0);
    setFixedOrder(null);
    setPhase('select');
  }, [safeInitialEnemy, enemyIndex]);

  useEffect(() => {
    if (postCombatOptions?.type) {
      notifyBattleResult(postCombatOptions.type);
    }
  }, [postCombatOptions, notifyBattleResult]);

  // 페이즈 변경 시 카드 애니메이션 상태 초기화
  useEffect(() => {
    if (phase !== 'resolve') {
      setDisappearingCards([]);
      setHiddenCards([]);
    }
    // resolve 단계 진입 시 usedCardIndices 초기화
    if (phase === 'resolve') {
      setUsedCardIndices([]);
    }
  }, [phase]);

  // C 키로 캐릭터 창 열기, Q 키로 간소화, E 키로 제출/진행/턴 종료, R 키로 리드로우, 스페이스바로 기원, F 키로 정렬
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        e.stopPropagation();
        setShowCharacterSheet((prev) => !prev);
      }
      if ((e.key === "q" || e.key === "Q") && phase === 'select') {
        e.preventDefault();
        setIsSimplified((prev) => {
          const newVal = !prev;
          try { localStorage.setItem('battleIsSimplified', newVal.toString()); } catch { }
          return newVal;
        });
      }
      if ((e.key === "e" || e.key === "E") && phase === 'select' && selected.length > 0) {
        e.preventDefault();
        startResolve();
        playSound(900, 120);
      }
      if ((e.key === "e" || e.key === "E") && phase === 'respond') {
        e.preventDefault();
        beginResolveFromRespond();
      }
      if ((e.key === "r" || e.key === "R") && phase === 'select' && canRedraw) {
        e.preventDefault();
        redrawHand();
      }
      if (e.key === " " && (phase === 'select' || phase === 'respond')) {
        // 스페이스바로 기원 토글
        e.preventDefault(); // 스페이스바 기본 동작 방지 (스크롤)
        if (etherSlots(player.etherPts) > 0) {
          setWillOverdrive(v => !v);
        }
      }
      if ((e.key === "e" || e.key === "E") && phase === 'resolve') {
        e.preventDefault();
        if (qIndex < queue.length) {
          // 타임라인 진행 중이면 진행 토글
          setAutoProgress(prev => !prev);
        } else if (etherFinalValue !== null) {
          // 타임라인 끝나고 최종값 표시되면 턴 종료
          finishTurn('키보드 단축키 (E)');
        }
      }
      if ((e.key === "f" || e.key === "F") && phase === 'select') {
        e.preventDefault();
        // F키로 카드 정렬
        cycleSortType();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selected, canRedraw, player.etherPts, sortType, autoProgress, qIndex, queue.length, etherFinalValue]);

  useEffect(() => {
    if (!enemy) {
      const e = ENEMIES[enemyIndex];
      setEnemy({ ...e, hp: e.hp, maxHp: e.hp, vulnMult: 1, vulnTurns: 0, block: 0, counter: 0, etherPts: 0, etherOverdriveActive: false, maxSpeed: e.maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED });
      // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
      const currentBuild = useGameStore.getState().characterBuild;
      const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
      const rawHand = hasCharacterBuild
        ? drawCharacterBuildHand(currentBuild, nextTurnEffects, [])
        : CARDS.slice(0, 10); // 8장 → 10장
      const initialHand = applyStrengthToHand(rawHand, playerStrength);
      setHand(initialHand);
      setSelected([]);
      setCanRedraw(true);
      const handCount = initialHand.length;
      addLog(`🎴 시작 손패 ${handCount}장${hasCharacterBuild ? ' (캐릭터 빌드)' : ''}`);
    }
  }, []);

  useEffect(() => {
    if (!enemy || phase !== 'select') return;
    setFixedOrder(null);
    setActionEvents({});
    setCanRedraw(true);
    setWillOverdrive(false);

    // 유물 턴 시작 효과 적용 (피피한 갑옷 등)
    const turnStartRelicEffects = applyTurnStartEffects(relics, nextTurnEffects);

    // 특성 효과로 인한 에너지 보너스/페널티 적용
    const passiveRelicEffects = calculatePassiveEffects(relics);
    const baseEnergy = BASE_PLAYER_ENERGY + passiveRelicEffects.maxEnergy;
    const energyBonus = (nextTurnEffects.bonusEnergy || 0) + turnStartRelicEffects.energy;
    const energyPenalty = nextTurnEffects.energyPenalty || 0;
    const finalEnergy = Math.max(0, baseEnergy + energyBonus - energyPenalty);

    // 방어력과 체력 회복 적용
    setPlayer(p => {
      const newHp = Math.min(p.maxHp, p.hp + turnStartRelicEffects.heal);
      const newBlock = (p.block || 0) + turnStartRelicEffects.block;
      return { ...p, hp: newHp, block: newBlock, energy: finalEnergy, maxEnergy: baseEnergy, etherOverdriveActive: false, etherOverflow: 0 };
    });

    // 로그 추가
    if (turnStartRelicEffects.block > 0) {
      addLog(`🛡️ 유물 효과: 방어력 +${turnStartRelicEffects.block}`);
    }
    if (turnStartRelicEffects.heal > 0) {
      addLog(`💚 유물 효과: 체력 +${turnStartRelicEffects.heal}`);
    }
    if (turnStartRelicEffects.energy > 0) {
      addLog(`⚡ 유물 효과: 행동력 +${turnStartRelicEffects.energy}`);
    }

    // 매 턴 시작 시 새로운 손패 생성 (캐릭터 빌드 및 특성 효과 적용)
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    setHand(prevHand => {
      const rawHand = hasCharacterBuild
        ? drawCharacterBuildHand(currentBuild, nextTurnEffects, prevHand)
        : CARDS.slice(0, 10); // 8장 → 10장
      return applyStrengthToHand(rawHand, playerStrength);
    });
    setSelected([]);

    setEnemyPlan(prev => {
      if (prev.mode) {
        return { ...prev, actions: [] };
      } else {
        const mode = decideEnemyMode();
        addLog(`🤖 적 성향 힌트: ${mode.name}`);
        return { actions: [], mode };
      }
    });
  }, [phase, enemy, enemyPlan.mode, nextTurnEffects, player.etherPts]);

  useEffect(() => {
    if (phase === 'resolve' && (!queue || queue.length === 0) && fixedOrder && fixedOrder.length > 0) {
      const rebuilt = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
      setQueue(rebuilt); setQIndex(0);
      addLog('🧯 자동 복구: 실행 큐를 다시 생성했습니다');
    }
  }, [phase, queue, fixedOrder]);

  const totalEnergy = useMemo(() => selected.reduce((s, c) => s + c.actionCost, 0), [selected]);
  const totalSpeed = useMemo(() => selected.reduce((s, c) => s + c.speedCost, 0), [selected]);
  const currentCombo = useMemo(() => {
    const combo = detectPokerCombo(selected);
    console.log('[currentCombo 업데이트]', {
      selectedCount: selected.length,
      comboName: combo?.name || 'null'
    });

    // 디플레이션 정보 계산 (선택/대응/진행 단계에서)
    if (combo?.name && (phase === 'select' || phase === 'respond' || phase === 'resolve')) {
      const usageCount = (player.comboUsageCount || {})[combo.name] || 0;
      const deflationMult = Math.pow(0.5, usageCount);
      setCurrentDeflation(usageCount > 0 ? { multiplier: deflationMult, usageCount } : null);
    }

    return combo;
  }, [selected, player.comboUsageCount, phase]);

  // 유물 효과를 포함한 최종 콤보 배율
  const finalComboMultiplier = useMemo(() => {
    const baseMultiplier = currentCombo ? (COMBO_MULTIPLIERS[currentCombo.name] || 1) : 1;
    // 진행 단계에서는 진행된 카드 수 기반으로 유물 효과 적용
    if (phase === 'resolve') {
      return applyRelicComboMultiplier(relics, baseMultiplier, resolvedPlayerCards);
    }
    // 선택/응답 단계에서는 선택된 카드 수 기반으로 유물 효과 적용 (미리보기)
    if (phase === 'select' || phase === 'respond') {
      return applyRelicComboMultiplier(relics, baseMultiplier, selected.length);
    }
    return baseMultiplier;
  }, [currentCombo, relics, resolvedPlayerCards, selected.length, phase]);
  const comboPreviewInfo = useMemo(() => {
    if (!currentCombo) return null;
    return calculateComboEtherGain({
      cardCount: selected?.length || 0,
      comboName: currentCombo.name,
      comboUsageCount: player.comboUsageCount || {},
    });
  }, [currentCombo, selected?.length, player.comboUsageCount]);

  const toggle = (card) => {
    if (phase !== 'select' && phase !== 'respond') return;
    const exists = selected.some(s => s.id === card.id);
    if (phase === 'respond') {
      setSelected(prev => {
        let next;
        if (exists) {
          next = prev.filter(s => !(s.__uid === card.__uid) && !(s.id === card.id && !('__uid' in s)));
          playSound(400, 80); // 해지 사운드 (낮은 음)
        }
        else {
          if (prev.length >= MAX_SUBMIT_CARDS) { addLog('⚠️ 최대 5장의 카드만 제출할 수 있습니다'); return prev; }
          if (totalSpeed + card.speedCost > player.maxSpeed) { addLog('⚠️ 속도 초과'); return prev; }
          if (totalEnergy + card.actionCost > player.maxEnergy) { addLog('⚠️ 행동력 부족'); return prev; }
          next = [...prev, { ...card, __uid: Math.random().toString(36).slice(2) }];
          playSound(800, 80); // 선택 사운드 (높은 음)
        }
        const combo = detectPokerCombo(next);
        const enhanced = applyPokerBonus(next, combo);
        setFixedOrder(sortCombinedOrderStablePF(enhanced, enemyPlan.actions || [], playerAgility, 0));
        return next;
      });
      return;
    }
    if (exists) {
      setSelected(selected.filter(s => s.id !== card.id));
      playSound(400, 80); // 해지 사운드 (낮은 음)
      return;
    }
    if (selected.length >= MAX_SUBMIT_CARDS) return addLog('⚠️ 최대 5장의 카드만 제출할 수 있습니다');
    if (totalSpeed + card.speedCost > player.maxSpeed) return addLog('⚠️ 속도 초과');
    if (totalEnergy + card.actionCost > player.maxEnergy) return addLog('⚠️ 행동력 부족');
    setSelected([...selected, { ...card, __uid: Math.random().toString(36).slice(2) }]);
    playSound(800, 80); // 선택 사운드 (높은 음)
  };

  const moveUp = (i) => {
    if (i === 0) return;
    if (phase === 'respond') {
      setSelected(prev => {
        const n = [...prev];[n[i - 1], n[i]] = [n[i], n[i - 1]];
        const combo = detectPokerCombo(n);
        const enhanced = applyPokerBonus(n, combo);
        setFixedOrder(sortCombinedOrderStablePF(enhanced, enemyPlan.actions || [], playerAgility, 0));
        return n;
      });
    } else {
      const n = [...selected];[n[i - 1], n[i]] = [n[i], n[i - 1]]; setSelected(n);
    }
  };

  const moveDown = (i) => {
    if (i === selected.length - 1) return;
    if (phase === 'respond') {
      setSelected(prev => {
        const n = [...prev];[n[i], n[i + 1]] = [n[i + 1], n[i]];
        const combo = detectPokerCombo(n);
        const enhanced = applyPokerBonus(n, combo);
        setFixedOrder(sortCombinedOrderStablePF(enhanced, enemyPlan.actions || [], playerAgility, 0));
        return n;
      });
    } else {
      const n = [...selected];[n[i], n[i + 1]] = [n[i + 1], n[i]]; setSelected(n);
    }
  };

  // 효과음 재생 함수
  const playSound = (frequency = 800, duration = 100) => {
    try {
      // eslint-disable-next-line no-undef
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
      // 효과음 재생 실패 시 무시
    }
  };

  const redrawHand = () => {
    if (!canRedraw) return addLog('🔒 이미 이번 턴 리드로우 사용됨');
    // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const rawHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild, nextTurnEffects, hand)
      : CARDS.slice(0, 10); // 8장 → 10장
    const newHand = applyStrengthToHand(rawHand, playerStrength);
    setHand(newHand);
    setSelected([]);
    setCanRedraw(false);
    addLog('🔄 손패 리드로우 사용');
    playSound(700, 90); // 리드로우 효과음
  };

  const cycleSortType = () => {
    const sortCycle = ['speed', 'energy', 'value', 'type'];
    const currentIndex = sortCycle.indexOf(sortType);
    const nextIndex = (currentIndex + 1) % sortCycle.length;
    const nextSort = sortCycle[nextIndex];
    setSortType(nextSort);
    try {
      localStorage.setItem('battleSortType', nextSort);
    } catch { }

    const sortLabels = {
      speed: '시간 기준 정렬',
      energy: '행동력 기준 정렬',
      value: '밸류 기준 정렬',
      type: '종류별 정렬'
    };
    addLog(`🔀 ${sortLabels[nextSort]}`);
    playSound(600, 80); // 정렬 효과음
  };

  const getSortedHand = () => {
    const sorted = [...hand];

    if (sortType === 'speed') {
      // 시간(속도) 내림차순 - 큰 것부터
      sorted.sort((a, b) => b.speedCost - a.speedCost);
    } else if (sortType === 'energy') {
      // 행동력 내림차순 - 큰 것부터
      sorted.sort((a, b) => b.actionCost - a.actionCost);
    } else if (sortType === 'value') {
      // 밸류(공격력+방어력) 내림차순 - 큰 것부터
      sorted.sort((a, b) => {
        const aValue = ((a.damage || 0) * (a.hits || 1)) + (a.block || 0);
        const bValue = ((b.damage || 0) * (b.hits || 1)) + (b.block || 0);
        return bValue - aValue;
      });
    } else if (sortType === 'type') {
      // 공격 -> 방어 -> 기타 순서로 정렬
      const typeOrder = { 'attack': 0, 'defense': 1 };
      sorted.sort((a, b) => {
        const aOrder = typeOrder[a.type] ?? 2;
        const bOrder = typeOrder[b.type] ?? 2;
        return aOrder - bOrder;
      });
    }

    return sorted;
  };

  const startResolve = () => {
    if (phase !== 'select') return;
    const actions = generateEnemyActions(enemy, enemyPlan.mode, etherSlots(enemy.etherPts));
    setEnemyPlan(prev => ({ ...prev, actions }));

    const pCombo = detectPokerCombo(selected);

    // 특성 효과 적용 (사용 횟수는 선택 단계 기준으로 고정)
    const traitEnhancedSelected = selected.map(card =>
      applyTraitModifiers(card, {
        usageCount: 0,
        isInCombo: pCombo !== null,
      })
    );

    const enhancedSelected = applyPokerBonus(traitEnhancedSelected, pCombo);

    const q = sortCombinedOrderStablePF(enhancedSelected, actions, playerAgility, 0);
    setFixedOrder(q);
    playCardSubmitSound(); // 카드 제출 사운드 재생
    setPhase('respond');
  };

  useEffect(() => {
    if (phase === 'respond' && enemyPlan.actions && enemyPlan.actions.length > 0) {
      const combo = detectPokerCombo(selected);

      // 특성 효과 적용
      const traitEnhancedSelected = selected.map(card =>
        applyTraitModifiers(card, {
          usageCount: 0,
          isInCombo: combo !== null,
        })
      );

      const enhancedSelected = applyPokerBonus(traitEnhancedSelected, combo);
      const q = sortCombinedOrderStablePF(enhancedSelected, enemyPlan.actions, playerAgility, 0);
      setFixedOrder(q);
    }
  }, [selected, phase, enemyPlan.actions]);

  const beginResolveFromRespond = () => {
    if (!fixedOrder) return addLog('오류: 고정된 순서가 없습니다');

    if (fixedOrder.length === 0) {
      addLog('⚠️ 실행할 행동이 없습니다. 최소 1장 이상을 유지하거나 적이 행동 가능한 상태여야 합니다.');
      return;
    }

    const newQ = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
    if (newQ.length === 0) {
      addLog('⚠️ 큐 생성 실패: 실행할 항목이 없습니다');
      return;
    }

    // 이전 턴의 에테르 애니메이션 상태 초기화
    setEtherCalcPhase(null);
    setEtherFinalValue(null);
    setCurrentDeflation(null);

    playProceedSound(); // 진행 버튼 사운드 재생
    setQueue(newQ);
    setQIndex(0);
    setPhase('resolve');
    addLog('▶ 진행 시작');

    // 진행 단계 시작 시 플레이어와 적 상태 저장
    setResolveStartPlayer({ ...player });
    setResolveStartEnemy({ ...enemy });

    // 진행된 플레이어 카드 수 초기화
    setResolvedPlayerCards(0);

    // 타임라인 progress 초기화
    setTimelineProgress(0);
    setTimelineIndicatorVisible(true);

    const enemyWillOD = shouldEnemyOverdrive(enemyPlan.mode, enemyPlan.actions, enemy.etherPts) && etherSlots(enemy.etherPts) > 0;
    if ((phase === 'respond' || phase === 'select') && willOverdrive && etherSlots(player.etherPts) > 0) {
      setPlayer(p => ({ ...p, etherPts: p.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true }));
      addLog('✴️ 에테르 폭주 발동! (이 턴 전체 유지)');
    }
    if ((phase === 'respond' || phase === 'select') && enemyWillOD) {
      setEnemy(e => ({ ...e, etherPts: e.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true }));
      addLog('☄️ 적 에테르 폭주 발동!');
    }

    // 진행 버튼 누르면 자동 진행 활성화
    setAutoProgress(true);
  };

  // 에테르 계산 애니메이션 시작 (몬스터 사망 시 / 정상 종료 시 공통)
  // skipFinalValueSet: true이면 setEtherFinalValue를 호출하지 않음 (finishTurn에서 이미 설정한 경우)
  const startEtherCalculationAnimation = (totalEtherPts, actualResolvedCards = null, actualGainedEther = null, skipFinalValueSet = false) => {
    const pCombo = detectPokerCombo(selected);
    const basePlayerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
    // 몬스터가 죽었을 때는 actualResolvedCards(실제 실행된 카드 수), 아니면 selected.length(전체 선택된 카드 수)
    const cardCountForMultiplier = actualResolvedCards !== null ? actualResolvedCards : selected.length;
    const playerComboMult = applyRelicComboMultiplier(relics, basePlayerComboMult, cardCountForMultiplier);
    let playerBeforeDeflation = Math.round(totalEtherPts * playerComboMult);

    // 유물 효과 적용 (참고서, 악마의 주사위, 희귀한 조약돌)
    playerBeforeDeflation = calculateRelicEtherGain(playerBeforeDeflation, cardCountForMultiplier, relics);

    // 디플레이션 적용
    const playerDeflation = pCombo?.name
      ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    // actualGainedEther가 전달되면 그 값을 사용, 아니면 디플레이션까지만 적용한 값 사용
    // 범람 계산은 최종값 표시에 포함하지 않음 (로그에만 표시)
    const playerFinalEther = actualGainedEther !== null ? actualGainedEther : playerDeflation.gain;

    console.log('[에테르 계산 애니메이션]', {
      turnEtherAccumulated: totalEtherPts,
      comboName: pCombo?.name,
      basePlayerComboMult,
      playerComboMult,
      relicBonus: playerComboMult - basePlayerComboMult,
      playerBeforeDeflation,
      deflationMult: playerDeflation.multiplier,
      usageCount: playerDeflation.usageCount,
      playerFinalEther: playerFinalEther,
      selectedCards: selected.length,
      actualResolvedCards: actualResolvedCards,
      cardCountForMultiplier: cardCountForMultiplier,
      actualGainedEther,
      comboUsageCount: player.comboUsageCount,
      comboUsageForThisCombo: player.comboUsageCount?.[pCombo?.name] || 0
    });

    // 디플레이션 정보 설정
    setCurrentDeflation(pCombo?.name ? {
      comboName: pCombo.name,
      usageCount: playerDeflation.usageCount,
      multiplier: playerDeflation.multiplier
    } : null);

    // 1단계: 합계 강조
    setEtherCalcPhase('sum');
    setTimeout(() => {
      // 2단계: 곱셈 강조 + 명쾌한 사운드
      setEtherCalcPhase('multiply');
      playSound(800, 100);
      setTimeout(() => {
        // 3단계: 디플레이션 배지 애니메이션 + 저음 사운드
        if (playerDeflation.usageCount > 0) {
          setEtherCalcPhase('deflation');
          playSound(200, 150);
        }
        setTimeout(() => {
          // 4단계: 최종값 표시 + 묵직한 사운드
          setEtherCalcPhase('result');
          // 버튼 표시를 위해 값 설정 (finishTurn에서 정확한 값으로 다시 설정됨)
          setEtherFinalValue(playerFinalEther);
          playSound(400, 200);
        }, playerDeflation.usageCount > 0 ? 400 : 0);
      }, 600);
    }, 400);
  };

  const stepOnce = () => {
    if (qIndex >= queue.length) return;
    const a = queue[qIndex];

    // 타임라인 progress 업데이트 (현재 카드의 위치를 actor의 maxSpeed 기준 비율로)
    const currentMaxSpeed = a.actor === 'player' ? player.maxSpeed : enemy.maxSpeed;
    const progressPercent = (a.sp / currentMaxSpeed) * 100;

    // 먼저 시곗바늘을 현재 카드 위치로 이동
    setTimelineProgress(progressPercent);

    // 시곗바늘 이동 완료 후 카드 발동 및 실행 (0.5초 transition 후)
    setTimeout(() => {
      // 실행 중인 카드 표시 (흔들림 애니메이션)
      setExecutingCardIndex(qIndex);

      // 흔들림 애니메이션 종료 후 빛 바래짐 처리
      setTimeout(() => {
        setExecutingCardIndex(null);
        // 흔들림이 끝난 후 사용된 카드로 표시 (빛 바래짐)
        setUsedCardIndices(prev => [...prev, qIndex]);
      }, 350); // CSS 애니메이션 시간과 일치

      // 마지막 카드면 페이드아웃
      if (qIndex >= queue.length - 1) {
        setTimeout(() => {
          setTimelineIndicatorVisible(false);
        }, 300);
      }

      // 카드 소멸 이펙트는 플레이어만 적용
      if (a.actor === 'player') {
        setTimeout(() => {
          // 카드가 사용된 후 사라지는 애니메이션 시작
          setDisappearingCards(prev => [...prev, qIndex]);
          setTimeout(() => {
            // 애니메이션 후 완전히 숨김
            setHiddenCards(prev => [...prev, qIndex]);
            setDisappearingCards(prev => prev.filter(i => i !== qIndex));
          }, 600); // 애니메이션 지속 시간
        }, 300); // 사용 효과 후 바로 사라지기 시작
      }

      executeCardAction();
    }, 500); // CSS transition 시간과 일치 (0.5s)
  };

  const executeCardAction = () => {
    if (qIndex >= queue.length) return;
    const a = queue[qIndex];

    const P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1 };
    const E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1 };
    const tempState = { player: P, enemy: E, log: [] };
    const { events } = applyAction(tempState, a.actor, a.card);
    let actionEvents = events;

    // 플레이어 카드 사용 시 카드 사용 횟수 증가 (mastery, boredom 특성용)
    if (a.actor === 'player' && a.card.id) {
      setCardUsageCount(prev => ({
        ...prev,
        [a.card.id]: (prev[a.card.id] || 0) + 1
      }));

      // 양날의 검 (double_edge): 사용시 1 피해
      if (hasTrait(a.card, 'double_edge')) {
        P.hp = Math.max(0, P.hp - 1);
        addLog(`⚠️ "양날의 검" - 플레이어가 1 피해를 입었습니다.`);
      }

      // 단련 (training): 사용 후 힘 +1
      if (hasTrait(a.card, 'training')) {
        P.strength = (P.strength || 0) + 1;
        addLog(`💪 "단련" - 힘이 1 증가했습니다. (현재: ${P.strength})`);
      }
    }

    if (hasTrait(a.card, 'stun')) {
      const centerSp = a.sp ?? 0;
      const stunnedActions = [];
      setQueue(prevQueue => {
        const targets = prevQueue
          .map((item, idx) => ({ item, idx }))
          .filter(({ item, idx }) => {
            if (idx <= qIndex || !item) return false;
            const isOpponent = item.actor !== a.actor;
            const withinRange = typeof item.sp === 'number' && item.sp >= centerSp && item.sp <= centerSp + STUN_RANGE;
            return isOpponent && withinRange;
          });
        if (targets.length === 0) return prevQueue;
        stunnedActions.push(...targets);
        return prevQueue.filter((_, idx) => !targets.some(t => t.idx === idx));
      });
      if (stunnedActions.length > 0) {
        const stunnedNames = stunnedActions.map(t => t.item?.card?.name || '카드').join(', ');
        const msg = `😵 "${a.card.name}"의 기절! 상대 카드 ${stunnedActions.length}장 파괴 (범위: ${centerSp}~${centerSp + STUN_RANGE}${stunnedNames ? `, 대상: ${stunnedNames}` : ''})`;
        addLog(msg);
        actionEvents = [...actionEvents, { actor: a.actor, card: a.card.name, type: 'stun', msg }];
      }
    }

    // 카드 사용 시 에테르 누적 (실제 적용은 턴 종료 시)
    if (a.actor === 'player') {
      setTurnEtherAccumulated(prev => {
        console.log(`[에테르 누적] ${prev} + ${BASE_ETHER_PER_CARD} = ${prev + BASE_ETHER_PER_CARD} (카드: ${a.card.name})`);
        return prev + BASE_ETHER_PER_CARD;
      });
      // PT 증가 애니메이션
      setEtherPulse(true);
      setTimeout(() => setEtherPulse(false), 300);

      // 플레이어 카드 진행 시 유물 발동
      setResolvedPlayerCards(prev => {
        const newCount = prev + 1;

        // 유물이 있으면 발동 애니메이션 및 사운드
        if (relics.length > 0) {
          relics.forEach(relicId => {
            const relic = RELICS[relicId];
            // effects가 객체인 경우 처리 (/src/data/relics.js 사용)
            if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.comboMultiplierPerCard) {
              setRelicActivated(relicId);
              playSound(800, 200); // 유물 발동 사운드
              setTimeout(() => setRelicActivated(null), 500);
            }
          });
        }

        return newCount;
      });
    } else if (a.actor === 'enemy') {
      setEnemyTurnEtherAccumulated(prev => prev + BASE_ETHER_PER_CARD);
    }

    setPlayer(prev => ({ ...prev, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1, strength: P.strength || 0 }));
    setEnemy(prev => ({ ...prev, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 }));
    setActionEvents(prev => ({ ...prev, [qIndex]: actionEvents }));

    // 이벤트 처리: 애니메이션 및 사운드
    actionEvents.forEach(ev => {
      addLog(ev.msg);

      // 피격 효과 (hit, pierce 타입)
      if ((ev.type === 'hit' || ev.type === 'pierce') && ev.dmg > 0) {
        playHitSound();
        if (ev.actor === 'player') {
          // 플레이어가 공격 -> 적 피격
          setEnemyHit(true);
          setTimeout(() => setEnemyHit(false), 300);
        } else {
          // 적이 공격 -> 플레이어 피격
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 300);
        }
      }

      // 방어 효과 (defense 타입)
      if (ev.type === 'defense') {
        playBlockSound();
        if (ev.actor === 'player') {
          setPlayerBlockAnim(true);
          setTimeout(() => setPlayerBlockAnim(false), 400);
        } else {
          setEnemyBlockAnim(true);
          setTimeout(() => setEnemyBlockAnim(false), 400);
        }
      }

      // 반격 피해
      if (ev.actor === 'counter') {
        playHitSound();
        // counter는 반대 방향으로 피해가 가므로 타겟을 반대로
        if (a.actor === 'player') {
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 300);
        } else {
          setEnemyHit(true);
          setTimeout(() => setEnemyHit(false), 300);
        }
      }
    });

    const newQIndex = qIndex + 1;
    setQIndex(newQIndex);

    if (P.hp <= 0) { setPostCombatOptions({ type: 'defeat' }); setPhase('post'); return; }
    if (E.hp <= 0) {
      // 몬스터 죽음 애니메이션 및 사운드
      setEnemyHit(true);
      playSound(200, 500); // 낮은 주파수로 죽음 사운드

      // 타임라인 즉시 숨김 및 자동진행 중단
      setTimelineIndicatorVisible(false);
      setAutoProgress(false);

      // 남은 카드들을 비활성화 상태로 표시 (큐는 유지)
      const disabledIndices = queue.slice(newQIndex).map((_, idx) => newQIndex + idx);
      setDisabledCardIndices(disabledIndices);

      // 실제로 실행 완료된 플레이어 카드 수 계산 (배율 계산에 사용)
      // newQIndex는 다음에 실행될 카드의 인덱스이므로, newQIndex 이전까지만 카운트
      // 단, 현재 실행 중인 카드(qIndex)는 아직 완료되지 않았으므로 제외
      // resolvedPlayerCards 상태와 동일한 값을 사용하는 것이 정확함
      const actualResolvedCards = resolvedPlayerCards;

      // 큐 인덱스를 끝으로 이동하여 더 이상 진행되지 않도록 함
      setQIndex(queue.length);

      // 에테르 계산 애니메이션은 useEffect에서 실행됨 (상태 업데이트 타이밍 보장)
      // 에테르가 없으면 버튼 표시를 위해 0으로 설정
      if (turnEtherAccumulated === 0) {
        setEtherFinalValue(0);
      }
      return;
    }

    // 타임라인의 모든 카드 진행이 끝났을 때 에테르 계산 애니메이션은 useEffect에서 실행됨 (상태 업데이트 타이밍 보장)
  };

  // 자동진행 기능
  useEffect(() => {
    if (autoProgress && phase === 'resolve' && qIndex < queue.length) {
      const timer = setTimeout(() => {
        stepOnce();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoProgress, phase, qIndex, queue.length]);

  // 타임라인 완료 후 에테르 계산 애니메이션 실행
  // useEffect를 사용하여 turnEtherAccumulated 상태가 최신 값일 때 실행
  useEffect(() => {
    if (phase === 'resolve' && qIndex >= queue.length && queue.length > 0 && turnEtherAccumulated > 0 && etherCalcPhase === null) {
      // 모든 카드가 실행되고 에테르가 누적된 상태에서, 애니메이션이 아직 시작되지 않았을 때만 실행
      // resolvedPlayerCards를 전달하여 몬스터 사망 시에도 정확한 카드 수 사용
      setTimeout(() => startEtherCalculationAnimation(turnEtherAccumulated, resolvedPlayerCards), 50);
    }
  }, [phase, qIndex, queue.length, turnEtherAccumulated, etherCalcPhase, resolvedPlayerCards]);

  const finishTurn = (reason) => {
    addLog(`턴 종료: ${reason || ''}`);

    // 다음 턴 효과 처리 (특성 기반)
    const newNextTurnEffects = {
      guaranteedCards: [],
      bonusEnergy: 0,
      energyPenalty: 0,
      etherBlocked: false,
      mainSpecialOnly: false,
      subSpecialBoost: 0,
    };

    // 선택된 카드들의 특성 확인
    selected.forEach(card => {
      // 반복 (repeat): 다음턴에도 손패에 확정적으로 등장
      if (hasTrait(card, 'repeat')) {
        newNextTurnEffects.guaranteedCards.push(card.id);
        addLog(`🔄 "반복" - ${card.name}이(가) 다음턴에도 등장합니다.`);
      }

      // 몸풀기 (warmup): 다음턴 행동력 +2
      if (hasTrait(card, 'warmup')) {
        newNextTurnEffects.bonusEnergy += 2;
        addLog(`⚡ "몸풀기" - 다음턴 행동력 +2`);
      }

      // 탈진 (exhaust): 다음턴 행동력 -2
      if (hasTrait(card, 'exhaust')) {
        newNextTurnEffects.energyPenalty += 2;
        addLog(`😰 "탈진" - 다음턴 행동력 -2`);
      }

      // 망각 (oblivion): 이후 에테르 획득 불가
      if (hasTrait(card, 'oblivion')) {
        newNextTurnEffects.etherBlocked = true;
        addLog(`🚫 "망각" - 이후 에테르 획득이 불가능해집니다!`);
      }

      // 파탄 (ruin): 다음턴 주특기만 등장
      if (hasTrait(card, 'ruin')) {
        newNextTurnEffects.mainSpecialOnly = true;
        addLog(`⚠️ "파탄" - 다음턴은 주특기 카드만 뽑힙니다.`);
      }

      // 장군 (general): 다음턴 보조특기 등장률 25% 증가
      if (hasTrait(card, 'general')) {
        newNextTurnEffects.subSpecialBoost += 0.25;
        addLog(`👑 "장군" - 다음턴 보조특기 등장률 증가!`);
      }
    });

    // 유물 턴 종료 효과 적용 (계약서, 은화 등)
    const turnEndRelicEffects = applyTurnEndEffects(relics, {
      cardsPlayedThisTurn: selected.length,
      player,
      enemy,
    });

    // 턴 종료 유물 효과를 다음 턴 효과에 추가
    if (turnEndRelicEffects.energyNextTurn > 0) {
      newNextTurnEffects.bonusEnergy += turnEndRelicEffects.energyNextTurn;
      addLog(`📜 유물 효과: 다음턴 행동력 +${turnEndRelicEffects.energyNextTurn}`);
    }

    setNextTurnEffects(newNextTurnEffects);

    // 힘 증가 즉시 적용 (은화 등) - 상태 업데이트 후에 적용
    if (turnEndRelicEffects.strength !== 0) {
      const newStrength = playerStrength + turnEndRelicEffects.strength;
      addLog(`💪 유물 효과: 힘 ${turnEndRelicEffects.strength > 0 ? '+' : ''}${turnEndRelicEffects.strength} (총 ${newStrength})`);
      setPlayerStrength(newStrength);
    }

    // 턴 종료 시 조합 카운트 증가 (Deflation)
    const pComboEnd = detectPokerCombo(selected);
    const eComboEnd = detectPokerCombo(enemyPlan.actions);

    // 에테르 최종 계산 및 적용 (애니메이션은 stepOnce에서 처리됨)
    const basePlayerComboMult = pComboEnd ? (COMBO_MULTIPLIERS[pComboEnd.name] || 1) : 1;
    // 몬스터 사망 시 실제 실행된 카드 수(resolvedPlayerCards) 사용, 정상 종료 시에는 selected.length와 동일
    const playerComboMult = applyRelicComboMultiplier(relics, basePlayerComboMult, resolvedPlayerCards);
    const relicMultBonus = playerComboMult - basePlayerComboMult;

    const enemyComboMult = eComboEnd ? (COMBO_MULTIPLIERS[eComboEnd.name] || 1) : 1;

    // 조합 배율 적용
    let playerBeforeDeflation = Math.round(turnEtherAccumulated * playerComboMult);
    // 유물 효과 적용 (참고서, 악마의 주사위, 희귀한 조약돌)
    playerBeforeDeflation = calculateRelicEtherGain(playerBeforeDeflation, resolvedPlayerCards, relics);

    const enemyBeforeDeflation = Math.round(enemyTurnEtherAccumulated * enemyComboMult);

    // 디플레이션 적용
    const playerDeflation = pComboEnd?.name
      ? applyEtherDeflation(playerBeforeDeflation, pComboEnd.name, player.comboUsageCount || {})
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    const enemyDeflation = eComboEnd?.name
      ? applyEtherDeflation(enemyBeforeDeflation, eComboEnd.name, enemy.comboUsageCount || {})
      : { gain: enemyBeforeDeflation, multiplier: 1, usageCount: 0 };

    // finishTurn에서 항상 새로 계산 (애니메이션 시점의 값은 상태 업데이트 타이밍 문제로 부정확할 수 있음)
    const playerFinalEther = playerDeflation.gain;
    const enemyFinalEther = enemyDeflation.gain;

    console.log('[finishTurn 계산]', {
      turnEtherAccumulated,
      comboName: pComboEnd?.name,
      basePlayerComboMult,
      relicMultBonus,
      playerComboMult,
      playerBeforeDeflation,
      deflationMult: playerDeflation.multiplier,
      usageCount: playerDeflation.usageCount,
      playerFinalEther: playerFinalEther,
      selectedCards: selected.length,
      resolvedPlayerCards: resolvedPlayerCards,
      cardCountForMultiplier: resolvedPlayerCards,
      comboUsageCount: player.comboUsageCount,
      comboUsageForThisCombo: player.comboUsageCount?.[pComboEnd?.name] || 0
    });

    // 에테르 범람 계산: 현재 슬롯 내에서 100pt를 초과하는 부분은 범람
    let playerAppliedEther = 0;
    let playerOverflow = 0;

    if (playerFinalEther > 0) {
      const currentSlotPts = getCurrentSlotPts(player.etherPts);
      const nextSlotCost = getNextSlotCost(player.etherPts);
      const remainingToNextSlot = nextSlotCost - currentSlotPts;

      // 다음 슬롯까지 채울 수 있는 만큼만 적용
      playerAppliedEther = Math.min(playerFinalEther, remainingToNextSlot);
      playerOverflow = playerFinalEther - playerAppliedEther;

      const deflationText = playerDeflation.usageCount > 0
        ? ` (디플레이션 -${Math.round((1 - playerDeflation.multiplier) * 100)}%, ${playerDeflation.usageCount}회 사용)`
        : '';
      const relicText = relicMultBonus > 0 ? ` (유물 배율 +${relicMultBonus.toFixed(2)})` : '';
      const overflowText = playerOverflow > 0 ? ` [범람: ${playerOverflow} PT]` : '';
      addLog(`✴️ 에테르 획득: ${turnEtherAccumulated} × ${playerComboMult.toFixed(2)}${relicText} = ${playerBeforeDeflation} → ${playerFinalEther} PT${deflationText} (적용: ${playerAppliedEther} PT${overflowText})`);

      // 최종값 UI에 로그와 동일한 값 표시
      setEtherFinalValue(playerFinalEther);
    }
    if (enemyFinalEther > 0) {
      const deflationText = enemyDeflation.usageCount > 0
        ? ` (디플레이션: ${Math.round(enemyDeflation.multiplier * 100)}%)`
        : '';
      addLog(`☄️ 적 에테르 획득: ${enemyTurnEtherAccumulated} × ${enemyComboMult.toFixed(2)} = ${enemyBeforeDeflation} → ${enemyFinalEther} PT${deflationText}`);
    }

    setPlayer(p => {
      const newUsageCount = { ...(p.comboUsageCount || {}) };
      if (pComboEnd?.name) {
        newUsageCount[pComboEnd.name] = (newUsageCount[pComboEnd.name] || 0) + 1;
      }
      // 플레이어가 사용한 각 카드의 사용 횟수 증가 (숙련 특성용)
      queue.forEach(action => {
        if (action.actor === 'player' && action.card?.id) {
          newUsageCount[action.card.id] = (newUsageCount[action.card.id] || 0) + 1;
        }
      });
      return {
        ...p,
        block: 0,
        def: false,
        counter: 0,
        vulnMult: 1,
        vulnTurns: 0,
        etherOverdriveActive: false,
        comboUsageCount: newUsageCount,
        etherPts: (p.etherPts || 0) + playerAppliedEther,
        etherOverflow: (p.etherOverflow || 0) + playerOverflow
      };
    });

    setEnemy(e => {
      const newEnemyUsageCount = { ...(e.comboUsageCount || {}) };
      if (eComboEnd?.name) {
        newEnemyUsageCount[eComboEnd.name] = (newEnemyUsageCount[eComboEnd.name] || 0) + 1;
      }
      return {
        ...e,
        block: 0,
        def: false,
        counter: 0,
        vulnMult: 1,
        vulnTurns: 0,
        etherOverdriveActive: false,
        comboUsageCount: newEnemyUsageCount,
        etherPts: (e.etherPts || 0) + enemyFinalEther
      };
    });

    // 에테르 누적 카운터 리셋 (애니메이션 상태는 다음 턴 시작 시 리셋됨)
    setTurnEtherAccumulated(0);
    setEnemyTurnEtherAccumulated(0);

    setSelected([]); setQueue([]); setQIndex(0); setFixedOrder(null); setUsedCardIndices([]);
    setDisappearingCards([]); setHiddenCards([]);

    // 턴 종료 시 승리/패배 체크
    if (enemy.hp <= 0) {
      setTimeout(() => {
        setPostCombatOptions({ type: 'victory' });
        setPhase('post');
      }, 500);
      return;
    }
    if (player.hp <= 0) {
      setTimeout(() => {
        setPostCombatOptions({ type: 'defeat' });
        setPhase('post');
      }, 500);
      return;
    }

    setPhase('select');
  };

  const runAll = () => {
    if (qIndex >= queue.length) return;
    playSound(1000, 150); // 전부실행 효과음
    let P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, etherPts: player.etherPts || 0 };
    let E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, etherPts: enemy.etherPts || 0 };
    const tempState = { player: P, enemy: E, log: [] };
    const newEvents = {};
    let enemyDefeated = false;

    for (let i = qIndex; i < queue.length; i++) {
      const a = queue[i];

      // 적이 이미 죽었으면 적의 행동은 건너뛰기
      if (enemyDefeated && a.actor === 'enemy') {
        continue;
      }

      const { events } = applyAction(tempState, a.actor, a.card);
      newEvents[i] = events;
      events.forEach(ev => addLog(ev.msg));

      // 카드 사용 시 에테르 누적 (실제 적용은 턴 종료 시)
      if (a.actor === 'player') {
        setTurnEtherAccumulated(prev => prev + BASE_ETHER_PER_CARD);
      } else if (a.actor === 'enemy') {
        setEnemyTurnEtherAccumulated(prev => prev + BASE_ETHER_PER_CARD);
      }

      if (P.hp <= 0) {
        setPlayer(prev => ({ ...prev, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 }));
        setEnemy(prev => ({ ...prev, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 }));
        setActionEvents(prev => ({ ...prev, ...newEvents }));
        setQIndex(i + 1);
        setPostCombatOptions({ type: 'defeat' }); setPhase('post');
        return;
      }
      if (E.hp <= 0 && !enemyDefeated) {
        // 몬스터 죽음 애니메이션 및 사운드
        setEnemyHit(true);
        playSound(200, 500);
        addLog('💀 적 처치! 남은 적 행동 건너뛰기');
        enemyDefeated = true;
        // 계속 진행 (플레이어의 남은 행동 처리)
      }
    }
    setPlayer(prev => ({ ...prev, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 }));
    setEnemy(prev => ({ ...prev, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 }));
    setActionEvents(prev => ({ ...prev, ...newEvents }));
    setQIndex(queue.length);

    // 타임라인 완료 후 에테르 계산 애니메이션 시작
    if (turnEtherAccumulated > 0) {
      const pCombo = detectPokerCombo(selected);
      const playerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
      const playerBeforeDeflation = Math.round(turnEtherAccumulated * playerComboMult);

      // 디플레이션 적용
      const playerDeflation = pCombo?.name
        ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
        : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

      const playerFinalEther = playerDeflation.gain;

      console.log('[runAll 애니메이션]', {
        turnEtherAccumulated,
        comboName: pCombo?.name,
        playerComboMult,
        playerBeforeDeflation,
        deflationMult: playerDeflation.multiplier,
        usageCount: playerDeflation.usageCount,
        playerFinalEther,
        selectedCards: selected.length
      });

      // 1단계: 합계 강조
      setEtherCalcPhase('sum');
      setTimeout(() => {
        // 2단계: 곱셈 강조 + 명쾌한 사운드
        setEtherCalcPhase('multiply');
        playSound(800, 100); // 명쾌한 사운드
        setTimeout(() => {
          // 3단계: 디플레이션 배지 애니메이션 + 저음 사운드
          if (playerDeflation.usageCount > 0) {
            setEtherCalcPhase('deflation');
            playSound(200, 150); // 저음 사운드
          }
          setTimeout(() => {
            // 4단계: 최종값 표시 + 묵직한 사운드
            setEtherCalcPhase('result');
            // 최종값은 finishTurn에서 설정됨 (애니메이션 시점의 값은 부정확)
            playSound(400, 200); // 묵직한 사운드
          }, playerDeflation.usageCount > 0 ? 400 : 0);
        }, 600);
      }, 400);
    }
  };

  const removeSelectedAt = (i) => setSelected(selected.filter((_, idx) => idx !== i));

  const playerTimeline = useMemo(() => {
    if (phase === 'select') {
      // 현재 선택된 카드들의 조합 감지
      const currentCombo = detectPokerCombo(selected);
      const comboCardCosts = new Set();
      if (currentCombo?.bonusKeys) {
        currentCombo.bonusKeys.forEach(cost => comboCardCosts.add(cost));
      }
      const isFlush = currentCombo?.name === '플러쉬';

      let ps = 0;
      return selected.map((c, idx) => {
        // 카드가 조합에 포함되는지 확인
        const isInCombo = isFlush || comboCardCosts.has(c.actionCost);
        const usageCount = player.comboUsageCount?.[c.id] || 0;
        const enhancedCard = applyTraitModifiers(c, {
          usageCount,
          isInCombo,
        });
        ps += enhancedCard.speedCost;
        return { actor: 'player', card: enhancedCard, sp: ps, idx };
      });
    }
    if (phase === 'respond' && fixedOrder) return fixedOrder.filter(x => x.actor === 'player');
    if (phase === 'resolve') return queue.filter(x => x.actor === 'player');
    return [];
  }, [phase, selected, fixedOrder, queue, player.comboUsageCount]);

  const enemyTimeline = useMemo(() => {
    if (phase === 'select') return [];
    if (phase === 'respond' && fixedOrder) return fixedOrder.filter(x => x.actor === 'enemy');
    if (phase === 'resolve') return queue.filter(x => x.actor === 'enemy');
    return [];
  }, [phase, fixedOrder, queue]);

  if (!enemy) return <div className="text-white p-4">로딩…</div>;

  const handDisabled = (c) => (
    selected.length >= MAX_SUBMIT_CARDS ||
    totalSpeed + c.speedCost > player.maxSpeed ||
    totalEnergy + c.actionCost > player.maxEnergy
  );
  const playerEtherValue = player?.etherPts ?? 0;
  const playerEtherSlots = etherSlots(playerEtherValue);
  const enemyEtherValue = enemy?.etherPts ?? 0;
  const enemyEtherSlots = etherSlots(enemyEtherValue);
  const playerEnergyBudget = player.maxEnergy || BASE_PLAYER_ENERGY;
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergy);

  // 적 조합 감지 (표시용)
  const enemyCombo = useMemo(() => detectPokerCombo(enemyPlan.actions || []), [enemyPlan.actions]);

  // 적 성향 힌트 추출
  const enemyHint = useMemo(() => {
    const hintLog = log.find(line => line.includes('적 성향 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 성향 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [log]);

  // 예상 피해량 계산 및 사운드
  useEffect(() => {
    if (!(phase === 'select' || phase === 'respond') || !enemy) {
      setPreviewDamage({ value: 0, lethal: false, overkill: false });
      lethalSoundRef.current = false;
      overkillSoundRef.current = false;
      return;
    }
    const order = (fixedOrder && fixedOrder.length > 0) ? fixedOrder : playerTimeline;
    if (!order || order.length === 0) {
      setPreviewDamage({ value: 0, lethal: false, overkill: false });
      lethalSoundRef.current = false;
      overkillSoundRef.current = false;
      return;
    }
    const sim = simulatePreview({
      player,
      enemy,
      fixedOrder: order,
      willOverdrive,
      enemyMode: enemyPlan.mode,
      enemyActions: enemyPlan.actions,
    }) || { pDealt: 0 };
    const value = sim.pDealt || 0;
    const lethal = value > enemy.hp;
    const overkill = value > enemy.maxHp;
    setPreviewDamage({ value, lethal, overkill });
    if (overkill && !overkillSoundRef.current) {
      playSound(1600, 260);
      overkillSoundRef.current = true;
      lethalSoundRef.current = true;
    } else if (lethal && !lethalSoundRef.current) {
      playSound(1200, 200);
      lethalSoundRef.current = true;
    } else if (!lethal) {
      lethalSoundRef.current = false;
      overkillSoundRef.current = false;
    }
  }, [phase, player, enemy, fixedOrder, playerTimeline, willOverdrive, enemyPlan.mode, enemyPlan.actions]);

  return (
    <div className="legacy-battle-root w-full min-h-screen pb-64">
      {/* 예상 피해량 - 오른쪽 고정 패널 */}
      <div className="expect-sidebar-fixed">
        <ExpectedDamagePreview
          player={player}
          enemy={enemy}
          fixedOrder={fixedOrder || playerTimeline}
          willOverdrive={willOverdrive}
          enemyMode={enemyPlan.mode}
          enemyActions={enemyPlan.actions}
          phase={phase}
          log={log}
          qIndex={qIndex}
          queue={queue}
          stepOnce={stepOnce}
          runAll={runAll}
          finishTurn={finishTurn}
          postCombatOptions={postCombatOptions}
          handleExitToMap={handleExitToMap}
          autoProgress={autoProgress}
          setAutoProgress={setAutoProgress}
          resolveStartPlayer={resolveStartPlayer}
          resolveStartEnemy={resolveStartEnemy}
        />
      </div>

      {/* 상단 메인 영역 */}
      <div className="w-full px-4" style={{ marginRight: '280px', marginLeft: '150px' }}>

        {/* 유물 표시 */}
        {relics && relics.length > 0 && (
          <div style={{
            display: 'flex',
            marginBottom: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '2px solid rgba(148, 163, 184, 0.5)',
              borderRadius: '12px',
              boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
            }}>
              {relics.map((relicId, index) => {
                const relic = RELICS[relicId];
                if (!relic) return null;

                const isActivated = relicActivated === relicId;
                const isHovered = hoveredRelic === relicId;
                const rarityText = {
                  [RELIC_RARITIES.COMMON]: '일반',
                  [RELIC_RARITIES.RARE]: '희귀',
                  [RELIC_RARITIES.SPECIAL]: '특별',
                  [RELIC_RARITIES.LEGENDARY]: '전설'
                }[relic.rarity] || '알 수 없음';

                return (
                  <div key={index} style={{ position: 'relative' }}>
                    <div
                      onMouseEnter={() => setHoveredRelic(relicId)}
                      onMouseLeave={() => setHoveredRelic(null)}
                      style={{
                        fontSize: '2rem',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        filter: isActivated ? 'brightness(1.5) drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))' : 'brightness(1)',
                        transform: isHovered ? 'scale(1.15)' : (isActivated ? 'scale(1.2)' : 'scale(1)'),
                        animation: isActivated ? 'relicActivate 0.5s ease' : 'none'
                      }}>
                      <span>{relic.emoji}</span>
                    </div>

                    {/* 개별 툴팁 */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '8px',
                        background: 'rgba(15, 23, 42, 0.98)',
                        border: `2px solid ${RELIC_RARITY_COLORS[relic.rarity]}`,
                        borderRadius: '8px',
                        padding: '12px 16px',
                        minWidth: '220px',
                        boxShadow: `0 4px 20px ${RELIC_RARITY_COLORS[relic.rarity]}66`,
                        zIndex: 1000,
                        pointerEvents: 'none'
                      }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: RELIC_RARITY_COLORS[relic.rarity], marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.3rem' }}>{relic.emoji}</span>
                          {relic.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: RELIC_RARITY_COLORS[relic.rarity], opacity: 0.8, marginBottom: '8px' }}>
                          {rarityText}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                          {relic.description}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline - 1줄 길게 (화면 가득) */}
        <div style={{ marginBottom: '32px' }}>
          <div className="panel-enhanced timeline-panel">
            <div className="timeline-body" style={{ marginTop: '0' }}>
              <div className="timeline-axis">
                {generateSpeedTicks(Math.max(player.maxSpeed, enemy.maxSpeed)).map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
              {/* 타임라인 progress indicator (시곗바늘) */}
              {phase === 'resolve' && (
                <div
                  className="timeline-progress-indicator"
                  style={{
                    left: `${timelineProgress}%`,
                    opacity: timelineIndicatorVisible ? 1 : 0,
                    transition: 'left 0.5s linear, opacity 0.3s ease-out'
                  }}
                />
              )}
              <div className="timeline-lanes">
                <div className="timeline-lane player-lane">
                  {Array.from({ length: Math.max(player.maxSpeed, enemy.maxSpeed) + 1 }).map((_, i) => (
                    <div key={i} className="timeline-gridline" style={{ left: `${(i / Math.max(player.maxSpeed, enemy.maxSpeed)) * 100}%` }} />
                  ))}
                  {playerTimeline.map((a, idx) => {
                    const Icon = a.card.icon || Sword;
                    const sameCount = playerTimeline.filter((q, i) => i < idx && q.sp === a.sp).length;
                    const offset = sameCount * 28;
                    const strengthBonus = player.strength || 0;
                    const num = a.card.type === 'attack'
                      ? (a.card.damage + strengthBonus) * (a.card.hits || 1)
                      : a.card.type === 'defense'
                      ? (a.card.block || 0) + strengthBonus
                      : 0;
                    // 타임라인에서 현재 진행 중인 액션인지 확인
                    const globalIndex = phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                    const isExecuting = executingCardIndex === globalIndex;
                    const isUsed = usedCardIndices.includes(globalIndex) && globalIndex < qIndex;
                    // 정규화: player의 속도를 비율로 변환하여 표시
                    const normalizedPosition = (a.sp / player.maxSpeed) * 100;
                    return (
                      <div key={idx}
                        className={`timeline-marker marker-player ${isExecuting ? 'timeline-active' : ''} ${isUsed ? 'timeline-used' : ''}`}
                        style={{ left: `${normalizedPosition}%`, top: `${6 + offset}px` }}>
                        <Icon size={14} className="text-white" />
                        <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="timeline-lane enemy-lane">
                  {Array.from({ length: Math.max(player.maxSpeed, enemy.maxSpeed) + 1 }).map((_, i) => (
                    <div key={i} className="timeline-gridline" style={{ left: `${(i / Math.max(player.maxSpeed, enemy.maxSpeed)) * 100}%` }} />
                  ))}
                  {enemyTimeline.map((a, idx) => {
                    const Icon = a.card.icon || Shield;
                    const sameCount = enemyTimeline.filter((q, i) => i < idx && q.sp === a.sp).length;
                    const offset = sameCount * 28;
                    const num = a.card.type === 'attack' ? (a.card.damage * (a.card.hits || 1)) : (a.card.block || 0);
                    // 타임라인에서 현재 진행 중인 액션인지 확인
                    const globalIndex = phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                    const isExecuting = executingCardIndex === globalIndex;
                    const isUsed = usedCardIndices.includes(globalIndex) && globalIndex < qIndex;
                    // 정규화: enemy의 속도를 비율로 변환하여 표시
                    const normalizedPosition = (a.sp / enemy.maxSpeed) * 100;
                    return (
                      <div key={idx}
                        className={`timeline-marker marker-enemy ${isExecuting ? 'timeline-active' : ''} ${isUsed ? 'timeline-used' : ''}`}
                        style={{ left: `${normalizedPosition}%`, top: `${6 + offset}px` }}>
                        <Icon size={14} className="text-white" />
                        <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 플레이어/적 정보 + 중앙 정보 통합 레이아웃 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '50px', gap: '120px' }}>
          {/* 왼쪽: 플레이어 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center' }}>
            {/* 플레이어 콤보 - 절대 위치로 오른쪽 배치 */}
            {currentCombo && (phase === 'select' || phase === 'respond' || phase === 'resolve') && (
              <div className="combo-display" style={{ position: 'absolute', top: '-5px', left: '90px', textAlign: 'center', minHeight: '140px' }}>
                <div style={{
                  fontSize: '1.92rem',
                  fontWeight: 'bold',
                  color: '#fbbf24',
                  marginBottom: '2px',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <span>{currentCombo.name}</span>
                  {currentDeflation && (
                    <div style={{
                      position: 'absolute',
                      left: 'calc(50% + 80px)',
                      fontSize: etherCalcPhase === 'deflation' ? '1.1rem' : '0.9rem',
                      fontWeight: 'bold',
                      color: '#fca5a5',
                      background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.25), rgba(252, 165, 165, 0.1))',
                      border: '1.5px solid rgba(252, 165, 165, 0.5)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      letterSpacing: '0.05em',
                      boxShadow: '0 0 10px rgba(252, 165, 165, 0.3), inset 0 0 5px rgba(252, 165, 165, 0.15)',
                      transition: 'font-size 0.3s ease, transform 0.3s ease',
                      transform: etherCalcPhase === 'deflation' ? 'scale(1.2)' : 'scale(1)',
                      textShadow: etherCalcPhase === 'deflation' ? '0 0 15px rgba(252, 165, 165, 0.6)' : 'none'
                    }}>
                      -{Math.round((1 - currentDeflation.multiplier) * 100)}%
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: etherPulse ? '1.8rem' : (etherCalcPhase === 'sum' ? '2rem' : '1.5rem'),
                  color: '#fbbf24',
                  fontWeight: 'bold',
                  letterSpacing: '0.2em',
                  marginBottom: '2px',
                  transition: 'font-size 0.3s ease, transform 0.3s ease',
                  transform: etherPulse ? 'scale(1.2)' : (etherCalcPhase === 'sum' ? 'scale(1.3)' : 'scale(1)'),
                  textShadow: etherCalcPhase === 'sum' ? '0 0 20px #fbbf24' : 'none',
                  visibility: phase === 'resolve' ? 'visible' : 'hidden',
                  height: '1.8rem'
                }}>
                  + {turnEtherAccumulated.toString().split('').join(' ')} P T
                </div>
                <div style={{
                  fontSize: etherCalcPhase === 'multiply' ? '1.6rem' : '1.32rem',
                  color: '#fbbf24',
                  fontWeight: 'bold',
                  letterSpacing: '0.15em',
                  minWidth: '400px',
                  height: '2rem',
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'font-size 0.3s ease, transform 0.3s ease',
                  transform: etherCalcPhase === 'multiply' ? 'scale(1.3)' : 'scale(1)',
                  textShadow: etherCalcPhase === 'multiply' ? '0 0 20px #fbbf24' : 'none'
                }}>
                  <span>× {finalComboMultiplier.toFixed(2).split('').join(' ')}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <EtherBar
                key={`player-ether-${playerEtherValue}`}
                pts={playerEtherValue}
                slots={playerEtherSlots}
                previewGain={0}
                label="ETHER"
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="character-display" style={{ fontSize: '64px' }}>🧙‍♂️</div>
                  <div>
                    <div className={playerHit ? 'hit-animation' : ''} style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold' }}>
                      ❤️ {player.hp}/{player.maxHp}
                      {player.block > 0 && <span className={playerBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa', marginLeft: '8px' }}>🛡️{player.block}</span>}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div className="hp-bar-enhanced mb-1" style={{ width: '200px', height: '12px', position: 'relative', overflow: 'hidden' }}>
                        <div className="hp-fill" style={{ width: `${(player.hp / player.maxHp) * 100}%` }}></div>
                        {player.block > 0 && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${Math.min((player.block / player.maxHp) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                            borderRight: '2px solid #60a5fa'
                          }}></div>
                        )}
                      </div>
                      {/* 최종 합계값 텍스트창 - 체력바 하단 (진행 단계에서만 표시) */}
                      {phase === 'resolve' && etherFinalValue !== null && (
                        <div style={{
                          position: 'absolute',
                          top: '60px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          color: '#fbbf24',
                          letterSpacing: '0.15em',
                          whiteSpace: 'nowrap',
                          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.1))',
                          border: '2px solid #fbbf24',
                          borderRadius: '8px',
                          padding: '6px 16px',
                          boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 10px rgba(251, 191, 36, 0.2)'
                        }}>
                          {etherFinalValue.toString().split('').join(' ')} P T
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#7dd3fc', marginTop: '4px' }}>플레이어</div>
                    {player.strength !== 0 && (
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: player.strength > 0 ? '#fbbf24' : '#ef4444', marginTop: '2px' }}>
                        💪 힘: {player.strength}
                      </div>
                    )}
                    {playerAgility !== 0 && (
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: playerAgility > 0 ? '#34d399' : '#ef4444', marginTop: '2px' }}>
                        ⚡ 민첩: {playerAgility}
                      </div>
                    )}
                    {player.etherOverflow > 0 && (
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#a78bfa', marginTop: '2px' }}>
                        🌊 범람: {player.etherOverflow} PT
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 중앙: 단계 정보 */}
          <div style={{ textAlign: 'center', flex: '1', paddingTop: '20px' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f8fafc', textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: '16px' }}>
              {phase === 'select' ? '선택 단계' : phase === 'respond' ? '대응 단계' : '진행 단계'}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#7dd3fc', marginBottom: '12px' }}>
              속도 {totalSpeed}/{MAX_SPEED} · 선택 {selected.length}/{MAX_SUBMIT_CARDS}
            </div>

            {/* 버튼들 - 속도/선택 텍스트 하단 */}
            {phase === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                <button onClick={redrawHand} disabled={!canRedraw} className="btn-enhanced flex items-center gap-2" style={{ fontSize: '1rem', padding: '8px 20px', minWidth: '200px' }}>
                  <RefreshCw size={18} /> 리드로우 (R)
                </button>
                <button onClick={() => { startResolve(); playSound(900, 120); }} disabled={selected.length === 0} className="btn-enhanced btn-primary flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '9.6px 24px', fontWeight: '700', minWidth: '200px' }}>
                  <Play size={22} /> 제출 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
                </button>
                <button onClick={() => setWillOverdrive(v => !v)}
                  disabled={etherSlots(player.etherPts) <= 0}
                  className={`btn-enhanced ${willOverdrive ? 'btn-primary' : ''} flex items-center gap-2`}
                  style={{ fontSize: '1rem', padding: '8px 20px', minWidth: '200px' }}>
                  ✨ 기원 {willOverdrive ? 'ON' : 'OFF'} (Space)
                </button>
              </div>
            )}
            {phase === 'respond' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button onClick={beginResolveFromRespond} className="btn-enhanced btn-success flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '9.6px 24px', fontWeight: '700', minWidth: '200px' }}>
                  <Play size={22} /> 진행 시작 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
                </button>
              </div>
            )}
            {phase === 'resolve' && qIndex < queue.length && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  onClick={() => setAutoProgress(!autoProgress)}
                  className={`btn-enhanced flex items-center gap-2 ${autoProgress ? 'btn-primary' : ''}`}
                  style={{ fontSize: '1.25rem', padding: '12px 24px', fontWeight: '700', minWidth: '200px' }}
                >
                  {autoProgress ? (
                    <>⏸️ 진행 중지 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span></>
                  ) : (
                    <>▶️ 진행 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span></>
                  )}
                </button>
              </div>
            )}
            {phase === 'resolve' && qIndex >= queue.length && etherFinalValue !== null && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                {enemy.hp <= 0 ? (
                  <button onClick={() => finishTurn('전투 승리')} className="btn-enhanced btn-success flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '12px 24px', fontWeight: '700', minWidth: '200px' }}>
                    🎉 전투 종료 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
                  </button>
                ) : (
                  <button onClick={() => finishTurn('수동 턴 종료')} className="btn-enhanced btn-primary flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '12px 24px', fontWeight: '700', minWidth: '200px' }}>
                    ⏭️ 턴 종료 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽: 적 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center' }}>
            {/* 몬스터 콤보 - 절대 위치로 왼쪽 배치 */}
                {enemyCombo && (
                  <div className="combo-display" style={{ position: 'absolute', top: '0', right: '180px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.92rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '2px' }}>
                      {enemyCombo.name}
                    </div>
                    <div style={{ fontSize: '1.32rem', color: '#fbbf24', fontWeight: 'bold' }}>
                      ×{(COMBO_MULTIPLIERS[enemyCombo.name] || 1).toFixed(2)}
                    </div>
                  </div>
                )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {enemyHint && (
                    <div style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '4px' }}>💡 {enemyHint}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      {(phase === 'select' || phase === 'respond') && previewDamage.value > 0 && (
                        <div className={`predicted-damage-inline ${previewDamage.lethal ? 'lethal' : ''} ${previewDamage.overkill ? 'overkill' : ''}`}>
                          <span className="predicted-damage-inline-value">🗡️ -{previewDamage.value}</span>
                          {previewDamage.lethal && (
                            <span className={`predicted-damage-inline-icon ${previewDamage.overkill ? 'overkill-icon' : ''}`} aria-hidden="true">
                              {previewDamage.overkill ? '☠️' : '💀'}
                            </span>
                          )}
                        </div>
                      )}
                      <div className={enemyHit ? 'hit-animation' : ''} style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'right' }}>
                        {enemy.block > 0 && <span className={enemyBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa', marginRight: '8px' }}>🛡️{enemy.block}</span>}
                        ❤️ {enemy.hp}/{enemy.maxHp}
                      </div>
                      <div className="hp-bar-enhanced mb-1" style={{ width: '200px', height: '12px', position: 'relative', overflow: 'hidden' }}>
                        <div className="hp-fill" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}></div>
                        {enemy.block > 0 && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${Math.min((enemy.block / enemy.maxHp) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                            borderRight: '2px solid #60a5fa'
                          }}></div>
                        )}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fca5a5', marginTop: '4px', textAlign: 'right' }}>
                        {enemy.name}
                      </div>
                    </div>
                    <div className="character-display" style={{ fontSize: '64px' }}>👹</div>
                  </div>
                </div>
              </div>
              <EtherBar
                key={`enemy-ether-${enemyEtherValue}`}
                pts={enemyEtherValue}
                slots={enemyEtherSlots}
                previewGain={0}
                label="ETHER"
                color="red"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 독립 활동력 표시 (좌측 하단 고정) */}
      {(phase === 'select' || phase === 'respond' || phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="energy-display-fixed">
          <div className="energy-orb-compact">
            {remainingEnergy} / {player.maxEnergy}
          </div>
        </div>
      )}

      {/* 간소화/정렬 버튼 (우측 하단 고정) */}
      {phase === 'select' && (
        <div className="submit-button-fixed" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => {
            setIsSimplified(prev => {
              const newVal = !prev;
              try { localStorage.setItem('battleIsSimplified', newVal.toString()); } catch { }
              return newVal;
            });
            playSound(500, 60);
          }} className={`btn-enhanced ${isSimplified ? 'btn-primary' : ''} flex items-center gap-2`}>
            {isSimplified ? '📋' : '📄'} 간소화 (Q)
          </button>
          <button onClick={cycleSortType} className="btn-enhanced flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
            🔀 정렬 ({sortType === 'speed' ? '시간' : sortType === 'energy' ? '행동력' : sortType === 'value' ? '밸류' : '종류'}) (F)
          </button>
        </div>
      )}
      {player && player.hp <= 0 && (
        <div className="submit-button-fixed">
          <button onClick={() => window.location.reload()} className="btn-enhanced flex items-center gap-2">
            🔄 재시작
          </button>
        </div>
      )}

      {/* 하단 고정 손패 영역 */}
      {(phase === 'select' || phase === 'respond' || phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="hand-area">

          <div className="hand-flags">
            {player && player.hp <= 0 && (
              <div className="hand-flag defeat">💀 패배...</div>
            )}
          </div>

          {phase === 'select' && (() => {
            // 현재 선택된 카드들의 조합 감지
            const currentCombo = detectPokerCombo(selected);
            const comboCardCosts = new Set();
            if (currentCombo?.bonusKeys) {
              currentCombo.bonusKeys.forEach(cost => comboCardCosts.add(cost));
            }
            // 플러쉬는 모든 카드가 조합 대상
            const isFlush = currentCombo?.name === '플러쉬';

            return (
            <div className="hand-cards">
              {getSortedHand().map((c, idx) => {
                const Icon = c.icon;
                const usageCount = player.comboUsageCount?.[c.id] || 0;
                const selIndex = selected.findIndex(s => s.id === c.id);
                const sel = selIndex !== -1;
                // 카드가 조합에 포함되는지 확인
                const isInCombo = sel && (isFlush || comboCardCosts.has(c.actionCost));
                const enhancedCard = applyTraitModifiers(c, { usageCount, isInCombo });
                const disabled = handDisabled(c) && !sel;
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
                const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';
                // 협동 특성이 있고 조합에 포함된 경우
                const hasCooperation = hasTrait(c, 'cooperation');
                const cooperationActive = hasCooperation && isInCombo;
                return (
                  <div
                    key={c.id + idx}
                    onClick={() => !disabled && toggle(enhancedCard)}
                    onMouseEnter={(e) => {
                      const cardEl = e.currentTarget.querySelector('.game-card-large');
                      showCardTraitTooltip(c, cardEl);
                    }}
                    onMouseLeave={hideCardTraitTooltip}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', marginLeft: idx === 0 ? '0' : '-20px' }}
                  >
                    <div
                      className={`game-card-large select-phase-card ${c.type === 'attack' ? 'attack' : 'defense'} ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                      style={cooperationActive ? {
                        boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.8), 0 0 40px 8px rgba(34, 197, 94, 0.4)',
                        border: '3px solid #22c55e'
                      } : {}}
                    >
                      <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{enhancedCard.actionCost || c.actionCost}</div>
                      {sel && <div className="selection-number">{selIndex + 1}</div>}
                      <div className="card-stats-sidebar">
                        {enhancedCard.damage != null && enhancedCard.damage > 0 && (
                          <div className="card-stat-item attack">
                            ⚔️{enhancedCard.damage + (player.strength || 0)}{enhancedCard.hits ? `×${enhancedCard.hits}` : ''}
                          </div>
                        )}
                        {enhancedCard.block != null && enhancedCard.block > 0 && (
                          <div className="card-stat-item defense">
                            🛡️{enhancedCard.block + (player.strength || 0)}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          ⏱️{enhancedCard.speedCost}
                        </div>
                      </div>
                      <div className="card-header">
                        <div className="font-black text-sm" style={{ color: nameColor }}>{c.name}</div>
                      </div>
                      <div className="card-icon-area">
                        <Icon size={60} className="text-white opacity-80" />
                        {disabled && (
                          <div className="card-disabled-overlay">
                            <X size={80} className="text-red-500" strokeWidth={4} />
                          </div>
                        )}
                      </div>
                      <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                        {c.traits && c.traits.length > 0 && (
                          <span style={{ fontWeight: 600, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {c.traits.map((traitId) => {
                              const trait = TRAITS[traitId];
                              if (!trait) return null;
                              const isPositive = trait.type === 'positive';
                              return (
                                <span key={traitId} style={{
                                  color: isPositive ? '#22c55e' : '#ef4444',
                                  background: isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isPositive ? '#22c55e' : '#ef4444'}`
                                }}>
                                  {trait.name}
                                </span>
                              );
                            })}
                          </span>
                        )}
                        <span className="card-description">{c.description || ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            );
          })()}

          {phase === 'respond' && fixedOrder && (
            <div className="hand-cards" style={{ justifyContent: 'center' }}>
              {fixedOrder.filter(a => a.actor === 'player').map((action, idx, arr) => {
                const c = action.card;
                const Icon = c.icon;
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
                const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';
                return (
                  <div
                    key={idx}
                    onMouseEnter={(e) => {
                      const cardEl = e.currentTarget.querySelector('.game-card-large');
                      showCardTraitTooltip(c, cardEl);
                    }}
                    onMouseLeave={hideCardTraitTooltip}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', position: 'relative', marginLeft: idx === 0 ? '0' : '-20px' }}
                  >
                    <div className={`game-card-large respond-phase-card ${c.type === 'attack' ? 'attack' : 'defense'}`}>
                      <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{c.actionCost}</div>
                      <div className="card-stats-sidebar">
                        {c.damage != null && c.damage > 0 && (
                          <div className="card-stat-item attack">
                            ⚔️{c.damage + (player.strength || 0)}{c.hits ? `×${c.hits}` : ''}
                          </div>
                        )}
                        {c.block != null && c.block > 0 && (
                          <div className="card-stat-item defense">
                            🛡️{c.block + (player.strength || 0)}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          ⏱️{c.speedCost}
                        </div>
                      </div>
                      <div className="card-header">
                        <div className="font-black text-sm" style={{ color: nameColor }}>{c.name}</div>
                      </div>
                      <div className="card-icon-area">
                        <Icon size={60} className="text-white opacity-80" />
                      </div>
                      <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                        {c.traits && c.traits.length > 0 && (
                          <span style={{ fontWeight: 600, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {c.traits.map((traitId) => {
                              const trait = TRAITS[traitId];
                              if (!trait) return null;
                              const isPositive = trait.type === 'positive';
                              return (
                                <span key={traitId} style={{
                                  color: isPositive ? '#22c55e' : '#ef4444',
                                  background: isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isPositive ? '#22c55e' : '#ef4444'}`
                                }}>
                                  {trait.name}
                                </span>
                              );
                            })}
                          </span>
                        )}
                        <span className="card-description">{c.description || ''}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {idx > 0 && (
                        <button onClick={() => {
                          const playerActions = fixedOrder.filter(a => a.actor === 'player');
                          const newPlayerActions = [...playerActions];
                          [newPlayerActions[idx - 1], newPlayerActions[idx]] = [newPlayerActions[idx], newPlayerActions[idx - 1]];
                          const enemyActions = fixedOrder.filter(a => a.actor === 'enemy');
                          setFixedOrder(sortCombinedOrderStablePF(newPlayerActions.map(a => a.card), enemyActions.map(a => a.card), playerAgility, 0));
                        }} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                          ←
                        </button>
                      )}
                      {idx < arr.length - 1 && (
                        <button onClick={() => {
                          const playerActions = fixedOrder.filter(a => a.actor === 'player');
                          const newPlayerActions = [...playerActions];
                          [newPlayerActions[idx], newPlayerActions[idx + 1]] = [newPlayerActions[idx + 1], newPlayerActions[idx]];
                          const enemyActions = fixedOrder.filter(a => a.actor === 'enemy');
                          setFixedOrder(sortCombinedOrderStablePF(newPlayerActions.map(a => a.card), enemyActions.map(a => a.card), playerAgility, 0));
                        }} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                          →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {phase === 'resolve' && queue && queue.length > 0 && (
            <div className="hand-cards" style={{ justifyContent: 'center' }}>
              {queue.filter(a => a.actor === 'player').map((a, i) => {
                const Icon = a.card.icon;
                const globalIndex = queue.findIndex(q => q === a);
                const isUsed = usedCardIndices.includes(globalIndex);
                const isDisappearing = disappearingCards.includes(globalIndex);
                const isHidden = hiddenCards.includes(globalIndex);
                const isDisabled = disabledCardIndices.includes(globalIndex); // 비활성화된 카드 (몬스터 사망 시)
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(a.card.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(a.card.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';

                // 완전히 숨겨진 카드는 렌더링하지 않음
                if (isHidden) return null;

                return (
                  <div
                    key={`resolve-${globalIndex}`}
                    onMouseEnter={(e) => {
                      const cardEl = e.currentTarget.querySelector('.game-card-large');
                      showCardTraitTooltip(a.card, cardEl);
                    }}
                    onMouseLeave={hideCardTraitTooltip}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'center',
                      position: 'relative',
                      marginLeft: i === 0 ? '0' : '-20px',
                      opacity: isDisabled ? 0.4 : 1, // 비활성화된 카드는 투명하게
                      filter: isDisabled ? 'grayscale(0.8) brightness(0.6)' : 'none' // 빛바란 효과
                    }}
                  >
                    <div className={`game-card-large resolve-phase-card ${a.card.type === 'attack' ? 'attack' : 'defense'} ${isUsed ? 'card-used' : ''} ${isDisappearing ? 'card-disappearing' : ''}`}>
                      <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{a.card.actionCost}</div>
                      <div className="card-stats-sidebar">
                        {a.card.damage != null && a.card.damage > 0 && (
                          <div className="card-stat-item attack">
                            ⚔️{a.card.damage + (player.strength || 0)}{a.card.hits ? `×${a.card.hits}` : ''}
                          </div>
                        )}
                        {a.card.block != null && a.card.block > 0 && (
                          <div className="card-stat-item defense">
                            🛡️{a.card.block + (player.strength || 0)}
                          </div>
                        )}
                        {a.card.counter !== undefined && (
                          <div className="card-stat-item counter">
                            ⚡{a.card.counter}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          ⏱️{a.card.speedCost}
                        </div>
                      </div>
                      <div className="card-header">
                        <div className="text-white font-black text-sm">{a.card.name}</div>
                      </div>
                      <div className="card-icon-area">
                        <Icon size={60} className="text-white opacity-80" />
                      </div>
                      <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                        {a.card.traits && a.card.traits.length > 0 && (
                          <span style={{ fontWeight: 600, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {a.card.traits.map((traitId) => {
                              const trait = TRAITS[traitId];
                              if (!trait) return null;
                              const isPositive = trait.type === 'positive';
                              return (
                                <span key={traitId} style={{
                                  color: isPositive ? '#22c55e' : '#ef4444',
                                  background: isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: `1px solid ${isPositive ? '#22c55e' : '#ef4444'}`
                                }}>
                                  {trait.name}
                                </span>
                              );
                            })}
                          </span>
                        )}
                        <span className="card-description">{a.card.description || ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showCharacterSheet && <CharacterSheet onClose={closeCharacterSheet} />}

      {/* 특성 툴팁 */}
      {showTooltip && tooltipVisible && hoveredCard && hoveredCard.card.traits && hoveredCard.card.traits.length > 0 && (
        <div
          className={`trait-tooltip ${tooltipVisible ? 'tooltip-visible' : ''}`}
          style={{
            position: 'fixed',
            left: `${hoveredCard.x}px`,
            top: `${hoveredCard.y}px`,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            padding: '18px 24px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.9)',
            zIndex: 10000,
            pointerEvents: 'none',
            minWidth: '320px',
            maxWidth: '450px',
          }}
        >
          <div style={{ fontSize: '21px', fontWeight: 700, color: '#fbbf24', marginBottom: '12px' }}>
            특성 정보
          </div>
          {(() => {
            const baseCard = CARDS.find(c => c.id === hoveredCard.card.id);
            const enhancedCard = applyTraitModifiers(baseCard || hoveredCard.card, { usageCount: 0, isInCombo: false });
            const parts = [];
            if (baseCard?.damage && enhancedCard.damage && enhancedCard.damage !== baseCard.damage) {
              const mult = (enhancedCard.damage / baseCard.damage).toFixed(2);
              parts.push(`공격력: ${enhancedCard.damage} = ${baseCard.damage} × ${mult}`);
            }
            if (baseCard?.block && enhancedCard.block && enhancedCard.block !== baseCard.block) {
              const mult = (enhancedCard.block / baseCard.block).toFixed(2);
              parts.push(`방어력: ${enhancedCard.block} = ${baseCard.block} × ${mult}`);
            }
            return parts.length > 0 ? (
              <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(251, 191, 36, 0.12)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.4)', color: '#fde68a', fontSize: '14px', fontWeight: 700 }}>
                {parts.map((p, idx) => <div key={idx}>{p}</div>)}
              </div>
            ) : null;
          })()}
          {hoveredCard.card.traits.map(traitId => {
            const trait = TRAITS[traitId];
            if (!trait) return null;
            const isPositive = trait.type === 'positive';
            return (
              <div key={traitId} style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    color: isPositive ? '#22c55e' : '#ef4444'
                  }}>
                    {trait.name}
                  </span>
                  <span style={{ fontSize: '16px', color: '#fbbf24' }}>
                    {"★".repeat(trait.weight)}
                  </span>
                </div>
                <div style={{ fontSize: '18px', color: '#9fb6ff', lineHeight: 1.5 }}>
                  {trait.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const LegacyBattleApp = ({ initialPlayer, initialEnemy, playerEther, onBattleResult = () => { } }) => (
  <Game
    initialPlayer={initialPlayer}
    initialEnemy={initialEnemy}
    playerEther={playerEther}
    onBattleResult={onBattleResult}
  />
);

export default LegacyBattleApp;
