/**
 * @file useGameState.ts
 * @description 게임 전역 상태 및 맵 생성 시스템
 *
 * ## 맵 구조
 * - 15개 레이어, 7개 컬럼
 * - 레이어당 2-4개 노드
 * - 시작/보스 노드는 중앙 고정
 */

import { DEFAULT_STARTING_DECK } from '../components/battle/battleData';
import type { GameItem, PlayerEgo, LastBattleResult, CharacterBuild, ActiveBattle } from './slices/types';
import type { ActiveEvent, ActiveDungeon } from '../types';

/** 휴식 활성 상태 */
interface ActiveRest {
  nodeId: string;
}

/** 상점 활성 상태 */
interface ActiveShop {
  nodeId?: string;
  merchantType: string;
}

// ==================== 타입 정의 ====================

/** 던전 데이터 타입 */
interface DungeonNodeData {
  size: string;
  type: string;
}

/** 맵 노드 타입 (생성 과정에서 사용) */
interface MapNodeGenerated {
  id: string;
  layer: number;
  column: number;
  x: number;
  y: number;
  type: string;
  displayLabel: string;
  connections: string[];
  cleared?: boolean;
  selectable?: boolean;
  isStart?: boolean;
  dungeonData?: DungeonNodeData;
}

/** nearestByColumn 결과 타입 */
interface NearestResult {
  node: MapNodeGenerated;
  diff: number;
}

/** 맵 상태 타입 */
interface GeneratedMap {
  nodes: MapNodeGenerated[];
  currentNodeId: string;
}

const MAP_COLUMNS = 7;
const MAP_LAYERS = 15;
const MAP_MIN_NODES = 2;
const MAP_MAX_NODES = 4;
const MAP_WIDTH = 960;
const V_SPACING = 220;
const LAYER_TOP_OFFSET = 60;

const columnToX = (column: number): number => (MAP_WIDTH / (MAP_COLUMNS + 1)) * (column + 1);
const layerToY = (layerIdx: number): number => (MAP_LAYERS - 1 - layerIdx) * V_SPACING + LAYER_TOP_OFFSET;

const shuffle = <T>(list: T[]): T[] => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const nearestByColumn = (nodes: MapNodeGenerated[], column: number): MapNodeGenerated => {
  if (nodes.length === 0) {
    throw new Error('nearestByColumn: nodes array is empty');
  }
  const result = nodes.reduce((closest: NearestResult | null, node: MapNodeGenerated) => {
    const diff = Math.abs(node.column - column);
    if (!closest || diff < closest.diff) return { node, diff };
    return closest;
  }, null as NearestResult | null);
  return result!.node;
};

const generateLayerColumns = (layerIdx: number): number[] => {
  if (layerIdx === 0 || layerIdx === MAP_LAYERS - 1) return [Math.floor(MAP_COLUMNS / 2)];
  const count = randomInt(MAP_MIN_NODES, MAP_MAX_NODES);
  const options = shuffle(Array.from({ length: MAP_COLUMNS }, (_, i) => i));
  return options.slice(0, count).sort((a, b) => a - b);
};

const assignNodeTypes = (nodes: MapNodeGenerated[]): void => {
  const startNode = nodes.find((n: MapNodeGenerated) => n.layer === 0);
  const bossNode = nodes.find((n: MapNodeGenerated) => n.layer === MAP_LAYERS - 1);
  if (startNode) {
    startNode.type = "event";
    startNode.isStart = true;
  }
  if (bossNode) bossNode.type = "boss";

  // 휴식 노드 등장 구간 (구간 내 랜덤 층에서 등장)
  const REST_ZONES: [number, number][] = [[6, 8], [12, 13]]; // 중반, 보스 직전
  // 정예 노드 등장 구간
  const ELITE_ZONES: [number, number][] = [[3, 5], [9, 11]]; // 초중반, 후반

  // 휴식 노드 배치 (각 구간에서 랜덤 층 선택 후 1개씩)
  const restLayers: number[] = [];
  REST_ZONES.forEach(([minLayer, maxLayer]) => {
    const layer = randomInt(minLayer, maxLayer);
    restLayers.push(layer);
    const layerNodes = nodes.filter((n: MapNodeGenerated) => n.layer === layer);
    if (layerNodes.length > 0) {
      const restNode = layerNodes[Math.floor(Math.random() * layerNodes.length)];
      restNode.type = "rest";
    }
  });

  // 정예 노드 배치 (각 구간에서 랜덤 층 선택 후 1개씩)
  const eliteLayers: number[] = [];
  ELITE_ZONES.forEach(([minLayer, maxLayer]) => {
    const layer = randomInt(minLayer, maxLayer);
    eliteLayers.push(layer);
    const layerNodes = nodes.filter((n: MapNodeGenerated) => n.layer === layer && n.type !== "rest");
    if (layerNodes.length > 0) {
      const eliteNode = layerNodes[Math.floor(Math.random() * layerNodes.length)];
      eliteNode.type = "elite";
    }
  });

  const candidates = nodes.filter((n: MapNodeGenerated) =>
    n !== startNode && n !== bossNode && n.type !== "rest" && n.type !== "elite"
  );
  const shuffled = shuffle(candidates);
  const eventTarget = Math.max(1, Math.round(shuffled.length * 0.5));
  shuffled.slice(0, eventTarget).forEach((node: MapNodeGenerated) => {
    node.type = "event";
  });

  const remaining = shuffled.slice(eventTarget);
  // 비고정 휴식/정예도 낮은 확률로 등장 (이미 배치된 층 제외)
  remaining.forEach((node: MapNodeGenerated) => {
    // 이미 휴식/정예가 배치된 층에서는 중복 배치 방지
    const isRestLayer = restLayers.includes(node.layer);
    const isEliteLayer = eliteLayers.includes(node.layer);

    // 기본 pool: 전투, 상점, 던전
    const pool: string[] = ["battle", "battle", "battle", "shop", "dungeon"];

    // 고정 휴식 층이 아니면 비고정 휴식 추가
    if (!isRestLayer) {
      pool.push("rest");
    }
    // 고정 정예 층이 아니면 비고정 정예 추가
    if (!isEliteLayer) {
      pool.push("elite");
    }

    node.type = pool[Math.floor(Math.random() * pool.length)];
  });

  let dungeonCandidate = nodes.find((n: MapNodeGenerated) => n.type === "dungeon");
  if (!dungeonCandidate) {
    const selectPool = nodes.filter((n: MapNodeGenerated) => !n.isStart && n.type !== "boss");
    if (selectPool.length) {
      dungeonCandidate = selectPool[Math.floor(Math.random() * selectPool.length)];
      dungeonCandidate.type = "dungeon";
    }
  }

  nodes.forEach((node: MapNodeGenerated) => {
    if (node.type === "dungeon") {
      node.dungeonData = {
        size: ["3개의 방", "4개의 방", "5개의 방", "6개의 방", "중앙 복도 2개"][Math.floor(Math.random() * 5)],
        type: ["언데드가 가득", "기계 잔재", "원소 혼탁", "괴생명체", "시간왜곡"][Math.floor(Math.random() * 5)],
      };
    }
    node.displayLabel = node.isStart ? "Start" : node.type === "event" ? "?" : node.type.toUpperCase();
  });
};

const generateMap = (): GeneratedMap => {
  const layers: MapNodeGenerated[][] = [];
  for (let layer = 0; layer < MAP_LAYERS; layer += 1) {
    const columns = generateLayerColumns(layer);
    const nodes: MapNodeGenerated[] = columns.map((column: number, index: number) => ({
      id: `L${layer}-N${index}`,
      layer,
      column,
      x: columnToX(column),
      y: layerToY(layer),
      type: "battle",
      displayLabel: "BATTLE",
      connections: [] as string[],
    }));
    layers.push(nodes);
  }

  for (let layer = 0; layer < MAP_LAYERS - 1; layer += 1) {
    const current = layers[layer];
    const next = layers[layer + 1];
    current.forEach((node: MapNodeGenerated) => {
      let targets = next.filter((candidate: MapNodeGenerated) => Math.abs(candidate.column - node.column) <= 1);
      if (!targets.length) targets = [nearestByColumn(next, node.column)];
      node.connections = targets.map((target: MapNodeGenerated) => target.id);
    });
    next.forEach((node: MapNodeGenerated) => {
      const inbound = current.some((prev: MapNodeGenerated) => prev.connections.includes(node.id));
      if (!inbound) {
        const fallback = nearestByColumn(current, node.column);
        fallback.connections.push(node.id);
      }
    });
  }

  const flatNodes = layers.flat();
  assignNodeTypes(flatNodes);

  // 시작 노드(layer 0)는 cleared, layer 1은 selectable
  const startNode = flatNodes.find((node: MapNodeGenerated) => node.layer === 0);
  flatNodes.forEach((node: MapNodeGenerated) => {
    if (node === startNode) {
      node.cleared = true;
      node.selectable = true;
    } else if (node.layer === 1) {
      node.cleared = false;
      node.selectable = true;
    } else {
      node.cleared = false;
      node.selectable = false;
    }
  });

  // startNode는 이미 위에서 찾았으므로 재사용 (layer 0이 항상 존재함이 보장됨)
  return {
    nodes: flatNodes,
    currentNodeId: startNode?.id || flatNodes[0]?.id || 'L0-N0',
  };
};

export const createInitialState = () => {
  const initialRelics: string[] = []; // 초기 상징 없음

  // 상징 패시브 효과를 계산하기 위한 import (동적 import 대신 초기값 사용)
  // calculatePassiveEffects는 gameStore에서 사용되므로 여기서는 기본값만 설정
  return {
    map: generateMap(),
    mapRisk: 0, // 위험도는 0%부터 시작
    resources: { gold: 40, intel: 2, loot: 1, material: 1, etherPts: 0, memory: 0 },
    playerHp: 100,
    maxHp: 100, // 상징 효과는 gameStore의 addRelic/setRelics에서 적용됨
    playerStrength: 0,
    playerAgility: 0, // 민첩성 (카드 속도 감소)
    playerEnergyBonus: 0, // 활력 각성 등으로 인한 행동력 보너스
    playerMaxSpeedBonus: 0, // 열정 각성 등으로 인한 최대 속도 보너스
    extraSubSpecialSlots: 0, // 철저 각성 등으로 인한 보조특기 슬롯 보너스
    playerInsight: 0, // 통찰 (이벤트 선택지, 적 타임라인 정보)
    playerTraits: [] as string[], // 획득한 개성 목록
    playerEgos: [] as PlayerEgo[], // 레거시: 기존 자아 (새 시스템은 growth.identities 사용)
    growth: null, // 피라미드 성장 시스템 상태 (growthSlice에서 관리)
    cardUpgrades: {} as Record<string, string>, // 레거시: 카드 업그레이드(카드 ID -> 희귀도)
    cardGrowth: {} as Record<string, { rarity: string; growthCount: number; traits: string[] }>, // 카드 성장 상태
    storedTraits: [] as string[], // 전투 보상으로 획득한 특성 (특화에 사용 가능)
    relics: initialRelics,
    orderedRelics: initialRelics,
    items: [null, null, null] as (GameItem | null)[], // 아이템 슬롯 3개 (null = 빈 슬롯)
    itemBuffs: {} as Record<string, number>, // 아이템으로 인한 임시 스탯 버프 { strength: 2, agility: 3, insight: 1 }
    tempBuffs: [] as { stat: 'strength' | 'agility' | 'insight'; value: number; remainingNodes: number }[], // 노드 기반 임시 버프
    completedEvents: [] as string[], // 완료된 이벤트 ID 목록 (중복 방지)
    pendingNextEvent: null as string | null, // 다음에 등장할 연쇄 이벤트 ID (alparius 등)
    activeEvent: null as ActiveEvent | null,
    activeRest: null as ActiveRest | null,
    activeDungeon: null as ActiveDungeon | null,
    activeBattle: null as ActiveBattle | null,
    activeShop: null as ActiveShop | null,
    lastBattleResult: null as LastBattleResult | null,
    characterBuild: {
      mainSpecials: [] as string[],
      subSpecials: [] as string[],
      cards: [],
      traits: [] as string[],
      egos: [] as string[],
      ownedCards: [...DEFAULT_STARTING_DECK],  // 기본 시작 덱으로 초기화
    } as CharacterBuild,
  };
};
