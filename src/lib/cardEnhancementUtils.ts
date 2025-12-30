/**
 * @file cardEnhancementUtils.ts
 * @description 강화된 카드의 스탯을 계산하는 유틸리티 함수
 */

import {
  getAccumulatedEffects,
  getCardEnhancement,
  type EnhancementEffect,
  type SpecialEffect,
} from './cardEnhancementData';

// 카드 기본 타입 (battleData.ts의 카드 구조와 호환)
export interface BaseCard {
  id: string;
  name: string;
  type: 'attack' | 'general' | 'defense' | 'support' | string;
  description?: string;
  damage?: number;
  block?: number;
  speedCost: number;
  actionCost: number;
  hits?: number;
  traits?: string[];
  pushAmount?: number;
  advanceAmount?: number;
  parryRange?: number;
  crossBonus?: {
    type: string;
    value?: number;
    count?: number;
  };
  // 기타 필드들...
  [key: string]: unknown;
}

// 강화된 카드 스탯
export interface EnhancedCardStats {
  // 기본 스탯 변화
  damageBonus: number;
  blockBonus: number;
  speedCostReduction: number;
  actionCostReduction: number;
  hitsBonus: number;
  pushAmountBonus: number;
  advanceAmountBonus: number;

  // 추가 스탯
  burnStacksBonus: number;
  debuffStacksBonus: number;
  counterShotBonus: number;
  critBoostBonus: number;
  finesseGainBonus: number;
  drawCountBonus: number;
  createCountBonus: number;
  buffAmountBonus: number;
  agilityGainBonus: number;
  executeThresholdBonus: number;
  parryRangeBonus: number;
  onHitBlockBonus: number;
  perCardBlockBonus: number;
  maxSpeedBoostBonus: number;
  fragStacksBonus: number;
  growthPerTickBonus: number;
  durationTurnsBonus: number;

  // 특수 효과 목록
  specialEffects: SpecialEffect[];

  // 추가된 특성
  addedTraits: string[];

  // 제거된 특성
  removedTraits: string[];
}

// 기본 강화 스탯 생성
function createDefaultEnhancedStats(): EnhancedCardStats {
  return {
    damageBonus: 0,
    blockBonus: 0,
    speedCostReduction: 0,
    actionCostReduction: 0,
    hitsBonus: 0,
    pushAmountBonus: 0,
    advanceAmountBonus: 0,
    burnStacksBonus: 0,
    debuffStacksBonus: 0,
    counterShotBonus: 0,
    critBoostBonus: 0,
    finesseGainBonus: 0,
    drawCountBonus: 0,
    createCountBonus: 0,
    buffAmountBonus: 0,
    agilityGainBonus: 0,
    executeThresholdBonus: 0,
    parryRangeBonus: 0,
    onHitBlockBonus: 0,
    perCardBlockBonus: 0,
    maxSpeedBoostBonus: 0,
    fragStacksBonus: 0,
    growthPerTickBonus: 0,
    durationTurnsBonus: 0,
    specialEffects: [],
    addedTraits: [],
    removedTraits: [],
  };
}

// 강화 효과를 스탯에 적용
function applyEffect(stats: EnhancedCardStats, effect: EnhancementEffect): void {
  switch (effect.type) {
    case 'damage':
      stats.damageBonus += effect.value;
      break;
    case 'block':
      stats.blockBonus += effect.value;
      break;
    case 'speedCost':
      stats.speedCostReduction += Math.abs(effect.value);
      break;
    case 'actionCost':
      stats.actionCostReduction += Math.abs(effect.value);
      break;
    case 'hits':
      stats.hitsBonus += effect.value;
      break;
    case 'pushAmount':
      stats.pushAmountBonus += effect.value;
      break;
    case 'advanceAmount':
      stats.advanceAmountBonus += effect.value;
      break;
    case 'burnStacks':
      stats.burnStacksBonus += effect.value;
      break;
    case 'debuffStacks':
      stats.debuffStacksBonus += effect.value;
      break;
    case 'counterShot':
      stats.counterShotBonus += effect.value;
      break;
    case 'critBoost':
      stats.critBoostBonus += effect.value;
      break;
    case 'finesseGain':
      stats.finesseGainBonus += effect.value;
      break;
    case 'drawCount':
      stats.drawCountBonus += effect.value;
      break;
    case 'createCount':
      stats.createCountBonus += effect.value;
      break;
    case 'buffAmount':
      stats.buffAmountBonus += effect.value;
      break;
    case 'agilityGain':
      stats.agilityGainBonus += effect.value;
      break;
    case 'executeThreshold':
      stats.executeThresholdBonus += effect.value;
      break;
    case 'parryRange':
      stats.parryRangeBonus += effect.value;
      break;
    case 'onHitBlock':
      stats.onHitBlockBonus += effect.value;
      break;
    case 'perCardBlock':
      stats.perCardBlockBonus += effect.value;
      break;
    case 'maxSpeedBoost':
      stats.maxSpeedBoostBonus += effect.value;
      break;
    case 'fragStacks':
      stats.fragStacksBonus += effect.value;
      break;
    case 'growthPerTick':
      stats.growthPerTickBonus += effect.value;
      break;
    case 'durationTurns':
      stats.durationTurnsBonus += effect.value;
      break;
  }
}

// 특수 효과 처리 (특성 추가/제거)
function applySpecialEffect(stats: EnhancedCardStats, effect: SpecialEffect): void {
  switch (effect.type) {
    case 'addTrait':
      if (typeof effect.value === 'string' && !stats.addedTraits.includes(effect.value)) {
        stats.addedTraits.push(effect.value);
      }
      break;
    case 'removeTrait':
      if (typeof effect.value === 'string' && !stats.removedTraits.includes(effect.value)) {
        stats.removedTraits.push(effect.value);
      }
      break;
    default:
      // 다른 특수 효과는 그대로 저장
      stats.specialEffects.push(effect);
      break;
  }
}

/**
 * 카드의 강화 레벨에 따른 누적 스탯 변화량 계산
 * @param cardId 카드 ID
 * @param enhancementLevel 강화 레벨 (1~5)
 * @returns 강화로 인한 스탯 변화량
 */
export function calculateEnhancedStats(cardId: string, enhancementLevel: number): EnhancedCardStats {
  const stats = createDefaultEnhancedStats();

  if (enhancementLevel < 1 || enhancementLevel > 5) {
    return stats;
  }

  const { effects, specialEffects } = getAccumulatedEffects(cardId, enhancementLevel);

  // 일반 효과 적용
  for (const effect of effects) {
    applyEffect(stats, effect);
  }

  // 특수 효과 적용
  for (const effect of specialEffects) {
    applySpecialEffect(stats, effect);
  }

  return stats;
}

/**
 * 강화된 카드의 최종 스탯 계산
 * @param baseCard 기본 카드 데이터
 * @param enhancementLevel 강화 레벨 (0이면 강화 없음)
 * @returns 최종 카드 스탯
 */
export function getEnhancedCard<T extends BaseCard>(baseCard: T, enhancementLevel: number): T & { enhancementLevel: number; enhancedStats: EnhancedCardStats } {
  const enhancedStats = enhancementLevel > 0
    ? calculateEnhancedStats(baseCard.id, enhancementLevel)
    : createDefaultEnhancedStats();

  // 기본 스탯에 강화 보너스 적용
  const enhancedCard = {
    ...baseCard,
    enhancementLevel,
    enhancedStats,
  };

  // 피해량 적용
  if (baseCard.damage !== undefined) {
    enhancedCard.damage = Math.max(0, baseCard.damage + enhancedStats.damageBonus);
  }

  // 방어력 적용
  if (baseCard.block !== undefined) {
    enhancedCard.block = Math.max(0, baseCard.block + enhancedStats.blockBonus);
  }

  // 속도 적용 (최소 1)
  enhancedCard.speedCost = Math.max(1, baseCard.speedCost - enhancedStats.speedCostReduction);

  // 행동력 적용 (최소 0)
  enhancedCard.actionCost = Math.max(0, baseCard.actionCost - enhancedStats.actionCostReduction);

  // 타격 횟수 적용
  if (baseCard.hits !== undefined) {
    enhancedCard.hits = baseCard.hits + enhancedStats.hitsBonus;
  }

  // 넉백량 적용
  if (baseCard.pushAmount !== undefined) {
    enhancedCard.pushAmount = baseCard.pushAmount + enhancedStats.pushAmountBonus;
  }

  // 앞당김량 적용
  if (baseCard.advanceAmount !== undefined) {
    enhancedCard.advanceAmount = baseCard.advanceAmount + enhancedStats.advanceAmountBonus;
  }

  // 패링 범위 적용
  if (baseCard.parryRange !== undefined) {
    enhancedCard.parryRange = baseCard.parryRange + enhancedStats.parryRangeBonus;
  }

  // 특성 적용 (추가/제거)
  // traits가 없는 카드도 강화로 특성을 얻을 수 있음
  const hasTraitChanges = enhancedStats.addedTraits.length > 0 || enhancedStats.removedTraits.length > 0;
  if (baseCard.traits || hasTraitChanges) {
    const newTraits = [...(baseCard.traits || [])];

    // 특성 추가
    for (const trait of enhancedStats.addedTraits) {
      if (!newTraits.includes(trait)) {
        newTraits.push(trait);
      }
    }

    // 특성 제거
    enhancedCard.traits = newTraits.filter(t => !enhancedStats.removedTraits.includes(t));
  }

  // 설명 업데이트 (강화 효과 반영)
  if (baseCard.description && enhancementLevel > 0) {
    enhancedCard.description = generateEnhancedDescription(
      enhancedCard,
      baseCard.description,
      enhancedStats
    );
  }

  return enhancedCard;
}

/**
 * 카드가 강화 가능한지 확인
 * @param cardId 카드 ID
 * @returns 강화 가능 여부
 */
export function isEnhanceable(cardId: string): boolean {
  return getCardEnhancement(cardId) !== undefined;
}

/**
 * 카드의 최대 강화 레벨 (현재 모든 카드 5)
 * @param cardId 카드 ID
 * @returns 최대 강화 레벨
 */
export function getMaxEnhancementLevel(cardId: string): number {
  return isEnhanceable(cardId) ? 5 : 0;
}

/**
 * 다음 강화 레벨의 효과 미리보기
 * @param cardId 카드 ID
 * @param currentLevel 현재 강화 레벨
 * @returns 다음 레벨 강화 정보 또는 null
 */
export function getNextEnhancementPreview(cardId: string, currentLevel: number): {
  level: number;
  description: string;
  isMilestone: boolean;
} | null {
  if (currentLevel >= 5) {
    return null;
  }

  const enhancement = getCardEnhancement(cardId);
  if (!enhancement) {
    return null;
  }

  const nextLevel = (currentLevel + 1) as 1 | 2 | 3 | 4 | 5;
  const levelData = enhancement.levels[nextLevel];

  return {
    level: nextLevel,
    description: levelData.description,
    isMilestone: nextLevel === 3 || nextLevel === 5,
  };
}

/**
 * 카드의 모든 강화 단계 정보 조회
 * @param cardId 카드 ID
 * @returns 모든 강화 단계 정보 배열
 */
export function getAllEnhancementLevels(cardId: string): {
  level: number;
  description: string;
  isMilestone: boolean;
  isUnlocked: boolean;
}[] {
  const enhancement = getCardEnhancement(cardId);
  if (!enhancement) {
    return [];
  }

  return [1, 2, 3, 4, 5].map(level => ({
    level,
    description: enhancement.levels[level as 1 | 2 | 3 | 4 | 5].description,
    isMilestone: level === 3 || level === 5,
    isUnlocked: false, // 실제 사용 시 현재 레벨과 비교해서 설정
  }));
}

/**
 * 두 강화 레벨 사이의 스탯 차이 계산
 * @param cardId 카드 ID
 * @param fromLevel 시작 레벨 (현재 레벨)
 * @param toLevel 목표 레벨 (미리보기 레벨)
 * @returns 차이 설명 문자열
 */
export function getEnhancementDifference(cardId: string, fromLevel: number, toLevel: number): string {
  if (fromLevel >= toLevel) return '';

  const fromStats = fromLevel > 0 ? calculateEnhancedStats(cardId, fromLevel) : createEmptyStats();
  const toStats = calculateEnhancedStats(cardId, toLevel);

  const differences: string[] = [];

  // 기본 스탯 차이
  const damageDiff = toStats.damageBonus - fromStats.damageBonus;
  if (damageDiff > 0) differences.push(`피해 +${damageDiff}`);

  const blockDiff = toStats.blockBonus - fromStats.blockBonus;
  if (blockDiff > 0) differences.push(`방어 +${blockDiff}`);

  const speedDiff = toStats.speedCostReduction - fromStats.speedCostReduction;
  if (speedDiff > 0) differences.push(`속도 -${speedDiff}`);

  const actionDiff = toStats.actionCostReduction - fromStats.actionCostReduction;
  if (actionDiff > 0) differences.push(`행동력 -${actionDiff}`);

  const hitsDiff = toStats.hitsBonus - fromStats.hitsBonus;
  if (hitsDiff > 0) differences.push(`타격 +${hitsDiff}`);

  // 밀치기/앞당김
  const pushDiff = toStats.pushAmountBonus - fromStats.pushAmountBonus;
  if (pushDiff > 0) differences.push(`밀치기 +${pushDiff}`);

  const advanceDiff = toStats.advanceAmountBonus - fromStats.advanceAmountBonus;
  if (advanceDiff > 0) differences.push(`앞당김 +${advanceDiff}`);

  // 효과 스택
  const burnDiff = toStats.burnStacksBonus - fromStats.burnStacksBonus;
  if (burnDiff > 0) differences.push(`화상 +${burnDiff}`);

  const debuffDiff = toStats.debuffStacksBonus - fromStats.debuffStacksBonus;
  if (debuffDiff > 0) differences.push(`디버프 +${debuffDiff}회`);

  const counterShotDiff = toStats.counterShotBonus - fromStats.counterShotBonus;
  if (counterShotDiff > 0) differences.push(`대응사격 +${counterShotDiff}`);

  const critDiff = toStats.critBoostBonus - fromStats.critBoostBonus;
  if (critDiff > 0) differences.push(`치명타 +${critDiff}%`);

  const finesseDiff = toStats.finesseGainBonus - fromStats.finesseGainBonus;
  if (finesseDiff > 0) differences.push(`기교 +${finesseDiff}`);

  const drawDiff = toStats.drawCountBonus - fromStats.drawCountBonus;
  if (drawDiff > 0) differences.push(`드로우 +${drawDiff}`);

  const createDiff = toStats.createCountBonus - fromStats.createCountBonus;
  if (createDiff > 0) differences.push(`창조 +${createDiff}`);

  const buffDiff = toStats.buffAmountBonus - fromStats.buffAmountBonus;
  if (buffDiff > 0) differences.push(`버프 +${buffDiff}`);

  const agilityDiff = toStats.agilityGainBonus - fromStats.agilityGainBonus;
  if (agilityDiff > 0) differences.push(`민첩 +${agilityDiff}`);

  const executeDiff = toStats.executeThresholdBonus - fromStats.executeThresholdBonus;
  if (executeDiff > 0) differences.push(`처형 +${executeDiff}%`);

  const parryDiff = toStats.parryRangeBonus - fromStats.parryRangeBonus;
  if (parryDiff > 0) differences.push(`패링 +${parryDiff}`);

  const onHitBlockDiff = toStats.onHitBlockBonus - fromStats.onHitBlockBonus;
  if (onHitBlockDiff > 0) differences.push(`피격 방어 +${onHitBlockDiff}`);

  const perCardBlockDiff = toStats.perCardBlockBonus - fromStats.perCardBlockBonus;
  if (perCardBlockDiff > 0) differences.push(`카드당 방어 +${perCardBlockDiff}`);

  const maxSpeedDiff = toStats.maxSpeedBoostBonus - fromStats.maxSpeedBoostBonus;
  if (maxSpeedDiff > 0) differences.push(`최대속도 +${maxSpeedDiff}`);

  const fragDiff = toStats.fragStacksBonus - fromStats.fragStacksBonus;
  if (fragDiff > 0) differences.push(`파쇄탄 +${fragDiff}`);

  const growthDiff = toStats.growthPerTickBonus - fromStats.growthPerTickBonus;
  if (growthDiff > 0) differences.push(`성장 +${growthDiff}`);

  const durationDiff = toStats.durationTurnsBonus - fromStats.durationTurnsBonus;
  if (durationDiff > 0) differences.push(`지속 +${durationDiff}턴`);

  // 특성 변화 (새로 추가되는 것만)
  const newTraits = toStats.addedTraits.filter(t => !fromStats.addedTraits.includes(t));
  if (newTraits.length > 0) differences.push(`특성 추가`);

  const newRemovals = toStats.removedTraits.filter(t => !fromStats.removedTraits.includes(t));
  if (newRemovals.length > 0) differences.push(`특성 제거`);

  // 특수 효과 (새로 추가되는 것만)
  const fromEffectTypes = new Set(fromStats.specialEffects.map(e => e.type));
  const newEffects = toStats.specialEffects.filter(e => !fromEffectTypes.has(e.type));
  for (const effect of newEffects) {
    if (effect.type === 'counterOnHit' && typeof effect.value === 'number') {
      differences.push(`반격 ${effect.value}회 부여`);
    } else if (effect.type === 'extraBlur' && typeof effect.value === 'number') {
      differences.push(`흐릿함 +${effect.value}`);
    }
  }

  return differences.join(', ');
}

/**
 * 특정 특수 효과가 있는지 확인
 * @param stats 강화된 스탯
 * @param effectType 확인할 효과 타입
 * @returns 효과 존재 여부
 */
export function hasSpecialEffect(stats: EnhancedCardStats, effectType: string): boolean {
  return stats.specialEffects.some(e => e.type === effectType);
}

/**
 * 특정 특수 효과의 값 조회
 * @param stats 강화된 스탯
 * @param effectType 조회할 효과 타입
 * @returns 효과 값 또는 undefined
 */
export function getSpecialEffectValue(stats: EnhancedCardStats, effectType: string): number | string | undefined {
  const effect = stats.specialEffects.find(e => e.type === effectType);
  return effect?.value;
}

/**
 * 강화 레벨에 따른 희귀도 색상 반환
 * @param level 강화 레벨
 * @returns CSS 색상 문자열
 */
export function getEnhancementColor(level: number): string {
  switch (level) {
    case 1:
      return '#4ade80'; // green-400
    case 2:
      return '#22d3ee'; // cyan-400
    case 3:
      return '#a78bfa'; // violet-400 (마일스톤)
    case 4:
      return '#fb923c'; // orange-400
    case 5:
      return '#f472b6'; // pink-400 (마일스톤)
    default:
      return '#9ca3af'; // gray-400
  }
}

/**
 * 강화 레벨 표시 텍스트
 * @param level 강화 레벨
 * @returns 표시용 텍스트
 */
export function getEnhancementLabel(level: number): string {
  if (level <= 0) return '';
  return `+${level}`;
}

/**
 * 강화된 카드의 동적 설명 생성
 * 원본 설명의 숫자를 강화된 스탯으로 교체
 * @param card 카드 데이터 (강화 적용 후)
 * @param originalDescription 원본 설명
 * @param enhancedStats 강화 스탯 (선택)
 * @returns 업데이트된 설명
 */
export function generateEnhancedDescription(
  card: BaseCard,
  originalDescription: string,
  enhancedStats?: EnhancedCardStats
): string {
  let description = originalDescription;

  // 공격력/피해 패턴: "공격력 X", "피해 X", "X 피해"
  if (card.damage !== undefined) {
    description = description.replace(/공격력\s*(\d+)/g, `공격력 ${card.damage}`);
    description = description.replace(/피해\s*(\d+)/g, `피해 ${card.damage}`);
    description = description.replace(/(\d+)\s*피해/g, `${card.damage} 피해`);
  }

  // 방어력 패턴: "방어력 X", "방어 X"
  if (card.block !== undefined) {
    description = description.replace(/방어력\s*(\d+)/g, `방어력 ${card.block}`);
    description = description.replace(/방어\s*(\d+)/g, `방어 ${card.block}`);
  }

  // 넉백 패턴: "넉백 X"
  if (card.pushAmount !== undefined) {
    description = description.replace(/넉백\s*(\d+)/g, `넉백 ${card.pushAmount}`);
  }

  // 앞당김 패턴: "앞당김 X"
  if (card.advanceAmount !== undefined) {
    description = description.replace(/앞당김\s*(\d+)/g, `앞당김 ${card.advanceAmount}`);
  }

  // 타격 횟수 패턴: "X번 공격", "X회 공격", "X타"
  if (card.hits !== undefined && card.hits > 1) {
    description = description.replace(/(\d+)번\s*공격/g, `${card.hits}번 공격`);
    description = description.replace(/(\d+)회\s*공격/g, `${card.hits}회 공격`);
    description = description.replace(/(\d+)타/g, `${card.hits}타`);
  }

  // 패링 범위 패턴: "패링 X", "X 범위"
  if (card.parryRange !== undefined) {
    description = description.replace(/패링\s*(\d+)/g, `패링 ${card.parryRange}`);
  }

  // 강화로 추가된 효과 - 설명 내 숫자 직접 교체
  if (enhancedStats) {
    // 디버프 스택: 특정 디버프명 + X회 패턴만 매칭
    // 무딤, 흔들림, 무방비, 허약, 속박, 둔화, 취약 등
    if (enhancedStats.debuffStacksBonus > 0) {
      // 패턴 1: "무딤, 흔들림 X회" (쉼표로 구분된 디버프들)
      description = description.replace(
        /((?:무딤|흔들림|무방비|허약|속박|둔화|취약)(?:\s*,\s*(?:무딤|흔들림|무방비|허약|속박|둔화|취약))*)\s+(\d+)회/g,
        (_, effectNames, num) => {
          const newNum = parseInt(num) + enhancedStats.debuffStacksBonus;
          return `${effectNames} ${newNum}회`;
        }
      );
      // 패턴 2: "허약 1회, 흔들림 1회" (각각 카운트가 별도인 경우)
      description = description.replace(
        /(무딤|흔들림|무방비|허약|속박|둔화|취약)\s+(\d+)회/g,
        (_, effectName, num) => {
          const newNum = parseInt(num) + enhancedStats.debuffStacksBonus;
          return `${effectName} ${newNum}회`;
        }
      );
    }

    // 화상 스택: "화상 X회" or "X 화상"
    if (enhancedStats.burnStacksBonus > 0) {
      description = description.replace(/화상\s*(\d+)회?/g, (match, num) => {
        const newNum = parseInt(num) + enhancedStats.burnStacksBonus;
        return match.endsWith('회') ? `화상 ${newNum}회` : `화상 ${newNum}`;
      });
      description = description.replace(/(\d+)\s*화상/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.burnStacksBonus;
        return `${newNum} 화상`;
      });
    }

    // 기교 획득: "기교 X" or "X 기교"
    if (enhancedStats.finesseGainBonus > 0) {
      description = description.replace(/기교\s*(\d+)/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.finesseGainBonus;
        return `기교 ${newNum}`;
      });
      description = description.replace(/(\d+)\s*기교/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.finesseGainBonus;
        return `${newNum} 기교`;
      });
    }

    // 드로우: "X장 드로우" or "드로우 X"
    if (enhancedStats.drawCountBonus > 0) {
      description = description.replace(/(\d+)장\s*드로우/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.drawCountBonus;
        return `${newNum}장 드로우`;
      });
      description = description.replace(/드로우\s*(\d+)/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.drawCountBonus;
        return `드로우 ${newNum}`;
      });
    }

    // 민첩 획득: "민첩 X" or "X 민첩"
    if (enhancedStats.agilityGainBonus > 0) {
      description = description.replace(/민첩\s*(\d+)/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.agilityGainBonus;
        return `민첩 ${newNum}`;
      });
      description = description.replace(/(\d+)\s*민첩/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.agilityGainBonus;
        return `${newNum} 민첩`;
      });
    }

    // 치명타 확률: "치명타 X%" or "치명타율 X%"
    if (enhancedStats.critBoostBonus > 0) {
      description = description.replace(/치명타\s*(\d+)%/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.critBoostBonus;
        return `치명타 ${newNum}%`;
      });
      description = description.replace(/치명타율\s*(\d+)%/g, (_, num) => {
        const newNum = parseInt(num) + enhancedStats.critBoostBonus;
        return `치명타율 ${newNum}%`;
      });
    }

    // 대응사격: "대응사격 X회"
    if (enhancedStats.counterShotBonus > 0) {
      description = description.replace(/대응사격\s*(\d+)회?/g, (match, num) => {
        const newNum = parseInt(num) + enhancedStats.counterShotBonus;
        return match.endsWith('회') ? `대응사격 ${newNum}회` : `대응사격 ${newNum}`;
      });
    }

    // 흐릿함: "흐릿함 X회"
    const extraBlur = enhancedStats.specialEffects.find(e => e.type === 'extraBlur');
    if (extraBlur && typeof extraBlur.value === 'number') {
      description = description.replace(/흐릿함\s*(\d+)회?/g, (match, num) => {
        const newNum = parseInt(num) + extraBlur.value;
        return match.endsWith('회') ? `흐릿함 ${newNum}회` : `흐릿함 ${newNum}`;
      });
    }

    // 특수 효과: 반격 부여 (counterOnHit)
    const counterOnHit = enhancedStats.specialEffects.find(e => e.type === 'counterOnHit');
    if (counterOnHit && typeof counterOnHit.value === 'number') {
      description += ` 반격 ${counterOnHit.value}회 부여.`;
    }

    // 텍스트에서 직접 교체 불가능한 효과만 표시
    const additions: string[] = [];
    if (enhancedStats.executeThresholdBonus > 0) {
      additions.push(`처형 +${enhancedStats.executeThresholdBonus}%`);
    }
    if (enhancedStats.fragStacksBonus > 0) {
      additions.push(`파쇄탄 +${enhancedStats.fragStacksBonus}`);
    }

    // 방어 관련 (텍스트 교체 불가)
    if (enhancedStats.onHitBlockBonus > 0) {
      additions.push(`피격 방어 +${enhancedStats.onHitBlockBonus}`);
    }
    if (enhancedStats.perCardBlockBonus > 0) {
      additions.push(`카드당 방어 +${enhancedStats.perCardBlockBonus}`);
    }

    // 유틸리티 (텍스트 교체 불가)
    if (enhancedStats.createCountBonus > 0) {
      additions.push(`창조 +${enhancedStats.createCountBonus}`);
    }
    if (enhancedStats.buffAmountBonus > 0) {
      additions.push(`버프 +${enhancedStats.buffAmountBonus}`);
    }
    if (enhancedStats.maxSpeedBoostBonus > 0) {
      additions.push(`속도 +${enhancedStats.maxSpeedBoostBonus}`);
    }

    // 지속 효과 (텍스트 교체 불가)
    if (enhancedStats.growthPerTickBonus > 0) {
      additions.push(`성장 +${enhancedStats.growthPerTickBonus}`);
    }
    if (enhancedStats.durationTurnsBonus > 0) {
      additions.push(`지속 +${enhancedStats.durationTurnsBonus}턴`);
    }

    // 추가/제거된 특성은 카드 UI에 직접 표시되므로 설명에서 제외

    if (additions.length > 0) {
      description += ` (${additions.join(', ')})`;
    }
  }

  return description;
}
