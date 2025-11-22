// 유물 등급
export const RELIC_RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  LEGENDARY: 'legendary',
};

// 유물 타입 (효과 적용 범위)
export const RELIC_TYPE = {
  COMBAT: 'combat',      // 전투 관련
  EVENT: 'event',        // 이벤트 관련
  DUNGEON: 'dungeon',    // 던전 관련
  GENERAL: 'general',    // 일반적인 효과
};

// 유물 효과 타입
export const RELIC_EFFECT = {
  ETHER_GAIN_BONUS: 'etherGainBonus',           // 에테르 획득량 증가
  ETHER_GAIN_FLAT: 'etherGainFlat',             // 에테르 획득량 고정값 증가
  COMBO_MULTIPLIER_PER_CARD: 'comboMultiplierPerCard', // 카드 1장당 콤보 배율 증가
  CARD_DAMAGE_BONUS: 'cardDamageBonus',         // 카드 피해 증가
  CARD_BLOCK_BONUS: 'cardBlockBonus',           // 카드 방어 증가
  EVENT_CHOICE_UNLOCK: 'eventChoiceUnlock',     // 이벤트 선택지 해금
};

// 유물 데이터
export const RELICS = {
  etherCrystal: {
    id: 'etherCrystal',
    name: '에테르 결정',
    emoji: '💎',
    rarity: RELIC_RARITY.COMMON,
    type: RELIC_TYPE.COMBAT,
    description: '플레이어가 낸 카드 1장당 콤보 배율 +2.00',
    effects: [
      {
        type: RELIC_EFFECT.COMBO_MULTIPLIER_PER_CARD,
        value: 2.0, // 카드 1장당 +2.00 배율
      }
    ]
  },
};

// 유물 효과 계산 함수
export function applyRelicEffects(relics, effectType, baseValue) {
  if (!relics || relics.length === 0) return baseValue;

  let result = baseValue;
  let bonusMultiplier = 0;
  let flatBonus = 0;

  relics.forEach(relicId => {
    const relic = RELICS[relicId];
    if (!relic) return;

    relic.effects.forEach(effect => {
      if (effect.type === effectType) {
        if (effectType === RELIC_EFFECT.ETHER_GAIN_BONUS) {
          bonusMultiplier += effect.value;
        } else if (effectType === RELIC_EFFECT.ETHER_GAIN_FLAT) {
          flatBonus += effect.value;
        }
      }
    });
  });

  // 퍼센트 보너스 적용 후 고정값 보너스 적용
  result = Math.floor(result * (1 + bonusMultiplier)) + flatBonus;
  return result;
}

// 콤보 배율에 유물 효과 적용 (카드 개수 기반)
export function applyRelicComboMultiplier(relics, baseMultiplier, cardCount) {
  if (!relics || relics.length === 0) return baseMultiplier;

  let bonusMultiplier = 0;

  relics.forEach(relicId => {
    const relic = RELICS[relicId];
    if (!relic) return;

    relic.effects.forEach(effect => {
      if (effect.type === RELIC_EFFECT.COMBO_MULTIPLIER_PER_CARD) {
        bonusMultiplier += effect.value * cardCount;
      }
    });
  });

  return baseMultiplier + bonusMultiplier;
}

// 유물 희귀도별 색상
export const RELIC_RARITY_COLORS = {
  [RELIC_RARITY.COMMON]: '#94a3b8',     // 회색
  [RELIC_RARITY.RARE]: '#60a5fa',       // 파랑
  [RELIC_RARITY.LEGENDARY]: '#fbbf24',  // 금색
};
