/**
 * dungeonHandlers.js
 *
 * 던전 오브젝트 상호작용 핸들러
 */

import { getRandomEnemy } from '../../battle/battleData';
import {
  playRewardSound,
  playDangerSound,
  playChoiceAppearSound,
} from '../../../lib/soundUtils';

// ========== 이벤트 핸들러 ==========
export const OBJECT_HANDLERS = {
  chest: (obj, context) => {
    obj.used = true;
    playRewardSound();  // 보물 획득 사운드
    // 특별 보물 (막다른 방)은 보상이 더 좋음
    if (obj.isSpecial) {
      const ether = -(3 + Math.floor(Math.random() * 4)); // 더 많은 에테르
      context.applyEtherDelta(ether);
      context.actions.setMessage(`✨ 특별한 보물 상자를 열었습니다! 에테르 ${ether}`);
    } else {
      const ether = -(1 + Math.floor(Math.random() * 3));
      context.applyEtherDelta(ether);
      context.actions.setMessage(`보물 상자를 열었습니다. 에테르 ${ether}`);
    }
  },

  curio: (obj, context) => {
    obj.used = true;
    const isBad = Math.random() < 0.5;
    const ether = isBad
      ? (3 + Math.floor(Math.random() * 4))
      : -(2 + Math.floor(Math.random() * 3));

    if (isBad) {
      playDangerSound();  // 불길한 결과 사운드
    } else {
      playRewardSound();  // 유익한 결과 사운드
    }

    context.applyEtherDelta(ether);
    context.actions.setMessage(
      `${isBad ? "불길한" : "유익한"} 기운이 느껴진다. 에테르 ${ether > 0 ? "+" : ""}${ether}`
    );
  },

  combat: (obj, context) => {
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
  crossroad: (obj, context) => {
    playChoiceAppearSound();  // 선택지 등장 사운드
    // 기로 모달 열기
    context.actions.setCrossroadModal({
      obj,
      template: obj.template,
      choiceState: obj.choiceState || {},
    });
  },

  // 숏컷 핸들러 - 문 열기 또는 이동
  shortcut: (obj, context) => {
    const { actions, segmentIndex, dungeonData, setDungeonData } = context;

    if (!obj.unlocked) {
      if (obj.isOrigin) {
        // 원본 문에서 열기
        actions.setMessage("숏컷을 열었습니다! 이제 양방향으로 이동할 수 있습니다.");

        // 양쪽 숏컷 모두 열기
        const newDungeonData = dungeonData.map((seg, idx) => {
          if (idx === segmentIndex || idx === obj.targetSegment) {
            return {
              ...seg,
              objects: seg.objects.map(o => {
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
      const targetSeg = dungeonData[obj.targetSegment];
      if (targetSeg) {
        actions.setSegmentIndex(obj.targetSegment);
        // 도착 세그먼트의 숏컷 위치 근처로 이동
        const targetShortcut = targetSeg.objects.find(o => o.typeId === 'shortcut');
        actions.setPlayerX(targetShortcut ? targetShortcut.x + 50 : 200);
        actions.setMessage(`숏컷을 통해 이동했습니다!`);
      }
    }
  },
};
