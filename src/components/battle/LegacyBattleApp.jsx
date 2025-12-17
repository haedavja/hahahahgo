import { useState, useEffect, useMemo, useRef, useCallback, useReducer } from "react";
import { flushSync } from "react-dom";
import "./legacy-battle.css";
import { playHitSound, playBlockSound, playCardSubmitSound, playProceedSound, playParrySound } from "../../lib/soundUtils";
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
import { ItemSlots } from "./ui/ItemSlots";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_EFFECT, applyRelicEffects, applyRelicComboMultiplier, RELIC_RARITY_COLORS } from "../../lib/relics";
import { applyAgility } from "../../lib/agilityUtils";
import { choice, hasTrait, applyTraitModifiers, applyStrengthToCard, applyStrengthToHand, getCardRarity } from "./utils/battleUtils";
import { detectPokerCombo, applyPokerBonus } from "./utils/comboDetection";
import { COMBO_MULTIPLIERS, BASE_ETHER_PER_CARD, CARD_ETHER_BY_RARITY, applyEtherDeflation, getCardEtherGain, calcCardsEther, calculateComboEtherGain } from "./utils/etherCalculations";
import { sortCombinedOrderStablePF, addEther } from "./utils/combatUtils";
import { createFixedOrder } from "./utils/cardOrdering";
import { decideEnemyMode, generateEnemyActions, shouldEnemyOverdrive } from "./utils/enemyAI";
import { simulatePreview } from "./utils/battleSimulation";
import { applyAction, prepareMultiHitAttack, calculateSingleHit, finalizeMultiHitAttack } from "./logic/combatActions";
import { drawCharacterBuildHand } from "./utils/handGeneration";
import { calculateEffectiveInsight, getInsightRevealLevel, playInsightSound } from "./utils/insightSystem";
import { computeComboMultiplier as computeComboMultiplierUtil, explainComboMultiplier as explainComboMultiplierUtil } from "./utils/comboMultiplier";
import { processCardTraitEffects } from "./utils/cardTraitEffects";
import { calculateEtherTransfer } from "./utils/etherTransfer";
import { formatCompactValue } from "./utils/formatUtils";
import { calculateTurnEndEther, formatPlayerEtherLog, formatEnemyEtherLog } from "./utils/turnEndEtherCalculation";
import { updateComboUsageCount, createTurnEndPlayerState, createTurnEndEnemyState, checkVictoryCondition } from "./utils/turnEndStateUpdate";
import { processImmediateCardTraits, processCardPlayedRelicEffects } from "./utils/cardImmediateEffects";
import { collectTriggeredRelics, playRelicActivationSequence } from "./utils/relicActivationAnimation";
import { processActionEventAnimations } from "./utils/eventAnimationProcessing";
import { processStunEffect } from "./utils/stunProcessing";
import { setupParryReady, checkParryTrigger, resetParryState } from "./utils/parryProcessing";
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from "./utils/etherAccumulationProcessing";
import { processEnemyDeath } from "./utils/enemyDeathProcessing";
import { playTurnEndRelicAnimations, applyTurnEndRelicEffectsToNextTurn } from "./utils/turnEndRelicEffectsProcessing";
import { startEtherCalculationAnimationSequence } from "./utils/etherCalculationAnimation";
import { renderRarityBadge, renderNameWithBadge, getCardDisplayRarity } from "./utils/cardRenderingUtils";
import { startEnemyEtherAnimation } from "./utils/enemyEtherAnimation";
import { processQueueCollisions } from "./utils/cardSpecialEffects";
import { processReflections, initReflectionState, resetTurnReflectionEffects, decreaseEnemyFreeze } from "../../lib/reflectionEffects";
import { clearTurnTokens, addToken, removeToken, getAllTokens } from "../../lib/tokenUtils";
import { convertTraitsToIds } from "../../data/reflections";
import { processEtherTransfer } from "./utils/etherTransferProcessing";
import { processVictoryDefeatTransition } from "./utils/victoryDefeatTransition";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
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
import { BreachSelectionModal } from "./ui/BreachSelectionModal";
import { CardRewardModal } from "./ui/CardRewardModal";
import { EtherBar } from "./ui/EtherBar";
import { Sword, Shield, Heart, Zap, Flame, Clock, Skull, X, ChevronUp, ChevronDown, Play, StepForward, RefreshCw, ICON_MAP } from "./ui/BattleIcons";
import { selectBattleAnomalies, applyAnomalyEffects, formatAnomaliesForDisplay } from "../../lib/anomalyUtils";
import { AnomalyDisplay, AnomalyNotification } from "./ui/AnomalyDisplay";
import { TIMING, createStepOnceAnimations, executeCardActionCore, finishTurnCore, runAllCore } from "./logic/battleExecution";
import { processTimelineSpecials, hasSpecial, processPerHitRoulette, processCardPlaySpecials } from "./utils/cardSpecialEffects";


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
// Game Component
// =====================
function Game({ initialPlayer, initialEnemy, playerEther = 0, onBattleResult, liveInsight }) {
  const playerStrength = useGameStore((state) => state.playerStrength || 0);
  const playerAgility = useGameStore((state) => state.playerAgility || 0);
  const relics = useGameStore((state) => state.relics || []);
  const devDulledLevel = useGameStore((state) => state.devDulledLevel ?? null);
  const devForcedAnomalies = useGameStore((state) => state.devForcedAnomalies ?? null);
  const mapRisk = useGameStore((state) => state.mapRisk || 0);
  const playerTraits = useGameStore((state) => state.playerTraits || []);
  const playerEgos = useGameStore((state) => state.playerEgos || []);
  const mergeRelicOrder = useCallback((relicList = [], saved = []) => {
    const savedSet = new Set(saved);
    const merged = [];
    // 1) 저장된 순서 중 현재 보유 중인 것만 유지
    saved.forEach(id => { if (relicList.includes(id)) merged.push(id); });
    // 2) 새로 생긴 상징은 현재 보유 순서대로 뒤에 추가
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

  // 이변 시스템: 전투 시작 시 이변 선택
  const [activeAnomalies, setActiveAnomalies] = useState([]);
  const [showAnomalyNotification, setShowAnomalyNotification] = useState(false);

  const safeInitialPlayer = initialPlayer || {};
  const safeInitialEnemy = initialEnemy || {};
  const enemyCount = safeInitialEnemy.enemyCount ?? 1; // Extract enemy count for multi-enemy battles

  // 이변 선택 및 적용 (전투 시작 전)
  const isBoss = safeInitialEnemy.type === 'boss' || safeInitialEnemy.isBoss;
  const selectedAnomalies = useMemo(() => {
    return selectBattleAnomalies(mapRisk, isBoss, devForcedAnomalies);
  }, [mapRisk, isBoss, devForcedAnomalies]);

  // 이변 효과를 초기 플레이어 상태에 적용
  const playerWithAnomalies = useMemo(() => {
    if (selectedAnomalies.length === 0) return safeInitialPlayer;
    const anomalyResult = applyAnomalyEffects(selectedAnomalies, safeInitialPlayer, useGameStore.getState());
    return anomalyResult.player;
  }, [selectedAnomalies, safeInitialPlayer]);

  const passiveRelicStats = calculatePassiveEffects(orderedRelicList);
  // 전투 시작 에너지는 payload에서 계산된 값을 신뢰하고, 없을 때만 기본값 사용
  const baseEnergy = playerWithAnomalies.energy ?? BASE_PLAYER_ENERGY;
  // 이변 패널티를 고려한 최대 행동력 계산
  const energyPenalty = playerWithAnomalies.energyPenalty || 0;
  const baseMaxEnergy = Math.max(0, (playerWithAnomalies.maxEnergy ?? baseEnergy) - energyPenalty);
  // 민첩도 payload에 값이 있으면 우선 사용하고, 없으면 스토어 값을 사용
  const effectiveAgility = playerWithAnomalies.agility ?? playerAgility ?? 0;
  const effectiveCardDrawBonus = passiveRelicStats.cardDrawBonus || 0;
  // 슈퍼-장갑 상징: 최대 카드 제출 수 (0이면 기본값 5 사용)
  const baseMaxSubmitCards = passiveRelicStats.maxSubmitCards > 0
    ? passiveRelicStats.maxSubmitCards
    : MAX_SUBMIT_CARDS + (passiveRelicStats.extraCardPlay || 0);
  const startingEther = typeof playerWithAnomalies.etherPts === 'number' ? playerWithAnomalies.etherPts : playerEther;
  const startingBlock = playerWithAnomalies.block ?? 0; // 상징 효과로 인한 시작 방어력
  const startingStrength = playerWithAnomalies.strength ?? playerStrength ?? 0; // 전투 시작 힘 (상징 효과 포함)
  const startingInsight = playerWithAnomalies.insight ?? 0; // 통찰

  const initialPlayerState = {
    hp: playerWithAnomalies.hp ?? 30,
    maxHp: playerWithAnomalies.maxHp ?? playerWithAnomalies.hp ?? 30,
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
    // 이변 패널티와 상징 효과를 고려한 최대 속도 계산
    maxSpeed: Math.max(0, (playerWithAnomalies.maxSpeed ?? DEFAULT_PLAYER_MAX_SPEED) + (passiveRelicStats.maxSpeed || 0) + (passiveRelicStats.speed || 0) - (playerWithAnomalies.speedPenalty || 0)),
    tokens: playerWithAnomalies.tokens || { usage: [], turn: [], permanent: [] },
    // 이변 효과 플래그 보존
    etherBan: playerWithAnomalies.etherBan || false,
    energyPenalty: playerWithAnomalies.energyPenalty || 0,
    speedPenalty: playerWithAnomalies.speedPenalty || 0,
    drawPenalty: playerWithAnomalies.drawPenalty || 0,
    insightPenalty: playerWithAnomalies.insightPenalty || 0
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
      maxSpeed: safeInitialEnemy.maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED,
      tokens: { usage: [], turn: [], permanent: [] }
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
      extraCardPlay: 0,
    },
    reflectionState: initReflectionState(),
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

  // 정신집중 토큰에서 추가 카드 사용 수 계산
  const playerTokensForCardPlay = player?.tokens ? getAllTokens({ tokens: player.tokens }) : [];
  const focusTokenForCardPlay = playerTokensForCardPlay.find(t => t.effect?.type === 'FOCUS');
  const focusExtraCardPlayBonus = focusTokenForCardPlay ? 2 * (focusTokenForCardPlay.stacks || 1) : 0;

  // 동적 최대 카드 제출 수 (상징 효과 + nextTurnEffects.extraCardPlay + 정신집중 토큰)
  const effectiveMaxSubmitCards = baseMaxSubmitCards + (battle.nextTurnEffects?.extraCardPlay || 0) + focusExtraCardPlayBonus;

  // 전투용 아이템 효과 처리 - useItem 시 바로 처리하도록 변경
  // (무한 루프 방지를 위해 useEffect 대신 직접 호출 방식 사용)

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

  // 상징 UI
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

  // 새 상징 추가/제거 시 기존 순서를 유지하면서 병합
  // 진행 단계에서는 동기화/변경을 막아 일관성 유지
  useEffect(() => {
    if (battle.phase === 'resolve') return;
    actions.setOrderedRelics(mergeRelicOrder(relics, orderedRelicList));
  }, [relics, mergeRelicOrder, battle.phase, orderedRelicList]);

  // 개발자 모드에서 힘이 변경될 때 실시간 반영
  useEffect(() => {
    if (battle.phase === 'resolve') return;
    const currentStrength = player.strength || 0;
    if (currentStrength !== playerStrength) {
      actions.setPlayer({ ...player, strength: playerStrength });
    }
  }, [playerStrength]);

  // addLog는 actions.addLog를 직접 사용 (stale closure 방지)
  const addLog = useCallback((m) => {
    actions.addLog(m);
  }, [actions]);
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
  const dragRelicIndexRef = useRef(null); // 상징 드래그 인덱스
  const battleRef = useRef(battle); // battle 상태를 ref로 유지 (setTimeout closure 문제 해결)
  const displayEtherMultiplierRef = useRef(1); // 애니메이션 표시용 에테르 배율 (리셋되어도 유지)
  const [parryReadyStates, setParryReadyStates] = useState([]); // 쳐내기 패리 대기 상태 배열 (렌더링용)
  const parryReadyStatesRef = useRef([]); // 쳐내기 패리 대기 상태 배열 (setTimeout용)
  const growingDefenseRef = useRef(null); // 방어자세: { activatedSp, lastProcessedSp }

  // 브리치 카드 선택 상태
  const [breachSelection, setBreachSelection] = useState(null); // { cards: [], breachSp: number, breachCard: object }
  const breachSelectionRef = useRef(null);
  const stepOnceRef = useRef(null); // stepOnce 함수 참조 (브리치 선택 후 진행 재개용)
  const timelineAnimationRef = useRef(null); // 타임라인 진행 애니메이션 ref

  // 카드 보상 선택 상태 (승리 후)
  const [cardReward, setCardReward] = useState(null); // { cards: [] }

  // battle 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    battleRef.current = battle;
  }, [battle]);

  // resolve 단계 진입 시 에테르 배율 캡처 (애니메이션 중 리셋되어도 표시 유지)
  useEffect(() => {
    if (battle.phase === 'resolve') {
      displayEtherMultiplierRef.current = player.etherMultiplier || 1;
    }
  }, [battle.phase]);

  const computeComboMultiplier = useCallback((baseMult, cardsCount, includeFiveCard = true, includeRefBook = true, relicOrderOverride = null) => {
    return computeComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicOrderOverride, orderedRelicList);
  }, [orderedRelicList]);

  const explainComboMultiplier = useCallback((baseMult, cardsCount, includeFiveCard = true, includeRefBook = true, relicOrderOverride = null) => {
    return explainComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicOrderOverride, orderedRelicList);
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

  // 통찰 레벨: insight - shroud - insightPenalty (-3 ~ +3)
  // -3: 망각, -2: 미련, -1: 우둔, 0: 평온, +1: 예측, +2: 독심, +3: 혜안
  const insightLevel = useMemo(() => {
    const shroud = enemy?.shroud || 0;
    const insight = player.insight || 0;
    // 이변 패널티 적용
    const insightPenalty = player.insightPenalty || 0;
    const base = Math.max(-3, Math.min(3, insight - shroud - insightPenalty));
    if (devDulledLevel !== null && devDulledLevel !== undefined) {
      // devDulledLevel은 이제 insight의 음수 값으로 저장됨 (insight = -devDulledLevel)
      // 예: devDulledLevel = -3 → insightLevel = 3 (혜안)
      // 예: devDulledLevel = 1 → insightLevel = -1 (우둔)
      return Math.max(-3, Math.min(3, -devDulledLevel));
    }
    return base;
  }, [player.insight, player.insightPenalty, enemy?.shroud, devDulledLevel]);

  // 하위 호환성을 위한 dulledLevel (우둔 레벨만, 0~3)
  const dulledLevel = Math.max(0, -insightLevel);

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
    const hasTraits = card?.traits && card.traits.length > 0;
    const hasAppliedTokens = card?.appliedTokens && card.appliedTokens.length > 0;
    if ((!hasTraits && !hasAppliedTokens) || !cardElement) return;
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
      ? drawCharacterBuildHand(currentBuild, {}, [], effectiveCardDrawBonus, escapeBanRef.current, battle.vanishedCards || [])
      : CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
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
    // 참고: turnStartProcessedRef는 player init에서 이미 리셋됨
    // 여기서 다시 리셋하면 턴 시작 효과가 두 번 발동됨
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

  // 이변 알림 표시 (전투 시작 시 한 번만)
  const anomalyNotificationShownRef = useRef(false);

  useEffect(() => {
    if (enemy && selectedAnomalies.length > 0 && !anomalyNotificationShownRef.current) {
      console.log('[Anomaly System] Showing notification for', selectedAnomalies.length, 'anomalies');

      // 이변 로그 추가
      selectedAnomalies.forEach(({ anomaly, level }) => {
        const effect = anomaly.getEffect(level);
        addLog(`⚠️ ${anomaly.emoji} ${anomaly.name} (Lv.${level}): ${effect.description}`);
      });

      // 이변 알림 표시
      setActiveAnomalies(selectedAnomalies);
      setShowAnomalyNotification(true);
      anomalyNotificationShownRef.current = true;
    }
  }, [enemy, selectedAnomalies]);

  useEffect(() => {
    if (!enemy) {
      const e = ENEMIES[enemyIndex];
      actions.setEnemy({ ...e, hp: e.hp, maxHp: e.hp, vulnMult: 1, vulnTurns: 0, block: 0, counter: 0, etherPts: 0, etherOverdriveActive: false, maxSpeed: e.maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED });

      // 전투 시작 상징 효과 로그 및 애니메이션
      const combatStartEffects = applyCombatStartEffects(orderedRelicList, {});

      // 전투 시작 상징 애니메이션
      orderedRelicList.forEach(relicId => {
        const relic = RELICS[relicId];
        if (relic?.effects?.type === 'ON_COMBAT_START') {
          actions.setRelicActivated(relicId);
          playSound(800, 200);
          setTimeout(() => actions.setRelicActivated(null), 500);
        }
      });

      if (combatStartEffects.damage > 0) {
        addLog(`⛓️ 상징 효과: 체력 -${combatStartEffects.damage} (피의 족쇄)`);
      }
      if (combatStartEffects.strength > 0) {
        addLog(`💪 상징 효과: 힘 +${combatStartEffects.strength}`);
      }
      if (combatStartEffects.block > 0) {
        addLog(`🛡️ 상징 효과: 방어력 +${combatStartEffects.block}`);
      }
      if (combatStartEffects.heal > 0) {
        addLog(`💚 상징 효과: 체력 +${combatStartEffects.heal}`);
      }

      // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
      const currentBuild = useGameStore.getState().characterBuild;
      const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
      const rawHand = hasCharacterBuild
        ? drawCharacterBuildHand(currentBuild, nextTurnEffects, [], effectiveCardDrawBonus, escapeBanRef.current, vanishedCards)
        : CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
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
    console.log('[턴시작 useEffect] 트리거됨:', {
      hasEnemy: !!enemy,
      phase: battle.phase,
      turnStartProcessed: turnStartProcessedRef.current,
      manuallyModified: battle.enemyPlan.manuallyModified
    });

    if (!enemy || battle.phase !== 'select') {
      // phase가 select가 아니면 플래그 리셋
      if (battle.phase !== 'select') {
        turnStartProcessedRef.current = false;
      }
      console.log('[턴시작 useEffect] 조기 리턴 (enemy 또는 phase 조건)');
      return;
    }

    // 턴 시작 효과가 이미 처리되었으면 중복 실행 방지
    if (turnStartProcessedRef.current) {
      console.log('[턴시작 useEffect] 조기 리턴 (이미 처리됨)');
      return;
    }
    turnStartProcessedRef.current = true;
    console.log('[턴시작 useEffect] 턴 시작 처리 진행');

    actions.setFixedOrder(null);
    actions.setActionEvents({});
    actions.setCanRedraw(true);
    actions.setWillOverdrive(false);

    // 상징 턴 시작 효과 적용 (피피한 갑옷 등)
    const turnStartRelicEffects = applyTurnStartEffects(orderedRelicList, nextTurnEffects);

    console.log("[턴 시작 상징 효과]", {
      block: turnStartRelicEffects.block,
      heal: turnStartRelicEffects.heal,
      energy: turnStartRelicEffects.energy
    });

    // 턴 시작 상징 발동 애니메이션
    orderedRelicList.forEach(relicId => {
      const relic = RELICS[relicId];
      if (relic?.effects?.type === 'ON_TURN_START') {
        actions.setRelicActivated(relicId);
        playSound(800, 200);
        setTimeout(() => actions.setRelicActivated(null), 500);
      }
    });

    // === 성찰 효과 처리 (자아가 있을 때만) ===
    let reflectionResult = { updatedPlayer: player, updatedBattleState: battle.reflectionState, effects: [], logs: [] };
    const hasEgo = playerEgos && playerEgos.length > 0;
    if (hasEgo) {
      const traitIds = convertTraitsToIds(playerTraits);
      const playerForReflection = {
        ...player,
        egos: playerEgos,  // 한국어 자아 이름 배열
        traits: traitIds,
        tokens: player.tokens || { usage: [], turn: [], permanent: [] }
      };
      reflectionResult = processReflections(playerForReflection, battle.reflectionState);

      console.log("[턴 시작 성찰 효과]", {
        egos: playerEgos,
        traits: traitIds,
        effects: reflectionResult.effects.map(e => e.reflectionId),
        bonusEnergy: reflectionResult.updatedBattleState.bonusEnergy,
        timelineBonus: reflectionResult.updatedBattleState.timelineBonus,
        enemyFreezeTurns: reflectionResult.updatedBattleState.enemyFreezeTurns
      });

      // 성찰 발동 시 효과음과 로그
      if (reflectionResult.effects.length > 0) {
        // 성찰 발동 효과음 (맑은 종소리 느낌)
        playSound(1200, 150);
        setTimeout(() => playSound(1500, 100), 100);
      }
      reflectionResult.logs.forEach(log => addLog(log));
    }
    // 성찰 상태 업데이트
    actions.setReflectionState(reflectionResult.updatedBattleState);

    // 특성 효과로 인한 에너지 보너스/페널티 적용
    const passiveRelicEffects = calculatePassiveEffects(orderedRelicList);
    // baseMaxEnergy는 초기 payload에서 계산된 값 (활력 각성 포함)
    // safeInitialPlayer.maxEnergy = 6 + playerEnergyBonus + passiveEffects.maxEnergy
    const baseEnergy = baseMaxEnergy;
    const reflectionEnergyBonus = reflectionResult.updatedBattleState.bonusEnergy || 0;
    const energyBonus = (nextTurnEffects.bonusEnergy || 0) + turnStartRelicEffects.energy + reflectionEnergyBonus;
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

    // 방어력과 체력 회복 적용 (성찰 회복 효과 포함)
    const reflectionHealedHp = reflectionResult.updatedPlayer.hp || player.hp;
    const newHp = Math.min(player.maxHp, reflectionHealedHp + turnStartRelicEffects.heal);
    const newBlock = (player.block || 0) + turnStartRelicEffects.block;
    const newDef = turnStartRelicEffects.block > 0; // 방어력이 있으면 def 플래그 활성화
    // 성찰 효과로 얻은 토큰 적용
    const newTokens = reflectionResult.updatedPlayer.tokens || player.tokens || { usage: [], turn: [], permanent: [] };
    // 정신집중 토큰 효과 확인
    const allPlayerTokens = getAllTokens({ tokens: newTokens });
    const focusToken = allPlayerTokens.find(t => t.effect?.type === 'FOCUS');
    const focusMaxSpeedBonus = focusToken ? 8 * (focusToken.stacks || 1) : 0;
    const focusExtraCardPlay = focusToken ? 2 * (focusToken.stacks || 1) : 0;
    // 타임라인 보너스 적용 (성찰 실행 효과 + 정신집중 토큰 + nextTurnEffects)
    const reflectionTimelineBonus = reflectionResult.updatedBattleState.timelineBonus || 0;
    const maxSpeedBonusFromEffects = (nextTurnEffects.maxSpeedBonus || 0) + focusMaxSpeedBonus;
    const newMaxSpeed = (player.maxSpeed || DEFAULT_PLAYER_MAX_SPEED) + reflectionTimelineBonus + maxSpeedBonusFromEffects;
    // 에테르 배율 적용 (성찰 완성 효과)
    const reflectionEtherMultiplier = reflectionResult.updatedBattleState.etherMultiplier || 1;
    const currentEtherMultiplier = player.etherMultiplier || 1;
    const newEtherMultiplier = currentEtherMultiplier * reflectionEtherMultiplier;
    actions.setPlayer({
      ...player,
      hp: newHp,
      block: newBlock,
      def: newDef,
      energy: finalEnergy,
      maxEnergy: baseMaxEnergy,
      maxSpeed: newMaxSpeed, // 타임라인 보너스 적용
      etherMultiplier: newEtherMultiplier, // 에테르 배율 적용
      etherOverdriveActive: false,
      etherOverflow: 0,
      strength: player.strength || 0, // 힘 유지
      tokens: newTokens // 성찰 토큰 적용
    });

    // 로그 추가
    if (turnStartRelicEffects.block > 0) {
      addLog(`🛡️ 상징 효과: 방어력 +${turnStartRelicEffects.block}`);
    }
    if (turnStartRelicEffects.heal > 0) {
      addLog(`💚 상징 효과: 체력 +${turnStartRelicEffects.heal}`);
    }
    if (turnStartRelicEffects.energy > 0) {
      addLog(`⚡ 상징 효과: 행동력 +${turnStartRelicEffects.energy}`);
    }
    if (energyBonus > 0) {
      addLog(`⚡ 다음턴 보너스 행동력: +${energyBonus}`);
    }
    if (focusToken) {
      addLog(`🧘 정신집중: 최대속도 +${focusMaxSpeedBonus}, 카드 +${focusExtraCardPlay}장`);
    }

    // 성찰 지배 효과: 적 타임라인 동결
    const reflectionFreezeTurns = reflectionResult.updatedBattleState.enemyFreezeTurns || 0;
    if (reflectionFreezeTurns > 0) {
      const currentFrozenOrder = battle.frozenOrder || 0;
      const newFrozenOrder = Math.max(currentFrozenOrder, reflectionFreezeTurns);
      actions.setFrozenOrder(newFrozenOrder);
      if (battleRef.current) {
        battleRef.current.frozenOrder = newFrozenOrder;
      }
    }

    // 매 턴 시작 시 새로운 손패 생성 (캐릭터 빌드 및 특성 효과 적용)
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const rawHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild, nextTurnEffects, battle.hand, effectiveCardDrawBonus, escapeBanRef.current, vanishedCards)
      : CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
    actions.setHand(rawHand);
    actions.setSelected([]);

    // 적 성향/행동을 턴 시작에 즉시 결정해 통찰 UI가 바로 표시되도록 함
    const mode = battle.enemyPlan.mode || decideEnemyMode();
    if (!battle.enemyPlan.mode) {
      addLog(`🤖 적 성향 힌트: ${mode.name}`);
    }
    // manuallyModified가 true면 기존 actions 유지 (카드 파괴 등으로 수동 변경된 경우)
    // battleRef에서도 최신 상태 확인 (이중 체크)
    const refEnemyPlan = battleRef.current?.enemyPlan;
    const latestManuallyModified = battle.enemyPlan.manuallyModified || refEnemyPlan?.manuallyModified;

    console.log('[턴시작 useEffect] 실행됨:', {
      closureManuallyModified: battle.enemyPlan.manuallyModified,
      refManuallyModified: refEnemyPlan?.manuallyModified,
      latestManuallyModified,
      actionsLength: battle.enemyPlan.actions?.length,
      turnStartProcessed: turnStartProcessedRef.current,
      enemyCount,
      enemyEtherPts: enemy?.etherPts
    });

    if (latestManuallyModified) {
      console.log('[턴시작 useEffect] ★ manuallyModified=true → 기존 actions 유지');
      const currentActions = refEnemyPlan?.actions || battle.enemyPlan.actions;
      actions.setEnemyPlan({ mode, actions: currentActions, manuallyModified: true });
    } else {
      const slots = etherSlots(enemy?.etherPts || 0);
      console.log('[턴시작 useEffect] ★ manuallyModified=false → 새 actions 생성:', { slots, enemyCount });
      const planActions = generateEnemyActions(enemy, mode, slots, enemyCount, enemyCount);
      console.log('[턴시작 useEffect] 생성된 planActions:', planActions?.map(a => a.name || a.type));
      actions.setEnemyPlan({ mode, actions: planActions });
    }
  }, [battle.phase, enemy, enemyPlan.mode, enemyPlan.manuallyModified, nextTurnEffects]);

  useEffect(() => {
    if (battle.phase === 'resolve' && (!queue || battle.queue.length === 0) && fixedOrder && fixedOrder.length > 0) {
      const rebuilt = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
      actions.setQueue(rebuilt); actions.setQIndex(0);
      addLog('🧯 자동 복구: 실행 큐를 다시 생성했습니다');
    }
  }, [battle.phase, battle.queue, fixedOrder]);

  // 선택 단계 진입 시 적 행동을 미리 계산해 통찰 UI가 바로 보이도록 함
  // 주의: 카드 파괴 후 재생성 방지를 위해 battleRef에서 최신 상태 확인
  useEffect(() => {
    // battleRef에서 최신 상태 확인 (closure는 stale할 수 있음)
    const currentEnemyPlan = battleRef.current?.enemyPlan;

    console.log('[선택단계 useEffect] 트리거됨:', {
      phase: battle.phase,
      closureActionsLength: enemyPlan?.actions?.length,
      closureManuallyModified: enemyPlan?.manuallyModified,
      refActionsLength: currentEnemyPlan?.actions?.length,
      refManuallyModified: currentEnemyPlan?.manuallyModified
    });

    if (battle.phase !== 'select') {
      console.log('[선택단계 useEffect] 조기 리턴 (phase !== select)');
      return;
    }

    // battleRef에서 최신 manuallyModified 확인
    const latestManuallyModified = currentEnemyPlan?.manuallyModified || enemyPlan?.manuallyModified;
    const latestActions = currentEnemyPlan?.actions || enemyPlan?.actions;
    const latestMode = currentEnemyPlan?.mode || enemyPlan?.mode;

    if (!latestMode) {
      console.log('[선택단계 useEffect] 조기 리턴 (mode 없음)');
      return;
    }

    // manuallyModified가 true면 재생성하지 않음 (카드 파괴 등으로 수동 변경된 경우)
    if ((latestActions && latestActions.length > 0) || latestManuallyModified) {
      console.log('[선택단계 useEffect] ★ 조기 리턴 (actions 있음 또는 manuallyModified=true):', {
        hasActions: latestActions?.length > 0,
        manuallyModified: latestManuallyModified
      });
      return;
    }

    console.log('[선택단계 useEffect] ★★★ 새 actions 생성! ★★★');
    const slots = etherSlots(enemy?.etherPts || 0);
    const generatedActions = generateEnemyActions(enemy, latestMode, slots, enemyCount, enemyCount);
    console.log('[선택단계 useEffect] 생성된 actions:', generatedActions?.map(a => a.name || a.type));
    actions.setEnemyPlan({ mode: latestMode, actions: generatedActions });
  }, [battle.phase, enemyPlan?.mode, enemyPlan?.actions?.length, enemyPlan?.manuallyModified, enemy]);

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

  // 상징 효과를 포함한 최종 콤보 배율 (실시간 값 기반)
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
    // __handUid 또는 __uid로 개별 카드 식별
    const cardUid = card.__handUid || card.__uid;
    const exists = selected.some(s => (s.__handUid || s.__uid) === cardUid);
    if (battle.phase === 'respond') {
      let next;
      const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
      if (exists) {
        next = selected.filter(s => (s.__handUid || s.__uid) !== cardUid);
        playSound(400, 80); // 해지 사운드 (낮은 음)
      }
      else {
        if (selected.length >= effectiveMaxSubmitCards) { addLog(`⚠️ 최대 ${effectiveMaxSubmitCards}장의 카드만 제출할 수 있습니다`); return; }
        if (totalSpeed + cardSpeed > player.maxSpeed) { addLog('⚠️ 속도 초과'); return; }
        if (totalEnergy + card.actionCost > player.maxEnergy) { addLog('⚠️ 행동력 부족'); return; }
        next = [...selected, { ...card, __uid: card.__handUid || Math.random().toString(36).slice(2) }];
        playSound(800, 80); // 선택 사운드 (높은 음)
      }
      const combo = detectPokerCombo(next);
      const enhanced = applyPokerBonus(next, combo);
      const withSp = createFixedOrder(enhanced, enemyPlan.actions, effectiveAgility);
      actions.setFixedOrder(withSp);
      actions.setSelected(next);
      return;
    }
    const cardSpeed = applyAgility(card.speedCost, effectiveAgility);
    if (exists) {
      actions.setSelected(battle.selected.filter(s => (s.__handUid || s.__uid) !== cardUid));
      playSound(400, 80); // 해지 사운드 (낮은 음)
      return;
    }
    if (battle.selected.length >= effectiveMaxSubmitCards) return addLog(`⚠️ 최대 ${effectiveMaxSubmitCards}장의 카드만 제출할 수 있습니다`);
    if (totalSpeed + cardSpeed > player.maxSpeed) return addLog('⚠️ 속도 초과');
    if (totalEnergy + card.actionCost > player.maxEnergy) return addLog('⚠️ 행동력 부족');
    actions.setSelected([...selected, { ...card, __uid: card.__handUid || Math.random().toString(36).slice(2) }]);
    playSound(800, 80); // 선택 사운드 (높은 음)
  };

  const moveUp = (i) => {
    if (i === 0) return;
    if (battle.phase === 'respond') {
      const n = [...selected];
      [n[i - 1], n[i]] = [n[i], n[i - 1]];

      const combo = detectPokerCombo(n);
      const enhanced = applyPokerBonus(n, combo);
      const withSp = createFixedOrder(enhanced, enemyPlan.actions, effectiveAgility);
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
      const withSp = createFixedOrder(enhanced, enemyPlan.actions, effectiveAgility);
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
      ? drawCharacterBuildHand(currentBuild, nextTurnEffects, hand, effectiveCardDrawBonus, escapeBanRef.current, vanishedCards)
      : CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
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
    // battleRef에서 최신 상태 가져오기 (closure는 stale할 수 있음)
    const currentBattle = battleRef.current;
    const currentEnemyPlan = currentBattle.enemyPlan;

    console.log('[startResolve] 호출됨:', {
      phase: currentBattle.phase,
      enemyActionsLength: currentEnemyPlan.actions?.length,
      manuallyModified: currentEnemyPlan.manuallyModified,
      actionsNames: currentEnemyPlan.actions?.map(a => a.name || a.type)
    });
    if (currentBattle.phase !== 'select') return;

    // manuallyModified가 true면 재생성하지 않음 (카드 파괴 등으로 수동 변경된 경우)
    const hasActions = currentEnemyPlan.actions && currentEnemyPlan.actions.length > 0;
    const willRegenerate = !(hasActions || currentEnemyPlan.manuallyModified);
    console.log('[startResolve] willRegenerate:', willRegenerate, { hasActions, manuallyModified: currentEnemyPlan.manuallyModified });

    const generatedActions = willRegenerate
        ? generateEnemyActions(enemy, currentEnemyPlan.mode, etherSlots(enemy.etherPts), enemyCount, enemyCount)
        : currentEnemyPlan.actions;
    console.log('[startResolve] generatedActions 길이:', generatedActions?.length);

    // 명시적으로 새 enemyPlan 구성
    actions.setEnemyPlan({
      mode: currentEnemyPlan.mode,
      actions: generatedActions,
      manuallyModified: currentEnemyPlan.manuallyModified
    });

    const pCombo = detectPokerCombo(selected);

    // 특성 효과 적용 (사용 횟수는 선택 단계 기준으로 고정)
    const traitEnhancedSelected = battle.selected.map(card =>
      applyTraitModifiers(card, {
        usageCount: 0,
        isInCombo: pCombo !== null,
      })
    );

    const enhancedSelected = applyPokerBonus(traitEnhancedSelected, pCombo);

    // 빙결 효과: 플레이어 카드가 모두 먼저 발동 (battle.player에서 최신 값 확인)
    const currentPlayer = currentBattle.player;
    console.log('[startResolve] 빙결 확인:', {
      enemyFrozen: currentPlayer.enemyFrozen,
      battleRefEnemyFrozen: battleRef.current?.player?.enemyFrozen,
      actionsLength: generatedActions?.length
    });
    const q = currentPlayer.enemyFrozen
      ? createFixedOrder(enhancedSelected, generatedActions, effectiveAgility)
      : sortCombinedOrderStablePF(enhancedSelected, generatedActions, effectiveAgility, 0);
    console.log('[startResolve] fixedOrder 생성됨:', {
      totalLength: q.length,
      playerCards: q.filter(x => x.actor === 'player').length,
      enemyCards: q.filter(x => x.actor === 'enemy').length
    });
    actions.setFixedOrder(q);

    // 빙결 플래그 처리 - enemyFrozen 초기화 (frozenOrder는 ItemSlots에서 이미 설정됨)
    if (currentPlayer.enemyFrozen) {
      actions.setPlayer({ ...currentPlayer, enemyFrozen: false });
      // frozenOrder가 아직 설정되지 않은 경우에만 1로 설정 (안전장치)
      const currentFrozenOrder = battleRef.current?.frozenOrder || 0;
      if (currentFrozenOrder <= 0) {
        actions.setFrozenOrder(1);
        if (battleRef.current) {
          battleRef.current.frozenOrder = 1;
        }
      }
      console.log('[startResolve] 빙결 효과 적용 - frozenOrder:', battleRef.current?.frozenOrder);
    }
    // 대응 단계 되감기용 스냅샷 저장 (전투당 1회)
    if (!rewindUsed) {
      actions.setRespondSnapshot({
        selectedSnapshot: selected,
        enemyActions: generatedActions,
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

  // respond 단계에서 적 카드 파괴 시 fixedOrder 업데이트
  useEffect(() => {
    console.log('[fixedOrder 업데이트 useEffect] 실행:', {
      phase: battle.phase,
      manuallyModified: enemyPlan.manuallyModified,
      fixedOrderLength: fixedOrder?.length,
      enemyActionsLength: enemyPlan.actions?.length
    });
    if (battle.phase !== 'respond') return;
    if (!enemyPlan.manuallyModified) return;
    if (!fixedOrder) return;

    // fixedOrder에서 파괴된 적 카드 제거 (enemyPlan.actions에 없는 적 카드)
    const remainingEnemyActions = new Set(enemyPlan.actions);
    console.log('[fixedOrder 업데이트] remainingEnemyActions Set 크기:', remainingEnemyActions.size);

    const updatedFixedOrder = fixedOrder.filter(item => {
      if (item.actor === 'player') return true;
      // 적 카드는 현재 enemyPlan.actions에 있는 것만 유지
      const isRemaining = remainingEnemyActions.has(item.card);
      console.log('[fixedOrder 필터] item.card:', item.card?.name || item.card?.type, 'isRemaining:', isRemaining);
      return isRemaining;
    });

    console.log('[fixedOrder 업데이트] 결과:', {
      originalLength: fixedOrder.length,
      updatedLength: updatedFixedOrder.length,
      removed: fixedOrder.length - updatedFixedOrder.length
    });

    if (updatedFixedOrder.length !== fixedOrder.length) {
      console.log('[fixedOrder 업데이트] setFixedOrder 호출!');
      actions.setFixedOrder(updatedFixedOrder);
    }
  }, [battle.phase, enemyPlan.actions, enemyPlan.manuallyModified, fixedOrder]);

  const beginResolveFromRespond = () => {
    // battleRef에서 최신 상태 가져오기
    const currentBattle = battleRef.current;
    const currentEnemyPlan = currentBattle?.enemyPlan;
    const currentFixedOrder = currentBattle?.fixedOrder || fixedOrder;

    console.log('[DEBUG] beginResolveFromRespond called:', {
      phase: currentBattle?.phase,
      fixedOrderLength: currentFixedOrder?.length,
      fixedOrderEnemyCards: currentFixedOrder?.filter(x => x.actor === 'enemy').length,
      enemyPlanActionsLength: currentEnemyPlan?.actions?.length,
      manuallyModified: currentEnemyPlan?.manuallyModified
    });

    if (currentBattle?.phase !== 'respond') {
      console.log('[DEBUG] Phase check failed, phase is:', currentBattle?.phase);
      return;
    }
    if (!currentFixedOrder) return addLog('오류: 고정된 순서가 없습니다');

    if (currentFixedOrder.length === 0) {
      addLog('⚠️ 실행할 행동이 없습니다. 최소 1장 이상을 유지하거나 적이 행동 가능한 상태여야 합니다.');
      return;
    }

    // 카드 파괴된 경우 fixedOrder에서 파괴된 카드 제거
    let effectiveFixedOrder = currentFixedOrder;
    if (currentEnemyPlan?.manuallyModified && currentEnemyPlan?.actions) {
      const remainingActions = new Set(currentEnemyPlan.actions);
      effectiveFixedOrder = currentFixedOrder.filter(item => {
        if (item.actor === 'player') return true;
        return remainingActions.has(item.card);
      });
      console.log('[DEBUG] 카드 파괴로 인한 fixedOrder 필터링:', {
        original: currentFixedOrder.length,
        filtered: effectiveFixedOrder.length
      });
    }

    const newQ = effectiveFixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
    console.log('[DEBUG] newQ created:', {
      totalLength: newQ.length,
      enemyCardsInQueue: newQ.filter(x => x.actor === 'enemy').length
    });
    if (newQ.length === 0) {
      addLog('⚠️ 큐 생성 실패: 실행할 항목이 없습니다');
      return;
    }

    // 빙결 효과 확인 - frozenOrder > 0이면 SP 정렬 건너뜀
    const frozenOrderCount = currentBattle?.frozenOrder || battleRef.current?.frozenOrder || 0;
    console.log('[beginResolveFromRespond] 빙결 순서 확인:', {
      frozenOrder: frozenOrderCount,
      queueBefore: newQ.map(x => x.actor)
    });

    if (frozenOrderCount <= 0) {
      // SP 값으로 정렬 (같은 SP면 배열 순서 유지 = 수동 순서 유지)
      newQ.sort((a, b) => {
        if (a.sp !== b.sp) return a.sp - b.sp;
        // SP가 같으면 원래 배열 순서 유지 (stable sort)
        return 0;
      });
    } else {
      // 빙결 효과 사용됨 - 카운터 1 감소
      const newCount = frozenOrderCount - 1;
      actions.setFrozenOrder(newCount);
      if (battleRef.current) {
        battleRef.current.frozenOrder = newCount;
      }
      addLog(`❄️ 빙결 효과 발동: 플레이어 카드 우선!${newCount > 0 ? ` (${newCount}턴 남음)` : ''}`);
    }

    // destroyOnCollision 충돌 처리 (박치기 등)
    const collisionResult = processQueueCollisions(newQ, addLog);
    const finalQ = collisionResult.filteredQueue;

    console.log('[beginResolveFromRespond] 최종 큐 순서:', finalQ.map(x => x.actor));

    // 이전 턴의 에테르 애니메이션 상태 초기화
    actions.setEtherCalcPhase(null);
    actions.setEtherFinalValue(null);
    actions.setEnemyEtherFinalValue(null);
    actions.setCurrentDeflation(null);
    actions.setEnemyEtherCalcPhase(null);
    actions.setEnemyCurrentDeflation(null);

    // 에테르 폭주 체크 (phase 변경 전에 실행)
    const enemyWillOD = shouldEnemyOverdrive(enemyPlan.mode, enemyPlan.actions, enemy.etherPts, turnNumber) && etherSlots(enemy.etherPts) > 0;
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
    actions.setQueue(finalQ);
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
    // 에테르 증폭제 배율 적용
    const etherAmplifierMult = displayEtherMultiplierRef.current || 1;
    const totalPlayerMult = playerComboMult * etherAmplifierMult;
    let playerBeforeDeflation = Math.round(totalEtherPts * totalPlayerMult);


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
      etherAmplifierMult,
      totalPlayerMult,
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
      // 에테르 증폭 배율이 적용되었으면 상태에서 제거 (배율 갱신 시점)
      if (etherAmplifierMult > 1) {
        const currentPlayer = battleRef.current?.player || player;
        const updatedPlayer = { ...currentPlayer, etherMultiplier: 1 };
        actions.setPlayer(updatedPlayer);
        battleRef.current.player = updatedPlayer;
      }
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

  // 브리치 카드 선택 처리
  const handleBreachSelect = useCallback((selectedCard, idx) => {
    const breach = breachSelectionRef.current;
    if (!breach) return;

    const insertSp = breach.breachSp + (breach.breachCard?.breachSpOffset || 3);

    addLog(`👻 "${selectedCard.name}" 선택! 타임라인 ${insertSp}에 유령카드로 삽입.`);

    // 유령카드 생성 (isGhost, isFromFleche, flecheChainCount 플래그 유지)
    const ghostCard = {
      ...selectedCard,
      isGhost: true, // 유령카드 표시
      isFromFleche: selectedCard.isFromFleche || false,  // 플레쉬 연쇄 효과 유지
      flecheChainCount: selectedCard.flecheChainCount || 0,  // 연쇄 카운트 유지 (최대 2)
      createdBy: selectedCard.createdBy,  // 원본 카드 추적
      __uid: `ghost_${Math.random().toString(36).slice(2)}`
    };

    const ghostAction = {
      actor: 'player',
      card: ghostCard,
      sp: insertSp
    };

    // 현재 큐에 유령카드 삽입 (sp 기준으로 정렬)
    const currentQ = battleRef.current.queue;
    const currentQIndex = battleRef.current.qIndex;

    // 현재 인덱스 이후의 카드들에 삽입
    const beforeCurrent = currentQ.slice(0, currentQIndex + 1);
    const afterCurrent = [...currentQ.slice(currentQIndex + 1), ghostAction];

    // sp 기준으로 정렬
    afterCurrent.sort((a, b) => {
      if ((a.sp ?? 0) !== (b.sp ?? 0)) return (a.sp ?? 0) - (b.sp ?? 0);
      // 같은 sp면 유령카드가 먼저
      if (a.card?.isGhost && !b.card?.isGhost) return -1;
      if (!a.card?.isGhost && b.card?.isGhost) return 1;
      return 0;
    });

    const newQueue = [...beforeCurrent, ...afterCurrent];
    actions.setQueue(newQueue);

    // 브리치 선택 상태 초기화
    breachSelectionRef.current = null;
    setBreachSelection(null);

    // 선택 완료 후 게임 진행 재개
    const newQIndex = currentQIndex + 1;

    // battleRef를 즉시 업데이트 (React state 업데이트는 비동기이므로)
    battleRef.current = { ...battleRef.current, queue: newQueue, qIndex: newQIndex };

    actions.setQIndex(newQIndex);

    // 자동 진행을 위해 다음 stepOnce 호출 예약
    setTimeout(() => {
      if (battleRef.current.qIndex < battleRef.current.queue.length) {
        stepOnceRef.current?.();
      }
    }, 100);
  }, [addLog, actions]);

  // 카드 보상 선택 처리 (승리 후)
  const handleRewardSelect = useCallback((selectedCard, idx) => {
    addLog(`🎁 "${selectedCard.name}" 획득!`);

    // 선택한 카드를 subSpecials에 추가 (Zustand 스토어 업데이트)
    const currentBuild = useGameStore.getState().characterBuild;
    const newSubSpecials = [...(currentBuild?.subSpecials || []), selectedCard.id];
    useGameStore.getState().updateCharacterBuild(
      currentBuild?.mainSpecials || [],
      newSubSpecials
    );
    console.log('[CardReward] 카드 추가됨:', selectedCard.name, 'to subSpecials');

    // 모달 닫기 및 post 페이즈로 전환
    setCardReward(null);
    actions.setPostCombatOptions({ type: 'victory' });
    actions.setPhase('post');
  }, [addLog, actions]);

  // 카드 보상 건너뛰기
  const handleRewardSkip = useCallback(() => {
    addLog('카드 보상을 건너뛰었습니다.');
    setCardReward(null);
    actions.setPostCombatOptions({ type: 'victory' });
    actions.setPhase('post');
  }, [addLog, actions]);

  // 승리 시 카드 보상 모달 표시
  const showCardRewardModal = useCallback(() => {
    // 공격/방어 카드 중 랜덤 3장 선택
    const cardPool = CARDS.filter(c => (c.type === 'attack' || c.type === 'defense'));
    const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
    const rewardCards = shuffled.slice(0, 3);

    setCardReward({ cards: rewardCards });
  }, []);

  const stepOnce = () => {
    // 브리치 선택 대기 중이면 진행 차단
    if (breachSelectionRef.current) return;

    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex];
    const currentQIndex = currentBattle.qIndex; // Capture current qIndex

    // 타임라인 progress 업데이트 (공통 최대 속도 기준 비율로)
    const playerMaxSpeed = player?.maxSpeed || DEFAULT_PLAYER_MAX_SPEED;
    const enemyMaxSpeed = enemy?.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
    const commonMaxSpeed = Math.max(playerMaxSpeed, enemyMaxSpeed);
    const targetProgress = (a.sp / commonMaxSpeed) * 100;

    // 이전 애니메이션 정리
    if (timelineAnimationRef.current) {
      cancelAnimationFrame(timelineAnimationRef.current);
      timelineAnimationRef.current = null;
    }

    // 부드러운 타임라인 진행 애니메이션 (방어자세 실시간 방어력용)
    const startProgress = currentBattle.timelineProgress || 0;
    const animationDuration = TIMING.CARD_EXECUTION_DELAY; // 애니메이션 지속시간
    const startTime = performance.now();

    const animateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      // linear 보간 (시곗바늘이 일정 속도로 이동)
      const currentProgress = startProgress + (targetProgress - startProgress) * progress;

      // 방어자세 실시간 방어력 업데이트
      if (growingDefenseRef.current) {
        const currentTimelineSp = Math.floor((currentProgress / 100) * commonMaxSpeed);
        const { activatedSp, totalDefenseApplied = 0 } = growingDefenseRef.current;
        const totalDefenseNeeded = Math.max(0, currentTimelineSp - activatedSp);
        const defenseDelta = totalDefenseNeeded - totalDefenseApplied;
        if (defenseDelta > 0) {
          const currentPlayer = battleRef.current?.player || player;
          const newBlock = (currentPlayer.block || 0) + defenseDelta;
          actions.setPlayer({ ...currentPlayer, block: newBlock, def: true });
          if (battleRef.current) {
            battleRef.current.player = { ...battleRef.current.player, block: newBlock, def: true };
          }
          growingDefenseRef.current.totalDefenseApplied = totalDefenseNeeded;
        }
      }

      // flushSync로 강제 동기 렌더링 (방어자세 실시간 업데이트용)
      flushSync(() => {
        actions.setTimelineProgress(currentProgress);
      });

      if (progress < 1) {
        timelineAnimationRef.current = requestAnimationFrame(animateProgress);
      } else {
        timelineAnimationRef.current = null;
      }
    };

    timelineAnimationRef.current = requestAnimationFrame(animateProgress);

    // 시곗바늘 이동 완료 후 카드 발동 및 실행
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
      }, TIMING.CARD_SHAKE_DURATION);

      // 마지막 카드면 페이드아웃
      if (currentQIndex >= currentBattle.queue.length - 1) {
        setTimeout(() => {
          actions.setTimelineIndicatorVisible(false);
        }, TIMING.CARD_FADEOUT_DELAY);
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
          }, TIMING.CARD_DISAPPEAR_DURATION);
        }, TIMING.CARD_DISAPPEAR_START);
      }

      executeCardAction();
    }, TIMING.CARD_EXECUTION_DELAY);
  };

  // stepOnce를 ref에 저장 (브리치 선택 후 진행 재개용)
  stepOnceRef.current = stepOnce;

  // 다중 타격 비동기 실행 (딜레이 + 타격별 룰렛 체크)
  const executeMultiHitAsync = async (card, attacker, defender, attackerName, battleContext, onHitCallback) => {
    const isGunCard = card.cardCategory === 'gun' && card.type === 'attack';
    const ghostLabel = card.isGhost ? ' [👻유령]' : '';

    // 첫 타격 준비 (치명타 판정, preProcessedResult 획득)
    const prepResult = prepareMultiHitAttack(attacker, defender, card, attackerName, battleContext);
    let { hits, isCritical, preProcessedResult, modifiedCard, currentAttacker, currentDefender } = prepResult;
    const firstHitResult = prepResult.firstHitResult;

    let totalDealt = firstHitResult.damage;
    let totalTaken = firstHitResult.damageTaken || 0;
    let totalBlockDestroyed = firstHitResult.blockDestroyed || 0;

    // 다중 타격 시 개별 데미지 로그 필터링 (요약만 표시)
    const skipEventTypes = hits > 1 ? ['hit', 'blocked', 'pierce'] : [];
    const filteredEvents = firstHitResult.events.filter(ev => !skipEventTypes.includes(ev.type));
    const allEvents = [...filteredEvents];
    const allLogs = [];

    // 첫 타격 후 룰렛 체크 (총기 카드)
    if (isGunCard) {
      const rouletteResult = processPerHitRoulette(currentAttacker, card, attackerName, 0, hits);
      currentAttacker = rouletteResult.updatedAttacker;
      if (rouletteResult.jammed) {
        // 첫 타격에서 탄걸림! 남은 타격 취소
        const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, battleContext);
        const who = attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어';
        const perHitDmg = firstHitResult.damage;
        const critText = isCritical ? ' 💥치명타!' : '';
        const jamMsg = hits > 1
          ? `${who} • 🔫 ${card.name}${ghostLabel}: ${perHitDmg}x1 = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - 1}회 취소)`
          : `${who} • 🔫 ${card.name}${ghostLabel}: ${totalDealt}${critText} 데미지 (탄걸림!)`;
        allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: jamMsg, dmg: totalDealt });

        return {
          attacker: finalResult.attacker,
          defender: finalResult.defender,
          dealt: totalDealt,
          taken: totalTaken,
          events: [...allEvents, ...finalResult.events],
          logs: [jamMsg],
          isCritical,
          jammed: true,
          hitsCompleted: 1,
          totalHits: hits,
          createdCards: finalResult.createdCards
        };
      }
    }

    // 첫 타격 콜백 (애니메이션/사운드)
    if (onHitCallback) {
      await onHitCallback(firstHitResult, 0, hits);
    }

    // 후속 타격 (딜레이 포함)
    for (let i = 1; i < hits; i++) {
      // 딜레이
      await new Promise(resolve => setTimeout(resolve, TIMING.MULTI_HIT_DELAY));

      // 타격 실행
      const hitResult = calculateSingleHit(currentAttacker, currentDefender, card, attackerName, battleContext, isCritical, preProcessedResult);
      currentAttacker = hitResult.attacker;
      currentDefender = hitResult.defender;
      totalDealt += hitResult.damage;
      totalTaken += hitResult.damageTaken || 0;
      totalBlockDestroyed += hitResult.blockDestroyed || 0;

      // 다중 타격 시 개별 데미지 로그 필터링
      const filteredHitEvents = hitResult.events.filter(ev => !skipEventTypes.includes(ev.type));
      allEvents.push(...filteredHitEvents);

      // 타격 콜백 (애니메이션/사운드)
      if (onHitCallback) {
        await onHitCallback(hitResult, i, hits);
      }

      // 룰렛 체크 (총기 카드)
      if (isGunCard) {
        const rouletteResult = processPerHitRoulette(currentAttacker, card, attackerName, i, hits);
        currentAttacker = rouletteResult.updatedAttacker;
        if (rouletteResult.jammed && i < hits - 1) {
          // 탄걸림! 남은 타격 취소 - 요약 로그에 포함
          const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, battleContext);
          // 탄걸림 요약 로그
          const who = attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어';
          const perHitDmg = firstHitResult.damage;
          const critText = isCritical ? ' 💥치명타!' : '';
          const actualHits = i + 1;
          const jamMsg = `${who} • 🔫 ${card.name}${ghostLabel}: ${perHitDmg}x${actualHits} = ${totalDealt}${critText} 데미지 (탄걸림! ${hits - actualHits}회 취소)`;
          allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: jamMsg, dmg: totalDealt });

          return {
            attacker: finalResult.attacker,
            defender: finalResult.defender,
            dealt: totalDealt,
            taken: totalTaken,
            events: [...allEvents, ...finalResult.events],
            logs: [...allLogs, jamMsg],
            isCritical,
            jammed: true,
            hitsCompleted: actualHits,
            totalHits: hits,
            createdCards: finalResult.createdCards
          };
        }
      }
    }

    // 총합 로그 (타격데미지x타격횟수 형식)
    const who = attackerName === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어';
    const perHitDmg = firstHitResult.damage;
    const critText = isCritical ? ' 💥치명타!' : '';
    const icon = isGunCard ? '🔫' : '🔥';
    if (hits > 1) {
      const multiHitMsg = `${who} • ${icon} ${card.name}${ghostLabel}: ${perHitDmg}x${hits} = ${totalDealt}${critText} 데미지!`;
      allEvents.push({ actor: attackerName, card: card.name, type: 'multihit', msg: multiHitMsg, dmg: totalDealt });
      allLogs.push(multiHitMsg);
    } else {
      // 단일 타격 총기 공격
      const singleHitMsg = `${who} • ${icon} ${card.name}${ghostLabel}: ${totalDealt}${critText} 데미지`;
      allEvents.push({ actor: attackerName, card: card.name, type: 'hit', msg: singleHitMsg, dmg: totalDealt });
      allLogs.push(singleHitMsg);
    }

    // 후처리 (화상 부여 등)
    const finalResult = finalizeMultiHitAttack(modifiedCard, currentAttacker, currentDefender, attackerName, totalDealt, totalBlockDestroyed, battleContext);

    return {
      attacker: finalResult.attacker,
      defender: finalResult.defender,
      dealt: totalDealt,
      taken: totalTaken,
      events: [...allEvents, ...finalResult.events],
      logs: [...allLogs, ...finalResult.logs],
      isCritical,
      jammed: false,
      hitsCompleted: hits,
      totalHits: hits,
      createdCards: finalResult.createdCards
    };
  };

  const executeCardAction = async () => {
    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex];

    // battleRef에서 최신 player/enemy 상태 가져오기 (애니메이션 중 방어자세 방어력, 토큰 등 반영)
    const latestPlayer = currentBattle.player || player;
    const latestEnemy = currentBattle.enemy || enemy;
    let P = { ...player, def: latestPlayer.def || player.def || false, block: latestPlayer.block ?? player.block ?? 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, strength: player.strength || 0, tokens: latestPlayer.tokens };
    let E = { ...enemy, def: latestEnemy.def || enemy.def || false, block: latestEnemy.block ?? enemy.block ?? 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, tokens: latestEnemy.tokens };

    const tempState = { player: P, enemy: E, log: [] };

    // battleContext 생성 (special 효과용)
    // 진행 단계 최종 남은 행동력 계산 (가이러스 룰렛: 모든 선택 카드 비용 차감 후)
    const allPlayerCards = currentBattle.queue.filter(q => q.actor === 'player');
    const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);

    // 적 남은 에너지 계산
    const allEnemyCards = currentBattle.queue.filter(q => q.actor === 'enemy');
    const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

    // 이번 턴에 사용된 카드 카테고리 추적 (comboStyle용)
    const executedPlayerCards = currentBattle.queue
      .slice(0, currentBattle.qIndex)
      .filter(q => q.actor === 'player');
    const usedCardCategories = [...new Set(executedPlayerCards.map(q => q.card?.cardCategory).filter(Boolean))];

    const battleContext = {
      currentSp: a.sp || 0,  // 현재 카드의 타임라인 위치 (growingDefense용)
      queue: currentBattle.queue,
      currentQIndex: currentBattle.qIndex,
      remainingEnergy: calculatedRemainingEnergy,  // 플레이어 치명타 확률용 남은 에너지
      enemyRemainingEnergy: calculatedEnemyRemainingEnergy,  // 적 치명타 확률용 남은 에너지
      allCards: CARDS,  // 카드 창조용 전체 카드 풀
      usedCardCategories,  // comboStyle용: 이번 턴에 사용된 카드 카테고리
      hand: currentBattle.hand || []  // autoReload용: 현재 손패
    };

    // 다중 타격 또는 총기 공격: 비동기 처리 (딜레이 + 타격별 룰렛)
    const isAttackCard = a.card.type === 'attack';
    const isGunCard = a.card.cardCategory === 'gun';
    const hasMultipleHits = (a.card.hits || 1) > 1;
    const useAsyncMultiHit = isAttackCard && (isGunCard || hasMultipleHits);

    let actionResult;
    let actionEvents;

    if (useAsyncMultiHit) {
      // 비동기 다중 타격 실행
      const attacker = a.actor === 'player' ? P : E;
      const defender = a.actor === 'player' ? E : P;

      // 타격별 콜백: 피격 애니메이션 및 사운드
      const onHitCallback = async (hitResult, hitIndex, totalHits) => {
        if (hitResult.damage > 0) {
          playHitSound();
          if (a.actor === 'player') {
            actions.setEnemyHit(true);
            setTimeout(() => actions.setEnemyHit(false), 150);
          } else {
            actions.setPlayerHit(true);
            setTimeout(() => actions.setPlayerHit(false), 150);
          }
        }
      };

      const multiHitResult = await executeMultiHitAsync(a.card, attacker, defender, a.actor, battleContext, onHitCallback);

      // 결과 반영
      if (a.actor === 'player') {
        P = multiHitResult.attacker;
        E = multiHitResult.defender;
      } else {
        E = multiHitResult.attacker;
        P = multiHitResult.defender;
      }

      // 카드 사용 시 special 효과 처리 (교차 특성 등) - 룰렛은 이제 타격별로 처리됨
      const cardPlayAttacker = a.actor === 'player' ? P : E;
      const cardPlayResult = processCardPlaySpecials({
        card: a.card,
        attacker: cardPlayAttacker,
        attackerName: a.actor,
        battleContext
      });

      // cardPlayResult의 토큰 처리
      if (cardPlayResult.tokensToAdd?.length > 0) {
        cardPlayResult.tokensToAdd.forEach(tokenInfo => {
          if (a.actor === 'player') {
            const tokenResult = addToken(P, tokenInfo.id, tokenInfo.stacks);
            P = { ...P, tokens: tokenResult.tokens };
          } else {
            const tokenResult = addToken(E, tokenInfo.id, tokenInfo.stacks);
            E = { ...E, tokens: tokenResult.tokens };
          }
        });
      }
      if (cardPlayResult.tokensToRemove?.length > 0) {
        cardPlayResult.tokensToRemove.forEach(tokenInfo => {
          if (a.actor === 'player') {
            const tokenResult = removeToken(P, tokenInfo.id, 'permanent', tokenInfo.stacks);
            P = { ...P, tokens: tokenResult.tokens };
          } else {
            const tokenResult = removeToken(E, tokenInfo.id, 'permanent', tokenInfo.stacks);
            E = { ...E, tokens: tokenResult.tokens };
          }
        });
      }

      actionEvents = [...multiHitResult.events, ...cardPlayResult.events];
      actionResult = {
        dealt: multiHitResult.dealt,
        taken: multiHitResult.taken,
        events: actionEvents,
        isCritical: multiHitResult.isCritical,
        createdCards: multiHitResult.createdCards,
        updatedState: { player: P, enemy: E, log: [] },
        cardPlaySpecials: cardPlayResult
      };

      // battleRef 동기 업데이트
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P, enemy: E };
      }
    } else {
      // 기존 동기 처리 (방어 카드 또는 단일 타격 비총기 공격)
      actionResult = applyAction(tempState, a.actor, a.card, battleContext);
      const { events, updatedState } = actionResult;
      actionEvents = events;

      // applyAction에서 반환된 updatedState로 P와 E 재할당
      if (updatedState) {
        P = updatedState.player;
        E = updatedState.enemy;
        // battleRef 동기 업데이트 (다음 카드 실행 시 최신 상태 사용)
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: P, enemy: E };
        }
      } else {
        console.error('[executeCardAction] updatedState is undefined!', {
          card: a.card,
          actor: a.actor,
          actionResult
        });
      }
    }

    // 이벤트 로그 출력
    actionEvents.forEach(ev => {
      if (ev.msg) addLog(ev.msg);
    });

    // === 화상(BURN) 피해 처리: 카드 사용 시마다 피해 ===
    if (a.actor === 'player') {
      const playerBurnTokens = getAllTokens(P).filter(t => t.effect?.type === 'BURN');
      if (playerBurnTokens.length > 0) {
        const burnDamage = playerBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        P.hp = Math.max(0, P.hp - burnDamage);
        addLog(`🔥 화상: 플레이어 -${burnDamage} HP`);
        actionEvents.push({
          actor: 'player',
          card: a.card.name,
          type: 'burn',
          dmg: burnDamage,
          msg: `🔥 화상: 플레이어 -${burnDamage} HP`
        });
        // battleRef 동기 업데이트
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: P };
        }
      }
    } else if (a.actor === 'enemy') {
      const enemyBurnTokens = getAllTokens(E).filter(t => t.effect?.type === 'BURN');
      if (enemyBurnTokens.length > 0) {
        const burnDamage = enemyBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        E.hp = Math.max(0, E.hp - burnDamage);
        addLog(`🔥 화상: 적 -${burnDamage} HP`);
        actionEvents.push({
          actor: 'enemy',
          card: a.card.name,
          type: 'burn',
          dmg: burnDamage,
          msg: `🔥 화상: 적 -${burnDamage} HP`
        });
        // battleRef 동기 업데이트
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: E };
        }
      }
    }

    // 플레쉬 등 카드 창조 효과: 브리치처럼 3장 중 1장 선택
    if (actionResult.createdCards && actionResult.createdCards.length > 0 && a.actor === 'player') {
      // 플레쉬 연쇄 효과인지 확인 (연쇄 횟수 포함)
      const chainCount = actionResult.createdCards[0]?.flecheChainCount || 0;
      const sourceName = a.card.isFromFleche ? `플레쉬 연쇄 ${chainCount}` : a.card.name;
      const isLastChain = chainCount >= 2;
      addLog(`✨ "${sourceName}" 발동!${isLastChain ? ' (마지막 연쇄)' : ''} 카드를 선택하세요.`);

      // 브리치 선택 상태 설정 (게임 일시정지) - 브리치와 동일한 UI 재사용
      const breachState = {
        cards: actionResult.createdCards,
        breachSp: a.sp,
        breachCard: { ...a.card, breachSpOffset: 1 },  // +1 속도로 삽입
        sourceCardName: sourceName,  // 플레쉬/플레쉬 연쇄/브리치 구분용
        isLastChain  // 마지막 연쇄 여부
      };
      breachSelectionRef.current = breachState;
      setBreachSelection(breachState);

      // 선택 중에는 stepOnce 진행을 멈춤 (사용자가 선택할 때까지)
      return;
    }

    // cardPlaySpecials 결과 처리 (comboStyle, mentalFocus 등)
    if (actionResult.cardPlaySpecials && a.actor === 'player') {
      const { bonusCards, nextTurnEffects: newNextTurnEffects } = actionResult.cardPlaySpecials;

      // bonusCards 처리 (comboStyle): 큐에 유령카드로 추가
      if (bonusCards && bonusCards.length > 0) {
        const insertSp = (a.sp || 0) + 1;  // 현재 카드 +1 sp에 삽입
        const currentQ = battleRef.current.queue;
        const currentQIndex = battleRef.current.qIndex;

        const newActions = bonusCards.map(bonusCard => ({
          actor: 'player',
          card: { ...bonusCard, isGhost: true, __uid: `combo_${Math.random().toString(36).slice(2)}` },
          sp: insertSp
        }));

        // 현재 인덱스 이후에 삽입
        const beforeCurrent = currentQ.slice(0, currentQIndex + 1);
        const afterCurrent = [...currentQ.slice(currentQIndex + 1), ...newActions];

        // sp 기준으로 정렬
        afterCurrent.sort((x, y) => {
          if ((x.sp ?? 0) !== (y.sp ?? 0)) return (x.sp ?? 0) - (y.sp ?? 0);
          if (x.card?.isGhost && !y.card?.isGhost) return -1;
          if (!x.card?.isGhost && y.card?.isGhost) return 1;
          return 0;
        });

        const newQueue = [...beforeCurrent, ...afterCurrent];
        actions.setQueue(newQueue);
        battleRef.current = { ...battleRef.current, queue: newQueue };

        addLog(`🔄 연계 효과: "${bonusCards.map(c => c.name).join(', ')}" 큐에 추가!`);
      }

      // nextTurnEffects 처리 (mentalFocus)
      if (newNextTurnEffects) {
        const currentEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects;
        const updatedEffects = {
          ...currentEffects,
          bonusEnergy: (currentEffects.bonusEnergy || 0) + (newNextTurnEffects.bonusEnergy || 0),
          maxSpeedBonus: (currentEffects.maxSpeedBonus || 0) + (newNextTurnEffects.maxSpeedBonus || 0),
          extraCardPlay: (currentEffects.extraCardPlay || 0) + (newNextTurnEffects.extraCardPlay || 0)
        };
        actions.setNextTurnEffects(updatedEffects);
        // battleRef 동기 업데이트 (finishTurn에서 최신 값 사용)
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, nextTurnEffects: updatedEffects };
        }
      }
    }

    // 방어자세 성장 방어력 적용 (이전에 발동된 growingDefense가 있으면 타임라인 진행에 따라 방어력 추가)
    if (growingDefenseRef.current) {
      const currentSp = a.sp || 0;
      const { activatedSp, totalDefenseApplied = 0 } = growingDefenseRef.current;
      // 현재 sp와 발동 sp의 차이 = 총 방어력, 이미 적용한 양을 빼면 추가할 양
      const totalDefenseNeeded = Math.max(0, currentSp - activatedSp);
      const defenseDelta = totalDefenseNeeded - totalDefenseApplied;
      if (defenseDelta > 0) {
        const prevBlock = P.block || 0;
        P.block = prevBlock + defenseDelta;
        P.def = true;
        addLog(`🛡️ 방어자세: +${defenseDelta} 방어력 (총 ${totalDefenseNeeded})`);
        growingDefenseRef.current.totalDefenseApplied = totalDefenseNeeded;
      }
    }

    // 플레이어 카드 사용 시 카드 사용 횟수 증가 (mastery, boredom 특성용)
    if (a.actor === 'player' && a.card.id) {
      actions.setCardUsageCount({
        ...cardUsageCount,
        [a.card.id]: (cardUsageCount[a.card.id] || 0) + 1
      });

      // 방어자세 (growingDefense): 발동 시 활성화, 이후 타임라인 진행마다 방어력 +1
      if (hasSpecial(a.card, 'growingDefense')) {
        const cardSp = a.sp || 0;
        growingDefenseRef.current = {
          activatedSp: cardSp,
          totalDefenseApplied: 0
        };
        addLog(`🛡️ 방어자세 발동! (타임라인 ${cardSp}에서 활성화)`);
      }

      // 즉시 발동 특성 처리 (double_edge, training, warmup, vanish)
      const updatedNextTurnEffects = processImmediateCardTraits({
        card: a.card,
        playerState: P,
        nextTurnEffects,
        addLog,
        addVanishedCard: actions.addVanishedCard
      });
      if (updatedNextTurnEffects !== nextTurnEffects) {
        actions.setNextTurnEffects(updatedNextTurnEffects);
      }

      // 상징: 카드 사용 시 효과 (불멸의 가면 등)
      processCardPlayedRelicEffects({
        relics,
        card: a.card,
        playerState: P,
        enemyState: E,
        safeInitialPlayer,
        addLog,
        setRelicActivated: actions.setRelicActivated
      });

      // 토큰: 카드 onPlay 효과 처리
      if (a.card.onPlay && typeof a.card.onPlay === 'function') {
        try {
          // 치명타 시 토큰 스택 +1 래퍼 + 최신 플레이어 상태 사용
          const isCritical = actionResult.isCritical;
          const currentPlayerForToken = { ...P };
          const tokenActions = {
            ...actions,
            addTokenToPlayer: (tokenId, stacks = 1) => {
              const actualStacks = isCritical ? stacks + 1 : stacks;
              if (isCritical) {
                addLog(`💥 치명타! ${tokenId} +1 강화`);
              }
              const result = addToken(currentPlayerForToken, tokenId, actualStacks);
              P.tokens = result.tokens;
              currentPlayerForToken.tokens = result.tokens;
              // battleRef 동기 업데이트 (finishTurn에서 최신 상태 사용 가능하도록)
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, player: { ...P } };
              }
              actions.setPlayer({ ...P });
              result.logs.forEach(log => addLog(log));
              return result;
            },
            removeTokenFromPlayer: (tokenId, tokenType, stacks = 1) => {
              const result = removeToken(currentPlayerForToken, tokenId, tokenType, stacks);
              P.tokens = result.tokens;
              currentPlayerForToken.tokens = result.tokens;
              // battleRef 동기 업데이트 (finishTurn에서 최신 상태 사용 가능하도록)
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, player: { ...P } };
              }
              actions.setPlayer({ ...P });
              result.logs.forEach(log => addLog(log));
              return result;
            },
            addTokenToEnemy: (tokenId, stacks = 1) => {
              const actualStacks = isCritical ? stacks + 1 : stacks;
              if (isCritical) {
                addLog(`💥 치명타! ${tokenId} +1 강화`);
              }
              const result = addToken(E, tokenId, actualStacks);
              E.tokens = result.tokens;
              // battleRef 동기 업데이트
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, enemy: { ...E } };
              }
              actions.setEnemy({ ...E });
              result.logs.forEach(log => addLog(log));
              return result;
            }
          };
          a.card.onPlay(battle, tokenActions);
        } catch (error) {
          console.error('[Token onPlay Error]', error);
        }
      }
    }

    if (hasTrait(a.card, 'stun')) {
      const { updatedQueue, stunEvent } = processStunEffect({
        action: a,
        queue: currentBattle.queue,
        currentQIndex: currentBattle.qIndex,
        addLog
      });
      if (updatedQueue !== currentBattle.queue) {
        actions.setQueue(updatedQueue);
      }
      if (stunEvent) {
        actionEvents = [...actionEvents, stunEvent];
      }
    }

    // 타임라인 조작 효과 처리 (마르쉐, 런지, 비트, 흐트리기 등)
    const timelineResult = processTimelineSpecials({
      card: a.card,
      actor: a.actor,
      actorName: a.actor,
      queue: battleRef.current.queue,
      currentIndex: battleRef.current.qIndex,
      damageDealt: actionResult.dealt || 0
    });

    if (timelineResult.events.length > 0) {
      actionEvents = [...actionEvents, ...timelineResult.events];
      timelineResult.logs.forEach(log => addLog(log));
    }

    // 타임라인 변경 적용
    const { timelineChanges } = timelineResult;
    if (timelineChanges.advancePlayer > 0 || timelineChanges.pushEnemy > 0 || timelineChanges.pushLastEnemy > 0) {
      let updatedQueue = [...battleRef.current.queue];
      const currentQIndex = battleRef.current.qIndex;

      // 플레이어 카드 앞당기기 (현재 카드 이후의 플레이어 카드들)
      if (timelineChanges.advancePlayer > 0) {
        updatedQueue = updatedQueue.map((item, idx) => {
          if (idx > currentQIndex && item.actor === 'player') {
            return { ...item, sp: Math.max(0, item.sp - timelineChanges.advancePlayer) };
          }
          return item;
        });
      }

      // 적 카드 뒤로 밀기 (현재 카드 이후의 적 카드들)
      if (timelineChanges.pushEnemy > 0) {
        updatedQueue = updatedQueue.map((item, idx) => {
          if (idx > currentQIndex && item.actor === 'enemy') {
            return { ...item, sp: item.sp + timelineChanges.pushEnemy };
          }
          return item;
        });
      }

      // 적의 마지막 카드만 밀기
      if (timelineChanges.pushLastEnemy > 0) {
        // 현재 이후의 적 카드들 중 가장 마지막 카드 찾기
        let lastEnemyIdx = -1;
        for (let i = updatedQueue.length - 1; i > currentQIndex; i--) {
          if (updatedQueue[i].actor === 'enemy') {
            lastEnemyIdx = i;
            break;
          }
        }
        if (lastEnemyIdx !== -1) {
          updatedQueue = updatedQueue.map((item, idx) => {
            if (idx === lastEnemyIdx) {
              return { ...item, sp: item.sp + timelineChanges.pushLastEnemy };
            }
            return item;
          });
        }
      }

      // 큐 재정렬 (sp 값 기준, 이미 처리된 카드들은 유지)
      const processedCards = updatedQueue.slice(0, currentQIndex + 1);
      const remainingCards = updatedQueue.slice(currentQIndex + 1);
      remainingCards.sort((a, b) => a.sp - b.sp);
      updatedQueue = [...processedCards, ...remainingCards];

      actions.setQueue(updatedQueue);
    }

    // 쳐내기(parryPush) 효과 처리: 패리 대기 상태 배열에 추가
    if (a.card.special === 'parryPush' && a.actor === 'player') {
      const parryState = setupParryReady({ action: a, addLog });
      parryReadyStatesRef.current = [...parryReadyStatesRef.current, parryState];
      setParryReadyStates([...parryReadyStatesRef.current]);
    }

    // 브리치(breach) 효과 처리: 랜덤 카드 3장 생성 후 선택 대기
    if (a.card.special === 'breach' && a.actor === 'player') {
      // 공격/방어 카드 중 랜덤 3장 선택
      const cardPool = CARDS.filter(c => (c.type === 'attack' || c.type === 'defense') && c.id !== 'breach');
      const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
      const breachCards = shuffled.slice(0, 3);

      addLog(`👻 "${a.card.name}" 발동! 카드를 선택하세요.`);

      // 브리치 카드도 에테르 누적 (return 전에 처리)
      processPlayerEtherAccumulation({
        card: a.card,
        turnEtherAccumulated,
        orderedRelicList,
        cardUpgrades,
        resolvedPlayerCards,
        playerTimeline,
        relics,
        triggeredRefs: {
          referenceBookTriggered: referenceBookTriggeredRef,
          devilDiceTriggered: devilDiceTriggeredRef
        },
        calculatePassiveEffects,
        getCardEtherGain,
        collectTriggeredRelics,
        playRelicActivationSequence,
        flashRelic,
        actions
      });

      // 브리치 선택 상태 설정 (게임 일시정지)
      const breachState = {
        cards: breachCards,
        breachSp: a.sp,
        breachCard: a.card
      };
      breachSelectionRef.current = breachState;
      setBreachSelection(breachState);

      // 브리치 선택 중에는 stepOnce 진행을 멈춤 (사용자가 선택할 때까지)
      return;
    }

    // 적 카드 발동 시 패리 트리거 체크 (모든 활성 패리 상태 확인)
    const hasActiveParry = parryReadyStatesRef.current.some(s => s?.active && !s.triggered);
    if (a.actor === 'enemy' && hasActiveParry) {
      const currentQ = battleRef.current.queue;
      const { updatedQueue, parryEvents, updatedParryStates, outCards } = checkParryTrigger({
        parryReadyStates: parryReadyStatesRef.current,
        enemyAction: a,
        queue: currentQ,
        currentQIndex: currentBattle.qIndex,
        enemyMaxSpeed: enemy.maxSpeed,
        addLog,
        playParrySound
      });
      parryReadyStatesRef.current = updatedParryStates;
      setParryReadyStates(updatedParryStates);
      if (updatedQueue !== currentQ) {
        actions.setQueue(updatedQueue);
      }
      if (parryEvents && parryEvents.length > 0) {
        actionEvents = [...actionEvents, ...parryEvents];
      }
      // 아웃된 카드 이벤트 추가
      if (outCards && outCards.length > 0) {
        outCards.forEach(outCard => {
          actionEvents.push({
            actor: 'player',
            type: 'out',
            card: outCard.card?.name,
            msg: `🚫 "${outCard.card?.name}" 아웃!`
          });
        });
      }
    }

    // 카드 사용 시 에테르 누적 (실제 적용은 턴 종료 시)
    // 유령카드는 에테르 누적 및 콤보 배율 카드 수에서 제외
    if (a.actor === 'player' && !a.card.isGhost) {
      processPlayerEtherAccumulation({
        card: a.card,
        turnEtherAccumulated,
        orderedRelicList,
        cardUpgrades,
        resolvedPlayerCards,
        playerTimeline,
        relics,
        triggeredRefs: {
          referenceBookTriggered: referenceBookTriggeredRef,
          devilDiceTriggered: devilDiceTriggeredRef
        },
        calculatePassiveEffects,
        getCardEtherGain,
        collectTriggeredRelics,
        playRelicActivationSequence,
        flashRelic,
        actions
      });
    } else if (a.actor === 'enemy') {
      processEnemyEtherAccumulation({
        card: a.card,
        enemyTurnEtherAccumulated,
        getCardEtherGain,
        actions
      });
    }

    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1, strength: P.strength || 0, tokens: P.tokens });
    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1, tokens: E.tokens });
    actions.setActionEvents({ ...currentBattle.actionEvents, [currentBattle.qIndex]: actionEvents });

    // 이벤트 처리: 애니메이션 및 사운드
    processActionEventAnimations({
      actionEvents,
      action: a,
      addLog,
      playHitSound,
      playBlockSound,
      actions
    });

    const newQIndex = battleRef.current.qIndex + 1;

    // battleRef를 즉시 업데이트 (React state 업데이트는 비동기이므로)
    battleRef.current = { ...battleRef.current, qIndex: newQIndex };

    actions.setQIndex(newQIndex);

    if (P.hp <= 0) { actions.setPostCombatOptions({ type: 'defeat' }); actions.setPhase('post'); return; }
    if (E.hp <= 0) {
      processEnemyDeath({
        newQIndex,
        queue,
        queueLength: battle.queue.length,
        turnEtherAccumulated,
        playSound,
        actions
      });
      return;
    }

    // 타임라인의 모든 카드 진행이 끝났을 때 에테르 계산 애니메이션은 useEffect에서 실행됨 (상태 업데이트 타이밍 보장)
  };

  // 자동진행 기능 (stepOnceRef 사용으로 중복 실행 방지)
  useEffect(() => {
    if (autoProgress && battle.phase === 'resolve' && battle.qIndex < battle.queue.length) {
      const timer = setTimeout(() => {
        stepOnceRef.current?.();
      }, TIMING.AUTO_PROGRESS_DELAY);
      return () => clearTimeout(timer);
    }
  }, [autoProgress, battle.phase, battle.qIndex, battle.queue.length]);

  // 타임라인 애니메이션 cleanup (페이즈 변경 또는 언마운트 시)
  useEffect(() => {
    return () => {
      if (timelineAnimationRef.current) {
        cancelAnimationFrame(timelineAnimationRef.current);
        timelineAnimationRef.current = null;
      }
    };
  }, [battle.phase]);

  // 타임라인 완료 후 에테르 계산 애니메이션 실행
  // useEffect를 사용하여 turnEtherAccumulated 상태가 최신 값일 때 실행
  useEffect(() => {
    if (battle.phase === 'resolve' && battle.qIndex >= battle.queue.length && battle.queue.length > 0 && turnEtherAccumulated > 0 && etherCalcPhase === null) {
      // 모든 카드가 실행되고 에테르가 누적된 상태에서, 애니메이션이 아직 시작되지 않았을 때만 실행
      // resolvedPlayerCards를 전달하여 몬스터 사망 시에도 정확한 카드 수 사용
      setTimeout(() => startEtherCalculationAnimation(turnEtherAccumulated, resolvedPlayerCards), TIMING.ETHER_CALC_START_DELAY);
    }
  }, [battle.phase, battle.qIndex, battle.queue.length, turnEtherAccumulated, etherCalcPhase, resolvedPlayerCards]);

  const finishTurn = (reason) => {
    addLog(`턴 종료: ${reason || ''}`);

    // 턴소모 토큰 제거 - battleRef에서 최신 상태 사용 (stale closure 방지)
    const currentBattle = battleRef.current || {};
    let latestPlayer = currentBattle.player || battle.player;
    let latestEnemy = currentBattle.enemy || battle.enemy;

    // 화상(BURN) 피해는 이제 카드 사용 시마다 처리됨 (battleExecution.js)

    const playerTokenResult = clearTurnTokens(latestPlayer);
    playerTokenResult.logs.forEach(log => addLog(log));
    latestPlayer = { ...latestPlayer, tokens: playerTokenResult.tokens };
    actions.setPlayer(latestPlayer);

    const enemyTokenResult = clearTurnTokens(latestEnemy);
    enemyTokenResult.logs.forEach(log => addLog(log));
    latestEnemy = { ...latestEnemy, tokens: enemyTokenResult.tokens };
    actions.setEnemy(latestEnemy);

    // battleRef 동기 업데이트 (다음 턴에서 최신 토큰 상태 사용)
    if (battleRef.current) {
      battleRef.current = { ...battleRef.current, player: latestPlayer, enemy: latestEnemy };
    }

    // 패리 대기 상태 배열 초기화
    parryReadyStatesRef.current = [];
    setParryReadyStates([]);

    // 방어자세 성장 방어력 초기화
    growingDefenseRef.current = null;

    // 이번 턴 사용한 탈주 카드를 다음 턴 한정으로 차단
    escapeBanRef.current = new Set(escapeUsedThisTurnRef.current);
    escapeUsedThisTurnRef.current = new Set();

    // 다음 턴 효과 처리 (특성 기반)
    const traitNextTurnEffects = processCardTraitEffects(selected, addLog);

    // 카드 플레이 중 설정된 효과 병합 (mentalFocus의 maxSpeedBonus, extraCardPlay 등)
    const currentNextTurnEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects;
    const newNextTurnEffects = {
      ...traitNextTurnEffects,
      bonusEnergy: (traitNextTurnEffects.bonusEnergy || 0) + (currentNextTurnEffects.bonusEnergy || 0),
      maxSpeedBonus: (traitNextTurnEffects.maxSpeedBonus || 0) + (currentNextTurnEffects.maxSpeedBonus || 0),
      extraCardPlay: (traitNextTurnEffects.extraCardPlay || 0) + (currentNextTurnEffects.extraCardPlay || 0)
    };

    // 상징 턴 종료 효과 적용 (계약서, 은화 등)
    const turnEndRelicEffects = applyTurnEndEffects(relics, {
      cardsPlayedThisTurn: battle.selected.length,
      player,
      enemy,
    });

    // 턴 종료 상징 발동 애니메이션
    playTurnEndRelicAnimations({
      relics,
      RELICS,
      cardsPlayedThisTurn: battle.selected.length,
      player,
      enemy,
      playSound,
      actions
    });

    // 턴 종료 상징 효과를 다음 턴 효과에 적용
    const updatedNextTurnEffects = applyTurnEndRelicEffectsToNextTurn({
      turnEndRelicEffects,
      nextTurnEffects: newNextTurnEffects,
      player,
      addLog,
      actions
    });

    actions.setNextTurnEffects(updatedNextTurnEffects);

    // 턴 종료 시 조합 카운트 증가 (Deflation)
    const pComboEnd = detectPokerCombo(selected);
    const eComboEnd = detectPokerCombo(enemyPlan.actions);

    // 에테르 최종 계산 (상징 배율 및 디플레이션 적용)
    // latestPlayer는 이미 finishTurn 시작 부분에서 battleRef로부터 가져옴
    console.log('[finishTurn] etherMultiplier 확인:', {
      'battleRef.current?.player?.etherMultiplier': battleRef.current?.player?.etherMultiplier,
      'player.etherMultiplier': player.etherMultiplier,
      'latestPlayer.etherMultiplier': latestPlayer.etherMultiplier
    });
    console.log('[finishTurn] 콤보 확인:', {
      'pComboEnd': pComboEnd,
      'finalComboMultiplier': finalComboMultiplier
    });
    const etherResult = calculateTurnEndEther({
      playerCombo: pComboEnd,
      enemyCombo: eComboEnd,
      turnEtherAccumulated,
      enemyTurnEtherAccumulated,
      finalComboMultiplier,
      player: latestPlayer,
      enemy
    });

    const { player: playerEther, enemy: enemyEther } = etherResult;
    const playerFinalEther = playerEther.finalEther;
    const enemyFinalEther = enemyEther.finalEther;
    const playerAppliedEther = playerEther.appliedEther;
    const enemyAppliedEther = enemyEther.appliedEther;
    const playerOverflow = playerEther.overflow;
    const enemyOverflow = enemyEther.overflow;

    console.log('[finishTurn 계산]', {
      turnEtherAccumulated,
      comboName: pComboEnd?.name,
      basePlayerComboMult: playerEther.baseComboMult,
      relicMultBonus: playerEther.relicMultBonus,
      playerComboMult: playerEther.finalComboMult,
      playerBeforeDeflation: playerEther.beforeDeflation,
      deflationMult: playerEther.deflation.multiplier,
      usageCount: playerEther.deflation.usageCount,
      playerFinalEther,
      selectedCards: battle.selected.length,
      resolvedPlayerCards,
      comboUsageCount: player.comboUsageCount,
      comboUsageForThisCombo: player.comboUsageCount?.[pComboEnd?.name] || 0
    });

    console.log('[finishTurn] STEP 1: 에테르 처리 시작');

    // 플레이어 에테르 획득 처리
    if (playerFinalEther > 0) {
      addLog(formatPlayerEtherLog(playerEther, turnEtherAccumulated));
      actions.setEtherFinalValue(playerFinalEther);
    }

    // 적 에테르 획득 처리
    if (enemyFinalEther > 0) {
      addLog(formatEnemyEtherLog(enemyEther, enemyTurnEtherAccumulated));
      startEnemyEtherAnimation({ enemyFinalEther, enemyEther, actions });
    }

    actions.setEnemyEtherFinalValue(enemyFinalEther);

    console.log('[finishTurn] STEP 2: 에테르 이동 시작');

    // 에테르 소지량 이동: 적용치 기준 (플레이어도 잃을 수 있음)
    const curPlayerPts = player.etherPts || 0;
    const curEnemyPts = enemy.etherPts || 0;

    // 이변: 에테르 획득 불가 체크
    const effectivePlayerAppliedEther = player.etherBan ? 0 : playerAppliedEther;
    if (player.etherBan && playerAppliedEther > 0) {
      addLog('⚠️ [디플레이션의 저주] 에테르 획득이 차단되었습니다!');
    }

    const { nextPlayerPts, nextEnemyPts, movedPts } = processEtherTransfer({
      playerAppliedEther: effectivePlayerAppliedEther,
      enemyAppliedEther,
      curPlayerPts,
      curEnemyPts,
      enemyHp: enemy.hp,
      calculateEtherTransfer,
      addLog,
      playSound,
      actions
    });

    console.log('[finishTurn] STEP 3: 조합 카운트 업데이트');

    // 조합 사용 카운트 업데이트
    const newUsageCount = updateComboUsageCount(player.comboUsageCount, pComboEnd, queue, 'player');
    const newEnemyUsageCount = updateComboUsageCount(enemy.comboUsageCount, eComboEnd, [], 'enemy');

    console.log('[finishTurn] STEP 4: etherMultiplier 초기화 시작', { latestPlayerMult: latestPlayer.etherMultiplier });

    // 턴 종료 상태 업데이트
    let newPlayerState;
    try {
      console.log('[finishTurn] createTurnEndPlayerState 호출 전');
      newPlayerState = createTurnEndPlayerState(latestPlayer, {
        comboUsageCount: newUsageCount,
        etherPts: nextPlayerPts,
        etherOverflow: playerOverflow,
        etherMultiplier: 1  // 에테르 증폭 배율 초기화
      });
      console.log('[finishTurn] createTurnEndPlayerState 호출 후:', {
        'before etherMultiplier': latestPlayer.etherMultiplier,
        'after etherMultiplier': newPlayerState.etherMultiplier
      });
    } catch (err) {
      console.error('[finishTurn] createTurnEndPlayerState 에러:', err);
      newPlayerState = { ...latestPlayer, etherMultiplier: 1 };
    }
    actions.setPlayer(newPlayerState);

    // battleRef도 즉시 업데이트
    if (battleRef.current) {
      battleRef.current.player = newPlayerState;
    }

    const nextPts = Math.max(0, nextEnemyPts);
    const nextEnemyPtsSnapshot = nextPts;
    actions.setEnemy(createTurnEndEnemyState(enemy, {
      comboUsageCount: newEnemyUsageCount,
      etherPts: nextPts
    }));

    // 에테르 누적 카운터 리셋 (애니메이션 상태는 다음 턴 시작 시 리셋됨)
    actions.setTurnEtherAccumulated(0);
    actions.setEnemyTurnEtherAccumulated(0);

    actions.setSelected([]); actions.setQueue([]); actions.setQIndex(0); actions.setFixedOrder(null); actions.setUsedCardIndices([]);
    actions.setDisappearingCards([]); actions.setHiddenCards([]);

    // 턴 종료 시 승리/패배 체크
    const transitionResult = processVictoryDefeatTransition({
      enemy,
      player,
      nextEnemyPtsSnapshot,
      checkVictoryCondition,
      actions,
      onVictory: showCardRewardModal
    });
    if (transitionResult.shouldReturn) return;

    actions.setTurnNumber(t => t + 1);
    actions.setNetEtherDelta(null);
    // 다음 턴을 위해 enemyPlan 리셋 (manuallyModified 플래그 제거)
    // mode는 유지하여 적 성향이 바뀌지 않도록 함
    actions.setEnemyPlan({ actions: [], mode: enemyPlan.mode, manuallyModified: false });
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

    // 진행 단계 최종 남은 행동력 계산 (가이러스 룰렛용)
    const allPlayerCards = battle.queue.filter(q => q.actor === 'player');
    const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const playerEnergyBudget = P.energy || P.maxEnergy || BASE_PLAYER_ENERGY;
    const finalRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);
    const allEnemyCards = battle.queue.filter(q => q.actor === 'enemy');
    const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const enemyEnergyBudget = E.energy || E.maxEnergy || BASE_PLAYER_ENERGY;
    const finalEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

    for (let i = qIndex; i < battle.queue.length; i++) {
      const a = battle.queue[i];

      // 적이 이미 죽었으면 적의 행동은 건너뛰기
      if (enemyDefeated && a.actor === 'enemy') {
        continue;
      }

      // battleContext 생성
      const executedPlayerCards = battle.queue.slice(0, i).filter(q => q.actor === 'player');
      const usedCardCategories = [...new Set(executedPlayerCards.map(q => q.card?.cardCategory).filter(Boolean))];

      const battleContext = {
        currentSp: a.sp || 0,
        queue: battle.queue,
        currentQIndex: i,
        remainingEnergy: finalRemainingEnergy,  // 진행 단계 최종 남은 행동력
        enemyRemainingEnergy: finalEnemyRemainingEnergy,
        allCards: CARDS,
        usedCardCategories,
        hand: battle.hand || []
      };

      const { events } = applyAction(tempState, a.actor, a.card, battleContext);
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
    // battleRef에서 최신 player 상태 가져오기 (아이템 효과의 etherMultiplier 포함)
    const latestPlayerForAnim = battleRef.current?.player || player;
    startEtherCalculationAnimationSequence({
      turnEtherAccumulated,
      selected,
      player: latestPlayerForAnim,
      playSound,
      actions,
      onMultiplierConsumed: () => {
        // 에테르 증폭 배율 리셋 (계산에 적용됨을 보여줌)
        const currentPlayer = battleRef.current?.player || player;
        const updatedPlayer = { ...currentPlayer, etherMultiplier: 1 };
        actions.setPlayer(updatedPlayer);
        battleRef.current.player = updatedPlayer;
      }
    });
  };

  const removeSelectedAt = (i) => actions.setSelected(battle.selected.filter((_, idx) => idx !== i));

  // 키보드 단축키 처리
  useKeyboardShortcuts({
    battle,
    player,
    canRedraw,
    autoProgress,
    etherFinalValue,
    actions,
    startResolve,
    beginResolveFromRespond,
    redrawHand,
    finishTurn,
    cycleSortType,
    playSound
  });

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
    battle.selected.length >= effectiveMaxSubmitCards ||
    totalSpeed + applyAgility(c.speedCost, effectiveAgility) > player.maxSpeed ||
    totalEnergy + c.actionCost > player.maxEnergy
  );
  const playerEtherValue = player?.etherPts ?? 0;
  const playerEtherSlots = etherSlots(playerEtherValue);
  const enemyEtherValue = enemy?.etherPts ?? 0;
  const playerEnergyBudget = player.energy || BASE_PLAYER_ENERGY;
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergy);
  const insightLevelSelect = insightReveal?.level || 0;
  const insightVisible = insightReveal?.visible;
  const enemyWillOverdrivePlan = shouldEnemyOverdrive(enemyPlan.mode, enemyPlan.actions, enemy.etherPts, turnNumber);
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
      {/* 이변 표시 */}
      <AnomalyDisplay anomalies={activeAnomalies} />

      {/* 이변 알림 */}
      {showAnomalyNotification && (
        <AnomalyNotification
          anomalies={activeAnomalies}
          onDismiss={() => setShowAnomalyNotification(false)}
        />
      )}

      {/* 브리치 카드 선택 모달 */}
      {breachSelection && (
        <BreachSelectionModal
          breachSelection={breachSelection}
          onSelect={handleBreachSelect}
          strengthBonus={player.strength || 0}
        />
      )}

      {/* 카드 보상 선택 모달 (승리 후) */}
      {cardReward && (
        <CardRewardModal
          rewardCards={cardReward.cards}
          onSelect={handleRewardSelect}
          onSkip={handleRewardSkip}
        />
      )}

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

      {/* 아이템 슬롯 - 왼쪽 상단 고정 */}
      <ItemSlots
        phase={battle.phase}
        battleActions={actions}
        player={battle.player}
        enemy={battle.enemy}
        enemyPlan={battle.enemyPlan}
        battleRef={battleRef}
      />
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
          simulatePreview={simulatePreview}
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
        destroyingEnemyCards={battle.destroyingEnemyCards}
        freezingEnemyCards={battle.freezingEnemyCards}
        frozenOrder={battle.frozenOrder}
        parryReadyStates={parryReadyStates}
      />

      {/* 상징 표시 */}
      <RelicDisplay
        orderedRelicList={orderedRelicList}
        RELICS={RELICS}
        RELIC_RARITIES={RELIC_RARITIES}
        RELIC_RARITY_COLORS={RELIC_RARITY_COLORS}
        relicActivated={relicActivated}
        activeRelicSet={activeRelicSet}
        hoveredRelic={hoveredRelic}
        setHoveredRelic={actions.setHoveredRelic}
        actions={actions}
        handleRelicDragStart={handleRelicDragStart}
        handleRelicDragOver={handleRelicDragOver}
        handleRelicDrop={handleRelicDrop}
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
              etherMultiplier={displayEtherMultiplierRef.current}
              multiplierPulse={multiplierPulse}
            />
            <PlayerHpBar
              player={player}
              playerHit={playerHit}
              playerBlockAnim={playerBlockAnim}
              playerOverdriveFlash={playerOverdriveFlash}
              effectiveAgility={effectiveAgility}
              dulledLevel={dulledLevel}
              insightLevel={insightLevel}
            />
          </div>

          <CentralPhaseDisplay
            battle={battle}
            totalSpeed={totalSpeed}
            MAX_SPEED={MAX_SPEED}
            MAX_SUBMIT_CARDS={effectiveMaxSubmitCards}
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
              frozenOrder={battle.frozenOrder}
            />
          </div>
        </div>
      </div>


      {/* 독립 활동력 표시 (좌측 하단 고정) */}
      {(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="energy-display-fixed">
          <div className="energy-orb-compact">
            {remainingEnergy}<span style={{ margin: '0 6px' }}>/</span>{player.maxEnergy}
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
        renderNameWithBadge={(card, defaultColor) => renderNameWithBadge(card, cardUpgrades, defaultColor)}
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
