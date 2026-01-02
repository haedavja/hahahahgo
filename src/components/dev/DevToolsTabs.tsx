/**
 * DevToolsTabs.tsx
 *
 * DevTools의 각 탭 컴포넌트들을 re-export
 * 개별 탭은 tabs/ 디렉토리에서 관리
 *
 * Note: SimulatorTab은 DevTools.tsx에서 lazy loading되므로 여기서 export하지 않음
 */

export {
  ResourcesTab,
  MapTab,
  BattleTab,
  RelicsTab,
  ItemsTab,
  EventTab,
  CardsTab,
  BalanceTab
} from './tabs';
