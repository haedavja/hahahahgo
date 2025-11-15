export const MAX_SPEED = 30;
export const BASE_PLAYER_ENERGY = 6;
export const MAX_SUBMIT_CARDS = 5;
export const ETHER_THRESHOLD = 100;

// 에테르 인플레이션 계산
// 1칸: 100pt, 2칸: 250pt (100+150), 3칸: 475pt (250+225), ...
// 각 칸마다 이전 칸 필요량의 1.5배 추가
export function etherPtsToSlots(pts) {
  if (pts <= 0) return 0;

  let accumulated = 0;
  let slotCost = ETHER_THRESHOLD; // 첫 칸은 100pt
  let slots = 0;

  while (accumulated + slotCost <= pts) {
    accumulated += slotCost;
    slots++;
    slotCost = Math.floor(slotCost * 1.5); // 다음 칸은 50% 증가
  }

  return slots;
}

// 칸 수를 pt로 변환 (해당 칸을 채우는데 필요한 총 pt)
export function etherSlotsToMinPts(slots) {
  if (slots <= 0) return 0;

  let total = 0;
  let slotCost = ETHER_THRESHOLD;

  for (let i = 0; i < slots; i++) {
    total += slotCost;
    slotCost = Math.floor(slotCost * 1.5);
  }

  return total;
}

// 현재 pt가 다음 칸을 채우는데 얼마나 진행되었는지 (0~1)
export function etherProgressInSlot(pts) {
  const currentSlots = etherPtsToSlots(pts);
  const minPtsForCurrentSlot = etherSlotsToMinPts(currentSlots);
  const minPtsForNextSlot = etherSlotsToMinPts(currentSlots + 1);
  const costForNextSlot = minPtsForNextSlot - minPtsForCurrentSlot;

  if (costForNextSlot === 0) return 0;

  const progress = (pts - minPtsForCurrentSlot) / costForNextSlot;
  return Math.max(0, Math.min(1, progress));
}

export const CARDS = [
  { id: "quick",   name: "Quick Slash",    type: "attack",  damage: 3,              speedCost: 3,  actionCost: 1, iconKey: "sword" },
  { id: "slash",   name: "Slash",          type: "attack",  damage: 5,              speedCost: 5,  actionCost: 2, iconKey: "sword" },
  { id: "heavy",   name: "Heavy Strike",   type: "attack",  damage: 8,              speedCost: 10, actionCost: 2, iconKey: "flame" },
  { id: "double",  name: "Double Slash",   type: "attack",  damage: 3, hits: 2,     speedCost: 7,  actionCost: 2, iconKey: "sword" },
  { id: "precise", name: "Precise Strike", type: "attack",  damage: 6,              speedCost: 6,  actionCost: 2, iconKey: "sword" },
  { id: "rush",    name: "Rush Attack",    type: "attack",  damage: 4,              speedCost: 4,  actionCost: 1, iconKey: "flame" },
  { id: "parry",   name: "Parry",          type: "defense", block: 5,               speedCost: 2,  actionCost: 1, iconKey: "shield", counter: 0 },
  { id: "guard",   name: "Guard",          type: "defense", block: 8,               speedCost: 6,  actionCost: 1, iconKey: "shield" },
  { id: "wall",    name: "Iron Wall",      type: "defense", block: 12,              speedCost: 9,  actionCost: 2, iconKey: "shield" },
  { id: "counter", name: "Counter Stance", type: "defense", block: 4, counter: 3,   speedCost: 4,  actionCost: 1, iconKey: "shield" },
];

export const ENEMY_CARDS = [
  { id: "e1", name: "Attack",  type: "attack",  damage: 3, speedCost: 3, actionCost: 1, iconKey: "sword" },
  { id: "e2", name: "Heavy",   type: "attack",  damage: 6, speedCost: 8, actionCost: 2, iconKey: "flame" },
  { id: "e3", name: "Guard",   type: "defense", block: 4, speedCost: 2, actionCost: 1, iconKey: "shield" },
  { id: "e4", name: "Strike",  type: "attack",  damage: 4, speedCost: 5, actionCost: 1, iconKey: "sword" },
  { id: "e5", name: "Defense", type: "defense", block: 6, speedCost: 6, actionCost: 1, iconKey: "shield" },
  { id: "e6", name: "Barrier", type: "defense", block: 8, speedCost: 9, actionCost: 2, iconKey: "shield" },
];

export const ENEMIES = [
  { name: "Goblin", hp: 20, deck: ["e1", "e3", "e4"] },
];
