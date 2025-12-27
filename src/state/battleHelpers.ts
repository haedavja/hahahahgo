/**
 * @file battleHelpers.ts
 * @description 전투 관련 헬퍼 함수
 *
 * ## 기능
 * - 전투 초기화
 * - 적 생성
 * - 손패 드로우
 * - 전투 시뮬레이션
 */

import { ENEMY_DECKS } from "../data/cards";
import { CARDS, getRandomEnemyGroupByNode, getEnemyGroupDetails } from "../components/battle/battleData";
import { drawHand, buildSpeedTimeline } from "../lib/speedQueue";
import { simulateBattle } from "../lib/battleResolver";
import {
  BATTLE_TYPES,
  BATTLE_REWARDS,
  BATTLE_LABEL,
  BATTLE_STATS,
  MAX_PLAYER_SELECTION,
  cloneNodes,
  createEventPayload,
} from "./gameStoreHelpers";
import type { MapNode, ActiveEvent, Resources, ResolverSimulationResult } from "../types";
import type { HandCard, InflatedCard, TimelineEntry } from "../lib/speedQueue";
import type { MapState, CharacterBuild, BattleRewards, EnemyInfo } from "./slices/types";

// ==================== 타입 정의 ====================

/** 전투 노드 확장 타입 */
interface BattleNode extends Omit<MapNode, 'type'> {
  type: string; // 런타임에서 'battle', 'elite', 'boss', 'dungeon' 등 다양한 값
  displayLabel?: string;
  isStart?: boolean;
  eventKey?: string;
}

/** 전투 프리뷰 */
export interface BattlePreviewPayload {
  playerHand: HandCard[];
  enemyHand: HandCard[];
  timeline: TimelineEntry[];
  tuLimit: number;
}

/** 전투 페이로드 */
export interface BattlePayload {
  nodeId: string;
  kind: string;
  label: string;
  enemyCount: number;
  totalEnemyHp: number;
  mixedEnemies: EnemyInfo[];
  rewards: BattleRewards;
  difficulty: number;
  playerLibrary: string[];
  playerDrawPile: string[];
  playerDiscardPile: string[];
  enemyLibrary: string[];
  enemyDrawPile: string[];
  enemyDiscardPile: string[];
  playerHand: HandCard[];
  enemyHand: HandCard[];
  selectedCardIds: string[];
  maxSelection: number;
  preview: BattlePreviewPayload;
  simulation: ResolverSimulationResult;
  hasCharacterBuild: boolean;
  characterBuild: CharacterBuild | null;
}

/** travelToNode 결과 */
export interface TravelResult {
  map: MapState;
  event: ActiveEvent | null;
  battle: BattlePayload | null;
  target: BattleNode;
  usedPendingEvent: boolean;
}

/** 게임 상태 (일부) */
interface PartialGameState {
  map: MapState;
  characterBuild?: CharacterBuild | null;
  playerHp?: number;
  maxHp?: number;
  mapRisk?: number;
  completedEvents?: string[];
  pendingNextEvent?: string | null;
}

// 전투에서 사용되는 카드 8종의 ID 배열
export const BATTLE_CARDS: string[] = CARDS.slice(0, 8).map(card => card.id);

export const resolveEnemyDeck = (kind: string): string[] =>
  (ENEMY_DECKS as Record<string, string[]>)[kind] ?? ENEMY_DECKS.default ?? [];

export const computeBattlePlan = (
  kind: string,
  playerCards: HandCard[],
  enemyCards: HandCard[],
  currentPlayerHp: number | null = null,
  currentMaxHp: number | null = null,
  enemyCount: number = 1
): { preview: BattlePreviewPayload; simulation: ResolverSimulationResult; enemyCount: number } => {
  const timeline = buildSpeedTimeline(playerCards, enemyCards, 30);
  type BattleStatsType = typeof BATTLE_STATS.default;
  const baseStats: BattleStatsType = (BATTLE_STATS as Record<string, BattleStatsType>)[kind] ?? BATTLE_STATS.default;
  const battleStats = currentPlayerHp !== null
    ? {
        ...baseStats,
        player: {
          ...baseStats.player,
          hp: currentPlayerHp,
          maxHp: currentMaxHp ?? currentPlayerHp
        }
      }
    : baseStats;

  const scaledEnemyHp = Math.max(1, Math.round((battleStats.enemy?.hp ?? 40) * enemyCount));
  const scaledEnemy = {
    ...battleStats.enemy,
    hp: scaledEnemyHp,
    maxHp: scaledEnemyHp,
    enemyCount,
  };
  const finalStats = {
    ...battleStats,
    enemy: scaledEnemy,
  };

  return {
    preview: {
      playerHand: playerCards,
      enemyHand: enemyCards,
      timeline,
      tuLimit: 30,
    },
    simulation: simulateBattle(timeline as unknown as Parameters<typeof simulateBattle>[0], finalStats),
    enemyCount,
  };
};

export const drawCharacterBuildHand = (
  mainSpecials: string[],
  subSpecials: string[],
  ownedCards: string[] = []
): HandCard[] => {
  // 1. 주특기 카드는 100% 등장
  const mainCards = mainSpecials.map((cardId) => cardId);
  // 2. 보조특기 카드는 각각 50% 확률로 등장
  const subCards = subSpecials.filter(() => Math.random() < 0.5);
  // 3. 나머지 보유 카드 (주특기/보조특기 제외) 각각 10% 확률로 등장
  const usedCardIds = new Set([...mainSpecials, ...subSpecials]);
  const otherCards = ownedCards
    .filter((cardId: string) => !usedCardIds.has(cardId))
    .filter(() => Math.random() < 0.1);

  const cardIds = [...mainCards, ...subCards, ...otherCards];
  return drawHand(cardIds, cardIds.length);
};

export const createBattlePayload = (
  node: BattleNode | null,
  characterBuild: CharacterBuild | null,
  playerHp: number | null = null,
  maxHp: number | null = null
): BattlePayload | null => {
  if (!node || !BATTLE_TYPES.has(node.type) || node.isStart) return null;

  const hasCharacterBuild = !!characterBuild && ((characterBuild.mainSpecials?.length ?? 0) > 0 || (characterBuild.subSpecials?.length ?? 0) > 0 || (characterBuild.ownedCards?.length ?? 0) > 0);

  const playerLibrary = hasCharacterBuild
    ? [...characterBuild.mainSpecials, ...characterBuild.subSpecials]
    : [...BATTLE_CARDS];

  // 노드 레이어 번호를 기반으로 적 그룹 선택
  const nodeNumber = node.layer ?? 1;
  let enemyGroup;

  if (node.type === 'boss') {
    enemyGroup = getEnemyGroupDetails('slaughterer_solo');
  } else if (node.type === 'elite') {
    const eliteGroups = ['deserter_solo', 'deserter_marauders'];
    const randomId = eliteGroups[Math.floor(Math.random() * eliteGroups.length)];
    enemyGroup = getEnemyGroupDetails(randomId);
  } else {
    const group = getRandomEnemyGroupByNode(nodeNumber);
    enemyGroup = getEnemyGroupDetails(group.id);
  }

  const enemies = enemyGroup?.enemies || [];
  const enemyCount = enemies.length || 1;

  const enemyLibrary: string[] = [];
  enemies.forEach((enemy: { deck?: string[] }) => {
    if (enemy?.deck) {
      enemyLibrary.push(...enemy.deck);
    }
  });

  if (enemyLibrary.length === 0) {
    const baseEnemyDeck = resolveEnemyDeck(node.type);
    enemyLibrary.push(...baseEnemyDeck);
  }

  const playerDrawPile = hasCharacterBuild ? [] : [...playerLibrary];
  const enemyDrawPile = [...enemyLibrary];

  const playerHand = hasCharacterBuild
    ? drawCharacterBuildHand(characterBuild.mainSpecials, characterBuild.subSpecials, characterBuild.ownedCards)
    : drawHand(playerDrawPile, 3);

  const enemyHandSize = Math.max(enemyCount, Math.min(enemyDrawPile.length, 3 * enemyCount));
  const enemyHand = drawHand(enemyDrawPile, enemyHandSize);
  const { preview, simulation } = computeBattlePlan(node.type, playerHand, enemyHand, playerHp, maxHp, enemyCount);

  const totalEnemyHp = enemies.reduce((sum, e) => sum + (e?.hp || 40), 0);

  const mixedEnemies = enemies.map(e => ({
    id: e?.id,
    name: e?.name || '적',
    emoji: e?.emoji || '👾',
    hp: e?.hp || 40,
    maxHp: e?.hp || 40,
    ether: e?.ether || 100,
    deck: e?.deck || [],
    cardsPerTurn: e?.cardsPerTurn || 2,
    passives: e?.passives || {},
    tier: e?.tier || 1,
    isBoss: e?.isBoss || false,
  }));

  return {
    nodeId: node.id,
    kind: node.type,
    label: enemyGroup?.name || node.displayLabel || (BATTLE_LABEL as Record<string, string>)[node.type] || node.type.toUpperCase(),
    enemyCount,
    totalEnemyHp,
    mixedEnemies,
    rewards: (BATTLE_REWARDS as unknown as Record<string, BattleRewards>)[node.type] ?? {},
    difficulty: node.type === "boss" ? 5 : node.type === "elite" ? 4 : node.type === "dungeon" ? 3 : 2,
    playerLibrary,
    playerDrawPile,
    playerDiscardPile: [],
    enemyLibrary,
    enemyDrawPile,
    enemyDiscardPile: [],
    playerHand,
    enemyHand,
    selectedCardIds: [],
    maxSelection: MAX_PLAYER_SELECTION,
    preview,
    simulation,
    hasCharacterBuild,
    characterBuild: hasCharacterBuild ? characterBuild : null,
  };
};

export const travelToNode = (state: PartialGameState, nodeId: string): TravelResult | null => {
  const nodes = cloneNodes(state.map.nodes) as BattleNode[];
  const target = nodes.find((n) => n.id === nodeId);
  if (!target || !target.selectable || target.cleared) return null;

  nodes.forEach((node) => {
    if (!node.cleared) node.selectable = false;
  });
  target.cleared = true;
  target.connections.forEach((id: string) => {
    const nextNode = nodes.find((n) => n.id === id);
    if (nextNode && !nextNode.cleared) nextNode.selectable = true;
  });

  const { payload: event, usedPendingEvent } = createEventPayload(
    target as unknown as MapNode & { eventKey?: string; isStart?: boolean },
    state.mapRisk ?? 0,
    state.completedEvents || [],
    state.pendingNextEvent ?? null
  );

  return {
    map: { ...state.map, nodes: nodes as unknown as MapNode[], currentNodeId: target.id },
    event,
    battle: createBattlePayload(target, state.characterBuild ?? null, state.playerHp ?? null, state.maxHp ?? null),
    target,
    usedPendingEvent,
  };
};
