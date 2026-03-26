/**
 * @file path-optimizer.ts
 * @description 경로 최적화 AI - 맵 노드 선택 최적화
 *
 * ## 기능
 * - 다음 노드 선택 최적화
 * - 경로 위험도/보상 분석
 * - 전략 기반 경로 선택
 * - 장기 경로 계획 (여러 노드 앞을 봄)
 */

import type { MapNode, MapNodeType, MapState } from '../game/map-simulator';
import type { RunStrategy, PlayerRunState } from '../game/run-simulator';
import type { GameStateAnalysis } from './dynamic-strategy';

// ==================== 타입 정의 ====================

export interface NodeEvaluation {
  nodeId: string;
  nodeType: MapNodeType;
  /** 즉각 보상 점수 (0-100) */
  rewardScore: number;
  /** 위험도 점수 (0-100) */
  riskScore: number;
  /** 전략 적합도 (0-100) */
  strategyFit: number;
  /** 장기 가치 점수 (0-100) */
  longTermValue: number;
  /** 종합 점수 */
  totalScore: number;
  /** 평가 이유 */
  reasons: string[];
}

export interface PathPlan {
  /** 추천 경로 (노드 ID 배열) */
  path: string[];
  /** 경로 총 점수 */
  totalScore: number;
  /** 예상 전투 수 */
  expectedBattles: number;
  /** 예상 휴식 기회 */
  expectedRests: number;
  /** 예상 상점 방문 */
  expectedShops: number;
  /** 위험도 등급 */
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  /** 경로 설명 */
  description: string;
}

export interface PathOptimizerConfig {
  /** 보상 가중치 (0-1) */
  rewardWeight: number;
  /** 위험 회피 가중치 (0-1) */
  riskAversionWeight: number;
  /** 전략 적합도 가중치 (0-1) */
  strategyFitWeight: number;
  /** 장기 계획 가중치 (0-1) */
  longTermWeight: number;
  /** 탐색 깊이 (몇 노드 앞까지 볼지) */
  lookAheadDepth: number;
}

// ==================== 상수 ====================

const DEFAULT_CONFIG: PathOptimizerConfig = {
  rewardWeight: 0.3,
  riskAversionWeight: 0.25,
  strategyFitWeight: 0.25,
  longTermWeight: 0.2,
  lookAheadDepth: 3,
};

// 노드 타입별 기본 보상/위험 점수
const NODE_BASE_SCORES: Record<MapNodeType, { reward: number; risk: number }> = {
  combat: { reward: 40, risk: 30 },
  elite: { reward: 70, risk: 60 },
  boss: { reward: 100, risk: 80 },
  event: { reward: 35, risk: 20 },
  shop: { reward: 30, risk: 0 },
  rest: { reward: 50, risk: 0 },
  dungeon: { reward: 55, risk: 45 },
  unknown: { reward: 40, risk: 35 },
  start: { reward: 0, risk: 0 },
};

// 전략별 노드 선호도
const STRATEGY_NODE_PREFERENCES: Record<RunStrategy, Partial<Record<MapNodeType, number>>> = {
  aggressive: {
    combat: 1.3,
    elite: 1.4,
    event: 0.8,
    shop: 0.7,
    rest: 0.6,
  },
  defensive: {
    combat: 0.8,
    elite: 0.5,
    event: 1.0,
    shop: 1.2,
    rest: 1.5,
  },
  balanced: {
    combat: 1.0,
    elite: 0.9,
    event: 1.1,
    shop: 1.0,
    rest: 1.0,
  },
  speedrun: {
    combat: 1.2,
    elite: 1.0,
    event: 0.6,
    shop: 0.5,
    rest: 0.4,
  },
  treasure_hunter: {
    combat: 0.9,
    elite: 1.1,
    event: 1.3,
    shop: 1.2,
    rest: 0.8,
    dungeon: 1.5,
  },
};

// ==================== 경로 최적화 클래스 ====================

export class PathOptimizer {
  private config: PathOptimizerConfig;

  constructor(config: Partial<PathOptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<PathOptimizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 단일 노드 평가
   */
  evaluateNode(
    node: MapNode,
    playerState: GameStateAnalysis,
    strategy: RunStrategy
  ): NodeEvaluation {
    const reasons: string[] = [];
    const baseScores = NODE_BASE_SCORES[node.type] || { reward: 30, risk: 30 };

    // 1. 보상 점수 계산
    let rewardScore = baseScores.reward;

    // 난이도에 따른 보상 조정
    if (node.difficulty) {
      rewardScore += node.difficulty * 5;
    }

    // 엘리트/보스는 상징 드롭 가능성
    if (node.type === 'elite' || node.type === 'boss') {
      if (playerState.relicCount < 3) {
        rewardScore += 15;
        reasons.push('상징 획득 기회');
      }
    }

    // 상점: 골드가 많으면 가치 상승
    if (node.type === 'shop' && playerState.goldStatus === 'rich') {
      rewardScore += 20;
      reasons.push('골드 풍부: 상점 가치↑');
    }

    // 2. 위험도 점수 계산
    let riskScore = baseScores.risk;

    // HP 상태에 따른 위험도 조정
    if (playerState.hpStatus === 'critical') {
      riskScore *= 1.5;
      reasons.push('HP 위급: 위험도↑');
    } else if (playerState.hpStatus === 'low') {
      riskScore *= 1.2;
    } else if (playerState.hpStatus === 'full') {
      riskScore *= 0.8;
      reasons.push('HP 충분: 위험도↓');
    }

    // 난이도에 따른 위험도 조정
    if (node.difficulty) {
      riskScore += node.difficulty * 8;
    }

    // 3. 전략 적합도 계산
    const strategyMod = STRATEGY_NODE_PREFERENCES[strategy][node.type] || 1.0;
    const strategyFit = 50 * strategyMod;
    if (strategyMod > 1.0) {
      reasons.push(`${strategy} 전략 선호`);
    }

    // 4. 장기 가치 계산
    let longTermValue = 50;

    // 휴식 노드: HP 낮으면 장기 가치 높음
    if (node.type === 'rest' && playerState.hpRatio < 0.5) {
      longTermValue = 80;
      reasons.push('HP 회복 필요');
    }

    // 상점: 덱 빌딩 필요하면 가치 높음
    if (node.type === 'shop' && playerState.deckStatus === 'too_small') {
      longTermValue = 75;
      reasons.push('덱 빌딩 필요');
    }

    // 이벤트: 다양한 보상 가능성
    if (node.type === 'event') {
      longTermValue = 60;
    }

    // 진행도에 따른 조정
    if (playerState.progressRatio > 0.7) {
      // 후반부: 전투로 강해지는 것이 중요
      if (node.type === 'combat' || node.type === 'elite') {
        longTermValue += 10;
      }
    }

    // 5. 종합 점수 계산
    const totalScore =
      rewardScore * this.config.rewardWeight +
      (100 - riskScore) * this.config.riskAversionWeight +
      strategyFit * this.config.strategyFitWeight +
      longTermValue * this.config.longTermWeight;

    return {
      nodeId: node.id,
      nodeType: node.type,
      rewardScore,
      riskScore,
      strategyFit,
      longTermValue,
      totalScore,
      reasons,
    };
  }

  /**
   * 다음 노드 선택 (가장 좋은 하나)
   */
  selectNextNode(
    currentNode: MapNode,
    map: MapState,
    playerState: GameStateAnalysis,
    strategy: RunStrategy
  ): { nodeId: string | null; evaluation: NodeEvaluation | null; reasoning: string[] } {
    const reasoning: string[] = [];

    // 연결된 다음 레이어 노드 찾기
    const nextLayerNodes = currentNode.connections
      .map(id => map.nodes.find(n => n.id === id))
      .filter((n): n is MapNode => n !== undefined && n.layer > currentNode.layer);

    if (nextLayerNodes.length === 0) {
      // 다음 레이어에 노드가 없으면 같은 레이어에서 미방문 노드
      const sameLayerNodes = currentNode.connections
        .map(id => map.nodes.find(n => n.id === id))
        .filter((n): n is MapNode => n !== undefined && !n.cleared);

      if (sameLayerNodes.length === 0) {
        reasoning.push('이동 가능한 노드 없음');
        return { nodeId: null, evaluation: null, reasoning };
      }

      // 같은 레이어 노드 평가
      const evaluations = sameLayerNodes.map(node =>
        this.evaluateNode(node, playerState, strategy)
      );
      evaluations.sort((a, b) => b.totalScore - a.totalScore);

      const best = evaluations[0];
      reasoning.push(...best.reasons);
      reasoning.push(`선택: ${best.nodeType} (점수: ${best.totalScore.toFixed(1)})`);

      return { nodeId: best.nodeId, evaluation: best, reasoning };
    }

    // 각 노드 평가
    const evaluations = nextLayerNodes.map(node =>
      this.evaluateNode(node, playerState, strategy)
    );

    // 장기 계획 고려 (lookAhead)
    if (this.config.lookAheadDepth > 1) {
      for (const evaluation of evaluations) {
        const node = nextLayerNodes.find(n => n.id === evaluation.nodeId);
        if (node) {
          const futureValue = this.calculateFutureValue(
            node,
            map,
            playerState,
            strategy,
            this.config.lookAheadDepth - 1
          );
          evaluation.totalScore += futureValue * 0.3; // 미래 가치 30% 반영
        }
      }
    }

    // 최고 점수 노드 선택
    evaluations.sort((a, b) => b.totalScore - a.totalScore);
    const best = evaluations[0];

    reasoning.push(...best.reasons);
    reasoning.push(`선택: ${best.nodeType} (점수: ${best.totalScore.toFixed(1)})`);

    // 대안이 있으면 표시
    if (evaluations.length > 1) {
      const second = evaluations[1];
      reasoning.push(`대안: ${second.nodeType} (점수: ${second.totalScore.toFixed(1)})`);
    }

    return { nodeId: best.nodeId, evaluation: best, reasoning };
  }

  /**
   * 미래 가치 계산 (재귀적 탐색)
   */
  private calculateFutureValue(
    node: MapNode,
    map: MapState,
    playerState: GameStateAnalysis,
    strategy: RunStrategy,
    depth: number
  ): number {
    if (depth <= 0) return 0;

    const nextNodes = node.connections
      .map(id => map.nodes.find(n => n.id === id))
      .filter((n): n is MapNode => n !== undefined && n.layer > node.layer);

    if (nextNodes.length === 0) return 0;

    // 각 후속 노드의 가치 계산
    const values = nextNodes.map(n => {
      const eval_ = this.evaluateNode(n, playerState, strategy);
      const futureValue = this.calculateFutureValue(n, map, playerState, strategy, depth - 1);
      return eval_.totalScore + futureValue * 0.5;
    });

    // 최대값 반환 (최적 경로 가정)
    return Math.max(...values);
  }

  /**
   * 전체 경로 계획
   */
  planPath(
    startNode: MapNode,
    map: MapState,
    playerState: GameStateAnalysis,
    strategy: RunStrategy,
    maxNodes: number = 5
  ): PathPlan {
    const path: string[] = [startNode.id];
    let currentNode = startNode;
    let totalScore = 0;
    let expectedBattles = 0;
    let expectedRests = 0;
    let expectedShops = 0;
    let totalRisk = 0;

    for (let i = 0; i < maxNodes; i++) {
      const result = this.selectNextNode(currentNode, map, playerState, strategy);

      if (!result.nodeId) break;

      path.push(result.nodeId);

      if (result.evaluation) {
        totalScore += result.evaluation.totalScore;
        totalRisk += result.evaluation.riskScore;

        const nodeType = result.evaluation.nodeType;
        if (nodeType === 'combat' || nodeType === 'elite' || nodeType === 'boss') {
          expectedBattles++;
        } else if (nodeType === 'rest') {
          expectedRests++;
        } else if (nodeType === 'shop') {
          expectedShops++;
        }
      }

      // 다음 노드로 이동
      const nextNode = map.nodes.find(n => n.id === result.nodeId);
      if (!nextNode) break;
      currentNode = nextNode;
    }

    // 위험도 등급 결정
    const avgRisk = totalRisk / Math.max(1, path.length - 1);
    let riskLevel: PathPlan['riskLevel'] = 'low';
    if (avgRisk >= 60) riskLevel = 'very_high';
    else if (avgRisk >= 45) riskLevel = 'high';
    else if (avgRisk >= 25) riskLevel = 'medium';

    // 경로 설명 생성
    const description = this.generatePathDescription(
      path.length - 1,
      expectedBattles,
      expectedRests,
      expectedShops,
      riskLevel
    );

    return {
      path,
      totalScore,
      expectedBattles,
      expectedRests,
      expectedShops,
      riskLevel,
      description,
    };
  }

  /**
   * 경로 설명 생성
   */
  private generatePathDescription(
    nodeCount: number,
    battles: number,
    rests: number,
    shops: number,
    riskLevel: PathPlan['riskLevel']
  ): string {
    const parts: string[] = [];

    parts.push(`${nodeCount}개 노드 경로`);

    if (battles > 0) parts.push(`전투 ${battles}회`);
    if (rests > 0) parts.push(`휴식 ${rests}회`);
    if (shops > 0) parts.push(`상점 ${shops}회`);

    const riskLabels = {
      low: '안전',
      medium: '보통',
      high: '위험',
      very_high: '매우 위험',
    };
    parts.push(`(${riskLabels[riskLevel]})`);

    return parts.join(', ');
  }

  /**
   * 위기 상황에서의 경로 추천
   */
  findSafestPath(
    currentNode: MapNode,
    map: MapState,
    targetLayers: number = 3
  ): { path: string[]; hasRest: boolean; hasShop: boolean } {
    const path: string[] = [currentNode.id];
    let node = currentNode;
    let hasRest = false;
    let hasShop = false;

    for (let i = 0; i < targetLayers; i++) {
      const nextNodes = node.connections
        .map(id => map.nodes.find(n => n.id === id))
        .filter((n): n is MapNode => n !== undefined && n.layer > node.layer);

      if (nextNodes.length === 0) break;

      // 가장 안전한 노드 선택 (휴식 > 상점 > 이벤트 > 일반전투)
      const safePriority: MapNodeType[] = ['rest', 'shop', 'event', 'combat', 'dungeon', 'elite', 'boss'];

      let safestNode: MapNode | null = null;
      let bestPriority = safePriority.length;

      for (const n of nextNodes) {
        const priority = safePriority.indexOf(n.type);
        if (priority !== -1 && priority < bestPriority) {
          bestPriority = priority;
          safestNode = n;
        }
      }

      if (!safestNode) safestNode = nextNodes[0];

      path.push(safestNode.id);

      if (safestNode.type === 'rest') hasRest = true;
      if (safestNode.type === 'shop') hasShop = true;

      node = safestNode;
    }

    return { path, hasRest, hasShop };
  }
}

// ==================== 팩토리 함수 ====================

export function createPathOptimizer(
  config?: Partial<PathOptimizerConfig>
): PathOptimizer {
  return new PathOptimizer(config);
}

/**
 * 빠른 노드 선택 (간단한 상황용)
 */
export function quickNodeSelect(
  availableNodes: MapNode[],
  hpRatio: number,
  strategy: RunStrategy
): MapNode | null {
  if (availableNodes.length === 0) return null;

  // HP 위급하면 휴식/상점 우선
  if (hpRatio < 0.3) {
    const rest = availableNodes.find(n => n.type === 'rest');
    if (rest) return rest;
    const shop = availableNodes.find(n => n.type === 'shop');
    if (shop) return shop;
  }

  // 전략별 우선순위
  const priorities: MapNodeType[] =
    strategy === 'aggressive'
      ? ['elite', 'combat', 'event', 'shop', 'rest']
      : strategy === 'defensive'
        ? ['rest', 'shop', 'event', 'combat', 'elite']
        : ['combat', 'event', 'shop', 'rest', 'elite'];

  for (const type of priorities) {
    const node = availableNodes.find(n => n.type === type);
    if (node) return node;
  }

  return availableNodes[0];
}
