/**
 * @file enemyPatterns.js
 * @description 몬스터별 행동 패턴 정의
 * @typedef {import('../types').Enemy} Enemy
 *
 * 동시턴제에서 플레이어가 패턴을 읽고 대응하는 재미 제공
 *
 * ## 패턴 타입
 * - cycle: 고정 순환 (턴 % 패턴길이)
 * - phase: HP 기반 페이즈 전환
 * - random: 랜덤 (기본값)
 *
 * 상세 계획: docs/AI_IMPROVEMENT_PLAN.md 참조
 */

// =====================
// 패턴 타입 설명
// =====================
// 'cycle': 고정 순환 패턴 (턴 % 패턴길이)
// 'phase': HP 기반 페이즈 전환
// 'random': 기존 랜덤 (패턴 미지정 시 기본값)

export const ENEMY_PATTERNS = {
  // =====================
  // Tier 1 일반 몬스터
  // =====================

  // 구울 - 공격적인 언데드, 2공격 1방어
  // 패턴: ⚔️ ⚔️ 🛡️ (공격 공격 방어)
  // 플레이어 전략: 3턴마다 방어할 때 강하게 공격
  'ghoul': {
    type: 'cycle',
    pattern: ['attack', 'attack', 'defense'],
    description: '2연속 공격 후 방어'
  },

  // 약탈자 - 신중한 인간, 공격과 방어 교대
  // 패턴: ⚔️ 🛡️ (공격 방어)
  // 플레이어 전략: 짝수턴에 공격, 홀수턴에 방어
  'marauder': {
    type: 'cycle',
    pattern: ['attack', 'defense'],
    description: '공격과 방어 교대'
  },

  // 슬러심 - 디버프 로테이션
  // 패턴: 🔥 💔 🔽 (화상 취약 무딤)
  // 플레이어 전략: 화상턴에 방어 집중, 취약 전에 공격
  'slurthim': {
    type: 'cycle',
    pattern: ['debuff_burn', 'debuff_vulnerable', 'debuff_dull'],
    description: '화상 → 취약 → 무딤 로테이션'
  },

  // =====================
  // Tier 2 중급 몬스터
  // =====================

  // 탈영병 - 전술적 전투원, 버프 후 공격
  // 패턴: ✨ ⚔️ ⚔️ 🛡️ (기합 연속베기 베기 방패막기)
  // 플레이어 전략: 기합턴에 강공격, 공격 2연속 후 카운터
  'deserter': {
    type: 'cycle',
    pattern: ['buff', 'attack', 'attack', 'defense'],
    description: '기합으로 강화 후 2연속 공격, 방어'
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
      }
    },
    description: 'HP에 따라 페이즈 변경: 일반→충전→광폭화'
  }
};

/**
 * 패턴에서 현재 턴 행동 모드 가져오기
 * @param {string} enemyId - 적 ID
 * @param {number} turnNumber - 현재 턴 (1부터 시작)
 * @param {number} enemyHp - 현재 HP
 * @param {number} maxHp - 최대 HP
 * @returns {string|null} 'attack', 'defense', 또는 특수 행동명. 패턴 없으면 null
 */
// 패턴 타입 정의
interface CyclePattern {
  type: 'cycle';
  pattern: string[];
  description: string;
}

interface PhasePattern {
  type: 'phase';
  phases: { hpThreshold: number; pattern: string[]; description: string }[];
  specialActions?: Record<string, { mode: string; showIntent?: string; useCard?: string; damage?: number; heal?: number; ignoreBlock?: boolean }>;
  description: string;
}

type EnemyPattern = CyclePattern | PhasePattern;
const patternsRecord = ENEMY_PATTERNS as Record<string, EnemyPattern>;

export function getPatternAction(enemyId: string, turnNumber: number, enemyHp: number, maxHp: number): string | null {
  const config = patternsRecord[enemyId];
  if (!config) return null;

  if (config.type === 'cycle') {
    const index = (turnNumber - 1) % config.pattern.length;
    return config.pattern[index];
  }

  if (config.type === 'phase') {
    // maxHp가 0이면 100%로 처리 (0으로 나누기 방지)
    const hpPercent = maxHp > 0 ? (enemyHp / maxHp) * 100 : 100;
    // HP 임계값 이하인 페이즈 중 가장 낮은 것 선택
    const phase = [...config.phases]
      .sort((a, b) => a.hpThreshold - b.hpThreshold)
      .find(p => hpPercent <= p.hpThreshold);

    if (phase) {
      const index = (turnNumber - 1) % phase.pattern.length;
      return phase.pattern[index];
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

export function patternActionToMode(action: string, config: EnemyPattern | null): ActionMode {
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

    // 방어 계열
    'defense': { key: 'turtle', prefer: 'defense' },
    'charging': { key: 'turtle', prefer: 'defense' },
    'rest': { key: 'turtle', prefer: 'defense' },

    // 버프 계열 (방어적으로 행동하며 버프)
    'buff': { key: 'turtle', prefer: 'defense' },

    // 디버프 계열 (슬러심용)
    'debuff_burn': { key: 'balanced', prefer: 'mixed' },
    'debuff_vulnerable': { key: 'balanced', prefer: 'mixed' },
    'debuff_dull': { key: 'balanced', prefer: 'mixed' }
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
