/**
 * @file battleData.ts
 * @description 전투 시스템 데이터 정의 (카드, 특성, 적)
 */

import type { EnemyDefinition } from '../../types/enemy';
import type { BattleTokenActions } from '../../types/core';

// Re-export for backwards compatibility
export type { EnemyDefinition };

export const MAX_SPEED = 30; // 기본 최대 속도 (레거시 호환용)
export const DEFAULT_PLAYER_MAX_SPEED = 30; // 플레이어 기본 최대 속도
export const DEFAULT_ENEMY_MAX_SPEED = 30; // 적 기본 최대 속도
export const BASE_PLAYER_ENERGY = 6;
export const MAX_SUBMIT_CARDS = 5;
export const ETHER_THRESHOLD = 100;
export const DEFAULT_DRAW_COUNT = 5; // 턴 시작 시 기본 드로우 수

// 기본 시작 덱 (게임 시작 시 플레이어가 갖고 시작하는 카드)
export const DEFAULT_STARTING_DECK = [
  'shoot', 'shoot',           // 사격 2장
  'strike', 'strike', 'strike', // 타격 3장
  'reload',                   // 장전 1장
  'quarte',                   // 꺄르트 1장
  'octave',                   // 옥타브 1장
  'breach',                   // 브리치 1장
  'deflect'                   // 빠라드 1장
];

// 타임라인 틱 생성 함수 (동적)
export function generateSpeedTicks(maxSpeed: number) {
  const tickInterval = 5;
  return Array.from(
    { length: Math.floor(maxSpeed / tickInterval) + 1 },
    (_, idx) => idx * tickInterval
  );
}

// 특성(Trait) 정의
export const TRAITS = {
  // 긍정 특성 (★)
  swift: { id: "swift", name: "신속함", type: "positive", weight: 1, description: "속도 -2" },
  repeat: { id: "repeat", name: "반복", type: "positive", weight: 1, description: "다음턴에도 손패에 확정적으로 등장" },
  strongbone: { id: "strongbone", name: "강골", type: "positive", weight: 1, description: "피해량/방어력 25% 증가" },
  crush: { id: "crush", name: "분쇄", type: "positive", weight: 1, description: "상대방 방어력에 2배 피해" },
  cooperation: { id: "cooperation", name: "협동", type: "positive", weight: 1, description: "조합에 포함되면 공격력을 50% 추가 획득합니다." },
  mastery: { id: "mastery", name: "숙련", type: "positive", weight: 1, description: "카드 쓸수록 시간 -2, 최소값 1" },
  training: { id: "training", name: "단련", type: "positive", weight: 1, description: "사용 후 힘 +1" },
  chain: { id: "chain", name: "연계", type: "positive", weight: 1, description: "다음 카드가 검격이면 타임라인 3 앞당김" },
  followup: { id: "followup", name: "후속", type: "positive", weight: 1, description: "연계하면 성능 50% 증폭" },
  finisher: { id: "finisher", name: "마무리", type: "positive", weight: 2, description: "연계되면 피해 50% 증가, 후속되면 기교 1 획득" },

  // 긍정 특성 (★★)
  general: { id: "general", name: "장군", type: "positive", weight: 2, description: "다음턴 보조특기 등장률 25% 증가" },
  knockback: { id: "knockback", name: "넉백", type: "positive", weight: 2, description: "상대 타임라인 3 뒤로 밀기" },
  advance: { id: "advance", name: "앞당김", type: "positive", weight: 2, description: "내 타임라인 3 앞당김" },
  cross: { id: "cross", name: "교차", type: "positive", weight: 2, description: "타임라인 상 한 번이라도 적 카드와 겹친 적 있으면 효과 발동/증폭" },
  destroyer: { id: "destroyer", name: "파괴자", type: "positive", weight: 2, description: "공격력 50% 증가" },
  warmup: { id: "warmup", name: "몸풀기", type: "positive", weight: 2, description: "다음턴 행동력 +2" },

  // 긍정 특성 (★★★)
  stun: { id: "stun", name: "기절", type: "positive", weight: 3, description: "타임라인 5범위내 상대 카드 파괴" },
  slaughter: { id: "slaughter", name: "도살", type: "positive", weight: 3, description: "기본피해량 75% 증가" },

  // 긍정 특성 (★★★★★)
  pinnacle: { id: "pinnacle", name: "정점", type: "positive", weight: 5, description: "피해량 2.5배" },

  // 부정 특성 (★)
  outcast: { id: "outcast", name: "소외", type: "negative", weight: 1, description: "조합 제외, 행동력 -1" },
  double_edge: { id: "double_edge", name: "양날의 검", type: "negative", weight: 1, description: "사용시 1 피해" },
  weakbone: { id: "weakbone", name: "약골", type: "negative", weight: 1, description: "피해량/방어력 20% 감소" },
  slow: { id: "slow", name: "굼뜸", type: "negative", weight: 1, description: "속도 +3" },
  escape: { id: "escape", name: "탈주", type: "negative", weight: 1, description: "다음턴 손패에 미등장" },
  stubborn: { id: "stubborn", name: "고집", type: "negative", weight: 1, description: "대응단계 순서변경 불가" },
  boredom: { id: "boredom", name: "싫증", type: "negative", weight: 1, description: "사용시마다 시간 +2" },

  // 부정 특성 (★★)
  exhaust: { id: "exhaust", name: "탈진", type: "negative", weight: 2, description: "다음턴 행동력 -2" },
  vanish: { id: "vanish", name: "소멸", type: "negative", weight: 2, description: "사용 후 게임에서 제외" },
  last: { id: "last", name: "마지막", type: "negative", weight: 2, description: "타임라인 마지막에 발동" },
  robber: { id: "robber", name: "날강도", type: "negative", weight: 2, description: "사용시 10골드 소실" },

  // 부정 특성 (★★★)
  ruin: { id: "ruin", name: "파탄", type: "negative", weight: 3, description: "다음턴 주특기만 등장" },
  oblivion: { id: "oblivion", name: "망각", type: "negative", weight: 3, description: "이후 에테르 획득 불가" },

  // 중립/특수 특성
  leisure: { id: "leisure", name: "여유", type: "positive", weight: 1, description: "속도 4인 카드를 4~8 범위 내 원하는 위치에 배치" },
  strain: { id: "strain", name: "무리", type: "positive", weight: 1, description: "클릭 시 행동력 1을 사용해 속도를 최대 3까지 앞당김" }
};

export const CARDS = [
  // === 펜싱 카드 ===
  {
    id: "marche",
    name: "마르쉐",
    type: "general",
    block: 5,
    speedCost: 6,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 5, 흐릿함 1회. 앞당김 4.",
    traits: ["advance"],
    cardCategory: "fencing",
    special: "advanceTimeline",
    advanceAmount: 4,
    appliedTokens: [{ id: 'blur', target: 'player' }],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      actions.addTokenToPlayer('blur', 1);
    }
  },
  {
    id: "lunge",
    name: "런지",
    type: "attack",
    damage: 20,
    speedCost: 12,
    actionCost: 1,
    iconKey: "sword",
    description: "공격력 20. 피해 성공 시 넉백 5.",
    traits: ["knockback"],
    cardCategory: "fencing",
    special: "pushEnemyTimeline",
    pushAmount: 5
  },
  {
    id: "fleche",
    name: "플레쉬",
    type: "attack",
    damage: 8,
    speedCost: 11,
    actionCost: 2,
    iconKey: "sword",
    description: "공격력 8. 피해를 입힐 때마다 최대 2번 공격 카드를 창조한다. 교차 시 사격 1회.",
    traits: ["creation", "cross"],
    cardCategory: "fencing",
    special: "createAttackOnHit",
    crossBonus: { type: 'gun_attack', count: 1 }
  },
  {
    id: "flank",
    name: "플랭크",
    type: "attack",
    damage: 24,
    speedCost: 14,
    actionCost: 1,
    iconKey: "sword",
    description: "공격력 24. 분쇄 특성으로 상대 방어력에 2배 피해를 준다.",
    traits: ["crush"],
    cardCategory: "fencing"
  },
  {
    id: "thrust",
    name: "투셰",
    type: "attack",
    damage: 13,
    speedCost: 8,
    actionCost: 2,
    iconKey: "sword",
    description: "공격력 13. 상대에게 흔들림을 부여한다.",
    traits: ["chain"],
    cardCategory: "fencing",
    advanceAmount: 3,
    appliedTokens: [{ id: 'shaken', target: 'enemy' }],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      actions.addTokenToEnemy('shaken', 1);
    }
  },
  {
    id: "beat",
    name: "비트",
    type: "attack",
    damage: 4,
    hits: 2,
    speedCost: 9,
    actionCost: 2,
    iconKey: "sword",
    description: "공격력 4, 2번 피해. 교차 시 피해 2배. 피해 성공 시 넉백 2.",
    traits: ["cross", "knockback"],
    cardCategory: "fencing",
    special: "beatEffect",
    pushAmount: 2,
    crossBonus: { type: 'damage_mult', value: 2 }
  },
  {
    id: "feint",
    name: "페인트",
    type: "attack",
    damage: 5,
    speedCost: 4,
    actionCost: 1,
    iconKey: "sword",
    description: "공격력 5. 회피 1회, 공세 1회를 얻는다.",
    traits: ["chain"],
    cardCategory: "fencing",
    advanceAmount: 3,
    appliedTokens: [{ id: 'evasion', target: 'player' }, { id: 'offense', target: 'player' }],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      actions.addTokenToPlayer('evasion', 1);
      actions.addTokenToPlayer('offense', 1);
    }
  },
  {
    id: "defensive_stance",
    name: "프로나시옹",
    type: "general",
    block: 0,
    speedCost: 3,
    actionCost: 2,
    iconKey: "shield",
    description: "타임라인 1 지날때마다 방어력 1씩 증가. 힘, 상태이상 무시.",
    traits: [],
    cardCategory: "fencing",
    special: "growingDefense",
    ignoreStrength: true,
    ignoreStatus: true
  },
  {
    id: "disrupt",
    name: "데가지망",
    type: "attack",
    damage: 19,
    speedCost: 7,
    actionCost: 3,
    iconKey: "sword",
    description: "공격력 19. 적 마지막 카드에 넉백 9.",
    traits: ["knockback"],
    cardCategory: "fencing",
    special: "pushLastEnemyCard",
    pushAmount: 9
  },
  {
    id: "redoublement",
    name: "르두블망",
    type: "general",
    block: 6,
    speedCost: 8,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 6. 대응사격 2회 부여. 교차 시 사격 1회.",
    traits: ["cross"],
    cardCategory: "fencing",
    appliedTokens: [
      { id: 'counterShot', stacks: 2, target: 'player' }
    ],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      actions.addTokenToPlayer('counterShot', 2);
    },
    crossBonus: { type: 'gun_attack', count: 1 }
  },
  {
    id: "grind",
    name: "람 데르",
    type: "attack",
    damage: 55,
    speedCost: 20,
    actionCost: 3,
    iconKey: "flame",
    description: "공격력 55, 방어력 무시. 순수 깡딜로 상대를 갈아버린다.",
    traits: [],
    special: "ignoreBlock"
  },
  {
    id: "strike",
    name: "타격",
    type: "attack",
    damage: 15,
    speedCost: 8,
    actionCost: 1,
    iconKey: "sword",
    description: "공격력 15.",
    traits: ["chain"],
    cardCategory: "fencing",
    advanceAmount: 3
  },
  {
    id: "binding",
    name: "바인딩",
    type: "attack",
    damage: 4,
    speedCost: 2,
    actionCost: 1,
    iconKey: "sword",
    description: "공격력 4. 교차 시 교차된 카드를 다음 카드까지 최대 8만큼 밀어냄. 밀어낸 만큼 방어력 획득.",
    traits: ["cross", "followup"],
    cardCategory: "fencing",
    crossBonus: { type: 'push_gain_block', maxPush: 8 }
  },

  // === 총기 카드 ===
  {
    id: "shoot",
    name: "사격",
    type: "attack",
    damage: 5,
    speedCost: 3,
    actionCost: 1,
    iconKey: "flame",
    description: "공격력 5. 기본 총격 공격.",
    traits: [],
    cardCategory: "gun"
  },
  {
    id: "gyrus_roulette",
    name: "가이러스 룰렛",
    type: "attack",
    damage: 8,
    speedCost: 4,
    actionCost: 1,
    iconKey: "flame",
    description: "기교 1 소모. 남은 행동력에 비례해 사격을 실행한다. 50% 확률로 행동력당 2번 사격한다.",
    traits: [],
    special: "gyrusRoulette",
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 1 }]
  },
  {
    id: "ap_load",
    name: "철갑탄 장전",
    type: "general",
    block: 0,
    speedCost: 2,
    actionCost: 1,
    iconKey: "shield",
    description: "장전 효과 + 다음 총격이 방어력을 무시한다.",
    traits: [],
    cardCategory: "gun",
    appliedTokens: [{ id: 'armor_piercing', target: 'player' }],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      // 탄걸림 해제 + 룰렛 0으로 초기화 후 추가 효과 적용
      actions.removeTokenFromPlayer('gun_jam', 'permanent', 99);
      actions.resetTokenForPlayer('roulette', 'permanent', 0); // 룰렛 0으로 초기화
      actions.addTokenToPlayer('armor_piercing', 1);
    }
  },
  {
    id: "incendiary_load",
    name: "소이탄 장전",
    type: "general",
    block: 0,
    speedCost: 2,
    actionCost: 1,
    iconKey: "shield",
    description: "장전 효과 + 다음 총격이 화상을 입힌다.",
    traits: [],
    cardCategory: "gun",
    appliedTokens: [{ id: 'incendiary', target: 'player' }],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      // 탄걸림 해제 + 룰렛 0으로 초기화 후 추가 효과 적용
      actions.removeTokenFromPlayer('gun_jam', 'permanent', 99);
      actions.resetTokenForPlayer('roulette', 'permanent', 0); // 룰렛 0으로 초기화
      actions.addTokenToPlayer('incendiary', 1);
    }
  },
  {
    id: "reload",
    name: "전술장전",
    type: "general",
    block: 5,
    speedCost: 2,
    actionCost: 0,
    iconKey: "shield",
    description: "방어력 5. 탄걸림을 해제하고 룰렛을 초기화한다.",
    traits: [],
    cardCategory: "gun",
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      // 탄걸림 해제 + 룰렛 0으로 초기화
      actions.removeTokenFromPlayer('gun_jam', 'permanent', 99);
      actions.resetTokenForPlayer('roulette', 'permanent', 0); // 룰렛 0으로 초기화
    }
  },
  {
    id: "hawks_eye",
    name: "매의 눈",
    type: "general",
    block: 0,
    speedCost: 3,
    actionCost: 2,
    iconKey: "shield",
    description: "이번 전투 동안 통찰 +1, 치명타율 +5%를 얻는다.",
    traits: [],
    appliedTokens: [{ id: 'insight', target: 'player' }, { id: 'crit_boost', target: 'player' }],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      actions.addTokenToPlayer('insight', 1);
      actions.addTokenToPlayer('crit_boost', 1);
    }
  },
  {
    id: "gun_headshot",
    name: "헤드샷",
    type: "attack",
    damage: 8,
    speedCost: 8,
    actionCost: 1,
    iconKey: "flame",
    description: "공격력 8. 확정 치명타. 사용 후 탄걸림.",
    traits: ["finisher"],
    special: ["guaranteedCrit", "emptyAfterUse"],
    cardCategory: "gun"
  },
  {
    id: "reload_spray",
    name: "장전-난사",
    type: "attack",
    damage: 5,
    hits: 4,
    speedCost: 6,
    actionCost: 3,
    iconKey: "flame",
    description: "장전 후 5피해를 4회 사격. 사용 후 빈탄창.",
    traits: [],
    special: "reloadSpray",
    cardCategory: "gun"
    // loaded 토큰은 processPreAttackSpecials에서 처리 (빈탄창 상쇄)
  },
  {
    id: "long_draw",
    name: "롱빼",
    type: "general",
    block: 10,
    speedCost: 6,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 10. 손패에 장전카드가 있으면 자동으로 장전한다.",
    traits: [],
    cardCategory: "fencing",
    special: "autoReload"
  },
  {
    id: "mental_focus",
    name: "정신집중",
    type: "general",
    block: 0,
    speedCost: 1,
    actionCost: 2,
    iconKey: "shield",
    description: "다음 턴 최대속도 8 증가, 카드 2장 더 사용 가능.",
    traits: [],
    special: "mentalFocus"
  },

  // === 펜싱 유틸리티 카드 ===
  {
    id: "deflect",
    name: "빠라드",
    type: "general",
    block: 8,
    speedCost: 3,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 8. 발동 후 5 범위 안에 적 공격이 있으면 넉백 3.",
    traits: ["chain", "knockback"],
    cardCategory: "fencing",
    special: "parryPush",
    parryRange: 5,
    parryPushAmount: 3,
    advanceAmount: 3
  },
  {
    id: "breach",
    name: "브리치",
    type: "general",
    block: 5,
    speedCost: 5,
    actionCost: 2,
    iconKey: "shield",
    description: "방어력 5. 공격/방어 카드 3장을 창조해 하나를 선택, 타임라인 +3 속도로 끼워넣음.",
    traits: ["creation"],
    special: "breach",
    breachSpOffset: 3
  },
  {
    id: "octave",
    name: "옥타브",
    type: "general",
    block: 12,
    speedCost: 5,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 12. 교차 시 방어력 2배.",
    traits: ["cross"],
    cardCategory: "fencing",
    crossBonus: { type: 'block_mult', value: 2 }
  },
  {
    id: "quarte",
    name: "꺄르트",
    type: "general",
    block: 7,
    speedCost: 5,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 7. 연계. 교차 시 사격 1회.",
    traits: ["chain", "cross"],
    cardCategory: "fencing",
    advanceAmount: 3,
    crossBonus: { type: 'gun_attack', count: 1 }
  },
  {
    id: "septime",
    name: "셉팀",
    type: "general",
    block: 3,
    speedCost: 2,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 3. 적에게 무딤, 흔들림 1회 부여. 교차 시 각각 1회 추가.",
    traits: ["cross"],
    cardCategory: "fencing",
    appliedTokens: [
      { id: 'dull', stacks: 1, target: 'enemy' },
      { id: 'shaken', stacks: 1, target: 'enemy' }
    ],
    onPlay: (battle: unknown, actions: BattleTokenActions) => {
      actions.addTokenToEnemy('dull', 1);
      actions.addTokenToEnemy('shaken', 1);
    },
    crossBonus: { type: 'add_tokens', tokens: [
      { id: 'dull', stacks: 1, target: 'enemy' },
      { id: 'shaken', stacks: 1, target: 'enemy' }
    ]}
  },
  {
    id: "double_tap_v2",
    name: "더블탭",
    type: "attack",
    damage: 5,
    hits: 2,
    speedCost: 5,
    actionCost: 2,
    iconKey: "flame",
    description: "공격력 5x2. 룰렛 1회만 증가. 치명타 시 장전.",
    traits: [],
    cardCategory: "gun",
    special: ["singleRoulette", "critLoad"]
  },
  {
    id: "intercept",
    name: "요격",
    type: "attack",
    damage: 1,
    speedCost: 3,
    actionCost: 2,
    iconKey: "flame",
    description: "공격력 1. 적에게 무딤+ 부여. 치명타 시 흔들림+ 추가. 교차 시 부러짐+, 무방비+로 강화.",
    traits: ["cross"],
    cardCategory: "gun",
    appliedTokens: [
      { id: 'dullPlus', stacks: 1, target: 'enemy' }
    ],
    special: ["interceptTokens"],
    crossBonus: { type: 'intercept_upgrade' }
  },
  {
    id: "shout",
    name: "함성",
    type: "general",
    block: 0,
    speedCost: 1,
    actionCost: 1,
    iconKey: "star",
    description: "대기 카드 중 하나를 다음 턴에 손패로 가져온다.",
    traits: [],
    special: ["recallCard"]
  },
  {
    id: "emergency_response",
    name: "비상대응",
    type: "general",
    block: 0,
    speedCost: 3,
    actionCost: 1,
    iconKey: "star",
    description: "손패가 6장 이하일 경우 대기 카드 3장을 즉시 뽑는다.",
    traits: [],
    special: ["emergencyDraw"]
  },
  {
    id: "stance",
    name: "스탠스",
    type: "general",
    block: 0,
    speedCost: 1,
    actionCost: 1,
    iconKey: "star",
    description: "부정적 토큰 제거. 이전 카드가 총격이면 연계, 검격이면 장전 획득.",
    traits: [],
    special: ["stance"]
  },
  {
    id: "violent_mort",
    name: "바이올랑 모르",
    type: "attack",
    damage: 40,
    speedCost: 8,
    actionCost: 1,
    iconKey: "flame",
    description: "기교 2 소모. 공격력 40. 체력 30 이하의 적은 처형한다.",
    traits: [],
    cardCategory: "fencing",
    special: ["violentMort"],
    requiredTokens: [{ id: 'finesse', stacks: 2 }]
  },
  {
    id: "hologram",
    name: "홀로그램",
    type: "general",
    block: 0,
    speedCost: 8,
    actionCost: 2,
    iconKey: "shield",
    description: "기교 2 소모. 최대 체력만큼의 방어력 획득. 지속 1 (턴 종료 후에도 유지)",
    traits: ["guard_stance"],
    special: ["hologram"],
    requiredTokens: [{ id: 'finesse', stacks: 2 }]
  },
  {
    id: "tempete_dechainee",
    name: "땅페트 데셰네",
    type: "attack",
    damage: 10,
    hits: 3,
    speedCost: 10,
    actionCost: 3,
    iconKey: "flame",
    description: "공격력 10x3. 기교 스택 x3만큼 추가 타격 후 기교 모두 소모.",
    traits: [],
    cardCategory: "fencing",
    special: ["tempeteDechainee"]
  },
  {
    id: "coup_droit",
    name: "꾸 두르와",
    type: "attack",
    damage: 11,
    speedCost: 8,
    actionCost: 1,
    iconKey: "sword",
    description: "기교 1 소모. 공격력 11. 적에게 무방비 1회 부여. 교차 시 넉백 3.",
    traits: ["cross", "knockback"],
    cardCategory: "fencing",
    crossBonus: { type: 'push', value: 3 },
    appliedTokens: [{ id: 'exposed', stacks: 1, target: 'enemy' }],
    requiredTokens: [{ id: 'finesse', stacks: 1 }]
  },
  {
    id: "el_rapide",
    name: "엘 라피드",
    type: "general",
    block: 0,
    speedCost: 4,
    actionCost: 1,
    iconKey: "flame",
    description: "아픔 1회를 얻고 민첩 +2. 기교 1 소모 시 아픔 생략.",
    traits: [],
    cardCategory: "fencing",
    special: ["elRapide"],
    optionalFinesse: { stacks: 1, skipToken: 'pain' }
    // 민첩 +2와 아픔은 elRapide special에서 처리
  },
  // === 추가 카드들 ===
  {
    id: "sabre_eclair",
    name: "사브르 에클레르",
    type: "attack",
    damage: 8,
    speedCost: 3,
    actionCost: 1,
    iconKey: "sword",
    description: "기교 1 소모. 공격력 8. 교차 시 적 카드 파괴.",
    traits: ["followup", "cross"],
    cardCategory: "fencing",
    requiredTokens: [{ id: 'finesse', stacks: 1 }],
    crossBonus: { type: 'destroy_card', value: 1 }
  },
  {
    id: "manipulation",
    name: "매니퓰레이션",
    type: "general",
    damage: 0,
    speedCost: 4,
    actionCost: 1,
    iconKey: "flame",
    description: "탄걸림 상태면 장전. 아니면 사격 1회.",
    traits: ["chain"],
    cardCategory: "gun",
    special: ["manipulation"]
  },
  {
    id: "spread",
    name: "스프레드",
    type: "attack",
    damage: 3,
    speedCost: 6,
    actionCost: 1,
    iconKey: "flame",
    description: "적의 수만큼 사격. (3마리면 3회, 1마리면 1회)",
    traits: ["followup"],
    cardCategory: "gun",
    special: ["spreadShot"]
  },
  {
    id: "griffe_du_dragon",
    name: "그리프 뒤 드라공",
    type: "attack",
    damage: 10,
    hits: 3,
    speedCost: 8,
    actionCost: 1,
    iconKey: "flame",
    description: "기교 2 소모. 공격력 10x3. 화상 3회 부여.",
    traits: ["finisher"],
    cardCategory: "fencing",
    requiredTokens: [{ id: 'finesse', stacks: 2 }],
    appliedTokens: [{ id: 'burn', stacks: 3, target: 'enemy' }]
  },
  {
    id: "au_bord_du_gouffre",
    name: "오 보르 뒤 구프",
    type: "attack",
    damage: 7,
    hits: 5,
    speedCost: 9,
    actionCost: 2,
    iconKey: "flame",
    description: "기교 3 소모. 치명타 확률 2배, 5회 타격. 치명타마다 넉백 4.",
    traits: ["finisher", "followup"],
    cardCategory: "fencing",
    requiredTokens: [{ id: 'finesse', stacks: 3 }],
    special: ["doubleCrit", "critKnockback4"]
  },
  {
    id: "vent_des_lames",
    name: "벙 데 라므",
    type: "attack",
    damage: 8,
    speedCost: 10,
    actionCost: 3,
    iconKey: "flame",
    description: "기교 3 소모. 범위 피해. 검격카드 3x3 창조 (3번의 선택, 각각 3장 중 1장, +1 속도), 창조된 카드도 범위 피해.",
    traits: ["chain"],
    cardCategory: "fencing",
    requiredTokens: [{ id: 'finesse', stacks: 3 }],
    special: ["aoeAttack", "createFencingCards3"]
  },
  {
    id: "execution_squad",
    name: "총살",
    type: "general",
    damage: 0,
    speedCost: 7,
    actionCost: 2,
    iconKey: "flame",
    description: "기교 2 소모. 장전하고 이번 턴 탄걸림 없음. 총격카드 4장 창조.",
    traits: [],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 2 }],
    special: ["executionSquad"]
  },
  {
    id: "sharpen_blade",
    name: "날 세우기",
    type: "general",
    block: 0,
    speedCost: 6,
    actionCost: 1,
    iconKey: "flame",
    description: "이번 전투 모든 검격 카드 공격력 +3.",
    traits: ["vanish"],
    cardCategory: "fencing",
    special: ["sharpenBlade"]
  },
  {
    id: "flint_shot",
    name: "부싯돌 사격",
    type: "attack",
    damage: 3,
    speedCost: 4,
    actionCost: 1,
    iconKey: "flame",
    description: "사격 1회 + 화상 부여.",
    traits: [],
    cardCategory: "gun",
    appliedTokens: [{ id: 'burn', stacks: 1, target: 'enemy' }]
  },
  {
    id: "evasive_shot",
    name: "회피 사격",
    type: "general",
    damage: 3,
    block: 8,
    speedCost: 7,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 8, 흐릿함 1회 획득 후 사격 1회. 교차 시 치명타.",
    traits: ["cross"],
    cardCategory: "gun",
    appliedTokens: [{ id: 'blur', stacks: 1, target: 'player' }],
    crossBonus: { type: 'guaranteed_crit', value: 1 },
    special: ["evasiveShot"]
  },
  {
    id: "combat_meditation",
    name: "전투 명상",
    type: "general",
    block: 0,
    speedCost: 5,
    actionCost: 1,
    iconKey: "flame",
    description: "기교 1 획득.",
    traits: ["vanish"],
    cardCategory: "fencing",
    appliedTokens: [{ id: 'finesse', stacks: 1, target: 'player' }]
  },
  {
    id: "rapid_link",
    name: "속사",
    type: "general",
    block: 0,
    speedCost: 1,
    actionCost: 1,
    iconKey: "flame",
    description: "기교 1 소모. 대상에게 허약 1회, 흔들림 1회 부여.",
    traits: ["chain"],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 1 }],
    appliedTokens: [
      { id: 'vulnerable', stacks: 1, target: 'enemy' },
      { id: 'shaken', stacks: 1, target: 'enemy' }
    ]
  },
  // === 신규 총기 카드 ===
  {
    id: "sniper_shot",
    name: "저격",
    type: "attack",
    damage: 20,
    speedCost: 6,
    actionCost: 1,
    iconKey: "flame",
    description: "기교 1 소모. 공격력 20. 사용 후 탄걸림.",
    traits: ["finisher"],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 1 }],
    special: ["causeJam"]
  },
  {
    id: "fragmentation_load",
    name: "파쇄탄 장전",
    type: "general",
    block: 0,
    speedCost: 3,
    actionCost: 2,
    iconKey: "flame",
    description: "기교 1 소모. 총격 피해를 6 올리는 파쇄탄을 3발 장전한다.",
    traits: [],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 1 }],
    appliedTokens: [{ id: 'fragmentation', stacks: 3, target: 'player' }]
  },
  {
    id: "suppression_fire",
    name: "제압사격",
    type: "attack",
    damage: 5,
    hits: 5,
    speedCost: 8,
    actionCost: 2,
    iconKey: "flame",
    description: "기교 2 소모. 5회 사격 후 탄걸림. 피해 시 넉백 3.",
    traits: ["chain"],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 2 }],
    special: ["causeJam", "knockbackOnHit3"]
  },
  {
    id: "atomic_bomb",
    name: "원자탄",
    type: "attack",
    damage: 100,
    speedCost: 5,
    actionCost: 2,
    iconKey: "flame",
    description: "기교 3 소모. 100 피해 광역 공격.",
    traits: [],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 3 }],
    special: ["aoeAttack"]
  },
  // === 신규 펜싱/유틸 카드 ===
  {
    id: "sanglot_de_pluie",
    name: "상글로 드 플뤼",
    type: "general",
    block: 15,
    speedCost: 6,
    actionCost: 2,
    iconKey: "shield",
    description: "기교 1 소모. 방어력 15. 공격당할때마다 방어력 7, 앞당김 3.",
    traits: ["followup", "cross"],
    cardCategory: "fencing",
    requiredTokens: [{ id: 'finesse', stacks: 1 }],
    special: ["onHitBlock7Advance3"]
  },
  {
    id: "chant_du_vent_fleuri",
    name: "샹 뒤 방 플뢰리",
    type: "general",
    block: 30,
    speedCost: 9,
    actionCost: 1,
    iconKey: "shield",
    description: "기교 2 소모. 방어력 30.",
    traits: ["chain", "followup"],
    cardCategory: "fencing",
    requiredTokens: [{ id: 'finesse', stacks: 2 }]
  },
  {
    id: "le_songe_du_vieillard",
    name: "르 송쥬 뒤 비에야르",
    type: "general",
    block: 0,
    speedCost: 12,
    actionCost: 3,
    iconKey: "shield",
    description: "기교 3 소모. 이 카드를 제외하고 내 타임라인을 1회 반복. 카드 실행마다 방어력 5.",
    traits: ["guard_stance"],
    cardCategory: "fencing",
    requiredTokens: [{ id: 'finesse', stacks: 3 }],
    special: ["repeatTimeline", "blockPerCard5"],
    appliedTokens: [{ id: 'vigilance', target: 'player' }]
  },
  {
    id: "tear_smoke_grenade",
    name: "최루-연막탄",
    type: "general",
    block: 0,
    speedCost: 2,
    actionCost: 1,
    iconKey: "shield",
    description: "기교 1 소모. 나에게 회피+, 상대에게 무딤, 흔들림 3회.",
    traits: ["followup"],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 1 }],
    appliedTokens: [
      { id: 'blurPlus', stacks: 1, target: 'player' },
      { id: 'dull', stacks: 3, target: 'enemy' },
      { id: 'shaken', stacks: 3, target: 'enemy' }
    ]
  },
  {
    id: "duel",
    name: "결투",
    type: "general",
    block: 0,
    speedCost: 8,
    actionCost: 2,
    iconKey: "flame",
    description: "기교 2 소모. 체력 최대 회복, 탄걸림 면역 2턴, 대응사격 5회.",
    traits: ["chain", "followup"],
    cardCategory: "gun",
    requiredTokens: [{ id: 'finesse', stacks: 2 }],
    special: ["fullHeal", "jamImmunity2", "counterShot5"]
  },
];

export const ENEMY_CARDS = [
  // === 구울 카드 ===
  { id: "ghoul_attack", name: "물어뜯기", type: "attack", damage: 5, speedCost: 3, actionCost: 1, iconKey: "sword" },
  { id: "ghoul_block", name: "움츠리기", type: "general", block: 8, speedCost: 2, actionCost: 1, iconKey: "shield" },

  // === 약탈자 카드 ===
  { id: "marauder_attack", name: "찌르기", type: "attack", damage: 3, speedCost: 2, actionCost: 1, iconKey: "sword" },
  { id: "marauder_block", name: "막기", type: "general", block: 4, speedCost: 2, actionCost: 1, iconKey: "shield" },

  // === 탈영병 카드 ===
  { id: "deserter_attack", name: "베기", type: "attack", damage: 7, speedCost: 4, actionCost: 1, iconKey: "sword" },
  { id: "deserter_block", name: "방패막기", type: "general", block: 10, speedCost: 3, actionCost: 1, iconKey: "shield" },
  { id: "deserter_double", name: "연속베기", type: "attack", damage: 5, hits: 2, speedCost: 5, actionCost: 1, iconKey: "sword" },
  { id: "deserter_offense", name: "기합", type: "general", block: 0, speedCost: 2, actionCost: 1, iconKey: "flame",
    appliedTokens: [{ id: 'offense', target: 'self' }] },
  { id: "deserter_fortify", name: "경계태세", type: "general", block: 5, speedCost: 3, actionCost: 1, iconKey: "shield" },

  // === 살육자 카드 ===
  { id: "slaughterer_heavy", name: "처형", type: "attack", damage: 15, speedCost: 8, actionCost: 1, iconKey: "flame",
    special: "piercing" },  // 방어력 무시
  { id: "slaughterer_blur_block", name: "연막", type: "general", block: 7, speedCost: 4, actionCost: 1, iconKey: "shield",
    appliedTokens: [{ id: 'blur', target: 'self' }] },
  { id: "slaughterer_quick", name: "난도질", type: "attack", damage: 7, speedCost: 4, actionCost: 1, iconKey: "sword" },
  { id: "slaughterer_rest", name: "휴식", type: "general", block: 0, speedCost: 5, actionCost: 1, iconKey: "heart",
    special: "heal5" },

  // === 슬러심 카드 (디버프 전용) ===
  { id: "slurthim_burn", name: "부식액", type: "general", block: 0, speedCost: 3, actionCost: 1, iconKey: "skull",
    appliedTokens: [{ id: 'burn', target: 'enemy' }] },
  { id: "slurthim_vulnerable", name: "산성침", type: "general", block: 0, speedCost: 3, actionCost: 1, iconKey: "skull",
    appliedTokens: [{ id: 'vulnerable', target: 'enemy' }] },
  { id: "slurthim_dull", name: "점액", type: "general", block: 0, speedCost: 3, actionCost: 1, iconKey: "skull",
    appliedTokens: [{ id: 'dull', target: 'enemy' }] },

  // === 1막 신규 - 들쥐 카드 ===
  { id: "wildrat_bite", name: "물기", type: "attack", damage: 2, speedCost: 1, actionCost: 1, iconKey: "sword" },
  { id: "wildrat_swarm", name: "떼공격", type: "attack", damage: 1, hits: 3, speedCost: 3, actionCost: 1, iconKey: "sword" },
  { id: "wildrat_flee", name: "도주", type: "general", block: 3, speedCost: 1, actionCost: 1, iconKey: "shield",
    appliedTokens: [{ id: 'evasion', target: 'self' }] },

  // === 1막 신규 - 폭주자 카드 ===
  { id: "berserker_slam", name: "내려찍기", type: "attack", damage: 8, speedCost: 5, actionCost: 1, iconKey: "flame" },
  { id: "berserker_rage", name: "분노", type: "general", block: 0, speedCost: 2, actionCost: 1, iconKey: "flame",
    appliedTokens: [{ id: 'offense', stacks: 2, target: 'self' }] },
  { id: "berserker_charge", name: "돌진", type: "attack", damage: 6, speedCost: 4, actionCost: 1, iconKey: "sword",
    special: "pushEnemyTimeline", pushAmount: 3 },
  { id: "berserker_roar", name: "포효", type: "general", block: 0, speedCost: 3, actionCost: 1, iconKey: "skull",
    appliedTokens: [{ id: 'shaken', target: 'enemy' }] },

  // === 1막 신규 - 오염체 카드 ===
  { id: "polluted_spit", name: "독침", type: "attack", damage: 3, speedCost: 3, actionCost: 1, iconKey: "skull",
    appliedTokens: [{ id: 'poison', target: 'enemy' }] },
  { id: "polluted_cloud", name: "독안개", type: "general", block: 4, speedCost: 4, actionCost: 1, iconKey: "shield",
    appliedTokens: [{ id: 'blur', target: 'self' }, { id: 'poison', target: 'enemy' }] },
  { id: "polluted_explode", name: "자폭", type: "attack", damage: 12, speedCost: 6, actionCost: 1, iconKey: "flame",
    special: "selfDamage3" },  // 자해 3

  // === 1막 신규 - 현상금 사냥꾼 카드 (엘리트) ===
  { id: "hunter_shoot", name: "조준사격", type: "attack", damage: 6, speedCost: 4, actionCost: 1, iconKey: "flame" },
  { id: "hunter_trap", name: "덫 설치", type: "general", block: 5, speedCost: 3, actionCost: 1, iconKey: "shield",
    appliedTokens: [{ id: 'counterShot', stacks: 1, target: 'self' }] },
  { id: "hunter_aim", name: "조준", type: "general", block: 0, speedCost: 2, actionCost: 1, iconKey: "flame",
    appliedTokens: [{ id: 'crit_boost', target: 'self' }] },
  { id: "hunter_execute", name: "처형사격", type: "attack", damage: 10, speedCost: 6, actionCost: 1, iconKey: "flame",
    special: "guaranteedCrit" },

  // === 1막 보스 - 탈영병 대장 카드 ===
  { id: "captain_slash", name: "장교검", type: "attack", damage: 9, speedCost: 5, actionCost: 1, iconKey: "sword" },
  { id: "captain_command", name: "지휘", type: "general", block: 8, speedCost: 4, actionCost: 1, iconKey: "shield",
    appliedTokens: [{ id: 'offense', target: 'self' }],
    special: "buffAllies" },  // 아군 강화
  { id: "captain_rally", name: "집결", type: "general", block: 0, speedCost: 3, actionCost: 1, iconKey: "flame",
    special: "summonDeserter" },  // 탈영병 소환
  { id: "captain_execution", name: "군법처형", type: "attack", damage: 18, speedCost: 8, actionCost: 1, iconKey: "flame",
    special: "piercing" },  // 방어력 무시
  { id: "captain_fortify", name: "방어태세", type: "general", block: 15, speedCost: 5, actionCost: 1, iconKey: "shield",
    appliedTokens: [{ id: 'blur', target: 'self' }] },
];

export const ENEMIES: EnemyDefinition[] = [
  // === 1막 일반 적 ===
  {
    id: "ghoul",
    name: "구울",
    hp: 40,
    ether: 100,
    speed: 10,
    maxSpeed: 10,
    deck: ["ghoul_attack", "ghoul_attack", "ghoul_block", "ghoul_block"],
    cardsPerTurn: 2,
    emoji: "💀",
    tier: 1,
    description: "약함, 초반적. 가끔 때로 등장."
  },
  {
    id: "marauder",
    name: "약탈자",
    hp: 20,
    ether: 80,
    speed: 8,
    maxSpeed: 8,
    deck: ["marauder_attack", "marauder_block"],
    cardsPerTurn: 1,
    emoji: "🗡️",
    tier: 1,
    description: "지금은 죄악으로 가득한 나날을 보내고 있지만 모든게 멀쩡했던 시절엔 그저 평범한 시민이었습니다."
  },
  {
    id: "deserter",
    name: "탈영병",
    hp: 70,
    ether: 200,
    speed: 15,
    maxSpeed: 15,
    deck: ["deserter_attack", "deserter_block", "deserter_double", "deserter_offense", "deserter_fortify"],
    cardsPerTurn: 3,
    emoji: "⚔️",
    tier: 2,
    description: "한때 보편국에 충성했던 병사입니다. 그러나 세상이 붕괴한 지금 자기 한몸 사리기 급급해 더 이상 수단과 방법을 가리지 않습니다.",
    passives: {
      veilAtStart: true,      // 전투 시작 시 장막 (통찰 차단)
      healPerTurn: 4          // 매턴 체력 4 회복
    }
  },
  {
    id: "slaughterer",
    name: "살육자",
    hp: 150,
    ether: 300,
    speed: 25,
    maxSpeed: 25,
    deck: ["slaughterer_heavy", "slaughterer_blur_block", "slaughterer_quick", "slaughterer_rest"],
    cardsPerTurn: 2,
    emoji: "🔪",
    tier: 3,
    description: "혼자 다니는 준보스급 적.",
    isBoss: true,
    passives: {
      strengthPerTurn: 1      // 매턴 힘 1 증가
    }
  },
  {
    id: "slurthim",
    name: "슬러심",
    hp: 60,
    ether: 150,
    speed: 12,
    maxSpeed: 12,
    deck: ["slurthim_burn", "slurthim_vulnerable", "slurthim_dull"],
    cardsPerTurn: 1,
    emoji: "🟢",
    tier: 1,
    description: "슬라임 비슷한 유독성 폐기물로 만들어진 흉물. 디버프만 거는 편."
  },

  // === 1막 신규 일반 적 ===
  {
    id: "wildrat",
    name: "들쥐",
    hp: 12,
    ether: 40,
    speed: 6,
    maxSpeed: 6,
    deck: ["wildrat_bite", "wildrat_bite", "wildrat_swarm", "wildrat_flee"],
    cardsPerTurn: 2,
    emoji: "🐀",
    tier: 1,
    description: "빠르고 약한 적. 떼로 나타나면 성가시다."
  },
  {
    id: "berserker",
    name: "폭주자",
    hp: 55,
    ether: 120,
    speed: 12,
    maxSpeed: 12,
    deck: ["berserker_slam", "berserker_rage", "berserker_charge", "berserker_roar"],
    cardsPerTurn: 2,
    emoji: "🔥",
    tier: 1,
    description: "정신이 붕괴한 생존자. 이성 없이 덤벼든다.",
    passives: {
      strengthPerTurn: 1  // 광폭화: 매턴 힘 1 증가
    }
  },
  {
    id: "polluted",
    name: "오염체",
    hp: 35,
    ether: 100,
    speed: 10,
    maxSpeed: 10,
    deck: ["polluted_spit", "polluted_spit", "polluted_cloud", "polluted_explode"],
    cardsPerTurn: 1,
    emoji: "☠️",
    tier: 1,
    description: "방사능에 오염된 괴생명체. 독을 뿌리며 최후엔 자폭한다."
  },

  // === 1막 엘리트 적 ===
  {
    id: "hunter",
    name: "현상금 사냥꾼",
    hp: 85,
    ether: 180,
    speed: 14,
    maxSpeed: 14,
    deck: ["hunter_shoot", "hunter_shoot", "hunter_trap", "hunter_aim", "hunter_execute"],
    cardsPerTurn: 2,
    emoji: "🎯",
    tier: 2,
    description: "숙련된 사냥꾼. 함정을 설치하고 치명적인 사격을 가한다.",
    passives: {
      critBoostAtStart: 5  // 전투 시작 시 치명타율 +5%
    }
  },

  // === 1막 보스 ===
  {
    id: "captain",
    name: "탈영병 대장",
    hp: 180,
    ether: 350,
    speed: 18,
    maxSpeed: 18,
    deck: ["captain_slash", "captain_slash", "captain_command", "captain_rally", "captain_execution", "captain_fortify"],
    cardsPerTurn: 3,
    emoji: "⚔️",
    tier: 3,
    description: "탈영병들을 이끄는 전직 장교. 부하를 소환하고 강력한 공격을 가한다.",
    isBoss: true,
    passives: {
      veilAtStart: true,     // 전투 시작 시 장막
      healPerTurn: 5,        // 매턴 체력 5 회복
      summonOnHalfHp: true   // 50% HP에서 탈영병 소환
    }
  },
];

// 몬스터 그룹 (여러 적 동시 등장)
export const ENEMY_GROUPS = [
  // === 초반 노드 (1-3) ===
  {
    id: "ghoul_single",
    name: "구울x1",
    tier: 1,
    nodeRange: [1, 3],
    enemies: ["ghoul"]
  },

  // === 중반 노드 (4-7) ===
  {
    id: "ghoul_duo",
    name: "구울x2",
    tier: 1,
    nodeRange: [4, 7],
    enemies: ["ghoul", "ghoul"]
  },
  {
    id: "marauder_trio",
    name: "약탈자x3",
    tier: 1,
    nodeRange: [4, 7],
    enemies: ["marauder", "marauder", "marauder"]
  },
  {
    id: "deserter_solo",
    name: "탈영병x1",
    tier: 2,
    nodeRange: [4, 7],
    enemies: ["deserter"]
  },

  // === 후반 노드 (8-10) ===
  {
    id: "ghoul_trio",
    name: "구울x3",
    tier: 2,
    nodeRange: [8, 10],
    enemies: ["ghoul", "ghoul", "ghoul"]
  },
  {
    id: "marauder_gang",
    name: "약탈자x4",
    tier: 2,
    nodeRange: [8, 10],
    enemies: ["marauder", "marauder", "marauder", "marauder"]
  },

  // === 보스급 ===
  {
    id: "slaughterer_solo",
    name: "살육자x1",
    tier: 3,
    enemies: ["slaughterer"],
    isBoss: true
  },

  // === 1막 신규 그룹 ===
  // 초반 노드 (1-3)
  {
    id: "wildrat_swarm",
    name: "들쥐 떼",
    tier: 1,
    nodeRange: [1, 3],
    enemies: ["wildrat", "wildrat", "wildrat", "wildrat"]
  },
  {
    id: "polluted_single",
    name: "오염체x1",
    tier: 1,
    nodeRange: [1, 3],
    enemies: ["polluted"]
  },

  // 중반 노드 (4-7)
  {
    id: "berserker_solo",
    name: "폭주자x1",
    tier: 1,
    nodeRange: [4, 7],
    enemies: ["berserker"]
  },
  {
    id: "wildrat_horde",
    name: "들쥐 대군",
    tier: 1,
    nodeRange: [4, 7],
    enemies: ["wildrat", "wildrat", "wildrat", "wildrat", "wildrat", "wildrat"]
  },
  {
    id: "polluted_duo",
    name: "오염체x2",
    tier: 1,
    nodeRange: [4, 7],
    enemies: ["polluted", "polluted"]
  },
  {
    id: "hunter_solo",
    name: "현상금 사냥꾼",
    tier: 2,
    nodeRange: [4, 7],
    enemies: ["hunter"]
  },
  {
    id: "mixed_patrol",
    name: "순찰대",
    tier: 2,
    nodeRange: [4, 7],
    enemies: ["deserter", "marauder", "marauder"]
  },

  // 후반 노드 (8-10)
  {
    id: "berserker_duo",
    name: "폭주자x2",
    tier: 2,
    nodeRange: [8, 10],
    enemies: ["berserker", "berserker"]
  },
  {
    id: "hunter_duo",
    name: "사냥꾼 콤비",
    tier: 2,
    nodeRange: [8, 10],
    enemies: ["hunter", "hunter"]
  },
  {
    id: "ambush_squad",
    name: "매복조",
    tier: 2,
    nodeRange: [8, 10],
    enemies: ["hunter", "deserter", "deserter"]
  },

  // 1막 보스
  {
    id: "captain_solo",
    name: "탈영병 대장",
    tier: 3,
    enemies: ["captain"],
    isBoss: true
  },
  {
    id: "captain_escort",
    name: "탈영병 대장 + 호위",
    tier: 3,
    enemies: ["captain", "deserter", "deserter"],
    isBoss: true
  },
];

// 몬스터 그룹 헬퍼 함수
export function getEnemyGroup(groupId: string) {
  const group = ENEMY_GROUPS.find(g => g.id === groupId);
  if (!group) return null;
  const enemies = Array.isArray(group.enemies) ? group.enemies : [];
  return {
    name: group.name,
    enemies,
    enemyCount: enemies.length,
    tier: group.tier,
    isBoss: group.isBoss
  };
}

// 티어별 적 가져오기
export function getEnemiesByTier(tier: number) {
  return ENEMIES.filter(e => e.tier === tier);
}

// 랜덤 적 가져오기 (티어 기반)
export function getRandomEnemy(tier = 1) {
  const enemies = getEnemiesByTier(tier);
  if (enemies.length === 0) return ENEMIES[0];
  return enemies[Math.floor(Math.random() * enemies.length)];
}

// 랜덤 적 그룹 가져오기 (티어 기반)
export function getRandomEnemyGroup(tier = 1) {
  const groups = ENEMY_GROUPS.filter(g => g.tier === tier);
  if (groups.length === 0) return ENEMY_GROUPS[0];
  return groups[Math.floor(Math.random() * groups.length)];
}

// 노드 번호 기반 랜덤 적 그룹 가져오기
export function getRandomEnemyGroupByNode(nodeNumber = 1) {
  // 해당 노드 범위에 맞는 그룹들 필터링
  const validGroups = ENEMY_GROUPS.filter(g => {
    if (!g.nodeRange) return false;
    const [min, max] = g.nodeRange;
    return nodeNumber >= min && nodeNumber <= max;
  });

  if (validGroups.length === 0) {
    // 범위가 없으면 tier 1 그룹 중 하나 반환
    const tier1Groups = ENEMY_GROUPS.filter(g => g.tier === 1);
    return tier1Groups.length > 0 ? tier1Groups[Math.floor(Math.random() * tier1Groups.length)] : ENEMY_GROUPS[0];
  }

  return validGroups[Math.floor(Math.random() * validGroups.length)];
}

// 그룹의 적 상세 정보 가져오기
export function getEnemyGroupDetails(groupId: string) {
  const group = ENEMY_GROUPS.find(g => g.id === groupId);
  if (!group) return null;

  return {
    ...group,
    enemies: group.enemies.map(id => {
      const enemy = ENEMIES.find(e => e.id === id);
      return enemy ? { ...enemy } : null;
    }).filter(Boolean)
  };
}
