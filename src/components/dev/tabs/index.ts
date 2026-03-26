/**
 * @file index.ts
 * @description DevTools 탭 컴포넌트 re-export
 */

export { ResourcesTab } from './ResourcesTab';
export { MapTab } from './MapTab';
export { BattleTab } from './BattleTab';
export { RelicsTab } from './RelicsTab';
export { ItemsTab } from './ItemsTab';
export { EventTab } from './EventTab';
export { CardsTab } from './CardsTab';
// SimulatorTab is lazy-loaded in DevTools.tsx, not exported here to enable code splitting
export { BalanceTab } from './BalanceTab';
export { StatsTab } from './StatsTab';
