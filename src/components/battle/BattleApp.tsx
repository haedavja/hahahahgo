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

import React, { useState, useEffect, useMemo, useRef, useCallback, type MutableRefObject } from "react";
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
import { CharacterSheet } from "../character/CharacterSheet";
import { useGameStore } from "../../state/gameStore";
import { ItemSlots } from "./ui/ItemSlots";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_EFFECT, RELIC_RARITY_COLORS } from "../../lib/relics";
import { applyAgility } from "../../lib/agilityUtils";
import { hasTrait, hasEnemyUnits, markCrossedCards } from "./utils/battleUtils";
import { detectPokerCombo } from "./utils/comboDetection";
import { getEnemyNameCounts, getGroupedEnemyMembers } from "./utils/enemyDisplayUtils";
import { COMBO_MULTIPLIERS, BASE_ETHER_PER_CARD, CARD_ETHER_BY_RARITY, getCardEtherGain } from "./utils/etherCalculations";
import { generateEnemyActions, shouldEnemyOverdrive, assignSourceUnitToActions } from "./utils/enemyAI";
import { simulatePreview } from "./utils/battleSimulation";
import { applyAction } from "./logic/combatActions";
import { initializeDeck, drawFromDeck } from "./utils/handGeneration";
import { playInsightSound } from "./utils/insightSystem";
import { computeComboMultiplier as computeComboMultiplierUtil, explainComboMultiplier as explainComboMultiplierUtil } from "./utils/comboMultiplier";
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
import { initReflectionState } from "../../lib/reflectionEffects";
import { addToken, removeToken, getAllTokens, expireTurnTokensByTimeline, getTokenStacks, setTokenStacks } from "../../lib/tokenUtils";
import { TOKENS } from "../../data/tokens";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import {
  calculatePassiveEffects,
  applyCombatStartEffects
} from "../../lib/relicEffects";
import type { BattlePayload, BattleResult, OrderItem, Card, ItemSlotsBattleActions, AIMode, AICard, AIEnemy, TokenEntity, SpecialCard, HandCard, SpecialActor, SpecialBattleContext, SpecialQueueItem, CombatState, CombatCard, CombatBattleContext, ParryReadyState, ComboCard, HandAction, BattleRef, UITimelineAction, UIRelicsMap, RelicRarities, HoveredCard, HoveredEnemyAction, TimelineBattle, TimelineEnemy, CentralPlayer, ItemSlotsEnemyPlan, ItemSlotsBattleRef, SimulationResult, ExpectedDamagePlayer, ExpectedDamageEnemy, AnomalyWithLevel, BreachSelection, RecallSelection, BattleRefType, EscapeBanRefType, CommonBattleActions } from "../../types";
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
import { ExpectedDamagePreview } from "./ui/ExpectedDamagePreview";
import { BreachSelectionModal } from "./ui/BreachSelectionModal";
import { CardRewardModal } from "./ui/CardRewardModal";
import { RecallSelectionModal } from "./ui/RecallSelectionModal";
import { EtherBar } from "./ui/EtherBar";
import { Sword, Shield, Heart, Zap, Flame, Clock, Skull, X, ChevronUp, ChevronDown, Play, StepForward, RefreshCw, ICON_MAP } from "./ui/BattleIcons";
import { selectBattleAnomalies, applyAnomalyEffects } from "../../lib/anomalyUtils";
import { createReducerEnemyState } from "../../state/battleHelpers";
import { AnomalyDisplay, AnomalyNotification } from "./ui/AnomalyDisplay";
import { DefeatOverlay } from "./ui/DefeatOverlay";
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

function Game({ initialPlayer, initialEnemy, playerEther = 0, onBattleResult, liveInsight }: GameProps): JSX.Element | null {
  // 스토어에서 필요한 추가 상태만 가져오기 (초기화 훅에 없는 것들)
  const playerTraits = useGameStore((state) => state.playerTraits || []);
  const playerEgos = useGameStore((state) => state.playerEgos || []);
  const devCharacterBuild = useGameStore((state) => state.characterBuild);
  const devBattleTokens = useGameStore((state) => state.devBattleTokens);
  const devClearBattleTokens = useGameStore((state) => state.devClearBattleTokens);
  const relics = useGameStore((state) => state.relics || []);
  const playerStrength = useGameStore((state) => state.playerStrength || 0);
  const devDulledLevel = useGameStore((state) => state.devDulledLevel ?? null);

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
  // ⚠️ hasEnemyUnits()는 UI 표시와 HP 분배 로직에서 동일하게 사용해야 함
  const enemyUnits = enemy?.units || [];
  const hasMultipleUnits = hasEnemyUnits(enemyUnits); // battleUtils.hasEnemyUnits 사용

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
    if (!currentTarget && aliveUnits[0]?.unitId !== undefined) {
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
  const addLog = useCallback((m: string) => {
    actions.addLog(m);
  }, [actions]);
  const formatSpeedText = useCallback((baseSpeed: number) => {
    const finalSpeed = applyAgility(baseSpeed, Number(effectiveAgility));
    const diff = finalSpeed - baseSpeed;
    if (diff === 0) return `${finalSpeed}`;
    const sign = diff < 0 ? '-' : '+';
    const abs = Math.abs(diff);
    return `${finalSpeed} (${baseSpeed} ${sign} ${abs})`;
  }, [effectiveAgility]);
  const cardUpgrades = useGameStore((state) => state.cardUpgrades || {}); // 카드 업그레이드(희귀도)

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

  const battleRef = useRef(battle); // battle 상태를 ref로 유지 (setTimeout closure 문제 해결)
  const [parryReadyStates, setParryReadyStates] = useState<ParryReadyState[]>([]); // 쳐내기 패리 대기 상태 배열 (렌더링용)

  const stepOnceRef = useRef<(() => void) | null>(null); // stepOnce 함수 참조 (브리치 선택 후 진행 재개용)

  // 브리치 카드 선택 (커스텀 훅으로 분리)
  const {
    breachSelection,
    setBreachSelection,
    breachSelectionRef,
    creationQueueRef,
    handleBreachSelect
  } = useBreachSelection({
    CARDS: CARDS as Card[],
    battleRef: battleRef as unknown as MutableRefObject<BattleRef>,
    stepOnceRef,
    addLog,
    actions: actions as unknown as CommonBattleActions
  });

  // 개발자 모드: 모든 보유 카드 100% 등장
  const [devForceAllCards, setDevForceAllCards] = useState(false);
  const devForceAllCardsRef = useRef(false);
  useEffect(() => { devForceAllCardsRef.current = devForceAllCards; }, [devForceAllCards]);

  // battle 상태가 변경될 때마다 ref 업데이트
  // nextTurnEffects는 동기적으로 업데이트되므로 기존 값 보존
  useEffect(() => {
    const currentNextTurnEffects = battleRef.current?.nextTurnEffects;
    battleRef.current = {
      ...battle,
      // nextTurnEffects가 이미 설정되어 있으면 기존 값 보존 (동기 업데이트된 값)
      nextTurnEffects: currentNextTurnEffects && Object.keys(currentNextTurnEffects).length > 0
        ? { ...battle.nextTurnEffects, ...currentNextTurnEffects }
        : battle.nextTurnEffects
    };
  }, [battle]);

  // resolve 단계 진입 시 에테르 배율 캡처 (애니메이션 중 리셋되어도 표시 유지)
  useEffect(() => {
    if (battle.phase === 'resolve') {
      displayEtherMultiplierRef.current = (player.etherMultiplier as number) || 1;
    }
  }, [battle.phase, player.etherMultiplier]);

  const computeComboMultiplier = useCallback((baseMult: number, cardsCount: number, includeFiveCard = true, includeRefBook = true, relicOrderOverride: Relic[] | null = null) => {
    const relicIds = relicOrderOverride ? relicOrderOverride.map(r => r.id) : null;
    return computeComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicIds, orderedRelicList);
  }, [orderedRelicList]);

  const explainComboMultiplier = useCallback((baseMult: number, cardsCount: number, includeFiveCard = true, includeRefBook = true, relicOrderOverride: Relic[] | null = null) => {
    const relicIds = relicOrderOverride ? relicOrderOverride.map(r => r.id) : null;
    return explainComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicIds, orderedRelicList);
  }, [orderedRelicList]);

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
    actions: actions as unknown as { setRelicActivated: (relicId: string | null) => void; setOrderedRelics: (relics: string[]) => void }
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
    actions: actions as unknown as { setInsightBadge: (badge: unknown) => void; setInsightAnimLevel: (level: number) => void; setInsightAnimPulseKey: (fn: (k: number) => number) => void; setHoveredEnemyAction: (action: unknown) => void }
  });

  const notifyBattleResult = useCallback((resultType: string) => {
    if (!resultType || resultSentRef.current) return;
    const finalEther = (player.etherPts as number);
    const delta = finalEther - ((initialEtherRef.current as number) ?? 0);
    onBattleResult?.({
      result: resultType as BattleResult['result'],
      playerEther: finalEther,
      deltaEther: delta,
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
    actions: actions as unknown as { setHoveredCard: (card: unknown) => void; setTooltipVisible: (visible: boolean) => void }
  });

  const handleExitToMap = () => {
    const outcome = postCombatOptions?.type || (enemy && enemy.hp <= 0 ? 'victory' : (player && player.hp <= 0 ? 'defeat' : null));
    if (!outcome) return;
    notifyBattleResult(outcome);
    if (typeof window !== 'undefined' && window.top === window) {
      setTimeout(() => { window.location.href = '/'; }, 100);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battle.log]);

  useEffect(() => {
    const nextEther = typeof safeInitialPlayer?.etherPts === 'number'
      ? safeInitialPlayer.etherPts
      : (playerEther ?? (player.etherPts as number));
    initialEtherRef.current = nextEther as number;
    resultSentRef.current = false;
    actions.setPlayer({
      ...player,
      hp: safeInitialPlayer?.hp ?? player.hp,
      maxHp: safeInitialPlayer?.maxHp ?? player.maxHp,
      energy: safeInitialPlayer?.energy ?? player.energy,
      maxEnergy: safeInitialPlayer?.energy ?? player.maxEnergy,
      etherPts: nextEther,
      // Strength를 0으로 리셋하지 않고 초기 계산값/이전 값 보존
      strength: Number(safeInitialPlayer?.strength || player.strength || startingStrength || 0),
      insight: Number(safeInitialPlayer?.insight || player.insight || startingInsight || 0)
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
    actions.setInsightAnimPulseKey(battle.insightAnimPulseKey + 1);
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
        actions.setInsightAnimPulseKey(battle.insightAnimPulseKey + 1);
        setTimeout(() => actions.setInsightAnimLevel(0), 1000);
        setTimeout(() => actions.setInsightBadge({ ...battle.insightBadge, show: false }), 1200);
      }, 50);
    }
    actions.setPhase('select');
    // 덱/무덤 시스템 초기화
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && ((currentBuild.mainSpecials?.length ?? 0) > 0 || (currentBuild.subSpecials?.length ?? 0) > 0 || (currentBuild.ownedCards?.length ?? 0) > 0);

    // 덱이 이미 초기화되었으면 스킵 (두 번째 useEffect에서 처리)
    if (!deckInitializedRef.current) {
      if (hasCharacterBuild) {
        // 덱 초기화 (주특기는 손패로, 보조특기는 덱 맨 위로)
        const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, (battle.vanishedCards || []).map(c => c.id));
        // 덱에서 카드 드로우
        const drawResult = drawFromDeck(initialDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current as Set<string>);
        actions.setDeck(drawResult.newDeck);
        actions.setDiscardPile(drawResult.newDiscardPile);
        // 주특기 + 드로우한 카드 = 손패
        actions.setHand([...mainSpecialsHand, ...drawResult.drawnCards]);
        deckInitializedRef.current = true;
      } else {
        // 캐릭터 빌드가 없으면 기존 방식 (테스트용)
        const rawHand = CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: generateHandUid(card.id, idx) }));
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
  const prevDevBuildRef = useRef<{ mainSpecials: string[]; subSpecials: string[] } | null>(null);
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
      const { deck: newDeck, mainSpecialsHand } = initializeDeck(devCharacterBuild, (battle.vanishedCards || []).map(c => c.id));
      const drawResult = drawFromDeck(newDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current as Set<string>);

      actions.setDeck(drawResult.newDeck);
      actions.setDiscardPile(drawResult.newDiscardPile);
      actions.setHand([...mainSpecialsHand, ...drawResult.drawnCards]);
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
    const enemyState = createReducerEnemyState({
      ...initialEnemy,
      deck: (initialEnemy.deck as string[]) || ENEMIES[0]?.deck || [],
      name: initialEnemy.name ?? '적',
    } as Parameters<typeof createReducerEnemyState>[0]);
    actions.setEnemy(enemyState);
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
    // activeAnomalies는 useBattleInitialization 훅에서 제공 (상태 동기화 완료됨)
    if (enemy && activeAnomalies.length > 0 && !anomalyNotificationShownRef.current) {

      // 이변 로그 추가
      activeAnomalies.forEach(({ anomaly, level }) => {
        const effect = anomaly.getEffect(level);
        addLog(`⚠️ ${anomaly.emoji} ${anomaly.name} (Lv.${level}): ${effect.description}`);
      });

      // 이변 알림 표시 (훅에서 이미 setShowAnomalyNotification(true) 호출됨)
      anomalyNotificationShownRef.current = true;
    }
  }, [enemy, activeAnomalies]);

  useEffect(() => {
    if (!enemy) {
      const e = ENEMIES[enemyIndex];
      const enemyState = createReducerEnemyState(e as Parameters<typeof createReducerEnemyState>[0]);
      actions.setEnemy(enemyState);

      // 전투 시작 상징 효과 로그 및 애니메이션
      const combatStartEffects = applyCombatStartEffects(orderedRelicList, {});

      // 전투 시작 상징 애니메이션
      orderedRelicList.forEach((relicId: string) => {
        const relic = RELICS[relicId as keyof typeof RELICS];
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
        const hasCharacterBuild = currentBuild && ((currentBuild.mainSpecials?.length ?? 0) > 0 || (currentBuild.subSpecials?.length ?? 0) > 0 || (currentBuild.ownedCards?.length ?? 0) > 0);

        if (hasCharacterBuild) {
          // 덱 초기화 (주특기는 손패로, 보조특기는 덱 맨 위로)
          const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, (vanishedCards || []).map(c => c.id));
          // 덱에서 카드 드로우
          const drawResult = drawFromDeck(initialDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current as Set<string>);
          actions.setDeck(drawResult.newDeck);
          actions.setDiscardPile(drawResult.newDiscardPile);
          // 주특기 + 드로우한 카드 = 손패
          const fullHand = [...mainSpecialsHand, ...drawResult.drawnCards];
          actions.setHand(fullHand);
          deckInitializedRef.current = true; // 덱 초기화 완료 표시
          addLog(`🎴 시작 손패 ${fullHand.length}장 (주특기 ${mainSpecialsHand.length}장, 덱: ${drawResult.newDeck.length}장)`);
        } else {
          const rawHand = CARDS.slice(0, 10).map((card, idx) => ({ ...card, __handUid: generateHandUid(card.id, idx) }));
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
    playerEgos: playerEgos.map(e => typeof e === 'string' ? e : e.name),
    playerTraits,
    enemyCount,
    battleRef: battleRef as unknown as MutableRefObject<BattleRef>,
    escapeBanRef: escapeBanRef as unknown as MutableRefObject<Set<string>>,
    turnStartProcessedRef,
    etherSlots,
    playSound,
    addLog,
    actions: actions as unknown as never
  });

  useEffect(() => {
    if (battle.phase === 'resolve' && (!queue || battle.queue.length === 0) && fixedOrder && fixedOrder.length > 0) {
      const rebuilt = fixedOrder.map(x => ({ actor: x.actor, card: x.card, sp: x.sp, originalIndex: x.originalIndex }));
      const markedRebuilt = markCrossedCards(rebuilt);
      actions.setQueue(markedRebuilt); actions.setQIndex(0);
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

    const slots = etherSlots(Number(enemy?.etherPts ?? 0));
    const cardsPerTurn = enemy?.cardsPerTurn || enemyCount || 2;
    const rawActions = generateEnemyActions(enemy, latestMode, slots, cardsPerTurn, Math.min(1, cardsPerTurn));
    const generatedActions = assignSourceUnitToActions(rawActions as AICard[], enemy?.units || []);
    actions.setEnemyPlan({ mode: latestMode, actions: generatedActions as unknown as Card[] });
  }, [battle.phase, enemyPlan?.mode, enemyPlan?.actions?.length, enemyPlan?.manuallyModified, enemy]);

  const totalEnergy = useMemo(() => battle.selected.reduce((s, c) => s + c.actionCost, 0), [battle.selected]);
  const totalSpeed = useMemo(
    () => battle.selected.reduce((s, c) => s + applyAgility(c.speedCost, Number(effectiveAgility)), 0),
    [battle.selected, effectiveAgility]
  );
  // 콤보 시스템 (커스텀 훅으로 분리)
  const { currentCombo, finalComboMultiplier, comboPreviewInfo, comboStepsLog } = useComboSystem({
    battleSelected: battle.selected,
    battlePhase: battle.phase,
    playerComboUsageCount: player.comboUsageCount ?? {},
    resolvedPlayerCards,
    battleQIndex: battle.qIndex,
    battleQueueLength: battle.queue.length,
    computeComboMultiplier,
    explainComboMultiplier: explainComboMultiplier as unknown as (baseMultiplier: number, cardsCount: number, allowSymbols: boolean, allowRefBook: boolean, orderedRelicList: string[]) => { steps: string[] },
    orderedRelicList,
    selected,
    actions: actions as unknown as { setCurrentDeflation: (deflation: { multiplier: number; usageCount: number } | null) => void; setMultiplierPulse: (pulse: boolean) => void }
  });

  // 다중 타겟 선택 시스템 (커스텀 훅으로 분리) - useCardSelection보다 먼저 정의
  const { handleConfirmDistribution, handleCancelDistribution, startDamageDistribution } = useMultiTargetSelection({
    battlePendingDistributionCard: battle.pendingDistributionCard,
    battleDamageDistribution: battle.damageDistribution as unknown as Record<string, boolean>,
    enemyUnits: enemyUnits as Array<{ hp: number; unitId: number; name?: string; [key: string]: unknown }>,
    addLog,
    actions: actions as unknown as { addSelected: (card: Card) => void; resetDistribution: () => void; setPendingDistributionCard: (card: Card | null) => void; setDamageDistribution: (dist: Record<string, boolean>) => void; setDistributionMode: (mode: boolean) => void }
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

  // 패 관리 (커스텀 훅으로 분리)
  const { redrawHand, cycleSortType, getSortedHand } = useHandManagement({
    canRedraw,
    battleHand: battle.hand,
    battleDeck: battle.deck,
    battleDiscardPile: battle.discardPile,
    battleVanishedCards: battle.vanishedCards,
    sortType: sortType as "type" | "speed" | "energy" | "value",
    hand,
    escapeBanRef: escapeBanRef as unknown as MutableRefObject<Set<string>>,
    addLog,
    playSound,
    actions: actions as unknown as { setDeck: (deck: Card[]) => void; setDiscardPile: (pile: Card[]) => void; setHand: (hand: Card[]) => void; setSelected: (selected: Card[]) => void; setCanRedraw: (canRedraw: boolean) => void; setSortType: (sortType: string) => void }
  });

  // 페이즈 전환 (커스텀 훅으로 분리)
  const { startResolve, beginResolveFromRespond, rewindToSelect } = usePhaseTransition({
    battleRef: battleRef as unknown as MutableRefObject<import("../../types").BattleRefValue>,
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
    respondSnapshot: respondSnapshot as unknown as { selectedSnapshot: Card[]; enemyActions: Card[] } | null,
    devilDiceTriggeredRef,
    etherSlots,
    playSound,
    addLog,
    actions: actions as unknown as never
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
      const isRemaining = remainingEnemyActions.has(item.card as Card);
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
    battleRef: battleRef as unknown as MutableRefObject<BattleRef>,
    playSound,
    actions: actions as unknown as never
  });

  // 보상 및 함성 선택 (커스텀 훅으로 분리) - useResolveExecution보다 먼저 정의
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
    CARDS: CARDS as Card[],
    battleRef: battleRef as unknown as MutableRefObject<BattleRef>,
    battleNextTurnEffects: battle.nextTurnEffects,
    addLog,
    actions: actions as unknown as { setPostCombatOptions: (options: unknown) => void; setPhase: (phase: string) => void; setNextTurnEffects: (effects: unknown) => void }
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
    relics: orderedRelicList as unknown as UIRelicsMap,
    orderedRelicList: orderedRelicList as unknown as Relic[],
    battleRef: battleRef as unknown as MutableRefObject<BattleRef | null>,
    parryReadyStatesRef,
    setParryReadyStates,
    growingDefenseRef: growingDefenseRef as unknown as MutableRefObject<number | null>,
    escapeBanRef: escapeBanRef as unknown as MutableRefObject<Set<string>>,
    escapeUsedThisTurnRef: escapeUsedThisTurnRef as unknown as MutableRefObject<Set<string>>,
    calculateEtherTransfer: calculateEtherTransfer as unknown as (playerAppliedEther: number, enemyAppliedEther: number, curPlayerPts: number, curEnemyPts: number, enemyHp: number) => { nextPlayerPts: number; nextEnemyPts: number; movedPts: number },
    checkVictoryCondition: checkVictoryCondition as unknown as (enemy: import("../../types").VictoryEnemy, pts: number) => import("../../types").VictoryCheckResult,
    showCardRewardModal,
    startEtherCalculationAnimation: startEtherCalculationAnimation as unknown as () => void,
    addLog,
    playSound,
    actions
  });

  const stepOnce = () => {
    // 브리치 선택 대기 중이면 진행 차단
    if (breachSelectionRef.current) return;

    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex];

    // 죽은 적의 카드 스킵 (적 체력 0 이하이고 적 카드인 경우)
    const currentEnemy = currentBattle.enemy || enemy;
    if (a.actor === 'enemy' && currentEnemy.hp <= 0) {
      // 다음 카드로 진행
      const newQIndex = currentBattle.qIndex + 1;
      actions.setQIndex(newQIndex);
      battleRef.current = { ...battleRef.current, qIndex: newQIndex };
      return;
    }
    const currentQIndex = currentBattle.qIndex; // Capture current qIndex

    // 타임라인 progress 업데이트 (공통 최대 속도 기준 비율로)
    const playerMaxSpeed = player?.maxSpeed || DEFAULT_PLAYER_MAX_SPEED;
    const enemyMaxSpeed = enemy?.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
    const commonMaxSpeed = Math.max(playerMaxSpeed, enemyMaxSpeed);
    const targetProgress = ((a.sp ?? 0) / commonMaxSpeed) * 100;

    // 이전 애니메이션 정리
    if (timelineAnimationRef.current) {
      cancelAnimationFrame(timelineAnimationRef.current);
      timelineAnimationRef.current = null;
    }

    // 부드러운 타임라인 진행 애니메이션 (방어자세 실시간 방어력용)
    const startProgress = currentBattle.timelineProgress || 0;
    const animationDuration = TIMING.CARD_EXECUTION_DELAY; // 애니메이션 지속시간
    const startTime = performance.now();

    const animateProgress = (currentTime: number) => {
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
        if (hasTrait(a.card, 'escape' as unknown as import("../../types/core").CardTrait)) {
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
      fencingDamageBonus: (currentNextTurnEffects as { fencingDamageBonus?: number }).fencingDamageBonus || 0  // 날 세우기: 검격 공격력 보너스
    };

    // 에테르 누적 헬퍼 함수 (공통 파라미터 캡처)
    const accumulateEther = (card: Card) => {
      processPlayerEtherAccumulation({
        card,
        turnEtherAccumulated,
        orderedRelicList,
        cardUpgrades: cardUpgrades as unknown as Record<string, unknown>,
        resolvedPlayerCards,
        playerTimeline: playerTimeline as unknown as Card[],
        relics: orderedRelicList as unknown as Relic[],
        triggeredRefs: {
          referenceBookTriggered: referenceBookTriggeredRef,
          devilDiceTriggered: devilDiceTriggeredRef
        },
        calculatePassiveEffects,
        getCardEtherGain: getCardEtherGain as unknown as (card: Card | Partial<Card>) => number,
        collectTriggeredRelics: collectTriggeredRelics as unknown as (params: { orderedRelicList: string[]; resolvedPlayerCards: number; playerTimeline: Card[]; triggeredRefs: import("../../types").RelicTriggeredRefs }) => import("../../types").RelicTrigger[],
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
      E.block = attackTargetResult.modifiedEnemyState.block;
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
      E.block = defenseSourceResult.modifiedEnemyState.block;
      E.def = defenseSourceResult.modifiedEnemyState.def ?? false;
      tempState.enemy = E;
    }

    let actionResult;
    let actionEvents;

    if (useAsyncMultiHit) {
      // 비동기 다중 타격 실행
      const attacker = a.actor === 'player' ? P : E;
      const defender = a.actor === 'player' ? E : P;

      // 타격별 콜백: 피격 애니메이션 및 사운드
      const onHitCallback = async (hitResult: SingleHitResult, hitIndex: number, totalHits: number) => {
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

      const multiHitResult = await executeMultiHitAsync(a.card, attacker, defender, a.actor, battleContext, onHitCallback as unknown as (hitIndex: number, totalHits: number, hitResult: { damage: number; events: import("../../types/combat").BattleEvent[] }) => void);

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
      E.block = attackBlockUpdateResult.modifiedEnemyState.block;
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
      E.block = defenseBlockResult.modifiedEnemyState.block;
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
          const waitingCards = waitingCardIds.map(id => CARDS.find(c => c.id === id)).filter(Boolean);

          if (waitingCards.length > 0) {
            setRecallSelection({ availableCards: waitingCards } as unknown as { availableCards: Card[] });
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
          a.card.onPlay(battle, tokenActions as unknown as import("../../types").BattleTokenActions);
        } catch (error) {
          if (import.meta.env.DEV) console.error('[Token onPlay Error]', error);
        }
      }
    }

    if (hasTrait(a.card, 'stun' as unknown as import("../../types/core").CardTrait)) {
      const { updatedQueue, stunEvent } = processStunEffect({
        action: a as unknown as never,
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
        getCardEtherGain: getCardEtherGain as unknown as (card: Card | Partial<Card>) => number,
        actions
      });
    }

    actions.setPlayer({ ...player, hp: P.hp, def: P.def, block: P.block, counter: P.counter, vulnMult: P.vulnMult || 1, strength: P.strength || 0, tokens: P.tokens });

    // === 다중 유닛 데미지 분배 ===
    // ⚠️ hasEnemyUnits()는 UI 표시(hasMultipleUnits)와 동일한 조건 사용
    const enemyUnits = E.units || enemy.units || [];
    const hasUnits = hasEnemyUnits(enemyUnits);

    if (hasUnits && a.actor === 'player' && a.card?.type === 'attack') {
      const damageDistributionResult = distributeUnitDamage({
        card: a.card as Card & { __targetUnitId?: number; __targetUnitIds?: number[]; isAoe?: boolean; damage?: number },
        enemyUnits: enemyUnits as unknown as EnemyUnit[],
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
      actionEvents: actionEvents as unknown as import("../../types").SimActionEvent[],
      action: a as unknown as HandAction,
      playHitSound,
      playBlockSound,
      actions
    });

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
      setTimeout(() => startEtherCalculationAnimation(turnEtherAccumulated, resolvedPlayerCards as unknown as number), TIMING.ETHER_CALC_START_DELAY);
    }
  }, [battle.phase, battle.qIndex, battle.queue.length, turnEtherAccumulated, etherCalcPhase, resolvedPlayerCards]);

  const removeSelectedAt = (i: number) => actions.setSelected(battle.selected.filter((_, idx) => idx !== i));

  // 키보드 단축키 처리
  useKeyboardShortcuts({
    battle,
    player,
    canRedraw,
    autoProgress,
    etherFinalValue,
    actions: actions as unknown as never,
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
    playerComboUsageCount: player.comboUsageCount as unknown as Record<string, number>,
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
    enemyUnits: enemyUnits as unknown as { [key: string]: unknown; hp: number; maxHp: number; block?: number | undefined; unitId: number }[],
    selectedTargetUnit: selectedTargetUnit as unknown as number,
    actions: actions as unknown as { setPreviewDamage: (damage: { value: number; lethal: boolean; overkill: boolean }) => void; setPerUnitPreviewDamage: (preview: Record<number, unknown>) => void },
    playSound
  });

  const enemyNameCounts = useMemo(() => getEnemyNameCounts(enemy), [
    enemy?.composition,
    enemy?.name,
    (enemy as { count?: number })?.count,
    (enemy as { quantity?: number })?.quantity,
    enemy
  ]);

  const groupedEnemyMembers = useMemo(() => getGroupedEnemyMembers(enemy), [
    enemy?.composition,
    enemy?.name,
    enemy?.emoji,
    enemy?.count,
    enemy?.quantity,
    enemy
  ]);

  // 에테르 획득량 미리보기 (커스텀 훅으로 분리) - Hook은 조건부 return 전에 호출
  const previewEtherGain = useEtherPreview({
    playerTimeline,
    selected,
    orderedRelicList,
    playerComboUsageCount: player?.comboUsageCount || {}
  });

  // 적 조합 감지 (표시용) - Hook은 조건부 return 전에 호출
  const enemyCombo = useMemo(() => {
    const rawActions = enemyPlan?.actions;
    const actions = Array.isArray(rawActions) ? rawActions : [];
    return detectPokerCombo(actions);
  }, [enemyPlan?.actions]);

  // 적 디플레이션 정보 설정 (선택/대응 단계에서) - 플레이어의 useComboSystem과 동일한 로직
  useEffect(() => {
    if (enemyCombo?.name && (battle.phase === 'select' || battle.phase === 'respond')) {
      const usageCount = (enemy?.comboUsageCount || {})[enemyCombo.name] || 0;
      const deflationMult = Math.pow(0.8, usageCount);
      actions.setEnemyCurrentDeflation(usageCount > 0 ? { multiplier: deflationMult, usageCount } : null);
    }
  }, [enemyCombo, enemy?.comboUsageCount, battle.phase, actions]);

  // 적 성향 힌트 추출 - Hook은 조건부 return 전에 호출
  const enemyHint = useMemo(() => {
    const hintLog = battle.log.find(line => line.includes('적 성향 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 성향 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [battle.log]);

  if (!enemy) return <div className="text-white p-4">로딩…</div>;

  const handDisabled = (c: Card) => {
    // 기본 체크: 최대 선택 수, 속도 한계, 행동력 부족
    if (battle.selected.length >= effectiveMaxSubmitCards ||
        totalSpeed + applyAgility(c.speedCost, Number(effectiveAgility)) > Number(player.maxSpeed) ||
        totalEnergy + c.actionCost > Number(player.maxEnergy)) {
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
  const playerEtherValue = Number(player?.etherPts) || 0;
  const playerEtherSlots = etherSlots(playerEtherValue);
  const enemyEtherValue = Number(enemy?.etherPts) || 0;
  const playerEnergyBudget = (player as { energy?: number }).energy || BASE_PLAYER_ENERGY;
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergy);
  const insightLevelSelect = insightReveal?.level || 0;
  const insightVisible = insightReveal?.visible;
  const enemyWillOverdrivePlan = shouldEnemyOverdrive(enemyPlan.mode, enemyPlan.actions as unknown as import("../../types").AICard[], Number(enemy.etherPts), turnNumber);
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
  const enemyCapacity = (enemy as { etherCapacity?: number })?.etherCapacity ?? Math.max(Number(enemyEtherValue), 1);
  const enemySoulScale = Math.max(0.4, Math.min(1.3, enemyCapacity > 0 ? Number(enemyEtherValue) / enemyCapacity : 1));

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
          onSelect={handleBreachSelect as unknown as (card: import("../../types").BreachCard, idx: number) => void}
          strengthBonus={player.strength || 0}
        />
      )}

      {/* 카드 보상 선택 모달 (승리 후) */}
      {cardReward && (
        <CardRewardModal
          rewardCards={cardReward.cards}
          onSelect={handleRewardSelect as unknown as (card: import("../../types").RewardCard, idx: number) => void}
          onSkip={handleRewardSkip}
        />
      )}

      {/* 함성 (recallCard) 카드 선택 모달 */}
      <RecallSelectionModal
        recallSelection={recallSelection}
        onSelect={handleRecallSelect as unknown as (card: import("../../types").RecallCard) => void}
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
        battleActions={actions as unknown as ItemSlotsBattleActions}
        player={battle.player}
        enemy={battle.enemy}
        enemyPlan={battle.enemyPlan as unknown as ItemSlotsEnemyPlan}
        battleRef={battleRef as unknown as import("react").RefObject<ItemSlotsBattleRef | null>}
      />
      {/* 예상 피해량 - 오른쪽 고정 패널 */}
      <div className="expect-sidebar-fixed">
        <ExpectedDamagePreview
          player={player}
          enemy={enemy}
          fixedOrder={(fixedOrder || playerTimeline) as unknown as import("../../types").UITimelineAction[] | null}
          willOverdrive={willOverdrive}
          enemyMode={(enemyPlan.mode ?? null) as string}
          enemyActions={(enemyPlan.actions ?? []) as unknown as UITimelineAction[]}
          phase={battle.phase}
          log={log}
          qIndex={battle.qIndex}
          queue={battle.queue as unknown as UITimelineAction[]}
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
          simulatePreview={simulatePreview as unknown as (params: { player: ExpectedDamagePlayer; enemy: ExpectedDamageEnemy; fixedOrder: UITimelineAction[] | null; willOverdrive: boolean; enemyMode: string; enemyActions: UITimelineAction[]; turnNumber: number }) => SimulationResult}
        />
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
        playerTimeline={playerTimeline as unknown as import("../../types").UITimelineAction[]}
        queue={queue}
        executingCardIndex={(executingCardIndex ?? null) as number}
        usedCardIndices={usedCardIndices}
        qIndex={qIndex}
        enemyTimeline={enemyTimeline as unknown as import("../../types").UITimelineAction[]}
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
        RELICS={RELICS as unknown as UIRelicsMap}
        RELIC_RARITIES={RELIC_RARITIES as unknown as RelicRarities}
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
                units={enemyUnits as unknown as import("../../types").EnemyUnitState[]}
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
            try { localStorage.setItem('battleIsSimplified', newVal.toString()); } catch { /* ignore */ }
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
        battle={battle as unknown as import("../../types").HandBattle}
        player={player}
        enemy={enemy}
        selected={selected}
        getSortedHand={getSortedHand}
        toggle={toggle}
        handDisabled={handDisabled}
        showCardTraitTooltip={showCardTraitTooltip as unknown as (card: Card, element: Element | null) => void}
        hideCardTraitTooltip={hideCardTraitTooltip}
        formatSpeedText={formatSpeedText}
        renderNameWithBadge={(card, defaultColor) => renderNameWithBadge(card, cardUpgrades, defaultColor)}
        fixedOrder={(fixedOrder ?? undefined) as unknown as HandAction[] | undefined}
        moveUp={moveUp}
        moveDown={moveDown}
        queue={(queue ?? undefined) as unknown as HandAction[] | undefined}
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

interface BattleAppProps {
  initialPlayer: BattlePayload['player'];
  initialEnemy: BattlePayload['enemy'];
  playerEther?: number;
  liveInsight?: number;
  onBattleResult?: (result: BattleResult) => void;
}

export const BattleApp: React.FC<BattleAppProps> = ({ initialPlayer, initialEnemy, playerEther, liveInsight, onBattleResult = () => { } }) => (
  <Game
    initialPlayer={initialPlayer}
    initialEnemy={initialEnemy}
    playerEther={playerEther}
    liveInsight={liveInsight}
    onBattleResult={onBattleResult}
  />
);

export default BattleApp;
