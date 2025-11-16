import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import "./dungeon.css";

// 던전 세그먼트 타입
const SEGMENT_TYPES = {
  CORRIDOR: "corridor",
  ROOM: "room",
};

// 오브젝트 타입
const OBJECT_TYPES = {
  CHEST: "chest", // 보물상자: 에테르 감소
  CURIO: "curio", // 호기심: 50% 확률 증감
  COMBAT: "combat", // ! 마커: 전투 진입
  DOOR: "door", // 문: 다음 세그먼트로
};

// 랜덤 오브젝트 생성
const generateObjects = (segmentType, segmentIndex, totalSegments) => {
  const objects = [];

  if (segmentType === SEGMENT_TYPES.CORRIDOR) {
    // 복도: 25% 확률로 오브젝트 등장
    if (Math.random() < 0.25) {
      const type = Math.random();
      if (type < 0.4) {
        objects.push({
          id: `obj-${segmentIndex}-1`,
          type: OBJECT_TYPES.CHEST,
          x: 800 + Math.random() * 600,
          y: 480,
          interacted: false,
        });
      } else if (type < 0.7) {
        objects.push({
          id: `obj-${segmentIndex}-2`,
          type: OBJECT_TYPES.CURIO,
          x: 500 + Math.random() * 1000,
          y: 460,
          interacted: false,
        });
      } else {
        objects.push({
          id: `obj-${segmentIndex}-3`,
          type: OBJECT_TYPES.COMBAT,
          x: 600 + Math.random() * 800,
          y: 480,
          interacted: false,
        });
      }
    }

    // 출구 문 (오른쪽 끝)
    objects.push({
      id: `door-${segmentIndex}`,
      type: OBJECT_TYPES.DOOR,
      x: 2100,
      y: 450,
      interacted: false,
    });
  } else {
    // 방: 1-2개 오브젝트
    const numObjects = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numObjects; i++) {
      const type = Math.random();
      if (type < 0.5) {
        objects.push({
          id: `obj-${segmentIndex}-${i}`,
          type: OBJECT_TYPES.CHEST,
          x: 200 + Math.random() * 400,
          y: 480,
          interacted: false,
        });
      } else {
        objects.push({
          id: `obj-${segmentIndex}-${i}`,
          type: OBJECT_TYPES.CURIO,
          x: 200 + Math.random() * 400,
          y: 460,
          interacted: false,
        });
      }
    }

    // 출구 문 (마지막 세그먼트가 아닌 경우)
    if (segmentIndex < totalSegments - 1) {
      objects.push({
        id: `door-${segmentIndex}`,
        type: OBJECT_TYPES.DOOR,
        x: 700,
        y: 450,
        interacted: false,
      });
    } else {
      // 마지막 방: 최종 출구
      objects.push({
        id: `exit-${segmentIndex}`,
        type: "exit",
        x: 700,
        y: 450,
        interacted: false,
      });
    }
  }

  return objects;
};

// 던전 생성
const generateDungeon = () => {
  const numSegments = 5 + Math.floor(Math.random() * 5); // 5-9 세그먼트
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const type = i % 2 === 0 ? SEGMENT_TYPES.CORRIDOR : SEGMENT_TYPES.ROOM;
    const width = type === SEGMENT_TYPES.CORRIDOR ? 2200 : 800;

    segments.push({
      id: `segment-${i}`,
      type,
      width,
      height: 600,
      objects: generateObjects(type, i, numSegments),
    });
  }

  return segments;
};

// 에테르 바 컴포넌트
function EtherBar({ pts, color = "cyan", label }) {
  const safePts = Number.isFinite(pts) ? pts : 0;
  const safeSlots = calculateEtherSlots(safePts);
  const currentPts = getCurrentSlotPts(safePts);
  const nextSlotCost = getNextSlotCost(safePts);
  const slotProgress = getSlotProgress(safePts);
  const ratio = Math.max(0, Math.min(1, slotProgress));
  const tier = `x${safeSlots}`;

  const borderColor = color === "red" ? "#ef4444" : "#53d7ff";
  const fillGradient =
    color === "red"
      ? "linear-gradient(180deg, #fca5a5 0%, #dc2626 100%)"
      : "linear-gradient(180deg, #6affff 0%, #0f7ebd 100%)";
  const textColor = color === "red" ? "#fca5a5" : "#8fd3ff";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "72px",
        padding: "12px 10px 16px",
        background: "rgba(8, 11, 19, 0.95)",
        border: "1px solid rgba(118, 134, 185, 0.5)",
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: "bold",
          marginBottom: "8px",
          textAlign: "center",
          color: "#5fe0ff",
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "relative",
          width: "46px",
          height: "220px",
          margin: "0 auto",
          borderRadius: "30px",
          border: `2px solid ${borderColor}`,
          background: "rgba(9, 17, 27, 0.95)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "3px",
            right: "3px",
            bottom: "3px",
            height: `${ratio * 100}%`,
            borderRadius: "24px",
            background: fillGradient,
          }}
        />
      </div>
      <div style={{ textAlign: "center", color: textColor, fontSize: "20px", marginTop: "8px" }}>
        <div key={`pts-${safePts}`}>
          {currentPts}/{nextSlotCost}
        </div>
        <div>{tier}</div>
      </div>
    </div>
  );
}

export function DungeonExploration() {
  const skipDungeon = useGameStore((state) => state.skipDungeon);
  const startBattle = useGameStore((state) => state.startBattle);
  const applyEtherDelta = useGameStore((state) => state.applyEtherDelta);
  const etherPts = useGameStore((state) => state.resources.etherPts || 0);

  const [dungeon] = useState(() => generateDungeon());
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [player, setPlayer] = useState({ x: 100, y: 500 });
  const [keys, setKeys] = useState({});
  const [cameraX, setCameraX] = useState(0);
  const [message, setMessage] = useState(null);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const currentSegment = dungeon[currentSegmentIndex];
  const VIEWPORT_WIDTH = 800;
  const VIEWPORT_HEIGHT = 600;
  const PLAYER_SPEED = currentSegment?.type === SEGMENT_TYPES.CORRIDOR ? 220 : 200;
  const PLAYER_SIZE = 40;

  // 키보드 입력
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
        e.preventDefault();
        setKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: true }));
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        handleInteraction();
      }
    };

    const handleKeyUp = (e) => {
      if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
        setKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [currentSegmentIndex, player, dungeon]);

  // 플레이어 이동
  useEffect(() => {
    const gameLoop = () => {
      setPlayer((prev) => {
        let newX = prev.x;
        let newY = prev.y;

        const delta = 1 / 60; // 60 FPS

        if (keys.a) newX -= PLAYER_SPEED * delta;
        if (keys.d) newX += PLAYER_SPEED * delta;
        if (keys.w) newY -= PLAYER_SPEED * delta;
        if (keys.s) newY += PLAYER_SPEED * delta;

        // 경계 제한
        newX = Math.max(20, Math.min(currentSegment.width - 20, newX));
        newY = Math.max(450, Math.min(550, newY)); // Y축 제한 (바닥 근처만)

        return { x: newX, y: newY };
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [keys, currentSegment, PLAYER_SPEED]);

  // 카메라 팔로우
  useEffect(() => {
    const targetCameraX = player.x - VIEWPORT_WIDTH / 2;
    const maxCameraX = currentSegment.width - VIEWPORT_WIDTH;
    const clampedCameraX = Math.max(0, Math.min(maxCameraX, targetCameraX));
    setCameraX(clampedCameraX);
  }, [player.x, currentSegment.width]);

  // 상호작용 처리
  const handleInteraction = () => {
    const nearbyObject = currentSegment.objects.find((obj) => {
      const distance = Math.sqrt(
        Math.pow(obj.x - player.x, 2) + Math.pow(obj.y - player.y, 2)
      );
      return distance < 60 && !obj.interacted;
    });

    if (!nearbyObject) return;

    // 오브젝트 상호작용 처리
    const updatedSegment = {
      ...currentSegment,
      objects: currentSegment.objects.map((obj) =>
        obj.id === nearbyObject.id ? { ...obj, interacted: true } : obj
      ),
    };
    dungeon[currentSegmentIndex] = updatedSegment;

    switch (nearbyObject.type) {
      case OBJECT_TYPES.CHEST:
        const chestEther = -(1 + Math.floor(Math.random() * 3)); // -1 ~ -3
        applyEtherDelta(chestEther);
        setMessage(`보물상자를 열었다! 에테르 ${-chestEther} 감소`);
        setTimeout(() => setMessage(null), 2000);
        break;

      case OBJECT_TYPES.CURIO:
        const isPositive = Math.random() < 0.5;
        const curioEther = isPositive
          ? -(1 + Math.floor(Math.random() * 4)) // -1 ~ -4 (긍정)
          : (2 + Math.floor(Math.random() * 4)); // +2 ~ +5 (부정)
        applyEtherDelta(curioEther);
        setMessage(
          isPositive
            ? `축복받은 아티팩트! 에테르 ${-curioEther} 감소`
            : `저주받은 물건... 에테르 +${curioEther} 증가`
        );
        setTimeout(() => setMessage(null), 2000);
        break;

      case OBJECT_TYPES.COMBAT:
        // 전투 진입
        setMessage("적과 조우했다!");
        setTimeout(() => {
          startBattle({
            nodeId: `dungeon-${currentSegmentIndex}`,
            kind: "combat",
            label: "던전 몬스터",
            simulation: {
              initialState: {
                enemy: { hp: 25 + Math.floor(Math.random() * 10) },
              },
            },
          });
        }, 500);
        break;

      case OBJECT_TYPES.DOOR:
        // 다음 세그먼트로
        if (currentSegmentIndex < dungeon.length - 1) {
          setCurrentSegmentIndex(currentSegmentIndex + 1);
          setPlayer({ x: 100, y: 500 });
          setMessage(
            dungeon[currentSegmentIndex + 1].type === SEGMENT_TYPES.ROOM
              ? "방으로 진입..."
              : "복도로 이동..."
          );
          setTimeout(() => setMessage(null), 2000);
        }
        break;

      case "exit":
        setMessage("던전을 탈출했다!");
        setTimeout(() => {
          applyEtherDelta(-5); // 완료 보너스
          skipDungeon();
        }, 1500);
        break;
    }
  };

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // 배경
    ctx.fillStyle = currentSegment.type === SEGMENT_TYPES.CORRIDOR ? "#1a1a2e" : "#16213e";
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    // 바닥
    ctx.fillStyle = "#0f3460";
    ctx.fillRect(0, 500, VIEWPORT_WIDTH, 100);

    // 오브젝트 그리기
    currentSegment.objects.forEach((obj) => {
      const screenX = obj.x - cameraX;
      const screenY = obj.y;

      if (screenX < -50 || screenX > VIEWPORT_WIDTH + 50) return;

      ctx.save();
      ctx.globalAlpha = obj.interacted ? 0.3 : 1.0;

      switch (obj.type) {
        case OBJECT_TYPES.CHEST:
          ctx.fillStyle = obj.interacted ? "#555" : "#f39c12";
          ctx.fillRect(screenX - 20, screenY - 20, 40, 30);
          ctx.fillStyle = "#000";
          ctx.fillText("📦", screenX - 10, screenY + 5);
          break;

        case OBJECT_TYPES.CURIO:
          ctx.fillStyle = obj.interacted ? "#555" : "#9b59b6";
          ctx.beginPath();
          ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillText("?", screenX - 5, screenY + 5);
          break;

        case OBJECT_TYPES.COMBAT:
          ctx.fillStyle = obj.interacted ? "#555" : "#e74c3c";
          ctx.font = "30px Arial";
          ctx.fillText("!", screenX - 8, screenY + 10);
          break;

        case OBJECT_TYPES.DOOR:
        case "exit":
          ctx.fillStyle = obj.type === "exit" ? "#27ae60" : "#3498db";
          ctx.fillRect(screenX - 25, screenY - 40, 50, 80);
          ctx.fillStyle = "#fff";
          ctx.font = "12px Arial";
          ctx.fillText(obj.type === "exit" ? "EXIT" : "DOOR", screenX - 20, screenY + 5);
          break;
      }

      ctx.restore();
    });

    // 플레이어 그리기
    const playerScreenX = player.x - cameraX;
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(playerScreenX, player.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.fillText("@", playerScreenX - 6, player.y + 6);

  }, [player, cameraX, currentSegment]);

  return (
    <div className="dungeon-fullscreen">
      {/* 왼쪽 에테르 바 */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 1001 }}>
        <EtherBar pts={etherPts} color="cyan" label="ETHER" />
      </div>

      {/* 오른쪽 상단 정보 */}
      <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 1001 }}>
        <div className="dungeon-info">
          <div>구역 {currentSegmentIndex + 1} / {dungeon.length}</div>
          <div style={{ fontSize: "11px", opacity: 0.7 }}>WASD: 이동 | E: 상호작용</div>
        </div>
      </div>

      {message && (
        <div className="dungeon-message">
          {message}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={VIEWPORT_WIDTH}
        height={VIEWPORT_HEIGHT}
        style={{
          border: "2px solid rgba(118, 134, 185, 0.5)",
          borderRadius: "8px",
          background: "#000",
        }}
      />

      <button
        type="button"
        onClick={skipDungeon}
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          padding: "10px 20px",
          fontSize: "14px",
          borderRadius: "8px",
          border: "1px solid rgba(255, 110, 135, 0.5)",
          background: "rgba(12, 18, 32, 0.95)",
          color: "#fca5a5",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        던전 탈출
      </button>
    </div>
  );
}
