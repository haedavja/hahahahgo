// @vitest-environment happy-dom
/**
 * @file useBattleState.test.js
 * @description useBattleState 훅 테스트
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBattleState } from './useBattleState';
import {
  createBattleStatePlayer,
  createBattleStateEnemy,
  createBattleStateCard,
  createBattleStateCards,
  createBattleStateQueueEntry,
  createBattleStateEnemyUnits,
  createPostCombatOptions,
} from '../../../test/factories';

// 내부 액션 타입 (공개 인터페이스에 없는 메서드 포함)
interface InternalBattleActions {
  setLog: (log: string[]) => void;
  setQIndex: (index: number) => void;
  incrementQIndex: () => void;
  setTurnNumber: (turn: number) => void;
  incrementTurn: () => void;
  setDeck: (deck: unknown[]) => void;
  setDiscardPile: (pile: unknown[]) => void;
  setDistributionMode: (mode: string) => void;
  setDamageDistribution: (dist: Record<string, number>) => void;
  resetDistribution: () => void;
  setTotalDistributableDamage: (damage: number) => void;
}

describe('useBattleState', () => {
  describe('초기화', () => {
    it('기본값으로 초기화되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      expect(result.current.battle).toBeDefined();
      expect(result.current.actions).toBeDefined();
      expect(result.current.battle.phase).toBe('select');
      expect(result.current.battle.log).toContain('게임 시작!');
    });

    it('초기 상태 오버라이드가 적용되어야 함', () => {
      const initialPlayer = createBattleStatePlayer({ hp: 50, maxHp: 100, block: 10 });
      const { result } = renderHook(() => useBattleState({ player: initialPlayer }));

      expect(result.current.battle.player.hp).toBe(50);
      expect(result.current.battle.player.maxHp).toBe(100);
      expect(result.current.battle.player.block).toBe(10);
    });

    it('sortType 오버라이드가 적용되어야 함', () => {
      const { result } = renderHook(() => useBattleState({ sortType: 'energy' }));

      expect(result.current.battle.sortType).toBe('energy');
    });

    it('isSimplified 오버라이드가 적용되어야 함', () => {
      const { result } = renderHook(() => useBattleState({ isSimplified: true }));

      expect(result.current.battle.isSimplified).toBe(true);
    });
  });

  describe('페이즈 관리', () => {
    it('setPhase로 페이즈가 변경되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setPhase('resolve');
      });

      expect(result.current.battle.phase).toBe('resolve');
    });
  });

  describe('플레이어 관리', () => {
    it('setPlayer로 플레이어 전체가 교체되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const newPlayer = createBattleStatePlayer({ hp: 75, maxHp: 100, block: 5 });
      act(() => {
        result.current.actions.setPlayer(newPlayer);
      });

      expect(result.current.battle.player.hp).toBe(75);
      expect(result.current.battle.player.block).toBe(5);
    });

    it('updatePlayer로 플레이어 일부만 업데이트되어야 함', () => {
      const initialPlayer = createBattleStatePlayer({ hp: 100, maxHp: 100, block: 0 });
      const { result } = renderHook(() => useBattleState({ player: initialPlayer }));

      act(() => {
        result.current.actions.updatePlayer({ hp: 80 });
      });

      expect(result.current.battle.player.hp).toBe(80);
      expect(result.current.battle.player.maxHp).toBe(100);
    });
  });

  describe('적 관리', () => {
    it('setEnemy로 적 전체가 교체되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const newEnemy = createBattleStateEnemy({ hp: 50, maxHp: 100, block: 10 });
      act(() => {
        result.current.actions.setEnemy(newEnemy);
      });

      expect(result.current.battle.enemy.hp).toBe(50);
      expect(result.current.battle.enemy.block).toBe(10);
    });

    it('updateEnemy로 적 일부만 업데이트되어야 함', () => {
      const initialEnemy = createBattleStateEnemy({ hp: 100, maxHp: 100, block: 0 });
      const { result } = renderHook(() => useBattleState({ enemy: initialEnemy }));

      act(() => {
        result.current.actions.updateEnemy({ hp: 60, block: 15 });
      });

      expect(result.current.battle.enemy.hp).toBe(60);
      expect(result.current.battle.enemy.block).toBe(15);
    });
  });

  describe('카드 관리', () => {
    it('setHand로 손패가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const hand = createBattleStateCards([
        { id: 'strike', name: '타격', damage: 6 },
        { id: 'defend', name: '수비', block: 5 }
      ]);
      act(() => {
        result.current.actions.setHand(hand);
      });

      expect(result.current.battle.hand).toHaveLength(2);
      expect(result.current.battle.hand[0].id).toBe('strike');
    });

    it('setSelected로 선택된 카드가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const selected = [createBattleStateCard({ id: 'strike', name: '타격', damage: 6 })];
      act(() => {
        result.current.actions.setSelected(selected);
      });

      expect(result.current.battle.selected).toHaveLength(1);
    });

    it('addSelected로 카드가 추가되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.addSelected(createBattleStateCard({ id: 'strike', name: '타격' }));
      });

      expect(result.current.battle.selected).toHaveLength(1);

      act(() => {
        result.current.actions.addSelected(createBattleStateCard({ id: 'defend', name: '수비' }));
      });

      expect(result.current.battle.selected).toHaveLength(2);
    });

    it('removeSelected로 카드가 제거되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setSelected(createBattleStateCards([
          { id: 'strike', name: '타격' },
          { id: 'defend', name: '수비' }
        ]));
      });

      act(() => {
        result.current.actions.removeSelected(0);
      });

      expect(result.current.battle.selected).toHaveLength(1);
      expect(result.current.battle.selected[0].id).toBe('defend');
    });
  });

  describe('로그 관리', () => {
    it('addLog로 로그가 추가되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.addLog('테스트 메시지');
      });

      expect(result.current.battle.log).toContain('테스트 메시지');
    });

    it('setLog로 로그 전체가 교체되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setLog(['새 로그']);
      });

      expect(result.current.battle.log).toEqual(['새 로그']);
    });
  });

  describe('큐 관리', () => {
    it('setQueue로 큐가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const queue = [
        createBattleStateQueueEntry({ type: 'player', card: { id: 'strike' } }),
        createBattleStateQueueEntry({ type: 'enemy', card: { id: 'attack' } })
      ];
      act(() => {
        result.current.actions.setQueue(queue);
      });

      expect(result.current.battle.queue).toHaveLength(2);
    });

    it('setQIndex로 큐 인덱스가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setQIndex(5);
      });

      expect(result.current.battle.qIndex).toBe(5);
    });

    it('incrementQIndex로 큐 인덱스가 증가해야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setQIndex(3);
      });

      act(() => {
        actions.incrementQIndex();
      });

      expect(result.current.battle.qIndex).toBe(4);
    });
  });

  describe('UI 상태 관리', () => {
    it('setCanRedraw로 리드로우 상태가 변경되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setCanRedraw(false);
      });

      expect(result.current.battle.canRedraw).toBe(false);
    });

    it('setSortType로 정렬 타입이 변경되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setSortType('value');
      });

      expect(result.current.battle.sortType).toBe('value');
    });

    it('setIsSimplified로 간소화 모드가 변경되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setIsSimplified(true);
      });

      expect(result.current.battle.isSimplified).toBe(true);
    });
  });

  describe('턴 관리', () => {
    it('setTurnNumber로 턴 번호가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setTurnNumber(5);
      });

      expect(result.current.battle.turnNumber).toBe(5);
    });

    it('incrementTurn으로 턴이 증가해야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setTurnNumber(1);
      });

      act(() => {
        actions.incrementTurn();
      });

      expect(result.current.battle.turnNumber).toBe(2);
    });
  });

  describe('덱/무덤 시스템', () => {
    it('setDeck으로 덱이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      const deck = createBattleStateCards([{ id: 'card1' }, { id: 'card2' }]);
      act(() => {
        actions.setDeck(deck);
      });

      expect(result.current.battle.deck).toHaveLength(2);
    });

    it('setDiscardPile로 무덤이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      const discardPile = [createBattleStateCard({ id: 'card1' })];
      act(() => {
        actions.setDiscardPile(discardPile);
      });

      expect(result.current.battle.discardPile).toHaveLength(1);
    });
  });

  describe('애니메이션 상태', () => {
    it('setPlayerHit으로 플레이어 히트 상태가 변경되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setPlayerHit(true);
      });

      expect(result.current.battle.playerHit).toBe(true);
    });

    it('setEnemyHit으로 적 히트 상태가 변경되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setEnemyHit(true);
      });

      expect(result.current.battle.enemyHit).toBe(true);
    });
  });

  describe('피해 분배 시스템', () => {
    it('setDistributionMode로 분배 모드가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setDistributionMode('multi');
      });

      expect(result.current.battle.distributionMode).toBe('multi');
    });

    it('setDamageDistribution으로 피해 분배가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      const distribution = { unit1: 10, unit2: 15 };
      act(() => {
        actions.setDamageDistribution(distribution);
      });

      expect(result.current.battle.damageDistribution).toEqual(distribution);
    });

    it('resetDistribution으로 분배가 초기화되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setDamageDistribution({ unit1: 10 });
      });

      act(() => {
        actions.resetDistribution();
      });

      expect(result.current.battle.damageDistribution).toEqual({});
    });

    it('setTotalDistributableDamage로 총 분배 가능 피해가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const actions = result.current.actions as unknown as InternalBattleActions;

      act(() => {
        actions.setTotalDistributableDamage(50);
      });

      expect(result.current.battle.totalDistributableDamage).toBe(50);
    });
  });

  describe('에테르 시스템', () => {
    it('setTurnEtherAccumulated로 턴 에테르가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setTurnEtherAccumulated(25);
      });

      expect(result.current.battle.turnEtherAccumulated).toBe(25);
    });

    it('setEnemyTurnEtherAccumulated로 적 턴 에테르가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setEnemyTurnEtherAccumulated(30);
      });

      expect(result.current.battle.enemyTurnEtherAccumulated).toBe(30);
    });

    it('setEtherCalcPhase로 에테르 계산 페이즈가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setEtherCalcPhase('calculating');
      });

      expect(result.current.battle.etherCalcPhase).toBe('calculating');
    });

    it('setEtherAnimationPts로 애니메이션 포인트가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setEtherAnimationPts(50);
      });

      expect(result.current.battle.etherAnimationPts).toBe(50);
    });

    it('setNetEtherDelta로 순 에테르 변화가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setNetEtherDelta(15);
      });

      expect(result.current.battle.netEtherDelta).toBe(15);
    });
  });

  describe('적 유닛 관리', () => {
    it('setEnemyIndex로 적 인덱스가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setEnemyIndex(2);
      });

      expect(result.current.battle.enemyIndex).toBe(2);
    });

    it('setSelectedTargetUnit으로 선택된 타겟 유닛이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setSelectedTargetUnit(1);
      });

      expect(result.current.battle.selectedTargetUnit).toBe(1);
    });

    it('setEnemyUnits로 적 유닛 배열이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());
      const units = createBattleStateEnemyUnits([
        { unitId: 0, hp: 50, maxHp: 50 },
        { unitId: 1, hp: 40, maxHp: 40, block: 5 }
      ]);

      act(() => {
        result.current.actions.setEnemyUnits(units);
      });

      expect(result.current.battle.enemy.units).toHaveLength(2);
    });
  });

  describe('자동진행 & 스냅샷', () => {
    it('setAutoProgress로 자동진행 상태가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setAutoProgress(true);
      });

      expect(result.current.battle.autoProgress).toBe(true);
    });

    it('setRewindUsed로 되감기 사용 상태가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setRewindUsed(true);
      });

      expect(result.current.battle.rewindUsed).toBe(true);
    });

    it('setTimelineProgress로 타임라인 진행도가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setTimelineProgress(0.75);
      });

      expect(result.current.battle.timelineProgress).toBe(0.75);
    });
  });

  describe('추가 애니메이션 상태', () => {
    it('setPlayerBlockAnim으로 플레이어 블록 애니메이션이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setPlayerBlockAnim(true);
      });

      expect(result.current.battle.playerBlockAnim).toBe(true);
    });

    it('setEnemyBlockAnim으로 적 블록 애니메이션이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setEnemyBlockAnim(true);
      });

      expect(result.current.battle.enemyBlockAnim).toBe(true);
    });

    it('setWillOverdrive로 오버드라이브 예정 상태가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setWillOverdrive(true);
      });

      expect(result.current.battle.willOverdrive).toBe(true);
    });

    it('setEtherPulse로 에테르 펄스가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setEtherPulse(true);
      });

      expect(result.current.battle.etherPulse).toBe(true);
    });

    it('setSoulShatter로 소울 셰터가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setSoulShatter(true);
      });

      expect(result.current.battle.soulShatter).toBe(true);
    });
  });

  describe('통찰 시스템', () => {
    it('setInsightAnimLevel로 통찰 애니메이션 레벨이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setInsightAnimLevel(2);
      });

      expect(result.current.battle.insightAnimLevel).toBe(2);
    });

    it('setShowInsightTooltip으로 통찰 툴팁 표시가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setShowInsightTooltip(true);
      });

      expect(result.current.battle.showInsightTooltip).toBe(true);
    });
  });

  describe('상징 관리', () => {
    it('setRelicActivated로 활성화된 상징이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setRelicActivated('golden_compass');
      });

      expect(result.current.battle.relicActivated).toBe('golden_compass');
    });

    it('setMultiplierPulse로 배율 펄스가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setMultiplierPulse(true);
      });

      expect(result.current.battle.multiplierPulse).toBe(true);
    });

    it('setHoveredRelic으로 호버된 상징이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setHoveredRelic('etherCrystal');
      });

      expect(result.current.battle.hoveredRelic).toBe('etherCrystal');
    });
  });

  describe('카드 상태 관리', () => {
    it('addVanishedCard로 소멸된 카드가 추가되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.addVanishedCard('strike');
      });

      expect(result.current.battle.vanishedCards).toContainEqual(expect.objectContaining({ id: 'strike' }));
    });

    it('setUsedCardIndices로 사용된 카드 인덱스가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setUsedCardIndices([0, 2, 4]);
      });

      // Set 또는 배열 형태로 반환될 수 있음
      const indices = result.current.battle.usedCardIndices;
      if (indices instanceof Set) {
        expect(indices.has(0)).toBe(true);
        expect(indices.has(2)).toBe(true);
        expect(indices.has(4)).toBe(true);
      } else {
        expect(Array.from(indices)).toContain(0);
        expect(Array.from(indices)).toContain(2);
        expect(Array.from(indices)).toContain(4);
      }
    });

    it('setDisappearingCards로 사라지는 카드가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setDisappearingCards([1, 3]);
      });

      const cards = result.current.battle.disappearingCards;
      if (cards instanceof Set) {
        expect(cards.has(1)).toBe(true);
        expect(cards.has(3)).toBe(true);
      } else {
        expect(Array.from(cards)).toContain(1);
        expect(Array.from(cards)).toContain(3);
      }
    });

    it('setHiddenCards로 숨겨진 카드가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setHiddenCards([2, 5]);
      });

      const cards = result.current.battle.hiddenCards;
      if (cards instanceof Set) {
        expect(cards.has(2)).toBe(true);
        expect(cards.has(5)).toBe(true);
      } else {
        expect(Array.from(cards)).toContain(2);
        expect(Array.from(cards)).toContain(5);
      }
    });
  });

  describe('카드 툴팁', () => {
    it('setHoveredCard로 호버된 카드가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const card = createBattleStateCard({ id: 'strike', name: '타격' });
      act(() => {
        result.current.actions.setHoveredCard(card);
      });

      expect(result.current.battle.hoveredCard).toEqual(card);
    });

    it('setTooltipVisible로 툴팁 표시가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setTooltipVisible(true);
      });

      expect(result.current.battle.tooltipVisible).toBe(true);
    });

    it('setShowPtsTooltip으로 포인트 툴팁 표시가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setShowPtsTooltip(true);
      });

      expect(result.current.battle.showPtsTooltip).toBe(true);
    });
  });

  describe('전투 실행 상태', () => {
    it('setExecutingCardIndex로 실행 중인 카드 인덱스가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setExecutingCardIndex(3);
      });

      expect(result.current.battle.executingCardIndex).toBe(3);
    });

    it('setResolvedPlayerCards로 해결된 플레이어 카드 수가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setResolvedPlayerCards(5);
      });

      expect(result.current.battle.resolvedPlayerCards).toBe(5);
    });

    it('setPostCombatOptions로 전투 후 옵션이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const options = createPostCombatOptions({ rewards: [], canRest: true });
      act(() => {
        result.current.actions.setPostCombatOptions(options);
      });

      expect(result.current.battle.postCombatOptions).toEqual(options);
    });
  });
});
