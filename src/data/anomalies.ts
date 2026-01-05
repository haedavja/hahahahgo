/**
 * @file anomalies.ts
 * @description 이변(異變) 시스템 데이터
 *
 * ## 이변 시스템
 * - 발동 확률: mapRisk%
 * - 강도: Math.floor(mapRisk / 25), 최대 4레벨
 * - 일반 전투: 1개 발동
 * - 보스 전투: 여러 개 발동
 */

import { shuffle } from '../lib/randomUtils';

/**
 * 이변 효과 타입
 */
export type AnomalyEffectType =
  | 'ETHER_BAN'
  | 'ENERGY_REDUCTION'
  | 'SPEED_REDUCTION'
  | 'DRAW_REDUCTION'
  | 'INSIGHT_REDUCTION'
  | 'VALUE_DOWN'
  | 'DEFENSE_BACKFIRE'    // 역류: 방어카드 자해
  | 'SPEED_INSTABILITY'   // 불안정: 속도 ±랜덤
  | 'VULNERABILITY'       // 취약: 받는 피해 증가
  | 'TRAIT_SILENCE'       // 침묵: 특성 비활성화
  | 'CHAIN_ISOLATION'     // 고립: 연계/후속 무효화
  | 'FINESSE_BLOCK';      // 광기: 기교 획득 불가

/**
 * 이변 효과 인터페이스
 */
export interface AnomalyEffect {
  type: AnomalyEffectType;
  description: string;
  value?: number;
}

/**
 * 이변 인터페이스
 */
export interface Anomaly {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  getEffect: (level: number) => AnomalyEffect;
}

export const ANOMALY_TYPES = {
  DEFLATION_CURSE: {
    id: 'deflation_curse',
    name: '디플레이션의 저주',
    emoji: '💸',
    color: '#ef4444',
    description: '에테르 획득이 불가능합니다.',
    // 레벨과 관계없이 동일한 효과
    getEffect: (level: number): AnomalyEffect => ({
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
    getEffect: (level: number): AnomalyEffect => ({
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
    getEffect: (level: number): AnomalyEffect => ({
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
    getEffect: (level: number): AnomalyEffect => ({
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
    getEffect: (level: number): AnomalyEffect => ({
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
    getEffect: (level: number): AnomalyEffect => ({
      type: 'VALUE_DOWN',
      value: level, // 레벨당 공격/방어 -10% 토큰 1개, 최대 4개
      description: `공격력/방어력 감소 토큰 ${level}개`
    })
  },

  // ==================== 신규 이변 ====================

  BACKFLOW: {
    id: 'backflow',
    name: '역류',
    emoji: '🔄',
    color: '#be185d',
    description: '방어 카드 사용 시 자해 피해를 입습니다.',
    getEffect: (level: number): AnomalyEffect => ({
      type: 'DEFENSE_BACKFIRE',
      value: level * 2, // 레벨당 2 자해, 최대 8
      description: `방어 카드 사용 시 ${level * 2} 자해 피해`
    })
  },

  INSTABILITY: {
    id: 'instability',
    name: '불안정',
    emoji: '🎲',
    color: '#7c3aed',
    description: '모든 카드의 속도가 무작위로 변동됩니다.',
    getEffect: (level: number): AnomalyEffect => ({
      type: 'SPEED_INSTABILITY',
      value: level, // 레벨당 ±1, 최대 ±4
      description: `카드 속도 ±${level} 랜덤 변동`
    })
  },

  VULNERABILITY: {
    id: 'vulnerability',
    name: '취약',
    emoji: '💔',
    color: '#e11d48',
    description: '받는 모든 피해가 증가합니다.',
    getEffect: (level: number): AnomalyEffect => ({
      type: 'VULNERABILITY',
      value: level * 10, // 레벨당 +10%, 최대 +40%
      description: `받는 피해 +${level * 10}%`
    })
  },

  SILENCE: {
    id: 'silence',
    name: '침묵',
    emoji: '🤐',
    color: '#475569',
    description: '카드의 특성 효과가 비활성화됩니다.',
    getEffect: (level: number): AnomalyEffect => ({
      type: 'TRAIT_SILENCE',
      value: level, // 레벨에 따라 비활성화 특성 수 증가 (1: 부정만, 2: 1성, 3: 2성, 4: 전부)
      description: level >= 4
        ? '모든 특성 비활성화'
        : `${level}성 이하 특성 비활성화`
    })
  },

  ISOLATION: {
    id: 'isolation',
    name: '고립',
    emoji: '🚫',
    color: '#0891b2',
    description: '연계와 후속 효과가 무효화됩니다.',
    getEffect: (level: number): AnomalyEffect => ({
      type: 'CHAIN_ISOLATION',
      value: level, // 레벨에 따라 효과 강도 (1: 연계만, 2: 후속만, 3: 둘 다, 4: 앞당김도)
      description: level >= 3
        ? '연계/후속 효과 완전 무효화'
        : level === 2 ? '후속 효과 무효화' : '연계 효과 무효화'
    })
  },

  MADNESS: {
    id: 'madness',
    name: '광기',
    emoji: '🌀',
    color: '#c026d3',
    description: '기교를 획득할 수 없습니다.',
    getEffect: (level: number): AnomalyEffect => ({
      type: 'FINESSE_BLOCK',
      value: level, // 레벨 1-2: 획득량 감소, 3-4: 완전 차단
      description: level >= 3
        ? '기교 획득 불가'
        : `기교 획득량 -${level * 25}%`
    })
  }
} as const satisfies Record<string, Anomaly>;

/**
 * 모든 이변 타입 배열
 */
export const ALL_ANOMALIES: Anomaly[] = Object.values(ANOMALY_TYPES);

/**
 * 이변 ID로 이변 데이터 가져오기
 */
export function getAnomalyById(id: string): Anomaly | undefined {
  return ALL_ANOMALIES.find((anomaly: Anomaly) => anomaly.id === id);
}

/**
 * 랜덤 이변 선택
 */
export function selectRandomAnomaly(): Anomaly {
  const index = Math.floor(Math.random() * ALL_ANOMALIES.length);
  return ALL_ANOMALIES[index];
}

/**
 * 보스 전투용 여러 이변 선택
 * @param count - 선택할 이변 개수
 */
export function selectMultipleAnomalies(count: number): Anomaly[] {
  // 중복 없이 랜덤 선택
  const shuffled = shuffle(ALL_ANOMALIES);
  return shuffled.slice(0, Math.min(count, ALL_ANOMALIES.length));
}
