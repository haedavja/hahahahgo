/**
 * @file cardEnhancementData.ts
 * @description 카드별 강화 단계 정의
 * 각 카드는 1~5강까지 강화 가능하며, 각 단계별로 다른 효과를 부여
 */

// 강화 효과 타입 정의
export type EnhancementEffectType =
  | 'damage'           // 피해량 증가
  | 'block'            // 방어력 증가
  | 'speedCost'        // 속도 감소 (음수값)
  | 'actionCost'       // 행동력 감소 (음수값)
  | 'hits'             // 타격 횟수 증가
  | 'pushAmount'       // 넉백량 증가
  | 'advanceAmount'    // 앞당김량 증가
  | 'burnStacks'       // 화상 스택 증가
  | 'debuffStacks'     // 디버프 스택 증가
  | 'counterShot'      // 대응사격 횟수 증가
  | 'critBoost'        // 치명타 확률 증가 (%)
  | 'finesseGain'      // 기교 획득량 증가
  | 'drawCount'        // 드로우 수 증가
  | 'createCount'      // 창조 카드 수 증가
  | 'buffAmount'       // 버프량 증가
  | 'agilityGain'      // 민첩 획득량 증가
  | 'executeThreshold' // 처형 HP 기준 증가
  | 'parryRange'       // 패링 범위 증가
  | 'onHitBlock'       // 피격 시 방어력 증가
  | 'perCardBlock'     // 카드당 방어력 증가
  | 'maxSpeedBoost'    // 최대 속도 증가량 증가
  | 'fragStacks'       // 파쇄탄 스택 증가
  | 'growthPerTick'    // 틱당 성장량 증가
  | 'durationTurns';   // 지속 턴 증가

// 특수 효과 타입 (3강, 5강 마일스톤)
export type SpecialEffectType =
  // 특성 관련
  | 'addTrait'              // 특성 추가
  | 'removeTrait'           // 특성 제거
  | 'upgradeTrait'          // 특성 업그레이드 (예: 흔들림 → 흔들림+)
  // 효과 강화
  | 'extraShot'             // 추가 사격
  | 'extraEvasion'          // 추가 회피
  | 'extraOffense'          // 추가 공세
  | 'extraBlur'             // 추가 흐릿함
  | 'removeJamPenalty'      // 탄걸림 패널티 제거
  | 'removeEmptyPenalty'    // 빈탄창 패널티 제거
  | 'removePainPenalty'     // 아픔 패널티 제거
  // 조건 강화
  | 'crushMultiplier'       // 분쇄 배율 증가
  | 'crossMultiplier'       // 교차 배율 증가
  | 'armorPiercePercent'    // 방어 무시 비율
  | 'armorPierceCount'      // 방어 무시 횟수
  // 추가 효과
  | 'onHitAdvance'          // 피해 성공 시 앞당김
  | 'onExecuteHeal'         // 처형 시 체력 회복
  | 'chainAdvance'          // 연계 시 앞당김
  | 'chainNextSpeedReduce'  // 연계 시 다음 카드 속도 감소
  | 'parryCounterDamage'    // 패링 성공 시 반격 피해
  | 'onHitCounterDamage'    // 피격 시 반격 피해
  | 'pushStrengthGain'      // 밀어낸 양의 일부 힘 획득
  | 'pushDisableCard'       // 밀어낸 카드 비활성화
  | 'strengthDoubleApply'   // 힘 스택 2배 적용
  | 'aoeKnockback'          // 모든 적 카드 넉백
  | 'critExtraShot'         // 치명타 시 추가 사격
  | 'gyrusChanceBoost'      // 가이러스 확률 증가
  | 'alwaysReload'          // 무조건 장전
  | 'executeEffect'         // 처형 효과 추가
  | 'crossStun'             // 교차 시 기절
  | 'perHitKnockback'       // 피해마다 넉백
  | 'burnReduceBlock'       // 화상이 방어력 감소
  | 'burnIgnoreBlock'       // 화상 + 방어력 무시
  | 'finesseReduce'         // 기교 소모량 감소
  | 'reloadFinesseGain'     // 장전 시 기교 획득
  | 'nextShotDamageBoost'   // 다음 사격 피해 증가
  | 'autoReloadBlock'       // 자동장전 시 방어력
  | 'autoReloadAlways'      // 항상 자동장전
  | 'fragPierce'            // 파쇄탄 관통
  | 'createdCardDamageBoost'// 창조 카드 피해 증가
  | 'jamImmunityTurns'      // 탄걸림 면역 턴
  | 'counterShotDamageBoost'// 대응사격 피해 증가
  | 'burnReduceStrength'    // 화상이 힘 감소
  | 'insightBoost'          // 통찰 증가
  | 'extraRecall'           // 추가 회수
  | 'handLimitIncrease'     // 손패 제한 증가
  | 'drawnCardSpeedReduce'  // 뽑은 카드 속도 감소
  | 'gainPositiveToken'     // 긍정 토큰 획득
  | 'repeatPreviousEffect'  // 이전 카드 효과 재발동
  | 'excessBlockToStrength' // 초과 방어력을 힘으로
  | 'nextTurnActionBoost'   // 다음 턴 행동력 증가
  | 'defenseToStrength'     // 방어력을 힘으로 전환
  | 'advanceNextSpeedReduce'// 앞당김 후 다음 카드 속도 감소
  | 'debuffDurationBoost'   // 디버프 지속 증가
  | 'repeatCardBoost'       // 반복된 카드 피해/방어 증가
  | 'applyToGunCards'       // 총격 카드에도 적용
  | 'agilityToStrength'     // 민첩이 힘에도 적용
  | 'blockRetainPercent'    // 다음 턴 방어력 유지 비율
  | 'createdCardFinesseGain'// 창조 카드 사용 시 기교 획득
  | 'burnInstantTrigger'    // 화상 즉시 발동
  | 'counterOnHit';         // 피격 시 반격 부여

export interface EnhancementEffect {
  type: EnhancementEffectType;
  value: number;
}

export interface SpecialEffect {
  type: SpecialEffectType;
  value?: number | string;  // 값이 필요한 경우 (예: addTrait의 trait id)
}

export interface EnhancementLevel {
  effects: EnhancementEffect[];
  specialEffects?: SpecialEffect[];
  description: string;  // UI에 표시될 설명
}

export interface CardEnhancement {
  cardId: string;
  levels: {
    1: EnhancementLevel;
    2: EnhancementLevel;
    3: EnhancementLevel;
    4: EnhancementLevel;
    5: EnhancementLevel;
  };
}

// ============================================
// 검격 공격 카드 강화 데이터
// ============================================

const FENCING_ATTACK_ENHANCEMENTS: CardEnhancement[] = [
  {
    cardId: 'strike',
    levels: {
      1: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      2: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      3: {
        effects: [{ type: 'damage', value: 2 }],
        specialEffects: [{ type: 'addTrait', value: 'chain' }],
        description: '피해 +2, [연계] 특성 획득'
      },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [
          { type: 'chainAdvance', value: 3 },
          { type: 'chainNextSpeedReduce', value: 1 }
        ],
        description: '연계 시 앞당김 3 + 다음 카드 속도 -1'
      },
    }
  },
  {
    cardId: 'lunge',
    levels: {
      1: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      2: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      3: {
        effects: [{ type: 'damage', value: 2 }, { type: 'pushAmount', value: 2 }],
        description: '피해 +2, 넉백 +2'
      },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'onHitAdvance', value: 3 }],
        description: '피해 성공 시 앞당김 3'
      },
    }
  },
  {
    cardId: 'fleche',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      3: {
        effects: [{ type: 'actionCost', value: -1 }, { type: 'createCount', value: 1 }],
        description: '행동력 -1, 창조 +1'
      },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'extraShot', value: 2 }],
        description: '교차 시 사격 2회로 증가'
      },
    }
  },
  {
    cardId: 'flank',
    levels: {
      1: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      2: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'armorPiercePercent', value: 50 }],
        description: '속도 -1, 방어력 50% 무시'
      },
      4: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      5: {
        effects: [],
        specialEffects: [{ type: 'crushMultiplier', value: 3 }],
        description: '분쇄 2배 → 3배'
      },
    }
  },
  {
    cardId: 'thrust',
    levels: {
      1: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'upgradeTrait', value: 'shaken:shakenPlus' }],
        description: '흔들림 → 흔들림+'
      },
    }
  },
  {
    cardId: 'beat',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: {
        effects: [{ type: 'actionCost', value: -1 }, { type: 'hits', value: 1 }],
        description: '행동력 -1, 타격 +1'
      },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [{ type: 'finesseGain', value: 1 }],
        specialEffects: [{ type: 'addTrait', value: 'crossFinesseGain' }],
        description: '교차 시 기교 +1'
      },
    }
  },
  {
    cardId: 'feint',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      3: {
        effects: [{ type: 'damage', value: 1 }],
        specialEffects: [{ type: 'extraEvasion', value: 1 }],
        description: '피해 +1, 회피 +1'
      },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'extraOffense', value: 1 }],
        description: '공세 1 → 2회'
      },
    }
  },
  {
    cardId: 'disrupt',
    levels: {
      1: { effects: [{ type: 'pushAmount', value: 2 }], description: '넉백 +2' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'pushAmount', value: 2 }], description: '넉백 +2' },
      5: {
        effects: [],
        specialEffects: [{ type: 'aoeKnockback' }],
        description: '마지막 카드 → 모든 적 카드 넉백'
      },
    }
  },
  {
    cardId: 'binding',
    levels: {
      1: { effects: [{ type: 'pushAmount', value: 1 }], description: '밀어내기 +1' },
      2: { effects: [{ type: 'pushAmount', value: 1 }], description: '밀어내기 +1' },
      3: {
        effects: [{ type: 'damage', value: 1 }],
        specialEffects: [{ type: 'pushStrengthGain', value: 50 }],
        description: '피해 +1, 밀어낸 양의 50% 힘 획득'
      },
      4: { effects: [{ type: 'pushAmount', value: 1 }], description: '밀어내기 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'pushDisableCard' }],
        description: '교차 시 밀어낸 카드 1턴 비활성화'
      },
    }
  },
  {
    cardId: 'grind',
    levels: {
      1: { effects: [{ type: 'damage', value: 3 }], description: '피해 +3' },
      2: { effects: [{ type: 'damage', value: 3 }], description: '피해 +3' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      5: {
        effects: [],
        specialEffects: [{ type: 'strengthDoubleApply' }],
        description: '힘 스택 2배 적용'
      },
    }
  },
  {
    cardId: 'violent_mort',
    levels: {
      1: { effects: [{ type: 'executeThreshold', value: 5 }], description: '처형 HP +5' },
      2: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      3: {
        effects: [{ type: 'executeThreshold', value: 5 }],
        specialEffects: [{ type: 'onExecuteHeal', value: 10 }],
        description: '처형 HP +5, 처형 시 체력 10 회복'
      },
      4: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      5: {
        effects: [{ type: 'executeThreshold', value: 10 }],
        description: '처형 HP 50 이하로 확대'
      },
    }
  },
  {
    cardId: 'coup_droit',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }, { type: 'debuffStacks', value: 1 }],
        description: '속도 -1, 무방비 2회'
      },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [{ type: 'debuffStacks', value: 1 }, { type: 'pushAmount', value: 5 }],
        description: '무방비 3회 + 넉백 5'
      },
    }
  },
  {
    cardId: 'sabre_eclair',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'extraShot', value: 2 }],  // 파괴 2장으로 재사용
        description: '교차 시 파괴 → 2장 파괴'
      },
    }
  },
  {
    cardId: 'tempete_dechainee',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'hits', value: 1 }], description: '타격 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'finesseReduce', value: 1 }],
        description: '기교 소모 3 → 2'
      },
    }
  },
  {
    cardId: 'vent_des_lames',
    levels: {
      1: { effects: [{ type: 'createCount', value: 1 }], description: '창조 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'createCount', value: 1 }], description: '창조 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'createdCardFinesseGain', value: 1 }],
        description: '창조 카드도 기교 +1 획득'
      },
    }
  },
  {
    cardId: 'griffe_du_dragon',
    levels: {
      1: { effects: [{ type: 'burnStacks', value: 1 }], description: '화상 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: {
        effects: [{ type: 'burnStacks', value: 1 }],
        specialEffects: [{ type: 'burnInstantTrigger' }],
        description: '화상 +1, 화상이 즉시 1회 발동'
      },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [{ type: 'burnStacks', value: 1 }],
        specialEffects: [{ type: 'burnIgnoreBlock' }],
        description: '화상 5회 + 방어력 무시'
      },
    }
  },
  {
    cardId: 'au_bord_du_gouffre',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [{ type: 'pushAmount', value: 2 }],
        description: '치명타 시 넉백 4 → 6'
      },
    }
  },
];

// ============================================
// 검격 방어/유틸 카드 강화 데이터
// ============================================

const FENCING_DEFENSE_ENHANCEMENTS: CardEnhancement[] = [
  {
    cardId: 'marche',
    levels: {
      1: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      2: { effects: [{ type: 'advanceAmount', value: 1 }], description: '앞당김 +1' },
      3: {
        effects: [{ type: 'block', value: 1 }],
        specialEffects: [{ type: 'extraBlur', value: 1 }],
        description: '방어 +1, 흐릿함 2회'
      },
      4: { effects: [{ type: 'advanceAmount', value: 1 }], description: '앞당김 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'advanceNextSpeedReduce', value: 2 }],
        description: '앞당김 후 다음 카드 속도 -2'
      },
    }
  },
  {
    cardId: 'defensive_stance',
    levels: {
      1: { effects: [{ type: 'growthPerTick', value: 0.5 }], description: '틱당 방어 +0.5' },
      2: { effects: [{ type: 'growthPerTick', value: 0.5 }], description: '틱당 방어 +0.5' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'defenseToStrength', value: 30 }],
        description: '최종 방어력의 30%를 힘으로 전환'
      },
    }
  },
  {
    cardId: 'deflect',
    levels: {
      1: { effects: [{ type: 'block', value: 2 }], description: '방어 +2' },
      2: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }, { type: 'parryRange', value: 2 }],
        description: '속도 -1, 패링 범위 5 → 7'
      },
      4: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'parryCounterDamage', value: 5 }],
        description: '패링 성공 시 반격 5 피해'
      },
    }
  },
  {
    cardId: 'breach',
    levels: {
      1: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      2: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'createdCardDamageBoost', value: -2 }],  // 속도 +3 → +1
        description: '창조 카드 속도 +3 → +1'
      },
    }
  },
  {
    cardId: 'octave',
    levels: {
      1: { effects: [{ type: 'block', value: 2 }], description: '방어 +2' },
      2: { effects: [{ type: 'block', value: 2 }], description: '방어 +2' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'extraEvasion', value: 1 }],
        description: '속도 -1, 교차 시 회피 1회'
      },
      4: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'crossMultiplier', value: 3 }],
        description: '교차 2배 → 3배'
      },
    }
  },
  {
    cardId: 'quarte',
    levels: {
      1: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      2: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'extraShot', value: 1 }],
        description: '속도 -1, 사격 2회'
      },
      4: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'addTrait', value: 'followup' }],
        description: '[후속] 특성 획득'
      },
    }
  },
  {
    cardId: 'septime',
    levels: {
      1: { effects: [{ type: 'debuffStacks', value: 1 }], description: '디버프 +1' },
      2: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      3: {
        effects: [{ type: 'debuffStacks', value: 1 }],
        specialEffects: [{ type: 'debuffDurationBoost', value: 1 }],
        description: '디버프 +1, 디버프 지속 +1턴'
      },
      4: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      5: {
        effects: [],
        specialEffects: [
          { type: 'upgradeTrait', value: 'dull:dullPlus' },
          { type: 'upgradeTrait', value: 'shaken:shakenPlus' }
        ],
        description: '무딤 → 무딤+, 흔들림 → 흔들림+'
      },
    }
  },
  {
    cardId: 'redoublement',
    levels: {
      1: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      2: { effects: [{ type: 'counterShot', value: 1 }], description: '대응사격 +1' },
      3: {
        effects: [{ type: 'block', value: 1 }],
        specialEffects: [{ type: 'counterShotDamageBoost', value: 2 }],
        description: '방어 +1, 대응사격 피해 +2'
      },
      4: { effects: [{ type: 'counterShot', value: 1 }], description: '대응사격 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'extraShot', value: 2 }],
        description: '교차 시 사격 1 → 3회'
      },
    }
  },
  {
    cardId: 'sanglot_de_pluie',
    levels: {
      1: { effects: [{ type: 'block', value: 2 }], description: '방어 +2' },
      2: { effects: [{ type: 'onHitBlock', value: 1 }], description: '피격 방어 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'onHitBlock', value: 1 }], description: '피격 방어 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'onHitCounterDamage', value: 3 }],
        description: '피격 시 반격 3 피해'
      },
    }
  },
  {
    cardId: 'chant_du_vent_fleuri',
    levels: {
      1: { effects: [{ type: 'block', value: 3 }], description: '방어 +3' },
      2: { effects: [{ type: 'block', value: 2 }], description: '방어 +2' },
      3: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      4: { effects: [{ type: 'block', value: 2 }], description: '방어 +2' },
      5: {
        effects: [],
        specialEffects: [{ type: 'blockRetainPercent', value: 50 }],
        description: '다음 턴까지 방어력 50% 유지'
      },
    }
  },
  {
    cardId: 'le_songe_du_vieillard',
    levels: {
      1: { effects: [{ type: 'perCardBlock', value: 1 }], description: '카드당 방어 +1' },
      2: { effects: [{ type: 'perCardBlock', value: 1 }], description: '카드당 방어 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'repeatCardBoost', value: 20 }],
        description: '반복된 카드 피해/방어 +20%'
      },
    }
  },
  {
    cardId: 'sharpen_blade',
    levels: {
      1: { effects: [{ type: 'buffAmount', value: 1 }], description: '버프 +1' },
      2: { effects: [{ type: 'buffAmount', value: 1 }], description: '버프 +1' },
      3: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      4: { effects: [], description: '없음' },
      5: {
        effects: [],
        specialEffects: [{ type: 'applyToGunCards', value: 2 }],
        description: '총격 카드에도 +2 적용'
      },
    }
  },
  {
    cardId: 'combat_meditation',
    levels: {
      1: { effects: [{ type: 'finesseGain', value: 1 }], description: '기교 +1' },
      2: { effects: [], description: '없음' },
      3: {
        effects: [],
        specialEffects: [{ type: 'removeTrait', value: 'vanish' }],
        description: '[소멸] 제거'
      },
      4: { effects: [], description: '없음' },
      5: {
        effects: [{ type: 'finesseGain', value: 1 }],
        description: '기교 3 획득'
      },
    }
  },
  {
    cardId: 'el_rapide',
    levels: {
      1: { effects: [{ type: 'agilityGain', value: 1 }], description: '민첩 +1' },
      2: { effects: [{ type: 'agilityGain', value: 1 }], description: '민첩 +1' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'removePainPenalty' }],
        description: '속도 -1, 아픔 제거'
      },
      4: { effects: [{ type: 'agilityGain', value: 1 }], description: '민첩 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'agilityToStrength' }],
        description: '민첩이 힘에도 적용'
      },
    }
  },
];

// ============================================
// 총격 공격 카드 강화 데이터
// ============================================

const GUN_ATTACK_ENHANCEMENTS: CardEnhancement[] = [
  {
    cardId: 'shoot',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'addTrait', value: 'chain' }],
        description: '속도 -1, [연계] 획득'
      },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'critExtraShot', value: 1 }],
        description: '치명타 시 추가 사격 1회'
      },
    }
  },
  {
    cardId: 'gyrus_roulette',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'gyrusChanceBoost', value: 75 }],
        description: '50% 확률 → 75% 확률'
      },
    }
  },
  {
    cardId: 'double_tap_v2',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'alwaysReload' }],
        description: '치명타 시 장전 → 무조건 장전'
      },
    }
  },
  {
    cardId: 'gun_headshot',
    levels: {
      1: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      2: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'removeJamPenalty' }],
        description: '속도 -1, 탄걸림 제거'
      },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'executeEffect', value: 15 }],
        description: '처형 효과 추가 (HP 15 이하)'
      },
    }
  },
  {
    cardId: 'reload_spray',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'hits', value: 1 }], description: '타격 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'removeEmptyPenalty' }],
        description: '빈탄창 패널티 제거'
      },
    }
  },
  {
    cardId: 'intercept',
    levels: {
      1: { effects: [{ type: 'debuffStacks', value: 1 }], description: '디버프 +1' },
      2: { effects: [{ type: 'debuffStacks', value: 1 }], description: '디버프 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'crossStun' }],
        description: '교차 시 기절 효과 추가'
      },
    }
  },
  {
    cardId: 'spread',
    levels: {
      1: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      2: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      3: {
        effects: [{ type: 'damage', value: 1 }],
        specialEffects: [{ type: 'extraShot', value: 1 }],
        description: '피해 +1, 적당 2회 사격'
      },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'perHitKnockback', value: 1 }],
        description: '피해마다 넉백 1'
      },
    }
  },
  {
    cardId: 'flint_shot',
    levels: {
      1: { effects: [{ type: 'burnStacks', value: 1 }], description: '화상 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'burnStacks', value: 1 }], description: '화상 +1' },
      4: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'burnReduceBlock' }],
        description: '화상이 방어력도 감소'
      },
    }
  },
  {
    cardId: 'sniper_shot',
    levels: {
      1: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      2: { effects: [{ type: 'damage', value: 2 }], description: '피해 +2' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'removeJamPenalty' }],
        description: '속도 -1, 탄걸림 제거'
      },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'armorPiercePercent', value: 100 }],
        description: '방어력 무시'
      },
    }
  },
  {
    cardId: 'suppression_fire',
    levels: {
      1: { effects: [{ type: 'pushAmount', value: 1 }], description: '넉백 +1' },
      2: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'pushAmount', value: 1 }], description: '넉백 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'removeJamPenalty' }],
        description: '탄걸림 제거'
      },
    }
  },
  {
    cardId: 'atomic_bomb',
    levels: {
      1: { effects: [{ type: 'damage', value: 5 }], description: '피해 +5' },
      2: { effects: [{ type: 'damage', value: 5 }], description: '피해 +5' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'damage', value: 5 }], description: '피해 +5' },
      5: {
        effects: [{ type: 'damage', value: 15 }],
        description: '기교 소모 시 피해 130'
      },
    }
  },
];

// ============================================
// 총격 유틸 카드 강화 데이터
// ============================================

const GUN_UTILITY_ENHANCEMENTS: CardEnhancement[] = [
  {
    cardId: 'reload',
    levels: {
      1: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      2: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      3: {
        effects: [{ type: 'block', value: 2 }],
        specialEffects: [{ type: 'nextShotDamageBoost', value: 3 }],
        description: '방어 +2, 다음 사격 피해 +3'
      },
      4: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'reloadFinesseGain', value: 1 }],
        description: '장전 시 기교 +1'
      },
    }
  },
  {
    cardId: 'ap_load',
    levels: {
      1: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      2: { effects: [], description: '없음' },
      3: {
        effects: [],
        specialEffects: [{ type: 'armorPierceCount', value: 2 }],
        description: '방어 무시 → 2회 적용'
      },
      4: { effects: [], description: '없음' },
      5: {
        effects: [{ type: 'pushAmount', value: 2 }],
        description: '관통 시 넉백 2'
      },
    }
  },
  {
    cardId: 'incendiary_load',
    levels: {
      1: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      2: { effects: [], description: '없음' },
      3: {
        effects: [{ type: 'burnStacks', value: 1 }],
        description: '화상 2회로 증가'
      },
      4: { effects: [], description: '없음' },
      5: {
        effects: [],
        specialEffects: [{ type: 'burnReduceStrength' }],
        description: '화상이 힘 감소 효과 추가'
      },
    }
  },
  {
    cardId: 'hawks_eye',
    levels: {
      1: { effects: [{ type: 'critBoost', value: 3 }], description: '치명타 +3%' },
      2: { effects: [{ type: 'critBoost', value: 3 }], description: '치명타 +3%' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'critBoost', value: 2 }], description: '치명타 +2%' },
      5: {
        effects: [],
        specialEffects: [{ type: 'insightBoost', value: 1 }],
        description: '통찰 +1 → +2'
      },
    }
  },
  {
    cardId: 'long_draw',
    levels: {
      1: { effects: [{ type: 'block', value: 2 }], description: '방어 +2' },
      2: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'autoReloadBlock', value: 5 }],
        description: '속도 -1, 자동장전 시 방어 +5'
      },
      4: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'autoReloadAlways' }],
        description: '손패에 장전 없어도 장전'
      },
    }
  },
  {
    cardId: 'fragmentation_load',
    levels: {
      1: { effects: [{ type: 'fragStacks', value: 1 }], description: '파쇄탄 +1' },
      2: { effects: [{ type: 'fragStacks', value: 1 }], description: '파쇄탄 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'fragStacks', value: 1 }], description: '파쇄탄 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'fragPierce' }],
        description: '파쇄탄 관통 효과 추가'
      },
    }
  },
  {
    cardId: 'rapid_link',
    levels: {
      1: { effects: [{ type: 'debuffStacks', value: 1 }], description: '디버프 +1' },
      2: { effects: [{ type: 'debuffStacks', value: 1 }], description: '디버프 +1' },
      3: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      4: { effects: [], description: '없음' },
      5: {
        effects: [],
        specialEffects: [{ type: 'addTrait', value: 'chain' }],
        description: '[연계] 특성 획득'
      },
    }
  },
  {
    cardId: 'manipulation',
    levels: {
      1: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      2: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      3: {
        effects: [],
        specialEffects: [{ type: 'extraShot', value: 1 }],
        description: '탄걸림이면 사격도 추가'
      },
      4: { effects: [], description: '없음' },
      5: {
        effects: [{ type: 'finesseGain', value: 1 }],
        description: '기교 +1 획득'
      },
    }
  },
  {
    cardId: 'evasive_shot',
    levels: {
      1: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      2: { effects: [{ type: 'block', value: 1 }], description: '방어 +1' },
      3: {
        effects: [{ type: 'speedCost', value: -1 }],
        specialEffects: [{ type: 'extraBlur', value: 1 }],
        description: '속도 -1, 흐릿함 2회'
      },
      4: { effects: [{ type: 'damage', value: 1 }], description: '피해 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'extraEvasion', value: 1 }],
        description: '교차 시 회피+도 획득'
      },
    }
  },
  {
    cardId: 'tear_smoke_grenade',
    levels: {
      1: { effects: [{ type: 'debuffStacks', value: 1 }], description: '디버프 +1' },
      2: { effects: [{ type: 'debuffStacks', value: 1 }], description: '디버프 +1' },
      3: { effects: [{ type: 'speedCost', value: -1 }], description: '속도 -1' },
      4: { effects: [], description: '없음' },
      5: {
        effects: [],
        specialEffects: [{ type: 'counterOnHit', value: 3 }],
        description: '나에게 반격 3회 부여'
      },
    }
  },
  {
    cardId: 'execution_squad',
    levels: {
      1: { effects: [{ type: 'createCount', value: 1 }], description: '창조 +1' },
      2: { effects: [], description: '없음' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'createCount', value: 1 }], description: '창조 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'createdCardDamageBoost', value: 5 }],
        description: '창조된 카드 피해 +5'
      },
    }
  },
  {
    cardId: 'duel',
    levels: {
      1: { effects: [{ type: 'counterShot', value: 1 }], description: '대응사격 +1' },
      2: { effects: [{ type: 'counterShot', value: 1 }], description: '대응사격 +1' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'counterShot', value: 1 }], description: '대응사격 +1' },
      5: {
        effects: [],
        specialEffects: [
          { type: 'jamImmunityTurns', value: 3 },
          { type: 'counterShotDamageBoost', value: 3 }
        ],
        description: '탄걸림 면역 3턴 + 대응사격 피해 +3'
      },
    }
  },
];

// ============================================
// 공용 카드 강화 데이터
// ============================================

const COMMON_ENHANCEMENTS: CardEnhancement[] = [
  {
    cardId: 'mental_focus',
    levels: {
      1: { effects: [{ type: 'maxSpeedBoost', value: 2 }], description: '최대속도 +2' },
      2: { effects: [{ type: 'maxSpeedBoost', value: 2 }], description: '최대속도 +2' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [{ type: 'maxSpeedBoost', value: 1 }], description: '최대속도 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'nextTurnActionBoost', value: 2 }],
        description: '다음 턴 행동력도 +2'
      },
    }
  },
  {
    cardId: 'shout',
    levels: {
      1: { effects: [], description: '없음' },
      2: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      3: { effects: [], description: '없음' },
      4: { effects: [], description: '없음' },
      5: {
        effects: [],
        specialEffects: [{ type: 'extraRecall', value: 1 }],
        description: '2장 회수 가능'
      },
    }
  },
  {
    cardId: 'emergency_response',
    levels: {
      1: { effects: [{ type: 'drawCount', value: 1 }], description: '드로우 +1' },
      2: { effects: [], description: '없음' },
      3: {
        effects: [],
        specialEffects: [{ type: 'handLimitIncrease', value: 2 }],
        description: '손패 제한 6 → 8장'
      },
      4: { effects: [{ type: 'drawCount', value: 1 }], description: '드로우 +1' },
      5: {
        effects: [],
        specialEffects: [{ type: 'drawnCardSpeedReduce', value: 2 }],
        description: '뽑은 카드 속도 -2'
      },
    }
  },
  {
    cardId: 'stance',
    levels: {
      1: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      2: { effects: [], description: '없음' },
      3: {
        effects: [],
        specialEffects: [{ type: 'gainPositiveToken' }],
        description: '긍정 토큰 1개 획득'
      },
      4: { effects: [], description: '없음' },
      5: {
        effects: [],
        specialEffects: [{ type: 'repeatPreviousEffect', value: 50 }],
        description: '이전 카드 효과 50% 재발동'
      },
    }
  },
  {
    cardId: 'hologram',
    levels: {
      1: { effects: [{ type: 'durationTurns', value: 1 }], description: '지속 +1턴' },
      2: { effects: [], description: '없음' },
      3: { effects: [{ type: 'actionCost', value: -1 }], description: '행동력 -1' },
      4: { effects: [], description: '없음' },
      5: {
        effects: [],
        specialEffects: [{ type: 'excessBlockToStrength' }],
        description: '방어력 초과분을 힘으로 전환'
      },
    }
  },
];

// ============================================
// 전체 강화 데이터 병합
// ============================================

export const ALL_CARD_ENHANCEMENTS: CardEnhancement[] = [
  ...FENCING_ATTACK_ENHANCEMENTS,
  ...FENCING_DEFENSE_ENHANCEMENTS,
  ...GUN_ATTACK_ENHANCEMENTS,
  ...GUN_UTILITY_ENHANCEMENTS,
  ...COMMON_ENHANCEMENTS,
];

// 카드 ID로 강화 데이터 조회
export function getCardEnhancement(cardId: string): CardEnhancement | undefined {
  return ALL_CARD_ENHANCEMENTS.find(e => e.cardId === cardId);
}

// 특정 카드의 특정 레벨 강화 데이터 조회
export function getEnhancementLevel(cardId: string, level: number): EnhancementLevel | undefined {
  if (level < 1 || level > 5) {
    return undefined;
  }
  const enhancement = getCardEnhancement(cardId);
  return enhancement?.levels[level as 1 | 2 | 3 | 4 | 5];
}

// 누적 강화 효과 계산 (1강부터 현재 레벨까지)
export function getAccumulatedEffects(cardId: string, currentLevel: number): {
  effects: EnhancementEffect[];
  specialEffects: SpecialEffect[];
} {
  const enhancement = getCardEnhancement(cardId);
  if (!enhancement || currentLevel < 1 || currentLevel > 5) {
    return { effects: [], specialEffects: [] };
  }

  const accumulatedEffects: EnhancementEffect[] = [];
  const accumulatedSpecialEffects: SpecialEffect[] = [];

  for (let i = 1; i <= currentLevel; i++) {
    const level = enhancement.levels[i as 1 | 2 | 3 | 4 | 5];
    accumulatedEffects.push(...level.effects);
    if (level.specialEffects) {
      accumulatedSpecialEffects.push(...level.specialEffects);
    }
  }

  return {
    effects: accumulatedEffects,
    specialEffects: accumulatedSpecialEffects,
  };
}
