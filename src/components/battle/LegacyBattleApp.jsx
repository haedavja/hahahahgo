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
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost, MAX_SLOTS } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { useGameStore } from "../../state/gameStore";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_EFFECT, applyRelicEffects, applyRelicComboMultiplier } from "../../lib/relics";
import { applyAgility } from "../../lib/agilityUtils";

// ?좊Ъ ?ш??꾨퀎 ?됱긽
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

const STUN_RANGE = 5; // 湲곗젅 ?④낵 踰붿쐞(??꾨씪??湲곗?)

/**
 * ?좏슚 ?듭같 怨꾩궛: ?뚮젅?댁뼱 ?듭같 - ?곸쓽 ?λ쭑
 */
const calculateEffectiveInsight = (playerInsight, enemyShroud) => {
  return Math.max(0, (playerInsight || 0) - (enemyShroud || 0));
};

/**
 * ?듭같 ?덈꺼蹂????뺣낫 怨듦컻
 * @param {number} effectiveInsight - ?좏슚 ?듭같 (player.insight - enemy.shroud)
 * @param {Array} enemyActions - ?곸쓽 ?됰룞 怨꾪쉷
 * @returns {object} 怨듦컻???뺣낫 ?덈꺼
 */
const getInsightRevealLevel = (effectiveInsight, enemyActions) => {
  if (!enemyActions || enemyActions.length === 0) {
    return { level: 0, visible: false };
  }

  if (effectiveInsight === 0) {
    // ?덈꺼 0: ?뺣낫 ?놁쓬
    return { level: 0, visible: false };
  }

  if (effectiveInsight === 1) {
    // ?덈꺼 1: 移대뱶 媛쒖닔? ??듭쟻 ?쒖꽌
    return {
      level: 1,
      visible: true,
      cardCount: enemyActions.length,
      showRoughOrder: true,
      actions: enemyActions.map((action, idx) => ({
        index: idx,
        isFirst: idx === 0,
        isLast: idx === enemyActions.length - 1,
      })),
    };
  }

  if (effectiveInsight === 2) {
    // ?덈꺼 2: ?뺥솗??移대뱶 ?대쫫怨??띾룄
    return {
      level: 2,
      visible: true,
      cardCount: enemyActions.length,
      showCards: true,
      showSpeed: true,
      actions: enemyActions.map((action, idx) => ({
        index: idx,
        card: action.card,
        speed: action.speed,
      })),
    };
  }

  // ?덈꺼 3+: 紐⑤뱺 ?뺣낫 (?뱀닔 ?⑦꽩, 硫댁뿭 ??
  return {
    level: 3,
    visible: true,
    cardCount: enemyActions.length,
    showCards: true,
    showSpeed: true,
    showEffects: true,
    fullDetails: true,
    actions: enemyActions.map((action, idx) => ({
      index: idx,
      card: action.card,
      speed: action.speed,
      effects: action.card?.effects,
      traits: action.card?.traits,
    })),
  };
};

// ?듭같 ?덈꺼???곕Ⅸ 吏㏃? ?④낵??
const playInsightSound = (level = 1) => {
  try {
    // eslint-disable-next-line no-undef
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    const base = level === 3 ? 880 : level === 2 ? 720 : 560;
    osc.frequency.value = base;
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.16, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);
  } catch {
    // ?ъ슫???ㅽ뙣 ??臾댁떆
  }
};

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
// ?뱀꽦 ?④낵 ?ы띁 ?⑥닔
// =====================
function hasTrait(card, traitId) {
  return card.traits && card.traits.includes(traitId);
}

function applyTraitModifiers(card, context = {}) {
  let modifiedCard = { ...card };

  // 媛뺢낏 (strongbone): ?쇳빐??諛⑹뼱??25% 利앷?
  if (hasTrait(card, 'strongbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.25);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.25);
  }

  // ?쎄낏 (weakbone): ?쇳빐??諛⑹뼱??20% 媛먯냼
  if (hasTrait(card, 'weakbone')) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 0.8);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 0.8);
  }

  // ?뚭눼??(destroyer): 怨듦꺽??50% 利앷?
  if (hasTrait(card, 'destroyer') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
  }

  // ?꾩궡 (slaughter): 湲곕낯?쇳빐??75% 利앷?
  if (hasTrait(card, 'slaughter') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.75);
  }

  // ?뺤젏 (pinnacle): ?쇳빐??2.5諛?
  if (hasTrait(card, 'pinnacle') && modifiedCard.damage) {
    modifiedCard.damage = Math.ceil(modifiedCard.damage * 2.5);
  }

  // ?묐룞 (cooperation): 議고빀 ??곸씠 ?섎㈃ 50% 異붽? 蹂대꼫??
  if (hasTrait(card, 'cooperation') && context.isInCombo) {
    if (modifiedCard.damage) modifiedCard.damage = Math.ceil(modifiedCard.damage * 1.5);
    if (modifiedCard.block) modifiedCard.block = Math.ceil(modifiedCard.block * 1.5);
  }

  // ?좎냽??(swift): ?띾룄 肄붿뒪??媛먯냼 (??15% ?깅뒫 湲곗?)
  if (hasTrait(card, 'swift')) {
    modifiedCard.speedCost = Math.max(1, Math.ceil(modifiedCard.speedCost * 0.75));
  }

  // 援쇰쑙 (slow): ?띾룄 肄붿뒪??利앷?
  if (hasTrait(card, 'slow')) {
    modifiedCard.speedCost = Math.ceil(modifiedCard.speedCost * 1.33);
  }

  // ?숇젴 (mastery): ?ъ슜?좎닔濡??쒓컙 媛먯냼 (context.usageCount ?꾩슂)
  if (hasTrait(card, 'mastery') && context.usageCount) {
    modifiedCard.speedCost = Math.max(1, modifiedCard.speedCost - (context.usageCount * 2));
  }

  // ?レ쬆 (boredom): ?ъ슜?좎닔濡??쒓컙 利앷?
  if (hasTrait(card, 'boredom') && context.usageCount) {
    modifiedCard.speedCost = modifiedCard.speedCost + (context.usageCount * 2);
  }

  return modifiedCard;
}

// ???ㅽ꺈??移대뱶???곸슜?섎뒗 ?⑥닔
function applyStrengthToCard(card, strength = 0, isPlayerCard = true) {
  if (!isPlayerCard || strength === 0) return card;

  const modifiedCard = { ...card };

  // 怨듦꺽 移대뱶: ??1??怨듦꺽??+1 (?뚯닔 ?덉슜, 理쒖냼 0)
  if (modifiedCard.damage && modifiedCard.type === 'attack') {
    modifiedCard.damage = Math.max(0, modifiedCard.damage + strength);
  }

  // 諛⑹뼱 移대뱶: ??1??諛⑹뼱??+1 (?뚯닔 ?덉슜, 理쒖냼 0)
  if (modifiedCard.block && modifiedCard.type === 'defense') {
    modifiedCard.block = Math.max(0, modifiedCard.block + strength);
  }

  return modifiedCard;
}

// ?먰뙣 ?꾩껜?????ㅽ꺈 ?곸슜
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
  if (!cards || cards.length === 0) return null;

  // 移대뱶 1?? ?섏씠移대뱶
  if (cards.length === 1) {
    return {
      name: '?섏씠移대뱶',
      bonusKeys: new Set([cards[0].actionCost])
    };
  }

  const freq = new Map();
  for (const c of cards) { freq.set(c.actionCost, (freq.get(c.actionCost) || 0) + 1); }
  const counts = Array.from(freq.values());
  const have = (n) => counts.includes(n);
  const keysByCount = (n) => new Set(Array.from(freq.entries()).filter(([k, v]) => v === n).map(([k]) => Number(k)));

  const allAttack = cards.every(c => c.type === 'attack');
  const allDefense = cards.every(c => c.type === 'defense');
  const isFlush = (allAttack || allDefense) && cards.length >= 4;

  let result = null;
  if (have(5)) result = { name: '스트레이트 플러시', bonusKeys: keysByCount(5) };
  else if (have(4)) result = { name: '포카드', bonusKeys: keysByCount(4) };
  else if (have(3) && have(2)) {
    const b = new Set([...keysByCount(3), ...keysByCount(2)]);
    result = { name: '풀하우스', bonusKeys: b };
  }
  else if (isFlush) result = { name: '플러시', bonusKeys: null };
  else {
    const pairKeys = keysByCount(2);
    if (pairKeys.size >= 2) result = { name: '투페어', bonusKeys: pairKeys };
    else if (have(3)) result = { name: '트리플', bonusKeys: keysByCount(3) };
    else if (have(2)) result = { name: '원페어', bonusKeys: pairKeys };
    else {
      // 조합 없음: 하이카드
      const allKeys = new Set(cards.map(c => c.actionCost));
      result = { name: '하이카드', bonusKeys: allKeys };
    }
  }
  // ?붾쾭源? 議고빀 媛먯? 濡쒓렇 (諛섑솚媛??ы븿)
  console.log('[detectPokerCombo] 寃곌낵:', {
    cardCount: cards.length,
    cards: cards.map(c => ({ name: c.name, type: c.type, cost: c.actionCost })),
    freq: Object.fromEntries(freq),
    counts,
    allAttack,
    allDefense,
    isFlush,
    pairCount: keysByCount(2).size,
    '>>> 諛섑솚??議고빀': result?.name || 'null'
  });

  return result;
}

function applyPokerBonus(cards, combo) {
  // 議고빀 蹂대꼫??湲곕뒫 ??젣??- ?댁젣 議고빀? ?먰뀒瑜?諛곗쑉留??쒓났
  if (!combo) return cards;
  return cards.map(c => {
    // _combo ?쒓렇留?異붽? (怨듦꺽??諛⑹뼱??蹂대꼫?ㅻ뒗 ?쒓굅)
    if (combo.bonusKeys && combo.bonusKeys.has(c.actionCost)) {
      return { ...c, _combo: combo.name };
    }
    return c;
  });
}

const etherSlots = (pts) => calculateEtherSlots(pts || 0); // ?명뵆?덉씠???곸슜
function addEther(pts, add) { return (pts || 0) + (add || 0); }

// ?먰뀒瑜?Deflation: 媛숈? 議고빀??諛섎났?좎닔濡??띾뱷??媛먯냼
// 1踰? 100%, 2踰? 50%, 3踰? 25%, ... 0???섎졃
// deflationMultiplier: 異뷀썑 移대뱶/?꾩씠?쒖쑝濡?議곗젙 媛??(湲곕낯媛?0.5)
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
  '하이카드': 1,
  '원페어': 2,
  '투페어': 2.5,
  '트리플': 3,
  '플러시': 3.25,
  '풀하우스': 3.5,
  '포카드': 4,
  '스트레이트 플러시': 5,
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
    const msg = prev === 0 ? `${who} 방어 +${added} = ${after}` : `${who} 방어 ${prev} + ${added} = ${after}`;
    events.push({ actor, card: card.name, type: 'defense', msg });
    state.log.push(`${actor === 'player' ? '플레이어' : '몬스터'} ${card.name} - ${msg}`);
    return { dealt: 0, taken: 0, events };
  }

  if (card.type === 'attack') {
    let totalDealt = 0, totalTaken = 0;
    const hits = card.hits || 1;

    for (let i = 0; i < hits; i++) {
      const base = card.damage;
      const strengthBonus = A.strength || 0; // Strength 蹂대꼫??
      const boost = (A.etherOverdriveActive) ? 2 : 1;
      let dmg = (base + strengthBonus) * boost; // base??strength 異붽? ??boost ?곸슜

      // 遺꾩뇙 (crush) ?뱀꽦: 諛⑹뼱?μ뿉 2諛??쇳빐
      const crushMultiplier = hasTrait(card, 'crush') ? 2 : 1;

      if (B.def && (B.block || 0) > 0) {
        const beforeBlock = B.block;
        const effectiveDmg = dmg * crushMultiplier; // 遺꾩뇙 ?곸슜
        if (effectiveDmg < beforeBlock) {
          const remaining = beforeBlock - effectiveDmg;
          B.block = remaining; dmg = 0;
          A.vulnMult = 1 + (remaining * 0.5); A.vulnTurns = 1;
          const crushText = crushMultiplier > 1 ? ' [遺꾩뇙횞2]' : '';
          const formula = `(諛⑹뼱??${beforeBlock} - 怨듦꺽??${base}${boost > 1 ? '횞2' : ''}${crushText} = ${remaining})`;
          const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} 방어 성공 ${formula} + 취약 x${A.vulnMult.toFixed(1)}`;
          events.push({ actor, card: card.name, type: 'blocked', msg });
          state.log.push(`${actor === 'player' ? '플레이어' : '몬스터'} ${card.name} - ${msg}`);
        } else {
          const blocked = beforeBlock;
          const remained = Math.max(0, effectiveDmg - blocked);
          const crushText = crushMultiplier > 1 ? ' [遺꾩뇙횞2]' : '';
          const formula = `(諛⑹뼱??${blocked} - 怨듦꺽??${base}${boost > 1 ? '횞2' : ''}${crushText} = 0)`;
          B.block = 0;
          const vulnMul = (B.vulnMult && B.vulnMult > 1) ? B.vulnMult : 1;
          const finalDmg = Math.floor(remained * vulnMul);
          const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
          const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} 방어 관통 ${blocked} ${formula}, 피해 ${finalDmg} (체력 ${beforeHP} -> ${B.hp})`;
          events.push({ actor, card: card.name, type: 'pierce', dmg: finalDmg, beforeHP, afterHP: B.hp, msg });
          state.log.push(`${actor === 'player' ? '플레이어' : '몬스터'} ${card.name} - ${msg}`);
          if (B.counter && finalDmg > 0) {
            const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
            const cmsg = `${actor === 'player' ? '몬스터 -> 플레이어' : '플레이어 -> 몬스터'} 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
            events.push({ actor: 'counter', value: B.counter, msg: cmsg });
            state.log.push(`${actor === 'player' ? '플레이어' : '몬스터'} ${cmsg}`);
          }
          totalDealt += finalDmg;
        }
      } else {
        const vulnMul = (B.vulnMult && B.vulnMult > 1) ? B.vulnMult : 1;
        const finalDmg = Math.floor(dmg * vulnMul);
        const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
        const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} 피해 ${finalDmg}${boost > 1 ? ' (에테르 오버드라이브 x2)' : ''} (체력 ${beforeHP} -> ${B.hp})`;
        events.push({ actor, card: card.name, type: 'hit', dmg: finalDmg, beforeHP, afterHP: B.hp, msg });
        state.log.push(`${actor === 'player' ? '플레이어' : '몬스터'} ${card.name} - ${msg}`);
        if (B.counter && finalDmg > 0) {
          const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
          const cmsg = `${actor === 'player' ? '몬스터 -> 플레이어' : '플레이어 -> 몬스터'} 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
          events.push({ actor: 'counter', value: B.counter, msg: cmsg });
          state.log.push(`${actor === 'player' ? '플레이어' : '몬스터'} ${cmsg}`);
        }
        totalDealt += finalDmg;
      }
    }
    return { dealt: totalDealt, taken: totalTaken, events };
  }

  return { dealt: 0, taken: 0, events };
}

// AI: ?깊뼢 寃곗젙 & ?됰룞 ?앹꽦
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

function shouldEnemyOverdriveWithTurn(mode, actions, etherPts, turnNumber = 1) {
  const slots = etherSlots(etherPts);
  if (slots <= 0) return false;
  if (turnNumber <= 1) return false;
  // 紐ъ뒪????＜???⑦꽩 ?뺤젙 ?꾧퉴吏 湲덉?
  return false;
  if (!mode) return false;
  if (mode.key === 'aggro') return true;
  if (mode.key === 'balanced') return (actions || []).some(c => c.type === 'attack');
  return false;
}

function shouldEnemyOverdrive(mode, actions, etherPts, turnNumber = 1) {
  return shouldEnemyOverdriveWithTurn(mode, actions, etherPts, turnNumber);
}

function simulatePreview({ player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions, turnNumber = 1 }) {
  if (!fixedOrder || fixedOrder.length === 0) {
    return { pDealt: 0, pTaken: 0, finalPHp: player.hp, finalEHp: enemy.hp, lines: [] };
  }
  const enemyWillOD = shouldEnemyOverdriveWithTurn(enemyMode, enemyActions, enemy.etherPts, turnNumber);
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

function ExpectedDamagePreview({ player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions, phase, log, qIndex, queue, stepOnce, runAll, finishTurn, postCombatOptions, handleExitToMap, autoProgress, setAutoProgress, resolveStartPlayer, resolveStartEnemy, turnNumber = 1 }) {
  // 吏꾪뻾 ?④퀎?먯꽌???쒖옉 ?쒖젏???곹깭濡??쒕??덉씠?? 洹??몃뒗 ?꾩옱 ?곹깭 ?ъ슜
  const simPlayer = phase === 'resolve' && resolveStartPlayer ? resolveStartPlayer : player;
  const simEnemy = phase === 'resolve' && resolveStartEnemy ? resolveStartEnemy : enemy;

  const res = useMemo(() => simulatePreview({ player: simPlayer, enemy: simEnemy, fixedOrder, willOverdrive, enemyMode, enemyActions, turnNumber }), [simPlayer, simEnemy, fixedOrder, willOverdrive, enemyMode, enemyActions, turnNumber]);

  const summaryItems = [
    { icon: '⚔️', label: '예상 타격 피해', value: res.pDealt, accent: 'text-emerald-300', hpInfo: `몬스터 HP ${simEnemy.hp} → ${res.finalEHp}`, hpColor: '#fca5a5' },
    { icon: '🛡️', label: '예상 피격 피해', value: phase === 'select' ? '?' : res.pTaken, accent: 'text-rose-300', hpInfo: `플레이어 HP ${simPlayer.hp} → ${res.finalPHp}`, hpColor: '#e2e8f0' },
  ];

  const phaseLabel = phase === 'select' ? '선택 단계' : phase === 'respond' ? '대응 단계' : '진행 단계';

  // ?꾪닾 濡쒓렇 ?먮룞 ?ㅽ겕濡?
  const logContainerRef = useRef(null);
  useEffect(() => {
    if (logContainerRef.current && phase === 'resolve' && log && log.length > 0) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log, phase]);

  return (
    <div className="expect-board expect-board-vertical" style={{ position: 'relative' }}>
      {/* ??댄? */}
      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid rgba(148, 163, 184, 0.3)' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>
          ?덉긽 ?쇳빐??
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

      {/* 진행 단계가 아닐 때 미리보기 로그 표시 */}
      {phase !== 'resolve' && !!res.lines?.length && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(148, 163, 184, 0.15)' }}>
          {res.lines.map((line, idx) => {
            const startsWithMonster = line.trim().startsWith('몬스터');
            const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어');
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

      {/* 진행 단계 실제 로그 */}
      {phase === 'resolve' && log && log.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid rgba(148, 163, 184, 0.3)' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '12px' }}>
            실제 진행 로그
          </div>
          <div ref={logContainerRef} style={{ height: '360px', minHeight: '360px', maxHeight: '360px', overflowY: 'auto' }}>
            {log.filter(line => {
              // 불필요한 로그 제거
              if (line.includes('게임 시작') || line.includes('턴 준비')) return false;
              return true;
            }).map((line, i) => {
              const startsWithMonster = line.trim().startsWith('몬스터');
              const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어');
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

      {/* 吏꾪뻾 ?④퀎 ?쒖뼱 踰꾪듉 (?꾪닾 濡쒓렇 ?꾨옒) */}
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
                {postCombatOptions.type === 'victory' ? '?럦 ?밸━!' : '?? ?⑤같...'}
              </div>
              <button onClick={handleExitToMap} className="btn-enhanced btn-primary flex items-center gap-2">
                ?뿺截?留듭쑝濡??뚯븘媛湲?
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EtherBar({ pts, slots, previewGain = 0, color = "cyan", label, pulse = false }) {
  const safePts = Number.isFinite(pts) ? pts : 0;
  const derivedSlots = Number.isFinite(slots) ? slots : etherSlots(safePts);
  const safeSlots = Number.isFinite(derivedSlots) ? derivedSlots : 0;
  const safePreview = Number.isFinite(previewGain) ? previewGain : 0;

  // ?レ옄 異뺤빟 ?щ㎎??(K/M/B) + ?꾩껜 臾몄옄??
  const formatCompact = (num) => {
    const abs = Math.abs(num);
    if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  // ?꾩옱 ?щ’ ?댁쓽 pt (媛??щ’ ?꾨떖?쒕쭏??0?쇰줈 由ъ뀑)
  const currentPts = getCurrentSlotPts(safePts);
  // ?ㅼ쓬 ?щ’??梨꾩슦?붾뜲 ?꾩슂??珥?pt
  const nextSlotCost = getNextSlotCost(safePts);
  // ?ㅼ쓬 ?щ’源뚯???吏꾪뻾瑜?(0-1)
  const slotProgress = getSlotProgress(safePts);
  // 吏꾪뻾瑜좎? ?꾩옱 ?щ’ ??鍮꾩쑉留??ъ슜 (?됱긽? ?뚯쟾)
  const ratio = Math.max(0, Math.min(1, slotProgress));
  const tier = `x${safeSlots}`;

  // ?붾쾭源? 媛??뺤씤
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

  // ?쒖떆???뺤텞 臾몄옄?닿낵 ?댄똻???꾩껜 臾몄옄??
  const compactCurrent = formatCompact(currentPts);
  const compactNext = formatCompact(nextSlotCost);
  const fullTitle = `${currentPts.toLocaleString()} / ${nextSlotCost.toLocaleString()}`;
  const [showPtsTooltip, setShowPtsTooltip] = useState(false);
  const [showBarTooltip, setShowBarTooltip] = useState(false);

  // ?щ’蹂??됱긽 (?뚮젅?댁뼱: 蹂댁깋 愿怨꾨줈 ?쒖씤??洹밸???
  const playerSlotColors = [
    'linear-gradient(180deg, #67e8f9 0%, #06b6d4 100%)', // x1 - 諛앹? ?쒖븞 (cyan)
    'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)', // x2 - 二쇳솴 (?쒖븞??蹂댁깋)
    'linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)', // x3 - 蹂대씪 (二쇳솴怨??鍮?
    'linear-gradient(180deg, #bef264 0%, #84cc16 100%)', // x4 - ?쇱엫 (蹂대씪??蹂댁깋)
    'linear-gradient(180deg, #f472b6 0%, #db2777 100%)', // x5 - 留덉젨? (?쇱엫怨??鍮?
    'linear-gradient(180deg, #fde047 0%, #facc15 100%)', // x6 - 諛앹? ?몃옉 (留덉젨?? ?鍮?
    'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)', // x7 - ?뚮옉 (?몃옉??蹂댁깋)
    'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)', // x8 - 怨⑤뱶 (?뚮옉怨??鍮?
    'linear-gradient(180deg, #34d399 0%, #059669 100%)', // x9 - 誘쇳듃 (怨⑤뱶? ?鍮?
    'linear-gradient(180deg, #e0e7ff 0%, #c7d2fe 100%)'  // x10 - ?곕낫??(誘쇳듃? ?鍮?
  ];

  const enemySlotColors = [
    'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)', // x1 - ?ㅽ겕 ?덈뱶
    'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)', // x2 - ?덈뱶
    'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)', // x3 - 諛앹? ?덈뱶
    'linear-gradient(180deg, #ea580c 0%, #c2410c 100%)', // x4 - ?ㅻ젋吏 ?덈뱶
    'linear-gradient(180deg, #c2410c 0%, #9a3412 100%)', // x5 - ?ㅽ겕 ?ㅻ젋吏
    'linear-gradient(180deg, #92400e 0%, #78350f 100%)', // x6 - 踰덊듃 ?ㅻ젋吏
    'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)', // x7 - ?щ┝??
    'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)', // x8 - ?뚯씠???덈뱶
    'linear-gradient(180deg, #f87171 0%, #dc2626 100%)', // x9 - ?ㅼ뭡??
    'linear-gradient(180deg, #450a0a 0%, #1c0a0a 100%)'  // x10 - 釉붾옓 ?덈뱶
  ];

  const slotColors = color === 'red' ? enemySlotColors : playerSlotColors;

  return (
      <div style={{
        width: '72px',
    padding: '12px 10px 16px',
    borderRadius: '36px',
    background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.95), rgba(10, 15, 25, 0.75))',
    border: '1px solid rgba(96, 210, 255, 0.35)',
    boxShadow: `${pulse ? '0 0 18px rgba(251,191,36,0.55), ' : ''}0 20px 40px rgba(0, 0, 0, 0.45)`,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative'
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
        overflow: 'hidden',
        }}
        onMouseEnter={() => setShowBarTooltip(true)}
        onMouseLeave={() => setShowBarTooltip(false)}
      >
        <div style={{
          position: 'absolute',
          left: '3px',
          right: '3px',
          bottom: '3px',
          height: `${ratio * 100}%`,
          borderRadius: '24px',
          background: slotColors[(safeSlots % slotColors.length + slotColors.length) % slotColors.length],
          transition: 'height 0.8s ease-out'
        }} />
      </div>
      {showBarTooltip && (
        <div className="insight-tooltip" style={{ position: 'absolute', left: '50%', top: '0', transform: 'translate(-50%, -110%)', whiteSpace: 'nowrap', zIndex: 1200 }}>
          <div className="insight-tooltip-title">진행률</div>
          <div className="insight-tooltip-desc">{Math.round(slotProgress * 100)}%</div>
        </div>
      )}
      <div
        style={{ textAlign: 'center', color: textColor, fontSize: '20px', position: 'relative' }}
        onMouseEnter={() => setShowPtsTooltip(true)}
        onMouseLeave={() => setShowPtsTooltip(false)}
      >
        <div key={`pts-${safePts}`} style={{ fontFamily: 'monospace', lineHeight: 1.1, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div>{compactCurrent}</div>
          <div style={{ height: '1px', width: '100%', background: 'rgba(255,255,255,0.4)' }} />
          <div>{compactNext}</div>
        </div>
        <div style={{ marginTop: '6px' }}>{tier}</div>
        {safePreview > 0 && (
          <div style={{ color: '#6ee7b7', fontSize: '16px', marginTop: '4px' }}>
            +{safePreview.toLocaleString()}pt
          </div>
        )}
        {showPtsTooltip && (
          <div className="insight-tooltip" style={{ position: 'absolute', left: '50%', top: '-12px', transform: 'translate(-50%, -100%)', whiteSpace: 'nowrap', zIndex: 1200 }}>
            <div className="insight-tooltip-title">에테르</div>
            <div className="insight-tooltip-desc">{fullTitle}</div>
            {safePreview > 0 && (
              <div className="insight-tooltip-desc">+{safePreview.toLocaleString()} pt</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================
// 罹먮┃??鍮뚮뱶 湲곕컲 ?먰뙣 ?앹꽦
// =====================
function drawCharacterBuildHand(characterBuild, nextTurnEffects = {}, previousHand = []) {
  if (!characterBuild) return CARDS.slice(0, 10); // 8????10??

  const { mainSpecials = [], subSpecials = [] } = characterBuild;
  const { guaranteedCards = [], mainSpecialOnly = false, subSpecialBoost = 0 } = nextTurnEffects;

  // ?뚰깂 (ruin) ?뱀꽦: 二쇳듅湲곕쭔 ?깆옣
  if (mainSpecialOnly) {
    const mainCards = mainSpecials
      .map(cardId => CARDS.find(card => card.id === cardId))
      .filter(Boolean);
    return mainCards;
  }

  // ?뺤젙 ?깆옣 移대뱶 (諛섎났, 蹂댄뿕)
  const guaranteed = guaranteedCards
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(Boolean);

  // 二쇳듅湲?移대뱶??100% ?깆옣 (?덉＜ ?쒖쇅)
  const mainCards = mainSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // ?덉＜ (escape): ?댁쟾???ъ슜?덉쑝硫??깆옣?섏? ?딆쓬
      if (hasTrait(card, 'escape') && previousHand.some(c => c.id === card.id)) {
        return false;
      }
      // 媛쒓렐 (attendance): ?깆옣?뺣쪧 25% 利앷? (二쇳듅湲?125%)
      if (hasTrait(card, 'attendance')) {
        return Math.random() < 1.25; // ?뺤젙 + 25% 異붽? 蹂대꼫??
      }
      // ?꾪뵾袁?(deserter): ?깆옣?뺣쪧 25% 媛먯냼 (二쇳듅湲?75%)
      if (hasTrait(card, 'deserter')) {
        return Math.random() < 0.75;
      }
      return true;
    });

  // 蹂댁“?밴린 移대뱶??媛곴컖 50% ?뺣쪧濡??깆옣 (?κ뎔 ?뱀꽦?쇰줈 利앷? 媛??
  const baseSubProb = 0.5 + subSpecialBoost;
  const subCards = subSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // ?덉＜ (escape): ?댁쟾???ъ슜?덉쑝硫??깆옣?섏? ?딆쓬
      if (hasTrait(card, 'escape') && previousHand.some(c => c.id === card.id)) {
        return false;
      }
      // 議곗뿰 (supporting): 蹂댁“?밴린?쇰븣留??깆옣
      // (?대? 蹂댁“?밴린濡??ㅼ젙?섏뼱 ?덉쑝誘濡??깆옣 媛??

      let prob = baseSubProb;
      // 媛쒓렐 (attendance): ?깆옣?뺣쪧 25% 利앷?
      if (hasTrait(card, 'attendance')) {
        prob += 0.25;
      }
      // ?꾪뵾袁?(deserter): ?깆옣?뺣쪧 25% 媛먯냼
      if (hasTrait(card, 'deserter')) {
        prob -= 0.25;
      }
      return Math.random() < prob;
    });

  // 以묐났 ?쒓굅 ??諛섑솚
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
function Game({ initialPlayer, initialEnemy, playerEther = 0, onBattleResult, liveInsight }) {
  const playerStrength = useGameStore((state) => state.playerStrength || 0);
  const playerAgility = useGameStore((state) => state.playerAgility || 0);
  const relics = useGameStore((state) => state.relics || []);
  const [orderedRelics, setOrderedRelics] = useState(() => {
    try {
      const saved = localStorage.getItem('relicOrder');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return ids;
      }
    } catch {}
    return relics;
  });
  useEffect(() => {
    // ???좊Ъ 異붽?/?쒓굅 ??湲곗〈 ?쒖꽌瑜??좎??섎㈃??蹂묓빀
    setOrderedRelics(prev => {
      const prevSet = new Set(prev);
      const next = [];
      relics.forEach(id => {
        if (prevSet.has(id)) next.push(id);
      });
      relics.forEach(id => {
        if (!prevSet.has(id)) next.push(id);
      });
      return next;
    });
  }, [relics]);
  useEffect(() => {
    try {
      localStorage.setItem('relicOrder', JSON.stringify(orderedRelics));
    } catch {}
  }, [orderedRelics]);
  const orderedRelicList = orderedRelics && orderedRelics.length ? orderedRelics : relics;
  const safeInitialPlayer = initialPlayer || {};
  const safeInitialEnemy = initialEnemy || {};
  const passiveRelicStats = calculatePassiveEffects(orderedRelicList);
  const baseEnergy = (safeInitialPlayer.energy ?? BASE_PLAYER_ENERGY) + passiveRelicStats.maxEnergy;
  const startingEther = typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : playerEther;
  const startingBlock = safeInitialPlayer.block ?? 0; // ?좊Ъ ?④낵濡??명븳 ?쒖옉 諛⑹뼱??
  const startingStrength = safeInitialPlayer.strength ?? playerStrength ?? 0; // ?꾪닾 ?쒖옉 ??(?좊Ъ ?④낵 ?ы븿)
  const startingInsight = safeInitialPlayer.insight ?? 0; // ?듭같

  const initialPlayerState = {
    hp: safeInitialPlayer.hp ?? 30,
    maxHp: safeInitialPlayer.maxHp ?? safeInitialPlayer.hp ?? 30,
    energy: baseEnergy,
    maxEnergy: baseEnergy,
    vulnMult: 1,
    vulnTurns: 0,
    block: startingBlock,
    def: false,
    counter: 0,
    etherPts: startingEther ?? 0,
    etherOverflow: 0,
    etherOverdriveActive: false,
    comboUsageCount: {},
    strength: startingStrength,
    insight: startingInsight,
    maxSpeed: safeInitialPlayer.maxSpeed ?? DEFAULT_PLAYER_MAX_SPEED
  };

  const [player, setPlayer] = useState(initialPlayerState);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [enemy, setEnemy] = useState(() => safeInitialEnemy?.name ? ({ ...safeInitialEnemy, hp: safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? 30, maxHp: safeInitialEnemy.maxHp ?? safeInitialEnemy.hp ?? 30, vulnMult: 1, vulnTurns: 0, block: 0, counter: 0, etherPts: safeInitialEnemy.etherPts ?? safeInitialEnemy.etherCapacity ?? 300, etherCapacity: safeInitialEnemy.etherCapacity ?? 300, etherOverdriveActive: false, strength: 0, shroud: safeInitialEnemy.shroud ?? 0, maxSpeed: safeInitialEnemy.maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED }) : null);

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
  const [log, setLog] = useState(["寃뚯엫 ?쒖옉!"]);
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
  const [disappearingCards, setDisappearingCards] = useState([]); // ?щ씪吏??以묒씤 移대뱶 ?몃뜳??
  const [hiddenCards, setHiddenCards] = useState([]); // ?꾩쟾???④꺼吏?移대뱶 ?몃뜳??
  const [disabledCardIndices, setDisabledCardIndices] = useState([]); // 鍮꾪솢?깊솕??移대뱶 ?몃뜳??(紐ъ뒪???щ쭩 ???⑥? 移대뱶)
  const [timelineProgress, setTimelineProgress] = useState(0); // ??꾨씪??吏꾪뻾 ?꾩튂 (0~100%)
  const [timelineIndicatorVisible, setTimelineIndicatorVisible] = useState(true); // ?쒓퀣諛붾뒛 ?쒖떆 ?щ?
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [cardUsageCount, setCardUsageCount] = useState({}); // 移대뱶蹂??ъ슜 ?잛닔 異붿쟻 (mastery, boredom??
  const [etherAnimationPts, setEtherAnimationPts] = useState(null); // ?먰뀒瑜??좊땲硫붿씠???꾩슜 (?꾩껜 ?띾뱷???쒖떆)
  const [executingCardIndex, setExecutingCardIndex] = useState(null); // ?꾩옱 ?ㅽ뻾 以묒씤 移대뱶 ?몃뜳??(?좊땲硫붿씠?섏슜)
  const [turnNumber, setTurnNumber] = useState(1); // ??踰덊샇 (1遺???쒖옉)
  const [netEtherDelta, setNetEtherDelta] = useState(null); // 理쒖쥌 ?곸슜???먰뀒瑜??대룞???뚮젅?댁뼱 湲곗?)
  const [vanishedCards, setVanishedCards] = useState([]); // ?뚮㈇ ?뱀꽦?쇰줈 ?쒓굅??移대뱶
  const [turnEtherAccumulated, setTurnEtherAccumulated] = useState(0); // 이번 턴 누적 에테르(플레이어)
  const [enemyTurnEtherAccumulated, setEnemyTurnEtherAccumulated] = useState(0); // 이번 턴 누적 에테르(몬스터)
  const [etherPulse, setEtherPulse] = useState(false); // PT 하이라이트 애니메이션
  const [etherFinalValue, setEtherFinalValue] = useState(null); // 최종 에테르 값 표시
  const [playerOverdriveFlash, setPlayerOverdriveFlash] = useState(false); // ?뚮젅?댁뼱 湲곗썝 ?곗텧
  const [enemyOverdriveFlash, setEnemyOverdriveFlash] = useState(false); // ??湲곗썝 ?곗텧
  const [enemyEtherFinalValue, setEnemyEtherFinalValue] = useState(null); // ??理쒖쥌 ?먰뀒瑜닿컪 ?쒖떆
  const [enemyEtherCalcPhase, setEnemyEtherCalcPhase] = useState(null); // ???먰뀒瑜?怨꾩궛 ?④퀎
  const [enemyCurrentDeflation, setEnemyCurrentDeflation] = useState(null); // ???뷀뵆?덉씠???뺣낫
  const [soulShatter, setSoulShatter] = useState(false); // ?먰뀒瑜??밸━ ?곗텧
  const [etherCalcPhase, setEtherCalcPhase] = useState(null); // ?먰뀒瑜?怨꾩궛 ?좊땲硫붿씠???④퀎: 'sum', 'multiply', 'deflation', 'result'
  const [currentDeflation, setCurrentDeflation] = useState(null); // ?꾩옱 ?뷀뵆?덉씠???뺣낫 { multiplier, usageCount }
  const [playerTransferPulse, setPlayerTransferPulse] = useState(false); // ?먰뀒瑜??대룞 ?곗텧 (?뚮젅?댁뼱)
  const [enemyTransferPulse, setEnemyTransferPulse] = useState(false); // ?먰뀒瑜??대룞 ?곗텧 (??
  const [nextTurnEffects, setNextTurnEffects] = useState({
    guaranteedCards: [], // 諛섎났, 蹂댄뿕 ?뱀꽦?쇰줈 ?ㅼ쓬???뺤젙 ?깆옣
    bonusEnergy: 0, // 紐명?湲??뱀꽦
    energyPenalty: 0, // ?덉쭊 ?뱀꽦
    etherBlocked: false, // 留앷컖 ?뱀꽦
    mainSpecialOnly: false, // ?뚰깂 ?뱀꽦
    subSpecialBoost: 0, // ?κ뎔 ?뱀꽦
  });
  const [playerHit, setPlayerHit] = useState(false); // ?뚮젅?댁뼱 ?쇨꺽 ?좊땲硫붿씠??
  const [enemyHit, setEnemyHit] = useState(false); // ???쇨꺽 ?좊땲硫붿씠??
  const [playerBlockAnim, setPlayerBlockAnim] = useState(false); // ?뚮젅?댁뼱 諛⑹뼱 ?좊땲硫붿씠??
  const [enemyBlockAnim, setEnemyBlockAnim] = useState(false); // ??諛⑹뼱 ?좊땲硫붿씠??
  const [autoProgress, setAutoProgress] = useState(false); // ?먮룞吏꾪뻾 紐⑤뱶
  const [resolveStartPlayer, setResolveStartPlayer] = useState(null); // 吏꾪뻾 ?④퀎 ?쒖옉 ???뚮젅?댁뼱 ?곹깭
  const [resolveStartEnemy, setResolveStartEnemy] = useState(null); // 吏꾪뻾 ?④퀎 ?쒖옉 ?????곹깭
  const [hoveredRelic, setHoveredRelic] = useState(null); // ?몃쾭???좊Ъ ID
  const [relicActivated, setRelicActivated] = useState(null); // 諛쒕룞???좊Ъ ID (?좊땲硫붿씠?섏슜, ?⑥씪 ?쒖떆??
  const [activeRelicSet, setActiveRelicSet] = useState(new Set()); // 활성화된 유물 모음
  const [multiplierPulse, setMultiplierPulse] = useState(false); // 배율 펄스
  const [displayComboMultiplier, setDisplayComboMultiplier] = useState(1); // UI 표시용 배율
  const [resolvedPlayerCards, setResolvedPlayerCards] = useState(0); // 진행 단계에서 처리된 플레이어 카드 수
  const [hoveredCard, setHoveredCard] = useState(null); // 호버 카드 정보 {card, position}
  const [tooltipVisible, setTooltipVisible] = useState(false); // ?댄똻 ?쒖떆 ?щ?(?좊땲硫붿씠?섏슜)
  const [previewDamage, setPreviewDamage] = useState({ value: 0, lethal: false, overkill: false });
  const lethalSoundRef = useRef(false);
  const overkillSoundRef = useRef(false);
  const prevInsightRef = useRef(safeInitialPlayer.insight || 0);
  const insightBadgeTimerRef = useRef(null);
  const [insightBadge, setInsightBadge] = useState({
    level: safeInitialPlayer.insight || 0,
    dir: 'up',
    show: false,
    key: 0,
  });
  const [insightAnimLevel, setInsightAnimLevel] = useState(0);
  const [insightAnimPulseKey, setInsightAnimPulseKey] = useState(0);
  const insightAnimTimerRef = useRef(null);
  const prevRevealLevelRef = useRef(0);
  const [showInsightTooltip, setShowInsightTooltip] = useState(false);
  const [hoveredEnemyAction, setHoveredEnemyAction] = useState(null);
  const hoveredCardRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false); // ?댄똻 ?쒖떆 ?щ? (?쒕젅????
  const tooltipTimerRef = useRef(null);
  const logEndRef = useRef(null);
  const devilDiceTriggeredRef = useRef(false); // ?????낅쭏??二쇱궗??諛쒕룞 ?щ?
  const initialEtherRef = useRef(typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : (playerEther ?? 0));
  const resultSentRef = useRef(false);
  const turnStartProcessedRef = useRef(false); // ???쒖옉 ?④낵 以묐났 ?ㅽ뻾 諛⑹?
  const dragRelicIndexRef = useRef(null); // 유물 드래그 원본 인덱스

  useEffect(() => {
    // 선택/대응 단계에서만 외부 변경 적용, 진행/맵에서는 고정
    if (phase === 'select' || phase === 'respond') {
      setOrderedRelics(relics);
    }
  }, [phase]);
  const computeComboMultiplier = useCallback((baseMult, cardsCount, includeFiveCard = true) => {
    let mult = baseMult;
    const passive = calculatePassiveEffects(orderedRelicList);
    orderedRelicList.forEach((rid) => {
      const relic = RELICS[rid];
      if (!relic?.effects) return;
      if (relic.effects.comboMultiplierPerCard || relic.effects.etherCardMultiplier || relic.effects.etherMultiplier) {
        mult = applyRelicComboMultiplier([rid], mult, cardsCount);
      } else if (includeFiveCard && relic.effects.etherFiveCardBonus && passive.etherFiveCardBonus > 0 && cardsCount >= 5) {
        mult *= passive.etherFiveCardBonus;
      }
    });
    return mult;
  }, [orderedRelicList]);
  const calcEtherGainNoDevil = useCallback((base, cards) => {
    const filtered = orderedRelicList.filter(id => id !== 'devilDice');
    return calculateRelicEtherGain(base, cards, filtered);
  }, [orderedRelicList]);
  const flashRelic = (relicId, tone = 800, duration = 500) => {
    setActiveRelicSet(prev => {
      const next = new Set(prev);
      next.add(relicId);
      return next;
    });
    setRelicActivated(relicId);
    const relic = RELICS[relicId];
    if (relic?.effects && (relic.effects.comboMultiplierPerCard || relic.effects.etherCardMultiplier || relic.effects.etherMultiplier || relic.effects.etherFiveCardBonus)) {
      setMultiplierPulse(true);
      setTimeout(() => setMultiplierPulse(false), Math.min(400, duration));
    }
    playSound(tone, duration * 0.6);
    setTimeout(() => {
      setActiveRelicSet(prev => {
        const next = new Set(prev);
        next.delete(relicId);
        return next;
      });
      setRelicActivated(prev => (prev === relicId ? null : prev));
    }, duration);
  };
  useEffect(() => {
    if (phase !== 'resolve') return;
    const cardsCount = resolvedPlayerCards;
    const timers = [];
    let delay = 0;
    orderedRelicList.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects) return;
      const isMultiplier = relic.effects.comboMultiplierPerCard || relic.effects.etherCardMultiplier || relic.effects.etherMultiplier;
      const isDevil = relic.effects.etherFiveCardBonus && cardsCount >= 5;
      if (isMultiplier || isDevil) {
        const t1 = setTimeout(() => {
          setMultiplierPulse(true);
          const t2 = setTimeout(() => setMultiplierPulse(false), 220);
          timers.push(t2);
        }, delay);
        timers.push(t1);
        delay += 200;
      }
    });
    return () => {
      timers.forEach(clearTimeout);
      setMultiplierPulse(false);
    };
  }, [phase, resolvedPlayerCards, orderedRelicList]);
  const handleRelicDragStart = (idx, relicId) => (e) => {
    dragRelicIndexRef.current = idx;
    setRelicActivated(relicId); // 諛곗? ?쒖떆
    e.dataTransfer.effectAllowed = 'move';
    try {
      const img = new Image();
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch {}
  };
  const handleRelicDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleRelicDrop = (idx) => (e) => {
    e.preventDefault();
    const from = dragRelicIndexRef.current;
    dragRelicIndexRef.current = null;
    setRelicActivated(null);
    if (from === null || from === idx) return;
    const arr = Array.from(orderedRelicList);
    const [item] = arr.splice(from, 1);
    arr.splice(idx, 0, item);
    setOrderedRelics(arr);
  };

  // ?듭같 ?쒖뒪?? ?좏슚 ?듭같 諛?怨듦컻 ?뺣낫 怨꾩궛
  const effectiveInsight = useMemo(() => {
    return calculateEffectiveInsight(player.insight, enemy?.shroud);
  }, [player.insight, enemy?.shroud]);

  const insightReveal = useMemo(() => {
    if (phase !== 'select') return { level: 0, visible: false };
    return getInsightRevealLevel(effectiveInsight, enemyPlan.actions);
  }, [effectiveInsight, enemyPlan.actions, phase]);

  // ?듭같 ?섏튂 蹂????諛곗?/?곗텧 ?몃━嫄?
  useEffect(() => {
    const prev = prevInsightRef.current || 0;
    const curr = player.insight || 0;
    if (curr === prev) return;
    const dir = curr > prev ? 'up' : 'down';
    prevInsightRef.current = curr;
    if (insightBadgeTimerRef.current) clearTimeout(insightBadgeTimerRef.current);
    setInsightBadge({
      level: curr,
      dir,
      show: true,
      key: Date.now(),
    });
    playInsightSound(curr > 0 ? Math.min(curr, 3) : 1);
    insightBadgeTimerRef.current = setTimeout(() => {
      setInsightBadge((b) => ({ ...b, show: false }));
    }, 1400);
  }, [player.insight]);

  // ?듭같 ?덈꺼蹂???꾨씪???곗텧 ?몃━嫄?(?좏깮 ?④퀎?먯꽌留?
  useEffect(() => {
    if (phase !== 'select' && phase !== 'respond' && phase !== 'resolve') {
      setInsightAnimLevel(0);
      setHoveredEnemyAction(null);
      return;
    }
    // select ?④퀎??insightReveal.level, respond ?④퀎??effectiveInsight 湲곗?
    const lvl = phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0);
    const prev = prevRevealLevelRef.current || 0;
    if (lvl === prev) return;
    prevRevealLevelRef.current = lvl;
    if (insightAnimTimerRef.current) clearTimeout(insightAnimTimerRef.current);
    if (lvl > 0) {
      setInsightAnimLevel(lvl);
      setInsightAnimPulseKey((k) => k + 1);
      playInsightSound(Math.min(lvl, 3));
      insightAnimTimerRef.current = setTimeout(() => setInsightAnimLevel(0), 1200);
    } else {
      setInsightAnimLevel(0);
    }
  }, [insightReveal?.level, phase]);

  const notifyBattleResult = useCallback((resultType) => {
    if (!resultType || resultSentRef.current) return;
    const finalEther = player.etherPts;
    const delta = finalEther - (initialEtherRef.current ?? 0);
    onBattleResult?.({
      result: resultType,
      playerEther: finalEther,
      deltaAether: delta,
      playerHp: player.hp, // ?ㅼ젣 ?꾪닾 醫낅즺 ?쒖젏??泥대젰 ?꾨떖
      playerMaxHp: player.maxHp
    });
    resultSentRef.current = true;
  }, [player.etherPts, player.hp, player.maxHp, onBattleResult]);

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
      updatePos(); // ?꾩튂 ?ъ륫?????쒖떆
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
      // Strength瑜?0?쇰줈 由ъ뀑?섏? ?딄퀬 珥덇린 怨꾩궛媛??댁쟾 媛?蹂댁〈
      strength: safeInitialPlayer?.strength ?? prev.strength ?? startingStrength ?? 0,
      insight: safeInitialPlayer?.insight ?? prev.insight ?? startingInsight ?? 0
    }));
    setSelected([]);
    setQueue([]);
    setQIndex(0);
    setFixedOrder(null);
    setPostCombatOptions(null);
    setEnemyPlan({ actions: [], mode: null });
    // ?덈줈???꾪닾/??珥덇린???????쒖옉 ?뚮옒洹몃룄 由ъ뀑
    turnStartProcessedRef.current = false;
    // ?듭같/?곗텧 愿??珥덇린??
    prevInsightRef.current = 0;
    prevRevealLevelRef.current = 0;
    setInsightAnimLevel(0);
    setInsightAnimPulseKey((k) => k + 1);
    setEnemyEtherFinalValue(null);
    setEnemyEtherCalcPhase(null);
    setEnemyCurrentDeflation(null);
    if ((safeInitialPlayer?.insight || 0) > 0) {
      // ?꾪닾 ?쒖옉 ?쒖뿉???듭같 ?곗텧 1???ъ깮
      setTimeout(() => {
        setInsightBadge({
          level: safeInitialPlayer?.insight || 0,
          dir: 'up',
          show: true,
          key: Date.now(),
        });
        playInsightSound(Math.min(safeInitialPlayer?.insight || 0, 3));
        setInsightAnimLevel(Math.min(3, safeInitialPlayer?.insight || 0));
        setInsightAnimPulseKey((k) => k + 1);
        setTimeout(() => setInsightAnimLevel(0), 1000);
        setTimeout(() => setInsightBadge((b) => ({ ...b, show: false })), 1200);
      }, 50);
    }
    setPhase('select');
    // 罹먮┃??鍮뚮뱶媛 ?덉쑝硫??ъ슜, ?놁쑝硫?湲곕낯 8??
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const rawHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild)
      : CARDS.slice(0, 10); // 8????10??
    const initialHand = applyStrengthToHand(rawHand, startingStrength);
    setHand(initialHand);
    setCanRedraw(true);
  }, [safeInitialPlayer, playerEther, addLog, startingStrength]);

  useEffect(() => {
    if (!safeInitialEnemy) return;
    const hp = safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? enemy?.maxHp ?? 30;
    setEnemy(prev => ({
      ...(prev || {}),
      deck: safeInitialEnemy.deck || prev?.deck || ENEMIES[enemyIndex]?.deck || [],
      name: safeInitialEnemy.name ?? prev?.name ?? '???',
      hp,
      maxHp: safeInitialEnemy.maxHp ?? hp,
      vulnMult: 1,
      vulnTurns: 0,
      block: 0,
      counter: 0,
      etherPts: safeInitialEnemy.etherPts ?? safeInitialEnemy.etherCapacity ?? 300,
      etherCapacity: safeInitialEnemy.etherCapacity ?? 300,
      etherOverdriveActive: false
    }));
    setSelected([]);
    setQueue([]);
    setQIndex(0);
    setFixedOrder(null);
    // ?덈줈???곸쑝濡??꾪솚 ?????쒖옉 泥섎━ ?뚮옒洹?由ъ뀑
    turnStartProcessedRef.current = false;
    prevRevealLevelRef.current = 0;
    setPhase('select');
  }, [safeInitialEnemy, enemyIndex]);

  // ?꾪닾 以??듭같 媛??ㅼ떆媛?諛섏쁺 (payload ?ъ깮???놁씠)
  useEffect(() => {
    if (typeof liveInsight !== 'number') return;
    setPlayer((p) => {
      if (p.insight === liveInsight) return p;
      return { ...p, insight: liveInsight };
    });
  }, [liveInsight]);

  useEffect(() => {
    if (postCombatOptions?.type) {
      notifyBattleResult(postCombatOptions.type);
    }
  }, [postCombatOptions, notifyBattleResult]);

  // ?섏씠利?蹂寃???移대뱶 ?좊땲硫붿씠???곹깭 珥덇린??
  useEffect(() => {
    if (phase !== 'resolve') {
      setDisappearingCards([]);
      setHiddenCards([]);
    }
    // resolve ?④퀎 吏꾩엯 ??usedCardIndices 珥덇린??
    if (phase === 'resolve') {
      setUsedCardIndices([]);
    }
  }, [phase]);

  // C ?ㅻ줈 罹먮┃??李??닿린, Q ?ㅻ줈 媛꾩냼?? E ?ㅻ줈 ?쒖텧/吏꾪뻾/??醫낅즺, R ?ㅻ줈 由щ뱶濡쒖슦, ?ㅽ럹?댁뒪諛붾줈 湲곗썝, F ?ㅻ줈 ?뺣젹
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
        // ?ㅽ럹?댁뒪諛붾줈 湲곗썝 ?좉?
        e.preventDefault(); // ?ㅽ럹?댁뒪諛?湲곕낯 ?숈옉 諛⑹? (?ㅽ겕濡?
        if (etherSlots(player.etherPts) > 0) {
          setWillOverdrive(v => !v);
        }
      }
      if ((e.key === "e" || e.key === "E") && phase === 'resolve') {
        e.preventDefault();
        if (qIndex < queue.length) {
          // ??꾨씪??吏꾪뻾 以묒씠硫?吏꾪뻾 ?좉?
          setAutoProgress(prev => !prev);
        } else if (etherFinalValue !== null) {
          // ??꾨씪???앸굹怨?理쒖쥌媛??쒖떆?섎㈃ ??醫낅즺
          finishTurn('?ㅻ낫???⑥텞??(E)');
        }
      }
      if ((e.key === "f" || e.key === "F") && phase === 'select') {
        e.preventDefault();
        // F?ㅻ줈 移대뱶 ?뺣젹
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

      // ?꾪닾 ?쒖옉 ?좊Ъ ?④낵 濡쒓렇 諛??좊땲硫붿씠??
      const combatStartEffects = applyCombatStartEffects(orderedRelicList, {});

      // ?꾪닾 ?쒖옉 ?좊Ъ ?좊땲硫붿씠??
      orderedRelicList.forEach(relicId => {
        const relic = RELICS[relicId];
        if (relic?.effects?.type === 'ON_COMBAT_START') {
          setRelicActivated(relicId);
          playSound(800, 200);
          setTimeout(() => setRelicActivated(null), 500);
        }
      });

      if (combatStartEffects.damage > 0) {
        addLog(`?볩툘 ?좊Ъ ?④낵: 泥대젰 -${combatStartEffects.damage} (?쇱쓽 議깆뇙)`);
      }
      if (combatStartEffects.strength > 0) {
        addLog(`?뮞 ?좊Ъ ?④낵: ??+${combatStartEffects.strength}`);
      }
      if (combatStartEffects.block > 0) {
        addLog(`?썳截??좊Ъ ?④낵: 諛⑹뼱??+${combatStartEffects.block}`);
      }
      if (combatStartEffects.heal > 0) {
        addLog(`?뮍 ?좊Ъ ?④낵: 泥대젰 +${combatStartEffects.heal}`);
      }

      // 罹먮┃??鍮뚮뱶媛 ?덉쑝硫??ъ슜, ?놁쑝硫?湲곕낯 8??
      const currentBuild = useGameStore.getState().characterBuild;
      const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
      const rawHand = hasCharacterBuild
        ? drawCharacterBuildHand(currentBuild, nextTurnEffects, [])
        : CARDS.slice(0, 10); // 8????10??
      const initialHand = applyStrengthToHand(rawHand, startingStrength);
      setHand(initialHand);
      setSelected([]);
      setCanRedraw(true);
      const handCount = initialHand.length;
      addLog(`?렣 ?쒖옉 ?먰뙣 ${handCount}??{hasCharacterBuild ? ' (罹먮┃??鍮뚮뱶)' : ''}`);
    }
  }, []);

  useEffect(() => {
    if (!enemy || phase !== 'select') {
      // phase媛 select媛 ?꾨땲硫??뚮옒洹?由ъ뀑
      if (phase !== 'select') {
        turnStartProcessedRef.current = false;
      }
      return;
    }

    // ???쒖옉 ?④낵媛 ?대? 泥섎━?섏뿀?쇰㈃ 以묐났 ?ㅽ뻾 諛⑹?
    if (turnStartProcessedRef.current) {
      return;
    }
    turnStartProcessedRef.current = true;

    setFixedOrder(null);
    setActionEvents({});
    setCanRedraw(true);
    setWillOverdrive(false);

    // ?좊Ъ ???쒖옉 ?④낵 ?곸슜 (?쇳뵾??媛묒샆 ??
    const turnStartRelicEffects = applyTurnStartEffects(orderedRelicList, nextTurnEffects);

    console.log("[???쒖옉 ?좊Ъ ?④낵]", {
      block: turnStartRelicEffects.block,
      heal: turnStartRelicEffects.heal,
      energy: turnStartRelicEffects.energy
    });

    // ???쒖옉 ?좊Ъ 諛쒕룞 ?좊땲硫붿씠??
    orderedRelicList.forEach(relicId => {
      const relic = RELICS[relicId];
      if (relic?.effects?.type === 'ON_TURN_START') {
        setRelicActivated(relicId);
        playSound(800, 200);
        setTimeout(() => setRelicActivated(null), 500);
      }
    });

    // ?뱀꽦 ?④낵濡??명븳 ?먮꼫吏 蹂대꼫???섎꼸???곸슜
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    const baseEnergy = BASE_PLAYER_ENERGY + passiveRelicEffects.maxEnergy;
    const energyBonus = (nextTurnEffects.bonusEnergy || 0) + turnStartRelicEffects.energy;
    const energyPenalty = nextTurnEffects.energyPenalty || 0;
    const finalEnergy = Math.max(0, baseEnergy + energyBonus - energyPenalty);

    console.log("[???쒖옉 ?먮꼫吏 怨꾩궛]", {
      baseEnergy,
      "nextTurnEffects.bonusEnergy": nextTurnEffects.bonusEnergy,
      "turnStartRelicEffects.energy": turnStartRelicEffects.energy,
      energyBonus,
      energyPenalty,
      finalEnergy
    });

    // 諛⑹뼱?κ낵 泥대젰 ?뚮났 ?곸슜
    setPlayer(p => {
      const newHp = Math.min(p.maxHp, p.hp + turnStartRelicEffects.heal);
      const newBlock = (p.block || 0) + turnStartRelicEffects.block;
      const newDef = turnStartRelicEffects.block > 0; // 諛⑹뼱?μ씠 ?덉쑝硫?def ?뚮옒洹??쒖꽦??
      return {
        ...p,
        hp: newHp,
        block: newBlock,
        def: newDef,
        energy: finalEnergy,
        maxEnergy: baseEnergy,
        etherOverdriveActive: false,
        etherOverflow: 0,
        strength: p.strength || 0 // ???좎?
      };
    });

    // 濡쒓렇 異붽?
    if (turnStartRelicEffects.block > 0) {
      addLog(`?썳截??좊Ъ ?④낵: 諛⑹뼱??+${turnStartRelicEffects.block}`);
    }
    if (turnStartRelicEffects.heal > 0) {
      addLog(`?뮍 ?좊Ъ ?④낵: 泥대젰 +${turnStartRelicEffects.heal}`);
    }
    if (turnStartRelicEffects.energy > 0) {
      addLog(`???좊Ъ ?④낵: ?됰룞??+${turnStartRelicEffects.energy}`);
    }
    if (energyBonus > 0) {
      addLog(`???ㅼ쓬??蹂대꼫???됰룞?? +${energyBonus}`);
    }

    // 留????쒖옉 ???덈줈???먰뙣 ?앹꽦 (罹먮┃??鍮뚮뱶 諛??뱀꽦 ?④낵 ?곸슜)
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    setHand(prevHand => {
      const rawHand = hasCharacterBuild
        ? drawCharacterBuildHand(currentBuild, nextTurnEffects, prevHand)
        : CARDS.slice(0, 10); // 8????10??
      return applyStrengthToHand(rawHand, player.strength || 0);
    });
    setSelected([]);

    // 적 모드/행동을 턴 시작 시 결정하고 로그에 남긴다.
    setEnemyPlan(prev => {
      const mode = prev.mode || decideEnemyMode();
      if (!prev.mode) {
        addLog(`적 모드 힌트: ${mode.name}`);
      }
      const slots = etherSlots(enemy?.etherPts || 0);
      const actions = generateEnemyActions(enemy, mode, slots);
      return { mode, actions };
    });
  }, [phase, enemy, enemyPlan.mode, nextTurnEffects]);

  useEffect(() => {
    if (phase === 'resolve' && (!queue || queue.length === 0) && fixedOrder && fixedOrder.length > 0) {
      const rebuilt = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
      setQueue(rebuilt); setQIndex(0);
      addLog('?㎝ ?먮룞 蹂듦뎄: ?ㅽ뻾 ?먮? ?ㅼ떆 ?앹꽦?덉뒿?덈떎');
    }
  }, [phase, queue, fixedOrder]);

  // ?좏깮 ?④퀎 吏꾩엯 ?????됰룞??誘몃━ 怨꾩궛???듭같 UI媛 諛붾줈 蹂댁씠?꾨줉 ??
  useEffect(() => {
    if (phase !== 'select') return;
    if (!enemyPlan?.mode) return;
    if (enemyPlan.actions && enemyPlan.actions.length > 0) return;
    const slots = etherSlots(enemy?.etherPts || 0);
    const actions = generateEnemyActions(enemy, enemyPlan.mode, slots);
    setEnemyPlan(prev => ({ ...prev, actions }));
  }, [phase, enemyPlan?.mode, enemyPlan?.actions?.length, enemy]);

  const totalEnergy = useMemo(() => selected.reduce((s, c) => s + c.actionCost, 0), [selected]);
  const totalSpeed = useMemo(() => selected.reduce((s, c) => s + c.speedCost, 0), [selected]);
  const currentCombo = useMemo(() => {
    const combo = detectPokerCombo(selected);
    console.log('[currentCombo ?낅뜲?댄듃]', {
      selectedCount: selected.length,
      comboName: combo?.name || 'null'
    });

    // ?뷀뵆?덉씠???뺣낫 怨꾩궛 (?좏깮/???吏꾪뻾 ?④퀎?먯꽌)
    if (combo?.name && (phase === 'select' || phase === 'respond' || phase === 'resolve')) {
      const usageCount = (player.comboUsageCount || {})[combo.name] || 0;
      const deflationMult = Math.pow(0.5, usageCount);
      setCurrentDeflation(usageCount > 0 ? { multiplier: deflationMult, usageCount } : null);
    }

    return combo;
  }, [selected, player.comboUsageCount, phase]);

  // ?좊Ъ ?④낵瑜??ы븿??理쒖쥌 肄ㅻ낫 諛곗쑉
  const finalComboMultiplier = useMemo(() => {
    const baseMultiplier = currentCombo ? (COMBO_MULTIPLIERS[currentCombo.name] || 1) : 1;
    const isResolve = phase === 'resolve';
    const cardsCount = isResolve ? resolvedPlayerCards : selected.length;

    // ?좏깮 ?④퀎?먯꽌???좊Ъ 諛곗쑉 ?쒖쇅 (?쒖닔 議고빀 諛곗쑉留?誘몃━蹂닿린)
    if (!isResolve) return baseMultiplier;

    // 吏꾪뻾 ?④퀎: ?좊Ъ 諛곗쑉???뺣젹 ?쒖꽌?濡??쒖감 ?곸슜
    return computeComboMultiplier(baseMultiplier, cardsCount, true);
  }, [currentCombo, orderedRelicList, resolvedPlayerCards, selected.length, phase, computeComboMultiplier]);
  // 諛곗쑉 ?쒖떆?? currentCombo ?좎뼵 ?댄썑??怨꾩궛 (TDZ 諛⑹?)
  useEffect(() => {
    if (!currentCombo) {
      setDisplayComboMultiplier(1);
      return;
    }
    const baseMultiplier = (COMBO_MULTIPLIERS[currentCombo.name] || 1);
    if (phase !== 'resolve') {
      setDisplayComboMultiplier(baseMultiplier);
      return;
    }
    let mult = baseMultiplier;
    setDisplayComboMultiplier(mult);
    const passive = calculatePassiveEffects(orderedRelicList);
    const timers = [];
    let delay = 0;
    orderedRelicList.forEach((rid) => {
      const relic = RELICS[rid];
      if (!relic?.effects) return;
      const isCombo = relic.effects.comboMultiplierPerCard || relic.effects.etherCardMultiplier || relic.effects.etherMultiplier;
      const isDevil = relic.effects.etherFiveCardBonus && passive.etherFiveCardBonus > 0 && resolvedPlayerCards >= 5;
      if (isCombo || isDevil) {
        delay += 200;
        const t = setTimeout(() => {
          if (isCombo) {
            mult = applyRelicComboMultiplier([rid], mult, resolvedPlayerCards);
          } else if (isDevil) {
            mult *= passive.etherFiveCardBonus;
          }
          setDisplayComboMultiplier(mult);
          setMultiplierPulse(true);
          const t2 = setTimeout(() => setMultiplierPulse(false), 180);
          timers.push(t2);
        }, delay);
        timers.push(t);
      }
    });
    return () => {
      timers.forEach(clearTimeout);
      setMultiplierPulse(false);
    };
  }, [currentCombo, orderedRelicList, resolvedPlayerCards, phase]);
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
          playSound(400, 80); // ?댁? ?ъ슫??(??? ??
        }
        else {
          if (prev.length >= MAX_SUBMIT_CARDS) { addLog('선택 불가: 최대 5장의 카드만 제출할 수 있습니다'); return prev; }
          if (totalSpeed + card.speedCost > player.maxSpeed) { addLog('선택 불가: 속도 한도 초과'); return prev; }
          if (totalEnergy + card.actionCost > player.maxEnergy) { addLog('선택 불가: 행동력 한도 초과'); return prev; }
          next = [...prev, { ...card, __uid: Math.random().toString(36).slice(2) }];
          playSound(800, 80); // ?좏깮 ?ъ슫??(?믪? ??
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
      playSound(400, 80); // ?댁? ?ъ슫??(??? ??
      return;
    }
    if (selected.length >= MAX_SUBMIT_CARDS) return addLog('선택 불가: 최대 5장의 카드만 제출할 수 있습니다');
    if (totalSpeed + card.speedCost > player.maxSpeed) return addLog('선택 불가: 속도 한도 초과');
    if (totalEnergy + card.actionCost > player.maxEnergy) return addLog('선택 불가: 행동력 한도 초과');
    setSelected([...selected, { ...card, __uid: Math.random().toString(36).slice(2) }]);
    playSound(800, 80); // ?좏깮 ?ъ슫??(?믪? ??
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

  // ?④낵???ъ깮 ?⑥닔
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
      // ?④낵???ъ깮 ?ㅽ뙣 ??臾댁떆
    }
  };

  const redrawHand = () => {
    if (!canRedraw) return addLog('이미 리롤을 사용했습니다');
    // 罹먮┃??鍮뚮뱶媛 ?덉쑝硫??ъ슜, ?놁쑝硫?湲곕낯 8??
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const rawHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild, nextTurnEffects, hand)
      : CARDS.slice(0, 10); // 8????10??
    const newHand = applyStrengthToHand(rawHand, player.strength || 0);
    setHand(newHand);
    setSelected([]);
    setCanRedraw(false);
    addLog('핸드를 다시 뽑았습니다');
    playSound(700, 90); // 由щ뱶濡쒖슦 ?④낵??
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
      speed: '?쒓컙 湲곗? ?뺣젹',
      energy: '?됰룞??湲곗? ?뺣젹',
      value: '諛몃쪟 湲곗? ?뺣젹',
      type: '醫낅쪟蹂??뺣젹'
    };
    addLog(`?? ${sortLabels[nextSort]}`);
    playSound(600, 80); // ?뺣젹 ?④낵??
  };

  const getSortedHand = () => {
    const sorted = [...hand];

    if (sortType === 'speed') {
      // ?쒓컙(?띾룄) ?대┝李⑥닚 - ??寃껊???
      sorted.sort((a, b) => b.speedCost - a.speedCost);
    } else if (sortType === 'energy') {
      // ?됰룞???대┝李⑥닚 - ??寃껊???
      sorted.sort((a, b) => b.actionCost - a.actionCost);
    } else if (sortType === 'value') {
      // 諛몃쪟(怨듦꺽??諛⑹뼱?? ?대┝李⑥닚 - ??寃껊???
      sorted.sort((a, b) => {
        const aValue = ((a.damage || 0) * (a.hits || 1)) + (a.block || 0);
        const bValue = ((b.damage || 0) * (b.hits || 1)) + (b.block || 0);
        return bValue - aValue;
      });
    } else if (sortType === 'type') {
      // 怨듦꺽 -> 諛⑹뼱 -> 湲고? ?쒖꽌濡??뺣젹
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
    const actions =
      enemyPlan.actions && enemyPlan.actions.length > 0
        ? enemyPlan.actions
        : generateEnemyActions(enemy, enemyPlan.mode, etherSlots(enemy.etherPts));
    setEnemyPlan(prev => ({ ...prev, actions }));

    const pCombo = detectPokerCombo(selected);

    // ?뱀꽦 ?④낵 ?곸슜 (?ъ슜 ?잛닔???좏깮 ?④퀎 湲곗??쇰줈 怨좎젙)
    const traitEnhancedSelected = selected.map(card =>
      applyTraitModifiers(card, {
        usageCount: 0,
        isInCombo: pCombo !== null,
      })
    );

    const enhancedSelected = applyPokerBonus(traitEnhancedSelected, pCombo);

    const q = sortCombinedOrderStablePF(enhancedSelected, actions, playerAgility, 0);
    setFixedOrder(q);
    playCardSubmitSound(); // 移대뱶 ?쒖텧 ?ъ슫???ъ깮
    setPhase('respond');
  };

  useEffect(() => {
    if (phase === 'respond' && enemyPlan.actions && enemyPlan.actions.length > 0) {
      const combo = detectPokerCombo(selected);

      // ?뱀꽦 ?④낵 ?곸슜
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
    if (!fixedOrder) return addLog('?ㅻ쪟: 怨좎젙???쒖꽌媛 ?놁뒿?덈떎');

    if (fixedOrder.length === 0) {
      addLog('?좑툘 ?ㅽ뻾???됰룞???놁뒿?덈떎. 理쒖냼 1???댁긽???좎??섍굅???곸씠 ?됰룞 媛?ν븳 ?곹깭?ъ빞 ?⑸땲??');
      return;
    }

    const newQ = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
    if (newQ.length === 0) {
      addLog('?좑툘 ???앹꽦 ?ㅽ뙣: ?ㅽ뻾????ぉ???놁뒿?덈떎');
      return;
    }

    // ?댁쟾 ?댁쓽 ?먰뀒瑜??좊땲硫붿씠???곹깭 珥덇린??
    setEtherCalcPhase(null);
    setEtherFinalValue(null);
    setEnemyEtherFinalValue(null);
    setCurrentDeflation(null);
    setEnemyEtherCalcPhase(null);
    setEnemyCurrentDeflation(null);

    playProceedSound(); // 吏꾪뻾 踰꾪듉 ?ъ슫???ъ깮
    setQueue(newQ);
    setQIndex(0);
    setPhase('resolve');
    addLog('??吏꾪뻾 ?쒖옉');

    // 吏꾪뻾 ?④퀎 ?쒖옉 ???뚮젅?댁뼱? ???곹깭 ???
    setResolveStartPlayer({ ...player });
    setResolveStartEnemy({ ...enemy });

    // 吏꾪뻾???뚮젅?댁뼱 移대뱶 ??珥덇린??
    setResolvedPlayerCards(0);
    devilDiceTriggeredRef.current = false;

    // ??꾨씪??progress 珥덇린??
    setTimelineProgress(0);
    setTimelineIndicatorVisible(true);
    setNetEtherDelta(null);

    const enemyWillOD = shouldEnemyOverdriveWithTurn(enemyPlan.mode, enemyPlan.actions, enemy.etherPts, turnNumber) && etherSlots(enemy.etherPts) > 0;
    if ((phase === 'respond' || phase === 'select') && willOverdrive && etherSlots(player.etherPts) > 0) {
      setPlayer(p => ({ ...p, etherPts: p.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true }));
      setPlayerOverdriveFlash(true);
      playSound(1400, 220);
      setTimeout(() => setPlayerOverdriveFlash(false), 650);
      addLog('?댐툘 ?먰뀒瑜???＜ 諛쒕룞! (?????꾩껜 ?좎?)');
    }
    if ((phase === 'respond' || phase === 'select') && enemyWillOD) {
      setEnemy(e => ({ ...e, etherPts: e.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true }));
      setEnemyOverdriveFlash(true);
      playSound(900, 220);
      setTimeout(() => setEnemyOverdriveFlash(false), 650);
      addLog('?꾬툘 ???먰뀒瑜???＜ 諛쒕룞!');
    }

    // 吏꾪뻾 踰꾪듉 ?꾨Ⅴ硫??먮룞 吏꾪뻾 ?쒖꽦??
    setAutoProgress(true);
  };

  // ?먰뀒瑜?怨꾩궛 ?좊땲硫붿씠???쒖옉 (紐ъ뒪???щ쭩 ??/ ?뺤긽 醫낅즺 ??怨듯넻)
  // skipFinalValueSet: true?대㈃ setEtherFinalValue瑜??몄텧?섏? ?딆쓬 (finishTurn?먯꽌 ?대? ?ㅼ젙??寃쎌슦)
  const startEtherCalculationAnimation = (totalEtherPts, actualResolvedCards = null, actualGainedEther = null, skipFinalValueSet = false) => {
    const pCombo = detectPokerCombo(selected);
    const basePlayerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
    // 紐ъ뒪?곌? 二쎌뿀???뚮뒗 actualResolvedCards(?ㅼ젣 ?ㅽ뻾??移대뱶 ??, ?꾨땲硫?selected.length(?꾩껜 ?좏깮??移대뱶 ??
    const cardCountForMultiplier = actualResolvedCards !== null ? actualResolvedCards : selected.length;
    const playerComboMult = computeComboMultiplier(basePlayerComboMult, cardCountForMultiplier, true);
    let playerBeforeDeflation = Math.round(totalEtherPts * playerComboMult);

    // ?좊Ъ ?④낵 ?곸슜 (李멸퀬?? ?낅쭏??二쇱궗?? ?ш???議곗빟??
    playerBeforeDeflation = calcEtherGainNoDevil(playerBeforeDeflation, cardCountForMultiplier);

    // ?뷀뵆?덉씠???곸슜
    const playerDeflation = pCombo?.name
      ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    // actualGainedEther媛 ?꾨떖?섎㈃ 洹?媛믪쓣 ?ъ슜, ?꾨땲硫??뷀뵆?덉씠?섍퉴吏留??곸슜??媛??ъ슜
    // 踰붾엺 怨꾩궛? 理쒖쥌媛??쒖떆???ы븿?섏? ?딆쓬 (濡쒓렇?먮쭔 ?쒖떆)
    const playerFinalEther = actualGainedEther !== null ? actualGainedEther : playerDeflation.gain;

    console.log('[?먰뀒瑜?怨꾩궛 ?좊땲硫붿씠??', {
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

    // ?뷀뵆?덉씠???뺣낫 ?ㅼ젙
    setCurrentDeflation(pCombo?.name ? {
      comboName: pCombo.name,
      usageCount: playerDeflation.usageCount,
      multiplier: playerDeflation.multiplier
    } : null);

    // === ???먰뀒瑜?怨꾩궛 (?뚮젅?댁뼱? ?숈씪??濡쒖쭅) ===
    const eCombo = detectPokerCombo(enemyPlan.actions || []);
    const baseEnemyComboMult = eCombo ? (COMBO_MULTIPLIERS[eCombo.name] || 1) : 1;
    const enemyCardCount = enemyPlan.actions?.length || 0;
    let enemyBeforeDeflation = Math.round(enemyTurnEtherAccumulated * baseEnemyComboMult);

    // ???뷀뵆?덉씠???곸슜
    const enemyDeflation = eCombo?.name
      ? applyEtherDeflation(enemyBeforeDeflation, eCombo.name, enemy.comboUsageCount || {})
      : { gain: enemyBeforeDeflation, multiplier: 1, usageCount: 0 };

    const enemyFinalEther = enemyDeflation.gain;

    // ???뷀뵆?덉씠???뺣낫 ?ㅼ젙
    setEnemyCurrentDeflation(eCombo?.name ? {
      comboName: eCombo.name,
      usageCount: enemyDeflation.usageCount,
      multiplier: enemyDeflation.multiplier
    } : null);

    console.log('[???먰뀒瑜?怨꾩궛 ?좊땲硫붿씠??', {
      enemyTurnEtherAccumulated,
      comboName: eCombo?.name,
      baseEnemyComboMult,
      enemyBeforeDeflation,
      deflationMult: enemyDeflation.multiplier,
      usageCount: enemyDeflation.usageCount,
      enemyFinalEther,
      enemyCardCount
    });

    // 1?④퀎: ?⑷퀎 媛뺤“ (?뚮젅?댁뼱 + ???숈떆)
    setEtherCalcPhase('sum');
    setEnemyEtherCalcPhase('sum');
    setTimeout(() => {
      // 2?④퀎: 怨깆뀍 媛뺤“ + 紐낆풄???ъ슫??
      setEtherCalcPhase('multiply');
      setEnemyEtherCalcPhase('multiply');
      playSound(800, 100);
      setTimeout(() => {
        // 3?④퀎: ?뷀뵆?덉씠??諛곗? ?좊땲硫붿씠??+ ????ъ슫??
        if (playerDeflation.usageCount > 0 || enemyDeflation.usageCount > 0) {
          if (playerDeflation.usageCount > 0) setEtherCalcPhase('deflation');
          if (enemyDeflation.usageCount > 0) setEnemyEtherCalcPhase('deflation');
          playSound(200, 150);
        }
        setTimeout(() => {
          // 4?④퀎: 理쒖쥌媛??쒖떆 + 臾듭쭅???ъ슫??
          setEtherCalcPhase('result');
          setEnemyEtherCalcPhase('result');
          // 踰꾪듉 ?쒖떆瑜??꾪빐 媛??ㅼ젙 (finishTurn?먯꽌 ?뺥솗??媛믪쑝濡??ㅼ떆 ?ㅼ젙??
          setEtherFinalValue(playerFinalEther);
          setEnemyEtherFinalValue(enemyFinalEther);
          playSound(400, 200);
        }, (playerDeflation.usageCount > 0 || enemyDeflation.usageCount > 0) ? 400 : 0);
      }, 600);
    }, 400);
  };

  const stepOnce = () => {
    if (qIndex >= queue.length) return;
    const a = queue[qIndex];

    // ??꾨씪??progress ?낅뜲?댄듃 (?꾩옱 移대뱶???꾩튂瑜?actor??maxSpeed 湲곗? 鍮꾩쑉濡?
    const currentMaxSpeed = a.actor === 'player' ? player.maxSpeed : enemy.maxSpeed;
    const progressPercent = (a.sp / currentMaxSpeed) * 100;

    // 癒쇱? ?쒓퀣諛붾뒛???꾩옱 移대뱶 ?꾩튂濡??대룞
    setTimelineProgress(progressPercent);

    // ?쒓퀣諛붾뒛 ?대룞 ?꾨즺 ??移대뱶 諛쒕룞 諛??ㅽ뻾 (0.5珥?transition ??
    setTimeout(() => {
      // ?ㅽ뻾 以묒씤 移대뱶 ?쒖떆 (?붾뱾由??좊땲硫붿씠??
      setExecutingCardIndex(qIndex);

      // ?붾뱾由??좊땲硫붿씠??醫낅즺 ??鍮?諛붾옒吏?泥섎━
      setTimeout(() => {
        setExecutingCardIndex(null);
        // ?붾뱾由쇱씠 ?앸궃 ???ъ슜??移대뱶濡??쒖떆 (鍮?諛붾옒吏?
        setUsedCardIndices(prev => [...prev, qIndex]);
      }, 350); // CSS ?좊땲硫붿씠???쒓컙怨??쇱튂

      // 留덉?留?移대뱶硫??섏씠?쒖븘??
      if (qIndex >= queue.length - 1) {
        setTimeout(() => {
          setTimelineIndicatorVisible(false);
        }, 300);
      }

      // 移대뱶 ?뚮㈇ ?댄럺?몃뒗 ?뚮젅?댁뼱留??곸슜
      if (a.actor === 'player') {
        setTimeout(() => {
          // 移대뱶媛 ?ъ슜?????щ씪吏???좊땲硫붿씠???쒖옉
          setDisappearingCards(prev => [...prev, qIndex]);
          setTimeout(() => {
            // ?좊땲硫붿씠?????꾩쟾???④?
            setHiddenCards(prev => [...prev, qIndex]);
            setDisappearingCards(prev => prev.filter(i => i !== qIndex));
          }, 600); // ?좊땲硫붿씠??吏???쒓컙
        }, 300); // ?ъ슜 ?④낵 ??諛붾줈 ?щ씪吏湲??쒖옉
      }

      executeCardAction();
    }, 500); // CSS transition ?쒓컙怨??쇱튂 (0.5s)
  };

  const executeCardAction = () => {
    if (qIndex >= queue.length) return;
    const a = queue[qIndex];

    const P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, strength: player.strength || 0 };
    const E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1 };
    const tempState = { player: P, enemy: E, log: [] };
    const { events } = applyAction(tempState, a.actor, a.card);
    let actionEvents = events;

    // ?뚮젅?댁뼱 移대뱶 ?ъ슜 ??移대뱶 ?ъ슜 ?잛닔 利앷? (mastery, boredom ?뱀꽦??
    if (a.actor === 'player' && a.card.id) {
      setCardUsageCount(prev => ({
        ...prev,
        [a.card.id]: (prev[a.card.id] || 0) + 1
      }));

      // ?묐궇??寃 (double_edge): ?ъ슜??1 ?쇳빐
      if (hasTrait(a.card, 'double_edge')) {
        P.hp = Math.max(0, P.hp - 1);
        addLog(`?좑툘 "?묐궇??寃" - ?뚮젅?댁뼱媛 1 ?쇳빐瑜??낆뿀?듬땲??`);
      }

      // ?⑤젴 (training): ?ъ슜 ????+1
      if (hasTrait(a.card, 'training')) {
        P.strength = (P.strength || 0) + 1;
        addLog(`?뮞 "?⑤젴" - ?섏씠 1 利앷??덉뒿?덈떎. (?꾩옱: ${P.strength})`);
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
        const stunnedNames = stunnedActions.map(t => t.item?.card?.name || '移대뱶').join(', ');
        const msg = `?샃 "${a.card.name}"??湲곗젅! ?곷? 移대뱶 ${stunnedActions.length}???뚭눼 (踰붿쐞: ${centerSp}~${centerSp + STUN_RANGE}${stunnedNames ? `, ??? ${stunnedNames}` : ''})`;
        addLog(msg);
        actionEvents = [...actionEvents, { actor: a.actor, card: a.card.name, type: 'stun', msg }];
      }
    }

    // 移대뱶 ?ъ슜 ???먰뀒瑜??꾩쟻 (?ㅼ젣 ?곸슜? ??醫낅즺 ??
    if (a.actor === 'player') {
      // ?ш???議곗빟???④낵: 移대뱶???띾뱷 ?먰뀒瑜?2諛?
      const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
      const etherPerCard = Math.floor(BASE_ETHER_PER_CARD * passiveRelicEffects.etherMultiplier);

      setTurnEtherAccumulated(prev => {
        console.log(`[?먰뀒瑜??꾩쟻] ${prev} + ${etherPerCard} = ${prev + etherPerCard} (移대뱶: ${a.card.name})`);
        return prev + etherPerCard;
      });
      // PT 利앷? ?좊땲硫붿씠??
      setEtherPulse(true);
      setTimeout(() => setEtherPulse(false), 300);

      // ?뚮젅?댁뼱 移대뱶 吏꾪뻾 ???좊Ъ 諛쒕룞
      setResolvedPlayerCards(prev => {
        const newCount = prev + 1;

        // ?좊Ъ???덉쑝硫?諛쒕룞 ?좊땲硫붿씠??諛??ъ슫??(醫뚢넂???쒖감 ?ъ깮)
        if (relics.length > 0) {
          const triggered = [];
          relics.forEach(relicId => {
            const relic = RELICS[relicId];
            // effects媛 媛앹껜??寃쎌슦 泥섎━ (/src/data/relics.js ?ъ슜)
            if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.comboMultiplierPerCard) {
              // ?먰뀒瑜?寃곗젙: 移대뱶留덈떎 利됱떆 諛쒕룞 ?쒖떆/?ъ슫??              triggered.push({ id: relicId, tone: 800, duration: 500 });
            } else if (relic?.effects?.type === 'PASSIVE' && (relic?.effects?.etherCardMultiplier || relicId === 'rareStone' || relic?.effects?.etherMultiplier)) {
              // ?ш???議곗빟??李멸퀬??怨꾩뿴: 移대뱶留덈떎 利됱떆 諛쒕룞 (?곸떆 諛곗? ?놁쓬)
              triggered.push({ id: relicId, tone: 820, duration: 400 });
            } else if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.etherFiveCardBonus && newCount >= 5 && !devilDiceTriggeredRef.current) {
              // ?낅쭏??二쇱궗?? ?ㅼ꽢踰덉㎏ 移대뱶 泥섎━ 吏곹썑 諛쒕룞
              devilDiceTriggeredRef.current = true;
              triggered.push({ id: relicId, tone: 980, duration: 800 });
            }
          });

          if (triggered.length > 0) {
            const playSeq = (idx = 0) => {
              if (idx >= triggered.length) {
                setRelicActivated(null);
                return;
              }
              const item = triggered[idx];
              flashRelic(item.id, item.tone, item.duration);
              setTimeout(() => playSeq(idx + 1), Math.max(150, item.duration * 0.6));
            };
            playSeq(0);
          }
        }

        return newCount;
      });
    } else if (a.actor === 'enemy') {
      setEnemyTurnEtherAccumulated(prev => prev + BASE_ETHER_PER_CARD);
    }

    setPlayer(prev => ({ ...prev, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1, strength: P.strength || 0 }));
    setEnemy(prev => ({ ...prev, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 }));
    setActionEvents(prev => ({ ...prev, [qIndex]: actionEvents }));

    // ?대깽??泥섎━: ?좊땲硫붿씠??諛??ъ슫??
    actionEvents.forEach(ev => {
      addLog(ev.msg);

      // ?쇨꺽 ?④낵 (hit, pierce ???
      if ((ev.type === 'hit' || ev.type === 'pierce') && ev.dmg > 0) {
        playHitSound();
        if (ev.actor === 'player') {
          // ?뚮젅?댁뼱媛 怨듦꺽 -> ???쇨꺽
          setEnemyHit(true);
          setTimeout(() => setEnemyHit(false), 300);
        } else {
          // ?곸씠 怨듦꺽 -> ?뚮젅?댁뼱 ?쇨꺽
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 300);
        }
      }

      // 諛⑹뼱 ?④낵 (defense ???
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

      // 諛섍꺽 ?쇳빐
      if (ev.actor === 'counter') {
        playHitSound();
        // counter??諛섎? 諛⑺뼢?쇰줈 ?쇳빐媛 媛誘濡??寃잛쓣 諛섎?濡?
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
      // 紐ъ뒪??二쎌쓬 ?좊땲硫붿씠??諛??ъ슫??
      setEnemyHit(true);
      playSound(200, 500); // ??? 二쇳뙆?섎줈 二쎌쓬 ?ъ슫??

      // ??꾨씪??利됱떆 ?④? 諛??먮룞吏꾪뻾 以묐떒
      setTimelineIndicatorVisible(false);
      setAutoProgress(false);

      // ?⑥? 移대뱶?ㅼ쓣 鍮꾪솢?깊솕 ?곹깭濡??쒖떆 (?먮뒗 ?좎?)
      const disabledIndices = queue.slice(newQIndex).map((_, idx) => newQIndex + idx);
      setDisabledCardIndices(disabledIndices);

      // ?ㅼ젣濡??ㅽ뻾 ?꾨즺???뚮젅?댁뼱 移대뱶 ??怨꾩궛 (諛곗쑉 怨꾩궛???ъ슜)
      // newQIndex???ㅼ쓬???ㅽ뻾??移대뱶???몃뜳?ㅼ씠誘濡? newQIndex ?댁쟾源뚯?留?移댁슫??
      // ?? ?꾩옱 ?ㅽ뻾 以묒씤 移대뱶(qIndex)???꾩쭅 ?꾨즺?섏? ?딆븯?쇰?濡??쒖쇅
      // resolvedPlayerCards ?곹깭? ?숈씪??媛믪쓣 ?ъ슜?섎뒗 寃껋씠 ?뺥솗??
      const actualResolvedCards = resolvedPlayerCards;

      // ???몃뜳?ㅻ? ?앹쑝濡??대룞?섏뿬 ???댁긽 吏꾪뻾?섏? ?딅룄濡???
      setQIndex(queue.length);

      // ?먰뀒瑜?怨꾩궛 ?좊땲硫붿씠?섏? useEffect?먯꽌 ?ㅽ뻾??(?곹깭 ?낅뜲?댄듃 ??대컢 蹂댁옣)
      // ?먰뀒瑜닿? ?놁쑝硫?踰꾪듉 ?쒖떆瑜??꾪빐 0?쇰줈 ?ㅼ젙
      if (turnEtherAccumulated === 0) {
        setEtherFinalValue(0);
      }
      return;
    }

    // ??꾨씪?몄쓽 紐⑤뱺 移대뱶 吏꾪뻾???앸궗?????먰뀒瑜?怨꾩궛 ?좊땲硫붿씠?섏? useEffect?먯꽌 ?ㅽ뻾??(?곹깭 ?낅뜲?댄듃 ??대컢 蹂댁옣)
  };

  // ?먮룞吏꾪뻾 湲곕뒫
  useEffect(() => {
    if (autoProgress && phase === 'resolve' && qIndex < queue.length) {
      const timer = setTimeout(() => {
        stepOnce();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoProgress, phase, qIndex, queue.length]);

  // ??꾨씪???꾨즺 ???먰뀒瑜?怨꾩궛 ?좊땲硫붿씠???ㅽ뻾
  // useEffect瑜??ъ슜?섏뿬 turnEtherAccumulated ?곹깭媛 理쒖떊 媛믪씪 ???ㅽ뻾
  useEffect(() => {
    if (phase === 'resolve' && qIndex >= queue.length && queue.length > 0 && turnEtherAccumulated > 0 && etherCalcPhase === null) {
      // 紐⑤뱺 移대뱶媛 ?ㅽ뻾?섍퀬 ?먰뀒瑜닿? ?꾩쟻???곹깭?먯꽌, ?좊땲硫붿씠?섏씠 ?꾩쭅 ?쒖옉?섏? ?딆븯???뚮쭔 ?ㅽ뻾
      // resolvedPlayerCards瑜??꾨떖?섏뿬 紐ъ뒪???щ쭩 ?쒖뿉???뺥솗??移대뱶 ???ъ슜
      setTimeout(() => startEtherCalculationAnimation(turnEtherAccumulated, resolvedPlayerCards), 50);
    }
  }, [phase, qIndex, queue.length, turnEtherAccumulated, etherCalcPhase, resolvedPlayerCards]);

  const finishTurn = (reason) => {
    addLog(`??醫낅즺: ${reason || ''}`);

    // ?ㅼ쓬 ???④낵 泥섎━ (?뱀꽦 湲곕컲)
    const newNextTurnEffects = {
      guaranteedCards: [],
      bonusEnergy: 0,
      energyPenalty: 0,
      etherBlocked: false,
      mainSpecialOnly: false,
      subSpecialBoost: 0,
    };

    // ?좏깮??移대뱶?ㅼ쓽 ?뱀꽦 ?뺤씤
    selected.forEach(card => {
      // 諛섎났 (repeat): ?ㅼ쓬?댁뿉???먰뙣???뺤젙?곸쑝濡??깆옣
      if (hasTrait(card, 'repeat')) {
        newNextTurnEffects.guaranteedCards.push(card.id);
        addLog(`?봽 "諛섎났" - ${card.name}??媛) ?ㅼ쓬?댁뿉???깆옣?⑸땲??`);
      }

      // 紐명?湲?(warmup): ?ㅼ쓬???됰룞??+2
      if (hasTrait(card, 'warmup')) {
        newNextTurnEffects.bonusEnergy += 2;
        addLog(`??"紐명?湲? - ?ㅼ쓬???됰룞??+2`);
      }

      // ?덉쭊 (exhaust): ?ㅼ쓬???됰룞??-2
      if (hasTrait(card, 'exhaust')) {
        newNextTurnEffects.energyPenalty += 2;
        addLog(`?삹 "?덉쭊" - ?ㅼ쓬???됰룞??-2`);
      }

      // 留앷컖 (oblivion): ?댄썑 ?먰뀒瑜??띾뱷 遺덇?
      if (hasTrait(card, 'oblivion')) {
        newNextTurnEffects.etherBlocked = true;
        addLog(`?슟 "留앷컖" - ?댄썑 ?먰뀒瑜??띾뱷??遺덇??ν빐吏묐땲??`);
      }

      // ?뚰깂 (ruin): ?ㅼ쓬??二쇳듅湲곕쭔 ?깆옣
      if (hasTrait(card, 'ruin')) {
        newNextTurnEffects.mainSpecialOnly = true;
        addLog(`?좑툘 "?뚰깂" - ?ㅼ쓬?댁? 二쇳듅湲?移대뱶留?戮묓옓?덈떎.`);
      }

      // ?κ뎔 (general): ?ㅼ쓬??蹂댁“?밴린 ?깆옣瑜?25% 利앷?
      if (hasTrait(card, 'general')) {
        newNextTurnEffects.subSpecialBoost += 0.25;
        addLog(`?몣 "?κ뎔" - ?ㅼ쓬??蹂댁“?밴린 ?깆옣瑜?利앷?!`);
      }
    });

    // ?좊Ъ ??醫낅즺 ?④낵 ?곸슜 (怨꾩빟?? ?????
    const turnEndRelicEffects = applyTurnEndEffects(relics, {
      cardsPlayedThisTurn: selected.length,
      player,
      enemy,
    });

    // ??醫낅즺 ?좊Ъ 諛쒕룞 ?좊땲硫붿씠??
    relics.forEach(relicId => {
      const relic = RELICS[relicId];
      if (relic?.effects?.type === 'ON_TURN_END') {
        const condition = relic.effects.condition;
        if (!condition || condition({ cardsPlayedThisTurn: selected.length, player, enemy })) {
          setRelicActivated(relicId);
          playSound(800, 200);
          setTimeout(() => setRelicActivated(null), 500);
        }
      }
    });

    // ??醫낅즺 ?좊Ъ ?④낵瑜??ㅼ쓬 ???④낵??異붽?
    if (turnEndRelicEffects.energyNextTurn > 0) {
      newNextTurnEffects.bonusEnergy += turnEndRelicEffects.energyNextTurn;
      addLog(`?뱶 ?좊Ъ ?④낵: ?ㅼ쓬???됰룞??+${turnEndRelicEffects.energyNextTurn}`);
      console.log("[??醫낅즺 怨꾩빟???④낵]", {
        "selected.length": selected.length,
        "turnEndRelicEffects.energyNextTurn": turnEndRelicEffects.energyNextTurn,
        "newNextTurnEffects.bonusEnergy": newNextTurnEffects.bonusEnergy
      });
    }

    setNextTurnEffects(newNextTurnEffects);

    // ??利앷? 利됱떆 ?곸슜 (????? - ?곹깭 ?낅뜲?댄듃 ?꾩뿉 ?곸슜
    if (turnEndRelicEffects.strength !== 0) {
      const currentStrength = player.strength || 0;
      const newStrength = currentStrength + turnEndRelicEffects.strength;
      addLog(`?뮞 ?좊Ъ ?④낵: ??${turnEndRelicEffects.strength > 0 ? '+' : ''}${turnEndRelicEffects.strength} (珥?${newStrength})`);
      setPlayer(p => ({ ...p, strength: newStrength }));
    }

    // ??醫낅즺 ??議고빀 移댁슫??利앷? (Deflation)
    const pComboEnd = detectPokerCombo(selected);
    const eComboEnd = detectPokerCombo(enemyPlan.actions);

    // ?먰뀒瑜?理쒖쥌 怨꾩궛 諛??곸슜 (?좊땲硫붿씠?섏? stepOnce?먯꽌 泥섎━??
    const basePlayerComboMult = pComboEnd ? (COMBO_MULTIPLIERS[pComboEnd.name] || 1) : 1;
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    const etherPerCardApplied = Math.max(1, Math.floor(BASE_ETHER_PER_CARD * passiveRelicEffects.etherMultiplier));
    const estimatedCardsFromEther = etherPerCardApplied > 0 ? Math.round(turnEtherAccumulated / etherPerCardApplied) : 0;
    // ?좊Ъ 怨꾩궛??移대뱶 ?? ?ㅼ젣 吏꾪뻾??移대뱶 ???곗꽑, 洹????좏깮/??꾨씪???먰뀒瑜??꾩쟻 異붿젙移섎줈 蹂댁젙
    const cardsPlayedForRelic = Math.max(
      resolvedPlayerCards,
      selected.length,
      playerTimeline.length,
      estimatedCardsFromEther
    );
    const playerComboMult = computeComboMultiplier(basePlayerComboMult, cardsPlayedForRelic, true);
    const relicMultBonus = playerComboMult - basePlayerComboMult;

    // ??醫낅즺 ?쒖젏?먮뒗 ?먰뀒瑜?寃곗젙/議곗빟??諛쒕룞 ?좊땲硫붿씠?섏쓣 以묐났 ?몄텧?섏? ?딆쓬 (移대뱶 ?ㅽ뻾 ?쒖뿉留?

    const enemyComboMult = eComboEnd ? (COMBO_MULTIPLIERS[eComboEnd.name] || 1) : 1;

    // 議고빀 諛곗쑉 ?곸슜
    let playerBeforeDeflation = Math.round(turnEtherAccumulated * playerComboMult);
    // ?좊Ъ ?④낵 ?곸슜 (李멸퀬?? ?낅쭏??二쇱궗?? ?ш???議곗빟??
    playerBeforeDeflation = calcEtherGainNoDevil(playerBeforeDeflation, cardsPlayedForRelic);

    const enemyBeforeDeflation = Math.round(enemyTurnEtherAccumulated * enemyComboMult);

    // ?뷀뵆?덉씠???곸슜
    const playerDeflation = pComboEnd?.name
      ? applyEtherDeflation(playerBeforeDeflation, pComboEnd.name, player.comboUsageCount || {})
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    const enemyDeflation = eComboEnd?.name
      ? applyEtherDeflation(enemyBeforeDeflation, eComboEnd.name, enemy.comboUsageCount || {})
      : { gain: enemyBeforeDeflation, multiplier: 1, usageCount: 0 };

    // finishTurn?먯꽌 ??긽 ?덈줈 怨꾩궛 (?좊땲硫붿씠???쒖젏??媛믪? ?곹깭 ?낅뜲?댄듃 ??대컢 臾몄젣濡?遺?뺥솗?????덉쓬)
    const playerFinalEther = playerDeflation.gain;
    const enemyFinalEther = enemyDeflation.gain;

    console.log('[finishTurn 怨꾩궛]', {
      turnEtherAccumulated,
      etherPerCardApplied,
      estimatedCardsFromEther,
      cardsPlayedForRelic,
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
      cardCountForMultiplier: cardsPlayedForRelic,
      comboUsageCount: player.comboUsageCount,
      comboUsageForThisCombo: player.comboUsageCount?.[pComboEnd?.name] || 0
    });

    // ?먰뀒瑜?踰붾엺 怨꾩궛: ?꾩옱 ?щ’ ?댁뿉??珥덇낵遺꾩? 踰붾엺
    let playerAppliedEther = 0;
    let playerOverflow = 0;

    if (playerFinalEther > 0) {
      playerAppliedEther = playerFinalEther;
      playerOverflow = 0;

      // ?ㅼ젣 ?곸슜??珥?諛곗쑉 怨꾩궛 (議고빀 諛곗쑉 + 李멸퀬??+ ?낅쭏??二쇱궗??
      const actualTotalMultiplier = turnEtherAccumulated > 0
        ? (playerBeforeDeflation / turnEtherAccumulated)
        : 1;

      const deflationText = playerDeflation.usageCount > 0
        ? ` (?뷀뵆?덉씠??-${Math.round((1 - playerDeflation.multiplier) * 100)}%, ${playerDeflation.usageCount}???ъ슜)`
        : '';
      const relicText = relicMultBonus > 0 ? ` (?좊Ъ 諛곗쑉 +${relicMultBonus.toFixed(2)})` : '';
      addLog(`?댐툘 ?먰뀒瑜??띾뱷: ${turnEtherAccumulated} 횞 ${actualTotalMultiplier.toFixed(2)}${relicText} = ${playerBeforeDeflation} ??${playerFinalEther} PT${deflationText} (?곸슜: ${playerAppliedEther} PT)`);

      // 理쒖쥌媛?UI??濡쒓렇? ?숈씪??媛??쒖떆
      setEtherFinalValue(playerFinalEther);
    }
    // ?곷룄 ?숈씪?섍쾶 ?곸슜/踰붾엺 怨꾩궛 (?щ’ ?⑥?移??쒗븳 ?쒓굅)
    let enemyAppliedEther = 0;
    let enemyOverflow = 0;
    if (enemyFinalEther > 0) {
      enemyAppliedEther = enemyFinalEther;
      enemyOverflow = 0;

      const deflationText = enemyDeflation.usageCount > 0
        ? ` (?뷀뵆?덉씠?? ${Math.round(enemyDeflation.multiplier * 100)}%)`
        : '';
      addLog(`?꾬툘 ???먰뀒瑜??띾뱷: ${enemyTurnEtherAccumulated} 횞 ${enemyComboMult.toFixed(2)} = ${enemyBeforeDeflation} ??${enemyFinalEther} PT${deflationText} (?곸슜: ${enemyAppliedEther} PT)`);
      setEnemyEtherCalcPhase('sum');
      setTimeout(() => setEnemyEtherCalcPhase('multiply'), 50);
      setTimeout(() => {
        setEnemyEtherCalcPhase('deflation');
        setEnemyCurrentDeflation(enemyDeflation.usageCount > 0 ? { multiplier: enemyDeflation.multiplier, usageCount: enemyDeflation.usageCount } : null);
      }, 150);
      setTimeout(() => setEnemyEtherCalcPhase('result'), 300);
    }

    setEnemyEtherFinalValue(enemyFinalEther);

    // ?먰뀒瑜??뚯????대룞: ?곸슜移?湲곗? (?뚮젅?댁뼱???껋쓣 ???덉쓬)
    const netTransfer = playerAppliedEther - enemyAppliedEther;
    const curPlayerPts = player.etherPts || 0;
    const curEnemyPts = enemy.etherPts || 0;
    let nextPlayerPts = curPlayerPts;
    let nextEnemyPts = curEnemyPts;
    let movedPts = 0;
    if (netTransfer > 0) {
      const move = Math.min(netTransfer, curEnemyPts);
      movedPts += move;
      nextPlayerPts += move;
      nextEnemyPts = Math.max(0, curEnemyPts - move);
    } else if (netTransfer < 0) {
      const move = Math.min(-netTransfer, curPlayerPts);
      movedPts -= move;
      nextPlayerPts = Math.max(0, curPlayerPts - move);
      nextEnemyPts += move;
    }

    // 紐ъ뒪?곌? 泥섏튂??寃쎌슦: ?⑥? ?먰뀒瑜??꾨? ?뚮젅?댁뼱?먭쾶 ?댁쟾
    if (enemy.hp <= 0 && nextEnemyPts > 0) {
      movedPts += nextEnemyPts;
      nextPlayerPts += nextEnemyPts;
      addLog(`?뮔 ???붿뿬 ?먰뀒瑜??뚯닔: +${nextEnemyPts} PT`);
      nextEnemyPts = 0;
    }

    // ?ㅼ젣 ?대룞???묒쓣 ?명?濡?湲곕줉 (0?댁뼱???쒖떆 ?쇱튂??
    setNetEtherDelta(movedPts);

    if (movedPts !== 0) {
      setPlayerTransferPulse(true);
      setEnemyTransferPulse(true);
      playSound(movedPts > 0 ? 900 : 600, 180);
      setTimeout(() => {
        setPlayerTransferPulse(false);
        setEnemyTransferPulse(false);
      }, 450);
      addLog(`?봺 ?먰뀒瑜??대룞: ?뚮젅?댁뼱 ${movedPts > 0 ? '+' : ''}${movedPts} PT`);
    }

    setPlayer(p => {
      const newUsageCount = { ...(p.comboUsageCount || {}) };
      if (pComboEnd?.name) {
        newUsageCount[pComboEnd.name] = (newUsageCount[pComboEnd.name] || 0) + 1;
      }
      // ?뚮젅?댁뼱媛 ?ъ슜??媛?移대뱶???ъ슜 ?잛닔 利앷? (?숇젴 ?뱀꽦??
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
        etherPts: Math.max(0, nextPlayerPts),
        etherOverflow: (p.etherOverflow || 0) + playerOverflow
      };
    });

    let nextEnemyPtsSnapshot = null;
    setEnemy(e => {
      const newEnemyUsageCount = { ...(e.comboUsageCount || {}) };
      if (eComboEnd?.name) {
        newEnemyUsageCount[eComboEnd.name] = (newEnemyUsageCount[eComboEnd.name] || 0) + 1;
      }
      const nextPts = Math.max(0, nextEnemyPts);
      nextEnemyPtsSnapshot = nextPts;
      return {
        ...e,
        block: 0,
        def: false,
        counter: 0,
        vulnMult: 1,
        vulnTurns: 0,
        etherOverdriveActive: false,
        comboUsageCount: newEnemyUsageCount,
        etherPts: nextPts
      };
    });

    // ?먰뀒瑜??꾩쟻 移댁슫??由ъ뀑 (?좊땲硫붿씠???곹깭???ㅼ쓬 ???쒖옉 ??由ъ뀑??
    setTurnEtherAccumulated(0);
    setEnemyTurnEtherAccumulated(0);

    setSelected([]); setQueue([]); setQIndex(0); setFixedOrder(null); setUsedCardIndices([]);
    setDisappearingCards([]); setHiddenCards([]);

    // ??醫낅즺 ???밸━/?⑤같 泥댄겕
    const etherVictoryNow = nextEnemyPtsSnapshot !== null && nextEnemyPtsSnapshot <= 0;
    const etherVictoryImmediate = nextEnemyPts <= 0;
    if (enemy.hp <= 0 || etherVictoryNow || etherVictoryImmediate) {
      if (etherVictoryNow || etherVictoryImmediate) {
        setSoulShatter(true);
      }
      setNetEtherDelta(null);
      setTimeout(() => {
        setPostCombatOptions({ type: 'victory' });
        setPhase('post');
      }, (etherVictoryNow || etherVictoryImmediate) ? 1200 : 500);
      return;
    }
    if (player.hp <= 0) {
      setNetEtherDelta(null);
      setTimeout(() => {
        setPostCombatOptions({ type: 'defeat' });
        setPhase('post');
      }, 500);
      return;
    }

    setTurnNumber(t => t + 1);
    setNetEtherDelta(null);
    setPhase('select');
  };

  const runAll = () => {
    if (qIndex >= queue.length) return;
    playSound(1000, 150); // ?꾨??ㅽ뻾 ?④낵??
    let P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, etherPts: player.etherPts || 0 };
    let E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, etherPts: enemy.etherPts || 0 };
    const tempState = { player: P, enemy: E, log: [] };
    const newEvents = {};
    let enemyDefeated = false;

    for (let i = qIndex; i < queue.length; i++) {
      const a = queue[i];

      // ?곸씠 ?대? 二쎌뿀?쇰㈃ ?곸쓽 ?됰룞? 嫄대꼫?곌린
      if (enemyDefeated && a.actor === 'enemy') {
        continue;
      }

      const { events } = applyAction(tempState, a.actor, a.card);
      newEvents[i] = events;
      events.forEach(ev => addLog(ev.msg));

      // 移대뱶 ?ъ슜 ???먰뀒瑜??꾩쟻 (?ㅼ젣 ?곸슜? ??醫낅즺 ??
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
        // 紐ъ뒪??二쎌쓬 ?좊땲硫붿씠??諛??ъ슫??
        setEnemyHit(true);
        playSound(200, 500);
        addLog('?? ??泥섏튂! ?⑥? ???됰룞 嫄대꼫?곌린');
        enemyDefeated = true;
        // 怨꾩냽 吏꾪뻾 (?뚮젅?댁뼱???⑥? ?됰룞 泥섎━)
      }
    }
    setPlayer(prev => ({ ...prev, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 }));
    setEnemy(prev => ({ ...prev, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 }));
    setActionEvents(prev => ({ ...prev, ...newEvents }));
    setQIndex(queue.length);

    // ??꾨씪???꾨즺 ???먰뀒瑜?怨꾩궛 ?좊땲硫붿씠???쒖옉
    if (turnEtherAccumulated > 0) {
      const pCombo = detectPokerCombo(selected);
      const playerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
      const playerBeforeDeflation = Math.round(turnEtherAccumulated * playerComboMult);

      // ?뷀뵆?덉씠???곸슜
      const playerDeflation = pCombo?.name
        ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
        : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

      const playerFinalEther = playerDeflation.gain;

      console.log('[runAll ?좊땲硫붿씠??', {
        turnEtherAccumulated,
        comboName: pCombo?.name,
        playerComboMult,
        playerBeforeDeflation,
        deflationMult: playerDeflation.multiplier,
        usageCount: playerDeflation.usageCount,
        playerFinalEther,
        selectedCards: selected.length
      });

      // 1?④퀎: ?⑷퀎 媛뺤“
      setEtherCalcPhase('sum');
      setTimeout(() => {
        // 2?④퀎: 怨깆뀍 媛뺤“ + 紐낆풄???ъ슫??        setEtherCalcPhase('multiply');
        playSound(800, 100); // 紐낆풄???ъ슫??        setTimeout(() => {
          // 3?④퀎: ?뷀뵆?덉씠??諛곗? ?좊땲硫붿씠??+ ????ъ슫??          if (playerDeflation.usageCount > 0) {
            setEtherCalcPhase('deflation');
            playSound(200, 150); // ????ъ슫??          }
          setTimeout(() => {
            // 4?④퀎: 理쒖쥌媛??쒖떆 + 臾듭쭅???ъ슫??            setEtherCalcPhase('result');
            // 理쒖쥌媛믪? finishTurn?먯꽌 ?ㅼ젙??(?좊땲硫붿씠???쒖젏??媛믪? 遺?뺥솗)
            playSound(400, 200); // 臾듭쭅???ъ슫??          }, playerDeflation.usageCount > 0 ? 400 : 0);
        }, 600);
      }, 400);
    }
  };

  const removeSelectedAt = (i) => setSelected(selected.filter((_, idx) => idx !== i));

  const playerTimeline = useMemo(() => {
    if (phase === 'select') {
      // ?꾩옱 ?좏깮??移대뱶?ㅼ쓽 議고빀 媛먯?
      const currentCombo = detectPokerCombo(selected);
      const comboCardCosts = new Set();
      if (currentCombo?.bonusKeys) {
        currentCombo.bonusKeys.forEach(cost => comboCardCosts.add(cost));
      }
      const isFlush = currentCombo?.name === '플러시';

      let ps = 0;
      return selected.map((c, idx) => {
        // 移대뱶媛 議고빀???ы븿?섎뒗吏 ?뺤씤
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
    // ?좏깮 ?④퀎?먯꽌???듭같???놁쑝硫?????꾨씪?몄쓣 ?④릿??
    if (phase === 'select') {
      const actions = enemyPlan.actions || [];
      if (!actions.length) return [];
      if (!insightReveal || !insightReveal.visible || (insightReveal.level || 0) === 0) return [];
      const level = insightReveal.level || 0;
      const limited = level === 1 ? actions.slice(0, 2) : actions;
      let sp = 0;
      return limited.map((card, idx) => {
        sp += card.speedCost || 0;
        return { actor: 'enemy', card, sp, idx };
      });
    }
    if (phase === 'respond' && fixedOrder) return fixedOrder.filter(x => x.actor === 'enemy');
    if (phase === 'resolve') return queue.filter(x => x.actor === 'enemy');
    return [];
  }, [phase, fixedOrder, queue, enemyPlan.actions, insightReveal]);

  if (!enemy) return <div className="text-white p-4">로딩 중...</div>;

  const handDisabled = (c) => (
    selected.length >= MAX_SUBMIT_CARDS ||
    totalSpeed + c.speedCost > player.maxSpeed ||
    totalEnergy + c.actionCost > player.maxEnergy
  );
  const playerEtherValue = player?.etherPts ?? 0;
  const playerEtherSlots = etherSlots(playerEtherValue);
  const enemyEtherValue = enemy?.etherPts ?? 0;
  const formatCompactValue = (num) => {
    if (!Number.isFinite(num)) return '0';
    const abs = Math.abs(num);
    if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };
  const playerEnergyBudget = player.energy || BASE_PLAYER_ENERGY;
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergy);
  const insightLevelSelect = insightReveal?.level || 0;
  const insightVisible = insightReveal?.visible;
  const enemyWillOverdrivePlan = shouldEnemyOverdriveWithTurn(enemyPlan.mode, enemyPlan.actions, enemy.etherPts, turnNumber);
  const canRevealOverdrive =
    (phase === 'select' && insightVisible && insightLevelSelect >= 2) ||
    (phase === 'respond' && insightVisible && insightLevelSelect >= 1) ||
    phase === 'resolve';
  const enemyOverdriveVisible = canRevealOverdrive && (enemyWillOverdrivePlan || enemy?.etherOverdriveActive);
  const enemyOverdriveLabel = enemy?.etherOverdriveActive ? '湲곗썝 諛쒕룞' : '湲곗썝 ?덉젙';
  const rawNetDelta = (phase === 'resolve' && etherFinalValue !== null && enemyEtherFinalValue !== null)
    ? (etherFinalValue - enemyEtherFinalValue)
    : null;

  const netFinalEther = netEtherDelta !== null
    ? netEtherDelta
    : rawNetDelta;
  const enemyCapacity = enemy?.etherCapacity ?? Math.max(enemyEtherValue, 1);
  const enemySoulScale = Math.max(0.4, Math.min(1.3, enemyCapacity > 0 ? enemyEtherValue / enemyCapacity : 1));

  // ?먰뀒瑜??띾뱷??誘몃━蹂닿린 怨꾩궛
  const previewEtherGain = useMemo(() => {
    if (playerTimeline.length === 0) return 0;

    // ?ш???議곗빟???④낵 ?곸슜??移대뱶???먰뀒瑜?    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    const etherPerCard = Math.floor(BASE_ETHER_PER_CARD * passiveRelicEffects.etherMultiplier);
    const totalEtherPts = playerTimeline.length * etherPerCard;

    // 議고빀 諛곗쑉 怨꾩궛 (selected 湲곗??쇰줈 議고빀 媛먯?)
    const pCombo = detectPokerCombo(selected);
    const basePlayerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
    // 誘몃━蹂닿린?먯꽌???좊Ъ 諛곗쑉 ?쒖쇅 (?쒖닔 議고빀 諛곗쑉留?
    const playerComboMult = basePlayerComboMult;
    let playerBeforeDeflation = Math.round(totalEtherPts * playerComboMult);

    // ?좊Ъ ?④낵 ?곸슜 (李멸퀬?? ?낅쭏??二쇱궗??- ?ш???議곗빟?뚯? ?대? ?곸슜??
    playerBeforeDeflation = calcEtherGainNoDevil(playerBeforeDeflation, playerTimeline.length);

    // ?뷀뵆?덉씠???곸슜
    const playerDeflation = pCombo?.name
      ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    return playerDeflation.gain;
  }, [playerTimeline, selected, relics, player.comboUsageCount]);

  // ??議고빀 媛먯? (?쒖떆??
  const enemyCombo = useMemo(() => detectPokerCombo(enemyPlan.actions || []), [enemyPlan.actions]);

  // 적 모드 힌트 추출
  const enemyHint = useMemo(() => {
    const hintLog = log.find(line => line.includes('적 모드 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 모드 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [log]);

  // ?덉긽 ?쇳빐??怨꾩궛 諛??ъ슫??
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
      {/* ?덉긽 ?쇳빐??- ?ㅻⅨ履?怨좎젙 ?⑤꼸 */}
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
          turnNumber={turnNumber}
        />
      </div>

      {/* ?곷떒 硫붿씤 ?곸뿭 */}
      <div className="w-full px-4" style={{ marginRight: '280px', marginLeft: '150px' }}>

        {/* ?좊Ъ ?쒖떆 */}
        {orderedRelicList && orderedRelicList.length > 0 && (
          <div style={{
            display: 'flex',
            marginBottom: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            pointerEvents: 'none'
          }}>
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 12px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '2px solid rgba(148, 163, 184, 0.5)',
              borderRadius: '12px',
              boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
              pointerEvents: 'auto'
            }}>
              {orderedRelicList.map((relicId, index) => {
                const relic = RELICS[relicId];
                if (!relic) return null;

                const isActivated = relicActivated === relicId || activeRelicSet.has(relicId);
                const isHovered = hoveredRelic === relicId;
                // 吏??媛뺤“ ?쒖쇅 ??? ?먰뀒瑜?寃곗젙/?낅쭏??二쇱궗???ш???議곗빟??etherCardMultiplier)
                const isPersistent = (relic.effects?.type === 'PASSIVE'
                  && relicId !== 'etherGem'
                  && relicId !== 'devilDice'
                  && relicId !== 'rareStone' // ?ш???議곗빟?뚯? ?곸떆 媛뺤“ ?쒖쇅
                  && !relic.effects?.etherCardMultiplier
                  && !relic.effects?.etherMultiplier)
                  || relic.effects?.type === 'ON_TURN_START' // ?쇳뵾??媛묒샆
                  || relicId === 'bloodShackles'; // ?쇱쓽 議깆뇙 - ?꾪닾 以?吏??媛뺤“
                const isHighlighted = isPersistent || isActivated;
                const rarityText = {
                  [RELIC_RARITIES.COMMON]: '?쇰컲',
                  [RELIC_RARITIES.RARE]: '?ш?',
                  [RELIC_RARITIES.SPECIAL]: '?밸퀎',
                  [RELIC_RARITIES.LEGENDARY]: '?꾩꽕'
                }[relic.rarity] || '?????놁쓬';

                return (
                  <div
                    key={index}
                    style={{ position: 'relative' }}
                    draggable
                    onDragStart={handleRelicDragStart(index, relicId)}
                    onDragOver={handleRelicDragOver}
                    onDrop={handleRelicDrop(index)}
                    onMouseDown={() => setRelicActivated(prev => prev === relicId ? null : relicId)} // ?대┃ ???좉?
                  >
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
                        filter: isHighlighted ? 'brightness(1.15) drop-shadow(0 0 4px rgba(251, 191, 36, 0.35))' : 'brightness(1)',
                        transform: isHovered ? 'scale(1.12)' : (isActivated ? 'scale(1.16)' : 'scale(1)'),
                        animation: isActivated ? 'relicActivate 0.4s ease' : 'none',
                        background: isHighlighted ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
                        borderRadius: '8px',
                        border: isHighlighted ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid transparent',
                        boxShadow: isHighlighted ? '0 0 15px rgba(251, 191, 36, 0.5)' : 'none'
                      }}>
                      <span>{relic.emoji}</span>
                    </div>

                    {/* 媛쒕퀎 ?댄똻 */}
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

        {/* Timeline - 1以?湲멸쾶 (?붾㈃ 媛?? */}
        <div style={{ marginBottom: '32px' }}>
          <div className="panel-enhanced timeline-panel">
            <div className="timeline-body" style={{ marginTop: '0' }}>
              <div className="timeline-axis">
                {generateSpeedTicks(Math.max(player.maxSpeed, enemy.maxSpeed)).map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>
              {/* ??꾨씪??progress indicator (?쒓퀣諛붾뒛) */}
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
              <div className="timeline-lanes" style={{ position: 'relative' }}>
                {insightAnimLevel === 1 && (
                  <div className="insight-overlay insight-glitch" aria-hidden="true" />
                )}
                {insightAnimLevel === 2 && (
                  <div className="insight-overlay insight-scan" aria-hidden="true">
                    <div className="insight-scan-beam" />
                  </div>
                )}
                {insightAnimLevel === 3 && (
                  <div className="insight-overlay insight-beam" aria-hidden="true" key={insightAnimPulseKey} />
                )}
                {enemyOverdriveVisible && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '-18px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.15), rgba(99, 102, 241, 0.2))',
                    border: '1.5px solid rgba(147, 197, 253, 0.6)',
                    color: '#c4d4ff',
                    fontWeight: '800',
                    letterSpacing: '0.08em',
                    boxShadow: '0 6px 16px rgba(79, 70, 229, 0.35)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <span role="img" aria-label="overdrive">⚡</span> {enemyOverdriveLabel}
                  </div>
                )}
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
                    // ??꾨씪?몄뿉???꾩옱 吏꾪뻾 以묒씤 ?≪뀡?몄? ?뺤씤
                    const globalIndex = phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                    const isExecuting = executingCardIndex === globalIndex;
                    const isUsed = usedCardIndices.includes(globalIndex) && globalIndex < qIndex;
                    // ?뺢퇋?? player???띾룄瑜?鍮꾩쑉濡?蹂?섑븯???쒖떆
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
                    // ??꾨씪?몄뿉???꾩옱 吏꾪뻾 以묒씤 ?≪뀡?몄? ?뺤씤
                    const globalIndex = phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                    const isExecuting = executingCardIndex === globalIndex;
                    const isUsed = usedCardIndices.includes(globalIndex) && globalIndex < qIndex;
                    // ?뺢퇋?? enemy???띾룄瑜?鍮꾩쑉濡?蹂?섑븯???쒖떆
                    const normalizedPosition = (a.sp / enemy.maxSpeed) * 100;
                    const levelForTooltip = phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0);
                    const canShowTooltip = levelForTooltip >= 3;
                    const markerCls = [
                      'timeline-marker',
                      'marker-enemy',
                      isExecuting ? 'timeline-active' : '',
                      isUsed ? 'timeline-used' : '',
                      canShowTooltip ? 'insight-lv3-glow' : ''
                    ].join(' ');
                    return (
                      <div key={idx}
                        className={markerCls}
                        style={{ left: `${normalizedPosition}%`, top: `${6 + offset}px` }}
                        onMouseEnter={(e) => {
                          if (!canShowTooltip) return;
                          setHoveredEnemyAction({
                            action: a.card,
                            idx,
                            left: normalizedPosition,
                            top: 6 + offset,
                            pageX: e.clientX,
                            pageY: e.clientY,
                          });
                        }}
                        onMouseLeave={() => setHoveredEnemyAction(null)}
                      >
                        <div className="marker-content">
                          <Icon size={14} className="text-white" />
                          {canShowTooltip && <span className="insight-eye-badge">👁</span>}
                          <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ?뚮젅?댁뼱/???뺣낫 + 以묒븰 ?뺣낫 ?듯빀 ?덉씠?꾩썐 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '50px', gap: '120px', position: 'relative' }}>
          {phase === 'resolve' && etherFinalValue !== null && enemyEtherFinalValue !== null && (
            <div style={{
              position: 'absolute',
              top: '280px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              padding: '12px 36px',
              background: 'rgba(8, 15, 30, 0.35)',
              borderRadius: '18px',
              border: '1.5px solid rgba(148, 163, 184, 0.35)',
              boxShadow: '0 10px 28px rgba(0,0,0,0.35), inset 0 0 12px rgba(94, 234, 212, 0.1)'
            }}>
              <div style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(56, 189, 248, 0.14))',
                border: '2px solid rgba(125, 211, 252, 0.9)',
                color: '#e0f2fe',
                fontWeight: '900',
                letterSpacing: '0.14em',
                fontSize: '1.25rem',
                minWidth: '190px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 16px rgba(125, 211, 252, 0.35)'
              }}>
                {etherFinalValue.toLocaleString()} P T
              </div>
              <div style={{ width: '96px', height: '2px', background: 'linear-gradient(90deg, rgba(125,211,252,0.0), rgba(125,211,252,0.8))', boxShadow: '0 0 10px rgba(125,211,252,0.35)' }} />
              <div style={{
                padding: '12px 22px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(16, 185, 129, 0.25))',
                border: '2px solid rgba(125, 211, 252, 0.7)',
                color: '#e0f2fe',
                fontWeight: '900',
                fontSize: '1.3rem',
                letterSpacing: '0.14em',
                whiteSpace: 'nowrap',
                minWidth: '130px',
                textAlign: 'center'
              }}>
                ? {netFinalEther.toLocaleString()} P T
              </div>
              <div style={{ width: '96px', height: '2px', background: 'linear-gradient(90deg, rgba(125,211,252,0.8), rgba(125,211,252,0.0))', boxShadow: '0 0 10px rgba(125,211,252,0.35)' }} />
              <div style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(244, 63, 94, 0.14))',
                border: '2px solid rgba(248, 113, 113, 0.9)',
                color: '#ffe4e6',
                fontWeight: '900',
                letterSpacing: '0.14em',
                fontSize: '1.25rem',
                minWidth: '190px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                boxShadow: '0 0 16px rgba(248, 113, 113, 0.35)'
              }}>
                {enemyEtherFinalValue.toLocaleString()} P T
              </div>
            </div>
          )}
          {/* ?쇱そ: ?뚮젅?댁뼱 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center' }}>
            {/* ?뚮젅?댁뼱 肄ㅻ낫 - ?덈? ?꾩튂濡??ㅻⅨ履?諛곗튂 */}
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
                      left: 'calc(50% + 120px)',
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
                  transform: (etherPulse || multiplierPulse) ? 'scale(1.2)' : (etherCalcPhase === 'sum' ? 'scale(1.3)' : 'scale(1)'),
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
                  transform: (etherCalcPhase === 'multiply' || multiplierPulse) ? 'scale(1.2)' : (etherCalcPhase === 'multiply' ? 'scale(1.3)' : 'scale(1)'),
                  textShadow: etherCalcPhase === 'multiply' ? '0 0 20px #fbbf24' : 'none'
                }}>
                  <span>횞 {displayComboMultiplier.toFixed(2).split('').join(' ')}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
              <EtherBar
                key={`player-ether-${playerEtherValue}`}
                pts={playerEtherValue}
                slots={playerEtherSlots}
                previewGain={previewEtherGain}
                label="ETHER"
                pulse={playerTransferPulse}
              />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className={`character-display ${playerOverdriveFlash ? 'overdrive-burst' : ''}`} style={{ fontSize: '64px' }}>🧙</div>
                  <div>
                    <div className={playerHit ? 'hit-animation' : ''} style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold' }}>
                      체력 {player.hp}/{player.maxHp}
                      {player.block > 0 && <span className={playerBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa', marginLeft: '8px' }}>🛡️ {player.block}</span>}
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
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#7dd3fc', marginTop: '4px' }}>플레이어</div>
                    {(player.strength || 0) > 0 && (
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fbbf24', marginTop: '2px' }}>
                        힘 + {player.strength || 0}
                      </div>
                    )}
                    {playerAgility !== 0 && (
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: playerAgility > 0 ? '#34d399' : '#ef4444', marginTop: '2px' }}>
                        민첩: {playerAgility}
                      </div>
                    )}
                    {(player.insight || 0) > 0 && (
                      <div
                        style={{ fontSize: '0.9rem', fontWeight: '700', color: '#a78bfa', marginTop: '2px', position: 'relative' }}
                        onMouseEnter={() => setShowInsightTooltip(true)}
                        onMouseLeave={() => setShowInsightTooltip(false)}
                      >
                        통찰 레벨: {player.insight || 0}
                        {showInsightTooltip && (
                          <div className="insight-tooltip">
                            <div className="insight-tooltip-title">통찰 Lv.{insightReveal?.level || 0}</div>
                            <div className="insight-tooltip-desc" style={{ marginBottom: '6px' }}>
                              유효 통찰: {effectiveInsight} {enemy?.shroud ? `(장막 -${enemy.shroud})` : ''}
                            </div>
                            {phase === 'select' && insightReveal?.visible && (
                              <>
                                {insightReveal.level === 1 && (
                                  <div className="insight-tooltip-desc">
                                    예정 행동 {insightReveal.cardCount}장<br />
                                    순서: {insightReveal.actions.map((a, i) =>
                                      a.isFirst ? '첫 번째' : a.isLast ? '마지막' : `${i + 1}번째`
                                    ).join(', ')}
                                  </div>
                                )}
                                {insightReveal.level === 2 && (
                                  <div className="insight-tooltip-desc">
                                    {insightReveal.actions.map((a, i) => (
                                      <div key={i}>
                                        #{i + 1} {a.card?.name || '알 수 없음'} · 속도 {a.speed}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {insightReveal.level >= 3 && (
                                  <div className="insight-tooltip-desc">
                                    {insightReveal.actions.map((a, i) => (
                                      <div key={i} style={{ marginBottom: '4px' }}>
                                        <div>#{i + 1} {a.card?.name || '???'} 쨌 ?깍툘 {a.speed}</div>
                                        {(a.card?.damage || a.card?.block) && (
                                          <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                                            {a.card.damage ? `?뷂툘 ${a.card.damage}${a.card.hits ? ` x${a.card.hits}` : ''}` : ''}
                                            {a.card.damage && a.card.block ? ' / ' : ''}
                                            {a.card.block ? `?썳截?${a.card.block}` : ''}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                            {(!insightReveal?.visible || phase !== 'select') && (
                              <div className="insight-tooltip-desc">?좏깮 ?④퀎?먯꽌 ????꾨씪???뺣낫瑜??뺤씤?????덉뒿?덈떎.</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {player.etherOverflow > 0 && (
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#a78bfa', marginTop: '2px' }}>
                        ?뙄 踰붾엺: {player.etherOverflow} PT
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 以묒븰: ?④퀎 ?뺣낫 */}
          <div style={{ textAlign: 'center', flex: '1', paddingTop: '20px' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f8fafc', textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: '16px' }}>
              {phase === 'select' ? '?좏깮 ?④퀎' : phase === 'respond' ? '????④퀎' : '吏꾪뻾 ?④퀎'}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#7dd3fc', marginBottom: '12px' }}>
              ?띾룄 {totalSpeed}/{MAX_SPEED} 쨌 ?좏깮 {selected.length}/{MAX_SUBMIT_CARDS}
            </div>

            {/* 踰꾪듉??- ?띾룄/?좏깮 ?띿뒪???섎떒 */}
            {phase === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                <button onClick={redrawHand} disabled={!canRedraw} className="btn-enhanced flex items-center gap-2" style={{ fontSize: '1rem', padding: '8px 20px', minWidth: '200px' }}>
                  <RefreshCw size={18} /> 由щ뱶濡쒖슦 (R)
                </button>
                <button onClick={() => { startResolve(); playSound(900, 120); }} disabled={selected.length === 0} className="btn-enhanced btn-primary flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '9.6px 24px', fontWeight: '700', minWidth: '200px' }}>
                  <Play size={22} /> ?쒖텧 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
                </button>
                <button onClick={() => setWillOverdrive(v => !v)}
                  disabled={etherSlots(player.etherPts) <= 0}
                  className={`btn-enhanced ${willOverdrive ? 'btn-primary' : ''} flex items-center gap-2`}
                  style={{ fontSize: '1rem', padding: '8px 20px', minWidth: '200px' }}>
                  ??湲곗썝 {willOverdrive ? 'ON' : 'OFF'} (Space)
                </button>
              </div>
            )}
            {phase === 'respond' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button onClick={beginResolveFromRespond} className="btn-enhanced btn-success flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '9.6px 24px', fontWeight: '700', minWidth: '200px' }}>
                  <Play size={22} /> 吏꾪뻾 ?쒖옉 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
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
                    <>?몌툘 吏꾪뻾 以묒? <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span></>
                  ) : (
                    <>?띰툘 吏꾪뻾 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span></>
                  )}
                </button>
              </div>
            )}
            {phase === 'resolve' && qIndex >= queue.length && etherFinalValue !== null && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                {enemy.hp <= 0 ? (
                  <button onClick={() => finishTurn('?꾪닾 ?밸━')} className="btn-enhanced btn-success flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '12px 24px', fontWeight: '700', minWidth: '200px' }}>
                    ?럦 ?꾪닾 醫낅즺 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
                  </button>
                ) : (
                  <button onClick={() => finishTurn('?섎룞 ??醫낅즺')} className="btn-enhanced btn-primary flex items-center gap-2" style={{ fontSize: '1.25rem', padding: '12px 24px', fontWeight: '700', minWidth: '200px' }}>
                    ??툘 ??醫낅즺 <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>(E)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ?ㅻⅨ履? ??*/}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center', paddingTop: '120px' }}>
            {soulShatter && (
              <div className="soul-shatter-banner">
                <div className="soul-shatter-text">?곹샎?뚭눼!</div>
              </div>
            )}
            {/* 紐ъ뒪??肄ㅻ낫 + ?먰뀒瑜?怨꾩궛 - ?덈? ?꾩튂濡??쇱そ 諛곗튂 */}
                {enemyCombo && !((phase === 'select') && ((insightReveal?.level || 0) === 0)) && (phase === 'select' || phase === 'respond' || phase === 'resolve') && (
                  <div className="combo-display" style={{ position: 'absolute', top: '-5px', right: '90px', textAlign: 'center', minHeight: '140px' }}>
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
                      <span>{enemyCombo.name}</span>
                      {enemyCurrentDeflation && (
                        <div style={{
                          position: 'absolute',
                          right: 'calc(50% + 120px)',
                          fontSize: enemyEtherCalcPhase === 'deflation' ? '1.1rem' : '0.9rem',
                          fontWeight: 'bold',
                          color: '#fca5a5',
                          background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.25), rgba(252, 165, 165, 0.1))',
                          border: '1.5px solid rgba(252, 165, 165, 0.5)',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          letterSpacing: '0.05em',
                          boxShadow: '0 0 10px rgba(252, 165, 165, 0.3), inset 0 0 5px rgba(252, 165, 165, 0.15)',
                          transition: 'font-size 0.3s ease, transform 0.3s ease',
                          transform: enemyEtherCalcPhase === 'deflation' ? 'scale(1.2)' : 'scale(1)',
                          textShadow: enemyEtherCalcPhase === 'deflation' ? '0 0 15px rgba(252, 165, 165, 0.6)' : 'none'
                        }}>
                          -{Math.round((1 - enemyCurrentDeflation.multiplier) * 100)}%
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: enemyEtherCalcPhase === 'sum' ? '2rem' : '1.5rem',
                      color: '#fbbf24',
                      fontWeight: 'bold',
                      letterSpacing: '0.2em',
                      marginBottom: '2px',
                      transition: 'font-size 0.3s ease, transform 0.3s ease',
                      transform: enemyEtherCalcPhase === 'sum' ? 'scale(1.3)' : 'scale(1)',
                      textShadow: enemyEtherCalcPhase === 'sum' ? '0 0 20px #fbbf24' : 'none',
                      visibility: phase === 'resolve' ? 'visible' : 'hidden',
                      height: '1.8rem'
                    }}>
                      + {enemyTurnEtherAccumulated.toString().split('').join(' ')} P T
                    </div>
                    <div style={{
                      fontSize: enemyEtherCalcPhase === 'multiply' ? '1.6rem' : '1.32rem',
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
                      transform: enemyEtherCalcPhase === 'multiply' ? 'scale(1.3)' : 'scale(1)',
                      textShadow: enemyEtherCalcPhase === 'multiply' ? '0 0 20px #fbbf24' : 'none'
                    }}>
                      <span>횞 {((enemyCombo && COMBO_MULTIPLIERS[enemyCombo.name]) || 1).toFixed(2).split('').join(' ')}</span>
                    </div>
                  </div>
                )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
              <div style={{ textAlign: 'right', position: 'relative', paddingRight: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {enemyHint && (
                    <div style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '4px' }}>힌트 {enemyHint}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      {(phase === 'select' || phase === 'respond') && previewDamage.value > 0 && (
                        <div className={`predicted-damage-inline ${previewDamage.lethal ? 'lethal' : ''} ${previewDamage.overkill ? 'overkill' : ''}`}>
                          <span className="predicted-damage-inline-value">피해 -{previewDamage.value}</span>
                          {previewDamage.lethal && (
                            <span className={`predicted-damage-inline-icon ${previewDamage.overkill ? 'overkill-icon' : ''}`} aria-hidden="true">
                              {previewDamage.overkill ? '과잉' : '!'}
                            </span>
                          )}
                        </div>
                      )}
                      <div className={enemyHit ? 'hit-animation' : ''} style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'right', transition: 'opacity 0.4s ease, transform 0.4s ease', opacity: soulShatter ? 0 : 1, transform: soulShatter ? 'scale(0.9)' : 'scale(1)' }}>
                        {enemy.block > 0 && <span className={enemyBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa', marginRight: '8px' }}>🛡️ {enemy.block}</span>}
                        체력 {enemy.hp}/{enemy.maxHp}
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
                      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fca5a5', marginTop: '4px' }}>
                        {enemy.name}
                      </div>
                    </div>
                    <div className={`character-display ${soulShatter ? 'soul-shatter-target' : ''} ${enemyOverdriveFlash ? 'overdrive-burst' : ''}`} style={{ fontSize: '64px' }}>👾</div>
                  </div>
                </div>
              </div>
              <div
                className={`soul-orb ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`}
                title={`${(enemyEtherValue || 0).toLocaleString()} / ${((enemy?.etherCapacity ?? enemyEtherValue) || 0).toLocaleString()}`}
              >
                <div className={`soul-orb-shell ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`} style={{ transform: `scale(${enemySoulScale})` }} />
                <div className="soul-orb-content">
                  <div className="soul-orb-value">{formatCompactValue(enemyEtherValue)}</div>
                  <div className="soul-orb-label">SOUL</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ?낅┰ ?쒕룞???쒖떆 (醫뚯륫 ?섎떒 怨좎젙) */}
      {(phase === 'select' || phase === 'respond' || phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="energy-display-fixed">
          <div className="energy-orb-compact">
            {remainingEnergy} / {player.maxEnergy}
          </div>
        </div>
      )}

      {/* 媛꾩냼???뺣젹 踰꾪듉 (?곗륫 ?섎떒 怨좎젙) */}
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
            {isSimplified ? '✔️' : '✖️'} 간소화 보기 (Q)
          </button>
          <button onClick={cycleSortType} className="btn-enhanced flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
            손패 정렬 ({sortType === 'speed' ? '속도' : sortType === 'energy' ? '행동력' : sortType === 'value' ? '가치' : '희귀도'}) (F)
          </button>
        </div>
      )}
      {player && player.hp <= 0 && (
        <div className="submit-button-fixed">
          <button onClick={() => window.location.reload()} className="btn-enhanced flex items-center gap-2">
            게임 재시작
          </button>
        </div>
      )}

      {/* ?섎떒 怨좎젙 ?먰뙣 ?곸뿭 */}
      {(phase === 'select' || phase === 'respond' || phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="hand-area">

          <div className="hand-flags">
            {player && player.hp <= 0 && (
              <div className="hand-flag defeat">?? ?⑤같...</div>
            )}
          </div>

          {phase === 'select' && (() => {
            // ?꾩옱 ?좏깮??移대뱶?ㅼ쓽 議고빀 媛먯?
            const currentCombo = detectPokerCombo(selected);
            const comboCardCosts = new Set();
            if (currentCombo?.bonusKeys) {
              currentCombo.bonusKeys.forEach(cost => comboCardCosts.add(cost));
            }
            // ?뚮윭?щ뒗 紐⑤뱺 移대뱶媛 議고빀 ???
            const isFlush = currentCombo?.name === '플러시';

            return (
            <div className="hand-cards">
              {getSortedHand().map((c, idx) => {
                const Icon = c.icon;
                const usageCount = player.comboUsageCount?.[c.id] || 0;
                const selIndex = selected.findIndex(s => s.id === c.id);
                const sel = selIndex !== -1;
                // 移대뱶媛 議고빀???ы븿?섎뒗吏 ?뺤씤
                const isInCombo = sel && (isFlush || comboCardCosts.has(c.actionCost));
                const enhancedCard = applyTraitModifiers(c, { usageCount, isInCombo });
                const disabled = handDisabled(c) && !sel;
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
                const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';
                // ?묐룞 ?뱀꽦???덇퀬 議고빀???ы븿??寃쎌슦
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
                            공격 {enhancedCard.damage + (player.strength || 0)}{enhancedCard.hits ? `x${enhancedCard.hits}` : ''}
                          </div>
                        )}
                        {enhancedCard.block != null && enhancedCard.block > 0 && (
                          <div className="card-stat-item defense">
                            방어 {enhancedCard.block + (player.strength || 0)}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          속도 {enhancedCard.speedCost}
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
                            공격 {c.damage + (player.strength || 0)}{c.hits ? `x${c.hits}` : ''}
                          </div>
                        )}
                        {c.block != null && c.block > 0 && (
                          <div className="card-stat-item defense">
                            방어 {c.block + (player.strength || 0)}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          속도 {c.speedCost}
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
                          ??
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
                          ??
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
                const isDisabled = disabledCardIndices.includes(globalIndex); // 鍮꾪솢?깊솕??移대뱶 (紐ъ뒪???щ쭩 ??
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(a.card.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(a.card.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';

                // ?꾩쟾???④꺼吏?移대뱶???뚮뜑留곹븯吏 ?딆쓬
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
                      opacity: isDisabled ? 0.4 : 1, // 鍮꾪솢?깊솕??移대뱶???щ챸?섍쾶
                      filter: isDisabled ? 'grayscale(0.8) brightness(0.6)' : 'none' // 鍮쏅컮? ?④낵
                    }}
                  >
                    <div className={`game-card-large resolve-phase-card ${a.card.type === 'attack' ? 'attack' : 'defense'} ${isUsed ? 'card-used' : ''} ${isDisappearing ? 'card-disappearing' : ''}`}>
                      <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{a.card.actionCost}</div>
                      <div className="card-stats-sidebar">
                        {a.card.damage != null && a.card.damage > 0 && (
                          <div className="card-stat-item attack">
                            공격 {a.card.damage + (player.strength || 0)}{a.card.hits ? `x${a.card.hits}` : ''}
                          </div>
                        )}
                        {a.card.block != null && a.card.block > 0 && (
                          <div className="card-stat-item defense">
                            방어 {a.card.block + (player.strength || 0)}
                          </div>
                        )}
                        {a.card.counter !== undefined && (
                          <div className="card-stat-item counter">
                            반격 {a.card.counter}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          속도 {a.card.speedCost}
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

      {/* ?뱀꽦 ?댄똻 */}
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
            ?뱀꽦 ?뺣낫
          </div>
          {(() => {
            const baseCard = CARDS.find(c => c.id === hoveredCard.card.id);
            const enhancedCard = applyTraitModifiers(baseCard || hoveredCard.card, { usageCount: 0, isInCombo: false });
            const parts = [];
            if (baseCard?.damage && enhancedCard.damage && enhancedCard.damage !== baseCard.damage) {
              const mult = (enhancedCard.damage / baseCard.damage).toFixed(2);
              parts.push(`怨듦꺽?? ${enhancedCard.damage} = ${baseCard.damage} 횞 ${mult}`);
            }
            if (baseCard?.block && enhancedCard.block && enhancedCard.block !== baseCard.block) {
              const mult = (enhancedCard.block / baseCard.block).toFixed(2);
              parts.push(`諛⑹뼱?? ${enhancedCard.block} = ${baseCard.block} 횞 ${mult}`);
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
      {/* 적 통찰 툴팁 (레벨 3 이상) */}
      {hoveredEnemyAction && (phase === 'select' || phase === 'respond' || phase === 'resolve') && ((phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0)) >= 3) && (
        <div
          className="insight-tooltip"
          style={{
            position: 'fixed',
            left: `${hoveredEnemyAction.pageX}px`,
            top: `${hoveredEnemyAction.pageY + 24}px`,
            transform: 'translate(-50%, 0)',
            pointerEvents: 'none',
            zIndex: 3000,
          }}
        >
          <div className="insight-tooltip-title">
            #{hoveredEnemyAction.idx + 1} {hoveredEnemyAction.action?.name || '알 수 없음'}
          </div>
          <div className="insight-tooltip-desc" style={{ marginBottom: '4px' }}>
            속도 {hoveredEnemyAction.action?.speedCost ?? hoveredEnemyAction.action?.speed ?? '-'}
          </div>
          {(hoveredEnemyAction.action?.damage || hoveredEnemyAction.action?.block) && (
            <div className="insight-tooltip-desc" style={{ marginBottom: '4px' }}>
              {hoveredEnemyAction.action.damage ? `피해 ${hoveredEnemyAction.action.damage}${hoveredEnemyAction.action.hits ? ` x${hoveredEnemyAction.action.hits}` : ''}` : ''}
              {hoveredEnemyAction.action.damage && hoveredEnemyAction.action.block ? ' / ' : ''}
              {hoveredEnemyAction.action.block ? `방어 ${hoveredEnemyAction.action.block}` : ''}
            </div>
          )}
          {hoveredEnemyAction.action?.traits && hoveredEnemyAction.action.traits.length > 0 && (
            <div className="insight-tooltip-desc" style={{ color: '#a78bfa' }}>
              특성: {hoveredEnemyAction.action.traits.join(', ')}
            </div>
          )}
          {!hoveredEnemyAction.action?.damage && !hoveredEnemyAction.action?.block && !hoveredEnemyAction.action?.traits?.length && (
            <div className="insight-tooltip-desc">상세 정보가 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

export const LegacyBattleApp = ({ initialPlayer, initialEnemy, playerEther, liveInsight, onBattleResult = () => { } }) => (
  <Game
    initialPlayer={initialPlayer}
    initialEnemy={initialEnemy}
    playerEther={playerEther}
    liveInsight={liveInsight}
    onBattleResult={onBattleResult}
  />
);

export default LegacyBattleApp;

