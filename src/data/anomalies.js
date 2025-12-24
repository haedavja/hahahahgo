/**
 * @file anomalies.js
 * @description 이변(異變) 시스템 데이터
 *
 * ## 이변 시스템
 * - 발동 확률: mapRisk%
 * - 강도: Math.floor(mapRisk / 25), 최대 4레벨
 * - 일반 전투: 1개 발동
 * - 보스 전투: 여러 개 발동
 *
 * @typedef {Object} Anomaly
 * @property {string} id - 이변 ID
 * @property {string} name - 이름
 * @property {Object[]} effects - 레벨별 효과
 */

/**
 * 이변 타입 정의
 *
 * 발동 확률: mapRisk%
 * 강도 레벨: Math.floor(mapRisk / 25), 최대 4레벨
 * 일반 전투: 1개 발동
 * 보스 전투: 여러 개 발동 가능
 */

export const ANOMALY_TYPES = {
  DEFLATION_CURSE: {
    id: 'deflation_curse',
    name: '디플레이션의 저주',
    emoji: '💸',
    color: '#ef4444',
    description: '에테르 획득이 불가능합니다.',
    // 레벨과 관계없이 동일한 효과
    getEffect: (level) => ({
      type: 'ETHER_BAN',
      description: '이 전투에서 에테르를 획득할 수 없습니다.'
    })
  },

  ENERGY_DRAIN: {
    id: 'energy_drain',
    name: '활력 고갈',
    emoji: '🔋',
    color: '#f59e0b',
    description: '최대 행동력이 감소합니다.',
    getEffect: (level) => ({
      type: 'ENERGY_REDUCTION',
      value: level, // 레벨당 -1, 최대 -4
      description: `최대 행동력 -${level}`
    })
  },

  TIME_DISTORTION: {
    id: 'time_distortion',
    name: '시간 왜곡',
    emoji: '⏰',
    color: '#8b5cf6',
    description: '최대 속도가 감소합니다.',
    getEffect: (level) => ({
      type: 'SPEED_REDUCTION',
      value: level * 3, // 레벨당 -3, 최대 -12
      description: `최대 속도 -${level * 3}`
    })
  },

  DRAW_INTERFERENCE: {
    id: 'draw_interference',
    name: '뽑기 방해',
    emoji: '🎴',
    color: '#06b6d4',
    description: '뽑기 확률이 감소합니다.',
    getEffect: (level) => ({
      type: 'DRAW_REDUCTION',
      value: level * 0.1, // 레벨당 -10%, 최대 -40%
      description: `뽑기 확률 -${level * 10}%`
    })
  },

  COGNITIVE_FOG: {
    id: 'cognitive_fog',
    name: '인지 안개',
    emoji: '🌫️',
    color: '#64748b',
    description: '통찰이 감소합니다.',
    getEffect: (level) => ({
      type: 'INSIGHT_REDUCTION',
      value: level, // 레벨당 -1, 최대 -4
      description: `통찰 -${level}`
    })
  },

  VALUE_DOWN: {
    id: 'value_down',
    name: '가치 하락',
    emoji: '📉',
    color: '#dc2626',
    description: '공격력과 방어력이 감소합니다.',
    getEffect: (level) => ({
      type: 'VALUE_DOWN',
      value: level, // 레벨당 공격/방어 -10% 토큰 1개, 최대 4개
      description: `공격력/방어력 감소 토큰 ${level}개`
    })
  }
};

/**
 * 모든 이변 타입 배열
 */
export const ALL_ANOMALIES = Object.values(ANOMALY_TYPES);

/**
 * 이변 ID로 이변 데이터 가져오기
 */
export function getAnomalyById(id) {
  return ALL_ANOMALIES.find(anomaly => anomaly.id === id);
}

/**
 * 랜덤 이변 선택
 */
export function selectRandomAnomaly() {
  const index = Math.floor(Math.random() * ALL_ANOMALIES.length);
  return ALL_ANOMALIES[index];
}

/**
 * 보스 전투용 여러 이변 선택
 * @param {number} count - 선택할 이변 개수
 */
export function selectMultipleAnomalies(count) {
  // 중복 없이 랜덤 선택
  const shuffled = [...ALL_ANOMALIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, ALL_ANOMALIES.length));
}
