import { useState, useEffect, useMemo, useRef, useCallback, useReducer } from "react";
import { flushSync } from "react-dom";
import "./legacy-battle.css";
import { playHitSound, playBlockSound, playCardSubmitSound, playProceedSound, playParrySound } from "../../lib/soundUtils";
import { useBattleState } from "./hooks/useBattleState";
import { useDamagePreview } from "./hooks/useDamagePreview";
import { useBattleTimelines } from "./hooks/useBattleTimelines";
import { useInsightSystem } from "./hooks/useInsightSystem";
import { useRelicDrag } from "./hooks/useRelicDrag";
import { useCardTooltip } from "./hooks/useCardTooltip";
import { useEtherPreview } from "./hooks/useEtherPreview";
import { useComboSystem } from "./hooks/useComboSystem";
import { useRewardSelection } from "./hooks/useRewardSelection";
import { useMultiTargetSelection } from "./hooks/useMultiTargetSelection";
import { useHandManagement } from "./hooks/useHandManagement";
import { useEtherAnimation } from "./hooks/useEtherAnimation";
import { useCardSelection } from "./hooks/useCardSelection";
import { usePhaseTransition } from "./hooks/usePhaseTransition";
import { useResolveExecution } from "./hooks/useResolveExecution";
import { useBreachSelection } from "./hooks/useBreachSelection";
import { useTurnStartEffects } from "./hooks/useTurnStartEffects";
import {
  MAX_SPEED,
  DEFAULT_PLAYER_MAX_SPEED,
  DEFAULT_ENEMY_MAX_SPEED,
  generateSpeedTicks,
  BASE_PLAYER_ENERGY,
  MAX_SUBMIT_CARDS,
  ETHER_THRESHOLD,
  DEFAULT_DRAW_COUNT,
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
import { generateEnemyActions, shouldEnemyOverdrive, assignSourceUnitToActions } from "./utils/enemyAI";
import { simulatePreview } from "./utils/battleSimulation";
import { applyAction, prepareMultiHitAttack, calculateSingleHit, finalizeMultiHitAttack, rollCritical } from "./logic/combatActions";
import { drawCharacterBuildHand, initializeDeck, drawFromDeck, shuffleArray } from "./utils/handGeneration";
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
import { clearTurnTokens, addToken, removeToken, getAllTokens, expireTurnTokensByTimeline, getTokenStacks, setTokenStacks } from "../../lib/tokenUtils";
import { TOKENS } from "../../data/tokens";
import { processEtherTransfer } from "./utils/etherTransferProcessing";
import { processVictoryDefeatTransition } from "./utils/victoryDefeatTransition";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useStepExecution } from "./hooks/useStepExecution";
import {
  calculatePassiveEffects,
  applyCombatStartEffects
} from "../../lib/relicEffects";
import { PlayerHpBar } from "./ui/PlayerHpBar";
import { PlayerEtherBox } from "./ui/PlayerEtherBox";
import { EnemyHpBar } from "./ui/EnemyHpBar";
import { EnemyUnitsDisplay } from "./ui/EnemyUnitsDisplay";
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
import { RecallSelectionModal } from "./ui/RecallSelectionModal";
import { EtherBar } from "./ui/EtherBar";
import { Sword, Shield, Heart, Zap, Flame, Clock, Skull, X, ChevronUp, ChevronDown, Play, StepForward, RefreshCw, ICON_MAP } from "./ui/BattleIcons";
import { selectBattleAnomalies, applyAnomalyEffects, formatAnomaliesForDisplay } from "../../lib/anomalyUtils";
import { AnomalyDisplay, AnomalyNotification } from "./ui/AnomalyDisplay";
import { DefeatOverlay } from "./ui/DefeatOverlay";
import { TIMING, createStepOnceAnimations, executeCardActionCore, finishTurnCore, runAllCore, executeMultiHitAsync } from "./logic/battleExecution";
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
  // 개발자 모드: characterBuild 변경 감지
  const devCharacterBuild = useGameStore((state) => state.characterBuild);
  // 개발자 모드: 전투 중 토큰 추가
  const devBattleTokens = useGameStore((state) => state.devBattleTokens);
  const devClearBattleTokens = useGameStore((state) => state.devClearBattleTokens);
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
  const selectedTargetUnit = battle.selectedTargetUnit ?? 0;

  // 다중 유닛 시스템: 적 유닛 배열
  const enemyUnits = enemy?.units || [];
  const hasMultipleUnits = enemyUnits.length >= 1; // 유닛이 1개 이상이면 EnemyUnitsDisplay 사용

  // 현재 타겟 유닛 (살아있는 유닛 중 선택)
  const targetUnit = useMemo(() => {
    if (!enemyUnits || enemyUnits.length === 0) return null;
    const alive = enemyUnits.filter(u => u.hp > 0);
    if (alive.length === 0) return null;
    // 선택된 유닛이 살아있으면 그대로, 아니면 첫 번째 살아있는 유닛
    const selected = alive.find(u => u.unitId === selectedTargetUnit);
    return selected || alive[0];
  }, [enemyUnits, selectedTargetUnit]);

  // 선택된 유닛이 사망하면 다음 살아있는 유닛으로 자동 전환
  useEffect(() => {
    if (!hasMultipleUnits) return;
    const aliveUnits = enemyUnits.filter(u => u.hp > 0);
    if (aliveUnits.length === 0) return;
    const currentTarget = aliveUnits.find(u => u.unitId === selectedTargetUnit);
    if (!currentTarget) {
      // 현재 타겟이 사망했으므로 첫 번째 살아있는 유닛으로 전환
      actions.setSelectedTargetUnit(aliveUnits[0].unitId);
    }
  }, [enemyUnits, selectedTargetUnit, hasMultipleUnits]);

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
  // 탈주 카드는 사용된 다음 턴에만 등장 금지
  const escapeBanRef = useRef(new Set());
  const escapeUsedThisTurnRef = useRef(new Set());
  const logEndRef = useRef(null);
  const devilDiceTriggeredRef = useRef(false); // 턴 내 악마의 주사위 발동 여부
  const referenceBookTriggeredRef = useRef(false); // 턴 내 참고서 발동 여부
  const initialEtherRef = useRef(typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : (playerEther ?? 0));
  const resultSentRef = useRef(false);
  const turnStartProcessedRef = useRef(false); // 턴 시작 효과 중복 실행 방지
  const deckInitializedRef = useRef(false); // 덱이 초기화되었는지 추적 (첫 턴 중복 드로우 방지)
    const battleRef = useRef(battle); // battle 상태를 ref로 유지 (setTimeout closure 문제 해결)
  const displayEtherMultiplierRef = useRef(1); // 애니메이션 표시용 에테르 배율 (리셋되어도 유지)
  const [parryReadyStates, setParryReadyStates] = useState([]); // 쳐내기 패리 대기 상태 배열 (렌더링용)
  const parryReadyStatesRef = useRef([]); // 쳐내기 패리 대기 상태 배열 (setTimeout용)
  const growingDefenseRef = useRef(null); // 방어자세: { activatedSp, lastProcessedSp }

  const stepOnceRef = useRef(null); // stepOnce 함수 참조 (브리치 선택 후 진행 재개용)

  // 브리치 카드 선택 (커스텀 훅으로 분리)
  const {
    breachSelection,
    setBreachSelection,
    breachSelectionRef,
    creationQueueRef,
    handleBreachSelect
  } = useBreachSelection({
    CARDS,
    battleRef,
    stepOnceRef,
    addLog,
    actions
  });
  const timelineAnimationRef = useRef(null); // 타임라인 진행 애니메이션 ref
  const isExecutingCardRef = useRef(false); // executeCardAction 중복 실행 방지

  // 개발자 모드: 모든 보유 카드 100% 등장
  const [devForceAllCards, setDevForceAllCards] = useState(false);
  const devForceAllCardsRef = useRef(false);
  useEffect(() => { devForceAllCardsRef.current = devForceAllCards; }, [devForceAllCards]);

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
  // 상징 드래그 앤 드롭 (커스텀 훅으로 분리)
  const { handleRelicDragStart, handleRelicDragOver, handleRelicDrop } = useRelicDrag({
    orderedRelicList,
    actions
  });

  // 통찰 시스템 (커스텀 훅으로 분리)
  const { effectiveInsight, insightLevel, dulledLevel, insightReveal } = useInsightSystem({
    playerInsight: player.insight,
    playerInsightPenalty: player.insightPenalty,
    enemyShroud: enemy?.shroud,
    enemyUnits: enemy?.units,
    enemyPlanActions: enemyPlan.actions,
    battlePhase: battle.phase,
    devDulledLevel,
    actions
  });

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

  // 카드 툴팁 (커스텀 훅으로 분리)
  const { showCardTraitTooltip, hideCardTraitTooltip } = useCardTooltip({
    hoveredCard,
    battlePhase: battle.phase,
    actions
  });

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
    // 덱/무덤 시스템 초기화
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0 || currentBuild.ownedCards?.length > 0);

    // [DEBUG mainSpecials]
    console.log('[DEBUG mainSpecials] mainSpecials:', currentBuild?.mainSpecials, 'subSpecials:', currentBuild?.subSpecials, 'ownedCards:', currentBuild?.ownedCards?.length);
    console.log('[DEBUG mainSpecials] hasCharacterBuild:', hasCharacterBuild);

    // 덱이 이미 초기화되었으면 스킵 (두 번째 useEffect에서 처리)
    if (!deckInitializedRef.current) {
      if (hasCharacterBuild) {
        // 덱 초기화 (주특기는 손패로, 보조특기는 덱 맨 위로)
        const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, battle.vanishedCards || []);
        console.log('[DEBUG mainSpecials] mainSpecialsHand:', mainSpecialsHand);
        console.log('[DEBUG mainSpecials] initialDeck:', initialDeck);
        // 덱에서 카드 드로우
        const drawResult = drawFromDeck(initialDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current);
        actions.setDeck(drawResult.newDeck);
        actions.setDiscardPile(drawResult.newDiscardPile);
        // 주특기 + 드로우한 카드 = 손패
        console.log('[DEBUG mainSpecials] final hand:', [...mainSpecialsHand, ...drawResult.drawnCards]);
        actions.setHand([...mainSpecialsHand, ...drawResult.drawnCards]);
        deckInitializedRef.current = true;
      } else {
        // 캐릭터 빌드가 없으면 기존 방식 (테스트용)
        const rawHand = CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
        actions.setHand(rawHand);
        actions.setDeck([]);
        actions.setDiscardPile([]);
        deckInitializedRef.current = true;
      }
    }
    actions.setCanRedraw(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [DEV] 개발자 모드에서 주특기/보조특기 변경 시 덱 재구성
  const prevDevBuildRef = useRef(null);
  useEffect(() => {
    if (!devCharacterBuild) return;

    const prevBuild = prevDevBuildRef.current;
    const currentMainSpecials = devCharacterBuild.mainSpecials || [];
    const currentSubSpecials = devCharacterBuild.subSpecials || [];

    // 이전 값과 비교
    const prevMainSpecials = prevBuild?.mainSpecials || [];
    const prevSubSpecials = prevBuild?.subSpecials || [];

    const mainChanged = JSON.stringify(currentMainSpecials) !== JSON.stringify(prevMainSpecials);
    const subChanged = JSON.stringify(currentSubSpecials) !== JSON.stringify(prevSubSpecials);

    // 첫 렌더링이 아니고, 주특기 또는 보조특기가 변경된 경우
    if (prevBuild && (mainChanged || subChanged)) {
      console.log('[DEV] 주특기/보조특기 변경 감지 - 덱 재구성');
      console.log('[DEV] mainSpecials:', currentMainSpecials, 'subSpecials:', currentSubSpecials);

      const { deck: newDeck, mainSpecialsHand } = initializeDeck(devCharacterBuild, battle.vanishedCards || []);
      const drawResult = drawFromDeck(newDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current);

      actions.setDeck(drawResult.newDeck);
      actions.setDiscardPile(drawResult.newDiscardPile);
      actions.setHand([...mainSpecialsHand, ...drawResult.drawnCards]);

      console.log('[DEV] 새 손패:', [...mainSpecialsHand, ...drawResult.drawnCards].map(c => c.name));
    }

    prevDevBuildRef.current = { ...devCharacterBuild, mainSpecials: [...currentMainSpecials], subSpecials: [...currentSubSpecials] };
  }, [devCharacterBuild, battle.vanishedCards, actions]);

  // 개발자 모드: 전투 중 토큰 즉시 추가
  useEffect(() => {
    if (!devBattleTokens || devBattleTokens.length === 0) return;

    // 새 토큰들 처리
    devBattleTokens.forEach(tokenInfo => {
      const { id: tokenId, stacks, target } = tokenInfo;

      if (target === 'player') {
        const currentPlayer = battleRef.current?.player || player;
        const tokenResult = addToken(currentPlayer, tokenId, stacks);
        const updatedPlayer = { ...currentPlayer, tokens: tokenResult.tokens };

        actions.setPlayer(updatedPlayer);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: updatedPlayer };
        }

        const tokenName = TOKENS[tokenId]?.name || tokenId;
        addLog(`[DEV] 🎁 ${tokenName} +${stacks} 부여`);
      } else if (target === 'enemy') {
        const currentEnemy = battleRef.current?.enemy || enemy;
        const tokenResult = addToken(currentEnemy, tokenId, stacks);
        const updatedEnemy = { ...currentEnemy, tokens: tokenResult.tokens };

        actions.setEnemy(updatedEnemy);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: updatedEnemy };
        }

        const tokenName = TOKENS[tokenId]?.name || tokenId;
        addLog(`[DEV] 🎁 적에게 ${tokenName} +${stacks} 부여`);
      }
    });

    // 처리 후 클리어
    if (devClearBattleTokens) {
      devClearBattleTokens();
    }
  }, [devBattleTokens, devClearBattleTokens, player, enemy, actions, addLog]);

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
    // 승리 시에만 자동으로 결과 전송 (패배 시에는 사용자가 버튼 클릭 후 나감)
    if (postCombatOptions?.type === 'victory') {
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

      // 덱/무덤 시스템 초기화 (이미 초기화되었으면 스킵)
      if (!deckInitializedRef.current) {
        const currentBuild = useGameStore.getState().characterBuild;
        const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0 || currentBuild.ownedCards?.length > 0);

        if (hasCharacterBuild) {
          // 덱 초기화 (주특기는 손패로, 보조특기는 덱 맨 위로)
          const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, vanishedCards);
          // 덱에서 카드 드로우
          const drawResult = drawFromDeck(initialDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current);
          actions.setDeck(drawResult.newDeck);
          actions.setDiscardPile(drawResult.newDiscardPile);
          // 주특기 + 드로우한 카드 = 손패
          const fullHand = [...mainSpecialsHand, ...drawResult.drawnCards];
          actions.setHand(fullHand);
          deckInitializedRef.current = true; // 덱 초기화 완료 표시
          addLog(`🎴 시작 손패 ${fullHand.length}장 (주특기 ${mainSpecialsHand.length}장, 덱: ${drawResult.newDeck.length}장)`);
        } else {
          const rawHand = CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: `${card.id}_${idx}_${Math.random().toString(36).slice(2, 8)}` }));
          actions.setHand(rawHand);
          actions.setDeck([]);
          actions.setDiscardPile([]);
          deckInitializedRef.current = true; // 덱 초기화 완료 표시
          addLog(`🎴 시작 손패 ${rawHand.length}장`);
        }
      }
      actions.setSelected([]);
      actions.setCanRedraw(true);
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

  // 턴 시작 효과 처리 (커스텀 훅으로 분리)
  useTurnStartEffects({
    battle,
    player,
    enemy,
    enemyPlan,
    nextTurnEffects,
    turnNumber,
    baseMaxEnergy,
    orderedRelicList,
    playerEgos,
    playerTraits,
    enemyCount,
    battleRef,
    escapeBanRef,
    turnStartProcessedRef,
    etherSlots,
    playSound,
    addLog,
    actions
  });

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

    if (battle.phase !== 'select') {
      return;
    }

    // battleRef에서 최신 manuallyModified 확인
    const latestManuallyModified = currentEnemyPlan?.manuallyModified || enemyPlan?.manuallyModified;
    const latestActions = currentEnemyPlan?.actions || enemyPlan?.actions;
    const latestMode = currentEnemyPlan?.mode || enemyPlan?.mode;

    if (!latestMode) {
      return;
    }

    // manuallyModified가 true면 재생성하지 않음 (카드 파괴 등으로 수동 변경된 경우)
    if ((latestActions && latestActions.length > 0) || latestManuallyModified) {
      return;
    }

    const slots = etherSlots(enemy?.etherPts || 0);
    const cardsPerTurn = enemy?.cardsPerTurn || enemyCount || 2;
    const rawActions = generateEnemyActions(enemy, latestMode, slots, cardsPerTurn, Math.min(1, cardsPerTurn));
    const generatedActions = assignSourceUnitToActions(rawActions, enemy?.units || []);
    actions.setEnemyPlan({ mode: latestMode, actions: generatedActions });
  }, [battle.phase, enemyPlan?.mode, enemyPlan?.actions?.length, enemyPlan?.manuallyModified, enemy]);

  const totalEnergy = useMemo(() => battle.selected.reduce((s, c) => s + c.actionCost, 0), [battle.selected]);
  const totalSpeed = useMemo(
    () => battle.selected.reduce((s, c) => s + applyAgility(c.speedCost, effectiveAgility), 0),
    [battle.selected, effectiveAgility]
  );
  // 콤보 시스템 (커스텀 훅으로 분리)
  const { currentCombo, finalComboMultiplier, comboPreviewInfo, comboStepsLog } = useComboSystem({
    battleSelected: battle.selected,
    battlePhase: battle.phase,
    playerComboUsageCount: player.comboUsageCount,
    resolvedPlayerCards,
    battleQIndex: battle.qIndex,
    battleQueueLength: battle.queue.length,
    computeComboMultiplier,
    explainComboMultiplier,
    orderedRelicList,
    selected,
    actions
  });

  // 카드 선택 (커스텀 훅으로 분리)
  const { toggle, moveUp, moveDown } = useCardSelection({
    battlePhase: battle.phase,
    battleSelected: battle.selected,
    selected,
    effectiveAgility,
    effectiveMaxSubmitCards,
    totalSpeed,
    totalEnergy,
    player,
    enemyUnits,
    hasMultipleUnits,
    selectedTargetUnit,
    enemyPlanActions: enemyPlan.actions,
    startDamageDistribution,
    playSound,
    addLog,
    actions
  });

  // 효과음 재생 함수 (useCallback으로 안정적인 참조 유지)
  const playSound = useCallback((frequency = 800, duration = 100) => {
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
  }, []);

  // 패 관리 (커스텀 훅으로 분리)
  const { redrawHand, cycleSortType, getSortedHand } = useHandManagement({
    canRedraw,
    battleHand: battle.hand,
    battleDeck: battle.deck,
    battleDiscardPile: battle.discardPile,
    sortType,
    hand,
    escapeBanRef,
    addLog,
    playSound,
    actions
  });

  // 페이즈 전환 (커스텀 훅으로 분리)
  const { startResolve, beginResolveFromRespond, rewindToSelect } = usePhaseTransition({
    battleRef,
    battlePhase: battle.phase,
    battleSelected: battle.selected,
    selected,
    fixedOrder,
    effectiveAgility,
    enemy,
    enemyPlan,
    enemyCount,
    player,
    willOverdrive,
    turnNumber,
    rewindUsed,
    respondSnapshot,
    devilDiceTriggeredRef,
    etherSlots,
    playSound,
    addLog,
    actions
  });

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
    if (battle.phase !== 'respond') return;
    if (!enemyPlan.manuallyModified) return;
    if (!fixedOrder) return;

    // fixedOrder에서 파괴된 적 카드 제거 (enemyPlan.actions에 없는 적 카드)
    const remainingEnemyActions = new Set(enemyPlan.actions);

    const updatedFixedOrder = fixedOrder.filter(item => {
      if (item.actor === 'player') return true;
      // 적 카드는 현재 enemyPlan.actions에 있는 것만 유지
      const isRemaining = remainingEnemyActions.has(item.card);
      return isRemaining;
    });

    if (updatedFixedOrder.length !== fixedOrder.length) {
      actions.setFixedOrder(updatedFixedOrder);
    }
  }, [battle.phase, enemyPlan.actions, enemyPlan.manuallyModified, fixedOrder]);

  // 에테르 계산 애니메이션 (커스텀 훅으로 분리)
  const { startEtherCalculationAnimation } = useEtherAnimation({
    selected,
    battleSelected: battle.selected,
    finalComboMultiplier,
    displayEtherMultiplierRef,
    player,
    enemy,
    enemyPlan,
    enemyTurnEtherAccumulated,
    battleRef,
    playSound,
    actions
  });

  // 진행 단계 실행 (커스텀 훅으로 분리)
  const { finishTurn, runAll } = useResolveExecution({
    battle,
    player,
    enemy,
    selected,
    queue,
    qIndex,
    turnNumber,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    finalComboMultiplier,
    enemyPlan,
    relics,
    orderedRelicList,
    battleRef,
    parryReadyStatesRef,
    setParryReadyStates,
    growingDefenseRef,
    escapeBanRef,
    escapeUsedThisTurnRef,
    calculateEtherTransfer,
    checkVictoryCondition,
    showCardRewardModal,
    startEtherCalculationAnimation,
    addLog,
    playSound,
    actions
  });

  // 보상 및 함성 선택 (커스텀 훅으로 분리)
  const {
    cardReward,
    recallSelection,
    setRecallSelection,
    handleRewardSelect,
    handleRewardSkip,
    handleRecallSelect,
    handleRecallSkip,
    showCardRewardModal
  } = useRewardSelection({
    CARDS,
    battleRef,
    battleNextTurnEffects: battle.nextTurnEffects,
    addLog,
    actions
  });

  // 다중 타겟 선택 시스템 (커스텀 훅으로 분리)
  const { handleConfirmDistribution, handleCancelDistribution, startDamageDistribution } = useMultiTargetSelection({
    battlePendingDistributionCard: battle.pendingDistributionCard,
    battleDamageDistribution: battle.damageDistribution,
    enemyUnits,
    addLog,
    actions
  });

  // stepOnce와 executeCardAction을 훅으로 분리
  const { stepOnce } = useStepExecution({
    battle,
    player,
    enemy,
    turnNumber,
    turnEtherAccumulated,
    enemyTurnEtherAccumulated,
    cardUsageCount,
    nextTurnEffects,
    orderedRelicList,
    relics,
    cardUpgrades,
    resolvedPlayerCards,
    playerTimeline,
    CARDS,
    battleRef,
    breachSelectionRef,
    setBreachSelection,
    creationQueueRef,
    stepOnceRef,
    timelineAnimationRef,
    isExecutingCardRef,
    parryReadyStatesRef,
    setParryReadyStates,
    growingDefenseRef,
    escapeBanRef,
    escapeUsedThisTurnRef,
    referenceBookTriggeredRef,
    devilDiceTriggeredRef,
    addLog,
    playSound,
    flashRelic,
    actions
  });

  // stepOnce를 ref에 저장 (브리치 선택 후 진행 재개용)
  stepOnceRef.current = stepOnce;

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

  // 타임라인 계산 (커스텀 훅으로 분리)
  const { playerTimeline, enemyTimeline } = useBattleTimelines({
    battlePhase: battle.phase,
    battleSelected: battle.selected,
    fixedOrder,
    battleQueue: battle.queue,
    playerComboUsageCount: player.comboUsageCount,
    effectiveAgility,
    enemyPlanActions: enemyPlan.actions,
    insightReveal,
    selected
  });

  // 피해 미리보기 계산 및 사운드 (커스텀 훅으로 분리)
  useDamagePreview({
    battlePhase: battle.phase,
    player,
    enemy,
    fixedOrder,
    playerTimeline,
    willOverdrive,
    enemyPlan,
    targetUnit,
    hasMultipleUnits,
    enemyUnits,
    selectedTargetUnit,
    actions,
    playSound
  });

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

  const handDisabled = (c) => {
    // 기본 체크: 최대 선택 수, 속도 한계, 행동력 부족
    if (battle.selected.length >= effectiveMaxSubmitCards ||
        totalSpeed + applyAgility(c.speedCost, effectiveAgility) > player.maxSpeed ||
        totalEnergy + c.actionCost > player.maxEnergy) {
      return true;
    }

    // 필요 토큰 체크 (기교 등)
    if (c.requiredTokens && Array.isArray(c.requiredTokens)) {
      for (const req of c.requiredTokens) {
        const currentStacks = getTokenStacks(player, req.id);
        if (currentStacks < (req.stacks || 1)) {
          return true;  // 토큰 부족
        }
      }
    }

    return false;
  };
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

  // 에테르 획득량 미리보기 (커스텀 훅으로 분리)
  const previewEtherGain = useEtherPreview({
    playerTimeline,
    selected,
    orderedRelicList,
    playerComboUsageCount: player.comboUsageCount
  });

  // 적 조합 감지 (표시용)
  const enemyCombo = useMemo(() => detectPokerCombo(enemyPlan.actions || []), [enemyPlan.actions]);

  // 적 성향 힌트 추출
  const enemyHint = useMemo(() => {
    const hintLog = battle.log.find(line => line.includes('적 성향 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 성향 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [battle.log]);

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

      {/* 함성 (recallCard) 카드 선택 모달 */}
      <RecallSelectionModal
        recallSelection={recallSelection}
        onSelect={handleRecallSelect}
        onSkip={handleRecallSkip}
      />

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
            {/* 다중 유닛: EnemyUnitsDisplay, 단일 적: EnemyHpBar */}
            {hasMultipleUnits ? (
              <EnemyUnitsDisplay
                units={enemyUnits}
                selectedTargetUnit={selectedTargetUnit}
                onSelectUnit={(unitId) => actions.setSelectedTargetUnit(unitId)}
                previewDamage={previewDamage}
                perUnitPreviewDamage={battle.perUnitPreviewDamage}
                dulledLevel={dulledLevel}
                phase={battle.phase}
                enemyHit={enemyHit}
                enemyBlockAnim={enemyBlockAnim}
                soulShatter={soulShatter}
                enemyEtherValue={enemyEtherValue}
                enemyEtherCapacity={enemy?.etherCapacity ?? 300}
                enemyTransferPulse={enemyTransferPulse}
                formatCompactValue={formatCompactValue}
                enemyBlock={enemy?.block || 0}
                enemyDef={enemy?.def || false}
                // 피해 분배 시스템
                distributionMode={battle.distributionMode}
                damageDistribution={battle.damageDistribution}
                totalDistributableDamage={battle.totalDistributableDamage}
                onUpdateDistribution={(unitId, damage) => actions.updateDamageDistribution(unitId, damage)}
                onConfirmDistribution={handleConfirmDistribution}
                onCancelDistribution={handleCancelDistribution}
              />
            ) : (
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
            )}
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
          <button onClick={() => {
            setDevForceAllCards(!devForceAllCards);
            playSound(500, 60);
          }} className={`btn-enhanced ${devForceAllCards ? 'btn-primary' : ''} flex items-center gap-2`} style={{ fontSize: '0.8rem' }}>
            🛠️ DEV: 전체카드 {devForceAllCards ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
      {/* 패배 시 중앙 오버레이 */}
      {postCombatOptions?.type === 'defeat' && (
        <DefeatOverlay onExit={handleExitToMap} />
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
        deck={battle.deck || []}
        discardPile={battle.discardPile || []}
        enemyUnits={enemyUnits}
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
