export const MAX_SPEED = 30;
export const BASE_PLAYER_ENERGY = 6;
export const MAX_SUBMIT_CARDS = 5;
export const ETHER_THRESHOLD = 100;

export const CARDS = [
  { id: "quick",   name: "Quick Slash",    type: "attack",  damage: 13,              speedCost: 3,  actionCost: 1, iconKey: "sword" },
  { id: "slash",   name: "Slash",          type: "attack",  damage: 30,              speedCost: 5,  actionCost: 2, iconKey: "sword" },
  { id: "heavy",   name: "Heavy Strike",   type: "attack",  damage: 40,              speedCost: 10, actionCost: 2, iconKey: "flame" },
  { id: "double",  name: "Double Slash",   type: "attack",  damage: 17, hits: 2,     speedCost: 7,  actionCost: 2, iconKey: "sword" },
  { id: "precise", name: "Precise Strike", type: "attack",  damage: 32,              speedCost: 6,  actionCost: 2, iconKey: "sword" },
  { id: "rush",    name: "Rush Attack",    type: "attack",  damage: 14,              speedCost: 4,  actionCost: 1, iconKey: "flame" },
  { id: "parry",   name: "Parry",          type: "defense", block: 12,               speedCost: 2,  actionCost: 1, iconKey: "shield", counter: 0 },
  { id: "guard",   name: "Guard",          type: "defense", block: 16,               speedCost: 6,  actionCost: 1, iconKey: "shield" },
  { id: "wall",    name: "Iron Wall",      type: "defense", block: 38,               speedCost: 9,  actionCost: 2, iconKey: "shield" },
  { id: "counter", name: "Counter Stance", type: "defense", block: 14, counter: 3,   speedCost: 4,  actionCost: 1, iconKey: "shield" },
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
