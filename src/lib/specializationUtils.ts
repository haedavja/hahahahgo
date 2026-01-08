/**
 * @file specializationUtils.ts
 * @description 카드 특화 시스템 유틸리티
 *
 * 특화: 카드에 랜덤 특성을 부여하는 성장 방법
 * - 5개의 선택지 제공
 * - 각 선택지는 복수의 특성 포함 가능
 * - 복수 특성일 경우 긍정 + 부정 혼합
 * - 기존 특성에 기반한 연관 선택지 등장
 */

import { TRAITS } from '../components/battle/battleData';

/** 특성 정의 타입 */
interface TraitDef {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  weight: number;
  description: string;
}

/** 특화 선택지 */
export interface SpecializationOption {
  id: string;
  traits: TraitDef[];
  totalWeight: number;
  description: string;
}

/** 카드 타입 */
export type CardType = 'attack' | 'defense' | 'general';

// 공격 카드에서만 의미 있는 특성 (방어 카드에 등장하면 안 됨)
const ATTACK_ONLY_TRAITS = new Set([
  'crush',       // 분쇄: 상대방 방어력에 2배 피해
  'knockback',   // 넉백: 상대 타임라인을 뒤로 민다 (공격 적중 시)
  'destroyer',   // 파괴자: 공격력 50% 증가
  'slaughter',   // 도살: 기본피해량 75% 증가
  'pinnacle',    // 정점: 피해량 2.5배
  'stun',        // 기절: 타임라인 범위내 상대 카드 파괴 (공격 적중 시)
  'cooperation', // 협동: 조합에 포함되면 공격력 50% 추가
  'training',    // 단련: 사용 후 힘 +1 (힘은 공격력에만 영향)
  'finisher',    // 마무리: 연계되면 피해 50% 증가
  'chain',       // 연계: 다음 카드가 검격이면 효과 (공격 카드 연계용)
  'followup',    // 후속: 연계하면 성능 50% 증폭 (주로 공격 연계)
  'cross',       // 교차: 적 카드와 겹치면 효과 (공격 시 발동)
]);

// 방어 카드에서만 의미 있는 특성 (공격 카드에 등장하면 안 됨)
const DEFENSE_ONLY_TRAITS = new Set([
  'guard_stance', // 방어 태세
  'cautious',     // 신중함
  'indomitable',  // 불굴
  'solidarity',   // 결속
]);

// 특성 ID 목록을 타입별로 분리
const POSITIVE_TRAITS: TraitDef[] = Object.values(TRAITS).filter(
  (t): t is TraitDef => t.type === 'positive'
);
const NEGATIVE_TRAITS: TraitDef[] = Object.values(TRAITS).filter(
  (t): t is TraitDef => t.type === 'negative'
);

/**
 * 카드 타입에 따라 유효한 특성만 필터링
 */
function filterTraitsByCardType(traits: TraitDef[], cardType: CardType): TraitDef[] {
  return traits.filter(t => {
    // 방어/일반 카드에는 공격 전용 특성 제외
    if ((cardType === 'defense' || cardType === 'general') && ATTACK_ONLY_TRAITS.has(t.id)) {
      return false;
    }
    // 공격 카드에는 방어 전용 특성 제외
    if (cardType === 'attack' && DEFENSE_ONLY_TRAITS.has(t.id)) {
      return false;
    }
    return true;
  });
}

/** 특성 연관 관계 정의 (기존 특성 → 추가 특성) */
const TRAIT_SYNERGIES: Record<string, string[]> = {
  // 공격 계열
  strongbone: ['destroyer', 'slaughter', 'pinnacle'],
  destroyer: ['slaughter', 'pinnacle', 'strongbone'],
  slaughter: ['pinnacle', 'destroyer', 'finisher'],
  pinnacle: ['emperor', 'monarch'],

  // 연계 계열
  chain: ['followup', 'finisher', 'swift'],
  followup: ['finisher', 'chain', 'cooperation'],
  finisher: ['followup', 'chain', 'slaughter'],

  // 속도/행동 계열
  swift: ['mastery', 'advance', 'warmup'],
  mastery: ['swift', 'training'],
  warmup: ['swift', 'mastery'],
  advance: ['swift', 'knockback'],

  // 방어 계열
  guard_stance: ['cautious', 'indomitable', 'solidarity'],
  cautious: ['guard_stance', 'indomitable'],
  indomitable: ['guard_stance', 'cautious'],
  solidarity: ['guard_stance', 'focus'],

  // 에테르/자원 계열
  focus: ['emperor', 'solidarity'],
  emperor: ['pinnacle', 'monarch', 'focus'],
  monarch: ['emperor', 'pinnacle'],

  // 상태이상 계열
  burn: ['poison', 'stun'],
  poison: ['burn', 'slow'],
  stun: ['knockback', 'burn'],
  knockback: ['stun', 'advance'],

  // 유틸리티 계열
  repeat: ['attendance', 'insurance'],
  attendance: ['repeat', 'insurance'],
  insurance: ['attendance', 'repeat'],
  creation: ['general', 'advisor'],
  general: ['advisor', 'creation'],
  advisor: ['general', 'repeat'],

  // 부정 특성도 연관 관계 설정
  weakbone: ['slow', 'escape'],
  slow: ['weakbone', 'boredom'],
  exhaust: ['vanish', 'ruin'],
  vanish: ['exhaust', 'oblivion'],
};

/**
 * weight 기반 가중치 랜덤 선택
 * 낮은 weight(희귀한 특성)일수록 등장 확률 낮음
 * @returns 빈 배열이 아님을 보장하지 않음 - 호출자가 체크해야 함
 */
function weightedPickRandom<T extends { weight: number }>(arr: T[], count: number = 1): T[] {
  if (arr.length === 0) return [];
  // weight의 역수로 확률 계산 (weight 1 = 5점, weight 5 = 1점)
  const weighted = arr.map(item => ({
    item,
    score: Math.random() * (6 - item.weight), // 낮은 weight가 낮은 점수
  }));
  weighted.sort((a, b) => b.score - a.score);
  return weighted.slice(0, Math.min(count, arr.length)).map(w => w.item);
}

/**
 * 단일 긍정 특성 선택지 생성
 * @returns null if no positive traits available
 */
function createSinglePositiveOption(cardType: CardType): SpecializationOption | null {
  const availableTraits = filterTraitsByCardType(POSITIVE_TRAITS, cardType);
  const traits = weightedPickRandom(availableTraits, 1);
  if (traits.length === 0) return null;

  const trait = traits[0];
  return {
    id: `single_${trait.id}`,
    traits: [trait],
    totalWeight: trait.weight,
    description: `[${trait.name}] ${trait.description}`,
  };
}

/**
 * 긍정 + 부정 혼합 선택지 생성 (밸런스 맞춤)
 * @returns null if no positive traits available
 */
function createMixedOption(cardType: CardType): SpecializationOption | null {
  // 카드 타입에 맞는 특성만 사용
  const availablePositives = filterTraitsByCardType(POSITIVE_TRAITS, cardType);
  const availableNegatives = filterTraitsByCardType(NEGATIVE_TRAITS, cardType);

  // 긍정 특성 1~2개 선택 (weight 합 3~5)
  const positiveCount = Math.random() > 0.5 ? 2 : 1;
  const positives = weightedPickRandom(availablePositives, positiveCount);
  if (positives.length === 0) return null;

  const positiveWeight = positives.reduce((sum, t) => sum + t.weight, 0);

  // 부정 특성으로 밸런스 맞춤 (긍정 weight의 50~80% 정도)
  const targetNegativeWeight = Math.floor(positiveWeight * (0.5 + Math.random() * 0.3));
  let negativeWeight = 0;
  const negatives: TraitDef[] = [];

  const shuffledNegatives = [...availableNegatives].sort(() => Math.random() - 0.5);
  for (const neg of shuffledNegatives) {
    if (negativeWeight + neg.weight <= targetNegativeWeight + 1) {
      negatives.push(neg);
      negativeWeight += neg.weight;
      if (negativeWeight >= targetNegativeWeight) break;
    }
  }

  const allTraits = [...positives, ...negatives];
  const netWeight = positiveWeight - negativeWeight;

  const posDesc = positives.map(t => `+${t.name}`).join(', ');
  const negDesc = negatives.length > 0 ? negatives.map(t => `-${t.name}`).join(', ') : '';

  return {
    id: `mixed_${positives.map(t => t.id).join('_')}`,
    traits: allTraits,
    totalWeight: netWeight,
    description: negDesc ? `[${posDesc}] [${negDesc}]` : `[${posDesc}]`,
  };
}

/**
 * 기존 특성 기반 연관 선택지 생성
 */
function createSynergyOption(existingTraits: string[], cardType: CardType): SpecializationOption | null {
  if (existingTraits.length === 0) return null;

  // 기존 특성과 연관된 특성 수집 (카드 타입에 맞는 것만)
  const synergyIds = new Set<string>();
  for (const traitId of existingTraits) {
    const synergies = TRAIT_SYNERGIES[traitId] || [];
    synergies.forEach(s => {
      // 이미 가진 특성은 제외
      if (!existingTraits.includes(s)) {
        // 카드 타입에 맞지 않는 특성 제외
        if ((cardType === 'defense' || cardType === 'general') && ATTACK_ONLY_TRAITS.has(s)) {
          return;
        }
        if (cardType === 'attack' && DEFENSE_ONLY_TRAITS.has(s)) {
          return;
        }
        synergyIds.add(s);
      }
    });
  }

  if (synergyIds.size === 0) return null;

  // 연관 특성 중 하나 선택
  const synergyArray = Array.from(synergyIds);
  const selectedId = synergyArray[Math.floor(Math.random() * synergyArray.length)];
  const trait = TRAITS[selectedId as keyof typeof TRAITS] as TraitDef | undefined;

  if (!trait) return null;

  // 연관 특성이 긍정이면 그대로, 아니면 긍정 특성과 혼합
  if (trait.type === 'positive') {
    return {
      id: `synergy_${trait.id}`,
      traits: [trait],
      totalWeight: trait.weight,
      description: `[연관: ${trait.name}] ${trait.description}`,
    };
  } else {
    // 부정 연관 특성은 강한 긍정 특성과 함께
    const availablePositives = filterTraitsByCardType(POSITIVE_TRAITS, cardType);
    const strongPositives = weightedPickRandom(
      availablePositives.filter(t => t.weight >= 2),
      1
    );
    // weight >= 2 특성이 없으면 일반 긍정 특성 사용
    const positivePool = strongPositives.length > 0 ? strongPositives : weightedPickRandom(availablePositives, 1);
    if (positivePool.length === 0) return null;

    const strongPositive = positivePool[0];
    return {
      id: `synergy_mixed_${strongPositive.id}_${trait.id}`,
      traits: [strongPositive, trait],
      totalWeight: strongPositive.weight - trait.weight,
      description: `[${strongPositive.name}] [${trait.name}]`,
    };
  }
}

/**
 * 특화 선택지 5개 생성
 * @param existingTraits 카드가 이미 보유한 특성 ID 배열
 * @param cardType 카드 타입 (attack/defense/general) - 타입에 맞지 않는 특성 제외
 * @returns 최대 5개의 특화 선택지 (특성이 부족하면 더 적을 수 있음)
 */
export function generateSpecializationOptions(existingTraits: string[] = [], cardType: CardType = 'attack'): SpecializationOption[] {
  const options: SpecializationOption[] = [];
  const usedTraitIds = new Set<string>(existingTraits); // 기존 특성도 제외 대상에 포함
  const MAX_ATTEMPTS = 20; // 무한 루프 방지
  let attempts = 0;

  // 특성이 기존에 없는지 체크하는 헬퍼
  const hasNoExistingTraits = (option: SpecializationOption): boolean => {
    return !option.traits.some(t => existingTraits.includes(t.id));
  };

  // 1. 연관 특성 선택지 (기존 특성이 있으면 1~2개)
  if (existingTraits.length > 0) {
    const synergyCount = Math.min(2, existingTraits.length);
    for (let i = 0; i < synergyCount && attempts < MAX_ATTEMPTS; i++) {
      attempts++;
      const synergyOption = createSynergyOption(existingTraits, cardType);
      if (synergyOption && hasNoExistingTraits(synergyOption) && !synergyOption.traits.some(t => usedTraitIds.has(t.id))) {
        options.push(synergyOption);
        synergyOption.traits.forEach(t => usedTraitIds.add(t.id));
      }
    }
  }

  // 2. 혼합 선택지 (1~2개)
  const mixedCount = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < mixedCount && options.length < 4 && attempts < MAX_ATTEMPTS; i++) {
    attempts++;
    const mixedOption = createMixedOption(cardType);
    if (mixedOption && hasNoExistingTraits(mixedOption) && !mixedOption.traits.some(t => usedTraitIds.has(t.id))) {
      options.push(mixedOption);
      mixedOption.traits.forEach(t => usedTraitIds.add(t.id));
    }
  }

  // 3. 나머지는 단일 긍정 특성 선택지로 채움 (무한 루프 방지)
  while (options.length < 5 && attempts < MAX_ATTEMPTS) {
    attempts++;
    const singleOption = createSinglePositiveOption(cardType);
    if (!singleOption) break; // 더 이상 생성 불가

    if (hasNoExistingTraits(singleOption) && !usedTraitIds.has(singleOption.traits[0].id)) {
      options.push(singleOption);
      usedTraitIds.add(singleOption.traits[0].id);
    }
  }

  // 옵션이 부족하면 중복 허용하여 채움 (기존 특성과는 여전히 중복 불가)
  while (options.length < 5) {
    const fallbackOption = createSinglePositiveOption(cardType);
    if (!fallbackOption) break;
    if (hasNoExistingTraits(fallbackOption)) {
      options.push(fallbackOption);
    }
  }

  // 랜덤하게 섞기
  return options.sort(() => Math.random() - 0.5);
}

/**
 * 특성 ID로 특성 정보 조회
 */
export function getTraitById(traitId: string): TraitDef | null {
  return (TRAITS[traitId as keyof typeof TRAITS] as TraitDef) || null;
}

/**
 * 특성 배열을 설명 문자열로 변환
 */
export function formatTraits(traitIds: string[]): string {
  return traitIds
    .map(id => {
      const trait = getTraitById(id);
      if (!trait) return id;
      const prefix = trait.type === 'positive' ? '+' : '-';
      return `${prefix}${trait.name}`;
    })
    .join(', ');
}
