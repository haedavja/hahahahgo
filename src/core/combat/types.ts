/**
 * @file types.ts
 * @description 게임/시뮬레이터 공통 전투 타입 정의
 *
 * 이 파일은 게임과 시뮬레이터 간의 공통 인터페이스를 정의합니다.
 * 각 시스템은 어댑터를 통해 이 타입들과 상호작용합니다.
 */

// ==================== 토큰 시스템 ====================

/**
 * 통합 토큰 상태 (시뮬레이터 형식 기반)
 * 게임의 배열 기반 TokenState는 어댑터에서 변환됨
 */
export interface UnifiedTokenState {
  [tokenId: string]: number;
}

/**
 * 토큰 메타데이터
 */
export interface TokenDefinition {
  id: string;
  name: string;
  /** usage: 사용 시 소모, turn: 턴 종료 시 감소, permanent: 영구 */
  type: 'usage' | 'turn' | 'permanent';
  /** positive: 버프, negative: 디버프 */
  category: 'positive' | 'negative';
  /** 최대 스택 수 (0 = 무제한) */
  maxStacks?: number;
  /** 반대 토큰 (상쇄용) */
  oppositeToken?: string;
  /** 설명 */
  description?: string;
}

/**
 * 토큰 연산 결과
 */
export interface TokenOperationResult {
  /** 연산 후 토큰 상태 */
  tokens: UnifiedTokenState;
  /** 연산 로그 */
  logs: string[];
  /** 상쇄된 토큰 정보 */
  cancelled?: {
    tokenId: string;
    amount: number;
    byToken: string;
  };
}

// ==================== 피해/방어 계산 ====================

/**
 * 피해 수정자 종류
 */
export type DamageModifierType =
  | 'attackMultiplier'      // 공격 배율 (힘, 공세 등)
  | 'damageBonus'           // 추가 피해
  | 'defenseMultiplier'     // 방어 배율
  | 'damageTakenMultiplier' // 받는 피해 배율 (취약 등)
  | 'ignoreBlock'           // 방어 무시
  | 'critMultiplier';       // 치명타 배율

/**
 * 피해 수정자
 */
export interface DamageModifier {
  type: DamageModifierType;
  value: number;
  source: string;  // 토큰 ID, 상징 ID, 카드 특성 등
}

/**
 * 피해 계산 입력
 */
export interface DamageInput {
  /** 기본 피해량 */
  baseDamage: number;
  /** 공격자 토큰 상태 */
  attackerTokens: UnifiedTokenState;
  /** 방어자 토큰 상태 */
  defenderTokens: UnifiedTokenState;
  /** 방어자 방어력 */
  defenderBlock: number;
  /** 치명타 여부 */
  isCritical: boolean;
  /** 히트 수 */
  hits: number;
  /** 추가 수정자 */
  modifiers?: DamageModifier[];
  /** 방어 무시 (관통 등) */
  ignoreBlock?: boolean;
}

/**
 * 피해 계산 결과
 */
export interface DamageResult {
  /** 최종 피해량 */
  finalDamage: number;
  /** 방어로 막은 양 */
  blockedAmount: number;
  /** 회피 여부 */
  wasDodged: boolean;
  /** 반사 피해 */
  reflectedDamage: number;
  /** 적용된 수정자 목록 */
  modifiersApplied: string[];
  /** 소모된 공격자 토큰 */
  attackerTokensConsumed: Array<{ tokenId: string; amount: number }>;
  /** 소모된 방어자 토큰 */
  defenderTokensConsumed: Array<{ tokenId: string; amount: number }>;
  /** 계산 로그 */
  logs: string[];
}

// ==================== 방어 계산 ====================

/**
 * 방어 계산 입력
 */
export interface BlockInput {
  /** 기본 방어량 */
  baseBlock: number;
  /** 사용자 토큰 상태 */
  userTokens: UnifiedTokenState;
  /** 추가 수정자 */
  modifiers?: DamageModifier[];
}

/**
 * 방어 계산 결과
 */
export interface BlockResult {
  /** 최종 방어량 */
  finalBlock: number;
  /** 적용된 수정자 */
  modifiersApplied: string[];
  /** 소모된 토큰 */
  tokensConsumed: Array<{ tokenId: string; amount: number }>;
  /** 계산 로그 */
  logs: string[];
}

// ==================== 효과 시스템 ====================

/**
 * 전투 상태 (공통 인터페이스)
 */
export interface UnifiedCombatantState {
  hp: number;
  maxHp: number;
  block: number;
  tokens: UnifiedTokenState;
  ether?: number;
  energy?: number;
}

/**
 * 효과 컨텍스트
 */
export interface EffectContext {
  /** 효과 사용자 상태 */
  actor: UnifiedCombatantState;
  /** 효과 대상 상태 */
  target: UnifiedCombatantState;
  /** 효과 발동 카드 (선택적) */
  cardId?: string;
  /** 타임라인 위치 */
  position?: number;
  /** 현재 턴 */
  turn?: number;
}

/**
 * 효과 결과
 */
export interface EffectResult {
  /** 성공 여부 */
  success: boolean;
  /** 효과 사용자 상태 변경 */
  actorChanges: Partial<UnifiedCombatantState>;
  /** 효과 대상 상태 변경 */
  targetChanges: Partial<UnifiedCombatantState>;
  /** 효과 로그 */
  logs: string[];
  /** 추가 효과 트리거 */
  triggeredEffects?: string[];
}

// ==================== 유틸리티 타입 ====================

/**
 * 토큰 수정자 배율 묶음
 */
export interface TokenModifiers {
  /** 공격 배율 */
  attackMultiplier: number;
  /** 추가 피해 */
  damageBonus: number;
  /** 방어 배율 */
  defenseMultiplier: number;
  /** 받는 피해 배율 */
  damageTakenMultiplier: number;
  /** 회피 확률 */
  dodgeChance: number;
  /** 치명타 확률 보너스 */
  critChanceBonus: number;
  /** 치명타 배율 보너스 */
  critMultiplierBonus: number;
}

/**
 * 기본 토큰 수정자 (1.0 = 변화 없음)
 */
export const DEFAULT_TOKEN_MODIFIERS: TokenModifiers = {
  attackMultiplier: 1.0,
  damageBonus: 0,
  defenseMultiplier: 1.0,
  damageTakenMultiplier: 1.0,
  dodgeChance: 0,
  critChanceBonus: 0,
  critMultiplierBonus: 0,
};

// ==================== 설정 ====================

/**
 * 공통 코어 활성화 플래그
 * 점진적 마이그레이션을 위한 피처 플래그
 */
export const UNIFIED_CORE_FLAGS = {
  /** 토큰 코어 사용 */
  useTokenCore: true,
  /** 피해 계산 코어 사용 */
  useDamageCore: true,
  /** 효과 코어 사용 */
  useEffectCore: true,
} as const;
