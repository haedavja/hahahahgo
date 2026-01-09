/**
 * @file enemyPatterns.ts
 * @description 몬스터별 행동 패턴 정의
 *
 * 동시턴제에서 플레이어가 패턴을 읽고 대응하는 재미 제공
 *
 * ## 패턴 타입
 * - cycle: 고정 순환 (턴 % 패턴길이)
 * - weighted_cycle: 혼합형 (기본 패턴 + 변동성 + 스택 연동)
 * - phase: HP 기반 페이즈 전환
 * - random: 랜덤 (기본값)
 *
 * ## 스택 시스템
 * - 모든 몬스터가 스택을 보유
 * - 에테르 델타가 적에게 유리할 때 스택 획득
 * - 스택 효과 타입: A(임계점), B(누적), D(변환), F(시한폭탄)
 *
 * 상세 계획: docs/AI_IMPROVEMENT_PLAN.md 참조
 */

import type { StackConfig } from '../types/enemy';

// =====================
// 패턴 타입 설명
// =====================
// 'cycle': 고정 순환 패턴 (턴 % 패턴길이)
// 'weighted_cycle': 혼합형 (기본 패턴 + variance 확률로 이탈)
// 'phase': HP 기반 페이즈 전환
// 'random': 기존 랜덤 (패턴 미지정 시 기본값)

// =====================
// 몬스터별 스택 설정
// =====================
export const ENEMY_STACK_CONFIGS: Record<string, StackConfig> = {
  // === F형 (시한폭탄) - 매턴 자동 증가 ===
  ghoul: {
    type: 'F',
    autoGain: 1,
    threshold: 15,
    effect: {
      damage: 20,
      forcedAction: 'soul_devour'
    }
  },
  polluted: {
    type: 'F',
    autoGain: 2,
    threshold: 10,
    effect: {
      damage: 45,  // 자폭 3배 (15 * 3)
      forcedAction: 'mega_explode'
    }
  },

  // === B형 (누적 버프) - 스택당 지속 버프 ===
  marauder: {
    type: 'B',
    attackPerStack: 1,
    threshold: 10,
    effect: {
      selfTokens: [{ id: 'offense', stacks: 2 }],
      forcedAction: 'rage_burst'
    }
  },
  berserker: {
    type: 'B',
    attackPerStack: 2,
    threshold: 10,
    effect: {
      selfTokens: [{ id: 'offense', stacks: 3 }, { id: 'frenzy', stacks: 1 }],
      forcedAction: 'berserk_rage'
    }
  },

  // === D형 (변환) - 5스택 소모하여 특수 효과 ===
  deserter: {
    type: 'D',
    consumeAmount: 5,
    threshold: 5,
    effect: {
      block: 15,
      forcedAction: 'fortify_stance'
    }
  },
  wildrat: {
    type: 'D',
    consumeAmount: 5,
    threshold: 5,
    effect: {
      forcedAction: 'extra_attack'
    }
  },
  slurthim: {
    type: 'D',
    consumeAmount: 5,
    threshold: 5,
    effect: {
      playerTokens: [{ id: 'burn', stacks: 1 }, { id: 'vulnerable', stacks: 1 }],
      forcedAction: 'acid_burst'
    }
  },

  // === A형 (임계점 폭발) - 엘리트/보스 ===
  hunter: {
    type: 'A',
    threshold: 10,
    effect: {
      selfTokens: [{ id: 'crit_boost', stacks: 2 }],
      forcedAction: 'execute'
    }
  },
  slaughterer: {
    type: 'A',
    threshold: 10,
    effect: {
      selfTokens: [{ id: 'offense', stacks: 3 }],
      forcedAction: 'execution_ready'
    }
  },
  captain: {
    type: 'A',
    attackPerStack: 1,  // A+B 혼합
    threshold: 10,
    effect: {
      selfTokens: [{ id: 'offense', stacks: 2 }, { id: 'defense', stacks: 2 }, { id: 'strength', stacks: 1 }],
      forcedAction: 'commanders_might'
    }
  }
};

export const ENEMY_PATTERNS = {
  // =====================
  // Tier 1 일반 몬스터
  // =====================

  // 구울 - 공격적인 언데드, 2공격 1방어
  // 패턴: ⚔️ ⚔️ 🛡️ (공격 공격 방어)
  // 플레이어 전략: 3턴마다 방어할 때 강하게 공격, 스택 15 전에 처치
  'ghoul': {
    type: 'weighted_cycle',
    pattern: ['attack', 'attack', 'defense'],
    variance: 0.2,  // 20% 확률로 패턴 이탈
    fallbackWeights: { attack: 70, defense: 30 },
    description: '2연속 공격 후 방어 (F형 스택: 매턴+1, 15스택→고정 20피해)'
  },

  // 약탈자 - 신중한 인간, 공격과 방어 교대
  // 패턴: ⚔️ 🛡️ (공격 방어)
  // 플레이어 전략: 짝수턴에 공격, 홀수턴에 방어
  'marauder': {
    type: 'weighted_cycle',
    pattern: ['attack', 'defense'],
    variance: 0.3,  // 30% 확률로 패턴 이탈
    fallbackWeights: { attack: 60, defense: 40 },
    description: '공격과 방어 교대 (B형 스택: 스택당 공격+1)'
  },

  // 슬러심 - 디버프 로테이션
  // 패턴: 🔥 💔 🔽 (화상 취약 무딤)
  // 플레이어 전략: 화상턴에 방어 집중, 취약 전에 공격
  'slurthim': {
    type: 'weighted_cycle',
    pattern: ['debuff_burn', 'debuff_vulnerable', 'debuff_dull'],
    variance: 0.1,  // 10% 확률로 패턴 이탈
    fallbackWeights: { attack: 20, defense: 20, special: 60 },
    description: '화상 → 취약 → 무딤 로테이션 (D형 스택: 5스택→디버프 2개)'
  },

  // =====================
  // Tier 2 중급 몬스터
  // =====================

  // 탈영병 - 전술적 전투원, 버프 후 공격
  // 패턴: ✨ ⚔️ ⚔️ 🛡️ (기합 연속베기 베기 방패막기)
  // 플레이어 전략: 기합턴에 강공격, 공격 2연속 후 카운터
  'deserter': {
    type: 'weighted_cycle',
    pattern: ['buff', 'attack', 'attack', 'defense'],
    variance: 0.25,  // 25% 확률로 패턴 이탈
    fallbackWeights: { attack: 50, defense: 40, special: 10 },
    description: '기합으로 강화 후 2연속 공격, 방어 (D형 스택: 5스택→방어막15)'
  },

  // =====================
  // Tier 3 보스 몬스터
  // =====================

  // 살육자 - HP 페이즈 시스템
  // Phase 1 (100-50%): 빠른 공격 위주
  // Phase 2 (50-25%): 흐릿함으로 방어하면서 처형 준비
  // Phase 3 (25% 이하): 연속 처형 (방어무시 강공격)
  'slaughterer': {
    type: 'phase',
    variance: 0.15,  // 15% 확률로 페이즈 내 패턴 이탈
    fallbackWeights: { attack: 60, defense: 30, special: 10 },
    phases: [
      {
        hpThreshold: 100,
        pattern: ['attack', 'attack', 'defense'],
        description: '일반 공세'
      },
      {
        hpThreshold: 50,
        pattern: ['charging', 'big_attack', 'rest'],
        description: '충전 후 처형, 휴식'
      },
      {
        hpThreshold: 25,
        pattern: ['rage', 'rage'],
        description: '광폭화 - 연속 처형'
      }
    ],
    specialActions: {
      'charging': {
        mode: 'turtle',
        showIntent: '⚡ 힘을 모으는 중...',
        useCard: 'slaughterer_blur_block'
      },
      'big_attack': {
        mode: 'aggro',
        damage: 15,
        showIntent: '💥 처형!',
        useCard: 'slaughterer_heavy'
      },
      'rage': {
        mode: 'aggro',
        ignoreBlock: true,
        showIntent: '🔥 광폭화!',
        useCard: 'slaughterer_heavy'
      },
      'rest': {
        mode: 'turtle',
        heal: 5,
        showIntent: '💤 휴식',
        useCard: 'slaughterer_rest'
      },
      'execution_ready': {
        mode: 'aggro',
        showIntent: '⚔️ 처형 준비!',
        useCard: 'slaughterer_heavy'
      }
    },
    description: 'HP에 따라 페이즈 변경: 일반→충전→광폭화 (A형 스택: 10스택→처형 강화)'
  },

  // =====================
  // 1막 신규 몬스터
  // =====================

  // 들쥐 - 빠르고 약함, 떼공격 위주
  // 패턴: 🐀 🐀 🐀 🛡️ (물기 물기 떼공격 도주)
  // 플레이어 전략: 광역기로 빠르게 정리
  'wildrat': {
    type: 'weighted_cycle',
    pattern: ['attack', 'attack', 'swarm', 'defense'],
    variance: 0.4,  // 40% 확률로 패턴 이탈 (야수라 예측 어려움)
    fallbackWeights: { attack: 70, defense: 20, special: 10 },
    description: '연속 공격 후 도주 (D형 스택: 5스택→추가 공격)'
  },

  // 폭주자 - 공격적, 버프 후 강공격
  // 패턴: 🔥 ⚔️ ⚔️ (분노 돌진 내려찍기)
  // 플레이어 전략: 분노턴에 강하게 공격, 이후 방어
  'berserker': {
    type: 'weighted_cycle',
    pattern: ['buff', 'attack', 'attack'],
    variance: 0.15,  // 15% 확률로 패턴 이탈 (광폭화라 예측 가능)
    fallbackWeights: { attack: 80, defense: 10, special: 10 },
    description: '분노로 강화 후 연속 공격 (B형 스택: 스택당 공격+2)'
  },

  // 오염체 - 독 뿌리다 자폭
  // 패턴: ☠️ ☠️ 🛡️ 💥 (독침 독침 독안개 자폭)
  // 플레이어 전략: 자폭 전에 처치하거나 방어 준비
  'polluted': {
    type: 'weighted_cycle',
    pattern: ['debuff_poison', 'debuff_poison', 'defense', 'explode'],
    variance: 0.1,  // 10% 확률로 패턴 이탈 (자폭 예고)
    fallbackWeights: { attack: 30, defense: 30, special: 40 },
    description: '독 축적 후 자폭 (F형 스택: 매턴+2, 10스택→강화 자폭)'
  },

  // 현상금 사냥꾼 - 전술적, 조준 후 처형
  // 패턴: 🛡️ 🎯 ⚔️ 💥 (덫 조준 사격 처형사격)
  // 플레이어 전략: 조준턴에 공격, 처형 전 방어
  'hunter': {
    type: 'weighted_cycle',
    pattern: ['defense', 'buff', 'attack', 'big_attack'],
    variance: 0.2,  // 20% 확률로 패턴 이탈
    fallbackWeights: { attack: 50, defense: 30, special: 20 },
    description: '덫 설치 → 조준 → 사격 → 처형 (A형 스택: 10스택→확정 치명타)'
  },

  // 탈영병 대장 - HP 페이즈 시스템 보스
  // Phase 1 (100-60%): 일반 공격
  // Phase 2 (60-30%): 지휘로 버프, 방어 강화
  // Phase 3 (30% 이하): 군법처형 연발
  'captain': {
    type: 'phase',
    variance: 0.2,  // 20% 확률로 페이즈 내 패턴 이탈
    fallbackWeights: { attack: 50, defense: 40, special: 10 },
    phases: [
      {
        hpThreshold: 100,
        pattern: ['attack', 'attack', 'defense'],
        description: '일반 공세'
      },
      {
        hpThreshold: 60,
        pattern: ['command', 'attack', 'rally', 'defense'],
        description: '지휘 및 방어 강화'
      },
      {
        hpThreshold: 30,
        pattern: ['execution', 'execution', 'fortify'],
        description: '광폭화 - 군법처형 연발'
      }
    ],
    specialActions: {
      'command': {
        mode: 'turtle',
        showIntent: '📢 지휘!',
        useCard: 'captain_command'
      },
      'rally': {
        mode: 'turtle',
        showIntent: '🛡️ 집결!',
        useCard: 'captain_rally'
      },
      'execution': {
        mode: 'aggro',
        ignoreBlock: true,
        showIntent: '⚔️ 군법처형!',
        useCard: 'captain_execution'
      },
      'fortify': {
        mode: 'turtle',
        showIntent: '🛡️ 방어태세',
        useCard: 'captain_fortify'
      },
      'commanders_might': {
        mode: 'aggro',
        showIntent: '👑 지휘관의 위엄!',
        useCard: 'captain_execution'
      }
    },
    description: 'HP에 따라 페이즈 변경: 일반→지휘→광폭화 (A+B형 스택: 스택버프 + 10스택→토큰3개)'
  }
};

/**
 * 패턴에서 현재 턴 행동 모드 가져오기
 * @param {string} enemyId - 적 ID
 * @param {number} turnNumber - 현재 턴 (1부터 시작)
 * @param {number} enemyHp - 현재 HP
 * @param {number} maxHp - 최대 HP
 * @param {number} stackCount - 현재 스택 수 (스택 강제 행동 체크용)
 * @returns {string|null} 'attack', 'defense', 또는 특수 행동명. 패턴 없으면 null
 */

// 패턴 타입 정의
interface FallbackWeights {
  attack: number;
  defense: number;
  special?: number;
}

interface CyclePattern {
  type: 'cycle';
  pattern: string[];
  description: string;
}

interface WeightedCyclePattern {
  type: 'weighted_cycle';
  pattern: string[];
  variance: number;  // 0~1, 패턴 이탈 확률
  fallbackWeights: FallbackWeights;
  description: string;
}

interface PhasePattern {
  type: 'phase';
  variance?: number;  // 0~1, 페이즈 내 패턴 이탈 확률
  fallbackWeights?: FallbackWeights;
  phases: { hpThreshold: number; pattern: string[]; description: string }[];
  specialActions?: Record<string, { mode: string; showIntent?: string; useCard?: string; damage?: number; heal?: number; ignoreBlock?: boolean }>;
  description: string;
}

type EnemyPatternType = CyclePattern | WeightedCyclePattern | PhasePattern;
const patternsRecord = ENEMY_PATTERNS as Record<string, EnemyPatternType>;

/**
 * 가중치 기반 랜덤 행동 선택
 */
function selectByWeight(weights: FallbackWeights): string {
  const total = weights.attack + weights.defense + (weights.special || 0);
  const rand = Math.random() * total;

  if (rand < weights.attack) return 'attack';
  if (rand < weights.attack + weights.defense) return 'defense';
  return 'special';
}

export function getPatternAction(
  enemyId: string,
  turnNumber: number,
  enemyHp: number,
  maxHp: number,
  stackCount: number = 0
): string | null {
  const config = patternsRecord[enemyId];
  if (!config) return null;

  // 스택 강제 행동 체크
  const stackConfig = ENEMY_STACK_CONFIGS[enemyId];
  if (stackConfig && stackCount >= stackConfig.threshold) {
    if (stackConfig.effect.forcedAction) {
      return stackConfig.effect.forcedAction;
    }
  }

  // cycle 타입 (하위 호환)
  if (config.type === 'cycle') {
    const index = (turnNumber - 1) % config.pattern.length;
    return config.pattern[index];
  }

  // weighted_cycle 타입 (혼합형)
  if (config.type === 'weighted_cycle') {
    const index = (turnNumber - 1) % config.pattern.length;
    const baseAction = config.pattern[index];

    // variance 확률로 패턴 이탈
    if (Math.random() < config.variance) {
      return selectByWeight(config.fallbackWeights);
    }

    return baseAction;
  }

  // phase 타입
  if (config.type === 'phase') {
    // maxHp가 0이면 100%로 처리 (0으로 나누기 방지)
    const hpPercent = maxHp > 0 ? (enemyHp / maxHp) * 100 : 100;
    // HP 임계값 이하인 페이즈 중 가장 낮은 것 선택
    const phase = [...config.phases]
      .sort((a, b) => a.hpThreshold - b.hpThreshold)
      .find(p => hpPercent <= p.hpThreshold);

    if (phase) {
      const index = (turnNumber - 1) % phase.pattern.length;
      const baseAction = phase.pattern[index];

      // variance가 있으면 패턴 이탈 가능
      if (config.variance && config.fallbackWeights && Math.random() < config.variance) {
        return selectByWeight(config.fallbackWeights);
      }

      return baseAction;
    }
  }

  return null;
}

/**
 * 패턴 행동을 AI 모드로 변환
 * @param {string} action - 패턴 행동명
 * @param {Object} config - 몬스터 패턴 설정
 * @returns {Object} { key, prefer, special }
 */
type ActionMode = { key: string; prefer: string; special?: string; intent?: string; useCard?: string };

export function patternActionToMode(action: string, config: EnemyPatternType | null): ActionMode {
  // 특수 행동 확인
  const phaseConfig = config as { specialActions?: Record<string, { mode: string; showIntent?: string; useCard?: string }> } | null;
  if (phaseConfig?.specialActions?.[action]) {
    const special = phaseConfig.specialActions[action];
    return {
      key: special.mode === 'aggro' ? 'aggro' : 'turtle',
      prefer: special.mode === 'aggro' ? 'attack' : 'defense',
      special: action,
      intent: special.showIntent,
      useCard: special.useCard
    };
  }

  // 기본 행동 매핑
  const actionModes: Record<string, { key: string; prefer: string }> = {
    // 공격 계열
    'attack': { key: 'aggro', prefer: 'attack' },
    'big_attack': { key: 'aggro', prefer: 'attack' },
    'rage': { key: 'aggro', prefer: 'attack' },
    'special': { key: 'aggro', prefer: 'attack' },  // 가중치 선택 시

    // 방어 계열
    'defense': { key: 'turtle', prefer: 'defense' },
    'charging': { key: 'turtle', prefer: 'defense' },
    'rest': { key: 'turtle', prefer: 'defense' },

    // 버프 계열 (방어적으로 행동하며 버프)
    'buff': { key: 'turtle', prefer: 'defense' },

    // 디버프 계열 (슬러심용)
    'debuff_burn': { key: 'balanced', prefer: 'mixed' },
    'debuff_vulnerable': { key: 'balanced', prefer: 'mixed' },
    'debuff_dull': { key: 'balanced', prefer: 'mixed' },
    'debuff_poison': { key: 'balanced', prefer: 'mixed' },

    // 스택 강제 행동
    'soul_devour': { key: 'aggro', prefer: 'attack' },
    'mega_explode': { key: 'aggro', prefer: 'attack' },
    'rage_burst': { key: 'aggro', prefer: 'attack' },
    'berserk_rage': { key: 'aggro', prefer: 'attack' },
    'fortify_stance': { key: 'turtle', prefer: 'defense' },
    'extra_attack': { key: 'aggro', prefer: 'attack' },
    'acid_burst': { key: 'balanced', prefer: 'mixed' },
    'execute': { key: 'aggro', prefer: 'attack' },
    'execution_ready': { key: 'aggro', prefer: 'attack' },
    'commanders_might': { key: 'aggro', prefer: 'attack' },

    // 기타
    'swarm': { key: 'aggro', prefer: 'attack' },
    'explode': { key: 'aggro', prefer: 'attack' }
  };

  return actionModes[action] || { key: 'balanced', prefer: 'mixed' };
}

/**
 * 다음 턴 의도 미리보기 (플레이어에게 힌트 제공)
 * @param {string} enemyId - 적 ID
 * @param {number} turnNumber - 현재 턴
 * @param {number} enemyHp - 현재 HP
 * @param {number} maxHp - 최대 HP
 * @returns {Object|null} { type, icon, text } 또는 null
 */
type Intent = { type: string; icon: string; text: string };

export function getNextTurnIntent(enemyId: string, turnNumber: number, enemyHp: number, maxHp: number): Intent | null {
  const nextAction = getPatternAction(enemyId, turnNumber + 1, enemyHp, maxHp);
  if (!nextAction) return null;

  const config = patternsRecord[enemyId];
  const phaseConfig = config as { specialActions?: Record<string, { showIntent?: string }> } | undefined;
  const special = phaseConfig?.specialActions?.[nextAction];

  if (special?.showIntent) {
    return {
      type: nextAction,
      icon: special.showIntent.split(' ')[0],
      text: special.showIntent
    };
  }

  // 기본 의도 아이콘
  const defaultIntents: Record<string, Intent> = {
    'attack': { type: 'attack', icon: '⚔️', text: '공격' },
    'defense': { type: 'defense', icon: '🛡️', text: '방어' },
    'charging': { type: 'charging', icon: '⚡', text: '충전' },
    'big_attack': { type: 'big_attack', icon: '💥', text: '강공격' },
    'rage': { type: 'rage', icon: '🔥', text: '분노' },
    'rest': { type: 'rest', icon: '💤', text: '휴식' },
    'buff': { type: 'buff', icon: '✨', text: '강화' },
    'debuff_burn': { type: 'debuff', icon: '🔥', text: '화상' },
    'debuff_vulnerable': { type: 'debuff', icon: '💔', text: '취약' },
    'debuff_dull': { type: 'debuff', icon: '🔽', text: '무딤' }
  };

  return defaultIntents[nextAction] || { type: 'unknown', icon: '❓', text: '???' };
}

/**
 * 현재 페이즈 정보 가져오기 (보스용)
 * @param {string} enemyId - 적 ID
 * @param {number} enemyHp - 현재 HP
 * @param {number} maxHp - 최대 HP
 * @returns {Object|null} { phase, description, hpThreshold }
 */
type PhaseInfo = { phase: number; description: string; hpThreshold: number; pattern: string[] };

export function getCurrentPhase(enemyId: string, enemyHp: number, maxHp: number): PhaseInfo | null {
  const config = patternsRecord[enemyId];
  if (!config || config.type !== 'phase') return null;
  const phaseConfig = config as PhasePattern;

  // maxHp가 0이면 100%로 처리 (0으로 나누기 방지)
  const hpPercent = maxHp > 0 ? (enemyHp / maxHp) * 100 : 100;
  const phase = [...phaseConfig.phases]
    .sort((a, b) => a.hpThreshold - b.hpThreshold)
    .find(p => hpPercent <= p.hpThreshold);

  if (!phase) return null;

  return {
    phase: phaseConfig.phases.indexOf(phase) + 1,
    description: phase.description,
    hpThreshold: phase.hpThreshold,
    pattern: phase.pattern
  };
}
