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

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { JSX } from 'react';
import { flushSync } from "react-dom";
import "./legacy-battle.css";
import { playHitSound, playBlockSound, playParrySound } from "../../lib/soundUtils";
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
import { calculateEtherSlots, MAX_SLOTS } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { useGameStore } from "../../state/gameStore";
import { ItemSlots } from "./ui/ItemSlots";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_EFFECT, RELIC_RARITY_COLORS } from "../../lib/relics";
import { applyAgility } from "../../lib/agilityUtils";
import { hasTrait } from "./utils/battleUtils";
import { detectPokerCombo } from "./utils/comboDetection";
import { COMBO_MULTIPLIERS, BASE_ETHER_PER_CARD, CARD_ETHER_BY_RARITY, getCardEtherGain } from "./utils/etherCalculations";
import { generateEnemyActions, shouldEnemyOverdrive, assignSourceUnitToActions } from "./utils/enemyAI";
import { simulatePreview } from "./utils/battleSimulation";
import { applyAction } from "./logic/combatActions";
import { initializeDeck, drawFromDeck } from "./utils/handGeneration";
import { playInsightSound } from "./utils/insightSystem";
import { computeComboMultiplier as computeComboMultiplierUtil, explainComboMultiplier as explainComboMultiplierUtil } from "./utils/comboMultiplier";
import { calculateEtherTransfer } from "./utils/etherTransfer";
import { formatCompactValue } from "./utils/formatUtils";
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
import type { BattlePayload, BattleResult, OrderItem, Card, ItemSlotsBattleActions, AIMode, AICard, AIEnemy, TokenEntity, SpecialCard, HandCard, SpecialActor, SpecialBattleContext, SpecialQueueItem, CombatState, CombatCard, CombatBattleContext, StunQueueItem, ParryQueueItem, ParryReadyState, ComboCard, HandAction, BattleRef, UITimelineAction, UIRelicsMap, RelicRarities, ComboInfo, UIDeflation, EnemyUnitUI, HoveredCard, HoveredEnemyAction, HandBattle, TimelineBattle, TimelineEnemy, CentralPlayer, HandUnit, ItemSlotsEnemyPlan, ItemSlotsBattleRef, SimulationResult, ExpectedDamagePlayer, ExpectedDamageEnemy, AnomalyWithLevel } from "../../types";
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
import { AnomalyDisplay, AnomalyNotification } from "./ui/AnomalyDisplay";
import { DefeatOverlay } from "./ui/DefeatOverlay";
import { TIMING, executeMultiHitAsync } from "./logic/battleExecution";
import { processTimelineSpecials, hasSpecial, processCardPlaySpecials } from "./utils/cardSpecialEffects";

// HandArea용 로컬 Card 타입 (HandArea.tsx의 로컬 Card와 호환)
type HandAreaCard = {
  id: string;
  name: string;
  type: string;
  actionCost: number;
  speedCost: number;
  [key: string]: unknown;
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
  const mergeRelicOrder = useCallback((relicList: string[] = [], saved: string[] = []): string[] => {
    const savedSet = new Set(saved);
    const merged: string[] = [];
    // 1) 저장된 순서 중 현재 보유 중인 것만 유지
    saved.forEach(id => { if (relicList.includes(id)) merged.push(id); });
    // 2) 새로 생긴 상징은 현재 보유 순서대로 뒤에 추가
    relicList.forEach(id => { if (!savedSet.has(id)) merged.push(id); });
    return merged;
  }, []);

  // Keep orderedRelics with useState for localStorage logic
  const [orderedRelics, setOrderedRelics] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('relicOrder');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return mergeRelicOrder(relics, ids);
      }
    } catch { /* ignore */ }
    return relics || [];
  });
  useEffect(() => {
    try {
      localStorage.setItem('relicOrder', JSON.stringify(orderedRelics));
    } catch { /* ignore */ }
  }, [orderedRelics]);
  const orderedRelicList = orderedRelics && orderedRelics.length ? orderedRelics : relics;

  // 이변 시스템: 전투 시작 시 이변 선택
  const [activeAnomalies, setActiveAnomalies] = useState<AnomalyWithLevel[]>([]);
  const [showAnomalyNotification, setShowAnomalyNotification] = useState(false);

  const safeInitialPlayer = initialPlayer ?? {} as Partial<BattlePayload['player']>;
  const safeInitialEnemy = initialEnemy ?? {} as Partial<BattlePayload['enemy']>;
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
  const baseEnergy = (playerWithAnomalies.energy as number) ?? BASE_PLAYER_ENERGY;
  // 이변 패널티를 고려한 최대 행동력 계산
  const energyPenalty = (playerWithAnomalies.energyPenalty as number) || 0;
  const baseMaxEnergy = Math.max(0, ((playerWithAnomalies.maxEnergy as number) ?? baseEnergy) - energyPenalty);
  // 민첩도 payload에 값이 있으면 우선 사용하고, 없으면 스토어 값을 사용
  const effectiveAgility = Number(playerWithAnomalies.agility ?? playerAgility) || 0;
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
    maxSpeed: Math.max(0, ((playerWithAnomalies.maxSpeed as number) ?? DEFAULT_PLAYER_MAX_SPEED) + (passiveRelicStats.maxSpeed || 0) + (passiveRelicStats.speed || 0) - ((playerWithAnomalies.speedPenalty as number) || 0)),
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
    player: initialPlayerState as unknown as PlayerState,
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
    } as unknown as EnemyState) : undefined,
    phase: 'select',
    hand: [],
    selected: [],
    canRedraw: true,
    sortType: (() => {
      try {
        const saved = localStorage.getItem('battleSortType');
        const validTypes: SortType[] = ['speed', 'energy', 'value', 'type', 'cost', 'order'];
        return (validTypes.includes(saved as SortType) ? saved : 'speed') as SortType;
      } catch {
        return 'speed' as SortType;
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

  // Keep refs as they are
  // 탈주 카드는 사용된 다음 턴에만 등장 금지
  const escapeBanRef = useRef(new Set());
  const escapeUsedThisTurnRef = useRef(new Set());
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const devilDiceTriggeredRef = useRef(false); // 턴 내 악마의 주사위 발동 여부
  const referenceBookTriggeredRef = useRef(false); // 턴 내 참고서 발동 여부
  const initialEtherRef = useRef(typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : (playerEther ?? 0));
  const resultSentRef = useRef(false);
  const turnStartProcessedRef = useRef(false); // 턴 시작 효과 중복 실행 방지
  const prevInsightRef = useRef(0); // 통찰 값 변화 추적용
  const prevRevealLevelRef = useRef(0); // 통찰 공개 레벨 추적용
  const deckInitializedRef = useRef(false); // 덱이 초기화되었는지 추적 (첫 턴 중복 드로우 방지)
    const battleRef = useRef(battle); // battle 상태를 ref로 유지 (setTimeout closure 문제 해결)
  const displayEtherMultiplierRef = useRef(1); // 애니메이션 표시용 에테르 배율 (리셋되어도 유지)
  const [parryReadyStates, setParryReadyStates] = useState<ParryReadyState[]>([]); // 쳐내기 패리 대기 상태 배열 (렌더링용)
  const parryReadyStatesRef = useRef<ParryReadyState[]>([]); // 쳐내기 패리 대기 상태 배열 (setTimeout용)
  const growingDefenseRef = useRef<{ activatedSp: number; totalDefenseApplied: number } | null>(null); // 방어자세: { activatedSp, lastProcessedSp }

  const stepOnceRef = useRef<(() => void) | null>(null); // stepOnce 함수 참조 (브리치 선택 후 진행 재개용)

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
  const timelineAnimationRef = useRef<number | null>(null); // 타임라인 진행 애니메이션 ref
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
      displayEtherMultiplierRef.current = (player.etherMultiplier as number) || 1;
    }
  }, [battle.phase, player.etherMultiplier]);

  const computeComboMultiplier = useCallback((baseMult: number, cardsCount: number, includeFiveCard = true, includeRefBook = true, relicOrderOverride: any = null) => {
    return computeComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicOrderOverride, orderedRelicList);
  }, [orderedRelicList]);

  const explainComboMultiplier = useCallback((baseMult: number, cardsCount: number, includeFiveCard = true, includeRefBook = true, relicOrderOverride: any = null) => {
    return explainComboMultiplierUtil(baseMult, cardsCount, includeFiveCard, includeRefBook, relicOrderOverride, orderedRelicList);
  }, [orderedRelicList]);

  // 효과음 재생 함수 (useCallback으로 안정적인 참조 유지)
  const playSound = useCallback((frequency = 800, duration = 100) => {
    try {
       
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

  const flashRelic = (relicId: any, tone = 800, duration = 500) => {
    const nextSet = new Set(activeRelicSet);
    nextSet.add(relicId);
    actions.setActiveRelicSet(nextSet);
    actions.setRelicActivated(relicId);
    const relic = RELICS[relicId as keyof typeof RELICS];
    if (relic?.effects && ((relic.effects as any).comboMultiplierPerCard || (relic.effects as any).etherCardMultiplier || (relic.effects as any).etherMultiplier || (relic.effects as any).etherFiveCardBonus)) {
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
    actions
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
        const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, (battle.vanishedCards || []) as unknown as string[]);
        // 덱에서 카드 드로우
        const drawResult = drawFromDeck(initialDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current as Set<string>);
        actions.setDeck(drawResult.newDeck);
        actions.setDiscardPile(drawResult.newDiscardPile);
        // 주특기 + 드로우한 카드 = 손패
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
      const { deck: newDeck, mainSpecialsHand } = initializeDeck(devCharacterBuild, (battle.vanishedCards || []) as unknown as string[]);
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
    const hp = initialEnemy.hp ?? initialEnemy.maxHp ?? 30;
    actions.setEnemy({
      deck: (initialEnemy.deck as string[]) || ENEMIES[0]?.deck || [],
      name: initialEnemy.name ?? '적',
      hp,
      maxHp: initialEnemy.maxHp ?? hp,
      vulnMult: 1,
      vulnTurns: 0,
      block: 0,
      counter: 0,
      etherPts: initialEnemy.etherPts ?? initialEnemy.etherCapacity ?? 300,
      etherCapacity: initialEnemy.etherCapacity ?? 300,
      etherOverdriveActive: false,
      tokens: { usage: [], turn: [], permanent: [] }
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
      actions.setEnemy({ ...e, hp: e.hp, maxHp: e.hp, vulnMult: 1, vulnTurns: 0, block: 0, counter: 0, etherPts: 0, etherOverdriveActive: false, maxSpeed: (e as { maxSpeed?: number }).maxSpeed ?? DEFAULT_ENEMY_MAX_SPEED, tokens: { usage: [], turn: [], permanent: [] } });

      // 전투 시작 상징 효과 로그 및 애니메이션
      const combatStartEffects = applyCombatStartEffects(orderedRelicList, {});

      // 전투 시작 상징 애니메이션
      orderedRelicList.forEach((relicId: any) => {
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
          const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, vanishedCards as unknown as string[]);
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
      const rebuilt = (fixedOrder as unknown as OrderItem[]).map(x => ({ actor: x.actor, card: x.card, sp: x.sp }));
      actions.setQueue(rebuilt as unknown as OrderItem[]); actions.setQIndex(0);
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
    const rawActions = generateEnemyActions(enemy as unknown as AIEnemy | null, latestMode as unknown as AIMode | null, slots, cardsPerTurn, Math.min(1, cardsPerTurn));
    const generatedActions = assignSourceUnitToActions(rawActions, enemy?.units || []);
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

  // 다중 타겟 선택 시스템 (커스텀 훅으로 분리) - useCardSelection보다 먼저 정의
  const { handleConfirmDistribution, handleCancelDistribution, startDamageDistribution } = useMultiTargetSelection({
    battlePendingDistributionCard: battle.pendingDistributionCard,
    battleDamageDistribution: battle.damageDistribution,
    enemyUnits,
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
    actions
  });

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
      const orderItem = item as unknown as { actor: 'player' | 'enemy'; card: unknown };
      if (orderItem.actor === 'player') return true;
      // 적 카드는 현재 enemyPlan.actions에 있는 것만 유지
      const isRemaining = remainingEnemyActions.has(orderItem.card as Card);
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
    CARDS,
    battleRef,
    battleNextTurnEffects: battle.nextTurnEffects,
    addLog,
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

  const stepOnce = () => {
    // 브리치 선택 대기 중이면 진행 차단
    if (breachSelectionRef.current) return;

    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) return;
    const a = currentBattle.queue[currentBattle.qIndex] as unknown as OrderItem;

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

    const animateProgress = (currentTime: any) => {
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

  const executeCardAction = async () => {
    // 중복 실행 방지 (StrictMode 등에서 발생 가능)
    if (isExecutingCardRef.current) return;
    isExecutingCardRef.current = true;

    const currentBattle = battleRef.current;
    if (currentBattle.qIndex >= currentBattle.queue.length) {
      isExecutingCardRef.current = false;
      return;
    }
    const a = currentBattle.queue[currentBattle.qIndex] as unknown as OrderItem;

    // battleRef에서 최신 player/enemy 상태 가져오기 (애니메이션 중 방어자세 방어력, 토큰 등 반영)
    const latestPlayer = currentBattle.player || player;
    const latestEnemy = currentBattle.enemy || enemy;
    let P = { ...player, def: latestPlayer.def || player.def || false, block: latestPlayer.block ?? player.block ?? 0, counter: player.counter || 0, vulnMult: player.vulnMult || 1, strength: player.strength || 0, tokens: latestPlayer.tokens };
    let E = { ...enemy, def: latestEnemy.def || enemy.def || false, block: latestEnemy.block ?? enemy.block ?? 0, counter: enemy.counter || 0, vulnMult: enemy.vulnMult || 1, tokens: latestEnemy.tokens };

    // 타임라인 기반 토큰 만료 처리 (현재 SP 도달 시 이전 턴에서 부여된 토큰 제거)
    const currentSp = a.sp || 0;
    const playerExpireResult = expireTurnTokensByTimeline(P as TokenEntity, turnNumber, currentSp);
    const enemyExpireResult = expireTurnTokensByTimeline(E as TokenEntity, turnNumber, currentSp);

    if (playerExpireResult.logs.length > 0) {
      P = { ...P, tokens: playerExpireResult.tokens };
      playerExpireResult.logs.forEach(log => addLog(log));
    }
    if (enemyExpireResult.logs.length > 0) {
      E = { ...E, tokens: enemyExpireResult.tokens };
      enemyExpireResult.logs.forEach(log => addLog(log));
    }

    // battleRef 동기 업데이트 (토큰 만료 반영)
    if (battleRef.current && (playerExpireResult.logs.length > 0 || enemyExpireResult.logs.length > 0)) {
      battleRef.current = { ...battleRef.current, player: P, enemy: E };
    }

    const tempState = { player: P, enemy: E, log: [] };

    // battleContext 생성 (special 효과용)
    // 진행 단계 최종 남은 행동력 계산 (가이러스 룰렛: 모든 선택 카드 비용 차감 후)
    type QueueItem = { actor: 'player' | 'enemy'; card: { actionCost?: number; cardCategory?: string } };
    const typedQueue = currentBattle.queue as unknown as QueueItem[];
    const allPlayerCards = typedQueue.filter(q => q.actor === 'player');
    const totalEnergyUsed = allPlayerCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const playerEnergyBudget = (P as { energy?: number; maxEnergy?: number }).energy || (P as { maxEnergy?: number }).maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedRemainingEnergy = Math.max(0, playerEnergyBudget - totalEnergyUsed);

    // 적 남은 에너지 계산
    const allEnemyCards = typedQueue.filter(q => q.actor === 'enemy');
    const enemyTotalEnergyUsed = allEnemyCards.reduce((sum, q) => sum + (q.card?.actionCost || 0), 0);
    const enemyEnergyBudget = (E as { energy?: number; maxEnergy?: number }).energy || (E as { maxEnergy?: number }).maxEnergy || BASE_PLAYER_ENERGY;
    const calculatedEnemyRemainingEnergy = Math.max(0, enemyEnergyBudget - enemyTotalEnergyUsed);

    // 이번 턴에 사용된 카드 카테고리 추적 (comboStyle용)
    const executedPlayerCards = typedQueue
      .slice(0, currentBattle.qIndex)
      .filter(q => q.actor === 'player');
    const usedCardCategories = [...new Set(executedPlayerCards.map(q => q.card?.cardCategory).filter(Boolean))];

    // 적 카드의 소스 유닛 이름 가져오기
    type UnitInfo = { unitId: number; name?: string };
    const currentUnitsForContext = ((E as { units?: UnitInfo[] }).units || enemy?.units || []) as UnitInfo[];
    const sourceUnit = a.actor === 'enemy' && a.card.__sourceUnitId !== undefined
      ? currentUnitsForContext.find(u => u.unitId === a.card.__sourceUnitId)
      : null;
    const enemyDisplayName = sourceUnit?.name || (E as { name?: string }).name || enemy?.name || '몬스터';

    // 현재 nextTurnEffects 가져오기 (fencingDamageBonus 등)
    const currentNextTurnEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects || {};

    const battleContext = {
      currentSp: a.sp || 0,  // 현재 카드의 타임라인 위치 (growingDefense용)
      currentTurn: turnNumber,  // 현재 턴 번호 (토큰 grantedAt용)
      queue: currentBattle.queue,
      currentQIndex: currentBattle.qIndex,
      remainingEnergy: calculatedRemainingEnergy,  // 플레이어 치명타 확률용 남은 에너지
      enemyRemainingEnergy: calculatedEnemyRemainingEnergy,  // 적 치명타 확률용 남은 에너지
      allCards: CARDS,  // 카드 창조용 전체 카드 풀
      usedCardCategories,  // comboStyle용: 이번 턴에 사용된 카드 카테고리
      hand: currentBattle.hand || [],  // autoReload용: 현재 손패
      enemyDisplayName,  // 적 유닛 이름 (로그용)
      fencingDamageBonus: (currentNextTurnEffects as { fencingDamageBonus?: number }).fencingDamageBonus || 0  // 날 세우기: 검격 공격력 보너스
    };

    // === requiredTokens 소모 (카드 실행 전) ===
    if (a.actor === 'player' && a.card.requiredTokens && Array.isArray(a.card.requiredTokens) && a.card.requiredTokens.length > 0) {
      for (const req of a.card.requiredTokens as Array<{ id: string; stacks: number }>) {
        const tokenRemoveResult = removeToken(P as TokenEntity, req.id, 'permanent', req.stacks);
        P = { ...P, tokens: tokenRemoveResult.tokens };
        addLog(`✨ ${req.id === 'finesse' ? '기교' : req.id} -${req.stacks} 소모`);
      }
      // tempState, battleRef 동기 업데이트
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
    let targetUnitIdForAttack: number | null = null;
    let originalEnemyBlock = E.block;  // 원래 공유 블록 저장
    const currentUnitsForAttack = E.units || enemy?.units || [];
    const hasUnitsForAttack = currentUnitsForAttack.length > 0;

    if (a.actor === 'player' && isAttackCard && hasUnitsForAttack) {
      const cardTargetUnitId = a.card.__targetUnitId ?? battle.selectedTargetUnit ?? 0;
      const aliveUnitsForAttack = currentUnitsForAttack.filter(u => u.hp > 0);
      let targetUnit = aliveUnitsForAttack.find(u => u.unitId === cardTargetUnitId);
      if (!targetUnit && aliveUnitsForAttack.length > 0) {
        targetUnit = aliveUnitsForAttack[0];
      }

      if (targetUnit) {
        targetUnitIdForAttack = targetUnit.unitId;
        // 타겟 유닛의 block을 E.block으로 사용 (공유 block 대신)
        E.block = targetUnit.block || 0;
        E.def = E.block > 0;
        tempState.enemy = E;
      }
    }

    // === 유닛 시스템: 적 방어 시 소스 유닛의 기존 block 사용 (누적값 표시용) ===
    let sourceUnitIdForDefense: number | null = null;
    if (a.actor === 'enemy' && (a.card.type === 'defense' || a.card.type === 'general') && hasUnitsForAttack) {
      const cardSourceUnitId = a.card.__sourceUnitId;
      if (cardSourceUnitId !== undefined && cardSourceUnitId !== null) {
        const sourceUnitForDefense = currentUnitsForAttack.find(u => u.unitId === cardSourceUnitId);
        if (sourceUnitForDefense) {
          sourceUnitIdForDefense = cardSourceUnitId as number;
          // 소스 유닛의 기존 block을 E.block으로 사용 (누적값 계산용)
          E.block = sourceUnitForDefense.block || 0;
          E.def = E.block > 0;
          tempState.enemy = E;
        }
      }
    }

    let actionResult;
    let actionEvents;

    if (useAsyncMultiHit) {
      // 비동기 다중 타격 실행
      const attacker = a.actor === 'player' ? P : E;
      const defender = a.actor === 'player' ? E : P;

      // 타격별 콜백: 피격 애니메이션 및 사운드
      const onHitCallback = async (hitResult: any, hitIndex: any, totalHits: any) => {
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
        P = multiHitResult.attacker as typeof P;
        E = multiHitResult.defender as typeof E;
      } else {
        E = multiHitResult.attacker as typeof E;
        P = multiHitResult.defender as typeof P;
      }

      // 카드 사용 시 special 효과 처리 (교차 특성 등) - 룰렛은 이제 타격별로 처리됨
      const cardPlayAttacker = a.actor === 'player' ? P : E;
      const cardPlayResult = processCardPlaySpecials({
        card: a.card as unknown as SpecialCard,
        attacker: cardPlayAttacker as unknown as SpecialActor,
        attackerName: a.actor as 'player' | 'enemy',
        battleContext: battleContext as unknown as SpecialBattleContext
      });

      // cardPlayResult의 토큰 처리
      if (cardPlayResult.tokensToAdd?.length > 0) {
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
      if (cardPlayResult.tokensToRemove?.length > 0) {
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
        cardPlaySpecials: cardPlayResult
      };

      // battleRef 동기 업데이트
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, player: P, enemy: E };
      }
    } else {
      // 기존 동기 처리 (방어 카드 또는 단일 타격 비총기 공격)
      actionResult = applyAction(tempState as unknown as CombatState, a.actor, a.card as unknown as CombatCard, battleContext as unknown as CombatBattleContext);
      const { events, updatedState } = actionResult;
      actionEvents = events;

      // applyAction에서 반환된 updatedState로 P와 E 재할당
      if (updatedState) {
        P = updatedState.player as any;
        E = updatedState.enemy as any;
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

    // === 유닛 시스템: 플레이어 공격 후 타겟 유닛의 block 업데이트 ===
    if (a.actor === 'player' && isAttackCard && hasUnitsForAttack && targetUnitIdForAttack !== null) {
      const remainingBlock = E.block || 0;  // 공격 후 남은 방어력
      const unitsAfterAttack = E.units || currentUnitsForAttack;

      // 타겟 유닛의 block 업데이트
      const updatedUnitsAfterAttack = unitsAfterAttack.map(u => {
        if (u.unitId === targetUnitIdForAttack) {
          return { ...u, block: remainingBlock };
        }
        return u;
      });

      E.units = updatedUnitsAfterAttack;
      E.block = 0;  // 공유 block 리셋 (개별 유닛이 가짐)
      E.def = false;  // 공유 def 리셋

      // battleRef 동기 업데이트
      if (battleRef.current) {
        battleRef.current = { ...battleRef.current, enemy: E };
      }
    }

    // === 적 방어 카드: 개별 유닛에 방어력 적용 ===
    // 유닛 시스템 사용 시 소스 유닛에게만 방어력 부여 (공유 block 대신)
    if (a.actor === 'enemy' && (a.card.type === 'defense' || a.card.type === 'general') && E.block > 0) {
      const currentUnits = E.units || enemy?.units || [];
      const sourceUnitId = a.card.__sourceUnitId;

      // 유닛이 있고 sourceUnitId가 설정되어 있으면 해당 유닛에 블록 전송
      if (currentUnits.length > 0 && sourceUnitId !== undefined && sourceUnitId !== null) {
        // E.block은 이미 누적값 (기존 + 새로 추가된 값)
        const totalBlock = E.block;

        // 소스 유닛의 블록을 누적값으로 설정
        const updatedUnits = currentUnits.map(u => {
          if (u.unitId === sourceUnitId) {
            return { ...u, block: totalBlock, def: true };
          }
          return u;
        });

        // 공유 블록은 리셋하고 유닛별 블록 사용
        E.units = updatedUnits;
        E.block = 0;  // 공유 블록 리셋
        E.def = false;  // 공유 def도 리셋 (개별 유닛이 가짐)

        // battleRef 동기 업데이트
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: E };
        }
      }
    }

    // === 치명타 발생 시 기교 토큰 부여 (플레이어만) ===
    // 다단 공격의 경우 치명타 횟수만큼 부여, 단일 공격은 1회
    if (actionResult.isCritical && a.actor === 'player') {
      const critCount = (actionResult as any).criticalHits || 1;  // multiHitResult.criticalHits or 1 for single
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
    if (hasSpecial(a.card as unknown as SpecialCard, 'violentMort') && a.actor === 'player' && a.card.type === 'attack') {
      const EXECUTION_THRESHOLD = 30;
      if (E.hp > 0 && E.hp <= EXECUTION_THRESHOLD) {
        // 부활 토큰 제거 후 처형
        const reviveToken = getAllTokens(E as TokenEntity).find((t: any) => t.effect?.type === 'REVIVE');
        if (reviveToken) {
          const reviveRemoveResult = removeToken(E as TokenEntity, reviveToken.id, 'usage', reviveToken.stacks || 1);
          E = { ...E, tokens: reviveRemoveResult.tokens };
          addLog(`💀 처형: 부활 무시!`);
        }
        // 즉시 처형
        E.hp = 0;
        (E as { executed?: boolean }).executed = true;  // 처형 플래그 (부활 방지용)
        addLog(`💀 바이올랑 모르: 적 체력 ${EXECUTION_THRESHOLD} 이하! 처형!`);
        // battleRef 동기 업데이트
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, enemy: E };
        }
        actions.setEnemy({ ...E });
      }
    }

    // 이벤트 로그 출력
    actionEvents.forEach(ev => {
      if (ev.msg) addLog(ev.msg);
    });

    // === 화상(BURN) 피해 처리: 카드 사용 시마다 피해 ===
    if (a.actor === 'player') {
      const playerBurnTokens = getAllTokens(P as TokenEntity).filter((t: any) => t.effect?.type === 'BURN');
      if (playerBurnTokens.length > 0) {
        const burnDamage = playerBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        P.hp = Math.max(0, P.hp - burnDamage);
        addLog(`🔥 화상: 플레이어 -${burnDamage} HP`);
        actionEvents.push({
          actor: 'player',
          card: a.card.name as any,
          type: 'burn',
          dmg: burnDamage,
          msg: `🔥 화상: 플레이어 -${burnDamage} HP`
        } as any);
        // battleRef 동기 업데이트
        if (battleRef.current) {
          battleRef.current = { ...battleRef.current, player: P };
        }
      }
    } else if (a.actor === 'enemy') {
      const enemyBurnTokens = getAllTokens(E as TokenEntity).filter((t: any) => t.effect?.type === 'BURN');
      if (enemyBurnTokens.length > 0) {
        const burnDamage = enemyBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
        E.hp = Math.max(0, E.hp - burnDamage);
        addLog(`🔥 화상: 적 -${burnDamage} HP`);
        actionEvents.push({
          actor: 'enemy',
          card: a.card.name as any,
          type: 'burn',
          dmg: burnDamage,
          msg: `🔥 화상: 적 -${burnDamage} HP`
        } as any);
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
      breachSelectionRef.current = breachState as any;
      setBreachSelection(breachState as any);

      // 선택 중에는 stepOnce 진행을 멈춤 (사용자가 선택할 때까지)
      isExecutingCardRef.current = false;
      return;
    }

    // cardPlaySpecials 결과 처리 (comboStyle, mentalFocus 등)
    if (actionResult.cardPlaySpecials && a.actor === 'player') {
      const { bonusCards, nextTurnEffects: newNextTurnEffects } = actionResult.cardPlaySpecials as any;

      // bonusCards 처리 (comboStyle): 큐에 유령카드로 추가
      if (bonusCards && bonusCards.length > 0) {
        const insertSp = (a.sp || 0) + 1;  // 현재 카드 +1 sp에 삽입
        const currentQ = battleRef.current.queue;
        const currentQIndex = battleRef.current.qIndex;

        const newActions = bonusCards.map((bonusCard: any) => ({
          actor: 'player',
          card: {
            ...bonusCard,
            // 카드 핵심 속성 명시적 복사 (손실 방지)
            damage: bonusCard.damage,
            block: bonusCard.block,
            hits: bonusCard.hits,
            speedCost: bonusCard.speedCost,
            actionCost: bonusCard.actionCost,
            type: bonusCard.type,
            cardCategory: bonusCard.cardCategory,
            special: bonusCard.special,
            traits: bonusCard.traits,
            isGhost: true,
            __uid: `combo_${Math.random().toString(36).slice(2)}`
          },
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

        addLog(`🔄 연계 효과: "${bonusCards.map((c: any) => c.name).join(', ')}" 큐에 추가!`);
      }

      // nextTurnEffects 처리 (mentalFocus, emergencyDraw, recallCard, sharpenBlade)
      if (newNextTurnEffects) {
        const currentEffects = battleRef.current?.nextTurnEffects || battle.nextTurnEffects;
        const updatedEffects = {
          ...currentEffects,
          bonusEnergy: (currentEffects.bonusEnergy || 0) + (newNextTurnEffects.bonusEnergy || 0),
          maxSpeedBonus: (currentEffects.maxSpeedBonus || 0) + (newNextTurnEffects.maxSpeedBonus || 0),
          extraCardPlay: (currentEffects.extraCardPlay || 0) + (newNextTurnEffects.extraCardPlay || 0),
          // 날 세우기: 이번 전투 검격 공격력 보너스 (누적)
          fencingDamageBonus: (currentEffects.fencingDamageBonus || 0) + (newNextTurnEffects.fencingDamageBonus || 0)
        };

        // === 비상대응 (emergencyDraw): 즉시 덱에서 카드 뽑기 ===
        if (newNextTurnEffects.emergencyDraw && newNextTurnEffects.emergencyDraw > 0) {
          const currentDeck = battleRef.current?.deck || battle.deck || [];
          const currentDiscard = battleRef.current?.discardPile || battle.discardPile || [];

          if (currentDeck.length > 0 || currentDiscard.length > 0) {
            const drawResult = drawFromDeck(currentDeck as HandCard[], currentDiscard as HandCard[], newNextTurnEffects.emergencyDraw, escapeBanRef.current as Set<string>);

            // 현재 손패에 추가
            const currentHand = battleRef.current?.hand || battle.hand || [];
            const newHand = [...currentHand, ...drawResult.drawnCards];

            actions.setDeck(drawResult.newDeck);
            actions.setDiscardPile(drawResult.newDiscardPile);
            actions.setHand(newHand);

            if (battleRef.current) {
              battleRef.current = { ...battleRef.current, hand: newHand, deck: drawResult.newDeck, discardPile: drawResult.newDiscardPile };
            }

            if (drawResult.reshuffled) {
              addLog('🔄 덱이 소진되어 무덤을 섞어 새 덱을 만들었습니다.');
            }
            addLog(`🚨 비상대응: ${drawResult.drawnCards.map(c => c.name).join(', ')} 즉시 손패에 추가!`);
          } else {
            addLog(`🚨 비상대응: 덱과 무덤에 카드가 없습니다.`);
          }
        }

        // === 함성 (recallCard): 다음 턴에 대기 카드 선택 UI 표시 ===
        if (newNextTurnEffects.recallCard) {
          const currentBuild = useGameStore.getState().characterBuild;
          if (currentBuild) {
            const { mainSpecials = [], subSpecials = [], ownedCards = [] } = currentBuild;
            const usedCardIds = new Set([...mainSpecials, ...subSpecials]);
            // 대기 카드: ownedCards 중 주특기/보조특기가 아닌 카드
            const waitingCardIds = ownedCards.filter(id => !usedCardIds.has(id));
            const waitingCards = waitingCardIds
              .map(id => CARDS.find(c => c.id === id))
              .filter(Boolean);

            if (waitingCards.length > 0) {
              // 선택 UI 표시를 위해 상태 저장
              setRecallSelection({ availableCards: waitingCards } as any);
              addLog(`📢 함성: 대기 카드 중 1장을 선택하세요!`);
            } else {
              addLog(`📢 함성: 대기 카드가 없습니다.`);
            }
          }
          // recallCard 플래그는 다음 턴에 사용되지 않으므로 효과에서 제외
        }

        // === 엘 라피드 (addCardToHand): 즉시 손패에 카드 추가 ===
        if (newNextTurnEffects.addCardToHand) {
          const cardId = newNextTurnEffects.addCardToHand;
          const cardToAdd = CARDS.find(c => c.id === cardId);
          if (cardToAdd) {
            const currentHand = battleRef.current?.hand || battle.hand || [];
            const newCard = {
              ...cardToAdd,
              _instanceId: `${cardId}_copy_${Date.now()}`
            };
            const newHand = [...currentHand, newCard];
            actions.setHand(newHand);
            if (battleRef.current) {
              battleRef.current = { ...battleRef.current, hand: newHand as unknown as Card[] };
            }
            addLog(`📋 ${cardToAdd.name} 복사본이 손패에 추가되었습니다!`);
          }
        }

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
    const cardId = (a.card as { id?: string }).id;
    if (a.actor === 'player' && cardId) {
      actions.setCardUsageCount({
        ...cardUsageCount,
        [cardId]: ((cardUsageCount as Record<string, number>)[cardId] || 0) + 1
      });

      // 방어자세 (growingDefense): 발동 시 활성화, 이후 타임라인 진행마다 방어력 +1
      if (hasSpecial(a.card as unknown as SpecialCard, 'growingDefense')) {
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
            addTokenToPlayer: (tokenId: any, stacks = 1) => {
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
            removeTokenFromPlayer: (tokenId: any, tokenType: any, stacks = 1) => {
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
            addTokenToEnemy: (tokenId: any, stacks = 1) => {
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
            resetTokenForPlayer: (tokenId: any, tokenType: any, newStacks = 0) => {
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
          console.error('[Token onPlay Error]', error);
        }
      }
    }

    if (hasTrait(a.card, 'stun')) {
      const { updatedQueue, stunEvent } = processStunEffect({
        action: a,
        queue: currentBattle.queue as unknown as StunQueueItem[],
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
      card: a.card as unknown as SpecialCard,
      actor: (a.actor === 'player' ? P : E) as unknown as SpecialActor,
      actorName: a.actor as 'player' | 'enemy',
      queue: battleRef.current.queue as unknown as SpecialQueueItem[],
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
      type QueueItemWithSp = { actor: 'player' | 'enemy'; sp?: number };
      if (timelineChanges.advancePlayer > 0) {
        updatedQueue = updatedQueue.map((item, idx) => {
          const typedItem = item as unknown as QueueItemWithSp;
          if (idx > currentQIndex && typedItem.actor === 'player') {
            return { ...item, sp: Math.max(0, (typedItem.sp || 0) - timelineChanges.advancePlayer) };
          }
          return item;
        });
      }

      // 적 카드 뒤로 밀기 (현재 카드 이후의 적 카드들)
      if (timelineChanges.pushEnemy > 0) {
        updatedQueue = updatedQueue.map((item, idx) => {
          const typedItem = item as unknown as QueueItemWithSp;
          if (idx > currentQIndex && typedItem.actor === 'enemy') {
            return { ...item, sp: (typedItem.sp || 0) + timelineChanges.pushEnemy };
          }
          return item;
        });
      }

      // 적의 마지막 카드만 밀기
      if (timelineChanges.pushLastEnemy > 0) {
        // 현재 이후의 적 카드들 중 가장 마지막 카드 찾기
        let lastEnemyIdx = -1;
        for (let i = updatedQueue.length - 1; i > currentQIndex; i--) {
          if ((updatedQueue[i] as unknown as QueueItemWithSp).actor === 'enemy') {
            lastEnemyIdx = i;
            break;
          }
        }
        if (lastEnemyIdx !== -1) {
          updatedQueue = updatedQueue.map((item, idx) => {
            if (idx === lastEnemyIdx) {
              const typedItem = item as unknown as QueueItemWithSp;
              return { ...item, sp: (typedItem.sp || 0) + timelineChanges.pushLastEnemy };
            }
            return item;
          });
        }
      }

      // 큐 재정렬 (sp 값 기준, 이미 처리된 카드들은 유지)
      const processedCards = updatedQueue.slice(0, currentQIndex + 1);
      const remainingCards = updatedQueue.slice(currentQIndex + 1);
      remainingCards.sort((a, b) => ((a as unknown as QueueItemWithSp).sp || 0) - ((b as unknown as QueueItemWithSp).sp || 0));
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
      // 공격/범용/특수 카드 중 랜덤 3장 선택 (중복 ID 방지, 기교 소모 카드 제외 - 유령카드는 토큰 체크 없이 실행되므로)
      const cardPool = CARDS.filter(c =>
        (c.type === 'attack' || c.type === 'general' || c.type === 'special') &&
        c.id !== 'breach' &&
        (!c.requiredTokens || c.requiredTokens.length === 0)
      );
      const shuffled = [...cardPool].sort(() => Math.random() - 0.5);
      const breachCards: typeof CARDS = [];
      const usedIds = new Set();
      for (const card of shuffled) {
        if (!usedIds.has(card.id) && breachCards.length < 3) {
          breachCards.push(card);
          usedIds.add(card.id);
        }
      }

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
      breachSelectionRef.current = breachState as any;
      setBreachSelection(breachState as any);

      // 브리치 선택 중에는 stepOnce 진행을 멈춤 (사용자가 선택할 때까지)
      isExecutingCardRef.current = false;
      return;
    }

    // createFencingCards3 (벙 데 라므): 3x3 창조 선택 (3번의 선택, 각각 3장 중 1장)
    if (hasSpecial(a.card as unknown as SpecialCard, 'createFencingCards3') && a.actor === 'player') {
      // 펜싱 공격 카드 풀 (기교 소모 카드 제외 - 창조된 유령카드는 토큰 체크 없이 실행되므로)
      const fencingAttackCards = CARDS.filter(c =>
        c.cardCategory === 'fencing' &&
        c.type === 'attack' &&
        c.id !== a.card.id &&
        (!c.requiredTokens || c.requiredTokens.length === 0) // 기교 소모 카드 제외
      );

      if (fencingAttackCards.length >= 3) {
        // 3번의 선택을 위한 큐 생성 (각각 다른 3장)
        const allShuffled = [...fencingAttackCards].sort(() => Math.random() - 0.5);
        const usedIds = new Set();

        // 창조 선택 큐 초기화
        creationQueueRef.current = [];

        for (let selectionIdx = 0; selectionIdx < 3; selectionIdx++) {
          // 이 선택을 위한 3장 선택 (이전 선택에서 쓰인 카드 제외)
          const availableCards = allShuffled.filter(c => !usedIds.has(c.id));
          const selectionCards = availableCards.slice(0, 3);

          // 선택된 카드 ID 기록 (다음 선택에서 제외)
          selectionCards.forEach(c => usedIds.add(c.id));

          (creationQueueRef.current as any).push({
            cards: selectionCards,
            insertSp: (a.sp ?? 0) + 1, // +1 속도에 배치
            breachCard: { ...a.card, breachSpOffset: 1 },
            isAoe: true // 범위 피해 플래그
          });
        }

        addLog(`👻 "${a.card.name}" 발동! 검격 카드 창조 1/3: 카드를 선택하세요.`);

        // 에테르 누적 (return 전에 처리)
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

        // 첫 번째 선택 시작
        const firstSelection = (creationQueueRef.current as any).shift();
        if (!firstSelection) return;
        const creationState = {
          cards: firstSelection.cards,
          breachSp: firstSelection.insertSp,
          breachCard: firstSelection.breachCard,
          isCreationSelection: true,
          isAoe: firstSelection.isAoe
        };
        breachSelectionRef.current = creationState as any;
        setBreachSelection(creationState as any);

        // 선택 중에는 stepOnce 진행을 멈춤
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
        queue: currentQ as unknown as ParryQueueItem[],
        currentQIndex: currentBattle.qIndex,
        enemyMaxSpeed: Number(enemy.maxSpeed) || 0,
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

    // === 다중 유닛 데미지 분배 ===
    const enemyUnits = E.units || enemy.units || [];
    const hasUnits = enemyUnits.length > 1;  // 2개 이상일 때만 다중 유닛 처리

    if (hasUnits && a.actor === 'player' && a.card?.type === 'attack') {
      const targetUnitIds = a.card.__targetUnitIds;
      // AOE 공격 체크: aoeAttack special 또는 isAoe 플래그
      const isAoeAttack = hasSpecial(a.card as unknown as SpecialCard, 'aoeAttack') || a.card.isAoe === true;

      if (isAoeAttack) {
        // === 범위 피해 모드: 모든 생존 유닛에 동일 피해 ===
        let updatedUnits = [...enemyUnits];
        const damageDealt = actionResult.dealt || 0;
        const damageLogParts: string[] = [];

        if (damageDealt > 0) {
          const aliveUnits = updatedUnits.filter(u => u.hp > 0);

          for (const targetUnit of aliveUnits) {
            // 유닛별 방어력 적용
            const unitBlock = targetUnit.block || 0;
            const blockedDamage = Math.min(unitBlock, damageDealt);
            const actualDamage = damageDealt - blockedDamage;
            const newBlock = unitBlock - blockedDamage;
            const newHp = Math.max(0, targetUnit.hp - actualDamage);

            updatedUnits = updatedUnits.map(u => {
              if (u.unitId === targetUnit.unitId) {
                return { ...u, hp: newHp, block: newBlock };
              }
              return u;
            });

            if (blockedDamage > 0) {
              damageLogParts.push(`${targetUnit.name}: ${actualDamage} (방어 ${blockedDamage})`);
            } else {
              damageLogParts.push(`${targetUnit.name}: ${actualDamage}`);
            }
          }

          const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
          E.hp = newTotalHp;
          E.units = updatedUnits;

          if (damageLogParts.length > 0) {
            addLog(`🌀 범위 피해: ${damageLogParts.join(', ')}`);
          }
        }
      } else if (Array.isArray(targetUnitIds) && targetUnitIds.length > 0) {
        // === 다중 타겟 모드: 선택된 모든 유닛에 카드 피해 적용 ===
        let updatedUnits = [...enemyUnits];
        const baseDamage = Number((a.card as { damage?: number }).damage) || 0;
        const damageLogParts: string[] = [];

        for (const unitId of targetUnitIds) {
          const targetUnit = updatedUnits.find(u => u.unitId === unitId && u.hp > 0);
          if (!targetUnit) continue;

          // 유닛별 방어력 적용
          const unitBlock = targetUnit.block || 0;
          const blockedDamage = Math.min(unitBlock, baseDamage);
          const actualDamage = baseDamage - blockedDamage;
          const newBlock = unitBlock - blockedDamage;
          const newHp = Math.max(0, targetUnit.hp - actualDamage);

          updatedUnits = updatedUnits.map(u => {
            if (u.unitId === unitId) {
              return { ...u, hp: newHp, block: newBlock };
            }
            return u;
          });

          if (blockedDamage > 0) {
            damageLogParts.push(`${targetUnit.name}: 공격력 ${baseDamage} - 방어력 ${blockedDamage} = ${actualDamage}`);
          } else {
            damageLogParts.push(`${targetUnit.name}: ${actualDamage}`);
          }
        }

        const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
        E.hp = newTotalHp;
        E.units = updatedUnits;

        if (damageLogParts.length > 0) {
          addLog(`⚔️ 다중 타겟: ${damageLogParts.join(', ')}`);
        }
      } else {
        // === 기존 단일 타겟 모드 ===
        const damageDealt = actionResult.dealt || 0;

        if (damageDealt > 0) {
          // 카드에 지정된 타겟 유닛 ID 사용 (없으면 전역 선택 타겟 사용)
          const cardTargetUnitId = a.card.__targetUnitId ?? battle.selectedTargetUnit ?? 0;
          const aliveUnits = enemyUnits.filter(u => u.hp > 0);
          let targetUnit = aliveUnits.find(u => u.unitId === cardTargetUnitId);
          if (!targetUnit && aliveUnits.length > 0) {
            targetUnit = aliveUnits[0];
          }

          if (targetUnit) {
            const unitHpBefore = targetUnit.hp;
            const newUnitHp = Math.max(0, targetUnit.hp - damageDealt);

            const updatedUnits = enemyUnits.map(u => {
              if (u.unitId === targetUnit.unitId) {
                return { ...u, hp: newUnitHp };
              }
              return u;
            });

            const newTotalHp = updatedUnits.reduce((sum, u) => sum + Math.max(0, u.hp), 0);
            E.hp = newTotalHp;
            E.units = updatedUnits;

            addLog(`🎯 ${targetUnit.name}에게 ${damageDealt} 피해 (${unitHpBefore} → ${newUnitHp})`);
          }
        }
      }
    }

    actions.setEnemy({ ...enemy, hp: E.hp, def: E.def, block: E.block, counter: E.counter, vulnMult: E.vulnMult || 1, tokens: E.tokens, ...(E.units && { units: E.units }) });
    actions.setActionEvents({ ...currentBattle.actionEvents, [currentBattle.qIndex]: actionEvents });

    // 이벤트 처리: 애니메이션 및 사운드
    processActionEventAnimations({
      actionEvents: actionEvents as any,
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
      setTimeout(() => startEtherCalculationAnimation(turnEtherAccumulated, resolvedPlayerCards as any), TIMING.ETHER_CALC_START_DELAY);
    }
  }, [battle.phase, battle.qIndex, battle.queue.length, turnEtherAccumulated, etherCalcPhase, resolvedPlayerCards]);

  const removeSelectedAt = (i: any) => actions.setSelected(battle.selected.filter((_, idx) => idx !== i));

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

  const enemyNameCounts = useMemo(() => {
    if (!enemy) return {};
    const counts: Record<string, number> = {};
    const extEnemy = enemy as { composition?: Array<{ name?: string }>; count?: number; quantity?: number };
    (extEnemy.composition || []).forEach((m) => {
      const key = m?.name || '몬스터';
      counts[key] = (counts[key] || 0) + 1;
    });
    const base = enemy?.name || '몬스터';
    if (!counts[base]) counts[base] = extEnemy?.count || extEnemy?.quantity || 1;
    return counts;
  }, [enemy?.composition, enemy?.name, (enemy as { count?: number })?.count, (enemy as { quantity?: number })?.quantity, enemy]);

  const groupedEnemyMembers = useMemo(() => {
    if (!enemy) return [];
    type EnemyMember = { name?: string; emoji?: string; count?: number };
    const extEnemy = enemy as { composition?: EnemyMember[]; emoji?: string; count?: number; quantity?: number };
    const list: EnemyMember[] = extEnemy?.composition && extEnemy.composition.length > 0
      ? extEnemy.composition
      : [{ name: enemy?.name || '몬스터', emoji: extEnemy?.emoji || '👹', count: extEnemy?.count || extEnemy?.quantity || 1 }];

    const map = new Map<string, { name: string; emoji: string; count: number }>();
    list.forEach((m) => {
      const name = m?.name || '몬스터';
      const emoji = m?.emoji || '👹';
      const increment = m?.count || 1;
      if (!map.has(name)) {
        map.set(name, { name, emoji, count: increment });
      } else {
        const cur = map.get(name);
        if (cur) {
          map.set(name, { ...cur, count: cur.count + increment });
        }
      }
    });
    return Array.from(map.values());
  }, [enemy?.composition, enemy?.name, enemy?.emoji, enemy?.count, enemy?.quantity, enemy]);

  // 에테르 획득량 미리보기 (커스텀 훅으로 분리) - Hook은 조건부 return 전에 호출
  const previewEtherGain = useEtherPreview({
    playerTimeline,
    selected,
    orderedRelicList,
    playerComboUsageCount: player?.comboUsageCount || {}
  });

  // 적 조합 감지 (표시용) - Hook은 조건부 return 전에 호출
  const enemyCombo = useMemo(() => detectPokerCombo((enemyPlan?.actions || []) as unknown as ComboCard[]), [enemyPlan?.actions]);

  // 적 성향 힌트 추출 - Hook은 조건부 return 전에 호출
  const enemyHint = useMemo(() => {
    const hintLog = battle.log.find(line => line.includes('적 성향 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 성향 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [battle.log]);

  if (!enemy) return <div className="text-white p-4">로딩…</div>;

  const handDisabled = (c: any) => {
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
  const enemyWillOverdrivePlan = shouldEnemyOverdrive(enemyPlan.mode as unknown as AIMode | null, enemyPlan.actions as unknown as AICard[] | null, Number(enemy.etherPts), turnNumber);
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
          onSelect={handleBreachSelect}
          strengthBonus={player.strength || 0}
        />
      )}

      {/* 카드 보상 선택 모달 (승리 후) */}
      {cardReward && (
        <CardRewardModal
          rewardCards={(cardReward as any).cards}
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
        battleActions={actions as unknown as ItemSlotsBattleActions}
        player={battle.player}
        enemy={battle.enemy}
        enemyPlan={battle.enemyPlan as unknown as ItemSlotsEnemyPlan | null}
        battleRef={battleRef as unknown as React.MutableRefObject<ItemSlotsBattleRef | null>}
      />
      {/* 예상 피해량 - 오른쪽 고정 패널 */}
      <div className="expect-sidebar-fixed">
        <ExpectedDamagePreview
          player={player}
          enemy={enemy}
          fixedOrder={(fixedOrder || playerTimeline) as unknown as { [key: string]: unknown }[] | null}
          willOverdrive={willOverdrive}
          enemyMode={(enemyPlan.mode ?? null) as string}
          enemyActions={(enemyPlan.actions ?? []) as unknown as { [key: string]: unknown }[]}
          phase={battle.phase}
          log={log}
          qIndex={battle.qIndex}
          queue={battle.queue as unknown as { [key: string]: unknown }[] | null}
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
          simulatePreview={simulatePreview as unknown as (params: { player: ExpectedDamagePlayer; enemy: ExpectedDamageEnemy; fixedOrder: { [key: string]: unknown }[] | null; willOverdrive: boolean; enemyMode: string; enemyActions: { [key: string]: unknown }[]; turnNumber: number }) => SimulationResult}
        />
        {/* 배율 경로: 단계와 무관하게 항상 표시 */}
        {comboStepsLog.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.2)', color: '#e2e8f0', fontSize: '13px', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 800, marginBottom: '6px', color: '#fbbf24' }}>🧮 배율 경로</div>
            {comboStepsLog.map((step: any, idx: any) => (
              <div key={idx} style={{ color: '#cbd5e1' }}>{idx + 1}. {step}</div>
            ))}
          </div>
        )}
      </div>

      <TimelineDisplay
        player={player}
        enemy={enemy as unknown as TimelineEnemy}
        DEFAULT_PLAYER_MAX_SPEED={DEFAULT_PLAYER_MAX_SPEED}
        DEFAULT_ENEMY_MAX_SPEED={DEFAULT_ENEMY_MAX_SPEED}
        generateSpeedTicks={generateSpeedTicks}
        battle={battle as unknown as TimelineBattle}
        timelineProgress={timelineProgress}
        timelineIndicatorVisible={Boolean(timelineIndicatorVisible)}
        insightAnimLevel={insightAnimLevel}
        insightAnimPulseKey={insightAnimPulseKey}
        enemyOverdriveVisible={Boolean(enemyOverdriveVisible)}
        enemyOverdriveLabel={enemyOverdriveLabel}
        dulledLevel={dulledLevel}
        playerTimeline={playerTimeline}
        queue={queue as unknown as UITimelineAction[] | null}
        executingCardIndex={(executingCardIndex ?? null) as number}
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
              currentCombo={currentCombo as unknown as ComboInfo | null}
              battle={battle}
              currentDeflation={currentDeflation as unknown as UIDeflation | null}
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
            player={player as unknown as CentralPlayer}
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
              enemyCombo={enemyCombo as unknown as ComboInfo | null}
              battle={battle}
              insightReveal={insightReveal}
              enemyCurrentDeflation={enemyCurrentDeflation as unknown as UIDeflation | null}
              enemyEtherCalcPhase={(enemyEtherCalcPhase ?? null) as string}
              enemyTurnEtherAccumulated={enemyTurnEtherAccumulated}
              COMBO_MULTIPLIERS={COMBO_MULTIPLIERS}
            />
            {/* 다중 유닛: EnemyUnitsDisplay, 단일 적: EnemyHpBar */}
            {hasMultipleUnits ? (
              <EnemyUnitsDisplay
                units={enemyUnits as unknown as EnemyUnitUI[]}
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
                damageDistribution={battle.damageDistribution as unknown as Record<number, boolean>}
                totalDistributableDamage={battle.totalDistributableDamage}
                onUpdateDistribution={(unitId, isTargeted) => actions.updateDamageDistribution(unitId, isTargeted ? 1 : 0)}
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
        battle={battle as unknown as HandBattle}
        player={player}
        enemy={enemy}
        selected={selected as unknown as HandAreaCard[]}
        getSortedHand={getSortedHand}
        toggle={toggle}
        handDisabled={handDisabled}
        showCardTraitTooltip={showCardTraitTooltip}
        hideCardTraitTooltip={hideCardTraitTooltip}
        formatSpeedText={formatSpeedText}
        renderNameWithBadge={(card, defaultColor) => renderNameWithBadge(card, cardUpgrades, defaultColor)}
        fixedOrder={fixedOrder as unknown as HandAction[]}
        moveUp={moveUp}
        moveDown={moveDown}
        queue={queue as unknown as HandAction[]}
        usedCardIndices={usedCardIndices}
        disappearingCards={disappearingCards}
        hiddenCards={hiddenCards}
        disabledCardIndices={disabledCardIndices}
        isSimplified={isSimplified}
        deck={(battle.deck || []) as unknown as HandAreaCard[]}
        discardPile={(battle.discardPile || []) as unknown as HandAreaCard[]}
        enemyUnits={enemyUnits as unknown as HandUnit[]}
      />

      {showCharacterSheet && <CharacterSheet onClose={closeCharacterSheet} />}

      <BattleTooltips
        tooltipVisible={tooltipVisible}
        hoveredCard={hoveredCard as unknown as HoveredCard | null}
        battle={battle}
        hoveredEnemyAction={hoveredEnemyAction as unknown as HoveredEnemyAction | null}
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
