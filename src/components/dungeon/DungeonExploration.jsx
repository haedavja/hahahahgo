import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import "./dungeon.css";

// ========== 설정 ==========
const CONFIG = {
  SEGMENT_COUNT: { min: 5, max: 9 },
  VIEWPORT: { width: 1600, height: 600 },
  PLAYER: { width: 40, height: 64, speed: 5 },
  FLOOR_Y: 500,
  ROOM_WIDTH: 1200,
  CORRIDOR_WIDTH: 3000,
  MIN_COMBAT_COUNT: 2,
};

// ========== 오브젝트 타입 정의 ==========
const OBJECT_TYPES = {
  CHEST: {
    id: "chest",
    label: "보물 상자",
    canReuse: false,
    probRoom: 0.35,
    probCorridor: 0.30,
    render: (ctx, x, y, used) => {
      ctx.fillStyle = used ? "#555" : "#f39c12";
      ctx.fillRect(x - 25, y - 25, 50, 40);
    },
  },
  CURIO: {
    id: "curio",
    label: "수상한 유물",
    canReuse: false,
    probRoom: 0.35,
    probCorridor: 0.25,
    render: (ctx, x, y, used) => {
      ctx.fillStyle = used ? "#666" : "#9b59b6";
      ctx.beginPath();
      ctx.arc(x, y - 25, 20, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  COMBAT: {
    id: "combat",
    label: "전투",
    canReuse: false,
    probRoom: 0.30,
    probCorridor: 0.45,
    render: (ctx, x, y, used) => {
      ctx.fillStyle = used ? "#888" : "#e74c3c";
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.fillText("!", x, y - 40);
    },
  },
  // 확장 포인트: 새로운 타입 추가 예시
  // EVENT: {
  //   id: "event", label: "?", canReuse: true, probRoom: 0.0, probCorridor: 0.0,
  //   render: (ctx, x, y, used) => { ... }
  // },
};

// ========== 던전 생성 ==========
function generateDungeon() {
  const count = CONFIG.SEGMENT_COUNT.min +
    Math.floor(Math.random() * (CONFIG.SEGMENT_COUNT.max - CONFIG.SEGMENT_COUNT.min + 1));

  const segments = [];

  for (let i = 0; i < count; i++) {
    const isRoom = i % 2 === 1;
    const width = isRoom ? CONFIG.ROOM_WIDTH : CONFIG.CORRIDOR_WIDTH;

    // 오브젝트 생성
    const objects = createObjects(isRoom, i);

    segments.push({
      id: `seg_${i}`,
      index: i,
      isRoom,
      width,
      objects,
      exitX: isRoom ? 1100 : 2900,
      isLast: i === count - 1,
    });
  }

  // 최소 전투 보장
  ensureMinimumCombats(segments);

  return segments;
}

function createObjects(isRoom, segmentIndex) {
  const objects = [];
  const count = 2 + Math.floor(Math.random() * 2); // 2-3개
  const MIN_DISTANCE = 150; // 오브젝트 간 최소 거리

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let xPos;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    // 겹치지 않는 위치 찾기
    do {
      xPos = isRoom
        ? 300 + Math.random() * 600
        : 500 + Math.random() * 2000;

      attempts++;
      if (attempts >= MAX_ATTEMPTS) break; // 무한 루프 방지

      // 기존 오브젝트와의 거리 체크
      const tooClose = objects.some(obj => Math.abs(obj.x - xPos) < MIN_DISTANCE);
      if (!tooClose) break;
    } while (true);

    // 확률 기반 타입 선택
    let type = null;
    let cumProb = 0;

    for (const typeKey of Object.keys(OBJECT_TYPES)) {
      const objType = OBJECT_TYPES[typeKey];
      const prob = isRoom ? objType.probRoom : objType.probCorridor;
      cumProb += prob;

      if (rand < cumProb) {
        type = objType;
        break;
      }
    }

    if (!type) type = OBJECT_TYPES.CHEST; // fallback

    objects.push({
      id: `obj_${segmentIndex}_${i}`,
      typeId: type.id,
      x: xPos,
      used: false,
    });
  }

  return objects;
}

function ensureMinimumCombats(segments) {
  const combatCount = segments.reduce((sum, seg) =>
    sum + seg.objects.filter(o => o.typeId === "combat").length, 0
  );

  let needed = CONFIG.MIN_COMBAT_COUNT - combatCount;

  while (needed > 0) {
    const randomSeg = segments[Math.floor(Math.random() * segments.length)];
    const nonCombat = randomSeg.objects.filter(o => o.typeId !== "combat");

    if (nonCombat.length > 0) {
      nonCombat[0].typeId = "combat";
      needed--;
    } else {
      break;
    }
  }
}

// ========== 이벤트 핸들러 ==========
const OBJECT_HANDLERS = {
  chest: (obj, context) => {
    obj.used = true;
    const ether = -(1 + Math.floor(Math.random() * 3));
    context.applyEtherDelta(ether);
    context.setMessage(`보물 상자를 열었습니다. 에테르 ${ether}`);
  },

  curio: (obj, context) => {
    obj.used = true;
    const isBad = Math.random() < 0.5;
    const ether = isBad
      ? (3 + Math.floor(Math.random() * 4))
      : -(2 + Math.floor(Math.random() * 3));

    context.applyEtherDelta(ether);
    context.setMessage(
      `${isBad ? "불길한" : "유익한"} 기운이 느껴진다. 에테르 ${ether > 0 ? "+" : ""}${ether}`
    );
  },

  combat: (obj, context) => {
    obj.used = true;
    const enemyHp = 25 + Math.floor(Math.random() * 10);

    // 전투 전 상태 저장 (오브젝트의 정확한 위치 저장)
    context.preBattleState.current = {
      segmentIndex: context.segmentIndex,
      playerX: obj.x, // 플레이어의 현재 위치가 아닌 오브젝트 위치로 복귀
    };

    context.startBattle({
      nodeId: `dungeon-${context.segmentIndex}`,
      kind: "combat",
      label: "던전 몬스터",
      enemyHp,
      rewards: {}, // 던전에서는 수동으로 보상 처리하므로 자동 보상 비활성화
    });
  },

  // 확장 포인트: 새로운 핸들러 추가
  // event: (obj, context) => { ... },
};

// ========== 에테르 바 컴포넌트 ==========
function EtherBar({ pts, maxPts, color = "cyan", label }) {
  const safePts = Number.isFinite(pts) ? pts : 0;

  // maxPts가 제공되면 단순 비율 사용 (HP 바용)
  let slots, current, nextCost, ratio;
  if (maxPts !== undefined) {
    ratio = Math.max(0, Math.min(1, safePts / maxPts));
    current = safePts;
    nextCost = maxPts;
    slots = null;
  } else {
    // 에테르 바 로직
    slots = calculateEtherSlots(safePts);
    current = getCurrentSlotPts(safePts);
    nextCost = getNextSlotCost(safePts);
    const progress = getSlotProgress(safePts);
    ratio = Math.max(0, Math.min(1, progress));
  }

  const borderColor = color === "red" ? "#ef4444" : "#53d7ff";
  const fillGradient = color === "red"
    ? "linear-gradient(180deg, #fca5a5 0%, #dc2626 100%)"
    : "linear-gradient(180deg, #6affff 0%, #0f7ebd 100%)";
  const textColor = color === "red" ? "#fca5a5" : "#8fd3ff";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "72px",
      padding: "12px 10px 16px",
      borderRadius: "16px",
      border: `2px solid ${borderColor}`,
      background: "rgba(7, 10, 20, 0.95)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      {label && (
        <div style={{
          fontSize: "11px",
          color: textColor,
          marginBottom: "8px",
          fontWeight: "600",
        }}>
          {label}
        </div>
      )}
      <div style={{
        position: "relative",
        width: "52px",
        height: "160px",
        borderRadius: "26px",
        border: `2px solid ${borderColor}`,
        background: "rgba(0, 0, 0, 0.6)",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          left: "3px",
          right: "3px",
          bottom: "3px",
          height: `${ratio * 100}%`,
          borderRadius: "24px",
          background: fillGradient,
        }} />
      </div>
      <div style={{ textAlign: "center", color: textColor, fontSize: "13px", marginTop: "8px" }}>
        <div>{current}/{nextCost}</div>
        {slots !== null && <div>x{slots}</div>}
      </div>
    </div>
  );
}

// ========== 메인 컴포넌트 ==========
export function DungeonExploration() {
  // Store hooks
  const activeDungeon = useGameStore((s) => s.activeDungeon);
  const setDungeonData = useGameStore((s) => s.setDungeonData);
  const setDungeonPosition = useGameStore((s) => s.setDungeonPosition);
  const setDungeonInitialResources = useGameStore((s) => s.setDungeonInitialResources);
  const setDungeonDeltas = useGameStore((s) => s.setDungeonDeltas);
  const skipDungeon = useGameStore((s) => s.skipDungeon);
  const completeDungeon = useGameStore((s) => s.completeDungeon);
  const startBattle = useGameStore((s) => s.startBattle);
  const applyEtherDelta = useGameStore((s) => s.applyEtherDelta);
  const addResources = useGameStore((s) => s.addResources);
  const lastBattleResult = useGameStore ((s) => s.lastBattleResult);
  const clearBattleResult = useGameStore((s) => s.clearBattleResult);
  const resources = useGameStore((s) => s.resources);
  const playerHp = useGameStore((s) => s.playerHp);
  const maxHp = useGameStore((s) => s.maxHp);

  // 던전 데이터 생성 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.dungeonData) {
      const newDungeon = generateDungeon();
      setDungeonData(newDungeon);
    }
  }, [activeDungeon, setDungeonData]);

  // 초기 자원 저장 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.initialResources) {
      setDungeonInitialResources({ ...resources });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDungeon, setDungeonInitialResources]);

  // 던전 델타 초기화 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.dungeonDeltas) {
      setDungeonDeltas({ gold: 0, intel: 0, loot: 0, material: 0 });
    }
  }, [activeDungeon, setDungeonDeltas]);

  // 던전 데이터는 activeDungeon에서 가져옴
  const dungeon = activeDungeon?.dungeonData || [];
  // activeDungeon에서 위치 정보 가져오기 (재마운트 시에도 유지)
  const [segmentIndex, setSegmentIndex] = useState(activeDungeon?.segmentIndex || 0);
  const [playerX, setPlayerX] = useState(activeDungeon?.playerX || 100);
  const [cameraX, setCameraX] = useState(0);
  const [keys, setKeys] = useState({});
  const [message, setMessage] = useState("");
  const [rewardModal, setRewardModal] = useState(null);
  const [showCharacter, setShowCharacter] = useState(false);
  const [dungeonSummary, setDungeonSummary] = useState(null); // 던전 탈출 요약

  // 던전 중 획득한 자원 델타 (x값) - activeDungeon에서 가져옴 (재마운트 시에도 유지)
  const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };

  // 초기 자원은 activeDungeon에서 가져옴 (재마운트 시에도 유지) - z값
  const initialResources = activeDungeon?.initialResources || resources;

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const preBattleState = useRef(null); // 전투 전 상태 저장

  const segment = dungeon[segmentIndex];
  const playerY = CONFIG.FLOOR_Y - CONFIG.PLAYER.height;

  // 위치 정보를 activeDungeon에 저장 (재마운트 시 복원용)
  useEffect(() => {
    setDungeonPosition(segmentIndex, playerX);
  }, [segmentIndex, playerX, setDungeonPosition]);

  // ========== 키 입력 ==========
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["a", "d", "A", "D"].includes(e.key)) {
        e.preventDefault();
        setKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: true }));
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        handleInteraction();
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setShowCharacter((prev) => !prev);
      }
    };

    const handleKeyUp = (e) => {
      if (["a", "d", "A", "D"].includes(e.key)) {
        setKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [segmentIndex, playerX]);

  // ========== 플레이어 이동 ==========
  useEffect(() => {
    if (!segment) return;

    const moveLoop = () => {
      if (keys.a) {
        setPlayerX((x) => Math.max(50, x - CONFIG.PLAYER.speed));
      }
      if (keys.d) {
        setPlayerX((x) => Math.min(segment.width - 50, x + CONFIG.PLAYER.speed));
      }
      animationRef.current = requestAnimationFrame(moveLoop);
    };

    animationRef.current = requestAnimationFrame(moveLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [keys, segment]);

  // ========== 카메라 ==========
  useEffect(() => {
    if (!segment) return;
    const target = playerX - CONFIG.VIEWPORT.width / 2;
    const maxCamera = segment.width - CONFIG.VIEWPORT.width;
    setCameraX(Math.max(0, Math.min(maxCamera, target)));
  }, [playerX, segment]);

  // ========== 전투 결과 처리 ==========
  useEffect(() => {
    if (!lastBattleResult || !lastBattleResult.nodeId.startsWith("dungeon-")) return;

    if (lastBattleResult.result === "victory") {
      const gold = 5 + Math.floor(Math.random() * 6);
      const loot = Math.random() < 0.5 ? 1 : 0;
      setRewardModal({ gold, loot, victory: true });
    } else {
      setRewardModal({ gold: 0, loot: 0, victory: false });
    }

    // 즉시 clear하여 중복 처리 방지 (재마운트 시 useEffect 재실행 방지)
    clearBattleResult();
  }, [lastBattleResult, clearBattleResult]);

  // ========== 렌더링 ==========
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segment) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CONFIG.VIEWPORT.width, CONFIG.VIEWPORT.height);

    // 배경
    ctx.fillStyle = segment.isRoom ? "#16213e" : "#1a1a2e";
    ctx.fillRect(0, 0, CONFIG.VIEWPORT.width, CONFIG.VIEWPORT.height);

    // 바닥
    ctx.fillStyle = "#0f3460";
    ctx.fillRect(0, CONFIG.FLOOR_Y, CONFIG.VIEWPORT.width, 100);

    // 오브젝트 렌더링
    segment.objects.forEach((obj) => {
      const screenX = obj.x - cameraX;
      if (screenX < -100 || screenX > CONFIG.VIEWPORT.width + 100) return;

      const objType = OBJECT_TYPES[obj.typeId.toUpperCase()];
      if (!objType) return;

      ctx.save();
      ctx.globalAlpha = obj.used && !objType.canReuse ? 0.3 : 1.0;
      objType.render(ctx, screenX, CONFIG.FLOOR_Y, obj.used);
      ctx.restore();
    });

    // 출구
    const exitScreenX = segment.exitX - cameraX;
    if (exitScreenX > -100 && exitScreenX < CONFIG.VIEWPORT.width + 100) {
      ctx.fillStyle = segment.isLast ? "#27ae60" : "#3498db";
      ctx.fillRect(exitScreenX - 20, CONFIG.FLOOR_Y - 90, 40, 90);
      ctx.fillStyle = "#fff";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(segment.isLast ? "출구" : "다음", exitScreenX, CONFIG.FLOOR_Y - 100);
    }

    // 플레이어
    const playerScreenX = playerX - cameraX;
    ctx.fillStyle = "#3498db";
    ctx.fillRect(
      playerScreenX - CONFIG.PLAYER.width / 2,
      playerY,
      CONFIG.PLAYER.width,
      CONFIG.PLAYER.height
    );

    // 에테르 바 (상단)
    const etherPts = resources.etherPts || 0;
    const etherSlots = calculateEtherSlots(etherPts);
    const etherProgress = getSlotProgress(etherPts);
    const etherW = 60;
    const etherH = 8;
    const etherY = playerY - 20;

    ctx.fillStyle = "#333";
    ctx.fillRect(playerScreenX - etherW / 2, etherY, etherW, etherH);

    ctx.fillStyle = "#53d7ff";
    ctx.fillRect(playerScreenX - etherW / 2, etherY, etherW * etherProgress, etherH);

    // 에테르 텍스트
    ctx.fillStyle = "#53d7ff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${etherPts} pt`, playerScreenX - 20, etherY - 5);
    ctx.fillText(`x ${etherSlots}`, playerScreenX + 20, etherY - 5);

    // HP 바 (하단)
    const hpRatio = playerHp / maxHp;
    const hpW = 60;
    const hpH = 8;
    const hpY = playerY + CONFIG.PLAYER.height + 8;

    ctx.fillStyle = "#333";
    ctx.fillRect(playerScreenX - hpW / 2, hpY, hpW, hpH);

    ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#f59e0b" : "#ef4444";
    ctx.fillRect(playerScreenX - hpW / 2, hpY, hpW * hpRatio, hpH);

    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${playerHp}/${maxHp}`, playerScreenX, hpY + hpH + 14);
  }, [segment, playerX, cameraX, playerHp, maxHp, playerY, resources.etherPts]);

  // ========== 상호작용 ==========
  const handleInteraction = () => {
    if (!segment) return;

    // 오브젝트 체크
    for (const obj of segment.objects) {
      if (Math.abs(playerX - obj.x) < 80) {
        const objType = OBJECT_TYPES[obj.typeId.toUpperCase()];

        if (obj.used && !objType.canReuse) {
          setMessage("이미 사용했습니다.");
          return;
        }

        const handler = OBJECT_HANDLERS[obj.typeId];
        if (handler) {
          handler(obj, {
            applyEtherDelta,
            setMessage,
            startBattle,
            segmentIndex,
            preBattleState,
            playerX,
            setPlayerX,
            setSegmentIndex,
          });
        }
        return;
      }
    }

    // 출구 체크
    if (Math.abs(playerX - segment.exitX) < 80) {
      if (segment.isLast) {
        handleCompleteDungeon();
      } else {
        setSegmentIndex((i) => i + 1);
        setPlayerX(100);
        setMessage("");
      }
    }
  };

  // ========== 보상 확인 ==========
  const closeRewardModal = () => {
    // 던전 중에는 실제 resources를 변경하지 않고 dungeonDeltas만 업데이트
    if (rewardModal.gold > 0 || rewardModal.loot > 0) {
      const newDeltas = {
        ...dungeonDeltas,
        gold: dungeonDeltas.gold + rewardModal.gold,
        loot: dungeonDeltas.loot + rewardModal.loot,
      };
      setDungeonDeltas(newDeltas);
    }

    // 전투 전 상태 복원
    if (preBattleState.current) {
      setSegmentIndex(preBattleState.current.segmentIndex);
      setPlayerX(preBattleState.current.playerX);
      preBattleState.current = null;
    }

    setRewardModal(null);
  };

  // ========== 던전 탈출 ==========
  const handleSkipDungeon = () => {
    // dungeonDeltas를 사용 (x값)
    const summary = {
      gold: dungeonDeltas.gold,
      intel: dungeonDeltas.intel,
      loot: dungeonDeltas.loot,
      material: dungeonDeltas.material,
      isComplete: false, // 탈출 버튼으로 나가는 경우
    };
    setDungeonSummary(summary);
  };

  const handleCompleteDungeon = () => {
    // dungeonDeltas를 사용 (x값)
    const summary = {
      gold: dungeonDeltas.gold,
      intel: dungeonDeltas.intel,
      loot: dungeonDeltas.loot,
      material: dungeonDeltas.material,
      isComplete: true, // 출구로 완료하는 경우
    };
    setDungeonSummary(summary);
  };

  const closeDungeonSummary = () => {
    const isComplete = dungeonSummary?.isComplete;

    // 던전 종료 시 z값 + x값을 실제 resources에 반영
    addResources(dungeonDeltas);

    setDungeonSummary(null);
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
        style={{
          border: "2px solid #444",
          borderRadius: "8px",
        }}
      />

      {/* 자원 - 중앙 상단 가로 배치 */}
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
          금: {initialResources.gold}{dungeonDeltas.gold !== 0 && (
            <span style={{ color: dungeonDeltas.gold > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({dungeonDeltas.gold > 0 ? "+" : ""}{dungeonDeltas.gold})
            </span>
          )}
        </div>
        <div style={{ color: "#9da9d6", fontSize: "14px", fontWeight: "600" }}>
          정보: {initialResources.intel}{dungeonDeltas.intel !== 0 && (
            <span style={{ color: dungeonDeltas.intel > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({dungeonDeltas.intel > 0 ? "+" : ""}{dungeonDeltas.intel})
            </span>
          )}
        </div>
        <div style={{ color: "#ff6b6b", fontSize: "14px", fontWeight: "600" }}>
          전리품: {initialResources.loot}{dungeonDeltas.loot !== 0 && (
            <span style={{ color: dungeonDeltas.loot > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({dungeonDeltas.loot > 0 ? "+" : ""}{dungeonDeltas.loot})
            </span>
          )}
        </div>
        <div style={{ color: "#a0e9ff", fontSize: "14px", fontWeight: "600" }}>
          원자재: {initialResources.material}{dungeonDeltas.material !== 0 && (
            <span style={{ color: dungeonDeltas.material > 0 ? "#90EE90" : "#ff6b6b", marginLeft: "4px" }}>
              ({dungeonDeltas.material > 0 ? "+" : ""}{dungeonDeltas.material})
            </span>
          )}
        </div>
      </div>

      {/* 이벤트 메시지 - 화면 중앙 */}
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

      {/* UI - 정보 */}
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
      }}>
        <div>던전 {segmentIndex + 1}/{dungeon.length}</div>
        <div style={{ fontSize: "12px", marginTop: "4px" }}>
          W: 상호작용 | A/D: 이동 | C: 캐릭터
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

      {/* 전투 보상 모달 */}
      {rewardModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
        }}>
          <div style={{
            background: "#1e1e2e",
            padding: "32px",
            borderRadius: "16px",
            border: "2px solid #444",
            textAlign: "center",
            color: "#fff",
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "24px" }}>
              {rewardModal.victory ? "승리!" : "패배"}
            </h3>
            {rewardModal.victory && (
              <div style={{ fontSize: "18px", marginBottom: "8px" }}>
                {rewardModal.gold > 0 && <div style={{ color: "#ffd700", marginBottom: "4px" }}>금 +{rewardModal.gold}</div>}
                {rewardModal.loot > 0 && <div style={{ color: "#ff6b6b" }}>전리품 +{rewardModal.loot}</div>}
              </div>
            )}
            {!rewardModal.victory && <div style={{ fontSize: "14px", color: "#ff6b6b" }}>보상 없음</div>}
            <button
              onClick={closeRewardModal}
              style={{
                marginTop: "20px",
                padding: "10px 24px",
                background: "#3498db",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 던전 탈출 요약 모달 */}
      {dungeonSummary && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
        }}>
          <div style={{
            background: "#1e1e2e",
            padding: "32px",
            borderRadius: "16px",
            border: "2px solid #444",
            textAlign: "center",
            color: "#fff",
            minWidth: "300px",
          }}>
            <h3 style={{ margin: "0 0 24px", fontSize: "24px", color: "#3498db" }}>
              던전 탐험 완료
            </h3>
            <div style={{ fontSize: "16px", lineHeight: "1.8", textAlign: "left", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#ffd700" }}>금:</span>
                <span style={{ color: dungeonSummary.gold >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
                  {dungeonSummary.gold >= 0 ? "+" : ""}{dungeonSummary.gold}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#9da9d6" }}>정보:</span>
                <span style={{ color: dungeonSummary.intel >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
                  {dungeonSummary.intel >= 0 ? "+" : ""}{dungeonSummary.intel}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#ff6b6b" }}>전리품:</span>
                <span style={{ color: dungeonSummary.loot >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
                  {dungeonSummary.loot >= 0 ? "+" : ""}{dungeonSummary.loot}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#a0e9ff" }}>원자재:</span>
                <span style={{ color: dungeonSummary.material >= 0 ? "#90EE90" : "#ff6b6b", fontWeight: "600" }}>
                  {dungeonSummary.material >= 0 ? "+" : ""}{dungeonSummary.material}
                </span>
              </div>
            </div>
            <button
              onClick={closeDungeonSummary}
              style={{
                marginTop: "20px",
                padding: "10px 24px",
                background: "#27ae60",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

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
          onClick={() => setShowCharacter(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <CharacterSheet onClose={() => setShowCharacter(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
