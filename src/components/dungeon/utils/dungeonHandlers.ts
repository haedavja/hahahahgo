/**
 * @file dungeonHandlers.ts
 * @description 던전 오브젝트 상호작용 핸들러
 */

import type { DungeonObject } from '../../../types/game';
import type { BattleConfig } from '../../../state/slices/types';
import type { Resources } from '../../../types';
import { getRandomEnemy } from '../../battle/battleData';
import {
  playRewardSound,
  playDangerSound,
  playChoiceAppearSound,
} from '../../../lib/soundUtils';

// ========== 타입 정의 ==========

/** 던전 방 (미로용) */
interface MazeRoom {
  x: number;
  y: number;
  roomType?: 'entrance' | 'exit' | 'hidden' | 'normal';
  isDeadEnd?: boolean;
  objects?: DungeonHandlerObject[];
  exits?: Record<string, boolean>;
}

/** 미로 데이터 */
interface MazeData {
  grid: Record<string, MazeRoom>;
  startKey: string;
}

/** 던전 핸들러용 오브젝트 (DungeonObject 확장) */
interface DungeonHandlerObject extends DungeonObject {
  unlocked?: boolean;
  isOrigin?: boolean;
  targetSegment?: number;
}

/** 던전 액션 인터페이스 */
interface DungeonActions {
  setMessage: (message: string | null) => void;
  setCrossroadModal: (modal: { obj: DungeonHandlerObject; template?: object; choiceState?: object } | null) => void;
  setSegmentIndex: (index: number) => void;
  setPlayerX: (x: number) => void;
}

/** 핸들러 컨텍스트 */
interface HandlerContext {
  applyEtherDelta: (delta: number) => void;
  addResources: (resources: Partial<Resources>) => void;
  actions: DungeonActions;
  startBattle: (config: BattleConfig) => void;
  segmentIndex: number;
  currentRoomKey: string;
  preBattleState: React.MutableRefObject<{ roomKey: string; segmentIndex?: number; playerX: number } | null>;
  playerX?: number;
  grid?: Record<string, MazeRoom>;
  dungeonData?: MazeRoom[];
  setDungeonData?: (data: MazeRoom[] | MazeData) => void;
}

// Export types for external use
export type { HandlerContext, DungeonActions as DungeonHandlerActions, MazeRoom };

// ========== 이벤트 핸들러 ==========
export const OBJECT_HANDLERS = {
  chest: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    playRewardSound();
    // 특별 보물 (막다른 방)은 보상이 더 좋음
    if (obj.isSpecial) {
      const gold = 25 + Math.floor(Math.random() * 25); // 25-49
      const material = 1 + Math.floor(Math.random() * 2); // 1-2
      context.addResources({ gold, material });
      context.actions.setMessage(`✨ 특별한 보물 상자! ${gold} 골드와 원자재 ${material}개를 획득했습니다!`);
    } else {
      const gold = 12 + Math.floor(Math.random() * 15); // 12-26
      context.addResources({ gold });
      context.actions.setMessage(`보물 상자에서 ${gold} 골드를 획득했습니다.`);
    }
  },

  curio: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    const isBad = Math.random() < 0.4; // 40% 나쁜 결과

    if (isBad) {
      playDangerSound();
      const damage = 5 + Math.floor(Math.random() * 8); // 5-12 피해
      context.actions.setMessage(`저주받은 상징이었습니다! ${damage} 피해를 입었습니다.`);
      // 피해 처리는 별도 필요시 추가
    } else {
      playRewardSound();
      const material = 2 + Math.floor(Math.random() * 3); // 2-4
      context.addResources({ material });
      context.actions.setMessage(`신비로운 상징에서 원자재 ${material}개를 획득했습니다!`);
    }
  },

  combat: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    playDangerSound();  // 적 조우 사운드

    // 던전 깊이에 따른 적 티어 결정 (1-4)
    const dungeonDepth = context.segmentIndex || 0;
    const tier = Math.min(4, Math.max(1, Math.floor(dungeonDepth / 2) + 1));

    // 티어 기반 랜덤 적 선택
    const enemy = getRandomEnemy(tier);

    // 전투 전 상태 저장 (오브젝트의 정확한 위치 저장)
    context.preBattleState.current = {
      roomKey: context.currentRoomKey, // 미로 시스템용
      segmentIndex: context.segmentIndex,
      playerX: obj.x, // 플레이어의 현재 위치가 아닌 오브젝트 위치로 복귀
    };

    context.startBattle({
      nodeId: `dungeon-${context.currentRoomKey || context.segmentIndex}`,
      kind: "combat",
      label: enemy?.name || "던전 몬스터",
      enemyId: enemy?.id,
      tier,
      rewards: {}, // 던전에서는 수동으로 보상 처리하므로 자동 보상 비활성화
    });
  },

  // 기로 핸들러 - 선택지 모달 열기
  crossroad: (obj: DungeonHandlerObject, context: HandlerContext) => {
    playChoiceAppearSound();  // 선택지 등장 사운드
    // 기로 모달 열기
    context.actions.setCrossroadModal({
      obj,
      template: obj.template,
      choiceState: obj.choiceState,
    });
  },

  // === 자원 획득 오브젝트 ===
  ore: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    playRewardSound();
    const material = 2 + Math.floor(Math.random() * 3); // 2-4
    context.addResources({ material });
    context.actions.setMessage(`광맥에서 원자재 ${material}개를 획득했습니다!`);
  },

  gold_pile: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    playRewardSound();
    const gold = 15 + Math.floor(Math.random() * 20); // 15-34
    context.addResources({ gold });
    context.actions.setMessage(`금화 더미에서 ${gold} 골드를 획득했습니다!`);
  },

  crate: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    playRewardSound();
    const gold = 5 + Math.floor(Math.random() * 10); // 5-14
    const material = Math.random() < 0.5 ? 1 : 0;
    context.addResources({ gold, material });
    const msg = material > 0
      ? `나무 상자에서 ${gold} 골드와 원자재 ${material}개를 획득했습니다!`
      : `나무 상자에서 ${gold} 골드를 획득했습니다.`;
    context.actions.setMessage(msg);
  },

  crystal: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    playRewardSound();
    const material = 3 + Math.floor(Math.random() * 3); // 3-5
    context.addResources({ material });
    context.actions.setMessage(`✨ 수정에서 원자재 ${material}개를 획득했습니다!`);
  },

  mushroom: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    const isBad = Math.random() < 0.3;
    if (isBad) {
      playDangerSound();
      context.actions.setMessage("독버섯이었습니다! 독이 퍼집니다...");
      // 독 효과는 별도 처리 필요시 추가
    } else {
      playRewardSound();
      const material = 1 + Math.floor(Math.random() * 2); // 1-2
      context.addResources({ material });
      context.actions.setMessage(`버섯에서 원자재 ${material}개를 획득했습니다.`);
    }
  },

  corpse: (obj: DungeonHandlerObject, context: HandlerContext) => {
    obj.used = true;
    playRewardSound();
    const gold = 8 + Math.floor(Math.random() * 12); // 8-19
    const material = Math.random() < 0.3 ? 1 : 0;
    context.addResources({ gold, material });
    const msg = material > 0
      ? `시체에서 ${gold} 골드와 원자재 ${material}개를 발견했습니다.`
      : `시체에서 ${gold} 골드를 발견했습니다.`;
    context.actions.setMessage(msg);
  },

  // 숏컷 핸들러 - 문 열기 또는 이동
  shortcut: (obj: DungeonHandlerObject, context: HandlerContext) => {
    const { actions, segmentIndex, dungeonData, setDungeonData } = context;

    if (!dungeonData || !setDungeonData) {
      actions.setMessage("숏컷을 사용할 수 없습니다.");
      return;
    }

    if (!obj.unlocked) {
      if (obj.isOrigin) {
        // 원본 문에서 열기
        actions.setMessage("숏컷을 열었습니다! 이제 양방향으로 이동할 수 있습니다.");

        // 양쪽 숏컷 모두 열기
        const newDungeonData = dungeonData.map((seg: MazeRoom, idx: number) => {
          if (idx === segmentIndex || idx === obj.targetSegment) {
            return {
              ...seg,
              objects: seg.objects?.map((o: DungeonHandlerObject) => {
                if (o.typeId === 'shortcut' && (o.targetSegment === obj.targetSegment || o.targetSegment === segmentIndex)) {
                  return { ...o, unlocked: true };
                }
                return o;
              }),
            };
          }
          return seg;
        });
        setDungeonData(newDungeonData);
      } else {
        // 반대편 문 - 아직 잠김
        actions.setMessage("잠긴 문입니다. 반대편에서 열어야 합니다.");
      }
    } else {
      // 열린 숏컷으로 이동
      const targetSegment = obj.targetSegment ?? 0;
      const targetSeg = dungeonData[targetSegment];
      if (targetSeg) {
        actions.setSegmentIndex(targetSegment);
        // 도착 세그먼트의 숏컷 위치 근처로 이동
        const targetShortcut = targetSeg.objects?.find((o: DungeonHandlerObject) => o.typeId === 'shortcut');
        actions.setPlayerX(targetShortcut ? targetShortcut.x + 50 : 200);
        actions.setMessage(`숏컷을 통해 이동했습니다!`);
      }
    }
  },
};
