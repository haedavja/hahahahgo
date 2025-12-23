/**
 * enemyPatterns.js
 *
 * 몬스터별 행동 패턴 정의
 * 동시턴제에서 플레이어가 패턴을 읽고 대응하는 재미 제공
 *
 * TODO: AI 개선 작업 시 이 파일 확장
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
  // 일반 몬스터
  // =====================

  // 예시: 고블린 - 2공격 1방어 반복
  // 'goblin': {
  //   type: 'cycle',
  //   pattern: ['attack', 'attack', 'defense'],
  //   description: '2연속 공격 후 방어'
  // },

  // 예시: 슬라임 - 방어 후 공격
  // 'slime': {
  //   type: 'cycle',
  //   pattern: ['defense', 'attack'],
  //   description: '방어 후 공격 반복'
  // },

  // =====================
  // 보스 몬스터
  // =====================

  // 예시: 드래곤 보스 - HP 페이즈 시스템
  // 'boss_dragon': {
  //   type: 'phase',
  //   phases: [
  //     { hpThreshold: 100, pattern: ['attack', 'attack', 'defense'] },
  //     { hpThreshold: 50, pattern: ['charging', 'big_attack', 'rest'] },
  //     { hpThreshold: 25, pattern: ['rage', 'rage'] }
  //   ],
  //   specialActions: {
  //     'charging': { mode: 'turtle', showIntent: '⚡ 힘을 모으는 중...' },
  //     'big_attack': { mode: 'aggro', damage: 50, showIntent: '💥 강력한 공격!' },
  //     'rage': { mode: 'aggro', ignoreBlock: true, showIntent: '🔥 분노!' },
  //     'rest': { mode: 'turtle', heal: 10, showIntent: '💤 휴식' }
  //   }
  // }
};

/**
 * 패턴에서 현재 턴 행동 모드 가져오기
 * @param {string} enemyId - 적 ID
 * @param {number} turnNumber - 현재 턴 (1부터 시작)
 * @param {number} enemyHp - 현재 HP
 * @param {number} maxHp - 최대 HP
 * @returns {string|null} 'attack', 'defense', 또는 특수 행동명. 패턴 없으면 null
 */
export function getPatternAction(enemyId, turnNumber, enemyHp, maxHp) {
  const config = ENEMY_PATTERNS[enemyId];
  if (!config) return null;

  if (config.type === 'cycle') {
    const index = (turnNumber - 1) % config.pattern.length;
    return config.pattern[index];
  }

  if (config.type === 'phase') {
    const hpPercent = (enemyHp / maxHp) * 100;
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
export function patternActionToMode(action, config) {
  // 특수 행동 확인
  if (config?.specialActions?.[action]) {
    const special = config.specialActions[action];
    return {
      key: special.mode === 'aggro' ? 'aggro' : 'turtle',
      prefer: special.mode === 'aggro' ? 'attack' : 'defense',
      special: action,
      intent: special.showIntent
    };
  }

  // 기본 행동
  if (action === 'attack' || action === 'big_attack' || action === 'rage') {
    return { key: 'aggro', prefer: 'attack' };
  }
  if (action === 'defense' || action === 'charging' || action === 'rest') {
    return { key: 'turtle', prefer: 'defense' };
  }

  return { key: 'balanced', prefer: 'mixed' };
}

/**
 * 다음 턴 의도 미리보기 (플레이어에게 힌트 제공)
 * @param {string} enemyId - 적 ID
 * @param {number} turnNumber - 현재 턴
 * @param {number} enemyHp - 현재 HP
 * @param {number} maxHp - 최대 HP
 * @returns {Object|null} { type, icon, text } 또는 null
 */
export function getNextTurnIntent(enemyId, turnNumber, enemyHp, maxHp) {
  const nextAction = getPatternAction(enemyId, turnNumber + 1, enemyHp, maxHp);
  if (!nextAction) return null;

  const config = ENEMY_PATTERNS[enemyId];
  const special = config?.specialActions?.[nextAction];

  if (special?.showIntent) {
    return {
      type: nextAction,
      icon: special.showIntent.split(' ')[0],
      text: special.showIntent
    };
  }

  // 기본 의도 아이콘
  const defaultIntents = {
    'attack': { type: 'attack', icon: '⚔️', text: '공격' },
    'defense': { type: 'defense', icon: '🛡️', text: '방어' },
    'charging': { type: 'charging', icon: '⚡', text: '충전' },
    'big_attack': { type: 'big_attack', icon: '💥', text: '강공격' },
    'rage': { type: 'rage', icon: '🔥', text: '분노' },
    'rest': { type: 'rest', icon: '💤', text: '휴식' }
  };

  return defaultIntents[nextAction] || { type: 'unknown', icon: '❓', text: '???' };
}
