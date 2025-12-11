/**
 * anomalyUtils.js
 *
 * 이변(Anomaly) 시스템 유틸리티
 * 전투 중 발생하는 특수 상황을 처리
 */

// 전투에서 사용할 이변 선택
export function selectBattleAnomalies(mapRisk = 0, isBoss = false, devForcedAnomalies = []) {
  // 개발자 모드에서 강제 이변 설정
  if (devForcedAnomalies && devForcedAnomalies.length > 0) {
    return devForcedAnomalies;
  }

  // 기본적으로 이변 없음
  return [];
}

// 플레이어에게 이변 효과 적용
export function applyAnomalyEffects(anomalies = [], player = {}, gameState = {}) {
  if (!anomalies || anomalies.length === 0) {
    return player;
  }

  let modifiedPlayer = { ...player };

  anomalies.forEach(({ anomaly, level }) => {
    if (!anomaly || !anomaly.getEffect) return;

    const effect = anomaly.getEffect(level);
    if (!effect) return;

    // 패널티 적용
    if (effect.energyPenalty) {
      modifiedPlayer.maxEnergy = Math.max(1, (modifiedPlayer.maxEnergy || 6) - effect.energyPenalty);
    }
    if (effect.speedPenalty) {
      modifiedPlayer.maxSpeed = Math.max(5, (modifiedPlayer.maxSpeed || 30) - effect.speedPenalty);
    }
    if (effect.drawPenalty) {
      modifiedPlayer.drawCount = Math.max(1, (modifiedPlayer.drawCount || 5) - effect.drawPenalty);
    }
    if (effect.insightPenalty) {
      modifiedPlayer.insightPenalty = (modifiedPlayer.insightPenalty || 0) + effect.insightPenalty;
    }
    if (effect.etherBan) {
      modifiedPlayer.etherBan = true;
    }
  });

  return modifiedPlayer;
}

// 이변 정보를 표시용으로 포맷
export function formatAnomaliesForDisplay(anomalies = []) {
  if (!anomalies || anomalies.length === 0) {
    return [];
  }

  return anomalies.map(({ anomaly, level }) => ({
    name: anomaly?.name || '알 수 없는 이변',
    emoji: anomaly?.emoji || '⚠️',
    level,
    description: anomaly?.getEffect?.(level)?.description || ''
  }));
}
