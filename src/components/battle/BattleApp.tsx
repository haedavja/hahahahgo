/**
 * @file BattleApp.tsx
 * @description 전투 시스템 메인 컴포넌트 (오케스트레이션 레이어)
 *
 * 이 파일은 전투 시스템의 모든 조각을 조율하는 메인 컴포넌트입니다.
 * 실제 로직과 UI는 이미 다음과 같이 모듈화되어 있습니다:
 *
 * ## 커스텀 훅 (./hooks/)
 * - useBattleState: 전투 상태 관리 (useReducer 기반)
 * - useDamagePreview: 데미지 미리보기 계산
 * - useBattleTimelines: 타임라인 시스템
 * - useInsightSystem: 통찰 시스템
 * - useComboSystem: 콤보 감지 및 계산
 * - useResolveExecution: 전투 진행 실행
 * - usePhaseTransition: 페이즈 전환
 * - useHandManagement: 손패 관리
 * - useCardSelection: 카드 선택
 * - useEtherPreview: 에테르 미리보기
 * - useEtherAnimation: 에테르 애니메이션
 * - useKeyboardShortcuts: 키보드 단축키
 * - 기타 20+ 훅
 *
 * ## UI 컴포넌트 (./ui/)
 * - PlayerHpBar, EnemyHpBar: HP 표시
 * - PlayerEtherBox, EnemyEtherBox: 에테르 표시
 * - HandArea: 손패 영역
 * - TimelineDisplay: 타임라인
 * - CentralPhaseDisplay: 중앙 페이즈 표시
 * - EnemyUnitsDisplay: 다중 유닛 표시
 * - BattleLog, BattleTooltips: 로그 및 툴팁
 * - 기타 15+ 컴포넌트
 *
 * ## 유틸리티 (./utils/)
 * - battleSimulation: 전투 시뮬레이션
 * - combatUtils: 전투 유틸리티
 * - enemyAI: 적 AI
 * - comboDetection: 콤보 감지
 * - etherCalculations: 에테르 계산
 * - 기타 30+ 유틸리티
 *
 * @see ./hooks/ - 커스텀 훅
 * @see ./ui/ - UI 컴포넌트
 * @see ./utils/ - 유틸리티 함수
 * @see ./logic/ - 전투 로직
 */

/// <reference types="react" />

import React, { useState, useEffect, useRef, memo, useCallback, lazy, Suspense, type MutableRefObject } from "react";
import type { JSX } from 'react';
import { flushSync } from "react-dom";
import "./legacy-battle.css";
import { playHitSound, playBlockSound, playParrySound, playSound } from "../../lib/soundUtils";
import { useBattleState } from "./hooks/useBattleState";
import { useDamagePreview } from "./hooks/useDamagePreview";
import { useBattleTimelines } from "./hooks/useBattleTimelines";
import { useInsightSystem } from "./hooks/useInsightSystem";
import { useRelicDrag } from "./hooks/useRelicDrag";
import { useFlashRelic } from "./hooks/useFlashRelic";
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
import { useBattleInitialization } from "./hooks/useBattleInitialization";
import { useBattleRefs } from "./hooks/useBattleRefs";
import { useDevModeEffects } from "./hooks/useDevModeEffects";
import { usePhaseEffects } from "./hooks/usePhaseEffects";
import { useResolveProgressEffects } from "./hooks/useResolveProgressEffects";
import { useTimelineProgression } from "./hooks/useTimelineProgression";
import { useEnemyPlanGeneration } from "./hooks/useEnemyPlanGeneration";
import { useQueueRecovery } from "./hooks/useQueueRecovery";
import { useAnomalyNotification } from "./hooks/useAnomalyNotification";
import { useCombatStartSetup } from "./hooks/useCombatStartSetup";
import { usePlayerInitialization } from "./hooks/usePlayerInitialization";
import { useEnemyInitialization } from "./hooks/useEnemyInitialization";
import { useBattleSyncEffects } from "./hooks/useBattleSyncEffects";
import { useBattleRefSync } from "./hooks/useBattleRefSync";
import { useEnemyDisplayData } from "./hooks/useEnemyDisplayData";
import { useRenderComputations } from "./hooks/useRenderComputations";
import { useGameStoreSelectors } from "./hooks/useGameStoreSelectors";
import { useComboMultiplierCallbacks } from "./hooks/useComboMultiplierCallbacks";
import { useBattleResultCallbacks } from "./hooks/useBattleResultCallbacks";
import { useBattleUtilityCallbacks } from "./hooks/useBattleUtilityCallbacks";
import { useDerivedBattleState } from "./hooks/useDerivedBattleState";
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
import { calculateEtherSlots, MAX_SLOTS } from "../../lib/etherUtils";
import { ANIMATION_TIMING } from "./ui/constants/layout";
import { CharacterSheet } from "../character/CharacterSheet";
import { useGameStore } from "../../state/gameStore";
import { ItemSlots } from "./ui/ItemSlots";
import { PathosSlots } from "./ui/PathosSlots";
import { PathosCooldowns, PathosUseResult } from "../../lib/pathosEffects";
import { usePathosManagement } from "./hooks/usePathosManagement";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_EFFECT, RELIC_RARITY_COLORS } from "../../lib/relics";
import { hasTrait, hasEnemyUnits, markCrossedCards } from "./utils/battleUtils";
import { COMBO_MULTIPLIERS, BASE_ETHER_PER_CARD, CARD_ETHER_BY_RARITY, getCardEtherGain } from "./utils/etherCalculations";
import { generateEnemyActions, shouldEnemyOverdrive, assignSourceUnitToActions } from "./utils/enemyAI";
import { simulatePreview } from "./utils/battleSimulation";
import { applyAction } from "./logic/combatActions";
import { initializeDeck, drawFromDeck } from "./utils/handGeneration";
import { playInsightSound } from "./utils/insightSystem";
import { calculateEtherTransfer } from "./utils/etherTransfer";
import { formatCompactValue } from "./utils/formatUtils";
import { generateHandUid, generateUid } from "../../lib/randomUtils";
import { checkVictoryCondition } from "./utils/turnEndStateUpdate";
import { processImmediateCardTraits, processCardPlayedRelicEffects } from "./utils/cardImmediateEffects";
import { collectTriggeredRelics, playRelicActivationSequence } from "./utils/relicActivationAnimation";
import { processActionEventAnimations } from "./utils/eventAnimationProcessing";
import { processStunEffect } from "./utils/stunProcessing";
import { setupParryReady, checkParryTrigger } from "./utils/parryProcessing";
import { processPlayerEtherAccumulation, processEnemyEtherAccumulation } from "./utils/etherAccumulationProcessing";
import { processEnemyDeath } from "./utils/enemyDeathProcessing";
import { renderNameWithBadge } from "./utils/cardRenderingUtils";
// reflectionEffects 제거됨 - 새 성장 시스템(growthSlice)으로 대체
import { addToken, removeToken, getAllTokens, expireTurnTokensByTimeline, getTokenStacks, setTokenStacks } from "../../lib/tokenUtils";
import { TOKENS } from "../../data/tokens";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import {
  calculatePassiveEffects,
  applyCombatStartEffects
} from "../../lib/relicEffects";
import type { BattlePayload, BattleResult, OrderItem, Card, ItemSlotsBattleActions, AIMode, AICard, AIEnemy, TokenEntity, SpecialCard, HandCard, SpecialActor, SpecialBattleContext, SpecialQueueItem, CombatState, CombatCard, CombatBattleContext, ParryReadyState, ComboCard, HandAction, BattleRef, UITimelineAction, UIRelicsMap, RelicRarities, HoveredCard, HoveredEnemyAction, TimelineBattle, TimelineEnemy, CentralPlayer, ItemSlotsEnemyPlan, ItemSlotsBattleRef, SimulationResult, ExpectedDamagePlayer, ExpectedDamageEnemy, AnomalyWithLevel, BreachSelection, RecallSelection, BattleRefType, EscapeBanRefType, CommonBattleActions, BattleRefValue, SimActionEvent } from "../../types";
import type { Relic, TokenType, TokenInstance, TokenEffect } from "../../types/core";
import type { BattleEvent, SingleHitResult, PlayerCombatData, EnemyCombatData, CardPlaySpecialsResult } from "../../types/combat";
import type { PlayerState, EnemyState, SortType, BattlePhase } from "./reducer/battleReducerActions";
import type { BattleActions } from "./hooks/useBattleState";
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
import { BattleModals, BattleSidebars, BattleCombatArea } from "./ui/layout";
// Lazy loaded for code splitting - conditionally used components
const ExpectedDamagePreview = lazy(() => import("./ui/ExpectedDamagePreview").then(m => ({ default: m.ExpectedDamagePreview })));
// 모달 lazy loading은 BattleModals 컴포넌트로 이동됨
import { BattleControlButtons } from "./ui/BattleControlButtons";
import { EnergyDisplayFixed } from "./ui/EnergyDisplayFixed";
import { EtherBar } from "./ui/EtherBar";
import { Sword, Shield, Heart, Zap, Flame, Clock, Skull, X, ChevronUp, ChevronDown, Play, StepForward, RefreshCw, ICON_MAP } from "./ui/BattleIcons";
import { selectBattleAnomalies, applyAnomalyEffects } from "../../lib/anomalyUtils";
import { createReducerEnemyState } from "../../state/battleHelpers";
// Lazy loaded - conditionally shown based on anomaly state
const AnomalyDisplay = lazy(() => import("./ui/AnomalyDisplay").then(m => ({ default: m.AnomalyDisplay })));
const AnomalyNotification = lazy(() => import("./ui/AnomalyDisplay").then(m => ({ default: m.AnomalyNotification })));
import { TIMING, executeMultiHitAsync } from "./logic/battleExecution";
import { processTimelineSpecials, hasSpecial, processCardPlaySpecials } from "./utils/cardSpecialEffects";
import { distributeUnitDamage, type EnemyUnit } from "./utils/unitDamageDistribution";
import { processRequiredTokenConsumption, processBurnDamage, processBlockPerCardExecution } from "./utils/tokenConsumptionProcessing";
import { generateBreachCards, generateFencingCards, generateExecutionSquadCards, type CreationQueueItem } from "./utils/cardCreationProcessing";
import { processViolentMortExecution } from "./utils/executionEffects";
import { processTokenExpiration } from "./utils/tokenExpirationProcessing";
import { resolveAttackTarget, resolveDefenseSource, updateAttackTargetBlock, applyDefenseToUnit } from "./utils/unitTargetingUtils";
import { applyTimelineChanges, duplicatePlayerCards, insertCardsIntoQueue } from "./utils/timelineQueueUtils";
import { processAllNextTurnEffects } from "./utils/cardPlaySpecialsProcessing";
import { createTokenActions } from "./utils/tokenActionHandlers";
import { createFixedOrder } from "./utils/cardOrdering";

// HandArea용 로컬 Card 타입 - 제거됨 (Card 타입 직접 사용)

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
const etherSlots = (pts: number): number => calculateEtherSlots(pts || 0); // 인플레이션 적용

// =====================
// Game Component
// =====================
interface GameProps {
  initialPlayer: BattlePayload['player'];
  initialEnemy: BattlePayload['enemy'];
  playerEther?: number;
  onBattleResult?: (result: BattleResult) => void;
  liveInsight?: number;
}

const Game = memo(function Game({ initialPlayer, initialEnemy, playerEther = 0, onBattleResult, liveInsight }: GameProps): JSX.Element | null {
  // 스토어에서 필요한 추가 상태만 가져오기 (커스텀 훅으로 분리)
  const {
    playerTraits,
    playerEgos,
    devCharacterBuild,
    devBattleTokens,
    devClearBattleTokens,
    relics,
    playerStrength,
    devDulledLevel,
    cardUpgrades
  } = useGameStoreSelectors();

  // 전투 초기화 훅 사용 - 플레이어/적 초기 상태, 이변, 상징 효과 등 계산
  const {
    initialPlayerState,
    initialEnemyState,
    activeAnomalies,
    showAnomalyNotification,
    setShowAnomalyNotification,
    orderedRelics,
    orderedRelicList,
    setOrderedRelics,
    mergeRelicOrder,
    passiveRelicStats,
    effectiveAgility,
    effectiveCardDrawBonus,
    effectiveMaxSubmitCards: baseMaxSubmitCards,
    baseMaxEnergy,
    startingEther,
    startingBlock,
    startingStrength,
    startingInsight,
    initialSortType,
    initialIsSimplified,
    enemyCount,
    isBoss,
  } = useBattleInitialization({
    initialPlayer,
    initialEnemy,
    playerEther,
  });

  // 안전한 초기값 (훅 내부에서도 사용되지만 일부 로직에 필요)
  const safeInitialPlayer = initialPlayer ?? {} as Partial<BattlePayload['player']>;
  const safeInitialEnemy = initialEnemy ?? {} as Partial<BattlePayload['enemy']>;

  // Initialize battle state with useReducer
  const { battle, actions } = useBattleState({
    player: initialPlayerState,
    enemyIndex: 0,
    enemy: initialEnemyState,
    phase: 'select',
    hand: [],
    selected: [],
    canRedraw: true,
    sortType: initialSortType,
    isSimplified: initialIsSimplified,
    enemyPlan: { actions: [], mode: null },
    fixedOrder: undefined,
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
    reflectionState: {}, // 레거시: 새 성장 시스템으로 대체됨
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

  // 파생 전투 상태 (적 유닛, 타겟 유닛, 카드 제출 수 제한, 총 에너지/속도)
  const { enemyUnits, hasMultipleUnits, targetUnit, effectiveMaxSubmitCards, totalEnergy, totalSpeed } = useDerivedBattleState({
    enemy: enemy as { units?: { unitId: number; hp: number }[] } | null,
    player: player as { tokens?: import('../../types/core').TokenState },
    selectedTargetUnit,
    baseMaxSubmitCards,
    nextTurnEffects: battle.nextTurnEffects,
    battleSelected: battle.selected as { actionCost: number; speedCost: number }[],
    effectiveAgility
  });

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

  // 상징 순서 병합은 useBattleRefSync에서 처리

  // 유틸리티 콜백 훅 (addLog, formatSpeedText)
  const { addLog, formatSpeedText } = useBattleUtilityCallbacks({
    effectiveAgility,
    actions: { addLog: actions.addLog }
  });

  // 카드 성장 상태 (강화 효과 적용)
  const cardGrowth = useGameStore((state) => state.cardGrowth || {});

  // 전투 ref 통합 관리 (useBattleRefs 커스텀 훅)
  const {
    escapeBanRef,
    escapeUsedThisTurnRef,
    devilDiceTriggeredRef,
    referenceBookTriggeredRef,
    turnStartProcessedRef,
    deckInitializedRef,
    timelineAnimationRef,
    isExecutingCardRef,
    parryReadyStatesRef,
    growingDefenseRef,
    prevInsightRef,
    prevRevealLevelRef,
    displayEtherMultiplierRef,
    initialEtherRef,
    logEndRef,
    resultSentRef,
  } = useBattleRefs({
    initialEther: typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : (playerEther ?? 0)
  });

  // battle 상태를 ref로 유지 (setTimeout closure 문제 해결)
  // BattleRefValue | null 타입으로 명시하여 훅들에서 as unknown 캐스트 불필요
  const battleRef = useRef<BattleRefValue | null>(battle as BattleRefValue);
  const [parryReadyStates, setParryReadyStates] = useState<ParryReadyState[]>([]); // 쳐내기 패리 대기 상태 배열 (렌더링용)

  // 파토스 시스템 관리 (커스텀 훅으로 분리)
  const {
    pathosCooldowns,
    pathosTurnEffects,
    pathosNextCardEffects,
    handlePathosUsed,
    consumeNextCardEffects,
  } = usePathosManagement({
    actions,
    battlePhase: battle.phase,
    turnNumber: battle.turnNumber,
    battleRef: battleRef as React.MutableRefObject<{ pathosTurnEffects?: PathosUseResult['turnEffects']; pathosNextCardEffects?: PathosUseResult['nextCardEffects'] } | null>,
  });

  // 이변 알림 닫기 핸들러 (메모이제이션)
  const handleDismissAnomalyNotification = React.useCallback(() => {
    setShowAnomalyNotification(false);
  }, [setShowAnomalyNotification]);

  const stepOnceRef = useRef<(() => void) | null>(null); // stepOnce 함수 참조 (브리치 선택 후 진행 재개용)
  const executeCardActionRef = useRef<(() => void) | null>(null); // executeCardAction 함수 참조 (타임라인 훅에서 사용)

  // 브리치 카드 선택 (커스텀 훅으로 분리)
  const {
    breachSelection,
    setBreachSelection,
    breachSelectionRef,
    creationQueueRef,
    handleBreachSelect
  } = useBreachSelection({
    CARDS: CARDS as Card[],
    battleRef,
    stepOnceRef,
    addLog,
    actions
  });

  // 개발자 모드: 모든 보유 카드 100% 등장
  const [devForceAllCards, setDevForceAllCards] = useState(false);
  const devForceAllCardsRef = useRef(false);

  // 전투 상태 ref 동기화 (커스텀 훅으로 분리)
  useBattleRefSync({
    battle: battle as { phase: import('./reducer/battleReducerActions').BattlePhase; nextTurnEffects?: Record<string, unknown> },
    battleRef: battleRef as MutableRefObject<{ phase: import('./reducer/battleReducerActions').BattlePhase; nextTurnEffects?: Record<string, unknown> }>,
    player: player as { etherMultiplier?: number },
    displayEtherMultiplierRef,
    devForceAllCards,
    devForceAllCardsRef,
    relics,
    orderedRelicList,
    mergeRelicOrder,
    actions: {
      setOrderedRelics: actions.setOrderedRelics
    }
  });

  // 콤보 배율 계산 콜백 (커스텀 훅으로 분리)
  const { computeComboMultiplier, explainComboMultiplier } = useComboMultiplierCallbacks({
    orderedRelicList
  });

  // 상징 발동 애니메이션 (커스텀 훅으로 분리)
  const { flashRelic } = useFlashRelic({
    activeRelicSet,
    relicActivated,
    actions: {
      setActiveRelicSet: actions.setActiveRelicSet,
      setRelicActivated: actions.setRelicActivated,
      setMultiplierPulse: actions.setMultiplierPulse
    }
  });

  // 상징 드래그 앤 드롭 (커스텀 훅으로 분리)
  const { handleRelicDragStart, handleRelicDragOver, handleRelicDrop } = useRelicDrag({
    orderedRelicList,
    actions: actions as { setRelicActivated: (relicId: string | null) => void; setOrderedRelics: (relics: string[]) => void }
  });

  // 통찰 시스템 (커스텀 훅으로 분리)
  const { effectiveInsight, insightLevel, dulledLevel, insightReveal } = useInsightSystem({
    playerInsight: player.insight ?? 0,
    playerInsightPenalty: player.insightPenalty ?? 0,
    enemyShroud: enemy?.shroud ?? 0,
    enemyUnits: enemy?.units ?? [],
    enemyPlanActions: enemyPlan.actions,
    battlePhase: battle.phase,
    devDulledLevel,
    actions
  });

  // 전투 결과 콜백 훅
  const { notifyBattleResult, closeCharacterSheet, handleExitToMap } = useBattleResultCallbacks({
    player: player as { etherPts?: number; hp?: number; maxHp?: number },
    enemy: enemy as { hp?: number } | null,
    postCombatOptions,
    initialEtherRef: initialEtherRef as MutableRefObject<number>,
    resultSentRef,
    onBattleResult,
    actions: { setShowCharacterSheet: actions.setShowCharacterSheet }
  });

  // 카드 툴팁 (커스텀 훅으로 분리)
  const { showCardTraitTooltip, hideCardTraitTooltip } = useCardTooltip({
    hoveredCard,
    battlePhase: battle.phase,
    actions: actions as { setHoveredCard: (card: unknown) => void; setTooltipVisible: (visible: boolean) => void }
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battle.log]);

  // 플레이어 초기화 훅
  usePlayerInitialization({
    player: player as { hp?: number; maxHp?: number; energy?: number; etherPts?: number; strength?: number; insight?: number; [key: string]: unknown },
    safeInitialPlayer: safeInitialPlayer as Partial<{ hp?: number; maxHp?: number; energy?: number; etherPts?: number; strength?: number; insight?: number }>,
    playerEther: playerEther ?? 0,
    startingStrength: startingStrength ?? 0,
    startingInsight: startingInsight ?? 0,
    battle: { insightAnimPulseKey: battle.insightAnimPulseKey, insightBadge: battle.insightBadge, vanishedCards: battle.vanishedCards },
    allCards: CARDS as Card[],
    initialEtherRef: initialEtherRef as MutableRefObject<number>,
    resultSentRef,
    turnStartProcessedRef,
    prevInsightRef,
    prevRevealLevelRef,
    deckInitializedRef,
    escapeBanRef: escapeBanRef as MutableRefObject<Set<string>>,
    actions: {
      setPlayer: actions.setPlayer as (player: unknown) => void,
      setSelected: actions.setSelected as (selected: unknown[]) => void,
      setQueue: actions.setQueue as (queue: unknown[]) => void,
      setQIndex: actions.setQIndex,
      setFixedOrder: actions.setFixedOrder as (order: unknown) => void,
      setPostCombatOptions: actions.setPostCombatOptions as (options: unknown) => void,
      setEnemyPlan: actions.setEnemyPlan as (plan: { actions: unknown[]; mode: unknown }) => void,
      setInsightAnimLevel: actions.setInsightAnimLevel,
      setInsightAnimPulseKey: actions.setInsightAnimPulseKey,
      setEnemyEtherFinalValue: actions.setEnemyEtherFinalValue as (value: unknown) => void,
      setEnemyEtherCalcPhase: actions.setEnemyEtherCalcPhase as (phase: unknown) => void,
      setEnemyCurrentDeflation: actions.setEnemyCurrentDeflation as (deflation: unknown) => void,
      setInsightBadge: actions.setInsightBadge as (badge: unknown) => void,
      setPhase: actions.setPhase,
      setDeck: actions.setDeck,
      setDiscardPile: actions.setDiscardPile,
      setHand: actions.setHand,
      setCanRedraw: actions.setCanRedraw
    }
  });

  // 개발자 모드 효과 (힘 변경, 덱 재구성, 토큰 추가)
  useDevModeEffects({
    battlePhase: battle.phase,
    player,
    enemy,
    playerStrength,
    devCharacterBuild,
    devBattleTokens: devBattleTokens as { id: string; stacks: number; target: 'player' | 'enemy' }[] | null,
    devClearBattleTokens,
    vanishedCards: battle.vanishedCards || [],
    escapeBanRef: escapeBanRef as MutableRefObject<Set<string>>,
    battleRef: battleRef as MutableRefObject<{ player?: { strength?: number; tokens?: unknown }; enemy?: { tokens?: unknown } }>,
    addLog,
    cardGrowth,
    actions: {
      setPlayer: actions.setPlayer as (p: unknown) => void,
      setEnemy: actions.setEnemy as (e: unknown) => void,
      setDeck: actions.setDeck as (d: unknown) => void,
      setDiscardPile: actions.setDiscardPile as (p: unknown) => void,
      setHand: actions.setHand as (h: unknown) => void
    }
  });

  // 적 초기화 (커스텀 훅으로 분리)
  useEnemyInitialization({
    initialEnemy: initialEnemy as { deck?: string[]; name?: string },
    prevRevealLevelRef,
    actions: {
      setEnemy: actions.setEnemy as (enemy: unknown) => void,
      setSelected: actions.setSelected as (selected: unknown[]) => void,
      setQueue: actions.setQueue as (queue: unknown[]) => void,
      setQIndex: actions.setQIndex,
      setFixedOrder: actions.setFixedOrder as (order: unknown) => void,
      setPhase: actions.setPhase
    }
  });

  // 페이즈 변경 관련 효과 통합 (커스텀 훅으로 분리)
  usePhaseEffects({
    phase: battle.phase,
    fixedOrder,
    enemyPlanActions: enemyPlan.actions,
    enemyPlanManuallyModified: enemyPlan.manuallyModified,
    devilDiceTriggeredRef,
    referenceBookTriggeredRef,
    actions: {
      setDisappearingCards: actions.setDisappearingCards,
      setHiddenCards: actions.setHiddenCards,
      setUsedCardIndices: actions.setUsedCardIndices,
      setFixedOrder: actions.setFixedOrder
    }
  });

  // 이변 알림 표시 (커스텀 훅으로 분리)
  useAnomalyNotification({
    enemy,
    activeAnomalies: activeAnomalies as { anomaly: { emoji: string; name: string; getEffect: (level: number) => { description: string } }; level: number }[],
    addLog
  });

  // 전투 시작 설정 (커스텀 훅으로 분리)
  useCombatStartSetup({
    enemy,
    enemyIndex,
    orderedRelicList,
    vanishedCards,
    allCards: CARDS as Card[],
    deckInitializedRef,
    escapeBanRef: escapeBanRef as MutableRefObject<Set<string>>,
    playSound,
    addLog,
    actions: {
      setEnemy: actions.setEnemy as (e: unknown) => void,
      setRelicActivated: actions.setRelicActivated,
      setDeck: actions.setDeck as (d: Card[]) => void,
      setDiscardPile: actions.setDiscardPile as (p: Card[]) => void,
      setHand: actions.setHand as (h: Card[]) => void,
      setSelected: actions.setSelected as (s: Card[]) => void,
      setCanRedraw: actions.setCanRedraw
    }
  });

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

  // 실행 큐 자동 복구 (커스텀 훅으로 분리)
  useQueueRecovery({
    phase: battle.phase,
    queue: battle.queue,
    fixedOrder,
    addLog,
    actions: {
      setQueue: actions.setQueue,
      setQIndex: actions.setQIndex
    }
  });

  // 선택 단계 적 행동 계획 생성 (커스텀 훅으로 분리)
  useEnemyPlanGeneration({
    phase: battle.phase,
    enemy: enemy as { etherPts?: number; cardsPerTurn?: number; units?: { unitId: number }[] },
    enemyPlan: enemyPlan as { actions: Card[]; mode: AIMode | null; manuallyModified?: boolean },
    enemyCount,
    battleRef: battleRef as MutableRefObject<{ enemyPlan?: { actions?: Card[]; mode?: AIMode | null; manuallyModified?: boolean } }>,
    etherSlots,
    actions: {
      setEnemyPlan: actions.setEnemyPlan as (plan: { mode: AIMode | null; actions: Card[] }) => void
    }
  });

  // 콤보 시스템 (커스텀 훅으로 분리)
  const { currentCombo, finalComboMultiplier, comboPreviewInfo, comboStepsLog } = useComboSystem({
    battleSelected: battle.selected,
    battlePhase: battle.phase,
    playerComboUsageCount: player.comboUsageCount ?? {},
    resolvedPlayerCards,
    battleQIndex: battle.qIndex,
    battleQueueLength: battle.queue.length,
    computeComboMultiplier,
    explainComboMultiplier,
    orderedRelicList,
    selected,
    actions: actions as { setCurrentDeflation: (deflation: { multiplier: number; usageCount: number } | null) => void; setMultiplierPulse: (pulse: boolean) => void }
  });

  // 다중 타겟 선택 시스템 (커스텀 훅으로 분리) - useCardSelection보다 먼저 정의
  const { handleConfirmDistribution, handleCancelDistribution, startDamageDistribution } = useMultiTargetSelection({
    battlePendingDistributionCard: battle.pendingDistributionCard,
    battleDamageDistribution: battle.damageDistribution,
    enemyUnits: enemyUnits as Array<{ hp: number; unitId: number; name?: string; [key: string]: unknown }>,
    addLog,
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
    actions,
    nextTurnEffects
  });

  // 패 관리 (커스텀 훅으로 분리)
  const { redrawHand, cycleSortType, getSortedHand } = useHandManagement({
    canRedraw,
    battleHand: battle.hand,
    battleDeck: battle.deck,
    battleDiscardPile: battle.discardPile,
    battleVanishedCards: battle.vanishedCards,
    sortType: sortType as "type" | "speed" | "energy" | "value",
    hand,
    escapeBanRef: escapeBanRef as MutableRefObject<Set<string>>,
    addLog,
    playSound,
    actions: actions as { setDeck: (deck: Card[]) => void; setDiscardPile: (pile: Card[]) => void; setHand: (hand: Card[]) => void; setSelected: (selected: Card[]) => void; setCanRedraw: (canRedraw: boolean) => void; setSortType: (sortType: string) => void }
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
    respondSnapshot: respondSnapshot as { selectedSnapshot: Card[]; enemyActions: Card[] } | null,
    devilDiceTriggeredRef,
    etherSlots,
    playSound,
    addLog,
    actions,
    pathosNextCardEffects,
    consumeNextCardEffects,
    nextTurnEffects
  });

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

  // 보상 및 함성 선택 (커스텀 훅으로 분리) - useResolveExecution보다 먼저 정의
  const {
    cardReward,
    traitReward,
    recallSelection,
    setRecallSelection,
    handleRewardSelect,
    handleRewardSkip,
    handleTraitSelect,
    handleTraitSkip,
    handleRecallSelect,
    handleRecallSkip,
    showCardRewardModal
  } = useRewardSelection({
    CARDS: CARDS as Card[],
    battleRef,
    battleNextTurnEffects: battle.nextTurnEffects,
    addLog,
    actions: actions as { setPostCombatOptions: (options: unknown) => void; setPhase: (phase: string) => void; setNextTurnEffects: (effects: unknown) => void }
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
    relics: orderedRelicList,
    orderedRelicList,
    battleRef,
    parryReadyStatesRef,
    setParryReadyStates,
    growingDefenseRef: growingDefenseRef as MutableRefObject<number | null>,
    escapeBanRef: escapeBanRef as MutableRefObject<Set<string>>,
    escapeUsedThisTurnRef: escapeUsedThisTurnRef as MutableRefObject<Set<string>>,
    calculateEtherTransfer: calculateEtherTransfer as (playerAppliedEther: number, enemyAppliedEther: number, curPlayerPts: number, curEnemyPts: number, enemyHp: number) => { nextPlayerPts: number; nextEnemyPts: number; movedPts: number },
    checkVictoryCondition: checkVictoryCondition as (enemy: import("../../types").VictoryEnemy, pts: number) => import("../../types").VictoryCheckResult,
    showCardRewardModal,
    startEtherCalculationAnimation: startEtherCalculationAnimation as () => void,
    addLog,
    playSound,
    actions
  });

  // 타임라인 진행 로직 (useTimelineProgression 훅으로 분리)
  const { stepOnce } = useTimelineProgression({
    battleRef: battleRef as import('react').MutableRefObject<{
      queue: HandAction[];
      qIndex: number;
      player: TokenEntity & { hp: number; block?: number; def?: boolean; maxSpeed?: number };
      enemy: TokenEntity & { hp: number; block?: number; def?: boolean; maxSpeed?: number };
      timelineProgress?: number;
      usedCardIndices?: number[];
      disappearingCards?: number[];
      hiddenCards?: number[];
    } | null>,
    breachSelectionRef,
    timelineAnimationRef,
    growingDefenseRef: growingDefenseRef as import('react').MutableRefObject<{ activatedSp: number; totalDefenseApplied?: number } | null>,
    escapeUsedThisTurnRef: escapeUsedThisTurnRef as import('react').MutableRefObject<Set<string>>,
    stepOnceRef,
    player: player as TokenEntity & { hp: number; block?: number; maxSpeed?: number },
    enemy: enemy as TokenEntity & { hp: number; block?: number; maxSpeed?: number },
    actions: {
      setQIndex: actions.setQIndex,
      setTimelineProgress: actions.setTimelineProgress,
      setExecutingCardIndex: actions.setExecutingCardIndex,
      setUsedCardIndices: actions.setUsedCardIndices,
      setTimelineIndicatorVisible: actions.setTimelineIndicatorVisible,
      setDisappearingCards: actions.setDisappearingCards,
      setHiddenCards: actions.setHiddenCards,
      setPlayer: actions.setPlayer,
    },
    addLog,
    executeCardAction: () => executeCardActionRef.current?.(),
  });

  const executeCardAction = async () => {
    // 중복 실행 방지 (StrictMode 등에서 발생 가능)
    if (isExecutingCardRef.current) return;
    isExecutingCardRef.current = true;

    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) {
      isExecutingCardRef.current = false;
      return;
    }
    const a = currentBattle.queue[currentBattle.qIndex];

    // battleRef에서 최신 player/enemy 상태 가져오기 (애니메이션 중 방어자세 방어력, 토큰 등 반영)
    const latestPlayer = currentBattle.player || player;
    const latestEnemy = currentBattle.enemy || enemy;
    let P = { ...player, def: latestPlayer.def || player.def || false, block: latestPlayer.block ?? player.block ?? 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, strength: player.strength || 0, tokens: latestPlayer.tokens };
    let E = { ...enemy, def: latestEnemy.def || enemy.def || false, block: latestEnemy.block ?? enemy.block ?? 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, tokens: latestEnemy.tokens };

    // 타임라인 기반 토큰 만료 처리 (현재 SP 도달 시 이전 턴에서 부여된 토큰 제거)
    const currentSp = a.sp || 0;
    const tokenExpirationResult = processTokenExpiration({
      playerState: P as TokenEntity,
      enemyState: E as TokenEntity,
      turnNumber,
      currentSp,
      addLog
    });

    if (tokenExpirationResult.hasChanges) {
      P = { ...P, tokens: tokenExpirationResult.playerState.tokens || P.tokens };
      E = { ...E, tokens: tokenExpirationResult.enemyState.tokens || E.tokens };
      // battleRef 동기 업데이트 (토큰 만료 반영)
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P, enemy: E };
      }
    }

    const tempState = { player: P, enemy: E, log: [] };

    // battleContext 생성 (special 효과용)
    // 진행 단계 최종 남은 행동력 계산 (가이러스 룰렛: 모든 선택 카드 비용 차감 후)
    const allPlayerCards = currentBattle.queue.filter(q => q.actor === 'player');
    const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const playerEnergyBudget = (P as { energy?: number; maxEnergy?: number }).energy || (P as { maxEnergy?: number }).maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);

    // 적 남은 에너지 계산
    const allEnemyCards = currentBattle.queue.filter(q => q.actor === 'enemy');
    const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const enemyEnergyBudget = (E as { energy?: number; maxEnergy?: number }).energy || (E as { maxEnergy?: number }).maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

    // 이번 턴에 사용된 카드 카테고리 추적 (comboStyle용)
    const executedPlayerCards = currentBattle.queue
      .slice(0, currentBattle.qIndex)
      .filter(q => q.actor === 'player');
    const usedCardCategories = [...new Set(executedPlayerCards.map(q => q.card?.cardCategory).filter(Boolean))];

    // 적 카드의 소스 유닛 이름 가져오기 (x1, x2 형식으로 통일)
    type UnitInfo = { unitId: number; name?: string };
    const currentUnitsForContext = ((E as { units?: UnitInfo[] }).units || enemy?.units || []) as UnitInfo[];
    const sourceUnit = a.actor === 'enemy' && a.card.__sourceUnitId !== undefined
      ? currentUnitsForContext.find(u => u.unitId === a.card.__sourceUnitId)
      : null;
    const baseName = (E as { name?: string }).name || enemy?.name || '몬스터';
    const unitIndex = sourceUnit ? sourceUnit.unitId + 1 : 1;
    const enemyDisplayName = `${baseName} x${unitIndex}`;

    // 현재 nextTurnEffects 가져오기 (fencingDamageBonus 등)
    const currentNextTurnEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects || {};

    const battleContext: import("../../types/combat").BattleContext = {
      currentSp: a.sp || 0,  // 현재 카드의 타임라인 위치 (growingDefense용)
      currentTurn: turnNumber,  // 현재 턴 번호 (토큰 grantedAt용)
      queue: currentBattle.queue,
      currentQIndex: currentBattle.qIndex,
      remainingEnergy: calculatedRemainingEnergy,  // 플레이어 치명타 확률용 남은 에너지
      enemyRemainingEnergy: calculatedEnemyRemainingEnergy,  // 적 치명타 확률용 남은 에너지
      allCards: CARDS as Card[],  // 카드 창조용 전체 카드 풀
      hand: currentBattle.hand || [],  // autoReload용: 현재 손패
      enemyDisplayName,  // 적 유닛 이름 (로그용)
      fencingDamageBonus: (currentNextTurnEffects as { fencingDamageBonus?: number }).fencingDamageBonus || 0,  // 날 세우기: 검격 공격력 보너스
      // 파토스 효과
      pathosTurnEffects,  // 턴 동안 유지되는 파토스 효과
      pathosNextCardEffects,  // 다음 카드에만 적용되는 파토스 효과
      guaranteedCrit: pathosNextCardEffects?.guaranteeCrit  // 다음 카드 치명타 보장
    };

    // 에테르 누적 헬퍼 함수 (공통 파라미터 캡처)
    const accumulateEther = (card: Card) => {
      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated,
        orderedRelicList,
        cardUpgrades: cardUpgrades as Record<string, unknown>,
        resolvedPlayerCards,
        playerTimeline,
        relics: orderedRelicList,
        triggeredRefs: {
          referenceBookTriggered: referenceBookTriggeredRef,
          devilDiceTriggered: devilDiceTriggeredRef
        },
        calculatePassiveEffects,
        getCardEtherGain: getCardEtherGain as (card: Card | Partial<Card>) => number,
        collectTriggeredRelics: collectTriggeredRelics as (params: { orderedRelicList: string[]; resolvedPlayerCards: number; playerTimeline: Card[]; triggeredRefs: import("../../types").RelicTriggeredRefs }) => import("../../types").RelicTrigger[],
        playRelicActivationSequence,
        flashRelic,
        actions
      });
    };

    // === requiredTokens 소모 (카드 실행 전) ===
    const tokenConsumptionResult = processRequiredTokenConsumption({
      actor: a.actor,
      card: a.card,
      playerState: P as TokenEntity & { hp: number },
      enemyState: E as TokenEntity & { hp: number },
      addLog
    });
    if (tokenConsumptionResult.updatedTokens) {
      P = { ...P, tokens: tokenConsumptionResult.playerState.tokens || P.tokens };
      tempState.player = P;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P };
      }
      actions.setPlayer({ ...P });
    }

    // 다중 타격 또는 총기 공격: 비동기 처리 (딜레이 + 타격별 룰렛)
    const isAttackCard = a.card.type === 'attack';
    const isGunCard = a.card.cardCategory === 'gun';
    const hasMultipleHits = (Number(a.card.hits) || 1) > 1;
    const useAsyncMultiHit = isAttackCard && (isGunCard || hasMultipleHits);

    // === 유닛 시스템: 플레이어 공격 시 타겟 유닛의 block 사용 ===
    const attackTargetResult = resolveAttackTarget({
      actor: a.actor,
      card: a.card,
      enemyState: { ...E, units: E.units || enemy?.units || [] },
      selectedTargetUnit: battle.selectedTargetUnit ?? 0,
      isAttackCard
    });
    const targetUnitIdForAttack = attackTargetResult.targetUnitIdForAttack;
    if (targetUnitIdForAttack !== null) {
      E.block = attackTargetResult.modifiedEnemyState.block ?? 0;
      E.def = attackTargetResult.modifiedEnemyState.def ?? false;
      tempState.enemy = E;
    }

    // === 유닛 시스템: 적 방어 시 소스 유닛의 기존 block 사용 (누적값 표시용) ===
    const defenseSourceResult = resolveDefenseSource({
      actor: a.actor,
      card: a.card,
      enemyState: { ...E, units: E.units || enemy?.units || [] },
      selectedTargetUnit: 0,
      isAttackCard: false
    });
    const sourceUnitIdForDefense = defenseSourceResult.sourceUnitIdForDefense;
    if (sourceUnitIdForDefense !== null) {
      E.block = defenseSourceResult.modifiedEnemyState.block ?? 0;
      E.def = defenseSourceResult.modifiedEnemyState.def ?? false;
      tempState.enemy = E;
    }

    let actionResult;
    let actionEvents: SimActionEvent[];

    if (useAsyncMultiHit) {
      // 비동기 다중 타격 실행
      const attacker = a.actor === 'player' ? P : E;
      const defender = a.actor === 'player' ? E : P;

      // 타격별 콜백: 피격 애니메이션 및 사운드
      const onHitCallback = (_hitIndex: number, _totalHits: number, hitResult: { damage: number; events: import("../../types/combat").BattleEvent[] }) => {
        if (hitResult.damage > 0) {
          playHitSound();
          if (a.actor === 'player') {
            actions.setEnemyHit(true);
            setTimeout(() => actions.setEnemyHit(false), ANIMATION_TIMING.HIT_FLASH);
          } else {
            actions.setPlayerHit(true);
            setTimeout(() => actions.setPlayerHit(false), ANIMATION_TIMING.HIT_FLASH);
          }
        }
      };

      const multiHitResult = await executeMultiHitAsync(a.card, attacker, defender, a.actor, battleContext, onHitCallback);

      // 결과 반영
      if (a.actor === 'player') {
        P = multiHitResult.attacker as typeof P;
        E = multiHitResult.defender as typeof E;
      } else {
        E = multiHitResult.attacker as typeof E;
        P = multiHitResult.defender as typeof P;
      }

      // 카드 사용 시 special 효과 처리 (교차 특성 등) - 룰렛은 이제 타격별로 처리됨
      const cardPlayAttacker = a.actor === 'player' ? P : E;
      const cardPlayResult = processCardPlaySpecials({
        card: a.card,
        attacker: cardPlayAttacker,
        attackerName: a.actor as 'player' | 'enemy',
        battleContext: battleContext
      });

      // cardPlayResult의 토큰 처리
      if (cardPlayResult.tokensToAdd && cardPlayResult.tokensToAdd.length > 0) {
        cardPlayResult.tokensToAdd.forEach(tokenInfo => {
          // targetEnemy 플래그에 따라 대상 결정
          const isPlayerAction = a.actor === 'player';
          const targetIsEnemy = tokenInfo.targetEnemy === true;

          // 플레이어 행동 + targetEnemy면 적에게, 아니면 플레이어에게
          // 적 행동 + targetEnemy면 플레이어에게, 아니면 적에게
          const applyToEnemy = isPlayerAction ? targetIsEnemy : !targetIsEnemy;

          if (applyToEnemy) {
            const tokenResult = addToken(E as TokenEntity, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
            E = { ...E, tokens: tokenResult.tokens };
          } else {
            const tokenResult = addToken(P as TokenEntity, tokenInfo.id, tokenInfo.stacks, tokenInfo.grantedAt);
            P = { ...P, tokens: tokenResult.tokens };
          }
        });
      }
      if (cardPlayResult.tokensToRemove && cardPlayResult.tokensToRemove.length > 0) {
        cardPlayResult.tokensToRemove.forEach(tokenInfo => {
          if (a.actor === 'player') {
            const tokenResult = removeToken(P as TokenEntity, tokenInfo.id, 'permanent', tokenInfo.stacks);
            P = { ...P, tokens: tokenResult.tokens };
          } else {
            const tokenResult = removeToken(E as TokenEntity, tokenInfo.id, 'permanent', tokenInfo.stacks);
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
        criticalHits: multiHitResult.criticalHits,  // 다단 공격 치명타 횟수
        createdCards: multiHitResult.createdCards,
        updatedState: { player: P, enemy: E, log: [] },
        cardPlaySpecials: cardPlayResult,
        defenderTimelineAdvance: multiHitResult.defenderTimelineAdvance || 0
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
        P = updatedState.player as typeof P;
        E = updatedState.enemy as typeof E;
        // battleRef 동기 업데이트 (다음 카드 실행 시 최신 상태 사용)
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: P, enemy: E };
        }
      } else {
        if (import.meta.env.DEV) console.error('[executeCardAction] updatedState is undefined!', {
          card: a.card,
          actor: a.actor,
          actionResult
        });
      }

      // NOTE: processCardPlaySpecials는 applyAction 내부(combatActions.ts)에서 이미 호출됨
      // 중복 호출 시 로그/토큰이 중복 적용되므로 여기서는 호출하지 않음

      // queueModifications 적용 (교차 밀어내기 등)
      if (actionResult.queueModifications && actionResult.queueModifications.length > 0) {
        let updatedQueue = [...(battleRef.current?.queue ?? [])];
        const qIdx = battleRef.current?.qIndex ?? 0;

        if (import.meta.env.DEV) {
          console.log('[BattleApp] queueMods 적용:', actionResult.queueModifications);
        }

        actionResult.queueModifications.forEach((mod: { index: number; newSp: number }) => {
          if (mod.index > qIdx && updatedQueue[mod.index]) {
            updatedQueue[mod.index] = { ...updatedQueue[mod.index], sp: mod.newSp };
          }
        });

        // 큐 재정렬
        const processedCards = updatedQueue.slice(0, qIdx + 1);
        const remainingCards = updatedQueue.slice(qIdx + 1);
        remainingCards.sort((x, y) => ((x.sp ?? 0) - (y.sp ?? 0)));
        updatedQueue = [...processedCards, ...remainingCards];

        // 겹침 체크
        updatedQueue = markCrossedCards(updatedQueue);

        actions.setQueue(updatedQueue);
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, queue: updatedQueue };
        }
      }
    }

    // === 유닛 시스템: 플레이어 공격 후 타겟 유닛의 block 업데이트 ===
    const attackBlockUpdateResult = updateAttackTargetBlock({
      actor: a.actor,
      card: a.card,
      enemyState: { ...E, units: E.units || enemy?.units || [] },
      targetUnitIdForAttack,
      isAttackCard
    });
    if (attackBlockUpdateResult.updated) {
      E.units = attackBlockUpdateResult.modifiedEnemyState.units;
      E.block = attackBlockUpdateResult.modifiedEnemyState.block ?? 0;
      E.def = attackBlockUpdateResult.modifiedEnemyState.def ?? false;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, enemy: E };
      }
    }

    // === 적 방어 카드: 개별 유닛에 방어력 적용 ===
    const defenseBlockResult = applyDefenseToUnit({
      actor: a.actor,
      card: a.card,
      enemyState: { ...E, units: E.units || enemy?.units || [] },
      targetUnitIdForAttack: null,
      isAttackCard: false
    });
    if (defenseBlockResult.updated) {
      E.units = defenseBlockResult.modifiedEnemyState.units;
      E.block = defenseBlockResult.modifiedEnemyState.block ?? 0;
      E.def = defenseBlockResult.modifiedEnemyState.def ?? false;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, enemy: E };
      }
    }

    // === 치명타 발생 시 기교 토큰 부여 (플레이어만) ===
    // 다단 공격의 경우 치명타 횟수만큼 부여, 단일 공격은 1회
    if (actionResult.isCritical && a.actor === 'player') {
      const critCount = ('criticalHits' in actionResult && typeof actionResult.criticalHits === 'number') ? actionResult.criticalHits : 1;
      const finesseResult = addToken(P as TokenEntity, 'finesse', critCount);
      P.tokens = finesseResult.tokens;
      addLog(`✨ 치명타! 기교 +${critCount} 획득`);
      // battleRef 동기 업데이트
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P };
      }
      actions.setPlayer({ ...P });
    }

    // === 바이올랑 모르: 처형 효과 (체력 30 이하 적 즉시 처형) ===
    const executionResult = processViolentMortExecution({
      card: a.card,
      actor: a.actor,
      enemyState: E as TokenEntity & { hp: number; executed?: boolean },
      addLog
    });
    if (executionResult.executed) {
      E = { ...E, ...executionResult.enemyState };
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, enemy: E };
      }
      actions.setEnemy({ ...E });
    }

    // 이벤트 로그 출력
    actionEvents.forEach(ev => {
      if (ev.msg) addLog(ev.msg);
    });

    // === 방어자 타임라인 앞당김 (rain_defense 등) ===
    const defenderAdvance = actionResult.defenderTimelineAdvance || 0;
    if (defenderAdvance > 0) {
      const defenderName = a.actor === 'player' ? 'enemy' : 'player';
      let updatedQueue = [...(battleRef.current?.queue ?? [])];
      const qIdx = battleRef.current?.qIndex ?? 0;

      updatedQueue = updatedQueue.map((item, idx) => {
        if (idx > qIdx && item.actor === defenderName) {
          return { ...item, sp: Math.max(0, (item.sp ?? 0) - defenderAdvance) };
        }
        return item;
      });

      // 큐 재정렬
      const processedCards = updatedQueue.slice(0, qIdx + 1);
      const remainingCards = updatedQueue.slice(qIdx + 1);
      remainingCards.sort((a, b) => (a.sp ?? 0) - (b.sp ?? 0));
      updatedQueue = [...processedCards, ...remainingCards];

      // 겹침 체크
      updatedQueue = markCrossedCards(updatedQueue);

      actions.setQueue(updatedQueue);
    }

    // === blockPerCardExecution: 카드 실행 시 방어력 추가 (노인의 꿈) ===
    const latestNextTurnEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects || {};
    const blockPerCardResult = processBlockPerCardExecution({
      actor: a.actor,
      card: a.card,
      playerState: P,
      nextTurnEffects: latestNextTurnEffects as { blockPerCardExecution?: number },
      addLog
    });
    if (blockPerCardResult.applied) {
      P.block = blockPerCardResult.playerState.block ?? 0;
      P.def = blockPerCardResult.playerState.def ?? false;
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P };
      }
    }

    // === 화상(BURN) 피해 처리: 카드 사용 시마다 피해 ===
    const burnDamageResult = processBurnDamage({
      actor: a.actor,
      card: a.card,
      playerState: P as TokenEntity & { hp: number },
      enemyState: E as TokenEntity & { hp: number },
      addLog
    });
    if (burnDamageResult.burnEvents.length > 0) {
      P.hp = burnDamageResult.playerState.hp;
      E.hp = burnDamageResult.enemyState.hp;
      actionEvents.push(...burnDamageResult.burnEvents.map(evt => ({ ...evt, type: 'burn' as const })));
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P, enemy: E };
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
      breachSelectionRef.current = breachState as BreachSelection;
      setBreachSelection(breachState as BreachSelection);

      // 선택 중에는 stepOnce 진행을 멈춤 (사용자가 선택할 때까지)
      isExecutingCardRef.current = false;
      return;
    }

    // cardPlaySpecials 결과 처리 (comboStyle, mentalFocus 등)
    if (actionResult.cardPlaySpecials && a.actor === 'player') {
      if (import.meta.env.DEV) console.log('[cardPlaySpecials] Extracted:', { cardName: a.card.name, fullResult: actionResult.cardPlaySpecials });

      // 소멸된 카드 ID 목록
      const currentVanished = battleRef.current?.vanishedCards || battle.vanishedCards || [];
      const vanishedCardIds = (currentVanished as Array<string | Card>).map((c: string | Card) => typeof c === 'string' ? c : c.id);

      const effectsResult = processAllNextTurnEffects({
        cardPlaySpecials: actionResult.cardPlaySpecials as CardPlaySpecialsResult,
        currentSp: a.sp || 0,
        currentQueue: battleRef.current.queue,
        currentQIndex: battleRef.current.qIndex,
        currentDeck: (battleRef.current?.deck || battle.deck || []) as HandCard[],
        currentDiscard: (battleRef.current?.discardPile || battle.discardPile || []) as HandCard[],
        currentHand: (battleRef.current?.hand || battle.hand || []) as HandCard[],
        vanishedCardIds,
        escapeBan: escapeBanRef.current as Set<string>,
        allCards: CARDS as Card[],
        currentNextTurnEffects: (battleRef.current?.nextTurnEffects || battle.nextTurnEffects) as Record<string, unknown>,
        currentCardId: (a.card as { id?: string })?.id,
        addLog
      });

      // 상태 업데이트 적용
      if (effectsResult.hasQueueChanges) {
        actions.setQueue(effectsResult.updatedQueue);
        battleRef.current = { ...battleRef.current, queue: effectsResult.updatedQueue };
      }
      if (effectsResult.hasDeckChanges) {
        actions.setDeck(effectsResult.updatedDeck);
        actions.setDiscardPile(effectsResult.updatedDiscardPile);
        battleRef.current = { ...battleRef.current, deck: effectsResult.updatedDeck, discardPile: effectsResult.updatedDiscardPile };
      }
      if (effectsResult.hasHandChanges) {
        actions.setHand(effectsResult.updatedHand);
        battleRef.current = { ...battleRef.current, hand: effectsResult.updatedHand };
      }
      actions.setNextTurnEffects(effectsResult.updatedEffects);
      battleRef.current = { ...battleRef.current, nextTurnEffects: effectsResult.updatedEffects };

      // === 함성 (recallCard): 대기 카드 선택 UI 표시 (React 상태 사용) ===
      if (effectsResult.recallTriggered) {
        const currentBuild = useGameStore.getState().characterBuild;
        if (currentBuild) {
          const { mainSpecials = [], subSpecials = [], ownedCards = [] } = currentBuild;
          const usedCardIds = new Set([...mainSpecials, ...subSpecials]);
          const waitingCardIds = ownedCards.filter(id => !usedCardIds.has(id));
          const waitingCards = waitingCardIds.map(id => CARDS.find(c => c.id === id)).filter((c): c is Card => Boolean(c));

          if (waitingCards.length > 0) {
            setRecallSelection({ availableCards: waitingCards });
            addLog(`📢 함성: 대기 카드 중 1장을 선택하세요!`);
          } else {
            addLog(`📢 함성: 대기 카드가 없습니다.`);
          }
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
    const cardId = (a.card as { id?: string }).id;
    if (a.actor === 'player' && cardId) {
      actions.setCardUsageCount({
        ...cardUsageCount,
        [cardId]: ((cardUsageCount as Record<string, number>)[cardId] || 0) + 1
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
          // grantedAt for turn-type tokens (timeline-based expiration)
          const grantedAt = battleContext.currentTurn ? { turn: battleContext.currentTurn, sp: battleContext.currentSp || 0 } : null;
          const tokenActions = {
            ...actions,
            addTokenToPlayer: (tokenId: string, stacks = 1) => {
              const actualStacks = isCritical ? stacks + 1 : stacks;
              if (isCritical) {
                addLog(`💥 치명타! ${tokenId} +1 강화`);
              }
              const result = addToken(currentPlayerForToken as TokenEntity, tokenId, actualStacks, grantedAt);
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
            removeTokenFromPlayer: (tokenId: string, tokenType: TokenType, stacks = 1) => {
              const result = removeToken(currentPlayerForToken as TokenEntity, tokenId, tokenType, stacks);
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
            addTokenToEnemy: (tokenId: string, stacks = 1) => {
              const actualStacks = isCritical ? stacks + 1 : stacks;
              if (isCritical) {
                addLog(`💥 치명타! ${tokenId} +1 강화`);
              }

              // 다중 유닛 시스템: 타겟 유닛에 토큰 부여
              const currentUnits = E.units || enemy?.units || [];
              if (currentUnits.length > 0 && targetUnitIdForAttack !== null) {
                const updatedUnits = currentUnits.map(u => {
                  if (u.unitId === targetUnitIdForAttack) {
                    const unitResult = addToken(u, tokenId, actualStacks, grantedAt);
                    return { ...u, tokens: unitResult.tokens };
                  }
                  return u;
                });
                E.units = updatedUnits;
                // battleRef 동기 업데이트
                if (battleRef.current) {
                  battleRef.current = { ...battleRef.current, enemy: { ...E } };
                }
                actions.setEnemy({ ...E });
                actions.setEnemyUnits(updatedUnits);
                const targetUnit = currentUnits.find(u => u.unitId === targetUnitIdForAttack);
                const targetName = targetUnit?.name || '적';
                const tokenName = TOKENS[tokenId]?.name || tokenId;
                addLog(`🎯 ${targetName}에게 ${tokenName} 부여`);
                return { tokens: updatedUnits.find(u => u.unitId === targetUnitIdForAttack)?.tokens || {}, logs: [] };
              }

              // 단일 적 또는 타겟 없음: 기존 방식
              const result = addToken(E as TokenEntity, tokenId, actualStacks, grantedAt);
              E.tokens = result.tokens;
              // battleRef 동기 업데이트
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, enemy: { ...E } };
              }
              actions.setEnemy({ ...E });
              result.logs.forEach(log => addLog(log));
              return result;
            },
            // 룰렛 초기화 등을 위한 토큰 스택 리셋
            resetTokenForPlayer: (tokenId: string, tokenType: TokenType, newStacks = 0) => {
              const result = setTokenStacks(currentPlayerForToken as TokenEntity, tokenId, tokenType, newStacks);
              P.tokens = result.tokens;
              currentPlayerForToken.tokens = result.tokens;
              if (battleRef.current) {
                battleRef.current = { ...battleRef.current, player: { ...P } };
              }
              actions.setPlayer({ ...P });
              result.logs.forEach(log => addLog(log));
              return result;
            }
          };
          a.card.onPlay(battle, tokenActions);
        } catch (error) {
          if (import.meta.env.DEV) console.error('[Token onPlay Error]', error);
        }
      }
    }

    if (hasTrait(a.card, 'stun')) {
      const { updatedQueue, stunEvent } = processStunEffect({
        action: { card: a.card!, sp: a.sp, actor: a.actor },
        queue: currentBattle.queue,
        currentQIndex: currentBattle.qIndex,
        addLog
      });
      if (updatedQueue !== currentBattle.queue) {
        const markedStunQueue = markCrossedCards(updatedQueue);
        actions.setQueue(markedStunQueue);
      }
      if (stunEvent) {
        actionEvents = [...actionEvents, stunEvent];
      }
    }

    // 타임라인 조작 효과 처리 (마르쉐, 런지, 비트, 흐트리기 등)
    const timelineResult = processTimelineSpecials({
      card: a.card,
      actor: (a.actor === 'player' ? P : E),
      actorName: a.actor as 'player' | 'enemy',
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
      const updatedQueue = applyTimelineChanges({
        queue: battleRef.current.queue,
        currentIndex: battleRef.current.qIndex,
        timelineChanges
      });
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
      const { breachCards, breachState } = generateBreachCards(a.sp ?? 0, a.card);

      addLog(`👻 "${a.card.name}" 발동! 카드를 선택하세요.`);
      accumulateEther(a.card);

      breachSelectionRef.current = breachState as BreachSelection;
      setBreachSelection(breachState as BreachSelection);

      isExecutingCardRef.current = false;
      return;
    }

    // createFencingCards3 (벙 데 라므): 3x3 창조 선택 (3번의 선택, 각각 3장 중 1장)
    if (hasSpecial(a.card, 'createFencingCards3') && a.actor === 'player') {
      const { creationQueue, firstSelection, success } = generateFencingCards(a.sp ?? 0, a.card);

      if (success && firstSelection) {
        creationQueueRef.current = creationQueue;
        addLog(`👻 "${a.card.name}" 발동! 검격 카드 창조 1/3: 카드를 선택하세요.`);
        accumulateEther(a.card);

        breachSelectionRef.current = firstSelection as BreachSelection;
        setBreachSelection(firstSelection as BreachSelection);

        isExecutingCardRef.current = false;
        return;
      }
    }

    // executionSquad (총살): 4x3 총격카드 창조 선택 (4번의 선택, 각각 3장 중 1장)
    if (hasSpecial(a.card, 'executionSquad') && a.actor === 'player') {
      const { creationQueue, firstSelection, success } = generateExecutionSquadCards(a.sp ?? 0, a.card);

      if (success && firstSelection) {
        creationQueueRef.current = creationQueue;
        addLog(`👻 "${a.card.name}" 발동! 총격 카드 창조 1/4: 카드를 선택하세요.`);
        accumulateEther(a.card);

        breachSelectionRef.current = firstSelection as BreachSelection;
        setBreachSelection(firstSelection as BreachSelection);

        isExecutingCardRef.current = false;
        return;
      }
    }

    // 적 카드 발동 시 패리 트리거 체크 (모든 활성 패리 상태 확인)
    const hasActiveParry = parryReadyStatesRef.current.some(s => s?.active && !s.triggered);
    if (a.actor === 'enemy' && hasActiveParry) {
      const currentQ = battleRef.current.queue;
      const { updatedQueue, parryEvents, updatedParryStates, outCards } = checkParryTrigger({
        parryReadyStates: parryReadyStatesRef.current as ParryReadyState[],
        enemyAction: a,
        queue: currentQ,
        currentQIndex: currentBattle.qIndex,
        enemyMaxSpeed: Number(enemy.maxSpeed) || 0,
        addLog,
        playParrySound
      });
      parryReadyStatesRef.current = updatedParryStates;
      setParryReadyStates(updatedParryStates);
      if (updatedQueue !== currentQ) {
        const markedParryQueue = markCrossedCards(updatedQueue);
        actions.setQueue(markedParryQueue);
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
      accumulateEther(a.card);
    } else if (a.actor === 'enemy') {
      processEnemyEtherAccumulation({
        card: a.card,
        enemyTurnEtherAccumulated,
        getCardEtherGain,
        actions
      });
    }

    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1, strength: P.strength || 0, tokens: P.tokens });

    // === 다중 유닛 데미지 분배 ===
    // ⚠️ hasEnemyUnits()는 UI 표시(hasMultipleUnits)와 동일한 조건 사용
    const enemyUnits = E.units || enemy.units || [];
    const hasUnits = hasEnemyUnits(enemyUnits);

    if (hasUnits && a.actor === 'player' && a.card?.type === 'attack') {
      // 파토스 aoe 효과 확인
      const isPathosAoe = pathosNextCardEffects?.aoe === true;
      const cardWithAoe = isPathosAoe
        ? { ...(a.card as Card & { __targetUnitId?: number; __targetUnitIds?: number[]; isAoe?: boolean; damage?: number }), isAoe: true }
        : (a.card as Card & { __targetUnitId?: number; __targetUnitIds?: number[]; isAoe?: boolean; damage?: number });

      if (isPathosAoe) {
        addLog('💥 파토스: 전체 공격!');
      }

      const damageDistributionResult = distributeUnitDamage({
        card: cardWithAoe,
        enemyUnits,
        damageDealt: actionResult.dealt || 0,
        selectedTargetUnit: battle.selectedTargetUnit ?? 0
      });

      if (damageDistributionResult) {
        E.hp = damageDistributionResult.newTotalHp;
        E.units = damageDistributionResult.updatedUnits as typeof E.units;
        damageDistributionResult.logs.forEach(log => addLog(log));
      }
    }

    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1, tokens: E.tokens, ...(E.units && { units: E.units }) });
    actions.setActionEvents({ ...currentBattle.actionEvents, [currentBattle.qIndex]: actionEvents });

    // 이벤트 처리: 애니메이션 및 사운드
    processActionEventAnimations({
      actionEvents,
      action: a,
      playHitSound,
      playBlockSound,
      actions
    });

    // 파토스 다음 카드 효과 소모 (플레이어 카드 실행 후)
    if (a.actor === 'player' && pathosNextCardEffects) {
      if (pathosNextCardEffects.guaranteeCrit || pathosNextCardEffects.setSpeed || pathosNextCardEffects.aoe) {
        consumeNextCardEffects();
        addLog('✨ 파토스 다음 카드 효과 소모');
      }
    }

    const newQIndex = battleRef.current.qIndex + 1;

    // battleRef를 즉시 업데이트 (React state 업데이트는 비동기이므로)
    battleRef.current = { ...battleRef.current, qIndex: newQIndex };

    actions.setQIndex(newQIndex);

    if (P.hp <= 0) {
      isExecutingCardRef.current = false;
      actions.setPostCombatOptions({ type: 'defeat' });
      actions.setPhase('post');
      return;
    }
    if (E.hp <= 0) {
      isExecutingCardRef.current = false;
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
    isExecutingCardRef.current = false;
  };

  // executeCardAction을 ref에 저장 (타임라인 훅에서 사용)
  executeCardActionRef.current = executeCardAction;

  // resolve 단계 진행 관련 효과 통합 (커스텀 훅으로 분리)
  useResolveProgressEffects({
    phase: battle.phase,
    qIndex: battle.qIndex,
    queueLength: battle.queue.length,
    autoProgress,
    turnEtherAccumulated,
    etherCalcPhase,
    resolvedPlayerCards,
    stepOnceRef,
    timelineAnimationRef,
    startEtherCalculationAnimation
  });

  // 여유 특성 카드 위치 변경 핸들러
  const handleLeisurePositionChange = useCallback((cardUid: string, newPosition: number) => {
    const updatedSelected = battle.selected.map(card => {
      const uid = (card as { __handUid?: string; __uid?: string }).__handUid || (card as { __uid?: string }).__uid;
      if (uid === cardUid) {
        return { ...card, leisurePosition: newPosition };
      }
      return card;
    });
    actions.setSelected(updatedSelected);

    // fixedOrder도 다시 계산
    const speedReduction = nextTurnEffects?.speedCostReduction || 0;
    const newFixedOrder = createFixedOrder(
      updatedSelected,
      enemyPlan.actions,
      effectiveAgility,
      player,
      cardGrowth,
      speedReduction
    );
    actions.setFixedOrder(newFixedOrder);
  }, [battle.selected, enemyPlan.actions, effectiveAgility, player, actions, cardGrowth, nextTurnEffects]);

  // 무리 특성 카드 오프셋 변경 핸들러 (행동력 1회만 소모)
  const handleStrainOffsetChange = useCallback((cardUid: string, newOffset: number) => {
    // 현재 카드의 strainOffset 확인
    const currentCard = battle.selected.find(card => ((card as { __handUid?: string; __uid?: string }).__handUid || (card as { __uid?: string }).__uid) === cardUid);
    const currentOffset = (currentCard as { strainOffset?: number } | undefined)?.strainOffset || 0;

    // 오프셋이 변경되지 않으면 아무것도 하지 않음
    if (currentOffset === newOffset) return;

    // 오프셋이 0에서 처음 변경될 때만 행동력 소모
    const needsEnergy = currentOffset === 0 && newOffset > 0;

    if (needsEnergy) {
      // 행동력이 충분한지 확인
      if ((player.energy ?? 0) < 1) {
        actions.addLog('⚠️ 행동력이 부족합니다!');
        return;
      }
      // 행동력 1 소모
      actions.setPlayer({ ...player, energy: (player.energy ?? 0) - 1 });
      actions.addLog(`⚡ 무리: 속도 앞당김 활성화 (행동력 -1)`);
    }

    // 카드 strainOffset 업데이트
    const updatedSelected = battle.selected.map(card => {
      const uid = (card as { __handUid?: string; __uid?: string }).__handUid || (card as { __uid?: string }).__uid;
      if (uid === cardUid) {
        return { ...card, strainOffset: newOffset };
      }
      return card;
    });
    actions.setSelected(updatedSelected);

    // fixedOrder도 다시 계산
    const speedReduction = nextTurnEffects?.speedCostReduction || 0;
    const newFixedOrder = createFixedOrder(
      updatedSelected,
      enemyPlan.actions,
      effectiveAgility,
      player,
      cardGrowth,
      speedReduction
    );
    actions.setFixedOrder(newFixedOrder);
  }, [battle.selected, enemyPlan.actions, effectiveAgility, player, actions, cardGrowth, nextTurnEffects]);

  // 카드 이름 + 업그레이드 배지 렌더링 (메모이제이션)
  const memoizedRenderNameWithBadge = useCallback(
    (card: Card, defaultColor?: string) => renderNameWithBadge(card, cardUpgrades, defaultColor),
    [cardUpgrades]
  );

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
    playerComboUsageCount: player.comboUsageCount ?? {},
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

  // 적 표시 데이터 (커스텀 훅으로 분리)
  const { enemyNameCounts, groupedEnemyMembers, enemyCombo, enemyHint } = useEnemyDisplayData({
    enemy: enemy as { composition?: unknown[]; name?: string; count?: number; quantity?: number; emoji?: string } | null,
    enemyPlan: enemyPlan as { actions?: unknown[]; mode?: unknown } | null,
    battleLog: battle.log
  });

  // 에테르 획득량 미리보기 (커스텀 훅으로 분리) - Hook은 조건부 return 전에 호출
  const previewEtherGain = useEtherPreview({
    playerTimeline,
    selected,
    orderedRelicList,
    playerComboUsageCount: player?.comboUsageCount || {}
  });

  // 전투 동기화 효과 (커스텀 훅으로 분리)
  useBattleSyncEffects({
    liveInsight,
    player: player as { insight?: number },
    postCombatOptions: postCombatOptions as { type?: 'victory' | 'defeat' } | null,
    notifyBattleResult,
    hasMultipleUnits,
    enemyUnits: enemyUnits as { unitId: number; hp: number }[],
    selectedTargetUnit,
    phase: battle.phase,
    enemy: enemy as { comboUsageCount?: Record<string, number> } | null,
    enemyCombo: enemyCombo as { name?: string } | null,
    actions: {
      setPlayer: actions.setPlayer as (player: unknown) => void,
      setSelectedTargetUnit: actions.setSelectedTargetUnit,
      setEnemyCurrentDeflation: actions.setEnemyCurrentDeflation as (deflation: { multiplier: number; usageCount: number } | null) => void
    }
  });

  // 렌더링 전 계산 (커스텀 훅으로 분리)
  const {
    handDisabled,
    playerEtherValue,
    playerEtherSlots,
    enemyEtherValue,
    playerEnergyBudget,
    remainingEnergy,
    insightLevelSelect,
    insightVisible,
    enemyWillOverdrivePlan,
    canRevealOverdrive,
    enemyOverdriveVisible,
    enemyOverdriveLabel,
    netFinalEther,
    enemyCapacity,
    enemySoulScale
  } = useRenderComputations({
    player: player as { etherPts?: number; energy?: number; maxSpeed?: number; maxEnergy?: number },
    enemy: enemy as { etherPts?: number; etherCapacity?: number; etherOverdriveActive?: boolean } | null,
    enemyPlan,
    battle: { phase: battle.phase, selected: battle.selected },
    totalSpeed,
    totalEnergy,
    effectiveMaxSubmitCards,
    effectiveAgility,
    insightReveal: insightReveal as { level?: number; visible?: boolean } | null,
    etherFinalValue,
    enemyEtherFinalValue,
    netEtherDelta,
    turnNumber
  });

  if (!enemy) return <div className="text-white p-4">로딩…</div>;

  return (
    <div className="legacy-battle-root w-full min-h-screen pb-64">
      {/* 이변 표시 (lazy loaded) */}
      <Suspense fallback={null}>
        <AnomalyDisplay anomalies={activeAnomalies} />

        {/* 이변 알림 */}
        {showAnomalyNotification && (
          <AnomalyNotification
            anomalies={activeAnomalies}
            onDismiss={handleDismissAnomalyNotification}
          />
        )}
      </Suspense>

      {/* 전투 모달 통합 컴포넌트 */}
      <BattleModals
        breachSelection={breachSelection}
        onBreachSelect={handleBreachSelect}
        playerStrength={player.strength || 0}
        traitReward={traitReward}
        onTraitSelect={handleTraitSelect}
        onTraitSkip={handleTraitSkip}
        cardReward={cardReward}
        onRewardSelect={handleRewardSelect}
        onRewardSkip={handleRewardSkip}
        recallSelection={recallSelection}
        onRecallSelect={handleRecallSelect}
        onRecallSkip={handleRecallSkip}
        postCombatOptions={postCombatOptions}
        isBoss={isBoss}
        onExitToMap={handleExitToMap}
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

      {/* 파토스 슬롯 - 아이템 슬롯 아래 */}
      <PathosSlots
        phase={battle.phase}
        player={battle.player}
        enemy={battle.enemy}
        cooldowns={pathosCooldowns}
        onPathosUsed={handlePathosUsed}
        battleRef={battleRef}
      />

      {/* 예상 피해량 - 오른쪽 고정 패널 (lazy loaded) */}
      <div className="expect-sidebar-fixed">
        <Suspense fallback={<div style={{ padding: '16px', color: '#94a3b8' }}>로딩 중...</div>}>
          <ExpectedDamagePreview
            player={player}
            enemy={enemy}
            fixedOrder={fixedOrder || playerTimeline}
            willOverdrive={willOverdrive}
            enemyMode={(enemyPlan.mode ?? null) as string}
            enemyActions={enemyPlan.actions ?? []}
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
        </Suspense>
        {/* 배율 경로: 단계와 무관하게 항상 표시 */}
        {comboStepsLog.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.2)', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, marginBottom: '6px', color: '#fbbf24' }}>🧮 배율 경로</div>
            {comboStepsLog.map((step: string, idx: number) => (
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
        timelineIndicatorVisible={Boolean(timelineIndicatorVisible)}
        insightAnimLevel={insightAnimLevel}
        insightAnimPulseKey={insightAnimPulseKey}
        enemyOverdriveVisible={Boolean(enemyOverdriveVisible)}
        enemyOverdriveLabel={enemyOverdriveLabel}
        dulledLevel={dulledLevel}
        playerTimeline={playerTimeline}
        queue={queue}
        executingCardIndex={(executingCardIndex ?? null) as number}
        usedCardIndices={usedCardIndices}
        qIndex={qIndex}
        enemyTimeline={enemyTimeline}
        effectiveInsight={effectiveInsight}
        insightReveal={insightReveal}
        actions={{
          ...actions,
          onLeisurePositionChange: handleLeisurePositionChange,
          onStrainOffsetChange: handleStrainOffsetChange
        }}
        destroyingEnemyCards={battle.destroyingEnemyCards}
        freezingEnemyCards={battle.freezingEnemyCards}
        frozenOrder={battle.frozenOrder}
        parryReadyStates={parryReadyStates}
        cardGrowth={cardGrowth}
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
            etherFinalValue={(etherFinalValue ?? null) as number}
            enemyEtherFinalValue={(enemyEtherFinalValue ?? null) as number}
            netFinalEther={(netFinalEther ?? null) as number}
            position="top"
          />

          {/* 왼쪽: 플레이어 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'flex-end', paddingTop: '200px' }}>
            <PlayerEtherBox
              currentCombo={currentCombo}
              battle={battle}
              currentDeflation={currentDeflation}
              etherCalcPhase={(etherCalcPhase ?? null) as string}
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
            etherFinalValue={(etherFinalValue ?? null) as number}
            enemyEtherFinalValue={(enemyEtherFinalValue ?? null) as number}
            netFinalEther={(netFinalEther ?? null) as number}
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
              enemyEtherCalcPhase={(enemyEtherCalcPhase ?? null) as string}
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
                enemyEtherValue={Number(enemyEtherValue)}
                enemyEtherCapacity={(enemy as { etherCapacity?: number })?.etherCapacity ?? 300}
                enemyTransferPulse={enemyTransferPulse}
                formatCompactValue={formatCompactValue}
                enemyBlock={(enemy as { block?: number })?.block || 0}
                enemyDef={(enemy as { def?: boolean })?.def || false}
                // 피해 분배 시스템
                distributionMode={battle.distributionMode}
                damageDistribution={battle.damageDistribution}
                totalDistributableDamage={battle.totalDistributableDamage}
                onUpdateDistribution={(unitId, isTargeted) => actions.updateDamageDistribution(unitId, isTargeted ? 1 : 0)}
                onConfirmDistribution={handleConfirmDistribution}
                onCancelDistribution={handleCancelDistribution}
                enemy={enemy}
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
                graceState={enemy?.grace}
              />
            )}
          </div>
        </div>
      </div>


      {/* 독립 활동력 표시 (좌측 하단 고정) */}
      {(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <EnergyDisplayFixed remainingEnergy={remainingEnergy} maxEnergy={player.maxEnergy} />
      )}

      {/* 간소화/정렬 버튼 (우측 하단 고정) */}
      {battle.phase === 'select' && (
        <BattleControlButtons
          isSimplified={isSimplified}
          sortType={sortType}
          devForceAllCards={devForceAllCards}
          setIsSimplified={actions.setIsSimplified}
          cycleSortType={cycleSortType}
          setDevForceAllCards={setDevForceAllCards}
        />
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
        renderNameWithBadge={memoizedRenderNameWithBadge}
        fixedOrder={fixedOrder ?? undefined}
        moveUp={moveUp}
        moveDown={moveDown}
        queue={queue ?? undefined}
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
});

interface BattleAppProps {
  initialPlayer: BattlePayload['player'];
  initialEnemy: BattlePayload['enemy'];
  playerEther?: number;
  liveInsight?: number;
  onBattleResult?: (result: BattleResult) => void;
}

export const BattleApp: React.FC<BattleAppProps> = memo(function BattleApp({ initialPlayer, initialEnemy, playerEther, liveInsight, onBattleResult = () => { } }) {
  return (
    <Game
      initialPlayer={initialPlayer}
      initialEnemy={initialEnemy}
      playerEther={playerEther}
      liveInsight={liveInsight}
      onBattleResult={onBattleResult}
    />
  );
});

export default BattleApp;
