export const MAX_SPEED = 30; // 기본 최대 속도 (레거시 호환용)
export const DEFAULT_PLAYER_MAX_SPEED = 30; // 플레이어 기본 최대 속도
export const DEFAULT_ENEMY_MAX_SPEED = 30; // 적 기본 최대 속도
export const BASE_PLAYER_ENERGY = 6;
export const MAX_SUBMIT_CARDS = 5;
export const ETHER_THRESHOLD = 100;

// 타임라인 틱 생성 함수 (동적)
export function generateSpeedTicks(maxSpeed) {
  const tickInterval = 5;
  return Array.from(
    { length: Math.floor(maxSpeed / tickInterval) + 1 },
    (_, idx) => idx * tickInterval
  );
}

// 특성(Trait) 정의
export const TRAITS = {
  // 긍정 특성 (★)
  swift: { id: "swift", name: "신속함", type: "positive", weight: 1, description: "성능대비 시간 소모가 적음" },
  repeat: { id: "repeat", name: "반복", type: "positive", weight: 1, description: "다음턴에도 손패에 확정적으로 등장" },
  focus: { id: "focus", name: "집중", type: "positive", weight: 1, description: "다음턴 시작때 이번턴 에테르 획득량의 절반 획득" },
  strongbone: { id: "strongbone", name: "강골", type: "positive", weight: 1, description: "피해량/방어력 25% 증가" },
  crush: { id: "crush", name: "분쇄", type: "positive", weight: 1, description: "상대방 방어력에 2배 피해" },
  cooperation: { id: "cooperation", name: "협동", type: "positive", weight: 1, description: "조합에 포함되면 공격력을 50% 추가 획득합니다." },
  mastery: { id: "mastery", name: "숙련", type: "positive", weight: 1, description: "카드 쓸수록 시간 -2, 최소값 1" },
  burn: { id: "burn", name: "화상", type: "positive", weight: 1, description: "매 턴 고정피해" },
  poison: { id: "poison", name: "독", type: "positive", weight: 1, description: "대상 카드 시간 +1" },
  attendance: { id: "attendance", name: "개근", type: "positive", weight: 1, description: "등장확률 25% 증가" },
  training: { id: "training", name: "단련", type: "positive", weight: 1, description: "사용 후 힘 +1" },
  insurance: { id: "insurance", name: "보험", type: "positive", weight: 1, description: "미등장 시 다음턴 확정 등장" },
  whetstone: { id: "whetstone", name: "숫돌", type: "positive", weight: 1, description: "다음 공격 피해 +3" },
  chain: { id: "chain", name: "연계", type: "positive", weight: 1, description: "다음 카드가 검격이면 타임라인 3 앞당김" },
  creation: { id: "creation", name: "창조", type: "positive", weight: 1, description: "조건 충족 시 유령카드를 만들어낸다. 유령카드는 아이템/상징 효과 무시" },

  // 긍정 특성 (★★)
  hero: { id: "hero", name: "용사", type: "positive", weight: 2, description: "다음턴 상대 에테르 획득 방지" },
  guard_stance: { id: "guard_stance", name: "경계", type: "positive", weight: 2, description: "방어수치 다음턴 유지" },
  general: { id: "general", name: "장군", type: "positive", weight: 2, description: "다음턴 보조특기 등장률 25% 증가" },
  advisor: { id: "advisor", name: "참모", type: "positive", weight: 2, description: "다음턴 리드로우 1회 부가" },
  knockback: { id: "knockback", name: "넉백", type: "positive", weight: 2, description: "상대 타임라인을 뒤로 민다" },
  advance: { id: "advance", name: "앞당김", type: "positive", weight: 2, description: "내 타임라인을 앞당긴다" },
  cross: { id: "cross", name: "교차", type: "positive", weight: 2, description: "타임라인에서 적 카드와 겹치면 효과 발동/증폭" },
  destroyer: { id: "destroyer", name: "파괴자", type: "positive", weight: 2, description: "공격력 50% 증가" },
  warmup: { id: "warmup", name: "몸풀기", type: "positive", weight: 2, description: "다음턴 행동력 +2" },
  solidarity: { id: "solidarity", name: "연대", type: "positive", weight: 2, description: "획득 에테르만큼 방어력 즉시 획득" },

  // 긍정 특성 (★★★)
  monarch: { id: "monarch", name: "군주", type: "positive", weight: 3, description: "이후 모든 카드 공격력 2배" },
  stun: { id: "stun", name: "기절", type: "positive", weight: 3, description: "타임라인 5범위내 상대 카드 파괴" },
  blank_check: { id: "blank_check", name: "백지수표", type: "positive", weight: 3, description: "원하는 타임라인에 배치 가능" },
  cautious: { id: "cautious", name: "신중함", type: "positive", weight: 3, description: "이번턴 방어력 다음턴까지 유지" },
  indomitable: { id: "indomitable", name: "불굴", type: "positive", weight: 3, description: "체력만큼 방어력 획득" },
  slaughter: { id: "slaughter", name: "도살", type: "positive", weight: 3, description: "기본피해량 75% 증가" },

  // 긍정 특성 (★★★★)
  emperor: { id: "emperor", name: "황제", type: "positive", weight: 4, description: "디플레이션 0 초기화, 에테르 3배" },

  // 긍정 특성 (★★★★★)
  pinnacle: { id: "pinnacle", name: "정점", type: "positive", weight: 5, description: "피해량 2.5배" },

  // 부정 특성 (★)
  outcast: { id: "outcast", name: "소외", type: "negative", weight: 1, description: "조합 제외, 행동력 -1" },
  double_edge: { id: "double_edge", name: "양날의 검", type: "negative", weight: 1, description: "사용시 1 피해" },
  weakbone: { id: "weakbone", name: "약골", type: "negative", weight: 1, description: "피해량/방어력 20% 감소" },
  slow: { id: "slow", name: "굼뜸", type: "negative", weight: 1, description: "속도가 느려짐" },
  escape: { id: "escape", name: "탈주", type: "negative", weight: 1, description: "다음턴 손패에 미등장" },
  supporting: { id: "supporting", name: "조연", type: "negative", weight: 1, description: "보조특기일때만 등장" },
  deserter: { id: "deserter", name: "도피꾼", type: "negative", weight: 1, description: "등장확률 25% 감소" },
  stubborn: { id: "stubborn", name: "고집", type: "negative", weight: 1, description: "대응단계 순서변경 불가" },
  boredom: { id: "boredom", name: "싫증", type: "negative", weight: 1, description: "사용시마다 시간 +2" },

  // 부정 특성 (★★)
  exhaust: { id: "exhaust", name: "탈진", type: "negative", weight: 2, description: "다음턴 행동력 -2" },
  vanish: { id: "vanish", name: "소멸", type: "negative", weight: 2, description: "사용 후 게임에서 제외" },
  mistake: { id: "mistake", name: "실수", type: "negative", weight: 2, description: "대응단계 순서 랜덤화" },
  protagonist: { id: "protagonist", name: "주인공", type: "negative", weight: 2, description: "주특기일때만 등장" },
  last: { id: "last", name: "마지막", type: "negative", weight: 2, description: "타임라인 마지막에 발동" },
  robber: { id: "robber", name: "날강도", type: "negative", weight: 2, description: "사용시 10골드 소실" },

  // 부정 특성 (★★★)
  ruin: { id: "ruin", name: "파탄", type: "negative", weight: 3, description: "다음턴 주특기만 등장" },
  oblivion: { id: "oblivion", name: "망각", type: "negative", weight: 3, description: "이후 에테르 획득 불가" }
};

export const CARDS = [
  // === 펜싱 카드 ===
  {
    id: "marche",
    name: "마르쉐",
    type: "defense",
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
    onPlay: (battle, actions) => {
      actions.addTokenToPlayer('blur', 1);
    }
  },
  {
    id: "lunge",
    name: "런지",
    type: "attack",
    damage: 17,
    speedCost: 12,
    actionCost: 1,
    iconKey: "sword",
    description: "공격력 17. 피해 성공 시 넉백 5.",
    traits: ["knockback"],
    cardCategory: "fencing",
    special: "pushEnemyTimeline",
    pushAmount: 5
  },
  {
    id: "fleche",
    name: "플레쉬",
    type: "attack",
    damage: 6,
    speedCost: 11,
    actionCost: 2,
    iconKey: "sword",
    description: "공격력 6. 피해를 입힐 때마다 최대 2번 공격 카드를 창조한다. 교차 시 사격 1회.",
    traits: ["creation", "cross"],
    cardCategory: "fencing",
    special: "createAttackOnHit",
    crossBonus: { type: 'gun_attack', count: 1 }
  },
  {
    id: "flank",
    name: "플랭크",
    type: "attack",
    damage: 20,
    speedCost: 14,
    actionCost: 1,
    iconKey: "sword",
    description: "공격력 20. 분쇄 특성으로 상대 방어력에 2배 피해를 준다.",
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
    onPlay: (battle, actions) => {
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
    pushAmount: 2
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
    onPlay: (battle, actions) => {
      actions.addTokenToPlayer('evasion', 1);
      actions.addTokenToPlayer('offense', 1);
    }
  },
  {
    id: "defensive_stance",
    name: "프로나시옹",
    type: "defense",
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
    type: "defense",
    block: 6,
    counter: 2,
    speedCost: 8,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 6, 반격 2회. 교차 시 총격 1회.",
    traits: ["cross"],
    cardCategory: "fencing",
    crossBonus: { type: 'gun_attack', count: 1 }
  },
  {
    id: "grind",
    name: "갈아내기",
    type: "attack",
    damage: 50,
    speedCost: 20,
    actionCost: 3,
    iconKey: "flame",
    description: "공격력 50, 방어력 무시. 순수 깡딜로 상대를 갈아버린다.",
    traits: [],
    special: "ignoreBlock"
  },
  {
    id: "strike",
    name: "타격",
    type: "attack",
    damage: 15,
    speedCost: 9,
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
    damage: 14,
    speedCost: 12,
    actionCost: 2,
    iconKey: "sword",
    description: "공격력 14. 공격 시 상대 방어력을 없앤 만큼 내 방어력으로 획득.",
    traits: ["chain"],
    cardCategory: "fencing",
    special: "stealBlock",
    advanceAmount: 3
  },

  // === 총기 카드 ===
  {
    id: "shoot",
    name: "사격",
    type: "attack",
    damage: 8,
    speedCost: 3,
    actionCost: 1,
    iconKey: "flame",
    description: "공격력 8. 기본 총격 공격.",
    traits: [],
    cardCategory: "gun"
  },
  {
    id: "double_tap",
    name: "더블 탭",
    type: "attack",
    damage: 8,
    hits: 2,
    speedCost: 4,
    actionCost: 2,
    iconKey: "flame",
    description: "공격력 8x2. 빠른 연사로 두 번 사격한다.",
    traits: [],
    cardCategory: "gun"
  },
  {
    id: "gyrus_roulette",
    name: "가이러스 룰렛",
    type: "attack",
    damage: 5,
    speedCost: 6,
    actionCost: 1,
    iconKey: "flame",
    description: "남은 행동력 x2만큼 총알을 쏜다. 사용 후 빈탄창.",
    traits: [],
    special: "gyrusRoulette",
    cardCategory: "gun"
  },
  {
    id: "ap_load",
    name: "철갑탄 장전",
    type: "defense",
    block: 0,
    speedCost: 2,
    actionCost: 1,
    iconKey: "shield",
    description: "장전 효과 + 다음 총격이 방어력을 무시한다.",
    traits: [],
    cardCategory: "gun",
    appliedTokens: [{ id: 'armor_piercing', target: 'player' }],
    onPlay: (battle, actions) => {
      // 탄걸림 해제 + 룰렛 초기화 후 추가 효과 적용
      actions.removeTokenFromPlayer('gun_jam', 'permanent', 99);
      actions.removeTokenFromPlayer('roulette', 'permanent', 99); // 룰렛 초기화
      actions.addTokenToPlayer('armor_piercing', 1);
    }
  },
  {
    id: "incendiary_load",
    name: "소이탄 장전",
    type: "defense",
    block: 0,
    speedCost: 2,
    actionCost: 1,
    iconKey: "shield",
    description: "장전 효과 + 다음 총격이 화상을 입힌다.",
    traits: [],
    cardCategory: "gun",
    appliedTokens: [{ id: 'incendiary', target: 'player' }],
    onPlay: (battle, actions) => {
      // 탄걸림 해제 + 룰렛 초기화 후 추가 효과 적용
      actions.removeTokenFromPlayer('gun_jam', 'permanent', 99);
      actions.removeTokenFromPlayer('roulette', 'permanent', 99); // 룰렛 초기화
      actions.addTokenToPlayer('incendiary', 1);
    }
  },
  {
    id: "reload",
    name: "전술장전",
    type: "defense",
    block: 5,
    speedCost: 2,
    actionCost: 0,
    iconKey: "shield",
    description: "방어력 5. 탄걸림을 해제하고 룰렛을 초기화한다.",
    traits: [],
    cardCategory: "gun",
    onPlay: (battle, actions) => {
      // 탄걸림 해제 + 룰렛 초기화
      actions.removeTokenFromPlayer('gun_jam', 'permanent', 99);
      actions.removeTokenFromPlayer('roulette', 'permanent', 99); // 룰렛 초기화
    }
  },
  {
    id: "hawks_eye",
    name: "매의 눈",
    type: "defense",
    block: 0,
    speedCost: 3,
    actionCost: 2,
    iconKey: "shield",
    description: "이번 전투 동안 통찰 +1, 치명타율 +5%를 얻는다.",
    traits: [],
    appliedTokens: [{ id: 'insight', target: 'player' }, { id: 'crit_boost', target: 'player' }],
    onPlay: (battle, actions) => {
      actions.addTokenToPlayer('insight', 1);
      actions.addTokenToPlayer('crit_boost', 1);
    }
  },
  {
    id: "gun_headshot",
    name: "헤드샷",
    type: "attack",
    damage: 30,
    speedCost: 8,
    actionCost: 1,
    iconKey: "flame",
    description: "공격력 30. 사용 후 빈탄창.",
    traits: [],
    special: "emptyAfterUse",
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
    id: "combo_style",
    name: "연계",
    type: "attack",
    damage: 15,
    speedCost: 5,
    actionCost: 2,
    iconKey: "sword",
    description: "이번 턴 검격을 냈으면 추가 총격, 총격을 냈으면 추가 검격.",
    traits: [],
    special: "comboStyle"
  },
  {
    id: "long_draw",
    name: "롱빼",
    type: "defense",
    block: 7,
    speedCost: 6,
    actionCost: 1,
    iconKey: "shield",
    description: "방어력 7. 손패에 장전카드가 있으면 자동으로 장전한다.",
    traits: [],
    special: "autoReload"
  },
  {
    id: "mental_focus",
    name: "정신집중",
    type: "defense",
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
    name: "패링",
    type: "defense",
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
    type: "defense",
    block: 5,
    speedCost: 5,
    actionCost: 2,
    iconKey: "shield",
    description: "방어력 5. 공격/방어 카드 3장을 창조해 하나를 선택, 타임라인 +3 속도로 끼워넣음.",
    traits: ["creation"],
    special: "breach",
    breachSpOffset: 3
  },
];

export const ENEMY_CARDS = [
  // 기본 카드
  { id: "e1", name: "Attack", type: "attack", damage: 13, speedCost: 3, actionCost: 1, iconKey: "sword" },
  { id: "e2", name: "Heavy", type: "attack", damage: 36, speedCost: 8, actionCost: 2, iconKey: "flame" },
  { id: "e3", name: "Guard", type: "defense", block: 12, speedCost: 2, actionCost: 1, iconKey: "shield" },
  { id: "e4", name: "Strike", type: "attack", damage: 15, speedCost: 5, actionCost: 1, iconKey: "sword" },
  { id: "e5", name: "Defense", type: "defense", block: 16, speedCost: 6, actionCost: 1, iconKey: "shield" },
  { id: "e6", name: "Barrier", type: "defense", block: 38, speedCost: 9, actionCost: 2, iconKey: "shield" },

  // 새로운 적 카드
  { id: "e7", name: "Quick Jab", type: "attack", damage: 8, speedCost: 1, actionCost: 1, iconKey: "sword" },      // 빠른 공격
  { id: "e8", name: "Poison Spit", type: "attack", damage: 10, speedCost: 4, actionCost: 1, iconKey: "skull", poison: 3 },  // 독 공격
  { id: "e9", name: "Leech", type: "attack", damage: 12, speedCost: 5, actionCost: 1, iconKey: "heart", lifesteal: 0.5 },   // 흡혈
  { id: "e10", name: "Frenzy", type: "attack", damage: 20, speedCost: 6, actionCost: 1, iconKey: "flame", selfDamage: 5 }, // 광란 (자해)
  { id: "e11", name: "Shell Up", type: "defense", block: 25, speedCost: 4, actionCost: 1, iconKey: "shield", thorns: 3 },   // 가시 방어
  { id: "e12", name: "Rage", type: "buff", speedCost: 3, actionCost: 1, iconKey: "flame", enrage: 1.5 },           // 분노 버프
  { id: "e13", name: "Summon", type: "special", speedCost: 7, actionCost: 2, iconKey: "skull", summon: 'minion' }, // 소환
  { id: "e14", name: "Blast", type: "attack", damage: 25, speedCost: 7, actionCost: 2, iconKey: "flame", aoe: true }, // 광역기
];

export const ENEMIES = [
  // 기본 적
  { id: "goblin", name: "고블린", hp: 20, deck: ["e1", "e3", "e4"], emoji: "👺", tier: 1 },
  { id: "slime", name: "슬라임", hp: 15, deck: ["e1", "e3"], emoji: "🟢", tier: 1 },
  { id: "orc", name: "오크", hp: 40, deck: ["e2", "e6", "e4"], emoji: "👹", tier: 2 },

  // 새로운 적 - Tier 1 (약한 적)
  { id: "rat", name: "쥐떼", hp: 12, deck: ["e7", "e7", "e1"], emoji: "🐀", tier: 1,
    description: "빠르지만 약한 공격" },
  { id: "bat", name: "박쥐", hp: 18, deck: ["e7", "e9", "e3"], emoji: "🦇", tier: 1,
    description: "체력을 흡수하는 공격" },
  { id: "mushroom", name: "독버섯", hp: 16, deck: ["e8", "e3", "e8"], emoji: "🍄", tier: 1,
    description: "독 공격에 주의" },

  // Tier 2 (중간 적)
  { id: "skeleton", name: "스켈레톤", hp: 30, deck: ["e1", "e4", "e11"], emoji: "💀", tier: 2,
    description: "단단한 방어와 반격" },
  { id: "wolf", name: "늑대", hp: 28, deck: ["e7", "e7", "e4", "e10"], emoji: "🐺", tier: 2,
    description: "빠른 연속 공격" },
  { id: "imp", name: "임프", hp: 25, deck: ["e8", "e9", "e7"], emoji: "😈", tier: 2,
    description: "다양한 상태이상" },

  // Tier 3 (강한 적)
  { id: "golem", name: "골렘", hp: 60, deck: ["e2", "e6", "e11", "e5"], emoji: "🗿", tier: 3,
    description: "높은 체력과 방어력" },
  { id: "vampire", name: "뱀파이어", hp: 45, deck: ["e9", "e9", "e4", "e12"], emoji: "🧛", tier: 3,
    description: "강력한 흡혈 공격" },
  { id: "necromancer", name: "네크로맨서", hp: 35, deck: ["e8", "e13", "e3", "e14"], emoji: "🧙", tier: 3,
    description: "미니언을 소환함" },

  // 보스급
  { id: "dragon", name: "드래곤", hp: 100, deck: ["e2", "e14", "e6", "e12", "e2"], emoji: "🐉", tier: 4,
    description: "강력한 광역 공격", isBoss: true },
  { id: "demon_lord", name: "마왕", hp: 120, deck: ["e10", "e14", "e12", "e9", "e2"], emoji: "👿", tier: 4,
    description: "최종 보스", isBoss: true },
];

// 몬스터 그룹 (여러 적 동시 등장)
export const ENEMY_GROUPS = [
  // Tier 1 그룹
  {
    id: "slime_pack",
    name: "슬라임 무리",
    tier: 1,
    enemies: ["slime", "slime", "slime", "slime"]
  },
  {
    id: "rat_swarm",
    name: "쥐떼 습격",
    tier: 1,
    enemies: ["rat", "rat", "rat", "rat", "rat"]
  },
  {
    id: "cave_dwellers",
    name: "동굴 생물들",
    tier: 1,
    enemies: ["bat", "bat", "mushroom", "mushroom"]
  },

  // Tier 2 그룹
  {
    id: "goblin_trio",
    name: "고블린 3인조",
    tier: 2,
    enemies: ["goblin", "goblin", "goblin"]
  },
  {
    id: "undead_patrol",
    name: "언데드 순찰대",
    tier: 2,
    enemies: ["skeleton", "skeleton", "bat"]
  },
  {
    id: "wolf_pack",
    name: "늑대 무리",
    tier: 2,
    enemies: ["wolf", "wolf", "wolf"]
  },
  {
    id: "imp_gang",
    name: "임프 패거리",
    tier: 2,
    enemies: ["imp", "imp", "mushroom"]
  },

  // Tier 3 그룹
  {
    id: "golem_guardian",
    name: "골렘 수호대",
    tier: 3,
    enemies: ["golem", "skeleton", "skeleton"]
  },
  {
    id: "vampire_coven",
    name: "흡혈귀 결사",
    tier: 3,
    enemies: ["vampire", "bat", "bat", "bat"]
  },
  {
    id: "necro_army",
    name: "망자의 군대",
    tier: 3,
    enemies: ["necromancer", "skeleton", "skeleton", "skeleton"]
  },

  // 보스 그룹
  {
    id: "dragon_lair",
    name: "드래곤의 둥지",
    tier: 4,
    enemies: ["dragon"],
    isBoss: true
  },
  {
    id: "demon_throne",
    name: "마왕의 옥좌",
    tier: 4,
    enemies: ["demon_lord"],
    isBoss: true
  },
];

// 몬스터 그룹 헬퍼 함수
export function getEnemyGroup(groupId) {
  const group = ENEMY_GROUPS.find(g => g.id === groupId);
  if (!group) return null;
  return {
    name: group.name,
    enemies: group.enemies,
    enemyCount: group.enemies.length,
    tier: group.tier,
    isBoss: group.isBoss
  };
}

// 티어별 적 가져오기
export function getEnemiesByTier(tier) {
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

// 그룹의 적 상세 정보 가져오기
export function getEnemyGroupDetails(groupId) {
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
