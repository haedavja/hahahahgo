/**
 * @file enemy-patterns.ts
 * @description 적 AI 패턴 시스템 - 적별 고유 행동 패턴 구현
 *
 * ## 패턴 타입
 * - aggressive: 공격 우선, HP 낮을수록 더 공격적
 * - defensive: 방어 우선, HP 낮을수록 더 방어적
 * - balanced: 상황에 따라 균형 있게 대응
 * - tactical: 교차/특수 효과 우선
 * - berserk: HP 낮을수록 광폭화
 */

import type { GameCard, EnemyState, PlayerState, TokenState } from '../core/game-types';

// ==================== 타입 정의 ====================

export type EnemyPattern =
  | 'aggressive'
  | 'defensive'
  | 'balanced'
  | 'tactical'
  | 'berserk'
  | 'support'
  | 'assassin';

export interface PatternConfig {
  /** 공격 가중치 */
  attackWeight: number;
  /** 방어 가중치 */
  defenseWeight: number;
  /** 특수 효과 가중치 */
  specialWeight: number;
  /** HP 임계값에 따른 행동 변화 */
  hpThresholds: {
    low: number;      // 이 비율 이하면 lowHpBehavior 적용
    critical: number; // 이 비율 이하면 criticalBehavior 적용
  };
  /** HP 낮을 때 행동 변화 */
  lowHpBehavior: 'more_aggressive' | 'more_defensive' | 'berserk' | 'flee';
  /** 치명적 HP일 때 행동 */
  criticalBehavior: 'all_in' | 'desperate_defense' | 'heal_priority';
}

export interface CardScore {
  card: GameCard;
  score: number;
  reasons: string[];
}

export interface EnemyDecision {
  selectedCards: GameCard[];
  pattern: EnemyPattern;
  reasoning: string[];
}

// ==================== 패턴 설정 ====================

const PATTERN_CONFIGS: Record<EnemyPattern, PatternConfig> = {
  aggressive: {
    attackWeight: 2.0,
    defenseWeight: 0.5,
    specialWeight: 1.0,
    hpThresholds: { low: 0.4, critical: 0.2 },
    lowHpBehavior: 'more_aggressive',
    criticalBehavior: 'all_in',
  },
  defensive: {
    attackWeight: 0.8,
    defenseWeight: 2.0,
    specialWeight: 1.2,
    hpThresholds: { low: 0.5, critical: 0.25 },
    lowHpBehavior: 'more_defensive',
    criticalBehavior: 'desperate_defense',
  },
  balanced: {
    attackWeight: 1.2,
    defenseWeight: 1.2,
    specialWeight: 1.0,
    hpThresholds: { low: 0.4, critical: 0.2 },
    lowHpBehavior: 'more_defensive',
    criticalBehavior: 'all_in',
  },
  tactical: {
    attackWeight: 1.0,
    defenseWeight: 1.0,
    specialWeight: 2.0,
    hpThresholds: { low: 0.35, critical: 0.15 },
    lowHpBehavior: 'more_aggressive',
    criticalBehavior: 'all_in',
  },
  berserk: {
    attackWeight: 1.5,
    defenseWeight: 0.3,
    specialWeight: 0.8,
    hpThresholds: { low: 0.5, critical: 0.25 },
    lowHpBehavior: 'berserk',
    criticalBehavior: 'all_in',
  },
  support: {
    attackWeight: 0.6,
    defenseWeight: 1.5,
    specialWeight: 2.0,
    hpThresholds: { low: 0.4, critical: 0.2 },
    lowHpBehavior: 'more_defensive',
    criticalBehavior: 'heal_priority',
  },
  assassin: {
    attackWeight: 2.5,
    defenseWeight: 0.3,
    specialWeight: 1.5,
    hpThresholds: { low: 0.3, critical: 0.15 },
    lowHpBehavior: 'more_aggressive',
    criticalBehavior: 'all_in',
  },
};

// ==================== 적 AI 클래스 ====================

export class EnemyAI {
  private cards: Record<string, GameCard>;
  private pattern: EnemyPattern;
  private config: PatternConfig;

  constructor(cards: Record<string, GameCard>, pattern: EnemyPattern = 'balanced') {
    this.cards = cards;
    this.pattern = pattern;
    this.config = PATTERN_CONFIGS[pattern];
  }

  /**
   * 패턴 변경
   */
  setPattern(pattern: EnemyPattern): void {
    this.pattern = pattern;
    this.config = PATTERN_CONFIGS[pattern];
  }

  /**
   * 적 카드 선택 (고도화된 AI)
   */
  selectCards(
    enemy: EnemyState,
    player: PlayerState,
    availableDeck: string[],
    cardsToPlay: number
  ): EnemyDecision {
    const hpRatio = enemy.hp / enemy.maxHp;
    const playerHpRatio = player.hp / player.maxHp;
    const reasoning: string[] = [];

    // 현재 상태에 따른 가중치 조정
    const adjustedConfig = this.adjustConfigByState(hpRatio, playerHpRatio, reasoning);

    // 가용 카드 점수 계산
    const scoredCards: CardScore[] = [];
    for (const cardId of availableDeck) {
      const card = this.cards[cardId];
      if (!card) continue;

      const score = this.calculateCardScore(card, enemy, player, adjustedConfig, reasoning);
      scoredCards.push(score);
    }

    // 점수순 정렬
    scoredCards.sort((a, b) => b.score - a.score);

    // 상위 카드 선택 (다양성 보장)
    const selectedCards = this.selectDiverseCards(scoredCards, cardsToPlay, reasoning);

    return {
      selectedCards,
      pattern: this.pattern,
      reasoning,
    };
  }

  /**
   * 상태에 따른 가중치 조정
   */
  private adjustConfigByState(
    enemyHpRatio: number,
    playerHpRatio: number,
    reasoning: string[]
  ): PatternConfig {
    const config = { ...this.config };

    // HP 임계값 체크
    if (enemyHpRatio <= this.config.hpThresholds.critical) {
      // 치명적 상태
      switch (this.config.criticalBehavior) {
        case 'all_in':
          config.attackWeight *= 2.5;
          config.defenseWeight *= 0.2;
          reasoning.push('치명적 HP: 올인 공격');
          break;
        case 'desperate_defense':
          config.defenseWeight *= 3.0;
          config.attackWeight *= 0.3;
          reasoning.push('치명적 HP: 필사 방어');
          break;
        case 'heal_priority':
          config.specialWeight *= 2.5;
          reasoning.push('치명적 HP: 힐 우선');
          break;
      }
    } else if (enemyHpRatio <= this.config.hpThresholds.low) {
      // 낮은 HP 상태
      switch (this.config.lowHpBehavior) {
        case 'more_aggressive':
          config.attackWeight *= 1.5;
          reasoning.push('낮은 HP: 공격적');
          break;
        case 'more_defensive':
          config.defenseWeight *= 1.5;
          reasoning.push('낮은 HP: 방어적');
          break;
        case 'berserk':
          config.attackWeight *= 2.0;
          config.defenseWeight *= 0.3;
          reasoning.push('낮은 HP: 광폭화');
          break;
        case 'flee':
          config.defenseWeight *= 2.0;
          config.specialWeight *= 1.5;
          reasoning.push('낮은 HP: 도주 시도');
          break;
      }
    }

    // 플레이어 HP에 따른 추가 조정
    if (playerHpRatio <= 0.2) {
      // 플레이어 거의 죽음 - 마무리
      config.attackWeight *= 1.8;
      reasoning.push('플레이어 빈사: 마무리 시도');
    } else if (playerHpRatio >= 0.8) {
      // 플레이어 풀피 - 특수 효과로 약화
      config.specialWeight *= 1.3;
      reasoning.push('플레이어 풀피: 디버프 우선');
    }

    return config;
  }

  /**
   * 카드 점수 계산
   */
  private calculateCardScore(
    card: GameCard,
    enemy: EnemyState,
    player: PlayerState,
    config: PatternConfig,
    reasoning: string[]
  ): CardScore {
    let score = 0;
    const reasons: string[] = [];

    // 1. 공격력 점수
    if (card.damage && card.damage > 0) {
      const hits = card.hits || 1;
      let damageScore = card.damage * hits * config.attackWeight;

      // 플레이어 방어력 고려
      if (player.block > 0) {
        const effectiveDamage = Math.max(0, card.damage - player.block);
        if (effectiveDamage === 0 && !card.ignoreBlock) {
          damageScore *= 0.5; // 방어력으로 막히면 가치 감소
        }
      }

      // 플레이어 체력 대비 킬 가능성
      if (card.damage * hits >= player.hp) {
        damageScore *= 2.0; // 킬 가능하면 높은 점수
        reasons.push('킬 가능');
      }

      score += damageScore;
      reasons.push(`공격: ${damageScore.toFixed(1)}`);
    }

    // 2. 방어력 점수
    if (card.block && card.block > 0) {
      let blockScore = card.block * config.defenseWeight;

      // 플레이어 예상 피해량 대비
      const playerThreat = this.estimatePlayerThreat(player);
      if (card.block >= playerThreat) {
        blockScore *= 1.5; // 위협 완화 가능
        reasons.push('위협 완화');
      }

      score += blockScore;
      reasons.push(`방어: ${blockScore.toFixed(1)}`);
    }

    // 3. 특수 효과 점수
    if (card.appliedTokens && card.appliedTokens.length > 0) {
      let specialScore = 0;
      for (const token of card.appliedTokens) {
        const tokenValue = this.evaluateToken(token, enemy, player);
        specialScore += tokenValue * config.specialWeight;
      }
      if (specialScore > 0) {
        score += specialScore;
        reasons.push(`특수: ${specialScore.toFixed(1)}`);
      }
    }

    // 4. 속도 점수 (빠른 카드 약간 선호)
    const speedCost = card.speedCost || 5;
    score += (10 - speedCost) * 0.5;

    // 5. 교차 보너스 카드 평가
    if (card.crossBonus) {
      const crossValue = this.evaluateCrossBonus(card.crossBonus, config);
      score += crossValue;
      if (crossValue > 0) {
        reasons.push(`교차보너스: ${crossValue.toFixed(1)}`);
      }
    }

    // 6. 특성 기반 점수
    if (card.traits && card.traits.length > 0) {
      const traitScore = this.evaluateTraits(card.traits, config);
      score += traitScore;
      if (traitScore > 0) {
        reasons.push(`특성: ${traitScore.toFixed(1)}`);
      }
    }

    // 7. 패턴별 보너스
    score += this.getPatternBonus(card, reasons);

    return { card, score, reasons };
  }

  /**
   * 교차 보너스 평가
   */
  private evaluateCrossBonus(crossBonus: GameCard['crossBonus'], config: PatternConfig): number {
    if (!crossBonus) return 0;

    let value = 0;
    switch (crossBonus.type) {
      case 'damage_mult':
        value = (crossBonus.value || 1) * 10 * config.attackWeight;
        break;
      case 'gun_attack':
        value = (crossBonus.count || 1) * 8 * config.attackWeight;
        break;
      case 'block_mult':
        value = (crossBonus.value || 1) * 8 * config.defenseWeight;
        break;
      case 'advance':
        value = (crossBonus.value || 3) * 3;
        break;
      case 'push':
        value = (crossBonus.value || 3) * 3;
        break;
      case 'add_tokens':
        value = (crossBonus.tokens?.length || 0) * 10 * config.specialWeight;
        break;
      case 'guaranteed_crit':
        value = 15 * config.attackWeight;
        break;
    }
    return value;
  }

  /**
   * 특성 점수 평가
   */
  private evaluateTraits(traits: string[], config: PatternConfig): number {
    let score = 0;

    for (const trait of traits) {
      switch (trait) {
        // 긍정 특성
        case 'swift':
          score += 5;  // 빠른 카드
          break;
        case 'strongbone':
          score += 8;  // 강화
          break;
        case 'destroyer':
          score += 10 * config.attackWeight;
          break;
        case 'chain':
          score += 6;  // 연계 준비
          break;
        case 'followup':
        case 'finisher':
          score += 8;  // 연계 발동
          break;
        case 'knockback':
          score += 7;  // 컨트롤
          break;
        case 'stun':
          score += 12; // 강력한 CC
          break;
        // 부정 특성
        case 'double_edge':
          score -= 3;  // 자해
          break;
        case 'slow':
          score -= 4;  // 느린 카드
          break;
        case 'exhaust':
          score -= 6;  // 탈진
          break;
        case 'vanish':
          score -= 5;  // 소멸
          break;
      }
    }

    return score;
  }

  /**
   * 토큰 효과 평가
   */
  private evaluateToken(
    token: { id: string; stacks?: number; target?: string },
    enemy: EnemyState,
    player: PlayerState
  ): number {
    const stacks = token.stacks || 1;
    const toPlayer = token.target === 'enemy' || token.target === 'player';

    // 플레이어에게 부여하는 디버프
    if (toPlayer) {
      switch (token.id) {
        case 'vulnerable': return 20 * stacks;
        case 'weak': return 15 * stacks;
        case 'burn': return 10 * stacks;
        case 'poison': return 8 * stacks;
        case 'slow': return 12 * stacks;
        case 'blind': return 10 * stacks;
        default: return 5 * stacks;
      }
    }

    // 자신에게 부여하는 버프
    switch (token.id) {
      case 'strength': return 25 * stacks;
      case 'agility': return 15 * stacks;
      case 'regeneration': return 12 * stacks;
      case 'thorns': return 10 * stacks;
      case 'block': return 8 * stacks;
      default: return 5 * stacks;
    }
  }

  /**
   * 플레이어 위협 수준 추정
   */
  private estimatePlayerThreat(player: PlayerState): number {
    let threat = 0;

    // 힘 기반 위협
    const strength = this.getTokenStacks(player.tokens, 'strength');
    threat += strength * 5;

    // 기본 예상 피해 (손패 기반이면 좋지만 여기선 추정)
    threat += 15; // 기본 예상 피해

    return threat;
  }

  /**
   * 토큰 스택 수 가져오기
   */
  private getTokenStacks(tokens: TokenState | undefined, tokenId: string): number {
    if (!tokens || typeof tokens !== 'object') return 0;
    return (tokens as Record<string, number>)[tokenId] || 0;
  }

  /**
   * 패턴별 보너스
   */
  private getPatternBonus(card: GameCard, reasons: string[]): number {
    let bonus = 0;

    switch (this.pattern) {
      case 'aggressive':
        // 다중 히트 선호
        if (card.hits && card.hits > 1) {
          bonus += card.hits * 5;
          reasons.push('다중히트 보너스');
        }
        break;

      case 'defensive':
        // 방어 + 반격 조합 선호
        if (card.block && card.damage) {
          bonus += 10;
          reasons.push('방반 조합');
        }
        break;

      case 'tactical':
        // 교차 보너스 있는 카드 선호
        if (card.crossBonus) {
          bonus += 15;
          reasons.push('교차 보너스');
        }
        // 특성 있는 카드 선호
        if (card.traits && card.traits.length > 0) {
          bonus += card.traits.length * 5;
        }
        break;

      case 'berserk':
        // 자해 카드도 사용
        if (card.traits?.includes('double_edge')) {
          bonus += 10;
          reasons.push('양날의 검');
        }
        break;

      case 'assassin':
        // 빠른 고피해 카드 선호
        if (card.damage && card.damage >= 10 && (card.speedCost || 5) <= 4) {
          bonus += 20;
          reasons.push('암살 적합');
        }
        break;
    }

    return bonus;
  }

  /**
   * 다양한 카드 선택 (공격/방어 혼합)
   */
  private selectDiverseCards(
    scoredCards: CardScore[],
    count: number,
    reasoning: string[]
  ): GameCard[] {
    const selected: GameCard[] = [];
    const usedIds = new Set<string>();

    // 상위 카드 우선 선택
    for (const { card } of scoredCards) {
      if (selected.length >= count) break;
      if (usedIds.has(card.id)) continue;

      selected.push(card);
      usedIds.add(card.id);
    }

    // 다양성 체크: 공격/방어 비율
    const attackCards = selected.filter(c => c.damage && c.damage > 0);
    const defenseCards = selected.filter(c => c.block && c.block > 0);

    if (this.pattern !== 'aggressive' && attackCards.length === selected.length && selected.length > 1) {
      // 전부 공격 카드면 하나를 방어로 교체 시도
      const defenseOption = scoredCards.find(
        ({ card }) => card.block && card.block > 0 && !usedIds.has(card.id)
      );
      if (defenseOption) {
        selected.pop();
        selected.push(defenseOption.card);
        reasoning.push('다양성: 방어 카드 추가');
      }
    }

    return selected;
  }
}

// ==================== 팩토리 함수 ====================

export function createEnemyAI(
  cards: Record<string, GameCard>,
  pattern?: EnemyPattern
): EnemyAI {
  return new EnemyAI(cards, pattern);
}

/**
 * 적 ID에서 패턴 추출
 */
export function getPatternForEnemy(enemyId: string): EnemyPattern {
  // 적 이름 기반 패턴 매핑
  const patterns: Record<string, EnemyPattern> = {
    // 1막 일반 적
    ghoul: 'aggressive',
    marauder: 'aggressive',
    deserter: 'defensive',
    slaughterer: 'berserk',
    slurthim: 'support',       // 디버프 전문
    wildrat: 'assassin',       // 빠른 공격
    berserker: 'berserk',
    polluted: 'support',       // 독/디버프

    // 1막 엘리트/보스
    hunter: 'tactical',        // 함정 + 저격
    captain: 'tactical',       // 지휘관, 소환

    // 2막+ 적 (추가)
    scavenger: 'support',
    alchemist: 'support',
    shaman: 'support',
    overlord: 'tactical',
    warlord: 'berserk',
    archon: 'tactical',
    nemesis: 'assassin',
    titan: 'berserk',
  };

  return patterns[enemyId] || 'balanced';
}

/**
 * 적 패턴에 따른 카드 선택 우선순위 가져오기
 */
export function getCardPriorityForPattern(pattern: EnemyPattern): {
  preferredTypes: string[];
  avoidTypes: string[];
} {
  switch (pattern) {
    case 'aggressive':
      return { preferredTypes: ['attack'], avoidTypes: ['defense'] };
    case 'defensive':
      return { preferredTypes: ['defense', 'support'], avoidTypes: [] };
    case 'balanced':
      return { preferredTypes: ['attack', 'defense'], avoidTypes: [] };
    case 'tactical':
      return { preferredTypes: ['support', 'move'], avoidTypes: [] };
    case 'berserk':
      return { preferredTypes: ['attack'], avoidTypes: ['defense', 'support'] };
    case 'support':
      return { preferredTypes: ['support', 'reaction'], avoidTypes: ['attack'] };
    case 'assassin':
      return { preferredTypes: ['attack', 'move'], avoidTypes: ['defense'] };
    default:
      return { preferredTypes: [], avoidTypes: [] };
  }
}

// ==================== 보스 고유 패턴 시스템 ====================

/**
 * 보스 페이즈 타입
 */
export type BossPhase = 'phase1' | 'phase2' | 'phase3' | 'enrage';

/**
 * 보스 고유 행동 패턴
 */
export interface BossPattern {
  id: string;
  name: string;
  basePattern: EnemyPattern;
  /** 페이즈별 패턴 변화 */
  phases: {
    phase1: { hpThreshold: number; pattern: EnemyPattern; cardsPerTurn: number };
    phase2: { hpThreshold: number; pattern: EnemyPattern; cardsPerTurn: number };
    phase3?: { hpThreshold: number; pattern: EnemyPattern; cardsPerTurn: number };
    enrage?: { hpThreshold: number; pattern: EnemyPattern; cardsPerTurn: number };
  };
  /** 특수 행동 */
  specialActions: BossSpecialAction[];
  /** 턴 기반 패턴 (n턴마다 특정 행동) */
  turnPatterns?: { interval: number; action: string }[];
}

/**
 * 보스 특수 행동
 */
export interface BossSpecialAction {
  id: string;
  name: string;
  trigger: 'onHpThreshold' | 'onTurn' | 'onPlayerAction' | 'onPhaseChange';
  condition?: { hpPercent?: number; turn?: number; playerAction?: string };
  effect: {
    type: 'buff' | 'debuff' | 'summon' | 'heal' | 'aoe' | 'special';
    value?: number;
    target?: 'self' | 'player' | 'all';
    description: string;
  };
}

/**
 * 보스 패턴 정의
 */
export const BOSS_PATTERNS: Record<string, BossPattern> = {
  slaughterer: {
    id: 'slaughterer',
    name: '학살자',
    basePattern: 'berserk',
    phases: {
      phase1: { hpThreshold: 1.0, pattern: 'aggressive', cardsPerTurn: 2 },
      phase2: { hpThreshold: 0.6, pattern: 'berserk', cardsPerTurn: 3 },
      phase3: { hpThreshold: 0.3, pattern: 'berserk', cardsPerTurn: 3 },
      enrage: { hpThreshold: 0.15, pattern: 'berserk', cardsPerTurn: 4 },
    },
    specialActions: [
      {
        id: 'blood_rage',
        name: '피의 광기',
        trigger: 'onHpThreshold',
        condition: { hpPercent: 50 },
        effect: {
          type: 'buff',
          value: 3,
          target: 'self',
          description: '힘 +3, 이후 턴마다 힘 +1 추가',
        },
      },
      {
        id: 'massacre',
        name: '대학살',
        trigger: 'onHpThreshold',
        condition: { hpPercent: 25 },
        effect: {
          type: 'aoe',
          value: 20,
          target: 'player',
          description: '전체 피해 20 + 출혈 3',
        },
      },
    ],
    turnPatterns: [
      { interval: 3, action: 'heavy_attack' }, // 3턴마다 강공격
    ],
  },

  captain: {
    id: 'captain',
    name: '탈영병 대장',
    basePattern: 'tactical',
    phases: {
      phase1: { hpThreshold: 1.0, pattern: 'tactical', cardsPerTurn: 2 },
      phase2: { hpThreshold: 0.5, pattern: 'defensive', cardsPerTurn: 3 },
      phase3: { hpThreshold: 0.25, pattern: 'aggressive', cardsPerTurn: 4 },
    },
    specialActions: [
      {
        id: 'summon_guards',
        name: '호위병 소환',
        trigger: 'onHpThreshold',
        condition: { hpPercent: 50 },
        effect: {
          type: 'summon',
          value: 2,
          target: 'self',
          description: '탈영병 2명 소환',
        },
      },
      {
        id: 'rally',
        name: '독려',
        trigger: 'onTurn',
        condition: { turn: 4 },
        effect: {
          type: 'buff',
          value: 2,
          target: 'all',
          description: '모든 아군 힘/방어 +2',
        },
      },
      {
        id: 'execution',
        name: '처형',
        trigger: 'onPlayerAction',
        condition: { playerAction: 'low_hp' },
        effect: {
          type: 'special',
          value: 999,
          target: 'player',
          description: 'HP 20% 이하 시 처형 시도 (관통 50)',
        },
      },
    ],
    turnPatterns: [
      { interval: 2, action: 'command' }, // 2턴마다 지휘
      { interval: 5, action: 'fortify' }, // 5턴마다 강화
    ],
  },

  hunter: {
    id: 'hunter',
    name: '현상금 사냥꾼',
    basePattern: 'assassin',
    phases: {
      phase1: { hpThreshold: 1.0, pattern: 'tactical', cardsPerTurn: 2 },
      phase2: { hpThreshold: 0.4, pattern: 'assassin', cardsPerTurn: 3 },
    },
    specialActions: [
      {
        id: 'set_trap',
        name: '함정 설치',
        trigger: 'onTurn',
        condition: { turn: 1 },
        effect: {
          type: 'special',
          target: 'player',
          description: '첫 턴 함정 설치 (이동 시 피해)',
        },
      },
      {
        id: 'aimed_shot',
        name: '조준 사격',
        trigger: 'onTurn',
        condition: { turn: 3 },
        effect: {
          type: 'special',
          value: 30,
          target: 'player',
          description: '3턴마다 조준 후 고피해 사격',
        },
      },
    ],
    turnPatterns: [
      { interval: 3, action: 'aimed_shot' },
    ],
  },
};

/**
 * 보스 현재 페이즈 계산
 */
export function getBossPhase(bossId: string, hpRatio: number): BossPhase {
  const pattern = BOSS_PATTERNS[bossId];
  if (!pattern) return 'phase1';

  if (pattern.phases.enrage && hpRatio <= pattern.phases.enrage.hpThreshold) {
    return 'enrage';
  }
  if (pattern.phases.phase3 && hpRatio <= pattern.phases.phase3.hpThreshold) {
    return 'phase3';
  }
  if (hpRatio <= pattern.phases.phase2.hpThreshold) {
    return 'phase2';
  }
  return 'phase1';
}

/**
 * 보스 페이즈에 따른 패턴 가져오기
 */
export function getBossPatternForPhase(bossId: string, hpRatio: number): EnemyPattern {
  const pattern = BOSS_PATTERNS[bossId];
  if (!pattern) return 'balanced';

  const phase = getBossPhase(bossId, hpRatio);
  switch (phase) {
    case 'enrage':
      return pattern.phases.enrage?.pattern || 'berserk';
    case 'phase3':
      return pattern.phases.phase3?.pattern || pattern.phases.phase2.pattern;
    case 'phase2':
      return pattern.phases.phase2.pattern;
    default:
      return pattern.phases.phase1.pattern;
  }
}

/**
 * 보스 턴별 추가 카드 수
 */
export function getBossCardsPerTurn(bossId: string, hpRatio: number): number {
  const pattern = BOSS_PATTERNS[bossId];
  if (!pattern) return 2;

  const phase = getBossPhase(bossId, hpRatio);
  switch (phase) {
    case 'enrage':
      return pattern.phases.enrage?.cardsPerTurn || 4;
    case 'phase3':
      return pattern.phases.phase3?.cardsPerTurn || 3;
    case 'phase2':
      return pattern.phases.phase2.cardsPerTurn;
    default:
      return pattern.phases.phase1.cardsPerTurn;
  }
}

/**
 * 보스 특수 행동 체크
 */
export function checkBossSpecialActions(
  bossId: string,
  context: {
    hpRatio: number;
    turn: number;
    playerHpRatio: number;
    phaseChanged: boolean;
  }
): BossSpecialAction[] {
  const pattern = BOSS_PATTERNS[bossId];
  if (!pattern) return [];

  const triggered: BossSpecialAction[] = [];

  for (const action of pattern.specialActions) {
    let shouldTrigger = false;

    switch (action.trigger) {
      case 'onHpThreshold':
        if (action.condition?.hpPercent) {
          const threshold = action.condition.hpPercent / 100;
          // 처음으로 임계값 이하가 되었을 때만 발동
          shouldTrigger = context.hpRatio <= threshold;
        }
        break;

      case 'onTurn':
        if (action.condition?.turn) {
          shouldTrigger = context.turn === action.condition.turn ||
            (context.turn > 0 && context.turn % action.condition.turn === 0);
        }
        break;

      case 'onPlayerAction':
        if (action.condition?.playerAction === 'low_hp') {
          shouldTrigger = context.playerHpRatio <= 0.2;
        }
        break;

      case 'onPhaseChange':
        shouldTrigger = context.phaseChanged;
        break;
    }

    if (shouldTrigger) {
      triggered.push(action);
    }
  }

  return triggered;
}

/**
 * 보스 턴 패턴 체크
 */
export function getBossTurnAction(bossId: string, turn: number): string | null {
  const pattern = BOSS_PATTERNS[bossId];
  if (!pattern?.turnPatterns) return null;

  for (const turnPattern of pattern.turnPatterns) {
    if (turn > 0 && turn % turnPattern.interval === 0) {
      return turnPattern.action;
    }
  }
  return null;
}

/**
 * 보스 AI 강화된 카드 선택
 */
export function selectBossCards(
  bossId: string,
  enemy: EnemyState,
  player: PlayerState,
  cards: Record<string, GameCard>,
  turn: number
): EnemyDecision {
  const hpRatio = enemy.hp / enemy.maxHp;
  const pattern = getBossPatternForPhase(bossId, hpRatio);
  const cardsToPlay = getBossCardsPerTurn(bossId, hpRatio);

  // 보스 AI 생성
  const ai = new EnemyAI(cards, pattern);

  // 기본 카드 선택
  const decision = ai.selectCards(enemy, player, enemy.deck, cardsToPlay);

  // 턴 패턴 체크
  const turnAction = getBossTurnAction(bossId, turn);
  if (turnAction) {
    decision.reasoning.push(`턴 패턴: ${turnAction}`);
  }

  // 페이즈 정보 추가
  const phase = getBossPhase(bossId, hpRatio);
  decision.reasoning.unshift(`보스 페이즈: ${phase} (HP ${(hpRatio * 100).toFixed(0)}%)`);

  return decision;
}

/**
 * 적 체력 비율에 따른 패턴 변화 추천
 */
export function getPatternModifierByHp(basePattern: EnemyPattern, hpRatio: number): EnemyPattern {
  // 체력이 낮을 때 패턴 변화
  if (hpRatio <= 0.2) {
    // 치명적 상태
    switch (basePattern) {
      case 'defensive':
      case 'support':
        return 'defensive';  // 더 방어적
      default:
        return 'berserk';    // 올인 공격
    }
  } else if (hpRatio <= 0.4) {
    // 위험 상태
    switch (basePattern) {
      case 'balanced':
        return 'aggressive';  // 공격적으로 전환
      case 'support':
        return 'defensive';   // 방어적으로 전환
      default:
        return basePattern;
    }
  }
  return basePattern;
}
