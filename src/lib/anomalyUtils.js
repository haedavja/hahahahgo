/**
 * @file anomalyUtils.js
 * @description 이변 시스템 유틸리티
 *
 * ## 이변 시스템
 * - 발동 확률: mapRisk%
 * - 강도 레벨: mapRisk / 25 (최대 4)
 * - 보스전: 다중 이변 발동
 */

import { selectRandomAnomaly, selectMultipleAnomalies, ANOMALY_TYPES } from '../data/anomalies';
import { addToken } from './tokenUtils';
import { TOKENS } from '../data/tokens';

/**
 * 이변 발동 확률 체크
 * @param {number} mapRisk - 위험도 (0-100)
 * @returns {boolean} 이변 발동 여부
 */
export function checkAnomalyOccurrence(mapRisk) {
  const probability = mapRisk / 100;
  return Math.random() < probability;
}

/**
 * 이변 강도 레벨 계산
 * @param {number} mapRisk - 위험도 (0-100)
 * @returns {number} 이변 레벨 (1-4)
 */
export function getAnomalyLevel(mapRisk) {
  const level = Math.floor(mapRisk / 25);
  return Math.max(1, Math.min(4, level)); // 최소 1, 최대 4
}

/**
 * 전투 시작 시 이변 선택
 * @param {number} mapRisk - 위험도
 * @param {boolean} isBoss - 보스 전투 여부
 * @param {Array} devForcedAnomalies - 개발자 모드 강제 이변 [{ anomalyId, level }]
 * @returns {Array} 선택된 이변 배열 [{ anomaly, level }]
 */
export function selectBattleAnomalies(mapRisk, isBoss = false, devForcedAnomalies = null) {
  console.log('[selectBattleAnomalies]', { mapRisk, isBoss, devForcedAnomalies });

  // 개발자 모드: 강제 이변 적용
  if (devForcedAnomalies && devForcedAnomalies.length > 0) {
    console.log('[Dev Mode] Forcing anomalies:', devForcedAnomalies);
    return devForcedAnomalies.map(({ anomalyId, level }) => {
      const anomaly = Object.values(ANOMALY_TYPES).find(a => a.id === anomalyId);
      if (!anomaly) {
        console.warn(`[Dev Mode] Anomaly not found: ${anomalyId}`);
        return null;
      }
      return { anomaly, level };
    }).filter(Boolean); // Remove null entries
  }

  // 디버그: 임시로 항상 발동 (mapRisk >= 50일 때)
  const forceOccur = mapRisk >= 50;

  // 이변 발동 체크
  const willOccur = forceOccur || checkAnomalyOccurrence(mapRisk);
  console.log('[Anomaly Occurrence Check]', { mapRisk, probability: mapRisk / 100, willOccur, forceOccur });

  if (!willOccur) {
    console.log('[Anomaly] Not occurring');
    return [];
  }

  const level = getAnomalyLevel(mapRisk);
  console.log('[Anomaly Level]', { mapRisk, level });

  if (isBoss) {
    // 보스 전투: 여러 개 발동 가능 (레벨에 따라 1-3개)
    const count = Math.max(1, Math.min(3, Math.floor(level / 2) + 1));
    const anomalies = selectMultipleAnomalies(count);
    return anomalies.map(anomaly => ({ anomaly, level }));
  } else {
    // 일반 전투: 1개만 발동
    const anomaly = selectRandomAnomaly();
    return [{ anomaly, level }];
  }
}

/**
 * 이변 효과를 플레이어 상태에 적용
 * @param {Array} anomalies - 이변 배열 [{ anomaly, level }]
 * @param {Object} playerState - 플레이어 초기 상태
 * @param {Object} gameState - 게임 전체 상태 (gameStore)
 * @returns {Object} { player: 수정된 플레이어 상태, logs: 로그 배열 }
 */
export function applyAnomalyEffects(anomalies, playerState, gameState) {
  if (!anomalies || anomalies.length === 0) {
    return { player: playerState, logs: [] };
  }

  let player = { ...playerState };
  const logs = [];

  anomalies.forEach(({ anomaly, level }) => {
    const effect = anomaly.getEffect(level);
    logs.push(`${anomaly.emoji} ${anomaly.name} (Lv.${level}): ${effect.description}`);

    switch (effect.type) {
      case 'ETHER_BAN':
        // 에테르 획득 불가 플래그 설정
        player.etherBan = true;
        break;

      case 'ENERGY_REDUCTION':
        // 최대 행동력 감소
        player.energyPenalty = (player.energyPenalty || 0) + effect.value;
        break;

      case 'SPEED_REDUCTION':
        // 최대 속도 감소
        player.speedPenalty = (player.speedPenalty || 0) + effect.value;
        break;

      case 'DRAW_REDUCTION':
        // 뽑기 확률 감소
        player.drawPenalty = (player.drawPenalty || 0) + effect.value;
        break;

      case 'INSIGHT_REDUCTION':
        // 통찰 감소
        player.insightPenalty = (player.insightPenalty || 0) + effect.value;
        break;

      case 'VALUE_DOWN':
        // 공격력/방어력 감소 토큰 추가
        for (let i = 0; i < effect.value; i++) {
          // 공격 감소 토큰 (무딤)
          const dullToken = TOKENS.find(t => t.id === 'dull');
          if (dullToken) {
            const addResult = addToken(player, dullToken.id, 1);
            player.tokens = addResult.tokens;
          }

          // 방어 감소 토큰 (흔들림)
          const shakenToken = TOKENS.find(t => t.id === 'shaken');
          if (shakenToken) {
            const addResult = addToken(player, shakenToken.id, 1);
            player.tokens = addResult.tokens;
          }
        }
        break;

      default:
        console.warn(`알 수 없는 이변 효과 타입: ${effect.type}`);
    }
  });

  return { player, logs };
}

/**
 * 이변 정보를 UI에 표시하기 위한 포맷으로 변환
 * @param {Array} anomalies - 이변 배열 [{ anomaly, level }]
 * @returns {Array} UI 표시용 배열
 */
export function formatAnomaliesForDisplay(anomalies) {
  return anomalies.map(({ anomaly, level }) => ({
    id: anomaly.id,
    name: anomaly.name,
    emoji: anomaly.emoji,
    color: anomaly.color,
    level,
    effect: anomaly.getEffect(level),
    description: anomaly.description
  }));
}

/**
 * 이변으로 인한 스탯 패널티를 실제 값에 적용
 * @param {Object} player - 플레이어 상태
 * @param {number} baseEnergy - 기본 행동력
 * @param {number} baseSpeed - 기본 속도
 * @param {number} baseInsight - 기본 통찰
 * @returns {Object} { energy, speed, insight }
 */
export function applyAnomalyPenalties(player, baseEnergy, baseSpeed, baseInsight) {
  const energy = Math.max(0, baseEnergy - (player.energyPenalty || 0));
  const speed = Math.max(0, baseSpeed - (player.speedPenalty || 0));
  const insight = baseInsight - (player.insightPenalty || 0);

  return { energy, speed, insight };
}

/**
 * 뽑기 확률에 이변 패널티 적용
 * @param {number} baseDrawChance - 기본 뽑기 확률
 * @param {Object} player - 플레이어 상태
 * @returns {number} 수정된 뽑기 확률
 */
export function applyDrawPenalty(baseDrawChance, player) {
  const penalty = player.drawPenalty || 0;
  return Math.max(0, Math.min(1, baseDrawChance - penalty));
}
