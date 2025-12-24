/**
 * @file turnEndStateUpdate.js
 * @description 턴 종료 상태 업데이트 시스템
 *
 * ## 기능
 * - 조합 사용 카운트 업데이트
 * - 플레이어/적 턴 종료 상태 생성
 * - 에테르/디플레이션 상태 반영
 */

/**
 * 조합 사용 카운트 업데이트
 * @param {Object} currentUsageCount - 현재 사용 카운트
 * @param {Object} combo - 조합 정보 (name 속성 포함)
 * @param {Array} queue - 액션 큐 (카드 사용 추적용)
 * @param {string} actorFilter - 필터링할 actor ('player' 또는 'enemy')
 * @returns {Object} 업데이트된 사용 카운트
 */
export function updateComboUsageCount(currentUsageCount, combo, queue = [], actorFilter = 'player') {
  const newUsageCount = { ...(currentUsageCount || {}) };

  // 조합 사용 횟수 증가
  if (combo?.name) {
    newUsageCount[combo.name] = (newUsageCount[combo.name] || 0) + 1;
  }

  // 플레이어인 경우 각 카드 사용 횟수 증가 (숙련 특성용)
  if (actorFilter === 'player') {
    queue.forEach(action => {
      if (action.actor === actorFilter && action.card?.id) {
        newUsageCount[action.card.id] = (newUsageCount[action.card.id] || 0) + 1;
      }
    });
  }

  return newUsageCount;
}

/**
 * 턴 종료 시 플레이어 상태 업데이트 객체 생성
 * @param {Object} player - 현재 플레이어 상태
 * @param {Object} params - 업데이트 파라미터
 * @returns {Object} 업데이트된 플레이어 상태
 */
export function createTurnEndPlayerState(player, { comboUsageCount, etherPts, etherOverflow, etherMultiplier = 1 }) {
  return {
    ...player,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    vulnTurns: 0,
    etherOverdriveActive: false,
    comboUsageCount,
    etherPts: Math.max(0, etherPts),
    etherOverflow: (player.etherOverflow || 0) + (etherOverflow || 0),
    etherMultiplier
  };
}

/**
 * 턴 종료 시 적 상태 업데이트 객체 생성
 * @param {Object} enemy - 현재 적 상태
 * @param {Object} params - 업데이트 파라미터
 * @returns {Object} 업데이트된 적 상태
 */
export function createTurnEndEnemyState(enemy, { comboUsageCount, etherPts }) {
  // 개별 유닛의 block도 초기화
  const units = enemy.units || [];
  const resetUnits = units.length > 0
    ? units.map(u => ({ ...u, block: 0 }))
    : units;

  return {
    ...enemy,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    vulnTurns: 0,
    etherOverdriveActive: false,
    comboUsageCount,
    etherPts: Math.max(0, etherPts),
    units: resetUnits
  };
}

/**
 * 승리 조건 확인
 * @param {Object} enemy - 적 상태
 * @param {number} enemyEtherPts - 적 에테르 포인트
 * @returns {Object} { isVictory, isEtherVictory, delay }
 */
export function checkVictoryCondition(enemy, enemyEtherPts) {
  const isEtherVictory = enemyEtherPts <= 0;
  const isHpVictory = enemy.hp <= 0;
  const isVictory = isHpVictory || isEtherVictory;
  const delay = isEtherVictory ? 1200 : 500;

  return {
    isVictory,
    isEtherVictory,
    delay
  };
}
