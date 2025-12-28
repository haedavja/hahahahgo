/**
 * DungeonExploration.jsx
 *
 * 던전 탐험 메인 컴포넌트
 * 분리된 모듈: renderDungeon, useCrossroadChoice, usePlayerMovement
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useShallow } from 'zustand/react/shallow';
import type { DungeonObject, RenderDungeonSceneParams } from "../../types";
import { useDungeonState } from "./hooks/useDungeonState";

/** 미로 방 타입 */
interface MazeRoom {
  x: number;
  y: number;
  roomType?: 'entrance' | 'exit' | 'hidden' | 'normal';
  isDeadEnd?: boolean;
  objects?: DungeonObject[];
  exits?: Record<string, boolean>;
}

/** 미로 데이터 타입 */
interface MazeData {
  grid: Record<string, MazeRoom>;
  startKey: string;
}
import { useCrossroadChoice } from "./hooks/useCrossroadChoice";
import { usePlayerMovement } from "./hooks/usePlayerMovement";
import { useGameStore } from "../../state/gameStore";
import { CharacterSheet } from "../character/CharacterSheet";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_RARITY_COLORS, type RelicRarity } from "../../lib/relics";
import { playVictorySound } from "../../lib/soundUtils";
import "./dungeon.css";

// 분리된 모듈들
import { CONFIG, OBJECT_TYPES } from "./utils/dungeonConfig";
import type { GameStore } from "../../state/slices/types";
import { generateMaze } from "./utils/mazeGenerator";
import { OBJECT_HANDLERS } from "./utils/dungeonHandlers";
import { renderDungeonScene } from "./utils/renderDungeon";
import { RewardModal, DungeonSummaryModal, CrossroadModal } from "./ui/DungeonModals";

// ========== 메인 컴포넌트 ==========
export function DungeonExploration() {
  // 상태 셀렉터 (그룹화)
  const { activeDungeon, lastBattleResult, relics, resources, playerHp, maxHp, devForcedCrossroad, playerInsight } = useGameStore(
    useShallow((s: GameStore) => ({
      activeDungeon: s.activeDungeon,
      lastBattleResult: s.lastBattleResult,
      relics: s.relics,
      resources: s.resources,
      playerHp: s.playerHp,
      maxHp: s.maxHp,
      devForcedCrossroad: s.devForcedCrossroad,
      playerInsight: s.playerInsight || 0,
    }))
  );

  // 액션 셀렉터 (그룹화)
  const {
    setDungeonData, setDungeonPosition, setDungeonInitialResources, setDungeonDeltas,
    skipDungeon, completeDungeon, startBattle, applyEtherDelta, addResources,
    clearBattleResult, setCurrentRoomKey, updateMazeRoom
  } = useGameStore(
    useShallow((s: GameStore) => ({
      setDungeonData: s.setDungeonData,
      setDungeonPosition: s.setDungeonPosition,
      setDungeonInitialResources: s.setDungeonInitialResources,
      setDungeonDeltas: s.setDungeonDeltas,
      skipDungeon: s.skipDungeon,
      completeDungeon: s.completeDungeon,
      startBattle: s.startBattle,
      applyEtherDelta: s.applyEtherDelta,
      addResources: s.addResources,
      clearBattleResult: s.clearBattleResult,
      setCurrentRoomKey: s.setCurrentRoomKey,
      updateMazeRoom: s.updateMazeRoom,
    }))
  );

  // 던전 데이터 생성 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.dungeonData) {
      const mazeData = generateMaze(devForcedCrossroad);
      setDungeonData(mazeData);
    }
  }, [activeDungeon, setDungeonData, devForcedCrossroad]);

  // 초기 자원 저장 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.initialResources) {
      setDungeonInitialResources({ ...resources });
    }
  }, [activeDungeon, setDungeonInitialResources, resources]);

  // 던전 델타 초기화 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.dungeonDeltas) {
      setDungeonDeltas({ gold: 0, intel: 0, loot: 0, material: 0 });
    }
  }, [activeDungeon, setDungeonDeltas]);

  // 던전 데이터
  const mazeData = activeDungeon?.dungeonData as MazeData | null;
  const grid = mazeData?.grid || {};
  const startKey = mazeData?.startKey || '2,4';
  const currentRoomKey = activeDungeon?.currentRoomKey || startKey;
  const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };
  const initialResources = activeDungeon?.initialResources || resources;

  // Dungeon 상태 (useReducer 기반)
  const { dungeon, actions } = useDungeonState({
    segmentIndex: 0,
    playerX: activeDungeon?.playerX || 600,
  });

  const {
    playerX, cameraX, keys, message, rewardModal,
    showCharacter, dungeonSummary, hoveredRelic,
    crossroadModal, screenShake
  } = dungeon;

  // 현재 방
  const segment: MazeRoom | undefined = grid[currentRoomKey];
  const playerY = CONFIG.FLOOR_Y - CONFIG.PLAYER.height;

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const preBattleState = useRef<{ roomKey: string; playerX: number } | null>(null);
  const interactionRef = useRef<(() => void) | null>(null);

  // 위치 정보 저장
  useEffect(() => {
    setDungeonPosition(0, playerX);
  }, [playerX, setDungeonPosition]);

  // 플레이어 이동 훅
  const { moveToRoom } = usePlayerMovement({
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
  });

  // 기로 선택지 훅
  const { executeChoice, closeCrossroadModal } = useCrossroadChoice({
    crossroadModal,
    dungeonDeltas,
    setDungeonDeltas,
    currentRoomKey,
    startBattle,
    segment,
    actions,
  });

  // 전투 결과 처리
  useEffect(() => {
    if (!lastBattleResult || !lastBattleResult.nodeId.startsWith("dungeon-")) return;

    if (lastBattleResult.result === "victory") {
      const gold = 5 + Math.floor(Math.random() * 6);
      const loot = Math.random() < 0.5 ? 1 : 0;
      actions.setRewardModal({ gold, loot, victory: true });
    } else {
      actions.setRewardModal({ gold: 0, loot: 0, victory: false });
    }

    clearBattleResult();
  }, [lastBattleResult, clearBattleResult, actions]);

  // Canvas 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segment) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderDungeonScene({
      ctx,
      segment,
      grid,
      currentRoomKey,
      mazeData,
      playerX,
      playerY,
      cameraX,
      resources,
      playerHp,
      maxHp,
    } as unknown as RenderDungeonSceneParams);
  }, [segment, playerX, cameraX, playerHp, maxHp, playerY, resources, grid, currentRoomKey, mazeData]);

  // 던전 완료
  const handleCompleteDungeon = useCallback(() => {
    playVictorySound();
    actions.setDungeonSummary({
      gold: dungeonDeltas.gold,
      intel: dungeonDeltas.intel,
      loot: dungeonDeltas.loot,
      material: dungeonDeltas.material,
      isComplete: true,
    });
  }, [dungeonDeltas, actions]);

  // 상호작용
  const handleInteraction = useCallback(() => {
    if (!segment) return;

    const vw = CONFIG.VIEWPORT.width;
    const doorZones = {
      north: { minX: vw / 2 + 200 - 80, maxX: vw / 2 + 200 + 80 },
      south: { minX: vw / 2 - 200 - 80, maxX: vw / 2 - 200 + 80 },
      west: { minX: 0, maxX: 120 },
      east: { minX: vw - 120, maxX: vw },
    };

    // 문 상호작용
    for (const [dir, zone] of Object.entries(doorZones)) {
      if (playerX >= zone.minX && playerX <= zone.maxX && segment.exits?.[dir]) {
        if (segment.roomType === 'exit') {
          handleCompleteDungeon();
          return;
        }
        if (moveToRoom(dir)) return;
      }
    }

    // 오브젝트 상호작용
    for (const obj of segment.objects || []) {
      if (Math.abs(playerX - obj.x) < 80) {
        const typeKey = obj.typeId.toUpperCase() as keyof typeof OBJECT_TYPES;
        const objType = OBJECT_TYPES[typeKey];
        if (obj.used && !objType?.canReuse) continue;

        const handlerKey = obj.typeId as keyof typeof OBJECT_HANDLERS;
        const handler = OBJECT_HANDLERS[handlerKey];
        if (handler) {
          handler(obj, {
            applyEtherDelta,
            addResources,
            actions,
            startBattle,
            segmentIndex: 0,
            preBattleState,
            playerX,
            currentRoomKey,
            grid,
            setDungeonData,
          });
        }
        return;
      }
    }

    // 출구 방에서 완료
    if (segment.roomType === 'exit') {
      handleCompleteDungeon();
      return;
    }

    // 가이드 메시지
    const dirLabels: Record<string, string> = { north: '북', south: '남', east: '동', west: '서' };
    const availableDirs = Object.entries(segment.exits || {})
      .filter(([, exit]) => exit)
      .map(([dir]) => dirLabels[dir]);

    if (availableDirs.length > 0) {
      actions.setMessage(`이동 가능: ${availableDirs.join(', ')} (해당 방향의 문 앞에서 W)`);
    }
  }, [segment, playerX, actions, applyEtherDelta, startBattle, setDungeonData, currentRoomKey, grid, moveToRoom, handleCompleteDungeon]);

  // handleInteraction ref 업데이트
  useEffect(() => {
    interactionRef.current = handleInteraction;
  }, [handleInteraction]);

  // 보상 모달 닫기
  const closeRewardModal = () => {
    if (rewardModal.gold > 0 || rewardModal.loot > 0) {
      setDungeonDeltas({
        ...dungeonDeltas,
        gold: dungeonDeltas.gold + rewardModal.gold,
        loot: dungeonDeltas.loot + rewardModal.loot,
      });
    }

    if (preBattleState.current) {
      if (preBattleState.current.roomKey) {
        setCurrentRoomKey(preBattleState.current.roomKey);
      }
      actions.setPlayerX(preBattleState.current.playerX);
      preBattleState.current = null;
    }

    actions.setRewardModal(null);
  };

  // 던전 탈출
  const handleSkipDungeon = () => {
    actions.setDungeonSummary({
      gold: dungeonDeltas.gold,
      intel: dungeonDeltas.intel,
      loot: dungeonDeltas.loot,
      material: dungeonDeltas.material,
      isComplete: false,
    });
  };

  // 던전 요약 닫기
  const closeDungeonSummary = () => {
    const isComplete = dungeonSummary?.isComplete;
    addResources(dungeonDeltas);
    actions.setDungeonSummary(null);
    if (isComplete) {
      completeDungeon();
    } else {
      skipDungeon();
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
    }}>
      <canvas
        ref={canvasRef}
        width={CONFIG.VIEWPORT.width}
        height={CONFIG.VIEWPORT.height}
        style={{ border: "2px solid #444", borderRadius: "8px" }}
      />

      {/* 상징 표시 */}
      {relics && relics.length > 0 && (
        <div style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
        }}>
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid rgba(148, 163, 184, 0.5)',
            borderRadius: '12px',
            boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
          }}>
            {relics.map((relicId: string, index: number) => {
              const relic = RELICS[relicId as keyof typeof RELICS];
              if (!relic) return null;

              const isHovered = hoveredRelic === relicId;
              const rarityTextMap: Record<string, string> = {
                [RELIC_RARITIES.COMMON as string]: '일반',
                [RELIC_RARITIES.RARE as string]: '희귀',
                [RELIC_RARITIES.SPECIAL as string]: '특별',
                [RELIC_RARITIES.LEGENDARY as string]: '전설'
              };
              const rarityText = rarityTextMap[relic.rarity as string] || '알 수 없음';

              return (
                <div key={index} style={{ position: 'relative' }}>
                  <div
                    onMouseEnter={() => actions.setHoveredRelic(relicId)}
                    onMouseLeave={() => actions.setHoveredRelic(null)}
                    style={{
                      fontSize: '2rem',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                    }}>
                    <span>{relic.emoji}</span>
                  </div>

                  {isHovered && (() => {
                    const rarityColor = RELIC_RARITY_COLORS[relic.rarity as RelicRarity] || '#94a3b8';
                    return (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '8px',
                        background: 'rgba(15, 23, 42, 0.98)',
                        border: `2px solid ${rarityColor}`,
                        borderRadius: '8px',
                        padding: '12px 16px',
                        minWidth: '220px',
                        boxShadow: `0 4px 20px ${rarityColor}66`,
                        zIndex: 1000,
                        pointerEvents: 'none'
                      }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: rarityColor, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.3rem' }}>{relic.emoji}</span>
                          {relic.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: rarityColor, opacity: 0.8, marginBottom: '8px' }}>
                          {rarityText}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                          {relic.description}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 자원 표시 */}
      <div style={{
        position: "absolute",
        top: "200px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "16px",
        background: "rgba(0,0,0,0.8)",
        padding: "10px 20px",
        borderRadius: "999px",
        border: "1px solid rgba(84, 126, 194, 0.5)",
      }}>
        <div style={{ color: "#ffd700", fontSize: "14px", fontWeight: "600" }}>
          금: {initialResources.gold}{(dungeonDeltas.gold ?? 0) !== 0 && (
            <span style={{ color: (dungeonDeltas.gold ?? 0) > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({(dungeonDeltas.gold ?? 0) > 0 ? "+" : ""}{dungeonDeltas.gold ?? 0})
            </span>
          )}
        </div>
        <div style={{ color: "#9da9d6", fontSize: "14px", fontWeight: "600" }}>
          정보: {initialResources.intel}{(dungeonDeltas.intel ?? 0) !== 0 && (
            <span style={{ color: (dungeonDeltas.intel ?? 0) > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({(dungeonDeltas.intel ?? 0) > 0 ? "+" : ""}{dungeonDeltas.intel ?? 0})
            </span>
          )}
        </div>
        <div style={{ color: "#ff6b6b", fontSize: "14px", fontWeight: "600" }}>
          전리품: {initialResources.loot}{(dungeonDeltas.loot ?? 0) !== 0 && (
            <span style={{ color: (dungeonDeltas.loot ?? 0) > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({(dungeonDeltas.loot ?? 0) > 0 ? "+" : ""}{dungeonDeltas.loot ?? 0})
            </span>
          )}
        </div>
        <div style={{ color: "#a0e9ff", fontSize: "14px", fontWeight: "600" }}>
          원자재: {initialResources.material}{(dungeonDeltas.material ?? 0) !== 0 && (
            <span style={{ color: (dungeonDeltas.material ?? 0) > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({(dungeonDeltas.material ?? 0) > 0 ? "+" : ""}{dungeonDeltas.material ?? 0})
            </span>
          )}
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#fff",
          fontSize: "18px",
          fontWeight: "600",
          background: "rgba(0,0,0,0.85)",
          padding: "20px 40px",
          borderRadius: "12px",
          border: "2px solid rgba(84, 126, 194, 0.6)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          textAlign: "center",
          maxWidth: "600px",
          zIndex: 150,
        }}>
          {message}
        </div>
      )}

      {/* UI 정보 */}
      <div style={{
        position: "absolute",
        top: "260px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        fontSize: "16px",
        background: "rgba(0,0,0,0.7)",
        padding: "12px",
        borderRadius: "8px",
        textAlign: "center",
      }}>
        <div>
          {segment?.roomType === 'entrance' ? '🏠 입구' :
           segment?.roomType === 'exit' ? '🚪 출구' :
           segment?.roomType === 'hidden' ? '✨ 비밀의 방' :
           segment?.isDeadEnd ? '⚠️ 막다른 방' : '📍 미로'}
        </div>
        <div style={{ fontSize: "12px", marginTop: "4px", color: "#94a3b8" }}>
          좌표: ({segment?.x}, {segment?.y})
        </div>
        <div style={{ fontSize: "12px", marginTop: "4px" }}>
          W: 상호작용/이동 | A/D: 좌우 | C: 캐릭터
        </div>
      </div>

      {/* 탈출 버튼 */}
      <button
        onClick={handleSkipDungeon}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          padding: "10px 20px",
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        던전 탈출
      </button>

      {/* 모달들 */}
      <RewardModal rewardModal={rewardModal} onClose={closeRewardModal} />
      <DungeonSummaryModal dungeonSummary={dungeonSummary} onClose={closeDungeonSummary} />
      <CrossroadModal
        crossroadModal={crossroadModal}
        screenShake={screenShake}
        onSelectChoice={executeChoice}
        onClose={closeCrossroadModal}
      />

      {/* 캐릭터 창 */}
      {showCharacter && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => actions.setShowCharacter(false)}
        >
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <CharacterSheet onClose={() => actions.setShowCharacter(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
