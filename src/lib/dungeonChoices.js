/**
 * @file dungeonChoices.js
 * @description 던전 기로(선택지) 시스템
 *
 * ## 기능
 * - 반복 선택 지원
 * - 스탯 기반 잠금
 * - 결과 처리 (보상/패널티)
 */

import { CHOICE_RESULT_TYPES } from '../data/dungeonNodes';

/**
 * 선택지가 선택 가능한지 확인
 * @param {Object} choice - 선택지 정의
 * @param {Object} playerStats - 플레이어 스탯 { strength, agility, insight, specials }
 * @param {Object} choiceState - 현재 선택 상태 { attempts, completed }
 * @param {Object} inventory - 인벤토리 { items, keys }
 * @returns {Object} { canSelect, reason, isHidden }
 */
export function canSelectChoice(choice, playerStats, choiceState = {}, inventory = {}) {
  const attempts = choiceState.attempts || 0;

  // 이미 완료된 선택지
  if (choiceState.completed) {
    return { canSelect: false, reason: '이미 완료됨', isHidden: false };
  }

  // 반복 불가능한 선택지인데 이미 시도함
  if (!choice.repeatable && attempts > 0) {
    return { canSelect: false, reason: '다시 선택 불가', isHidden: false };
  }

  // 최대 시도 횟수 초과
  if (choice.maxAttempts && attempts >= choice.maxAttempts) {
    return { canSelect: false, reason: '최대 시도 횟수 초과', isHidden: false };
  }

  // 요구 아이템 확인
  if (choice.requirements?.item) {
    const hasItem = inventory.items?.includes(choice.requirements.item) ||
                    inventory.keys?.includes(choice.requirements.item);
    if (!hasItem) {
      return { canSelect: false, reason: `${choice.requirements.item} 필요`, isHidden: false };
    }
  }

  // 스케일링 요구 스탯 계산 (시도할수록 요구량 증가)
  if (choice.scalingRequirement) {
    const { stat, baseValue, increment } = choice.scalingRequirement;
    const requiredValue = baseValue + (attempts * increment);
    const playerValue = playerStats[stat] || 0;

    if (playerValue < requiredValue) {
      return {
        canSelect: false,
        reason: `${getStatName(stat)} ${requiredValue} 필요 (현재: ${playerValue})`,
        isHidden: false,
        statRequired: { stat, value: requiredValue }
      };
    }
  }

  // 고정 요구 스탯 확인
  if (choice.requirements) {
    for (const [stat, value] of Object.entries(choice.requirements)) {
      if (stat === 'item') continue; // 아이템은 위에서 처리

      const playerValue = playerStats[stat] || 0;
      if (playerValue < value) {
        return {
          canSelect: false,
          reason: `${getStatName(stat)} ${value} 필요`,
          isHidden: true // 조건 미달 시 숨김
        };
      }
    }
  }

  return { canSelect: true, reason: null, isHidden: false };
}

/**
 * 특수 선택지(주특기 기반) 확인
 * @param {Object} choice - 선택지 정의
 * @param {string[]} playerSpecials - 플레이어 주특기 배열
 * @returns {Object|null} 사용 가능한 특수 선택지 또는 null
 */
export function getSpecialOverride(choice, playerSpecials = []) {
  if (!choice.specialOverrides) return null;

  for (const override of choice.specialOverrides) {
    if (playerSpecials.includes(override.requiredSpecial)) {
      return override;
    }
  }

  return null;
}

/**
 * 선택 실행 및 결과 계산
 * @param {Object} choice - 선택지 정의
 * @param {Object} playerStats - 플레이어 스탯
 * @param {Object} choiceState - 현재 선택 상태
 * @param {Object} specialOverride - 특수 선택지 (있을 경우)
 * @returns {Object} { result, effect, message, newState }
 */
export function executeChoice(choice, playerStats, choiceState = {}, specialOverride = null) {
  const attempts = (choiceState.attempts || 0) + 1;
  const newState = { ...choiceState, attempts };

  // 특수 선택지 사용 시 즉시 성공
  if (specialOverride) {
    return {
      result: specialOverride.outcome.type,
      effect: specialOverride.outcome.effect || {},
      message: specialOverride.outcome.text,
      newState: { ...newState, completed: true },
      isSpecial: true,
    };
  }

  // 경고 체크
  let warning = null;
  if (choice.warningAtAttempt && attempts === choice.warningAtAttempt) {
    warning = choice.warningText;
  }

  // 진행 텍스트
  let progressMessage = null;
  if (choice.progressText && attempts <= choice.progressText.length) {
    progressMessage = choice.progressText[attempts - 1];
  }

  // 최대 시도 횟수 도달 시 결과 결정
  if (choice.maxAttempts && attempts >= choice.maxAttempts) {
    // 스케일링 요구치 확인
    if (choice.scalingRequirement) {
      const { stat, baseValue, increment } = choice.scalingRequirement;
      const requiredValue = baseValue + ((attempts - 1) * increment);
      const playerValue = playerStats[stat] || 0;

      if (playerValue >= requiredValue) {
        // 성공
        return {
          result: CHOICE_RESULT_TYPES.SUCCESS,
          effect: choice.outcomes.success.effect || {},
          message: choice.outcomes.success.text,
          newState: { ...newState, completed: true },
          progressMessage,
          warning,
        };
      } else {
        // 실패
        return {
          result: CHOICE_RESULT_TYPES.FAILURE,
          effect: choice.outcomes.failure.effect || {},
          message: choice.outcomes.failure.text,
          newState: { ...newState, completed: true },
          progressMessage,
          warning,
        };
      }
    }

    // 스케일링 없으면 성공 처리
    const outcome = choice.outcomes.success || choice.outcomes.failure;
    return {
      result: outcome.type,
      effect: outcome.effect || {},
      message: outcome.text,
      newState: { ...newState, completed: true },
      progressMessage,
      warning,
    };
  }

  // 아직 진행 중
  return {
    result: 'in_progress',
    effect: {},
    message: progressMessage || '계속 진행합니다...',
    newState,
    warning,
    canContinue: true,
    screenEffect: choice.screenEffect,
    soundEffect: choice.soundEffect,
  };
}

/**
 * 과잉 선택 체크 (경고 후에도 계속 시도)
 * @param {Object} choice - 선택지 정의
 * @param {number} attempts - 현재 시도 횟수
 * @returns {boolean} 과잉 선택 여부
 */
export function isOverpushing(choice, attempts) {
  if (!choice.warningAtAttempt) return false;
  return attempts >= choice.warningAtAttempt;
}

/**
 * 과잉 선택 시 패널티 결과 계산
 * @param {Object} choice - 선택지 정의
 * @param {number} attempts - 시도 횟수
 * @returns {Object|null} 패널티 결과
 */
export function getOverpushPenalty(choice, attempts) {
  if (!isOverpushing(choice, attempts)) return null;

  // 경고 후 추가 시도 횟수
  const overAttempts = attempts - choice.warningAtAttempt;

  // 확률적 패널티 (시도할수록 확률 증가)
  const penaltyChance = Math.min(0.8, 0.2 + (overAttempts * 0.2));

  if (Math.random() < penaltyChance) {
    return choice.outcomes.failure;
  }

  return null;
}

/**
 * 스탯 이름 한글 변환
 */
function getStatName(stat) {
  const names = {
    strength: '힘',
    agility: '민첩',
    insight: '통찰',
    energy: '행동력',
  };
  return names[stat] || stat;
}

/**
 * 선택지 표시 텍스트 생성
 * @param {Object} choice - 선택지 정의
 * @param {Object} playerStats - 플레이어 스탯
 * @param {Object} choiceState - 현재 상태
 * @param {Object} specialOverride - 특수 선택지
 * @returns {Object} { text, subtext, disabled, hidden }
 */
export function getChoiceDisplayInfo(choice, playerStats, choiceState = {}, specialOverride = null) {
  const { canSelect, reason, isHidden } = canSelectChoice(choice, playerStats, choiceState);

  if (isHidden) {
    return { text: '???', subtext: '조건 미달', disabled: true, hidden: true };
  }

  // 특수 선택지 있으면 대체 표시
  if (specialOverride) {
    return {
      text: specialOverride.text,
      subtext: `[${specialOverride.requiredSpecial}]`,
      disabled: false,
      hidden: false,
      isSpecial: true,
    };
  }

  // 일반 선택지
  const attempts = choiceState.attempts || 0;
  let subtext = '';

  if (choice.repeatable && choice.maxAttempts) {
    subtext = `(${attempts}/${choice.maxAttempts})`;
  }

  if (!canSelect && reason) {
    subtext = reason;
  }

  return {
    text: choice.text,
    subtext,
    disabled: !canSelect,
    hidden: false,
  };
}
