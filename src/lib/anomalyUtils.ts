/**
 * @file anomalyUtils.ts
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

interface AnomalyEffect {
  type: string;
  value?: number;
  description: string;
}

interface Anomaly {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  getEffect: (level: number) => AnomalyEffect;
}

interface AnomalyWithLevel {
  anomaly: Anomaly;
  level: number;
}

interface ForcedAnomaly {
  anomalyId: string;
  level: number;
}

interface TokenState {
  usage: unknown[];
  turn: unknown[];
  permanent: unknown[];
  [key: string]: unknown[];
}

interface Player {
  hp?: number;
  maxHp?: number;
  tokens?: TokenState;
  etherBan?: boolean;
  energyPenalty?: number;
  speedPenalty?: number;
  drawPenalty?: number;
  insightPenalty?: number;
  [key: string]: unknown;
}

interface ApplyAnomalyResult {
  player: Player;
  logs: string[];
}

interface AnomalyDisplay {
  id: string;
  name: string;
  emoji: string;
  color: string;
  level: number;
  effect: AnomalyEffect;
  description: string;
}

interface PenaltyResult {
  energy: number;
  speed: number;
  insight: number;
}

/**
 * 이변 발동 확률 체크
 */
export function checkAnomalyOccurrence(mapRisk: number): boolean {
  const probability = mapRisk / 100;
  return Math.random() < probability;
}

/**
 * 이변 강도 레벨 계산
 */
export function getAnomalyLevel(mapRisk: number): number {
  const level = Math.floor(mapRisk / 25);
  return Math.max(1, Math.min(4, level)); // 최소 1, 최대 4
}

/**
 * 전투 시작 시 이변 선택
 */
export function selectBattleAnomalies(
  mapRisk: number,
  isBoss: boolean = false,
  devForcedAnomalies: ForcedAnomaly[] | null = null
): AnomalyWithLevel[] {
  // 개발자 모드: 강제 이변 적용
  if (devForcedAnomalies && devForcedAnomalies.length > 0) {
    return devForcedAnomalies.map(({ anomalyId, level }) => {
      const anomaly = Object.values(ANOMALY_TYPES).find(a => a.id === anomalyId) as Anomaly | undefined;
      if (!anomaly) {
        console.warn(`[Dev Mode] Anomaly not found: ${anomalyId}`);
        return null;
      }
      return { anomaly, level };
    }).filter(Boolean) as AnomalyWithLevel[];
  }

  // mapRisk >= 50일 때 항상 발동
  const forceOccur = mapRisk >= 50;

  // 이변 발동 체크
  const willOccur = forceOccur || checkAnomalyOccurrence(mapRisk);

  if (!willOccur) {
    return [];
  }

  const level = getAnomalyLevel(mapRisk);

  if (isBoss) {
    // 보스 전투: 여러 개 발동 가능 (레벨에 따라 1-3개)
    const count = Math.max(1, Math.min(3, Math.floor(level / 2) + 1));
    const anomalies = selectMultipleAnomalies(count) as Anomaly[];
    return anomalies.map(anomaly => ({ anomaly, level }));
  } else {
    // 일반 전투: 1개만 발동
    const anomaly = selectRandomAnomaly() as Anomaly;
    return [{ anomaly, level }];
  }
}

/**
 * 이변 효과를 플레이어 상태에 적용
 */
export function applyAnomalyEffects(
  anomalies: AnomalyWithLevel[],
  playerState: Player,
  _gameState?: unknown
): ApplyAnomalyResult {
  if (!anomalies || anomalies.length === 0) {
    return { player: playerState, logs: [] };
  }

  let player: Player = { ...playerState };
  const logs: string[] = [];

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
        player.energyPenalty = (player.energyPenalty || 0) + (effect.value || 0);
        break;

      case 'SPEED_REDUCTION':
        // 최대 속도 감소
        player.speedPenalty = (player.speedPenalty || 0) + (effect.value || 0);
        break;

      case 'DRAW_REDUCTION':
        // 뽑기 확률 감소
        player.drawPenalty = (player.drawPenalty || 0) + (effect.value || 0);
        break;

      case 'INSIGHT_REDUCTION':
        // 통찰 감소
        player.insightPenalty = (player.insightPenalty || 0) + (effect.value || 0);
        break;

      case 'VALUE_DOWN':
        // 공격력/방어력 감소 토큰 추가
        for (let i = 0; i < (effect.value || 0); i++) {
          // 공격 감소 토큰 (무딤)
          const tokensArray = Object.values(TOKENS) as Array<{ id: string }>;
          const dullToken = tokensArray.find(t => t.id === 'dull');
          if (dullToken) {
            const addResult = addToken(player, dullToken.id, 1);
            player.tokens = addResult.tokens;
          }

          // 방어 감소 토큰 (흔들림)
          const shakenToken = tokensArray.find(t => t.id === 'shaken');
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
 */
export function formatAnomaliesForDisplay(anomalies: AnomalyWithLevel[]): AnomalyDisplay[] {
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
 */
export function applyAnomalyPenalties(
  player: Player,
  baseEnergy: number,
  baseSpeed: number,
  baseInsight: number
): PenaltyResult {
  const energy = Math.max(0, baseEnergy - (player.energyPenalty || 0));
  const speed = Math.max(0, baseSpeed - (player.speedPenalty || 0));
  const insight = baseInsight - (player.insightPenalty || 0);

  return { energy, speed, insight };
}

/**
 * 뽑기 확률에 이변 패널티 적용
 */
export function applyDrawPenalty(baseDrawChance: number, player: Player): number {
  const penalty = player.drawPenalty || 0;
  return Math.max(0, Math.min(1, baseDrawChance - penalty));
}
