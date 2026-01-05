/**
 * @file rest-simulator.ts
 * @description 휴식 노드 시뮬레이터
 *
 * ## 기능
 * - 휴식/야영 노드 행동 시뮬레이션
 * - 체력 회복, 카드 업그레이드, 상징 획득 등
 * - 최적 선택 분석
 */

import { getLogger } from '../core/logger';
import { getGlobalRandom } from '../core/seeded-random';

const log = getLogger('RestSimulator');

// ==================== 타입 정의 ====================

export type RestActionType = 'heal' | 'upgrade' | 'remove' | 'smith' | 'meditate' | 'scout';

export interface RestAction {
  id: RestActionType;
  name: string;
  description: string;
  available: boolean;
  requirements?: Record<string, number>;
  cost?: Record<string, number>;
}

export interface RestNodeConfig {
  healAmount: number; // 회복량 (비율, 0.3 = 30%)
  canUpgrade: boolean;
  canRemove: boolean;
  canSmith: boolean; // 대장장이 (상징 관련)
  canMeditate: boolean; // 명상 (스탯 증가)
  canScout: boolean; // 정찰 (다음 노드 정보)
}

export interface PlayerRestState {
  hp: number;
  maxHp: number;
  deck: string[];
  relics: string[];
  gold: number;
  strength: number;
  agility: number;
  insight: number;
}

export interface RestSimulationConfig {
  player: PlayerRestState;
  nodeConfig: RestNodeConfig;
  strategy: 'heal_priority' | 'upgrade_priority' | 'balanced';
}

export interface RestResult {
  actionTaken: RestActionType;
  hpChange: number;
  cardUpgraded?: string;
  cardRemoved?: string;
  statChanges?: Record<string, number>;
  finalPlayerState: PlayerRestState;
  reason: string;
}

export interface RestAnalysis {
  availableActions: RestAction[];
  recommendedAction: RestActionType;
  healValue: number;
  upgradeValue: number;
  reason: string;
}

// ==================== 상수 ====================

const DEFAULT_REST_CONFIG: RestNodeConfig = {
  healAmount: 0.3, // 30% 회복
  canUpgrade: true,
  canRemove: true,
  canSmith: false,
  canMeditate: false,
  canScout: false,
};

const REST_ACTIONS: Record<RestActionType, { name: string; description: string }> = {
  heal: { name: '휴식', description: '체력을 회복합니다' },
  upgrade: { name: '단련', description: '카드를 강화합니다' },
  remove: { name: '정리', description: '카드를 제거합니다' },
  smith: { name: '대장장이', description: '상징을 강화합니다' },
  meditate: { name: '명상', description: '스탯을 증가시킵니다' },
  scout: { name: '정찰', description: '다음 노드 정보를 얻습니다' },
};

// ==================== 휴식 시뮬레이터 ====================

export class RestSimulator {
  constructor() {
    log.info('RestSimulator initialized');
  }

  // ==================== 행동 가능 여부 ====================

  /**
   * 가능한 행동 목록 가져오기
   */
  getAvailableActions(
    player: PlayerRestState,
    nodeConfig: RestNodeConfig
  ): RestAction[] {
    const actions: RestAction[] = [];

    // 휴식 (항상 가능)
    actions.push({
      id: 'heal',
      name: REST_ACTIONS.heal.name,
      description: REST_ACTIONS.heal.description,
      available: player.hp < player.maxHp,
    });

    // 단련 (카드 업그레이드)
    if (nodeConfig.canUpgrade) {
      actions.push({
        id: 'upgrade',
        name: REST_ACTIONS.upgrade.name,
        description: REST_ACTIONS.upgrade.description,
        available: player.deck.length > 0,
      });
    }

    // 정리 (카드 제거)
    if (nodeConfig.canRemove) {
      actions.push({
        id: 'remove',
        name: REST_ACTIONS.remove.name,
        description: REST_ACTIONS.remove.description,
        available: player.deck.length > 5, // 최소 5장 유지
        cost: { gold: 50 },
      });
    }

    // 대장장이
    if (nodeConfig.canSmith) {
      actions.push({
        id: 'smith',
        name: REST_ACTIONS.smith.name,
        description: REST_ACTIONS.smith.description,
        available: player.relics.length > 0,
        cost: { gold: 100 },
      });
    }

    // 명상
    if (nodeConfig.canMeditate) {
      actions.push({
        id: 'meditate',
        name: REST_ACTIONS.meditate.name,
        description: REST_ACTIONS.meditate.description,
        available: true,
      });
    }

    // 정찰
    if (nodeConfig.canScout) {
      actions.push({
        id: 'scout',
        name: REST_ACTIONS.scout.name,
        description: REST_ACTIONS.scout.description,
        available: true,
      });
    }

    return actions;
  }

  // ==================== 시뮬레이션 ====================

  /**
   * 휴식 노드 시뮬레이션
   */
  simulateRest(config: RestSimulationConfig): RestResult {
    const player = { ...config.player };
    const nodeConfig = { ...DEFAULT_REST_CONFIG, ...config.nodeConfig };

    const actions = this.getAvailableActions(player, nodeConfig);
    const selectedAction = this.selectAction(actions, player, config.strategy);

    return this.executeAction(selectedAction, player, nodeConfig);
  }

  /**
   * 전략에 따른 행동 선택
   */
  private selectAction(
    actions: RestAction[],
    player: PlayerRestState,
    strategy: 'heal_priority' | 'upgrade_priority' | 'balanced'
  ): RestActionType {
    const availableActions = actions.filter(a => a.available);

    if (availableActions.length === 0) {
      return 'heal'; // 기본값
    }

    const hpRatio = player.hp / player.maxHp;

    switch (strategy) {
      case 'heal_priority':
        // 체력 50% 미만이면 무조건 힐
        if (hpRatio < 0.5 && availableActions.some(a => a.id === 'heal')) {
          return 'heal';
        }
        // 아니면 업그레이드
        if (availableActions.some(a => a.id === 'upgrade')) {
          return 'upgrade';
        }
        return 'heal';

      case 'upgrade_priority':
        // 체력 30% 미만이면 힐
        if (hpRatio < 0.3 && availableActions.some(a => a.id === 'heal')) {
          return 'heal';
        }
        // 아니면 업그레이드
        if (availableActions.some(a => a.id === 'upgrade')) {
          return 'upgrade';
        }
        return 'heal';

      case 'balanced':
      default:
        // 체력 70% 이상이면 업그레이드, 아니면 힐
        if (hpRatio >= 0.7 && availableActions.some(a => a.id === 'upgrade')) {
          return 'upgrade';
        }
        if (hpRatio >= 0.5 && availableActions.some(a => a.id === 'meditate')) {
          return 'meditate';
        }
        return 'heal';
    }
  }

  /**
   * 행동 실행
   */
  private executeAction(
    actionId: RestActionType,
    player: PlayerRestState,
    nodeConfig: RestNodeConfig
  ): RestResult {
    const result: RestResult = {
      actionTaken: actionId,
      hpChange: 0,
      finalPlayerState: player,
      reason: '',
    };

    switch (actionId) {
      case 'heal':
        const healAmount = Math.floor(player.maxHp * nodeConfig.healAmount);
        const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
        player.hp += actualHeal;
        result.hpChange = actualHeal;
        result.reason = `체력 ${actualHeal} 회복`;
        break;

      case 'upgrade':
        if (player.deck.length > 0) {
          // 랜덤 카드 업그레이드 (시뮬레이션용)
          const cardIndex = getGlobalRandom().nextInt(0, player.deck.length - 1);
          const cardId = player.deck[cardIndex];
          // 업그레이드된 카드 ID로 변경 (실제로는 + 접미사 등)
          player.deck[cardIndex] = cardId.endsWith('+') ? cardId : cardId + '+';
          result.cardUpgraded = cardId;
          result.reason = `카드 '${cardId}' 강화`;
        }
        break;

      case 'remove':
        if (player.deck.length > 5 && player.gold >= 50) {
          player.gold -= 50;
          const cardIndex = getGlobalRandom().nextInt(0, player.deck.length - 1);
          const removedCard = player.deck.splice(cardIndex, 1)[0];
          result.cardRemoved = removedCard;
          result.reason = `카드 '${removedCard}' 제거`;
        }
        break;

      case 'smith':
        if (player.relics.length > 0 && player.gold >= 100) {
          player.gold -= 100;
          result.reason = '상징 강화';
        }
        break;

      case 'meditate':
        // 랜덤 스탯 +1
        const stats: ('strength' | 'agility' | 'insight')[] = ['strength', 'agility', 'insight'];
        const randomStat = getGlobalRandom().pick(stats);
        player[randomStat] += 1;
        result.statChanges = { [randomStat]: 1 };
        result.reason = `${randomStat} +1`;
        break;

      case 'scout':
        result.reason = '다음 노드 정보 획득';
        break;
    }

    result.finalPlayerState = player;
    return result;
  }

  // ==================== 분석 ====================

  /**
   * 휴식 노드 분석
   */
  analyzeRestNode(
    player: PlayerRestState,
    nodeConfig: RestNodeConfig
  ): RestAnalysis {
    const actions = this.getAvailableActions(player, nodeConfig);
    const hpRatio = player.hp / player.maxHp;

    // 힐 가치 계산
    const healAmount = Math.floor(player.maxHp * nodeConfig.healAmount);
    const actualHeal = Math.min(healAmount, player.maxHp - player.hp);
    const healValue = (1 - hpRatio) * 100 + actualHeal;

    // 업그레이드 가치 계산
    const upgradeValue = player.deck.length > 0 ? 50 : 0;

    // 추천 행동 결정
    let recommendedAction: RestActionType;
    let reason: string;

    if (hpRatio < 0.4) {
      recommendedAction = 'heal';
      reason = '체력이 40% 미만이므로 회복 권장';
    } else if (hpRatio >= 0.8 && upgradeValue > 0) {
      recommendedAction = 'upgrade';
      reason = '체력이 충분하므로 카드 강화 권장';
    } else if (hpRatio >= 0.6 && upgradeValue > healValue) {
      recommendedAction = 'upgrade';
      reason = '업그레이드 가치가 더 높음';
    } else {
      recommendedAction = 'heal';
      reason = '체력 회복이 우선';
    }

    return {
      availableActions: actions,
      recommendedAction,
      healValue,
      upgradeValue,
      reason,
    };
  }

  // ==================== 통계 ====================

  /**
   * 다중 휴식 시뮬레이션 통계
   */
  simulateMultipleRests(
    initialPlayer: PlayerRestState,
    nodeConfig: RestNodeConfig,
    strategy: 'heal_priority' | 'upgrade_priority' | 'balanced',
    count: number
  ): {
    healCount: number;
    upgradeCount: number;
    avgHpAfter: number;
    avgCardsUpgraded: number;
  } {
    let healCount = 0;
    let upgradeCount = 0;
    let totalHpAfter = 0;
    let totalUpgrades = 0;

    for (let i = 0; i < count; i++) {
      const player = { ...initialPlayer };
      // 랜덤 체력 상태로 시작
      const rng = getGlobalRandom();
      player.hp = Math.floor(player.maxHp * (0.3 + rng.next() * 0.7));

      const result = this.simulateRest({
        player,
        nodeConfig,
        strategy,
      });

      if (result.actionTaken === 'heal') healCount++;
      if (result.actionTaken === 'upgrade') upgradeCount++;
      if (result.cardUpgraded) totalUpgrades++;

      totalHpAfter += result.finalPlayerState.hp;
    }

    return {
      healCount,
      upgradeCount,
      avgHpAfter: totalHpAfter / count,
      avgCardsUpgraded: totalUpgrades / count,
    };
  }
}

// ==================== 헬퍼 함수 ====================

export function createRestSimulator(): RestSimulator {
  return new RestSimulator();
}
