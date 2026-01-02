// @ts-nocheck - Test file with type issues
/**
 * @file gameStore.test.ts
 * @description 메인 게임 상태 저장소 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore, selectors } from './gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 리셋
    useGameStore.getState().resetRun();
  });

  describe('스토어 초기화', () => {
    it('스토어가 정상적으로 생성된다', () => {
      const state = useGameStore.getState();
      expect(state).toBeDefined();
    });

    it('초기 플레이어 HP가 설정된다', () => {
      const state = useGameStore.getState();
      expect(state.playerHp).toBeGreaterThan(0);
    });

    it('초기 자원이 설정된다', () => {
      const state = useGameStore.getState();
      expect(state.resources).toBeDefined();
      expect(state.resources.gold).toBeDefined();
    });

    it('맵이 초기화된다', () => {
      const state = useGameStore.getState();
      expect(state.map).toBeDefined();
    });
  });

  describe('resetRun', () => {
    it('런을 리셋하면 초기 상태로 돌아간다', () => {
      const state = useGameStore.getState();

      // 상태 변경 (자원 추가)
      state.addResources({ gold: 500 });
      expect(useGameStore.getState().resources.gold).toBeGreaterThan(100);

      // 리셋
      state.resetRun();

      // 초기 상태로 복원
      const resetState = useGameStore.getState();
      expect(resetState.resources.gold).toBeLessThanOrEqual(150);
    });

    it('리셋 후 자원이 초기화된다', () => {
      const state = useGameStore.getState();

      // 자원 변경
      if (state.updateResources) {
        state.updateResources({ gold: 1000 });
      }

      // 리셋
      state.resetRun();

      // 초기 골드로 복원
      const resetState = useGameStore.getState();
      expect(resetState.resources.gold).toBeLessThanOrEqual(150);
    });

    it('리셋 후 맵이 초기화된다', () => {
      const state = useGameStore.getState();

      // 리셋
      state.resetRun();

      // 맵 초기화 확인
      const resetState = useGameStore.getState();
      expect(resetState.map).toBeDefined();
    });
  });

  describe('selectors', () => {
    it('nodes 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const nodes = selectors.nodes(state);
      expect(Array.isArray(nodes)).toBe(true);
    });

    it('resources 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const resources = selectors.resources(state);
      expect(resources).toBeDefined();
      expect(resources.gold).toBeDefined();
    });

    it('mapRisk 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const mapRisk = selectors.mapRisk(state);
      expect(typeof mapRisk).toBe('number');
    });

    it('map 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const map = selectors.map(state);
      expect(map).toBeDefined();
    });

    it('activeEvent 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const activeEvent = selectors.activeEvent(state);
      // 초기에는 null
      expect(activeEvent).toBeNull();
    });

    it('activeDungeon 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const activeDungeon = selectors.activeDungeon(state);
      // 초기에는 null
      expect(activeDungeon).toBeNull();
    });

    it('activeBattle 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const activeBattle = selectors.activeBattle(state);
      // 초기에는 null
      expect(activeBattle).toBeNull();
    });

    it('lastBattleResult 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const lastBattleResult = selectors.lastBattleResult(state);
      // 초기에는 null
      expect(lastBattleResult).toBeNull();
    });

    it('characterBuild 셀렉터가 작동한다', () => {
      const state = useGameStore.getState();
      const characterBuild = selectors.characterBuild(state);
      expect(characterBuild).toBeDefined();
    });
  });

  describe('subscribeWithSelector', () => {
    it('상태 변경을 구독할 수 있다', () => {
      let callCount = 0;

      const unsubscribe = useGameStore.subscribe(
        (state) => state.resources.gold,
        () => {
          callCount++;
        }
      );

      // 자원 변경
      useGameStore.getState().addResources({ gold: 10 });

      // 콜백 호출 확인
      expect(callCount).toBeGreaterThan(0);

      unsubscribe();
    });
  });

  describe('개발자 모드 초기값', () => {
    it('devDulledLevel이 null이다', () => {
      const state = useGameStore.getState();
      expect(state.devDulledLevel).toBeNull();
    });

    it('devForcedCrossroad가 null이다', () => {
      const state = useGameStore.getState();
      expect(state.devForcedCrossroad).toBeNull();
    });

    it('devBattleTokens가 빈 배열이다', () => {
      const state = useGameStore.getState();
      expect(state.devBattleTokens).toEqual([]);
    });

    it('devForcedAnomalies가 null이다', () => {
      const state = useGameStore.getState();
      expect(state.devForcedAnomalies).toBeNull();
    });
  });

  describe('슬라이스 액션 통합', () => {
    it('playerActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.updatePlayerStrength).toBe('function');
      expect(typeof state.addResources).toBe('function');
    });

    it('mapActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.selectNode).toBe('function');
      expect(typeof state.setMapRisk).toBe('function');
    });

    it('dungeonActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.confirmDungeon).toBe('function');
    });

    it('battleActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.startBattle).toBe('function');
    });

    it('eventActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.chooseEvent).toBe('function');
      expect(typeof state.closeEvent).toBe('function');
    });

    it('buildActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.updateCharacterBuild).toBe('function');
    });

    it('relicActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.addRelic).toBe('function');
    });

    it('itemActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.useItem).toBe('function');
    });

    it('restActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.closeRest).toBe('function');
    });

    it('shopActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.openShop).toBe('function');
      expect(typeof state.closeShop).toBe('function');
    });

    it('devActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.setDevDulledLevel).toBe('function');
    });

    it('growthActions이 통합된다', () => {
      const state = useGameStore.getState();
      expect(typeof state.updatePyramidLevel).toBe('function');
    });
  });
});
