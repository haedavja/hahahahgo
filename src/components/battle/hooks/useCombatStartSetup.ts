/**
 * @file useCombatStartSetup.ts
 * @description 전투 시작 설정 훅
 *
 * ## 주요 기능
 * - 적 상태 초기화
 * - 전투 시작 상징 효과 적용 및 애니메이션
 * - 덱/손패 초기화
 */

import { useEffect, type MutableRefObject } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { createReducerEnemyState } from '../../../state/battleHelpers';
import { RELICS } from '../../../data/relics';
import { applyCombatStartEffects } from '../../../lib/relicEffects';
import { initializeDeck, drawFromDeck } from '../utils/handGeneration';
import { generateHandUid } from '../../../lib/randomUtils';
import { DEFAULT_DRAW_COUNT, ENEMIES } from '../battleData';
import type { Card } from '../../../types/core';

interface UseCombatStartSetupParams {
  enemy: unknown;
  enemyIndex: number;
  orderedRelicList: string[];
  vanishedCards: Card[] | null | undefined;
  allCards: Card[];
  deckInitializedRef: MutableRefObject<boolean>;
  escapeBanRef: MutableRefObject<Set<string>>;
  playSound: (freq: number, duration: number) => void;
  addLog: (msg: string) => void;
  actions: {
    setEnemy: (enemy: unknown) => void;
    setRelicActivated: (relicId: string | null) => void;
    setDeck: (deck: Card[]) => void;
    setDiscardPile: (pile: Card[]) => void;
    setHand: (hand: Card[]) => void;
    setSelected: (selected: Card[]) => void;
    setCanRedraw: (canRedraw: boolean) => void;
  };
}

/**
 * 전투 시작 설정 훅
 */
export function useCombatStartSetup(params: UseCombatStartSetupParams): void {
  const {
    enemy,
    enemyIndex,
    orderedRelicList,
    vanishedCards,
    allCards,
    deckInitializedRef,
    escapeBanRef,
    playSound,
    addLog,
    actions
  } = params;

  useEffect(() => {
    if (!enemy) {
      const e = ENEMIES[enemyIndex];
      const enemyState = createReducerEnemyState(e as Parameters<typeof createReducerEnemyState>[0]);
      actions.setEnemy(enemyState);

      // 전투 시작 상징 효과 로그 및 애니메이션
      const combatStartEffects = applyCombatStartEffects(orderedRelicList, {});

      // 전투 시작 상징 애니메이션
      orderedRelicList.forEach((relicId: string) => {
        const relic = RELICS[relicId as keyof typeof RELICS];
        if (relic?.effects?.type === 'ON_COMBAT_START') {
          actions.setRelicActivated(relicId);
          playSound(800, 200);
          setTimeout(() => actions.setRelicActivated(null), 500);
        }
      });

      if (combatStartEffects.damage > 0) {
        addLog(`⛓️ 상징 효과: 체력 -${combatStartEffects.damage} (피의 족쇄)`);
      }
      if (combatStartEffects.strength > 0) {
        addLog(`💪 상징 효과: 힘 +${combatStartEffects.strength}`);
      }
      if (combatStartEffects.block > 0) {
        addLog(`🛡️ 상징 효과: 방어력 +${combatStartEffects.block}`);
      }
      if (combatStartEffects.heal > 0) {
        addLog(`💚 상징 효과: 체력 +${combatStartEffects.heal}`);
      }

      // 덱/무덤 시스템 초기화 (이미 초기화되었으면 스킵)
      if (!deckInitializedRef.current) {
        const currentBuild = useGameStore.getState().characterBuild;
        const hasCharacterBuild = currentBuild && ((currentBuild.mainSpecials?.length ?? 0) > 0 || (currentBuild.subSpecials?.length ?? 0) > 0 || (currentBuild.ownedCards?.length ?? 0) > 0);

        if (hasCharacterBuild) {
          // 덱 초기화 (주특기는 손패로, 보조특기는 덱 맨 위로)
          const { deck: initialDeck, mainSpecialsHand } = initializeDeck(currentBuild, (vanishedCards || []).map(c => c.id));
          // 덱에서 카드 드로우
          const drawResult = drawFromDeck(initialDeck, [], DEFAULT_DRAW_COUNT, escapeBanRef.current);
          actions.setDeck(drawResult.newDeck);
          actions.setDiscardPile(drawResult.newDiscardPile);
          // 주특기 + 드로우한 카드 = 손패
          const fullHand = [...mainSpecialsHand, ...drawResult.drawnCards];
          actions.setHand(fullHand);
          deckInitializedRef.current = true; // 덱 초기화 완료 표시
          addLog(`🎴 시작 손패 ${fullHand.length}장 (주특기 ${mainSpecialsHand.length}장, 덱: ${drawResult.newDeck.length}장)`);
        } else {
          const rawHand = allCards.slice(0, 10).map((card, idx) => ({ ...card, __handUid: generateHandUid(card.id, idx) }));
          actions.setHand(rawHand);
          actions.setDeck([]);
          actions.setDiscardPile([]);
          deckInitializedRef.current = true; // 덱 초기화 완료 표시
          addLog(`🎴 시작 손패 ${rawHand.length}장`);
        }
      }
      actions.setSelected([]);
      actions.setCanRedraw(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
