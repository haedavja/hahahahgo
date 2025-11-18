export const MAX_SPEED = 30;
export const BASE_PLAYER_ENERGY = 6;
export const MAX_SUBMIT_CARDS = 5;
export const ETHER_THRESHOLD = 100;

export const CARDS = [
  { id: "quick",   name: "Quick Slash",    type: "attack",  damage: 13,              speedCost: 3,  actionCost: 1, iconKey: "sword",  description: "빠르게 적을 베어낸다. 낮은 속도 코스트로 신속한 공격이 가능하다." },
  { id: "slash",   name: "Slash",          type: "attack",  damage: 30,              speedCost: 5,  actionCost: 2, iconKey: "sword",  description: "강력한 베기 공격. 균형 잡힌 데미지와 속도를 제공한다." },
  { id: "heavy",   name: "Heavy Strike",   type: "attack",  damage: 40,              speedCost: 10, actionCost: 2, iconKey: "flame",  description: "묵직한 일격. 높은 데미지를 주지만 속도가 느리다." },
  { id: "double",  name: "Double Slash",   type: "attack",  damage: 17, hits: 2,     speedCost: 7,  actionCost: 2, iconKey: "sword",  description: "두 번 연속 베기. 방어를 뚫기에 유리하다." },
  { id: "precise", name: "Precise Strike", type: "attack",  damage: 32,              speedCost: 6,  actionCost: 2, iconKey: "sword",  description: "정확한 타격. 안정적인 데미지를 보장한다." },
  { id: "rush",    name: "Rush Attack",    type: "attack",  damage: 14,              speedCost: 4,  actionCost: 1, iconKey: "flame",  description: "돌진 공격. 빠른 속도로 적을 압박한다." },
  { id: "parry",   name: "Parry",          type: "defense", block: 12,               speedCost: 2,  actionCost: 1, iconKey: "shield", description: "빠른 패링. 적의 공격을 재빠르게 막아낸다." },
  { id: "guard",   name: "Guard",          type: "defense", block: 16,               speedCost: 6,  actionCost: 1, iconKey: "shield", description: "견고한 방어 자세. 적당한 방어력을 제공한다." },
  { id: "wall",    name: "Iron Wall",      type: "defense", block: 38,               speedCost: 9,  actionCost: 2, iconKey: "shield", description: "철벽 방어. 강력한 방어막을 형성하지만 느리다." },
  { id: "counter", name: "Counter Stance", type: "defense", block: 14, counter: 3,   speedCost: 4,  actionCost: 1, iconKey: "shield", description: "반격 자세. 방어하면서 공격받을 시 반격한다." },
];

export const ENEMY_CARDS = [
  { id: "e1", name: "Attack",  type: "attack",  damage: 13, speedCost: 3, actionCost: 1, iconKey: "sword" },
  { id: "e2", name: "Heavy",   type: "attack",  damage: 36, speedCost: 8, actionCost: 2, iconKey: "flame" },
  { id: "e3", name: "Guard",   type: "defense", block: 12, speedCost: 2, actionCost: 1, iconKey: "shield" },
  { id: "e4", name: "Strike",  type: "attack",  damage: 15, speedCost: 5, actionCost: 1, iconKey: "sword" },
  { id: "e5", name: "Defense", type: "defense", block: 16, speedCost: 6, actionCost: 1, iconKey: "shield" },
  { id: "e6", name: "Barrier", type: "defense", block: 38, speedCost: 9, actionCost: 2, iconKey: "shield" },
];

export const ENEMIES = [
  { name: "Goblin", hp: 20, deck: ["e1", "e3", "e4"] },
];
