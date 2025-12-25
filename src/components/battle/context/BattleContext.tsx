/**
 * @file BattleContext.tsx
 * @description 전투 시스템 Context Provider
 *
 * prop drilling을 줄이기 위해 전투 관련 상태와 유틸리티 함수를 Context로 제공합니다.
 *
 * ## 제공되는 값
 * - battle: 전투 상태 (phase, hand, selected 등)
 * - player: 플레이어 상태
 * - enemy: 적 상태
 * - enemyUnits: 다중 적 유닛 배열
 * - actions: 상태 변경 액션들
 * - formatters: 포맷팅 유틸리티 (formatSpeedText 등)
 */

import { createContext, useContext, ReactNode, FC } from 'react';

interface TokenState {
  usage: unknown[];
  turn: unknown[];
  permanent: unknown[];
}

interface EnemyUnit {
  unitId: number;
  name: string;
  emoji?: string;
  hp: number;
  maxHp: number;
  block?: number;
  tokens?: TokenState;
}

interface Player {
  hp: number;
  maxHp: number;
  energy?: number;
  maxEnergy?: number;
  block?: number;
  strength?: number;
  etherPts?: number;
}

interface Enemy {
  name: string;
  hp: number;
  maxHp: number;
  etherPts?: number;
  etherCapacity?: number;
}

interface Battle {
  phase: string;
  hand?: unknown[];
  selected?: unknown[];
}

interface Actions {
  [key: string]: (...args: unknown[]) => void;
}

interface Formatters {
  formatSpeedText?: (speed: number) => string;
  [key: string]: unknown;
}

export interface BattleContextValue {
  battle: Battle;
  player: Player;
  enemy: Enemy;
  enemyUnits: EnemyUnit[];
  actions: Actions;
  formatters: Formatters;
}

const BattleContext = createContext<BattleContextValue | null>(null);

interface BattleProviderProps {
  children: ReactNode;
  value: BattleContextValue;
}

/**
 * BattleContext Provider
 */
export const BattleProvider: FC<BattleProviderProps> = ({ children, value }) => {
  return (
    <BattleContext.Provider value={value}>
      {children}
    </BattleContext.Provider>
  );
};

/**
 * BattleContext 사용 훅
 * @returns BattleContextValue
 * @throws Error Provider 외부에서 사용 시 에러
 */
export function useBattleContext(): BattleContextValue {
  const context = useContext(BattleContext);
  if (context === null) {
    throw new Error('useBattleContext must be used within a BattleProvider');
  }
  return context;
}

/**
 * 선택적 BattleContext 사용 훅 (Provider 없어도 동작)
 * @returns BattleContextValue | null
 */
export function useBattleContextOptional(): BattleContextValue | null {
  return useContext(BattleContext);
}

export default BattleContext;
