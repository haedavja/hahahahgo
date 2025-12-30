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

// 특성 ID 목록을 타입별로 분리
const POSITIVE_TRAITS: TraitDef[] = Object.values(TRAITS).filter(
  (t): t is TraitDef => t.type === 'positive'
);
const NEGATIVE_TRAITS: TraitDef[] = Object.values(TRAITS).filter(
  (t): t is TraitDef => t.type === 'negative'
);

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
 * 랜덤 요소 선택
 */
function pickRandom<T>(arr: T[], count: number = 1): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * weight 기반 가중치 랜덤 선택
 * 낮은 weight(희귀한 특성)일수록 등장 확률 낮음
 */
function weightedPickRandom<T extends { weight: number }>(arr: T[], count: number = 1): T[] {
  // weight의 역수로 확률 계산 (weight 1 = 5점, weight 5 = 1점)
  const weighted = arr.map(item => ({
    item,
    score: Math.random() * (6 - item.weight), // 낮은 weight가 낮은 점수
  }));
  weighted.sort((a, b) => b.score - a.score);
  return weighted.slice(0, count).map(w => w.item);
}

/**
 * 단일 긍정 특성 선택지 생성
 */
function createSinglePositiveOption(): SpecializationOption {
  const trait = weightedPickRandom(POSITIVE_TRAITS, 1)[0];
  return {
    id: `single_${trait.id}`,
    traits: [trait],
    totalWeight: trait.weight,
    description: `[${trait.name}] ${trait.description}`,
  };
}

/**
 * 긍정 + 부정 혼합 선택지 생성 (밸런스 맞춤)
 */
function createMixedOption(): SpecializationOption {
  // 긍정 특성 1~2개 선택 (weight 합 3~5)
  const positiveCount = Math.random() > 0.5 ? 2 : 1;
  const positives = weightedPickRandom(POSITIVE_TRAITS, positiveCount);
  const positiveWeight = positives.reduce((sum, t) => sum + t.weight, 0);

  // 부정 특성으로 밸런스 맞춤 (긍정 weight의 50~80% 정도)
  const targetNegativeWeight = Math.floor(positiveWeight * (0.5 + Math.random() * 0.3));
  let negativeWeight = 0;
  const negatives: TraitDef[] = [];

  const availableNegatives = [...NEGATIVE_TRAITS].sort(() => Math.random() - 0.5);
  for (const neg of availableNegatives) {
    if (negativeWeight + neg.weight <= targetNegativeWeight + 1) {
      negatives.push(neg);
      negativeWeight += neg.weight;
      if (negativeWeight >= targetNegativeWeight) break;
    }
  }

  const allTraits = [...positives, ...negatives];
  const netWeight = positiveWeight - negativeWeight;

  const posDesc = positives.map(t => `+${t.name}`).join(', ');
  const negDesc = negatives.map(t => `-${t.name}`).join(', ');

  return {
    id: `mixed_${positives.map(t => t.id).join('_')}`,
    traits: allTraits,
    totalWeight: netWeight,
    description: `[${posDesc}] [${negDesc}]`,
  };
}

/**
 * 기존 특성 기반 연관 선택지 생성
 */
function createSynergyOption(existingTraits: string[]): SpecializationOption | null {
  if (existingTraits.length === 0) return null;

  // 기존 특성과 연관된 특성 수집
  const synergyIds = new Set<string>();
  for (const traitId of existingTraits) {
    const synergies = TRAIT_SYNERGIES[traitId] || [];
    synergies.forEach(s => {
      // 이미 가진 특성은 제외
      if (!existingTraits.includes(s)) {
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
    const strongPositive = weightedPickRandom(
      POSITIVE_TRAITS.filter(t => t.weight >= 2),
      1
    )[0];
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
 * @returns 5개의 특화 선택지
 */
export function generateSpecializationOptions(existingTraits: string[] = []): SpecializationOption[] {
  const options: SpecializationOption[] = [];
  const usedTraitIds = new Set<string>();

  // 1. 연관 특성 선택지 (기존 특성이 있으면 1~2개)
  if (existingTraits.length > 0) {
    const synergyCount = Math.min(2, existingTraits.length);
    for (let i = 0; i < synergyCount; i++) {
      const synergyOption = createSynergyOption(existingTraits);
      if (synergyOption && !synergyOption.traits.some(t => usedTraitIds.has(t.id))) {
        options.push(synergyOption);
        synergyOption.traits.forEach(t => usedTraitIds.add(t.id));
      }
    }
  }

  // 2. 혼합 선택지 (1~2개)
  const mixedCount = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < mixedCount && options.length < 4; i++) {
    const mixedOption = createMixedOption();
    if (!mixedOption.traits.some(t => usedTraitIds.has(t.id))) {
      options.push(mixedOption);
      mixedOption.traits.forEach(t => usedTraitIds.add(t.id));
    }
  }

  // 3. 나머지는 단일 긍정 특성 선택지로 채움
  while (options.length < 5) {
    const singleOption = createSinglePositiveOption();
    if (!usedTraitIds.has(singleOption.traits[0].id)) {
      options.push(singleOption);
      usedTraitIds.add(singleOption.traits[0].id);
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
