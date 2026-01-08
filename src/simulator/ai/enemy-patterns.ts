/**
 * @file enemy-patterns.ts
 * @description 적 AI 패턴 시스템
 *
 * ## 기본 패턴 (3종)
 * - aggressive: 공격 우선
 * - defensive: 방어 우선
 * - balanced: 균형 있게 대응
 *
 * ## 확장 패턴 (4종)
 * - tactical: 전술적 판단 (balanced 기반 + 특수효과 중시)
 * - berserk: 광폭화 (aggressive 기반 + HP 낮을 때 더 공격적)
 * - support: 지원 (defensive 기반 + 힐 우선)
 * - assassin: 암살자 (aggressive 기반 + 빠른 고피해)
 */

import type { GameCard, EnemyState, PlayerState, TokenState } from '../core/game-types';

// ==================== 타입 정의 ====================

// 단순화된 패턴 (실제 게임과 동일)
export type EnemyPattern =
  | 'aggressive'
  | 'defensive'
  | 'balanced';

// 레거시 호환을 위한 확장 패턴 (내부적으로 기본 패턴으로 매핑)
export type ExtendedEnemyPattern =
  | EnemyPattern
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
  pattern: ExtendedEnemyPattern;
  reasoning: string[];
}

// ==================== 패턴 설정 ====================

// 패턴 설정 (기본 + 확장)
const PATTERN_CONFIGS: Record<ExtendedEnemyPattern, PatternConfig> = {
  // 기본 패턴
  aggressive: {
    attackWeight: 1.8,
    defenseWeight: 0.6,
    specialWeight: 1.0,
    hpThresholds: { low: 0.3, critical: 0.15 },
    lowHpBehavior: 'more_aggressive',
    criticalBehavior: 'all_in',
  },
  defensive: {
    attackWeight: 0.7,
    defenseWeight: 1.8,
    specialWeight: 1.0,
    hpThresholds: { low: 0.4, critical: 0.2 },
    lowHpBehavior: 'more_defensive',
    criticalBehavior: 'desperate_defense',
  },
  balanced: {
    attackWeight: 1.2,
    defenseWeight: 1.2,
    specialWeight: 1.0,
    hpThresholds: { low: 0.35, critical: 0.15 },
    lowHpBehavior: 'more_defensive',
    criticalBehavior: 'all_in',
  },
  // 확장 패턴
  tactical: {
    attackWeight: 1.3,
    defenseWeight: 1.3,
    specialWeight: 1.5,
    hpThresholds: { low: 0.35, critical: 0.15 },
    lowHpBehavior: 'more_defensive',
    criticalBehavior: 'all_in',
  },
  berserk: {
    attackWeight: 2.0,
    defenseWeight: 0.4,
    specialWeight: 0.8,
    hpThresholds: { low: 0.5, critical: 0.2 },
    lowHpBehavior: 'berserk',
    criticalBehavior: 'all_in',
  },
  support: {
    attackWeight: 0.8,
    defenseWeight: 1.5,
    specialWeight: 1.8,
    hpThresholds: { low: 0.4, critical: 0.2 },
    lowHpBehavior: 'more_defensive',
    criticalBehavior: 'heal_priority',
  },
  assassin: {
    attackWeight: 2.2,
    defenseWeight: 0.3,
    specialWeight: 1.2,
    hpThresholds: { low: 0.25, critical: 0.1 },
    lowHpBehavior: 'more_aggressive',
    criticalBehavior: 'all_in',
  },
};

// 확장 패턴을 기본 패턴으로 매핑 (레거시 함수 - 일부 기능에서 사용)
function normalizePattern(pattern: ExtendedEnemyPattern): EnemyPattern {
  switch (pattern) {
    case 'tactical':
    case 'balanced':
      return 'balanced';
    case 'berserk':
    case 'assassin':
    case 'aggressive':
      return 'aggressive';
    case 'support':
    case 'defensive':
      return 'defensive';
    default:
      return 'balanced';
  }
}

// 확장 패턴 유효성 검사
function isValidExtendedPattern(pattern: string): pattern is ExtendedEnemyPattern {
  return ['aggressive', 'defensive', 'balanced', 'tactical', 'berserk', 'support', 'assassin'].includes(pattern);
}

// ==================== 적 AI 클래스 ====================

export class EnemyAI {
  private cards: Record<string, GameCard>;
  private pattern: ExtendedEnemyPattern;
  private config: PatternConfig;

  constructor(cards: Record<string, GameCard>, pattern: ExtendedEnemyPattern = 'balanced') {
    this.cards = cards;
    this.pattern = pattern;
    this.config = PATTERN_CONFIGS[this.pattern];
  }

  /**
   * 패턴 변경 (확장 패턴 완전 지원)
   */
  setPattern(pattern: ExtendedEnemyPattern): void {
    this.pattern = pattern;
    this.config = PATTERN_CONFIGS[this.pattern];
  }

  /**
   * 현재 패턴 반환
   */
  getPattern(): ExtendedEnemyPattern {
    return this.pattern;
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
   * 패턴별 보너스 (단순화됨)
   */
  private getPatternBonus(card: GameCard, reasons: string[]): number {
    let bonus = 0;

    switch (this.pattern) {
      case 'aggressive':
        // 다중 히트 선호
        if (card.hits && card.hits > 1) {
          bonus += card.hits * 3;
          reasons.push('다중히트');
        }
        // 고피해 카드 선호
        if (card.damage && card.damage >= 8) {
          bonus += 5;
        }
        break;

      case 'defensive':
        // 방어 + 공격 조합 선호
        if (card.block && card.damage) {
          bonus += 8;
          reasons.push('방반');
        }
        // 고방어 카드 선호
        if (card.block && card.block >= 8) {
          bonus += 5;
        }
        break;

      case 'balanced':
        // 균형잡힌 카드 선호
        if (card.block && card.damage) {
          bonus += 5;
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
  pattern?: ExtendedEnemyPattern
): EnemyAI {
  return new EnemyAI(cards, pattern);
}

/**
 * 적 ID에서 패턴 추출
 * - 각 적에 맞는 확장 패턴 반환
 */
export function getPatternForEnemy(enemyId: string): ExtendedEnemyPattern {
  const patterns: Record<string, ExtendedEnemyPattern> = {
    // 공격적 적
    ghoul: 'aggressive',
    marauder: 'aggressive',
    wildrat: 'aggressive',
    slaughterer: 'aggressive',

    // 광폭화 적
    berserker: 'berserk',
    warlord: 'berserk',

    // 방어적 적
    deserter: 'defensive',
    slurthim: 'defensive',
    polluted: 'defensive',

    // 전술적 적 (엘리트/보스)
    hunter: 'tactical',
    captain: 'tactical',
    overlord: 'tactical',

    // 지원형 적
    alchemist: 'support',

    // 암살자형 적
    nemesis: 'assassin',
  };

  return patterns[enemyId] || 'balanced';
}

/**
 * 적 패턴에 따른 카드 선택 우선순위 가져오기 (단순화)
 */
export function getCardPriorityForPattern(pattern: EnemyPattern): {
  preferredTypes: string[];
  avoidTypes: string[];
} {
  switch (pattern) {
    case 'aggressive':
      return { preferredTypes: ['attack'], avoidTypes: [] };
    case 'defensive':
      return { preferredTypes: ['defense', 'general'], avoidTypes: [] };
    case 'balanced':
    default:
      return { preferredTypes: ['attack', 'defense'], avoidTypes: [] };
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
 * 보스 패턴 정의 (단순화 - 실제 게임과 동일)
 * - 복잡한 페이즈 시스템 제거
 * - 특수 행동 최소화
 */
export const BOSS_PATTERNS: Record<string, BossPattern> = {
  slaughterer: {
    id: 'slaughterer',
    name: '학살자',
    basePattern: 'aggressive',
    phases: {
      phase1: { hpThreshold: 1.0, pattern: 'aggressive', cardsPerTurn: 2 },
      phase2: { hpThreshold: 0.5, pattern: 'aggressive', cardsPerTurn: 3 },
    },
    specialActions: [],
    turnPatterns: [],
  },

  captain: {
    id: 'captain',
    name: '탈영병 대장',
    basePattern: 'balanced',
    phases: {
      phase1: { hpThreshold: 1.0, pattern: 'balanced', cardsPerTurn: 3 },
      phase2: { hpThreshold: 0.4, pattern: 'aggressive', cardsPerTurn: 3 },
    },
    specialActions: [],
    turnPatterns: [],
  },

  hunter: {
    id: 'hunter',
    name: '현상금 사냥꾼',
    basePattern: 'balanced',
    phases: {
      phase1: { hpThreshold: 1.0, pattern: 'balanced', cardsPerTurn: 2 },
      phase2: { hpThreshold: 0.5, pattern: 'aggressive', cardsPerTurn: 2 },
    },
    specialActions: [],
    turnPatterns: [],
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
 * 보스 페이즈에 따른 패턴 가져오기 (단순화)
 */
export function getBossPatternForPhase(bossId: string, hpRatio: number): EnemyPattern {
  const pattern = BOSS_PATTERNS[bossId];
  if (!pattern) return 'balanced';

  const phase = getBossPhase(bossId, hpRatio);
  let resultPattern: EnemyPattern;

  switch (phase) {
    case 'enrage':
      resultPattern = pattern.phases.enrage?.pattern || 'aggressive';
      break;
    case 'phase3':
      resultPattern = pattern.phases.phase3?.pattern || pattern.phases.phase2.pattern;
      break;
    case 'phase2':
      resultPattern = pattern.phases.phase2.pattern;
      break;
    default:
      resultPattern = pattern.phases.phase1.pattern;
  }

  // 항상 기본 패턴으로 정규화
  return normalizePattern(resultPattern);
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
 * 적 체력 비율에 따른 패턴 변화 추천 (단순화)
 */
export function getPatternModifierByHp(basePattern: EnemyPattern, hpRatio: number): EnemyPattern {
  // 체력이 낮을 때 패턴 변화
  if (hpRatio <= 0.2) {
    // 치명적 상태 - 공격적으로 변경
    return basePattern === 'defensive' ? 'defensive' : 'aggressive';
  } else if (hpRatio <= 0.4) {
    // 위험 상태
    if (basePattern === 'balanced') {
      return 'aggressive';
    }
  }
  return basePattern;
}
