import { useState, useEffect, useMemo, useRef, useCallback, useReducer } from "react";
import "./legacy-battle.css";
import { playHitSound, playBlockSound, playCardSubmitSound, playProceedSound } from "../../lib/soundUtils";
import { useBattleState } from "./hooks/useBattleState";
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
import { choice, hasTrait, applyTraitModifiers, applyStrengthToCard, applyStrengthToHand, getCardRarity } from "./utils/battleUtils";
import { detectPokerCombo, applyPokerBonus } from "./utils/comboDetection";
import { COMBO_MULTIPLIERS, BASE_ETHER_PER_CARD, CARD_ETHER_BY_RARITY, applyEtherDeflation, getCardEtherGain, calcCardsEther, calculateComboEtherGain } from "./utils/etherCalculations";
import { sortCombinedOrderStablePF, addEther } from "./utils/combatUtils";

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
import { PlayerHpBar } from "./ui/PlayerHpBar";
import { PlayerEtherBox } from "./ui/PlayerEtherBox";
import { EnemyHpBar } from "./ui/EnemyHpBar";
import { EnemyEtherBox } from "./ui/EnemyEtherBox";
import { CentralPhaseDisplay } from "./ui/CentralPhaseDisplay";
import { EtherComparisonBar } from "./ui/EtherComparisonBar";
import { BattleLog } from "./ui/BattleLog";
import { RelicDisplay } from "./ui/RelicDisplay";
import { TimelineDisplay } from "./ui/TimelineDisplay";
import { HandArea } from "./ui/HandArea";
import { BattleTooltips } from "./ui/BattleTooltips";
import { ExpectedDamagePreview } from "./ui/ExpectedDamagePreview";
import { EtherBar } from "./ui/EtherBar";
import { Sword, Shield, Heart, Zap, Flame, Clock, Skull, X, ChevronUp, ChevronDown, Play, StepForward, RefreshCw, ICON_MAP } from "./ui/BattleIcons";

const STUN_RANGE = 5; // 기절 효과 범위(타임라인 기준)

/**
 * 유효 통찰 계산: 플레이어 통찰 - 적의 장막
 */
const calculateEffectiveInsight = (playerInsight, enemyShroud) => {
  return Math.max(0, (playerInsight || 0) - (enemyShroud || 0));
};

/**
 * 통찰 레벨별 적 정보 공개
 * @param {number} effectiveInsight - 유효 통찰 (player.insight - enemy.shroud)
 * @param {Array} enemyActions - 적의 행동 계획
 * @returns {object} 공개할 정보 레벨
 */
const getInsightRevealLevel = (effectiveInsight, enemyActions) => {
  if (!enemyActions || enemyActions.length === 0) {
    return { level: 0, visible: false };
  }

  if (effectiveInsight === 0) {
    // 레벨 0: 정보 없음
    return { level: 0, visible: false };
  }

  if (effectiveInsight === 1) {
    // 레벨 1: 카드 개수와 대략적 순서
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
    // 레벨 2: 정확한 카드 이름과 속도
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

  // 레벨 3+: 모든 정보 (특수 패턴, 면역 등)
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

// 통찰 레벨에 따른 짧은 효과음
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
    // 사운드 실패 시 무시
  }
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
// 에테르 관련 유틸리티 (로컬 래퍼)
// =====================
const etherSlots = (pts) => calculateEtherSlots(pts || 0); // 인플레이션 적용

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

function generateEnemyActions(enemy, mode, enemyEtherSlots = 0, maxCards = 3, minCards = 1) {
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
  console.log(`[generateEnemyActions] Selected single card: ${single ? single.name : 'none'}`);
  return single ? [single] : [];
}

function shouldEnemyOverdriveWithTurn(mode, actions, etherPts, turnNumber = 1) {
  const slots = etherSlots(etherPts);
  if (slots <= 0) return false;
  if (turnNumber <= 1) return false;
  // 몬스터 폭주는 패턴 확정 전까지 금지
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

// =====================
// 캐릭터 빌드 기반 손패 생성
// =====================
function drawCharacterBuildHand(characterBuild, nextTurnEffects = {}, previousHand = [], cardDrawBonus = 0, escapeBan = new Set()) {
  if (!characterBuild) return CARDS.slice(0, 10); // 8장 → 10장

  const { mainSpecials = [], subSpecials = [] } = characterBuild;
  const { guaranteedCards = [], mainSpecialOnly = false, subSpecialBoost = 0 } = nextTurnEffects;
  const applyBonus = (prob) => Math.min(1, Math.max(0, prob + (cardDrawBonus || 0)));
  const banSet = escapeBan instanceof Set ? escapeBan : new Set();

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
    .filter(card => card && !(hasTrait(card, 'escape') && banSet.has(card.id)));

  // 주특기 카드는 100% 등장 (탈주 제외)
  const mainCards = mainSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // 조연(supporting): 보조특기 전용이므로 주특기에서는 등장하지 않음
      if (hasTrait(card, 'supporting')) return false;
      // 탈주 (escape): 이전에 사용했으면 등장하지 않음
      if (hasTrait(card, 'escape') && banSet.has(card.id)) {
        return false;
      }
      // 개근 (attendance): 등장확률 25% 증가 (주특기 125%)
      let prob = 1;
      if (hasTrait(card, 'attendance')) {
        prob = 1.25; // 확정 + 25% 추가 보너스
      }
      // 도피꾼 (deserter): 등장확률 25% 감소 (주특기 75%)
      else if (hasTrait(card, 'deserter')) {
        prob = 0.75;
      }
      return Math.random() < applyBonus(prob);
    });

  // 보조특기 카드는 각각 50% 확률로 등장 (장군 특성으로 증가 가능)
  const baseSubProb = 0.5 + subSpecialBoost;
  const subCards = subSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => {
      if (!card) return false;
      // 탈주 (escape): 이전에 사용했으면 등장하지 않음
      if (hasTrait(card, 'escape') && banSet.has(card.id)) {
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
      return Math.random() < applyBonus(prob);
    });

  // 중복 제거 후 반환
  const allCards = [...guaranteed, ...mainCards, ...subCards]
    .filter(card => !(hasTrait(card, 'escape') && banSet.has(card.id)));
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
  const devDulledLevel = useGameStore((state) => state.devDulledLevel ?? null);
  const mergeRelicOrder = useCallback((relicList = [], saved = []) => {
    const savedSet = new Set(saved);
    const merged = [];
    // 1) 저장된 순서 중 현재 보유 중인 것만 유지
    saved.forEach(id => { if (relicList.includes(id)) merged.push(id); });
    // 2) 새로 생긴 유물은 현재 보유 순서대로 뒤에 추가
    relicList.forEach(id => { if (!savedSet.has(id)) merged.push(id); });
    return merged;
  }, []);

  // Keep orderedRelics with useState for localStorage logic
  const [orderedRelics, setOrderedRelics] = useState(() => {
    try {
      const saved = localStorage.getItem('relicOrder');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return mergeRelicOrder(relics, ids);
      }
    } catch { }
    return relics || [];
  });
  useEffect(() => {
    try {
      localStorage.setItem('relicOrder', JSON.stringify(orderedRelics));
    } catch { }
  }, [orderedRelics]);
  const orderedRelicList = orderedRelics && orderedRelics.length ? orderedRelics : relics;

  const safeInitialPlayer = initialPlayer || {};
  const safeInitialEnemy = initialEnemy || {};
  const enemyCount = safeInitialEnemy.enemyCount ?? 1; // Extract enemy count for multi-enemy battles
  const passiveRelicStats = calculatePassiveEffects(orderedRelicList);
  // 전투 시작 에너지는 payload에서 계산된 값을 신뢰하고, 없을 때만 기본값 사용
  const baseEnergy = safeInitialPlayer.energy ?? BASE_PLAYER_ENERGY;
  const baseMaxEnergy = safeInitialPlayer.maxEnergy ?? baseEnergy;
  // 민첩도 payload에 값이 있으면 우선 사용하고, 없으면 스토어 값을 사용
  const effectiveAgility = safeInitialPlayer.agility ?? playerAgility ?? 0;
  const effectiveCardDrawBonus = passiveRelicStats.cardDrawBonus || 0;
  const startingEther = typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : playerEther;
  const startingBlock = safeInitialPlayer.block ?? 0; // 유물 효과로 인한 시작 방어력
  const startingStrength = safeInitialPlayer.strength ?? playerStrength ?? 0; // 전투 시작 힘 (유물 효과 포함)
  const startingInsight = safeInitialPlayer.insight ?? 0; // 통찰

  const initialPlayerState = {
    hp: safeInitialPlayer.hp ?? 30,
    maxHp: safeInitialPlayer.maxHp ?? safeInitialPlayer.hp ?? 30,
    energy: baseEnergy,
    maxEnergy: baseMaxEnergy,
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

  // Initialize battle state with useReducer
  const { battle, actions } = useBattleState({
    player: initialPlayerState,
    enemyIndex: 0,
    enemy: safeInitialEnemy?.name ? ({
      ...safeInitialEnemy,
      hp: safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? 30,
      maxHp: safeInitialEnemy.maxHp ?? safeInitialEnemy.hp ?? 30,
      vulnMult: 1,
      vulnTurns: 0,
      block: 0,
      counter: 0,
      etherPts: safeInitialEnemy.etherPts ?? safeInitialEnemy.etherCapacity ?? 300,
      etherCapacity: safeInitialEnemy.etherCapacity ?? 300,
      etherOverdriveActive: false,
      strength: 0,
      shroud: safeInitialEnemy.shroud ?? 0,
      maxSpeed: safeInitialEnemy.maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED
    }) : null,
    phase: 'select',
    hand: [],
    selected: [],
    canRedraw: true,
    sortType: (() => {
      try {
        return localStorage.getItem('battleSortType') || 'speed';
      } catch {
        return 'speed';
      }
    })(),
    isSimplified: (() => {
      try {
        const saved = localStorage.getItem('battleIsSimplified');
        return saved === 'true';
      } catch {
        return false;
      }
    })(),
    enemyPlan: { actions: [], mode: null },
    fixedOrder: null,
    postCombatOptions: null,
    log: ["게임 시작!"],
    actionEvents: {},
    queue: [],
    qIndex: 0,
    nextTurnEffects: {
      guaranteedCards: [],
      bonusEnergy: 0,
      energyPenalty: 0,
      etherBlocked: false,
      mainSpecialOnly: false,
      subSpecialBoost: 0,
    },
    insightBadge: {
      level: safeInitialPlayer.insight || 0,
      dir: 'up',
      show: false,
      key: 0,
    },
  });

  // Destructure from battle state (Phase 3에서 battle.* 직접 참조로 마이그레이션 예정)
  const player = battle.player;
  const enemy = battle.enemy;
  const enemyPlan = battle.enemyPlan;
  const enemyIndex = battle.enemyIndex;

  // 카드 관리
  const hand = battle.hand;
  const selected = battle.selected;
  const canRedraw = battle.canRedraw;
  const queue = battle.queue;
  const qIndex = battle.qIndex;
  const log = battle.log;
  const vanishedCards = battle.vanishedCards;
  const usedCardIndices = battle.usedCardIndices;
  const disappearingCards = battle.disappearingCards;
  const hiddenCards = battle.hiddenCards;

  // UI 상태
  const isSimplified = battle.isSimplified;
  const hoveredCard = battle.hoveredCard;
  const tooltipVisible = battle.tooltipVisible;
  const previewDamage = battle.previewDamage;
  const showCharacterSheet = battle.showCharacterSheet;
  const showInsightTooltip = battle.showInsightTooltip;
  const hoveredEnemyAction = battle.hoveredEnemyAction;
  const showPtsTooltip = battle.showPtsTooltip;
  const showBarTooltip = battle.showBarTooltip;
  const timelineProgress = battle.timelineProgress;
  const timelineIndicatorVisible = battle.timelineIndicatorVisible;

  // 애니메이션 상태
  const playerHit = battle.playerHit;
  const enemyHit = battle.enemyHit;
  const playerBlockAnim = battle.playerBlockAnim;
  const enemyBlockAnim = battle.enemyBlockAnim;
  const willOverdrive = battle.willOverdrive;
  const etherPulse = battle.etherPulse;
  const playerOverdriveFlash = battle.playerOverdriveFlash;
  const enemyOverdriveFlash = battle.enemyOverdriveFlash;
  const soulShatter = battle.soulShatter;
  const playerTransferPulse = battle.playerTransferPulse;
  const enemyTransferPulse = battle.enemyTransferPulse;

  // 유물 UI
  const activeRelicSet = battle.activeRelicSet;
  const relicActivated = battle.relicActivated;
  const multiplierPulse = battle.multiplierPulse;

  // 통찰 시스템
  const insightBadge = battle.insightBadge;
  const insightAnimLevel = battle.insightAnimLevel;
  const insightAnimPulseKey = battle.insightAnimPulseKey;

  // 진행 상태
  const resolveStartPlayer = battle.resolveStartPlayer;
  const resolveStartEnemy = battle.resolveStartEnemy;
  const respondSnapshot = battle.respondSnapshot;
  const rewindUsed = battle.rewindUsed;
  const autoProgress = battle.autoProgress;
  const resolvedPlayerCards = battle.resolvedPlayerCards;
  const executingCardIndex = battle.executingCardIndex;

  // 에테르 시스템
  const turnEtherAccumulated = battle.turnEtherAccumulated;
  const enemyTurnEtherAccumulated = battle.enemyTurnEtherAccumulated;
  const etherAnimationPts = battle.etherAnimationPts;
  const netEtherDelta = battle.netEtherDelta;
  const etherFinalValue = battle.etherFinalValue;
  const enemyEtherFinalValue = battle.enemyEtherFinalValue;
  const etherCalcPhase = battle.etherCalcPhase;
  const enemyEtherCalcPhase = battle.enemyEtherCalcPhase;
  const currentDeflation = battle.currentDeflation;
  const enemyCurrentDeflation = battle.enemyCurrentDeflation;

  // 카드 상태
  const cardUsageCount = battle.cardUsageCount;
  const disabledCardIndices = battle.disabledCardIndices;

  // 기타
  const turnNumber = battle.turnNumber;
  const postCombatOptions = battle.postCombatOptions;
  const nextTurnEffects = battle.nextTurnEffects;
  const fixedOrder = battle.fixedOrder;
  const sortType = battle.sortType;
  const actionEvents = battle.actionEvents;
  // orderedRelics는 아직 useState로 관리 (localStorage 로직 때문에)
  const hoveredRelic = battle.hoveredRelic;

  // 새 유물 추가/제거 시 기존 순서를 유지하면서 병합
  // 진행 단계에서는 동기화/변경을 막아 일관성 유지
  useEffect(() => {
    if (battle.phase === 'resolve') return;
    actions.setOrderedRelics(mergeRelicOrder(relics, orderedRelicList));
  }, [relics, mergeRelicOrder, battle.phase, orderedRelicList]);

  const addLog = useCallback((m) => {
    actions.updateLog([...battle.log, m].slice(-200));
  }, [actions, battle.log]);
  const formatSpeedText = useCallback((baseSpeed) => {
    const finalSpeed = applyAgility(baseSpeed, effectiveAgility);
    const diff = finalSpeed - baseSpeed;
    if (diff === 0) return `${finalSpeed}`;
    const sign = diff < 0 ? '-' : '+';
    const abs = Math.abs(diff);
    return `${finalSpeed} (${baseSpeed} ${sign} ${abs})`;
  }, [effectiveAgility]);
  const cardUpgrades = useGameStore((state) => state.cardUpgrades || {}); // 카드 업그레이드(희귀도)

  // Keep refs as they are
  const lethalSoundRef = useRef(false);
  const overkillSoundRef = useRef(false);
  const prevInsightRef = useRef(safeInitialPlayer.insight || 0);
  const insightBadgeTimerRef = useRef(null);
  const insightAnimTimerRef = useRef(null);
  const prevRevealLevelRef = useRef(0);
  const rarityBadges = {
    rare: { color: '#60a5fa', label: '희귀' },
    special: { color: '#34d399', label: '특별' },
    legendary: { color: '#fbbf24', label: '전설' },
  };
  const getCardDisplayRarity = (card) => cardUpgrades[card.id] || card.rarity || 'common';
  const renderRarityBadge = (card) => {
    const badge = rarityBadges[getCardDisplayRarity(card)];
    if (!badge) return null;
    return (
      <span
        title={badge.label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          borderRadius: '12px',
          background: badge.color,
          color: '#0f172a',
          fontWeight: 800,
          boxShadow: `0 0 10px ${badge.color}`,
          marginLeft: '6px'
        }}
      >
        {badge.label}
      </span>
    );
  };
  const renderNameWithBadge = (card, defaultColor) => {
    const badge = rarityBadges[getCardDisplayRarity(card)];
    if (!badge) {
      return <span style={{ color: defaultColor }}>{card.name}</span>;
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#0f172a', background: badge.color, padding: '2px 10px', borderRadius: '12px', fontWeight: 800, boxShadow: `0 0 10px ${badge.color}` }}>
          {card.name}
        </span>
      </span>
    );
  };
  // 탈주 카드는 사용된 다음 턴에만 등장 금지
  const escapeBanRef = useRef(new Set());
  const escapeUsedThisTurnRef = useRef(new Set());
  const hoveredCardRef = useRef(null);
  const tooltipTimerRef = useRef(null);
  const logEndRef = useRef(null);
  const devilDiceTriggeredRef = useRef(false); // 턴 내 악마의 주사위 발동 여부
  const referenceBookTriggeredRef = useRef(false); // 턴 내 참고서 발동 여부
  const initialEtherRef = useRef(typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : (playerEther ?? 0));
  const resultSentRef = useRef(false);
  const turnStartProcessedRef = useRef(false); // 턴 시작 효과 중복 실행 방지
  const dragRelicIndexRef = useRef(null); // 유물 드래그 인덱스
  const battleRef = useRef(battle); // battle 상태를 ref로 유지 (setTimeout closure 문제 해결)

  // battle 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  const computeComboMultiplier = useCallback((baseMult, cardsCount, includeFiveCard = true, includeRefBook = true, relicOrderOverride = null) => {
    let mult = baseMult;
    const order = relicOrderOverride || orderedRelicList;
    const passive = calculatePassiveEffects(order);

    // 1) 카드당 적용되는 배율(에테르 결정 등) 우선, 위치 순서대로
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects) return;
      if (relic.effects.comboMultiplierPerCard || relic.effects.etherMultiplier) {
        mult = applyRelicComboMultiplier([rid], mult, cardsCount);
      }
    });

    // 2) 참고서: 조건 충족 시 위치 순서로 단 한 번
    if (includeRefBook && passive.etherCardMultiplier && cardsCount > 0) {
      order.forEach(rid => {
        const relic = RELICS[rid];
        if (!relic?.effects?.etherCardMultiplier) return;
        mult *= (1 + cardsCount * 0.1);
      });
    }

    // 3) 악마의 주사위: 조건 충족 시 위치 순서로 곱 (항상 마지막 우선)
    if (includeFiveCard && passive.etherFiveCardBonus > 0 && cardsCount >= 5) {
      order.forEach(rid => {
        const relic = RELICS[rid];
        if (!relic?.effects?.etherFiveCardBonus) return;
        mult *= passive.etherFiveCardBonus;
      });
    }

    return mult;
  }, [orderedRelicList]);

  // 배율 계산 과정을 설명용으로 반환
  const explainComboMultiplier = useCallback((baseMult, cardsCount, includeFiveCard = true, includeRefBook = true, relicOrderOverride = null) => {
    let mult = baseMult;
    const order = relicOrderOverride || orderedRelicList;
    const steps = [`기본: ${mult.toFixed(2)}`];
    const passive = calculatePassiveEffects(order);
    // 1) 카드당 배율 우선
    order.forEach(rid => {
      const relic = RELICS[rid];
      if (!relic?.effects) return;
      if (relic.effects.comboMultiplierPerCard || relic.effects.etherMultiplier) {
        const prev = mult;
        mult = applyRelicComboMultiplier([rid], mult, cardsCount);
        steps.push(`${relic.name}: ${prev.toFixed(2)} → ${mult.toFixed(2)}`);
      }
    });
    // 2) 참고서
    if (includeRefBook && passive.etherCardMultiplier && cardsCount > 0) {
      order.forEach(rid => {
        const relic = RELICS[rid];
        if (!relic?.effects?.etherCardMultiplier) return;
        const prev = mult;
        mult *= (1 + cardsCount * 0.1);
        steps.push(`참고서: ${prev.toFixed(2)} → ${mult.toFixed(2)} (카드 ${cardsCount}장)`);
      });
    }
    // 3) 악마의 주사위
    if (includeFiveCard && passive.etherFiveCardBonus > 0 && cardsCount >= 5) {
      order.forEach(rid => {
        const relic = RELICS[rid];
        if (!relic?.effects?.etherFiveCardBonus) return;
        const prev = mult;
        mult *= passive.etherFiveCardBonus;
        steps.push(`악마의 주사위: ${prev.toFixed(2)} → ${mult.toFixed(2)}`);
      });
    }
    return { multiplier: mult, steps };
  }, [orderedRelicList]);
  const flashRelic = (relicId, tone = 800, duration = 500) => {
    const nextSet = new Set(activeRelicSet);
    nextSet.add(relicId);
    actions.setActiveRelicSet(nextSet);
    actions.setRelicActivated(relicId);
    const relic = RELICS[relicId];
    if (relic?.effects && (relic.effects.comboMultiplierPerCard || relic.effects.etherCardMultiplier || relic.effects.etherMultiplier || relic.effects.etherFiveCardBonus)) {
      actions.setMultiplierPulse(true);
      setTimeout(() => actions.setMultiplierPulse(false), Math.min(400, duration));
    }
    playSound(tone, duration * 0.6);
    setTimeout(() => {
      const nextSet = new Set(activeRelicSet);
      nextSet.delete(relicId);
      actions.setActiveRelicSet(nextSet);
      actions.setRelicActivated(relicActivated === relicId ? null : relicActivated);
    }, duration);
  };
  const handleRelicDragStart = (idx, relicId) => (e) => {
    dragRelicIndexRef.current = idx;
    actions.setRelicActivated(relicId); // 배지 표시
    e.dataTransfer.effectAllowed = 'move';
    try {
      const img = new Image();
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch { }
  };
  const handleRelicDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleRelicDrop = (idx) => (e) => {
    e.preventDefault();
    const from = dragRelicIndexRef.current;
    dragRelicIndexRef.current = null;
    actions.setRelicActivated(null);
    if (from === null || from === idx) return;
    const arr = Array.from(orderedRelicList);
    const [item] = arr.splice(from, 1);
    arr.splice(idx, 0, item);
    actions.setOrderedRelics(arr);
  };

  // 통찰 시스템: 유효 통찰 및 공개 정보 계산
  const effectiveInsight = useMemo(() => {
    return calculateEffectiveInsight(player.insight, enemy?.shroud);
  }, [player.insight, enemy?.shroud]);

  // 우둔 레벨: 장막이 통찰보다 높을 때 (shroud - insight)
  const dulledLevel = useMemo(() => {
    const shroud = enemy?.shroud || 0;
    const insight = player.insight || 0;
    const base = Math.max(0, shroud - insight);
    if (devDulledLevel !== null && devDulledLevel !== undefined) {
      return Math.max(0, Math.min(3, devDulledLevel));
    }
    return base;
  }, [player.insight, enemy?.shroud, devDulledLevel]);

  const insightReveal = useMemo(() => {
    if (battle.phase !== 'select') return { level: 0, visible: false };
    return getInsightRevealLevel(effectiveInsight, enemyPlan.actions);
  }, [effectiveInsight, enemyPlan.actions, battle.phase]);

  // 통찰 수치 변화 시 배지/연출 트리거
  useEffect(() => {
    const prev = prevInsightRef.current || 0;
    const curr = player.insight || 0;
    if (curr === prev) return;
    const dir = curr > prev ? 'up' : 'down';
    prevInsightRef.current = curr;
    if (insightBadgeTimerRef.current) clearTimeout(insightBadgeTimerRef.current);
    actions.setInsightBadge({
      level: curr,
      dir,
      show: true,
      key: Date.now(),
    });
    playInsightSound(curr > 0 ? Math.min(curr, 3) : 1);
    insightBadgeTimerRef.current = setTimeout(() => {
      actions.setInsightBadge((b) => ({ ...b, show: false }));
    }, 1400);
  }, [player.insight]);

  // 통찰 레벨별 타임라인 연출 트리거 (선택 단계에서만)
  useEffect(() => {
    if (battle.phase !== 'select' && battle.phase !== 'respond' && battle.phase !== 'resolve') {
      actions.setInsightAnimLevel(0);
      actions.setHoveredEnemyAction(null);
      return;
    }
    // select 단계는 insightReveal.level, respond 단계는 effectiveInsight 기준
    const lvl = battle.phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0);
    const prev = prevRevealLevelRef.current || 0;
    if (lvl === prev) return;
    prevRevealLevelRef.current = lvl;
    if (insightAnimTimerRef.current) clearTimeout(insightAnimTimerRef.current);
    if (lvl > 0) {
      actions.setInsightAnimLevel(lvl);
      actions.setInsightAnimPulseKey((k) => k + 1);
      playInsightSound(Math.min(lvl, 3));
      insightAnimTimerRef.current = setTimeout(() => actions.setInsightAnimLevel(0), 1200);
    } else {
      actions.setInsightAnimLevel(0);
    }
  }, [insightReveal?.level, battle.phase]);

  const notifyBattleResult = useCallback((resultType) => {
    if (!resultType || resultSentRef.current) return;
    const finalEther = player.etherPts;
    const delta = finalEther - (initialEtherRef.current ?? 0);
    onBattleResult?.({
      result: resultType,
      playerEther: finalEther,
      deltaAether: delta,
      playerHp: player.hp, // 실제 전투 종료 시점의 체력 전달
      playerMaxHp: player.maxHp
    });
    resultSentRef.current = true;
  }, [player.etherPts, player.hp, player.maxHp, onBattleResult]);

  const closeCharacterSheet = useCallback(() => {
    actions.setShowCharacterSheet(false);
  }, []);

  useEffect(() => {
    hoveredCardRef.current = hoveredCard;
  }, [hoveredCard]);

  const showCardTraitTooltip = useCallback((card, cardElement) => {
    if (!card?.traits || card.traits.length === 0 || !cardElement) return;
    const updatePos = () => {
      const rect = cardElement.getBoundingClientRect();
      actions.setHoveredCard({ card, x: rect.right + 16, y: rect.top });
    };
    updatePos();
    actions.setTooltipVisible(false);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      if (hoveredCardRef.current?.card?.id !== card.id) return;
      updatePos(); // 위치 재측정 후 표시
      requestAnimationFrame(() => {
        requestAnimationFrame(() => actions.setTooltipVisible(true));
      });
      actions.setTooltipVisible(true);
    }, 300);
  }, []);

  const hideCardTraitTooltip = useCallback(() => {
    actions.setHoveredCard(null);
    actions.setTooltipVisible(false);
    actions.setTooltipVisible(false);
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
  }, [battle.log]);

  useEffect(() => {
    const nextEther = typeof safeInitialPlayer?.etherPts === 'number'
      ? safeInitialPlayer.etherPts
      : (playerEther ?? player.etherPts);
    initialEtherRef.current = nextEther;
    resultSentRef.current = false;
    actions.setPlayer({
      ...player,
      hp: safeInitialPlayer?.hp ?? player.hp,
      maxHp: safeInitialPlayer?.maxHp ?? player.maxHp,
      energy: safeInitialPlayer?.energy ?? player.energy,
      maxEnergy: safeInitialPlayer?.energy ?? player.maxEnergy,
      etherPts: nextEther,
      // Strength를 0으로 리셋하지 않고 초기 계산값/이전 값 보존
      strength: safeInitialPlayer?.strength ?? player.strength ?? startingStrength ?? 0,
      insight: safeInitialPlayer?.insight ?? player.insight ?? startingInsight ?? 0
    });
    actions.setSelected([]);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setFixedOrder(null);
    actions.setPostCombatOptions(null);
    actions.setEnemyPlan({ actions: [], mode: null });
    // 새로운 전투/턴 초기화 시 턴 시작 플래그도 리셋
    turnStartProcessedRef.current = false;
    // 통찰/연출 관련 초기화
    prevInsightRef.current = 0;
    prevRevealLevelRef.current = 0;
    actions.setInsightAnimLevel(0);
    actions.setInsightAnimPulseKey((k) => k + 1);
    actions.setEnemyEtherFinalValue(null);
    actions.setEnemyEtherCalcPhase(null);
    actions.setEnemyCurrentDeflation(null);
    if ((safeInitialPlayer?.insight || 0) > 0) {
      // 전투 시작 시에도 통찰 연출 1회 재생
      setTimeout(() => {
        actions.setInsightBadge({
          level: safeInitialPlayer?.insight || 0,
          dir: 'up',
          show: true,
          key: Date.now(),
        });
        playInsightSound(Math.min(safeInitialPlayer?.insight || 0, 3));
        actions.setInsightAnimLevel(Math.min(3, safeInitialPlayer?.insight || 0));
        actions.setInsightAnimPulseKey((k) => k + 1);
        setTimeout(() => actions.setInsightAnimLevel(0), 1000);
        setTimeout(() => actions.setInsightBadge((b) => ({ ...b, show: false })), 1200);
      }, 50);
    }
    actions.setPhase('select');
    // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const rawHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild, {}, [], effectiveCardDrawBonus, escapeBanRef.current)
      : CARDS.slice(0, 10); // 8장 → 10장
    actions.setHand(rawHand);
    actions.setCanRedraw(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enemy initialization - only run once on mount
  useEffect(() => {
    if (!initialEnemy) return;
    const hp = initialEnemy.hp ?? initialEnemy.maxHp ?? 30;
    actions.setEnemy({
      deck: initialEnemy.deck || ENEMIES[0]?.deck || [],
      name: initialEnemy.name ?? '적',
      hp,
      maxHp: initialEnemy.maxHp ?? hp,
      vulnMult: 1,
      vulnTurns: 0,
      block: 0,
      counter: 0,
      etherPts: initialEnemy.etherPts ?? initialEnemy.etherCapacity ?? 300,
      etherCapacity: initialEnemy.etherCapacity ?? 300,
      etherOverdriveActive: false
    });
    actions.setSelected([]);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setFixedOrder(null);
    // 새로운 적으로 전환 시 턴 시작 처리 플래그 리셋
    turnStartProcessedRef.current = false;
    prevRevealLevelRef.current = 0;
    actions.setPhase('select');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 전투 중 통찰 값 실시간 반영 (payload 재생성 없이)
  useEffect(() => {
    if (typeof liveInsight !== 'number') return;
    if (player.insight === liveInsight) return;
    actions.setPlayer({ ...player, insight: liveInsight });
  }, [liveInsight, player, actions]);

  useEffect(() => {
    if (postCombatOptions?.type) {
      notifyBattleResult(postCombatOptions.type);
    }
  }, [postCombatOptions, notifyBattleResult]);

  // 페이즈 변경 시 카드 애니메이션 상태 초기화
  useEffect(() => {
    if (battle.phase !== 'resolve') {
      actions.setDisappearingCards([]);
      actions.setHiddenCards([]);
    }
    // resolve 단계 진입 시 usedCardIndices 초기화
    if (battle.phase === 'resolve') {
      actions.setUsedCardIndices([]);
    }
  }, [battle.phase]);

  // C 키로 캐릭터 창 열기, Q 키로 간소화, E 키로 제출/진행/턴 종료, R 키로 리드로우, 스페이스바로 기원, F 키로 정렬
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        e.stopPropagation();
        actions.setShowCharacterSheet((prev) => !prev);
      }
      if ((e.key === "q" || e.key === "Q") && battle.phase === 'select') {
        e.preventDefault();
        actions.setIsSimplified((prev) => {
          const newVal = !prev;
          try { localStorage.setItem('battleIsSimplified', newVal.toString()); } catch { }
          return newVal;
        });
      }
      if ((e.key === "e" || e.key === "E") && battle.phase === 'select' && battle.selected.length > 0) {
        e.preventDefault();
        startResolve();
        playSound(900, 120);
      }
      if ((e.key === "e" || e.key === "E") && battle.phase === 'respond') {
        e.preventDefault();
        beginResolveFromRespond();
      }
      if ((e.key === "r" || e.key === "R") && battle.phase === 'select' && canRedraw) {
        e.preventDefault();
        redrawHand();
      }
      if (e.key === " " && (battle.phase === 'select' || battle.phase === 'respond')) {
        // 스페이스바로 기원 토글
        e.preventDefault(); // 스페이스바 기본 동작 방지 (스크롤)
        if (etherSlots(player.etherPts) > 0) {
          actions.setWillOverdrive(v => !v);
        }
      }
      if ((e.key === "e" || e.key === "E") && battle.phase === 'resolve') {
        e.preventDefault();
        if (battle.qIndex < battle.queue.length) {
          // 타임라인 진행 중이면 진행 토글
          actions.setAutoProgress(!autoProgress);
        } else if (etherFinalValue !== null) {
          // 타임라인 끝나고 최종값 표시되면 턴 종료
          finishTurn('키보드 단축키 (E)');
        }
      }
      if ((e.key === "f" || e.key === "F") && battle.phase === 'select') {
        e.preventDefault();
        // F키로 카드 정렬
        cycleSortType();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.phase, battle.selected, battle.canRedraw, player.etherPts, sortType, autoProgress, battle.qIndex, battle.queue.length, etherFinalValue]);

  useEffect(() => {
    if (!enemy) {
      const e = ENEMIES[enemyIndex];
      actions.setEnemy({ ...e, hp: e.hp, maxHp: e.hp, vulnMult: 1, vulnTurns: 0, block: 0, counter: 0, etherPts: 0, etherOverdriveActive: false, maxSpeed: e.maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED });

      // 전투 시작 유물 효과 로그 및 애니메이션
      const combatStartEffects = applyCombatStartEffects(orderedRelicList, {});

      // 전투 시작 유물 애니메이션
      orderedRelicList.forEach(relicId => {
        const relic = RELICS[relicId];
        if (relic?.effects?.type === 'ON_COMBAT_START') {
          actions.setRelicActivated(relicId);
          playSound(800, 200);
          setTimeout(() => actions.setRelicActivated(null), 500);
        }
      });

      if (combatStartEffects.damage > 0) {
        addLog(`⛓️ 유물 효과: 체력 -${combatStartEffects.damage} (피의 족쇄)`);
      }
      if (combatStartEffects.strength > 0) {
        addLog(`💪 유물 효과: 힘 +${combatStartEffects.strength}`);
      }
      if (combatStartEffects.block > 0) {
        addLog(`🛡️ 유물 효과: 방어력 +${combatStartEffects.block}`);
      }
      if (combatStartEffects.heal > 0) {
        addLog(`💚 유물 효과: 체력 +${combatStartEffects.heal}`);
      }

      // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
      const currentBuild = useGameStore.getState().characterBuild;
      const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
      const rawHand = hasCharacterBuild
        ? drawCharacterBuildHand(currentBuild, nextTurnEffects, [], effectiveCardDrawBonus)
        : CARDS.slice(0, 10); // 8장 → 10장
      actions.setHand(rawHand);
      actions.setSelected([]);
      actions.setCanRedraw(true);
      const handCount = initialHand.length;
      addLog(`🎴 시작 손패 ${handCount}장${hasCharacterBuild ? ' (캐릭터 빌드)' : ''}`);
    }
  }, []);

  // 단계 변경 시 트리거 리셋
  useEffect(() => {
    if (battle.phase === 'select' || battle.phase === 'respond') {
      devilDiceTriggeredRef.current = false;
      referenceBookTriggeredRef.current = false;
    }
    if (battle.phase === 'resolve') {
      referenceBookTriggeredRef.current = false;
    }
  }, [battle.phase]);

  useEffect(() => {
    if (!enemy || battle.phase !== 'select') {
      // phase가 select가 아니면 플래그 리셋
      if (battle.phase !== 'select') {
        turnStartProcessedRef.current = false;
      }
      return;
    }

    // 턴 시작 효과가 이미 처리되었으면 중복 실행 방지
    if (turnStartProcessedRef.current) {
      return;
    }
    turnStartProcessedRef.current = true;

    actions.setFixedOrder(null);
    actions.setActionEvents({});
    actions.setCanRedraw(true);
    actions.setWillOverdrive(false);

    // 유물 턴 시작 효과 적용 (피피한 갑옷 등)
    const turnStartRelicEffects = applyTurnStartEffects(orderedRelicList, nextTurnEffects);

    console.log("[턴 시작 유물 효과]", {
      block: turnStartRelicEffects.block,
      heal: turnStartRelicEffects.heal,
      energy: turnStartRelicEffects.energy
    });

    // 턴 시작 유물 발동 애니메이션
    orderedRelicList.forEach(relicId => {
      const relic = RELICS[relicId];
      if (relic?.effects?.type === 'ON_TURN_START') {
        actions.setRelicActivated(relicId);
        playSound(800, 200);
        setTimeout(() => actions.setRelicActivated(null), 500);
      }
    });

    // 특성 효과로 인한 에너지 보너스/페널티 적용
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    // baseMaxEnergy는 초기 payload에서 계산된 값 (활력 각성 포함)
    // safeInitialPlayer.maxEnergy = 6 + playerEnergyBonus + passiveEffects.maxEnergy
    const baseEnergy = baseMaxEnergy;
    const energyBonus = (nextTurnEffects.bonusEnergy || 0) + turnStartRelicEffects.energy;
    const energyPenalty = nextTurnEffects.energyPenalty || 0;
    const finalEnergy = Math.max(0, baseEnergy + energyBonus - energyPenalty);

    console.log("[턴 시작 에너지 계산]", {
      baseEnergy,
      "nextTurnEffects.bonusEnergy": nextTurnEffects.bonusEnergy,
      "turnStartRelicEffects.energy": turnStartRelicEffects.energy,
      energyBonus,
      energyPenalty,
      finalEnergy
    });

    // 방어력과 체력 회복 적용
    const newHp = Math.min(player.maxHp, player.hp + turnStartRelicEffects.heal);
    const newBlock = (player.block || 0) + turnStartRelicEffects.block;
    const newDef = turnStartRelicEffects.block > 0; // 방어력이 있으면 def 플래그 활성화
    actions.setPlayer({
      ...player,
      hp: newHp,
      block: newBlock,
      def: newDef,
      energy: finalEnergy,
      maxEnergy: baseMaxEnergy,
      etherOverdriveActive: false,
      etherOverflow: 0,
      strength: player.strength || 0 // 힘 유지
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
    if (energyBonus > 0) {
      addLog(`⚡ 다음턴 보너스 행동력: +${energyBonus}`);
    }

    // 매 턴 시작 시 새로운 손패 생성 (캐릭터 빌드 및 특성 효과 적용)
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const rawHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild, nextTurnEffects, battle.hand, effectiveCardDrawBonus, escapeBanRef.current)
      : CARDS.slice(0, 10); // 8장 → 10장
    actions.setHand(rawHand);
    actions.setSelected([]);

    // 적 성향/행동을 턴 시작에 즉시 결정해 통찰 UI가 바로 표시되도록 함
    const mode = battle.enemyPlan.mode || decideEnemyMode();
    if (!battle.enemyPlan.mode) {
      addLog(`🤖 적 성향 힌트: ${mode.name}`);
    }
    const slots = etherSlots(enemy?.etherPts || 0);
    const planActions = generateEnemyActions(enemy, mode, slots, enemyCount, enemyCount);
    actions.setEnemyPlan({ mode, actions: planActions });
  }, [battle.phase, enemy, enemyPlan.mode, nextTurnEffects]);

  useEffect(() => {
    if (battle.phase === 'resolve' && (!queue || battle.queue.length === 0) && fixedOrder && fixedOrder.length > 0) {
      const rebuilt = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
      actions.setQueue(rebuilt); actions.setQIndex(0);
      addLog('🧯 자동 복구: 실행 큐를 다시 생성했습니다');
    }
  }, [battle.phase, battle.queue, fixedOrder]);

  // 선택 단계 진입 시 적 행동을 미리 계산해 통찰 UI가 바로 보이도록 함
  useEffect(() => {
    if (battle.phase !== 'select') return;
    if (!enemyPlan?.mode) return;
    if (enemyPlan.actions && enemyPlan.actions.length > 0) return;
    const slots = etherSlots(enemy?.etherPts || 0);
    const generatedActions = generateEnemyActions(enemy, enemyPlan.mode, slots, enemyCount, enemyCount);
    actions.setEnemyPlan({ ...battle.enemyPlan, actions: generatedActions });
  }, [battle.phase, enemyPlan?.mode, enemyPlan?.actions?.length, enemy]);

  const totalEnergy = useMemo(() => battle.selected.reduce((s, c) => s + c.actionCost, 0), [battle.selected]);
  const totalSpeed = useMemo(
    () => battle.selected.reduce((s, c) => s + applyAgility(c.speedCost, effectiveAgility), 0),
    [battle.selected, effectiveAgility]
  );
  const currentCombo = useMemo(() => {
    const combo = detectPokerCombo(battle.selected);
    console.log('[currentCombo 업데이트]', {
      selectedCount: battle.selected.length,
      comboName: combo?.name || 'null'
    });

    // 디플레이션 정보 계산 (선택/대응/진행 단계에서)
    if (combo?.name && (battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve')) {
      const usageCount = (player.comboUsageCount || {})[combo.name] || 0;
      const deflationMult = Math.pow(0.5, usageCount);
      actions.setCurrentDeflation(usageCount > 0 ? { multiplier: deflationMult, usageCount } : null);
    }

    return combo;
  }, [battle.selected, player.comboUsageCount, battle.phase]);

  // 유물 효과를 포함한 최종 콤보 배율 (실시간 값 기반)
  const finalComboMultiplier = useMemo(() => {
    const baseMultiplier = currentCombo ? (COMBO_MULTIPLIERS[currentCombo.name] || 1) : 1;
    const isResolve = battle.phase === 'resolve';
    const cardsCount = isResolve ? resolvedPlayerCards : battle.selected.length;
    const allowRefBook = isResolve ? (battle.qIndex >= battle.queue.length) : false;

    if (!isResolve) return baseMultiplier;
    return computeComboMultiplier(baseMultiplier, cardsCount, true, allowRefBook);
  }, [currentCombo, resolvedPlayerCards, battle.selected.length, battle.phase, battle.qIndex, battle.queue.length, computeComboMultiplier]);
  useEffect(() => {
    if (battle.phase !== 'resolve') return;
    actions.setMultiplierPulse(true);
    const t = setTimeout(() => actions.setMultiplierPulse(false), 250);
    return () => clearTimeout(t);
  }, [finalComboMultiplier, battle.phase]);
  const comboPreviewInfo = useMemo(() => {
    if (!currentCombo) return null;
    return calculateComboEtherGain({
      cards: selected || [],
      cardCount: selected?.length || 0,
      comboName: currentCombo.name,
      comboUsageCount: player.comboUsageCount || {},
    });
  }, [currentCombo, selected?.length, player.comboUsageCount]);

  const toggle = (card) => {
    if (battle.phase !== 'select' && battle.phase !== 'respond') return;
    const exists = selected.some(s => s.id === card.id);
    if (battle.phase === 'respond') {
      let next;
      const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
      if (exists) {
        next = selected.filter(s => !(s.__uid === card.__uid) && !(s.id === card.id && !('__uid' in s)));
        playSound(400, 80); // 해지 사운드 (낮은 음)
      }
      else {
        if (selected.length >= MAX_SUBMIT_CARDS) { addLog('⚠️ 최대 5장의 카드만 제출할 수 있습니다'); return; }
        if (totalSpeed + cardSpeed > player.maxSpeed) { addLog('⚠️ 속도 초과'); return; }
        if (totalEnergy + card.actionCost > player.maxEnergy) { addLog('⚠️ 행동력 부족'); return; }
        next = [...selected, { ...card, __uid: Math.random().toString(36).slice(2) }];
        playSound(800, 80); // 선택 사운드 (높은 음)
      }
      const combo = detectPokerCombo(next);
      const enhanced = applyPokerBonus(next, combo);

      // 수동 순서 유지: 정렬하지 않고 순서대로 fixedOrder 생성
      const playerCards = enhanced.map((card, idx) => ({
        actor: 'player',
        card,
        originalIndex: idx
      }));

      const enemyCards = (enemyPlan.actions || []).map((action, idx) => ({
        actor: 'enemy',
        card: action,
        originalIndex: idx
      }));

      // 플레이어 카드를 먼저, 그 다음 적 카드 (수동 순서)
      const manualOrder = [...playerCards, ...enemyCards];

      // sp 값 재계산 (누적)
      let ps = 0;
      let es = 0;
      const withSp = manualOrder.map(item => {
        const isPlayer = item.actor === 'player';
        const agility = isPlayer ? effectiveAgility : 0;
        const finalSpeed = applyAgility(item.card.speedCost, agility);

        if (isPlayer) {
          ps += finalSpeed;
          return { ...item, sp: ps, finalSpeed };
        } else {
          es += finalSpeed;
          return { ...item, sp: es, finalSpeed };
        }
      });

      actions.setFixedOrder(withSp);
      actions.setSelected(next);
      return;
    }
    const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
    if (exists) {
      actions.setSelected(battle.selected.filter(s => s.id !== card.id));
      playSound(400, 80); // 해지 사운드 (낮은 음)
      return;
    }
    if (battle.selected.length >= MAX_SUBMIT_CARDS) return addLog('⚠️ 최대 5장의 카드만 제출할 수 있습니다');
    if (totalSpeed + cardSpeed > player.maxSpeed) return addLog('⚠️ 속도 초과');
    if (totalEnergy + card.actionCost > player.maxEnergy) return addLog('⚠️ 행동력 부족');
    actions.setSelected([...selected, { ...card, __uid: Math.random().toString(36).slice(2) }]);
    playSound(800, 80); // 선택 사운드 (높은 음)
  };

  const moveUp = (i) => {
    if (i === 0) return;
    if (battle.phase === 'respond') {
      const n = [...selected];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];

      const combo = detectPokerCombo(n);
      const enhanced = applyPokerBonus(n, combo);

      // 수동 순서 유지: 정렬하지 않고 순서대로 fixedOrder 생성
      const playerCards = enhanced.map((card, idx) => ({
        actor: 'player',
        card,
        originalIndex: idx
      }));

      const enemyCards = (enemyPlan.actions || []).map((action, idx) => ({
        actor: 'enemy',
        card: action,
        originalIndex: idx
      }));

      // 플레이어 카드를 먼저, 그 다음 적 카드 (수동 순서)
      const manualOrder = [...playerCards, ...enemyCards];

      // sp 값 재계산 (누적)
      let ps = 0;
      let es = 0;
      const withSp = manualOrder.map(item => {
        const isPlayer = item.actor === 'player';
        const agility = isPlayer ? effectiveAgility : 0;
        const finalSpeed = applyAgility(item.card.speedCost, agility);

        if (isPlayer) {
          ps += finalSpeed;
          return { ...item, sp: ps, finalSpeed };
        } else {
          es += finalSpeed;
          return { ...item, sp: es, finalSpeed };
        }
      });

      actions.setFixedOrder(withSp);
      actions.setSelected(n);
    } else {
      const n = [...selected];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];
      actions.setSelected(n);
    }
  };

  const moveDown = (i) => {
    if (i === battle.selected.length - 1) return;
    if (battle.phase === 'respond') {
      const n = [...selected];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];

      const combo = detectPokerCombo(n);
      const enhanced = applyPokerBonus(n, combo);

      // 수동 순서 유지: 정렬하지 않고 순서대로 fixedOrder 생성
      const playerCards = enhanced.map((card, idx) => ({
        actor: 'player',
        card,
        originalIndex: idx
      }));

      const enemyCards = (enemyPlan.actions || []).map((action, idx) => ({
        actor: 'enemy',
        card: action,
        originalIndex: idx
      }));

      // 플레이어 카드를 먼저, 그 다음 적 카드 (수동 순서)
      const manualOrder = [...playerCards, ...enemyCards];

      // sp 값 재계산 (누적)
      let ps = 0;
      let es = 0;
      const withSp = manualOrder.map(item => {
        const isPlayer = item.actor === 'player';
        const agility = isPlayer ? effectiveAgility : 0;
        const finalSpeed = applyAgility(item.card.speedCost, agility);

        if (isPlayer) {
          ps += finalSpeed;
          return { ...item, sp: ps, finalSpeed };
        } else {
          es += finalSpeed;
          return { ...item, sp: es, finalSpeed };
        }
      });

      actions.setFixedOrder(withSp);
      actions.setSelected(n);
    } else {
      const n = [...selected];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];
      actions.setSelected(n);
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
      ? drawCharacterBuildHand(currentBuild, nextTurnEffects, hand, effectiveCardDrawBonus, escapeBanRef.current)
      : CARDS.slice(0, 10); // 8장 → 10장
    actions.setHand(rawHand);
    actions.setSelected([]);
    actions.setCanRedraw(false);
    addLog('🔄 손패 리드로우 사용');
    playSound(700, 90); // 리드로우 효과음
  };

  const cycleSortType = () => {
    const sortCycle = ['speed', 'energy', 'value', 'type'];
    const currentIndex = sortCycle.indexOf(sortType);
    const nextIndex = (currentIndex + 1) % sortCycle.length;
    const nextSort = sortCycle[nextIndex];
    actions.setSortType(nextSort);
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
    if (battle.phase !== 'select') return;
    const generatedActions =
      enemyPlan.actions && enemyPlan.actions.length > 0
        ? enemyPlan.actions
        : generateEnemyActions(enemy, enemyPlan.mode, etherSlots(enemy.etherPts), enemyCount, enemyCount);
    actions.setEnemyPlan({ ...battle.enemyPlan, actions: generatedActions });

    const pCombo = detectPokerCombo(selected);

    // 특성 효과 적용 (사용 횟수는 선택 단계 기준으로 고정)
    const traitEnhancedSelected = battle.selected.map(card =>
      applyTraitModifiers(card, {
        usageCount: 0,
        isInCombo: pCombo !== null,
      })
    );

    const enhancedSelected = applyPokerBonus(traitEnhancedSelected, pCombo);

    const q = sortCombinedOrderStablePF(enhancedSelected, enemyPlan.actions, effectiveAgility, 0);
    actions.setFixedOrder(q);
    // 대응 단계 되감기용 스냅샷 저장 (전투당 1회)
    if (!rewindUsed) {
      actions.setRespondSnapshot({
        selectedSnapshot: selected,
        enemyActions: enemyPlan.actions,
      });
    }
    playCardSubmitSound(); // 카드 제출 사운드 재생
    actions.setPhase('respond');
  };

  useEffect(() => {
    // respond 단계에서 자동 정렬 제거 (수동 조작 방해 방지)
    // 필요한 경우 각 조작 함수(toggle, moveUp, moveDown)에서 setFixedOrder를 직접 호출하여 순서를 제어함
    /*
    if (battle.phase === 'respond' && enemyPlan.actions && enemyPlan.actions.length > 0) {
      const combo = detectPokerCombo(selected);

      // 특성 효과 적용
      const traitEnhancedSelected = battle.selected.map(card =>
        applyTraitModifiers(card, {
          usageCount: 0,
          isInCombo: combo !== null,
        })
      );

      const enhancedSelected = applyPokerBonus(traitEnhancedSelected, combo);
      const q = sortCombinedOrderStablePF(enhancedSelected, enemyPlan.actions, effectiveAgility, 0);
      actions.setFixedOrder(q);
    }
    */
  }, [battle.selected, battle.phase, enemyPlan.actions]);

  const beginResolveFromRespond = () => {
    console.log('[DEBUG] beginResolveFromRespond called, phase:', battle.phase, 'fixedOrder:', fixedOrder);
    if (battle.phase !== 'respond') {
      console.log('[DEBUG] Phase check failed, phase is:', battle.phase);
      return;
    }
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

    // SP 값으로 정렬 (같은 SP면 배열 순서 유지 = 수동 순서 유지)
    newQ.sort((a, b) => {
      if (a.sp !== b.sp) return a.sp - b.sp;
      // SP가 같으면 원래 배열 순서 유지 (stable sort)
      return 0;
    });

    // 이전 턴의 에테르 애니메이션 상태 초기화
    actions.setEtherCalcPhase(null);
    actions.setEtherFinalValue(null);
    actions.setEnemyEtherFinalValue(null);
    actions.setCurrentDeflation(null);
    actions.setEnemyEtherCalcPhase(null);
    actions.setEnemyCurrentDeflation(null);

    // 에테르 폭주 체크 (phase 변경 전에 실행)
    const enemyWillOD = shouldEnemyOverdriveWithTurn(enemyPlan.mode, enemyPlan.actions, enemy.etherPts, turnNumber) && etherSlots(enemy.etherPts) > 0;
    if (willOverdrive && etherSlots(player.etherPts) > 0) {
      actions.setPlayer({ ...player, etherPts: player.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true });
      actions.setPlayerOverdriveFlash(true);
      playSound(1400, 220);
      setTimeout(() => actions.setPlayerOverdriveFlash(false), 650);
      addLog('✴️ 에테르 폭주 발동! (이 턴 전체 유지)');
    }
    if (enemyWillOD) {
      actions.setEnemy({ ...enemy, etherPts: enemy.etherPts - ETHER_THRESHOLD, etherOverdriveActive: true });
      actions.setEnemyOverdriveFlash(true);
      playSound(900, 220);
      setTimeout(() => actions.setEnemyOverdriveFlash(false), 650);
      addLog('☄️ 적 에테르 폭주 발동!');
    }

    playProceedSound(); // 진행 버튼 사운드 재생
    actions.setQueue(newQ);
    actions.setQIndex(0);
    console.log('[DEBUG] About to setPhase to resolve');
    actions.setPhase('resolve');
    console.log('[DEBUG] Phase set to resolve');
    addLog('▶ 진행 시작');

    // Phase 변경 확인용 타이머
    setTimeout(() => {
      console.log('[DEBUG] 100ms after setPhase, current phase:', battle.phase);
    }, 100);
    setTimeout(() => {
      console.log('[DEBUG] 500ms after setPhase, current phase:', battle.phase);
    }, 500);

    // 진행 단계 시작 시 플레이어와 적 상태 저장
    actions.setResolveStartPlayer({ ...player });
    actions.setResolveStartEnemy({ ...enemy });

    // 진행된 플레이어 카드 수 초기화
    actions.setResolvedPlayerCards(0);
    devilDiceTriggeredRef.current = false;

    // 타임라인 progress 초기화
    actions.setTimelineProgress(0);
    actions.setTimelineIndicatorVisible(true);
    actions.setNetEtherDelta(null);

    // 진행 버튼 누르면 자동 진행 활성화
    actions.setAutoProgress(true);
  };

  // 대응 → 선택 되감기 (전투당 1회)
  const rewindToSelect = () => {
    if (rewindUsed) {
      addLog('⚠️ 되감기는 전투당 1회만 사용할 수 있습니다.');
      return;
    }
    if (!respondSnapshot) {
      addLog('⚠️ 되감기할 상태가 없습니다.');
      return;
    }
    actions.setRewindUsed(true);
    actions.setPhase('select');
    actions.setFixedOrder(null);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setTimelineProgress(0);
    actions.setSelected(respondSnapshot.selectedSnapshot || []);
    addLog('⏪ 되감기 사용: 대응 단계 → 선택 단계 (전투당 1회)');
  };

  // 에테르 계산 애니메이션 시작 (몬스터 사망 시 / 정상 종료 시 공통)
  // skipFinalValueSet: true이면 setEtherFinalValue를 호출하지 않음 (finishTurn에서 이미 설정한 경우)
  const startEtherCalculationAnimation = (totalEtherPts, actualResolvedCards = null, actualGainedEther = null, skipFinalValueSet = false) => {
    const pCombo = detectPokerCombo(selected);
    const basePlayerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
    // 몬스터가 죽었을 때는 actualResolvedCards(실제 실행된 카드 수), 아니면 battle.selected.length(전체 선택된 카드 수)
    const cardCountForMultiplier = actualResolvedCards !== null ? actualResolvedCards : battle.selected.length;
    const playerComboMult = finalComboMultiplier || basePlayerComboMult;
    let playerBeforeDeflation = Math.round(totalEtherPts * playerComboMult);


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
      selectedCards: battle.selected.length,
      actualResolvedCards: actualResolvedCards,
      cardCountForMultiplier: cardCountForMultiplier,
      actualGainedEther,
      comboUsageCount: player.comboUsageCount,
      comboUsageForThisCombo: player.comboUsageCount?.[pCombo?.name] || 0
    });

    // 디플레이션 정보 설정
    actions.setCurrentDeflation(pCombo?.name ? {
      comboName: pCombo.name,
      usageCount: playerDeflation.usageCount,
      multiplier: playerDeflation.multiplier
    } : null);

    // === 적 에테르 계산 (플레이어와 동일한 로직) ===
    const eCombo = detectPokerCombo(enemyPlan.actions || []);
    const baseEnemyComboMult = eCombo ? (COMBO_MULTIPLIERS[eCombo.name] || 1) : 1;
    const enemyCardCount = enemyPlan.actions?.length || 0;
    let enemyBeforeDeflation = Math.round(enemyTurnEtherAccumulated * baseEnemyComboMult);

    // 적 디플레이션 적용
    const enemyDeflation = eCombo?.name
      ? applyEtherDeflation(enemyBeforeDeflation, eCombo.name, enemy.comboUsageCount || {})
      : { gain: enemyBeforeDeflation, multiplier: 1, usageCount: 0 };

    const enemyFinalEther = enemyDeflation.gain;

    // 적 디플레이션 정보 설정
    actions.setEnemyCurrentDeflation(eCombo?.name ? {
      comboName: eCombo.name,
      usageCount: enemyDeflation.usageCount,
      multiplier: enemyDeflation.multiplier
    } : null);

    console.log('[적 에테르 계산 애니메이션]', {
      enemyTurnEtherAccumulated,
      comboName: eCombo?.name,
      baseEnemyComboMult,
      enemyBeforeDeflation,
      deflationMult: enemyDeflation.multiplier,
      usageCount: enemyDeflation.usageCount,
      enemyFinalEther,
      enemyCardCount
    });

    // 1단계: 합계 강조 (플레이어 + 적 동시)
    actions.setEtherCalcPhase('sum');
    actions.setEnemyEtherCalcPhase('sum');
    setTimeout(() => {
      // 2단계: 곱셈 강조 + 명쾌한 사운드
      actions.setEtherCalcPhase('multiply');
      actions.setEnemyEtherCalcPhase('multiply');
      playSound(800, 100);
      setTimeout(() => {
        // 3단계: 디플레이션 배지 애니메이션 + 저음 사운드
        if (playerDeflation.usageCount > 0 || enemyDeflation.usageCount > 0) {
          if (playerDeflation.usageCount > 0) actions.setEtherCalcPhase('deflation');
          if (enemyDeflation.usageCount > 0) actions.setEnemyEtherCalcPhase('deflation');
          playSound(200, 150);
        }
        setTimeout(() => {
          // 4단계: 최종값 표시 + 묵직한 사운드
          actions.setEtherCalcPhase('result');
          actions.setEnemyEtherCalcPhase('result');
          // 버튼 표시를 위해 값 설정 (finishTurn에서 정확한 값으로 다시 설정됨)
          actions.setEtherFinalValue(playerFinalEther);
          actions.setEnemyEtherFinalValue(enemyFinalEther);
          playSound(400, 200);
        }, (playerDeflation.usageCount > 0 || enemyDeflation.usageCount > 0) ? 400 : 0);
      }, 600);
    }, 400);
  };

  const stepOnce = () => {
    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex];
    const currentQIndex = currentBattle.qIndex; // Capture current qIndex

    // 타임라인 progress 업데이트 (공통 최대 속도 기준 비율로)
    const playerMaxSpeed = player?.maxSpeed || DEFAULT_PLAYER_MAX_SPEED;
    const enemyMaxSpeed = enemy?.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
    const commonMaxSpeed = Math.max(playerMaxSpeed, enemyMaxSpeed);
    const progressPercent = (a.sp / commonMaxSpeed) * 100;

    // 먼저 시곗바늘을 현재 카드 위치로 이동
    actions.setTimelineProgress(progressPercent);

    // 시곗바늘 이동 완료 후 카드 발동 및 실행 (0.5초 transition 후)
    setTimeout(() => {
      // 실행 중인 카드 표시 (흔들림 애니메이션)
      actions.setExecutingCardIndex(currentQIndex);

      // 흔들림 애니메이션 종료 후 빛 바래짐 처리
      setTimeout(() => {
        actions.setExecutingCardIndex(null);
        // 흔들림이 끝난 후 사용된 카드로 표시 (빛 바래짐)
        const currentBattle = battleRef.current;
        const currentUsedIndices = currentBattle.usedCardIndices || [];
        actions.setUsedCardIndices([...currentUsedIndices, currentQIndex]);
      }, 350); // CSS 애니메이션 시간과 일치

      // 마지막 카드면 페이드아웃
      if (currentQIndex >= currentBattle.queue.length - 1) {
        setTimeout(() => {
          actions.setTimelineIndicatorVisible(false);
        }, 300);
      }

      // 카드 소멸 이펙트는 플레이어만 적용
      if (a.actor === 'player') {
        if (hasTrait(a.card, 'escape')) {
          escapeUsedThisTurnRef.current = new Set([...escapeUsedThisTurnRef.current, a.card.id]);
        }
        setTimeout(() => {
          // 카드가 사용된 후 사라지는 애니메이션 시작
          const currentBattle = battleRef.current;
          const currentDisappearing = currentBattle.disappearingCards || [];
          actions.setDisappearingCards([...currentDisappearing, currentQIndex]);
          setTimeout(() => {
            // 애니메이션 후 완전히 숨김
            const currentBattle = battleRef.current;
            const currentHidden = currentBattle.hiddenCards || [];
            const currentDisappearing2 = currentBattle.disappearingCards || [];
            actions.setHiddenCards([...currentHidden, currentQIndex]);
            actions.setDisappearingCards(currentDisappearing2.filter(i => i !== currentQIndex));
          }, 600); // 애니메이션 지속 시간
        }, 300); // 사용 효과 후 바로 사라지기 시작
      }

      executeCardAction();
    }, 500); // CSS transition 시간과 일치 (0.5s)
  };

  const executeCardAction = () => {
    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex];

    const P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, strength: player.strength || 0 };
    const E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1 };
    const tempState = { player: P, enemy: E, log: [] };
    const { events } = applyAction(tempState, a.actor, a.card);
    let actionEvents = events;

    // 플레이어 카드 사용 시 카드 사용 횟수 증가 (mastery, boredom 특성용)
    if (a.actor === 'player' && a.card.id) {
      actions.setCardUsageCount({
        ...cardUsageCount,
        [a.card.id]: (cardUsageCount[a.card.id] || 0) + 1
      });

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

      // 몸풀기 (warmup): 다음 턴 행동력 +2
      if (hasTrait(a.card, 'warmup')) {
        actions.setNextTurnEffects({ ...nextTurnEffects, bonusEnergy: (nextTurnEffects.bonusEnergy || 0) + 2 });
        addLog(`🔥 "몸풀기" - 다음 턴 행동력 +2 예약`);
      }

      // 유물: 카드 사용 시 효과 (불멸의 가면 등)
      const cardRelicEffects = applyCardPlayedEffects(relics, a.card, { player: P, enemy: E });
      if (cardRelicEffects.heal) {
        const maxHpVal = P.maxHp ?? player.maxHp ?? safeInitialPlayer.maxHp ?? 100;
        const healed = Math.min(maxHpVal, (P.hp || 0) + cardRelicEffects.heal);
        const healDelta = healed - (P.hp || 0);
        if (healDelta > 0) {
          P.hp = healed;
          addLog(`🎭 유물 효과: 체력 +${healDelta} (불멸의 가면 등)`);
          actions.setRelicActivated('immortalMask');
          setTimeout(() => actions.setRelicActivated(null), 500);
        }
      }
    }

    if (hasTrait(a.card, 'stun')) {
      const centerSp = a.sp ?? 0;
      const stunnedActions = [];
      const targets = currentBattle.queue
        .map((item, idx) => ({ item, idx }))
        .filter(({ item, idx }) => {
          if (idx <= currentBattle.qIndex || !item) return false;
          const isOpponent = item.actor !== a.actor;
          const withinRange = typeof item.sp === 'number' && item.sp >= centerSp && item.sp <= centerSp + STUN_RANGE;
          return isOpponent && withinRange;
        });
      if (targets.length > 0) {
        stunnedActions.push(...targets);
        actions.setQueue(currentBattle.queue.filter((_, idx) => !targets.some(t => t.idx === idx)));
      }
      if (stunnedActions.length > 0) {
        const stunnedNames = stunnedActions.map(t => t.item?.card?.name || '카드').join(', ');
        const msg = `😵 "${a.card.name}"의 기절! 상대 카드 ${stunnedActions.length}장 파괴 (범위: ${centerSp}~${centerSp + STUN_RANGE}${stunnedNames ? `, 대상: ${stunnedNames}` : ''})`;
        addLog(msg);
        actionEvents = [...actionEvents, { actor: a.actor, card: a.card.name, type: 'stun', msg }];
      }
    }

    // 카드 사용 시 에테르 누적 (실제 적용은 턴 종료 시)
    if (a.actor === 'player') {
      // 희귀한 조약돌 효과: 카드당 획득 에테르 2배
      const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
      const upgradedRarity = cardUpgrades[a.card.id];
      const cardForEther = upgradedRarity ? { ...a.card, rarity: upgradedRarity } : a.card;
      const etherPerCard = Math.floor(getCardEtherGain(cardForEther) * passiveRelicEffects.etherMultiplier);

      const newTurnEther = turnEtherAccumulated + etherPerCard;
      console.log(`[에테르 누적] ${turnEtherAccumulated} + ${etherPerCard} = ${newTurnEther} (카드: ${a.card.name})`);
      actions.setTurnEtherAccumulated(newTurnEther);
      // PT 증가 애니메이션
      actions.setEtherPulse(true);
      setTimeout(() => actions.setEtherPulse(false), 300);

      // 플레이어 카드 진행 시 유물 발동
      const newCount = resolvedPlayerCards + 1;
      const isLastPlayerCard = playerTimeline?.length > 0 && newCount === playerTimeline.length;

      // 유물이 있으면 발동 애니메이션 및 사운드 (좌→우 순차 재생)
      if (relics.length > 0) {
        const triggered = [];
        orderedRelicList.forEach(relicId => {
          const relic = RELICS[relicId];
          // effects가 객체인 경우 처리 (/src/data/relics.js 사용)
          if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.comboMultiplierPerCard) {
            // 에테르 결정: 카드마다 즉시 발동 표시/사운드
            triggered.push({ id: relicId, tone: 800, duration: 500 });
          } else if (relic?.effects?.type === 'PASSIVE' && (relic?.effects?.etherCardMultiplier || relicId === 'rareStone' || relic?.effects?.etherMultiplier)) {
            if (relicId === 'referenceBook') {
              // 참고서는 마지막 카드에서만 한 번 발동
              if (isLastPlayerCard && !referenceBookTriggeredRef.current) {
                referenceBookTriggeredRef.current = true;
                triggered.push({ id: relicId, tone: 820, duration: 500 });
              }
              return;
            }
            // 희귀한 조약돌 등: 카드마다 즉시 발동 (상시 배지 없음)
            triggered.push({ id: relicId, tone: 820, duration: 400 });
          } else if (relic?.effects?.type === 'PASSIVE' && relic?.effects?.etherFiveCardBonus && newCount >= 5 && !devilDiceTriggeredRef.current) {
            // 악마의 주사위: 다섯번째 카드 처리 직후 발동
            devilDiceTriggeredRef.current = true;
            triggered.push({ id: relicId, tone: 980, duration: 800 });
          }
        });

        if (triggered.length > 0) {
          const playSeq = (idx = 0) => {
            if (idx >= triggered.length) {
              actions.setRelicActivated(null);
              return;
            }
            const item = triggered[idx];
            flashRelic(item.id, item.tone, item.duration);
            setTimeout(() => playSeq(idx + 1), Math.max(200, item.duration * 0.6));
          };
          playSeq(0);
        }
      }

      actions.setResolvedPlayerCards(newCount);
    } else if (a.actor === 'enemy') {
      actions.setEnemyTurnEtherAccumulated(enemyTurnEtherAccumulated + getCardEtherGain(a.card));
    }

    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1, strength: P.strength || 0 });
    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 });
    actions.setActionEvents({ ...currentBattle.actionEvents, [currentBattle.qIndex]: actionEvents });

    // 이벤트 처리: 애니메이션 및 사운드
    actionEvents.forEach(ev => {
      addLog(ev.msg);

      // 피격 효과 (hit, pierce 타입)
      if ((ev.type === 'hit' || ev.type === 'pierce') && ev.dmg > 0) {
        playHitSound();
        if (ev.actor === 'player') {
          // 플레이어가 공격 -> 적 피격
          actions.setEnemyHit(true);
          setTimeout(() => actions.setEnemyHit(false), 300);
        } else {
          // 적이 공격 -> 플레이어 피격
          actions.setPlayerHit(true);
          setTimeout(() => actions.setPlayerHit(false), 300);
        }
      }

      // 방어 효과 (defense 타입)
      if (ev.type === 'defense') {
        playBlockSound();
        if (ev.actor === 'player') {
          actions.setPlayerBlockAnim(true);
          setTimeout(() => actions.setPlayerBlockAnim(false), 400);
        } else {
          actions.setEnemyBlockAnim(true);
          setTimeout(() => actions.setEnemyBlockAnim(false), 400);
        }
      }

      // 반격 피해
      if (ev.actor === 'counter') {
        playHitSound();
        // counter는 반대 방향으로 피해가 가므로 타겟을 반대로
        if (a.actor === 'player') {
          actions.setPlayerHit(true);
          setTimeout(() => actions.setPlayerHit(false), 300);
        } else {
          actions.setEnemyHit(true);
          setTimeout(() => actions.setEnemyHit(false), 300);
        }
      }
    });

    const newQIndex = battleRef.current.qIndex + 1;

    // battleRef를 즉시 업데이트 (React state 업데이트는 비동기이므로)
    battleRef.current = { ...battleRef.current, qIndex: newQIndex };

    actions.setQIndex(newQIndex);

    if (P.hp <= 0) { actions.setPostCombatOptions({ type: 'defeat' }); actions.setPhase('post'); return; }
    if (E.hp <= 0) {
      // 몬스터 죽음 애니메이션 및 사운드
      actions.setEnemyHit(true);
      playSound(200, 500); // 낮은 주파수로 죽음 사운드

      // 타임라인 즉시 숨김 및 자동진행 중단
      actions.setTimelineIndicatorVisible(false);
      actions.setAutoProgress(false);

      // 남은 카드들을 비활성화 상태로 표시 (큐는 유지)
      const disabledIndices = queue.slice(newQIndex).map((_, idx) => newQIndex + idx);
      actions.setDisabledCardIndices(disabledIndices);

      // 실제로 실행 완료된 플레이어 카드 수 계산 (배율 계산에 사용)
      // newQIndex는 다음에 실행될 카드의 인덱스이므로, newQIndex 이전까지만 카운트
      // 단, 현재 실행 중인 카드(qIndex)는 아직 완료되지 않았으므로 제외
      // resolvedPlayerCards 상태와 동일한 값을 사용하는 것이 정확함
      const actualResolvedCards = resolvedPlayerCards;

      // 큐 인덱스를 끝으로 이동하여 더 이상 진행되지 않도록 함
      actions.setQIndex(battle.queue.length);

      // 에테르 계산 애니메이션은 useEffect에서 실행됨 (상태 업데이트 타이밍 보장)
      // 에테르가 없으면 버튼 표시를 위해 0으로 설정
      if (turnEtherAccumulated === 0) {
        actions.setEtherFinalValue(0);
      }
      return;
    }

    // 타임라인의 모든 카드 진행이 끝났을 때 에테르 계산 애니메이션은 useEffect에서 실행됨 (상태 업데이트 타이밍 보장)
  };

  // 자동진행 기능
  useEffect(() => {
    if (autoProgress && battle.phase === 'resolve' && battle.qIndex < battle.queue.length) {
      const timer = setTimeout(() => {
        stepOnce();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoProgress, battle.phase, battle.qIndex, battle.queue.length, stepOnce]);

  // 타임라인 완료 후 에테르 계산 애니메이션 실행
  // useEffect를 사용하여 turnEtherAccumulated 상태가 최신 값일 때 실행
  useEffect(() => {
    if (battle.phase === 'resolve' && battle.qIndex >= battle.queue.length && battle.queue.length > 0 && turnEtherAccumulated > 0 && etherCalcPhase === null) {
      // 모든 카드가 실행되고 에테르가 누적된 상태에서, 애니메이션이 아직 시작되지 않았을 때만 실행
      // resolvedPlayerCards를 전달하여 몬스터 사망 시에도 정확한 카드 수 사용
      setTimeout(() => startEtherCalculationAnimation(turnEtherAccumulated, resolvedPlayerCards), 900);
    }
  }, [battle.phase, battle.qIndex, battle.queue.length, turnEtherAccumulated, etherCalcPhase, resolvedPlayerCards]);

  const finishTurn = (reason) => {
    addLog(`턴 종료: ${reason || ''}`);
    // 이번 턴 사용한 탈주 카드를 다음 턴 한정으로 차단
    escapeBanRef.current = new Set(escapeUsedThisTurnRef.current);
    escapeUsedThisTurnRef.current = new Set();

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
      cardsPlayedThisTurn: battle.selected.length,
      player,
      enemy,
    });

    // 턴 종료 유물 발동 애니메이션
    relics.forEach(relicId => {
      const relic = RELICS[relicId];
      if (relic?.effects?.type === 'ON_TURN_END') {
        const condition = relic.effects.condition;
        if (!condition || condition({ cardsPlayedThisTurn: battle.selected.length, player, enemy })) {
          actions.setRelicActivated(relicId);
          playSound(800, 200);
          setTimeout(() => actions.setRelicActivated(null), 500);
        }
      }
    });

    // 턴 종료 유물 효과를 다음 턴 효과에 추가
    if (turnEndRelicEffects.energyNextTurn > 0) {
      newNextTurnEffects.bonusEnergy += turnEndRelicEffects.energyNextTurn;
      addLog(`📜 유물 효과: 다음턴 행동력 +${turnEndRelicEffects.energyNextTurn}`);
      console.log("[턴 종료 계약서 효과]", {
        "battle.selected.length": battle.selected.length,
        "turnEndRelicEffects.energyNextTurn": turnEndRelicEffects.energyNextTurn,
        "newNextTurnEffects.bonusEnergy": newNextTurnEffects.bonusEnergy
      });
    }

    actions.setNextTurnEffects(newNextTurnEffects);

    // 힘 증가 즉시 적용 (은화 등) - 상태 업데이트 후에 적용
    if (turnEndRelicEffects.strength !== 0) {
      const currentStrength = player.strength || 0;
      const newStrength = currentStrength + turnEndRelicEffects.strength;
      addLog(`💪 유물 효과: 힘 ${turnEndRelicEffects.strength > 0 ? '+' : ''}${turnEndRelicEffects.strength} (총 ${newStrength})`);
      actions.setPlayer({ ...player, strength: newStrength });
    }

    // 턴 종료 시 조합 카운트 증가 (Deflation)
    const pComboEnd = detectPokerCombo(selected);
    const eComboEnd = detectPokerCombo(enemyPlan.actions);

    // 에테르 최종 계산 및 적용 (애니메이션은 stepOnce에서 처리됨)
    const basePlayerComboMult = pComboEnd ? (COMBO_MULTIPLIERS[pComboEnd.name] || 1) : 1;
    const playerComboMult = finalComboMultiplier || basePlayerComboMult;
    const relicMultBonus = playerComboMult - basePlayerComboMult;

    // 턴 종료 시점에는 에테르 결정/조약돌 발동 애니메이션을 중복 노출하지 않음 (카드 실행 시에만)

    const enemyComboMult = eComboEnd ? (COMBO_MULTIPLIERS[eComboEnd.name] || 1) : 1;

    // 조합 배율 적용 (유물 배율 이미 반영됨)
    let playerBeforeDeflation = Math.round(turnEtherAccumulated * playerComboMult);

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
      selectedCards: battle.selected.length,
      resolvedPlayerCards: resolvedPlayerCards,
      comboUsageCount: player.comboUsageCount,
      comboUsageForThisCombo: player.comboUsageCount?.[pComboEnd?.name] || 0
    });

    // 에테르 범람 계산: 현재 슬롯 내에서 초과분은 범람
    let playerAppliedEther = 0;
    let playerOverflow = 0;

    if (playerFinalEther > 0) {
      playerAppliedEther = playerFinalEther;
      playerOverflow = 0;

      // 실제 적용된 총 배율 계산 (조합 배율 + 참고서 + 악마의 주사위)
      const actualTotalMultiplier = turnEtherAccumulated > 0
        ? (playerBeforeDeflation / turnEtherAccumulated)
        : 1;

      const deflationText = playerDeflation.usageCount > 0
        ? ` (디플레이션 -${Math.round((1 - playerDeflation.multiplier) * 100)}%, ${playerDeflation.usageCount}회 사용)`
        : '';
      const relicText = relicMultBonus > 0 ? ` (유물 배율 +${relicMultBonus.toFixed(2)})` : '';
      addLog(`✴️ 에테르 획득: ${turnEtherAccumulated} × ${actualTotalMultiplier.toFixed(2)}${relicText} = ${playerBeforeDeflation} → ${playerFinalEther} PT${deflationText} (적용: ${playerAppliedEther} PT)`);

      // 최종값 UI에 로그와 동일한 값 표시
      actions.setEtherFinalValue(playerFinalEther);
    }
    // 적도 동일하게 적용/범람 계산 (슬롯 남은칸 제한 제거)
    let enemyAppliedEther = 0;
    let enemyOverflow = 0;
    if (enemyFinalEther > 0) {
      enemyAppliedEther = enemyFinalEther;
      enemyOverflow = 0;

      const deflationText = enemyDeflation.usageCount > 0
        ? ` (디플레이션: ${Math.round(enemyDeflation.multiplier * 100)}%)`
        : '';
      addLog(`☄️ 적 에테르 획득: ${enemyTurnEtherAccumulated} × ${enemyComboMult.toFixed(2)} = ${enemyBeforeDeflation} → ${enemyFinalEther} PT${deflationText} (적용: ${enemyAppliedEther} PT)`);
      actions.setEnemyEtherCalcPhase('sum');
      setTimeout(() => actions.setEnemyEtherCalcPhase('multiply'), 50);
      setTimeout(() => {
        actions.setEnemyEtherCalcPhase('deflation');
        actions.setEnemyCurrentDeflation(enemyDeflation.usageCount > 0 ? { multiplier: enemyDeflation.multiplier, usageCount: enemyDeflation.usageCount } : null);
      }, 150);
      setTimeout(() => actions.setEnemyEtherCalcPhase('result'), 300);
    }

    actions.setEnemyEtherFinalValue(enemyFinalEther);

    // 에테르 소지량 이동: 적용치 기준 (플레이어도 잃을 수 있음)
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

    // 몬스터가 처치된 경우: 남은 에테르 전부 플레이어에게 이전
    if (enemy.hp <= 0 && nextEnemyPts > 0) {
      movedPts += nextEnemyPts;
      nextPlayerPts += nextEnemyPts;
      addLog(`💠 적 잔여 에테르 회수: +${nextEnemyPts} PT`);
      nextEnemyPts = 0;
    }

    // 실제 이동된 양을 델타로 기록 (0이어도 표시 일치용)
    actions.setNetEtherDelta(movedPts);

    if (movedPts !== 0) {
      actions.setPlayerTransferPulse(true);
      actions.setEnemyTransferPulse(true);
      playSound(movedPts > 0 ? 900 : 600, 180);
      setTimeout(() => {
        actions.setPlayerTransferPulse(false);
        actions.setEnemyTransferPulse(false);
      }, 450);
      addLog(`🔁 에테르 이동: 플레이어 ${movedPts > 0 ? '+' : ''}${movedPts} PT`);
    }

    const newUsageCount = { ...(player.comboUsageCount || {}) };
    if (pComboEnd?.name) {
      newUsageCount[pComboEnd.name] = (newUsageCount[pComboEnd.name] || 0) + 1;
    }
    // 플레이어가 사용한 각 카드의 사용 횟수 증가 (숙련 특성용)
    queue.forEach(action => {
      if (action.actor === 'player' && action.card?.id) {
        newUsageCount[action.card.id] = (newUsageCount[action.card.id] || 0) + 1;
      }
    });
    actions.setPlayer({
      ...player,
      block: 0,
      def: false,
      counter: 0,
      vulnMult: 1,
      vulnTurns: 0,
      etherOverdriveActive: false,
      comboUsageCount: newUsageCount,
      etherPts: Math.max(0, nextPlayerPts),
      etherOverflow: (player.etherOverflow || 0) + playerOverflow
    });

    const newEnemyUsageCount = { ...(enemy.comboUsageCount || {}) };
    if (eComboEnd?.name) {
      newEnemyUsageCount[eComboEnd.name] = (newEnemyUsageCount[eComboEnd.name] || 0) + 1;
    }
    const nextPts = Math.max(0, nextEnemyPts);
    const nextEnemyPtsSnapshot = nextPts;
    actions.setEnemy({
      ...enemy,
      block: 0,
      def: false,
      counter: 0,
      vulnMult: 1,
      vulnTurns: 0,
      etherOverdriveActive: false,
      comboUsageCount: newEnemyUsageCount,
      etherPts: nextPts
    });

    // 에테르 누적 카운터 리셋 (애니메이션 상태는 다음 턴 시작 시 리셋됨)
    actions.setTurnEtherAccumulated(0);
    actions.setEnemyTurnEtherAccumulated(0);

    actions.setSelected([]); actions.setQueue([]); actions.setQIndex(0); actions.setFixedOrder(null); actions.setUsedCardIndices([]);
    actions.setDisappearingCards([]); actions.setHiddenCards([]);

    // 턴 종료 시 승리/패배 체크
    const etherVictoryNow = nextEnemyPtsSnapshot !== null && nextEnemyPtsSnapshot <= 0;
    const etherVictoryImmediate = nextEnemyPts <= 0;
    if (enemy.hp <= 0 || etherVictoryNow || etherVictoryImmediate) {
      if (etherVictoryNow || etherVictoryImmediate) {
        actions.setSoulShatter(true);
      }
      actions.setNetEtherDelta(null);
      setTimeout(() => {
        actions.setPostCombatOptions({ type: 'victory' });
        actions.setPhase('post');
      }, (etherVictoryNow || etherVictoryImmediate) ? 1200 : 500);
      return;
    }
    if (player.hp <= 0) {
      actions.setNetEtherDelta(null);
      setTimeout(() => {
        actions.setPostCombatOptions({ type: 'defeat' });
        actions.setPhase('post');
      }, 500);
      return;
    }

    actions.setTurnNumber(t => t + 1);
    actions.setNetEtherDelta(null);
    actions.setPhase('select');
  };

  const runAll = () => {
    if (battle.qIndex >= battle.queue.length) return;
    playSound(1000, 150); // 전부실행 효과음
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    let P = { ...player, def: player.def || false, block: player.block || 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, etherPts: player.etherPts || 0 };
    let E = { ...enemy, def: enemy.def || false, block: enemy.block || 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, etherPts: enemy.etherPts || 0 };
    const tempState = { player: P, enemy: E, log: [] };
    const newEvents = {};
    let enemyDefeated = false;

    for (let i = qIndex; i < battle.queue.length; i++) {
      const a = battle.queue[i];

      // 적이 이미 죽었으면 적의 행동은 건너뛰기
      if (enemyDefeated && a.actor === 'enemy') {
        continue;
      }

      const { events } = applyAction(tempState, a.actor, a.card);
      newEvents[i] = events;
      events.forEach(ev => addLog(ev.msg));

      // 카드 사용 시 에테르 누적 (실제 적용은 턴 종료 시)
      if (a.actor === 'player') {
        const gain = Math.floor(getCardEtherGain(a.card) * passiveRelicEffects.etherMultiplier);
        actions.setTurnEtherAccumulated(turnEtherAccumulated + gain);
      } else if (a.actor === 'enemy') {
        actions.setEnemyTurnEtherAccumulated(enemyTurnEtherAccumulated + getCardEtherGain(a.card));
      }

      if (P.hp <= 0) {
        actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 });
        actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 });
        actions.setActionEvents({ ...battle.actionEvents, ...newEvents });
        actions.setQIndex(i + 1);
        actions.setPostCombatOptions({ type: 'defeat' }); actions.setPhase('post');
        return;
      }
      if (E.hp <= 0 && !enemyDefeated) {
        // 몬스터 죽음 애니메이션 및 사운드
        actions.setEnemyHit(true);
        playSound(200, 500);
        addLog('💀 적 처치! 남은 적 행동 건너뛰기');
        enemyDefeated = true;
        // 계속 진행 (플레이어의 남은 행동 처리)
      }
    }
    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1 });
    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1 });
    actions.setActionEvents({ ...battle.actionEvents, ...newEvents });
    actions.setQIndex(battle.queue.length);

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
        selectedCards: battle.selected.length
      });

      // 1단계: 합계 강조
      actions.setEtherCalcPhase('sum');
      setTimeout(() => {
        // 2단계: 곱셈 강조 + 명쾌한 사운드
        actions.setEtherCalcPhase('multiply');
        playSound(800, 100); // 명쾌한 사운드
        setTimeout(() => {
          // 3단계: 디플레이션 배지 애니메이션 + 저음 사운드
          if (playerDeflation.usageCount > 0) {
            actions.setEtherCalcPhase('deflation');
            playSound(200, 150); // 저음 사운드
          }
          setTimeout(() => {
            // 4단계: 최종값 표시 + 묵직한 사운드
            actions.setEtherCalcPhase('result');
            // 최종값은 finishTurn에서 설정됨 (애니메이션 시점의 값은 부정확)
            playSound(400, 200); // 묵직한 사운드
          }, playerDeflation.usageCount > 0 ? 400 : 0);
        }, 600);
      }, 400);
    }
  };

  const removeSelectedAt = (i) => actions.setSelected(battle.selected.filter((_, idx) => idx !== i));

  const playerTimeline = useMemo(() => {
    if (battle.phase === 'select') {
      // 현재 선택된 카드들의 조합 감지
      const currentCombo = detectPokerCombo(selected);
      const comboCardCosts = new Set();
      if (currentCombo?.bonusKeys) {
        currentCombo.bonusKeys.forEach(cost => comboCardCosts.add(cost));
      }
      const isFlush = currentCombo?.name === '플러쉬';

      let ps = 0;
      return battle.selected.map((c, idx) => {
        // 카드가 조합에 포함되는지 확인
        const isInCombo = isFlush || comboCardCosts.has(c.actionCost);
        const usageCount = player.comboUsageCount?.[c.id] || 0;
        const enhancedCard = applyTraitModifiers(c, {
          usageCount,
          isInCombo,
        });
        const finalSpeed = applyAgility(enhancedCard.speedCost, effectiveAgility);
        ps += finalSpeed;
        return { actor: 'player', card: enhancedCard, sp: ps, idx, finalSpeed };
      });
    }
    if (battle.phase === 'respond' && fixedOrder) return fixedOrder.filter(x => x.actor === 'player');
    if (battle.phase === 'resolve') return battle.queue.filter(x => x.actor === 'player');
    return [];
  }, [battle.phase, battle.selected, fixedOrder, battle.queue, player.comboUsageCount, effectiveAgility]);

  const enemyTimeline = useMemo(() => {
    // 선택 단계에서는 통찰이 없으면 적 타임라인을 숨긴다
    if (battle.phase === 'select') {
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
    if (battle.phase === 'respond' && fixedOrder) return fixedOrder.filter(x => x.actor === 'enemy');
    if (battle.phase === 'resolve') return queue.filter(x => x.actor === 'enemy');
    return [];
  }, [battle.phase, fixedOrder, queue, enemyPlan.actions, insightReveal]);

  if (!enemy) return <div className="text-white p-4">로딩…</div>;

  const enemyNameCounts = useMemo(() => {
    const counts = {};
    (enemy.composition || []).forEach((m) => {
      const key = m?.name || '몬스터';
      counts[key] = (counts[key] || 0) + 1;
    });
    const base = enemy?.name || '몬스터';
    if (!counts[base]) counts[base] = enemy?.count || enemy?.quantity || 1;
    return counts;
  }, [enemy?.composition, enemy?.name, enemy?.count, enemy?.quantity]);

  const groupedEnemyMembers = useMemo(() => {
    const list = enemy?.composition && enemy.composition.length > 0
      ? enemy.composition
      : [{ name: enemy?.name || '몬스터', emoji: enemy?.emoji || '👹', count: enemy?.count || enemy?.quantity || 1 }];

    const map = new Map();
    list.forEach((m) => {
      const name = m?.name || '몬스터';
      const emoji = m?.emoji || '👹';
      const increment = m?.count || 1;
      if (!map.has(name)) {
        map.set(name, { name, emoji, count: increment });
      } else {
        const cur = map.get(name);
        map.set(name, { ...cur, count: cur.count + increment });
      }
    });
    return Array.from(map.values());
  }, [enemy?.composition, enemy?.name, enemy?.emoji, enemy?.count, enemy?.quantity]);

  const handDisabled = (c) => (
    battle.selected.length >= MAX_SUBMIT_CARDS ||
    totalSpeed + applyAgility(c.speedCost, effectiveAgility) > player.maxSpeed ||
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
    (battle.phase === 'select' && insightVisible && insightLevelSelect >= 2) ||
    (battle.phase === 'respond' && insightVisible && insightLevelSelect >= 1) ||
    battle.phase === 'resolve';
  const enemyOverdriveVisible = canRevealOverdrive && (enemyWillOverdrivePlan || enemy?.etherOverdriveActive);
  const enemyOverdriveLabel = enemy?.etherOverdriveActive ? '기원 발동' : '기원 예정';
  const rawNetDelta = (battle.phase === 'resolve' && etherFinalValue !== null && enemyEtherFinalValue !== null)
    ? (etherFinalValue - enemyEtherFinalValue)
    : null;

  const netFinalEther = netEtherDelta !== null
    ? netEtherDelta
    : rawNetDelta;
  const enemyCapacity = enemy?.etherCapacity ?? Math.max(enemyEtherValue, 1);
  const enemySoulScale = Math.max(0.4, Math.min(1.3, enemyCapacity > 0 ? enemyEtherValue / enemyCapacity : 1));

  // 배율 경로 로그 (실시간 계산과 동일한 입력 사용)
  const comboStepsLog = useMemo(() => {
    if (!currentCombo) return [];
    const baseMultiplier = currentCombo ? (COMBO_MULTIPLIERS[currentCombo.name] || 1) : 1;
    const isResolve = battle.phase === 'resolve';
    const cardsCount = isResolve ? resolvedPlayerCards : battle.selected.length;
    const allowRefBook = isResolve ? (battle.qIndex >= battle.queue.length) : false;
    const { steps } = explainComboMultiplier(baseMultiplier, cardsCount, true, allowRefBook, orderedRelicList);
    return steps || [];
  }, [currentCombo, resolvedPlayerCards, battle.selected.length, battle.phase, battle.qIndex, battle.queue.length, explainComboMultiplier, orderedRelicList]);

  // 에테르 획득량 미리보기 계산
  const previewEtherGain = useMemo(() => {
    if (playerTimeline.length === 0) return 0;

    // 희귀한 조약돌 효과 적용된 카드당 에테르
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    const totalEtherPts = calcCardsEther(playerTimeline, passiveRelicEffects.etherMultiplier);

    // 조합 배율 계산 (selected 기준으로 조합 감지) - 미리보기는 순수 콤보만
    const pCombo = detectPokerCombo(selected);
    const basePlayerComboMult = pCombo ? (COMBO_MULTIPLIERS[pCombo.name] || 1) : 1;
    const playerComboMult = basePlayerComboMult;
    let playerBeforeDeflation = Math.round(totalEtherPts * playerComboMult);

    // 디플레이션 적용
    const playerDeflation = pCombo?.name
      ? applyEtherDeflation(playerBeforeDeflation, pCombo.name, player.comboUsageCount || {})
      : { gain: playerBeforeDeflation, multiplier: 1, usageCount: 0 };

    return playerDeflation.gain;
  }, [playerTimeline, selected, relics, player.comboUsageCount]);

  // 적 조합 감지 (표시용)
  const enemyCombo = useMemo(() => detectPokerCombo(enemyPlan.actions || []), [enemyPlan.actions]);

  // 적 성향 힌트 추출
  const enemyHint = useMemo(() => {
    const hintLog = battle.log.find(line => line.includes('적 성향 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 성향 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [battle.log]);

  // 예상 피해량 계산 및 사운드
  useEffect(() => {
    if (!(battle.phase === 'select' || battle.phase === 'respond') || !enemy) {
      actions.setPreviewDamage({ value: 0, lethal: false, overkill: false });
      lethalSoundRef.current = false;
      overkillSoundRef.current = false;
      return;
    }
    const order = (fixedOrder && fixedOrder.length > 0) ? fixedOrder : playerTimeline;
    if (!order || order.length === 0) {
      actions.setPreviewDamage({ value: 0, lethal: false, overkill: false });
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
    actions.setPreviewDamage({ value, lethal, overkill });
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
  }, [battle.phase, player, enemy, fixedOrder, playerTimeline, willOverdrive, enemyPlan.mode, enemyPlan.actions]);

  return (
    <div className="legacy-battle-root w-full min-h-screen pb-64">
      {/* 에테르 게이지 - 왼쪽 고정 */}
      <div style={{
        position: 'fixed',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100
      }}>
        <EtherBar
          key={`player-ether-${playerEtherValue}`}
          pts={playerEtherValue}
          slots={playerEtherSlots}
          previewGain={previewEtherGain}
          label="ETHER"
          pulse={playerTransferPulse}
          showBarTooltip={showBarTooltip}
          showPtsTooltip={showPtsTooltip}
        />
      </div>
      {/* 예상 피해량 - 오른쪽 고정 패널 */}
      <div className="expect-sidebar-fixed">
        <ExpectedDamagePreview
          player={player}
          enemy={enemy}
          fixedOrder={fixedOrder || playerTimeline}
          willOverdrive={willOverdrive}
          enemyMode={enemyPlan.mode}
          enemyActions={enemyPlan.actions}
          phase={battle.phase}
          log={log}
          qIndex={battle.qIndex}
          queue={battle.queue}
          stepOnce={stepOnce}
          runAll={runAll}
          finishTurn={finishTurn}
          postCombatOptions={postCombatOptions}
          handleExitToMap={handleExitToMap}
          autoProgress={autoProgress}
          setAutoProgress={actions.setAutoProgress}
          resolveStartPlayer={resolveStartPlayer}
          resolveStartEnemy={resolveStartEnemy}
          turnNumber={turnNumber}
        />
        {/* 배율 경로: 단계와 무관하게 항상 표시 */}
        {comboStepsLog.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.2)', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, marginBottom: '6px', color: '#fbbf24' }}>🧮 배율 경로</div>
            {comboStepsLog.map((step, idx) => (
              <div key={idx} style={{ color: '#cbd5e1' }}>{idx + 1}. {step}</div>
            ))}
          </div>
        )}
      </div>

      <TimelineDisplay
        player={player}
        enemy={enemy}
        DEFAULT_PLAYER_MAX_SPEED={DEFAULT_PLAYER_MAX_SPEED}
        DEFAULT_ENEMY_MAX_SPEED={DEFAULT_ENEMY_MAX_SPEED}
        generateSpeedTicks={generateSpeedTicks}
        battle={battle}
        timelineProgress={timelineProgress}
        timelineIndicatorVisible={timelineIndicatorVisible}
        insightAnimLevel={insightAnimLevel}
        insightAnimPulseKey={insightAnimPulseKey}
        enemyOverdriveVisible={enemyOverdriveVisible}
        enemyOverdriveLabel={enemyOverdriveLabel}
        dulledLevel={dulledLevel}
        playerTimeline={playerTimeline}
        queue={queue}
        executingCardIndex={executingCardIndex}
        usedCardIndices={usedCardIndices}
        qIndex={qIndex}
        enemyTimeline={enemyTimeline}
        effectiveInsight={effectiveInsight}
        insightReveal={insightReveal}
        actions={actions}
      />

      {/* 상단 메인 영역 */}
      <div>

        {/* 플레이어/적 정보 + 중앙 정보 통합 레이아웃 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', marginBottom: '50px', gap: '120px', position: 'relative', marginTop: '40px', paddingRight: '40px' }}>
          <EtherComparisonBar
            battle={battle}
            etherFinalValue={etherFinalValue}
            enemyEtherFinalValue={enemyEtherFinalValue}
            netFinalEther={netFinalEther}
            position="top"
          />

          {/* 왼쪽: 플레이어 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'flex-end', paddingTop: '200px' }}>
            <PlayerEtherBox
              currentCombo={currentCombo}
              battle={battle}
              currentDeflation={currentDeflation}
              etherCalcPhase={etherCalcPhase}
              turnEtherAccumulated={turnEtherAccumulated}
              etherPulse={etherPulse}
              finalComboMultiplier={finalComboMultiplier}
              multiplierPulse={multiplierPulse}
            />
            <PlayerHpBar
              player={player}
              playerHit={playerHit}
              playerBlockAnim={playerBlockAnim}
              playerOverdriveFlash={playerOverdriveFlash}
              effectiveAgility={effectiveAgility}
              dulledLevel={dulledLevel}
            />
          </div>

          <CentralPhaseDisplay
            battle={battle}
            totalSpeed={totalSpeed}
            MAX_SPEED={MAX_SPEED}
            MAX_SUBMIT_CARDS={MAX_SUBMIT_CARDS}
            redrawHand={redrawHand}
            canRedraw={canRedraw}
            startResolve={startResolve}
            playSound={playSound}
            actions={actions}
            willOverdrive={willOverdrive}
            etherSlots={etherSlots}
            player={player}
            beginResolveFromRespond={beginResolveFromRespond}
            rewindToSelect={rewindToSelect}
            rewindUsed={rewindUsed}
            respondSnapshot={respondSnapshot}
            autoProgress={autoProgress}
            etherFinalValue={etherFinalValue}
            enemy={enemy}
            finishTurn={finishTurn}
          />

          <EtherComparisonBar
            battle={battle}
            etherFinalValue={etherFinalValue}
            enemyEtherFinalValue={enemyEtherFinalValue}
            netFinalEther={netFinalEther}
            position="bottom"
          />

          {/* 오른쪽: 적 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center', paddingTop: '120px' }}>
            {soulShatter && (
              <div className="soul-shatter-banner">
                <div className="soul-shatter-text">영혼파괴!</div>
              </div>
            )}
            <EnemyEtherBox
              enemyCombo={enemyCombo}
              battle={battle}
              insightReveal={insightReveal}
              enemyCurrentDeflation={enemyCurrentDeflation}
              enemyEtherCalcPhase={enemyEtherCalcPhase}
              enemyTurnEtherAccumulated={enemyTurnEtherAccumulated}
              COMBO_MULTIPLIERS={COMBO_MULTIPLIERS}
            />
            <EnemyHpBar
              battle={battle}
              previewDamage={previewDamage}
              dulledLevel={dulledLevel}
              enemy={enemy}
              enemyHit={enemyHit}
              enemyBlockAnim={enemyBlockAnim}
              soulShatter={soulShatter}
              groupedEnemyMembers={groupedEnemyMembers}
              enemyOverdriveFlash={enemyOverdriveFlash}
              enemyEtherValue={enemyEtherValue}
              enemyTransferPulse={enemyTransferPulse}
              enemySoulScale={enemySoulScale}
              formatCompactValue={formatCompactValue}
            />
          </div>
        </div>
      </div>


      {/* 독립 활동력 표시 (좌측 하단 고정) */}
      {(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="energy-display-fixed">
          <div className="energy-orb-compact">
            {remainingEnergy} / {player.maxEnergy}
          </div>
        </div>
      )}

      {/* 간소화/정렬 버튼 (우측 하단 고정) */}
      {battle.phase === 'select' && (
        <div className="submit-button-fixed" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => {
            const newVal = !isSimplified;
            try { localStorage.setItem('battleIsSimplified', newVal.toString()); } catch { }
            actions.setIsSimplified(newVal);
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
      <HandArea
        battle={battle}
        player={player}
        enemy={enemy}
        selected={selected}
        getSortedHand={getSortedHand}
        toggle={toggle}
        handDisabled={handDisabled}
        showCardTraitTooltip={showCardTraitTooltip}
        hideCardTraitTooltip={hideCardTraitTooltip}
        formatSpeedText={formatSpeedText}
        renderNameWithBadge={renderNameWithBadge}
        fixedOrder={fixedOrder}
        moveUp={moveUp}
        moveDown={moveDown}
        queue={queue}
        usedCardIndices={usedCardIndices}
        disappearingCards={disappearingCards}
        hiddenCards={hiddenCards}
        disabledCardIndices={disabledCardIndices}
        isSimplified={isSimplified}
      />

      {showCharacterSheet && <CharacterSheet onClose={closeCharacterSheet} />}

      <BattleTooltips
        tooltipVisible={tooltipVisible}
        hoveredCard={hoveredCard}
        battle={battle}
        hoveredEnemyAction={hoveredEnemyAction}
        insightReveal={insightReveal}
        effectiveInsight={effectiveInsight}
      />
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
