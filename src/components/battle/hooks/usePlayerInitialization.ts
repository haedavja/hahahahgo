/**
 * @file usePlayerInitialization.ts
 * @description 플레이어 초기화 훅
 *
 * ## 주요 기능
 * - 플레이어 상태 초기화
 * - 에테르, 통찰, 힘 등 초기 설정
 * - 덱/손패 초기화
 * - 통찰 애니메이션 재생
 */

import { useEffect, type MutableRefObject } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { ANIMATION_TIMING } from '../ui/constants/layout';
import { initializeDeck, drawFromDeck } from '../utils/handGeneration';
import { generateHandUid } from '../../../lib/randomUtils';
import { playInsightSound } from '../utils/insightSystem';
import { DEFAULT_DRAW_COUNT } from '../battleData';
import type { Card } from '../../../types/core';

interface PlayerData {
  hp?: number;
  maxHp?: number;
  energy?: number;
  etherPts?: number;
  strength?: number;
  insight?: number;
  [key: string]: unknown;
}

interface BattleState {
  insightAnimPulseKey: number;
  insightBadge: unknown;
  vanishedCards?: Card[];
  [key: string]: unknown;
}

interface UsePlayerInitializationParams {
  player: PlayerData;
  safeInitialPlayer: Partial<PlayerData>;
  playerEther: number;
  startingStrength: number;
  startingInsight: number;
  battle: BattleState;
  allCards: Card[];
  initialEtherRef: MutableRefObject<number>;
  resultSentRef: MutableRefObject<boolean>;
  turnStartProcessedRef: MutableRefObject<boolean>;
  prevInsightRef: MutableRefObject<number>;
  prevRevealLevelRef: MutableRefObject<number>;
  deckInitializedRef: MutableRefObject<boolean>;
  escapeBanRef: MutableRefObject<Set<string>>;
  actions: {
    setPlayer: (player: unknown) => void;
    setSelected: (selected: unknown[]) => void;
    setQueue: (queue: unknown[]) => void;
    setQIndex: (index: number) => void;
    setFixedOrder: (order: unknown) => void;
    setPostCombatOptions: (options: unknown) => void;
    setEnemyPlan: (plan: { actions: unknown[]; mode: unknown }) => void;
    setInsightAnimLevel: (level: number) => void;
    setInsightAnimPulseKey: (key: number) => void;
    setEnemyEtherFinalValue: (value: unknown) => void;
    setEnemyEtherCalcPhase: (phase: unknown) => void;
    setEnemyCurrentDeflation: (deflation: unknown) => void;
    setInsightBadge: (badge: unknown) => void;
    setPhase: (phase: string) => void;
    setDeck: (deck: Card[]) => void;
    setDiscardPile: (pile: Card[]) => void;
    setHand: (hand: Card[]) => void;
    setCanRedraw: (canRedraw: boolean) => void;
  };
}

/**
 * 플레이어 초기화 훅
 */
export function usePlayerInitialization(params: UsePlayerInitializationParams): void {
  const {
    player,
    safeInitialPlayer,
    playerEther,
    startingStrength,
    startingInsight,
    battle,
    allCards,
    initialEtherRef,
    resultSentRef,
    turnStartProcessedRef,
    prevInsightRef,
    prevRevealLevelRef,
    deckInitializedRef,
    escapeBanRef,
    actions
  } = params;

  useEffect(() => {
    const nextEther = typeof safeInitialPlayer?.etherPts === 'number'
      ? safeInitialPlayer.etherPts
      : (playerEther ?? (player.etherPts as number));
    initialEtherRef.current = nextEther as number;
    resultSentRef.current = false;
    actions.setPlayer({
      ...player,
      hp: safeInitialPlayer?.hp ?? player.hp,
      maxHp: safeInitialPlayer?.maxHp ?? player.maxHp,
      energy: safeInitialPlayer?.energy ?? player.energy,
      maxEnergy: safeInitialPlayer?.energy ?? (player as { maxEnergy?: number }).maxEnergy,
      etherPts: nextEther,
      // Strength를 0으로 리셋하지 않고 초기 계산값/이전 값 보존
      strength: Number(safeInitialPlayer?.strength || player.strength || startingStrength || 0),
      insight: Number(safeInitialPlayer?.insight || player.insight || startingInsight || 0)
    });
    actions.setSelected([]);
    actions.setQueue([]);
    actions.setQIndex(0);
    actions.setFixedOrder(null);
    actions.setPostCombatOptions(null);
    actions.setEnemyPlan({ actions: [], mode: null });
    // 새로운 전투/턴 초기화 시 턴 시작 플래그도 리셋
    turnStartProcessedRef.current = false;
    // 통찰/연출 관련 초기화
    prevInsightRef.current = 0;
    prevRevealLevelRef.current = 0;
    actions.setInsightAnimLevel(0);
    actions.setInsightAnimPulseKey(battle.insightAnimPulseKey + 1);
    actions.setEnemyEtherFinalValue(null);
    actions.setEnemyEtherCalcPhase(null);
    actions.setEnemyCurrentDeflation(null);
    if ((safeInitialPlayer?.insight || 0) > 0) {
      // 전투 시작 시에도 통찰 연출 1회 재생
      setTimeout(() => {
        actions.setInsightBadge({
          level: safeInitialPlayer?.insight || 0,
          dir: 'up',
          show: true,
          key: Date.now(),
        });
        playInsightSound(Math.min(safeInitialPlayer?.insight || 0, 3));
        actions.setInsightAnimLevel(Math.min(3, safeInitialPlayer?.insight || 0));
        actions.setInsightAnimPulseKey(battle.insightAnimPulseKey + 1);
        setTimeout(() => actions.setInsightAnimLevel(0), ANIMATION_TIMING.INSIGHT_ANIMATION);
        setTimeout(() => actions.setInsightBadge({ ...(battle.insightBadge as Record<string, unknown>), show: false }), 1200);
      }, 50);
    }
    actions.setPhase('select');
    // 덱/무덤 시스템 초기화
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && ((currentBuild.mainSpecials?.length ?? 0) > 0 || (currentBuild.subSpecials?.length ?? 0) > 0 || (currentBuild.ownedCards?.length ?? 0) > 0);

    // 덱이 이미 초기화되었으면 스킵 (두 번째 useEffect에서 처리)
    if (!deckInitializedRef.current) {
      if (hasCharacterBuild) {
        // 덱 초기화 (주특기는 손패로, 보조특기는 덱 맨 위로)
        const cardGrowthState = useGameStore.getState().cardGrowth || {};
        const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, (battle.vanishedCards || []).map(c => c.id), cardGrowthState);
        // 덱에서 카드 드로우
        const drawResult = drawFromDeck(initialDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current);
        actions.setDeck(drawResult.newDeck);
        actions.setDiscardPile(drawResult.newDiscardPile);
        // 주특기 + 드로우한 카드 = 손패
        actions.setHand([...mainSpecialsHand, ...drawResult.drawnCards]);
        deckInitializedRef.current = true;
      } else {
        // 캐릭터 빌드가 없으면 기존 방식 (테스트용)
        const rawHand = allCards.slice(0, 10).map((card, idx) => ({ ...card, __handUid: generateHandUid(card.id, idx) }));
        actions.setHand(rawHand);
        actions.setDeck([]);
        actions.setDiscardPile([]);
        deckInitializedRef.current = true;
      }
    }
    actions.setCanRedraw(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
