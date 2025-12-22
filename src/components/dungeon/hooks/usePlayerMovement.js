/**
 * usePlayerMovement.js
 *
 * 플레이어 이동, 카메라, 키 입력 관련 훅
 * DungeonExploration.jsx에서 분리됨
 */

import { useEffect, useRef, useCallback } from 'react';
import { CONFIG } from '../utils/dungeonConfig';
import { playDoorSound, playSecretSound } from '../../../lib/soundUtils';
import { updateStats } from '../../../state/metaProgress';

/**
 * 플레이어 이동 및 카메라 관련 훅
 */
export function usePlayerMovement({
  segment,
  grid,
  keys,
  playerX,
  playerInsight,
  actions,
  showCharacter,
  setCurrentRoomKey,
  updateMazeRoom,
  interactionRef,
}) {
  const animationRef = useRef(null);
  const playerXRef = useRef(playerX);

  // playerX ref 동기화
  useEffect(() => {
    playerXRef.current = playerX;
  }, [playerX]);

  // 키 입력 핸들링
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["a", "d", "A", "D"].includes(e.key)) {
        e.preventDefault();
        actions.updateKeys({ [e.key.toLowerCase()]: true });
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        interactionRef.current?.();
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        actions.setShowCharacter(!showCharacter);
      }
    };

    const handleKeyUp = (e) => {
      if (["a", "d", "A", "D"].includes(e.key)) {
        actions.updateKeys({ [e.key.toLowerCase()]: false });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [actions, showCharacter, interactionRef]);

  // 플레이어 이동 루프
  useEffect(() => {
    if (!segment) return;

    const hasWestDoor = segment.exits?.west != null;
    const hasEastDoor = segment.exits?.east != null;
    const minX = hasWestDoor ? 50 : 150;
    const maxX = hasEastDoor ? segment.width - 50 : segment.width - 150;

    const moveLoop = () => {
      let newX = playerXRef.current;
      if (keys.a) {
        newX = Math.max(minX, newX - CONFIG.PLAYER.speed);
      }
      if (keys.d) {
        newX = Math.min(maxX, newX + CONFIG.PLAYER.speed);
      }
      if (newX !== playerXRef.current) {
        playerXRef.current = newX;
        actions.setPlayerX(newX);
      }
      animationRef.current = requestAnimationFrame(moveLoop);
    };

    animationRef.current = requestAnimationFrame(moveLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [keys, segment, actions]);

  // 카메라 업데이트
  useEffect(() => {
    if (!segment) return;
    const target = playerX - CONFIG.VIEWPORT.width / 2;
    const maxCamera = segment.width - CONFIG.VIEWPORT.width;
    actions.setCameraX(Math.max(0, Math.min(maxCamera, target)));
  }, [playerX, segment, actions]);

  // 미로 이동 함수
  const moveToRoom = useCallback((direction) => {
    if (!segment || !segment.exits) return false;

    const exit = segment.exits[direction];
    if (!exit) {
      actions.setMessage("그 방향에는 문이 없습니다.");
      return false;
    }

    const targetRoom = grid[exit.targetKey];
    if (!targetRoom) return false;

    // 숨겨진 문 체크
    if (exit.type === 'hidden' && !targetRoom.discovered) {
      const requiredInsight = 3;
      if (playerInsight >= requiredInsight) {
        playSecretSound();
        updateMazeRoom(exit.targetKey, { discovered: true });
        actions.setMessage(`비밀 통로를 발견했습니다! (통찰 ${playerInsight})`);
        return false;
      } else {
        actions.setMessage(`벽에 균열이 보입니다... (통찰 ${requiredInsight} 필요)`);
        return false;
      }
    }

    playDoorSound();

    setCurrentRoomKey(exit.targetKey);
    updateMazeRoom(exit.targetKey, { visited: true });
    actions.setPlayerX(600);

    if (targetRoom.roomType === 'exit') {
      actions.setMessage("출구에 도착했습니다! W키로 던전을 완료하세요.");
    } else if (targetRoom.roomType === 'hidden') {
      playSecretSound();
      actions.setMessage("비밀의 방에 들어왔습니다!");
      updateStats({ secretRoomsFound: 1 });
    } else if (targetRoom.isDeadEnd) {
      actions.setMessage("막다른 방입니다.");
    } else {
      actions.setMessage("");
    }

    return true;
  }, [segment, grid, playerInsight, actions, setCurrentRoomKey, updateMazeRoom]);

  return {
    moveToRoom,
    animationRef,
    playerXRef,
  };
}
