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

  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    const xPos = isRoom
      ? 300 + Math.random() * 600
      : 500 + Math.random() * 2000;

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

    // 전투 전 상태 저장
    context.preBattleState.current = {
      segmentIndex: context.segmentIndex,
      playerX: context.playerX,
    };

    context.startBattle({
      nodeId: `dungeon-${context.segmentIndex}`,
      kind: "combat",
      label: "던전 몬스터",
      enemyHp,
    });
  },

  // 확장 포인트: 새로운 핸들러 추가
  // event: (obj, context) => { ... },
};

// ========== 에테르 바 컴포넌트 ==========
function EtherBar({ pts, color = "cyan", label }) {
  const safePts = Number.isFinite(pts) ? pts : 0;
  const slots = calculateEtherSlots(safePts);
  const current = getCurrentSlotPts(safePts);
  const nextCost = getNextSlotCost(safePts);
  const progress = getSlotProgress(safePts);
  const ratio = Math.max(0, Math.min(1, progress));

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
      <div style={{ textAlign: "center", color: textColor, fontSize: "20px", marginTop: "8px" }}>
        <div>{current}/{nextCost}</div>
        <div>x{slots}</div>
      </div>
    </div>
  );
}

// ========== 메인 컴포넌트 ==========
export function DungeonExploration() {
  // Store hooks
  const skipDungeon = useGameStore((s) => s.skipDungeon);
  const completeDungeon = useGameStore((s) => s.completeDungeon);
  const startBattle = useGameStore((s) => s.startBattle);
  const applyEtherDelta = useGameStore((s) => s.applyEtherDelta);
  const addResources = useGameStore((s) => s.addResources);
  const lastBattleResult = useGameStore((s) => s.lastBattleResult);
  const clearBattleResult = useGameStore((s) => s.clearBattleResult);
  const resources = useGameStore((s) => s.resources);
  const playerHp = useGameStore((s) => s.playerHp);
  const maxHp = useGameStore((s) => s.maxHp);

  // Local state - 던전은 한 번만 생성
  const [dungeon] = useState(() => generateDungeon());
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [playerX, setPlayerX] = useState(100);
  const [cameraX, setCameraX] = useState(0);
  const [keys, setKeys] = useState({});
  const [message, setMessage] = useState("");
  const [rewardModal, setRewardModal] = useState(null);
  const [showCharacter, setShowCharacter] = useState(false);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const preBattleState = useRef(null); // 전투 전 상태 저장

  const segment = dungeon[segmentIndex];
  const playerY = CONFIG.FLOOR_Y - CONFIG.PLAYER.height;

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
  }, [lastBattleResult]);

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

    // HP 바
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
  }, [segment, playerX, cameraX, playerHp, maxHp, playerY]);

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
        completeDungeon();
      } else {
        setSegmentIndex((i) => i + 1);
        setPlayerX(100);
        setMessage("");
      }
    }
  };

  // ========== 보상 확인 ==========
  const closeRewardModal = () => {
    if (rewardModal.gold > 0 || rewardModal.loot > 0) {
      addResources({ gold: rewardModal.gold, loot: rewardModal.loot });
    }

    // 전투 전 상태 복원
    if (preBattleState.current) {
      setSegmentIndex(preBattleState.current.segmentIndex);
      setPlayerX(preBattleState.current.playerX);
      preBattleState.current = null;
    }

    setRewardModal(null);
    clearBattleResult();
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

      {/* UI - 정보 */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "20px",
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
        <div style={{ fontSize: "12px", color: "#fca5a5", marginTop: "4px" }}>
          HP: {playerHp}/{maxHp}
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.9)",
          color: "#fff",
          padding: "12px 24px",
          borderRadius: "8px",
          fontSize: "14px",
          maxWidth: "600px",
          textAlign: "center",
        }}>
          {message}
        </div>
      )}

      {/* 자원 */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        display: "flex",
        gap: "12px",
      }}>
        <EtherBar pts={resources.etherPts || 0} color="cyan" label="에테르" />
        <div style={{
          background: "rgba(0,0,0,0.8)",
          padding: "12px",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "13px",
        }}>
          <div>금: {resources.gold}</div>
          <div>정보: {resources.intel}</div>
          <div>전리품: {resources.loot}</div>
          <div>원자재: {resources.material}</div>
        </div>
      </div>

      {/* 탈출 버튼 */}
      <button
        onClick={skipDungeon}
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
            {rewardModal.gold > 0 && <div style={{ fontSize: "18px" }}>금 +{rewardModal.gold}</div>}
            {rewardModal.loot > 0 && <div style={{ fontSize: "18px" }}>전리품 +{rewardModal.loot}</div>}
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
            <CharacterSheet />
          </div>
        </div>
      )}
    </div>
  );
}
