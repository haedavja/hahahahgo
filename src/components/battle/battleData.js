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

  // 긍정 특성 (★★)
  hero: { id: "hero", name: "용사", type: "positive", weight: 2, description: "다음턴 상대 에테르 획득 방지" },
  guard_stance: { id: "guard_stance", name: "경계", type: "positive", weight: 2, description: "방어수치 다음턴 유지" },
  general: { id: "general", name: "장군", type: "positive", weight: 2, description: "다음턴 보조특기 등장률 25% 증가" },
  advisor: { id: "advisor", name: "참모", type: "positive", weight: 2, description: "다음턴 리드로우 1회 부가" },
  knockback: { id: "knockback", name: "강타", type: "positive", weight: 2, description: "타임라인 속도 2씩 뒤로 밀림" },
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
  // === 기존 카드 (영어 이름) ===
  { id: "quick", name: "Quick Slash", type: "attack", damage: 13, speedCost: 3, actionCost: 1, iconKey: "sword", description: "빠르게 적을 베어낸다. 낮은 속도 코스트로 신속한 공격이 가능하다.", traits: [] },
  { id: "slash", name: "Slash", type: "attack", damage: 30, speedCost: 5, actionCost: 2, iconKey: "sword", description: "강력한 베기 공격. 균형 잡힌 데미지와 속도를 제공한다.", traits: [] },
  { id: "heavy", name: "Heavy Strike", type: "attack", damage: 40, speedCost: 10, actionCost: 2, iconKey: "flame", description: "묵직한 일격. 높은 데미지를 주지만 속도가 느리다.", traits: [] },
  { id: "double", name: "Double Slash", type: "attack", damage: 17, hits: 2, speedCost: 7, actionCost: 2, iconKey: "sword", description: "두 번 연속 베기. 방어를 뚫기에 유리하다.", traits: [] },
  { id: "precise", name: "Precise Strike", type: "attack", damage: 32, speedCost: 6, actionCost: 2, iconKey: "sword", description: "정확한 타격. 안정적인 데미지를 보장한다.", traits: [] },
  { id: "rush", name: "Rush Attack", type: "attack", damage: 14, speedCost: 4, actionCost: 1, iconKey: "flame", description: "돌진 공격. 빠른 속도로 적을 압박한다.", traits: [] },
  { id: "parry", name: "Parry", type: "defense", block: 12, speedCost: 2, actionCost: 1, iconKey: "shield", description: "빠른 패링. 적의 공격을 재빠르게 막아낸다.", traits: [] },
  { id: "guard", name: "Guard", type: "defense", block: 16, speedCost: 6, actionCost: 1, iconKey: "shield", description: "견고한 방어 자세. 적당한 방어력을 제공한다.", traits: [] },
  { id: "wall", name: "Iron Wall", type: "defense", block: 38, speedCost: 9, actionCost: 2, iconKey: "shield", description: "철벽 방어. 강력한 방어막을 형성하지만 느리다.", traits: [] },
  { id: "counter", name: "Counter Stance", type: "defense", block: 14, counter: 3, speedCost: 4, actionCost: 1, iconKey: "shield", description: "반격 자세. 방어하면서 공격받을 시 반격한다.", traits: [] },

  // === 행동력 1 (일반) 5개 ===
  { id: "stab", name: "찌르기", type: "attack", damage: 13, speedCost: 3, actionCost: 1, iconKey: "sword", description: "검으로 신속하고 강하게 찌릅니다.", traits: [] },
  { id: "strike", name: "타격", type: "attack", damage: 17, speedCost: 7, actionCost: 1, iconKey: "sword", description: "있는 힘을 가해 피해를 줍니다.", traits: [] },
  { id: "spin_slash", name: "회전참격", type: "attack", damage: 20, speedCost: 10, actionCost: 1, iconKey: "flame", description: "실로 위협적인 공격입니다.", traits: [] },
  { id: "full_swing", name: "풀스윙", type: "attack", damage: 25, speedCost: 15, actionCost: 1, iconKey: "flame", description: "이런 큰 동작을 맞출 수만 있으면..", traits: [] },
  { id: "desperate", name: "필사의 일격", type: "attack", damage: 30, speedCost: 20, actionCost: 1, iconKey: "flame", description: "죽음을 각오한 공격은 강력합니다.", traits: [] },

  // === 행동력 1 (부정) 5개 ===
  { id: "jab", name: "잽", type: "attack", damage: 11, speedCost: 1, actionCost: 1, iconKey: "sword", description: "장갑을 낀 주먹으로 빠르게 후려갈깁니다. 아플겁니다.", traits: [] },
  { id: "risky_attack", name: "도박적 공세", type: "attack", damage: 20, speedCost: 7, actionCost: 1, iconKey: "flame", description: "치명적이지만 다시는 하고 싶지 않은 짓입니다.", traits: ["escape"] },
  { id: "drunken_fist", name: "취권", type: "attack", damage: 28, speedCost: 13, actionCost: 1, iconKey: "flame", description: "싸움은 잘하는데 언제 등장할지는..", traits: ["supporting"] },
  { id: "beat_down", name: "줘패고 줘패기", type: "attack", damage: 3, hits: 13, speedCost: 16, actionCost: 1, iconKey: "flame", description: "상대방이 죽을때까지 때려보는 것입니다. (3피해 13회)", traits: ["exhaust"] },
  { id: "rocket_punch", name: "로켓펀치", type: "attack", damage: 51, speedCost: 24, actionCost: 1, iconKey: "flame", description: "건틀릿을 로켓처럼 날려보냅니다. 그런데 회수는 어떻…", traits: ["vanish"] },

  // === 행동력 2 (일반) 5개 ===
  { id: "combo_strike", name: "연속타격", type: "attack", damage: 10, hits: 5, speedCost: 1, actionCost: 2, iconKey: "sword", description: "쉴 새 없이 몰아치는 연격을 가한다. (2피해 5회)", traits: ["training"] },
  { id: "iron_fist", name: "철권", type: "attack", damage: 15, speedCost: 5, actionCost: 2, iconKey: "flame", description: "단련된 주먹질은 강합니다.", traits: ["insurance"] },
  { id: "dropkick", name: "드롭킥", type: "attack", damage: 20, speedCost: 10, actionCost: 2, iconKey: "flame", description: "이걸 맞고 멀쩡한 놈은 없을겁니다!", traits: ["cooperation"] },
  { id: "skull_crush", name: "두개골 부수기", type: "attack", damage: 25, speedCost: 15, actionCost: 2, iconKey: "flame", description: "죽이는데는 이만한게 없죠.", traits: ["mastery"] },
  { id: "headbutt", name: "박치기", type: "attack", damage: 38, speedCost: 20, actionCost: 2, iconKey: "flame", description: "박살낼 수 있습니다.", traits: ["strongbone"] },

  // === 행동력 3 (일반) 5개 ===
  { id: "cleave", name: "가르기", type: "attack", damage: 23, speedCost: 5, actionCost: 3, iconKey: "sword", description: "그저 잘라내버리는 겁니다.", traits: ["destroyer"] },
  { id: "heavy_blow", name: "강타", type: "attack", damage: 17, speedCost: 7, actionCost: 3, iconKey: "flame", description: "틀림없이 정신을 못차릴겁니다.", traits: ["stun", "exhaust"] },
  { id: "kick", name: "걷어차기", type: "attack", damage: 18, speedCost: 8, actionCost: 3, iconKey: "flame", description: "나가 떨어지게 만듭니다.", traits: ["knockback"] },
  { id: "prepare_hit", name: "후려치기", type: "attack", damage: 18, speedCost: 8, actionCost: 4, iconKey: "sword", description: "때론 다음 턴을 위해 준비할 필요가 있습니다.", traits: ["training", "warmup", "outcast"] },
  { id: "persistent", name: "집요한 타격", type: "attack", damage: 22, speedCost: 12, actionCost: 3, iconKey: "flame", description: "상대방의 방어력을 꾸준히 압도할 수 있는 카드.", traits: ["attendance", "crush"] },

  // === 행동력 6 (전설) 3개 ===
  { id: "die", name: "죽어라", type: "attack", damage: 29, speedCost: 7, actionCost: 6, iconKey: "flame", description: "살아남기 어려울겁니다.", traits: ["slaughter", "crush", "knockback"], rarity: "legendary" },
  { id: "absolute", name: "절대우위", type: "attack", damage: 26, speedCost: 16, actionCost: 6, iconKey: "flame", description: "뭘 하든 소용없습니다.", traits: ["blank_check", "stun"], rarity: "legendary" },
  { id: "apocalypse", name: "종말", type: "attack", damage: 79, speedCost: 25, actionCost: 6, iconKey: "flame", description: "다음은 없습니다.", traits: ["pinnacle"], rarity: "legendary" },
];

export const ENEMY_CARDS = [
  { id: "e1", name: "Attack", type: "attack", damage: 13, speedCost: 3, actionCost: 1, iconKey: "sword" },
  { id: "e2", name: "Heavy", type: "attack", damage: 36, speedCost: 8, actionCost: 2, iconKey: "flame" },
  { id: "e3", name: "Guard", type: "defense", block: 12, speedCost: 2, actionCost: 1, iconKey: "shield" },
  { id: "e4", name: "Strike", type: "attack", damage: 15, speedCost: 5, actionCost: 1, iconKey: "sword" },
  { id: "e5", name: "Defense", type: "defense", block: 16, speedCost: 6, actionCost: 1, iconKey: "shield" },
  { id: "e6", name: "Barrier", type: "defense", block: 38, speedCost: 9, actionCost: 2, iconKey: "shield" },
];

export const ENEMIES = [
  { id: "goblin", name: "Goblin", hp: 20, deck: ["e1", "e3", "e4"], emoji: "👺" },
  { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" },
  { id: "orc", name: "Orc", hp: 40, deck: ["e2", "e6", "e4"], emoji: "👹" },
];

// 몬스터 그룹 (여러 적 동시 등장)
export const ENEMY_GROUPS = [
  {
    id: "slime_pack",
    name: "슬라임 무리",
    enemies: [
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" },
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" },
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" },
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" }
    ]
  },
  {
    id: "goblin_slime_mix",
    name: "고블린과 슬라임",
    enemies: [
      { id: "goblin", name: "Goblin", hp: 20, deck: ["e1", "e3", "e4"], emoji: "👺" },
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" },
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" },
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" },
      { id: "slime", name: "Slime", hp: 15, deck: ["e1", "e3"], emoji: "💧" }
    ]
  },
  {
    id: "goblin_trio",
    name: "고블린 3인조",
    enemies: [
      { id: "goblin", name: "Goblin", hp: 20, deck: ["e1", "e3", "e4"], emoji: "👺" },
      { id: "goblin", name: "Goblin", hp: 20, deck: ["e1", "e3", "e4"], emoji: "👺" },
      { id: "goblin", name: "Goblin", hp: 20, deck: ["e1", "e3", "e4"], emoji: "👺" }
    ]
  }
];

// 몬스터 그룹 헬퍼 함수
export function getEnemyGroup(groupId) {
  const group = ENEMY_GROUPS.find(g => g.id === groupId);
  if (!group) return null;
  return {
    name: group.name,
    enemies: group.enemies.map(e => e.id),
    enemyCount: group.enemies.length
  };
}
