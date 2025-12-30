/**
 * @file useBattleInitialization.ts
 * @description 전투 초기 상태 생성 훅
 *
 * 전투 시작 시 플레이어와 적의 초기 상태를 계산합니다.
 * - 이변(anomaly) 효과 적용
 * - 상징(relic) 패시브 효과 적용
 * - 초기 스탯 계산 (에너지, 속도, 통찰 등)
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { selectBattleAnomalies, applyAnomalyEffects } from '../../../lib/anomalyUtils';
import { calculatePassiveEffects } from '../../../lib/relicEffects';
import { createReducerEnemyState } from '../../../state/battleHelpers';
import {
  DEFAULT_PLAYER_MAX_SPEED,
  BASE_PLAYER_ENERGY,
  MAX_SUBMIT_CARDS,
} from '../battleData';
import type { BattlePayload, AnomalyWithLevel } from '../../../types';
import type { PlayerState, EnemyState, SortType } from '../reducer/battleReducerActions';

export interface BattleInitializationOptions {
  initialPlayer: BattlePayload['player'] | undefined;
  initialEnemy: BattlePayload['enemy'] | undefined;
  playerEther?: number;
}

export interface BattleInitializationResult {
  // 계산된 초기 플레이어 상태
  initialPlayerState: PlayerState;
  // 계산된 초기 적 상태
  initialEnemyState: EnemyState | undefined;
  // 이변 관련
  activeAnomalies: AnomalyWithLevel[];
  showAnomalyNotification: boolean;
  setShowAnomalyNotification: (show: boolean) => void;
  // 상징 순서 관리
  orderedRelics: string[];
  orderedRelicList: string[];
  setOrderedRelics: React.Dispatch<React.SetStateAction<string[]>>;
  mergeRelicOrder: (relicList: string[], saved: string[]) => string[];
  // 상징 패시브 효과
  passiveRelicStats: ReturnType<typeof calculatePassiveEffects>;
  // 계산된 값들
  effectiveAgility: number;
  effectiveCardDrawBonus: number;
  effectiveMaxSubmitCards: number;
  baseMaxEnergy: number;
  startingEther: number;
  startingBlock: number;
  startingStrength: number;
  startingInsight: number;
  // 초기 설정값
  initialSortType: SortType;
  initialIsSimplified: boolean;
  // 적 정보
  enemyCount: number;
  isBoss: boolean;
}

/**
 * 전투 초기화 훅
 * 플레이어와 적의 초기 상태를 계산합니다.
 */
export function useBattleInitialization({
  initialPlayer,
  initialEnemy,
  playerEther = 0,
}: BattleInitializationOptions): BattleInitializationResult {
  // 스토어에서 상태 가져오기
  const playerStrength = useGameStore((state) => state.playerStrength || 0);
  const playerAgility = useGameStore((state) => state.playerAgility || 0);
  const relics = useGameStore((state) => state.relics || []);
  const devDulledLevel = useGameStore((state) => state.devDulledLevel ?? null);
  const devForcedAnomalies = useGameStore((state) => state.devForcedAnomalies ?? null);
  const mapRisk = useGameStore((state) => state.mapRisk || 0);

  // 안전한 초기값
  const safeInitialPlayer = initialPlayer ?? {} as Partial<BattlePayload['player']>;
  const safeInitialEnemy = initialEnemy ?? {} as Partial<BattlePayload['enemy']>;
  const enemyCount = safeInitialEnemy.enemyCount ?? 1;

  // 이변 시스템
  const [activeAnomalies, setActiveAnomalies] = useState<AnomalyWithLevel[]>([]);
  const [showAnomalyNotification, setShowAnomalyNotification] = useState(false);

  const isBoss = Boolean(safeInitialEnemy.type === 'boss' || safeInitialEnemy.isBoss);

  // 이변 선택
  const selectedAnomalies = useMemo(() => {
    return selectBattleAnomalies(mapRisk, isBoss, devForcedAnomalies);
  }, [mapRisk, isBoss, devForcedAnomalies]);

  // 이변 효과 적용
  const playerWithAnomalies = useMemo(() => {
    if (selectedAnomalies.length === 0) return safeInitialPlayer;
    const anomalyResult = applyAnomalyEffects(
      selectedAnomalies,
      safeInitialPlayer,
      useGameStore.getState()
    );
    return anomalyResult.player;
  }, [selectedAnomalies, safeInitialPlayer]);

  // 상징 순서 관리
  const mergeRelicOrder = useCallback((relicList: string[] = [], saved: string[] = []): string[] => {
    const savedSet = new Set(saved);
    const merged: string[] = [];
    saved.forEach(id => { if (relicList.includes(id)) merged.push(id); });
    relicList.forEach(id => { if (!savedSet.has(id)) merged.push(id); });
    return merged;
  }, []);

  const [orderedRelics, setOrderedRelics] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('relicOrder');
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return mergeRelicOrder(relics, ids);
      }
    } catch { /* ignore */ }
    return relics || [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('relicOrder', JSON.stringify(orderedRelics));
    } catch { /* ignore */ }
  }, [orderedRelics]);

  const orderedRelicList = orderedRelics && orderedRelics.length ? orderedRelics : relics;

  // 상징 패시브 효과 계산
  const passiveRelicStats = calculatePassiveEffects(orderedRelicList);

  // 에너지 및 제한 계산
  const baseEnergy = (playerWithAnomalies.energy as number) ?? BASE_PLAYER_ENERGY;
  const energyPenalty = (playerWithAnomalies.energyPenalty as number) || 0;
  const baseMaxEnergy = Math.max(0, ((playerWithAnomalies.maxEnergy as number) ?? baseEnergy) - energyPenalty);

  // 민첩 및 카드 드로우 보너스
  const effectiveAgility = Number(playerWithAnomalies.agility ?? playerAgility) || 0;
  const effectiveCardDrawBonus = passiveRelicStats.cardDrawBonus || 0;

  // 최대 카드 제출 수
  const baseMaxSubmitCards = passiveRelicStats.maxSubmitCards > 0
    ? passiveRelicStats.maxSubmitCards
    : MAX_SUBMIT_CARDS + (passiveRelicStats.extraCardPlay || 0);

  // 시작 스탯 (명시적 타입 지정)
  const startingEther: number = typeof playerWithAnomalies.etherPts === 'number'
    ? playerWithAnomalies.etherPts
    : playerEther;
  const startingBlock: number = Number(playerWithAnomalies.block ?? 0);
  const startingStrength: number = Number(playerWithAnomalies.strength ?? playerStrength ?? 0);
  const startingInsight: number = Number(playerWithAnomalies.insight ?? 0);

  // 초기 플레이어 상태
  const initialPlayerState = useMemo<PlayerState>(() => ({
    hp: playerWithAnomalies.hp ?? 30,
    maxHp: playerWithAnomalies.maxHp ?? playerWithAnomalies.hp ?? 30,
    energy: baseEnergy,
    maxEnergy: baseMaxEnergy,
    vulnMult: 1,
    vulnTurns: 0,
    block: startingBlock,
    def: false,
    counter: 0,
    etherPts: startingEther ?? 0,
    etherOverflow: 0,
    etherOverdriveActive: false,
    comboUsageCount: {},
    strength: startingStrength,
    insight: startingInsight,
    maxSpeed: Math.max(
      0,
      ((playerWithAnomalies.maxSpeed as number) ?? DEFAULT_PLAYER_MAX_SPEED)
        + (passiveRelicStats.maxSpeed || 0)
        + (passiveRelicStats.speed || 0)
        - ((playerWithAnomalies.speedPenalty as number) || 0)
    ),
    tokens: playerWithAnomalies.tokens || { usage: [], turn: [], permanent: [] },
    etherBan: playerWithAnomalies.etherBan || false,
    energyPenalty: playerWithAnomalies.energyPenalty || 0,
    speedPenalty: playerWithAnomalies.speedPenalty || 0,
    drawPenalty: playerWithAnomalies.drawPenalty || 0,
    insightPenalty: playerWithAnomalies.insightPenalty || 0,
  }), [
    playerWithAnomalies,
    baseEnergy,
    baseMaxEnergy,
    startingBlock,
    startingEther,
    startingStrength,
    startingInsight,
    passiveRelicStats,
  ]);

  // 초기 적 상태
  const initialEnemyState = useMemo<EnemyState | undefined>(() => {
    if (!safeInitialEnemy?.name) return undefined;
    return createReducerEnemyState({
      ...safeInitialEnemy,
      shroud: safeInitialEnemy.shroud ?? 0,
      strength: 0,
    });
  }, [safeInitialEnemy]);

  // 초기 설정값 (localStorage에서 로드)
  const initialSortType = useMemo<SortType>(() => {
    try {
      const saved = localStorage.getItem('battleSortType');
      const validTypes: SortType[] = ['speed', 'energy', 'value', 'type', 'cost', 'order'];
      return (validTypes.includes(saved as SortType) ? saved : 'speed') as SortType;
    } catch {
      return 'speed' as SortType;
    }
  }, []);

  const initialIsSimplified = useMemo<boolean>(() => {
    try {
      const saved = localStorage.getItem('battleIsSimplified');
      return saved === 'true';
    } catch {
      return false;
    }
  }, []);

  // 이변 상태 동기화
  useEffect(() => {
    setActiveAnomalies(selectedAnomalies);
    if (selectedAnomalies.length > 0) {
      setShowAnomalyNotification(true);
    }
  }, [selectedAnomalies]);

  return {
    initialPlayerState,
    initialEnemyState,
    activeAnomalies,
    showAnomalyNotification,
    setShowAnomalyNotification,
    orderedRelics,
    orderedRelicList,
    setOrderedRelics,
    mergeRelicOrder,
    passiveRelicStats,
    effectiveAgility,
    effectiveCardDrawBonus,
    effectiveMaxSubmitCards: baseMaxSubmitCards,
    baseMaxEnergy,
    startingEther,
    startingBlock,
    startingStrength,
    startingInsight,
    initialSortType,
    initialIsSimplified,
    enemyCount,
    isBoss,
  };
}
