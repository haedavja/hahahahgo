/**
 * @file useBattleState.test.js
 * @description useBattleState 훅 테스트
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBattleState } from './useBattleState';

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
      const initialPlayer = { hp: 50, maxHp: 100, block: 10 };
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

      const newPlayer = { hp: 75, maxHp: 100, block: 5, tokens: { usage: [], turn: [], permanent: [] } };
      act(() => {
        result.current.actions.setPlayer(newPlayer);
      });

      expect(result.current.battle.player.hp).toBe(75);
      expect(result.current.battle.player.block).toBe(5);
    });

    it('updatePlayer로 플레이어 일부만 업데이트되어야 함', () => {
      const { result } = renderHook(() => useBattleState({ player: { hp: 100, maxHp: 100, block: 0 } }));

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

      const newEnemy = { hp: 50, maxHp: 100, block: 10, tokens: { usage: [], turn: [], permanent: [] } };
      act(() => {
        result.current.actions.setEnemy(newEnemy);
      });

      expect(result.current.battle.enemy.hp).toBe(50);
      expect(result.current.battle.enemy.block).toBe(10);
    });

    it('updateEnemy로 적 일부만 업데이트되어야 함', () => {
      const { result } = renderHook(() => useBattleState({ enemy: { hp: 100, maxHp: 100, block: 0 } }));

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

      const hand = [
        { id: 'strike', name: '타격', damage: 6 },
        { id: 'defend', name: '수비', block: 5 }
      ];
      act(() => {
        result.current.actions.setHand(hand);
      });

      expect(result.current.battle.hand).toHaveLength(2);
      expect(result.current.battle.hand[0].id).toBe('strike');
    });

    it('setSelected로 선택된 카드가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const selected = [{ id: 'strike', name: '타격', damage: 6 }];
      act(() => {
        result.current.actions.setSelected(selected);
      });

      expect(result.current.battle.selected).toHaveLength(1);
    });

    it('addSelected로 카드가 추가되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.addSelected({ id: 'strike', name: '타격' });
      });

      expect(result.current.battle.selected).toHaveLength(1);

      act(() => {
        result.current.actions.addSelected({ id: 'defend', name: '수비' });
      });

      expect(result.current.battle.selected).toHaveLength(2);
    });

    it('removeSelected로 카드가 제거되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setSelected([
          { id: 'strike', name: '타격' },
          { id: 'defend', name: '수비' }
        ]);
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

      act(() => {
        result.current.actions.setLog(['새 로그']);
      });

      expect(result.current.battle.log).toEqual(['새 로그']);
    });
  });

  describe('큐 관리', () => {
    it('setQueue로 큐가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const queue = [
        { type: 'player', card: { id: 'strike' } },
        { type: 'enemy', card: { id: 'attack' } }
      ];
      act(() => {
        result.current.actions.setQueue(queue);
      });

      expect(result.current.battle.queue).toHaveLength(2);
    });

    it('setQIndex로 큐 인덱스가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setQIndex(5);
      });

      expect(result.current.battle.qIndex).toBe(5);
    });

    it('incrementQIndex로 큐 인덱스가 증가해야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setQIndex(3);
      });

      act(() => {
        result.current.actions.incrementQIndex();
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

      act(() => {
        result.current.actions.setTurnNumber(5);
      });

      expect(result.current.battle.turnNumber).toBe(5);
    });

    it('incrementTurn으로 턴이 증가해야 함', () => {
      const { result } = renderHook(() => useBattleState());

      act(() => {
        result.current.actions.setTurnNumber(1);
      });

      act(() => {
        result.current.actions.incrementTurn();
      });

      expect(result.current.battle.turnNumber).toBe(2);
    });
  });

  describe('덱/무덤 시스템', () => {
    it('setDeck으로 덱이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const deck = [{ id: 'card1' }, { id: 'card2' }];
      act(() => {
        result.current.actions.setDeck(deck);
      });

      expect(result.current.battle.deck).toHaveLength(2);
    });

    it('setDiscardPile로 무덤이 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const discardPile = [{ id: 'card1' }];
      act(() => {
        result.current.actions.setDiscardPile(discardPile);
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

      act(() => {
        result.current.actions.setDistributionMode('multi');
      });

      expect(result.current.battle.distributionMode).toBe('multi');
    });

    it('setDamageDistribution으로 피해 분배가 설정되어야 함', () => {
      const { result } = renderHook(() => useBattleState());

      const distribution = { unit1: 10, unit2: 15 };
      act(() => {
        result.current.actions.setDamageDistribution(distribution);
      });

      expect(result.current.battle.damageDistribution).toEqual(distribution);
    });
  });
});
